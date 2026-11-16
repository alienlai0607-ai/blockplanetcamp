import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,serialize,importSprite,readCollection,History} from '../model.js';
import {makeTrainer} from '../trainer.js';
import {encodeDevice,decodeDevice,crc32} from '../device.js';
import {makeFoods,foodLayer,encodeFoods,decodeFoods} from '../food.js';
test('four food drawings survive save, import, collection and independent undo',()=>{
 const p=makeProject('我的夥伴',32,true),before=p.foods.map(f=>f.slice()),h=new History(),layer=foodLayer(p,2);
 h.begin(layer);layer.pixels[0]='#000000';h.commit(layer);assert.deepEqual(p.foods[0],before[0]);assert.equal(p.foods[2][0],'#000000');
 assert.deepEqual(importSprite(serialize(p)).foods,p.foods);assert.deepEqual(readCollection(JSON.stringify({version:3,activeId:p.id,projects:[p]})).projects[0].foods,p.foods);
 h.undo(layer);assert.deepEqual(p.foods,before);h.redo(layer);assert.equal(p.foods[2][0],'#000000');
});
test('legacy projects gain independent editable food examples without changing characters',()=>{
 const p=makeProject('KEEP',16,true),raw=JSON.parse(serialize(p));delete raw.foods;delete raw.companionBase;
 const a=importSprite(JSON.stringify(raw)),b=importSprite(JSON.stringify(raw));assert.deepEqual(a.frames,p.frames);assert.equal(a.companionBase,133);a.foods[0][0]='#000000';assert.notEqual(a.foods[0][0],b.foods[0][0]);
});
test('custom companion, identity, food and all animation frames share a checked v4 package',()=>{
 const p=makeProject('棉花小龍',32,true);p.companionBase=147;p.foods[1][0]='#000000';const bytes=encodeDevice(p,makeTrainer(),{companionBase:p.companionBase}),decoded=decodeDevice(bytes);
 assert.equal(decoded.schema,4);assert.deepEqual(decoded.companion,{name:'棉花小龍',baseSpecies:147});assert.equal(decoded.foods[1][0],'#000000');assert.equal(decoded.foods[1][1],null);assert.equal(decoded.frames.length,1);
});
test('maximum color, 64px four-frame companion plus food fits existing 64KiB storage',()=>{
 const p=makeProject('Maximum',64,true),color=i=>'#'+((i*71317)&0xffffff).toString(16).padStart(6,'0');p.frames=Array.from({length:4},(_,f)=>Array.from({length:4096},(_,i)=>color(i+f*4096)));for(const k of ['morning','day','night'])p.backgrounds[k]=p.frames[0].slice();
 const b=encodeDevice(p,makeTrainer(),{companionBase:25});assert(b.length<=65536);assert.equal(decodeDevice(b).frames.length,4);
});
test('blank or corrupted food and blank companions are rejected before transmission',()=>{
 const p=makeProject('Empty',16);assert.throws(()=>encodeDevice(p,makeTrainer(),{companionBase:133}),/先畫/);p.frames[0][0]='#000000';p.foods[3].fill(null);assert.throws(()=>encodeDevice(p,makeTrainer(),{}),/糖果/);
 const b=encodeFoods(makeFoods());b[7]=1;assert.throws(()=>decodeFoods(b));
});
test('CRC-valid invalid species and metadata padding are rejected',()=>{
 const p=makeProject('Test',16,true),b=encodeDevice(p,makeTrainer(),{}),v=new DataView(b.buffer);const meta=v.getUint32(32+(p.frames.length+4)*16+4,true);b[meta+6]=152;v.setUint32(12,crc32(b),true);assert.throws(()=>decodeDevice(b));
});
