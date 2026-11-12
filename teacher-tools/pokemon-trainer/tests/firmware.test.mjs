import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {IDBFactory} from 'fake-indexeddb';
import {loadFirmware,FirmwareInstaller,FLASH_BYTES,sha256,saveBackup,latestBackup} from '../firmware.js';
import {FlashReadError} from '../esp-flash-read.js';

const localFetch=async url=>{
 const bytes=await readFile(url);return {ok:true,json:async()=>JSON.parse(bytes.toString()),arrayBuffer:async()=>bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)};
};
const release=await loadFirmware(localFetch);
function fixture({mode='update',persist=async()=>{},failure}={}){
 const flash=new Uint8Array(FLASH_BYTES).fill(255),writes=[],phases=[];
 flash.set(release.images[1].data,0x8000);flash.set(new TextEncoder().encode('1.18-SWdev10-background'),0x11000);flash.fill(0x5a,0x9000,0xe000);flash.fill(0x7c,0x610000,0x633000);
 let disconnected=false;
 const loader={IS_STUB:true,secureDownloadMode:false,chip:{CHIP_NAME:'ESP32-S3',readMac:async()=>'aa:bb:cc:11:22:33'},async detectChip(){},async getSecurityInfo(){return {flashCryptCnt:0,parsedFlags:{}};},async runStub(){},async detectFlashSize(){return '16MB';},async readFlash(address,size){const data=flash.slice(address,address+size);if(failure==='readback'&&writes.length&&address===0x10000)data[30]^=1;return data;},async flashMd5sum(address,size){return failure==='backup'?'0'.repeat(32):createHash('md5').update(flash.subarray(address,address+size)).digest('hex');},async writeFlash(options){writes.push(options);if(options.eraseAll)flash.fill(255);for(const f of options.fileArray){assert.equal(options.calculateMD5Hash(f.data),createHash('md5').update(f.data).digest('hex'));flash.set(f.data,f.address);}},async after(){}};
 const installer=new FirmwareInstaller({load:async()=>release,loaderFactory:async()=>({loader,transport:{async disconnect(){disconnected=true;}}}),persist,progress:(phase,p)=>phases.push([phase,p])});
 return {installer,flash,writes,loader,phases,mode,disconnected:()=>disconnected};
}
test('published firmware manifest and all four binaries match their hashes, chip and allowed regions',async()=>{
 assert.equal(release.manifest.board,'stopwatch-c152');assert.equal(release.manifest.hardwareTested,false);assert.equal(release.images.length,4);
 assert.equal(await sha256(release.images[1].data),'ace02503447d0f470692e65fa76002f2d77a92dc81cd3813d8aa66718d716da9');
 const broken=structuredClone(release.manifest);broken.files[3].offset=0x9000;
 await assert.rejects(loadFirmware(async url=>url.pathname.endsWith('.json')?{ok:true,json:async()=>broken}:localFetch(url)),/區域/);
 await assert.rejects(loadFirmware(async url=>{const r=await localFetch(url);if(url.pathname.endsWith('game.bin'))r.arrayBuffer=async()=>new Uint8Array(100).buffer;return r;}),/下載不完整/);
});
test('update backs up before writing, requires saved backup, verifies exact bytes and preserves progress/art',async()=>{
 let persisted=false;const f=fixture({persist:async record=>{assert.equal(f.installer.ready,false);assert.equal(record.bytes.length,FLASH_BYTES);assert.equal(record.sha256,await sha256(record.bytes));persisted=true;}});
 const original=f.flash.slice();const backup=await f.installer.connect({}, {boardConfirmed:true});assert(persisted);assert.equal(f.writes.length,0);assert(f.installer.ready);
 await assert.rejects(f.installer.install(),/備份/);assert.equal(f.writes.length,0);
 const result=await f.installer.install({backupSaved:true});assert.equal(result.readbackVerified,true);assert.equal(result.bootVerified,false);assert.equal(f.writes.length,1);assert.equal(f.writes[0].eraseAll,false);assert.equal(f.writes[0].flashMode,'keep');assert.equal(f.writes[0].flashSize,'keep');
 assert.deepEqual(f.flash.subarray(0x9000,0xe000),original.subarray(0x9000,0xe000));assert.deepEqual(f.flash.subarray(0x610000),original.subarray(0x610000));assert.deepEqual(backup.bytes,original);assert(f.disconnected());
});
test('first install is separate and erases only after explicit destructive-mode and backup confirmation',async()=>{
 const f=fixture();await f.installer.connect({}, {mode:'install',boardConfirmed:true});
 await assert.rejects(f.installer.install({backupSaved:true}),/確認/);assert.equal(f.writes.length,0);
 await f.installer.install({backupSaved:true,eraseConfirmed:true});assert.equal(f.writes[0].eraseAll,true);assert(f.flash.subarray(0x9000,0xe000).every(x=>x===255));assert(f.flash.subarray(0x610000).every(x=>x===255));
});
test('unknown boards, encrypted devices, wrong capacity, incompatible layouts and failed backup never write',async()=>{
 for(const scenario of ['board','encryption','size','partition','backup','persist']){
  const f=fixture({failure:scenario,persist:async()=>{if(scenario==='persist')throw new Error('storage full');}});
  if(scenario==='board')f.loader.chip.CHIP_NAME='ESP32-C6';
  if(scenario==='encryption')f.loader.getSecurityInfo=async()=>({flashCryptCnt:1,parsedFlags:{}});
  if(scenario==='size')f.loader.detectFlashSize=async()=>'8MB';
  if(scenario==='partition')f.flash[0x8000]^=1;
  await assert.rejects(f.installer.connect({}, {boardConfirmed:true}));assert.equal(f.writes.length,0,scenario);assert.equal(f.installer.ready,false);assert(f.disconnected(),scenario);
 }
});
test('an interrupted application can be reinstalled in update mode without erasing saves or artwork',async()=>{
 const f=fixture();f.flash.fill(255,0x10000,0x310000);const nvs=f.flash.slice(0x9000,0xe000),art=f.flash.slice(0x610000,0x633000);
 await f.installer.connect({}, {boardConfirmed:true});await f.installer.install({backupSaved:true});assert.equal(f.writes[0].eraseAll,false);assert.deepEqual(f.flash.subarray(0x9000,0xe000),nvs);assert.deepEqual(f.flash.subarray(0x610000,0x633000),art);
});
test('readback failure is not reported as a successful installation',async()=>{
 const f=fixture({failure:'readback'});await f.installer.connect({}, {boardConfirmed:true});await assert.rejects(f.installer.install({backupSaved:true}),/讀回/);assert(!f.phases.some(([phase])=>phase==='verified'));assert(f.disconnected());
});
test('a USB read failure reports the backup phase and address, releases the port, and never enables writing',async()=>{
 const f=fixture(),logs=[];f.installer.log=message=>logs.push(message);
 const originalRead=f.loader.readFlash;
 f.loader.readFlash=async(address,size)=>{if(address>=0x200000)throw new Error('Serial data stream stopped: Possible serial noise or corruption.');return originalRead(address,size);};
 await assert.rejects(f.installer.connect({}, {boardConfirmed:true}),/讀取備份時 USB 通訊中斷，尚未寫入韌體/);
 assert(logs.some(line=>line.includes('0x200000')&&line.includes('Serial data stream stopped')));
 assert.equal(f.installer.ready,false);assert.equal(f.writes.length,0);assert(f.disconnected());
 assert.equal(f.installer.readRecoveries,2);
});
test('backup resumes at the failed 0xad0000 block only after reconnect, identity and previous-prefix verification',async()=>{
 const f=fixture(),read=f.loader.readFlash,md5=f.loader.flashMd5sum,reads=[],checks=[];let failed=false,opens=0;
 const factory=f.installer.loaderFactory;f.installer.loaderFactory=async port=>{opens++;return factory(port);};
 f.loader.readFlash=async(address,size)=>{reads.push(address);if(address===0xad0000&&!failed){failed=true;throw new FlashReadError('預期 1024，收到 0 bytes');}return read(address,size);};
 f.loader.flashMd5sum=async(address,size)=>{checks.push([address,size]);return md5(address,size);};
 const backup=await f.installer.connect({}, {boardConfirmed:true});
 assert.equal(opens,2);assert.equal(f.installer.readRecoveries,1);assert.deepEqual(backup.bytes,f.flash);
 assert(checks.some(([address,size])=>address===0&&size===0xad0000));
 assert.equal(reads.filter(address=>address===0).length,1);assert.equal(reads.filter(address=>address===0xad0000).length,2);
 assert(f.installer.ready);assert.equal(f.writes.length,0);assert(f.phases.some(([phase])=>phase==='recovering'));
});
test('recovery stops on a changed device, changed prefix, or failed reconnect without saving a mixed backup',async()=>{
 for(const scenario of ['device','prefix','reconnect']){
   let persisted=false,opens=0;
   const f=fixture({persist:async()=>{persisted=true;}}),factory=f.installer.loaderFactory,read=f.loader.readFlash;
   f.installer.loaderFactory=async port=>{opens++;if(opens===2){if(scenario==='reconnect')throw Error('Port disappeared');if(scenario==='device')f.loader.chip.readMac=async()=>'other-device';if(scenario==='prefix')f.flash[0x11000]^=1;}return factory(port);};
   f.loader.readFlash=async(address,size)=>{if(address===0x20000)throw new FlashReadError('truncated');return read(address,size);};
   await assert.rejects(f.installer.connect({}, {boardConfirmed:true}),scenario==='device'?/設備不同/:scenario==='prefix'?/內容改變/:/Port disappeared/);
   assert.equal(persisted,false);assert.equal(f.installer.ready,false);assert.equal(f.writes.length,0);assert(f.disconnected());assert.equal(opens,2);
 }
});
test('persistent malformed packets stop after two reconnects and cannot enable firmware writing',async()=>{
 let persisted=false;const f=fixture({persist:async()=>{persisted=true;}});
 f.loader.readFlash=async()=>{throw new FlashReadError('length mismatch');};
 await assert.rejects(f.installer.connect({}, {boardConfirmed:true}),/length mismatch/);
 assert.equal(f.installer.readRecoveries,2);assert.equal(persisted,false);assert.equal(f.installer.ready,false);assert.equal(f.writes.length,0);assert(f.disconnected());
});
test('post-write readback can recover its connection without repeating firmware writes or erasing saves',async()=>{
 const f=fixture(),read=f.loader.readFlash;let failed=false;
 f.loader.readFlash=async(address,size)=>{if(f.writes.length&&address===0x20000&&!failed){failed=true;throw new FlashReadError('packet truncated');}return read(address,size);};
 await f.installer.connect({}, {boardConfirmed:true});
 const result=await f.installer.install({backupSaved:true});assert(result.readbackVerified);assert.equal(f.writes.length,1);assert.equal(f.writes[0].eraseAll,false);assert.equal(f.installer.readRecoveries,1);assert(f.disconnected());
});
test('backup database commits and verifies bytes; latest backup is indexed by time and corruption is refused',async()=>{
 const db=new IDBFactory(),bytes=new Uint8Array([1,2,3]);
 const first={id:'a',createdAt:'2026-11-12T01:00:00Z',bytes,sha256:await sha256(bytes)};await saveBackup(first,db);assert.deepEqual((await latestBackup(db)).bytes,bytes);
 const second={...first,id:'b',createdAt:'2026-11-12T02:00:00Z'};await saveBackup(second,db);assert.equal((await latestBackup(db)).id,'b');
 await assert.rejects(saveBackup({...first,id:'bad',sha256:'0'.repeat(64)},db),/讀回/);
 await assert.rejects(saveBackup(first,null),/無法保存/);
});
