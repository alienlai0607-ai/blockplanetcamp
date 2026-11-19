import {prepareTouch} from './touch.js';
import {roleCategory} from './roles.js';
export const W=160,H=120,TILE=16;
export const clamp=(v,min,max)=>Math.min(max,Math.max(min,v));
const overlap=(a,b)=>Math.abs(a.x-b.x)*2<a.w+b.w && Math.abs(a.y-b.y)*2<a.h+b.h;
const tileEntities={B:['bottle','bottle'],o:['coin','coin'],f:['flower','flower'],w:['enemy','walker'],b:['enemy','flier'],'*':['fire','fire'],G:['goal','coin'],'!':['danger','fire']};
function entity(kind,art,x,y){
  return {kind,role:kind,art,x,y,ax:0,ay:0,homeY:y,w:12,h:12,vx:0,vy:0,follow:0};
}
export class Game {
  constructor(project,random=Math.random){
    this.p=prepareTouch(structuredClone(project));this.random=random;
    this.player={...entity('player',project.art,project.x,project.y),ax:0,ay:0};
    this.vars=new Map();this.life=project.life;this.score=0;this.time=0;this.state='playing';
    this.level=0;this.held=false;this.direction=0;this.facing=1;this.grace=0;
    this.categories=new Map((project.roles||[]).map(r=>[r.id,roleCategory(r)]));
    this.collisionRules=project.rules.filter(r=>r.on==='collision');
    this.objectIds=new WeakMap();this.nextId=0;
    this.clocks=this.p.rules.map(()=>0);this.loadLevel();this.emit('start');
  }
  loadLevel(){
    this.contacts=new Set();
    this.map=this.p.levels[this.level]||[];this.width=this.map.length?this.map[0].length*TILE:W;
    this.height=this.map.length?this.map.length*TILE:H;this.entities=[];this.jumps=0;
    this.grounded=false;this.wall=false;this.crouch=false;this.floorClock=0;
    Object.assign(this.player,{x:this.p.x,y:this.p.y,vx:0,vy:0});
    this.map.forEach((row,y)=>Array.from(row).forEach((ch,x)=>{
      const px=x*TILE+8,py=y*TILE+8;
      if(ch==='S') Object.assign(this.player,{x:px,y:py});
      if(!tileEntities[ch])return;
      const obj=entity(...tileEntities[ch],px,py);
      if(ch==='w') obj.vx=30;
      if(ch==='b') obj.follow=25;
      if(ch==='!') obj.w=obj.h=16;
      this.entities.push(obj);
    }));
    this.camera();
  }
  camera(){
    this.camX=clamp(this.player.x-W/2,0,Math.max(0,this.width-W));
    this.camY=clamp(this.player.y-H/2,0,Math.max(0,this.height-H));
  }
  rule(r,target,depth=0,budget={left:2000}){
    if(r.when==='clean'&&this.entities.some(o=>!o.dead&&o.kind==='bottle'))return;
    if(r.when==='held'&&!this.held || r.when==='air'&&this.grounded || r.when==='ground'&&!this.grounded)return;
    if(r.when==='scoreAt'&&this.score<r.threshold || r.when==='lifeAt'&&this.life>r.threshold || r.when==='varAt'&&(this.vars.get(r.name)??0)<r.threshold)return;
    for(const a of r.steps){
      if(this.state!=='playing'||budget.left--<=0)break;
      const p=this.player;
      switch(a.op){
        case 'call':{
          const fn=this.p.functions[a.fn];if(fn&&depth<5)this.rule(fn,target,depth+1,budget);break;
        }
        case 'createActor':{
          const role=this.p.roles?.find(r=>r.id===a.role);
          if(role&&this.entities.length<320)this.entities.push({...entity('actor',role.art,a.x,a.y),role:role.id});
          break;
        }
        case 'dragActor':case 'walkActor':case 'actorSet':case 'actorRemove':{
          const role=a.role, pair=this.collisionPair||[];
          const obj=role==='@first'?pair[0]:role==='@second'?pair[1]:
            pair.find(o=>!o.dead&&o.role===role)||(role==='player'?p:this.entities.findLast(o=>!o.dead&&o.role===role));
          if(!obj||obj.dead)break;
          if(a.op==='dragActor'){
            if(a.axes!=='y')obj.x=clamp(obj.x+(this.dragX||0),obj.w/2,this.width-obj.w/2);
            if(a.axes!=='x')obj.y=clamp(obj.y+(this.dragY||0),obj.h/2,this.height-obj.h/2);
          }else if(a.op==='walkActor'){
            obj.drive=a.value||null;obj.vx=a.value;
            if(obj===p&&a.value)this.facing=Math.sign(a.value);
          }else if(a.op==='actorSet'){if(a.prop==='vx')obj.drive=null;obj[a.prop]=a.value;}
          else if(obj===p)this.state='lost';else obj.dead=true;
          break;
        }
        case 'scoreSet':this.score=a.value;break;
        case 'moveTo':{
          const coordinate=v=>typeof v==='number'?v:(v==='touchX'?this.touchX:this.touchY)??0;
          p.x=clamp(coordinate(a.x),p.w/2,this.width-p.w/2);
          p.y=clamp(coordinate(a.y),p.h/2,this.height-p.h/2);break;
        }
        case 'condition':this.rule(a,target,depth,budget);break;
        case 'repeat':for(let i=0;i<a.times&&budget.left>0&&this.state==='playing';i++)this.rule(a,target,depth,budget);break;
        case 'variable':this.vars.set(a.name,a.value);break;
        case 'increment':this.vars.set(a.name,(this.vars.get(a.name)??0)+a.value);break;
        case 'set':if(a.prop==='vx')p.drive=null;p[a.prop]=a.value;break;
        case 'add':if(a.prop==='vx')p.drive=null;p[a.prop]+=a.value;break;
        case 'jump':
          if(this.grounded||this.wall&&this.p.wallGrip||this.jumps<a.count){
            const timed=this.jumps>0&&p.vy>=-40;
            p.vy=a.value-(timed?(a.bonus??0):0);this.jumps++;this.grounded=false;this.wall=false;
          }break;
        case 'life':this.life+=a.value;if(this.life<=0)this.state='lost';break;
        case 'score':this.score+=a.value;break;
        case 'skin':p.art=a.art;p.pose=a.art;break;
        case 'spawn':this.spawn(a);break;
        case 'gate':this.gate(a);break;
        case 'remove':if(target===p)this.state='lost';else if(target)target.dead=true;break;
        case 'next':
          if(this.level+1>=this.p.levels.length)this.state='won';
          else {this.level++;this.loadLevel();this.grace=0.5;}break;
        case 'win':this.state='won';break;
        case 'lose':this.state='lost';break;
      }
    }
  }
  emit(name,target,source=this.player){
    const previous=this.collisionPair;
    if(target)this.collisionPair=[source,target];
    for(const r of this.p.rules)if(r.on===name)this.rule(r,target);
    this.collisionPair=previous;
  }
  spawn(a){
    if(this.entities.length>=320)return;
    let {x,y}=this.player;
    if(a.origin==='top'){x=this.camX+10+this.random()*(W-20);y=this.camY-8;}
    if(a.origin==='right'){x=this.camX+W+8;y=this.camY+12+this.random()*(H-24);}
    if(a.origin==='near'){x+=64;y=clamp(y-48,8,this.height-8);}
    const obj=Object.assign(entity(a.kind,a.art,x,y),{vx:a.vx,vy:a.vy,follow:a.follow});
    if(a.kind==='bullet'){obj.w=4;obj.h=7;}
    this.entities.push(obj);
  }
  gate(a){
    if(this.entities.length>=318)return;
    const gap=clamp(a.value,18,H-16);
    const top=8+this.random()*(H-gap-16),bottom=top+gap;
    const x=this.camX+W+8;
    for(const [art,y,h] of [['pipe',top/2,top],['pipeBottom',(H+bottom)/2,H-bottom],['gap',(top+bottom)/2,gap]]){
      this.entities.push(Object.assign(entity(art==='gap'?'pass':'enemy',art,x,y),{w:art==='gap'?1:14,h,vx:a.vx}));
    }
  }
  solid(col,row){return ['#','='].includes(this.map[row]?.[col]);}
  hits(obj){
    const left=Math.floor((obj.x-obj.w/2+.01)/TILE),right=Math.floor((obj.x+obj.w/2-.01)/TILE);
    const top=Math.floor((obj.y-obj.h/2+.01)/TILE),bottom=Math.floor((obj.y+obj.h/2-.01)/TILE);
    for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++)if(this.solid(x,y))return {x,y};
  }
  movePlayer(dt){
    const p=this.player,oldBottom=p.y+p.h/2;
    if(p.drive!=null)p.vx=p.drive;
    p.vx+=p.ax*dt;p.vy+=p.ay*dt;
    if(this.p.vyLimit)p.vy=clamp(p.vy,-this.p.vyLimit,this.p.vyLimit);
    p.x+=p.vx*dt;
    let hit=this.hits(p);this.wall=Boolean(hit&&p.vx);
    if(this.wall){p.x=p.vx>0?hit.x*TILE-p.w/2:(hit.x+1)*TILE+p.w/2;p.vx=0;}
    if(this.wall&&this.p.wallGrip&&p.vy>=0){p.vy=0;this.jumps=0;}
    p.y+=p.vy*dt;hit=this.hits(p);this.grounded=false;
    if(hit&&p.vy){
      this.grounded=p.vy>0;p.y=this.grounded?hit.y*TILE-p.h/2:(hit.y+1)*TILE+p.h/2;p.vy=0;
      if(this.grounded)this.jumps=0;
    }
    p.x=clamp(p.x,p.w/2,this.width-p.w/2);
    if(this.p.bounds==='clamp'&&!this.map.length){
      if(p.y>=H-p.h/2){
        this.floorClock+=dt;
        if(this.floorClock>=1){this.emit('floor');this.floorClock=0;}
      }else this.floorClock=0;
      p.y=clamp(p.y,p.h/2,H-p.h/2);
    }else if(p.y+p.h/2>this.height||(!this.map.length&&p.y-p.h/2<0)){
      if(this.map.length)this.emit('danger');else this.emit('edge');
    }
    return oldBottom;
  }
  tick(dt){
    if(this.state!=='playing')return;
    this.time+=dt;this.grace=Math.max(0,this.grace-dt);
    this.p.rules.forEach((r,i)=>{
      if(r.on!=='timer')return;
      this.clocks[i]+=dt*1000;
      if(this.clocks[i]>=r.ms){this.clocks[i]%=r.ms;this.rule(r);}
    });
    const oldBottom=this.movePlayer(dt);this.camera();
    const p=this.player,objects=this.entities;
    for(const o of objects){
      if(o.dead)continue;
      if(o.follow){
        const dx=p.x-o.x,dy=p.y-o.y,dist=Math.max(1,Math.hypot(dx,dy));
        if(o.art!=='flier'||dist<70){o.vx=o.follow*dx/dist;o.vy=o.follow*dy/dist;}
        else {o.vx=0;o.vy=0;}
      }
      if(o.art==='walker'){
        const ahead=Math.floor((o.x+Math.sign(o.vx)*8)/TILE),row=Math.floor(o.y/TILE);
        if(this.solid(ahead,row)||!this.solid(ahead,row+1))o.vx=-o.vx;
      }
      if(o.drive!=null)o.vx=o.drive;
      o.vx+=(o.ax||0)*dt;o.vy+=(o.ay||0)*dt;
      o.x+=o.vx*dt;o.y+=o.vy*dt;
      if(o.kind==='fire')o.y=o.homeY-14*(1-Math.cos(this.time*3));
    }
    this.collisions(objects);
    for(const o of objects){
      if(objects!==this.entities||this.state!=='playing')break;
      if(o.dead)continue;
      if(o.kind==='bullet'){
        const enemy=objects.find(e=>e.kind==='enemy'&&!e.dead&&overlap(e,o));
        if(enemy){this.emit('hit',enemy,o);o.dead=true;}
      }
      if(o.kind==='pass'){
        if(o.x<p.x-p.w/2&&!o.dead){this.emit('pass');o.dead=true;}
      }else if(!o.dead&&o.kind!=='bullet'&&overlap(o,p)){
        if(o.kind==='enemy'||o.kind==='fire'){
          if(this.grace<=0){
            const canStomp=this.p.rules.some(r=>r.on==='stomp');
            const fromAbove=oldBottom<=o.y-o.h/2+2&&p.vy>0;
            this.emit(canStomp&&fromAbove?'stomp':o.kind,o);this.grace=.65;
          }
        }else this.emit(o.kind,o);
      }
      if(objects!==this.entities||this.state!=='playing')break;
    }
    this.entities=this.entities.filter(o=>!o.dead&&o.x>=-32&&o.y>=-96&&o.x<=this.width+48&&o.y<=this.height+32);
  }
  collisions(objects){
    if(!this.collisionRules.length||this.state!=='playing')return;
    const groups=new Map(), next=new Set();
    for(const obj of [this.player,...objects]){
      if(obj.dead||obj.kind==='pass')continue;
      const role=obj.role??obj.kind;
      for(const key of [role,'#'+(this.categories.get(role)||roleCategory({id:role}))]){
        if(!groups.has(key))groups.set(key,[]);
        groups.get(key).push(obj);
      }
      if(!this.objectIds.has(obj))this.objectIds.set(obj,++this.nextId);
    }
    for(const [index,r] of this.collisionRules.entries()){
      for(const a of groups.get(r.first)||[])for(const b of groups.get(r.second)||[]){
        if(a===b||a.dead||b.dead||!overlap(a,b))continue;
        const left=this.objectIds.get(a),right=this.objectIds.get(b);
        if(r.first===r.second&&left>right)continue;
        const key=index+','+left+','+right;
        next.add(key);
        if(!this.contacts.has(key)){
          this.collisionPair=[a,b];this.rule(r,b);this.collisionPair=null;
          if(objects!==this.entities||this.state!=='playing')return;
        }
      }
    }
    this.contacts=next;
  }
  press(x,y){
    if(this.held||this.state!=='playing')return;
    this.held=true;this.touchX=x+this.camX;this.touchY=y+this.camY;this.anchorY=y;this.lastX=x;this.lastY=y;this.jumpArmed=true;
    this.direction=x<W/2?-1:1;this.emit(this.direction<0?'leftSide':'rightSide');
    this.emit('down');
  }
  move(x,y){
    if(!this.held)return;
    this.touchX=x+this.camX;this.touchY=y+this.camY;
    this.dragX=x-this.lastX;this.dragY=y-this.lastY;
    if(this.dragX||this.dragY)this.emit('drag');
    this.dragX=this.dragY=0;this.camera();
    if(Math.abs(x-W/2)>4){
      const side=x<W/2?-1:1;
      if(this.direction!==side){this.direction=side;this.emit(side<0?'leftSide':'rightSide');}
    }
      if(this.jumpArmed&&y<this.anchorY-7){this.emit('jump');this.jumpArmed=false;this.crestY=y;}
      if(!this.jumpArmed){
        this.crestY=Math.min(this.crestY,y);
        if(y>this.crestY+6){this.jumpArmed=true;this.anchorY=y;}
      }else this.anchorY=Math.max(this.anchorY,y);
    this.crouch=y>this.lastY+3&&this.grounded;
    this.lastX=x;this.lastY=y;
  }
  release(){
    if(!this.held)return;
    this.held=false;this.direction=0;this.crouch=false;this.emit('up');
  }
}
