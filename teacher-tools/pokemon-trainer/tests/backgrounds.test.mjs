import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,backgroundLayer,backgroundTemplate,TIMES,BACKGROUND_SIZE,validColor,paint,fill,resize,History,addFrame,serialize,importSprite,readCollection} from '../model.js';

test('three editable backgrounds have distinct skies and never share arrays with other projects',()=>{
 const a=makeProject(),b=makeProject();assert.equal(BACKGROUND_SIZE,64);
 for(const time of TIMES){assert.equal(a.backgrounds[time].length,4096);assert(a.backgrounds[time].every(validColor));assert.notEqual(a.backgrounds[time],b.backgrounds[time]);}
 assert.equal(new Set(TIMES.map(time=>a.backgrounds[time][0])).size,3);
 a.backgrounds.day[0]=null;assert.notEqual(b.backgrounds.day[0],null);assert.notEqual(a.backgrounds.morning[0],null);
});
test('background painting, filling and undo affect only the selected time, not character frames',()=>{
 const p=makeProject('',32,true);addFrame(p);const before=JSON.parse(serialize(p));
 const target=backgroundLayer(p,'morning'),h=new History();h.begin(target);paint(target,0,0,'#ffffff');fill(target,1,0,'#786fa9');assert(h.commit(target));
 assert.equal(p.backgrounds.morning[0],'#ffffff');assert.equal(p.backgrounds.morning[1],'#786fa9');
 assert.deepEqual(p.frames,before.frames);assert.deepEqual(p.backgrounds.day,before.backgrounds.day);assert.deepEqual(p.backgrounds.night,before.backgrounds.night);
 h.undo(backgroundLayer(p,'morning'));assert.deepEqual(p.backgrounds,before.backgrounds);h.redo(backgroundLayer(p,'morning'));assert.equal(p.backgrounds.morning[0],'#ffffff');
});
test('character resizing and undo leave all background pixels untouched',()=>{
 const p=makeProject('',32,true),h=new History();p.backgrounds.night[0]=null;const before=structuredClone(p.backgrounds);
 h.begin(p);resize(p,16);h.commit(p);assert.deepEqual(p.backgrounds,before);h.undo(p);assert.equal(p.width,32);assert.deepEqual(p.backgrounds,before);
});
test('copied backgrounds and restored history keep independent arrays',()=>{
 const p=makeProject(),layer=backgroundLayer(p,'night'),h=new History();h.begin(layer);layer.pixels=p.backgrounds.morning.slice();h.commit(layer);
 const copy=layer.pixels.slice();paint(layer,0,0,null);assert.notEqual(p.backgrounds.morning[0],null);h.undo(layer);h.redo(layer);assert.deepEqual(layer.pixels,copy);paint(layer,1,0,null);h.undo(layer);h.redo(layer);assert.deepEqual(layer.pixels,copy);
});
test('v2 collection migration preserves animation, active frame, IDs and dates while adding backgrounds',()=>{
 const p=makeProject('舊動畫',64,true);addFrame(p);p.pixels[0]='#ffffff';p.fps=9;
 const {backgrounds,backgroundSize,...old}=p;const c=readCollection(JSON.stringify({version:2,activeId:p.id,projects:[old]}));const q=c.projects[0];
 assert.equal(c.version,3);assert.equal(c.activeId,p.id);assert.equal(q.activeFrame,1);assert.equal(q.fps,9);assert.equal(q.createdAt,p.createdAt);assert.equal(q.updatedAt,p.updatedAt);assert.deepEqual(q.frames,p.frames);assert.deepEqual(q.backgrounds,backgrounds);
 const imported=importSprite(JSON.stringify({...old,format:'teampoke-sprite',version:2}));assert.deepEqual(imported.frames,p.frames);assert.deepEqual(imported.backgrounds,backgrounds);
});
test('full-sized animation and three backgrounds survive export, import and collection reload',()=>{
 const p=makeProject('完整世界',64,true);for(let i=0;i<3;i++)addFrame(p);p.fps=12;
 TIMES.forEach((time,i)=>{p.backgrounds[time][i]='#ffffff';p.backgrounds[time][63]=null;});
 const text=serialize(p);assert(text.length<524288);const q=importSprite(text);assert.deepEqual(q.backgrounds,p.backgrounds);assert.deepEqual(q.frames,p.frames);assert.equal(q.fps,12);assert.notEqual(q.id,p.id);
 q.backgrounds.night[3]=null;assert.notEqual(p.backgrounds.night[3],null);
 const restored=readCollection(JSON.stringify({version:3,activeId:p.id,projects:[p]}));assert.deepEqual(restored.projects[0].backgrounds,p.backgrounds);assert.equal(restored.projects[0].activeFrame,3);
});
test('invalid or incomplete new background files fail validation instead of silently discarding drawings',()=>{
 const raw=JSON.parse(serialize(makeProject()));
 for(const patch of [{backgroundSize:32},{backgrounds:null},{backgrounds:{morning:raw.backgrounds.morning}},{backgrounds:{...raw.backgrounds,night:Array(4095).fill(null)}},{backgrounds:{...raw.backgrounds,day:Array(4096).fill('url(bad)')}}])assert.throws(()=>importSprite(JSON.stringify({...raw,...patch})),/背景資料不完整/);
 assert.throws(()=>backgroundTemplate('dawn'));assert.throws(()=>backgroundLayer(makeProject(),'dawn'));
});
