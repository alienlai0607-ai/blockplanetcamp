import SparkMD5 from './vendor/spark-md5-3.0.2.js';
import {installFlashReadFix} from './esp-flash-read.js';

export const FLASH_BYTES=16*1024*1024;
const LOCATIONS=[0,0x8000,0xe000,0x10000],LIMITS=[0x8000,0x1000,0x2000,0x300000];
export const sha256=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('');
const md5=bytes=>SparkMD5.ArrayBuffer.hash(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
const equal=(a,b)=>a.length===b.length&&a.every((x,i)=>x===b[i]);
function check(condition,message){if(!condition)throw new Error(message);}
export async function loadFirmware(fetcher=fetch){
  const get=async(url,kind)=>{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
    try{const response=await fetcher(url,{cache:'no-store',signal:controller.signal});check(response.ok,'暫時無法下載遊戲系統，請稍後再試。');return await response[kind]();}
    catch(error){if(controller.signal.aborted)throw new Error('韌體下載逾時，請確認網路後重試；尚未寫入設備。');throw error;}
    finally{clearTimeout(timer);}
  };
  const base=new URL('./firmware/stopwatch/',import.meta.url),manifest=await get(new URL('manifest.json',base),'json');
  check(manifest.schema===1&&manifest.board==='stopwatch-c152'&&manifest.chip==='ESP32-S3'&&manifest.flashBytes===FLASH_BYTES&&/^1\.18-SWdev\d+-[a-z]+$/.test(manifest.version)&&Array.isArray(manifest.files)&&manifest.files.length===4,'韌體清單格式不符，已停止。');
  const images=[];
  for(let i=0;i<4;i++){
    const f=manifest.files[i];
    check(f.offset===LOCATIONS[i]&&Number.isInteger(f.bytes)&&f.bytes>=32&&f.bytes<=LIMITS[i]&&f.bytes%4===0&&/^[a-zA-Z0-9_.-]+\.bin$/.test(f.file)&&/^[a-f0-9]{64}$/.test(f.sha256),'韌體區域或校驗資料不符。');
    const data=new Uint8Array(await get(new URL(f.file,base),'arrayBuffer'));
    check(data.length===f.bytes&&await sha256(data)===f.sha256,'韌體下載不完整，請重新開啟網站再試。');
    if(i===0||i===3)check(data[0]===0xe9&&new DataView(data.buffer).getUint16(12,true)===9,'韌體不適用於 ESP32-S3。');
    images.push({data,address:f.offset});
  }
  check(images[1].data.length===3072&&images[2].data.length===8192,'分割配置長度不符。');
  return {manifest,images};
}
async function backupDatabase(indexedDB){
  check(indexedDB,'瀏覽器無法保存還原備份，尚未寫入設備。請改用一般瀏覽模式。');
  return new Promise((resolve,reject)=>{
    let ended=false;const fail=message=>{ended=true;clearTimeout(timer);reject(new Error(message));};
    const timer=setTimeout(()=>fail('備份資料庫未回應，請關閉其他訓練家分頁再試。'),10000),r=indexedDB.open('teampoke-device-backups',2);
    r.onupgradeneeded=()=>{const store=r.result.objectStoreNames.contains('backups')?r.transaction.objectStore('backups'):r.result.createObjectStore('backups',{keyPath:'id'});if(!store.indexNames.contains('createdAt'))store.createIndex('createdAt','createdAt');};
    r.onsuccess=()=>{clearTimeout(timer);if(ended)r.result.close();else{ended=true;resolve(r.result);}};
    r.onerror=()=>fail('無法建立設備備份。');r.onblocked=()=>fail('備份資料庫被其他分頁占用，請關閉其他訓練家分頁。');
  });
}
export async function saveBackup(record,indexedDB=globalThis.indexedDB){
  const db=await backupDatabase(indexedDB);
  try{
    await new Promise((resolve,reject)=>{const t=db.transaction('backups','readwrite');t.objectStore('backups').put(record);t.oncomplete=resolve;t.onerror=t.onabort=()=>reject(new Error('備份儲存失敗或空間不足，尚未寫入設備。'));});
    const saved=await new Promise((resolve,reject)=>{const r=db.transaction('backups','readonly').objectStore('backups').get(record.id);r.onsuccess=()=>resolve(r.result);r.onerror=reject;});
    check(saved&&saved.sha256===record.sha256&&await sha256(saved.bytes)===record.sha256,'備份讀回校驗失敗，尚未寫入設備。');
  }finally{db.close();}
}
export async function latestBackup(indexedDB=globalThis.indexedDB){
  if(!indexedDB)return null;
  const db=await backupDatabase(indexedDB);
  try{const record=await new Promise((resolve,reject)=>{const r=db.transaction('backups').objectStore('backups').index('createdAt').openCursor(null,'prev');r.onsuccess=()=>resolve(r.result?.value||null);r.onerror=reject;});if(record)check(await sha256(record.bytes)===record.sha256,'備份校驗失敗，請使用先前下載的備份檔。');return record;}finally{db.close();}
}
export class FirmwareInstaller {
  constructor({progress=()=>{},persist=saveBackup,load=loadFirmware,loaderFactory,log=()=>{}}={}){this.progress=progress;this.persist=persist;this.load=load;this.loaderFactory=loaderFactory;this.ready=false;this.writing=false;this.backup=null;this.transport=null;this.log=log;this.stage='準備';this.readAddress=0;}
  async connect(port,{mode='update',boardConfirmed=false}={}){
    check(boardConfirmed,'請先確認設備是 M5Stack StopWatch C152。');check(mode==='update'||mode==='install','操作模式錯誤。');this.mode=mode;this.ready=false;this.backup=null;
    try{
      this.stage='下載韌體';this.release=await this.load();
      const library=this.loaderFactory?await this.loaderFactory(port):await import('./vendor/esptool-js-0.7.1.js');
      if(this.loaderFactory){this.loader=library.loader;this.transport=library.transport;}
      else{this.transport=new library.Transport(port,false);this.loader=installFlashReadFix(new library.ESPLoader({transport:this.transport,baudrate:115200,serialOptions:{bufferSize:65536},terminal:{clean(){},write:message=>this.log(message),writeLine:message=>this.log(message)}}));}
      this.stage='辨識設備';this.progress('connecting',0);await this.loader.detectChip('usb_reset',3);
      check(this.loader.chip?.CHIP_NAME==='ESP32-S3','這台設備不是 ESP32-S3，未進行寫入。');
      const security=await this.loader.getSecurityInfo();
      check(!this.loader.secureDownloadMode&&!security.parsedFlags?.SECURE_BOOT_EN&&!security.parsedFlags?.SECURE_DOWNLOAD_ENABLE&&security.flashCryptCnt===0,'這台設備啟用了安全開機或加密，網頁更新不適用，未進行寫入。');
      this.stage='啟動備份工具';await this.loader.runStub();check(this.loader.IS_STUB,'設備未能啟動更新工具，未進行寫入。');
      check(await this.loader.detectFlashSize()==='16MB','設備儲存容量不是 16 MB，未進行寫入。');
      this.mac=await this.loader.chip.readMac(this.loader);
      this.stage='讀取備份';this.progress('backup',0);const bytes=await this.read(0,FLASH_BYTES,p=>this.progress('backup',p));
      this.stage='校驗備份';this.progress('checkingBackup',1);
      check(md5(bytes)===(await this.loader.flashMd5sum(0,FLASH_BYTES)).toLowerCase(),'原設備備份校驗失敗，未進行寫入。');
      if(mode==='update'){
        check(equal(bytes.subarray(0x8000,0x8c00),this.release.images[1].data),'設備分割配置不同。若是原廠設備，請使用「第一次安裝」；已有遊戲進度請先找老師檢查。');
        // A previous interrupted update may have erased the application's version string.
        // Matching the exact partition table is sufficient for a data-preserving retry.
      }
      const digest=await sha256(bytes),createdAt=new Date().toISOString();
      const record={id:`${this.mac}-${createdAt}`,createdAt,board:'stopwatch-c152',mac:this.mac,sha256:digest,bytes,mode,version:this.release.manifest.version};
      this.stage='保存備份';await this.persist(record);this.backup=record;this.ready=true;this.progress('ready',1);return record;
    }catch(error){
      this.log(`${this.stage}${this.stage==='讀取備份'?` · 0x${this.readAddress.toString(16)}`:''}: ${error.message}`);
      await this.close();
      if(/Serial data stream stopped|No serial data|Invalid head of packet|SLIP|NetworkError|device has been lost/i.test(error.message))throw new Error(`${this.stage}時 USB 通訊中斷，尚未寫入韌體。請關閉此視窗，重新讓設備進入下載模式後再連接；若仍失敗，下載下方診斷記錄。`,{cause:error});
      throw error;
    }
  }
  async read(address,size,onProgress=()=>{}){
    const bytes=new Uint8Array(size);
    for(let offset=0;offset<size;offset+=65536){this.readAddress=address+offset;const count=Math.min(65536,size-offset),part=await this.loader.readFlash(address+offset,count);check(part instanceof Uint8Array&&part.length===count,'設備讀回長度不符，已停止。');bytes.set(part,offset);onProgress((offset+count)/size);}
    return bytes;
  }
  async install({backupSaved=false,eraseConfirmed=false}={}){
    check(this.ready&&!this.writing&&this.backup,'請先連接設備並完成備份。');check(backupSaved,'請先下載並保存還原備份。');check(this.mode!=='install'||eraseConfirmed,'第一次安裝需要確認原有資料將被清除。');
    this.writing=true;this.ready=false;let verified=false;
    try{
      check(await this.loader.chip.readMac(this.loader)===this.mac,'設備身分已改變，已停止。');
      const images=this.release.images;
      this.progress('writing',0);
      await this.loader.writeFlash({fileArray:images.map(x=>({address:x.address,data:x.data.slice()})),flashSize:'keep',flashMode:'keep',flashFreq:'keep',eraseAll:this.mode==='install',compress:true,calculateMD5Hash:md5,reportProgress:(index,done,total)=>this.progress('writing',(index+done/Math.max(total,1))/images.length)});
      for(let i=0;i<images.length;i++){
        const {address,data}=images[i],readback=await this.read(address,data.length,p=>this.progress('verifying',(i+p)/images.length));
        check(equal(data,readback),'韌體讀回校驗未通過。請保留備份並重新安裝，尚未確認成功。');
      }
      if(this.mode==='update'){
        for(const [address,size]of [[0x9000,0x5000],[0x610000,0x23000]])check(equal(await this.read(address,size),this.backup.bytes.subarray(address,address+size)),'遊戲存檔或作品區校驗不符，請保留備份並聯絡老師。');
      }
      verified=true;this.progress('verified',1);
      try{await this.loader.after('hard_reset');}catch{}
      return {version:this.release.manifest.version,readbackVerified:true,bootVerified:false};
    }finally{this.writing=false;await this.close();if(!verified)this.progress('failed',0);}
  }
  async close(){this.ready=false;if(this.transport){try{await this.transport.disconnect();}catch{}this.transport=null;}}
}
