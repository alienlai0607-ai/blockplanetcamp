/* Nine groups of eight; the nine champions draw their main-stage positions on site. */
'use strict';
(function(root){
  const METHOD='nine-groups-eight-v2', LEGACY_METHOD='eight-groups-nine-v1';
  const clone=x=>JSON.parse(JSON.stringify(x));
  const isNewState=s=>s?.draw?.method===METHOD&&s?.venuePlan?.version===2;
  const isVenueState=s=>isNewState(s)||(s?.draw?.method===LEGACY_METHOD&&s?.venuePlan?.version===1);
  const GROUP_IDS=['A1','A2','A3','B1','B2','B3','C1','C2','C3'];
  function shuffle(values,random=Math.random){const a=[...values];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
  function validate(draw,entries){
    if(entries.length!==72||draw.teams.length!==72||draw.groups.length!==9||draw.matches.length!==63)throw new Error('新制須為72隊、9組各8隊、63場分組賽。');
    const ids=new Set(entries.map(x=>x.id)), assigned=draw.groups.flatMap(g=>g.teamIds), matches=new Map(draw.matches.map(m=>[m.id,m]));
    if(ids.size!==72||new Set(draw.teams.map(t=>t.id)).size!==72||draw.teams.some(t=>!ids.has(t.id))||assigned.length!==72||new Set(assigned).size!==72||assigned.some(id=>!ids.has(id)))throw new Error('分組隊伍重複或名單不一致。');
    if(matches.size!==63||new Set(draw.groups.map(g=>g.id)).size!==9)throw new Error('場次或分組編號重複。');
    for(const g of draw.groups){
      if(!GROUP_IDS.includes(g.id)||g.venue!==g.id[0]||g.teamIds.length!==8||g.qualifierTeamIds.length||g.matchIds.length!==7)throw new Error('分組結構不正確。');
      if(g.matchIds.some(id=>!matches.has(id)||matches.get(id).groupId!==g.id)||!g.matchIds.includes(g.winnerMatchId))throw new Error('分組場次缺漏。');
      const first=g.matchIds.map(id=>matches.get(id)).filter(m=>m.roundIndex===0).flatMap(m=>m.slots.map(s=>s.teamId));
      if(first.length!==8||new Set(first).size!==8||first.some(id=>!g.teamIds.includes(id)))throw new Error('首輪必須完整包含本組8隊。');
    }
    for(const m of matches.values()){
      if(m.slots.length!==2||m.slots.some(s=>s.teamId?!ids.has(s.teamId):!matches.has(s.matchId)))throw new Error('對戰來源不完整。');
      if(m.nextMatchId&&(!matches.has(m.nextMatchId)||![0,1].includes(m.nextSlot)))throw new Error('晉級連線不正確。');
    }
    for(const v of ['A','B','C'])if(draw.venueSchedules[v].length!==21||draw.venueSchedules[v].some(id=>matches.get(id)?.venue!==v))throw new Error('三場地必須各21場。');
  }
  function generate(entries,random=Math.random){
    if(entries.length!==72)throw new Error('三場地九組賽制需要72隊。');
    const pool=shuffle(entries.map(t=>t.id),random), groups=[],matches=[],venueSchedules={A:[],B:[],C:[],MAIN:[]};
    GROUP_IDS.forEach((id,index)=>{
      const teamIds=pool.slice(index*8,index*8+8),local=[];let previous=[];
      for(let r=0;r<3;r++){
        const current=[];
        for(let o=0;o<4/(2**r);o++){
          const slots=r===0?teamIds.slice(o*2,o*2+2).map(teamId=>({teamId})):previous.slice(o*2,o*2+2).map(m=>({matchId:m.id,outcome:'winner'}));
          const m={id:`${id}-R${r+1}-${o+1}`,code:`${id}-R${r+1}-${o+1}`,label:r===2?`${id} 組冠軍賽`:`${id} 組${[8,4][r]}強第 ${o+1} 場`,groupId:id,venue:id[0],roundIndex:r,roundSize:[72,36,18][r],groupRoundSize:[8,4,2][r],slots,stage:'group',status:'pending',nextMatchId:null,nextSlot:null};
          current.push(m);local.push(m);matches.push(m);
        }
        previous=current;
      }
      groups.push({id,venue:id[0],label:`${id} 組`,teamIds,qualifierTeamIds:[],matchIds:local.map(m=>m.id),winnerMatchId:previous[0].id,winnerMainMatchId:null});
    });
    const byId=new Map(matches.map(m=>[m.id,m]));
    matches.forEach(m=>m.slots.forEach((s,i)=>{if(s.matchId){const src=byId.get(s.matchId);src.nextMatchId=m.id;src.nextSlot=i;}}));
    for(const v of ['A','B','C']){
      const q=matches.filter(m=>m.venue===v).sort((a,b)=>a.roundIndex-b.roundIndex||Number(a.id.split('-').at(-1))-Number(b.id.split('-').at(-1))||a.groupId.localeCompare(b.groupId));
      q.forEach((m,i)=>{m.venueOrder=i+1;m.callCode=`${v}-${String(i+1).padStart(2,'0')}`;});venueSchedules[v]=q.map(m=>m.id);
    }
    const draw={metadata:{format:METHOD,preview:false},teams:clone(entries),groups,matches,venueSchedules};validate(draw,entries);return draw;
  }
  function fromDraw(draw,base,options={}){
    validate(draw,base.entries);
    if(!options.replace&&base.matches?.length)throw new Error('已有賽程，不能覆寫。');
    if(base.activeMatchIds?.length||base.matches?.some(m=>m.openedAt||m.startedAt||m.auditLog?.length||(m.status==='completed'&&m.resultType!=='bye')))throw new Error('已有開場或賽果，不能重新分組。');
    const next=clone(base),orders={};
    next.matches=draw.matches.map(source=>{const m=clone(source),stage=`r${m.roundSize}`,order=orders[stage]||0;orders[stage]=order+1;return {...m,phase:'group',stage,stageLabel:m.label,order,participantIds:m.slots.map(s=>s.teamId||null),sourceMatchIds:m.slots.filter(s=>s.matchId).map(s=>s.matchId),status:'pending',winnerId:null,loserId:null,reason:'',replays:0,resultType:'',auditLog:[],plannedBye:false};});
    const createdAt=options.createdAt||new Date().toISOString();
    next.venuePlan={version:2,drawId:options.drawId||`nine-groups-${createdAt}`,groups:clone(draw.groups),venueSchedules:clone(draw.venueSchedules),mainDraw:{status:'pending',positions:[]}};
    next.draw={method:METHOD,createdAt,teamCount:72,bracketSize:72,groupCount:9,groupSize:8,qualificationCount:0,byeTeamIds:[],roundByeSourceMatchIds:[],byeRoundCount:0,operatorName:options.operatorName||'賽務'};
    Object.assign(next,{activeMatchIds:[],lives:{},activeMatchId:null,live:null,championId:null,runnerUpId:null,thirdPlaceId:null});return next;
  }
  function finalists(state){return (state.venuePlan?.groups||[]).map(g=>({groupId:g.id,venue:g.venue,teamId:state.matches.find(m=>m.id===g.winnerMatchId&&m.status==='completed')?.winnerId||null}));}
  function groupsComplete(state){return isVenueState(state)&&finalists(state).every(x=>x.teamId)&&finalists(state).length===(isNewState(state)?9:8);}
  function mainReady(state){return groupsComplete(state)&&(!isNewState(state)||state.venuePlan.mainDraw?.status==='drawn');}
  function buildMainMatches(positions){
    const out=[],add=(id,label,stage,roundIndex,roundSize,order,slots)=>{const m={id,code:id,label,stageLabel:label,groupId:null,venue:'MAIN',phase:stage==='r9'?'qualification':'main',stage,roundIndex,roundSize,order,slots,participantIds:slots.map(s=>s.teamId||null),sourceMatchIds:slots.filter(s=>s.matchId).map(s=>s.matchId),status:'pending',winnerId:null,loserId:null,reason:'',replays:0,resultType:'',auditLog:[],plannedBye:false,nextMatchId:null,nextSlot:null};out.push(m);return m;};
    add('MAIN-Q','主舞台九進八','r9',3,9,0,positions.slice(0,2).map(teamId=>({teamId})));
    for(let i=0;i<4;i++)add(`MAIN-QF-${i+1}`,`全國八強第 ${i+1} 場`,'quarter',4,8,i,i===0?[{matchId:'MAIN-Q',outcome:'winner'},{teamId:positions[2]}]:positions.slice(i*2+1,i*2+3).map(teamId=>({teamId})));
    for(let i=0;i<2;i++)add(`MAIN-SF-${i+1}`,`準決賽第 ${i+1} 場`,'semi',5,4,i,[0,1].map(j=>({matchId:`MAIN-QF-${i*2+j+1}`,outcome:'winner'})));
    add('MAIN-BRONZE','季軍賽','bronze',6,3,0,[1,2].map(i=>({matchId:`MAIN-SF-${i}`,outcome:'loser'})));
    add('MAIN-FINAL','冠軍賽','final',7,2,0,[1,2].map(i=>({matchId:`MAIN-SF-${i}`,outcome:'winner'})));
    const map=new Map(out.map(m=>[m.id,m]));out.forEach((m,index)=>{m.venueOrder=index+1;m.callCode=`M-${String(index+1).padStart(2,'0')}`;m.slots.forEach((s,i)=>{if(s.matchId){const src=map.get(s.matchId);if(s.outcome==='loser'){src.loserNextMatchId=m.id;src.loserNextSlot=i;}else{src.nextMatchId=m.id;src.nextSlot=i;}}});});return out;
  }
  // Used only in isolated rehearsal. Production uses the authenticated server operation.
  function withMainDraw(state,positions,options={}){
    if(!isNewState(state)||!groupsComplete(state))throw new Error('請先完成九個分組。');
    const ids=finalists(state).map(x=>x.teamId);
    if(positions.length!==9||new Set(positions).size!==9||positions.some(id=>!ids.includes(id)))throw new Error('九個籤位須各填一位組冠軍，不可重複。');
    if(state.venuePlan.mainDraw?.status==='drawn'){
      if(JSON.stringify(positions)===JSON.stringify(state.venuePlan.mainDraw.positions))return clone(state);
      throw new Error('主舞台已抽籤公布，不能重抽。');
    }
    if(state.activeMatchIds?.length||state.matches.some(m=>m.venue==='MAIN'))throw new Error('目前狀態不允許主舞台抽籤。');
    const next=clone(state),main=buildMainMatches(positions);next.matches.push(...main);next.venuePlan.venueSchedules.MAIN=main.map(m=>m.id);
    next.venuePlan.mainDraw={status:'drawn',positions:[...positions],drawnAt:options.drawnAt||new Date().toISOString(),operatorName:options.operatorName||'賽務',method:options.method||'onsite-lots'};return next;
  }
  function blockReason(state,id){
    if(!isVenueState(state))return '';
    const m=state.matches.find(m=>m.id===id);if(!m)return '找不到場次。';
    if(m.status==='completed')return '本場已完成。';
    if(m.participantIds.filter(Boolean).length!==2)return '請等待前場晉級名單。';
    if(m.venue==='MAIN'&&!mainReady(state))return isNewState(state)?'請先完成九組比賽，並公布主舞台抽籤結果。':'八組全部完成後，才開始主舞台。';
    const active=(state.activeMatchIds||[]).map(id=>state.matches.find(x=>x.id===id)).filter(x=>x&&x.id!==m.id&&x.status!=='completed');
    if(active.some(x=>x.venue===m.venue))return `${m.venue==='MAIN'?'主舞台':`場地 ${m.venue}`}已有開啟場次，請先完成判定。`;
    if(m.venue==='MAIN'&&active.length)return '請先完成所有分場，再開始主舞台。';return '';
  }
  function toView(state,options={}){
    if(!isVenueState(state))return null;
    const gs=clone(state.venuePlan.groups);
    if(isNewState(state)&&state.venuePlan.mainDraw?.status==='drawn')for(const g of gs){const id=state.matches.find(m=>m.id===g.winnerMatchId)?.winnerId;g.winnerMainMatchId=state.matches.find(m=>m.venue==='MAIN'&&m.slots.some(s=>s.teamId===id))?.id||null;}
    return {metadata:{preview:false,format:state.draw.method,title:`2026 全國廢材機器人大賽・${state.tournament?.title||'正式賽事'}`,revision:state.revision,updatedAt:state.updatedAt,createdAt:state.draw.createdAt,drawId:state.venuePlan.drawId},teams:clone(state.entries),groups:gs,mainDraw:clone(state.venuePlan.mainDraw||{status:'pending',positions:[]}),venueSchedules:clone(state.venuePlan.venueSchedules),matches:state.matches.map(m=>({...clone(m),productionStage:m.stage,stage:m.phase||(m.venue==='MAIN'?'main':m.roundIndex===0?'qualification':'group'),liveStatus:state.lives?.[m.id]?.status||null,canStart:!blockReason(state,m.id)&&(!options.judgeId||m.venue===options.judgeId||m.venue==='MAIN'&&options.judgeId==='A'),blockReason:blockReason(state,m.id)}))};
  }
  root.JunkbotVenuePlan={METHOD,LEGACY_METHOD,isVenueState,isNewState,validate,generate,fromDraw,finalists,groupsComplete,mainReady,buildMainMatches,withMainDraw,blockReason,toView,shuffle};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.JunkbotVenuePlan;
})(typeof window!=='undefined'?window:globalThis);
