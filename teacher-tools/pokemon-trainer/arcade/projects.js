import {prepareTouch} from './touch.js';
import { maps } from './maps.js';

export const featuredGames = ['duck','balloon','space','cat','hero'];
export const names = {
  beach:'小布淨灘隊', duck:'飛鴨穿越', balloon:'熱氣球旅行', space:'太空防衛', cat:'小貓跳台', hero:'平台冒險', blank:'空白遊戲'
};
export const controls = {
  touch:'點按或長按', drag:'拖曳駕駛', run:'左右跑與上撥跳躍'
};
export const hints = {
  beach:'點選沙灘上的寶特瓶，帶小布收集全部三個。',
  duck:'輕點一下拍翅，穿過冰柱之間的空隙。',
  balloon:'按住點火，放開熄火。注意高度，避開飛鳥。',
  space:'按住連射，朝任意方向拖曳來閃避隕石。',
  cat:'按住左半或右半往前跑，往上撥就跳。碰到花會引來蜜蜂！',
  hero:'按住左右移動，向上撥跳躍。手指往下回到原位，再上撥可二段跳。',
  blank:'加入事件和動作，再按「試玩」測試你的規則。'
};
export const skins = {xiaobu:"小布",bottle:"寶特瓶",duck:'飛鴨',balloon:'熱氣球',lit:'點火氣球',ship:'飛船',cat:'小貓',hero:'探險家',bee:'蜜蜂',bird:'飛鳥',rock:'隕石',coin:'金幣',shot:'星光彈',flower:'花朵',fire:'火球',walker:'地行怪',flier:'飛行怪'};
export const themes = {beach:"淨灘海岸",sky:'海岸晴空',sunset:'日光山谷',space:'星空',meadow:'小貓草原',hill:'冒險山丘'};
export const symbols = {B:"寶特瓶",'.':'擦除','#':'地面','=':'磚牆',S:'起點',G:'終點',o:'金幣',f:'花朵',b:'飛行怪',w:'地行怪','*':'火球','!':'陷阱'};
export const events = {drag:'當手指拖曳時',leftSide:'當按住左半邊時',rightSide:'當按住右半邊時',collision:'當角色碰到角色',bottle:'當小布碰到寶特瓶',start:'當遊戲開始',down:'當手指按下',up:'當手指放開',jump:'當向上撥',timer:'每隔一段時間',coin:'碰到金幣',flower:'碰到花朵',enemy:'碰到敵人',stomp:'從上方踩到敵人',hit:'子彈擊中敵人',pass:'穿過缺口',goal:'到達終點',fire:'碰到火球',danger:'碰到陷阱',edge:'飛出畫面',floor:'貼近地面'};
export const guards = {clean:'寶特瓶已撿完',always:'每次',held:'按住時',air:'在空中時',ground:'在地面時',scoreAt:'分數至少',lifeAt:'生命低於或等於',varAt:'變數至少'};
export const props = {x:'X 位置',y:'Y 位置',vx:'水平速度 vx',vy:'垂直速度 vy',ax:'水平加速度 ax',ay:'垂直加速度 ay'};
export const kinds = {bottle:'寶特瓶',bullet:'子彈',enemy:'敵人',coin:'金幣',flower:'花朵',fire:'火球'};
export const origins = {player:'主角位置',top:'上方隨機位置',right:'右方隨機位置',near:'主角右上方'};
export const actions = {dragActor:'隨手指移動',walkActor:'左右移動',createActor:'建立角色變數',actorSet:'設定角色變數屬性',actorRemove:'移除角色變數',moveTo:'移動到座標',scoreSet:'設定分數',condition:'如果',repeat:'重複',variable:'設定變數',increment:'累加變數',call:'執行自訂積木',set:'設定角色屬性',add:'改變角色屬性',jump:'跳躍',life:'增減生命',score:'增減分數',skin:'更換造型',spawn:'建立角色',gate:'產生一組缺口',remove:'移除碰到的角色',next:'下一關',win:'遊戲勝利',lose:'遊戲結束'};
export function action(op='score'){
  const extra = {dragActor:{role:'player',axes:'xy'},walkActor:{role:'player',value:80},createActor:{role:'item',x:80,y:60},actorSet:{role:'player',prop:'vx',value:20},actorRemove:{role:'@second'},moveTo:{x:'touchX',y:'touchY'},scoreSet:{value:0},condition:{when:'held',threshold:1,name:'能量',steps:[]},repeat:{times:2,steps:[]},variable:{name:'能量',value:0},increment:{name:'能量',value:1},call:{fn:0},set:{prop:'vy',value:-100},add:{prop:'vx',value:10},jump:{value:-140,count:1,bonus:0},score:{value:1},life:{value:-1},skin:{art:'duck'},spawn:{kind:'bullet',art:'shot',origin:'player',vx:0,vy:-140,follow:0},gate:{value:50,vx:-45}};
  return {op,...extra[op]};
}
const A=(op,values={})=>({...action(op),...values});
const R=(on,...steps)=>({on,when:'always',ms:1000,steps});
const every=(ms,...steps)=>({...R('timer',...steps),ms});
const score=value=>A('score',{value});
const life=value=>A('life',{value});
const set=(prop,value)=>A('set',{prop,value});
const spawn=values=>A('spawn',values);
const lose=A('lose'), remove=A('remove');
const platform=(speed,count)=>[
  R('jump',A('jump',{value:speed,count,bonus:count===2?15:0})),R('coin',remove,score(count===1?1:3)),
  R('stomp',remove,score(count===1?3:1),set('vy',-75)),R('enemy',life(-1)),
  R('danger',lose),R('goal',A('next'))
];
export function example(id){
  const p={version:1,title:names[id],control:'touch',theme:'sky',art:'duck',x:42,y:52,
    life:1,vyLimit:0,speed:80,wallGrip:false,bounds:'exit',levels:[],rules:[],functions:[]};
  switch(id){
    case 'beach':
      Object.assign(p,{theme:'beach',art:'xiaobu',bounds:'clamp',x:58,y:65,levels:[['..........','..........','........B.','..........','...S..B...','..........','....B.....','..........']]});
      p.rules=[R('start',A('skin',{art:'xiaobu'}),A('scoreSet')),R('down',A('moveTo')),R('bottle',remove,score(1),A('condition',{when:'clean',steps:[A('win')]}))];
      break;
    case 'duck': p.rules=[R('start',set('ay',300)),R('down',set('vy',-100)),every(1500,A('gate')),R('pass',score(1)),R('enemy',lose),R('edge',lose)]; break;
    case 'balloon': Object.assign(p,{theme:'sunset',vyLimit:25,art:'balloon',bounds:'clamp',life:3});
      p.rules=[R('start',set('ay',35)),R('down',set('ay',-50),A('skin',{art:'lit'})),R('up',set('ay',50),A('skin',{art:'balloon'})),every(1000,score(1)),every(1700,spawn({kind:'enemy',art:'bird',origin:'right',vx:-38,vy:0})),R('enemy',remove,life(-1)),R('floor',life(-1))];break;
    case 'space': Object.assign(p,{control:'drag',theme:'space',art:'ship',x:80,y:99,life:3,bounds:'clamp'});
      p.functions=[{name:'發射一顆星光彈',steps:[spawn({})]}];
      p.rules=[R('down',A('call')),{...every(240,A('call')),when:'held'},every(500,spawn({kind:'enemy',art:'rock',origin:'top',vx:0,vy:75})),R('hit',remove,score(1)),R('enemy',remove,life(-1))];break;
    case 'cat': Object.assign(p,{control:'run',theme:'meadow',art:'cat',life:5,wallGrip:true,levels:structuredClone(maps.cat)});
      p.rules=[R('start',set('ay',350)),...platform(-150,1),R('flower',remove,spawn({kind:'enemy',art:'bee',origin:'near',vx:0,vy:0,follow:50})),R('fire',remove,life(-2))];break;
    case 'hero': Object.assign(p,{control:'run',theme:'hill',art:'hero',life:3,speed:100,levels:structuredClone(maps.hero)});
      p.rules=[R('start',set('ay',294)),...platform(-120,2)];break;
  }
  return prepareTouch(p);
}
