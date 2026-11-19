import {W,H,clamp} from './engine.js';
export const images={};
const frames = {"meadow":[0,0,160,120],"hill":[0,120,160,120],"pipe":[160,120,24,48],"pipeBottom":[184,120,24,40],"sun":[0,240,160,37],"balloon":[160,240,19,33],"lit":[179,240,19,33],"mountain":[0,277,80,32],"duck":[80,277,16,16],"catJump":[96,277,16,16],"heroJump":[112,277,16,16],"groundCat":[128,277,16,16],"heroRun":[144,277,16,16],"hero":[160,277,16,16],"duck2":[176,277,16,16],"fire":[192,277,16,16],"walker":[208,277,16,16],"catFall":[224,277,16,16],"bird":[240,277,16,16],"heroCrouch":[0,309,16,16],"bee":[16,309,16,16],"cat":[32,309,16,16],"flower":[48,309,16,16],"flier":[64,309,16,16],"coin":[80,309,16,16],"groundHero":[96,309,16,16],"brick":[112,309,16,16],"cloud":[128,309,37,12],"ship":[165,309,16,10],"rock":[181,309,12,9],"shot":[193,309,8,8]};
export async function loadArt(){
  await Promise.all(['shore','xiaobu','bottle'].map(async key=>{const img=new Image();img.src='./art/'+key+'.png';await img.decode();images[key]=img;}));
  const atlas=new Image();atlas.src='./art/atlas.png';await atlas.decode();
  for(const [key,[x,y,w,h]] of Object.entries(frames)){
    const img=document.createElement('canvas');img.width=w;img.height=h;
    img.getContext('2d').drawImage(atlas,x,y,w,h,0,0,w,h);images[key]=img;
  }
}
export function pixelArt(pixels,size){
  const img=document.createElement('canvas');img.width=img.height=size;
  const c=img.getContext('2d');pixels.forEach((color,i)=>{if(color){c.fillStyle=color;c.fillRect(i%size,Math.floor(i/size),1,1);}});
  return img;
}
function stamp(c,key,x,y,w,h,flip=false){
  const im=images[key];if(!im)return;
  c.save();c.translate(Math.round(x),Math.round(y));if(flip)c.scale(-1,1);
  c.drawImage(im,-Math.floor(w/2),-Math.floor(h/2),Math.round(w),Math.round(h));c.restore();
}
function stars(c,time){
  for(let i=0;i<54;i++){
    const x=(i*71+7)%200,y=(i*37+time*(4+i%4))%200;
    c.fillStyle=i%4?'#798cb9':'#f3f3cc';c.fillRect(x,Math.floor(y),i%4?1:2,1);
  }
}
const themes={beach:['#ffe0a2','#32cabb'],sky:['#66c8eb','#b4eacb'],sunset:['#f8c688','#fce5a5'],space:['#18213e','#24355a'],hill:['#75c4da','#a2d699'],meadow:['#97dce7','#b7e6c5']};
function scenery(c,g,custom){
  const theme=g.p.theme,[sky,ground]=themes[theme];c.fillStyle=sky;c.fillRect(0,0,200,200);
  c.fillStyle=ground;c.fillRect(0,132,200,68);
  if(custom){c.drawImage(custom,0,0,200,200);return;}
  if(theme==='beach'){c.drawImage(images.shore,0,0);return;}
  if(theme==='space'){stars(c,g.time);return;}
  if(theme==='hill'||theme==='meadow'){c.drawImage(images[theme],0,7,200,166);return;}
  stamp(c,'sun',145,50,24,24);
  for(let i=0;i<4;i++)stamp(c,'cloud',((i*61+210-g.time*3)%245+245)%245-18,49+(i*13)%34,30,10);
  for(let i=0;i<5;i++)stamp(c,'mountain',i*49,147+(i%2)*5,70,47);
  if(theme==='sky'){
    c.fillStyle='#39a7bd';c.fillRect(0,155,200,17);c.fillStyle='#a6f0df';
    for(let i=0;i<24;i++)c.fillRect((19*i+g.time*5)%200,157+i%12,5,1);
  }
}
export function sceneSample(theme,custom=null){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=200;
  scenery(canvas.getContext('2d'),{p:{theme},time:0},custom);
  return canvas;
}
function character(c,g,custom){
  const p=g.player;let art=p.art;
  if(art==='duck'&&p.vy<0)art='duck2';
  if(art==='cat'&&!g.grounded)art=p.vy<0?'catJump':'catFall';
  if(art==='hero')art=g.crouch?'heroCrouch':!g.grounded?'heroJump':p.vx&&Math.floor(g.time*9)%2?'heroRun':'hero';
  const x=p.x-g.camX,y=p.y-g.camY;
  c.globalAlpha=g.grace>0&&Math.floor(g.grace*12)%2?.55:1;
  if(custom){const img=custom.frames[Math.floor(g.time*custom.fps)%custom.frames.length];c.drawImage(img,Math.round(x)-9,Math.round(y)-9,18,18);}
  else {const size=['lit','balloon'].includes(art)?22:art==='xiaobu'?27:16;stamp(c,art,x,y,size,size,g.facing<0);}
  c.globalAlpha=1;
}
export function draw(canvas,g,mode,custom){
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  scenery(c,g,custom?.background);
  c.save();c.translate(20,40);c.beginPath();c.rect(0,0,W,H);c.clip();
  const left=Math.max(0,Math.floor(g.camX/16)),top=Math.max(0,Math.floor(g.camY/16));
  for(let row=top;row<top+9;row++)for(let col=left;col<left+11;col++){
    const t=g.map[row]?.[col];if(t!=='#'&&t!=='=')continue;
    stamp(c,t==='='?'brick':g.p.theme==='meadow'?'groundCat':'groundHero',col*16+8-g.camX,row*16+8-g.camY,16,16);
  }
  for(const o of g.entities){
    const x=o.x-g.camX,y=o.y-g.camY;
    if(o.kind==='pass'||x<-20||x>W+20||y<-45||y>H+45)continue;
    const look=custom?.roles?.get(o.role);
    if(look){
      const frame=look.frames[Math.floor(g.time*look.fps)%look.frames.length];
      const w=o.art.startsWith('pipe')?o.w:o.kind==='bullet'?8:16,h=o.art.startsWith('pipe')?o.h:w;
      c.drawImage(frame,Math.round(x-w/2),Math.round(y-h/2),w,h);continue;
    }
    if(o.kind==='goal'){
      c.fillStyle='#284432';c.fillRect(x-4,y-8,2,15);c.fillStyle='#ffdd4c';c.fillRect(x-2,y-8,10,6);continue;
    }
    if(o.art.startsWith('pipe'))stamp(c,o.art,x,y,o.w,o.h);
    else stamp(c,o.art,x,y,o.kind==='bullet'?6:16,o.kind==='bullet'?8:16);
  }
  character(c,g,custom?.poses?.get(g.player.pose)||(custom?.frames?custom:null));c.restore();
  if(g.p.theme==='beach'){
    c.fillStyle='#142849';c.fillRect(77,15,46,14);stamp(c,'bottle',85,22,10,12);
    c.fillStyle='white';c.textAlign='center';c.font='bold 10px monospace';c.fillText('× '+String(g.score).padStart(2,'0'),104,25);
    if(mode==='ready'||mode==='playing')return;
  }
  c.fillStyle='rgba(14,45,42,.88)';c.fillRect(54,19,92,15);c.textAlign='center';c.fillStyle='#fff8d1';c.font='bold 9px monospace';
  c.fillText('♥ '+Math.max(0,g.life)+'   ◆ '+g.score+(g.map.length?'   '+(g.level+1)+'/'+g.p.levels.length:''),100,30);
  if(mode==='playing'&&g.p.control==='run'){
    c.fillStyle='rgba(18,52,44,.82)';c.fillRect(58,165,84,14);c.fillStyle='#fff7d0';c.fillText('◀       ↑       ▶',100,175);
  }else if(mode!=='playing'){
    const label={ready:'點螢幕開始',paused:'已暫停',won:'過關成功！',lost:'再挑戰一次'}[mode];
    c.fillStyle='#143f37';c.fillRect(55,162,90,18);c.font='bold 10px sans-serif';c.fillStyle='#fff0b3';c.fillText(label,100,175);
  }
}
export function point(e,screen){
  const r=screen.getBoundingClientRect();
  return {x:clamp((e.clientX-r.left)/r.width*200-20,-20,180),y:clamp((e.clientY-r.top)/r.height*200-40,-40,160)};
}
