import {validateSprite,serialize,TIMES} from './model.js?v=3';

// The same integer geometry and RGB565 conversion are used by device/trainer_assets.h.
export const DEVICE={id:1,name:'StopWatch / Waveshare 1.75G',width:466,height:466,maxBytes:65536,maxFps:8,backgroundSize:64};
export const HEADER_BYTES=144;
export const FALLBACK={morning:'#f3c3a4',day:'#83b5df',night:'#263449'};
export const SCENES={
  exploration:{name:'探索畫面',ground:306,limit:168,regions:[[175,36,116,36],[95,84,276,48],[0,330,466,136]]},
  home:{name:'主畫面',ground:260,limit:148,regions:[[65,26,336,82],[90,264,92,46],[188,264,92,46],[286,264,92,46],[0,312,466,154]]}
};
export function timeAtHour(hour){return hour>=5&&hour<10?'morning':hour>=10&&hour<18?'day':'night';}
export function rgb565(color){const n=parseInt(color.slice(1),16);return ((n>>>19)<<11)|(((n>>>10)&63)<<5)|((n>>>3)&31);}
export function color565(value){const r=(value>>>11)&31,g=(value>>>5)&63,b=value&31;return '#'+[(r<<3)|(r>>>2),(g<<2)|(g>>>4),(b<<3)|(b>>>2)].map(v=>v.toString(16).padStart(2,'0')).join('');}
export function crc32(bytes){let crc=0xffffffff;for(let i=0;i<bytes.length;i++){crc^=i>=12&&i<16?0:bytes[i];for(let n=0;n<8;n++)crc=(crc>>>1)^((crc&1)?0xedb88320:0);}return (crc^0xffffffff)>>>0;}
function wordsBytes(words){const bytes=new Uint8Array(words.length*2),view=new DataView(bytes.buffer);words.forEach((v,i)=>view.setUint16(i*2,v,true));return bytes;}
function encodeWords(words){
  const runs=[];for(let i=0;i<words.length;){let end=i+1;while(end<words.length&&words[end]===words[i])end++;runs.push(end-i,words[i]);i=end;}
  return runs.length<words.length?{encoding:1,bytes:wordsBytes(runs)}:{encoding:0,bytes:wordsBytes(words)};
}
export function encodeDevice(project){
  const p=validateSprite(JSON.parse(serialize(project))),sections=[];
  p.frames.forEach((pixels,index)=>{
    const mask=new Uint8Array(Math.ceil(pixels.length/8));pixels.forEach((c,i)=>{if(c!==null)mask[i>>>3]|=1<<(i&7);});
    sections.push({kind:0,index,...encodeWords(pixels.map(c=>c===null?0:rgb565(c))),mask});
  });
  TIMES.forEach((time,index)=>sections.push({kind:index+1,index:0,...encodeWords(p.backgrounds[time].map(c=>rgb565(c||FALLBACK[time]))),mask:new Uint8Array()}));
  const total=HEADER_BYTES+sections.reduce((sum,s)=>sum+s.bytes.length+s.mask.length,0);
  if(total>DEVICE.maxBytes)throw new Error('作品超過實機素材包容量。');
  const bytes=new Uint8Array(total),v=new DataView(bytes.buffer);bytes.set([84,80,68,49]);v.setUint16(4,1,true);v.setUint16(6,HEADER_BYTES,true);v.setUint32(8,total,true);v.setUint16(16,DEVICE.id,true);
  bytes[18]=p.width;bytes[19]=p.height;bytes[20]=p.frames.length;bytes[21]=Math.min(p.fps,DEVICE.maxFps);bytes[22]=64;bytes[23]=sections.length;
  v.setUint32(28,p.frames.length*(p.width*p.height*2+Math.ceil(p.width*p.height/8))+3*8192,true);
  let offset=HEADER_BYTES;
  sections.forEach((s,i)=>{const at=32+i*16;bytes[at]=s.kind;bytes[at+1]=s.index;bytes[at+2]=s.encoding;bytes[at+3]=s.mask.length?1:0;v.setUint32(at+4,offset,true);v.setUint32(at+8,s.bytes.length,true);v.setUint32(at+12,s.mask.length,true);bytes.set(s.bytes,offset);offset+=s.bytes.length;bytes.set(s.mask,offset);offset+=s.mask.length;});
  v.setUint32(12,crc32(bytes),true);return bytes;
}
// Reject malformed packages before accessing payload offsets or allocating output buffers.
export function decodeDevice(input){
  const b=input instanceof Uint8Array?input:new Uint8Array(input),bad=()=>{throw new Error('實機素材包格式或校驗不正確。');};
  if(b.length<HEADER_BYTES||b.length>DEVICE.maxBytes)bad();const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
  if(b[0]!==84||b[1]!==80||b[2]!==68||b[3]!==49||v.getUint16(4,true)!==1||v.getUint16(6,true)!==HEADER_BYTES||v.getUint32(8,true)!==b.length||v.getUint32(12,true)!==crc32(b)||v.getUint16(16,true)!==1||![16,32,64].includes(b[18])||b[19]!==b[18]||b[20]<1||b[20]>4||b[21]<1||b[21]>8||b[22]!==64||b[23]!==b[20]+3||v.getUint32(24,true)!==0)bad();
  const decoded=b[20]*(b[18]*b[19]*2+Math.ceil(b[18]*b[19]/8))+3*8192;
  if(v.getUint32(28,true)!==decoded)bad();
  const result={width:b[18],height:b[19],fps:b[21],frames:[],backgrounds:{},bytes:b.length,decodedBytes:decoded};let offset=HEADER_BYTES;
  for(let i=0;i<7;i++){
    const at=32+i*16;if(i>=b[23]){if(b.slice(at,at+16).some(Boolean))bad();continue;}
    const sprite=i<b[20],kind=sprite?0:i-b[20]+1,n=sprite?b[18]*b[19]:4096,maskSize=sprite?Math.ceil(n/8):0,colorSize=v.getUint32(at+8,true),encoding=b[at+2];
    if(b[at]!==kind||b[at+1]!== (sprite?i:0)||encoding>1||b[at+3]!==Number(sprite)||v.getUint32(at+4,true)!==offset||v.getUint32(at+12,true)!==maskSize||!colorSize||colorSize>b.length-offset||maskSize>b.length-offset-colorSize)bad();
    const words=[];const end=offset+colorSize;
    if(encoding===0){if(colorSize!==n*2)bad();for(let pos=offset;pos<end;pos+=2)words.push(v.getUint16(pos,true));}
    else {if(colorSize%4)bad();for(let pos=offset;pos<end;pos+=4){const count=v.getUint16(pos,true),color=v.getUint16(pos+2,true);if(!count||count>n-words.length)bad();for(let k=0;k<count;k++)words.push(color);}if(words.length!==n)bad();}
    const pixels=words.map((c,k)=>sprite&&!(b[end+(k>>>3)]&(1<<(k&7)))?null:color565(c));
    if(sprite)result.frames.push(pixels);else result.backgrounds[TIMES[kind-1]]=pixels;
    offset=end+maskSize;
  }
  if(offset!==b.length)bad();return result;
}
export function spritePlacement(project,scene='exploration'){
  let left=project.width,top=project.height,right=-1,bottom=-1;
  for(const frame of project.frames)frame.forEach((c,i)=>{if(c!==null){const x=i%project.width,y=Math.floor(i/project.width);left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}});
  if(right<0)return null;
  const config=SCENES[scene],scale=Math.max(1,Math.min(6,Math.floor(config.limit/Math.max(right-left+1,bottom-top+1))));
  const x=233-Math.floor((right-left+1)*scale/2)-left*scale,y=config.ground-(bottom+1)*scale;
  return {x,y,scale,left,top,right,bottom,width:(right-left+1)*scale,height:(bottom-top+1)*scale};
}
export function deviceWarnings(project,scene='exploration'){
  const messages=[],placement=spritePlacement(project,scene);
  if(!placement)messages.push('角色還是空白；背景可以先完成。');
  if(project.frames.some(f=>f.every(c=>c===null))&&placement)messages.push('動畫含空白格，播放到那一格時角色會消失。');
  if(project.fps>DEVICE.maxFps)messages.push(`實機素材以每秒 ${DEVICE.maxFps} 格匯出，編輯作品保留原速度。`);
  if(TIMES.some(t=>project.backgrounds[t].some(c=>c===null)))messages.push('背景透明處會補上該時段的底色。');
  messages.push('圓形外側與介面底下的圖案會被遮住；預覽為版面與色彩模擬。');
  return messages;
}
export function drawDevice(canvas,project,time,frame,scene='exploration'){
  if(canvas.width!==466||canvas.height!==466){canvas.width=466;canvas.height=466;}
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  const pixels=project.backgrounds[time];
  // ceil boundaries exactly match floor(displayCoordinate * 64 / 466).
  for(let y=0;y<64;y++)for(let x=0;x<64;){const color=pixels[y*64+x]||color565(rgb565(FALLBACK[time]));let end=x+1;while(end<64&&pixels[y*64+end]===pixels[y*64+x])end++;const x0=Math.ceil(x*466/64),y0=Math.ceil(y*466/64);c.fillStyle=color;c.fillRect(x0,y0,Math.ceil(end*466/64)-x0,Math.ceil((y+1)*466/64)-y0);x=end;}
  const place=spritePlacement(project,scene);if(!place)return;
  const sprite=project.frames[frame];for(let y=0;y<project.height;y++)for(let x=0;x<project.width;){const color=sprite[y*project.width+x];let end=x+1;while(end<project.width&&sprite[y*project.width+end]===color)end++;if(color!==null){c.fillStyle=color;c.fillRect(place.x+x*place.scale,place.y+y*place.scale,(end-x)*place.scale,place.scale);}x=end;}
}
