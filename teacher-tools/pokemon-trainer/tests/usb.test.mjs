import {makeTrainer} from '../trainer.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync,spawn} from 'node:child_process';
import {makeProject} from '../model.js';
import {encodeDevice} from '../device.js';
import {ArtworkConnection,parseInfo} from '../usb.js';

test('device identity, version and bounded capability replies are checked',()=>{
 const line='protocol=1 board=stopwatch-c152 fw=1.18-SWdev11-webusb max=65536 chunk=256 storage=ready size=144 crc=00000000 generation=1 capabilities=backgrounds';
 assert.equal(parseInfo(line).generation,1);
 for(const [a,b]of [['board=stopwatch-c152','board=other'],['max=65536','max=999999'],['chunk=256','chunk=4096'],['protocol=1','protocol=2'],['size=144','size=65537'],['generation=1','generation=4294967296'],['capabilities=backgrounds','capabilities=none']])assert.throws(()=>parseInfo(line.replace(a,b)));
});
for(const board of ['stopwatch-c152','waveshare-175g'])test(`browser talks to the real ${board} C++ receiver: retries, cancellation, restart and disconnect`,async()=>{
 const dir=await mkdtemp(join(tmpdir(),'trainer-usb-'));let child,client,diagnostic="";
 try{
  const device=new URL('../device/',import.meta.url).pathname;
  const firmwareVersion=board==='waveshare-175g'?'1.18-WSdev1-175g':'1.18-SWdev11-webusb';
  const receiver=join(device,board==='waveshare-175g'?'waveshare/trainer_transfer.cpp':'trainer_transfer.cpp');
  await writeFile(join(dir,'Arduino.h'),`#pragma once
#include <string>
#include <stdint.h>
#include <stdlib.h>
#include <stdio.h>
#include <stdarg.h>
extern uint32_t clockMs;extern bool allocationFails;
inline uint32_t millis(){return clockMs;}inline void delay(unsigned n){clockMs+=n;}inline void*ps_malloc(size_t n){return allocationFails?nullptr:malloc(n);}
struct String{std::string v;String(const char*s):v(s){}size_t length()const{return v.size();}const char*c_str()const{return v.c_str();}bool startsWith(const char*s)const{return v.rfind(s,0)==0;}};
struct SerialStub{void println(const char*s){puts(s);fflush(stdout);}void printf(const char*f,...){va_list a;va_start(a,f);vprintf(f,a);va_end(a);fflush(stdout);}};extern SerialStub Serial;
`);
  await writeFile(join(dir,'Arduino_GFX_Library.h'),'#pragma once\n#include <stdint.h>\n#include <stddef.h>\nstruct Arduino_GFX{void fillRect(int,int,int,int,uint16_t){}};');
  await writeFile(join(dir,'esp_system.h'),'#pragma once\n');
  await writeFile(join(dir,'esp_partition.h'),`#pragma once
#include <stdint.h>
#include <stddef.h>
constexpr int ESP_PARTITION_TYPE_DATA=1,ESP_PARTITION_SUBTYPE_DATA_FAT=0x81,ESP_OK=0;
struct esp_partition_t{uint32_t address,size;bool encrypted;};
const esp_partition_t*esp_partition_find_first(int,int,const char*);
int esp_partition_read(const esp_partition_t*,size_t,void*,size_t);
int esp_partition_write(const esp_partition_t*,size_t,const void*,size_t);
int esp_partition_erase_range(const esp_partition_t*,size_t,size_t);
`);
  await writeFile(join(dir,'host.cpp'),`#include "trainer_transfer.h"
#include "trainer_scene.h"
#include "esp_partition.h"
#include <vector>
#include <iostream>
#include <cstring>
#include <cassert>
uint32_t clockMs=0;bool allocationFails=false;SerialStub Serial;
std::vector<uint8_t> flash(0x9e0000,255);const esp_partition_t partition={0x610000,0x9e0000,false};
const esp_partition_t*esp_partition_find_first(int,int,const char*){return &partition;}
int esp_partition_read(const esp_partition_t*,size_t o,void*p,size_t n){assert(o+n<=flash.size());memcpy(p,flash.data()+o,n);return 0;}
int esp_partition_write(const esp_partition_t*,size_t o,const void*p,size_t n){assert(o+n<=0x23000);auto*b=(const uint8_t*)p;for(size_t i=0;i<n;i++)flash[o+i]&=b[i];return 0;}
int esp_partition_erase_range(const esp_partition_t*,size_t o,size_t n){assert(o>=0x1000&&o+n<=0x23000);memset(flash.data()+o,255,n);return 0;}
int main(){trainerSceneBegin();trainerTransferBegin();std::string line;while(std::getline(std::cin,line)){
 if(line.find("TESTREBOOT")!=std::string::npos){clockMs+=30001;trainerTransferTick(clockMs);trainerSceneBegin();trainerTransferBegin();std::cout<<line.substr(0,11)<<" RESET ok"<<std::endl;}
 else if(line.find("TESTMEMFAIL")!=std::string::npos){allocationFails=true;std::cout<<line.substr(0,11)<<" TEST ok"<<std::endl;}
 else if(line.find("TESTMEMOK")!=std::string::npos){allocationFails=false;std::cout<<line.substr(0,11)<<" TEST ok"<<std::endl;}
 else {trainerTransferTick(clockMs);trainerTransferCommand(String(line.c_str()),"${firmwareVersion}");}
 }return 0;}
`);
  execFileSync('c++',['-std=c++17','-O1','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+dir,'-I'+device,join(dir,'host.cpp'),receiver,join(device,'trainer_scene.cpp'),join(device,'custom_scene_data.cpp'),'-o',join(dir,'host')],{timeout:30000});
  child=spawn(join(dir,'host'),[],{stdio:['pipe','pipe','pipe']});let errors='';child.stderr.on('data',b=>{errors+=b;diagnostic+=b;});child.on('exit',(code,signal)=>{diagnostic+=` exit=${code} signal=${signal}`;});let stream,dropAck=true,dropCommit=true,closed=false,output='';
  const port={async open(){},async setSignals(){},async close(){closed=true;child.stdin.end();},readable:new ReadableStream({start(c){stream=c;},cancel(){closed=true;}}),writable:new WritableStream({write(bytes){diagnostic=`sending ${new TextDecoder().decode(bytes).slice(0,80)}`;child.stdin.write(bytes);}})};
  child.stdout.on('data',bytes=>{diagnostic+=' reply='+bytes.toString().slice(0,150);output+=bytes.toString();let at;while((at=output.indexOf('\n'))>=0){const line=output.slice(0,at+1);output=output.slice(at+1);if(dropAck&&line.includes(' ACK ')){dropAck=false;continue;}if(dropCommit&&line.includes(' STORED ')){dropCommit=false;continue;}if(!closed){const b=new TextEncoder().encode(line);stream.enqueue(b.slice(0,5));stream.enqueue(b.slice(5));}}});
  // Allow sanitizer startup on macOS; command retry tests use 300 ms after HELLO.
  client=new ArtworkConnection(port,{timeout:3000,commitTimeout:1000});const initial=await client.open();client.timeout=300;assert.equal(initial.storage,'unclaimed');assert.equal(initial.board,board);
  const p=makeProject('',16,true),first=encodeDevice(p,makeTrainer()),result=await client.upload(first);assert.equal(dropAck,false);assert.equal(dropCommit,false);assert.equal(result.generation,1);assert.equal(result.size,first.length);
  await client.request('TESTREBOOT',kind=>kind==='RESET');assert.equal((await client.info()).crc,result.crc);
  p.backgrounds.day[0]='#ff0000';const second=encodeDevice(p,makeTrainer()),abort=new AbortController();
  await assert.rejects(client.upload(second,{signal:abort.signal,onProgress:()=>abort.abort()}),{code:'cancelled'});assert.equal((await client.info()).crc,result.crc);
  await client.request('TESTREBOOT',kind=>kind==='RESET');assert.equal((await client.info()).crc,result.crc);
  const broken=second.slice();broken[150]^=1;await assert.rejects(client.upload(broken));assert.equal((await client.info()).generation,1);
  // Firmware validates even when a client bypasses the browser-side decoder.
  const crc=new DataView(second.buffer).getUint32(12,true).toString(16).padStart(8,'0');
  await client.request('BEGIN '+second.length+' '+crc,kind=>kind==='READY');
  await assert.rejects(client.request('DATA 4294967295 aa',kind=>kind==='ACK'),{code:'invalid_chunk'});
  await assert.rejects(client.request('COMMIT',kind=>kind==='STORED'),{code:'incomplete'});
  await client.request('ABORT',kind=>kind==='ABORTED');
  await client.request('TESTMEMFAIL',kind=>kind==='TEST');await assert.rejects(client.upload(second),{code:'memory'});await client.request('TESTMEMOK',kind=>kind==='TEST');
  const final=await client.upload(second);assert.equal(final.generation,2);assert.notEqual(final.crc,result.crc);
  await client.request('COMMIT',(kind,body)=>kind==='STORED'&&body.endsWith(final.crc));assert.equal((await client.info()).generation,2);
  await client.request('TESTREBOOT',kind=>kind==='RESET');assert.equal((await client.info()).crc,final.crc);
  await client.close();assert.equal(client.closed,true);await assert.rejects(client.info(),{code:'disconnected'});assert.equal(errors,'');
 }catch(error){error.message+=` [${diagnostic}]`;throw error;}finally{await client?.close();child?.kill();await rm(dir,{recursive:true,force:true});}
});
test('a stalled browser write still respects the command timeout',async()=>{
 const client=new ArtworkConnection({close:async()=>{}},{timeout:20});client.closed=false;client.writer={write:()=>new Promise(()=>{}),releaseLock(){}};
 await assert.rejects(client.request('HELLO',kind=>kind==='INFO'),{code:'timeout'});assert.equal(client.waiter,null);await client.close();
});
test('an unexpected USB stream failure releases the port so the user can reconnect',async()=>{
 let stream,closeCount=0,disconnectCount=0;
 const port={async open(){},async setSignals(){},async close(){closeCount++;},readable:new ReadableStream({start(c){stream=c;}}),writable:new WritableStream({write(bytes){const token=new TextDecoder().decode(bytes).split(' ')[1];stream.enqueue(new TextEncoder().encode(`TP ${token} INFO protocol=1 board=stopwatch-c152 fw=1.18-SWdev11-webusb max=65536 chunk=256 storage=ready size=0 crc=00000000 generation=0 capabilities=backgrounds\n`));}})};
 const client=new ArtworkConnection(port,{onDisconnect:()=>disconnectCount++});await client.open();stream.error(new Error('unplugged'));await new Promise(resolve=>setTimeout(resolve,10));assert.equal(disconnectCount,1);assert.equal(client.closed,true);assert.equal(client.writer,null);assert.equal(client.reader,null);assert(closeCount>0);
});

test('artwork handshake identifies the matching firmware family for each board',()=>{
 const line='protocol=1 board=waveshare-175g fw=1.18-WSdev1-175g max=65536 chunk=256 storage=unclaimed size=0 crc=00000000 generation=0 capabilities=backgrounds';
 assert.equal(parseInfo(line).board,'waveshare-175g');
 assert.throws(()=>parseInfo(line.replace('1.18-WSdev1-175g','1.18-SWdev12-artstore')));
 assert.throws(()=>parseInfo(line.replace('waveshare-175g','waveshare-175c')));
});

test('old firmware is refused before BEGIN when a trainer identity is attached',async()=>{
 const connection=new ArtworkConnection({});let began=false;
 connection.info=async()=>({storage:'ready',capabilities:'backgrounds'});
 connection.request=async command=>{if(command.startsWith('BEGIN'))began=true;return {type:'ABORTED'};};
 await assert.rejects(connection.upload(encodeDevice(makeProject('',32,true),makeTrainer())),error=>error.code==='incompatible');assert.equal(began,false);assert.equal(connection.uploading,false);
});
