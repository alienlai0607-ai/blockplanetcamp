'use strict';

(() => {
  const esc = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const state = { data:null, options:{}, venue:'A', groups:{A:'A1',B:'B1',C:'C1'}, view:'full', query:'', selectedTeam:null, expanded:new Set(), roleKey:null, composing:false };
  let teams = new Map(), matches = new Map(), groups = new Map();
  const bindings = new WeakMap();
  const venueName = (venue) => venue === 'MAIN' ? '主舞台' : `場地 ${venue}`;
  const code = (match) => match?.callCode || match?.code || '';
  const label = (team) => team ? `${team.teamNumber} 號 ${team.teamName}` : '待確認';
  const numberTag = (team) => `<span class="number-tag">${esc(team?.teamNumber)} 號</span>`;
  const completed = (match) => Boolean(match && match.status === 'completed');
  const roundName = (match) => {
    if (!match) return '';
    if (match.id === 'MAIN-BRONZE') return '季軍賽';
    if (match.id === 'MAIN-FINAL') return '冠軍賽';
    if (match.venue === 'MAIN') return match.id.includes('-QF-') ? '全國八強' : '全國四強';
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
      path.push(match); visited.add(match.id); match = matches.get(match.nextMatchId);
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
      const assigned = state.data.groups.filter((group) => group.venue === venue);
      const queue = state.data.matches.filter((match) => match.venue === venue), done = queue.filter(completed).length;
      return `<div class="venue-overview-card"><button type="button" data-venue="${venue}" aria-label="查看${venueName(venue)}，${assigned.length * 9} 隊，${assigned.length} 席八強"><span class="overview-top"><span class="venue-letter">${venue}</span><strong>${venueName(venue)}</strong><small>${assigned.length} 個分組</small></span><span class="overview-values"><strong>${assigned.length * 9}</strong> 隊<span class="arrow" aria-hidden="true">→</span><span class="overview-seats"><strong class="seat-number">${assigned.length}</strong> 席八強</span></span><span class="overview-note">${assigned.map((group) => group.id).join(' · ')}｜完成 ${done} / ${queue.length} 場</span></button>${printButton(venue)}</div>`;
    }).join('')}</div>`;
  }

  function viewSwitch() {
    return `<div class="view-switch" role="group" aria-label="切換賽程顯示"><button type="button" data-view="current" aria-pressed="${state.view === 'current'}">本輪對戰</button><button type="button" data-view="full" aria-pressed="${state.view === 'full'}">完整晉級圖</button></div>`;
  }

  function renderGroupBracket(group) {
    const all = group.matchIds.map((id) => matches.get(id)).filter(Boolean);
    const qualifier = all.find((match) => match.roundIndex === 0);
    const qualificationRow = 1 + 2 * all.filter((match) => match.roundIndex === 1).findIndex((match) => match.id === qualifier?.nextMatchId);
    const notePosition = qualificationRow >= 5 ? 'note-top' : qualificationRow === 3 ? 'note-bottom' : '';
    const configs = [
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
    const expanded = state.expanded.has(group.id);
    const visible = configs.slice(expanded ? 0 : hiddenCount);
    const history = hiddenCount ? `<div class="completed-rounds"><span>${configs.slice(0,hiddenCount).map((round) => round.title).join('、')}已完成</span><button type="button" data-toggle-history="${esc(group.id)}" aria-expanded="${expanded}">${expanded ? '收起已完成輪次' : `展開已完成 ${hiddenCount} 輪`}</button></div>` : '';
    const columns = visible.map((config,columnIndex) => {
      const roundMatches = all.filter((match) => match.roundIndex === config.round);
      const cards = roundMatches.map((match,index) => {
        const input = config.round >= 2 && columnIndex > 0 ? ' connector-input' : '';
        const classes = config.round === 0 ? 'connector-next' : config.round < 3 ? `${index % 2 ? 'connector-pair-bottom' : 'connector-pair-top'} connector-next${input}${config.round === 2 ? ' link-large' : ''}` : input;
        return matchCard(match, classes, config.rows[index]);
      }).join('');
      const direct = config.round === 0 ? `<div class="round-note ${notePosition}"><strong>其餘 7 隊直接進入組內八強</strong>資格賽勝隊加入右側淘汰賽。<div class="note-team-tags">${group.teamIds.filter((id) => !group.qualifierTeamIds.includes(id)).map((id) => teams.get(id)).sort((a,b) => a.teamNumber-b.teamNumber).map((team) => `<span>${esc(team.teamNumber)} 號</span>`).join('')}</div></div>` : '';
      return `<section class="bracket-round"><div class="round-title"><strong>${config.title}</strong><span>${config.sub}</span></div><div class="round-body">${cards}${direct}</div></section>`;
    }).join('');
    return `${history}<div class="bracket-scroll" tabindex="0" role="region" aria-label="${esc(group.id)} 組晉級圖，可橫向捲動"><div class="bracket-track columns-${visible.length}">${columns}</div></div>${visible.length > 1 ? '<p class="bracket-hint">← 左右滑動晉級圖，查看後續輪次 →</p>' : ''}`;
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
    return `<details class="roster-details" open><summary>${esc(group.id)} 組參賽名單 · ${assigned.length} 隊</summary><div class="roster-grid">${assigned.map((team) => `<button type="button" class="roster-row" data-team="${esc(team.id)}" aria-label="查看 ${esc(label(team))} 的對戰">${numberTag(team)}<span class="team-label"><strong>${esc(team.teamName)}</strong><small>${esc(team.playerName || '')}</small></span>${group.qualifierTeamIds.includes(team.id) ? '<span class="qual-marker">資格賽</span>' : ''}</button>`).join('')}</div></details>`;
  }

  function renderQueue(venue) {
    const queue = (state.data.venueSchedules?.[venue] || state.data.matches.filter((match) => match.venue === venue).sort((a,b) => a.venueOrder-b.venueOrder).map((match) => match.id)).map((id) => matches.get(id)).filter(Boolean);
    return `<details class="schedule-details"><summary>查看 ${venueName(venue)} 完整叫號順序 · ${queue.length} 場</summary><p>${venue === 'MAIN' ? '八強到齊後集中比賽。四強、季軍與決賽之間保留休息時間，由現場賽務確認。' : '同一輪依組別交錯出賽。依場次順序叫號，實際開賽由賽務確認；保留選手整備時間。'}</p><div class="schedule-list">${queue.map((match,index) => `<div class="schedule-row${completed(match) ? ' is-completed' : ''}"><span class="queue-num">${String(index+1).padStart(2,'0')}</span><strong>${esc(code(match))}</strong><span>${esc(`${match.groupId ? `${match.groupId} · ` : ''}${roundName(match)}`)}</span><span class="queue-status">${statusLabel(match)}</span></div>`).join('')}</div></details>`;
  }

  function renderMain() {
    const qf = state.data.matches.filter((match) => match.id.startsWith('MAIN-QF-'));
    const sf = state.data.matches.filter((match) => match.id.startsWith('MAIN-SF-'));
    const final = matches.get('MAIN-FINAL'), bronze = matches.get('MAIN-BRONZE');
    const rounds = [
      {title:'全國八強',sub:'8 → 4',items:qf,rows:[1,3,5,7],index:0},
      {title:'全國四強',sub:'4 → 2',items:sf,rows:[2,6],index:1},
      {title:'冠軍賽',sub:'2 → 1',items:[final].filter(Boolean),rows:[4],index:2}
    ];
    const full = `<div class="bracket-scroll" tabindex="0" role="region" aria-label="主舞台完整晉級圖，可橫向捲動"><div class="bracket-track stage-bracket">${rounds.map((round) => `<section class="bracket-round"><div class="round-title"><strong>${round.title}</strong><span>${round.sub}</span></div><div class="round-body">${round.items.map((match,index) => matchCard(match, round.index < 2 ? `${index % 2 ? 'connector-pair-bottom' : 'connector-pair-top'} connector-next${round.index === 1 ? ' connector-input link-large' : ''}` : 'connector-input', round.rows[index])).join('')}</div></section>`).join('')}</div></div><p class="bracket-hint">← 左右滑動，查看四強與冠軍賽 →</p><div class="bronze-card"><h4>季軍賽 · 兩場四強負隊對決</h4>${matchCard(bronze)}</div>`;
    const list = [...qf,...sf,bronze,final].filter(Boolean);
    const current = `<p class="round-list-note">主舞台共 8 場，依現場叫號出賽。</p>${rounds.slice(0,2).map((round) => `<div class="current-section"><h4 class="round-list-label">${round.title}<span>已完成 ${round.items.filter(completed).length} / ${round.items.length} 場</span></h4><div class="round-list">${round.items.map((match) => matchCard(match)).join('')}</div></div>`).join('')}<div class="current-section"><h4 class="round-list-label">季軍賽與冠軍賽</h4><div class="round-list">${matchCard(bronze)}${matchCard(final)}</div></div>`;
    return `<div class="venue-intro"><div><h3>主舞台 · 全國八強</h3><p>A 場 3 隊、B 場 3 隊、C 場 2 隊，在這裡爭取冠軍。</p></div><span class="venue-chip">完成 ${list.filter(completed).length} / 8 場</span>${printButton('MAIN')}</div><div class="group-panel"><div class="group-heading"><div><h3>八強之路</h3><p>7 場冠軍路線 ＋ 1 場季軍賽 · 三位評審集中</p></div>${viewSwitch()}</div>${state.view === 'full' ? full : current}</div>${renderQueue('MAIN')}`;
  }

  function renderVenue() {
    if (state.venue === 'MAIN') return renderMain();
    const assigned = state.data.groups.filter((group) => group.venue === state.venue);
    const group = groups.get(state.groups[state.venue]) || assigned[0];
    if (!group) return '<p class="loading">此場地尚未排入分組。</p>';
    const mainMatch = matches.get(group.winnerMainMatchId);
    const opponentIndex = mainMatch?.slots.findIndex((slot) => slot.matchId !== group.winnerMatchId) ?? -1;
    const mainOpponent = mainMatch?.slots[opponentIndex];
    return `<div class="venue-intro"><div><h3>${venueName(state.venue)} · 評審 ${state.venue}</h3><p>八強前固定在此場地。${assigned.length} 個分組各取 1 隊，共 ${assigned.length} 隊前往主舞台。</p></div><span class="venue-chip">${assigned.length * 9} 隊 / ${assigned.length * 8} 場</span>${printButton(state.venue)}</div><div class="group-tabs" role="tablist" aria-label="${venueName(state.venue)} 分組">${assigned.map((item) => `<button type="button" class="group-tab" role="tab" data-group="${esc(item.id)}" aria-selected="${item.id === group.id}" aria-controls="venue-group-panel" id="venue-group-tab-${esc(item.id)}" tabindex="${item.id === group.id ? 0 : -1}">${esc(item.id)} 組<small>9 隊取 1</small></button>`).join('')}</div><div class="group-panel" id="venue-group-panel" role="tabpanel" aria-labelledby="venue-group-tab-${esc(group.id)}"><div class="group-heading"><div><h3>${esc(group.id)} 組 · 晉級路線</h3><p>原隊號保留 · 資格賽 1 場 ＋ 組內淘汰 7 場</p></div>${viewSwitch()}</div>${state.view === 'full' ? renderGroupBracket(group) : renderCurrentGroup(group)}<div class="advance-note"><span aria-hidden="true">↗</span><span><strong>${esc(group.id)} 組勝隊</strong> 前往主舞台 ${esc(code(mainMatch))}，對上 <strong>${esc(slotLabel(mainOpponent,mainMatch,opponentIndex))}</strong></span></div>${renderRoster(group)}</div>${renderQueue(state.venue)}`;
  }

  function teamDetail(id) {
    const team = teams.get(id), group = groupForTeam(id), first = firstMatch(id);
    if (!team || !group || !first) return '';
    const opponentIndex = first.slots.findIndex((slot) => slot.teamId !== id);
    const qualifier = group.qualifierTeamIds.includes(id), path = teamPath(id), main = matches.get(group.winnerMainMatchId);
    const mainOpponentIndex = main?.slots.findIndex((slot) => slot.matchId !== group.winnerMatchId) ?? -1;
    const played = state.data.matches.filter((match) => completed(match) && match.slots.some((slot,index) => resolvedId(slot,match,index) === id));
    const lost = played.find((match) => match.winnerId !== id && match.winnerId);
    const liveSummary = lost ? `已完成 ${code(lost)} ${roundName(lost)}。` : played.length ? `已贏得 ${played.length} 場，請依叫號繼續出賽。` : '請依場次叫號出賽。';
    return `<article class="team-detail"><div class="team-detail-head">${numberTag(team)}<div><h3>${esc(team.teamName)}</h3><p>選手 ${esc(team.playerName || '尚未提供')} · 原隊號 ${esc(team.teamNumber)}</p></div><button type="button" class="detail-close" data-clear-search aria-label="清除搜尋">×</button></div><div class="team-detail-grid"><div class="detail-unit"><span class="label">比賽場地</span><strong>場地 ${group.venue} · ${group.id} 組</strong><p>八強以前不用換場地</p></div><div class="detail-unit"><span class="label">第一場 · ${esc(code(first))} ${esc(roundName(first))}</span><strong>對手：${esc(slotLabel(first.slots[opponentIndex],first,opponentIndex,true))}</strong><p>${qualifier ? '從資格賽起連贏 4 場，可進全國八強。' : '資格賽輪空，直接進組內八強；贏 3 場可上主舞台。'}</p></div><div class="detail-unit"><span class="label">取得組內冠軍後</span><strong>主舞台 ${esc(code(main))}</strong><p>全國八強對手：${esc(slotLabel(main?.slots[mainOpponentIndex],main,mainOpponentIndex))}</p></div></div><p class="detail-progress">${esc(liveSummary)}</p><p class="detail-route"><strong>若一路獲勝</strong> ${path.map((match) => `${esc(code(match))} ${esc(roundName(match))}`).join('<span aria-hidden="true">→</span>')}</p><button type="button" class="detail-action" data-show-team="${esc(id)}">查看 ${group.id} 組晉級圖 <span aria-hidden="true">↓</span></button></article>`;
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
    const roleKey = `${Boolean(options.control)}:${options.judgeId || ''}`;
    if (state.roleKey !== roleKey) { state.roleKey = roleKey; if (['A','B','C'].includes(options.judgeId)) state.venue = options.judgeId; }
    const results = searchResults();
    return `<section class="venue-tournament" aria-label="三場地相撲機器人賽程"><div class="section-title"><div><p class="eyebrow">SUMO TOURNAMENT</p><h2>三場地對戰賽程</h2></div>${options.control && !['A','B','C'].includes(options.judgeId) ? '<button type="button" class="venue-print" data-print="ALL">▤ 賽務列印・全部場地</button>' : '<span class="static-label">八強前固定場地<br>八強起前往主舞台</span>'}</div>${overview()}<section class="team-search-section" aria-labelledby="venue-search-title"><div class="search-heading"><h3 id="venue-search-title">查詢隊伍與對手</h3><span>保留原隊號，缺號不遞補</span></div><label class="search-box"><span class="search-icon" aria-hidden="true">⌕</span><input type="search" id="venue-team-search" data-team-search value="${esc(state.query)}" aria-label="輸入隊號、隊名或選手姓名" placeholder="輸入隊號、隊名或選手姓名" autocomplete="off"></label><div class="search-results" aria-live="polite">${results}</div></section><section class="competition"><div class="venue-tabs" role="tablist" aria-label="選擇比賽場地">${['A','B','C','MAIN'].map((venue) => `<button type="button" role="tab" class="venue-tab" data-venue="${venue}" id="venue-tab-${venue}" aria-selected="${state.venue === venue}" aria-controls="venue-content" tabindex="${state.venue === venue ? 0 : -1}">${venueName(venue)}<small>${venue === 'MAIN' ? '八強起集中比賽' : `${venue === 'C' ? 18 : 27} 隊 · ${venue === 'C' ? 2 : 3} 席八強`}</small></button>`).join('')}</div><div id="venue-content" class="venue-content" role="tabpanel" aria-labelledby="venue-tab-${state.venue}">${renderVenue()}</div></section></section>`;
  }

  function refresh(container, focusSelector = null) {
    if (!container?.isConnected) return;
    const input = container.querySelector('[data-team-search]');
    const focused = document.activeElement === input;
    const selection = focused ? input.selectionStart : null;
    const scroll = container.querySelector('.bracket-scroll')?.scrollLeft || 0;
    const next = document.createElement('div'); next.innerHTML = render(state.data,state.options);
    const replacement = next.firstElementChild; container.replaceWith(replacement);
    const scrollArea = replacement.querySelector('.bracket-scroll'); if (scrollArea) scrollArea.scrollLeft = scroll;
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
      else if (button.dataset.openMatch) { const match = matches.get(button.dataset.openMatch); if (match && canOperate(match.venue) && match.canStart === true) entry.callbacks.onOpenMatch?.(match.id); changed = false; }
      else if (button.dataset.venue) { state.venue = button.dataset.venue; focus = `.venue-tab[data-venue="${state.venue}"]`; }
      else if (button.dataset.group) { state.groups[state.venue] = button.dataset.group; focus = `.group-tab[data-group="${button.dataset.group}"]`; }
      else if (button.dataset.view) { state.view = button.dataset.view; focus = `[data-view="${state.view}"]`; }
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
