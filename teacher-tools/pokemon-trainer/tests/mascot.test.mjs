import test from 'node:test';
import assert from 'node:assert/strict';
import {makeProject,serialize,importSprite} from '../model.js';
import {makeTrainer} from '../trainer.js';
import {encodeDevice,decodeDevice,spritePlacement,SCENES,rgb565,color565} from '../device.js';
import {drawTogether,TOGETHER_SCENES} from '../trainer-motion.js';

test('小布 keeps transparency through editable saves and device export',()=>{
 for(const size of [16,32,64]){
  const p=makeProject('小布',size,'xiaobu');
  assert(p.pixels.some(c=>c===null));assert(p.pixels.some(c=>c==='#ff3035'));
  assert.deepEqual(importSprite(serialize(p)).pixels,p.pixels);
  const decoded=decodeDevice(encodeDevice(p,makeTrainer(),{companionBase:133}));
  assert.deepEqual(decoded.frames[0],p.pixels.map(c=>c===null?null:color565(rgb565(c))));
 }
});

test('round mascot stays away from status controls and inside every preview',()=>{
 const p=makeProject('小布',64,'xiaobu'),before=serialize(p);
 assert(p.pixels.slice(0,64).every(c=>c===null));
 assert(p.pixels.slice(-64).every(c=>c===null));
 for(const scene of Object.keys(SCENES)){
  const b=spritePlacement(p,scene),left=b.x+b.left*b.scale,top=b.y+b.top*b.scale;
  assert(top>=132);assert.equal(b.y+(b.bottom+1)*b.scale,SCENES[scene].ground);
  for(const [x,y] of [[left,top],[left+b.width,top+b.height]])assert((x-233)**2+(y-233)**2<233**2);
 }
 for(const scene of Object.keys(TOGETHER_SCENES))for(const time of [0,160,800,1600]){
  const c={fillRect(x,y,w,h){assert([x,y,w,h].every(Number.isFinite));},fillText(){}};
  drawTogether({getContext:()=>c},makeTrainer(),p,scene,time);
 }
 assert.equal(serialize(p),before);
});
