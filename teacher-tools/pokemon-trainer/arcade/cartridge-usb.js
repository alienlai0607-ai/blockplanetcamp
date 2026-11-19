export async function sendCartridge(link,info,bytes,status=()=>{}){
  if(info.board!=='waveshare-175g'||!info.capabilities?.split(',').includes('arcade-v1'))
    throw Error('這台設備尚未支援小遊戲，請先在 Mac 執行 Update-Arcade.command，安裝微雪 WSdev21 遊戲韌體。');
  const crc=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength).getUint32(8,true).toString(16).padStart(8,'0');
  const receipt=bytes.length+' '+crc;
  let committing=false;
  try{
    await link.request('GBEGIN '+receipt,(k,v)=>k==='READY'&&v==='0',{retries:1});
    for(let offset=0;offset<bytes.length;offset+=256){
      const chunk=bytes.subarray(offset,offset+256);
      const hex=Array.from(chunk,b=>b.toString(16).padStart(2,'0')).join('');
      await link.request('DATA '+offset+' '+hex,(k,v)=>k==='ACK'&&v===String(offset+chunk.length),{retries:2});
      status('正在傳送小遊戲 '+Math.floor(100*(offset+chunk.length)/bytes.length)+'%');
    }
    committing=true;status('正在儲存並讀回校驗…');
    await link.request('COMMIT',(k,v)=>k==='STORED'&&v===receipt,{timeout:45000,retries:1});
    await link.request('GAMEINFO',(k,v)=>k==='GAME'&&v===receipt);
  }catch(e){
    if(!committing&&!link.closed)try{await link.request('ABORT',k=>k==='ABORTED',{timeout:1000});}catch{}
    if(committing&&['timeout','disconnected'].includes(e.code))throw Error('儲存確認時連線中斷，請重新連接確認掌機中的遊戲。');
    throw e;
  }
}
