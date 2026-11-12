import SparkMD5 from './vendor/spark-md5-3.0.2.js';

// esptool-js 0.7.1 returns before consuming READ_FLASH's final MD5 packet.
// The next command can then race the stub's return to command mode.
// Keep the vendor bundle intact; replace only its stub read operation.
// Protocol: https://docs.espressif.com/projects/esptool/en/latest/esp32s3/advanced-topics/serial-protocol.html#reading-flash
export function installFlashReadFix(loader){
  loader.readFlash=async function(address,size,onPacketReceived=null){
    if(!this.IS_STUB)throw new Error('設備尚未啟動備份工具，已停止讀取。');
    if(!Number.isInteger(address)||!Number.isInteger(size)||address<0||size<1||address+size>16*1024*1024)throw new Error('設備讀取範圍不符。');
    const packetSize=4096,request=new Uint8Array(16),view=new DataView(request.buffer);
    // One outstanding packet bounds USB buffering and makes every ACK meaningful.
    [address,size,packetSize,1].forEach((value,index)=>view.setUint32(index*4,value,true));
    const result=await this.checkCommand('read flash',this.ESP_READ_FLASH,request);
    if(result!==0)throw new Error('設備拒絕讀取備份。');
    const bytes=new Uint8Array(size),ack=new Uint8Array(4),ackView=new DataView(ack.buffer);
    let offset=0;
    while(offset<size){
      const part=await this.transport.read(10000),expected=Math.min(packetSize,size-offset);
      if(!(part instanceof Uint8Array)||part.length!==expected)throw new Error(`USB 備份封包長度不符（位址 0x${(address+offset).toString(16)}）。`);
      bytes.set(part,offset);offset+=part.length;ackView.setUint32(0,offset,true);
      await this.transport.write(ack);
      onPacketReceived?.(part,offset,size);
    }
    // Do not send another command (or flush input) until this trailer is consumed.
    const digest=await this.transport.read(10000);
    if(!(digest instanceof Uint8Array)||digest.length!==16)throw new Error('USB 備份的校驗封包不完整。');
    const actual=Array.from(digest,b=>b.toString(16).padStart(2,'0')).join('');
    if(actual!==SparkMD5.ArrayBuffer.hash(bytes.buffer))throw new Error('USB 備份資料校驗不符，請重新連接；未寫入設備。');
    return bytes;
  };
  return loader;
}
