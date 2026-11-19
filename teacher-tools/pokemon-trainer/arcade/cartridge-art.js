import {heroAppearance} from './companion.js';
import {images,sceneSample,pixelArt} from './view.js';
import {encodeCartridge} from './cartridge.js';
const transparent=65536;
function pixels(canvas,w,h){
  const c=document.createElement('canvas');c.width=w;c.height=h;
  const ctx=c.getContext('2d');ctx.imageSmoothingEnabled=false;ctx.drawImage(canvas,0,0,w,h);
  const rgba=ctx.getImageData(0,0,w,h).data;
  return Array.from({length:w*h},(_,i)=>{const n=i*4;return rgba[n+3]<128?transparent:(rgba[n]&248)<<8|(rgba[n+1]&252)<<3|rgba[n+2]>>3;});
}
export function gameCartridge(p,id,partner){
  const art=[];
  function add(group,key,frames,fps,w,h){art.push({group,key,width:w,height:h,fps,frames:frames.map(f=>pixels(f,w,h))});}
  function custom(group,key,d){if(d)add(group,key,d.frames.map(f=>pixelArt(f,d.size)),d.fps,d.size,d.size);}
  for(const [key,img] of Object.entries(images)){
    if(['shore','meadow','hill','sun','mountain','cloud'].includes(key))continue;
    add(0,key,[img],1,Math.min(32,img.width),Math.min(48,img.height));
  }
  custom(1,'player',heroAppearance(p,id,partner));
  for(const r of p.roles)if(r.id!=='player')custom(1,r.id,r.drawing);
  for(const [key,d] of Object.entries(p.poses||{}))custom(2,key,d);
  const bg=p.scenePixels||(p.customBG&&p.costume?.background);
  const size=bg?64:96;
  add(3,'scene',[sceneSample(p.theme,bg?pixelArt(bg,64):null)],1,size,size);
  return encodeCartridge(p,art);
}
