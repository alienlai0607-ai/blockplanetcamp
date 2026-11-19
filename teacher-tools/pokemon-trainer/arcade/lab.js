import {gameCartridge} from './cartridge-art.js?v=round';
import {sendCartridge} from './cartridge-usb.js';
import {ArtworkConnection} from '../usb.js?v=9';
import {heroSource,heroAppearance,portableGame} from './companion.js';
import {prepareTouch} from './touch.js';
import {painter,sampleDrawing} from './painter.js?v=round';
import {prepareRoles,roleCategory,categories} from './roles.js';
import {createEditor} from './blocks.js';
import {Game} from './engine.js';
import {action,actions,controls,events,example,featuredGames,guards,hints,kinds,names,origins,props,skins,symbols,themes} from './projects.js';
import {draw,loadArt,pixelArt,point,images,sceneSample} from './view.js?v=round';
import {validate} from './validate.js';
import {readCollection,STORAGE_KEY} from '../model.js';
const studio=window.parent.document;
const dialogHost=studio.getElementById('arcadeDialogs');
const dialogs=dialogHost.shadowRoot||dialogHost.attachShadow({mode:'open'});
const dialogStyle=document.createElement('link');
dialogStyle.rel='stylesheet';dialogStyle.href=new URL('./lab.css',import.meta.url).href;
dialogs.replaceChildren(dialogStyle,...document.querySelectorAll('dialog'));
const $=id=>document.getElementById(id)||dialogs.getElementById(id)||studio.getElementById('arcade-'+id);
const node=(tag,text)=>{const el=document.createElement(tag);if(text!==undefined)el.textContent=text;return el;};
function button(text,handler,cls=''){const el=node('button',text);el.type='button';el.className=cls;el.onclick=handler;return el;}
function select(options,value,change,label){
  const el=node('select');el.setAttribute('aria-label',label);
  for(const [key,text] of Object.entries(options)){const opt=node('option',text);opt.value=key;el.append(opt);}
  el.value=value;el.onchange=()=>change(el.value);return el;
}
function field(value,change,label,min,max){
  const el=node('input');el.setAttribute('aria-label',label);
  if(typeof value==='number'){el.type='number';el.min=min;el.max=max;el.value=value;}
  else{el.value=value;el.maxLength=max;}
  el.onchange=()=>{if(!el.value.trim()||!el.checkValidity()){el.value=value;return;}change(el.type==='number'?Number(el.value):el.value.trim());};return el;
}
function labelled(text,el){const l=node('label',text+' ');l.append(el);return l;}
const key='blockpoke.arcade.projects.v1';
let store={active:featuredGames[0],works:{}},storageOK=true;
try{const data=JSON.parse(localStorage.getItem(key));if(data?.works&&typeof data.works==='object'){for(const p of Object.values(data.works))validate(p);store=data;}}
catch{storageOK=false;}
if(!store.featuredGamesOpened){
  if(store.active==='beach')store.active=featuredGames[0];
  store.featuredGamesOpened=true;
}
if(!store.works[store.active]){
  if(!featuredGames.includes(store.active))store.active=featuredGames[0];
  store.works[store.active]=example(store.active);
}
let editor,invalid=false;
let p=store.works[store.active],game,mode='ready',pointer=null,last=0,acc=0,custom=null,mapIndex=0,paint='#';
const screen=$('screen'),canvas=$('game');
function readPartner(){
  try{
    if(window.parent.getArcadeCompanion)return window.parent.getArcadeCompanion();
    const collection=readCollection(localStorage.getItem(STORAGE_KEY));
    const art=collection.projects.find(w=>w.id===collection.activeId);
    return {name:art.name,size:art.width,frames:art.frames,fps:art.fps,background:art.backgrounds.day};
  }catch{return null;}
}
let partner=readPartner();
function sourceChoices(){
  const choices={studio:partner?'我的夥伴 · '+partner.name:'我的夥伴（尚未選取）',builtin:'遊戲原本的造型'};
  if(p.roles?.find(r=>r.id==='player')?.drawing)choices.drawing='我畫的主角';
  if(p.costume)choices.saved='作品內的夥伴'+(p.costume.name?' · '+p.costume.name:'');
  return choices;
}
function refreshHeroPicker(){
  const source=heroSource(p,store.active);
  const menu=select(sourceChoices(),source,value=>edit(()=>p.heroSource=value),'遊戲主角');
  $('heroMenu').replaceChildren(menu);
  $('heroHint').textContent=source==='studio'&&!heroAppearance(p,store.active,partner)?
    '到「畫夥伴」畫上顏色，就能讓夥伴登場。':'';
}
function save(){
  if(!storageOK){$('saved').textContent='瀏覽器內的舊存檔無法讀取，請匯出作品保存。';return;}
  try{localStorage.setItem(key,JSON.stringify(store));$('saved').textContent='已儲存在此瀏覽器';}
  catch{$('saved').textContent='瀏覽器儲存空間不足，請匯出作品保存。';}
}
function status(){
  $('status').textContent={ready:'準備試玩',playing:'試玩中',paused:'已暫停',won:'過關成功',lost:'挑戰結束'}[mode];
  $('play').textContent=mode==='playing'?'Ⅱ 暫停':mode==='paused'?'▶ 繼續':'▶ 執行';
}
function touchHint(){
  const drag=p.rules.find(r=>r.on==='drag')?.steps.find(a=>a.op==='dragActor');
  if(drag){
    const name=p.roles.find(r=>r.id===drag.role)?.name||'角色';
    const axes={x:'左右',y:'上下',xy:'上下左右'}[drag.axes||'xy'];
    return '按住螢幕並'+axes+'拖曳，'+name+'會跟著手指移動。';
  }
  if(!p.rules.some(r=>r.on==='leftSide'||r.on==='rightSide')&&['drag','run'].includes(p.control))
    return '按「執行」，試試你在控制器積木裡設定的手勢。';
  return hints[store.active]||'按「執行」，試試你設定的手勢。';
}
function reset(){
  $('hint').textContent=touchHint();
  game?.release();pointer=null;game=new Game(p);mode='ready';acc=0;last=0;status();
  const hero=heroAppearance(p,store.active,partner);
  custom={frames:hero?.frames.map(f=>pixelArt(f,hero.size)),fps:hero?.fps,name:hero?.name,
    roles:new Map(p.roles.filter(r=>r.drawing&&r.id!=='player').map(r=>[r.id,{fps:r.drawing.fps,frames:r.drawing.frames.map(f=>pixelArt(f,r.drawing.size))}])),
    poses:new Map(Object.entries(p.poses||{}).map(([key,d])=>[key,{fps:d.fps,frames:d.frames.map(f=>pixelArt(f,d.size))}])),
    background:p.scenePixels?pixelArt(p.scenePixels,64):p.customBG&&p.costume?pixelArt(p.costume.background,64):null};
  draw(canvas,game,mode,custom);
}
function run(){
  editor?.commit();if(invalid)return;
  if(mode==='playing'){game.release();pointer=null;mode='paused';}
  else {if(['won','lost'].includes(mode))reset();mode='playing';last=0;acc=0;}
  status();draw(canvas,game,mode,custom);
}
function frame(now){
  if(mode==='playing'){
    acc+=last?Math.min(.08,(now-last)/1000):0;last=now;
    while(acc>=1/120){game.tick(1/120);acc-=1/120;}
    if(game.state!=='playing'){mode=game.state;pointer=null;status();}
    draw(canvas,game,mode,custom);
  }
  window.parent.requestAnimationFrame(frame);
}
screen.onpointerdown=e=>{
  if(pointer!==null||e.button!==0)return;
  e.preventDefault();if(mode!=='playing')run();if(mode!=='playing')return;
  pointer=e.pointerId;screen.setPointerCapture(pointer);const {x,y}=point(e,screen);game.press(x,y);
};
screen.onpointermove=e=>{if(e.pointerId===pointer){const {x,y}=point(e,screen);game.move(x,y);}};
function release(e){if(e.pointerId===pointer){pointer=null;game.release();}}
screen.onpointerup=screen.onpointercancel=screen.onlostpointercapture=release;
function pause(){if(mode==='playing')run();}
window.parent.addEventListener('blur',pause);
const checkVisibility=()=>{if(studio.hidden)pause();};
studio.addEventListener('visibilitychange',checkVisibility);
window.addEventListener('pagehide',()=>{studio.removeEventListener('visibilitychange',checkVisibility);window.parent.removeEventListener('blur',pause);},{once:true});
$('play').onclick=run;$('restart').onclick=()=>{reset();run();};
function refresh(reload=true){
  prepareTouch(p);prepareRoles(p);
  $('library').replaceChildren();for(const [id,w] of Object.entries(store.works)){const opt=node('option',w.title);opt.value=id;$('library').append(opt);}
  for(const id of featuredGames)if(!store.works[id]){const opt=node('option',names[id]);opt.value=id;$('library').append(opt);}
  $('library').value=store.active;
  $('myWorks').replaceChildren(...Object.entries(store.works).map(([id,w])=>button(w.title,()=>change(id))));
  for(const b of $('shelf').children)b.setAttribute('aria-pressed',String(b.dataset.id===store.active));

  thumbnails.clear();if(reload){editor.open(p);editor.commit();}else editor.updateArt();refreshHeroPicker();settings();mapUI();reset();materialList();
}
function change(id){editor.commit();if(!store.works[id])store.works[id]=example(id);$('gallery').close();store.active=id;invalid=false;p=store.works[id];mapIndex=0;save();refresh();}
function newWork(work){const id=crypto.randomUUID();store.works[id]=work;change(id);}
$('new').onclick=()=>newWork(example('blank'));
$('copy').onclick=()=>{const copy=portableGame(p,store.active,partner);copy.title=(p.title.slice(0,32)+' · 副本');newWork(copy);};
$('library').onchange=e=>change(e.target.value);
for(const id of featuredGames){
  const b=button(names[id],()=>{if(store.active!==id)change(id);});
  const img=node('img');img.alt='';img.src=new URL('./art/'+example(id).art+'.png',import.meta.url).href;b.prepend(img);b.dataset.id=id;$('shelf').append(b);
}
function edit(fn){
  const backup=structuredClone(p);fn();
  try{validate(p);}catch{store.works[store.active]=p=backup;refresh();$('saved').textContent='這個組合無法執行，已保留原積木。請檢查數值或自訂積木的呼叫順序。';return;}
  save();refresh(false);
}
const numeric=(obj,k,label,min,max)=>field(obj[k],v=>edit(()=>obj[k]=v),label,min,max);
const choice=(obj,k,options,label)=>select(options,obj[k],v=>edit(()=>obj[k]=v),label);
function settings(){
  const grid=node('div');grid.className='form-grid';
  grid.append(labelled('作品名稱',field(p.title,v=>edit(()=>p.title=v),'作品名稱',1,40)),labelled('內建主角造型',select(skins,p.art,art=>edit(()=>{p.art=art;p.heroSource='builtin';}),'內建主角造型')),labelled('範例背景',select(themes,p.theme,v=>edit(()=>{p.theme=v;delete p.scenePixels;p.customBG=false;}),'範例背景')),labelled('初始生命',numeric(p,'life','初始生命',1,99)),labelled('起點 X',numeric(p,'x','起點 X',0,160)),labelled('起點 Y',numeric(p,'y','起點 Y',0,120)),labelled('垂直速限（0 無限制）',numeric(p,'vyLimit','垂直速限',0,600)),labelled('畫面邊界',choice(p,'bounds',{exit:'允許飛出',clamp:'留在畫面內'},'邊界')));
  function toggle(key,label){const box=node('input');box.type='checkbox';box.checked=!!p[key];box.onchange=()=>edit(()=>p[key]=box.checked);return labelled(label,box);}
  grid.append(toggle('wallGrip','貼牆可起跳'));
  if(p.costume&&!p.scenePixels)grid.append(toggle('customBG','使用作品內的背景'));
  $('settings').replaceChildren(grid,node('p','可使用研究所目前選取的夥伴和白天背景，畫作會一起存進這份遊戲。'),button('載入研究所畫作',()=>{
    try{const art=readPartner();if(!art)throw Error();edit(()=>{delete p.scenePixels;p.costume=art;p.heroSource='saved';p.customArt=p.customBG=true;});}
    catch{$('saved').textContent='請先回到研究所畫一隻夥伴並保存，再載入畫作。';}
  }));
}
for(const tab of dialogs.querySelectorAll('[data-tab]'))tab.onclick=()=>{
  for(const t of dialogs.querySelectorAll('[data-tab]')){const active=t===tab;t.setAttribute('aria-pressed',active);$(t.dataset.tab).hidden=!active;}
};
const tileColor={'.':'#dae8de','#':'#57835c','=':'#9f7752',S:'#386dc0',G:'#e6b744',o:'#f9ce53',f:'#db72a6',b:'#925cb8',w:'#b06c56','*':'#ed8131','!':'#e05c4f'};
function mapUI(){
  const box=$('mapTools');box.replaceChildren();const rows=p.levels[mapIndex];
  if(!rows){box.append(node('p','這個遊戲使用單一畫面。加入關卡後，就能畫地形、起點和終點。'));return;}
  const bar=node('div');bar.className='map-controls';bar.append(select(Object.fromEntries(p.levels.map((_,i)=>[i,'關卡 '+(i+1)])),mapIndex,v=>{mapIndex=Number(v);mapUI();},'編輯關卡'),select(symbols,paint,v=>paint=v,'地圖畫筆'));
  box.append(bar);const scroll=node('div');scroll.className='map-scroll';const grid=node('canvas');grid.width=rows[0].length*15;grid.height=rows.length*15;grid.setAttribute('aria-label','點選方格繪製關卡');scroll.append(grid);box.append(scroll);
  const ctx=grid.getContext('2d');
  function render(){rows.forEach((row,y)=>Array.from(row).forEach((ch,x)=>{ctx.fillStyle=tileColor[ch];ctx.fillRect(x*15,y*15,14,14);if(ch!=='.'){ctx.fillStyle='#23382d';ctx.font='11px monospace';ctx.fillText(ch,x*15+4,y*15+11);}}));}
  function place(e){
    const rect=grid.getBoundingClientRect(),x=Math.floor((e.clientX-rect.left)/15),y=Math.floor((e.clientY-rect.top)/15);
    if(!rows[y]||x<0||x>=rows[0].length||rows[y][x]===paint)return;
    if(paint==='S')rows.forEach((r,i)=>rows[i]=r.replaceAll('S','.'));
    rows[y]=rows[y].slice(0,x)+paint+rows[y].slice(x+1);render();save();reset();
  }
  let pen=null;grid.onpointerdown=e=>{if(pen!==null)return;pen=e.pointerId;grid.setPointerCapture(pen);place(e);};
  grid.onpointermove=e=>{if(e.pointerId===pen)place(e);};
  grid.onpointerup=grid.onpointercancel=grid.onlostpointercapture=()=>{pen=null;};render();
}
$('addLevel').onclick=()=>edit(()=>{
  p.levels.push(['................','................','................','................','................','.S............G.','################','################']);mapIndex=p.levels.length-1;
});
const transferStatus=$('gameTransferStatus');
$('sendGame').onclick=async()=>{
  editor.commit();
  if(invalid){transferStatus.textContent='請先修正積木草稿，再傳送。';return;}
  if(!window.parent.navigator.serial){transferStatus.textContent='請用電腦版 Chrome 或 Edge，開啟研究所後以 USB 傳送。';return;}
  const button=$('sendGame');button.disabled=true;
  let connection;
  try{
    const bytes=gameCartridge(p,store.active,partner);
    const port=await window.parent.navigator.serial.requestPort();
    connection=new ArtworkConnection(port);
    const info=await connection.open();
    await sendCartridge(connection,info,bytes,text=>transferStatus.textContent=text);
    transferStatus.textContent='已寫入並核對遊戲檔。請在掌機的「玩耍」選「我的小遊戲」。';
  }catch(e){transferStatus.textContent=e.name==='NotFoundError'?'已取消選擇裝置。':e.name==='InvalidStateError'?'USB 已被使用，請先中斷其他連線再傳送。':e.message;}
  finally{await connection?.close();button.disabled=false;}
};
$('saveFile').onclick=()=>{
  editor.commit();
  const url=URL.createObjectURL(new Blob([JSON.stringify(portableGame(p,store.active,partner))],{type:'application/json'})),link=node('a');link.href=url;link.download=p.title+'.blockpoke.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
$('import').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{if(file.size>24*1024*1024)throw Error('請選擇小於 24 MB 的遊戲作品。');const work=validate(JSON.parse(await file.text()));newWork(work);}
  catch(err){$('saved').textContent='匯入失敗。'+err.message;}
  finally{e.target.value='';}
};
const openPainter=painter($);
const thumbnails=new Map();
function appearance(role){
  if(role.id==='player')return heroAppearance(p,store.active,partner);
  return role.drawing;
}
function original(role){
  return images[role.id==='player'?p.art:role.art];
}
function preview(id,fallback){
  const key=id+'|'+(fallback||'');
  if(thumbnails.has(key))return thumbnails.get(key);
  const role=p.roles.find(r=>r.id===id), art=role&&appearance(role);
  const img=art?pixelArt(art.frames[0],art.size):images[fallback]||original(role||{art:'flower'});
  const canvas=node('canvas');canvas.width=canvas.height=32;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  if(img)ctx.drawImage(img,0,0,32,32);
  const src=canvas.toDataURL();thumbnails.set(key,src);return src;
}
function materialList(){
  $('assets').replaceChildren(...p.roles.map(role=>{
    const el=button('',()=>roleDialog(role.id)),img=node('img');img.src=preview(role.id);img.width=img.height=40;img.alt='';
    img.style.imageRendering='pixelated';el.append(img,node('span',role.name),node('small',categories[roleCategory(role)]+' · 點圖編輯'));return el;
  }));
}
function currentScene(){
  if(p.scenePixels)return {size:64,fps:4,frames:[p.scenePixels]};
  if(p.customBG&&p.costume)return {size:64,fps:4,frames:[p.costume.background]};
  return sampleDrawing(sceneSample(p.theme),64);
}
function gallery(scene,mine){
  if(!mine)return Object.entries(scene?themes:skins).map(([key,name])=>({name,get:()=>sampleDrawing(scene?sceneSample(key):images[key],scene?64:16)}));
  const list=[];
  for(const work of window.parent.getArcadeGallery()){
    if(scene){
      for(const [key,period] of Object.entries({morning:'早晨',day:'白天',night:'夜晚'})){
        const bg=work.backgrounds[key];
        if(bg?.some(Boolean))list.push({name:work.name+' · '+period,get:()=>({size:64,frames:[bg],fps:4})});
      }
    }else if(work.frames.some(f=>f.some(Boolean)))list.push({name:work.name,get:()=>({size:work.size,frames:work.frames,fps:work.fps})});
  }
  if(!scene)for(const r of p.roles)if(r.drawing)list.push({name:r.name+'（遊戲）',get:()=>r.drawing});
  if(!scene)for(const d of Object.values(p.poses||{}))list.push({name:d.name+'（造型）',get:()=>d});
  return list;
}
function roleDialog(id,fallback){
  editor.commit();pause();
  const role=p.roles.find(r=>r.id===id);
  const existing=role&&appearance(role);
  openPainter({name:role?.name,category:role&&roleCategory(role),
    initial:existing?{size:existing.size,frames:existing.frames,fps:existing.fps}:sampleDrawing(images[fallback]||(role&&original(role)),16),
    gallery:mine=>gallery(false,mine),
    apply({name,category,drawing,modified,place}){
      if(!name||p.roles.some(r=>r!==role&&r.name===name))return '請取一個和其他角色不同的變數名稱。';
      if(!role&&p.roles.length>=64)return '這份作品已用滿 64 個角色變數。';
      if((modified||!role)&&!drawing.frames.some(f=>f.some(Boolean)))return '請畫上至少一個像素，或挑一張素材。';
      const target=role||{id:'actor-'+crypto.randomUUID(),art:'flower'};
      target.name=name;target.category=category;
      if(modified||!role){
        target.drawing=drawing;
        if(target.id==='player')p.heroSource='drawing';
      }
      if(!role)p.roles.push(target);
      refresh();
      if(!role&&place)editor.placeRole(target.id,Math.round(Math.min(game.width-8,game.player.x+22)),Math.round(game.player.y));
      save();
    }
  });
}
function poseChoices(){
  return {...skins,...Object.fromEntries(Object.entries(p.poses||{}).map(([id,d])=>[id,d.name]))};
}
function poseArt(key){
  return p.poses?.[key]||appearance(p.roles.find(r=>r.id==='player'))||sampleDrawing(images[key],16);
}
function posePreview(key){
  const cache='pose:'+key;
  if(!thumbnails.has(cache)){const d=poseArt(key);thumbnails.set(cache,pixelArt(d.frames[0],d.size).toDataURL());}
  return thumbnails.get(cache);
}
function paintPose(key){
  editor.commit();pause();
  openPainter({pose:true,name:key?poseChoices()[key]:'',initial:key?poseArt(key):sampleDrawing(null,16),
    gallery:mine=>gallery(false,mine),
    apply({drawing,name}){
      if(!name||Object.entries(poseChoices()).some(([id,label])=>id!==key&&label===name))return '請取一個不同的造型名稱。';
      if(!drawing.frames.some(f=>f.some(Boolean)))return '請畫上至少一個像素，或挑一張素材。';
      if(!p.poses?.[key]&&Object.keys(p.poses||{}).length>=64)return '這份作品已用滿 64 個動作造型。';
      p.poses??={};p.poses[key||'pose-'+crypto.randomUUID()]={name,size:drawing.size,frames:drawing.frames,fps:drawing.fps};
      refresh();save();
    }});
}
function paintScene(){
  editor.commit();pause();
  openPainter({scene:true,initial:currentScene(),gallery:mine=>gallery(true,mine),
    apply({drawing,modified}){if(modified)edit(()=>p.scenePixels=drawing.frames[0]);}});
}
$('addRole').onclick=()=>roleDialog(null);
$('paintScene').onclick=paintScene;
for(const [id,dialog] of [['worksBtn','gallery'],['saveBtn','fileBox'],['settingsBtn','config']])if($(id))$(id).onclick=()=>{editor.commit();$(dialog).showModal();};
for(const b of dialogs.querySelectorAll('[data-close]'))b.onclick=()=>b.closest('dialog').close();
$('undo').onclick=()=>editor.undo(false);$('redo').onclick=()=>editor.undo(true);
$('zoomOut').onclick=()=>editor.zoom(-1);$('zoomIn').onclick=()=>editor.zoom(1);
try{await loadArt();
  editor=createEditor($('blocks'),(layout,program,error)=>{
    p.blockLayout=layout;
    try{if(!program)throw Error(error);validate({...p,...program});Object.assign(p,program);invalid=false;save();reset();materialList();}
    catch(e){invalid=true;save();$('saved').textContent='積木草稿已保留。'+e.message;reset();}
    $('play').disabled=$('expand').disabled=$('restart').disabled=invalid;
  },{preview,poses:poseChoices,pose:paintPose,posePreview,open:roleDialog,scene:paintScene,setCategory(id,value){
    const role=p.roles.find(r=>r.id===id);
    if(role&&roleCategory(role)!==value){role.category=value;save();reset();materialList();queueMicrotask(()=>editor.updateArt());}
  }});
  window.arcadeCommand=command=>{
    if(command==='start'){if(mode!=='playing')run();return;}
    if(command==='pause'){pause();return;}
    if(command==='hide'){pause();editor.commit();return;}
    if(command==='show'){
      const next=readPartner(),changed=JSON.stringify(next)!==JSON.stringify(partner);
      partner=next;
      if(changed){refreshHeroPicker();if(heroSource(p,store.active)==='studio'){thumbnails.clear();editor.updateArt();reset();materialList();}}
      editor.resize();return;
    }
    editor.commit();
    if(command==='new')newWork(example('blank'));
    if(command==='works')$('gallery').showModal();
    if(command==='save')$('fileBox').showModal();
  };
  refresh();document.body.removeAttribute('aria-busy');if(!storageOK)save();window.parent.requestAnimationFrame(frame);}
catch(err){$('status').textContent='載入失敗，請重新整理';$('saved').textContent=err.message;}
