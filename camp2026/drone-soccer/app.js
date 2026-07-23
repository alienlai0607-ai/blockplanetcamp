/* ========================================
   布拉克星球 無人機足球晉級賽系統
   後端：camp2026 Apps Script（無人機駕照 / 無人機賽事 分頁）
   ?demo=1 可用本機示範模式（localStorage，不寫入正式資料）
   ======================================== */
'use strict';

const API_URL = 'https://script.google.com/macros/s/AKfycbyn7Rpmmfk0zAgME4TDEy0FYA3cckQZTfQD_6peGTv6HH5TmPc2mOXfNc-Dj9S2HNI/exec';
const DEMO = new URLSearchParams(location.search).has('demo');

const MASCOT_PORTRAITS = [
  'assets/xiaobu.jpeg',
  'assets/lala.jpg',
  'assets/aqiu.jpg',
  'assets/keke.jpg',
  'assets/xingxing.jpg',
];

const PRACTICE_TEAMS = [
  {
    id: 'practice-orange',
    name: '火箭橘隊',
    members: [
      { name: '小布', nickname: '練習席 1', photoUrl: 'assets/xiaobu.jpeg' },
      { name: '克克', nickname: '練習席 2', photoUrl: 'assets/keke.jpg' },
      { name: '星星', nickname: '練習席 3', photoUrl: 'assets/xingxing.jpg' },
    ],
  },
  {
    id: 'practice-blue',
    name: '閃電藍隊',
    members: [
      { name: '拉拉', nickname: '練習席 1', photoUrl: 'assets/lala.jpg' },
      { name: '阿球', nickname: '練習席 2', photoUrl: 'assets/aqiu.jpg' },
      { name: '小布', nickname: '練習席 3', photoUrl: 'assets/xiaobu.jpeg' },
    ],
  },
];

const BATTLE_MUSIC_CHOICES = [
  {
    id: 'bounce', label: '星球彈跳', icon: '🪐', mood: '童趣最強・彈跳緊張', artist: 'Locomule',
    file: 'assets/audio/battle-boss-fight-bounce.mp3', source: 'https://opengameart.org/content/boss-fight-bounce', recommended: true,
  },
  {
    id: 'hero', label: '勇者對決', icon: '⚔️', mood: '經典電玩・熱血冒險', artist: 'HydroGene',
    file: 'assets/audio/battle-hero-boss.mp3', source: 'https://opengameart.org/content/zelda-style-8-bit-boss-theme',
  },
  {
    id: 'danger', label: '危機追擊', icon: '🚀', mood: '高速追逐・戰鬥感強', artist: 'HydroGene',
    file: 'assets/audio/battle-danger-boss.mp3', source: 'https://opengameart.org/content/8-bit-danger-strong-boss',
  },
  {
    id: 'original', label: '原版頭目戰', icon: '🎮', mood: '145 BPM・俐落節奏', artist: 'MintoDog',
    file: 'assets/audio/battle-bpm145.mp3', source: 'https://opengameart.org/content/8bit-action-boss-battle',
  },
];

const CLIMAX_MUSIC_CHOICES = [
  {
    id: 'finalmax', label: '最終決戰 MAX', icon: '🔥', mood: '最刺激・爆發式最後衝刺', artist: 'Centurion_of_war',
    file: 'assets/audio/climax-final-stand-max.ogg', source: 'https://opengameart.org/content/final-stand-0', recommended: true,
  },
  {
    id: 'heavy', label: '重鼓危機', icon: '🥁', mood: '重鼓壓迫・緊張升級', artist: 'Centurion_of_war',
    file: 'assets/audio/climax-final-stand-heavy.ogg', source: 'https://opengameart.org/content/final-stand-0',
  },
  {
    id: 'original', label: '原版高速戰', icon: '⚡', mood: '185 BPM・高速晶片音', artist: 'MintoDog',
    file: 'assets/audio/battle-climax-bpm185.mp3', source: 'https://opengameart.org/content/8bit-action-boss-battle',
  },
];

const EMPTY_STATE = () => ({
  tournamentVersion: 2,
  checkedInIds: [],
  groups: [],
  matches: [],
  activeMatchId: null,
  championGroupId: null,
});

// ===== 全域狀態 =====
let pilots = [];
let eventState = EMPTY_STATE();
let section = 'home';
let saving = false;
let pilotSearch = '';
let showLicenseForm = false;
let selectedPilotId = null;
let deleteConfirmPilotId = null;
let photoDataUrl = null;
let timerStatus = 'ready'; // ready | countdown | running | paused | finished
let secondsLeft = 180;
let preCount = null;
let victoryDismissed = false;
let practiceMode = false;
let practiceScores = { 'practice-orange': 0, 'practice-blue': 0 };
let selectedBattleMusicId = musicChoice(BATTLE_MUSIC_CHOICES, localStorage.getItem('bp-drone-battle-music') || 'bounce').id;
let selectedClimaxMusicId = musicChoice(CLIMAX_MUSIC_CHOICES, localStorage.getItem('bp-drone-climax-music') || 'finalmax').id;
let musicPickerOpen = false;
let musicPreviewTimer = null;
let audioEnabled = true;
let audioContext = null;
let masterGainNode = null;
let limiterNode = null;
let battleMusicSource = null;
let climaxMusicSource = null;
let battleMusicGain = null;
let climaxMusicGain = null;
let battleMusicStarted = false;
let battleMusicMode = 'normal';
let musicPlayErrorShown = false;
let musicStep = 0;
let timerInterval = null;
let crunchInterval = null;

function musicChoice(choices, id) {
  return choices.find((choice) => choice.id === id) || choices[0];
}

const battleMusic = new Audio(musicChoice(BATTLE_MUSIC_CHOICES, selectedBattleMusicId).file);
const climaxMusic = new Audio(musicChoice(CLIMAX_MUSIC_CHOICES, selectedClimaxMusicId).file);
[battleMusic, climaxMusic].forEach((track) => {
  track.loop = true;
  track.preload = 'metadata';
  track.playsInline = true;
  track.volume = 1;
});

const $ = (id) => document.getElementById(id);
const esc = (s) => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

function pilotMap() { return new Map(pilots.map((p) => [p.id, p])); }
function getPilot(id) { return pilots.find((p) => p.id === id) || null; }
function groupMap() { return new Map(eventState.groups.map((group) => [group.id, group])); }
function getGroup(id) { return eventState.groups.find((group) => group.id === id) || null; }
function checkedInPilots() {
  const map = pilotMap();
  return eventState.checkedInIds.map((id) => map.get(id)).filter(Boolean);
}
function activeMatch() {
  if (practiceMode) {
    return {
      id: 'practice-match',
      label: '火箭橘隊 VS 閃電藍隊・練習賽',
      type: 'practice',
      participantGroupIds: PRACTICE_TEAMS.map((team) => team.id),
      scores: practiceScores,
      status: 'practice',
      winnerGroupId: null,
    };
  }
  return eventState.matches.find((m) => m.id === eventState.activeMatchId) || null;
}
function matchOutcome(match) {
  if (!match || !match.participantGroupIds.length) return null;
  const ranked = [...match.participantGroupIds].sort(
    (a, b) => (match.scores[b] || 0) - (match.scores[a] || 0),
  );
  const bestScore = match.scores[ranked[0]] || 0;
  const leaders = ranked.filter((id) => (match.scores[id] || 0) === bestScore);
  return {
    ranked,
    tied: leaders.length > 1,
    winnerGroupId: leaders.length === 1 ? leaders[0] : null,
    bestScore,
  };
}
function confettiMarkup(count = 72) {
  const colors = ['#ffca3a', '#ff5d42', '#58bff0', '#59c951', '#ffffff', '#ff8db3'];
  return Array.from({ length: count }, (_, index) => {
    const left = (index * 37 + 11) % 101;
    const delay = -((index % 17) * 0.11);
    const duration = 2.4 + (index % 9) * 0.18;
    const drift = ((index * 29) % 180) - 90;
    const color = colors[index % colors.length];
    return '<i style="--x:' + left + '%;--delay:' + delay + 's;--duration:' + duration + 's;--drift:' + drift + 'px;--confetti:' + color + '"></i>';
  }).join('');
}
function arenaGroupMap() {
  return new Map((practiceMode ? PRACTICE_TEAMS : eventState.groups).map((group) => [group.id, group]));
}
function arenaMembers(group) {
  if (practiceMode) return group.members || [];
  const map = pilotMap();
  return (group.pilotIds || []).map((pilotId) => map.get(pilotId)).filter(Boolean);
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

function normalizeEventState(state) {
  const incoming = state && typeof state === 'object' ? state : {};
  if (incoming.tournamentVersion !== 2) {
    return {
      state: {
        ...EMPTY_STATE(),
        checkedInIds: Array.isArray(incoming.checkedInIds) ? incoming.checkedInIds : [],
      },
      migrated: true,
    };
  }
  return {
    state: {
      tournamentVersion: 2,
      checkedInIds: Array.isArray(incoming.checkedInIds) ? incoming.checkedInIds : [],
      groups: Array.isArray(incoming.groups) ? incoming.groups : [],
      matches: Array.isArray(incoming.matches) ? incoming.matches : [],
      activeMatchId: typeof incoming.activeMatchId === 'string' ? incoming.activeMatchId : null,
      championGroupId: typeof incoming.championGroupId === 'string' ? incoming.championGroupId : null,
    },
    migrated: false,
  };
}

function eventStateAfterPilotDeletion(state, pilotId) {
  const checkedInIds = state.checkedInIds.filter((id) => id !== pilotId);
  const affectsTournament = state.groups.some((group) => group.pilotIds.includes(pilotId));
  return affectsTournament
    ? { ...EMPTY_STATE(), checkedInIds }
    : { ...state, checkedInIds };
}

function rankedTeams(groups, matches) {
  const seedOrder = new Map(groups.map((group, index) => [group.id, index]));
  const standings = new Map(groups.map((group) => [
    group.id,
    { group, wins: 0, scored: 0, allowed: 0 },
  ]));

  matches
    .filter((match) => match.type === 'heat' && match.status === 'complete')
    .forEach((match) => {
      match.participantGroupIds.forEach((groupId) => {
        const row = standings.get(groupId);
        if (!row) return;
        row.scored += match.scores[groupId] || 0;
        row.allowed += match.participantGroupIds
          .filter((opponentId) => opponentId !== groupId)
          .reduce((total, opponentId) => total + (match.scores[opponentId] || 0), 0);
        if (match.winnerGroupId === groupId) row.wins += 1;
      });
    });

  return [...standings.values()]
    .sort((a, b) =>
      b.wins - a.wins ||
      (b.scored - b.allowed) - (a.scored - a.allowed) ||
      b.scored - a.scored ||
      (seedOrder.get(a.group.id) || 0) - (seedOrder.get(b.group.id) || 0),
    )
    .map((row) => row.group);
}
function buildPreliminaryMatches(groups) {
  const poolDefinitions = groups.length === 3
    ? [{ id: 'league', label: '循環組', groups }]
    : [
        { id: 'orange', label: '橘組', groups: groups.slice(0, Math.ceil(groups.length / 2)) },
        { id: 'blue', label: '藍組', groups: groups.slice(Math.ceil(groups.length / 2)) },
      ];

  return poolDefinitions.flatMap((pool) => {
    const matches = [];
    for (let left = 0; left < pool.groups.length - 1; left += 1) {
      for (let right = left + 1; right < pool.groups.length; right += 1) {
        const participantGroupIds = [pool.groups[left].id, pool.groups[right].id];
        matches.push({
          id: uuid(),
          label: pool.label + '・' + pool.groups[left].name + ' VS ' + pool.groups[right].name,
          type: 'heat',
          poolId: pool.id,
          poolLabel: pool.label,
          participantGroupIds,
          scores: Object.fromEntries(participantGroupIds.map((groupId) => [groupId, 0])),
          status: 'pending',
          winnerGroupId: null,
        });
      }
    }
    return matches;
  });
}
function finalistsFromHeats(groups, matches) {
  const heats = matches.filter((match) => match.type === 'heat');
  const poolIds = [...new Set(heats.map((match) => match.poolId).filter(Boolean))];
  if (poolIds.length !== 2) return rankedTeams(groups, heats).slice(0, 2).map((group) => group.id);

  return poolIds.map((poolId) => {
    const poolMatches = heats.filter((match) => match.poolId === poolId);
    const poolGroupIds = new Set(poolMatches.flatMap((match) => match.participantGroupIds));
    const poolGroups = groups.filter((group) => poolGroupIds.has(group.id));
    const leader = rankedTeams(poolGroups, poolMatches)[0];
    return leader ? leader.id : null;
  }).filter(Boolean);
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
async function apiDeletePilot(pilotId) {
  if (DEMO) {
    const list = demoStore.read('pilots', []).filter((pilot) => pilot.id !== pilotId);
    const storedState = normalizeEventState(demoStore.read('state', EMPTY_STATE())).state;
    const nextState = eventStateAfterPilotDeletion(storedState, pilotId);
    demoStore.write('pilots', list);
    demoStore.write('state', nextState);
    return { state: nextState };
  }
  const data = await apiPost({ action: 'drone-pilot-delete', pilotId });
  return { state: data.state || eventStateAfterPilotDeletion(eventState, pilotId) };
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

// ===== 音效與 CC0 戰鬥音樂 =====
function ensureAudio() {
  if (!audioEnabled) return null;
  if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') audioContext.resume();
  if (!masterGainNode) {
    masterGainNode = audioContext.createGain();
    limiterNode = audioContext.createDynamicsCompressor();
    masterGainNode.gain.value = 2.35;
    limiterNode.threshold.value = -12;
    limiterNode.knee.value = 8;
    limiterNode.ratio.value = 14;
    limiterNode.attack.value = 0.003;
    limiterNode.release.value = 0.24;
    masterGainNode.connect(limiterNode).connect(audioContext.destination);

    battleMusicGain = audioContext.createGain();
    climaxMusicGain = audioContext.createGain();
    battleMusicGain.gain.value = 0.78;
    climaxMusicGain.gain.value = 0.0001;
    battleMusicSource = audioContext.createMediaElementSource(battleMusic);
    climaxMusicSource = audioContext.createMediaElementSource(climaxMusic);
    battleMusicSource.connect(battleMusicGain).connect(masterGainNode);
    climaxMusicSource.connect(climaxMusicGain).connect(masterGainNode);
  }
  return audioContext;
}
function warmBattleMusic() {
  [battleMusic, climaxMusic].forEach((track) => {
    if (track.readyState === 0) track.load();
  });
}
function showMusicPicker() {
  musicPickerOpen = true;
  renderMusicPicker();
}
function closeMusicPicker() {
  musicPickerOpen = false;
  if (timerStatus !== 'running' && timerStatus !== 'countdown') {
    clearTimeout(musicPreviewTimer);
    musicPreviewTimer = null;
    pauseBattleMusic();
    battleMusicStarted = false;
  }
  renderMusicPicker();
}
function selectAndPreviewMusic(kind, id) {
  const choices = kind === 'climax' ? CLIMAX_MUSIC_CHOICES : BATTLE_MUSIC_CHOICES;
  const choice = musicChoice(choices, id);
  const target = kind === 'climax' ? climaxMusic : battleMusic;
  if (kind === 'climax') {
    selectedClimaxMusicId = choice.id;
    localStorage.setItem('bp-drone-climax-music', choice.id);
  } else {
    selectedBattleMusicId = choice.id;
    localStorage.setItem('bp-drone-battle-music', choice.id);
  }

  clearTimeout(musicPreviewTimer);
  musicPreviewTimer = null;
  pauseBattleMusic();
  target.src = choice.file;
  target.load();
  battleMusicStarted = false;
  musicPlayErrorShown = false;

  if (timerStatus === 'running' || timerStatus === 'countdown') {
    startBattleMusic(timerStatus === 'countdown');
    if (timerStatus === 'running') setBattleMusicMode(crunchTime() ? 'climax' : 'normal');
    syncBattleMusic();
  } else if (audioEnabled && ensureAudio()) {
    battleMusic.currentTime = 0;
    climaxMusic.currentTime = 0;
    setBattleMusicMode(kind === 'climax' ? 'climax' : 'normal');
    safePlayMusic(target);
    musicPreviewTimer = setTimeout(() => {
      if (timerStatus !== 'running' && timerStatus !== 'countdown') pauseBattleMusic();
      musicPreviewTimer = null;
    }, 9000);
  }
  renderMatchScreen();
  renderMusicPicker();
}
function safePlayMusic(track, showError = true) {
  const promise = track.play();
  if (promise && typeof promise.catch === 'function') {
    promise.catch(() => {
      if (!showError) return;
      if (musicPlayErrorShown) return;
      musicPlayErrorShown = true;
      setNotice('戰鬥音樂未能自動播放，請用音效按鈕關閉後再重新開啟。');
    });
  }
}
function setBattleMusicMode(next) {
  if (!battleMusicGain || !climaxMusicGain) return;
  const changed = battleMusicMode !== next;
  battleMusicMode = next;
  if (next === 'climax') {
    if (changed) {
      battleMusic.pause();
      climaxMusic.currentTime = 0;
    }
    battleMusicGain.gain.value = 0.0001;
    climaxMusicGain.gain.value = 1;
  } else {
    battleMusicGain.gain.value = 0.78;
    climaxMusicGain.gain.value = 0.0001;
  }
}
function startBattleMusic(muted = false) {
  if (!audioEnabled || !ensureAudio()) return;
  clearTimeout(musicPreviewTimer);
  musicPreviewTimer = null;
  battleMusic.currentTime = 0;
  climaxMusic.currentTime = 0;
  battleMusic.playbackRate = 1;
  climaxMusic.playbackRate = 1;
  musicStep = 0;
  battleMusicStarted = true;
  battleMusicMode = 'normal';
  setBattleMusicMode('normal');
  if (muted && battleMusicGain && climaxMusicGain) {
    battleMusicGain.gain.value = 0.0001;
    climaxMusicGain.gain.value = 0.0001;
  }
  safePlayMusic(battleMusic, !muted);
  safePlayMusic(climaxMusic, false);
}
function releaseBattleMusic() {
  if (!audioEnabled || !ensureAudio()) return;
  if (!battleMusicStarted) {
    startBattleMusic();
    return;
  }
  battleMusic.currentTime = 0;
  climaxMusic.currentTime = 0;
  setBattleMusicMode('normal');
  if (battleMusic.paused) safePlayMusic(battleMusic);
  if (climaxMusic.paused) safePlayMusic(climaxMusic, false);
}
function pauseBattleMusic() {
  battleMusic.pause();
  climaxMusic.pause();
}
function stopBattleMusic() {
  clearTimeout(musicPreviewTimer);
  musicPreviewTimer = null;
  pauseBattleMusic();
  battleMusic.currentTime = 0;
  climaxMusic.currentTime = 0;
  battleMusicStarted = false;
  battleMusicMode = 'normal';
  if (battleMusicGain && climaxMusicGain) setBattleMusicMode('normal');
}
function syncBattleMusic() {
  if (!audioEnabled) {
    pauseBattleMusic();
    return;
  }
  if (timerStatus === 'paused') {
    pauseBattleMusic();
    return;
  }
  if (timerStatus === 'countdown') {
    if (!battleMusicStarted) startBattleMusic(true);
    if (battleMusicGain && climaxMusicGain) {
      battleMusicGain.gain.value = 0.0001;
      climaxMusicGain.gain.value = 0.0001;
    }
    return;
  }
  if (timerStatus !== 'running' && timerStatus !== 'countdown') {
    stopBattleMusic();
    return;
  }
  if (!battleMusicStarted) startBattleMusic();
  setBattleMusicMode(crunchTime() ? 'climax' : 'normal');
  if (battleMusicMode === 'climax') {
    battleMusic.pause();
    if (climaxMusic.paused) safePlayMusic(climaxMusic);
  } else {
    if (battleMusic.paused) safePlayMusic(battleMusic);
    if (climaxMusic.paused) safePlayMusic(climaxMusic, false);
  }
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
  oscillator.connect(gain).connect(masterGainNode || context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}
function playStartHorn() {
  playTone(98, 0.5, 'sawtooth', 0.24);
  playTone(392, 0.24, 'square', 0.18, 0.02);
  playTone(523, 0.3, 'square', 0.17, 0.1);
  playTone(784, 0.58, 'triangle', 0.2, 0.2);
}
function playReadyCue() {
  playTone(62, 0.48, 'sine', 0.2);
  playTone(196, 0.18, 'triangle', 0.13, 0.02);
  playTone(294, 0.18, 'triangle', 0.15, 0.18);
  playTone(440, 0.34, 'square', 0.17, 0.34);
}
function playCountdownCue(value) {
  const pitch = value === 3 ? 392 : (value === 2 ? 494 : 659);
  playTone(52, 0.25, 'sine', 0.23);
  playTone(pitch, 0.2, 'square', 0.2, 0.025);
  playTone(pitch * 2, 0.12, 'triangle', 0.12, 0.05);
  if (value === 1) playTone(988, 0.3, 'square', 0.16, 0.18);
}
function playFinishHorn() {
  playTone(392, 0.22, 'square', 0.12);
  playTone(294, 0.22, 'square', 0.12, 0.23);
  playTone(196, 0.7, 'sawtooth', 0.15, 0.46);
}
function playHeartbeat() {
  playTone(82, 0.12, 'sawtooth', 0.29);
  playTone(54, 0.18, 'square', 0.2, 0.14);
  playTone(108, 0.11, 'triangle', 0.14, 0.34);
}
function playFinalThirtyStinger() {
  playTone(110, 0.5, 'sawtooth', 0.24);
  playTone(330, 0.16, 'square', 0.18, 0.05);
  playTone(495, 0.16, 'square', 0.2, 0.25);
  playTone(880, 0.42, 'square', 0.19, 0.45);
}
function playFinalTenStinger() {
  playTone(52, 0.7, 'sawtooth', 0.3);
  playTone(620, 0.13, 'square', 0.2, 0.02);
  playTone(760, 0.13, 'square', 0.2, 0.18);
  playTone(980, 0.35, 'square', 0.22, 0.34);
}

// ===== 計時器 =====
function crunchTime() {
  return timerStatus === 'running' && secondsLeft <= 30 && secondsLeft > 0;
}
function finalThirtyVisual() {
  return (timerStatus === 'running' || timerStatus === 'paused') && secondsLeft <= 30 && secondsLeft > 0;
}
function finalTenVisual() {
  return finalThirtyVisual() && secondsLeft <= 10;
}
function matchDurationSeconds() {
  if (!DEMO) return 180;
  const requested = Number(new URLSearchParams(location.search).get('seconds'));
  return Number.isFinite(requested) && requested >= 1 && requested <= 180 ? Math.floor(requested) : 180;
}
function triggerFinalThirtyVisual() {
  const entry = $('finalThirtyEntry');
  if (!entry) return;
  entry.classList.remove('active');
  void entry.offsetWidth;
  entry.classList.add('active');
}
function triggerFinalTenVisual() {
  const entry = $('finalTenEntry');
  if (!entry) return;
  entry.classList.remove('active');
  void entry.offsetWidth;
  entry.classList.add('active');
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
    const notes = [293, 349, 392, 466, 523, 466, 587, 698];
    crunchInterval = setInterval(() => {
      const note = notes[musicStep % notes.length];
      playTone(note, 0.13, 'triangle', 0.09);
      if (musicStep % 2 === 0) playTone(62, 0.13, 'sawtooth', 0.12);
      if (musicStep % 4 === 0) playTone(note / 2, 0.2, 'square', 0.075);
      if (musicStep % 8 === 7) playTone(920, 0.07, 'square', 0.1);
      musicStep += 1;
    }, 180);
  } else if ((!crunchTime() || !audioEnabled) && crunchInterval) {
    clearInterval(crunchInterval);
    crunchInterval = null;
  }
  syncBattleMusic();
}
function onTick() {
  secondsLeft = Math.max(0, secondsLeft - 1);
  if (secondsLeft === 0) {
    timerStatus = 'finished';
    victoryDismissed = false;
    playFinishHorn();
    syncTimerLoops();
    renderMatchScreen();
    return;
  }
  if (secondsLeft <= 30) {
    if (secondsLeft === 30) {
      playFinalThirtyStinger();
      triggerFinalThirtyVisual();
    }
    playHeartbeat();
    if (secondsLeft <= 10) {
      if (secondsLeft === 10) {
        playFinalTenStinger();
        triggerFinalTenVisual();
      }
      playTone(720 + (10 - secondsLeft) * 28, 0.1, 'square', 0.16);
      playTone(46 + secondsLeft, 0.19, 'sawtooth', 0.17, 0.04);
    }
  }
  syncTimerLoops();
  updateTimerDisplay();
}
function updateTimerDisplay() {
  const numberEl = $('timerNumber');
  if (!numberEl) return;
  const finalVisual = finalThirtyVisual();
  const finalTen = finalTenVisual();
  numberEl.textContent = finalVisual ? String(secondsLeft) : formatClock(secondsLeft);
  numberEl.classList.toggle('heartbeat-number', finalVisual);
  numberEl.classList.toggle('final-ten-number', finalTen);
  if (finalTen) {
    numberEl.classList.remove('final-second-slam');
    void numberEl.offsetWidth;
    numberEl.classList.add('final-second-slam');
  }
  const caption = $('timerCaption');
  if (caption) caption.textContent = timerCaptionText();
  const screen = document.querySelector('.match-screen');
  if (screen) {
    screen.classList.toggle('crunch', finalVisual);
    screen.classList.toggle('final-ten', finalTen);
  }
  const hud = $('finalThirtyHud');
  if (hud) hud.setAttribute('aria-hidden', finalVisual ? 'false' : 'true');
  const meter = $('finalThirtyMeter');
  if (meter) meter.style.width = Math.max(0, Math.min(100, (secondsLeft / 30) * 100)) + '%';
  const seconds = $('finalThirtySeconds');
  if (seconds) seconds.textContent = secondsLeft + ' 秒';
  const phase = $('finalPhaseLabel');
  if (phase) phase.textContent = finalTen ? '⚠ LAST 10' : '⚠ FINAL 30';
}
function timerCaptionText() {
  if (timerStatus === 'ready') return 'READY TO FLY';
  if (timerStatus === 'countdown') return 'GET READY';
  if (timerStatus === 'running') return secondsLeft <= 10 ? 'LAST 10 • SCORE NOW!' : (secondsLeft <= 30 ? 'NEW MUSIC • FINAL COUNTDOWN' : 'BATTLE MUSIC • MATCH IN PROGRESS');
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

async function handleDeletePilot(pilot) {
  const button = $('confirmDeletePilotBtn');
  if (button) {
    button.disabled = true;
    button.textContent = '刪除中…';
  }
  setSaving(true);
  try {
    const result = await apiDeletePilot(pilot.id);
    pilots = pilots.filter((item) => item.id !== pilot.id);
    eventState = normalizeEventState(result.state).state;
    selectedPilotId = null;
    deleteConfirmPilotId = null;
    render();
    setNotice('駕照 ' + pilot.licenseNo + ' 已永久刪除。');
  } catch (error) {
    setNotice(error && error.message ? error.message : '駕照刪除失敗');
    deleteConfirmPilotId = null;
    renderModal();
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
  if (count < 6 || count % 3 !== 0) {
    setNotice('目前 ' + count + ' 人已報到；一場是兩支三人隊伍對戰，請至少報到 6 人且人數為 3 的倍數。');
    return;
  }
  const shuffledPilots = shuffled(checked);
  const groups = [];
  for (let index = 0; index < shuffledPilots.length; index += 3) {
    const number = index / 3;
    const name = String.fromCharCode(65 + number) + ' 隊';
    const id = uuid();
    const pilotIds = shuffledPilots.slice(index, index + 3).map((p) => p.id);
    groups.push({ id, name, pilotIds });
  }

  const matches = [];
  if (groups.length === 2) {
    const participantGroupIds = groups.map((group) => group.id);
    matches.push({
      id: uuid(),
      label: groups[0].name + ' VS ' + groups[1].name + '・冠軍戰',
      type: 'final',
      participantGroupIds,
      scores: Object.fromEntries(participantGroupIds.map((groupId) => [groupId, 0])),
      status: 'pending',
      winnerGroupId: null,
    });
  } else matches.push(...buildPreliminaryMatches(groups));
  commitState({
    ...eventState,
    tournamentVersion: 2,
    groups,
    matches,
    activeMatchId: null,
    championGroupId: null,
  });
  switchSection('groups');
  const scheduleSummary = groups.length === 2
    ? '兩隊直接進行冠軍戰。'
    : (groups.length === 3
        ? '三隊單組循環，每隊預賽 2 場，前兩名進總決賽。'
        : '已分成橘組與藍組，每組循環後由兩組第一名進總決賽。');
  setNotice('已完成 ' + groups.length + ' 支三人隊抽籤；' + scheduleSummary);
}

function openMatch(matchId) {
  practiceMode = false;
  musicPickerOpen = false;
  victoryDismissed = false;
  secondsLeft = 180;
  preCount = null;
  timerStatus = 'ready';
  syncTimerLoops();
  warmBattleMusic();
  commitState({ ...eventState, activeMatchId: matchId });
}

function openPracticeMatch() {
  practiceMode = true;
  musicPickerOpen = false;
  victoryDismissed = false;
  practiceScores = { 'practice-orange': 0, 'practice-blue': 0 };
  secondsLeft = 180;
  preCount = null;
  timerStatus = 'ready';
  syncTimerLoops();
  warmBattleMusic();
  renderMatchScreen();
}

function closeMatch() {
  if (timerStatus === 'running' || timerStatus === 'countdown') {
    setNotice('請先暫停比賽，再離開賽事畫面。');
    return;
  }
  timerStatus = 'ready';
  secondsLeft = 180;
  preCount = null;
  musicPickerOpen = false;
  victoryDismissed = false;
  syncTimerLoops();
  renderMusicPicker();
  if (practiceMode) {
    practiceMode = false;
    practiceScores = { 'practice-orange': 0, 'practice-blue': 0 };
    renderMatchScreen();
    setNotice('練習賽已結束，成績沒有寫入正式賽程。');
    return;
  }
  commitState({ ...eventState, activeMatchId: null });
}

function startMatch() {
  victoryDismissed = false;
  timerStatus = 'countdown';
  startBattleMusic(true);
  preCount = 'READY';
  playReadyCue();
  renderMatchScreen();
  const runStep = (value) => {
    if (timerStatus !== 'countdown') return; // 已離開或重置
    if (value > 0) {
      preCount = value;
      playCountdownCue(value);
      renderMatchScreen();
      setTimeout(() => runStep(value - 1), 1000);
      return;
    }
    preCount = null;
    secondsLeft = matchDurationSeconds();
    timerStatus = 'running';
    releaseBattleMusic();
    playStartHorn();
    syncTimerLoops();
    renderMatchScreen();
  };
  setTimeout(() => runStep(3), 900);
}

function updateScore(groupId, difference) {
  const match = activeMatch();
  if (!match || timerStatus === 'countdown') return;
  if (timerStatus === 'finished') victoryDismissed = false;
  if (practiceMode) {
    practiceScores = {
      ...practiceScores,
      [groupId]: Math.max(0, (practiceScores[groupId] || 0) + difference),
    };
    renderMatchScreen();
    return;
  }
  eventState = {
    ...eventState,
    matches: eventState.matches.map((m) =>
      m.id === match.id
        ? { ...m, scores: { ...m.scores, [groupId]: Math.max(0, (m.scores[groupId] || 0) + difference) } }
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
  victoryDismissed = false;
  syncTimerLoops();
  if (practiceMode) {
    practiceScores = { 'practice-orange': 0, 'practice-blue': 0 };
    renderMatchScreen();
    return;
  }
  eventState = {
    ...eventState,
    matches: eventState.matches.map((m) =>
      m.id === match.id
        ? { ...m, scores: Object.fromEntries(m.participantGroupIds.map((id) => [id, 0])) }
        : m,
    ),
  };
  renderMatchScreen();
}

function saveMatchResult() {
  const match = activeMatch();
  if (!match) return;
  if (practiceMode) {
    closeMatch();
    return;
  }
  const ranked = [...match.participantGroupIds].sort(
    (a, b) => (match.scores[b] || 0) - (match.scores[a] || 0),
  );
  if (ranked.length > 1 && (match.scores[ranked[0]] || 0) === (match.scores[ranked[1]] || 0)) {
    setNotice('最高分同分，請由裁判確認加分後再儲存。');
    return;
  }
  const winnerGroupId = ranked[0] || null;
  let matches = eventState.matches.map((m) =>
    m.id === match.id ? { ...m, status: 'complete', winnerGroupId } : m,
  );
  let championGroupId = eventState.championGroupId;

  if (match.type === 'heat') {
    const heats = matches.filter((m) => m.type === 'heat');
    const allHeatsComplete = heats.every((m) => m.status === 'complete');
    const finalExists = matches.some((m) => m.type === 'final');
    if (allHeatsComplete && !finalExists) {
      const finalists = finalistsFromHeats(eventState.groups, matches);
      matches = [
        ...matches,
        {
          id: uuid(),
          label: (getGroup(finalists[0]) ? getGroup(finalists[0]).name : '第一名') + ' VS ' +
            (getGroup(finalists[1]) ? getGroup(finalists[1]).name : '第二名') + '・總決賽',
          type: 'final',
          participantGroupIds: finalists,
          scores: Object.fromEntries(finalists.map((id) => [id, 0])),
          status: 'pending',
          winnerGroupId: null,
        },
      ];
    }
  } else {
    championGroupId = winnerGroupId;
  }

  commitState({ ...eventState, matches, activeMatchId: null, championGroupId });
  timerStatus = 'ready';
  secondsLeft = 180;
  syncTimerLoops();
  const winner = winnerGroupId ? getGroup(winnerGroupId) : null;
  setNotice(match.type === 'final'
    ? '冠軍誕生：' + (winner ? winner.name : '') + '，三位隊員共同奪冠！'
    : (winner ? winner.name : '') + ' 贏得本場 3 對 3 比賽！');
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
  renderMusicPicker();
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
    { cls: eventState.groups.length ? 'done' : (checked.length ? 'current' : ''), num: '02', title: '隨機三人組隊', sub: (eventState.groups.length || '尚未') + ' 隊' },
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
  const ready = checked.length >= 6 && checked.length % 3 === 0;
  $('createGroupsBtn').disabled = checked.length < 6;
  $('drawSummary').innerHTML =
    '<div><strong>' + checked.length + '</strong><span>已報到駕駛員</span></div>' +
    '<div><strong>' + Math.floor(checked.length / 3) + '</strong><span>完整三人隊伍</span></div>' +
    '<div class="' + (ready ? 'ready' : 'waiting') + '"><i></i>' +
      (ready ? '可以開始 3 對 3 抽籤' : '還需 ' + (checked.length < 6 ? 6 - checked.length : 3 - (checked.length % 3)) + ' 人') + '</div>';

  const map = pilotMap();
  $('groupsArea').innerHTML = eventState.groups.length
    ? '<div class="groups-board">' + eventState.groups.map((group, gi) =>
        '<article class="group-card group-' + (gi % 4) + '">' +
          '<header><span>' + esc(group.name) + '</span><small>3-PILOT TEAM ' + String(gi + 1).padStart(2, '0') + '</small></header>' +
          '<div class="group-pilots">' + group.pilotIds.map((pid, i) => {
            const p = map.get(pid);
            if (!p) return '';
            return '<div><span class="seed">0' + (i + 1) + '</span><img src="' + esc(portraitFor(p, i + gi)) + '" alt="' + esc(p.name) + '">' +
              '<div><strong>' + esc(p.name) + '</strong><small>' + esc(p.nickname || p.licenseNo) + '</small></div><b>' + esc(p.level) + '</b></div>';
          }).join('') + '</div>' +
          '<button data-goto="tournament">查看 3 對 3 隊伍賽程 →</button>' +
        '</article>'
      ).join('') + '</div>'
    : '<div class="waiting-board">' +
        '<div class="draw-orbit"><img src="assets/aqiu.jpg" alt=""><span></span><span></span><span></span></div>' +
        '<h2>等待抽籤</h2><p>至少 6 人且人數為 3 的倍數後，按下「開始隨機組隊」。</p>' +
      '</div>';
}

function matchRowHtml(match, index) {
  const groups = groupMap();
  const map = pilotMap();
  const winner = match.winnerGroupId ? groups.get(match.winnerGroupId) : null;
  return '<article class="match-row ' + match.status + '">' +
    '<div class="match-index">' + String(index + 1).padStart(2, '0') + '</div>' +
    '<div class="match-info"><small>' + (match.type === 'final' ? '3 VS 3 FINAL' : '3 VS 3 QUALIFIER') + '</small><strong>' + esc(match.label) + '</strong>' +
      '<div class="match-team-pair">' + match.participantGroupIds.map((groupId, teamIndex) => {
        const group = groups.get(groupId);
        if (!group) return '';
        return '<span class="match-mini-team"><b>' + esc(group.name) + '</b><i class="mini-avatars">' +
          group.pilotIds.map((pilotId, avatarIndex) => {
            const pilot = map.get(pilotId);
            return pilot ? '<img src="' + esc(portraitFor(pilot, avatarIndex + teamIndex)) + '" alt="' + esc(pilot.name) + '" title="' + esc(pilot.name) + '">' : '';
          }).join('') + '</i>' + (teamIndex === 0 ? '<em>VS</em>' : '') + '</span>';
      }).join('') + '</div></div>' +
    '<div class="match-status">' + (winner
      ? '<small>WINNING TEAM</small><strong>' + esc(winner.name) + '・三人共同晉級</strong>'
      : '<small>STATUS</small><strong>待比賽</strong>') + '</div>' +
    '<button data-open-match="' + esc(match.id) + '"' + (match.status === 'complete' ? ' disabled' : '') + '>' +
      (match.status === 'complete' ? '已完成' : '開啟賽場 →') + '</button>' +
  '</article>';
}

function renderTournament() {
  const map = pilotMap();
  const champion = eventState.championGroupId ? getGroup(eventState.championGroupId) : null;
  const heats = eventState.matches.filter((m) => m.type === 'heat');
  const finals = eventState.matches.filter((m) => m.type === 'final');
  let html = '';

  if (champion) {
    html += '<div class="champion-banner"><div class="trophy-orbit">★</div>' +
      '<div class="champion-team-avatars">' + champion.pilotIds.map((pilotId, index) => {
        const pilot = map.get(pilotId);
        return pilot ? '<img src="' + esc(portraitFor(pilot, index)) + '" alt="' + esc(pilot.name) + '">' : '';
      }).join('') + '</div>' +
      '<div><span>BLOCK PLANET TEAM CHAMPION</span><h2>' + esc(champion.name) + '</h2><p>' +
        champion.pilotIds.map((pilotId) => map.get(pilotId)).filter(Boolean).map((pilot) => esc(pilot.name)).join('・') + '</p></div></div>';
  }

  if (eventState.matches.length) {
    html += '<div class="bracket-layout">' +
      '<section><div class="bracket-heading"><span>3 對 3 預賽</span><small>' +
        heats.filter((m) => m.status === 'complete').length + '/' + heats.length + ' COMPLETE</small></div>' +
        '<div class="match-list">' + (heats.length
          ? heats.map((m, i) => matchRowHtml(m, i)).join('')
          : '<div class="direct-final-note"><span>3 VS 3</span><strong>兩支隊伍直接進入冠軍戰</strong></div>') + '</div></section>' +
      '<div class="bracket-path"><span></span><i></i><span></span></div>' +
      '<section class="final-column"><div class="bracket-heading"><span>總決賽</span><small>FINAL</small></div>' +
        (finals.length
          ? finals.map((m, i) => matchRowHtml(m, i)).join('')
          : '<div class="locked-final"><span>✦</span><h3>總決賽隊伍尚未出爐</h3><p>完成所有 3 對 3 預賽後，由橘組與藍組第一名進入總決賽。</p></div>') +
      '</section></div>';
  } else {
    html += '<div class="waiting-board">' +
      '<div class="draw-orbit"><img src="assets/keke.jpg" alt=""><span></span><span></span><span></span></div>' +
      '<h2>先完成隨機組隊</h2><p>賽程會根據三人隊伍的抽籤結果自動產生。</p>' +
      '<button class="primary-button compact" data-goto="groups">前往組隊</button></div>';
  }
  $('tournamentArea').innerHTML = html;
}

function renderModal() {
  const root = $('modalRoot');
  const pilot = selectedPilotId ? getPilot(selectedPilotId) : null;
  if (!pilot) { deleteConfirmPilotId = null; root.innerHTML = ''; return; }
  const checked = eventState.checkedInIds.includes(pilot.id);
  const confirmingDelete = deleteConfirmPilotId === pilot.id;
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
      '<div class="license-modal-actions' + (confirmingDelete ? ' confirming-delete' : '') + '">' +
        (confirmingDelete
          ? '<p class="delete-warning"><strong>確定永久刪除「' + esc(pilot.name) + '」？</strong><span>這個動作無法復原；若已加入隊伍，分組與賽程會一併重置。</span></p>' +
            '<button class="outline-button" id="cancelDeletePilotBtn">取消</button>' +
            '<button class="danger-button" id="confirmDeletePilotBtn">確定永久刪除</button>'
          : '<p>列印時請選擇「實際大小 / 100%」，即為標準卡尺寸。</p>' +
            '<button class="danger-button" id="requestDeletePilotBtn">刪除駕照</button>' +
            '<button class="outline-button" id="modalCheckinBtn"' + (checked ? ' disabled' : '') + '>' + (checked ? '✓ 今日已報到' : '今日報到') + '</button>' +
            '<button class="primary-button compact" id="printLicenseBtn">列印公版駕照</button>') +
      '</div>' +
    '</div>' +
  '</div>';

  $('modalBackdrop').addEventListener('mousedown', (e) => {
    if (e.target === e.currentTarget) { selectedPilotId = null; deleteConfirmPilotId = null; renderModal(); }
  });
  $('modalCloseBtn').addEventListener('click', () => { selectedPilotId = null; deleteConfirmPilotId = null; renderModal(); });
  if (confirmingDelete) {
    $('cancelDeletePilotBtn').addEventListener('click', () => { deleteConfirmPilotId = null; renderModal(); });
    $('confirmDeletePilotBtn').addEventListener('click', () => handleDeletePilot(pilot));
  } else {
    $('requestDeletePilotBtn').addEventListener('click', () => { deleteConfirmPilotId = pilot.id; renderModal(); });
    $('modalCheckinBtn').addEventListener('click', () => { directCheckIn(pilot.id); });
    $('printLicenseBtn').addEventListener('click', printLicense);
  }
}

function renderMusicPicker() {
  const root = $('musicSelectorRoot');
  if (!root) return;
  if (!musicPickerOpen) { root.innerHTML = ''; return; }
  const renderChoices = (choices, kind, selectedId) => choices.map((choice) =>
    '<button class="music-choice' + (choice.id === selectedId ? ' selected' : '') + '" data-music-kind="' + kind + '" data-music-id="' + esc(choice.id) + '">' +
      '<span class="music-choice-icon">' + choice.icon + '</span>' +
      '<span class="music-choice-copy"><strong>' + esc(choice.label) + '</strong><small>' + esc(choice.mood) + '</small><em>' + esc(choice.artist) + '・CC0</em></span>' +
      (choice.recommended ? '<b>推薦</b>' : '') +
      '<i>' + (choice.id === selectedId ? '✓ 已選' : '▶ 試聽') + '</i>' +
    '</button>',
  ).join('');
  root.innerHTML =
    '<div class="music-picker-backdrop" id="musicPickerBackdrop">' +
      '<section class="music-picker" role="dialog" aria-modal="true" aria-labelledby="musicPickerTitle">' +
        '<header><div><span>BLOCK PLANET BATTLE SOUND</span><h2 id="musicPickerTitle">挑選你的戰鬥音樂</h2><p>點一下立即試聽 9 秒，正式賽與練習賽都會使用你的選擇。</p></div>' +
          '<div><button class="music-sound-toggle" id="musicPickerAudioBtn">' + (audioEnabled ? '🔊 音樂開啟・MAX' : '🔇 音樂已關閉') + '</button><button class="music-picker-close" id="musicPickerCloseBtn" aria-label="關閉音樂選擇">×</button></div></header>' +
        '<div class="music-picker-scroll">' +
          '<div class="music-picker-section"><div class="music-section-title"><span>01</span><div><strong>一般比賽音樂</strong><small>0:00–2:30・童趣電玩戰鬥感</small></div></div>' +
            '<div class="music-choice-grid">' + renderChoices(BATTLE_MUSIC_CHOICES, 'battle', selectedBattleMusicId) + '</div></div>' +
          '<div class="music-picker-section climax-section"><div class="music-section-title"><span>30</span><div><strong>最後 30 秒全新音樂</strong><small>原音樂立即停止・整首換曲＋重鼓＋急促警示</small></div></div>' +
            '<div class="music-choice-grid climax-grid">' + renderChoices(CLIMAX_MUSIC_CHOICES, 'climax', selectedClimaxMusicId) + '</div></div>' +
        '</div>' +
        '<footer><span>所有曲目皆為 CC0 免費授權</span><strong>建議：星球彈跳 ＋ 最終決戰 MAX</strong><button class="primary-button compact" id="musicPickerDoneBtn">使用這組音樂</button></footer>' +
      '</section>' +
    '</div>';

  $('musicPickerBackdrop').addEventListener('mousedown', (event) => {
    if (event.target === event.currentTarget) closeMusicPicker();
  });
  $('musicPickerCloseBtn').addEventListener('click', closeMusicPicker);
  $('musicPickerDoneBtn').addEventListener('click', closeMusicPicker);
  $('musicPickerAudioBtn').addEventListener('click', toggleAudio);
  root.querySelectorAll('[data-music-kind]').forEach((button) => {
    button.addEventListener('click', () => selectAndPreviewMusic(button.dataset.musicKind, button.dataset.musicId));
  });
}

function victoryCelebrationMarkup(match, groups) {
  if (timerStatus !== 'finished' || victoryDismissed) return '';
  const outcome = matchOutcome(match);
  if (!outcome) return '';
  const firstId = match.participantGroupIds[0];
  const secondId = match.participantGroupIds[1];
  const first = groups.get(firstId);
  const second = groups.get(secondId);
  const scoreLine = '<div class="victory-score"><span>' + esc(first ? first.name : '第一隊') + '</span><strong>' + (match.scores[firstId] || 0) + '<i>:</i>' + (match.scores[secondId] || 0) + '</strong><span>' + esc(second ? second.name : '第二隊') + '</span></div>';

  if (outcome.tied) {
    return '<div class="victory-celebration tie-result">' +
      '<div class="victory-card"><span class="victory-kicker">OVERTIME REQUIRED</span><div class="victory-trophy">⚡</div><h2>平手！進入決勝加分</h2>' + scoreLine +
      '<p>系統判定目前同分；返回計分畫面，先加一分的隊伍立即獲勝。</p>' +
      '<div class="victory-actions"><button class="start-match-button" id="victoryAdjustBtn">返回計分・決勝加分</button></div></div>' +
    '</div>';
  }

  const winner = groups.get(outcome.winnerGroupId);
  const winnerMembers = winner ? arenaMembers(winner) : [];
  return '<div class="victory-celebration">' +
    '<div class="confetti-field" aria-hidden="true">' + confettiMarkup() + '</div>' +
    '<div class="victory-card"><span class="victory-kicker">WINNER CONFIRMED</span><div class="victory-trophy">🏆</div>' +
      '<h2>' + esc(winner ? winner.name : '勝隊') + '獲勝！</h2>' + scoreLine +
      '<div class="victory-team">' + winnerMembers.map((member, index) => '<div><img src="' + esc(portraitFor(member, index)) + '" alt="' + esc(member.name) + '"><strong>' + esc(member.name) + '</strong></div>').join('') + '</div>' +
      '<p>系統已依最終比分自動判定勝隊，恭喜全隊完成這場精彩比賽！</p>' +
      '<div class="victory-actions"><button class="secondary-match-button" id="victoryAdjustBtn">返回修正分數</button><button class="start-match-button finish" id="victoryConfirmBtn">' + (practiceMode ? '完成練習賽' : (match.type === 'final' ? '確認冠軍並完成' : '確認勝隊並晉級')) + '</button></div>' +
    '</div>' +
  '</div>';
}

function renderMatchScreen() {
  const root = $('matchScreenRoot');
  const match = activeMatch();
  if (!match) { root.innerHTML = ''; return; }
  const groups = arenaGroupMap();
  const selectedBattleMusic = musicChoice(BATTLE_MUSIC_CHOICES, selectedBattleMusicId);
  const selectedClimaxMusic = musicChoice(CLIMAX_MUSIC_CHOICES, selectedClimaxMusicId);
  const finalVisual = finalThirtyVisual();
  const finalTen = finalTenVisual();
  root.innerHTML =
  '<div class="match-screen' + (finalVisual ? ' crunch' : '') + (finalTen ? ' final-ten' : '') + '">' +
    '<header class="match-topbar">' +
      '<div class="match-brand"><img src="assets/block-planet-logo.png" alt=""><span>BLOCK PLANET <b>ARENA</b></span></div>' +
      '<div class="match-title"><small>' + (match.type === 'practice' ? 'PRACTICE MATCH・NO LICENSE' : (match.type === 'final' ? 'CHAMPIONSHIP FINAL' : 'QUALIFIER')) + '</small><strong>' + esc(match.label) + '</strong></div>' +
      '<div class="match-controls">' +
        '<button id="matchMusicBtn">' + (audioEnabled ? '♫ ' + esc(selectedBattleMusic.label) + '・選音樂' : '♫ 選音樂・目前關閉') + '</button>' +
        '<button id="matchCloseBtn">離開賽場 ×</button>' +
      '</div>' +
    '</header>' +
    '<div class="arena-net"></div>' +
    '<section class="timer-zone">' +
      '<div class="round-label"><span></span> ROUND TIMER <span></span></div>' +
      '<div class="final-thirty-hud" id="finalThirtyHud" aria-hidden="' + (finalVisual ? 'false' : 'true') + '"><div><strong id="finalPhaseLabel">' + (finalTen ? '⚠ LAST 10' : '⚠ FINAL 30') + '</strong><span id="finalThirtySeconds">' + secondsLeft + ' 秒</span></div><div class="final-thirty-track"><i id="finalThirtyMeter" style="width:' + Math.max(0, Math.min(100, (secondsLeft / 30) * 100)) + '%"></i></div><small>全新終局音樂：' + esc(selectedClimaxMusic.label) + '</small></div>' +
      '<div class="timer-number' + (finalVisual ? ' heartbeat-number' : '') + (finalTen ? ' final-ten-number' : '') + '" id="timerNumber">' + (finalVisual ? secondsLeft : formatClock(secondsLeft)) + '</div>' +
      '<div class="timer-caption" id="timerCaption">' + timerCaptionText() + '</div>' +
    '</section>' +
    '<section class="scoreboard team-scoreboard">' + match.participantGroupIds.map((groupId, i) => {
      const group = groups.get(groupId);
      if (!group) return '';
      const score = match.scores[groupId] || 0;
      return '<article class="score-pilot score-team pilot-color-' + i + '">' +
        '<div class="team-score-heading"><div><small>' + (practiceMode ? 'PRACTICE TEAM 0' + (i + 1) + '・免駕照' : 'TEAM 0' + (i + 1) + '・3 PILOTS') + '</small><h2>' + esc(group.name) + '</h2></div>' +
          '<span>' + (i === 0 ? 'ORANGE SIDE' : 'BLUE SIDE') + '</span></div>' +
        '<div class="team-roster">' + arenaMembers(group).map((pilot, pilotIndex) => {
          return '<div><span class="pilot-orb"><img src="' + esc(portraitFor(pilot, pilotIndex + i)) + '" alt="' + esc(pilot.name) + '"></span>' +
            '<strong>' + esc(pilot.name) + '</strong><small>' + esc(pilot.nickname || pilot.level) + '</small></div>';
        }).join('') + '</div>' +
        '<div class="team-score-control"><span class="score-label">TEAM SCORE</span><div class="score-control">' +
          '<button data-score="' + esc(groupId) + '" data-diff="-1"' + (score === 0 ? ' disabled' : '') + '>−</button>' +
          '<strong>' + score + '</strong>' +
          '<button data-score="' + esc(groupId) + '" data-diff="1">+</button>' +
        '</div></div>' +
      '</article>';
    }).join('') + '</section>' +
    '<footer class="match-footer">' +
      '<button class="secondary-match-button" id="matchResetBtn"' + (timerStatus === 'countdown' ? ' disabled' : '') + '>↺ 重置</button>' +
      (timerStatus === 'ready' ? '<button class="start-match-button" id="matchStartBtn"><span>▶</span>開始比賽</button>' : '') +
      (timerStatus === 'running' ? '<button class="start-match-button pause" id="matchPauseBtn"><span>Ⅱ</span>暫停比賽</button>' : '') +
      (timerStatus === 'paused' ? '<button class="start-match-button" id="matchResumeBtn"><span>▶</span>繼續比賽</button>' : '') +
      (timerStatus === 'finished' ? '<button class="start-match-button finish" id="matchFinishBtn"><span>🏆</span>查看比賽結果</button>' : '') +
      '<div class="rule-reminder"><span>◎</span><p><strong>' + (practiceMode ? '練習模式' : '裁判提醒') + '</strong>' + (practiceMode ? '免登入駕照，分數不會寫入正式賽程' : '分數記在整支三人隊伍，不是個人分數') + '</p></div>' +
    '</footer>' +
    (timerStatus === 'countdown' && preCount !== null
      ? '<div class="prestart-overlay' + (preCount === 'READY' ? ' ready-phase' : '') + '"><span>' + (preCount === 'READY' ? 'PILOTS STANDBY' : 'GET READY') + '</span><strong>' + preCount + '</strong><p>' + (preCount === 'READY' ? '戰鬥音樂將在比賽開始後播放' : (practiceMode ? '練習機就位' : '無人機就位')) + '</p></div>' : '') +
    '<div class="final-thirty-entry" id="finalThirtyEntry"><span>⚠ MUSIC SWITCH</span><strong>FINAL 30</strong><p>終局音樂啟動・全力得分！</p></div>' +
    '<div class="final-ten-entry" id="finalTenEntry"><span>⚠ LAST CHANCE</span><strong>LAST 10</strong><p>最後衝刺・現在就得分！</p></div>' +
    (timerStatus === 'finished' ? '<div class="finish-flash">TIME!</div>' : '') +
    victoryCelebrationMarkup(match, groups) +
  '</div>';

  const on = (id, fn) => { const el = $(id); if (el) el.addEventListener('click', fn); };
  on('matchMusicBtn', showMusicPicker);
  on('matchCloseBtn', closeMatch);
  on('matchResetBtn', resetCurrentMatch);
  on('matchStartBtn', startMatch);
  on('matchPauseBtn', () => setTimerStatus('paused'));
  on('matchResumeBtn', () => setTimerStatus('running'));
  on('matchFinishBtn', () => { victoryDismissed = false; renderMatchScreen(); });
  on('victoryAdjustBtn', () => { victoryDismissed = true; renderMatchScreen(); });
  on('victoryConfirmBtn', saveMatchResult);
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
  renderMusicPicker();
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
  $('heroPracticeBtn').addEventListener('click', openPracticeMatch);
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
    if (pilotBtn) { selectedPilotId = pilotBtn.dataset.pilot; deleteConfirmPilotId = null; renderModal(); return; }
    const checkinBtn = e.target.closest('[data-checkin]');
    if (checkinBtn) { directCheckIn(checkinBtn.dataset.checkin); return; }
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
    const normalized = normalizeEventState(state);
    eventState = normalized.state;
    if (normalized.migrated) await apiSaveState(eventState);
  } catch (error) {
    setNotice(error && error.message ? error.message : '資料連線失敗');
  }
  $('loadingStage').hidden = true;
  $('page-' + section).hidden = false;
  render();
}

init();
