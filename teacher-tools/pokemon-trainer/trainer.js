// Independent trainer identity. Pokémon collections keep their existing format.
export const TRAINER_KEY='teampoke.trainer-profile.v1', PROFILE_BYTES=2432;
export function trainerName(value){return [...String(value||'').normalize('NFC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,'').trim()].slice(0,8).join('')||'訓練家';}
function layer(name,pixels){const p={name,width:32,height:32,frames:[pixels],activeFrame:0,fps:1};Object.defineProperty(p,'pixels',{get(){return this.frames[0]},set(v){this.frames[0]=v},enumerable:false});return p;}
// Coarse front-facing example: a 16 x 16 design, each square occupies 2 x 2
// editable pixels. The 32 x 32 device profile and children's own art stay intact.
const FRONT_COLORS={K:'#27344b',R:'#c83d51',W:'#fff0c7',H:'#74452f',S:'#f4bd8f',T:'#2c9d96',N:'#526ba0'};
const FRONT_ROWS=[
 '................','.....KKKKKK.....','....KRRWWRRK....','...KRRRRRRRRK...',
 '...KRWWWWWWRK...','..KHHHHHHHHHHK..','...KHHSHHSHHK...','...KHSSSSSSHK...',
 '...KSSKSSKSSK...','....KSSSSSSK....','.....KWKKWK.....','....KTRWWRTK....',
 '...KSTRKKRTSK...','....KKNNNNKK....','.....KNNNNK.....','.....KK..KK.....'
];
export function makeTrainer(){
 const pixels=Array(1024).fill(null);
 FRONT_ROWS.forEach((row,y)=>[...row].forEach((key,x)=>{const c=FRONT_COLORS[key];if(c)for(let dy=0;dy<2;dy++)for(let dx=0;dx<2;dx++)pixels[(y*2+dy)*32+x*2+dx]=c;}));
 return layer('訓練家',pixels);
}
function previousSideExample(){
 const pixels=Array(1024).fill(null),rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)pixels[j*32+i]=c;};
 rect(11,3,10,5,'#27344b');rect(10,5,13,3,'#b53556');rect(12,8,9,8,'#f4c7a1');rect(11,8,2,6,'#27344b');rect(18,10,2,2,'#27344b');rect(10,16,12,9,'#b53556');rect(8,17,3,7,'#f4c7a1');rect(22,17,3,7,'#f4c7a1');rect(12,17,7,3,'#f5edce');rect(11,25,4,5,'#27344b');rect(18,25,4,5,'#27344b');rect(9,29,6,2,'#4f7655');rect(18,29,6,2,'#4f7655');return layer('訓練家',pixels);
}
export function upgradeTrainerExample(p){
 const old=previousSideExample().pixels;if(!p.pixels.every((color,i)=>color===old[i]))return false;
 p.pixels=makeTrainer().pixels;return true;
}
export function serializeTrainer(p){return JSON.stringify({format:'teampoke-trainer',version:1,name:trainerName(p.name),width:32,height:32,pixels:p.pixels});}
export function readTrainer(text){const p=JSON.parse(text);if(p.format!=='teampoke-trainer'||p.version!==1||p.width!==32||p.height!==32||!Array.isArray(p.pixels)||p.pixels.length!==1024||p.pixels.some(c=>c!==null&&(typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c))))throw Error('訓練家作品格式不正確。');return layer(trainerName(p.name),p.pixels.slice());}
export function nameBitmap(name){
 const bits=new Uint8Array(192);if(typeof document==='undefined')return bits;
 const c=document.createElement('canvas');c.width=96;c.height=16;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.font='bold 14px "PingFang TC", "Microsoft JhengHei", sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(name,48,8,96);const data=ctx.getImageData(0,0,96,16).data;for(let i=0;i<1536;i++)if(data[i*4+3]>100)bits[i>>3]|=1<<(i&7);return bits;
}
export function encodeProfile(p,bitmap=nameBitmap(trainerName(p.name))){
 p=readTrainer(serializeTrainer(p));const b=new Uint8Array(PROFILE_BYTES),v=new DataView(b.buffer),name=new TextEncoder().encode(p.name);if(name.length>32)throw Error('名字最多 8 個字。');
 b.set([84,80,82,49,1,0,32,32,name.length]);b.set(name,16);
 p.pixels.forEach((c,i)=>{if(c===null)return;const n=parseInt(c.slice(1),16);v.setUint16(64+i*2,((n>>>19)<<11)|(((n>>>10)&63)<<5)|((n>>>3)&31),true);b[2112+(i>>3)]|=1<<(i&7);});
 if(bitmap.length!==192)throw Error('名字圖像格式不正確。');b.set(bitmap,2240);return b;
}
export function decodeProfile(b){
 const bad=()=>{throw Error('訓練家身分卡格式不正確。');};if(b.length!==PROFILE_BYTES||String.fromCharCode(...b.slice(0,4))!=='TPR1'||b[4]!==1||b[5]||b[6]!==32||b[7]!==32||!b[8]||b[8]>32||b.slice(9,16).some(Boolean)||b.slice(16+b[8],64).some(Boolean))bad();
 let name;try{name=new TextDecoder('utf-8',{fatal:true}).decode(b.slice(16,16+b[8]));}catch{bad();}if(trainerName(name)!==name||[...name].length>8)bad();
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength),pixels=Array.from({length:1024},(_,i)=>{if(!(b[2112+(i>>3)]&(1<<(i&7))))return null;const c=v.getUint16(64+i*2,true),r=c>>11,g=(c>>5)&63,z=c&31;return '#'+[(r<<3)|(r>>2),(g<<2)|(g>>4),(z<<3)|(z>>2)].map(x=>x.toString(16).padStart(2,'0')).join('');});return layer(name,pixels);
}
export function drawTrainerIntro(canvas,trainer,partner,elapsed=null){
 canvas.width=466;canvas.height=466;const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;c.fillStyle='#e9edcf';c.fillRect(0,0,466,466);c.fillStyle='#aec49a';c.fillRect(0,306,466,160);
 const draw=(p,x,y,scale)=>p.pixels.forEach((v,i)=>{if(v){c.fillStyle=v;c.fillRect(x+i%p.width*scale,y+Math.floor(i/p.width)*scale,scale,scale);}});
 const idle=elapsed===null,t=idle?0:Math.max(0,Math.min(2800,elapsed)),exit=Math.max(0,(t-2000)/800);
 const x=137-(idle?0:Math.round(Math.min(1,t/500)*90))-Math.round(exit*200);draw(trainer,x,114,6);
 // Status and its shadow end at y=53. Keep the complete name below that zone.
 c.fillStyle='#d0dcb8';c.fillRect(131,69,204,34);c.fillStyle='#f7f1d6';c.fillRect(133,67,200,32);
 c.fillStyle='#27344b';c.font='bold 20px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(trainerName(trainer.name),233,83,180);
 if(t>=500&&t<1450){const q=Math.min(1,(t-500)/700),bx=190+q*125,by=195-100*Math.sin(q*Math.PI)+q*80;c.fillStyle='#27344b';c.fillRect(bx-12,by-12,24,24);c.fillStyle='#b53556';c.fillRect(bx-9,by-9,18,8);c.fillStyle='#fff';c.fillRect(bx-9,by+2,18,7);}
 if(t>=1300){const maxScale=Math.min(4,Math.floor(144/Math.max(partner.width,partner.height))),s=Math.min(maxScale,Math.max(1,Math.floor((t-1300)/150))),w=partner.width*s;draw(partner,315-w/2,310-partner.height*s,s);}
 c.fillStyle='#27344b';c.font='bold 20px sans-serif';c.fillText(idle?'準備好，一起冒險！':t>=2000?'一起冒險吧！':'夥伴，出發！',233,370);
}
