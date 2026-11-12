import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,mkdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeProject,addFrame,serialize,TIMES} from '../model.js';
import {encodeDevice,decodeDevice,rgb565,color565,crc32,spritePlacement,timeAtHour,drawDevice,deviceWarnings} from '../device.js';
const reseal=b=>{new DataView(b.buffer,b.byteOffset,b.byteLength).setUint32(12,crc32(b),true);return b;};

test('device export preserves original art, black opacity, all periods, and limits only the exported FPS',()=>{
 const p=makeProject('',32,true);addFrame(p);p.fps=12;p.pixels[0]='#000000';p.pixels[1]=null;p.backgrounds.night[0]=null;const before=serialize(p),b=encodeDevice(p),q=decodeDevice(b);
 assert.equal(serialize(p),before);assert.equal(q.fps,8);assert.equal(q.frames[1][0],'#000000');assert.equal(q.frames[1][1],null);assert.equal(q.backgrounds.night[0],color565(rgb565('#263449')));
 for(const time of TIMES)assert.equal(q.backgrounds[time].length,4096);
 assert.equal(q.bytes,b.length);assert(q.bytes<q.decodedBytes);assert(deviceWarnings(p).some(s=>s.includes('每秒 8 格')));
});
test('worst-case high-color package fits fixed storage and decode budgets without palette reduction',()=>{
 const p=makeProject('',64);for(let i=0;i<3;i++)addFrame(p,false);
 let seed=12345;const randomColor=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return '#'+(seed&0xffffff).toString(16).padStart(6,'0');};
 for(const pixels of [...p.frames,...Object.values(p.backgrounds)])pixels.forEach((_,i)=>pixels[i]=randomColor());
 const bytes=encodeDevice(p),q=decodeDevice(bytes);assert.equal(bytes.length,59536);assert.equal(q.decodedBytes,59392);assert(bytes.length<=65536);
 for(let f=0;f<4;f++)for(let i=0;i<4096;i++)assert.equal(q.frames[f][i],color565(rgb565(p.frames[f][i])));
});
test('device parser rejects damaged checksums, unsupported boards, broken runs and overlapping sections',()=>{
 const good=encodeDevice(makeProject('',16,true));
 const invalid=[];for(const length of [0,143,good.length-1])invalid.push(good.slice(0,length));
 let b=good.slice();b[b.length-1]^=1;invalid.push(b);
 for(const patch of [b=>b[16]=2,b=>b[20]=5,b=>b[21]=9,b=>b[24]=1,b=>new DataView(b.buffer).setUint32(36,1,true),b=>new DataView(b.buffer).setUint32(40,0xffffffff,true),b=>{b[34]=1;b[144]=0;b[145]=0;},b=>b[112]=1]){b=good.slice();patch(b);invalid.push(reseal(b));}
 for(const data of invalid)assert.throws(()=>decodeDevice(data));
});
test('stable union anchoring keeps a moving character within the usable home and exploration area',()=>{
 const p=makeProject('',32);p.pixels[10*32+4]='#ffffff';addFrame(p,false);p.pixels[27*32+25]='#ffffff';
 for(const scene of ['home','exploration']){const a=spritePlacement(p,scene);p.activeFrame=0;assert.deepEqual(spritePlacement(p,scene),a);assert(a.y+a.top*a.scale>=108);assert.equal(a.y+(a.bottom+1)*a.scale,scene==='home'?260:306);assert(a.width<=176);}
 assert.equal(spritePlacement(makeProject('',16)),null);
 assert.deepEqual([0,4,5,9,10,17,18,23].map(timeAtHour),['night','night','morning','morning','day','day','night','night']);
});
test('native preview uses nearest-neighbor mapping for every screen pixel, including transparent background fallback',()=>{
 const p=makeProject('',16);for(let i=0;i<4096;i++)p.backgrounds.day[i]=(i%3===0)?'#ffffff':(i%3===1?'#000000':'#f39850');
 const q=decodeDevice(encodeDevice(p)),pixels=new Array(466*466);const context={fillRect(x,y,w,h){for(let row=y;row<y+h;row++)for(let col=x;col<x+w;col++)pixels[row*466+col]=this.fillStyle;}};
 drawDevice({width:466,height:466,getContext:()=>context},q,'day',0);
 for(let y=0;y<466;y++)for(let x=0;x<466;x++)assert.equal(pixels[y*466+x],q.backgrounds.day[Math.floor(y*64/466)*64+Math.floor(x*64/466)]);
});
test('the C++ firmware decoder and Python installer accept identical bytes; corrupt input cannot replace artwork',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'trainer-contract-'));
 try{
  const p=makeProject('',64,true);addFrame(p);p.pixels[0]='#000000';p.pixels[1]=null;const bytes=encodeDevice(p),q=decodeDevice(bytes);const valid=join(dir,'valid.tpdevice');await writeFile(valid,bytes);
  const expected=[];for(const pixels of [...q.frames,...TIMES.map(t=>q.backgrounds[t])])for(const c of pixels){const word=c===null?0:rgb565(c);expected.push(word&255,word>>8,c===null?0:1);}await writeFile(join(dir,'expected.bin'),new Uint8Array(expected));
  const code=`#include "${new URL('../device/trainer_assets.h',import.meta.url).pathname}"
#include <fstream>
#include <vector>
#include <cassert>
std::vector<uint8_t> read(const char*p){std::ifstream f(p,std::ios::binary);return std::vector<uint8_t>((std::istreambuf_iterator<char>(f)),{});}
void seal(std::vector<uint8_t>&b){auto crc=TrainerAssets::crc32(b.data(),b.size());for(int i=0;i<4;i++)b[12+i]=crc>>(i*8);}
int main(int argc,char**argv){auto b=read(argv[1]),expected=read(argv[2]);TrainerAssets::Package p;assert(p.load(b.data(),b.size()));size_t cursor=0;uint16_t colors[4096];uint8_t mask[512];
for(unsigned s=0;s<p.frames+3u;s++){assert(p.decode(s,colors,4096,mask,512));unsigned count=s<p.frames?p.width*p.height:4096;for(unsigned i=0;i<count;i++){assert(expected[cursor++]==(colors[i]&255));assert(expected[cursor++]==(colors[i]>>8));assert(expected[cursor++]==(s<p.frames?bool(mask[i/8]&(1<<(i%8))):true));}}
assert(cursor==expected.size());assert(!p.decode(7,colors,4096,mask,512));assert(!p.decode(0,colors,1,mask,512));assert(!p.decode(0,colors,4096,nullptr,0));
for(size_t n=0;n<b.size();n+=17){TrainerAssets::Package bad;assert(!bad.load(b.data(),n));}
for(size_t i=0;i<b.size();i+=37){auto changed=b;changed[i]^=1;TrainerAssets::Package bad;assert(!bad.load(changed.data(),changed.size()));}
for(int at: {16,20,21,24,36,40,44,112}){auto changed=b;changed[at]=255;seal(changed);TrainerAssets::Package bad;assert(!bad.load(changed.data(),changed.size()));}
auto badRun=b;badRun[34]=1;badRun[144]=0;badRun[145]=0;seal(badRun);assert(!p.load(badRun.data(),badRun.size()));assert(!p.decode(0,colors,4096,mask,512));
for(int x=0;x<64;x++)for(int dest=TrainerAssets::edge(x);dest<TrainerAssets::edge(x+1);dest++)assert(dest*64/466==x);
assert(TrainerAssets::period(5)==0&&TrainerAssets::period(10)==1&&TrainerAssets::period(18)==2);assert(TrainerAssets::frameAt(250,8,2)==0);return 0;}`;
  await writeFile(join(dir,'test.cpp'),code);execFileSync('c++',['-std=c++17','-fsanitize=address,undefined','-fno-omit-frame-pointer',join(dir,'test.cpp'),'-o',join(dir,'check')],{timeout:30000});execFileSync(join(dir,'check'),[valid,join(dir,'expected.bin')],{timeout:20000});
  // Compile the actual firmware renderer with a memory-backed display and PSRAM allocator.
  const deviceDir=new URL('../device/',import.meta.url).pathname;
  await writeFile(join(dir,'Arduino_GFX_Library.h'),`#pragma once
#include <vector>
#include <stdint.h>
#include <cassert>
class Arduino_GFX {public:std::vector<uint16_t> pixels=std::vector<uint16_t>(466*466);void fillRect(int x,int y,int w,int h,uint16_t c){assert(x>=0&&y>=0&&x+w<=466&&y+h<=466);for(int row=y;row<y+h;row++)for(int col=x;col<x+w;col++)pixels[row*466+col]=c;}};`);
  await writeFile(join(dir,'Arduino.h'),`#pragma once
#include <stdlib.h>
extern bool allocationFails;inline void*ps_malloc(size_t n){return allocationFails?nullptr:malloc(n);}struct SerialStub {void println(const char*){}template<class...T>void printf(const char*,T...){}};extern SerialStub Serial;`);
  await writeFile(join(dir,'scene_data.cpp'),`#include "custom_scene_data.h"
const uint8_t CUSTOM_SCENE_DATA[]={${[...bytes].join(',')}};
const size_t CUSTOM_SCENE_SIZE=sizeof(CUSTOM_SCENE_DATA);`);
  const bgExpected=[];for(const time of TIMES)for(const c of q.backgrounds[time]){const word=rgb565(c);bgExpected.push(word&255,word>>8);}await writeFile(join(dir,'backgrounds.bin'),new Uint8Array(bgExpected));
  await writeFile(join(dir,'render.cpp'),`#include "trainer_scene.h"
#include "Arduino.h"
#include <fstream>
#include <vector>
#include <cassert>
bool allocationFails=false;SerialStub Serial;
int main(int argc,char**argv){std::ifstream f(argv[1],std::ios::binary);std::vector<uint8_t>b((std::istreambuf_iterator<char>(f)),{});Arduino_GFX display;
assert(!trainerSceneDraw(&display,12));assert(trainerSceneBegin());assert(!trainerSceneDraw(nullptr,12));int hours[]={7,12,21};
for(int t=0;t<3;t++){assert(trainerSceneDraw(&display,hours[t]));for(int y=0;y<466;y++)for(int x=0;x<466;x++){int at=(t*4096+(y*64/466)*64+x*64/466)*2;assert(display.pixels[y*466+x]==uint16_t(b[at]|(b[at+1]<<8)));}}
allocationFails=true;assert(!trainerSceneBegin());assert(!trainerSceneDraw(&display,12));allocationFails=false;assert(trainerSceneBegin());assert(trainerSceneBegin());allocationFails=true;assert(!trainerSceneBegin());return 0;}`);
  execFileSync('c++',['-std=c++17','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+dir,'-I'+deviceDir,join(deviceDir,'trainer_scene.cpp'),join(dir,'scene_data.cpp'),join(dir,'render.cpp'),'-o',join(dir,'render')],{timeout:30000});execFileSync(join(dir,'render'),[join(dir,'backgrounds.bin')],{timeout:20000});
  const sketch=join(dir,'TamaPoke');await mkdir(sketch);await writeFile(join(sketch,'TamaPoke.ino'),'// test');await writeFile(join(sketch,'trainer_scene.cpp'),'// test');await writeFile(join(sketch,'custom_scene_data.cpp'),'original artwork');
  const installer=new URL('../device/prepare_scene.py',import.meta.url).pathname;
  const args=[installer,valid,'--firmware',sketch];execFileSync('python3',args,{timeout:10000});assert.equal(await readFile(join(sketch,'custom_scene_data.cpp'),'utf8'),'original artwork');
  execFileSync('python3',[...args,'--install'],{timeout:10000});const installed=await readFile(join(sketch,'custom_scene_data.cpp'),'utf8');assert(installed.includes('0x54,0x50,0x44,0x31'));
  const corrupt=bytes.slice();corrupt[144]^=1;await writeFile(join(dir,'bad.tpdevice'),corrupt);assert.throws(()=>execFileSync('python3',[installer,join(dir,'bad.tpdevice'),'--firmware',sketch,'--install'],{timeout:10000,stdio:'pipe'}));assert.equal(await readFile(join(sketch,'custom_scene_data.cpp'),'utf8'),installed);
 }finally{await rm(dir,{recursive:true,force:true});}
});
