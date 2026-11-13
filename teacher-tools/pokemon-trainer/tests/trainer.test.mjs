import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeTrainer,upgradeTrainerExample,drawTrainerIntro,trainerName,serializeTrainer,readTrainer,encodeProfile,decodeProfile,PROFILE_BYTES} from '../trainer.js';
import {makeProject,addFrame,serialize} from '../model.js';
import {encodeDevice,decodeDevice,crc32} from '../device.js';
test('only the untouched old example upgrades; custom drawings and names survive',async()=>{
 const saved=await readFile(new URL('./fixtures/trainer-side-example.json',import.meta.url),'utf8');
 const old=readTrainer(saved);old.name='小魚';assert(upgradeTrainerExample(old));assert.equal(old.name,'小魚');assert.deepEqual(old.pixels,makeTrainer().pixels);assert(!upgradeTrainerExample(old));
 const drawn=readTrainer(saved);drawn.pixels[0]='#ff0000';const before=serializeTrainer(drawn);assert(!upgradeTrainerExample(drawn));assert.equal(serializeTrainer(drawn),before);
 const pixels=makeTrainer().pixels;assert.equal(new Set(pixels.filter(Boolean)).size,7);
 for(let y=0;y<32;y+=2)for(let x=0;x<32;x+=2){const c=pixels[y*32+x];assert.equal(pixels[y*32+x+1],c);assert.equal(pixels[(y+1)*32+x],c);assert.equal(pixels[(y+1)*32+x+1],c);}
});
test('trainer name stays below status; even a full 64-pixel partner cannot cover it',()=>{
 const trainer=makeTrainer();trainer.name='布拉克星球訓練家';trainer.pixels.fill('#123456');
 const partner={width:64,height:64,pixels:Array(4096).fill('#abcdef')};
 for(const elapsed of [null,0,500,1400,1600,2000,2800]){
  const rects=[],texts=[],g={fillRect(x,y,w,h){rects.push({x,y,w,h,color:this.fillStyle});},fillText(text,x,y,maxWidth){texts.push({text,x,y,maxWidth,baseline:this.textBaseline});}};
  drawTrainerIntro({getContext:()=>g},trainer,partner,elapsed);
  const name=texts.find(p=>p.text===trainer.name);assert.equal(name.baseline,'middle');assert(name.y-10>53);assert(name.y+10<114);assert.equal(name.maxWidth,180);
  for(const p of rects.filter(p=>p.color==='#abcdef')){assert(p.y>=166);assert(p.y+p.h<=310);}
  if(elapsed===null){const body=rects.filter(p=>p.color==='#123456');assert.equal(Math.min(...body.map(p=>p.x)),137);assert.equal(Math.max(...body.map(p=>p.x+p.w)),329);}
 }
});
test('trainer identity is independent, bounded and preserves transparent black pixels',()=>{
 const p=makeTrainer();p.name='外星人小隊';p.pixels[0]='#000000';p.pixels[1]=null;const old=serializeTrainer(p),bits=new Uint8Array(192);bits[0]=13;bits[191]=255;
 const b=encodeProfile(p,bits),q=decodeProfile(b);assert.equal(b.length,2432);assert.equal(q.name,p.name);assert.equal(q.pixels[0],'#000000');assert.equal(q.pixels[1],null);assert.deepEqual(b.slice(2240),bits);assert.equal(serializeTrainer(p),old);
 assert.equal(trainerName(' A\n\u202eB '),'AB');assert.equal([...trainerName('😀'.repeat(12))].length,8);assert.equal(new TextEncoder().encode(trainerName('😀'.repeat(12))).length,32);
 const clone=readTrainer(old);clone.pixels[0]=null;assert.equal(p.pixels[0],'#000000');assert.throws(()=>readTrainer(serialize(makeProject())));
 for(const pos of [0,4,5,6,7,8,9,15,48,63]){const bad=b.slice();bad[pos]=255;assert.throws(()=>decodeProfile(bad));}
 const bad=b.slice();bad[16]=0xc0;assert.throws(()=>decodeProfile(bad));
});
test('v2 worst-case package fits 64 KiB; old art remains byte-for-byte unchanged',()=>{
 const p=makeProject('',64);for(let i=0;i<3;i++)addFrame(p,false);let seed=9;
 for(const pixels of [...p.frames,...Object.values(p.backgrounds)])pixels.forEach((_,i)=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;pixels[i]='#'+(seed&0xffffff).toString(16).padStart(6,'0');});
 const before=serialize(p),trainer=makeTrainer();trainer.name='布拉克星球';const old=decodeDevice(encodeDevice(p)),b=encodeDevice(p,trainer),now=decodeDevice(b);
 assert.equal(b.length,61984);assert.equal(now.schema,2);assert.equal(now.trainer.name,trainer.name);assert.deepEqual(now.frames,old.frames);assert.deepEqual(now.backgrounds,old.backgrounds);assert.equal(serialize(p),before);
 const v=new DataView(b.buffer),at=32+7*16,offset=v.getUint32(at+4,true);for(const pos of [at,at+1,at+2,at+3,at+8,offset+5,offset+16]){const bad=b.slice();bad[pos]=255;new DataView(bad.buffer).setUint32(12,crc32(bad),true);assert.throws(()=>decodeDevice(bad));}
});
test('actual firmware and Python decoder read the same trainer bytes and reject malformed profiles',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'trainer-profile-'));try{
 const p=makeTrainer();p.name='小魚😀';const b=encodeDevice(makeProject('伙伴',32,true),p),raw=encodeProfile(p);await writeFile(join(dir,'art'),b);await writeFile(join(dir,'profile'),raw);
 await writeFile(join(dir,'check.cpp'),`#include "trainer_assets.h"
#include <cassert>
#include <fstream>
#include <vector>
std::vector<uint8_t> read(const char*p){std::ifstream f(p,std::ios::binary);return std::vector<uint8_t>((std::istreambuf_iterator<char>(f)),{});}
int main(int argc,char**argv){auto b=read(argv[1]),expected=read(argv[2]);TrainerAssets::Package p;assert(p.load(b.data(),b.size()));assert(p.profile);assert(!memcmp(p.profile,expected.data(),TrainerProfile::BYTES));
for(unsigned n=0;n<TrainerProfile::BYTES;n++)assert(!TrainerProfile::valid(expected.data(),n));
for(unsigned at:{0,4,5,6,7,8,9,15,48,63}){auto q=expected;q[at]=255;assert(!TrainerProfile::valid(q.data()));}
auto q=expected;q[16]=0xc0;assert(!TrainerProfile::valid(q.data()));assert(TrainerProfile::valid(TrainerProfile::fallback()));
for(size_t n=144;n<b.size();n+=13)assert(!p.load(b.data(),n));}`);
 const device=new URL('../device/',import.meta.url).pathname;
 execFileSync('c++',['-std=c++17','-fsanitize=address,undefined','-I'+device,join(dir,'check.cpp'),'-o',join(dir,'check')],{timeout:30000});execFileSync(join(dir,'check'),[join(dir,'art'),join(dir,'profile')],{timeout:20000});
 const result=JSON.parse(execFileSync('python3',[join(device,'prepare_scene.py'),join(dir,'art')],{encoding:'utf8',timeout:20000}));assert.equal(result.bytes,b.length);assert.equal(result.source_installed,false);
 }finally{await rm(dir,{recursive:true,force:true});}
});
