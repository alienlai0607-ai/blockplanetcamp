/* Eight groups of nine, fixed venues through the national quarterfinals. */
'use strict';
(function (root) {
  const METHOD = 'eight-groups-nine-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const isVenueState = state => state?.draw?.method === METHOD && state?.venuePlan?.version === 1;
  function validate(draw, entries) {
    if (entries.length !== 72 || draw.teams.length !== 72 || draw.groups.length !== 8 || draw.matches.length !== 72) throw new Error('三場地賽制須為 72 隊、8 組、72 場。');
    const ids = new Set(entries.map(t => t.id));
    if (ids.size !== 72 || new Set(draw.teams.map(t => t.id)).size !== 72 || draw.teams.some(t => !ids.has(t.id))) throw new Error('分組名單與正式名單不一致。');
    const assigned = draw.groups.flatMap(g => g.teamIds);
    if (assigned.length !== 72 || new Set(assigned).size !== 72 || assigned.some(id => !ids.has(id))) throw new Error('分組包含重複或缺少的隊伍。');
    const matches = new Map(draw.matches.map(m => [m.id, m]));
    if (matches.size !== 72) throw new Error('場次編號重複。');
    for (const g of draw.groups) {
      if (g.teamIds.length !== 9 || g.qualifierTeamIds.length !== 2 || g.matchIds.length !== 8 || !['A','B','C'].includes(g.venue)) throw new Error('分組格式不正確。');
      if (g.matchIds.some(id => !matches.has(id) || matches.get(id).groupId !== g.id)) throw new Error('分組場次不一致。');
    }
    for (const m of draw.matches) {
      if (m.slots.length !== 2 || m.slots.some(s => s.teamId ? !ids.has(s.teamId) : !matches.has(s.matchId))) throw new Error('對戰來源不完整。');
      if (m.nextMatchId && (!matches.has(m.nextMatchId) || ![0,1].includes(m.nextSlot))) throw new Error('晉級路線不完整。');
    }
  }
  function fromDraw(draw, base, options = {}) {
    validate(draw, base.entries);
    if (!options.replace && base.matches?.length) throw new Error('已有賽程，不能覆寫。');
    if (base.activeMatchIds?.length || base.matches?.some(m => m.status === 'completed' && m.resultType !== 'bye')) throw new Error('已有開啟場次或正式賽果，不能覆寫。');
    const next = clone(base), roundOrders = {};
    next.matches = draw.matches.map(source => {
      const m = clone(source);
      const main = m.venue === 'MAIN';
      let stage = main ? m.id === 'MAIN-BRONZE' ? 'bronze' : m.id === 'MAIN-FINAL' ? 'final' : m.roundSize === 8 ? 'quarter' : 'semi' : `r${m.roundSize}`;
      const order = roundOrders[stage] || 0; roundOrders[stage] = order + 1;
      return { ...m, phase: m.stage, stage, stageLabel: m.label, order,
        participantIds: m.slots.map(s => s.teamId || null),
        sourceMatchIds: m.slots.filter(s => s.matchId).map(s => s.matchId),
        status:'pending', winnerId:null, loserId:null, reason:'', replays:0, resultType:'',
        auditLog:[], plannedBye:false };
    });
    const createdAt = options.createdAt || new Date().toISOString();
    next.venuePlan = { version:1, drawId:options.drawId || `venues-${createdAt}`, groups:clone(draw.groups), venueSchedules:clone(draw.venueSchedules) };
    next.draw = { method:METHOD, createdAt, teamCount:72, bracketSize:64, qualificationCount:8,
      byeTeamIds:draw.groups.flatMap(g => g.teamIds.filter(id => !g.qualifierTeamIds.includes(id))),
      roundByeSourceMatchIds:[], byeRoundCount:1, operatorName:options.operatorName || '賽務' };
    Object.assign(next, {activeMatchIds:[],lives:{},activeMatchId:null,live:null,championId:null,runnerUpId:null,thirdPlaceId:null});
    return next;
  }
  function generate(entries, random = Math.random) {
    const shuffled = values => {
      const out = [...values];
      for (let i=out.length-1;i>0;i--) {const j=Math.floor(random()*(i+1)); [out[i],out[j]]=[out[j],out[i]];}
      return out;
    };
    if (entries.length !== 72) throw new Error('目前三場地賽制需要 72 隊。');
    const pool = shuffled(entries.map(t=>t.id));
    const groups = [], matches = [], venueSchedules = {A:[],B:[],C:[],MAIN:[]};
    const add = (id, groupId, venue, roundIndex, roundSize, slots, stage, label) => {
      const m={id,code:id,label,groupId,venue,roundIndex,roundSize,slots,stage,status:'pending',nextMatchId:null,nextSlot:null}; matches.push(m); return m;
    };
    for (const [index,id] of ['A1','A2','A3','B1','B2','B3','C1','C2'].entries()) {
      const teamIds=pool.slice(index*9,index*9+9), venue=id[0], qualifierTeamIds=teamIds.slice(0,2), local=[];
      const q=add(`${id}-Q`,id,venue,0,72,qualifierTeamIds.map(teamId=>({teamId})),'qualification',`${id} 組資格賽`); local.push(q);
      let slots=shuffled([{matchId:q.id,outcome:'winner'},...teamIds.slice(2).map(teamId=>({teamId}))]);
      let previous=[];
      for (let round=1;round<=3;round++) {
        const count=4/(2**(round-1)), current=[];
        for (let order=0;order<count;order++) {
          const pair=round===1 ? slots.slice(order*2,order*2+2) : previous.slice(order*2,order*2+2).map(m=>({matchId:m.id,outcome:'winner'}));
          const m=add(`${id}-R${round}-${order+1}`,id,venue,round,[72,64,32,16][round],pair,'group',round===3?`${id} 組晉級決定賽`:`${id} 組${[0,8,4][round]} 強第 ${order+1} 場`);
          m.groupRoundSize=round===1?8:round===2?4:2;
          current.push(m);local.push(m);
        }
        previous=current;
      }
      groups.push({id,venue,label:`${id} 組`,teamIds,qualifierTeamIds,matchIds:local.map(m=>m.id),winnerMatchId:previous[0].id,winnerMainMatchId:null});
    }
    for (const [i,pair] of [['A1','B1'],['A2','C1'],['A3','B2'],['B3','C2']].entries()) {
      const m=add(`MAIN-QF-${i+1}`,null,'MAIN',4,8,pair.map(id=>({matchId:groups.find(g=>g.id===id).winnerMatchId,outcome:'winner'})),'main',`全國八強第 ${i+1} 場`);
      pair.forEach(id=>{groups.find(g=>g.id===id).winnerMainMatchId=m.id;});
    }
    for(let i=0;i<2;i++) add(`MAIN-SF-${i+1}`,null,'MAIN',5,4,[0,1].map(j=>({matchId:`MAIN-QF-${i*2+j+1}`,outcome:'winner'})),'main',`準決賽第 ${i+1} 場`);
    add('MAIN-BRONZE',null,'MAIN',6,3,[1,2].map(i=>({matchId:`MAIN-SF-${i}`,outcome:'loser'})),'main','季軍賽');
    add('MAIN-FINAL',null,'MAIN',7,2,[1,2].map(i=>({matchId:`MAIN-SF-${i}`,outcome:'winner'})),'main','冠軍賽');
    const byId=new Map(matches.map(m=>[m.id,m]));
    matches.forEach(m=>m.slots.forEach((s,i)=>{if(s.matchId){let source=byId.get(s.matchId);if(s.outcome==='loser'){source.loserNextMatchId=m.id;source.loserNextSlot=i;}else{source.nextMatchId=m.id;source.nextSlot=i;}}}));
    for (const venue of ['A','B','C','MAIN']) {
      const schedule=matches.filter(m=>m.venue===venue).sort((a,b)=>a.roundIndex-b.roundIndex || Number(a.id.split('-').at(-1)||0)-Number(b.id.split('-').at(-1)||0) || String(a.groupId).localeCompare(String(b.groupId)));
      schedule.forEach((m,i)=>{m.venueOrder=i+1;m.callCode=`${venue==='MAIN'?'M':venue}-${String(i+1).padStart(2,'0')}`;});
      venueSchedules[venue]=schedule.map(m=>m.id);
    }
    const draw={metadata:{preview:false},teams:clone(entries),groups,matches,venueSchedules};validate(draw,entries);return draw;
  }
  function mainReady(state) {
    return isVenueState(state) && state.venuePlan.groups.every(g=>state.matches.find(m=>m.id===g.winnerMatchId)?.status==='completed');
  }
  function blockReason(state, matchId) {
    if (!isVenueState(state)) return '';
    const m=state.matches.find(m=>m.id===matchId);if(!m)return '找不到場次。';
    if(m.status==='completed')return '本場已完成。';
    if((m.participantIds||[]).filter(Boolean).length!==2)return '請等待前場晉級名單。';
    if(m.venue==='MAIN'&&!mainReady(state))return '八個分組全部完成後，才開始主舞台八強。';
    const active=(state.activeMatchIds||[]).map(id=>state.matches.find(x=>x.id===id)).filter(x=>x&&x.status!=='completed'&&x.id!==m.id);
    if(active.some(x=>x.venue===m.venue))return `${m.venue==='MAIN'?'主舞台':`場地 ${m.venue}`}已有開啟場次，請先完成判定。`;
    if(m.venue==='MAIN'&&active.length)return '請先完成分場賽事，再開始主舞台。';
    return '';
  }
  function toView(state, options={}) {
    if(!isVenueState(state))return null;
    return {metadata:{preview:false,title:`2026 全國廢材機器人大賽・${state.tournament?.title||'正式賽事'}`,revision:state.revision,updatedAt:state.updatedAt,createdAt:state.draw.createdAt,drawId:state.venuePlan.drawId},
      teams:clone(state.entries),groups:clone(state.venuePlan.groups),venueSchedules:clone(state.venuePlan.venueSchedules),
      matches:state.matches.map(m=>({...clone(m),productionStage:m.stage,stage:m.phase|| (m.venue==='MAIN'?'main':m.roundIndex===0?'qualification':'group'),
        liveStatus:state.lives?.[m.id]?.status||null, canStart:!blockReason(state,m.id)&&(!options.judgeId||m.venue===options.judgeId||m.venue==='MAIN'&&options.judgeId==='A'),
        blockReason:blockReason(state,m.id)}))};
  }
  root.JunkbotVenuePlan={METHOD,isVenueState,validate,generate,fromDraw,toView,mainReady,blockReason};
  if(typeof module!=='undefined'&&module.exports)module.exports=root.JunkbotVenuePlan;
})(typeof window!=='undefined'?window:globalThis);
