import test from 'node:test';
import assert from 'node:assert/strict';
import {AnimationPlayer} from '../playback.js';
import {makeProject,addFrame} from '../model.js';

test('default timers preserve the browser global receiver and advance real frame data',()=>{
  const originalSet=globalThis.setTimeout,originalClear=globalThis.clearTimeout;
  let time=0,id=0;const timers=new Map(),seen=[];
  // Window timers reject a foreign receiver; Node timers do not, so enforce it here.
  globalThis.setTimeout=function(callback,delay){if(this!==globalThis)throw new TypeError('Illegal invocation');timers.set(++id,{callback,delay});return id;};
  globalThis.clearTimeout=function(key){if(this!==globalThis)throw new TypeError('Illegal invocation');timers.delete(key);};
  try {
    const p=makeProject('',16);p.pixels[0]='#ffffff';addFrame(p);p.pixels[0]='#214d40';p.fps=4;
    const player=new AnimationPlayer(index=>seen.push(p.frames[index][0]),{now:()=>time});
    assert.doesNotThrow(()=>player.start(p));assert.deepEqual(seen,['#ffffff']);
    for(const tick of [250,500,750]){time=tick;const [key,timer]=[...timers.entries()][0];assert.equal(timer.delay,250);timers.delete(key);assert.doesNotThrow(timer.callback);}
    assert.deepEqual(seen,['#ffffff','#214d40','#ffffff','#214d40']);
    assert.doesNotThrow(()=>player.stop());assert.equal(timers.size,0);
    p.fps=8;assert.doesNotThrow(()=>player.start(p));assert.equal([...timers.values()][0].delay,125);
    player.start(p);assert.equal(timers.size,1);player.stop();assert.equal(timers.size,0);
  } finally {globalThis.setTimeout=originalSet;globalThis.clearTimeout=originalClear;}
});
