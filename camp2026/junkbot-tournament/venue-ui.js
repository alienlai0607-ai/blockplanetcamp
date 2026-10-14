'use strict';

(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state = { data:null, options:{}, venue:'A', groups:{A:'A1',B:'B1',C:'C1'}, view:'full', query:'', selectedTeam:null, expanded:new Set(), expandedGroups:new Set(), roleKey:null, composing:false };
  let teams = new Map(), matches = new Map(), groups = new Map();
  const bindings = new WeakMap();
  const venueName = (venue) => venue === 'MAIN' ? '主舞台' : `場地 ${venue}`;
  const code = (match) => match?.callCode || match?.code || '';
  const label = (team) => team ? `${team.teamNumber} 號 ${team.teamName}` : '待確認';
  const numberTag = (team) => `<span class="number-tag">${esc(team?.teamNumber)} 號</span>`;
  const completed = (match) => Boolean(match && match.status === 'completed');
  const nineGroups = () => state.data?.groups.length === 9 && state.data.groups.every((group) => group.teamIds.length === 8);
  const groupIsEight = (group) => group?.teamIds.length === 8;
  const venueStats = (venue) => {
    const assigned = state.data.groups.filter((group) => group.venue === venue);
    return { assigned, count:assigned.reduce((count,group) => count + group.teamIds.length,0), queue:state.data.matches.filter((match) => match.venue === venue) };
  };
  const mainDrawPending = () => nineGroups() && state.data.mainDraw?.status !== 'drawn';
  const mainChampionsReady = () => state.data.groups.every((group) => { const match = matches.get(group.winnerMatchId); return completed(match) && teams.has(match.winnerId); });
  const canDrawMain = () => Boolean(state.options.control && !state.options.judgeId && mainDrawPending() && mainChampionsReady());
  const roundName = (match) => {
    if (!match) return '';
    if (match.id === 'MAIN-BRONZE') return '季軍賽';
    if (match.id === 'MAIN-FINAL') return '冠軍賽';
    if (match.venue === 'MAIN') return match.id === 'MAIN-Q' ? '主舞台九進八' : match.id.includes('-QF-') ? '全國八強' : '全國四強';
    const group = groups.get(match.groupId);
    if (groupIsEight(group)) return ({8:'組內八強',4:'組內四強',2:'組內決賽'})[match.groupRoundSize] || ({0:'組內八強',1:'組內四強',2:'組內決賽'})[match.roundIndex] || match.label;
    return ({0:'資格賽',1:'組內八強',2:'組內四強',3:'組內決賽'})[match.roundIndex] || match.label;
  };
  const groupForTeam = (id) => state.data.groups.find((group) => group.teamIds.includes(id));
  const firstMatch = (id) => state.data.matches.find((match) => match.slots.some((slot) => slot?.teamId === id));
  const canOperate = (venue) => Boolean(state.options.control && (!['A','B','C'].includes(state.options.judgeId) || state.options.judgeId === venue || (venue === 'MAIN' && state.options.judgeId === 'A')));

  function resolvedId(slot, match, index) {
    if (match?.participantIds?.[index]) return match.participantIds[index];
    if (slot?.teamId) return slot.teamId;
    const source = matches.get(slot?.matchId);
    if (!source || !completed(source)) return null;
    if (slot.outcome === 'loser') return source.loserId || source.participantIds?.find((id) => id && id !== source.winnerId) || null;
    return source.winnerId || null;
  }

  function slotLabel(slot, match = null, index = 0, detailed = false) {
    const id = resolvedId(slot, match, index);
    if (id && teams.has(id)) return label(teams.get(id));
    const source = matches.get(slot?.matchId);
    if (!source) return '等待前場結果';
    const outcome = slot.outcome === 'loser' ? '負隊' : '勝隊';
    if (source.groupId && groups.get(source.groupId)?.winnerMatchId === source.id) return `${source.groupId} 組${outcome}`;
    if (detailed && source.stage === 'qualification') return `${code(source)} ${outcome}（${source.slots.map((item) => `${teams.get(item.teamId)?.teamNumber} 號`).join('／')}）`;
    return `${code(source)} ${outcome}`;
  }

  function teamPath(id) {
    const path = [], visited = new Set();
    let match = firstMatch(id);
    while (match && !visited.has(match.id)) {
      path.push(match); visited.add(match.id);
      let next = matches.get(match.nextMatchId);
      if (!next && nineGroups() && match.groupId && groups.get(match.groupId)?.winnerMatchId === match.id && !mainDrawPending()) {
        next = state.data.matches.find((item) => item.venue === 'MAIN' && item.slots.some((slot) => slot?.matchId === match.id || (completed(match) && match.winnerId === id && slot?.teamId === id)));
      }
      match = next;
    }
    return path;
  }

  function statusLabel(match) {
    if (completed(match)) return '已完成';
    if (match.liveStatus === 'countdown') return '開場倒數';
    if (match.liveStatus === 'awaiting-decision') return '待評審判定';
    if (match.liveStatus === 'ready') return '賽場準備中';
    if (['running','paused','live'].includes(match.status) || ['running','paused'].includes(match.liveStatus)) return '比賽進行中';
    return match.slots.every((slot,index) => resolvedId(slot,match,index)) ? '待出賽' : '等待晉級';
  }

  function matchCard(match, classes = '', row = null) {
    if (!match) return '';
    const highlighted = state.selectedTeam && teamPath(state.selectedTeam).some((item) => item.id === match.id);
    const accessible = `${code(match)} ${roundName(match)}：${match.slots.map((slot,index) => slotLabel(slot,match,index)).join(' 對 ')}，${statusLabel(match)}`;
    const operable = canOperate(match.venue) && match.canStart === true;
    return `<article class="match-card ${classes}${row ? ` row-${row}` : ''}${highlighted ? ' is-highlighted' : ''}${completed(match) ? ' is-completed' : ''}" data-match-id="${esc(match.id)}" aria-label="${esc(accessible)}"><div class="match-meta">${operable ? `<button type="button" class="match-open" data-open-match="${esc(match.id)}" aria-label="開啟 ${esc(code(match))} 場次">${esc(code(match))} ↗</button>` : `<b>${esc(code(match))}</b>`}<span>${statusLabel(match)}</span></div>${match.slots.map((slot,index) => {
      const id = resolvedId(slot,match,index), team = teams.get(id), winner = id && completed(match) && id === match.winnerId;
      return team ? `<div class="match-team${winner ? ' is-winner' : ''}" title="${esc(label(team))}">${numberTag(team)}<strong>${esc(team.teamName)}</strong>${winner ? '<span class="winner-mark" aria-label="勝隊">勝</span>' : ''}</div>` : `<div class="match-team slot-pending"><span class="slot-dot" aria-hidden="true"></span><strong>${esc(slotLabel(slot,match,index))}</strong></div>`;
    }).join('')}</article>`;
  }

  function printButton(venue, text) {
    return canOperate(venue) ? `<button type="button" class="venue-print" data-print="${venue}"><span aria-hidden="true">▤</span> ${esc(text || `列印${venueName(venue)}`)}</button>` : '';
  }

  function overview() {
    return `<div class="venue-overview">${['A','B','C'].map((venue) => {
      const { assigned,count,queue } = venueStats(venue), done = queue.filter(completed).length;
      const destination = nineGroups() ? '席主舞台' : '席八強';
      return `<div class="venue-overview-card"><button type="button" data-venue="${venue}" aria-label="查看${venueName(venue)}，${count} 隊，${assigned.length} ${destination}"><span class="overview-top"><span class="venue-letter">${venue}</span><strong>${venueName(venue)}</strong><small>${assigned.length} 個分組</small></span><span class="overview-values"><strong>${count}</strong> 隊<span class="arrow" aria-hidden="true">→</span><span class="overview-seats"><strong class="seat-number">${assigned.length}</strong> ${destination}</span></span><span class="overview-note">${assigned.map((group) => esc(group.id)).join(' · ')}｜完成 ${done} / ${queue.length} 場</span></button>${printButton(venue)}</div>`;
    }).join('')}</div>`;
  }

  function viewSwitch() {
    return `<div class="view-switch" role="group" aria-label="切換賽程顯示"><button type="button" data-view="current" aria-pressed="${state.view === 'current'}">本輪對戰</button><button type="button" data-view="full" aria-pressed="${state.view === 'full'}">完整晉級圖</button></div>`;
  }

  function renderGroupBracket(group, options = {}) {
    const all = group.matchIds.map((id) => matches.get(id)).filter(Boolean);
    const qualifier = all.find((match) => match.roundIndex === 0);
    const qualificationRow = 1 + 2 * all.filter((match) => match.roundIndex === 1).findIndex((match) => match.id === qualifier?.nextMatchId);
    const notePosition = qualificationRow >= 5 ? 'note-top' : qualificationRow === 3 ? 'note-bottom' : '';
    const eight = groupIsEight(group);
    const configs = eight ? [
      {round:0,title:'組內八強',sub:'8 → 4',rows:[1,3,5,7]},
      {round:1,title:'組內四強',sub:'4 → 2',rows:[2,6]},
      {round:2,title:'組內決賽',sub:'2 → 1',rows:[4]}
    ] : [
      {round:0,title:'資格賽',sub:'9 → 8',rows:[Math.max(1,qualificationRow)]},
      {round:1,title:'組內八強',sub:'8 → 4',rows:[1,3,5,7]},
      {round:2,title:'組內四強',sub:'4 → 2',rows:[2,6]},
      {round:3,title:'組內決賽',sub:'2 → 1',rows:[4]}
    ];
    let hiddenCount = 0;
    for (const config of configs.slice(0,-1)) {
      const roundMatches = all.filter((match) => match.roundIndex === config.round);
      if (roundMatches.length && roundMatches.every(completed)) hiddenCount++; else break;
    }
    const expanded = Boolean(options.showCompleted) || state.expanded.has(group.id);
    const visible = configs.slice(expanded ? 0 : hiddenCount);
    const history = hiddenCount && !options.showCompleted ? `<div class="completed-rounds"><span>${configs.slice(0,hiddenCount).map((round) => round.title).join('、')}已完成</span><button type="button" data-toggle-history="${esc(group.id)}" aria-expanded="${expanded}">${expanded ? '收起已完成輪次' : `展開已完成 ${hiddenCount} 輪`}</button></div>` : '';
    const columns = visible.map((config,columnIndex) => {
      const roundMatches = all.filter((match) => match.roundIndex === config.round);
      const cards = roundMatches.map((match,index) => {
        const effectiveRound = config.round + (eight ? 1 : 0);
        const input = effectiveRound >= 2 && columnIndex > 0 ? ' connector-input' : '';
        const classes = effectiveRound === 0 ? 'connector-next' : effectiveRound < 3 ? `${index % 2 ? 'connector-pair-bottom' : 'connector-pair-top'} connector-next${input}${effectiveRound === 2 ? ' link-large' : ''}` : input;
        return matchCard(match, classes, config.rows[index]);
      }).join('');
      const direct = !eight && config.round === 0 ? `<div class="round-note ${notePosition}"><strong>其餘 7 隊直接進入組內八強</strong>資格賽勝隊加入右側淘汰賽。<div class="note-team-tags">${group.teamIds.filter((id) => !(group.qualifierTeamIds || []).includes(id)).map((id) => teams.get(id)).sort((a,b) => a.teamNumber-b.teamNumber).map((team) => `<span>${esc(team.teamNumber)} 號</span>`).join('')}</div></div>` : '';
      return `<section class="bracket-round"><div class="round-title"><strong>${config.title}</strong><span>${config.sub}</span></div><div class="round-body">${cards}${direct}</div></section>`;
    }).join('');
    return `${history}<div class="bracket-scroll" data-bracket-group="${esc(group.id)}" tabindex="0" role="region" aria-label="${esc(group.id)} 組晉級圖，可橫向捲動"><div class="bracket-track columns-${visible.length}">${columns}</div></div>${visible.length > 1 ? '<p class="bracket-hint">← 左右滑動晉級圖，查看後續輪次 →</p>' : ''}`;
  }

  function renderCurrentGroup(group) {
    const all = group.matchIds.map((id) => matches.get(id)).filter(Boolean);
    const pending = all.filter((match) => !completed(match));
    if (!pending.length) {
      const winner = teams.get(matches.get(group.winnerMatchId)?.winnerId);
      return `<div class="group-finished"><strong>${esc(group.id)} 組已完成</strong><p>${winner ? `${esc(label(winner))} 晉級主舞台。` : '請查看已完成的賽果。'}</p>${matchCard(matches.get(group.winnerMatchId))}</div>`;
    }
    const round = Math.min(...pending.map((match) => match.roundIndex));
    const current = all.filter((match) => match.roundIndex === round);
    return `<div class="current-section"><h4 class="round-list-label">${esc(roundName(current[0]))}<span>已完成 ${current.filter(completed).length} / ${current.length} 場</span></h4><div class="round-list">${current.map((match) => matchCard(match)).join('')}</div></div><p class="round-list-note">本輪全部完成後，這裡會自動顯示下一輪。完整對戰路線可切換「完整晉級圖」。</p>`;
  }

  function renderRoster(group) {
    const assigned = group.teamIds.map((id) => teams.get(id)).filter(Boolean).sort((a,b) => a.teamNumber-b.teamNumber);
    return `<details class="roster-details" open><summary>${esc(group.id)} 組參賽名單 · ${assigned.length} 隊</summary><div class="roster-grid">${assigned.map((team) => `<button type="button" class="roster-row" data-team="${esc(team.id)}" aria-label="查看 ${esc(label(team))} 的對戰">${numberTag(team)}<span class="team-label"><strong>${esc(team.teamName)}</strong><small>${esc(team.playerName || '')}</small></span>${(group.qualifierTeamIds || []).includes(team.id) ? '<span class="qual-marker">資格賽</span>' : ''}</button>`).join('')}</div></details>`;
  }

  function renderQueue(venue) {
    const queue = (state.data.venueSchedules?.[venue] || state.data.matches.filter((match) => match.venue === venue).sort((a,b) => a.venueOrder-b.venueOrder).map((match) => match.id)).map((id) => matches.get(id)).filter(Boolean);
    return `<details class="schedule-details"><summary>查看 ${venueName(venue)} 完整叫號順序 · ${queue.length} 場</summary><p>${venue === 'MAIN' ? (nineGroups() ? '九組冠軍到齊後，現場抽籤決定位置。九進八、八強、四強、季軍與決賽依序進行，保留選手休息時間。' : '八強到齊後集中比賽。四強、季軍與決賽之間保留休息時間，由現場賽務確認。') : '同一輪依組別交錯出賽。依場次順序叫號，實際開賽由賽務確認；保留選手整備時間。'}</p><div class="schedule-list">${queue.map((match,index) => `<div class="schedule-row${completed(match) ? ' is-completed' : ''}"><span class="queue-num">${String(index+1).padStart(2,'0')}</span><strong>${esc(code(match))}</strong><span>${esc(`${match.groupId ? `${match.groupId} · ` : ''}${roundName(match)}`)}</span><span class="queue-status">${statusLabel(match)}</span></div>`).join('')}</div></details>`;
  }

  function renderMainPending() {
    const ready = state.data.groups.filter((group) => { const match = matches.get(group.winnerMatchId); return completed(match) && teams.has(match.winnerId); }).length;
    return `<div class="venue-intro"><div><h3>主舞台 · 九組冠軍</h3><p>A、B、C 場各 3 位組冠軍，全部前往主舞台。</p></div><span class="venue-chip">已產生 ${ready} / 9 隊</span>${printButton('MAIN')}</div><section class="main-draw-panel" aria-labelledby="main-draw-title"><div class="main-draw-heading"><span class="draw-status">等待現場抽籤</span><h3 id="main-draw-title">先產生九組冠軍，再抽主舞台晉級位置</h3><p>每組 8 隊，連勝 3 場晉級。九組全部完成後，由總賽務在主舞台進行抽籤。</p></div><div class="main-champions">${state.data.groups.map((group) => {
      const winnerMatch = matches.get(group.winnerMatchId), winner = completed(winnerMatch) ? teams.get(winnerMatch.winnerId) : null;
      return `<article class="main-champion${winner ? ' is-ready' : ''}"><span class="champion-group">${esc(group.id)} 組冠軍</span>${winner ? `<strong>${esc(label(winner))}</strong><small>${esc(winner.playerName || '')}</small><span class="champion-state">已晉級</span>` : `<strong>尚未產生</strong><small>等待 ${esc(code(winnerMatch))} 組內決賽</small><span class="champion-state">分組進行中</span>`}</article>`;
    }).join('')}</div><div class="draw-rules"><h4>九支籤位，公開決定晉級路線</h4><ol><li><strong>1、2 籤位：</strong>先比九進八，勝隊進入八強。</li><li><strong>3–9 籤位：</strong>主舞台首輪輪空，直接進入八強。</li><li><strong>八強 → 四強 → 冠軍：</strong>四強負隊另比季軍賽。</li></ol><p>九位組冠軍都參與同一次抽籤，分場成績不預先指定籤位。每人抽到各籤位的機會相同。</p></div>${state.options.control && !state.options.judgeId ? `<div class="main-draw-action"><button type="button" data-main-draw ${canDrawMain() ? '' : 'disabled'}>${canDrawMain() ? '九組已到齊 · 進行主舞台抽籤' : `等待九組完成（${ready} / 9）`}</button><p>僅總賽務可操作。抽籤完成後，才會建立九進八至冠軍賽的正式對戰表。</p></div>` : '<p class="draw-wait-note">抽籤完成後，這裡會顯示正式晉級圖與每隊籤位。</p>'}</section>`;
  }

  function renderMain() {
    if (mainDrawPending()) return renderMainPending();
    const qualification = matches.get('MAIN-Q');
    const qf = state.data.matches.filter((match) => match.id.startsWith('MAIN-QF-'));
    const sf = state.data.matches.filter((match) => match.id.startsWith('MAIN-SF-'));
    const final = matches.get('MAIN-FINAL'), bronze = matches.get('MAIN-BRONZE');
    const qualificationRow = 1 + 2 * qf.findIndex((match) => match.id === qualification?.nextMatchId);
    const rounds = [
      ...(qualification ? [{key:'qualification',title:'主舞台九進八',sub:'9 → 8',items:[qualification],rows:[Math.max(1,qualificationRow)]}] : []),
      {key:'quarter',title:'全國八強',sub:'8 → 4',items:qf,rows:[1,3,5,7]},
      {key:'semi',title:'全國四強',sub:'4 → 2',items:sf,rows:[2,6]},
      {key:'final',title:'冠軍賽',sub:'2 → 1',items:[final].filter(Boolean),rows:[4]}
    ];
    let hiddenCount = 0;
    for (const round of rounds.slice(0,-1)) { if (round.items.length && round.items.every(completed)) hiddenCount++; else break; }
    const expanded = state.expanded.has('MAIN');
    const visible = rounds.slice(expanded ? 0 : hiddenCount);
    const history = hiddenCount ? `<div class="completed-rounds"><span>${rounds.slice(0,hiddenCount).map((round) => round.title).join('、')}已完成</span><button type="button" data-toggle-history="MAIN" aria-expanded="${expanded}">${expanded ? '收起已完成輪次' : `展開已完成 ${hiddenCount} 輪`}</button></div>` : '';
    const full = `${history}<div class="bracket-scroll" tabindex="0" role="region" aria-label="主舞台完整晉級圖，可橫向捲動"><div class="bracket-track stage-bracket columns-${visible.length}">${visible.map((round,columnIndex) => `<section class="bracket-round"><div class="round-title"><strong>${round.title}</strong><span>${round.sub}</span></div><div class="round-body">${round.items.map((match,index) => {
      const input = columnIndex > 0 && ['semi','final'].includes(round.key) ? ' connector-input' : '';
      const classes = round.key === 'qualification' ? 'connector-next' : round.key === 'final' ? input : `${index % 2 ? 'connector-pair-bottom' : 'connector-pair-top'} connector-next${input}${round.key === 'semi' ? ' link-large' : ''}`;
      return matchCard(match, classes, round.rows[index]);
    }).join('')}${round.key === 'qualification' ? '<div class="round-note"><strong>3–9 籤位首輪輪空</strong>九進八勝隊加入右側八強賽。</div>' : ''}</div></section>`).join('')}</div></div>${visible.length > 1 ? '<p class="bracket-hint">← 左右滑動，查看後續晉級路線 →</p>' : ''}<div class="bronze-card"><h4>季軍賽 · 兩場四強負隊對決</h4>${matchCard(bronze)}</div>`;
    const list = [...(qualification ? [qualification] : []),...qf,...sf,bronze,final].filter(Boolean);
    const pendingRound = rounds.find((round) => round.items.some((match) => !completed(match)));
    const currentRounds = pendingRound ? (pendingRound.key === 'final' ? [{title:'季軍賽與冠軍賽',items:[bronze,final].filter(Boolean)}] : [pendingRound]) : [{title:'季軍賽與冠軍賽',items:[bronze,final].filter(Boolean)}];
    const current = `<p class="round-list-note">主舞台共 ${list.length} 場，依現場叫號出賽。本輪完成後自動顯示下一輪。</p>${currentRounds.map((round) => `<div class="current-section"><h4 class="round-list-label">${round.title}<span>已完成 ${round.items.filter(completed).length} / ${round.items.length} 場</span></h4><div class="round-list">${round.items.map((match) => matchCard(match)).join('')}</div></div>`).join('')}`;
    const newFormat = nineGroups();
    const drawPositions = newFormat && Array.isArray(state.data.mainDraw?.positions) ? `<details class="draw-positions" open><summary>主舞台現場抽籤結果 · 9 個籤位</summary><div>${state.data.mainDraw.positions.map((id,index) => { const team = teams.get(id), group = groupForTeam(id); return `<article><span class="lot-number">${index+1} 號籤</span><strong>${esc(label(team))}</strong><small>${esc(group?.id || '')} 組冠軍 · ${index < 2 ? '先比九進八' : '首輪輪空'}</small></article>`; }).join('')}</div></details>` : '';
    return `<div class="venue-intro"><div><h3>主舞台 · ${newFormat ? '九組冠軍' : '全國八強'}</h3><p>${newFormat ? '九位組冠軍已抽籤定位；1、2 籤位先比九進八，3–9 籤位首輪輪空。' : 'A 場 3 隊、B 場 3 隊、C 場 2 隊，在這裡爭取冠軍。'}</p></div><span class="venue-chip">完成 ${list.filter(completed).length} / ${list.length} 場</span>${printButton('MAIN')}</div>${drawPositions}<div class="group-panel"><div class="group-heading"><div><h3>${newFormat ? '主舞台晉級圖' : '八強之路'}</h3><p>${newFormat ? '九進八 1 場 ＋ 八強至冠軍 7 場 ＋ 季軍賽 1 場' : '7 場冠軍路線 ＋ 1 場季軍賽'} · 三位評審集中</p></div>${viewSwitch()}</div>${state.view === 'full' ? full : current}</div>${renderQueue('MAIN')}`;
  }

  function mainMatchForGroup(group) {
    const assigned = matches.get(group.winnerMainMatchId);
    if (assigned) return assigned;
    const final = matches.get(group.winnerMatchId);
    return state.data.matches.find((match) => match.venue === 'MAIN' && match.slots.some((slot) => slot?.matchId === group.winnerMatchId || (completed(final) && slot?.teamId === final.winnerId)));
  }

  function mainOpponentForGroup(group, match) {
    const final = matches.get(group.winnerMatchId);
    const selfIndex = match?.slots.findIndex((slot) => slot?.matchId === group.winnerMatchId || (completed(final) && slot?.teamId === final.winnerId)) ?? -1;
    const index = selfIndex === 0 ? 1 : 0;
    return {slot:match?.slots[index],index};
  }

  function groupAdvanceText(group) {
    const mainMatch = mainMatchForGroup(group), opponent = mainOpponentForGroup(group,mainMatch);
    return mainMatch ? `前往主舞台 ${esc(code(mainMatch))}，對上 <strong>${esc(slotLabel(opponent.slot,mainMatch,opponent.index))}</strong>` : '前往主舞台；九組冠軍到齊後，現場抽籤決定位置與對手。';
  }

  function renderVenueGroupOverview(group) {
    const all = group.matchIds.map(id => matches.get(id)).filter(Boolean);
    const done = all.filter(completed).length, finished = done === all.length && all.length > 0;
    const expanded = state.expandedGroups.has(group.id);
    const final = matches.get(group.winnerMatchId), winner = finished ? teams.get(final?.winnerId) : null;
    const active = all.find(match => !completed(match) && ['ready','countdown','running','paused','awaiting-decision'].includes(match.liveStatus));
    const next = active || all.filter(match => !completed(match) && match.slots.every((slot,index) => resolvedId(slot,match,index))).sort((a,b) => a.venueOrder-b.venueOrder)[0];
    const phase = finished ? '組冠軍已產生' : active ? `${statusLabel(active)} · ${code(active)}` : next ? `下一場 ${code(next)}` : '等待前場結果';
    const champion = winner ? `<strong>${esc(label(winner))}</strong>` : `<strong>${esc(group.id)} 組冠軍</strong>`;
    return `<section class="venue-overview-group${finished ? ' is-finished' : ''}" data-overview-group="${esc(group.id)}" aria-labelledby="overview-group-${esc(group.id)}"><header class="overview-group-header"><div class="overview-group-title"><h4 id="overview-group-${esc(group.id)}">${esc(group.id)} 組</h4><span>已完成 <b>${done} / ${all.length}</b> 場</span><span class="overview-group-phase${active ? ' is-live' : ''}">${esc(phase)}</span></div><div class="overview-group-actions">${finished ? `<button type="button" data-toggle-group="${esc(group.id)}" aria-expanded="${expanded}" aria-controls="overview-board-${esc(group.id)}">${expanded ? '收起已完成對戰' : `展開全部 ${all.length} 場`}</button>` : ''}<button type="button" data-group="${esc(group.id)}">單看 ${esc(group.id)} 組 →</button></div></header><div class="overview-group-board" id="overview-board-${esc(group.id)}" ${finished && !expanded ? 'hidden' : ''}>${finished && !expanded ? '' : state.view === 'full' || finished ? renderGroupBracket(group,{showCompleted:finished && expanded}) : renderCurrentGroup(group)}</div><div class="overview-group-advance"><span class="overview-champion-label">${winner ? '晉級' : '冠軍出口'}</span><span>${champion} · ${groupAdvanceText(group)}</span></div></section>`;
  }

  function renderVenue() {
    if (state.venue === 'MAIN') return renderMain();
    const {assigned,count,queue} = venueStats(state.venue);
    const selected = state.groups[state.venue], showOverview = nineGroups() && selected === 'ALL';
    const group = groups.get(selected) || assigned[0];
    if (!group) return '<p class="loading">此場地尚未排入分組。</p>';
    const eight = groupIsEight(group);
    const tabs = `<div class="group-tabs" role="tablist" aria-label="${venueName(state.venue)} 分組">${nineGroups() ? `<button type="button" class="group-tab" role="tab" data-group="ALL" aria-selected="${showOverview}" aria-controls="venue-group-panel" id="venue-group-tab-ALL" tabindex="${showOverview ? 0 : -1}">場地全覽<small>三組一起看</small></button>` : ''}${assigned.map((item) => `<button type="button" class="group-tab" role="tab" data-group="${esc(item.id)}" aria-selected="${!showOverview && item.id === group.id}" aria-controls="venue-group-panel" id="venue-group-tab-${esc(item.id)}" tabindex="${!showOverview && item.id === group.id ? 0 : -1}">${esc(item.id)} 組<small>${item.teamIds.length} 隊取 1</small></button>`).join('')}</div>`;
    const heading = showOverview ? `<div class="group-heading"><div><h3>${venueName(state.venue)} · 三組即時晉級圖</h3><p>${assigned.map(item => esc(item.id)).join('、')} 各 8 隊取 1 · 判定後同步更新 · 已完成組別自動收折</p></div>${viewSwitch()}</div>` : `<div class="group-heading"><div><h3>${esc(group.id)} 組 · 晉級路線</h3><p>${eight ? '8 隊公平起跑 · 無輪空 · 連勝 3 場上主舞台' : '原隊號保留 · 資格賽 1 場 ＋ 組內淘汰 7 場'}</p></div>${viewSwitch()}</div>`;
    const content = showOverview ? `<div class="venue-group-overview">${assigned.map(renderVenueGroupOverview).join('')}</div>` : `${state.view === 'full' ? renderGroupBracket(group) : renderCurrentGroup(group)}<div class="advance-note"><span aria-hidden="true">↗</span><span><strong>${esc(group.id)} 組勝隊</strong> ${groupAdvanceText(group)}</span></div>${renderRoster(group)}`;
    return `<div class="venue-intro"><div><h3>${venueName(state.venue)} · 評審 ${state.venue}</h3><p>分組賽固定在此場地。${assigned.length} 個分組各取 1 隊，共 ${assigned.length} 隊前往主舞台。</p></div><span class="venue-chip">${count} 隊 / ${queue.length} 場</span>${printButton(state.venue)}</div>${tabs}<div class="group-panel${showOverview ? ' is-venue-overview' : ''}" id="venue-group-panel" role="tabpanel" aria-labelledby="venue-group-tab-${showOverview ? 'ALL' : esc(group.id)}">${heading}${content}</div>${renderQueue(state.venue)}`;
  }

  function teamDetail(id) {
    const team = teams.get(id), group = groupForTeam(id), first = firstMatch(id);
    if (!team || !group || !first) return '';
    const opponentIndex = first.slots.findIndex((slot) => slot.teamId !== id);
    const qualifier = (group.qualifierTeamIds || []).includes(id), path = teamPath(id), main = mainMatchForGroup(group), mainOpponent = mainOpponentForGroup(group,main);
    const played = state.data.matches.filter((match) => completed(match) && match.slots.some((slot,index) => resolvedId(slot,match,index) === id));
    const lost = played.find((match) => match.winnerId !== id && match.winnerId);
    const liveSummary = lost ? `已完成 ${code(lost)} ${roundName(lost)}。` : played.length ? `已贏得 ${played.length} 場，請依叫號繼續出賽。` : '請依場次叫號出賽。';
    const eight = groupIsEight(group);
    const routeNote = eight ? '每隊從組內八強起賽；連勝 3 場成為組冠軍、前往主舞台。' : qualifier ? '從資格賽起連贏 4 場，可進全國八強。' : '資格賽輪空，直接進組內八強；贏 3 場可上主舞台。';
    const mainTitle = main ? `主舞台 ${code(main)} · ${roundName(main)}` : '主舞台待現場抽籤';
    const mainDescription = main ? `對手：${slotLabel(mainOpponent.slot,main,mainOpponent.index)}` : '九組冠軍全部產生後，公開抽籤決定晉級位置與對手。';
    return `<article class="team-detail"><div class="team-detail-head">${numberTag(team)}<div><h3>${esc(team.teamName)}</h3><p>選手 ${esc(team.playerName || '尚未提供')} · 原隊號 ${esc(team.teamNumber)}</p></div><button type="button" class="detail-close" data-clear-search aria-label="清除搜尋">×</button></div><div class="team-detail-grid"><div class="detail-unit"><span class="label">比賽場地</span><strong>場地 ${esc(group.venue)} · ${esc(group.id)} 組</strong><p>分組賽全程固定場地</p></div><div class="detail-unit"><span class="label">第一場 · ${esc(code(first))} ${esc(roundName(first))}</span><strong>對手：${esc(slotLabel(first.slots[opponentIndex],first,opponentIndex,true))}</strong><p>${routeNote}</p></div><div class="detail-unit"><span class="label">取得組內冠軍後</span><strong>${esc(mainTitle)}</strong><p>${esc(mainDescription)}</p></div></div><p class="detail-progress">${esc(liveSummary)}</p><p class="detail-route"><strong>若一路獲勝</strong> ${path.map((match) => `${esc(code(match))} ${esc(roundName(match))}`).join('<span aria-hidden="true">→</span>')}${eight && mainDrawPending() ? '<span aria-hidden="true">→</span>主舞台待現場抽籤' : ''}</p><button type="button" class="detail-action" data-show-team="${esc(id)}">查看 ${esc(group.id)} 組晉級圖 <span aria-hidden="true">↓</span></button></article>`;
  }

  function searchResults() {
    const query = state.query.trim();
    if (!query) { state.selectedTeam = null; return ''; }
    const number = query.match(/^#?\s*(\d+)\s*(?:號)?$/);
    const found = state.data.teams.filter((team) => number ? Number(team.teamNumber) === Number(number[1]) : `${team.teamName} ${team.playerName || ''}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())).sort((a,b) => a.teamNumber-b.teamNumber);
    state.selectedTeam = found.length === 1 ? found[0].id : null;
    if (found.length === 1) return teamDetail(found[0].id);
    return found.length ? `<div class="search-result-list">${found.map((team) => { const group = groupForTeam(team.id); return `<button type="button" class="search-result-button" data-team="${esc(team.id)}">${numberTag(team)}<span class="team-name">${esc(team.teamName)}</span><span class="small-meta">${esc(team.playerName || '')}</span><span class="result-loc">場地 ${esc(group?.venue)} · ${esc(group?.id)} →</span></button>`; }).join('')}</div>` : `<p class="search-empty">${number ? `沒有 ${esc(Number(number[1]))} 號隊伍。隊號保留原編號，缺號不遞補。` : '找不到符合的隊伍，請改用原隊號、部分隊名或選手姓名。'}</p>`;
  }

  function render(data, options = {}) {
    if (!data || !Array.isArray(data.groups) || !Array.isArray(data.teams) || !Array.isArray(data.matches)) return '<div class="venue-tournament"><p class="loading">場地賽程尚未建立。</p></div>';
    state.data = data; state.options = options;
    teams = new Map(data.teams.map((team) => [team.id,team])); matches = new Map(data.matches.map((match) => [match.id,match])); groups = new Map(data.groups.map((group) => [group.id,group]));
    const roleKey = `${Boolean(options.control)}:${options.judgeId || ''}:${nineGroups() ? 'nine' : 'legacy'}`;
    if (state.roleKey !== roleKey) {
      state.roleKey = roleKey;
      if (['A','B','C'].includes(options.judgeId)) state.venue = options.judgeId;
      else state.venue = 'A';
      state.groups = nineGroups() && !options.judgeId ? {A:'ALL',B:'ALL',C:'ALL'} : {A:'A1',B:'B1',C:'C1'};
    }
    const results = searchResults();
    return `<section class="venue-tournament" aria-label="三場地相撲機器人賽程"><div class="section-title"><div><p class="eyebrow">SUMO TOURNAMENT</p><h2>三場地對戰賽程</h2></div>${options.control && !['A','B','C'].includes(options.judgeId) ? '<button type="button" class="venue-print" data-print="ALL">▤ 賽務列印・全部場地</button>' : '<span class="static-label">分組賽固定場地<br>組冠軍前往主舞台</span>'}</div>${overview()}<section class="team-search-section" aria-labelledby="venue-search-title"><div class="search-heading"><h3 id="venue-search-title">查詢隊伍與對手</h3><span>保留原隊號，缺號不遞補</span></div><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input type="search" id="venue-team-search" data-team-search value="${esc(state.query)}" aria-label="輸入隊號、隊名或選手姓名" placeholder="輸入隊號、隊名或選手姓名" autocomplete="off"></label><div class="search-results" aria-live="polite">${results}</div></section><section class="competition"><div class="venue-tabs" role="tablist" aria-label="選擇比賽場地">${['A','B','C','MAIN'].map((venue) => `<button type="button" role="tab" class="venue-tab" data-venue="${venue}" id="venue-tab-${venue}" aria-selected="${state.venue === venue}" aria-controls="venue-content" tabindex="${state.venue === venue ? 0 : -1}">${venueName(venue)}<small>${venue === 'MAIN' ? (nineGroups() ? '九組冠軍 · 現場抽籤' : '八強起集中比賽') : `${venueStats(venue).count} 隊 · ${venueStats(venue).assigned.length} ${nineGroups() ? '席主舞台' : '席八強'}`}</small></button>`).join('')}</div><div id="venue-content" class="venue-content" role="tabpanel" aria-labelledby="venue-tab-${state.venue}">${renderVenue()}</div></section></section>`;
  }

  function refresh(container, focusSelector = null) {
    if (!container?.isConnected) return;
    const input = container.querySelector('[data-team-search]');
    const focused = document.activeElement === input;
    const selection = focused ? input.selectionStart : null;
    const scrollPositions = [...container.querySelectorAll('.bracket-scroll')].map(area => [area.dataset.bracketGroup || 'MAIN',area.scrollLeft]);
    const next = document.createElement('div'); next.innerHTML = render(state.data,state.options);
    const replacement = next.firstElementChild; container.replaceWith(replacement);
    for (const area of replacement.querySelectorAll('.bracket-scroll')) area.scrollLeft = scrollPositions.find(([id]) => id === (area.dataset.bracketGroup || 'MAIN'))?.[1] || 0;
    if (focusSelector) replacement.querySelector(focusSelector)?.focus({preventScroll:true});
    else if (focused) { const fresh = replacement.querySelector('[data-team-search]'); fresh.focus({preventScroll:true}); try { fresh.setSelectionRange(selection,selection); } catch (_) {} }
    return replacement;
  }

  function bind(root, callbacks = {}) {
    if (!root?.addEventListener) return;
    const previous = bindings.get(root);
    if (previous) { previous.callbacks = callbacks; return; }
    const entry = { callbacks }; bindings.set(root,entry);
    root.addEventListener('click', (event) => {
      const button = event.target.closest('button'), container = button?.closest('.venue-tournament');
      if (!button || !container || !root.contains(container) || !state.data) return;
      let changed = true, focus = null, scrollTo = null;
      if (button.dataset.print) { const scope = button.dataset.print; if (scope === 'ALL' ? state.options.control && !['A','B','C'].includes(state.options.judgeId) : canOperate(scope)) entry.callbacks.onPrint?.(scope); changed = false; }
      else if (button.hasAttribute('data-main-draw')) { if (canDrawMain() && !button.disabled) entry.callbacks.onMainDraw?.(); changed = false; }
      else if (button.dataset.openMatch) { const match = matches.get(button.dataset.openMatch); if (match && canOperate(match.venue) && match.canStart === true) entry.callbacks.onOpenMatch?.(match.id); changed = false; }
      else if (button.dataset.venue) { state.venue = button.dataset.venue; focus = `.venue-tab[data-venue="${state.venue}"]`; }
      else if (button.dataset.group) { state.groups[state.venue] = button.dataset.group; focus = `.group-tab[data-group="${button.dataset.group}"]`; }
      else if (button.dataset.view) { state.view = button.dataset.view; focus = `[data-view="${state.view}"]`; }
      else if (button.dataset.toggleGroup) { const group = button.dataset.toggleGroup; if (state.expandedGroups.has(group)) state.expandedGroups.delete(group); else state.expandedGroups.add(group); focus = `[data-toggle-group="${group}"]`; }
      else if (button.dataset.toggleHistory) { const group = button.dataset.toggleHistory; if (state.expanded.has(group)) state.expanded.delete(group); else state.expanded.add(group); focus = `[data-toggle-history="${group}"]`; }
      else if (button.hasAttribute('data-clear-search')) { state.query = ''; state.selectedTeam = null; focus = '[data-team-search]'; }
      else if (button.dataset.team) { const team = teams.get(button.dataset.team); if (team) { state.query = String(team.teamNumber); state.selectedTeam = team.id; entry.callbacks.onTeam?.(team.id); scrollTo = '#venue-search-title'; } }
      else if (button.dataset.showTeam) { const group = groupForTeam(button.dataset.showTeam); if (group) { state.venue = group.venue; state.groups[group.venue] = group.id; state.view = 'full'; scrollTo = '#venue-group-panel'; } }
      else changed = false;
      if (changed) { const replacement = refresh(container,focus); if (scrollTo) replacement?.querySelector(scrollTo)?.scrollIntoView({behavior:'smooth',block:'start'}); }
    });
    root.addEventListener('compositionstart', (event) => { if (event.target.matches('[data-team-search]')) state.composing = true; });
    root.addEventListener('compositionend', (event) => { if (!event.target.matches('[data-team-search]')) return; state.composing = false; state.query = event.target.value; refresh(event.target.closest('.venue-tournament')); });
    root.addEventListener('input', (event) => { if (!event.target.matches('[data-team-search]')) return; const container = event.target.closest('.venue-tournament'); if (container && state.data) { state.query = event.target.value; if (!event.isComposing && !state.composing) refresh(container); } });
    root.addEventListener('keydown', (event) => {
      if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
      const current = event.target.closest('.venue-tournament [role="tab"]'); if (!current) return;
      const buttons = [...current.parentElement.querySelectorAll('[role="tab"]')], index = buttons.indexOf(current);
      const target = event.key === 'Home' ? buttons[0] : event.key === 'End' ? buttons.at(-1) : buttons[(index+(event.key === 'ArrowRight' ? 1 : -1)+buttons.length)%buttons.length];
      if (target) { event.preventDefault(); target.click(); }
    });
  }

  window.JunkbotVenueUI = Object.freeze({ render, bind });
})();
