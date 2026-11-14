// Keep the integer poses identical to device/trainer_motion.h.
export const TOGETHER_SCENES = {idle:'一起生活',play:'一起玩耍',bath:'一起洗澡',walk:'一起冒險'};
export function trainerOffset(action, elapsed) {
  const now = Math.max(0, Math.floor(elapsed)) >>> 0, step = Math.floor(now / 160) % 4;
  const sway = [0, 1, 0, -1], hop = [0, -1, -2, -1];
  switch (action) {
    case 'walk': return {x:sway[step], y:hop[step]};
    case 'play': return {x:0, y:hop[step]*2};
    case 'bath': return {x:sway[step], y:0};
    case 'feed': return {x:Math.floor(now/400)%2, y:0};
    case 'sleep': return {x:0, y:0};
    default: return {x:0, y:-(Math.floor(now/800)%2)};
  }
}
export function drawTogether(canvas, trainer, partner, scene='idle', elapsed=0, background=null) {
  canvas.width=466;canvas.height=466;
  const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
  c.fillStyle='#e9edcf';c.fillRect(0,0,466,466);
  c.fillStyle='#aec49a';c.fillRect(0,228,466,238);
  if(background)background.forEach((color,i)=>{if(color){c.fillStyle=color;const x=i%64,y=Math.floor(i/64);c.fillRect(Math.floor(x*466/64),Math.floor(y*466/64),Math.floor((x+1)*466/64)-Math.floor(x*466/64),Math.floor((y+1)*466/64)-Math.floor(y*466/64));}});
  c.fillStyle='#e0c890';c.fillRect(100,300,266,26);
  const draw=(pixels,width,x,y,scale)=>pixels.forEach((color,i)=>{if(color!==null){c.fillStyle=color;c.fillRect(x+(i%width)*scale,y+Math.floor(i/width)*scale,scale,scale);}});
  const getBounds=(frames,width,height)=>{
    let left=width,right=0,top=height,bottom=0;
    for(const pixels of frames)pixels.forEach((color,i)=>{if(color!==null){const x=i%width,y=Math.floor(i/width);left=Math.min(left,x);right=Math.max(right,x+1);top=Math.min(top,y);bottom=Math.max(bottom,y+1);}});
    return {left,right,top,bottom,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};
  };
  const fit=(b,limit)=>{let scale=limit;while(scale>1&&(b.width*scale>160||b.height*scale>164))scale--;return scale;};
  const tr=getBounds([trainer.pixels],32,32),pk=getBounds(partner.frames,partner.width,partner.height);
  const lift=scene==='play'?4:scene==='walk'?2:scene==='idle'?1:0;
  let ts=fit(tr,8);
  while(ts>1&&(tr.height+lift)*ts>186)ts--;
  const ps=fit(pk,16),tw=tr.width*ts,pw=pk.width*ps;
  const left=233-Math.floor((tw+12+pw)/2),ground=306,motion=trainerOffset(scene,elapsed);
  draw(trainer.pixels,32,left-tr.left*ts+motion.x*ts,ground-tr.bottom*ts+motion.y*ts,ts);
  if(pk.width&&pk.height){
    const frame=Math.floor(elapsed*Math.min(partner.fps||1,8)/1000)%partner.frames.length;
    const bounce=scene==='play'||scene==='walk'?trainerOffset(scene,elapsed+160).y*2:0;
    draw(partner.frames[frame],partner.width,left+tw+12-pk.left*ps,ground-pk.bottom*ps+bounce,ps);
  }
  if(scene==='bath'){
    for(let i=0;i<12;i++){
      const x=(i<6?left+tw/2-28:left+tw+12+pw/2-28)+(i%6)*11+(Math.floor(elapsed/160+i)%3)*2;
      const y=290-(i*13+Math.floor(elapsed/50))%65;
      c.fillStyle='#f4ffff';c.fillRect(x,y,8,8);c.fillStyle='#8bc9dc';c.fillRect(x+2,y+2,4,4);
    }
  } else if(scene==='play'){
    const step=(elapsed%1600)/1600,x=220+Math.round(step*65),y=150-Math.round(28*Math.sin(step*Math.PI));
    c.fillStyle='#27344b';c.fillRect(x-8,y-8,16,16);c.fillStyle='#c83d51';c.fillRect(x-5,y-5,10,5);c.fillStyle='#fff0c7';c.fillRect(x-5,y+1,10,4);
  } else if(scene==='walk'){
    c.fillStyle='#b59f78';for(let i=0;i<5;i++)c.fillRect(110+(i*47+Math.floor(elapsed/30))%240,315,12,4);
  }
  c.fillStyle='#f7f1d6';c.fillRect(120,68,226,34);
  c.fillStyle='#27344b';c.font='bold 20px sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(TOGETHER_SCENES[scene]||TOGETHER_SCENES.idle,233,85);
  c.fillStyle='#f7f1d6';c.fillRect(81,344,304,48);c.fillStyle='#27344b';c.font='bold 17px sans-serif';c.fillText(`${trainer.name} ＆ ${partner.name||'我的夥伴'}`,233,368,280);
}
