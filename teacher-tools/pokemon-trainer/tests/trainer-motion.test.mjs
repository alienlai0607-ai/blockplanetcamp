import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeTrainer,serializeTrainer} from '../trainer.js';
import {drawTogether,trainerOffset} from '../trainer-motion.js';

test('all six motions match the device at boundaries and timer rollover',async()=>{
  const dir=await mkdtemp(join(tmpdir(),'trainer-motion-'));
  try {
    const header=new URL('../device/trainer_motion.h',import.meta.url).pathname;
    if(process.env.TAMAPOKE_SOURCE_ROOT)for(const board of ['stopwatch','waveshare-175g'])
      assert.equal(await readFile(join(process.env.TAMAPOKE_SOURCE_ROOT,board,'firmware/TamaPoke/trainer_motion.h'),'utf8'),await readFile(header,'utf8'));
    const times=[0,1,159,160,319,320,479,480,639,640,799,800,1599,1600,0xffffff00,0xffffffff];
    await writeFile(join(dir,'check.cpp'),`#include "${header}"
#include <cstdio>
int main(){for(int a=0;a<6;a++)for(uint32_t t:{${times.map(t=>t+'u').join(',')}}){auto p=TrainerMotion::sample(TrainerMotion::Action(a),t);printf("%d %d\\n",p.x,p.y);}}`.replace('#include <cstdio>','#include <cstdio>\n#include <initializer_list>'));
    execFileSync('c++',['-std=c++17','-fsanitize=address,undefined',join(dir,'check.cpp'),'-o',join(dir,'check')]);
    const actual=execFileSync(join(dir,'check'),{encoding:'utf8'}).trim().split('\n');
    const expected=['idle','walk','play','bath','sleep','feed'].flatMap(action=>times.map(t=>{const p=trainerOffset(action,t);return `${p.x} ${p.y}`;}));
    assert.deepEqual(actual,expected);
  } finally {await rm(dir,{recursive:true,force:true});}
});

test('custom full-canvas art stays separate, below status and inside round display in every scene',()=>{
  const trainer=makeTrainer();trainer.pixels.fill('#123456');trainer.pixels[0]='#000000';
  const partner={name:'大型夥伴',width:64,height:64,fps:8,frames:[Array(4096).fill('#654321'),Array(4096).fill(null)]};
  partner.frames[1][4095]='#654321';
  const before=serializeTrainer(trainer),beforePartner=JSON.stringify(partner);
  for(const scene of ['idle','play','bath','walk'])for(const t of [0,160,320,480,800,1920,0xffffffff]){
    const rects=[],c={fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle});},fillText(){}};
    drawTogether({getContext:()=>c},trainer,partner,scene,t);
    const tr=rects.filter(r=>r.color==='#123456'||r.color==='#000000'),pk=rects.filter(r=>r.color==='#654321');
    assert.equal(tr.length,1024);assert(tr.some(r=>r.color==='#000000'));assert(pk.length>0);
    const gap=Math.min(...pk.map(r=>r.x))-Math.max(...tr.map(r=>r.x+r.w));assert(gap>=7);if(pk.length===4096)assert(gap<=17);assert(Math.max(...tr.map(r=>r.y+r.h))-Math.min(...tr.map(r=>r.y))>=160);
    for(const r of [...tr,...pk]){
      assert(r.y>=120&&r.y+r.h<=306);
      for(const [x,y] of [[r.x,r.y],[r.x+r.w,r.y+r.h]])assert((x-233)**2+(y-233)**2<233**2);
    }
  }
  assert.equal(serializeTrainer(trainer),before);assert.equal(JSON.stringify(partner),beforePartner);
});


test('compact custom trainers keep animation lift below the title in every scene',()=>{
  const partner={name:'夥伴',width:32,height:32,fps:4,frames:[Array(1024).fill('#654321')]};
  for(const [width,height] of [[20,20],[20,22],[4,16],[32,4],[1,1]]){
    const trainer=makeTrainer();trainer.pixels.fill(null);
    for(let y=0;y<height;y++)for(let x=0;x<width;x++)trainer.pixels[y*32+x]='#123456';
    const before=serializeTrainer(trainer);
    for(const scene of ['idle','play','bath','walk'])for(const t of [0,160,320,480,800,0xffffffff]){
      const rects=[],c={fillRect(x,y,w,h){if(this.fillStyle==='#123456')rects.push({x,y,w,h});},fillText(){}};
      drawTogether({getContext:()=>c},trainer,partner,scene,t);
      assert.equal(rects.length,width*height);
      for(const r of rects){
        assert(r.y>=120&&r.y+r.h<=306,`${width}x${height} ${scene} at ${t}: top ${r.y}`);
        for(const [x,y] of [[r.x,r.y],[r.x+r.w,r.y+r.h]])assert((x-233)**2+(y-233)**2<233**2);
      }
    }
    assert.equal(serializeTrainer(trainer),before);
  }
});
