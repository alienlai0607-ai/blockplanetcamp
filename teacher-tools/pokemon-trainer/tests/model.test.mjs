import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject, paint, stroke, fill, resize, History, serialize, importSprite, readCollection, MAX_PROJECTS, sprout, nameOf} from '../model.js';

test('new artwork is transparent and separate projects never share pixels',()=>{
  const a=makeProject('',16), b=makeProject('朋友',16);assert.equal(a.name,'未命名夥伴');assert.equal(a.pixels.length,256);assert(a.pixels.every(p=>p===null));paint(a,1,1,'#ffffff');assert.equal(b.pixels[17],null);assert.notEqual(a.id,b.id);
});
test('fast strokes include both endpoints with no diagonal gaps',()=>{
  const p=makeProject('',16);stroke(p,[0,0],[15,15],'#214d40');for(let i=0;i<16;i++)assert.equal(p.pixels[i*16+i],'#214d40');assert.equal(p.pixels.filter(Boolean).length,16);
  stroke(p,[15,0],[0,0],'#ffffff');for(let i=0;i<16;i++)assert.equal(p.pixels[i],'#ffffff');
});
test('mirrored thick brush stays inside canvas, eraser restores transparency',()=>{
  const p=makeProject('',16);paint(p,0,0,'#ffffff',4,true);assert.equal(p.pixels.length,256);for(let y=0;y<3;y++)for(let x=0;x<16;x++)assert.equal(p.pixels[y*16+x],p.pixels[y*16+15-x]);paint(p,0,0,null,4,true);assert(p.pixels.every(v=>v===null));
});
test('fill respects barriers and does not leak diagonally',()=>{
  const p=makeProject('',16);stroke(p,[8,0],[8,15],'#214d40');fill(p,0,0,'#f39850');assert.equal(p.pixels.filter(v=>v==='#f39850').length,128);assert.equal(p.pixels[15],null);fill(p,15,0,'#ffffff');assert.equal(p.pixels.filter(v=>v==='#ffffff').length,112);
  const q=makeProject('',16);paint(q,1,0,'#214d40');paint(q,0,1,'#214d40');fill(q,0,0,'#ffffff');assert.equal(q.pixels[17],null);
});
test('mirrored fill handles separate regions and transparent erase',()=>{
  const p=makeProject('',16);stroke(p,[8,0],[8,15],'#214d40');fill(p,0,0,'#ffffff',true);assert.equal(p.pixels.filter(v=>v==='#ffffff').length,240);fill(p,0,0,null,true);assert.equal(p.pixels.filter(Boolean).length,16);
});
test('undo groups a stroke, redo restores it, new change clears redo',()=>{
  const p=makeProject('',16),h=new History();h.begin(p);for(let i=0;i<8;i++)paint(p,i,0,'#ffffff');assert(h.commit(p));assert.equal(h.past.length,1);h.undo(p);assert(p.pixels.every(v=>v===null));h.redo(p);assert.equal(p.pixels.filter(Boolean).length,8);h.undo(p);h.begin(p);paint(p,3,3,'#214d40');h.commit(p);assert.equal(h.future.length,0);assert.equal(h.redo(p),false);
});
test('no-op actions do not consume undo slots; history is bounded',()=>{
  const p=makeProject('',16),h=new History(3);h.begin(p);assert.equal(h.commit(p),false);for(let i=0;i<6;i++){h.begin(p);paint(p,i,0,'#ffffff');h.commit(p);}assert.equal(h.past.length,3);
});
test('resize centers without scaling and cropped pixels can be restored',()=>{
  const p=makeProject('',32),h=new History();paint(p,0,0,'#214d40');paint(p,15,15,'#ffffff');h.begin(p);resize(p,16);h.commit(p);assert.equal(p.pixels[7*16+7],'#ffffff');assert.equal(p.pixels.filter(Boolean).length,1);h.undo(p);assert.equal(p.width,32);assert.equal(p.pixels[0],'#214d40');resize(p,64);assert.equal(p.pixels[16*64+16],'#214d40');
});
test('export/import round trip preserves editable artwork but assigns new identity',()=>{
  const p=makeProject('棉花小龍',64,true),q=importSprite(serialize(p));assert.equal(q.name,p.name);assert.deepEqual(q.pixels,p.pixels);assert.equal(q.width,64);assert.notEqual(q.id,p.id);assert(!serialize(p).includes(p.id));
});
test('malformed, oversized, unsupported and injected data are rejected',()=>{
  assert.throws(()=>importSprite('{'));assert.throws(()=>importSprite('x'.repeat(524289)));
  const raw=JSON.parse(serialize(makeProject('',16)));
  for(const patch of [{version:2},{width:100000},{height:32},{pixels:[]},{name:{}},{pixels:Array(256).fill('url(https://bad)')}])assert.throws(()=>importSprite(JSON.stringify({...raw,...patch})));
  const q=importSprite(JSON.stringify({...raw,name:'<img src=x onerror=bad()>'}));assert.equal(typeof q.name,'string'); // UI always renders names with textContent.
});
test('collection reload preserves each independent drawing and active selection',()=>{
  const a=makeProject('甲',16),b=makeProject('乙',32,true);paint(a,0,0,'#214d40');const c=readCollection(JSON.stringify({version:1,activeId:b.id,projects:[a,b]}));assert.equal(c.activeId,b.id);assert.equal(c.projects[0].pixels[0],'#214d40');assert.deepEqual(c.projects[1].pixels,b.pixels);
  assert.throws(()=>readCollection(JSON.stringify({...c,projects:[a,a]})));assert.throws(()=>readCollection(JSON.stringify({...c,projects:[]})));assert.throws(()=>readCollection(JSON.stringify({...c,projects:Array(MAX_PROJECTS+1).fill(a)})));
});
test('original sample scales cleanly at all supported sizes and Unicode names are bounded',()=>{
  for(const size of [16,32,64]){const px=sprout(size);assert.equal(px.length,size*size);assert(px.some(Boolean));assert(px.some(v=>v===null));}
  assert.equal([...nameOf('龍'.repeat(100))].length,24);
});
