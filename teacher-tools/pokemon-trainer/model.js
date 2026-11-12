export const SIZES = [16, 32, 64];
export const PALETTE = ['#214d40','#ffffff','#f5e9c9','#d5d7d1','#f393aa','#d54d63','#f39850','#f2cf67','#bdd584','#62a878','#3d7970','#72bfc2','#83b5df','#786fa9','#b397cc','#9d765a'];
export const STORAGE_KEY = 'teampoke.trainer.v1';
export const MAX_PROJECTS = 40;
export const MAX_FRAMES = 4;
export const DEFAULT_FPS = 4;
export function withFrames(p) {
  Object.defineProperty(p, 'pixels', {configurable:true, get(){return this.frames[this.activeFrame];}, set(value){this.frames[this.activeFrame]=value;}});
  return p;
}
export function nameOf(value) { return [...String(value ?? '').trim()].slice(0, 24).join('') || '未命名夥伴'; }
export function validColor(value) { return value === null || (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)); }
export function makeProject(name = '未命名夥伴', size = 32, sample = false) {
  if (!SIZES.includes(size)) throw new Error('畫布大小不支援');
  const now = new Date().toISOString();
  return withFrames({id: crypto.randomUUID(), name: nameOf(name), width:size, height:size, frames:[sample ? sprout(size) : Array(size*size).fill(null)], activeFrame:0, fps:DEFAULT_FPS, createdAt:now, updatedAt:now});
}
export function validateSprite(raw) {
  if (!raw || raw.format !== 'teampoke-sprite' || ![1,2].includes(raw.version)) throw new Error('這不是支援的作品檔，請選擇從本工具儲存的 JSON 檔。');
  const frames=raw.version===1?[raw.pixels]:raw.frames;
  if (!SIZES.includes(raw.width) || raw.height !== raw.width || !Array.isArray(frames) || frames.length<1 || frames.length>MAX_FRAMES || !frames.every(px=>Array.isArray(px) && px.length===raw.width*raw.height && px.every(validColor))) throw new Error('作品的畫布或畫格資料不完整。');
  const fps=raw.version===1?DEFAULT_FPS:raw.fps;
  if(!Number.isInteger(fps)||fps<1||fps>12)throw new Error('動畫速度必須是每秒 1～12 格。');
  if (typeof raw.name !== 'string') throw new Error('作品缺少名字。');
  return {name:nameOf(raw.name), width:raw.width, height:raw.height, frames:frames.map(px=>px.map(c=>c?.toLowerCase()??null)), activeFrame:0, fps};
}
export function serialize(project) {
  return JSON.stringify({format:'teampoke-sprite',version:2,name:nameOf(project.name),width:project.width,height:project.height,frames:project.frames,fps:project.fps});
}
export function importSprite(text) {
  if (text.length > 524288) throw new Error('作品檔太大，請選擇小於 512 KB 的檔案。');
  let raw;
  try { raw = JSON.parse(text); } catch { throw new Error('無法讀取這個作品檔，請確認檔案完整。'); }
  const sprite = validateSprite(raw);
  return withFrames({...makeProject(sprite.name, sprite.width), ...sprite});
}
export function readCollection(text) {
  const raw = JSON.parse(text);
  if (!raw || ![1,2].includes(raw.version) || !Array.isArray(raw.projects) || raw.projects.length < 1 || raw.projects.length > MAX_PROJECTS) throw new Error('作品收藏格式不正確');
  const ids = new Set();
  const projects = raw.projects.map(p => {
    const sprite = validateSprite({...p,format:'teampoke-sprite',version:raw.version});
    if (typeof p.id !== 'string' || !p.id || p.id.length>100 || ids.has(p.id)) throw new Error('作品編號不正確');
    ids.add(p.id);
    const activeFrame=raw.version===2?p.activeFrame:0;
    if(!Number.isInteger(activeFrame)||activeFrame<0||activeFrame>=sprite.frames.length)throw new Error('目前畫格不正確');
    return withFrames({...sprite, activeFrame, id:p.id, createdAt:typeof p.createdAt==='string'?p.createdAt:'', updatedAt:typeof p.updatedAt==='string'?p.updatedAt:''});
  });
  return {version:2,activeId:ids.has(raw.activeId)?raw.activeId:projects[0].id,projects};
}
export function snapshot(p) { return {width:p.width,height:p.height,frames:p.frames.map(px=>px.slice()),activeFrame:p.activeFrame,fps:p.fps}; }
function same(a,b) { return a.width===b.width && a.height===b.height && a.fps===b.fps && a.activeFrame===b.activeFrame && a.frames.length===b.frames.length && a.frames.every((px,f)=>px.every((v,i)=>v===b.frames[f][i])); }
export function addFrame(p,duplicate=true) {
  if(p.frames.length>=MAX_FRAMES)throw new Error('第一版最多 4 格動畫。');
  p.frames.splice(p.activeFrame+1,0,duplicate?p.pixels.slice():Array(p.width*p.height).fill(null));p.activeFrame++;
}
export function deleteFrame(p) { if(p.frames.length<=1)throw new Error('至少保留一格畫面。');p.frames.splice(p.activeFrame,1);p.activeFrame=Math.min(p.activeFrame,p.frames.length-1); }
export function moveFrame(p,delta) { const next=p.activeFrame+delta;if(!Number.isInteger(next)||next<0||next>=p.frames.length)return false;[p.frames[p.activeFrame],p.frames[next]]=[p.frames[next],p.frames[p.activeFrame]];p.activeFrame=next;return true; }
export function previousPixels(p) { return p.activeFrame>0?p.frames[p.activeFrame-1]:null; }
export function frameAt(p,elapsedMs) { return Math.floor(Math.max(0,elapsedMs)*p.fps/1000)%p.frames.length; }
export function sheetPixels(p) {
  const width=p.width*p.frames.length,pixels=Array(width*p.height).fill(null);
  p.frames.forEach((frame,f)=>frame.forEach((v,i)=>{pixels[Math.floor(i/p.width)*width+f*p.width+i%p.width]=v;}));
  return {width,height:p.height,pixels};
}
export class History {
  constructor(limit=100) { this.limit=limit; this.past=[];this.future=[];this.before=null; }
  begin(p) { if (!this.before) this.before=snapshot(p); }
  commit(p) { const before=this.before;this.before=null;if (!before || same(before,p)) return false;this.past.push({before,after:snapshot(p)});if(this.past.length>this.limit)this.past.shift();this.future=[];return true; }
  undo(p) { if (!this.past.length)return false;const entry=this.past.pop();this.future.push(entry);Object.assign(p,snapshot(entry.before));return true; }
  redo(p) { if (!this.future.length)return false;const entry=this.future.pop();this.past.push(entry);Object.assign(p,snapshot(entry.after));return true; }
}
export function paint(p,x,y,color,brush=1,mirror=false) {
  const start=-Math.floor((brush-1)/2);
  for(let oy=start;oy<start+brush;oy++)for(let ox=start;ox<start+brush;ox++) {
    const px=x+ox,py=y+oy;
    if(px<0||py<0||px>=p.width||py>=p.height)continue;
    p.pixels[py*p.width+px]=color;
    if(mirror)p.pixels[py*p.width+(p.width-1-px)]=color;
  }
}
export function stroke(p,from,to,color,brush=1,mirror=false) {
  let [x,y]=from;const [tx,ty]=to,dx=Math.abs(tx-x),dy=-Math.abs(ty-y),sx=x<tx?1:-1,sy=y<ty?1:-1;let error=dx+dy;
  while(true) { paint(p,x,y,color,brush,mirror);if(x===tx&&y===ty)break;const e=2*error;if(e>=dy){error+=dy;x+=sx;}if(e<=dx){error+=dx;y+=sy;} }
}
export function fill(p,x,y,color,mirror=false) {
  const seeds=mirror?[[x,y],[p.width-1-x,y]]:[[x,y]];
  for(const [sx,sy] of seeds) {
    if(sx<0||sy<0||sx>=p.width||sy>=p.height)continue;
    const target=p.pixels[sy*p.width+sx];if(target===color)continue;
    const queue=[[sx,sy]];p.pixels[sy*p.width+sx]=color;
    for(let i=0;i<queue.length;i++){
      const [cx,cy]=queue[i];
      for(const [nx,ny] of [[cx+1,cy],[cx-1,cy],[cx,cy+1],[cx,cy-1]]) {
        if(nx<0||ny<0||nx>=p.width||ny>=p.height)continue;
        const idx=ny*p.width+nx;if(p.pixels[idx]===target){p.pixels[idx]=color;queue.push([nx,ny]);}
      }
    }
  }
}
export function resize(p,size) {
  if(!SIZES.includes(size))throw new Error('畫布大小不支援');
  const offset=Math.floor((size-p.width)/2);
  p.frames=p.frames.map(frame=>{
    const pixels=Array(size*size).fill(null);
    for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++) {
      const nx=x+offset,ny=y+offset;
      if(nx>=0&&ny>=0&&nx<size&&ny<size)pixels[ny*size+nx]=frame[y*p.width+x];
    }
    return pixels;
  });
  p.width=size;p.height=size;
}
// An original practice character; no external character images or network needed.
export function sprout(size=32) {
  const p={width:32,height:32,pixels:Array(1024).fill(null)};
  const rect=(x,y,w,h,c)=>{for(let py=y;py<y+h;py++)for(let px=x;px<x+w;px++)paint(p,px,py,c);};
  const ellipse=(cx,cy,rx,ry,c)=>{for(let y=0;y<32;y++)for(let x=0;x<32;x++)if(((x-cx)/rx)**2+((y-cy)/ry)**2<=1)paint(p,x,y,c);};
  const outline='#214d40',leaf='#62a878',light='#bdd584';
  ellipse(11,7,5,3,outline);ellipse(11,6,4,2,leaf);ellipse(20,5,4,3,outline);ellipse(20,5,3,2,light);rect(15,6,2,5,outline);
  ellipse(16,19,10,10,outline);ellipse(16,18,9,9,leaf);ellipse(12,15,5,4,light);
  rect(4,18,3,6,outline);rect(5,18,2,4,leaf);rect(25,18,3,6,outline);rect(25,18,2,4,leaf);
  ellipse(16,23,6,4,'#f5e9c9');rect(9,27,5,3,outline);rect(19,27,5,3,outline);
  rect(11,15,2,3,outline);rect(20,15,2,3,outline);rect(11,15,1,1,'#ffffff');rect(20,15,1,1,'#ffffff');
  rect(9,19,3,1,'#f393aa');rect(21,19,3,1,'#f393aa');rect(15,19,3,1,outline);rect(13,22,7,2,'#f39850');rect(18,24,2,3,'#f39850');
  if(size===32)return p.pixels;
  return Array.from({length:size*size},(_,i)=>p.pixels[Math.floor(Math.floor(i/size)*32/size)*32+Math.floor((i%size)*32/size)]);
}
