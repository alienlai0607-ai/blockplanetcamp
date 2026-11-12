import {decodeDevice} from './device.js?v=1';

export class DeviceError extends Error {constructor(code,message){super(message);this.code=code;}}
const messages={storage_blocked:'設備的作品區已有其他資料，已停止寫入。請交給老師檢查。',storage_write:'設備未能確認儲存結果。請重新連接，檢查作品狀態後再試。',memory:'設備記憶體不足，請重新開機再試。',busy:'設備正在接收另一份作品，請稍後再試。',invalid_package:'作品資料校驗失敗，原作品仍保留。',incomplete:'作品尚未傳完整，原作品仍保留。',no_session:'傳輸已逾時，請重新傳送。'};
export const newToken=()=>crypto.getRandomValues(new Uint32Array(1))[0].toString(16).padStart(8,'0');
const hex=bytes=>Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
export function parseInfo(line){
  const fields=Object.fromEntries(line.trim().split(/\s+/).map(x=>x.split('=')));
  if(fields.protocol!=='1'||fields.board!=='stopwatch-c152'||!fields.fw?.startsWith('1.18-SWdev')||fields.max!=='65536'||fields.chunk!=='256'||!fields.capabilities?.split(',').includes('backgrounds')||!['ready','unclaimed','blocked'].includes(fields.storage)||!/^\d+$/.test(fields.size)||!/^\d+$/.test(fields.generation)||! /^[a-f0-9]{8}$/.test(fields.crc))throw new DeviceError('incompatible','這台設備尚未支援作品傳輸，請先安裝／更新遊戲系統。');
  const result={...fields,size:Number(fields.size),generation:Number(fields.generation),max:65536,chunk:256};
  if(result.size>65536||result.generation>0xffffffff)throw new DeviceError('incompatible','設備回應格式不符。');
  return result;
}
export class ArtworkConnection {
  constructor(port,{onDisconnect=()=>{},timeout=4000,commitTimeout=45000}={}){this.port=port;this.timeout=timeout;this.commitTimeout=commitTimeout;this.onDisconnect=onDisconnect;this.token=newToken();this.reader=null;this.writer=null;this.waiter=null;this.closed=true;this.uploading=false;}
  async open(){
    await this.port.open({baudRate:115200,bufferSize:8192});this.closed=false;
    try{
      await this.port.setSignals?.({dataTerminalReady:true,requestToSend:false});
      this.writer=this.port.writable.getWriter();this.reader=this.port.readable.getReader();this.pump=this.readLoop();
      return await this.info();
    }catch(error){await this.close();throw error;}
  }
  async readLoop(){
    let buffer='',dropping=false;const decoder=new TextDecoder();
    try{
      while(!this.closed){
        const {value,done}=await this.reader.read();if(done)break;
        for(const ch of decoder.decode(value,{stream:true})){
          if(ch==='\n'){
            if(!dropping)this.receive(buffer.trim());buffer='';dropping=false;
          }else if(!dropping){buffer+=ch;if(buffer.length>1024){buffer='';dropping=true;}}
        }
      }
    }catch(error){if(!this.closed)this.readError=error;}
    finally{
      try{this.reader.releaseLock();}catch{}this.reader=null;
      if(!this.closed){this.closed=true;this.reject(new DeviceError('disconnected','設備已斷線。重新接上後可再傳送，未完成的作品不會取代原作品。'));queueMicrotask(()=>this.close());this.onDisconnect();}
    }
  }
  receive(line){
    const m=/^TP ([0-9a-fA-F]{8}) ([A-Z]+)(?: (.*))?$/.exec(line),w=this.waiter;
    if(!m||!w||m[1]!==w.token)return;
    if(m[2]==='ERR'){this.reject(new DeviceError(m[3],messages[m[3]]||'設備拒絕這次傳輸，請重新連接再試。'));return;}
    if(w.accept(m[2],m[3]||'')){this.waiter=null;clearTimeout(w.timer);w.resolve({type:m[2],body:m[3]||''});}
  }
  reject(error){if(this.waiter){const w=this.waiter;this.waiter=null;clearTimeout(w.timer);w.reject(error);}}
  async request(command,accept,{timeout=this.timeout,retries=0}={}){
    for(let attempt=0;;attempt++){
      if(this.closed||!this.writer)throw new DeviceError('disconnected','請先連接遊戲機。');
      if(this.waiter)throw new DeviceError('busy','上一個設備操作尚未完成。');
      const response=new Promise((resolve,reject)=>{const timer=setTimeout(()=>this.reject(new DeviceError('timeout','設備尚未回應。請確認已開機；舊版遊戲需先更新系統。')),timeout);this.waiter={resolve,reject,timer,token:this.token,accept};});
      // Attach a handler before awaiting a write; a disconnect can reject either side first.
      response.catch(()=>{});
      try{await Promise.race([this.writer.write(new TextEncoder().encode(`TP ${this.token} ${command}\n`)),response]);return await response;}
      catch(error){this.reject(error);if(error.code!=='timeout'||attempt>=retries)throw error;}
    }
  }
  async info(){const r=await this.request('HELLO',kind=>kind==='INFO',{retries:1});return parseInfo(r.body);}
  async upload(bytes,{signal,onProgress=()=>{}}={}){
    if(this.uploading)throw new DeviceError('busy','正在傳送作品。');
    decodeDevice(bytes);const crc=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(12,true).toString(16).padStart(8,'0');
    this.uploading=true;this.token=newToken();let committing=false;
    const cancelled=()=>{if(signal?.aborted)throw new DeviceError('cancelled','已取消，原作品仍保留。');};
    try{
      cancelled();const before=await this.info();
      if(before.storage==='blocked')throw new DeviceError('storage_blocked',messages.storage_blocked);
      const begin=await this.request(`BEGIN ${bytes.length} ${crc}`,(kind,body)=>kind==='READY'&&body==='0',{retries:2});
      if(begin.type!=='READY')throw new DeviceError('protocol','無法開始傳輸。');
      for(let offset=0;offset<bytes.length;offset+=256){
        cancelled();const chunk=bytes.subarray(offset,offset+256),next=offset+chunk.length;
        await this.request(`DATA ${offset} ${hex(chunk)}`,(kind,body)=>kind==='ACK'&&body===String(next),{retries:2});onProgress({phase:'sending',done:next,total:bytes.length});
      }
      cancelled();committing=true;onProgress({phase:'committing',done:bytes.length,total:bytes.length});
      await this.request('COMMIT',(kind,body)=>kind==='STORED'&&body===`${bytes.length} ${crc}`,{timeout:this.commitTimeout,retries:1});
      const after=await this.info();
      if(after.crc!==crc||after.size!==bytes.length||after.generation<=before.generation)throw new DeviceError('verify','設備儲存狀態未能確認。請重新連接檢查。');
      onProgress({phase:'complete',done:bytes.length,total:bytes.length});return after;
    }catch(error){
      if(!committing&&!this.closed){try{await this.request('ABORT',kind=>kind==='ABORTED',{timeout:1500});}catch{}}
      if(committing&&error.code==='disconnected')throw new DeviceError('uncertain','儲存確認時連線中斷。作品可能已寫入，請重新連接查看；請勿立即重置設備。');
      throw error;
    }finally{this.uploading=false;}
  }
  async close(){
    this.closed=true;this.reject(new DeviceError('disconnected','連線已關閉。'));
    if(this.reader){try{await this.reader.cancel();}catch{}}
    if(this.pump){try{await this.pump;}catch{}}
    if(this.writer){try{this.writer.releaseLock();}catch{}this.writer=null;}
    try{await this.port.close();}catch{}
  }
}
