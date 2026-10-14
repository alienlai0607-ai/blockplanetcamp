/* Password-authenticated staff workspaces; judge selection is session memory only. */
'use strict';

const JUDGE_DESK_IDS = ['A', 'B', 'C'];
const judgeDeskQuery = new URLSearchParams(location.search);
// A URL may select a local rehearsal desk, but never a production staff identity.
let judgeDeskId = DEMO && JUDGE_DESK_IDS.includes((judgeDeskQuery.get('judge') || '').toUpperCase())
  ? judgeDeskQuery.get('judge').toUpperCase() : null;
let judgeDeskChooser = !DEMO || (!judgeDeskId && judgeDeskQuery.get('desk') === 'choose');
let judgeDeskAuthenticated = DEMO;
const JUDGE_DESK_STORAGE = 'bp-junkbot-demo-national';
const JUDGE_DESK_LOCK = DEMO ? 'bp-junkbot-demo-national-write' : 'bp-junkbot-national-judge-write';
let judgeDeskBootstrap = false;
const judgeDeskOpenSections = new Set();

function activeJudgeId() { return role === 'control' && judgeDeskAuthenticated && !judgeDeskChooser ? judgeDeskId : null; }
function judgeAuditName() {
  const name = operatorName || (DEMO ? '演練賽務' : '');
  return judgeDeskId && !judgeDeskChooser ? `${name}（評審 ${judgeDeskId}）` : name;
}

function judgeIsBye(item) {
  if (item.venue) return item.resultType === 'bye';
  const sources = item.sourceMatchIds || [];
  return item.resultType === 'bye' || sources.length === 1
    || (!sources.length && (item.participantIds || []).filter(Boolean).length === 1);
}

function judgeAssignmentMap(targetState = state) {
  if (window.JunkbotVenuePlan?.isVenueState(targetState)) return new Map(targetState.matches.filter(m => !judgeIsBye(m)).map(m => [m.id, m.venue === 'MAIN' ? 'A' : m.venue]));
  const totals = { A: 0, B: 0, C: 0 };
  const assignments = new Map();
  const items = [...(targetState.matches || [])].filter(item => !judgeIsBye(item)).sort((a, b) => {
    const aRound = Number.isFinite(Number(a.roundIndex)) ? Number(a.roundIndex) : legacyRoundIndex(a.stage);
    const bRound = Number.isFinite(Number(b.roundIndex)) ? Number(b.roundIndex) : legacyRoundIndex(b.stage);
    return aRound - bRound || Number(a.order || 0) - Number(b.order || 0) || String(a.id).localeCompare(String(b.id));
  });
  items.forEach(item => {
    const assigned = JUDGE_DESK_IDS.reduce((best, id) => totals[id] < totals[best] ? id : best, 'A');
    assignments.set(item.id, assigned);
    totals[assigned] += 1;
  });
  return assignments;
}

function judgeForMatch(item, targetState = state) {
  const matchId = typeof item === 'string' ? item : item?.id;
  return judgeAssignmentMap(targetState).get(matchId) || null;
}

function judgeCanOperate(matchId, targetState = state) {
  return role === 'control' && judgeDeskAuthenticated && !judgeDeskChooser
    && (!judgeDeskId || judgeForMatch(matchId, targetState) === judgeDeskId);
}

function judgeCanHandleMatch(matchId, targetState = state) { return judgeCanOperate(matchId, targetState); }

function judgeAudienceHref() {
  return `${location.pathname}?${DEMO ? 'demo=1&' : ''}role=audience`;
}

function judgeDeskCode(item) {
  return typeof flowCode === 'function' ? flowCode(item) : matchDisplayLabel(item);
}

function judgeDeskTeams(item) {
  return (item.participantIds || [null, null]).map(id => id ? teamName(id) : '等待前場晉級');
}

function judgeDeskTeamHTML(id) {
  return teamLabelHTML(entry(id), '等待前場晉級');
}

function judgeDeskStatus(item) {
  if (item.status === 'completed') return '已完成';
  if (item.venue === 'MAIN' && !window.JunkbotVenuePlan?.mainReady(state)) return window.JunkbotVenuePlan?.isNewState(state) ? (window.JunkbotVenuePlan.groupsComplete(state) ? '等待主舞台現場抽籤' : '等待九組完成及抽籤') : '等待八組完成';
  const live = matchLive(item.id);
  if (live?.status === 'running') return '比賽中';
  if (live?.status === 'countdown') return '開場倒數';
  if (live?.status === 'awaiting-decision' || live?.timeupPending) return '待判定';
  if (activeMatchIds().includes(item.id)) return '準備中';
  if (item.groupId && (window.JunkbotVenuePlan?.readinessReason(state,item.id)||'').includes('組並產生組冠軍')) return '等待前組完成';
  return item.participantIds.filter(Boolean).length === 2 ? '對手已確定' : '等待前場勝隊';
}

function judgeDeskRow(item, { activeId = null, readonly = false, busyLabel = '' } = {}) {
  const completed = item.status === 'completed';
  const ready = !completed && item.participantIds.filter(Boolean).length === 2;
  const disabled = Boolean(activeId && activeId !== item.id);
  return `<article class="judge-match-row ${completed ? 'is-completed' : ''}" data-judge-row="${esc(item.id)}">
    <div class="judge-match-label"><b>${esc(judgeDeskCode(item))}</b><small>${esc(judgeDeskStatus(item))}</small></div>
    <div class="judge-match-teams"><span class="${completed && item.winnerId && item.winnerId === item.participantIds[0] ? 'is-winner' : ''}">${judgeDeskTeamHTML(item.participantIds[0])}</span><i>VS</i><span class="${completed && item.winnerId && item.winnerId === item.participantIds[1] ? 'is-winner' : ''}">${judgeDeskTeamHTML(item.participantIds[1])}</span></div>
    <div class="judge-match-action">${completed ? `<span class="judge-result">${esc(teamName(item.winnerId))} 勝</span>` : ready && !readonly ? `<button class="judge-row-button" data-start-match="${esc(item.id)}" ${disabled ? `disabled title="${esc(busyLabel || '請先完成目前場次')}"` : ''}>${disabled ? '賽場使用中' : item.id === activeId ? '返回賽場 →' : '選這場 →'}</button>` : `<span class="judge-wait">${judgeDeskStatus(item)==='等待前組完成'?'前組結束後開放':item.venue==='MAIN'&&!window.JunkbotVenuePlan?.mainReady(state)?'主舞台準備完成後開放':'等待雙方勝隊'}</span>`}</div>
  </article>`;
}

function judgeDeskView() {
  const assignments = judgeAssignmentMap();
  const own = state.matches.filter(item => assignments.get(item.id) === judgeDeskId)
    .sort((a, b) => window.JunkbotVenuePlan?.isNewState(state)
      ? Number(a.venue === 'MAIN') - Number(b.venue === 'MAIN') || a.venueOrder - b.venueOrder
      : Number(a.roundIndex || 0) - Number(b.roundIndex || 0) || (a.venue ? a.venueOrder - b.venueOrder : a.order - b.order));
  const active = own.filter(item => item.status !== 'completed' && activeMatchIds().includes(item.id));
  const completed = own.filter(item => item.status === 'completed');
  const ready = own.filter(item => item.status !== 'completed' && !activeMatchIds().includes(item.id) && item.participantIds.filter(Boolean).length === 2 && !window.JunkbotVenuePlan?.readinessReason(state,item.id));
  const waiting = own.filter(item => item.status !== 'completed' && !activeMatchIds().includes(item.id) && (item.participantIds.filter(Boolean).length !== 2 || Boolean(window.JunkbotVenuePlan?.readinessReason(state,item.id))));
  const next = active[0];
  const list = ready;
  const currentNeedsDecision = next && (matchLive(next.id)?.status === 'awaiting-decision' || matchLive(next.id)?.timeupPending);
  const busyLabel = next ? `${next.callCode || judgeDeskCode(next)} ${currentNeedsDecision ? '待判定，請先記錄勝隊，完成後即可任選下方場次。' : '正在使用賽場，完成本場後即可任選下方場次。'}` : '';
  const nineGroups = Boolean(window.JunkbotVenuePlan?.isNewState(state));
  const field = nineGroups ? own.filter(item => item.venue === judgeDeskId) : own;
  const fieldCompleted = field.filter(item => item.status === 'completed').length;
  const mainCompleted = state.matches.filter(item => item.venue === 'MAIN' && item.status === 'completed').length;
  const pendingMainDraw = nineGroups && state.venuePlan.mainDraw?.status !== 'drawn';
  const groupsReady = nineGroups && window.JunkbotVenuePlan.groupsComplete(state);
  const fieldDone = field.length > 0 && fieldCompleted === field.length;
  const summary = nineGroups ? `<span>場地 ${judgeDeskId} 初賽 <b>${fieldCompleted}</b>／21 場已完成</span><span>主舞台另計 <b>${mainCompleted}</b>／9 場 · 三位協同${judgeDeskId === 'A' ? '，由 A 登錄' : ''}</span>` : `<span><b>${completed.length}</b>／${own.length} 場已完成</span>`;
  const plannedOwnTotal = nineGroups ? 21 + (judgeDeskId === 'A' ? 9 : 0) : own.length;
  const progress = plannedOwnTotal ? Math.round(completed.length / plannedOwnTotal * 100) : 0;
  const emptyTitle = nineGroups && fieldDone && (pendingMainDraw || judgeDeskId !== 'A') ? `場地 ${judgeDeskId} 初賽已完成` : own.length && completed.length === own.length ? '你的場次已全部完成' : '等待前場比賽完成';
  const emptyText = nineGroups && fieldDone && pendingMainDraw ? (groupsReady ? '九組冠軍已到齊，等待總賽務在主舞台進行現場抽籤。抽籤公布後再開始主舞台賽事。' : '主舞台等待九組全部完成，再現場抽籤決定晉級位置。請至主舞台協同評審。') : nineGroups && fieldDone && judgeDeskId !== 'A' ? '請前往主舞台，由三位評審共同執行；主舞台 9 場由評審 A 登錄。' : own.length && completed.length === own.length ? (DEMO ? '所有判定已保存在本次演練。' : '所有判定已同步至賽事紀錄。') : '選手晉級後，可開賽場次會自動出現在這裡。';
  return `<section class="judge-desk" aria-label="評審 ${judgeDeskId} 專屬場次">
    <header class="judge-desk-heading"><div><span class="judge-eyebrow">評審專屬工作畫面</span><h1>評審 ${judgeDeskId}</h1><p>${window.JunkbotVenuePlan?.isVenueState(state) ? `場地 ${judgeDeskId} 固定分組${nineGroups ? '，初賽 21 場' : ''}，每組比完再接下一組。${judgeDeskId === 'A' ? '主舞台由評審 A 登錄，B、C 協同。' : '分場完成後，至主舞台協同評審。'}` : '只顯示你的場次，雙方到場即可任選一場開賽。'}</p></div><div class="venue-judge-actions">${window.JunkbotVenuePlan?.isVenueState(state) ? `<button class="outline" data-venue-print="${judgeDeskId}">列印場地 ${judgeDeskId}</button>` : ''}<button class="outline" data-action="refresh">更新場次</button></div></header>
    <div class="judge-summary">${summary}<span><b>${ready.length + active.length}</b> 場對手已確定</span><span><b>${waiting.length}</b> 場尚未開放</span><div class="judge-progress" role="progressbar" aria-label="評審 ${judgeDeskId} 完成進度" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress}"><i style="width:${progress}%"></i></div></div>
    ${next ? `<section class="judge-next ${active.length ? 'is-active' : ''}"><div class="judge-next-meta"><span>${active.length ? '目前場次' : '下一場・核對後開賽'}</span><b>${esc(judgeDeskCode(next))}</b><small>${esc(judgeDeskStatus(next))}</small></div><div class="judge-next-teams"><strong>${judgeDeskTeamHTML(next.participantIds[0])}</strong><span>VS</span><strong>${judgeDeskTeamHTML(next.participantIds[1])}</strong></div><button class="primary" ${currentNeedsDecision ? `data-judge-match="${esc(next.id)}"` : `data-start-match="${esc(next.id)}"`}>${currentNeedsDecision ? '記錄本場勝隊' : '返回目前賽場'} →</button></section>` : ready.length ? '' : `<section class="judge-desk-empty"><h2>${emptyTitle}</h2><p>${emptyText}</p></section>`}
    ${active.length > 1 ? `<div class="judge-extra-active"><p>尚有其他已開啟場次，請依序完成。</p>${active.slice(1).map(item => judgeDeskRow(item, { activeId: item.id })).join('')}</div>` : ''}
    <section class="judge-queue" aria-label="對手已確定的可選場次"><header><h2>對手已確定・可選場次</h2><span>${list.length} 場</span></header><p class="judge-choice-help">確認雙方選手到場後，任選一場開始，不必按場碼順序。晉級後雙方確定的場次，也會出現在這裡。</p>${busyLabel ? `<p class="judge-arena-busy" role="status">${esc(busyLabel)}</p>` : ''}${list.length ? `<div class="judge-match-list">${list.map(item => judgeDeskRow(item, { activeId: active[0]?.id, busyLabel })).join('')}</div>` : '<p class="judge-quiet">目前沒有其他對手已確定的場次。</p>'}</section>
    <details class="judge-fold" data-judge-details="waiting" ${judgeDeskOpenSections.has('waiting') ? 'open' : ''}><summary>等待晉級／後續組別 <span>${waiting.length} 場</span></summary><div class="judge-match-list">${waiting.length ? waiting.map(item => judgeDeskRow(item, { readonly: true })).join('') : '<p class="judge-quiet">沒有等待中的場次。</p>'}</div></details>
    <details class="judge-fold" data-judge-details="completed" ${judgeDeskOpenSections.has('completed') ? 'open' : ''}><summary>我的完成紀錄 <span>${completed.length} 場</span></summary><div class="judge-match-list">${completed.length ? completed.map(item => judgeDeskRow(item, { readonly: true })).join('') : '<p class="judge-quiet">尚未完成任何場次。</p>'}</div></details>
    <p class="judge-desk-note">${DEMO ? '本頁為獨立演練，同一瀏覽器分頁共用進度。' : '判定送出後同步至全國賽事。'}同一場地一次一場。場碼與對手固定，開賽先後可由老師依到場狀況選擇。</p>
  </section>`;
}

function judgeFieldCountLabel(id, assignments) {
  return window.JunkbotVenuePlan?.isNewState(state) ? '初賽 21 場' : `${assignments.filter(value => value === id).length} 場`;
}

function judgeChooserView() {
  const assignments = [...judgeAssignmentMap().values()];
  const nineGroups = Boolean(window.JunkbotVenuePlan?.isNewState(state));
  return `<section class="judge-chooser"><span class="judge-eyebrow">${DEMO ? '獨立演練' : '賽務密碼已驗證'}</span><h1>選擇工作身分</h1><p>${esc(operatorName || '工作人員')}，請選擇本次負責的工作台。<br>評審進入後，直接看到自己負責的比賽。</p><div class="judge-chooser-grid">${JUDGE_DESK_IDS.map(id => `<button type="button" data-judge-select="${id}" ${connectionOk ? '' : 'disabled'}><span>評審 ${id}</span><strong>${judgeFieldCountLabel(id, assignments)}</strong><small>${nineGroups ? (id === 'A' ? '主舞台另計 9 場・由 A 登錄' : '主舞台共同評審・由 A 登錄') : '只看我的場次 →'}</small></button>`).join('')}</div><button type="button" class="judge-admin-entry" data-judge-select="admin">進入總賽務・查看完整賽程 →</button>${connectionOk ? '' : '<p class="judge-connection-note">正在確認賽事資料；若連線未完成，請先更新。</p><button class="outline" data-action="refresh">重新讀取賽事</button>'}<p class="judge-desk-note">${DEMO ? '僅本機演練，不影響正式賽事。' : '請依現場分工選擇身分，判定紀錄會保留登錄人員與評審編號。'}</p></section>`;
}

function judgeMountRoleStrip() {
  let strip = $('judgeRoleStrip');
  if (!strip) {
    strip = document.createElement('section');
    strip.id = 'judgeRoleStrip';
    strip.className = 'judge-role-strip';
    $('controlView').before(strip);
  }
  strip.hidden = judgeDeskChooser || role !== 'control';
  const assignments = [...judgeAssignmentMap().values()];
  strip.innerHTML = judgeDeskId
    ? `<div><span class="judge-identity-dot">${judgeDeskId}</span><strong>評審 ${judgeDeskId} 工作台</strong><span>${window.JunkbotVenuePlan?.isNewState(state) ? '初賽 21 場 · 主舞台另計 9 場、三位協同' : '僅自己的場次'}</span></div>`
    : `<div><strong>總賽務</strong><span>全國賽事工作台</span></div>${window.JunkbotVenuePlan?.isNewState(state) ? '<span>主舞台由評審 A 登錄、三位協同</span>' : ''}<a href="${judgeAudienceHref()}" target="_blank" rel="noopener">觀眾入口</a>`;
}

function judgeDeskLeaveReason() {
  if (pendingMutations || uiOperationPending || pendingMatchOperations.size || unsavedCampusStates.has(campus)) return '資料尚未完成同步，請先完成儲存。';
  if (countdownStarts.size) return '開場倒數進行中，請先完成目前場次。';
  if (role === 'control' && !judgeDeskChooser && activeMatchIds().some(id => {
    if (judgeDeskId && judgeForMatch(id) !== judgeDeskId) return false;
    const live = matchLive(id);
    return ['countdown', 'running', 'awaiting-decision'].includes(live?.status) || live?.timeupPending;
  })) return '目前場次仍在倒數、計時或等待判定，請完成後再登出。';
  if ($('modalRoot')?.innerHTML) return '請先完成或關閉目前的操作視窗。';
  return '';
}

function judgeSelectDesk(selection) {
  if (role !== 'control' || !judgeDeskAuthenticated) return showToast('請先輸入賽務密碼並完成驗證。', true);
  // A workspace is chosen once after authentication and stays fixed until logout.
  if (!judgeDeskChooser || !['admin', ...JUDGE_DESK_IDS].includes(selection)) return;
  const reason = judgeDeskLeaveReason();
  if (reason) return showToast(reason, true);
  if (JUDGE_DESK_IDS.includes(selection) && !connectionOk) return showToast('請先更新賽事資料，再選擇評審工作台。', true);
  stopArenaMusic();
  arenaOpen = false;
  focusedArenaMatchId = null;
  $('arenaRoot').innerHTML = '';
  judgeDeskChooser = selection === 'choose';
  judgeDeskId = JUDGE_DESK_IDS.includes(selection) ? selection : null;
  judgeDeskOpenSections.clear();
  controlView = judgeDeskId || judgeDeskChooser ? 'judge' : 'dashboard';
  if (selection === 'admin') recoverUnsavedCampusDraft(campus);
  renderControl();
  window.scrollTo(0, 0);
  const heading = $('controlView').querySelector('h1');
  if (heading) { heading.tabIndex = -1; heading.focus({ preventScroll: true }); }
}

function judgeCaptureViewPosition() {
  const viewRoot = (role === 'audience' ? $('audienceView') : $('controlView')) || document;
  const elements = [...viewRoot.querySelectorAll('.flow-scroll,.flow-rounds,.flow-map-viewport,.bracket-scroll')].map((node, index) => ({ index, left: node.scrollLeft, top: node.scrollTop }));
  const focus = document.activeElement;
  const attrs = ['data-flow-history', 'data-flow-current', 'data-progress-preview', 'href', 'data-flow-mode', 'data-flow-round', 'data-judge-details', 'data-start-match', 'data-judge-match', 'data-flow-route', 'data-flow-locate', 'data-flow-focus-key', 'data-bracket-display', 'data-view', 'data-action'];
  const focusAttr = focus && attrs.find(name => focus.hasAttribute?.(name));
  const focusRegion = focus?.classList?.contains('flow-scroll') ? '.flow-scroll' : null;
  const focusDetail = focus?.tagName === 'SUMMARY' ? focus.parentElement?.dataset?.judgeDetails : null;
  const bracket = viewRoot.querySelector('.flow-bracket');
  const mapRect = viewRoot.querySelector('.flow-scroll')?.getBoundingClientRect();
  const progressToken = bracket?.dataset?.flowScrollToken;
  const withinMap = Boolean(mapRect && mapRect.top < 0 && mapRect.bottom > 0);
  return { elements, progressToken, withinMap, focusRegion, focusDetail, x: window.scrollX, y: window.scrollY, focusId: focus?.id || '', focusAttr, focusValue: focusAttr ? focus.getAttribute(focusAttr) : null };
}

function judgeRestoreViewPosition(saved) {
  const viewRoot = (role === 'audience' ? $('audienceView') : $('controlView')) || document;
  const elements = [...viewRoot.querySelectorAll('.flow-scroll,.flow-rounds,.flow-map-viewport,.bracket-scroll')];
  const progressChanged = saved.progressToken != null && Number(saved.progressToken) !== (Number(window.flowProgressScrollReset) || 0);
  if (progressChanged) elements.forEach(node => { node.scrollLeft = 0; node.scrollTop = 0; });
  else saved.elements.forEach(position => { const node = elements[position.index]; if (node) { node.scrollLeft = position.left; node.scrollTop = position.top; } });
  let focus = saved.focusRegion ? viewRoot.querySelector(saved.focusRegion) : saved.focusDetail ? document.querySelector(`[data-judge-details="${saved.focusDetail}"] > summary`) : saved.focusId ? $(saved.focusId) : saved.focusAttr ? [...document.querySelectorAll(`[${saved.focusAttr}]`)].find(node => node.getAttribute(saved.focusAttr) === saved.focusValue) : null;
  if (!focus && progressChanged && saved.focusAttr === 'data-flow-current') focus = viewRoot.querySelector('.flow-scroll');
  if (focus && !focus.disabled) focus.focus({ preventScroll: true });
  if (progressChanged && saved.withinMap && viewRoot.querySelector('.flow-progress-summary')) {
    const summary = viewRoot.querySelector('.flow-progress-summary');
    window.scrollTo(saved.x, Math.max(0, window.scrollY + summary.getBoundingClientRect().top - 16));
  } else window.scrollTo(saved.x, saved.y);
}

const judgeOriginalRenderControl = renderControl;
renderControl = function() {
  const position = judgeCaptureViewPosition();
  document.body.classList.toggle('judge-desk-mode', Boolean(judgeDeskId || judgeDeskChooser));
  if (judgeDeskId || judgeDeskChooser) {
    controlView = 'judge';
    $('controlCampusName').textContent = judgeDeskId ? `評審 ${judgeDeskId} 專屬工作台` : '選擇工作身分';
    const root = $('controlView');
    root.classList.remove('bracket-layout');
    root.innerHTML = judgeDeskChooser ? judgeChooserView() : judgeDeskView();
  } else judgeOriginalRenderControl();
  judgeMountRoleStrip();
  judgeRestoreViewPosition(position);
};

const judgeOriginalRecoverDraft = recoverUnsavedCampusDraft;
recoverUnsavedCampusDraft = function(campusId) {
  return judgeDeskId || judgeDeskChooser ? false : judgeOriginalRecoverDraft(campusId);
};

const judgeOriginalApiPost = apiPost;
apiPost = async function(payload) {
  if (payload.action === 'junkbot-auth') {
    judgeDeskAuthenticated = DEMO;
    if (!DEMO) { judgeDeskId = null; judgeDeskChooser = true; }
    const result = await judgeOriginalApiPost(payload);
    judgeDeskAuthenticated = Boolean(result.success && result.authorized);
    return result;
  }
  if (!judgeDeskAuthenticated) return { success: false, code: 'STAFF_AUTH_REQUIRED', error: '請先輸入賽務密碼並完成驗證。' };
  if (!judgeDeskBootstrap && judgeDeskChooser) return { success: false, code: 'JUDGE_SELECTION_REQUIRED', error: '請先選擇工作身分。' };
  if (!judgeDeskBootstrap && judgeDeskId && payload.action !== 'junkbot-match-patch') return { success: false, code: 'JUDGE_SCOPE', error: '評審工作台只能操作自己負責的場次。' };
  const operation = async () => {
    if (!judgeDeskBootstrap && judgeDeskId && payload.action === 'junkbot-match-patch') {
      let latest = state;
      if (DEMO) {
        const saved = localStorage.getItem(JUDGE_DESK_STORAGE);
        latest = normalizeState(saved ? JSON.parse(saved) : emptyState(EVENT_SCOPE), EVENT_SCOPE);
      }
      // patchMatch performs the single fresh preflight; keep local scope guards
      // here without issuing a second identical network read.
      if (!judgeCanOperate(payload.matchId, latest)) return { success: false, code: 'JUDGE_SCOPE', error: '這場由其他評審負責，請返回自己的場次。' };
      if (DEMO && ['open', 'countdown', 'start'].includes(payload.op)) {
        const another = activeMatchIds(latest).find(id => id !== payload.matchId && judgeForMatch(id, latest) === judgeDeskId && latest.matches.find(item => item.id === id)?.status !== 'completed');
        if (another) return { success: false, code: 'JUDGE_BUSY', error: '請先完成目前負責的場次，再開啟下一場。' };
      }
    }
    return judgeOriginalApiPost(payload);
  };
  if (judgeDeskBootstrap || !['junkbot-match-patch', 'junkbot-state-set', 'junkbot-main-draw'].includes(payload.action)) return operation();
  // Same-browser serialization complements, and never replaces, the server's atomic patch.
  if (navigator.locks?.request) return navigator.locks.request(JUDGE_DESK_LOCK, operation);
  if (DEMO && judgeDeskId) return { success: false, code: 'LOCK_UNAVAILABLE', error: '目前瀏覽器不支援多評審演練同步，請改用支援此功能的瀏覽器。' };
  return operation();
};

const judgeOriginalEnterApp = enterApp;
enterApp = async function(campusId) {
  if (role === 'control') {
    if (!judgeDeskAuthenticated) throw new Error('請先輸入賽務密碼並完成驗證。');
    if (!DEMO) { judgeDeskId = null; judgeDeskChooser = true; }
  }
  return judgeOriginalEnterApp(campusId);
};

const judgeOriginalLeaveApp = leaveApp;
leaveApp = function() {
  if (role === 'control') {
    const reason = judgeDeskLeaveReason();
    if (reason) return showToast(reason, true);
  }
  judgeOriginalLeaveApp();
  if (role !== null) return;
  judgeDeskId = null;
  judgeDeskChooser = true;
  judgeDeskAuthenticated = DEMO;
  judgeDeskOpenSections.clear();
  $('judgeRoleStrip')?.setAttribute('hidden', '');
  document.body.classList.remove('judge-desk-mode');
};

const judgeOriginalPatchMatch = patchMatch;
patchMatch = function(matchId, op, payload = {}, message = '') {
  if (!judgeCanOperate(matchId)) return Promise.reject(new Error('這場不屬於目前評審的工作範圍。'));
  return judgeOriginalPatchMatch(matchId, op, payload, message);
};

const judgeOriginalOpenArena = openArena;
openArena = async function(matchId) {
  if (!judgeCanOperate(matchId)) throw new Error('這場由其他評審負責。');
  return judgeOriginalOpenArena(matchId);
};

const judgeOriginalTimeUp = handleTimeUp;
handleTimeUp = function(matchId) {
  if (!judgeCanHandleMatch(matchId)) return Promise.resolve();
  return judgeOriginalTimeUp(matchId);
};

document.addEventListener('toggle', event => {
  const key = event.target.dataset?.judgeDetails;
  if (!key) return;
  if (event.target.open) judgeDeskOpenSections.add(key); else judgeDeskOpenSections.delete(key);
}, true);

window.addEventListener('storage', event => {
  if (DEMO && event.key === JUDGE_DESK_STORAGE && role === 'control' && campus === EVENT_SCOPE && !judgeDeskBootstrap) loadCampusState(true);
});

// Capture only workspace controls; existing arena and bracket event handlers stay intact.
document.addEventListener('click', event => {
  const selection = event.target.closest('[data-judge-select]');
  if (selection) {
    event.preventDefault(); event.stopImmediatePropagation();
    judgeSelectDesk(selection.dataset.judgeSelect);
    return;
  }
  if (event.target.closest('#leaveControl,#leaveAudience')) {
    event.preventDefault(); event.stopImmediatePropagation();
    leaveApp();
    return;
  }
  if (role === 'control' && (judgeDeskId || judgeDeskChooser) && event.target.closest('.topbar [data-view]')) {
    event.preventDefault(); event.stopImmediatePropagation();
  }
}, true);
$('leaveControl').textContent = '登出';
