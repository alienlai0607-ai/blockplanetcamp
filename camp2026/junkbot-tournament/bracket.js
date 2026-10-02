/* Tournament bracket: current round and complete advancement route. */
'use strict';
const originalBracketView = bracketView;
const originalBracketDraw = drawBracketConnections;
let bracketV2Mode = 'round';
let bracketV2Round = null;

function flowRoundLabel(round) {
  if (round.stage === 'final') return '冠亞軍賽';
  if (round.stage === 'bronze') return '季軍賽';
  return round.roundSize ? `${round.roundSize} 強賽` : round.label;
}
function flowCode(item) {
  if (!item) return '下一輪';
  if (item.stage === 'bronze') return '季軍戰';
  if (item.stage === 'final') return '冠軍戰';
  const size = Number(item.roundSize) || ({ r16: 16, quarter: 8, semi: 4 })[item.stage] || Number(/^r(\d+)$/.exec(item.stage || '')?.[1]);
  const label = size ? `${size}強` : item.roundIndex != null && Number.isFinite(Number(item.roundIndex)) ? `第${Number(item.roundIndex) + 1}輪` : '場次';
  return `${label} ${String((Number(item.order) || 0) + 1).padStart(2, '0')}`;
}
function flowStatus(item) {
  const live = matchLive(item.id);
  if (item.status === 'completed') return item.resultType === 'bye' ? ['bye', '輪空晉級'] : ['done', '已完成'];
  if (activeMatchIds().includes(item.id)) {
    if (live?.status === 'running' || live?.status === 'countdown') return ['live', '比賽中'];
    if (live?.status === 'awaiting-decision') return ['judge', '待判定'];
    return ['ready', '準備中'];
  }
  if (item.sourceMatchIds?.length === 1) return ['bye', '預排輪空'];
  return item.participantIds.filter(Boolean).length === 2 ? ['ready', '待出賽'] : ['wait', '等待前場'];
}
function flowCard(item, control, compact = false) {
  const [statusClass, status] = flowStatus(item);
  const bye = item.resultType === 'bye' || item.sourceMatchIds?.length === 1;
  const slots = bye ? [item.participantIds.find(Boolean) || null] : item.participantIds;
  const playable = item.status !== 'completed' && item.participantIds.filter(Boolean).length === 2;
  const route = item.nextMatchId ? `勝隊 → ${flowCode(match(item.nextMatchId))}` : item.stage === 'bronze' ? '勝隊獲得季軍' : item.stage === 'final' ? '勝隊獲得冠軍' : '勝隊晉級下一輪';
  const rows = slots.map((id, slot) => {
    const source = (item.sourceMatchIds || [])[slot];
    const sourceMatch = source ? match(source) : null;
    const fallback = sourceMatch ? `${flowCode(sourceMatch)} ${item.stage === 'bronze' ? '敗隊' : '勝隊'}` : '等待對手';
    const winner = id && item.winnerId === id;
    return `<button class="flow-team ${winner ? 'winner' : ''} ${id ? '' : 'unresolved'}" ${id ? `data-watch-team="${esc(id)}"` : 'disabled'}>
      <span class="flow-side">${slot === 0 ? 'A' : 'B'}</span><span class="flow-team-copy"><b>${esc(teamName(id, fallback))}</b>${!compact && id ? `<small>選手｜${esc(entry(id)?.playerName || '')}</small>` : ''}</span>${winner ? '<span class="flow-win">勝</span>' : ''}</button>`;
  }).join('');
  return `<article class="flow-match ${statusClass} ${compact ? 'compact' : ''}" data-flow-match="${esc(item.id)}">
    <header><b>${esc(flowCode(item))}</b><span class="flow-status ${statusClass}">${statusClass === 'live' ? '<i></i>' : ''}${status}</span></header>
    <div class="flow-competitors">${rows}${bye ? '<div class="flow-bye-note">本輪免出賽，直接晉級</div>' : ''}</div>
    <footer><span>${esc(route)}</span>${control && playable && !compact ? `<button data-start-match="${esc(item.id)}">${activeMatchIds().includes(item.id) ? '進入賽場' : '準備賽場'}<span aria-hidden="true"> ↗</span></button>` : ''}</footer>
  </article>`;
}
function flowOrderedRounds(rounds) {
  const rank = new Map(); let cursor = 0;
  const visit = (item) => {
    if (!item || rank.has(item.id)) return;
    (item.sourceMatchIds || []).forEach(id => visit(match(id)));
    rank.set(item.id, cursor++);
  };
  visit(rounds.at(-1)?.matches[0]);
  return rounds.map(round => ({ ...round, matches: [...round.matches].sort((a,b) => (rank.get(a.id) ?? a.order) - (rank.get(b.id) ?? b.order)) }));
}
function flowToolbar() {
  return `<div class="flow-switch" role="group" aria-label="賽程呈現方式">
    <button data-flow-mode="round" aria-pressed="${bracketV2Mode === 'round'}">本輪對戰</button>
    <button data-flow-mode="map" aria-pressed="${bracketV2Mode === 'map'}">完整晉級圖</button>
  </div>`;
}
bracketView = function(control) {
  if (!state.matches.length) return originalBracketView(control);
  const rounds = flowOrderedRounds(mainRoundGroups());
  const bronze = stageMatches('bronze')[0];
  const allRounds = [...rounds, ...(bronze ? [{ stage: 'bronze', label: '季軍賽', matches: [bronze] }] : [])];
  const current = allRounds.find(round => round.matches.some(item => activeMatchIds().includes(item.id)))
    || allRounds.find(round => round.matches.some(item => item.status !== 'completed')) || rounds.at(-1);
  const selected = allRounds.find(round => round.stage === bracketV2Round) || current;
  const played = state.matches.filter(item => item.resultType !== 'bye' && item.sourceMatchIds?.length !== 1);
  const complete = played.filter(item => item.status === 'completed').length;
  const activeCount = activeMatches().length;
  const hasPlayed = complete > 0;
  return `<section class="flow-bracket">
    <div class="flow-heading"><div><span class="kicker">ROAD TO THE CHAMPIONSHIP · ${esc(CAMPUS[campus].short)}</span><h1>晉級之路</h1><p>${esc(currentTournamentTitle())}<span>／</span>${state.entries.length} 支隊伍<span>／</span>已完成 ${complete} / ${played.length} 場${activeCount ? `<span>／</span><b>${activeCount} 場準備或進行中</b>` : ''}</p></div>${flowToolbar()}</div>
    <nav class="flow-rounds" aria-label="選擇比賽輪次">${allRounds.map((round,index) => {
      const total = round.matches.filter(item=>item.resultType !== 'bye' && item.sourceMatchIds?.length !== 1).length;
      const done = round.matches.filter(item=>item.status==='completed' && item.resultType !== 'bye' && item.sourceMatchIds?.length !== 1).length;
      const live = round.matches.some(item=>activeMatchIds().includes(item.id));
      return `<button data-flow-round="${esc(round.stage)}" aria-pressed="${selected.stage===round.stage}" class="${round.stage === 'bronze' ? 'bronze' : ''}"><span class="flow-step">${round.stage === 'bronze' ? '季' : String(index+1).padStart(2,'0')}</span><span><b>${esc(flowRoundLabel(round))}</b><small>${live ? '賽場已開啟' : done===total && total ? '全部完成' : `${done} / ${total} 場完成`}</small></span>${selected.stage===round.stage ? '<i>目前查看</i>' : ''}</button>`;
    }).join('')}</nav>
    ${bracketV2Mode === 'round' ? `
      <section class="flow-focus"><header><div><h2>${esc(flowRoundLabel(selected))}</h2><p>${selected.stage === 'bronze' ? '四強落敗的兩隊爭奪季軍。' : selected.stage === 'final' ? '最後一場對決，決定冠軍與亞軍。' : '核對場號、隊伍與選手；每張卡下方標示晉級去向。'}</p></div><span class="flow-key"><i></i> 比賽中 <b>勝</b> 已晉級</span></header>
      <div class="flow-focus-grid">${[...selected.matches].sort((a,b)=>a.order-b.order).map(item=>flowCard(item,control)).join('')}</div></section>` : `
      <div class="flow-map-caption"><span>由左向右晉級 → 冠軍</span><p>連線依實際對戰配對；點上方輪次可放大查看該輪。</p></div>
      <div class="flow-scroll" tabindex="0" role="region" aria-label="完整晉級圖，可在圖內左右捲動">
        <div class="flow-board" style="--flow-round-count:${rounds.length}">
          <svg class="flow-lines" aria-hidden="true"></svg>
          ${rounds.map(round=>`<section class="flow-column"><h3>${esc(flowRoundLabel(round))}</h3><div class="flow-nodes">${round.matches.map(item=>flowCard(item,control,true)).join('')}</div></section>`).join('')}
        </div>
      </div>
      ${bronze ? `<section class="flow-bronze"><div><span>獨立支線</span><h3>季軍爭奪戰</h3><p>四強落敗的兩隊在此對決。</p></div>${flowCard(bronze,control)}</section>` : ''}`}
    ${state.championId ? `<div class="flow-champion"><span>🏆 本屆冠軍</span><strong>${esc(teamName(state.championId))}</strong><small>${esc(entry(state.championId)?.playerName || '')}</small></div>` : ''}
    <details class="flow-draw"><summary>查看抽籤與賽程設定<span>開賽前一次抽定，路線已鎖定</span></summary><div><p>所有對戰及輪空位置均於建立賽程時排定。輪空不會新增虛構對手；比賽結果以現場評審確認為準。</p><p>${esc(bronzeRule())}</p><p>抽籤時間：${esc(resultTime(state.draw?.createdAt))}${state.draw?.operatorName ? ` · 登錄：${esc(state.draw.operatorName)}` : ''}</p>${control ? `<button class="outline" data-action="redraw-bracket" ${hasPlayed || activeCount ? 'disabled' : ''}>重新抽籤</button><button class="outline" data-action="reset-bracket" ${hasPlayed || activeCount ? 'disabled' : ''}>重設賽程</button>` : ''}</div></details>
  </section>`;
};

function drawFlowConnections() {
  document.querySelectorAll('.flow-board').forEach(board => {
    if (!board.getClientRects().length) return;
    const columns = [...board.querySelectorAll('.flow-column')];
    const cards = [...board.querySelectorAll('[data-flow-match]')];
    const byId = new Map(cards.map(card => [card.dataset.flowMatch, card]));
    const positions = new Map();
    const maxHeight = Math.max(90,...cards.map(card=>card.getBoundingClientRect().height));
    const pitch = maxHeight + 24;
    let height = 0;
    columns.forEach((column,index) => {
      let bottom = 0;
      [...column.querySelectorAll('[data-flow-match]')].forEach((card,order) => {
        const item = match(card.dataset.flowMatch);
        const sourceCenters = (item.sourceMatchIds || []).map(id=>positions.get(id)).filter(value=>Number.isFinite(value));
        const center = sourceCenters.length ? sourceCenters.reduce((sum,value)=>sum+value,0)/sourceCenters.length : order*pitch+maxHeight/2;
        const cardHeight = card.getBoundingClientRect().height;
        const top = Math.max(0, center-cardHeight/2, bottom);
        card.style.top = `${top}px`;
        positions.set(item.id,top+cardHeight/2);
        bottom = top+cardHeight+24;
        height = Math.max(height,bottom);
      });
    });
    columns.forEach(column=>{column.querySelector('.flow-nodes').style.height=`${Math.max(150,height)}px`;});
    const boardRect=board.getBoundingClientRect();
    const lines=[];
    state.matches.filter(item=>item.stage!=='bronze'&&item.nextMatchId).forEach(item=>{
      const source=byId.get(item.id),target=byId.get(item.nextMatchId);if(!source||!target)return;
      const s=source.getBoundingClientRect(),t=target.getBoundingClientRect();
      const x1=s.right-boardRect.left,y1=s.top+s.height/2-boardRect.top,x2=t.left-boardRect.left,y2=t.top+t.height/2-boardRect.top,middle=(x1+x2)/2;
      lines.push(`<path class="${item.status==='completed'?'advanced':''}" d="M${x1},${y1} H${middle} V${y2} H${x2}"/>`);
    });
    const svg=board.querySelector('.flow-lines');svg.setAttribute('viewBox',`0 0 ${boardRect.width} ${boardRect.height}`);svg.innerHTML=lines.join('');
  });
}
drawBracketConnections = function() { originalBracketDraw(); drawFlowConnections(); };
scheduleBracketConnections = function() {
  drawBracketConnections();
  requestAnimationFrame(drawBracketConnections);
};
window.addEventListener('resize', scheduleBracketConnections);
document.addEventListener('visibilitychange', () => { if (!document.hidden) scheduleBracketConnections(); });
document.addEventListener('click', event => {
  const mode=event.target.closest('[data-flow-mode]'),round=event.target.closest('[data-flow-round]');
  if(!mode&&!round)return;
  if(mode && ['round', 'map'].includes(mode.dataset.flowMode))bracketV2Mode=mode.dataset.flowMode;
  if(round){bracketV2Round=round.dataset.flowRound;bracketV2Mode='round';}
  if(role==='control')renderControl();else renderAudience();
});

if(DEMO && new URLSearchParams(location.search).get('preview')==='bracket') {
  (async()=>{
    role='control';await enterApp(EVENT_SCOPE);
    if(!state.entries.length && !state.matches.length){
      const names=['紙箱霸王','螺絲衝鋒隊','瓶蓋飛行家','環保小勇士','齒輪探險家','無敵回收號','星球守護隊','彈跳火箭','鐵罐騎士','創意工程師','旋風陀螺','紙杯小英雄','綠能戰士','太空漫遊者','閃電小隊','夢想實驗室'];
      state.entries=names.map((teamName,i)=>({id:`preview-${i+1}`,teamName,playerName:`演練選手 ${String(i+1).padStart(2,'0')}`,videoUrl:''}));
      createBracket();await syncQueue;
    }
    controlView='bracket';renderControl();
  })().catch(error=>showToast(error.message,true));
}
