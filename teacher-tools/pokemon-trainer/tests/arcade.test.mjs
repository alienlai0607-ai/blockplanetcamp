import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../arcade/engine.js';
import {example,names,action} from '../arcade/projects.js';
import {validate} from '../arcade/validate.js';
const make=id=>new Game(validate(example(id)),()=>.5);
const ticks=(g,n)=>{for(let i=0;i<n;i++)g.tick(1/120);};

test('five editable samples and a blank game survive export/import',()=>{
  for(const id in names){
    const p=example(id);assert.deepEqual(validate(JSON.parse(JSON.stringify(p))),p);
    const g=make(id);assert.equal(g.state,'playing');assert.ok(Number.isFinite(g.player.y));
  }
});
test('duck flaps only on a new press, awards a passed gate once and loses on collision',()=>{
  const g=make('duck');g.press(0,0);assert.equal(g.player.vy,-100);
  ticks(g,5);const v=g.player.vy;g.press(0,0);assert.equal(g.player.vy,v);
  g.release();g.press(0,0);assert.equal(g.player.vy,-100);
  g.gate({vx:-45,value:50});const marker=g.entities.find(e=>e.kind==='pass');
  marker.x=g.player.x-8;ticks(g,2);assert.equal(g.score,1);
  const pipe=g.entities.find(e=>e.art==='pipe');Object.assign(pipe,{x:g.player.x,y:g.player.y});ticks(g,1);assert.equal(g.state,'lost');
});
test('hot air balloon keeps momentum on release, stops burning and takes ground damage',()=>{
  const g=make('balloon');g.press(0,0);ticks(g,30);assert.equal(g.player.ay,-50);
  const v=g.player.vy;g.release();assert.equal(g.player.vy,v);assert.equal(g.player.ay,50);assert.equal(g.player.art,'balloon');
  g.player.y=114;g.player.vy=25;ticks(g,122);assert.equal(g.life,2);
});
test('ship moves and shoots with one finger, then stops firing',()=>{
  const g=make('space');g.press(50,80);g.move(65,75);assert.equal(g.player.x,95);assert.equal(g.player.y,94);
  ticks(g,35);assert.equal(g.entities.filter(x=>x.kind==='bullet').length,2);g.release();
  const shots=g.entities.filter(x=>x.kind==='bullet');ticks(g,15);
  assert.deepEqual(g.entities.filter(x=>x.kind==='bullet'),shots);
  const shot=shots[0];g.entities.push({...shot,kind:'enemy',vy:0});ticks(g,1);assert.equal(g.score,1);
});
test('single finger runs and jumps twice, rejects third jump, resets on landing',()=>{
  const g=make('hero');ticks(g,90);assert.ok(g.grounded);g.press(110,110);g.move(110,98);ticks(g,5);
  assert.ok(g.player.vx>0&&g.player.vy<0);g.move(110,110);g.move(110,96);assert.equal(g.jumps,2);
  ticks(g,2);const v=g.player.vy;g.move(110,110);g.move(110,96);assert.equal(g.player.vy,v);
  g.release();ticks(g,170);assert.equal(g.player.vx,0);assert.equal(g.jumps,0);
});
test('cat collects items, triggers a chasing bee, and a fireball costs two lives',()=>{
  const g=make('cat');const coin=g.entities.find(x=>x.kind==='coin');g.emit('coin',coin);assert.ok(coin.dead);assert.equal(g.score,1);
  const flower=g.entities.find(x=>x.kind==='flower');g.emit('flower',flower);assert.ok(flower.dead);
  assert.equal(g.entities.find(x=>x.art==='bee').follow,50);g.emit('fire',{});assert.equal(g.life,3);
});
test('every supplied level has a real spawn and a reachable game event at its goal',()=>{
  for(const [id,count] of [['hero',8],['cat',3]]){
    const g=make(id);assert.equal(g.p.levels.length,count);
    for(let i=0;i<count;i++){
      assert.equal(g.level,i);const goal=g.entities.find(e=>e.kind==='goal');assert.ok(goal);
      assert.ok(g.map.some(row=>row.includes('S')));Object.assign(g.player,{x:goal.x,y:goal.y});ticks(g,1);
    }
    assert.equal(g.state,'won');
  }
});
test('changing blocks in blank projects changes physics and conditional rewards',()=>{
  const p=example('blank');
  p.rules=[{on:'down',ms:1000,when:'always',steps:[{op:'set',prop:'vy',value:-175},{op:'increment',name:'能量',value:1}]},
    {on:'down',ms:1000,when:'varAt',name:'能量',threshold:2,steps:[{op:'win'}]}];
  const g=new Game(validate(p));g.press(10,10);assert.equal(g.player.vy,-175);assert.equal(g.state,'playing');
  g.release();g.press(10,10);assert.equal(g.state,'won');
});
test('invalid imports and recursive custom blocks are rejected',()=>{
  const p=example('space');p.functions[0].steps.push(action('call'));assert.throws(()=>validate(p));
  const q=example('hero');q.levels[0][0]='?';assert.throws(()=>validate(q));
});

test('beach touch coordinates, bottle collision and final victory are driven by blocks',()=>{
  const g=make('beach');assert.equal(g.entities.filter(o=>o.kind==='bottle').length,3);
  for(const [i,b] of g.entities.filter(o=>o.kind==='bottle').entries()){
    g.press(b.x-g.camX,b.y-g.camY);ticks(g,1);g.release();
    assert.equal(g.score,i+1);assert.equal(g.state,i===2?'won':'playing');
  }
});
test('repeat runs nested statements and stops after the specified count',()=>{
  const p=example('blank');p.rules.push({on:'start',when:'always',ms:1000,steps:[
    {...action('repeat'),times:3,steps:[{...action('condition'),when:'always',steps:[{op:'score',value:2}]}]}]});
  assert.equal(new Game(validate(p)).score,6);
});

test('one finger can drag a ship by selected axes while holding fire; deleting drag disables movement',()=>{
  for(const axes of ['xy','x','y','none']){
    const p=example('space'),drag=p.rules.find(r=>r.on==='drag');
    if(axes==='none')p.rules.splice(p.rules.indexOf(drag),1);
    else drag.steps[0].axes=axes;
    const g=new Game(validate(JSON.parse(JSON.stringify(p))));
    g.press(40,70);g.move(48,62);ticks(g,30);
    assert.equal(g.player.x,['xy','x'].includes(axes)?88:80);
    assert.equal(g.player.y,['xy','y'].includes(axes)?91:99);
    assert.equal(g.entities.filter(e=>e.kind==='bullet').length,2);
    g.release();ticks(g,35);assert.equal(g.entities.filter(e=>e.kind==='bullet').length,2);
  }
});
test('same costume can represent distinct named actors and only the two selected actors cause a contact',()=>{
  const p=example('blank');
  p.roles=[{id:'player',name:'主角',art:'duck'},{id:'a',name:'妹妹',art:'cat'},{id:'b',name:'哥哥',art:'cat'}];
  const create=(role,x)=>({op:'createActor',role,x,y:36});
  const rule=(on,steps,rest={})=>({on,when:'always',ms:1000,steps,...rest});
  p.rules=[rule('start',[create('a',64),create('b',65),create('b',110)]),
    rule('collision',[{op:'score',value:1},{op:'actorSet',role:'@first',prop:'ay',value:3}],{first:'b',second:'a'})];
  p.roles[1].name='小妹';
  const g=new Game(validate(JSON.parse(JSON.stringify(p))));
  ticks(g,4);assert.equal(g.score,1);assert.deepEqual(g.entities.map(o=>o.ay),[0,3,0]);
  g.entities[1].x=100;ticks(g,1);g.entities[1].x=65;ticks(g,1);assert.equal(g.score,2);
});
test('older drag works gain an editable gesture once and retain positions, block IDs and edits',async()=>{
  const {prepareTouch}=await import('../arcade/touch.js');
  const p=example('space');delete p.touchProgram;p.rules=p.rules.filter(r=>r.on!=='drag');
  p.blockLayout={languageVersion:0,blocks:[{id:'saved',type:'bp_on_down',x:61,y:34}]};
  prepareTouch(p);prepareTouch(p);assert.equal(p.rules.filter(r=>r.on==='drag').length,1);
  assert.equal(p.blockLayout.blocks[0].inputs.DO.block.type,'bp_dragActor');
  assert.equal(p.blockLayout.blocks[1].id,'saved');assert.equal(p.blockLayout.blocks[1].x,61);
  p.rules=p.rules.filter(r=>r.on!=='drag');p.blockLayout.blocks.shift();prepareTouch(p);
  assert.equal(p.rules.some(r=>r.on==='drag'),false);
});

test('five samples follow studio animation and freeze the selected partner when exported',async()=>{
  const {heroAppearance,portableGame}=await import('../arcade/companion.js');
  const frames=[Array(256).fill('#2555aa'),Array(256).fill('#ff8822')];
  const partner={name:'我的翼龍',size:16,frames,fps:7,background:Array(4096).fill(null)};
  for(const id of ['duck','balloon','space','cat','hero']){
    const game=example(id);
    assert.equal(heroAppearance(game,id,partner),partner);
    const exported=validate(JSON.parse(JSON.stringify(portableGame(game,id,partner))));
    assert.deepEqual(exported.rules,game.rules);
    assert.deepEqual(exported.costume,partner);
    assert.deepEqual(heroAppearance(exported,'imported',null),partner);
    assert.ok(!exported.customBG);
    assert.equal(heroAppearance({...game,heroSource:'builtin'},id,partner),null);
    assert.equal(heroAppearance(game,id,{...partner,frames:[Array(256).fill(null)]}),null);
  }
});

test('painted roles keep identity through rename, class collisions, touch and file round trips',async()=>{
  const {portableGame,heroAppearance}=await import('../arcade/companion.js');
  const p=example('blank'),drawing={size:16,fps:4,frames:[Array(256).fill('#ffda4b')]};
  p.roles=[{id:'player',name:'小月',art:'cat',drawing,category:'Player'},
    {id:'seed',name:'月光種子',art:'flower',category:'Enemy',drawing:structuredClone(drawing)}];
  p.heroSource='drawing';p.scenePixels=Array(4096).fill('#123456');
  const rule=(on,steps,fields={})=>({on,steps,when:'always',ms:1000,...fields});
  p.rules=[rule('start',[{op:'createActor',role:'seed',x:p.x,y:p.y}]),
    rule('collision',[{op:'actorSet',role:'@second',prop:'vx',value:9},{op:'score',value:1}],{first:'#Player',second:'#Enemy'}),
    rule('drag',[{op:'dragActor',role:'seed',axes:'x'}])];
  const loaded=validate(JSON.parse(JSON.stringify(portableGame(p,'blank',null))));
  assert.deepEqual(heroAppearance(loaded,'copy',null),drawing);
  const g=new Game(loaded);ticks(g,2);assert.equal(g.score,1);assert.equal(g.entities[0].vx,9);
  g.press(16,16);const x=g.entities[0].x;g.move(24,16);assert.equal(g.entities[0].x,x+8);
  loaded.roles[1].name='星星';assert.equal(loaded.rules[0].steps[0].role,'seed');
  loaded.roles[1].category='Food';const alternate=new Game(validate(loaded));ticks(alternate,2);assert.equal(alternate.score,0);
  assert.deepEqual(loaded.scenePixels,p.scenePixels);
  loaded.roles[1].drawing.frames[0].pop();assert.throws(()=>validate(loaded));
});

test('custom artwork round trips in every template without changing game simulation',async()=>{
  const {prepareRoles}=await import('../arcade/roles.js');
  for(const id of ['duck','balloon','space','cat','hero']){
    const base=example(id),painted=structuredClone(base);prepareRoles(painted);
    for(const role of painted.roles)role.drawing={size:16,frames:[Array(256).fill('#a9dc66')],fps:4};
    painted.heroSource='drawing';painted.scenePixels=Array(4096).fill('#112233');
    const games=[base,validate(JSON.parse(JSON.stringify(painted)))].map(p=>new Game(p,()=>.5));
    for(const game of games){game.press(45,80);game.move(60,65);ticks(game,70);game.release();ticks(game,65);}
    const [a,b]=games;
    for(const prop of ['player','entities','state','score','life','level'])assert.deepEqual(b[prop],a[prop],id+' '+prop);
  }
});

test('a named original pose runs on touch and is restored from an exported game',async()=>{
  const {portableGame}=await import('../arcade/companion.js');
  const p=example('balloon'),id='pose-spark';
  p.poses={[id]:{name:'發光',size:16,frames:[Array(256).fill('#ffffff')],fps:4}};
  const press=p.rules.find(r=>r.on==='down');press.steps.find(a=>a.op==='skin').art=id;
  const loaded=validate(JSON.parse(JSON.stringify(portableGame(p,'balloon',null))));
  const g=new Game(loaded);g.press(20,20);assert.equal(g.player.pose,id);
  g.release();assert.equal(g.player.pose,'balloon');assert.deepEqual(loaded.poses,p.poses);
  delete loaded.poses;assert.throws(()=>validate(loaded));
});
