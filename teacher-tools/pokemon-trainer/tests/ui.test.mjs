// DOM-level integration, not a real browser or a visual/touch layout test.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {Window} from 'happy-dom';
import {resolveObjectURL} from 'node:buffer';
import {STORAGE_KEY,sprout} from '../model.js';

test('editor controls, pointer stroke, undo, gallery, reload and export connect correctly',async()=>{
  const window=new Window({url:'https://blockplanetcamp.com/teacher-tools/pokemon-trainer/'});
  const document=window.document;
  const legacy=JSON.stringify({version:1,activeId:'original',projects:[{id:'original',name:'芽芽（練習）',width:32,height:32,pixels:sprout(),createdAt:'2026-11-12',updatedAt:'2026-11-12'}]});
  window.localStorage.setItem(STORAGE_KEY,legacy);
  const html=await readFile(new URL('../index.html',import.meta.url),'utf8');
  document.write(html.replace(/<script[\s\S]*?<\/script>/g,''));
  const noop=()=>{};
  const canvasContext={clearRect:noop,fillRect:noop,beginPath:noop,moveTo:noop,lineTo:noop,stroke:noop,save:noop,restore:noop,setLineDash:noop,strokeRect:noop};
  window.HTMLCanvasElement.prototype.getContext=()=>canvasContext;
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
    await import('../app.js?dom-test');
    assert.equal(document.querySelectorAll('.color-swatch').length,16);
    assert.equal(collection().projects.length,1);
    assert.equal(collection().version,2);assert.equal(collection().activeId,'original');
    assert.equal(window.localStorage.getItem(STORAGE_KEY+'.v1-backup'),legacy);
    assert.deepEqual(collection().projects[0].frames[0],JSON.parse(legacy).projects[0].pixels);
    assert.match($('saveStatus').textContent,/已儲存/);
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
    document.querySelector('[data-tool="eraser"]').click();
    canvas.dispatchEvent(new window.PointerEvent('pointerdown',{pointerId:2,button:0,clientX:8,clientY:8}));
    canvas.dispatchEvent(new window.PointerEvent('pointerup',{pointerId:2}));save();
    assert.equal(collection().projects[1].frames[0][0],'#214d40');assert.equal(collection().projects[1].frames[1][0],null);
    $('consoleB').click();save();assert.equal(collection().projects[1].frames[1][0],'#214d40');
    $('fpsInput').value='8';$('fpsInput').dispatchEvent(new window.Event('change'));save();
    assert.equal(collection().projects[1].fps,8);const beforePreview=window.localStorage.getItem(STORAGE_KEY);
    $('consoleA').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'true');
    await new Promise(resolve=>originalTimeout(resolve,140));
    assert.match($('playbackStatus').textContent,/播放中/);assert.equal(window.localStorage.getItem(STORAGE_KEY),beforePreview);
    $('consoleA').click();assert.equal($('playAnimation').getAttribute('aria-pressed'),'false');
    document.querySelector('.dpad-left').click();save();assert.equal(collection().projects[1].activeFrame,0);assert($('onionToggle').disabled);
    document.querySelector('.dpad-right').click();assert(!$('onionToggle').disabled);
    $('addFrame').click();$('addFrame').click();save();assert.equal(collection().projects[1].frames.length,4);assert($('duplicateFrame').disabled);
    $('deleteFrame').click();$('confirmOk').click();await Promise.resolve();save();assert.equal(collection().projects[1].frames.length,3);
    $('undo').click();save();assert.equal(collection().projects[1].frames.length,4);
    $('exportScale').value='1';$('downloadSheet').click();assert.equal(pngCanvas.width,128);assert.equal(pngCanvas.height,32);
    $('downloadProject').click();const exported=JSON.parse(await downloadBlobs.at(-1).text());assert.equal(exported.version,2);assert.equal(exported.frames.length,4);assert.equal(exported.fps,8);
    downloads.length=0;downloadBlobs.length=0;
    $('openGallery').click();assert.equal(document.querySelectorAll('.gallery-card').length,2);
    document.querySelector('.gallery-open').click();assert.equal($('previewName').textContent,'芽芽（練習）');
    $('canvasSize').value='16';$('canvasSize').dispatchEvent(new window.Event('change'));assert($('confirmDialog').open);
    $('confirmCancel').click();await Promise.resolve();assert.equal($('canvasSize').value,'32');
    $('exportScale').value='1';$('downloadPng').click();assert.equal(pngCanvas.width,32);assert(downloads[0].endsWith('.png'));
    $('downloadProject').click();assert(downloads[1].endsWith('.tpsprite.json'));
    // The stored collection retains its active selection and every sibling.
    const secondWindow=new Window({url:window.location.href});
    const saved=window.localStorage.getItem(STORAGE_KEY);secondWindow.localStorage.setItem(STORAGE_KEY,saved);
    assert.equal(JSON.parse(secondWindow.localStorage.getItem(STORAGE_KEY)).activeId,collection().projects[0].id);
    assert.equal(JSON.parse(saved).projects.length,2);
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
