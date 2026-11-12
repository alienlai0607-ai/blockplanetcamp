import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ESPLoader,Transport} from '../vendor/esptool-js-0.7.1.js';
import {installFlashReadFix} from '../esp-flash-read.js';

const slip=bytes=>{const result=[0xc0];for(const byte of bytes){if(byte===0xc0)result.push(0xdb,0xdc);else if(byte===0xdb)result.push(0xdb,0xdd);else result.push(byte);}result.push(0xc0);return Uint8Array.from(result);};
const unslip=bytes=>{const result=[];for(let i=1;i<bytes.length-1;i++){let byte=bytes[i];if(byte===0xdb)byte=bytes[++i]===0xdc?0xc0:0xdb;result.push(byte);}return Uint8Array.from(result);};
const word=(bytes,index=0)=>new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(index,true);

// Exercise the actual vendored ESPLoader, Transport, SLIP framing and Web Streams.
// The fake stub delays its final MD5. Sending another command before it is ready
// loses that command, reproducing the browser's stream-stopped failure.
async function fixture({patched=true,fault='',packetSize=1024}={}){
 let controller,pending=null,finishing=false,timer,closed=false;
 const state={lost:0,trailerCount:0,commands:[],acks:[],writes:0};
 const emit=bytes=>{if(closed)return;const wire=slip(bytes);controller.enqueue(wire.slice(0,5));controller.enqueue(wire.slice(5));};
 const response=(op,value=0)=>{const bytes=new Uint8Array(10);bytes.set([1,op,2,0]);new DataView(bytes.buffer).setUint32(4,value,true);emit(bytes);};
 function packet(){
   const part=pending.data.slice(pending.offset,pending.offset+pending.packetSize);
   if(fault==='empty')emit(new Uint8Array(0));
   emit(fault==='length'?part.slice(1):part);
 }
 const port={getInfo:()=>({usbVendorId:0x303a,usbProductId:0x1001}),async open(){
   this.readable=new ReadableStream({start(c){controller=c;}});
   this.writable=new WritableStream({write(wire){
     const bytes=unslip(wire);
     if(bytes.length===4){
       if(fault==='ack')throw new Error('USB device lost while acknowledging');
       assert(pending,'unexpected ACK');assert.equal(word(bytes),Math.min(pending.offset+pending.packetSize,pending.data.length));
       pending.offset=word(bytes);state.acks.push(pending.offset);
       if(pending.offset<pending.data.length)packet();
       else{finishing=true;const digest=new Uint8Array(createHash('md5').update(pending.data).digest());pending=null;
         timer=setTimeout(()=>{finishing=false;if(fault==='digest')digest[0]^=1;if(fault==='empty')emit(new Uint8Array(0));if(fault!=='missing')emit(digest);state.trailerCount++;},5);
       }
       return;
     }
     assert.equal(bytes[0],0);
     if(finishing){state.lost++;return;}
     const op=bytes[1];
     if(op===0xd2){
       assert.equal(bytes.length,24);assert.equal(word(bytes,16),patched?packetSize:4096);
       const address=word(bytes,8),size=word(bytes,12),window=word(bytes,20);
       state.commands.push({address,size,window,packetSize:word(bytes,16)});
       const data=Uint8Array.from({length:size},(_,index)=>(address+index*13)%256);
       pending={data,offset:0,packetSize:word(bytes,16)};response(op);packet();
     }else if(op===0x0a)response(op,123);
     else{state.writes++;throw Error('Unexpected mutating command '+op);}
   }});
 },async close(){closed=true;clearTimeout(timer);this.readable=null;this.writable=null;}};
 const transport=new Transport(port,false),loader=new ESPLoader({transport,baudrate:115200,terminal:{clean(){},write(){},writeLine(){}}});
 loader.IS_STUB=true;loader.DEFAULT_TIMEOUT=100;loader.FLASH_READ_TIMEOUT=100;
 const realRead=transport.read.bind(transport);transport.read=timeout=>realRead(Math.min(timeout,100));
 if(patched)installFlashReadFix(loader,{packetSize});
 await transport.connect(115200);const reading=transport.readLoop();
 return {loader,transport,port,state,async close(){await transport.disconnect();await reading;}};
}

test('unmodified esptool 0.7.1 reproduces stream-stopped on a command before the delayed MD5 trailer',async()=>{
 const f=await fixture({patched:false});
 try{
   assert.equal((await f.loader.readFlash(0,65536)).length,65536);
   assert.equal(f.state.trailerCount,0,'old reader returns before the MD5 trailer');
   await assert.rejects(f.loader.readFlash(65536,65536),/Serial data stream stopped/);
   assert.equal(f.state.lost,1);assert.equal(f.state.writes,0);
 }finally{await f.close();}
});

test('corrected reader consumes and validates every trailer before consecutive reads and the next command',async()=>{
 const f=await fixture();
 try{
   for(const [address,size] of [[0,65536],[65536,65536],[0x10000,19984],[0x8000,3072],[0xe000,8192],[0xffffff,1]]){
     const bytes=await f.loader.readFlash(address,size);
     assert.deepEqual(bytes,Uint8Array.from({length:size},(_,index)=>(address+index*13)%256));
   }
   assert.equal(await f.loader.readReg(0),123);
   assert.equal(f.state.trailerCount,6);assert.equal(f.state.commands.length,6);
   assert(f.state.commands.every(command=>command.window===1));assert.equal(f.state.lost,0);assert.equal(f.state.writes,0);
 }finally{await f.close();}
});

test('corrupted, short and missing packets fail closed; invalid ranges and a ROM loader never request a read',async()=>{
 for(const [fault,message] of [['length',/長度/],['digest',/校驗不符/],['missing',/Serial data stream stopped/]]){
   const f=await fixture({fault});try{await assert.rejects(f.loader.readFlash(0,8192),message);assert.equal(f.state.writes,0);}finally{await f.close();}
 }
 const f=await fixture();try{
   for(const [address,size] of [[-1,4],[0,0],[0,1.5],[0xffffff,2]])await assert.rejects(f.loader.readFlash(address,size),/範圍/);
   f.loader.IS_STUB=false;await assert.rejects(f.loader.readFlash(0,4096),/尚未啟動/);assert.equal(f.state.commands.length,0);
 }finally{await f.close();}
});

test('empty SLIP frames are not mistaken for flash data; 512-byte fallback reads exact data and MD5',async()=>{
 const f=await fixture({fault:'empty',packetSize:512});try{
   const bytes=await f.loader.readFlash(0xad0000,65536);
   assert.deepEqual(bytes,Uint8Array.from({length:65536},(_,index)=>(0xad0000+index*13)%256));
   assert.equal(f.state.trailerCount,1);assert.equal(f.state.lost,0);assert.equal(f.state.writes,0);
 }finally{await f.close();}
});

test('packet length errors retain the expected and actual sizes for real-device diagnostics',async()=>{
 const f=await fixture({fault:'length'});try{
   await assert.rejects(f.loader.readFlash(0xad0000,65536),error=>{
     assert.equal(error.code,'USB_FLASH_READ');assert.equal(error.address,0xad0000);assert.equal(error.expected,1024);assert.equal(error.actual,1023);assert.match(error.message,/預期 1024，收到 1023/);return true;
   });
 }finally{await f.close();}
});

test('a rejected ACK releases the real Web Streams writer so reconnect can close the old port',async()=>{
 const f=await fixture({fault:'ack'});try{
   await assert.rejects(f.loader.readFlash(0,65536),/確認封包傳送失敗/);assert.equal(f.port.writable.locked,false);assert.equal(f.state.writes,0);
 }finally{await f.close();}
});

test('all 16 MiB are read with real vendor SLIP parsing and verified per block, including 0xad0000',async()=>{
 const f=await fixture();try{
   const received=createHash('sha256'),expected=createHash('sha256');
   for(let address=0;address<16*1024*1024;address+=65536){
     received.update(await f.loader.readFlash(address,65536));
     expected.update(Uint8Array.from({length:65536},(_,index)=>(address+index*13)%256));
   }
   assert.equal(received.digest('hex'),expected.digest('hex'));assert.equal(f.state.trailerCount,256);assert.equal(f.state.commands.length,256);assert.equal(f.state.lost,0);assert.equal(f.state.writes,0);
 }finally{await f.close();}
});
