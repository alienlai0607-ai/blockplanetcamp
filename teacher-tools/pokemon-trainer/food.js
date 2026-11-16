export const FOOD_NAMES=['紅莓','藍莓','綠莓','糖果'];
export const FOOD_BYTES=2192;
export function makeFoods(){
 return FOOD_NAMES.map((_,kind)=>{
  const p=Array(256).fill(null),ink='#27344b',colors=['#d54d63','#72bfc2','#62a878','#f2cf67'];
  const rect=(x,y,w,h,c)=>{for(let j=y;j<y+h;j++)for(let i=x;i<x+w;i++)p[j*16+i]=c;};
  if(kind<3){rect(7,2,2,4,ink);rect(9,2,3,2,'#62a878');for(let y=5;y<14;y++)for(let x=3;x<13;x++){const d=((x-7.5)/5)**2+((y-9)/5)**2;if(d<1)p[y*16+x]=d>.65?ink:colors[kind];}rect(5,6,2,2,'#fff0c7');}
  else{rect(1,6,3,5,ink);rect(12,6,3,5,ink);rect(4,4,8,9,ink);rect(5,5,6,7,colors[kind]);rect(6,5,2,7,'#fff0c7');}
  return p;
 });
}
export function validateFoods(value){
 if(value===undefined)return makeFoods();
 if(!Array.isArray(value)||value.length!==4||value.some(p=>!Array.isArray(p)||p.length!==256||p.some(c=>c!==null&&(typeof c!=='string'||!/^#[0-9a-f]{6}$/i.test(c)))))throw Error('食物作品需要四張 16 × 16 畫布。');
 return value.map(p=>p.map(c=>c?.toLowerCase()??null));
}
export function foodLayer(project,kind){
 return {width:16,height:16,activeFrame:0,fps:1,get frames(){return [project.foods[kind]];},set frames(v){project.foods[kind]=v[0];},get pixels(){return project.foods[kind];},set pixels(v){project.foods[kind]=v;}};
}
export function encodeFoods(value){
 const foods=validateFoods(value),out=new Uint8Array(FOOD_BYTES),view=new DataView(out.buffer);out.set([84,80,70,49,1,16,4]);
 foods.forEach((pixels,f)=>{
  if(pixels.every(c=>c===null))throw Error(`${FOOD_NAMES[f]}還是空白，請先畫好或載入範例。`);
  pixels.forEach((c,i)=>{if(c===null)return;const n=parseInt(c.slice(1),16),at=16+f*544;view.setUint16(at+i*2,((n>>>19)<<11)|(((n>>>10)&63)<<5)|((n>>>3)&31),true);out[at+512+(i>>3)]|=1<<(i&7);});
 });return out;
}
export function decodeFoods(b){
 const bad=()=>{throw Error('食物素材校驗不正確。');};
 if(b.length!==FOOD_BYTES||String.fromCharCode(...b.slice(0,4))!=='TPF1'||b[4]!==1||b[5]!==16||b[6]!==4||b.slice(7,16).some(Boolean))bad();
 const v=new DataView(b.buffer,b.byteOffset,b.byteLength);
 return Array.from({length:4},(_,f)=>{const at=16+f*544;if(!b.slice(at+512,at+544).some(Boolean))bad();return Array.from({length:256},(_,i)=>{
  if(!(b[at+512+(i>>3)]&(1<<(i&7))))return null;
  const c=v.getUint16(at+i*2,true),r=c>>11,g=(c>>5)&63,z=c&31;
  return '#'+[(r<<3)|(r>>2),(g<<2)|(g>>4),(z<<3)|(z>>2)].map(n=>n.toString(16).padStart(2,'0')).join('');
 });});
}
