import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,addFrame,deleteFrame,moveFrame,previousPixels,paint,resize,History,serialize,importSprite,readCollection,frameAt,sheetPixels} from '../model.js';
import {AnimationPlayer} from '../playback.js';

test('copying a frame creates independent artwork, blank frame is truly transparent',()=>{
 const p=makeProject('',16);paint(p,0,0,'#ffffff');addFrame(p);paint(p,0,0,'#214d40');assert.equal(p.frames[0][0],'#ffffff');assert.equal(p.frames[1][0],'#214d40');addFrame(p,false);assert(p.pixels.every(v=>v===null));assert.equal(p.activeFrame,2);
});
test('four-frame limit and last-frame protection preserve the artwork',()=>{
 const p=makeProject();assert.throws(()=>deleteFrame(p));for(let i=0;i<3;i++)addFrame(p);const before=serialize(p);assert.throws(()=>addFrame(p));assert.equal(serialize(p),before);assert.equal(p.frames.length,4);
});
test('frame reorder moves the drawing with the selection and handles boundaries',()=>{
 const p=makeProject('',16);p.pixels[0]='#ffffff';addFrame(p);p.pixels[0]='#214d40';assert(moveFrame(p,-1));assert.equal(p.activeFrame,0);assert.equal(p.frames[0][0],'#214d40');assert.equal(p.frames[1][0],'#ffffff');assert.equal(moveFrame(p,-1),false);deleteFrame(p);assert.equal(p.pixels[0],'#ffffff');
});
test('undo/redo restores frame additions, deleted content and active selection',()=>{
 const p=makeProject('',16),h=new History();paint(p,0,0,'#ffffff');h.begin(p);addFrame(p);paint(p,2,2,'#214d40');h.commit(p);h.undo(p);assert.equal(p.frames.length,1);assert.equal(p.activeFrame,0);h.redo(p);assert.equal(p.frames.length,2);assert.equal(p.activeFrame,1);assert.equal(p.pixels[34],'#214d40');h.begin(p);deleteFrame(p);h.commit(p);h.undo(p);assert.equal(p.pixels[34],'#214d40');
});
test('undo from a different selected frame returns to the edited frame',()=>{
 const p=makeProject('',16);addFrame(p);const h=new History();h.begin(p);paint(p,3,3,'#ffffff');h.commit(p);p.activeFrame=0;h.undo(p);assert.equal(p.activeFrame,1);assert.equal(p.pixels[51],null);h.redo(p);assert.equal(p.pixels[51],'#ffffff');
});
test('resizing changes every frame, and undo restores cropped pixels in every frame',()=>{
 const p=makeProject('',32),h=new History();p.pixels[0]='#ffffff';addFrame(p);p.pixels[0]='#214d40';h.begin(p);resize(p,16);h.commit(p);assert(p.frames.every(f=>f.length===256));assert(p.frames.every(f=>f[0]===null));h.undo(p);assert.equal(p.frames[0][0],'#ffffff');assert.equal(p.frames[1][0],'#214d40');assert.equal(p.width,32);
});
test('onion skin reads only the previous frame and never changes either drawing',()=>{
 const p=makeProject();assert.equal(previousPixels(p),null);p.pixels[0]='#ffffff';addFrame(p,false);const before=serialize(p);assert.equal(previousPixels(p)[0],'#ffffff');assert.equal(p.pixels[0],null);assert.equal(serialize(p),before);
});
test('v1 downloaded files migrate to a single frame without changing a pixel',()=>{
 const pixels=Array(256).fill(null);pixels[51]='#FfAa11';const p=importSprite(JSON.stringify({format:'teampoke-sprite',version:1,name:'以前的小龍',width:16,height:16,pixels}));assert.equal(p.frames.length,1);assert.equal(p.pixels[51],'#ffaa11');assert.equal(p.fps,4);assert.equal(p.name,'以前的小龍');
});
test('v1 browser collection retains IDs, selected project and dates after migration',()=>{
 const old={version:1,activeId:'b',projects:['a','b'].map(id=>({id,name:id,width:16,height:16,pixels:Array(256).fill(id==='a'?'#ffffff':null),createdAt:'2026-11-12',updatedAt:'2026-11-12'}))};const c=readCollection(JSON.stringify(old));assert.equal(c.version,3);assert.equal(c.activeId,'b');assert.equal(c.projects[0].pixels[0],'#ffffff');assert.equal(c.projects[0].createdAt,'2026-11-12');assert.equal(c.projects[1].frames.length,1);
});
test('animation export and collection reload preserve all frames and playback speed',()=>{
 const p=makeProject('動畫小龍',64,true);addFrame(p);paint(p,0,0,'#ffffff');p.fps=8;const q=importSprite(serialize(p));assert.deepEqual(q.frames,p.frames);assert.equal(q.fps,8);assert.equal(q.activeFrame,0);assert.notEqual(q.id,p.id);
 const raw=JSON.stringify({version:2,activeId:p.id,projects:[p]});assert(!raw.includes('"pixels"'));const c=readCollection(raw);assert.equal(c.projects[0].activeFrame,1);assert.equal(c.projects[0].pixels[0],'#ffffff');
});
test('invalid animation speed, frame count, dimensions and pixels fail without coercion',()=>{
 const raw=JSON.parse(serialize(makeProject('',16)));
 for(const patch of [{fps:0},{fps:13},{fps:2.5},{fps:'4'},{frames:[]},{frames:Array(5).fill(raw.frames[0])},{frames:[Array(16).fill(null)]},{frames:[Array(256).fill('#fff')]}])assert.throws(()=>importSprite(JSON.stringify({...raw,...patch})));
 assert.throws(()=>readCollection(JSON.stringify({version:2,activeId:'a',projects:[{...raw,id:'a',activeFrame:9}]})));
});
test('frame clock loops at the selected speed and sprite sheet retains transparent pixels',()=>{
 const p=makeProject('',16);p.pixels[0]='#ffffff';addFrame(p,false);p.pixels[15]='#214d40';p.fps=4;
 assert.deepEqual([0,249,250,499,500].map(t=>frameAt(p,t)),[0,0,1,1,0]);p.fps=8;assert.equal(frameAt(p,125),1);
 const sheet=sheetPixels(p);assert.equal(sheet.width,32);assert.equal(sheet.height,16);assert.equal(sheet.pixels[0],'#ffffff');assert.equal(sheet.pixels[31],'#214d40');assert.equal(sheet.pixels[16],null);assert.equal(sheet.pixels[32],null);
});
test('preview is read-only, runs a single timer, stops and changes speed correctly',()=>{
 let time=0,id=0;const timers=new Map(),seen=[];
 const player=new AnimationPlayer(frame=>seen.push(frame),{now:()=>time,setTimer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimer:key=>timers.delete(key)});
 const p=makeProject();assert.equal(player.start(p),false);assert.equal(timers.size,0);addFrame(p);p.activeFrame=1;const before=JSON.stringify(p);player.start(p);assert.equal(seen.at(-1),0);assert.equal(timers.size,1);
 let [key,timer]=[...timers.entries()][0];assert.equal(timer.ms,250);timers.delete(key);time=250;timer.fn();assert.equal(seen.at(-1),1);assert.equal(timers.size,1);assert.equal(JSON.stringify(p),before);
 player.start(p);assert.equal(timers.size,1);player.stop();assert.equal(timers.size,0);p.fps=8;player.start(p);assert.equal([...timers.values()][0].ms,125);player.stop();assert.equal(player.running,false);
});
