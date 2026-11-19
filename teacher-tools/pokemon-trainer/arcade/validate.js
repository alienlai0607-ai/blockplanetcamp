import {action,actions,controls,events,guards,kinds,origins,props,skins,symbols,themes} from './projects.js';
import {categories} from './roles.js';
function check(ok){if(!ok)throw Error('這份作品的格式或數值不完整。');}
const option=(set,v)=>Object.hasOwn(set,v);
const num=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const int=(v,min,max)=>Number.isInteger(v)&&num(v,min,max);
const colors=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>x===null||typeof x==='string'&&/^#[a-f0-9]{6}$/i.test(x));
function drawing(d){
  return d&&[16,32,64].includes(d.size)&&int(d.fps,1,12)&&Array.isArray(d.frames)&&int(d.frames.length,1,4)&&d.frames.every(f=>colors(f,d.size**2));
}
function validateLayout(layout){
  const supported=new Set([...Object.keys(events).map(k=>'on_'+k),...Object.keys(actions),'heroDesign','function','touchX','touchY','number'].map(k=>'bp_'+k));
  let count=0;
  function node(b,depth){
    check(depth<130&&++count<=2000&&b&&supported.has(b.type));
    if(b.id!==undefined)check(typeof b.id==='string'&&b.id.length<=150);
    if(b.fields)check(Object.values(b.fields).every(v=>typeof v==='number'&&Number.isFinite(v)||typeof v==='string'&&v.length<=150));
    for(const point of [b.x,b.y])if(point!==undefined)check(num(point,-1000000,1000000));
    for(const c of [...Object.values(b.inputs||{}),b.next].filter(Boolean)){
      if(c.block)node(c.block,depth+1);
      if(c.shadow)node(c.shadow,depth+1);
    }
  }
  check(layout?.languageVersion===0&&Array.isArray(layout.blocks));
  for(const b of layout.blocks)node(b,0);
}
export function validate(p){
  check(p?.version===1&&typeof p.title==='string'&&p.title.length>0&&p.title.length<=40);
  check(option(controls,p.control)&&option(skins,p.art)&&option(themes,p.theme)&&['clamp','exit'].includes(p.bounds));
  check(int(p.life,1,99)&&num(p.x,0,160)&&num(p.y,0,120)&&num(p.speed,0,240)&&num(p.vyLimit,0,600));
  check(typeof p.wallGrip==='boolean'&&Array.isArray(p.levels)&&p.levels.length<=16);
  for(const rows of p.levels){
    check(Array.isArray(rows)&&int(rows.length,1,80)&&typeof rows[0]==='string'&&int(rows[0].length,1,120));
    check(rows.every(r=>typeof r==='string'&&r.length===rows[0].length&&Array.from(r).every(c=>option(symbols,c))));
  }
  check(Array.isArray(p.rules)&&p.rules.length<=100&&Array.isArray(p.functions)&&p.functions.length<=24);
  const knownRole=id=>id==='player'||p.roles?.some(r=>r.id===id);
  if(p.roles!==undefined){
    check(Array.isArray(p.roles)&&p.roles.length>=1&&p.roles.length<=64);
    check(p.roles.every(r=>r&&typeof r.id==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(r.id)&&typeof r.name==='string'&&r.name.trim().length>0&&r.name.length<=20&&(option(skins,r.art)||r.art==='pipe')));
    check(p.roles.every(r=>(r.drawing===undefined||drawing(r.drawing))&&(r.category===undefined||option(categories,r.category))));
    check(p.roles.some(r=>r.id==='player')&&new Set(p.roles.map(r=>r.id)).size===p.roles.length);
  }
  if(p.poses!==undefined){
    check(p.poses&&typeof p.poses==='object'&&!Array.isArray(p.poses)&&Object.keys(p.poses).length<=64);
    for(const [id,d] of Object.entries(p.poses))check((option(skins,id)||/^pose-[a-z0-9-]{1,56}$/.test(id))&&drawing(d)&&typeof d.name==='string'&&d.name.trim().length>0&&d.name.length<=20);
  }
  if(p.scenePixels!==undefined)check(colors(p.scenePixels,4096));
  const collisionTarget=id=>knownRole(id)||typeof id==='string'&&id.startsWith('#')&&option(categories,id.slice(1));
  const steps=(list,depth=0)=>{
    check(depth<8);
    check(Array.isArray(list)&&list.length<=48);
    for(const a of list){
      check(a&&option(actions,a.op));
      const d=action(a.op);
      for(const [k,set] of Object.entries({kind:kinds,art:skins,origin:origins,prop:props}))if(k in d)check(option(set,a[k])||k==='art'&&a.op==='skin'&&Object.hasOwn(p.poses||{},a[k])||k==='kind'&&knownRole(a[k])&&a[k]!=='player');
      for(const k of ['value','vx','vy','follow','bonus'])if(k in d)check(num(k==='bonus'?(a[k]??0):a[k],-2000,2000));
      if('name' in d)check(typeof a.name==='string'&&a.name.length>0&&a.name.length<=20);
      if('count' in d)check(int(a.count,1,8));
      if(a.op==='dragActor')check(['xy','x','y'].includes(a.axes??'xy'));
      if('role' in d)check(knownRole(a.role)||a.op!=='createActor'&&['@first','@second'].includes(a.role));
      if(a.op==='createActor')check(a.role!=='player'&&num(a.x,0,1920)&&num(a.y,0,1280));
      if(a.op==='moveTo')for(const v of [a.x,a.y])check(['touchX','touchY'].includes(v)||num(v,-2000,2000));
      if(a.op==='repeat')check(int(a.times,1,24));
      if(a.op==='condition')check(option(guards,a.when)&&num(a.threshold,-2000,2000));
      if('steps' in d)steps(a.steps,depth+1);
      if('fn' in d)check(int(a.fn,0,p.functions.length-1));
    }
  };
  for(const r of p.rules){check(r&&option(events,r.on)&&option(guards,r.when)&&int(r.ms,40,60000));if(['scoreAt','lifeAt','varAt'].includes(r.when))check(num(r.threshold,-2000,2000));if(r.when==='varAt')check(typeof r.name==='string'&&r.name.length>0&&r.name.length<=20);if(r.on==='collision')check(collisionTarget(r.first)&&collisionTarget(r.second));steps(r.steps);}
  for(const f of p.functions){check(f&&typeof f.name==='string'&&f.name.length<=32);steps(f.steps);}
  // Disallow recursive calls so a child's program always returns to the next game frame.
  function visit(i,path){
    check(!path.includes(i)&&path.length<5);
    function walk(list){for(const a of list){if(a.op==='call')visit(a.fn,[...path,i]);if(a.steps)walk(a.steps);}}
    walk(p.functions[i].steps);
  }
  p.functions.forEach((_,i)=>visit(i,[]));
  if(p.heroSource!==undefined)check(['studio','saved','builtin','drawing'].includes(p.heroSource)&&(p.heroSource!=='drawing'||p.roles?.some(r=>r.id==='player'&&r.drawing))&&(p.heroSource!=='saved'||p.costume));
  if(p.costume){
    const c=p.costume,colors=(v,n)=>Array.isArray(v)&&v.length===n&&v.every(x=>x===null||/^#[\da-f]{6}$/i.test(x));
    if(c.name!==undefined)check(typeof c.name==='string'&&c.name.length<=100);
    check([16,32,64].includes(c.size)&&int(c.fps,1,12)&&Array.isArray(c.frames)&&int(c.frames.length,1,4)&&c.frames.every(f=>colors(f,c.size**2))&&colors(c.background,64**2));
  }
  if(p.blockLayout)validateLayout(p.blockLayout);
  return p;
}
