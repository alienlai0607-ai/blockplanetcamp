// Portable little-endian game cartridge, consumed by the Waveshare runtime.
import {validate} from './validate.js';
import {roleCategory,prepareRoles} from './roles.js';
import {prepareTouch} from './touch.js';
export const MAX_CART=384*1024;
export function checksum(bytes){
  let c=~0;for(const b of bytes){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0);}
  return (~c)>>>0;
}
export function encodeCartridge(project,images){
  const p=prepareTouch(structuredClone(validate(project)));prepareRoles(p);
  const strings=new Map(),bytes=[],utf=new TextEncoder(),float=new DataView(new ArrayBuffer(4));
  const id=s=>{
    if(!s)return 0;
    let h=2166136261;for(const b of utf.encode(s))h=Math.imul(h^b,16777619)>>>0;
    if(!h||strings.has(h)&&strings.get(h)!==s)throw Error('兩個名稱發生衝突，請替其中一個改名。');
    strings.set(h,s);return h;
  };
  const u=n=>bytes.push(n&255,n>>>8&255,n>>>16&255,n>>>24);
  const f=n=>{float.setFloat32(0,n||0,true);u(float.getUint32(0,true));};
  const raw=data=>{for(const b of data)bytes.push(b);};
  const name=utf.encode(p.title);u(name.length);raw(name);
  for(const k of ['art','theme','bounds','control'])u(id(p[k]));
  for(const k of ['x','y','life','vyLimit','wallGrip'])f(p[k]);
  u(p.roles.length);for(const r of p.roles){u(id(r.id));u(id(r.art));u(id('#'+roleCategory(r)));}
  u(p.levels.length);
  for(const level of p.levels){
    const grid=level.join('');
    if((grid.match(/[Bofwb*G!]/g)||[]).length>320)throw Error('微雪每一關最多可放 320 個物件，請將關卡拆成兩關。');
    u(level[0].length);u(level.length);raw(utf.encode(grid));
  }
  const rules=[],steps=[];
  function flatten(list){
    const start=steps.length;
    for(const a of list){const n={a,end:0};steps.push(n);if(a.steps)flatten(a.steps);n.end=steps.length;}
    return start;
  }
  for(const r of [...p.rules,...p.functions])rules.push({...r,start:flatten(r.steps),end:steps.length});
  u(p.rules.length);u(p.functions.length);
  for(const r of rules){for(const k of ['on','when','first','second','name'])u(id(r[k]));f(r.threshold);u(r.ms||0);u(r.start);u(r.end);}
  if(steps.length>2000)throw Error('微雪每款遊戲最多支援 2,000 個動作積木。');
  u(steps.length);
  for(const {a,end} of steps){
    for(const k of ['op','role','kind','art','origin','prop','name','axes','when'])u(id(a[k]));
    for(const k of ['value','vx','vy','follow','x','y','threshold','bonus','count','fn','times'])f(typeof a[k]==='number'?a[k]:0);
    for(const k of ['x','y'])u(id(typeof a[k]==='string'?a[k]:null));
    u(end);
  }
  u(images.length);
  for(const im of images){
    u(im.group);u(id(im.key));u(im.width);u(im.height);u(im.fps||1);u(im.frames.length);
    for(const colors of im.frames){
      if(colors.length!==im.width*im.height)throw Error('圖像尺寸不符。');
      const runs=[];
      for(let i=0;i<colors.length;){
        const start=i,color=colors[i++];while(i<colors.length&&colors[i]===color&&i-start<65535)i++;
        runs.push(i-start,color);
      }
      u(runs.length/2);
      for(let i=0;i<runs.length;i+=2){u(runs[i]);u(runs[i+1]);}
      if(bytes.length>MAX_CART-12)throw Error('作品超過微雪單一遊戲 384 KiB 的容量，請減少動畫格或縮小圖像。');
    }
  }
  const body=Uint8Array.from(bytes),out=new Uint8Array(12+body.length),v=new DataView(out.buffer);
  if(out.length>MAX_CART)throw Error('遊戲作品超過 384 KiB。');
  out.set([66,80,71,49]);v.setUint32(4,out.length,true);v.setUint32(8,checksum(body),true);out.set(body,12);return out;
}
