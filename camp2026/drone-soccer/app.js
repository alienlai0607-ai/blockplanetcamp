/* ========================================
   布拉克星球 無人機足球晉級賽系統
   後端：camp2026 Apps Script（無人機駕照 / 無人機賽事 分頁）
   ?demo=1 可用本機示範模式（localStorage，不寫入正式資料）
   ======================================== */
'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbzaEt0Asg5lRiUtRE4ZoceRVoiowSYSV68jMAd87SO3NhtV5fRUjuWmC5w_WTtQxj7T/exec';
const DEMO = new URLSearchParams(location.search).has('demo');

const MASCOT_PORTRAITS = [
  'assets/xiaobu.jpeg',
  'assets/lala.jpg',
  'assets/aqiu.jpg',
  'assets/keke.jpg',
  'assets/xingxing.jpg',
];

const EMPTY_STATE = () => ({
  checkedInIds: [],
  groups: [],
  matches: [],
  activeMatchId: null,
  championId: null,
});

// ===== 全域狀態 =====
let pilots = [];
let eventState = EMPTY_STATE();
let section = 'home';
let saving = false;
let pilotSearch = '';
let showLicenseForm = false;
let selectedPilotId = null;
let photoDataUrl = null;
let timerStatus = 'ready'; // ready | countdown | running | paused | finished
let secondsLeft = 180;
let preCount = null;
let audioEnabled = true;
let audioContext = null;
let musicStep = 0;
let timerInterval = null;
let crunchInterval = null;

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function pilotMap() { return new Map(pilots.map((p) => [p.id, p])); }
function getPilot(id) { return pilots.find((p) => p.id === id) || null; }
function checkedInPilots() {
  const map = pilotMap();
  return eventState.checkedInIds.map((id) => map.get(id)).filter(Boolean);
}
function activeMatch() {
  return eventState.matches.find((m) => m.id === eventState.activeMatchId) || null;
}
function completedMatches() {
  return eventState.matches.filter((m) => m.status === 'complete').length;
}
function portraitFor(pilot, index = 0) {
  return pilot.photoUrl || MASCOT_PORTRAITS[index % MASCOT_PORTRAITS.length];
}
function formatClock(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m + ':' + String(s).padStart(2, '0');
}
function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const v = new Uint32Array(1);
    crypto.getRandomValues(v);
    const j = v[0] % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

// ===== API 層（Apps Script / 示範模式） =====
const demoStore = {
  read(key, fallback) {
    try { return JSON.parse(localStorage.getItem('drone-' + key)) || fallback; }
    catch (e) { return fallback; }
  },
  write(key, value) { localStorage.setItem('drone-' + key, JSON.stringify(value)); },
};

function apiError(message) {
  if (message === '無效的操作') return '後端尚未支援無人機系統，請先部署最新版 Apps Script';
  return message;
}
async function apiGet(action) {
  const res = await fetch(API_URL + '?action=' + action, { method: 'GET' });
  if (!res.ok) throw new Error('連線失敗（' + res.status + '）');
  const data = await res.json();
  if (data && data.success === false) throw new Error(apiError(data.error || '伺服器回報錯誤'));
  return data;
}
async function apiPost(payload) {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error('連線失敗（' + res.status + '）');
  const data = await res.json();
  if (data && data.success === false) throw new Error(apiError(data.error || '伺服器回報錯誤'));
  return data;
}

async function apiListPilots() {
  if (DEMO) return demoStore.read('pilots', []);
  const data = await apiGet('drone-pilots');
  return data.pilots || [];
}
async function apiCreatePilot(fields) {
  if (DEMO) {
    const list = demoStore.read('pilots', []);
    const pilot = {
      id: uuid(),
      licenseNo: 'BP-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 1000000)).padStart(6, '0'),
      name: fields.name, nickname: fields.nickname, phone: fields.phone,
      level: fields.level, photoUrl: fields.photo || null,
      wins: 0, matches: 0, createdAt: new Date().toISOString(),
    };
    list.unshift(pilot);
    demoStore.write('pilots', list);
    return pilot;
  }
  const data = await apiPost({ action: 'drone-pilot-add', ...fields });
  return data.pilot;
}
async function apiGetState() {
  if (DEMO) return demoStore.read('state', EMPTY_STATE());
  const data = await apiGet('drone-state');
  return data.state || EMPTY_STATE();
}
async function apiSaveState(state) {
  if (DEMO) { demoStore.write('state', state); return; }
  await apiPost({ action: 'drone-state-set', state });
}

// ===== 通知與儲存狀態 =====
let noticeTimer = null;
function setNotice(message) {
  const el = $('notice');
  if (!message) { el.hidden = true; return; }
  $('noticeText').textContent = message;
  el.hidden = false;
  clearTimeout(noticeTimer);
  noticeTimer = setTimeout(() => { el.hidden = true; }, 6000);
}
function setSaving(value) {
  saving = value;
  $('saveState').classList.toggle('busy', value);
  $('saveStateText').textContent = value ? '儲存中' : (DEMO ? '示範模式' : '已連線');
  const btn = $('createPilotBtn');
  btn.disabled = value;
  btn.textContent = value ? '建立中…' : '建立駕照';
}

async function commitState(next) {
  eventState = next;
  render();
  setSaving(true);
  try {
    await apiSaveState(next);
  } catch (error) {
    setNotice(error && error.message ? error.message : '賽事狀態尚未儲存');
  } finally {
    setSaving(false);
  }
}

// ===== 音效（Web Audio API 合成，無外部音樂檔） =====
function ensureAudio() {
  if (!audioEnabled) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  return audioContext;
}
function playTone(frequency, duration, type = 'sine', gainValue = 0.07, delay = 0) {
  const context = ensureAudio();
  if (!context) return;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
function playStartHorn() {
  playTone(196, 0.65, 'sawtooth', 0.09);
  playTone(294, 0.65, 'square', 0.045, 0.04);
  playTone(392, 0.65, 'triangle', 0.05, 0.08);
}
function playFinishHorn() {
  playTone(392, 0.22, 'square', 0.06);
  playTone(294, 0.22, 'square', 0.06, 0.23);
  playTone(196, 0.7, 'sawtooth', 0.08, 0.46);
}
function playHeartbeat() {
  playTone(72, 0.13, 'sine', 0.13);
  playTone(58, 0.16, 'sine', 0.1, 0.18);
}

// ===== 計時器 =====
function crunchTime() {
  return timerStatus === 'running' && secondsLeft <= 30 && secondsLeft > 0;
}
function setTimerStatus(next) {
  timerStatus = next;
  syncTimerLoops();
  renderMatchScreen();
}
function syncTimerLoops() {
  if (timerStatus === 'running' && !timerInterval) {
    timerInterval = setInterval(onTick, 1000);
  } else if (timerStatus !== 'running' && timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  if (crunchTime() && audioEnabled && !crunchInterval) {
    const notes = [196, 233, 293, 349, 293, 392, 349, 466];
    crunchInterval = setInterval(() => {
      const note = notes[musicStep % notes.length];
      playTone(note, 0.15, 'triangle', 0.035);
      if (musicStep % 4 === 0) playTone(note / 2, 0.22, 'sawtooth', 0.025);
      musicStep += 1;
    }, 250);
  } else if ((!crunchTime() || !audioEnabled) && crunchInterval) {
    clearInterval(crunchInterval);
    crunchInterval = null;
  }
}
function onTick() {
  secondsLeft = Math.max(0, secondsLeft - 1);
  if (secondsLeft === 0) {
    timerStatus = 'finished';
    playFinishHorn();
    syncTimerLoops();
    renderMatchScreen();
    return;
  }
  if (secondsLeft <= 30) {
    playHeartbeat();
    if (secondsLeft <= 10) playTone(680 + (10 - secondsLeft) * 22, 0.08, 'square', 0.055);
  }
  syncTimerLoops();
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const numberEl = $('timerNumber');
  if (!numberEl) return;
  numberEl.textContent = formatClock(secondsLeft);
  numberEl.classList.toggle('heartbeat-number', secondsLeft <= 30);
  const caption = $('timerCaption');
  if (caption) caption.textContent = timerCaptionText();
  const screen = document.querySelector('.match-screen');
  if (screen) screen.classList.toggle('crunch', crunchTime());
}
function timerCaptionText() {
  if (timerStatus === 'ready') return 'READY TO FLY';
  if (timerStatus === 'countdown') return 'GET READY';
  if (timerStatus === 'running') return secondsLeft <= 30 ? 'FINAL 30 • HOLD YOUR LINE' : 'MATCH IN PROGRESS';
  if (timerStatus === 'paused') return 'MATCH PAUSED';
  return "TIME'S UP";
}

// ===== 動作 =====
function handleCheckIn(event) {
  event.preventDefault();
  const input = $('license-lookup');
  const normalized = input.value.replace(/\s/g, '').toUpperCase();
  if (!normalized) return;
  const pilot = pilots.find((p) => p.licenseNo.replace(/\s/g, '').toUpperCase() === normalized);
  if (!pilot) {
    setNotice('找不到這個駕照編號，請再確認一次。');
    return;
  }
  if (eventState.checkedInIds.includes(pilot.id)) {
    setNotice(pilot.name + ' 已經完成報到。');
    return;
  }
  commitState({ ...eventState, checkedInIds: [...eventState.checkedInIds, pilot.id] });
  input.value = '';
  setNotice('歡迎 ' + pilot.name + '，報到完成！');
}

function directCheckIn(pilotId) {
  const pilot = getPilot(pilotId);
  if (!pilot || eventState.checkedInIds.includes(pilot.id)) return;
  commitState({ ...eventState, checkedInIds: [...eventState.checkedInIds, pilot.id] });
  setNotice(pilot.name + ' 報到完成！');
}

async function handleCreatePilot(event) {
  event.preventDefault();
  const form = $('licenseForm');
  const name = form.elements.name.value.trim();
  if (!name) { setNotice('請輸入駕駛員姓名'); return; }
  setSaving(true);
  try {
    const pilot = await apiCreatePilot({
      name,
      nickname: form.elements.nickname.value.trim(),
      phone: form.elements.phone.value.trim(),
      level: form.elements.level.value,
      photo: photoDataUrl || '',
    });
    pilots.unshift(pilot);
    selectedPilotId = pilot.id;
    showLicenseForm = false;
    photoDataUrl = null;
    form.reset();
    setNotice('駕照 ' + pilot.licenseNo + ' 已建立。');
    render();
  } catch (error) {
    setNotice(error && error.message ? error.message : '駕照建立失敗');
  } finally {
    setSaving(false);
  }
}

// 照片壓縮：存進 Google Sheet 儲存格（上限 5 萬字元），逐級降畫質直到夠小
async function compressPhoto(file) {
  if (file.size > 12 * 1024 * 1024) throw new Error('照片請小於 12MB');
  let bitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch (e) {
    bitmap = await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('無法讀取這張照片'));
      img.src = URL.createObjectURL(file);
    });
  }
  const width = bitmap.width || bitmap.naturalWidth;
  const height = bitmap.height || bitmap.naturalHeight;
  const ladder = [[420, 0.78], [320, 0.7], [240, 0.6], [180, 0.5]];
  let dataUrl = '';
  for (const [maxSide, quality] of ladder) {
    const scale = Math.min(1, maxSide / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= 45000) return dataUrl;
  }
  if (dataUrl.length > 48000) throw new Error('照片壓縮後仍太大，請換一張再試');
  return dataUrl;
}

async function handlePhotoChange(fileInput) {
  const file = fileInput.files && fileInput.files[0];
  const previewImg = $('photoPreviewImg');
  const placeholder = $('photoPlaceholder');
  const mini = $('miniPhoto');
  if (!file) {
    photoDataUrl = null;
    previewImg.hidden = true;
    placeholder.hidden = false;
    mini.innerHTML = '<span>照片</span>';
    return;
  }
  try {
    photoDataUrl = await compressPhoto(file);
    previewImg.src = photoDataUrl;
    previewImg.hidden = false;
    placeholder.hidden = true;
    mini.innerHTML = '<img src="' + photoDataUrl + '" alt="">';
  } catch (error) {
    photoDataUrl = null;
    fileInput.value = '';
    setNotice(error && error.message ? error.message : '照片處理失敗');
  }
}

function createGroups() {
  const checked = checkedInPilots();
  const count = checked.length;
  if (count < 3 || count % 3 !== 0) {
    setNotice('目前 ' + count + ' 人已報到；請湊滿 3 的倍數，才能每組正好 3 人。');
    return;
  }
  const shuffledPilots = shuffled(checked);
  const groups = [];
  const matches = [];
  for (let index = 0; index < shuffledPilots.length; index += 3) {
    const number = index / 3;
    const name = String.fromCharCode(65 + number) + ' 組';
    const id = uuid();
    const participantIds = shuffledPilots.slice(index, index + 3).map((p) => p.id);
    groups.push({ id, name, pilotIds: participantIds });
    matches.push({
      id: uuid(),
      label: name + '晉級賽',
      type: 'heat',
      groupId: id,
      participantIds,
      scores: Object.fromEntries(participantIds.map((pid) => [pid, 0])),
      status: 'pending',
      winnerId: null,
    });
  }
  commitState({ ...eventState, groups, matches, activeMatchId: null, championId: null });
  switchSection('groups');
  setNotice('已完成 ' + groups.length + ' 組隨機抽籤，每組 3 人。');
}

function openMatch(matchId) {
  secondsLeft = 180;
  preCount = null;
  timerStatus = 'ready';
  syncTimerLoops();
  commitState({ ...eventState, activeMatchId: matchId });
}

function closeMatch() {
  if (timerStatus === 'running' || timerStatus === 'countdown') {
    setNotice('請先暫停比賽，再離開賽事畫面。');
    return;
  }
  timerStatus = 'ready';
  secondsLeft = 180;
  syncTimerLoops();
  commitState({ ...eventState, activeMatchId: null });
}

function startMatch() {
  ensureAudio();
  timerStatus = 'countdown';
  preCount = 3;
  renderMatchScreen();
  const runStep = (value) => {
    if (timerStatus !== 'countdown') return; // 已離開或重置
    if (value > 0) {
      preCount = value;
      playTone(value === 1 ? 660 : 440, 0.16, 'square', 0.06);
      renderMatchScreen();
      setTimeout(() => runStep(value - 1), 1000);
      return;
    }
    preCount = null;
    secondsLeft = 180;
    timerStatus = 'running';
    playStartHorn();
    syncTimerLoops();
    renderMatchScreen();
  };
  runStep(3);
}

function updateScore(pilotId, difference) {
  const match = activeMatch();
  if (!match || timerStatus === 'countdown') return;
  eventState = {
    ...eventState,
    matches: eventState.matches.map((m) =>
      m.id === match.id
        ? { ...m, scores: { ...m.scores, [pilotId]: Math.max(0, (m.scores[pilotId] || 0) + difference) } }
        : m,
    ),
  };
  renderMatchScreen();
}

function resetCurrentMatch() {
  const match = activeMatch();
  if (!match) return;
  timerStatus = 'ready';
  secondsLeft = 180;
  preCount = null;
  syncTimerLoops();
  eventState = {
    ...eventState,
    matches: eventState.matches.map((m) =>
      m.id === match.id
        ? { ...m, scores: Object.fromEntries(m.participantIds.map((id) => [id, 0])) }
        : m,
    ),
  };
  renderMatchScreen();
}

function saveMatchResult() {
  const match = activeMatch();
  if (!match) return;
  const ranked = [...match.participantIds].sort(
    (a, b) => (match.scores[b] || 0) - (match.scores[a] || 0),
  );
  if (ranked.length > 1 && (match.scores[ranked[0]] || 0) === (match.scores[ranked[1]] || 0)) {
    setNotice('最高分同分，請由裁判確認加分後再儲存。');
    return;
  }
  const winnerId = ranked[0] || null;
  let matches = eventState.matches.map((m) =>
    m.id === match.id ? { ...m, status: 'complete', winnerId } : m,
  );
  let championId = eventState.championId;

  if (match.type === 'heat') {
    const heats = matches.filter((m) => m.type === 'heat');
    const allHeatsComplete = heats.every((m) => m.status === 'complete');
    const finalExists = matches.some((m) => m.type === 'final');
    if (allHeatsComplete && !finalExists) {
      const finalists = heats.map((m) => m.winnerId).filter(Boolean);
      matches = [
        ...matches,
        {
          id: uuid(),
          label: '布拉克星球總決賽',
          type: 'final',
          groupId: null,
          participantIds: finalists,
          scores: Object.fromEntries(finalists.map((id) => [id, 0])),
          status: 'pending',
          winnerId: null,
        },
      ];
    }
  } else {
    championId = winnerId;
  }

  commitState({ ...eventState, matches, activeMatchId: null, championId });
  timerStatus = 'ready';
  secondsLeft = 180;
  syncTimerLoops();
  const winner = winnerId ? getPilot(winnerId) : null;
  setNotice(match.type === 'final'
    ? '冠軍誕生：' + (winner ? winner.name : '') + '！'
    : (winner ? winner.name : '') + ' 晉級成功！');
}

function printLicense() {
  document.documentElement.classList.add('print-license');
  const cleanup = () => document.documentElement.classList.remove('print-license');
  window.addEventListener('afterprint', cleanup, { once: true });
  window.print();
  setTimeout(cleanup, 1000);
}

// ===== 畫面切換與渲染 =====
function switchSection(next) {
  section = next;
  document.querySelectorAll('#mainNav button').forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.section === next);
  });
  ['home', 'licenses', 'groups', 'tournament'].forEach((key) => {
    $('page-' + key).hidden = key !== next;
  });
  render();
}

function render() {
  renderHome();
  renderLicenses();
  renderGroups();
  renderTournament();
  renderModal();
  renderMatchScreen();
}

function renderHome() {
  const checked = checkedInPilots();
  const done = completedMatches();
  $('statPilots').textContent = pilots.length;
  $('statCheckedIn').textContent = checked.length;
  $('statMatches').textContent = done;
  const nextMatch = eventState.matches.find((m) => m.status === 'pending');
  $('nextMatchLabel').textContent = nextMatch ? nextMatch.label : '等待分組';

  $('recentPilots').innerHTML = pilots.length
    ? pilots.slice(0, 5).map((p, i) =>
        '<button data-pilot="' + esc(p.id) + '" title="' + esc(p.name) + '"><img src="' + esc(portraitFor(p, i)) + '" alt="' + esc(p.name) + '"></button>'
      ).join('')
    : '<span class="empty-inline">建立第一張駕照，開始報到</span>';

  $('flowList').innerHTML = [
    { cls: checked.length ? 'done' : 'current', num: '01', title: '駕照報到', sub: checked.length + ' 人完成' },
    { cls: eventState.groups.length ? 'done' : (checked.length ? 'current' : ''), num: '02', title: '隨機三人分組', sub: (eventState.groups.length || '尚未') + ' 組' },
    { cls: done ? 'current' : '', num: '03', title: '晉級賽與總決賽', sub: done + ' 場完成' },
  ].map((step) =>
    '<li class="' + step.cls + '"><span>' + step.num + '</span><div><strong>' + step.title + '</strong><small>' + step.sub + '</small></div><i></i></li>'
  ).join('');
}

function renderLicenses() {
  $('licenseForm').hidden = !showLicenseForm;
  $('toggleLicenseFormBtn').textContent = showLicenseForm ? '關閉表單' : '＋ 新增駕照';

  const query = pilotSearch.trim().toLowerCase();
  const filtered = pilots.filter((p) =>
    !query || (p.name + ' ' + p.nickname + ' ' + p.licenseNo).toLowerCase().includes(query),
  );
  $('pilotCount').textContent = '共 ' + filtered.length + ' 張駕照';

  $('pilotGrid').innerHTML = filtered.length
    ? filtered.map((p, i) => {
        const checked = eventState.checkedInIds.includes(p.id);
        return '<article class="pilot-card">' +
          '<button class="pilot-main" data-pilot="' + esc(p.id) + '">' +
            '<img src="' + esc(portraitFor(p, i)) + '" alt="' + esc(p.name) + '">' +
            '<div><span class="license-number">' + esc(p.licenseNo) + '</span><h3>' + esc(p.name) + '</h3><p>' + esc(p.nickname || p.level) + '</p></div>' +
          '</button>' +
          '<div class="pilot-meta"><span>' + esc(p.level) + '</span><span>' + (p.matches || 0) + ' 場 / ' + (p.wins || 0) + ' 勝</span></div>' +
          '<button class="' + (checked ? 'checked-button' : 'outline-button') + '" data-checkin="' + esc(p.id) + '"' + (checked ? ' disabled' : '') + '>' +
            (checked ? '✓ 已報到' : '今日報到') + '</button>' +
        '</article>';
      }).join('')
    : '<div class="empty-state"><img src="assets/lala.jpg" alt=""><h3>還沒有找到駕照</h3><p>建立第一位駕駛員資料後，就可開始報到與分組。</p></div>';
}

function renderGroups() {
  const checked = checkedInPilots();
  const ready = checked.length >= 3 && checked.length % 3 === 0;
  $('createGroupsBtn').disabled = checked.length < 3;
  $('drawSummary').innerHTML =
    '<div><strong>' + checked.length + '</strong><span>已報到駕駛員</span></div>' +
    '<div><strong>' + Math.floor(checked.length / 3) + '</strong><span>可組成完整三人組</span></div>' +
    '<div class="' + (ready ? 'ready' : 'waiting') + '"><i></i>' +
      (ready ? '可以開始抽籤' : '還需 ' + (checked.length < 3 ? 3 - checked.length : 3 - (checked.length % 3)) + ' 人') + '</div>';

  const map = pilotMap();
  $('groupsArea').innerHTML = eventState.groups.length
    ? '<div class="groups-board">' + eventState.groups.map((group, gi) =>
        '<article class="group-card group-' + (gi % 4) + '">' +
          '<header><span>' + esc(group.name) + '</span><small>QUALIFIER ' + String(gi + 1).padStart(2, '0') + '</small></header>' +
          '<div class="group-pilots">' + group.pilotIds.map((pid, i) => {
            const p = map.get(pid);
            if (!p) return '';
            return '<div><span class="seed">0' + (i + 1) + '</span><img src="' + esc(portraitFor(p, i + gi)) + '" alt="' + esc(p.name) + '">' +
              '<div><strong>' + esc(p.name) + '</strong><small>' + esc(p.nickname || p.licenseNo) + '</small></div><b>' + esc(p.level) + '</b></div>';
          }).join('') + '</div>' +
          '<button data-open-group="' + esc(group.id) + '">進入本組賽事 →</button>' +
        '</article>'
      ).join('') + '</div>'
    : '<div class="waiting-board">' +
        '<div class="draw-orbit"><img src="assets/aqiu.jpg" alt=""><span></span><span></span><span></span></div>' +
        '<h2>等待抽籤</h2><p>報到人數達到 3 的倍數後，按下「開始隨機分組」。</p>' +
      '</div>';
}

function matchRowHtml(match, index) {
  const map = pilotMap();
  const winner = match.winnerId ? map.get(match.winnerId) : null;
  return '<article class="match-row ' + match.status + '">' +
    '<div class="match-index">' + String(index + 1).padStart(2, '0') + '</div>' +
    '<div class="match-info"><small>' + (match.type === 'final' ? 'FINAL' : 'QUALIFIER') + '</small><strong>' + esc(match.label) + '</strong>' +
      '<div class="mini-avatars">' + match.participantIds.map((id, i) => {
        const p = map.get(id);
        return p ? '<img src="' + esc(portraitFor(p, i)) + '" alt="' + esc(p.name) + '" title="' + esc(p.name) + '">' : '';
      }).join('') + '</div></div>' +
    '<div class="match-status">' + (winner
      ? '<small>WINNER</small><strong>' + esc(winner.name) + '</strong>'
      : '<small>STATUS</small><strong>待比賽</strong>') + '</div>' +
    '<button data-open-match="' + esc(match.id) + '"' + (match.status === 'complete' ? ' disabled' : '') + '>' +
      (match.status === 'complete' ? '已完成' : '開啟賽場 →') + '</button>' +
  '</article>';
}

function renderTournament() {
  const map = pilotMap();
  const champion = eventState.championId ? map.get(eventState.championId) : null;
  const heats = eventState.matches.filter((m) => m.type === 'heat');
  const finals = eventState.matches.filter((m) => m.type === 'final');
  let html = '';

  if (champion) {
    html += '<div class="champion-banner"><div class="trophy-orbit">★</div>' +
      '<img src="' + esc(portraitFor(champion)) + '" alt="' + esc(champion.name) + '">' +
      '<div><span>BLOCK PLANET CHAMPION</span><h2>' + esc(champion.name) + '</h2><p>' + esc(champion.nickname || champion.licenseNo) + '</p></div></div>';
  }

  if (eventState.matches.length) {
    html += '<div class="bracket-layout">' +
      '<section><div class="bracket-heading"><span>預賽晉級組</span><small>' +
        heats.filter((m) => m.status === 'complete').length + '/' + heats.length + ' COMPLETE</small></div>' +
        '<div class="match-list">' + heats.map((m, i) => matchRowHtml(m, i)).join('') + '</div></section>' +
      '<div class="bracket-path"><span></span><i></i><span></span></div>' +
      '<section class="final-column"><div class="bracket-heading"><span>總決賽</span><small>FINAL</small></div>' +
        (finals.length
          ? finals.map((m, i) => matchRowHtml(m, i)).join('')
          : '<div class="locked-final"><span>✦</span><h3>總決賽名單尚未出爐</h3><p>各組晉級賽完成後會自動開啟。</p></div>') +
      '</section></div>';
  } else {
    html += '<div class="waiting-board">' +
      '<div class="draw-orbit"><img src="assets/keke.jpg" alt=""><span></span><span></span><span></span></div>' +
      '<h2>先完成隨機分組</h2><p>賽程會根據抽籤結果自動產生。</p>' +
      '<button class="primary-button compact" data-goto="groups">前往分組</button></div>';
  }
  $('tournamentArea').innerHTML = html;
}

function renderModal() {
  const root = $('modalRoot');
  const pilot = selectedPilotId ? getPilot(selectedPilotId) : null;
  if (!pilot) { root.innerHTML = ''; return; }
  const checked = eventState.checkedInIds.includes(pilot.id);
  const issued = new Date(pilot.createdAt);
  const issuedText = isNaN(issued.getTime()) ? '—' : issued.toLocaleDateString('zh-TW');
  root.innerHTML =
  '<div class="modal-backdrop" id="modalBackdrop">' +
    '<div class="license-modal">' +
      '<button class="modal-close" id="modalCloseBtn" aria-label="關閉">×</button>' +
      '<div class="print-card">' +
        '<div class="license-preview-label"><span>公版駕照</span><strong>標準卡 85.6 × 54 mm • 正反面</strong></div>' +
        '<div class="license-sides">' +
          '<div class="license-card license-front">' +
            '<div class="license-color-rail"><i></i><i></i><i></i><i></i></div>' +
            '<div class="license-arena-grid" aria-hidden="true"></div>' +
            '<div class="license-goal-ring" aria-hidden="true"><i></i><span></span></div>' +
            '<header class="license-header">' +
              '<img src="assets/block-planet-logo.png" alt="">' +
              '<div><strong>布拉克星球競技飛行證</strong><span>BLOCK PLANET • DRONE SOCCER LEAGUE</span></div>' +
              '<b><i></i> ARENA PILOT</b>' +
            '</header>' +
            '<div class="license-front-body">' +
              '<div class="license-pilot-orb">' +
                '<div class="license-photo-core"><img class="license-photo" src="' + esc(portraitFor(pilot)) + '" alt="' + esc(pilot.name) + '"></div>' +
                '<i class="orb-line orb-line-a" aria-hidden="true"></i>' +
                '<i class="orb-line orb-line-b" aria-hidden="true"></i>' +
                '<i class="orb-line orb-line-c" aria-hidden="true"></i>' +
                '<span>' + esc(pilot.level) + '</span>' +
              '</div>' +
              '<div class="license-fields">' +
                '<div class="license-call-sign"><small>CALL SIGN / 飛行代號</small><b>' + esc(pilot.nickname || ('PILOT ' + pilot.licenseNo.slice(-3))) + '</b></div>' +
                '<small>PILOT NAME / 駕駛員</small>' +
                '<h2>' + esc(pilot.name) + '</h2>' +
                '<p>REGISTERED DRONE SOCCER PILOT</p>' +
                '<div class="license-data-row">' +
                  '<span><small>LICENSE NO. / 駕照編號</small><strong>' + esc(pilot.licenseNo) + '</strong></span>' +
                  '<span><small>DIVISION / 競賽類別</small><strong>DRONE SOCCER</strong></span>' +
                '</div>' +
              '</div>' +
            '</div>' +
            '<footer class="license-footer">' +
              '<span><small>ISSUED / 核發日</small><strong>' + esc(issuedText) + '</strong></span>' +
              '<span><small>STATUS / 狀態</small><strong class="active-status"><i></i> ACTIVE</strong></span>' +
              '<b>FLY • SCORE • SHINE</b>' +
            '</footer>' +
          '</div>' +
          '<div class="license-card license-back">' +
            '<img class="license-arena-art" src="assets/drone-soccer-hero.png" alt="布拉克星球吉祥物參加無人機足球比賽">' +
            '<div class="license-arena-shade" aria-hidden="true"></div>' +
            '<div class="license-back-top">' +
              '<img src="assets/block-planet-logo.png" alt="">' +
              '<div><strong>布拉克星球無人機足球聯盟</strong><span>OFFICIAL ARENA ACCESS</span></div>' +
              '<b>NO. ' + esc(pilot.licenseNo.slice(-6)) + '</b>' +
            '</div>' +
            '<div class="license-back-body">' +
              '<div class="flight-rules">' +
                '<small>ARENA FLIGHT CODE / 競技飛行守則</small>' +
                '<ol>' +
                  '<li><b>01</b><span>CHECK｜賽前確認球機、電池與遙控器。</span></li>' +
                  '<li><b>02</b><span>READY｜聽從裁判指示後才能啟動。</span></li>' +
                  '<li><b>03</b><span>FAIR PLAY｜安全飛行，勇敢進球。</span></li>' +
                '</ol>' +
              '</div>' +
              '<div class="license-squad-badge"><span>BLOCK PLANET TEAM</span><strong>FLY TOGETHER</strong><i></i></div>' +
            '</div>' +
            '<div class="license-barcode" aria-hidden="true"><i></i><span>' + esc(pilot.licenseNo.replace(/[^0-9]/g, '')) + '</span></div>' +
            '<footer class="license-back-footer"><span>本證為布拉克星球無人機足球公版飛行證</span><b>DRONE ON • GAME ON</b></footer>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="license-modal-actions">' +
        '<p>列印時請選擇「實際大小 / 100%」，即為標準卡尺寸。</p>' +
        '<button class="outline-button" id="modalCheckinBtn"' + (checked ? ' disabled' : '') + '>' + (checked ? '✓ 今日已報到' : '今日報到') + '</button>' +
        '<button class="primary-button compact" id="printLicenseBtn">列印公版駕照</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  $('modalBackdrop').addEventListener('mousedown', (e) => {
    if (e.target === e.currentTarget) { selectedPilotId = null; renderModal(); }
  });
  $('modalCloseBtn').addEventListener('click', () => { selectedPilotId = null; renderModal(); });
  $('modalCheckinBtn').addEventListener('click', () => { directCheckIn(pilot.id); });
  $('printLicenseBtn').addEventListener('click', printLicense);
}

function renderMatchScreen() {
  const root = $('matchScreenRoot');
  const match = activeMatch();
  if (!match) { root.innerHTML = ''; return; }
  const map = pilotMap();
  root.innerHTML =
  '<div class="match-screen' + (crunchTime() ? ' crunch' : '') + '">' +
    '<header class="match-topbar">' +
      '<div class="match-brand"><img src="assets/block-planet-logo.png" alt=""><span>BLOCK PLANET <b>ARENA</b></span></div>' +
      '<div class="match-title"><small>' + (match.type === 'final' ? 'CHAMPIONSHIP FINAL' : 'QUALIFIER') + '</small><strong>' + esc(match.label) + '</strong></div>' +
      '<div class="match-controls">' +
        '<button id="matchAudioBtn">' + (audioEnabled ? '♫ 音效開啟' : '音效關閉') + '</button>' +
        '<button id="matchCloseBtn">離開賽場 ×</button>' +
      '</div>' +
    '</header>' +
    '<div class="arena-net"></div>' +
    '<section class="timer-zone">' +
      '<div class="round-label"><span></span> ROUND TIMER <span></span></div>' +
      '<div class="timer-number' + (secondsLeft <= 30 ? ' heartbeat-number' : '') + '" id="timerNumber">' + formatClock(secondsLeft) + '</div>' +
      '<div class="timer-caption" id="timerCaption">' + timerCaptionText() + '</div>' +
    '</section>' +
    '<section class="scoreboard">' + match.participantIds.map((pid, i) => {
      const p = map.get(pid);
      if (!p) return '';
      const score = match.scores[pid] || 0;
      return '<article class="score-pilot pilot-color-' + i + '">' +
        '<div class="pilot-identity">' +
          '<span class="pilot-orb"><img src="' + esc(portraitFor(p, i)) + '" alt="' + esc(p.name) + '"></span>' +
          '<div><small>PILOT 0' + (i + 1) + '</small><h2>' + esc(p.name) + '</h2><p>' + esc(p.nickname || p.licenseNo) + '</p></div>' +
        '</div>' +
        '<div class="score-control">' +
          '<button data-score="' + esc(pid) + '" data-diff="-1"' + (score === 0 ? ' disabled' : '') + '>−</button>' +
          '<strong>' + score + '</strong>' +
          '<button data-score="' + esc(pid) + '" data-diff="1">+</button>' +
        '</div>' +
        '<span class="score-label">SCORE</span>' +
      '</article>';
    }).join('') + '</section>' +
    '<footer class="match-footer">' +
      '<button class="secondary-match-button" id="matchResetBtn"' + (timerStatus === 'countdown' ? ' disabled' : '') + '>↺ 重置</button>' +
      (timerStatus === 'ready' ? '<button class="start-match-button" id="matchStartBtn"><span>▶</span>開始比賽</button>' : '') +
      (timerStatus === 'running' ? '<button class="start-match-button pause" id="matchPauseBtn"><span>Ⅱ</span>暫停比賽</button>' : '') +
      (timerStatus === 'paused' ? '<button class="start-match-button" id="matchResumeBtn"><span>▶</span>繼續比賽</button>' : '') +
      (timerStatus === 'finished' ? '<button class="start-match-button finish" id="matchFinishBtn"><span>✓</span>儲存結果與晉級</button>' : '') +
      '<div class="rule-reminder"><span>◎</span><p><strong>裁判提醒</strong>全球完整穿越懸吊球門後再計分</p></div>' +
    '</footer>' +
    (timerStatus === 'countdown' && preCount !== null
      ? '<div class="prestart-overlay"><span>GET READY</span><strong>' + preCount + '</strong><p>無人機就位</p></div>' : '') +
    (timerStatus === 'finished' ? '<div class="finish-flash">TIME!</div>' : '') +
  '</div>';

  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('matchAudioBtn', toggleAudio);
  on('matchCloseBtn', closeMatch);
  on('matchResetBtn', resetCurrentMatch);
  on('matchStartBtn', startMatch);
  on('matchPauseBtn', () => setTimerStatus('paused'));
  on('matchResumeBtn', () => setTimerStatus('running'));
  on('matchFinishBtn', saveMatchResult);
  root.querySelectorAll('[data-score]').forEach((btn) => {
    btn.addEventListener('click', () => updateScore(btn.dataset.score, parseInt(btn.dataset.diff, 10)));
  });
}

function toggleAudio() {
  audioEnabled = !audioEnabled;
  const btn = $('audioToggle');
  btn.textContent = audioEnabled ? '♫' : '×';
  btn.setAttribute('aria-label', audioEnabled ? '關閉音效' : '開啟音效');
  syncTimerLoops();
  renderMatchScreen();
}

// ===== 事件繫結 =====
function bindEvents() {
  $('brandBtn').addEventListener('click', () => switchSection('home'));
  document.querySelectorAll('#mainNav button').forEach((btn) => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  $('audioToggle').addEventListener('click', toggleAudio);
  $('noticeClose').addEventListener('click', () => setNotice(''));
  $('heroTournamentBtn').addEventListener('click', () => switchSection('tournament'));
  $('heroNewLicenseBtn').addEventListener('click', () => {
    showLicenseForm = true;
    switchSection('licenses');
  });
  $('viewAllPilotsBtn').addEventListener('click', () => switchSection('licenses'));
  $('checkinForm').addEventListener('submit', handleCheckIn);
  $('toggleLicenseFormBtn').addEventListener('click', () => {
    showLicenseForm = !showLicenseForm;
    renderLicenses();
  });
  $('licenseForm').addEventListener('submit', handleCreatePilot);
  $('photoInput').addEventListener('change', (e) => handlePhotoChange(e.target));
  $('pilotSearch').addEventListener('input', (e) => {
    pilotSearch = e.target.value;
    renderLicenses();
  });
  $('createGroupsBtn').addEventListener('click', createGroups);

  // 動態內容用事件委派
  document.addEventListener('click', (e) => {
    const pilotBtn = e.target.closest('[data-pilot]');
    if (pilotBtn) { selectedPilotId = pilotBtn.dataset.pilot; renderModal(); return; }
    const checkinBtn = e.target.closest('[data-checkin]');
    if (checkinBtn) { directCheckIn(checkinBtn.dataset.checkin); return; }
    const groupBtn = e.target.closest('[data-open-group]');
    if (groupBtn) {
      const m = eventState.matches.find((x) => x.groupId === groupBtn.dataset.openGroup);
      if (m) openMatch(m.id);
      return;
    }
    const matchBtn = e.target.closest('[data-open-match]');
    if (matchBtn && !matchBtn.disabled) { openMatch(matchBtn.dataset.openMatch); return; }
    const gotoBtn = e.target.closest('[data-goto]');
    if (gotoBtn) { switchSection(gotoBtn.dataset.goto); return; }
  });
}

// ===== 啟動 =====
async function init() {
  bindEvents();
  if (DEMO) $('saveStateText').textContent = '示範模式';
  try {
    const [pilotList, state] = await Promise.all([apiListPilots(), apiGetState()]);
    pilots = pilotList;
    eventState = { ...EMPTY_STATE(), ...(state || {}) };
  } catch (error) {
    setNotice(error && error.message ? error.message : '資料連線失敗');
  }
  $('loadingStage').hidden = true;
  $('page-' + section).hidden = false;
  render();
}

init();
