export const BOARDS=Object.freeze({
  'stopwatch-c152':Object.freeze({id:'stopwatch-c152',name:'M5Stack StopWatch C152',shortName:'StopWatch',directory:'stopwatch',version:/^1\.18-SWdev\d+-[a-z]+$/,prefix:'1.18-SWdev',backupName:'StopWatch',help:'用可傳資料的 USB 線連接 StopWatch，長按電源／重置鍵約 2 秒，直到綠燈亮起後放開。'}),
  'waveshare-175g':Object.freeze({id:'waveshare-175g',name:'Waveshare ESP32-S3-Touch-AMOLED-1.75G',shortName:'微雪 1.75G',directory:'waveshare-175g',version:/^1\.18-WSdev\d+-175g$/,prefix:'1.18-WSdev',backupName:'Waveshare-175G',help:'微雪 1.75G：拔下 USB，按住 BOOT 鍵再接上 USB，稍候再放開 BOOT。若已接電池，先關機，再按住 BOOT 開機。'}),
});
export function boardProfile(id='stopwatch-c152'){
  if(!Object.hasOwn(BOARDS,id))throw new Error('尚未支援這個板型，已停止。');
  return BOARDS[id];
}
export function existingBoard(bytes){
  const text=new TextDecoder('latin1').decode(bytes.subarray(0x10000,0x310000));
  const matches=Object.values(BOARDS).filter(board=>text.includes(board.prefix));
  if(matches.length>1)throw new Error('設備韌體板型資訊不一致，請保留備份供檢查。');
  return matches[0]?.id||null;
}
