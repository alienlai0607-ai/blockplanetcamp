import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=fileURLToPath(new URL('../',import.meta.url));
test('both released boards use identical link rules; real protocol survives lossy, duplicate and reordered rounds',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'tamapoke-link-test-'));
 try{
  const check=spawnSync('python3',['-c',`import pathlib,zipfile,sys,json,hashlib
root=pathlib.Path(sys.argv[1])
for board in ['stopwatch','waveshare-175g']:
 p=root/'firmware'/board
 manifest=json.loads((p/'manifest.json').read_text())
 assert 'local-friendly-battle' in manifest['features']
 with zipfile.ZipFile(p/'source.zip') as z:
  for name in ['link_core.h','battle_core.h','battle_data.h']:
   names=[n for n in z.namelist() if n.endswith('firmware/TamaPoke/'+name)]
   assert len(names)==1 and z.read(names[0])==(root/'device/link'/name).read_bytes()
`,root],{encoding:'utf8'});assert.equal(check.status,0,check.stderr);
  const bin=join(dir,'test');const compile=spawnSync('c++',['-std=c++17','-O1','-g','-fsanitize=address,undefined','-fno-omit-frame-pointer','-I'+join(root,'device/link'),join(root,'device/link/test_link.cpp'),'-o',bin],{encoding:'utf8',timeout:60000});assert.equal(compile.status,0,compile.stderr);
  const run=spawnSync(bin,[],{encoding:'utf8',timeout:60000});assert.equal(run.status,0,run.stdout+'\n'+run.stderr);assert.match(run.stdout,/160 complete lossy/);
 }finally{await rm(dir,{recursive:true,force:true});}
});
