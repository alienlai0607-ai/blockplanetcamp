import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {mountDevicePanel} from '../usb-ui.js';
import {makeProject} from '../model.js';
import {encodeDevice} from '../device.js';
const until=async predicate=>{for(let i=0;i<100;i++){if(predicate())return;await new Promise(resolve=>setTimeout(resolve,5));}throw Error('UI timeout');};

for(const {supported,blocked=false,version='1.18-SWdev11-webusb'} of [{supported:true},{supported:false},{supported:true,blocked:true},{supported:true,blocked:true,version:'1.18-SWdev12-artstore'}])test(`device controls preserve editor and enforce explicit connection/install choices (${supported?'supported':'unsupported'} ${blocked?'blocked '+version:'normal'})`,async()=>{
 const window=new Window({url:'https://blockplanetcamp.com/teacher-tools/pokemon-trainer/'});window.document.write((await readFile(new URL('../index.html',import.meta.url),'utf8')).replace(/<script[\s\S]*?<\/script>/g,''));
 window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 let ctrl,closed=false,size=0,crc='00000000',generation=0,offset=0,requests=0;
 const port={async open(){},async setSignals(){},async close(){closed=true;},readable:new ReadableStream({start(c){ctrl=c;},cancel(){closed=true;}}),writable:new WritableStream({write(bytes){const [_,token,cmd,a,b]=new TextDecoder().decode(bytes).trim().split(' ');let response='';
   if(cmd==='HELLO')response=`INFO protocol=1 board=stopwatch-c152 fw=${version} max=65536 chunk=256 storage=ready size=${size} crc=${crc} generation=${generation} capabilities=backgrounds`;
   if(cmd==='BEGIN'){size=Number(a);crc=b;offset=0;response='READY 0';}
   if(cmd==='DATA'){offset+=b.length/2;response='ACK '+offset;}
   if(cmd==='COMMIT'){if(blocked)response='ERR storage_blocked';else{generation++;response=`STORED ${size} ${crc}`;}}
   if(cmd==='ABORT')response='ABORTED ok';
   if(!closed)queueMicrotask(()=>ctrl.enqueue(new TextEncoder().encode(`TP ${token} ${response}\n`)));
 }})};
 const descriptors={};for(const [name,value]of Object.entries({window,document:window.document,isSecureContext:true,navigator:{serial:supported?{requestPort:async()=>{requests++;return port;}}:undefined}})){descriptors[name]=Object.getOwnPropertyDescriptor(globalThis,name);Object.defineProperty(globalThis,name,{value,writable:true,configurable:true});}
 try{
   const $=id=>window.document.getElementById(id);let artReads=0;mountDevicePanel({getArtwork:()=>{artReads++;return encodeDevice(makeProject('',16,true));},download(){},toast(){}});
   assert.equal($('usbSend').disabled,true);assert.equal(requests,0);assert.equal($('firmwareMode').value,'update');assert.equal($('confirmErase').checked,false);assert.equal($('firmwareInstall').disabled,true);
   if(supported){
     $('usbConnect').click();$('usbConnect').click();await until(()=>$('usbSend').disabled===false);assert.equal(requests,1);assert.match($('usbStatus').textContent,/已連接/);
     $('usbSend').click();$('usbSend').click();
     if(blocked){await until(()=>$('usbSend').disabled&&$('usbStatus').classList.contains('error'));assert.equal(generation,0);assert.equal($('usbProgress').hidden,true);assert.match($('usbStatus').textContent,version.includes('dev11')?/更新到 SWdev12/:/安全檢查/);$('usbSend').click();assert.equal(artReads,1);}
     else{await until(()=>$('usbStatus').textContent.includes('校驗成功'));assert.equal(generation,1);}
     assert.equal(artReads,1);assert.equal($('usbCancel').hidden,true);
   }else{assert.equal($('usbConnect').disabled,true);assert.match($('usbStatus').textContent,/Chrome/);$('usbConnect').click();assert.equal(requests,0);}
   $('openFirmware').click();await until(()=>$('firmwareDialog').open);assert.equal($('firmwareConnect').disabled,true);assert.equal($('firstInstallNotice').hidden,true);
   $('firmwareMode').value='install';$('firmwareMode').dispatchEvent(new window.Event('change'));assert.equal($('firstInstallNotice').hidden,false);assert.equal($('firmwareInstall').disabled,true);
   $('confirmStopWatch').checked=true;$('confirmStopWatch').dispatchEvent(new window.Event('change'));assert.equal($('firmwareConnect').disabled,!supported);assert.equal($('firmwareInstall').disabled,true);
   $('firmwareClose').click();await until(()=>!$('firmwareDialog').open);assert.equal(requests,supported?1:0);
 }finally{for(const [name,descriptor]of Object.entries(descriptors)){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}await window.happyDOM.abort();}
});
