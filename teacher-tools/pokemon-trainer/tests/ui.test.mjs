// DOM-level integration, not a real browser or a visual/touch layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {resolveObjectURL} from 'node:buffer';
import {STORAGE_KEY,sprout} from '../model.js';
import {decodeDevice} from '../device.js';

for(const legacyVersion of [1,2])test(`editor, animation and background flow with v${legacyVersion} migration`,async()=>{
  const window=new Window({url:'https://blockplanetcamp.com/teacher-tools/pokemon-trainer/'});
  const document=window.document;
  const legacy=JSON.stringify({version:legacyVersion,activeId:'original',projects:[{id:'original',name:'芽芽（練習）',width:32,height:32,...(legacyVersion===1?{pixels:sprout()}:{frames:[sprout()],activeFrame:0,fps:4}),createdAt:'2026-11-12',updatedAt:'2026-11-12'}]});
  window.localStorage.setItem(STORAGE_KEY,legacy);
  if(legacyVersion===2)window.localStorage.setItem('teampoke.trainer-profile.v1',await readFile(new URL('./fixtures/trainer-side-example.json',import.meta.url),'utf8'));
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  document.write(html.replace(/<script[\s\S]*?<\/script>/g,''));
  const noop=()=>{};
  const canvasContext={fillText:noop,getImageData:()=>({data:new Uint8ClampedArray(96*16*4)}),clearRect:noop,fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,save:noop,restore:noop,setLineDash:noop,strokeRect:noop};
  let previewPixel0=null,previewPaintCount=0,backgroundPixel0=null;
  window.HTMLCanvasElement.prototype.getContext=function(){
    const target=this;
    return this.testContext ||= {...canvasContext,
      clearRect(){if(target.id==='previewCanvas'){previewPixel0=null;previewPaintCount++;}if(target.id==='previewBackground')backgroundPixel0=null;},
      fillRect(x,y){if(x===0&&y===0){if(target.id==='previewCanvas')previewPixel0=this.fillStyle;if(target.id==='previewBackground')backgroundPixel0=this.fillStyle;}}
    };
  };
  window.HTMLCanvasElement.prototype.setPointerCapture=noop;
  window.HTMLCanvasElement.prototype.hasPointerCapture=()=>false;
  window.HTMLCanvasElement.prototype.releasePointerCapture=noop;
  window.HTMLCanvasElement.prototype.getBoundingClientRect=()=>({left:0,top:0,width:512,height:512});
  let pngCanvas=null;
  window.HTMLCanvasElement.prototype.toBlob=function(callback){pngCanvas=this;callback(new Blob(['png'],{type:'image/png'}));};
  window.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};
  window.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
  const downloads=[],downloadBlobs=[];
  window.HTMLAnchorElement.prototype.click=function(){downloads.push(this.download);downloadBlobs.push(resolveObjectURL(this.href));};
  const originalGlobals={};
  for(const [key,value]of Object.entries({window,document,localStorage:window.localStorage,FormData:window.FormData})) {originalGlobals[key]=globalThis[key];globalThis[key]=value;}
  const originalTimeout=globalThis.setTimeout;
  // Timers remain real, but toast and object URL cleanup cannot hold the test open.
  globalThis.setTimeout=(fn,ms,...args)=>{const timer=originalTimeout(fn,ms,...args);timer.unref();return timer;};
  const $=id=>document.getElementById(id);
  const collection=()=>JSON.parse(window.localStorage.getItem(STORAGE_KEY));
  const save=()=>window.dispatchEvent(new window.Event('pagehide'));
  try {
    await import(`../app.js?dom-test-v${legacyVersion}`);
    if(legacyVersion===2)document.querySelector('[data-mode=trainer]').click();
    assert(!$('trainerPanel').hidden);assert($('animationPanel').hidden);assert.equal($('canvasSize').value,'32');assert($('canvasSize').disabled);
    const originalCollection=window.localStorage.getItem(STORAGE_KEY);
    $('nameInput').value='外星人';$('nameInput').dispatchEvent(new window.Event('input'));$('nameInput').dispatchEvent(new window.Event('blur'));
    $('drawingCanvas').dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:88,button:0,clientX:8,clientY:8}));$('drawingCanvas').dispatchEvent(new window.PointerEvent('pointerup',{pointerId:88}));save();
    assert.equal(JSON.parse(window.localStorage.getItem('teampoke.trainer-profile.v1')).name,'外星人');
    assert.equal(JSON.parse(window.localStorage.getItem('teampoke.trainer-profile.v1')).pixels[0],'#214d40');
    if(legacyVersion===2)assert(window.localStorage.getItem('teampoke.trainer-profile.v1.side-example-backup'));
    $('trainerExample').click();$('confirmCancel').click();await Promise.resolve();save();assert.equal(JSON.parse(window.localStorage.getItem('teampoke.trainer-profile.v1')).pixels[0],'#214d40');
    $('trainerExample').click();$('confirmOk').click();await Promise.resolve();save();assert.equal(JSON.parse(window.localStorage.getItem('teampoke.trainer-profile.v1')).pixels[0],null);
    $('consoleB').click();save();assert.equal(JSON.parse(window.localStorage.getItem('teampoke.trainer-profile.v1')).pixels[0],'#214d40');
    $('consoleB').click();save();assert.equal(JSON.parse(window.localStorage.getItem('teampoke.trainer-profile.v1')).pixels[0],null);
    assert.deepEqual(JSON.parse(window.localStorage.getItem(STORAGE_KEY)).projects[0].frames,JSON.parse(originalCollection).projects[0].frames);
    $('downloadProject').click();const identityExport=JSON.parse(await downloadBlobs.at(-1).text());assert.equal(identityExport.name,'外星人');assert.equal(identityExport.pixels.length,1024);assert(downloads.at(-1).endsWith('.trainer.json'));downloads.length=0;downloadBlobs.length=0;
    $('consoleA').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'true');$('consoleA').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'false');
    document.querySelector('[data-mode=character]').click();
    assert.equal(document.querySelectorAll('.color-swatch').length,16);
    assert.equal(collection().projects.length,1);
    assert.equal(collection().version,3);assert.equal(collection().activeId,'original');
    assert.equal(window.localStorage.getItem(STORAGE_KEY+`.v${legacyVersion}-backup`),legacy);
    assert.deepEqual(collection().projects[0].frames[0],sprout());
    assert.match($('saveStatus').textContent,/已儲存/);
    assert.match($('animationHint').textContent,/只有 1 格/);assert.equal($('playAnimation').disabled,false);
    $('playAnimation').click();assert.match($('toast').textContent,/第 2 格/);assert.equal($('playAnimation').getAttribute('aria-pressed'),'false');
    document.querySelector('[data-mode="background"]').click();$('playAnimation').click();assert.match($('animationHint').textContent,/角色動畫/);assert.match($('toast').textContent,/第 2 格/);document.querySelector('[data-mode="character"]').click();
    $('newProject').click();assert($('newDialog').open);
    $('newName').value='測試小龍';$('newForm').dispatchEvent(new window.Event('submit',{cancelable:true}));
    assert.equal(collection().projects.length,2);assert.equal($('previewName').textContent,'測試小龍');
    const canvas=$('drawingCanvas');
    canvas.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:1,button:0,clientX:8,clientY:8}));
    canvas.dispatchEvent(new window.PointerEvent('pointermove',{pointerId:1,clientX:248,clientY:8}));
    canvas.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:1}));save();
    let p=collection().projects[1];assert.equal(p.frames[0].filter(Boolean).length,16);
    $('undo').click();save();assert(collection().projects[1].frames[0].every(x=>x===null));
    $('redo').click();save();assert.equal(collection().projects[1].frames[0].filter(Boolean).length,16);
    $('nameInput').value='<img src=x onerror=bad()>';$('nameInput').dispatchEvent(new window.Event('input'));save();
    assert.equal($('previewName').children.length,0);assert.match($('previewName').textContent,/<img/);
    // Copy, erase only in the copied frame, then use the physical B button to undo.
    $('duplicateFrame').click();save();assert.equal(collection().projects[1].frames.length,2);
    assert.match($('animationHint').textContent,/圖案目前相同/);
    document.querySelector('[data-tool="eraser"]').click();
    canvas.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:2,button:0,clientX:8,clientY:8}));
    canvas.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:2}));save();
    assert.equal(collection().projects[1].frames[0][0],'#214d40');assert.equal(collection().projects[1].frames[1][0],null);
    $('consoleB').click();save();assert.equal(collection().projects[1].frames[1][0],'#214d40');
    $('redo').click();save();assert.equal(collection().projects[1].frames[1][0],null);
    assert.doesNotMatch($('animationHint').textContent,/圖案目前相同/);
    $('fpsInput').value='8';$('fpsInput').dispatchEvent(new window.Event('change'));save();
    assert.equal(collection().projects[1].fps,8);const beforePreview=window.localStorage.getItem(STORAGE_KEY);
    $('consoleA').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'true');
    const paintCountAtStart=previewPaintCount;assert.equal(previewPixel0,'#214d40');
    await new Promise(resolve=>originalTimeout(resolve,140));
    assert.match($('playbackStatus').textContent,/播放中/);assert.equal(window.localStorage.getItem(STORAGE_KEY),beforePreview);
    const displayedFrame=Number($('playbackStatus').textContent.match(/播放中 (\d+)/)[1])-1;
    assert(previewPaintCount>paintCountAtStart);assert.equal(previewPixel0,collection().projects[1].frames[displayedFrame][0]);
    $('consoleA').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'false');
    document.querySelector('.dpad-left').click();save();assert.equal(collection().projects[1].activeFrame,0);assert($('onionToggle').disabled);
    document.querySelector('.dpad-right').click();assert(!$('onionToggle').disabled);
    $('addFrame').click();$('addFrame').click();save();assert.equal(collection().projects[1].frames.length,4);assert($('duplicateFrame').disabled);
    $('deleteFrame').click();$('confirmOk').click();await Promise.resolve();save();assert.equal(collection().projects[1].frames.length,3);
    $('undo').click();save();assert.equal(collection().projects[1].frames.length,4);
    $('exportScale').value='1';$('downloadSheet').click();assert.equal(pngCanvas.width,128);assert.equal(pngCanvas.height,32);
    $('downloadProject').click();const exported=JSON.parse(await downloadBlobs.at(-1).text());assert.equal(exported.version,3);assert.equal(exported.frames.length,4);assert.equal(exported.fps,8);
    // Backgrounds use their own canvas size and undo stack for each time.
    const originalAnimation=structuredClone(collection().projects[1].frames);
    document.querySelector('[data-mode="background"]').click();
    assert($('animationPanel').hidden);assert(!$('backgroundPanel').hidden);assert($('canvasSize').disabled);assert.equal($('canvasSize').value,'64');
    document.querySelector('[data-time="morning"]').click();assert.match($('frameBadge').textContent,/早晨/);
    const originalBackgrounds=structuredClone(collection().projects[1].backgrounds);
    document.querySelector('[data-color="#ffffff"]').click();
    const dot=()=>{canvas.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:4,button:0,clientX:4,clientY:4}));canvas.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:4}));save();};
    dot();assert.equal(collection().projects[1].backgrounds.morning[0],'#ffffff');assert.equal(backgroundPixel0,'#ffffff');
    assert.deepEqual(collection().projects[1].frames,originalAnimation);assert.deepEqual(collection().projects[1].backgrounds.day,originalBackgrounds.day);assert.deepEqual(collection().projects[1].backgrounds.night,originalBackgrounds.night);
    $('undo').click();save();assert.deepEqual(collection().projects[1].backgrounds,originalBackgrounds);
    $('redo').click();save();assert.equal(backgroundPixel0,'#ffffff');
    document.querySelector('[data-time="night"]').click();assert($('undo').disabled);assert.match($('dpadCaption').textContent,/時段/);assert(document.querySelector('.dpad-right').disabled);
    $('copyBackgroundFrom').value='morning';$('copyBackground').click();$('confirmCancel').click();await Promise.resolve();save();assert.deepEqual(collection().projects[1].backgrounds.night,originalBackgrounds.night);
    $('copyBackground').click();$('confirmOk').click();await Promise.resolve();save();assert.deepEqual(collection().projects[1].backgrounds.night,collection().projects[1].backgrounds.morning);
    document.querySelector('[data-tool="eraser"]').click();dot();assert.equal(collection().projects[1].backgrounds.night[0],null);assert.equal(collection().projects[1].backgrounds.morning[0],'#ffffff');
    $('fpsInput').value='6';$('fpsInput').dispatchEvent(new window.Event('change'));save();assert.equal(collection().projects[1].fps,6);
    $('undo').click();save();assert.equal(collection().projects[1].backgrounds.night[0],'#ffffff');assert.equal(collection().projects[1].fps,6);
    document.querySelector('[data-mode="character"]').click();$('undo').click();save();assert.equal(collection().projects[1].fps,8);assert.equal(collection().projects[1].backgrounds.night[0],'#ffffff');
    document.querySelector('[data-mode="background"]').click();
    const nightBeforeClear=collection().projects[1].backgrounds.night.slice();
    $('clear').click();assert.match($('confirmTitle').textContent,/夜晚背景/);$('confirmOk').click();await Promise.resolve();save();
    assert(collection().projects[1].backgrounds.night.every(v=>v===null));assert.deepEqual(collection().projects[1].frames,originalAnimation);
    $('undo').click();save();assert.deepEqual(collection().projects[1].backgrounds.night,nightBeforeClear);
    $('resetBackground').click();$('confirmOk').click();await Promise.resolve();save();assert.deepEqual(collection().projects[1].backgrounds.night,originalBackgrounds.night);
    $('undo').click();save();assert.deepEqual(collection().projects[1].backgrounds.night,nightBeforeClear);
    $('consoleA').click();document.querySelector('.time-buttons [data-time="day"]').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'true');assert.equal(backgroundPixel0,originalBackgrounds.day[0]);
    await new Promise(resolve=>originalTimeout(resolve,140));assert.match($('playbackStatus').textContent,/白天 · 播放中/);$('consoleA').click();
    document.querySelector('.dpad-left').click();assert.match($('frameBadge').textContent,/早晨/);
    $('downloadPng').click();assert.equal(pngCanvas.width,64);assert.equal(pngCanvas.height,64);assert.match(downloads.at(-1),/早晨背景.png$/);
    $('downloadProject').click();const scene=JSON.parse(await downloadBlobs.at(-1).text());assert.deepEqual(scene.backgrounds,collection().projects[1].backgrounds);assert.equal(scene.backgroundSize,64);assert.deepEqual(scene.frames,originalAnimation);
    assert($('previewStage').classList.contains('device-mode'));assert(!$('deviceGuides').hasAttribute('hidden'));
    $('guideToggle').checked=false;$('guideToggle').dispatchEvent(new window.Event('change'));assert($('deviceGuides').hasAttribute('hidden'));
    $('deviceUIToggle').checked=false;$('deviceUIToggle').dispatchEvent(new window.Event('change'));assert($('deviceUI').hasAttribute('hidden'));
    $('deviceScene').value='home';$('deviceScene').dispatchEvent(new window.Event('change'));assert(!$('homeOverlay').hasAttribute('hidden'));assert($('explorationOverlay').hasAttribute('hidden'));
    $('previewHour').value='5';$('previewHour').dispatchEvent(new window.Event('input'));assert.match($('previewHourLabel').textContent,/05:00 · 早晨/);assert.match($('deviceTimeLabel').textContent,/早晨/);
    $('previewHour').value='18';$('previewHour').dispatchEvent(new window.Event('input'));assert.match($('deviceTimeLabel').textContent,/夜晚/);
    $('downloadDevice').click();assert.match(downloads.at(-1),/\.tpdevice$/);const packageBytes=new Uint8Array(await downloadBlobs.at(-1).arrayBuffer());const packed=decodeDevice(packageBytes);assert.equal(packed.frames.length,4);assert.equal(packed.backgrounds.night.length,4096);assert.match($('deviceBudget').textContent,/64 KiB/);
    $('previewMode').value='art';$('previewMode').dispatchEvent(new window.Event('change'));assert(!$('previewStage').classList.contains('device-mode'));
    // Import through the UI, keeping the original project and its backgrounds.
    const file=new window.File([JSON.stringify(scene)],'scene.tpsprite.json',{type:'application/json'});
    Object.defineProperty($('importFile'),'files',{configurable:true,value:[file]});$('importFile').dispatchEvent(new window.Event('change'));await new Promise(resolve=>originalTimeout(resolve,0));save();
    assert.equal(collection().projects.length,3);assert.deepEqual(collection().projects[2].backgrounds,scene.backgrounds);assert.deepEqual(collection().projects[2].frames,scene.frames);
    assert(!$('canvasSize').disabled);assert.equal($('canvasSize').value,'32');assert.equal($('backgroundPanel').hidden,true);
    downloads.length=0;downloadBlobs.length=0;
    $('openGallery').click();assert.equal(document.querySelectorAll('.gallery-card').length,3);
    document.querySelector('.gallery-open').click();assert.equal($('previewName').textContent,'芽芽（練習）');
    $('canvasSize').value='16';$('canvasSize').dispatchEvent(new window.Event('change'));assert($('confirmDialog').open);
    $('confirmCancel').click();await Promise.resolve();assert.equal($('canvasSize').value,'32');
    $('exportScale').value='1';$('downloadPng').click();assert.equal(pngCanvas.width,32);assert(downloads[0].endsWith('.png'));
    $('downloadProject').click();assert(downloads[1].endsWith('.tpsprite.json'));
    // The stored collection retains its active selection and every sibling.
    const secondWindow=new Window({url:window.location.href});
    const saved=window.localStorage.getItem(STORAGE_KEY);secondWindow.localStorage.setItem(STORAGE_KEY,saved);
    assert.equal(JSON.parse(secondWindow.localStorage.getItem(STORAGE_KEY)).activeId,collection().projects[0].id);
    assert.equal(JSON.parse(saved).projects.length,3);
    await secondWindow.happyDOM.abort();
    globalThis.localStorage={getItem:window.localStorage.getItem.bind(window.localStorage),setItem:()=>{throw new Error('QuotaExceededError');}};
    $('nameInput').value='尚未保存的改名';$('nameInput').dispatchEvent(new window.Event('input'));save();
    assert($('saveStatus').classList.contains('error'));assert.match($('saveStatus').textContent,/尚未儲存/);
    assert.equal(window.localStorage.getItem(STORAGE_KEY),saved);
    globalThis.localStorage=window.localStorage;

  } finally {
    save();globalThis.setTimeout=originalTimeout;
    await window.happyDOM.abort();for(const [key,value]of Object.entries(originalGlobals)){if(value===undefined)delete globalThis[key];else globalThis[key]=value;}
  }
});
