import {categories as spriteCategories,roleCategory,legacyPairs,prepareRoles} from './roles.js';
import {actions, action, events, guards, kinds, origins, props, skins} from './projects.js';

const B=window.Blockly;
const colors={actor:'#9458df',input:'#fa841e',game:'#8652cb',scene:'#367ee8',info:'#ed5596',loop:'#42af59',logic:'#19abb8',variable:'#ed4f61',event:'#12a75c'};
const categories=[
  ['actor','角色','●',['createActor','actorSet','actorRemove','skin','spawn','jump']],
  ['input','控制器','✥',['@down','@drag','dragActor','@up','@leftSide','@rightSide','walkActor','@jump','touchX','touchY']],
  ['game','遊戲','✦',['@start','@collision','@pass','@edge','@floor','win','lose']],
  ['scene','場景','▲',['moveTo','set','add','gate','next','number']],
  ['info','資訊','ⓘ',['scoreSet','score','life']],
  ['loop','迴圈','↻',['@timer','repeat']],
  ['logic','邏輯','⑂',['condition']],
  ['variable','變數','≡',['variable','increment','function','call']]
];
const colour=key=>colors[categories.find(c=>c[3].includes(key))?.[0]]||colors.game;
const type=key=>'bp_'+key.replace('@','on_');
const opts=object=>Object.entries(object).map(([key,text])=>[text,key]);
const nums=new Set(['value','times','vx','vy','count','follow','bonus','threshold','ms','x','y']);
const menu=(input,key,options)=>input.appendField(new B.FieldDropdown(opts(options)),key);
const number=(input,key,value,min=-2000,max=2000)=>input.appendField(new B.FieldNumber(value,min,max,1),key);
const textField=(input,key,text)=>input.appendField(new B.FieldTextInput(text,v=>v.trim().slice(0,20)||null),key);
const statement=block=>{block.setPreviousStatement(true,'Step');block.setNextStatement(true,'Step');};
const body=block=>block.appendStatementInput('DO').setCheck('Step');
const registered=new Map();
function register(key,init){
  const name=type(key);registered.set(name,key);
  B.Blocks[name]={init(){this.setColour(key.startsWith('@')?colors.event:colour(key));init(this);}};
}
let projectRoles=[],artEditor;
function thumbnail(line,b,roleId,fallback=null){
  const id=()=>typeof roleId==='function'?roleId():roleId;
  const field=new B.FieldImage(artEditor.preview(id(),fallback?.()),32,32,'點圖編輯造型',()=>artEditor.open(id(),fallback?.()));
  line.appendField(field);
  let syncing=false;
  const kind=new B.FieldDropdown(opts(spriteCategories),value=>{
    if(!syncing&&b.rendered&&!b.isInFlyout&&B.Events.isEnabled())artEditor.setCategory(id(),value);
    return value;
  });
  line.appendField('類別').appendField(kind);
  const update=()=>{
    const src=artEditor.preview(id(),fallback?.());
    if(field.getValue()!==src)field.setValue(src);
    const role=projectRoles.find(r=>r.id===id());
    if(role&&kind.getValue()!==roleCategory(role)){syncing=true;try{kind.setValue(roleCategory(role));}finally{syncing=false;}}
  };
  b.setOnChange(update);b.updateArt=update;update();
}
function roleField(input,key,{objects=false,contact=false,second=false,groups=false}={}){
  const options=()=>{
    const roles=projectRoles.filter(r=>!objects||r.id!=='player').map(r=>[r.name,r.id]);
    if(second&&roles.length>1)roles.push(roles.shift());
    if(groups)roles.push(...Object.entries(spriteCategories).map(([id,label])=>[label+'（類別）','#'+id]));
    if(contact)roles.unshift(['碰撞的第一個角色','@first'],['碰撞的第二個角色','@second']);
    return roles.length?roles:[['道具','item']];
  };
  return input.appendField(new B.FieldDropdown(options),key);
}
const eventNames={...events,start:'當啟動時',down:'當手指按下時',up:'當手指放開時',timer:'每隔',bottle:'當小布碰到寶特瓶'};
for(const [key,label] of Object.entries(eventNames)){
  register('@'+key,b=>{const line=b.appendDummyInput();
    if(key==='collision'){
      roleField(line.appendField('當'),'first',{groups:true});roleField(line.appendField('碰到'),'second',{second:true,groups:true});line.appendField('時');
    }else line.appendField(label);

    if(key==='timer'){number(line,'ms',1000,40,60000);line.appendField('毫秒');}body(b);});
}
for(const key of ['touchX','touchY','number']){
  register(key,b=>{const row=b.appendDummyInput();if(key==='number')number(row,'value',0);else row.appendField(key==='touchX'?'觸控 X':'觸控 Y');b.setOutput(true,'Coordinate');});
}
register('heroDesign',b=>{
  b.setColour(colors.variable);b.setDeletable(false);
  const role=projectRoles.find(r=>r.id==='player');
  const line=b.appendDummyInput().appendField('變數').appendField(role?.name||'主角').appendField('設為角色');
  thumbnail(line,b,'player');
});
register('function',b=>{textField(b.appendDummyInput().appendField('定義積木'),'name','我的動作');body(b);});
for(const op of Object.keys(actions)){
  register(op,b=>{
    statement(b);b.setInputsInline(true);
    if(op==='moveTo'){
      b.appendValueInput('X').setCheck('Coordinate').appendField('將主角移到　x');
      b.appendValueInput('Y').setCheck('Coordinate').appendField('y');return;
    }
    const l=b.appendDummyInput(),d=action(op);
    switch(op){
      case 'dragActor':roleField(l.appendField('讓'),'role');menu(l.appendField('跟著手指移動'),'axes',{xy:'上下左右',x:'只移左右',y:'只移上下'});break;
      case 'walkActor':roleField(l.appendField('讓'),'role');number(l.appendField('以水平速度'),'value',80);l.appendField('移動');break;
      case 'createActor':
        roleField(l.appendField('變數'),'role',{objects:true});l.appendField('設為角色');thumbnail(l,b,()=>b.getFieldValue('role'));number(l.appendField('在 X'),'x',80,0,1920);number(l.appendField('Y'),'y',60,0,1280);break;
      case 'actorSet':
        roleField(l.appendField('將'),'role',{contact:true});menu(l.appendField('的'),'prop',props);number(l.appendField('設為'),'value',20);break;
      case 'actorRemove':roleField(l.appendField('移除'),'role',{contact:true});break;
      case 'skin':{
        l.appendField('主角換成').appendField(new B.FieldDropdown(()=>opts(artEditor.poses())),'art');
        const id=()=>b.getFieldValue('art');
        const field=new B.FieldImage(artEditor.posePreview(id()),32,32,'點圖編輯動作造型',()=>artEditor.pose(id()));
        l.appendField(field);
        b.updateArt=()=>{const src=artEditor.posePreview(id());if(field.getValue()!==src)field.setValue(src);};
        b.setOnChange(b.updateArt);break;
      }
      case 'scoreSet':number(l.appendField('分數設為'),'value',0);break;
      case 'score':number(l.appendField('分數增加'),'value',1);break;
      case 'life':number(l.appendField('生命增加'),'value',-1);break;
      case 'remove':l.appendField('銷毀　碰到的物件');break;
      case 'set':case 'add':
        menu(l.appendField('將主角的'),'prop',props);number(l.appendField(op==='set'?'設為':'增加'),'value',d.value);break;
      case 'jump':number(l.appendField('跳躍　速度'),'value',d.value);number(l.appendField('最多'),'count',1,1,8);number(l.appendField('跳　加成'),'bonus',0);break;
      case 'variable':case 'increment':textField(l.appendField('變數'),'name','能量');number(l.appendField(op==='variable'?'設為':'增加'),'value',d.value);break;
      case 'gate':number(l.appendField('建立缺口　寬度'),'value',50);number(l.appendField('水平速度'),'vx',-45);break;
      case 'spawn':{
        roleField(l.appendField('產生'),'kind',{objects:true});menu(l,'art',skins);b.getField('art').setVisible(false);thumbnail(l,b,()=>b.getFieldValue('kind'),()=>b.getFieldValue('art'));menu(l.appendField('在'),'origin',origins);
        b.getField('kind').setValidator(id=>{
          const art=projectRoles.find(r=>r.id===id)?.art;
          if(art&&skins[art]&&b.rendered&&B.Events.isEnabled())b.setFieldValue(art,'art');
          return id;
        });
        const v=b.appendDummyInput();number(v.appendField('速度 x'),'vx',0);number(v.appendField('y'),'vy',-140);number(v.appendField('追蹤速度'),'follow',0);b.setInputsInline(false);break;
      }
      case 'repeat':number(l.appendField('重複'),'times',2,1,24);l.appendField('次');body(b);break;
      case 'condition':{
        menu(l.appendField('如果'),'when',guards);
        // Numeric thresholds and named variables also work for imported rule guards.
        const detail=b.appendDummyInput('DETAIL');textField(detail,'name','能量');number(detail.appendField('門檻'),'threshold',1);
        b.setInputsInline(false);body(b);
        const update=()=>{const when=b.getFieldValue('when');const shown=['scoreAt','lifeAt','varAt'].includes(when);
          if(detail.isVisible()!==shown){detail.setVisible(shown);if(b.rendered)b.render();}};
        b.setOnChange(update);update();break;
      }
      case 'call':{
        l.appendField('執行積木').appendField(new B.FieldDropdown(function(){
          const ws=this.getSourceBlock()?.workspace;const main=ws?.targetWorkspace||ws;
          const defs=main?.getBlocksByType(type('function'),false)||[];
          return defs.length?defs.map(f=>[f.getFieldValue('name')||'我的動作',f.id]):[['先定義積木','none']];
        }),'fn');break;
      }
      default:l.appendField(actions[op]);
    }
  });
}
const block=(key,fields={})=>({type:type(key),fields});
const connected=b=>({block:b});
const coord=v=>typeof v==='number'?block('number',{value:v}):block(v);
function chain(list,defs){
  let next;
  for(const a of [...list].reverse()){
    const {op,steps,x,y,...fields}=a;
    if(op==='call')fields.fn=defs[a.fn]?.id||'none';
    if(op==='createActor')Object.assign(fields,{x,y});
    const n=block(op,fields);
    if(op==='moveTo')n.inputs={X:connected(coord(x)),Y:connected(coord(y))};
    if(steps?.length)n.inputs={DO:connected(chain(steps,defs))};
    if(next)n.next=connected(next);next=n;
  }
  return next;
}
function fromProject(p){
  const defs=p.functions.map((f,i)=>({...block('function',{name:f.name}),id:'def-'+i}));
  const roots=p.rules.map(r=>{
    const n=block('@'+r.on,r.on==='timer'?{ms:r.ms}:r.on==='collision'?{first:r.first,second:r.second}:{});
    const steps=r.when==='always'?r.steps:[{...action('condition'),when:r.when,name:r.name||'能量',threshold:r.threshold??1,steps:r.steps}];
    if(steps.length)n.inputs={DO:connected(chain(steps,defs))};return n;
  });
  defs.forEach((d,i)=>{if(p.functions[i].steps.length)d.inputs={DO:connected(chain(p.functions[i].steps,defs))};});
  return {languageVersion:0,blocks:[...defs,...roots]};
}
function readSteps(first,defs){
  const list=[];
  for(let b=first;b;b=b.getNextBlock()){
    const op=registered.get(b.type),a=action(op);
    for(const k of Object.keys(a)){
      if(k==='op')continue;
      if(k==='steps'){a.steps=readSteps(b.getInputTargetBlock('DO'),defs);continue;}
      if(op==='moveTo'){
        const v=b.getInputTargetBlock(k.toUpperCase());if(!v)throw Error('「移到座標」需要接上 X 和 Y。');
        const key=registered.get(v.type);a[k]=key==='number'?Number(v.getFieldValue('value')):key;continue;
      }
      const value=b.getFieldValue(k);
      if(k==='fn'){a.fn=defs.findIndex(d=>d.id===value);if(a.fn<0)throw Error('請為「執行積木」選擇一個已定義的積木。');}
      else a[k]=nums.has(k)?Number(value):value;
    }
    list.push(a);
  }
  return list;
}
function collisionFields(b){
  const first=b.getFieldValue('first'),second=b.getFieldValue('second');
  const previous=legacyPairs[b.data];
  if(previous&&previous[0]===first&&previous[1]===second)return {on:b.data};
  return {first,second};
}
function upgradeEvent(root){
  const old=registered.get(root.type)?.slice(1),pair=legacyPairs[old];
  // Stomping is a directional physics event, distinct from touching either side.
  if(!pair||old==='stomp')return root;
  return {...root,type:type('@collision'),data:old,fields:{first:pair[0],second:pair[1]}};
}
function readProgram(ws){
  const top=ws.getTopBlocks(true),defs=top.filter(b=>b.type===type('function'));
  const rules=top.filter(b=>registered.get(b.type)?.startsWith('@')).map(b=>({on:registered.get(b.type).slice(1),when:'always',...(b.type===type('@collision')?collisionFields(b):{}),ms:Number(b.getFieldValue('ms')||1000),steps:readSteps(b.getInputTargetBlock('DO'),defs)}));
  const functions=defs.map(b=>({name:b.getFieldValue('name'),steps:readSteps(b.getInputTargetBlock('DO'),defs)}));
  return {rules,functions};
}
function toolEntry(key){
  const entry={kind:'block',type:type(key)};
  if(key==='moveTo')entry.inputs={X:{shadow:coord('touchX')},Y:{shadow:coord('touchY')}};
  return entry;
}
export function createEditor(host,changed,art){
  artEditor=art;
  const toolbox={kind:'categoryToolbox',contents:categories.map(([id,name,icon,keys])=>({kind:'category',name,colour:colors[id],cssConfig:{icon:'bp-icon bp-'+id},contents:keys.map(toolEntry)}))};
  toolbox.contents[0].contents.unshift({kind:'button',text:'＋ 畫新角色',callbackKey:'DRAW_ROLE'},{kind:'button',text:'＋ 畫動作造型',callbackKey:'DRAW_POSE'});
  toolbox.contents.find(c=>c.name==='場景').contents.unshift({kind:'button',text:'畫場景',callbackKey:'DRAW_SCENE'});
  const ws=B.inject(host,{renderer:'zelos',toolbox,toolboxPosition:'end',media:'./vendor/blockly/media/',sounds:false,trashcan:true,comments:false,disable:false,
    grid:{spacing:20,length:2,colour:'#d4d9e4',snap:false},move:{scrollbars:true,drag:true,wheel:true},zoom:{controls:false,wheel:false,startScale:1,maxScale:1.6,minScale:.48,scaleSpeed:1.15}});
  ws.registerButtonCallback('DRAW_ROLE',()=>art.open(null));
  ws.registerButtonCallback('DRAW_POSE',()=>art.pose(null));
  ws.registerButtonCallback('DRAW_SCENE',()=>art.scene());
  function placeRole(id,x,y){
    let start=ws.getBlocksByType(type('@start'),false)[0];
    if(!start){start=ws.newBlock(type('@start'));start.initSvg();start.render();const bounds=ws.getBlocksBoundingBox();start.moveBy(16,bounds.bottom+18);}
    let tail=start.getInput('DO').connection;
    while(tail.targetBlock())tail=tail.targetBlock().nextConnection;
    const actor=ws.newBlock(type('createActor'));actor.setFieldValue(id,'role');actor.setFieldValue(x,'x');actor.setFieldValue(y,'y');
    actor.initSvg();tail.connect(actor.previousConnection);actor.render();commit();
  }
  let current,previous,enabled=false;
  function commit(){
    if(!enabled||!current)return;
    const layout=B.serialization.workspaces.save(ws).blocks||{languageVersion:0,blocks:[]};
    const serialized=JSON.stringify(layout);if(serialized===previous)return;
    previous=serialized;
    try{changed(layout,readProgram(ws));}catch(e){changed(layout,null,e.message);}
  }
  ws.addChangeListener(e=>{if(e.type===B.Events.VIEWPORT_CHANGE)document.getElementById('zoomLabel').textContent=Math.round(ws.scale*100)+'%';if(!e.isUiEvent&&!ws.isDragging())commit();});
  function open(p){
    const viewport=current===p?{x:ws.scrollX,y:ws.scrollY}:null;
    enabled=false;current=p;prepareRoles(p);projectRoles=p.roles;
    B.Events.disable();
    try{
      ws.clear();const saved=p.blockLayout;
      const source=saved||fromProject(p);
      // Load function definitions first so existing call fields resolve by stable id.
      let states=source.blocks||[];
      if(!states.some(b=>b.type===type('heroDesign'))){
        states=[{type:type('heroDesign'),x:16,y:18},...states.map(b=>saved?{...b,y:(b.y||0)+68}:b)];
      }
      const ordered=[...states].sort((a,b)=>Number(b.type===type('function'))-Number(a.type===type('function')));
      for(const state of ordered)B.serialization.blocks.append(upgradeEvent(state),ws);
      B.renderManagement.finishQueuedRenders();
      const stacks=ws.getTopBlocks(true);
      // Recognize only the previous automatic column. Keep hand-positioned programs as drawn.
      const oldColumn=stacks.every((block,i)=>{
        const {x,y}=block.getRelativeToSurfaceXY();
        if(Math.abs(x-26)>=1)return false;
        if(!i)return Math.abs(y-28)<2;
        const previous=stacks[i-1],gap=y-previous.getRelativeToSurfaceXY().y;
        // Gestures added to old projects by prepareTouch occupied 145 units each.
        const migratedGesture=['drag','leftSide','rightSide','up'].some(event=>previous.type===type('@'+event));
        return Math.abs(gap-previous.getHeightWidth().height-26)<2||(migratedGesture&&gap===145);
      });
      if(!saved||oldColumn){
        if(!saved){const rank=b=>b.type===type('heroDesign')?-1:Number(b.type===type('function'));stacks.sort((a,b)=>rank(a)-rank(b));}
        const width=ws.getMetrics().viewWidth/ws.scale;
        let x=16,y=18,rowHeight=0;
        for(const b of stacks){
          const size=b.getHeightWidth();
          if(x>16&&x+size.width+16>width){x=16;y+=rowHeight+18;rowHeight=0;}
          const pos=b.getRelativeToSurfaceXY();
          b.moveBy(x-pos.x,y-pos.y);
          rowHeight=Math.max(rowHeight,size.height);
          x+=size.width+18;
        }
      }
      ws.clearUndo();ws.scroll(viewport?.x||0,viewport?.y||0);ws.getToolbox()?.clearSelection();
      previous=undefined;
    }finally{B.Events.enable();enabled=true;}
  }
  new ResizeObserver(()=>B.svgResize(ws)).observe(host);
  return {open,commit,placeRole,updateArt:()=>ws.getAllBlocks(false).forEach(b=>b.updateArt?.()),undo:redo=>ws.undo(redo),zoom:delta=>ws.zoomCenter(delta),resize:()=>B.svgResize(ws),percent:()=>Math.round(ws.scale*100)};
}
