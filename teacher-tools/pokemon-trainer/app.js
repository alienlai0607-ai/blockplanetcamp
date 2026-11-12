import {PALETTE, STORAGE_KEY, MAX_PROJECTS, makeProject, nameOf, readCollection, importSprite, serialize, History, stroke, fill, resize} from './model.js';

const $ = id => document.getElementById(id);
const all = selector => [...document.querySelectorAll(selector)];
const canvas = $('drawingCanvas'), ctx = canvas.getContext('2d');
let collection, storageError=false, damagedStorage=false;
try {
  const saved=localStorage.getItem(STORAGE_KEY);
  if(saved) collection=readCollection(saved);
} catch { storageError=true;damagedStorage=true; }
if(!collection) { const p=makeProject('芽芽（練習）',32,true); collection={version:1,activeId:p.id,projects:[p]}; }
let project=collection.projects.find(p=>p.id===collection.activeId), history=new History();
let tool='pencil', color=PALETTE[0], brush=1, grid=true, mirror=false;
let pointer=null, last=null, saveTimer, toastTimer, dirty=!damagedStorage, keyboardCursor=null;
let confirmResolve=null;

function toast(message) { $('toast').textContent=message;$('toast').classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('visible'),4200); }
function saveStatus(message,error=false) { const el=$('saveStatus');el.classList.toggle('error',error);el.replaceChildren(Object.assign(document.createElement('span'),{className:'status-dot'}),document.createTextNode(message)); }
function persist() {
  clearTimeout(saveTimer);
  if(!dirty) return !storageError;
  try {
    // Preserve an unreadable previous collection before writing new work.
    if(damagedStorage) { const old=localStorage.getItem(STORAGE_KEY);if(old)localStorage.setItem(STORAGE_KEY+'.recovery',old);damagedStorage=false; }
    localStorage.setItem(STORAGE_KEY,JSON.stringify(collection));dirty=false;storageError=false;saveStatus('已儲存在此瀏覽器');return true;
  } catch { storageError=true;saveStatus('尚未儲存，請下載作品檔',true);return false; }
}
function changed() { project.updatedAt=new Date().toISOString();dirty=true;saveStatus('正在儲存…');clearTimeout(saveTimer);saveTimer=setTimeout(persist,300); }
function renderSprite(target,p,scale=1) {
  target.width=p.width*scale;target.height=p.height*scale;
  const c=target.getContext('2d');c.clearRect(0,0,target.width,target.height);c.imageSmoothingEnabled=false;
  p.pixels.forEach((v,i)=>{if(v){c.fillStyle=v;c.fillRect((i%p.width)*scale,Math.floor(i/p.width)*scale,scale,scale);}});
}
function render() {
  const cell=canvas.width/project.width;
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=false;
  for(let y=0;y<project.height;y++)for(let x=0;x<project.width;x++) {
    ctx.fillStyle=project.pixels[y*project.width+x] || ((x+y)%2?'#eeeee7':'#fafaf6');ctx.fillRect(x*cell,y*cell,cell,cell);
  }
  if(grid) {
    ctx.beginPath();ctx.strokeStyle='#214d4022';ctx.lineWidth=1;
    for(let i=1;i<project.width;i++){const n=i*cell+.5;ctx.moveTo(n,0);ctx.lineTo(n,512);ctx.moveTo(0,n);ctx.lineTo(512,n);}ctx.stroke();
  }
  if(mirror){ctx.save();ctx.strokeStyle='#dc835b';ctx.setLineDash([6,6]);ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.stroke();ctx.restore();}
  if(keyboardCursor){ctx.strokeStyle='#dc835b';ctx.lineWidth=3;ctx.strokeRect(keyboardCursor[0]*cell+1.5,keyboardCursor[1]*cell+1.5,cell-3,cell-3);}
  renderSprite($('previewCanvas'),project);
  $('previewName').textContent=nameOf(project.name);
  $('previewStats').textContent=`${project.width} × ${project.height} · 原創夥伴`;
  $('canvasSize').value=String(project.width);
  $('undo').disabled=!history.past.length;$('redo').disabled=!history.future.length;
  $('projectCount').textContent=collection.projects.length;
  $('projectNumber').textContent=String(collection.projects.indexOf(project)+1).padStart(3,'0');
}
function finishStroke() {
  if(pointer===null)return;
  const id=pointer;pointer=null;last=null;
  if(canvas.hasPointerCapture?.(id))canvas.releasePointerCapture(id);
  if(history.commit(project))changed();render();
}
function action(callback) { finishStroke();history.begin(project);callback();if(history.commit(project))changed();render(); }
function selectProject(p) { finishStroke();persist();project=p;collection.activeId=p.id;history=new History();keyboardCursor=null;$('nameInput').value=p.name;dirty=true;persist();render(); }
function selectTool(value) {
  tool=value;all('[data-tool]').forEach(b=>{const on=b.dataset.tool===tool;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('toolHint').textContent=({pencil:'畫筆 · 按住拖曳就能畫',eraser:'橡皮擦 · 擦掉的地方會變透明',fill:'填色 · 點一下，填滿相連區域',picker:'吸色 · 點一下畫布，選取那個顏色'})[tool];
}
function selectColor(value) {
  color=value;$('selectedHex').textContent=color?.toUpperCase()||'透明';$('selectedSwatch').style.background=color||'repeating-conic-gradient(#ddd 0 25%, #fff 0 50%) 0/8px 8px';
  all('.color-swatch').forEach(b=>{const on=b.dataset.color===color;b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});
  $('transparentColor').setAttribute('aria-pressed',String(color===null));
  if(tool==='eraser'||tool==='picker')selectTool('pencil');
}
function position(event) { const r=canvas.getBoundingClientRect();const x=Math.floor((event.clientX-r.left)*project.width/r.width),y=Math.floor((event.clientY-r.top)*project.height/r.height);return x>=0&&y>=0&&x<project.width&&y<project.height?[x,y]:null; }
function applyAt(point,from=point) { const c=tool==='eraser'?null:color;if(tool==='fill')fill(project,...point,c,mirror);else stroke(project,from,point,c,brush,mirror); }
canvas.addEventListener('pointerdown',event=>{
  if(pointer!==null||event.button!==0)return;
  const p=position(event);if(!p)return;event.preventDefault();canvas.focus({preventScroll:true});keyboardCursor=null;
  if(tool==='picker'){selectColor(project.pixels[p[1]*project.width+p[0]]);return;}
  pointer=event.pointerId;canvas.setPointerCapture(pointer);last=p;history.begin(project);applyAt(p);render();
});
canvas.addEventListener('pointermove',event=>{
  const p=position(event);$('coordinate').textContent=p?`${p[0]+1}, ${p[1]+1}`:`${project.width} × ${project.height} 像素`;
  if(pointer!==event.pointerId)return;
  if(!p){last=null;return;}if(tool!=='fill'){applyAt(p,last||p);render();}last=p;
});
for(const type of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(type,event=>{if(pointer===event.pointerId)finishStroke();});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
function undo(){finishStroke();if(history.undo(project)){changed();render();}}
function redo(){finishStroke();if(history.redo(project)){changed();render();}}
$('undo').addEventListener('click',undo);$('redo').addEventListener('click',redo);
all('[data-tool]').forEach(b=>b.addEventListener('click',()=>selectTool(b.dataset.tool)));
all('[data-brush]').forEach(b=>b.addEventListener('click',()=>{brush=Number(b.dataset.brush);all('[data-brush]').forEach(a=>{const on=a===b;a.classList.toggle('active',on);a.setAttribute('aria-pressed',String(on));});}));
for(const c of PALETTE) { const b=document.createElement('button');b.className='color-swatch';b.dataset.color=c;b.style.background=c;b.setAttribute('aria-label',`顏色 ${c}`);b.title=c.toUpperCase();b.addEventListener('click',()=>selectColor(c));$('palette').append(b); }
$('customColor').addEventListener('input',e=>selectColor(e.target.value));$('transparentColor').addEventListener('click',()=>selectColor(null));
function toggle(id,value) { $(id).classList.toggle('active',value);$(id).setAttribute('aria-pressed',String(value));render(); }
$('gridToggle').addEventListener('click',()=>toggle('gridToggle',grid=!grid));$('mirrorToggle').addEventListener('click',()=>toggle('mirrorToggle',mirror=!mirror));
all('[data-bg]').forEach(b=>b.addEventListener('click',()=>{$('previewStage').className='preview-stage '+b.dataset.bg;all('[data-bg]').forEach(a=>{a.classList.toggle('active',a===b);a.setAttribute('aria-pressed',String(a===b));});}));
$('nameInput').addEventListener('input',e=>{project.name=e.target.value;changed();$('previewName').textContent=nameOf(project.name);});
$('nameInput').addEventListener('blur',()=>{project.name=nameOf(project.name);$('nameInput').value=project.name;changed();});
function ask(title,message,ok='確定') {
  if(confirmResolve)confirmResolve(false);
  $('confirmTitle').textContent=title;$('confirmText').textContent=message;$('confirmOk').textContent=ok;$('confirmDialog').showModal();$('confirmCancel').focus();
  return new Promise(resolve=>{confirmResolve=resolve;});
}
function finishConfirm(value) { $('confirmDialog').close();const resolve=confirmResolve;confirmResolve=null;resolve?.(value); }
$('confirmCancel').addEventListener('click',()=>finishConfirm(false));$('confirmOk').addEventListener('click',()=>finishConfirm(true));$('confirmDialog').addEventListener('cancel',e=>{e.preventDefault();finishConfirm(false);});
all('[data-close]').forEach(b=>b.addEventListener('click',()=>$(b.dataset.close).close()));
$('clear').addEventListener('click',async()=>{if(!project.pixels.some(Boolean))return;if(await ask('清空這張畫布？','名字會保留。清空後，仍可用「復原」找回圖案。','清空畫布'))action(()=>project.pixels.fill(null));});
$('canvasSize').addEventListener('change',async e=>{
  const size=Number(e.target.value);if(size===project.width)return;
  const smaller=size<project.width;
  if(await ask('調整畫布大小？',smaller?'圖案保留在中央，超出新畫布的部分會被裁掉。可以用「復原」還原。':'畫布向四周擴大，現有圖案大小不變，保留在中央。','調整畫布'))action(()=>{resize(project,size);keyboardCursor=null;});
  else $('canvasSize').value=String(project.width);
});
function canAdd() { if(collection.projects.length>=MAX_PROJECTS){toast(`最多收藏 ${MAX_PROJECTS} 個作品。先下載備份，再刪除不需要的作品。`);return false;}return true; }
function newDialog() { if(!canAdd())return;finishStroke();persist();$('galleryDialog').close();$('newDialog').showModal();$('newName').focus(); }
$('newProject').addEventListener('click',newDialog);$('galleryNew').addEventListener('click',newDialog);
$('newForm').addEventListener('submit',e=>{
  e.preventDefault();if(!canAdd())return;
  const p=makeProject($('newName').value,Number($('newSize').value),new FormData(e.target).get('start')==='sprout');
  collection.projects.push(p);selectProject(p);$('newDialog').close();$('newForm').reset();toast('新夥伴準備好了，開始畫吧！');
});
function smallButton(label,icon,handler) { const b=document.createElement('button');b.className='icon-button';b.title=label;b.setAttribute('aria-label',label);const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href','#i-'+icon);svg.append(use);b.append(svg);b.addEventListener('click',handler);return b; }
function gallery() {
  $('galleryGrid').replaceChildren();
  for(const p of collection.projects) {
    const card=document.createElement('article');card.className='gallery-card'+(p===project?' current':'');
    const open=document.createElement('button');open.className='gallery-open';open.setAttribute('aria-label',`繼續畫 ${nameOf(p.name)}`);
    const image=document.createElement('canvas');renderSprite(image,p);const title=document.createElement('strong');title.textContent=nameOf(p.name);const caption=document.createElement('small');caption.textContent=`${p.width} × ${p.height}${p===project?' · 編輯中':''}`;open.append(image,title,caption);
    open.addEventListener('click',()=>{selectProject(p);$('galleryDialog').close();});
    const actions=document.createElement('div');actions.className='gallery-card-actions';const date=document.createElement('span');date.textContent=p.updatedAt.slice(0,10);const buttons=document.createElement('div');
    buttons.append(smallButton('複製作品','copy',()=>{if(!canAdd())return;const copy=importSprite(serialize(p));copy.name=nameOf(p.name+' 副本');collection.projects.push(copy);dirty=true;persist();render();gallery();toast('已複製作品');}),smallButton('刪除作品','trash',async()=>{
      if(!await ask('刪除這個作品？',`「${nameOf(p.name)}」會從此瀏覽器移除，刪除後無法復原。請先下載作品檔備份。`,'刪除作品'))return;
      collection.projects=collection.projects.filter(item=>item.id!==p.id);
      if(!collection.projects.length)collection.projects.push(makeProject());
      if(project===p)selectProject(collection.projects[0]);dirty=true;persist();render();gallery();
    }));actions.append(date,buttons);card.append(open,actions);$('galleryGrid').append(card);
  }
}
$('openGallery').addEventListener('click',()=>{finishStroke();persist();gallery();$('galleryDialog').showModal();});
function filename() { return nameOf(project.name).replace(/[<>:"/\\|?*\u0000-\u001f]/g,'_'); }
function download(blob,name) { const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000); }
$('downloadProject').addEventListener('click',()=>{finishStroke();download(new Blob([serialize(project)],{type:'application/json'}),filename()+'.tpsprite.json');toast('已送出作品檔下載，可在其他裝置重新開啟。');});
$('downloadPng').addEventListener('click',()=>{
  finishStroke();const image=document.createElement('canvas');renderSprite(image,project,Number($('exportScale').value));
  const name=filename()+'.png';image.toBlob(blob=>{if(blob){download(blob,name);toast('已送出透明背景 PNG 下載。');}else toast('圖片匯出失敗，請再試一次。');},'image/png');
});
$('importProject').addEventListener('click',()=>{if(canAdd())$('importFile').click();});
$('importFile').addEventListener('change',async e=>{
  const file=e.target.files?.[0];if(!file)return;
  try { if(file.size>524288)throw new Error('作品檔太大，請選擇小於 512 KB 的檔案。');const p=importSprite(await file.text());if(!canAdd())return;collection.projects.push(p);selectProject(p);toast('作品已開啟，可以接著畫了！'); }
  catch(error){toast(error.message||'無法開啟這個作品檔。');}finally{e.target.value='';}
});
document.addEventListener('keydown',e=>{
  if(document.querySelector('dialog[open]')||/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName))return;
  const key=e.key.toLowerCase();
  if((e.ctrlKey||e.metaKey)&&key==='z'){e.preventDefault();e.shiftKey?redo():undo();return;}
  if((e.ctrlKey||e.metaKey)&&key==='y'){e.preventDefault();redo();return;}
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const keys={b:'pencil',e:'eraser',f:'fill',i:'picker'};if(keys[key]){e.preventDefault();selectTool(keys[key]);return;}
  if(document.activeElement!==canvas)return;
  const moves={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
  if(moves[e.key]){e.preventDefault();keyboardCursor ||= [0,0];keyboardCursor=keyboardCursor.map((v,i)=>Math.max(0,Math.min(project.width-1,v+moves[e.key][i])));render();}
  if(e.key===' '||e.key==='Enter'){e.preventDefault();keyboardCursor ||= [0,0];if(tool==='picker')selectColor(project.pixels[keyboardCursor[1]*project.width+keyboardCursor[0]]);else action(()=>applyAt(keyboardCursor));}
});
window.addEventListener('pagehide',()=>{finishStroke();persist();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){finishStroke();persist();}});
window.addEventListener('beforeunload',e=>{finishStroke();if(dirty&&!persist()){e.preventDefault();e.returnValue='';}});
$('nameInput').value=project.name;selectColor(color);render();
if(storageError){saveStatus('未能讀取舊作品，請先下載備份',true);toast('瀏覽器儲存無法讀取。新作品仍可下載；原有資料會先保留。');}
else{if(!dirty)saveStatus('已儲存在此瀏覽器');else persist();}
