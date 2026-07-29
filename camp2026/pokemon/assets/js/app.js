/* ============================================================
   app.js — 全站共用：模式切換、導覽、星空、儲存工具
   ============================================================ */

/* ---------- 星空背景 ---------- */
(function stars() {
  const box = document.createElement('div');
  box.className = 'stars';
  let html = '';
  for (let i = 0; i < 60; i++) {
    const x = Math.random() * 100, y = Math.random() * 100, d = (Math.random() * 3).toFixed(1);
    html += `<i style="left:${x}%;top:${y}%;animation-delay:${d}s"></i>`;
  }
  box.innerHTML = html;
  document.addEventListener('DOMContentLoaded', () => document.body.prepend(box));
})();

/* ---------- 模式（新手 / 進階）---------- */
const BP_MODE_KEY = 'bp_mode';
function getMode() { return localStorage.getItem(BP_MODE_KEY) || 'beginner'; }
function setMode(m) {
  localStorage.setItem(BP_MODE_KEY, m);
  applyMode();
}
function applyMode() {
  const m = getMode();
  document.body.classList.toggle('mode-beginner', m === 'beginner');
  document.body.classList.toggle('mode-advanced', m === 'advanced');
  document.querySelectorAll('.mode-toggle button').forEach(b =>
    b.classList.toggle('on', b.dataset.mode === m));
}

/* ---------- 共用 Header ---------- */
function renderHeader(active) {
  const base = location.pathname.includes('/learn/') || location.pathname.includes('/battle/') ? '../' : './';
  const html = `
  <div class="wrap">
    <a class="brand" href="${base}index.html">
      <img class="logo brand-logo" src="${base}assets/img/brand/blockplanet-logo.png" alt="布拉克星球">
      <span class="full">布拉克星球 ‧ 卡牌大賽</span>
    </a>
    <nav class="nav">
      <a href="${base}index.html" data-k="home">${bpIcon('home')}首頁</a>
      <a href="${base}learn/index.html" data-k="learn">${bpIcon('learn')}學習</a>
      <a href="${base}battle/index.html" data-k="battle">${bpIcon('battle')}賽事</a>
      <a href="${base}battle/console.html" data-k="console">${bpIcon('judge')}裁判台</a>
      <div class="mode-toggle" title="混齡模式切換">
        <button data-mode="beginner">新手</button>
        <button data-mode="advanced">進階</button>
      </div>
    </nav>
  </div>`;
  const header = document.createElement('header');
  header.className = 'site-header';
  header.innerHTML = html;
  document.body.prepend(header);
  const a = header.querySelector(`.nav a[data-k="${active}"]`);
  if (a) a.classList.add('active');
  header.querySelectorAll('.mode-toggle button').forEach(b =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));
  applyMode();
}

/* ---------- 共用 Footer ---------- */
function renderFooter() {
  const f = document.createElement('footer');
  f.className = 'site-footer';
  f.innerHTML = `<div class="wrap">${bpIcon('planet')}布拉克星球 Block Planet ‧ 寶可夢卡牌大賽系統　|　真卡桌遊對戰 ‧ 系統只負責教學與裁判管理</div>`;
  document.body.appendChild(f);
}

/* ---------- localStorage JSON 工具 ---------- */
const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
    catch (e) { return fallback; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },
  remove(key) { localStorage.removeItem(key); },
};

/* ---------- 小工具 ---------- */
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function bpIcon(name) {
  return `<span class="bp-icon i-${esc(name)}" aria-hidden="true"></span>`;
}
function stripEmoji(s) {
  return String(s == null ? '' : s)
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}]\uFE0F?/gu, '')
    .replace(/\u200D/gu, '')
    .replace(/\s{2,}/g, ' ');
}

/* ---------- 現行卡牌屬性（弱點 / 抵抗力必須逐張讀卡）---------- */
const TYPES = [
  { key: 'grass', name: '草', symbol: 'leaf', color: 'var(--t-grass)' },
  { key: 'fire', name: '火', symbol: 'flame', color: 'var(--t-fire)' },
  { key: 'water', name: '水', symbol: 'drop', color: 'var(--t-water)' },
  { key: 'lightning', name: '雷', symbol: 'bolt', color: 'var(--t-lightning)' },
  { key: 'psychic', name: '超', symbol: 'eye', color: 'var(--t-psychic)' },
  { key: 'fighting', name: '鬥', symbol: 'fist', color: 'var(--t-fighting)' },
  { key: 'darkness', name: '惡', symbol: 'moon', color: 'var(--t-darkness)' },
  { key: 'metal', name: '鋼', symbol: 'metal', color: 'var(--t-metal)' },
  { key: 'dragon', name: '龍', symbol: 'dragon', color: 'var(--t-dragon)' },
  { key: 'colorless', name: '無色', symbol: 'star', color: 'var(--t-colorless)' },
];
const TYPE_MAP = Object.fromEntries(TYPES.map(t => [t.key, t]));
