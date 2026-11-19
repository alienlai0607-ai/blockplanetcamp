import {test} from 'node:test';
import assert from 'node:assert/strict';
import {featuredGames,example} from '../arcade/projects.js';
import {encodeCartridge,checksum} from '../arcade/cartridge.js';
import {sendCartridge} from '../arcade/cartridge-usb.js';

const artwork=[{group:1,key:'player',width:2,height:2,fps:4,frames:[[65536,0,65535,31]]}];
test('all game programs produce a sealed cartridge including custom artwork',()=>{
 for(const id of featuredGames){
  const p=example(id),original=structuredClone(p),b=encodeCartridge(p,artwork),v=new DataView(b.buffer);
  assert.deepEqual(p,original);assert.equal(new TextDecoder().decode(b.subarray(0,4)),'BPG1');
  assert.equal(v.getUint32(4,true),b.length);assert.equal(v.getUint32(8,true),checksum(b.subarray(12)));
  const edited=structuredClone(p);edited.life=13;assert.notDeepEqual(encodeCartridge(edited,artwork),b);
 }
});
test('game upload verifies the device receipt and rejects artwork-only firmware before beginning',async()=>{
 const b=encodeCartridge(example('space'),artwork);let buffer=[],committed=false,calls=0;
 const link={request:async(cmd,accept)=>{
  calls++;const [op,a,data]=cmd.split(' ');const receipt=b.length+' '+new DataView(b.buffer).getUint32(8,true).toString(16).padStart(8,'0');
  if(op==='GBEGIN')assert.ok(accept('READY','0'));
  else if(op==='DATA'){assert.equal(+a,buffer.length);buffer.push(...Buffer.from(data,'hex'));assert.ok(accept('ACK',String(buffer.length)));}
  else if(op==='COMMIT'){assert.deepEqual(Uint8Array.from(buffer),b);committed=true;assert.ok(accept('STORED',receipt));}
  else {assert.equal(op,'GAMEINFO');assert.ok(committed);assert.ok(!accept('GAME','0 00000000'));assert.ok(accept('GAME',receipt));}
 }};
 await assert.rejects(sendCartridge(link,{board:'waveshare-175g',capabilities:'food-v1'},b));assert.equal(calls,0);
 await sendCartridge(link,{board:'waveshare-175g',capabilities:'arcade-v1'},b);assert.ok(committed);
});
