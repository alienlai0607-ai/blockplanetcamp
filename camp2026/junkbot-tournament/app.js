/* 2026 布拉克星球廢材機器人大賽
 * 一分鐘不停錶｜東橋、北區資料分流｜觀眾唯讀｜比賽單位密碼 block
 */
'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbyn7Rpmmfk0zAgME4TDEy0FYA3cckQZTfQD_6peGTv6HH5TmPc2mOXfNc-Dj9S2HNI/exec';
const CONTROL_PASSWORD = 'block';
const DEMO = new URLSearchParams(location.search).has('demo');
const CAMPUS = {
  dongqiao: { name: '東橋教室', short: '東橋', mark: '東' },
  north: { name: '北區教室', short: '北區', mark: '北' },
};
const STAGE_LABELS = {
  r16: '16 強賽',
  quarter: '8 強賽',
  semi: '4 強賽',
  bronze: '季軍賽',
  final: '冠亞軍賽',
};
const DECISION_REASONS = [
  '對手機器人完全掉出場外',
  '對手機器人停止移動超過 10 秒',
  '對手 10 秒內未離開起始區',
  '時間到，較接近對方基地',
  '惡意觸碰或違規判負',
  '對手棄權',
  '評審依現場狀況判定',
];

const $ = (id) => document.getElementById(id);
const esc = (value) => String(value == null ? '' : value)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const uid = (prefix) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

let role = null;
let campus = null;
let state = emptyState('dongqiao');
let controlView = 'dashboard';
let syncQueue = Promise.resolve();
let audienceRefresh = null;
let clockTicker = null;
let timeUpHandled = false;
let audioContext = null;
let arenaOpen = false;
let connectionOk = true;

function emptyState(campusId) {
  return {
    version: 1,
    campus: campusId,
    entries: [],
    matches: [],
    activeMatchId: null,
    championId: null,
    runnerUpId: null,
    thirdPlaceId: null,
    live: null,
    updatedAt: null,
  };
}

function normalizeState(raw, campusId) {
  const base = emptyState(campusId);
  const next = raw && typeof raw === 'object' ? Object.assign(base, raw) : base;
  next.campus = campusId;
  next.entries = Array.isArray(next.entries) ? next.entries : [];
  next.matches = Array.isArray(next.matches) ? next.matches : [];
  return next;
}

function entry(id) {
  return state.entries.find((item) => item.id === id) || null;
}

function match(id) {
  return state.matches.find((item) => item.id === id) || null;
}

function stageMatches(stage) {
  return state.matches.filter((item) => item.stage === stage).sort((a, b) => a.order - b.order);
}

function teamName(id, fallback = '等待晉級') {
  return entry(id)?.teamName || fallback;
}

function showToast(message, error = false) {
  const toast = $('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.style.background = error ? '#d93632' : '#4b210a';
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 3200);
}

async function apiGet(campusId) {
  if (DEMO) {
    const saved = localStorage.getItem(`bp-junkbot-${campusId}`);
    return { success: true, state: saved ? JSON.parse(saved) : emptyState(campusId) };
  }
  const response = await fetchWithTimeout(`${API_URL}?action=junkbot-state&campus=${encodeURIComponent(campusId)}&_=${Date.now()}`, {}, 8000);
  return response.json();
}

async function apiPost(payload) {
  if (DEMO && payload.action === 'junkbot-state-set') {
    localStorage.setItem(`bp-junkbot-${payload.campus}`, JSON.stringify(payload.state));
    return { success: true, ok: true };
  }
  if (DEMO && payload.action === 'junkbot-video-upload') {
    return { success: false, error: '示範模式不會上傳影片，請改用影片網址' };
  }
  const response = await fetchWithTimeout(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  }, payload.action === 'junkbot-video-upload' ? 90000 : 12000);
  return response.json();
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (error) {
    if (error && error.name === 'AbortError') throw new Error('連線逾時，系統會自動重試');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

async function loadCampusState(silent = false) {
  if (!campus) return;
  try {
    if (!silent) setSync('saving', '讀取中');
    const result = await apiGet(campus);
    if (!result.success) throw new Error(result.error || '讀取失敗');
    state = normalizeState(result.state, campus);
    localStorage.setItem(`bp-junkbot-spectator-cache-${campus}`, JSON.stringify(state));
    connectionOk = true;
    setSync('', '已連線');
    if (role === 'control') renderControl();
    if (role === 'audience') renderAudience();
  } catch (error) {
    connectionOk = false;
    setSync('error', '連線失敗');
    if (role === 'audience') {
      const cached = localStorage.getItem(`bp-junkbot-spectator-cache-${campus}`);
      if (cached) {
        try { state = normalizeState(JSON.parse(cached), campus); } catch (cacheError) { /* 保留目前畫面 */ }
      }
      renderAudience();
    }
    if (!silent) showToast(`無法讀取賽事：${error.message}`, true);
  }
}

function saveState(message) {
  state.updatedAt = new Date().toISOString();
  const snapshot = JSON.parse(JSON.stringify(state));
  setSync('saving', '儲存中');
  syncQueue = syncQueue
    .catch(() => null)
    .then(async () => {
      const result = await apiPost({
        action: 'junkbot-state-set',
        password: CONTROL_PASSWORD,
        campus,
        state: snapshot,
      });
      if (!result.success) throw new Error(result.error || '儲存失敗');
      localStorage.setItem(`bp-junkbot-spectator-cache-${campus}`, JSON.stringify(snapshot));
      connectionOk = true;
      setSync('', '已儲存');
      if (message) showToast(message);
      return result;
    })
    .catch((error) => {
      setSync('error', '儲存失敗');
      showToast(`儲存失敗：${error.message}`, true);
    });
  return syncQueue;
}

function setSync(className, text) {
  const node = $('syncStatus');
  if (!node) return;
  node.className = `sync-status ${className || ''}`;
  const label = node.querySelector('b');
  if (label) label.textContent = text;
}

function showCampusChooser(nextRole) {
  role = nextRole;
  $('roleGrid').hidden = true;
  $('passwordPanel').hidden = true;
  $('campusPanel').hidden = false;
  $('campusPrompt').textContent = nextRole === 'control' ? '請選擇要管理的校區' : '請選擇要觀看的校區';
}

async function enterApp(campusId) {
  campus = campusId;
  state = emptyState(campus);
  $('gate').hidden = true;
  if (role === 'control') {
    $('controlApp').hidden = false;
    $('controlCampusName').textContent = CAMPUS[campus].name;
    controlView = 'dashboard';
    renderControl();
  } else {
    $('audienceApp').hidden = false;
    $('audienceCampusName').textContent = CAMPUS[campus].name;
    const cached = localStorage.getItem(`bp-junkbot-spectator-cache-${campus}`);
    if (cached) {
      try { state = normalizeState(JSON.parse(cached), campus); } catch (error) { /* 使用空白狀態 */ }
    }
    renderAudience();
  }
  startClockTicker();
  if (role === 'audience') {
    clearInterval(audienceRefresh);
    audienceRefresh = setInterval(() => loadCampusState(true), 6500 + Math.floor(Math.random() * 1800));
  }
  await loadCampusState();
}

function leaveApp() {
  clearInterval(audienceRefresh);
  clearInterval(clockTicker);
  audienceRefresh = null;
  clockTicker = null;
  role = null;
  campus = null;
  arenaOpen = false;
  $('controlApp').hidden = true;
  $('audienceApp').hidden = true;
  $('arenaRoot').innerHTML = '';
  $('modalRoot').innerHTML = '';
  $('gate').hidden = false;
  $('roleGrid').hidden = false;
  $('campusPanel').hidden = true;
  $('passwordPanel').hidden = true;
  $('controlPassword').value = '';
}

function openCampusSwitch() {
  clearInterval(audienceRefresh);
  clearInterval(clockTicker);
  audienceRefresh = null;
  clockTicker = null;
  $('controlApp').hidden = true;
  $('audienceApp').hidden = true;
  $('arenaRoot').innerHTML = '';
  arenaOpen = false;
  $('gate').hidden = false;
  $('roleGrid').hidden = true;
  $('passwordPanel').hidden = true;
  $('campusPanel').hidden = false;
  $('campusPrompt').textContent = role === 'control' ? '請切換要管理的校區' : '請切換要觀看的校區';
}

function initAccess() {
  $('roleGrid').addEventListener('click', (event) => {
    const button = event.target.closest('[data-role]');
    if (!button) return;
    const chosen = button.dataset.role;
    if (chosen === 'audience') showCampusChooser('audience');
    if (chosen === 'control') {
      role = 'control';
      $('roleGrid').hidden = true;
      $('passwordPanel').hidden = false;
      setTimeout(() => $('controlPassword').focus(), 50);
    }
  });
  $('passwordPanel').addEventListener('submit', (event) => {
    event.preventDefault();
    if ($('controlPassword').value !== CONTROL_PASSWORD) {
      $('passwordError').hidden = false;
      return;
    }
    $('passwordError').hidden = true;
    showCampusChooser('control');
  });
  $('campusPanel').addEventListener('click', (event) => {
    const button = event.target.closest('[data-campus]');
    if (button) enterApp(button.dataset.campus);
  });
  $('backToRoles').addEventListener('click', () => {
    role = null;
    $('campusPanel').hidden = true;
    $('passwordPanel').hidden = true;
    $('roleGrid').hidden = false;
  });
  $('leaveControl').addEventListener('click', leaveApp);
  $('leaveAudience').addEventListener('click', leaveApp);
  $('switchCampusControl').addEventListener('click', openCampusSwitch);
  $('switchCampusAudience').addEventListener('click', openCampusSwitch);
}

function renderControl() {
  $('controlCampusName').textContent = CAMPUS[campus].name;
  document.querySelectorAll('.topbar [data-view]').forEach((button) => {
    button.classList.toggle('active', button.dataset.view === controlView);
  });
  const root = $('controlView');
  if (controlView === 'teams') root.innerHTML = teamsView();
  else if (controlView === 'bracket') root.innerHTML = bracketView(true);
  else root.innerHTML = dashboardView();
}

function dashboardView() {
  const completed = state.matches.filter((item) => item.status === 'completed' && item.resultType !== 'bye').length;
  const pending = state.matches.find((item) => item.status === 'pending' && item.participantIds.filter(Boolean).length === 2);
  const current = state.activeMatchId ? match(state.activeMatchId) : null;
  const next = current && current.status !== 'completed' ? current : pending;
  return `
    <div class="page-heading">
      <div><span class="kicker">TOURNAMENT CONTROL · ${esc(CAMPUS[campus].short)}</span><h1>${esc(CAMPUS[campus].name)}賽事指揮台</h1><p>一分鐘不停錶，晉級結果由現場評審確認。</p></div>
      <button class="outline" data-action="refresh">↻ 更新資料</button>
    </div>
    <div class="dashboard-grid">
      <section class="dashboard-hero">
        <span class="section-kicker">2026 JUNK ROBOT ARENA</span>
        <h2>從廢材選廢秀，<br>一路闖進冠亞軍。</h2>
        <p>名單、選廢秀、16 強、8 強、4 強、季軍戰與冠亞軍戰，都依 ${esc(CAMPUS[campus].name)} 獨立保存。</p>
        <div class="stat-row">
          <div class="stat-card"><strong>${state.entries.length}</strong><span>參賽隊伍</span></div>
          <div class="stat-card"><strong>${completed}</strong><span>已完成賽事</span></div>
          <div class="stat-card"><strong>${state.entries.filter((item) => item.videoUrl).length}</strong><span>選廢秀影片</span></div>
        </div>
        <div class="dashboard-actions">
          <button class="primary" data-view-jump="teams">＋ 管理選手名單</button>
          <button class="outline" data-view-jump="bracket">查看完整賽程</button>
          ${next ? `<button class="danger" data-start-match="${esc(next.id)}">開啟下一場 →</button>` : ''}
        </div>
      </section>
      <aside class="dashboard-side">
        <span class="section-kicker">NEXT IN ARENA</span>
        <h3>下一場比賽</h3>
        ${next ? `
          <div class="next-match">
            <small>${esc(STAGE_LABELS[next.stage])} · 第 ${next.order + 1} 場</small>
            <strong>即將進入一分鐘對決</strong>
            <div class="versus"><b>${esc(teamName(next.participantIds[0]))}</b><span>VS</span><b>${esc(teamName(next.participantIds[1]))}</b></div>
          </div>
        ` : `<div class="hint">${state.matches.length ? '賽程已全部完成。' : '完成隊伍名單後即可建立淘汰賽。'}</div>`}
        <ul class="rule-list">
          <li><b>60 秒不停錶</b>，開始後不中斷計時。</li>
          <li>每場最多 <b>重賽一次</b>，須由評審判定。</li>
          <li>掉出場外、停止 10 秒、未離開起始區等依簡章判負。</li>
          <li>比賽結果由 <b>現場評審最終確認</b>。</li>
        </ul>
      </aside>
    </div>
  `;
}

function teamsView() {
  return `
    <div class="page-heading">
      <div><span class="kicker">PLAYERS & SHOWCASE · ${esc(CAMPUS[campus].short)}</span><h1>選手與選廢秀</h1><p>隊名、選手與影片只會出現在 ${esc(CAMPUS[campus].name)}。</p></div>
      <span class="hint">${state.entries.length}/16 隊</span>
    </div>
    <section class="panel">
      <div class="panel-head"><div><span class="section-kicker">ADD ONE TEAM</span><h2>新增一支隊伍</h2></div></div>
      <form class="form-row" id="addTeamForm">
        <label class="field"><span>隊名 *</span><input name="teamName" required placeholder="例：齒輪暴走隊"></label>
        <label class="field"><span>選手名字 *</span><input name="playerName" required placeholder="例：陳小明"></label>
        <button class="primary" type="submit">新增隊伍</button>
      </form>
    </section>
    <section class="panel">
      <div class="panel-head"><div><span class="section-kicker">BULK IMPORT</span><h2>一次貼上全部名單</h2><p>每行一隊，使用「隊名｜選手名字」或直接貼試算表兩欄。</p></div></div>
      <div class="import-grid">
        <label class="field"><span>批次名單</span><textarea id="bulkRoster" placeholder="紙箱霸王｜王小美&#10;螺絲衝鋒隊｜李大同"></textarea></label>
        <div>
          <div class="hint">正式 16 強建議剛好 16 隊；少於 16 隊時系統會以輪空自動晉級。建立賽程後，若要改名單請先重設賽程。</div>
          <button class="outline" data-action="import-roster" style="margin-top:14px">匯入名單</button>
        </div>
      </div>
    </section>
    <section class="panel">
      <div class="panel-head"><div><span class="section-kicker">CAMPUS ROSTER</span><h2>${esc(CAMPUS[campus].name)}隊伍名單</h2></div></div>
      ${state.entries.length ? `<div class="team-list">${state.entries.map((item, index) => teamRow(item, index)).join('')}</div>` : `
        <div class="empty-card"><img src="assets/mascot-tiaotiao.png" alt=""><h2>這個校區還沒有名單</h2><p>可逐隊新增，或從試算表一次貼上。</p></div>
      `}
    </section>
  `;
}

function teamRow(item, index) {
  return `
    <article class="team-row">
      <span class="seed">${String(index + 1).padStart(2, '0')}</span>
      <div><small>TEAM NAME</small><strong>${esc(item.teamName)}</strong></div>
      <div><small>PLAYER</small><strong>${esc(item.playerName)}</strong></div>
      <span class="video-status ${item.videoUrl ? '' : 'none'}">${item.videoUrl ? '▶ 已有選廢秀影片' : '尚未設定影片'}</span>
      <div class="row-actions">
        ${item.videoUrl ? `<button data-watch-team="${esc(item.id)}">觀看</button>` : ''}
        <button data-edit-team="${esc(item.id)}">編輯／影片</button>
        <button class="delete" data-delete-team="${esc(item.id)}">刪除</button>
      </div>
    </article>
  `;
}

function bracketView(control) {
  if (!state.matches.length) {
    return `
      <div class="page-heading">
        <div><span class="kicker">SINGLE ELIMINATION · ${esc(CAMPUS[campus].short)}</span><h1>淘汰晉級賽程</h1><p>16 強 → 8 強 → 4 強 → 季軍賽與冠亞軍賽。</p></div>
      </div>
      <div class="empty-card">
        <img src="assets/mascot-bengbeng.png" alt="">
        <h2>尚未建立賽程</h2>
        <p>${state.entries.length ? `目前已有 ${state.entries.length} 支隊伍，建立時會隨機排入對戰。` : '請先建立這個校區的隊伍名單。'}</p>
        ${control ? `<button class="primary" data-action="create-bracket" ${state.entries.length < 2 ? 'disabled' : ''}>建立淘汰賽程</button>` : ''}
      </div>
    `;
  }
  const podium = `
    <div class="podium">
      <div><div><span>🏆 冠軍</span><strong>${esc(teamName(state.championId, '尚未產生'))}</strong></div></div>
      <div><div><span>🥈 亞軍</span><strong>${esc(teamName(state.runnerUpId, '尚未產生'))}</strong></div></div>
      <div><div><span>🥉 季軍</span><strong>${esc(teamName(state.thirdPlaceId, '尚未產生'))}</strong></div></div>
    </div>`;
  const climbStages = ['r16', 'quarter', 'semi', 'final'];
  const columns = climbStages.map((stage, index) => `
    <section class="bracket-column stage-${stage}">
      <div class="level-tag"><span>LEVEL ${index + 1}</span><b>${index === 3 ? '最高點' : '向上晉級 ↗'}</b></div>
      <h3>${esc(STAGE_LABELS[stage])}</h3>
      <div class="match-stack">${stageMatches(stage).map((item) => matchCard(item, control)).join('')}</div>
    </section>`).join('');
  const bronzeMatch = stageMatches('bronze')[0];
  return `
    <div class="page-heading">
      <div><span class="kicker">CLIMBING BRACKET · ${esc(CAMPUS[campus].short)}</span><h1>${control ? '晉級爬升圖' : '今日晉級爬升圖'}</h1><p>從左下 16 強一路向上爬升到冠軍最高點；季軍戰為四強落敗支線。</p></div>
      ${control ? `<button class="outline" data-action="reset-bracket">重設賽程</button>` : ''}
    </div>
    ${podium}
    <div class="bracket-scroll">
      <div class="climb-bracket">
        <div class="climb-summit"><span>🏆</span><small>CHAMPION SUMMIT</small><strong>${esc(teamName(state.championId, '等待登頂'))}</strong></div>
        <div class="climb-route" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
        <div class="bracket">${columns}</div>
        ${bronzeMatch ? `
          <section class="bronze-lane">
            <div><span>4 強落敗支線</span><h3>🥉 季軍賽</h3><p>不影響主爬升路徑，勝隊取得季軍。</p></div>
            ${matchCard(bronzeMatch, control)}
          </section>` : ''}
      </div>
    </div>
  `;
}

function matchCard(item, control) {
  const playable = item.status === 'pending' && item.participantIds.filter(Boolean).length === 2;
  const active = state.activeMatchId === item.id && item.status !== 'completed';
  return `
    <article class="match-card ${item.status === 'completed' ? 'completed' : ''} ${active ? 'live' : ''}">
      <small>${esc(item.label)}</small>
      ${item.participantIds.map((id) => `
        <button class="match-team ${item.winnerId === id && id ? 'winner' : ''}" ${id ? `data-watch-team="${esc(id)}"` : 'disabled'}>
          <b>${esc(teamName(id, '等待晉級'))}</b><span>${id ? esc(entry(id)?.playerName || '') : '—'}</span>
        </button>`).join('')}
      <footer>
        <span>${item.status === 'completed' ? (item.resultType === 'bye' ? '輪空晉級' : `勝：${esc(teamName(item.winnerId))}`) : active ? '賽場進行中' : '等待比賽'}</span>
        ${control && playable ? `<button data-start-match="${esc(item.id)}">${active ? '回到賽場' : '開啟賽場'}</button>` : ''}
      </footer>
    </article>`;
}

function renderAudience() {
  $('audienceCampusName').textContent = CAMPUS[campus].name;
  const rawLiveMatch = state.live?.matchId ? match(state.live.matchId) : null;
  const liveMatch = state.live?.status !== 'completed' ? rawLiveMatch : null;
  const nextMatch = state.matches.find((item) => item.status === 'pending' && item.participantIds.filter(Boolean).length === 2);
  const featured = liveMatch || nextMatch;
  const liveState = liveMatch ? (state.live?.status || 'waiting') : 'waiting';
  const seconds = liveMatch ? audienceSecondsLeft() : 60;
  const teamA = featured?.participantIds?.[0] || null;
  const teamB = featured?.participantIds?.[1] || null;
  const timerText = formatTime(seconds);
  const stage = featured ? STAGE_LABELS[featured.stage] : '等待賽程';
  const statusText = liveState === 'running' ? '比賽進行中'
    : liveState === 'countdown' ? '準備倒數'
      : liveState === 'awaiting-decision' ? '等待評審判定'
        : featured ? '下一場準備中' : '等待比賽單位建立賽程';
  $('audienceView').innerHTML = `
    ${connectionOk ? '' : '<div class="hint" style="margin-bottom:18px"><b>網路連線較慢，先顯示最近一次戰況。</b> 系統正在背景自動重試，不需要重新整理頁面。</div>'}
    <section class="live-stage ${featured ? '' : 'waiting'} ${seconds <= 10 && liveState === 'running' ? 'final-ten' : ''}" id="audienceStage">
      ${featured ? `
        <div class="stage-team red">
          <button class="team-badge" data-watch-team="${esc(teamA || '')}">A</button>
          <h2>${esc(teamName(teamA))}</h2><p>${esc(entry(teamA)?.playerName || '')}</p>
        </div>
        <div class="stage-center">
          <small>${esc(stage)} · ${esc(CAMPUS[campus].short)} LIVE</small>
          <div class="audience-timer" id="audienceTimer">${timerText}</div>
          <strong>${esc(statusText)}</strong>
          <div class="stage-rule">一分鐘不停錶 · 現場評審判定勝負</div>
        </div>
        <div class="stage-team blue">
          <button class="team-badge" data-watch-team="${esc(teamB || '')}">B</button>
          <h2>${esc(teamName(teamB))}</h2><p>${esc(entry(teamB)?.playerName || '')}</p>
        </div>` : `
        <div class="stage-center"><img src="assets/mascot-bengbeng.png" alt="" style="width:180px;height:160px;object-fit:contain"><small>${esc(CAMPUS[campus].name)}</small><div class="audience-timer">--:--</div><strong>${esc(statusText)}</strong></div>
      `}
    </section>
    <div class="audience-grid">
      <section class="audience-panel">
        <span class="section-kicker">TODAY'S BRACKET</span>
        <h2>今日賽程進度</h2>
        ${state.matches.length ? state.matches.filter((item) => item.resultType !== 'bye').map((item, index) => `
          <div class="mini-match">
            <span class="number">${String(index + 1).padStart(2, '0')}</span>
            <div><strong>${esc(teamName(item.participantIds[0]))} VS ${esc(teamName(item.participantIds[1]))}</strong><small>${esc(STAGE_LABELS[item.stage])} · ${esc(item.label)}</small></div>
            <span class="status ${item.status === 'completed' ? 'done' : ''}">${item.status === 'completed' ? `勝 ${esc(teamName(item.winnerId))}` : state.activeMatchId === item.id ? '進行中' : '未開始'}</span>
          </div>`).join('') : '<div class="hint">賽程尚未建立，請稍候。</div>'}
      </section>
      <section class="audience-panel">
        <span class="section-kicker">JUNK SHOWCASE</span>
        <h2>廢材選廢秀</h2>
        <p style="color:var(--muted);margin-top:-10px">點隊名觀看這支隊伍的選廢秀影片。</p>
        <div class="showcase-grid">
          ${state.entries.length ? state.entries.map((item) => `
            <button class="showcase-card ${item.videoUrl ? '' : 'no-video'}" data-watch-team="${esc(item.id)}">
              <b>${esc(item.teamName)}</b><span>${esc(item.playerName)}</span><small>${item.videoUrl ? '點擊播放選廢秀' : '影片準備中'}</small>
            </button>`).join('') : '<div class="hint">本校區名單尚未公布。</div>'}
        </div>
      </section>
    </div>
    ${state.matches.length ? `<section style="margin-top:32px">${bracketView(false)}</section>` : ''}
  `;
}

function audienceSecondsLeft() {
  if (!state.live) return 60;
  if (state.live.status === 'running' && state.live.endsAt) {
    return Math.max(0, Math.ceil((new Date(state.live.endsAt).getTime() - Date.now()) / 1000));
  }
  return Number.isFinite(Number(state.live.secondsLeft)) ? Number(state.live.secondsLeft) : 60;
}

function formatTime(value) {
  const seconds = Math.max(0, Math.ceil(Number(value) || 0));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}

function addTeam(teamNameValue, playerNameValue) {
  if (state.matches.length) return showToast('請先重設賽程，才能修改名單。', true);
  if (state.entries.length >= 16) return showToast('正式賽程上限為 16 支隊伍。', true);
  const teamNameClean = String(teamNameValue || '').trim();
  const playerNameClean = String(playerNameValue || '').trim();
  if (!teamNameClean || !playerNameClean) return showToast('請填寫隊名與選手名字。', true);
  state.entries.push({
    id: uid('team'),
    teamName: teamNameClean,
    playerName: playerNameClean,
    videoUrl: '',
    videoName: '',
    createdAt: new Date().toISOString(),
  });
}

function parseRoster(text) {
  return String(text || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean).map((line) => {
    const parts = line.split(/\t|｜|\||,/).map((item) => item.trim()).filter(Boolean);
    return parts.length >= 2 ? { teamName: parts[0], playerName: parts.slice(1).join(' ') } : null;
  }).filter(Boolean);
}

function createBracket() {
  if (state.entries.length < 2) return showToast('至少需要 2 支隊伍。', true);
  if (state.entries.length > 16) return showToast('這個賽制最多 16 支隊伍。', true);
  const seeds = [...state.entries.map((item) => item.id)].sort(() => Math.random() - .5);
  while (seeds.length < 16) seeds.push(null);
  const matches = [];
  const add = (stage, count, sourceMatchIds = []) => {
    for (let i = 0; i < count; i += 1) {
      matches.push({
        id: `${stage}-${i + 1}-${Date.now().toString(36)}`,
        stage,
        order: i,
        label: `${STAGE_LABELS[stage]} ${String(i + 1).padStart(2, '0')}`,
        participantIds: [null, null],
        sourceMatchIds: sourceMatchIds[i] || [],
        status: 'pending',
        winnerId: null,
        loserId: null,
        reason: '',
        replays: 0,
        resultType: '',
      });
    }
  };
  add('r16', 8);
  add('quarter', 4);
  add('semi', 2);
  add('bronze', 1);
  add('final', 1);
  const r16 = matches.filter((item) => item.stage === 'r16');
  r16.forEach((item, index) => { item.participantIds = [seeds[index * 2], seeds[index * 2 + 1]]; });
  const quarter = matches.filter((item) => item.stage === 'quarter');
  quarter.forEach((item, index) => { item.sourceMatchIds = [r16[index * 2].id, r16[index * 2 + 1].id]; });
  const semi = matches.filter((item) => item.stage === 'semi');
  semi.forEach((item, index) => { item.sourceMatchIds = [quarter[index * 2].id, quarter[index * 2 + 1].id]; });
  matches.find((item) => item.stage === 'final').sourceMatchIds = semi.map((item) => item.id);
  matches.find((item) => item.stage === 'bronze').sourceMatchIds = semi.map((item) => item.id);
  state.matches = matches;
  state.activeMatchId = null;
  state.championId = null;
  state.runnerUpId = null;
  state.thirdPlaceId = null;
  state.live = null;
  resolveAutomaticMatches();
  saveState('淘汰賽程已建立');
  renderControl();
}

function resolveAutomaticMatches() {
  let changed = true;
  while (changed) {
    changed = false;
    state.matches.forEach((item) => {
      if (item.status !== 'pending') return;
      const sourcesReady = item.stage === 'r16' || item.sourceMatchIds.every((id) => match(id)?.status === 'completed');
      if (!sourcesReady) return;
      if (item.stage === 'bronze') {
        item.participantIds = item.sourceMatchIds.map((id) => match(id)?.loserId || null);
      }
      const participants = item.participantIds.filter(Boolean);
      if (participants.length < 2) {
        item.status = 'completed';
        item.resultType = 'bye';
        item.winnerId = participants[0] || null;
        item.loserId = null;
        propagateMatch(item);
        changed = true;
      }
    });
  }
}

function propagateMatch(item) {
  if (item.stage === 'final') {
    state.championId = item.winnerId;
    state.runnerUpId = item.loserId;
    return;
  }
  if (item.stage === 'bronze') {
    state.thirdPlaceId = item.winnerId;
    return;
  }
  const nextStage = item.stage === 'r16' ? 'quarter' : item.stage === 'quarter' ? 'semi' : 'final';
  const targetOrder = Math.floor(item.order / 2);
  const target = state.matches.find((candidate) => candidate.stage === nextStage && candidate.order === targetOrder);
  if (target) target.participantIds[item.order % 2] = item.winnerId || null;
  if (item.stage === 'semi') {
    const bronze = state.matches.find((candidate) => candidate.stage === 'bronze');
    if (bronze) bronze.participantIds[item.order] = item.loserId || null;
  }
}

function completeMatch(matchId, winnerId, reason) {
  const item = match(matchId);
  if (!item || !item.participantIds.includes(winnerId)) return;
  const loserId = item.participantIds.find((id) => id && id !== winnerId) || null;
  item.status = 'completed';
  item.winnerId = winnerId;
  item.loserId = loserId;
  item.reason = reason;
  item.resultType = 'judge';
  propagateMatch(item);
  resolveAutomaticMatches();
  state.activeMatchId = null;
  state.live = {
    matchId: item.id,
    status: 'completed',
    secondsLeft: arenaSecondsLeft(),
    winnerId,
    updatedAt: new Date().toISOString(),
  };
  arenaOpen = false;
  $('arenaRoot').innerHTML = '';
  closeModal();
  victorySound();
  saveState(`${teamName(winnerId)} 晉級成功`);
  renderControl();
}

function resetBracket() {
  if (!confirm('確定重設整份賽程？隊伍與選廢秀影片會保留，但所有比賽結果會清除。')) return;
  state.matches = [];
  state.activeMatchId = null;
  state.championId = null;
  state.runnerUpId = null;
  state.thirdPlaceId = null;
  state.live = null;
  saveState('賽程已重設，隊伍與影片皆保留');
  renderControl();
}

function openArena(matchId) {
  const item = match(matchId);
  if (!item || item.status === 'completed' || item.participantIds.filter(Boolean).length !== 2) return;
  state.activeMatchId = item.id;
  if (!state.live || state.live.matchId !== item.id || state.live.status === 'completed') {
    state.live = { matchId: item.id, status: 'ready', secondsLeft: 60, updatedAt: new Date().toISOString() };
    saveState();
  }
  arenaOpen = true;
  timeUpHandled = false;
  renderArena();
}

function arenaSecondsLeft() {
  if (!state.live) return 60;
  if (state.live.status === 'running' && state.live.endsAt) {
    return Math.max(0, Math.ceil((new Date(state.live.endsAt).getTime() - Date.now()) / 1000));
  }
  return Number.isFinite(Number(state.live.secondsLeft)) ? Number(state.live.secondsLeft) : 60;
}

function renderArena() {
  const item = state.activeMatchId ? match(state.activeMatchId) : null;
  if (!arenaOpen || !item) {
    $('arenaRoot').innerHTML = '';
    return;
  }
  const status = state.live?.status || 'ready';
  const seconds = arenaSecondsLeft();
  const label = status === 'running' ? '比賽進行中'
    : status === 'countdown' ? 'READY'
      : status === 'awaiting-decision' ? '時間到・請評審判定'
        : '等待開始';
  const display = status === 'countdown' ? String(state.live.preCount || 3) : formatTime(seconds);
  $('arenaRoot').innerHTML = `
    <section class="arena-overlay ${status === 'countdown' ? 'counting' : ''} ${status === 'running' && seconds <= 10 ? 'final-ten' : ''}" id="arenaOverlay">
      <div class="arena">
        <header class="arena-header">
          <img src="assets/junkbot-logo.png" alt="">
          <div><small>${esc(STAGE_LABELS[item.stage])} · ${esc(CAMPUS[campus].name)}</small><strong>${esc(item.label)}</strong></div>
          <button class="outline" data-action="close-arena">離開賽場 ×</button>
        </header>
        <div class="arena-main">
          <div class="arena-team">
            <div class="team-badge">A</div><h2>${esc(teamName(item.participantIds[0]))}</h2><p>${esc(entry(item.participantIds[0])?.playerName || '')}</p>
          </div>
          <div class="arena-clock">
            <small>ONE MINUTE · NO PAUSE</small>
            <div class="timer" id="arenaTimer">${display}</div>
            <div class="state-label" id="arenaStateLabel">${esc(label)}</div>
            <div class="arena-controls">
              ${status === 'ready' ? `<button class="start" data-action="start-countdown">READY・3・2・1</button>` : ''}
              ${status === 'running' || status === 'awaiting-decision' ? `<button data-action="judge-decision">評審判定勝負</button>` : ''}
              ${status === 'awaiting-decision' && item.replays < 1 ? `<button data-action="request-replay">重賽一次</button>` : ''}
            </div>
          </div>
          <div class="arena-team">
            <div class="team-badge" style="background:var(--blue-dark)">B</div><h2>${esc(teamName(item.participantIds[1]))}</h2><p>${esc(entry(item.participantIds[1])?.playerName || '')}</p>
          </div>
        </div>
        <footer class="arena-footer">掉出場外、停止移動超過 10 秒、未離開起始區、惡意觸碰等，依簡章由評審判定。</footer>
      </div>
    </section>`;
}

async function startCountdown() {
  if (!state.live || state.live.status !== 'ready') return;
  ensureAudio();
  state.live.status = 'countdown';
  state.live.preCount = 3;
  state.live.secondsLeft = 60;
  state.live.updatedAt = new Date().toISOString();
  await saveState();
  readySound();
  renderArena();
  for (let number = 3; number >= 1; number -= 1) {
    state.live.preCount = number;
    countSound(number);
    renderArena();
    await new Promise((resolve) => setTimeout(resolve, 900));
  }
  startSound();
  const now = Date.now();
  state.live.status = 'running';
  state.live.startedAt = new Date(now).toISOString();
  state.live.endsAt = new Date(now + 60000).toISOString();
  state.live.secondsLeft = 60;
  state.live.preCount = null;
  state.live.updatedAt = new Date().toISOString();
  timeUpHandled = false;
  saveState();
  renderArena();
}

function handleTimeUp() {
  if (timeUpHandled || !state.live || state.live.status !== 'running') return;
  timeUpHandled = true;
  state.live.status = 'awaiting-decision';
  state.live.secondsLeft = 0;
  state.live.updatedAt = new Date().toISOString();
  finishSound();
  saveState();
  if (arenaOpen) renderArena();
  if (role === 'control') {
    showToast('時間到，請評審確認勝負。');
    if (!arenaOpen) renderControl();
  }
}

function replayMatch() {
  const item = state.activeMatchId ? match(state.activeMatchId) : null;
  if (!item || item.replays >= 1) return showToast('本場已使用過一次重賽。', true);
  if (!confirm('簡章規定每場最多重賽一次。確定啟動重賽？')) return;
  item.replays += 1;
  state.live = { matchId: item.id, status: 'ready', secondsLeft: 60, updatedAt: new Date().toISOString() };
  timeUpHandled = false;
  saveState('重賽已登記，請重新開始一分鐘倒數');
  renderArena();
}

function openDecisionModal() {
  const item = state.activeMatchId ? match(state.activeMatchId) : null;
  if (!item) return;
  openModal(`
    <div class="modal-head"><div><span class="section-kicker">JUDGE DECISION</span><h2>評審確認哪一隊晉級</h2></div><button data-close-modal>×</button></div>
    <div class="modal-body">
      <label class="field"><span>判定原因</span><select id="decisionReason">${DECISION_REASONS.map((reason) => `<option>${esc(reason)}</option>`).join('')}</select></label>
      <div class="decision-grid">
        <button data-winner-id="${esc(item.participantIds[0])}">A 隊晉級<br>${esc(teamName(item.participantIds[0]))}</button>
        <button data-winner-id="${esc(item.participantIds[1])}">B 隊晉級<br>${esc(teamName(item.participantIds[1]))}</button>
      </div>
      <p class="hint">按下後會立刻寫入賽程並推進下一輪；評審判定為最終結果。</p>
    </div>`);
}

function startClockTicker() {
  clearInterval(clockTicker);
  clockTicker = setInterval(() => {
    if (state.live?.status === 'running') {
      const seconds = arenaSecondsLeft();
      if (seconds <= 0) handleTimeUp();
      if (arenaOpen) {
        const timer = $('arenaTimer');
        if (timer) timer.textContent = formatTime(seconds);
        const overlay = $('arenaOverlay');
        if (overlay) overlay.classList.toggle('final-ten', seconds <= 10);
        if (seconds <= 10 && seconds > 0 && state.live._lastBeep !== seconds) {
          state.live._lastBeep = seconds;
          finalTickSound(seconds);
        }
      }
      if (role === 'audience') {
        const timer = $('audienceTimer');
        if (timer) timer.textContent = formatTime(seconds);
        const stage = $('audienceStage');
        if (stage) stage.classList.toggle('final-ten', seconds <= 10);
      }
    }
  }, 200);
}

function openModal(content, wide = false) {
  $('modalRoot').innerHTML = `<div class="modal-backdrop"><section class="modal ${wide ? 'wide' : ''}">${content}</section></div>`;
}

function closeModal() {
  $('modalRoot').innerHTML = '';
}

function openTeamEditor(teamId) {
  const item = entry(teamId);
  if (!item) return;
  openModal(`
    <div class="modal-head"><div><span class="section-kicker">TEAM & SHOWCASE</span><h2>隊伍資料與選廢秀</h2></div><button data-close-modal>×</button></div>
    <form class="modal-body" id="teamEditorForm">
      <input type="hidden" name="teamId" value="${esc(item.id)}">
      <div class="import-grid">
        <label class="field"><span>隊名</span><input name="teamName" required value="${esc(item.teamName)}" ${state.matches.length ? 'readonly' : ''}></label>
        <label class="field"><span>選手名字</span><input name="playerName" required value="${esc(item.playerName)}" ${state.matches.length ? 'readonly' : ''}></label>
      </div>
      <label class="field" style="margin-top:15px"><span>影片網址（YouTube、Google Drive 或 mp4）</span><input name="videoUrl" value="${esc(item.videoUrl || '')}" placeholder="https://..."></label>
      <label class="field" style="margin-top:15px"><span>或直接上傳影片（建議 18MB 以下）</span><input name="videoFile" type="file" accept="video/*"></label>
      <p class="upload-progress" id="uploadProgress" hidden>正在上傳影片，請勿關閉畫面…</p>
      <div class="modal-actions">
        ${item.videoUrl ? `<button class="outline" type="button" data-watch-team="${esc(item.id)}">先觀看</button>` : ''}
        <button class="primary" type="submit">儲存隊伍與影片</button>
      </div>
    </form>`, true);
}

async function saveTeamEditor(form) {
  const data = new FormData(form);
  const item = entry(data.get('teamId'));
  if (!item) return;
  const teamNameValue = String(data.get('teamName') || '').trim();
  const playerNameValue = String(data.get('playerName') || '').trim();
  const url = String(data.get('videoUrl') || '').trim();
  const file = data.get('videoFile');
  if (!teamNameValue || !playerNameValue) return showToast('隊名與選手名字不能空白。', true);
  if (!state.matches.length) {
    item.teamName = teamNameValue;
    item.playerName = playerNameValue;
  }
  if (url) {
    item.videoUrl = url;
    item.videoName = '外部影片';
  }
  if (file && file.size) {
    if (file.size > 18 * 1024 * 1024) return showToast('影片超過 18MB，請壓縮或改貼 YouTube／Drive 網址。', true);
    $('uploadProgress').hidden = false;
    const dataUrl = await fileToDataUrl(file);
    const result = await apiPost({
      action: 'junkbot-video-upload',
      password: CONTROL_PASSWORD,
      campus,
      teamId: item.id,
      teamName: item.teamName,
      filename: file.name,
      mimeType: file.type || 'video/mp4',
      dataUrl,
    });
    if (!result.success) {
      $('uploadProgress').hidden = true;
      return showToast(`影片上傳失敗：${result.error || '未知錯誤'}`, true);
    }
    item.videoUrl = result.previewUrl || result.url;
    item.videoName = file.name;
  }
  closeModal();
  await saveState('隊伍與選廢秀影片已儲存');
  renderControl();
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function videoMarkup(item) {
  const url = String(item.videoUrl || '').trim();
  if (!url) return '<div class="hint">這支隊伍的選廢秀影片還在準備中。</div>';
  const youtube = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([^?&/]+)/i);
  if (youtube) return `<iframe class="video-frame" src="https://www.youtube.com/embed/${esc(youtube[1])}" title="${esc(item.teamName)}選廢秀" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
  const drive = url.match(/drive\.google\.com\/file\/d\/([^/]+)/i);
  if (drive) return `<iframe class="video-frame" src="https://drive.google.com/file/d/${esc(drive[1])}/preview" title="${esc(item.teamName)}選廢秀" allow="autoplay" allowfullscreen></iframe>`;
  if (/\.(mp4|webm|mov)(\?|$)/i.test(url) || url.startsWith('data:video/')) {
    return `<video class="video-player" src="${esc(url)}" controls playsinline></video>`;
  }
  return `<iframe class="video-frame" src="${esc(url)}" title="${esc(item.teamName)}選廢秀" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen></iframe>`;
}

function watchTeam(teamId) {
  const item = entry(teamId);
  if (!item) return;
  openModal(`
    <div class="modal-head"><div><span class="section-kicker">廢材選廢秀 · ${esc(CAMPUS[campus].short)}</span><h2>${esc(item.teamName)}</h2><p style="margin:5px 0;color:var(--muted)">${esc(item.playerName)}</p></div><button data-close-modal>×</button></div>
    <div class="modal-body">${videoMarkup(item)}</div>`, true);
}

function ensureAudio() {
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
}

function tone(frequency, duration, type = 'square', gain = .12, delay = 0) {
  ensureAudio();
  const oscillator = audioContext.createOscillator();
  const volume = audioContext.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime + delay);
  volume.gain.setValueAtTime(.0001, audioContext.currentTime + delay);
  volume.gain.exponentialRampToValueAtTime(gain, audioContext.currentTime + delay + .015);
  volume.gain.exponentialRampToValueAtTime(.0001, audioContext.currentTime + delay + duration);
  oscillator.connect(volume).connect(audioContext.destination);
  oscillator.start(audioContext.currentTime + delay);
  oscillator.stop(audioContext.currentTime + delay + duration + .03);
}

function readySound() { [180, 240, 320].forEach((f, i) => tone(f, .25, 'sawtooth', .09, i * .08)); }
function countSound(number) { tone(number === 1 ? 480 : 300, .28, 'square', .18); tone(90, .2, 'sine', .2); }
function startSound() { [330, 440, 660, 880].forEach((f, i) => tone(f, .45, 'square', .12, i * .07)); }
function finalTickSound(seconds) { tone(seconds <= 3 ? 760 : 520, .18, 'square', .17); tone(78, .12, 'sine', .2); }
function finishSound() { [520, 390, 260, 130].forEach((f, i) => tone(f, .42, 'sawtooth', .14, i * .11)); }
function victorySound() { [392, 523, 659, 784].forEach((f, i) => tone(f, .7, 'triangle', .12, i * .12)); }

function bindControlEvents() {
  document.querySelector('.topbar').addEventListener('click', (event) => {
    const viewButton = event.target.closest('[data-view]');
    if (!viewButton) return;
    controlView = viewButton.dataset.view;
    renderControl();
  });
  $('controlView').addEventListener('click', (event) => {
    const viewJump = event.target.closest('[data-view-jump]');
    if (viewJump) {
      controlView = viewJump.dataset.viewJump;
      return renderControl();
    }
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'refresh') loadCampusState();
    if (action === 'import-roster') {
      if (state.matches.length) return showToast('請先重設賽程，才能修改名單。', true);
      const rows = parseRoster($('bulkRoster')?.value);
      const room = 16 - state.entries.length;
      if (!rows.length) return showToast('沒有讀到有效名單，請確認每行都有隊名與選手。', true);
      rows.slice(0, room).forEach((row) => addTeam(row.teamName, row.playerName));
      saveState(`已匯入 ${Math.min(rows.length, room)} 支隊伍`);
      renderControl();
    }
    if (action === 'create-bracket') {
      const warning = state.entries.length === 16 ? '將隨機排入完整 16 強，確定建立？' : `目前 ${state.entries.length} 隊，不足 16 隊的席位會輪空，確定建立？`;
      if (confirm(warning)) createBracket();
    }
    if (action === 'reset-bracket') resetBracket();
    const start = event.target.closest('[data-start-match]');
    if (start) openArena(start.dataset.startMatch);
    const edit = event.target.closest('[data-edit-team]');
    if (edit) openTeamEditor(edit.dataset.editTeam);
    const remove = event.target.closest('[data-delete-team]');
    if (remove) {
      if (state.matches.length) return showToast('請先重設賽程，才能刪除隊伍。', true);
      const item = entry(remove.dataset.deleteTeam);
      if (item && confirm(`確定刪除「${item.teamName}」？其他隊伍與影片不受影響。`)) {
        state.entries = state.entries.filter((candidate) => candidate.id !== item.id);
        saveState('隊伍已刪除');
        renderControl();
      }
    }
    const watch = event.target.closest('[data-watch-team]');
    if (watch && watch.dataset.watchTeam) watchTeam(watch.dataset.watchTeam);
  });
  $('controlView').addEventListener('submit', (event) => {
    if (event.target.id !== 'addTeamForm') return;
    event.preventDefault();
    const data = new FormData(event.target);
    const before = state.entries.length;
    addTeam(data.get('teamName'), data.get('playerName'));
    if (state.entries.length > before) {
      event.target.reset();
      saveState('隊伍已新增');
      renderControl();
    }
  });
}

function bindDynamicEvents() {
  $('arenaRoot').addEventListener('click', (event) => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'close-arena') {
      arenaOpen = false;
      $('arenaRoot').innerHTML = '';
      renderControl();
    }
    if (action === 'start-countdown') startCountdown();
    if (action === 'judge-decision') openDecisionModal();
    if (action === 'request-replay') replayMatch();
  });
  $('modalRoot').addEventListener('click', (event) => {
    if (event.target.matches('.modal-backdrop') || event.target.closest('[data-close-modal]')) return closeModal();
    const winner = event.target.closest('[data-winner-id]');
    if (winner) {
      const reason = $('decisionReason')?.value || DECISION_REASONS.at(-1);
      if (confirm(`確定由「${teamName(winner.dataset.winnerId)}」晉級？`)) completeMatch(state.activeMatchId, winner.dataset.winnerId, reason);
    }
    const watch = event.target.closest('[data-watch-team]');
    if (watch) watchTeam(watch.dataset.watchTeam);
  });
  $('modalRoot').addEventListener('submit', (event) => {
    if (event.target.id !== 'teamEditorForm') return;
    event.preventDefault();
    saveTeamEditor(event.target).catch((error) => showToast(error.message, true));
  });
  $('audienceView').addEventListener('click', (event) => {
    const watch = event.target.closest('[data-watch-team]');
    if (watch?.dataset.watchTeam) watchTeam(watch.dataset.watchTeam);
  });
}

initAccess();
bindControlEvents();
bindDynamicEvents();
