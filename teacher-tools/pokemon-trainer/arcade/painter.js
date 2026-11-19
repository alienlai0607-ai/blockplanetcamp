import {PALETTE,fill,stroke} from '../model.js';
import {pixelArt} from './view.js?v=round';
import {categories} from './roles.js';

export function sampleDrawing(image,size){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=size;
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
  if(image)ctx.drawImage(image,0,0,size,size);
  const rgba=ctx.getImageData(0,0,size,size).data;
  const pixels=Array.from({length:size*size},(_,i)=>{
    const j=i*4;
    return rgba[j+3]?'#'+[rgba[j],rgba[j+1],rgba[j+2]].map(n=>n.toString(16).padStart(2,'0')).join(''):null;
  });
  return {size,frames:[pixels],fps:4};
}

export function painter($){
  const canvas=$('pixelCanvas'),dialog=$('roleDialog'),palette=$('swatches');
  let options,draft,frame,tab,mode='畫筆',ink=PALETTE[0],pointer=null,prev,history,modified;
  const button=(text,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=text;b.onclick=fn;return b;};
  const opts=(sel,entries)=>sel.replaceChildren(...entries.map(([value,text])=>new Option(text,value)));
  opts($('roleKind'),Object.entries(categories));
  function pickTool(tool){
    mode=tool;
    for(const b of $('brushTools').children)b.setAttribute('aria-pressed',b.textContent===tool);
  }
  const tools=['畫筆','橡皮擦','填色'];
  $('brushTools').replaceChildren(...tools.map(t=>button(t,()=>pickTool(t))));pickTool(mode);
  function pick(color){
    ink=$('ink').value=color;
    if(mode==='橡皮擦')pickTool('畫筆');
    for(const b of palette.children)b.setAttribute('aria-pressed',b.title===ink);
  }
  for(const color of PALETTE){
    const b=button('',()=>pick(color));b.title=color;b.setAttribute('aria-label',color);b.style.background=color;palette.append(b);
  }
  pick(ink);$('ink').oninput=e=>pick(e.target.value);
  function render(){
    const {size,frames}=draft;canvas.width=canvas.height=size;
    canvas.getContext('2d').drawImage(pixelArt(frames[frame],size),0,0);
    $('frameLabel').hidden=frames.length<2;
    opts($('frameIndex'),frames.map((_,i)=>[i,String(i+1)]));$('frameIndex').value=frame;
    $('undoPaint').disabled=!history.length;
  }
  function selectTab(next){
    tab=next;
    for(const id of ['paintTab','sampleTab','resourceTab'])$(id).setAttribute('aria-pressed',id===tab);
    $('paintArea').hidden=tab!=='paintTab';$('artGallery').hidden=tab==='paintTab';
    if(tab==='paintTab')return;
    const items=options.gallery(tab==='resourceTab');
    const cards=items.map(({name,get})=>{
      const art=get(),b=button(name,()=>{
        remember();draft=structuredClone(art);frame=0;modified=true;
        const nameInput=$(options.pose?'poseName':'roleName');
        if(!options.name&&!nameInput.value)nameInput.value=name.slice(0,20);
        selectTab('paintTab');render();
      });
      b.prepend(pixelArt(art.frames[0],art.size));return b;
    });
    $('artGallery').replaceChildren(...cards);
    if(!cards.length)$('artGallery').textContent='還沒有畫作。可以先在編輯器畫一張。';
  }
  for(const id of ['paintTab','sampleTab','resourceTab'])$(id).onclick=()=>selectTab(id);
  function remember(){
    history.push({draft:structuredClone(draft),frame,modified});if(history.length>24)history.shift();
  }
  $('blankPaint').onclick=()=>{remember();draft=sampleDrawing(null,options.scene?64:draft.size);frame=0;modified=true;render();};
  $('undoPaint').onclick=()=>{const back=history.pop();if(back){({draft,frame,modified}=back);render();}};
  $('frameIndex').onchange=e=>{frame=Number(e.target.value);render();};
  function position(e){
    const box=canvas.getBoundingClientRect(),coord=n=>Math.max(0,Math.min(draft.size-1,Math.floor(n*draft.size)));
    return [coord((e.clientX-box.left)/box.width),coord((e.clientY-box.top)/box.height)];
  }
  function mark(e){
    const to=position(e),p={width:draft.size,height:draft.size,pixels:draft.frames[frame]};
    if(mode==='填色')fill(p,...to,ink);else stroke(p,prev||to,to,mode==='橡皮擦'?null:ink);
    prev=to;modified=true;render();
  }
  canvas.onpointerdown=e=>{
    if(e.button!==0||pointer!==null)return;
    e.preventDefault();pointer=e.pointerId;canvas.setPointerCapture(pointer);prev=null;remember();mark(e);
  };
  canvas.onpointermove=e=>{if(e.pointerId===pointer&&mode!=='填色')mark(e);};
  canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=e=>{if(e.pointerId===pointer)pointer=null;};
  $('roleForm').onsubmit=e=>{
    e.preventDefault();
    const err=options.apply({name:$(options.pose?'poseName':'roleName').value.trim(),category:$('roleKind').value,drawing:draft,modified,place:$('placeRole').checked});
    if(err){$('roleError').textContent=err;return;}
    dialog.close();
  };
  return config=>{
    options=config;draft=structuredClone(config.initial);frame=0;pointer=null;history=[];modified=false;
    $('roleTitle').textContent=config.scene?'畫場景':config.pose?'畫動作造型':config.name?'編輯角色 · '+config.name:'畫新角色';
    $('roleForm').querySelector('.paint-bind').hidden=!!config.scene||!!config.pose;
    $('poseLabel').hidden=!config.pose;$('poseName').value=config.pose?config.name||'':'';
    $('placeLabel').hidden=!!config.scene||!!config.name||!!config.pose;$('placeRole').checked=true;
    $('roleName').value=config.name||'';$('roleKind').value=config.category||'Food';
    $('roleError').textContent='';pickTool('畫筆');selectTab('paintTab');render();dialog.showModal();
  };
}
