import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {makeProject,addFrame} from '../model.js';
import {encodeDevice} from '../device.js';

test('firmware dual-slot storage survives every interrupted erase/write, rejects foreign data, and recovers older valid art',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'trainer-store-'));
 try{
  const p=makeProject('',64,true);for(let i=0;i<3;i++)addFrame(p,false);
  for(const pixels of [...p.frames,...Object.values(p.backgrounds)])pixels.forEach((_,i)=>pixels[i]='#'+((i*1234567)&0xffffff).toString(16).padStart(6,'0'));
  const a=encodeDevice(p);p.backgrounds.day[100]='#ffffff';const b=encodeDevice(p);
  await writeFile(join(dir,'a'),a);await writeFile(join(dir,'b'),b);
  await writeFile(join(dir,'test.cpp'),`#include "trainer_store.h"
#include <vector>
#include <fstream>
#include <cassert>
#include <iostream>
using namespace TrainerStore;
struct Memory:Flash{
 std::vector<uint8_t> data=std::vector<uint8_t>(PARTITION_SIZE,255);int writes=0,fail=-1;bool partial=false;
 bool read(uint32_t o,uint8_t*p,size_t n)override{assert(o+n<=data.size());memcpy(p,data.data()+o,n);return true;}
 bool cut(uint32_t o,size_t n,const uint8_t*p){if(fail>=0&&writes++==fail){if(partial){for(size_t i=0;i<n/2;i++)data[o+i]=p?data[o+i]&p[i]:255;}return true;}return false;}
 bool erase(uint32_t o,size_t n)override{assert(o>=FIRST&&o+n<=FIRST+2*SLOT_SIZE&&o%4096==0&&n%4096==0);if(cut(o,n,nullptr))return false;memset(data.data()+o,255,n);return true;}
 bool write(uint32_t o,const uint8_t*p,size_t n)override{assert(o+n<=FIRST+2*SLOT_SIZE);if(cut(o,n,p))return false;for(size_t i=0;i<n;i++){assert((data[o+i]&p[i])==p[i]);data[o+i]&=p[i];}return true;}
};
std::vector<uint8_t> read(const char*p){std::ifstream f(p,std::ios::binary);return std::vector<uint8_t>((std::istreambuf_iterator<char>(f)),{});}
int main(int argc,char**argv){auto a=read(argv[1]),b=read(argv[2]);std::vector<uint8_t> out(65536);Memory m;Store s(m);assert(!s.load(out.data(),out.size()));assert(std::string(s.state())=="unclaimed");assert(s.commit(a.data(),a.size()));auto baseline=m.data;assert(s.active.sequence==1);assert(s.active.slot==0);
 // Every sector inside the exact 140 KiB reservation must be blank before claim.
 for(uint32_t at=0;at<RESERVED_SIZE;at+=4096){Memory foreign;foreign.data[at+4095]=0;Store refuse(foreign);assert(!refuse.load(out.data(),out.size()));auto original=foreign.data;assert(!refuse.commit(a.data(),a.size()));assert(foreign.data==original);assert(!refuse.available());}
 // Legacy data beyond the reserved prefix must survive first and subsequent uploads.
 Memory legacy;for(uint32_t at=RESERVED_SIZE;at<PARTITION_SIZE;at++)legacy.data[at]=uint8_t(at*13);auto original=legacy.data;Store allow(legacy);assert(!allow.load(out.data(),out.size()));assert(allow.commit(a.data(),a.size()));assert(allow.commit(b.data(),b.size()));assert(memcmp(legacy.data.data()+RESERVED_SIZE,original.data()+RESERVED_SIZE,PARTITION_SIZE-RESERVED_SIZE)==0);Store reboot(legacy);assert(reboot.load(out.data(),out.size())==b.size());assert(memcmp(out.data(),b.data(),b.size())==0);
 // An optional local full-flash backup tests the reported physical layout offline.
 if(argc>3){auto full=read(argv[3]);assert(full.size()==0x1000000);Memory actual;memcpy(actual.data.data(),full.data()+PARTITION_ADDRESS,PARTITION_SIZE);auto saved=actual.data;Store fixed(actual);assert(!fixed.load(out.data(),out.size()));assert(fixed.commit(a.data(),a.size()));assert(memcmp(actual.data.data()+RESERVED_SIZE,saved.data()+RESERVED_SIZE,PARTITION_SIZE-RESERVED_SIZE)==0);Store boot(actual);assert(boot.load(out.data(),out.size())==a.size());std::cout<<"real-backup-layout preserved\\n";}
 // Failure before, during and after every erase, payload write and publication.
 int failures=0;for(int partial=0;partial<2;partial++)for(int fail=0;fail<260;fail++){
  m.data=baseline;m.fail=-1;Store attempt(m);assert(attempt.load(out.data(),out.size())==a.size());m.writes=0;m.fail=fail;m.partial=partial;bool committed=attempt.commit(b.data(),b.size());m.fail=-1;Store boot(m);auto n=boot.load(out.data(),out.size());assert(n==a.size()||n==b.size());auto crc=TrainerAssets::u32(out.data()+12);assert(crc==TrainerAssets::u32(a.data()+12)||crc==TrainerAssets::u32(b.data()+12));if(!committed){failures++;assert(crc==TrainerAssets::u32(a.data()+12));}assert(memcmp(m.data.data()+FIRST,baseline.data()+FIRST,SLOT_SIZE)==0);
 }
 assert(failures>400);
 m.data=baseline;m.fail=-1;Store next(m);assert(next.load(out.data(),out.size())==a.size());assert(next.commit(b.data(),b.size()));assert(next.active.slot==1);m.data[FIRST+SLOT_SIZE+PAYLOAD+155]^=1;Store recover(m);assert(recover.load(out.data(),out.size())==a.size());assert(recover.active.sequence==1);
 // Header corruption and malformed packages cannot clobber the active slot.
 m.data=baseline;Store safe(m);assert(safe.load(out.data(),out.size())==a.size());auto bad=b;bad[150]^=1;assert(!safe.commit(bad.data(),bad.size()));assert(m.data==baseline);
 for(int n=0;n<32;n++){m.data=baseline;m.data[n]^=1;Store broken(m);assert(!broken.load(out.data(),out.size()));auto snapshot=m.data;assert(!broken.commit(b.data(),b.size()));assert(m.data==snapshot);}
 std::cout<<"power-loss cases="<<failures<<"\\n";
}`);
  execFileSync('c++',['-std=c++17','-O1','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+new URL('../device/',import.meta.url).pathname,join(dir,'test.cpp'),'-o',join(dir,'test')],{timeout:30000});
  const args=[join(dir,'a'),join(dir,'b')];if(process.env.STOPWATCH_TEST_BACKUP)args.push(process.env.STOPWATCH_TEST_BACKUP);
  const report=execFileSync(join(dir,'test'),args,{timeout:30000,encoding:'utf8'});assert.match(report,/power-loss cases=/);if(process.env.STOPWATCH_TEST_BACKUP)assert.match(report,/real-backup-layout preserved/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
