(() => {
  'use strict';
  const config = window.CAMPAIGN_COUPON || {};
  const app = document.getElementById('app');
  const dialog = document.getElementById('reminder-dialog');
  const toast = document.getElementById('toast');
  const storagePrefix = config.storagePrefix || 'bp_2027c_coupon';
  const couponKey = `${storagePrefix}_data`;
  const fingerprintKey = `${storagePrefix}_fp`;
  const minutes = Number(config.validMinutes) || 60;
  let countdownTimer;
  let openingTimer;
  let toastTimer;
  let currentCoupon = null;
  let memoryFingerprint = null;
  let activeRequest = false;

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const link = (url, label, style = 'primary', extra = '') => `<a class="button ${style}" href="${escapeHtml(url)}" ${extra}>${label}</a>`;
  const home = config.homeUrl || 'index.html';
  const camps = config.campsUrl || 'index.html#camps';
  const line = config.lineUrl || 'https://lin.ee/zFqqFzQ';
  const opening = () => config.opensAt ? new Date(config.opensAt) : null;
  const canActivate = () => config.enabled === true && config.rulesConfirmed === true && config.backendReady === true &&
    config.campaignId === '2027C' && Number.isFinite(opening()?.getTime()) &&
    /^https:\/\/script\.google\.com\//.test(config.apiUrl || '') && Array.isArray(config.eligibleCamps) && config.eligibleCamps.length > 0;
  const isOpen = () => canActivate() && Date.now() >= opening().getTime();

  function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch (_) { return null; }
  }
  function safeStorageSet(key, value) {
    try { localStorage.setItem(key, value); return true; } catch (_) { return false; }
  }
  function clearCurrentCoupon() {
    try { localStorage.removeItem(couponKey); } catch (_) {}
    currentCoupon = null;
  }
  function getFingerprint() {
    let fingerprint = safeStorageGet(fingerprintKey) || memoryFingerprint;
    if (!fingerprint) {
      fingerprint = `fp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      safeStorageSet(fingerprintKey, fingerprint);
      memoryFingerprint = fingerprint;
    }
    return fingerprint;
  }
  function validCouponShape(data) {
    return data && typeof data.code === 'string' && data.code.length > 0 && data.code.length <= 100 &&
      Number.isFinite(new Date(data.expiresAt).getTime());
  }
  function getLocalCoupon() {
    try {
      const data = JSON.parse(safeStorageGet(couponKey) || 'null');
      if (!validCouponShape(data) || data.campaignId !== config.campaignId) return null;
      if (new Date(data.expiresAt).getTime() <= Date.now()) { clearCurrentCoupon(); return null; }
      return data;
    } catch (_) { return null; }
  }
  function saveLocalCoupon(data) {
    const record = { campaignId: config.campaignId, code: data.code, expiresAt: data.expiresAt, phone: data.phone || '' };
    safeStorageSet(couponKey, JSON.stringify(record));
    return record;
  }

  // 前端只沿用公開 status / claim。關閉或未到開放時間時，連 status 都不呼叫。
  async function apiCall(action, params = {}) {
    if (!isOpen() || !['status', 'claim'].includes(action)) throw new Error('CAMPAIGN_NOT_OPEN');
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store' });
      if (!response.ok) throw new Error('REQUEST_FAILED');
      return await response.json();
    } finally { clearTimeout(timeout); }
  }

  function render(content, state) {
    clearInterval(countdownTimer);
    clearInterval(openingTimer);
    app.dataset.state = state;
    app.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    app.innerHTML = content;
  }
  function showToast(message) {
    clearTimeout(toastTimer);
    toast.textContent = message;
    toast.hidden = false;
    toastTimer = setTimeout(() => { toast.hidden = true; }, 3500);
  }
  function formatOpening(date) {
    return new Intl.DateTimeFormat('zh-TW', {timeZone:'Asia/Taipei', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false}).format(date);
  }
  function calendarLink(date, dateOnly = false) {
    if (!config.publicCouponUrl || !/^https:\/\//.test(config.publicCouponUrl)) return '';
    const stamp = date => date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE');
    url.searchParams.set('text', '布拉克星球 2027 冬令營優惠券開放');
    const dayStamp = value => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei', year:'numeric', month:'2-digit', day:'2-digit'}).formatToParts(value).filter(part => part.type !== 'literal').map(part => [part.type, part.value]);
    const calendarDay = value => { const parts = Object.fromEntries(dayStamp(value)); return `${parts.year}${parts.month}${parts.day}`; };
    url.searchParams.set('dates', dateOnly ? `${calendarDay(date)}/${calendarDay(new Date(date.getTime() + 86400000))}` : `${stamp(date)}/${stamp(new Date(date.getTime() + 30 * 60000))}`);
    url.searchParams.set('ctz', 'Asia/Taipei');
    url.searchParams.set('details', `2027 冬令營優惠券開放領取。${dateOnly ? '確切開放時刻與優惠辦法請以頁面公告為準。' : ''}\n領取連結：${config.publicCouponUrl}`);
    return link(url.toString(), '加入日曆提醒 <span aria-hidden="true">↗</span>', 'secondary', 'target="_blank" rel="noopener"');
  }
  function campRules() {
    return `<div class="camp-rules"><p><strong>適用營隊</strong><br>${config.eligibleCamps.map(escapeHtml).join('、')}</p>${config.excludedCamps?.length ? `<p><strong>不適用</strong> ${config.excludedCamps.map(escapeHtml).join('、')}</p>` : ''}</div>`;
  }
  function rules() {
    return `<ul class="rules"><li>領取後 ${minutes} 分鐘內完成報名，逾時失效。</li><li>有效時間內，同一位學員可報名多個適用營隊。</li><li>一支手機限領一張，一張限一位學員；兄弟姊妹請用不同手機分別領取。</li><li>報名時請填相同手機號碼。</li><li>優惠券與兩人同行價擇優使用，不可疊加。</li></ul>`;
  }
  function renderPending() {
    const date = opening();
    const hasDate = date && Number.isFinite(date.getTime());
    const upcoming = hasDate && Date.now() < date.getTime();
    const titleDate = hasDate ? new Intl.DateTimeFormat('zh-TW', {timeZone:'Asia/Taipei', month:'long', day:'numeric'}).format(date) : '';
    const title = upcoming ? `${escapeHtml(titleDate)}<br>開放領取` : '優惠券準備中';
    const announcement = hasDate ? `<div class="pending-note"><strong>限量 ${escapeHtml(config.initialPoolSize)} 張</strong>適用營隊與完整優惠辦法將陸續公布。</div>` : '<div class="pending-note"><strong>先把喜歡的營隊選起來</strong>認識課程、看看孩子會完成什麼作品，再一起安排這個寒假。</div>';
    render(`<div class="card pending-card"><span class="state-tag">2027 冬令營優惠券</span><div class="state-icon" aria-hidden="true">券</div><h2>${title}</h2><p class="lead">優惠券尚未開放領取。<br>開放後可在這個頁面領取優惠碼。</p>${announcement}${link(camps, '先看看營隊 <span aria-hidden="true">↗</span>')}${hasDate ? calendarLink(date, true) : ''}${link(line, 'LINE 詢問開放資訊', 'secondary', 'target="_blank" rel="noopener"')}</div>`, 'pending');
  }
  function renderNotYet(date) {
    render(`<div class="card"><span class="state-tag">即將開放</span><h2>把開放時間記下來。</h2><p>冬令營專屬 ${escapeHtml(config.discountLabel)} 優惠券</p><div class="opening-time">${escapeHtml(formatOpening(date))} 開放 · 台灣時間</div><div class="pre-countdown" id="pre-countdown" role="timer" aria-label="距離優惠券開放時間">計算中</div><p>開放時，這個頁面會自動更新。</p>${campRules()}${link(camps, '先看看營隊 <span aria-hidden="true">↗</span>')}${calendarLink(date)}<p class="fine-print">已報名的家長也可依活動規則領取，再將優惠碼與手機號碼提供給官方 LINE，由行政協助確認。</p></div>`, 'not-yet');
    const update = () => {
      const distance = date.getTime() - Date.now();
      if (distance <= 0) { clearInterval(openingTimer); init(); return; }
      const days = Math.floor(distance / 86400000);
      const hours = Math.floor(distance / 3600000) % 24;
      const mins = Math.floor(distance / 60000) % 60;
      const seconds = Math.floor(distance / 1000) % 60;
      const el = document.getElementById('pre-countdown');
      if (el) el.textContent = `${days ? `${days} 天 ` : ''}${[hours,mins,seconds].map(n=>String(n).padStart(2,'0')).join(':')}`;
    };
    update();
    openingTimer = setInterval(update, 1000);
  }
  function renderLoading() {
    render(`<div class="card status-card"><span class="state-tag">冬令營優惠券</span><h2>正在確認剩餘張數</h2><div class="loading-line" aria-hidden="true"></div><p role="status">稍等一下，即將為你更新。</p></div>`, 'loading');
  }
  function renderAvailable(remaining, total) {
    render(`<div class="card"><span class="state-tag">開放領取中</span><div class="discount">${escapeHtml(config.discountLabel)}</div><h2>領一張，帶著期待出發。</h2><div class="remaining"><span>目前可領取</span><strong>${escapeHtml(remaining)} / ${escapeHtml(total)} 張</strong></div>${rules()}${campRules()}<form id="claim-form" novalidate><div class="phone-field"><label for="phone-input">報名人手機號碼</label><input id="phone-input" name="phone" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="10" placeholder="0912345678" required aria-describedby="phone-hint claim-error"><p class="field-hint" id="phone-hint">優惠碼會綁定此號碼，報名時請填相同手機。</p><p class="field-error" id="claim-error" role="alert"></p></div><button class="button primary" id="claim-button" type="submit">領取我的優惠券 <span aria-hidden="true">↗</span></button></form><p class="fine-print">已報名也可領取，請將優惠碼與手機號碼傳給官方 LINE，由行政協助確認。</p></div>`, 'available');
  }
  function renderClaimed(coupon) {
    currentCoupon = coupon;
    render(`<div class="card"><span class="state-tag">優惠券已領取</span><h2>優惠準備好了，<br>接著選一場冒險。</h2><p>請在時間內填妥表單，並貼上優惠碼。</p><div class="code-box"><label>你的專屬優惠碼</label><output class="code-value" id="code-value">${escapeHtml(coupon.code)}</output><button class="copy-button" type="button" data-action="copy" id="copy-button">複製優惠碼</button></div><div class="timer-box" id="timer-box"><span>優惠碼剩餘使用時間</span><output class="timer-value" id="countdown" role="timer" aria-label="優惠碼剩餘使用時間">--:--</output><span>請在倒數結束前完成報名</span></div><p class="section-title">四個步驟，完成報名</p><ol class="steps"><li>前往營隊報名表單。</li><li>在「優惠碼」欄位貼上 <strong>${escapeHtml(coupon.code)}</strong>。</li><li>手機號碼填 <strong>${escapeHtml(coupon.phone || '領券時使用的號碼')}</strong>。</li><li>送出後截圖，傳至官方 LINE 確認。</li></ol>${campRules()}<button class="button primary" data-action="register" type="button">帶著優惠碼去報名 <span aria-hidden="true">↗</span></button><button class="button secondary" data-action="line" type="button">LINE 詢問與確認</button><button class="button subtle" data-action="home" type="button">查看所有營隊</button>${rules()}<p class="fine-print">已報名的家長，請將優惠碼及手機號碼傳至官方 LINE，由行政協助處理。</p></div>`, 'claimed');
    startCountdown(new Date(coupon.expiresAt).getTime());
    copyCode(true);
  }
  function startCountdown(expiresAt) {
    const update = () => {
      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { clearInterval(countdownTimer); clearCurrentCoupon(); renderExpired(); return false; }
      const seconds = Math.ceil(remaining / 1000);
      const el = document.getElementById('countdown');
      if (el) el.textContent = `${String(Math.floor(seconds / 60)).padStart(2,'0')}:${String(seconds % 60).padStart(2,'0')}`;
      document.getElementById('timer-box')?.classList.toggle('urgent', remaining < 5 * 60000);
      return true;
    };
    if (update()) countdownTimer = setInterval(update, 1000);
  }
  function renderEmpty() {
    currentCoupon = null;
    render(`<div class="card status-card"><span class="state-tag">目前已領完</span><div class="state-icon" aria-hidden="true">✳</div><h2>這一輪優惠券，<br>已經被領取完了。</h2><p>若有人未在時間內使用，系統會釋出新的優惠券。可以稍後回來查看。</p><div class="pending-note"><strong>喜歡的營隊，還是可以先了解</strong>目前課程與報名資訊，請以營隊頁面為準。</div><button class="button primary" type="button" data-action="retry">再查看一次</button>${link(camps, '看看營隊方案', 'secondary')}${link(line, 'LINE 詢問優惠', 'subtle', 'target="_blank" rel="noopener"')}</div>`, 'empty');
  }
  function renderExpired() {
    render(`<div class="card status-card"><span class="state-tag">優惠碼已過期</span><div class="state-icon" aria-hidden="true">◷</div><h2>這張優惠券，<br>已超過使用時間。</h2><p>還想參加？可以再看看是否有可領取的優惠券。</p><div class="pending-note">若你已在時間內送出報名，請先將截圖提供給官方 LINE，讓行政協助確認。</div><button class="button primary" type="button" data-action="reclaim">重新領取一張 <span aria-hidden="true">↗</span></button>${link(line, 'LINE 確認報名狀態', 'secondary', 'target="_blank" rel="noopener"')}</div>`, 'expired');
  }
  function renderError() {
    render(`<div class="card status-card"><span class="state-tag">連線稍候</span><h2>暫時無法取得優惠券資訊。</h2><p>請再試一次，或透過 LINE 與我們聯絡。</p><button class="button primary" type="button" data-action="retry">重新整理優惠券資訊</button>${link(line, 'LINE 聯絡我們', 'secondary', 'target="_blank" rel="noopener"')}</div>`, 'error');
  }

  async function copyCode(automatic = false) {
    if (!currentCoupon) return;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(currentCoupon.code);
      const button = document.getElementById('copy-button');
      if (button) button.textContent = automatic ? '優惠碼已自動複製' : '已複製優惠碼';
      if (!automatic) showToast('優惠碼已複製，可以貼上報名表單。');
    } catch (_) {
      if (automatic) return;
      const value = document.getElementById('code-value');
      if (value) { const range = document.createRange(); range.selectNodeContents(value); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
      showToast('請長按優惠碼或使用複製快捷鍵，手動複製。');
    }
  }
  function showReminder(target) {
    const next = document.getElementById('continue-link');
    next.href = target;
    if (/^https?:\/\//.test(target)) { next.target = '_blank'; next.rel = 'noopener'; }
    else { next.removeAttribute('target'); next.removeAttribute('rel'); }
    dialog.showModal();
  }
  async function handleClaim(event) {
    event.preventDefault();
    if (activeRequest) return;
    if (!isOpen()) { renderPending(); return; }
    const phoneInput = document.getElementById('phone-input');
    const error = document.getElementById('claim-error');
    const button = document.getElementById('claim-button');
    const phone = phoneInput.value.replace(/\D/g, '');
    phoneInput.value = phone;
    error.textContent = '';
    if (!/^09\d{8}$/.test(phone)) {
      phoneInput.setAttribute('aria-invalid', 'true');
      error.textContent = '請輸入 09 開頭的 10 碼手機號碼。';
      phoneInput.focus();
      return;
    }
    phoneInput.removeAttribute('aria-invalid');
    activeRequest = true;
    button.disabled = true;
    button.textContent = '領取中，請稍候…';
    app.setAttribute('aria-busy', 'true');
    try {
      const data = await apiCall('claim', {fp:getFingerprint(), phone});
      const coupon = {code:data.code || data.existingCode, expiresAt:data.expiresAt, phone:data.phone || phone};
      if ((data.success || data.existingCode) && validCouponShape(coupon)) {
        const saved = saveLocalCoupon(coupon);
        renderClaimed(saved);
      } else if (data.success === false && /領完|全部|available|empty|sold/i.test(String(data.error || ''))) {
        renderEmpty();
      } else { throw new Error('INVALID_RESPONSE'); }
    } catch (_) {
      if (document.getElementById('claim-button')) {
        button.disabled = false;
        button.textContent = '再試一次，領取優惠券';
        error.textContent = '系統暫時忙碌，請稍後再試。若已領取，同一手機會顯示原優惠碼。';
      }
    } finally { activeRequest = false; app.setAttribute('aria-busy', 'false'); }
  }
  async function init() {
    if (!canActivate()) { renderPending(); return; }
    if (Date.now() < opening().getTime()) { renderNotYet(opening()); return; }
    const local = getLocalCoupon();
    if (local) { renderClaimed(local); return; }
    renderLoading();
    try {
      const data = await apiCall('status');
      if (data.success === false || !Number.isFinite(Number(data.available)) || !Number.isFinite(Number(data.total))) throw new Error('INVALID_STATUS');
      if (Number(data.available) > 0) renderAvailable(data.available, data.total);
      else renderEmpty();
    } catch (_) { renderError(); }
  }

  app.addEventListener('submit', event => { if (event.target.id === 'claim-form') handleClaim(event); });
  app.addEventListener('input', event => {
    if (event.target.id !== 'phone-input') return;
    event.target.value = event.target.value.replace(/\D/g, '').slice(0, 10);
    event.target.removeAttribute('aria-invalid');
    document.getElementById('claim-error').textContent = '';
  });
  app.addEventListener('click', event => {
    const action = event.target.closest('[data-action]')?.dataset.action;
    if (action === 'copy') copyCode();
    else if (action === 'retry') init();
    else if (action === 'reclaim') { clearCurrentCoupon(); init(); }
    else if (action === 'register') showReminder(camps);
    else if (action === 'line') showReminder(line);
    else if (action === 'home') showReminder(home);
  });
  document.querySelectorAll('.home-link').forEach(anchor => {
    anchor.href = home;
    anchor.addEventListener('click', event => {
      if (currentCoupon && new Date(currentCoupon.expiresAt).getTime() > Date.now()) { event.preventDefault(); showReminder(home); }
    });
  });
  dialog.querySelectorAll('.dialog-close,.dialog-cancel').forEach(button => button.addEventListener('click', () => dialog.close()));
  document.getElementById('continue-link').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && currentCoupon && new Date(currentCoupon.expiresAt).getTime() <= Date.now()) { clearCurrentCoupon(); renderExpired(); }
  });
  init();
})();
