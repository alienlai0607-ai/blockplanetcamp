import SparkMD5 from './vendor/spark-md5-3.0.2.js';

// esptool-js 0.7.1 returns before consuming READ_FLASH's final MD5 packet.
// The next command can then race the stub's return to command mode.
// Keep the vendor bundle intact; replace only its stub read operation.
// Protocol: https://docs.espressif.com/projects/esptool/en/latest/esp32s3/advanced-topics/serial-protocol.html#reading-flash
export class FlashReadError extends Error {
  constructor(message,details={}){super(message);this.code='USB_FLASH_READ';Object.assign(this,details);}
}

export function installFlashReadFix(loader,{packetSize=1024,log=()=>{}}={}){
  if(![512,1024].includes(packetSize))throw new Error('Unsupported USB read packet size');
  // The vendor writer releases its stream lock only on success. A rejected ACK
  // must also release it, otherwise disconnect() waits forever during recovery.
  loader.transport.write=async function(bytes){
    if(!this.device.writable)throw new Error('USB 寫入通道已中斷。');
    const writer=this.device.writable.getWriter();
    try{await writer.write(this.slipWriter(bytes));}finally{writer.releaseLock();}
  };
  async function frame(transport,address,phase){
    const deadline=Date.now()+10000;
    for(let empty=0;empty<8;empty++){
      let bytes;
      try{bytes=await transport.read(Math.max(1,deadline-Date.now()));}
      catch(error){throw new FlashReadError(`USB 讀取中斷（0x${address.toString(16)}，${phase}）：${error.message}`,{cause:error,address,phase});}
      if(bytes instanceof Uint8Array&&bytes.length===0){log(`read 0x${address.toString(16)} ${phase}: empty SLIP frame ${empty+1}`);if(Date.now()>=deadline)break;continue;}
      return bytes;
    }
    throw new FlashReadError(`USB 持續收到空封包（0x${address.toString(16)}，${phase}）。`,{address,phase});
  }
  loader.readFlash=async function(address,size,onPacketReceived=null){
    if(!this.IS_STUB)throw new Error('設備尚未啟動備份工具，已停止讀取。');
    if(!Number.isInteger(address)||!Number.isInteger(size)||address<0||size<1||address+size>16*1024*1024)throw new Error('設備讀取範圍不符。');
    const request=new Uint8Array(16),view=new DataView(request.buffer);
    // One outstanding packet bounds USB buffering and makes every ACK meaningful.
    [address,size,packetSize,1].forEach((value,index)=>view.setUint32(index*4,value,true));
    let result;
    try{result=await this.checkCommand('read flash',this.ESP_READ_FLASH,request);}
    catch(error){throw new FlashReadError(`USB 讀取命令未完成（0x${address.toString(16)}）：${error.message}`,{cause:error,address,phase:'command'});}
    if(result!==0)throw new FlashReadError('設備拒絕讀取備份。',{address,phase:'command'});
    const bytes=new Uint8Array(size),ack=new Uint8Array(4),ackView=new DataView(ack.buffer);
    let offset=0;
    while(offset<size){
      const part=await frame(this.transport,address+offset,'data'),expected=Math.min(packetSize,size-offset);
      if(!(part instanceof Uint8Array)||part.length!==expected){const actual=part?.length??-1;throw new FlashReadError(`USB 封包長度不符（0x${(address+offset).toString(16)}，預期 ${expected}，收到 ${actual} bytes）。`,{address:address+offset,expected,actual,phase:'data'});}
      bytes.set(part,offset);offset+=part.length;ackView.setUint32(0,offset,true);
      try{await this.transport.write(ack);}
      catch(error){throw new FlashReadError(`USB 確認封包傳送失敗（0x${(address+offset).toString(16)}）：${error.message}`,{cause:error,address:address+offset,phase:'ack'});}
      onPacketReceived?.(part,offset,size);
    }
    // Do not send another command (or flush input) until this trailer is consumed.
    const digest=await frame(this.transport,address,'md5');
    if(!(digest instanceof Uint8Array)||digest.length!==16)throw new FlashReadError(`USB 校驗封包長度不符（0x${address.toString(16)}，預期 16，收到 ${digest?.length??-1} bytes）。`,{address,phase:'md5'});
    const actual=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
    if(actual!==SparkMD5.ArrayBuffer.hash(bytes.buffer))throw new FlashReadError(`USB 資料校驗不符（0x${address.toString(16)}）。`,{address,phase:'md5'});
    return bytes;
  };
  return loader;
}
