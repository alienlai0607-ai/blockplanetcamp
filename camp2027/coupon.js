(() => {
  'use strict';
  const config = window.CAMPAIGN_COUPON || {};
  const app = document.getElementById('app');
  const rulesDialog = document.getElementById('rules-dialog');
  const registerDialog = document.getElementById('register-dialog');
  const notice = document.getElementById('notice');
  const storagePrefix = config.storagePrefix || 'bp_2027c_coupon';
  const couponKey = `${storagePrefix}_data`;
  const fingerprintKey = `${storagePrefix}_fp`;
  const requestParams = new URLSearchParams(location.search);
  const requestedCampus = requestParams.get('campus');
  const selectedCamp = (config.registrationCamps || []).find(camp => camp.id === requestParams.get('camp')) || null;
  // Published registration forms do not imply coupon settlement support.
  const backendCampIds = ['full-term', 'drone', 'lego', 'game-lab', 'aviation', 'fragrance'];
  const isSelectedCampPending = () => !!selectedCamp && !backendCampIds.includes(selectedCamp.id);
  const campus = ['north', 'yongkang'].includes(requestedCampus) ? requestedCampus : 'all';
  function withCampus(value) {
    const url = new URL(value, location.href);
    url.searchParams.set('campus', campus);
    return url.href;
  }
  const home = withCampus(config.homeUrl || 'index.html');
  const camps = withCampus(config.campsUrl || 'index.html#camps');
  const registrationPage = withCampus('register.html');
  const line = config.lineUrl || 'https://lin.ee/zFqqFzQ';
  const minutes = Number(config.validMinutes) || 60;
  let currentCoupon = null, memoryCoupon = null, memoryFingerprint = null;
  let countdownTimer, openingTimer, noticeTimer;
  let activeRequest = false, requestRevision = 0, viewRevision = 0, clipboardRevision = 0;
  let serverClockOffset = 0, pendingPhone = '', rememberedPhone = '', readOnlyRules = false;
  let persistentStorage = true;

  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const opening = () => config.opensAt ? new Date(config.opensAt) : null;
  const now = () => Date.now() + serverClockOffset;
  const validPhone = value => /^09\d{8}$/.test(value);
  const safeUrl = (value, fallback = '#') => {
    try { const url = new URL(value, location.href); return ['https:', 'http:'].includes(url.protocol) ? value : fallback; } catch (_) { return fallback; }
  };
  const link = (url, text, cls = 'inline-button', external = false) => `<a class="${cls}" href="${escapeHtml(safeUrl(url))}"${external ? ' target="_blank" rel="noopener"' : ''}>${text}</a>`;
  const isPostponed = () => config.enabled !== true || config.releaseStatus === 'postponed';
  const campIds = ['full-term', 'drone', 'lego', 'game-lab', 'aviation', 'fragrance'];
  const readyRegistrationCamps = (config.registrationCamps || []).filter(camp => backendCampIds.includes(camp.id) && camp.kind === 'form');
  const canActivate = () => !isPostponed() && config.enabled === true && config.rulesConfirmed === true && config.backendReady === true && config.pricingReady !== false &&
    config.campaignId === '2027C' && Number.isFinite(opening()?.getTime()) &&
    /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(config.apiUrl || '') &&
    Array.isArray(config.eligibleCamps) && config.eligibleCamps.length === backendCampIds.length &&
    Array.isArray(config.registrationCamps) && config.registrationCamps.length === campIds.length &&
    campIds.every(id => config.registrationCamps.filter(camp => camp.id === id).length === 1) &&
    backendCampIds.every(id => readyRegistrationCamps.some(camp => camp.id === id && config.eligibleCamps.includes(camp.name)));
  const isOpen = () => !isSelectedCampPending() && canActivate() && now() >= opening().getTime();
  function safeGet(key) { try { return localStorage.getItem(key); } catch (_) { persistentStorage = false; return null; } }
  function safeSet(key, value) { try { localStorage.setItem(key, value); return true; } catch (_) { persistentStorage = false; return false; } }
  function clearCoupon() {
    try { localStorage.removeItem(couponKey); } catch (_) { persistentStorage = false; }
    currentCoupon = memoryCoupon = null;
  }
  function fingerprint() {
    const saved = safeGet(fingerprintKey);
    if (typeof saved === 'string' && /^[a-zA-Z0-9_-]{16,180}$/.test(saved)) return saved;
    if (!memoryFingerprint) {
      if (!window.crypto?.getRandomValues) throw new Error('BROWSER_UNSUPPORTED');
      const bytes = window.crypto.getRandomValues(new Uint8Array(24));
      memoryFingerprint = `fp_${Array.from(bytes, byte => byte.toString(16).padStart(2,'0')).join('')}`;
    }
    safeSet(fingerprintKey, memoryFingerprint);
    return memoryFingerprint; // Opaque receipt; backend verifies both phone and its hashed receipt.
  }
  function validCoupon(data) {
    return data && typeof data.code === 'string' && data.code.trim().length > 0 && data.code.length <= 100 &&
      Number.isFinite(new Date(data.expiresAt).getTime()) && validPhone(data.phone || '');
  }
  function storedCoupon() {
    try {
      const record = memoryCoupon || JSON.parse(safeGet(couponKey) || 'null');
      if (!validCoupon(record) || record.campaignId !== config.campaignId) return null;
      if (Number.isFinite(record.serverClockOffset)) serverClockOffset = record.serverClockOffset;
      return record;
    } catch (_) { return null; }
  }
  function saveCoupon(data) {
    memoryCoupon = { campaignId: config.campaignId, code: data.code, expiresAt: data.expiresAt, phone: data.phone,
      codeStatus: data.codeStatus === 'used' ? 'used' : 'claimed', serverClockOffset };
    safeSet(couponKey, JSON.stringify(memoryCoupon));
    return memoryCoupon;
  }
  async function apiCall(action, params = {}, timeoutOverrideMs = null) {
    if (!isOpen() || !['status', 'claim'].includes(action)) throw new Error('CAMPAIGN_NOT_OPEN');
    const url = new URL(config.apiUrl);
    url.searchParams.set('action', action);
    url.searchParams.set('campaignId', config.campaignId);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const requestedTimeout = timeoutOverrideMs == null ? Math.max(1000, Number(config.requestTimeoutMs) || 15000) : Math.max(1, timeoutOverrideMs);
    const timeout = setTimeout(() => controller.abort(), Math.min(30000, requestedTimeout));
    try {
      const response = await fetch(url.toString(), {signal: controller.signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer'});
      if (!response.ok) throw new Error('REQUEST_FAILED');
      const data = await response.json();
      if (!data || data.campaignId !== config.campaignId) throw new Error('CAMPAIGN_MISMATCH');
      if (data.serverTime != null) {
        const serverTime = new Date(data.serverTime).getTime();
        if (!Number.isFinite(serverTime)) throw new Error('INVALID_SERVER_TIME');
        serverClockOffset = serverTime - Date.now();
      }
      return data;
    } finally { clearTimeout(timeout); }
  }
  function render(content, state) {
    clearInterval(countdownTimer); clearInterval(openingTimer); clearTimeout(noticeTimer);
    viewRevision += 1; clipboardRevision += 1;
    document.querySelectorAll('dialog[open]').forEach(dialog => dialog.close());
    notice.hidden = true;
    app.dataset.state = state;
    app.setAttribute('aria-busy', String(state === 'loading'));
    app.innerHTML = content;
  }
  function showNotice(message) {
    clearTimeout(noticeTimer); notice.textContent = message; notice.hidden = false;
    noticeTimer = setTimeout(() => { notice.hidden = true; }, 4500);
  }
  function ticket(stub, action, state, extra = '') {
    return `<article class="ticket" data-state="${state}" aria-label="2027冬令營95折優惠券">
      <div class="ticket-face"><div class="ticket-topline"><span>布拉克星球・冬令營</span><span class="edition">2027</span></div>
      <div class="offer"><div class="offer-copy"><p>營隊報名優惠</p><strong><span>95</span><i>折</i></strong><p class="offer-note">六個冬令營皆適用</p></div><img class="learners" src="assets/coupon-learners.webp" width="1536" height="1024" alt="小橘人學員帶著布袋戲偶、無人機與積木龍車"></div>
      <div class="ticket-bottomline"><span>全期營・五日營・兩日營</span><span aria-hidden="true">✦</span></div></div>
      <div class="ticket-stub"><div class="stub-content" data-panel="${state}">${stub}</div></div>${action}</article>${extra}`;
  }
  function dateLabel() {
    const date = /^\d{4}-\d{2}-\d{2}$/.test(config.openingDate || '') ? config.openingDate : null;
    if (!date) return null;
    const parts = date.split('-'); return {date, month: String(Number(parts[1])), day: String(Number(parts[2]))};
  }
  function calendarLink(exact = false) {
    if (isPostponed() || !dateLabel() || !/^https:\/\//.test(config.publicCouponUrl || '')) return '';
    const {date} = dateLabel();
    const day = new Date(`${date}T00:00:00+08:00`);
    const stamp = value => value.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
    const localDay = value => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(value).replace(/-/g, '');
    const url = new URL('https://www.google.com/calendar/render');
    url.searchParams.set('action', 'TEMPLATE'); url.searchParams.set('text', '布拉克星球 2027 冬令營優惠券開放');
    url.searchParams.set('dates', exact ? `${stamp(opening())}/${stamp(new Date(opening().getTime()+1800000))}` : `${localDay(day)}/${localDay(new Date(day.getTime()+86400000))}`);
    url.searchParams.set('ctz', 'Asia/Taipei'); url.searchParams.set('details', `冬令營95折優惠券，限量60張。${exact ? '' : '開放時刻請以頁面公告為準。'}\n${config.publicCouponUrl}`);
    return link(url.href, '加入日曆提醒 ↗', 'inline-button', true);
  }
  function renderPostponed(saved = storedCoupon()) {
    // Preserve local proof of an earlier claim, including expired codes. This
    // state neither refreshes the pool nor creates, reclaims or extends a code.
    currentCoupon = saved;
    const savedDetails = saved ? `<section class="saved-coupon" aria-labelledby="saved-title"><h2 id="saved-title">這個瀏覽器保留的領券紀錄</h2><p>這是先前儲存的紀錄，未重新領取或延長期限。是否已套用優惠，請由官方 LINE 核對。</p><output class="coupon-code" id="saved-code">${escapeHtml(saved.code)}</output><button class="copy-code" data-action="copy-saved" type="button">複製原優惠碼 ⧉</button><p>原使用期限：${escapeHtml(new Intl.DateTimeFormat('zh-TW', {timeZone:'Asia/Taipei', year:'numeric', month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit', hour12:false}).format(new Date(saved.expiresAt)))}（台灣時間）</p>${link(line, 'LINE 核對既有領券紀錄 ↗', 'inline-button', true)}</section>` : '';
    render(ticket(`<span class="status">延後開放</span><p class="stub-label">優惠券領取</p><p class="opening-time">時間另行公告</p><span class="stub-rule"></span><p class="stub-note">新的開放日期與時間，<br>確認後會在這裡公布。</p>`,
      `<div class="ticket-action"><div><b>優惠券延後公開</b><p>開放時間另行公告，可先選擇營隊報名。</p></div>${link(registrationPage, '選擇營隊・開始報名 →', 'primary')}</div>`, 'postponed', savedDetails), 'postponed');
  }
  async function copySavedCode() {
    if (!isPostponed() || !currentCoupon) return;
    const code = currentCoupon.code, revision = viewRevision;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(code);
      if (revision === viewRevision) showNotice('原優惠碼已複製；使用狀態請由官方 LINE 核對。');
    } catch (_) {
      if (revision !== viewRevision) return;
      const value = document.getElementById('saved-code');
      if (value) { const range = document.createRange(); range.selectNodeContents(value); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
      showNotice('請長按或使用複製快捷鍵，複製已選取的原優惠碼。');
    }
  }
  function renderCampPending() {
    currentCoupon = null;
    renderStatus('camp-pending', '課程已開放報名，優惠券準備中',
      `${escapeHtml(selectedCamp.name)}的課程、費用與雲端報名表已公布，可直接前往表單報名。此營隊的優惠券使用功能尚未開放，確認後另行公告；目前不會開始 60 分鐘的使用倒數。`,
      `${link(selectedCamp.url, '直接前往營隊報名表 ↗', 'primary', true)}${link(registrationPage, '查看所有營隊 →')}${link(line, 'LINE 詢問優惠券進度 ↗', 'inline-button', true)}`);
  }
  function renderPending() {
    if (isSelectedCampPending()) { renderCampPending(); return; }
    if (isPostponed() || !dateLabel()) { renderPostponed(); return; }
    currentCoupon = null;
    const {month, day} = dateLabel();
    const exact = Number.isFinite(opening()?.getTime());
    const time = exact ? new Intl.DateTimeFormat('zh-TW', {timeZone:'Asia/Taipei',hour:'2-digit',minute:'2-digit',hour12:false}).format(opening()) : '';
    render(ticket(`<span class="status">優惠券準備中</span><p class="stub-label">原訂開放時間</p><p class="opening-time">${month} 月 ${day} 日${exact ? `<br>${escapeHtml(time)}（台灣時間）` : ''}</p><p class="quantity">限量 <b>${escapeHtml(config.initialPoolSize || 60)}</b> 張</p><span class="stub-rule"></span><p class="stub-note">實際領取開放時間，<br>請以後續公告為準。</p>`,
      `<div class="ticket-action"><div><b>營隊已開放報名，優惠券尚未開放</b><p>課程、費用與報名表已公布。優惠券使用功能確認後再開放，目前不會開始使用期限的倒數。</p></div>${link(registrationPage, '查看營隊・直接報名 →', 'primary')}</div>`, 'before', `<div class="state-links">${link(camps, '先看看冬令營課程 ↗')}${link(line, 'LINE 詢問優惠券進度 ↗', 'inline-button', true)}</div>`), 'integration-pending');
  }
  function renderNotYet() {
    currentCoupon = null;
    const date = opening();
    const formatted = new Intl.DateTimeFormat('zh-TW',{timeZone:'Asia/Taipei',month:'long',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);
    render(ticket(`<span class="status">即將開放</span><p class="stub-label">台灣時間</p><p class="opening-time">${escapeHtml(formatted)}</p><p class="quantity">限量 <b>60</b> 張</p>`,
      `<div class="ticket-action"><div><b>距離開放領取</b><p id="pre-countdown" role="timer" aria-label="距離優惠券開放時間"></p></div><button class="primary" disabled>尚未開放</button></div>`, 'before', `<div class="state-links">${calendarLink(true)}${link(registrationPage, '選擇營隊・開始報名 →')}</div>`), 'not-yet');
    const update = () => {
      const distance = date.getTime() - now();
      if (distance <= 0) { clearInterval(openingTimer); init(); return; }
      const seconds = Math.ceil(distance/1000), days = Math.floor(seconds/86400);
      document.getElementById('pre-countdown').textContent = `${days ? days+' 天 ' : ''}${[Math.floor(seconds/3600)%24,Math.floor(seconds/60)%60,seconds%60].map(n=>String(n).padStart(2,'0')).join(':')}`;
    };
    update(); openingTimer = setInterval(update, 1000);
  }
  function renderStatus(state, title, description, actions) {
    render(`<section class="status-card"><span class="status">2027 冬令營優惠券</span><h2>${title}</h2><p role="status">${description}</p><div class="status-actions">${actions || ''}</div></section>`, state);
  }
  function renderAvailable(remaining, poolSize = 60) {
    currentCoupon = null;
    render(ticket(`<span class="status">開放領取中</span><p class="stub-label">目前可領取</p><p class="release-date">${escapeHtml(remaining)}<span class="unit">張</span></p><p class="quantity">本次限量 ${escapeHtml(poolSize)} 張</p><span class="stub-rule"></span><p class="stub-note">手機綁定優惠碼，<br>報名請填相同號碼。</p>`,
      `<form class="ticket-action claim-form" id="claim-form" novalidate><div class="phone-field"><label for="phone-input">報名人手機號碼</label><input id="phone-input" type="tel" inputmode="numeric" autocomplete="tel-national" maxlength="16" placeholder="09xx xxx xxx" value="${escapeHtml(rememberedPhone)}" required aria-describedby="phone-hint claim-error"><p id="phone-hint">優惠碼綁定此手機，報名時請填相同號碼。</p><p id="claim-error" class="field-error" role="alert"></p></div><button class="primary" id="claim-button" type="submit">領取優惠券 →</button><p class="claim-terms">領取後 <b>${minutes} 分鐘內</b>完成報名。一支手機一張，限一位學員。<button class="inline-button" type="button" id="read-rules">查看使用規則</button></p></form>`, 'available'), 'available');
  }
  function setCopyStatus(message, success = false) {
    const heading = document.getElementById('copy-heading'); if (heading) heading.textContent = success ? '優惠碼已複製，接著去報名' : '優惠券已準備好';
    document.querySelectorAll('#copy-status,.registration-copy-state').forEach(el => { el.textContent = message; });
    document.querySelectorAll('[data-action="copy"]').forEach(button => { button.textContent = success ? '再複製一次 ⧉' : '複製優惠碼 ⧉'; });
  }
  function renderClaimed(coupon, automatic = true) {
    currentCoupon = coupon; rememberedPhone = coupon.phone;
    render(ticket(`<span class="status status-success">已領取</span><p class="stub-label">你的優惠碼</p><output class="coupon-code" id="code-value" tabindex="-1">${escapeHtml(coupon.code)}</output><button class="copy-code" data-action="copy" type="button">複製優惠碼 ⧉</button><span class="stub-rule"></span><p class="stub-label">剩餘使用時間</p><p class="timer" id="countdown" role="timer" aria-label="優惠碼剩餘使用時間">--:--</p><p class="stub-note demo-note">以優惠碼原有效期限計時</p>`,
      `<div class="ticket-action"><div><b id="copy-heading">優惠券已準備好</b><p id="copy-status" role="status">先複製優惠碼，再前往報名。</p></div><button class="primary" data-action="register" type="button">選擇營隊・前往報名 →</button></div>`, 'claimed',
      `<section class="next-steps" aria-labelledby="next-title"><h2 id="next-title">使用優惠碼請注意</h2><p>六個營隊皆適用。同一位學員可選一個 1/21–1/22 兩日營，再追加一個 1/25–1/29 五日營；每份報名都須在領券後 60 分鐘內送出。全期營與其他營隊日期重疊，請擇一報名。</p><div class="steps-row"><p><strong>表單貼上優惠碼</strong><span>填寫同一位學員，手機 ${escapeHtml(coupon.phone)}。</span></p><p><strong>60 分鐘內完成報名</strong><span>從領券成功起計時，請在倒數結束前送出表單。</span></p><p><strong>立即截圖傳官方 LINE</strong><span>送出後立即傳送報名截圖，由行政核對優惠與報名金額。</span></p></div>${link(line, '已送出報名？到 LINE 確認 ↗', 'inline-button', true)}${!persistentStorage ? '<p class="storage-warning" role="status">此瀏覽器無法保留優惠碼，請先複製或截圖並保留本頁。若關閉頁面後無法找回，請聯絡官方 LINE 協助。</p>' : ''}${coupon.codeStatus === 'used' ? '<p class="storage-warning">這張券已有報名紀錄；有效時間內，同一位學員僅可追加營期不重疊的適用營隊，請沿用原優惠碼；未知營期須先由教室核對。</p>' : ''}</section>`), 'claimed');
    document.getElementById('registration-code').textContent = coupon.code;
    setCopyStatus('先複製優惠碼，再前往報名。');
    if (startCountdown() && automatic) copyCode(true);
  }
  function startCountdown() {
    const update = () => {
      const remaining = currentCoupon ? new Date(currentCoupon.expiresAt).getTime()-now() : 0;
      if (remaining <= 0) { rememberedPhone = currentCoupon?.phone || rememberedPhone; clearCoupon(); renderExpired(); return false; }
      const seconds = Math.ceil(remaining/1000), el = document.getElementById('countdown');
      if (el) { el.textContent = `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`; el.classList.toggle('urgent', remaining < 300000); }
      return true;
    };
    if (!update()) return false;
    countdownTimer = setInterval(update, 1000); return true;
  }
  function renderEmpty() {
    currentCoupon = null;
    renderStatus('empty','這一輪優惠券已領取完畢','若有逾期且未使用的名額，會在核對後釋出。可以稍後再查看。',`<button class="primary" type="button" data-action="retry">再查看一次</button>${link(camps,'先看看營隊 ↗')}`);
  }
  function renderExpired() {
    renderStatus('expired','優惠碼已超過使用時間','若你已在期限內送出報名，請保留截圖並聯絡官方 LINE 確認。未使用名額核對釋出後，可重新領取。',`<button class="primary" type="button" data-action="reclaim">查看可領取名額</button>${link(line,'LINE 確認報名狀態 ↗','inline-button',true)}`);
  }
  function renderError() {
    renderStatus('error','暫時無法取得優惠券資訊','請稍後再試；若已領取，請沿用相同瀏覽器與手機重試，不會因此多領一張。',`<button class="primary" type="button" data-action="retry">重新確認優惠券資訊</button>${link(line,'LINE 聯絡我們 ↗','inline-button',true)}`);
  }
  function hasLiveCoupon() {
    if (isPostponed() || isSelectedCampPending()) return false; // Preserve existing claims while paused or browsing an unready camp.
    if (currentCoupon && new Date(currentCoupon.expiresAt).getTime() > now()) return true;
    if (currentCoupon) { rememberedPhone = currentCoupon.phone; clearCoupon(); renderExpired(); }
    return false;
  }
  async function copyCode(automatic = false) {
    if (!hasLiveCoupon()) return;
    const revision = viewRevision, copyRevision = ++clipboardRevision, code = currentCoupon.code;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
      await navigator.clipboard.writeText(code);
      if (revision !== viewRevision || copyRevision !== clipboardRevision || !hasLiveCoupon()) return;
      setCopyStatus(automatic ? '已自動複製。報名時貼上優惠碼，並填寫相同手機。' : '已複製優惠碼。報名時貼上代碼，並填寫相同手機。', true);
      if (!automatic) showNotice('優惠碼已複製，可以貼上報名表單。');
    } catch (_) {
      if (revision !== viewRevision || copyRevision !== clipboardRevision || !hasLiveCoupon()) return;
      setCopyStatus(automatic ? '手機未允許自動複製，請按「複製優惠碼」。' : '無法存入剪貼簿，已選取優惠碼；請長按或使用複製快捷鍵。');
      if (!automatic) {
        const value = registerDialog.open ? document.getElementById('registration-code') : document.getElementById('code-value');
        if (value) { const range = document.createRange(); range.selectNodeContents(value); const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range); }
      }
    }
  }
  function openRules(readOnly) {
    if (activeRequest) return;
    readOnlyRules = readOnly;
    const button = document.getElementById('confirm-claim');
    button.disabled = false; button.textContent = readOnly ? '了解使用方式' : '確認規則，領取優惠券 →';
    rulesDialog.querySelector('.dialog-cancel').textContent = readOnly ? '返回券面' : '先不領取';
    rulesDialog.showModal(); rulesDialog.scrollTop = 0;
  }
  function prepareClaim(event) {
    event.preventDefault();
    if (activeRequest || rulesDialog.open) return;
    if (!isOpen()) { renderPending(); return; }
    const input = document.getElementById('phone-input'), error = document.getElementById('claim-error');
    const phone = input.value.replace(/[\s-]/g,'');
    error.textContent = '';
    if (!validPhone(phone)) { input.setAttribute('aria-invalid','true'); error.textContent = '請輸入 09 開頭的 10 碼手機號碼。'; input.focus(); return; }
    input.value = pendingPhone = phone; input.removeAttribute('aria-invalid'); openRules(false);
  }
  function responseUnavailable(data) {
    if (data.errorCode === 'SOLD_OUT') { renderEmpty(); return true; }
    if (['EXPIRED_AWAITING_RECONCILIATION','USED_COUPON_EXPIRED'].includes(data.errorCode) || data.codeStatus === 'expired') { clearCoupon(); renderExpired(); return true; }
    if (data.errorCode === 'CAMPAIGN_DISABLED') { renderPending(); return true; }
    if (data.errorCode === 'NOT_OPEN') { now() < opening().getTime() ? renderNotYet() : renderPending(); return true; }
    return false;
  }
  async function claimWithBusyRetry(phone, receipt, revision, button) {
    // One logical claim: same persisted receipt and phone on every attempt.
    // Status requests keep their original timeout; claim allows the server's
    // 20-second lock wait to return BUSY, within one 60-second overall budget.
    const deadline = performance.now() + 60000;
    const delays = [1000, 2000, 4000];
    for (let attempt = 0; attempt <= delays.length; attempt += 1) {
      const remaining = deadline - performance.now();
      if (remaining <= 0 || revision !== requestRevision) throw new Error('BUSY_RETRY_EXHAUSTED');
      const data = await apiCall('claim', {phone, fp:receipt}, Math.min(25000, remaining));
      if (data.errorCode !== 'BUSY_RETRY') return data;
      if (attempt === delays.length || deadline - performance.now() <= delays[attempt]) throw new Error('BUSY_RETRY_EXHAUSTED');
      button.textContent = `系統忙碌，自動重試 ${attempt + 1}／3…`;
      const message = document.getElementById('claim-error');
      if (message) message.textContent = '正在用相同手機重新確認，請保留本頁，不需要重複點擊。';
      await new Promise(resolve => setTimeout(resolve, delays[attempt]));
    }
    throw new Error('BUSY_RETRY_EXHAUSTED');
  }
  async function claim() {
    if (activeRequest || !validPhone(pendingPhone)) return;
    if (!isOpen()) { renderPending(); return; }
    const phone = pendingPhone, revision = ++requestRevision;
    rememberedPhone = phone; activeRequest = true;
    const button = document.getElementById('claim-button'), input = document.getElementById('phone-input');
    button.disabled = true; input.disabled = true; document.getElementById('read-rules').disabled = true;
    button.textContent = '領取中，請稍候…'; app.setAttribute('aria-busy','true');
    document.getElementById('claim-error').textContent = '';
    try {
      const receipt = fingerprint();
      const data = await claimWithBusyRetry(phone,receipt,revision,button);
      if (revision !== requestRevision) return;
      if (responseUnavailable(data)) return;
      if (data.errorCode === 'PHONE_ALREADY_CLAIMED') {
        document.getElementById('claim-error').textContent = '此手機已在另一個瀏覽器領取。請回原瀏覽器查看優惠碼，或聯絡官方 LINE 協助。';
        button.textContent = '領取優惠券 →'; return;
      }
      const coupon = {code:data.code || data.existingCode,expiresAt:data.expiresAt,phone:data.phone || phone,codeStatus:data.codeStatus};
      if (data.success !== true || !validCoupon(coupon) || coupon.phone !== phone) throw new Error('INVALID_CLAIM');
      if (new Date(coupon.expiresAt).getTime() <= now()) { clearCoupon(); renderExpired(); return; }
      renderClaimed(saveCoupon(coupon));
      document.getElementById('code-value')?.focus({preventScroll:true});
    } catch (failure) {
      const error = document.getElementById('claim-error');
      if (revision === requestRevision && error) { error.textContent = failure.message === 'BUSY_RETRY_EXHAUSTED' ? '目前領取人數較多，這次自動重試已結束。請稍後再試，沿用相同瀏覽器與手機可找回原優惠碼。' : '暫時無法確認領券結果，請沿用相同瀏覽器與手機再試一次；已領取時會找回原優惠碼。'; button.textContent = '再試一次，領取優惠券'; }
    } finally {
      if (revision === requestRevision) {
        activeRequest = false; app.setAttribute('aria-busy','false');
        ['claim-button','phone-input','read-rules'].forEach(id => { const el = document.getElementById(id); if (el) el.disabled = false; });
      }
    }
  }
  async function init() {
    if (activeRequest) return;
    if (isSelectedCampPending()) { renderCampPending(); return; }
    if (isPostponed()) { renderPostponed(storedCoupon()); return; }
    if (!canActivate()) { renderPending(); return; }
    if (!isOpen()) { renderNotYet(); return; }
    const local = storedCoupon();
    if (local) {
      rememberedPhone = local.phone;
      if (new Date(local.expiresAt).getTime() <= now()) { clearCoupon(); renderExpired(); return; }
      renderClaimed(local); return;
    }
    const revision = ++requestRevision; activeRequest = true;
    renderStatus('loading','正在確認剩餘張數','稍等一下，即將為你更新。');
    try {
      const data = await apiCall('status');
      if (revision !== requestRevision) return;
      if (responseUnavailable(data)) return;
      const available = Number(data.available), poolSize = Number(data.poolSize || config.initialPoolSize);
      if (data.success !== true || !Number.isInteger(available) || available < 0 || !Number.isInteger(poolSize) || poolSize !== 60 || available > poolSize) throw new Error('INVALID_STATUS');
      available > 0 ? renderAvailable(available,poolSize) : renderEmpty();
    } catch (_) { if (revision === requestRevision) renderError(); }
    finally { if (revision === requestRevision) { activeRequest = false; app.setAttribute('aria-busy','false'); } }
  }
  document.getElementById('eligible-camps').innerHTML = (config.eligibleCamps || []).map(escapeHtml).join('<br>');
  document.getElementById('registration-links').innerHTML = readyRegistrationCamps.filter(camp => campus === 'all' || camp.classroomIds?.includes(campus)).sort((a, b) => Number(b.id === selectedCamp?.id) - Number(a.id === selectedCamp?.id)).map(camp => link(camp.url, `<span><strong>${escapeHtml(camp.name)}</strong><small>${escapeHtml(camp.description)}</small></span><span aria-hidden="true">↗</span>`, '', true)).join('');
  app.addEventListener('submit', event => { if (event.target.id === 'claim-form') prepareClaim(event); });
  app.addEventListener('input', event => {
    if (event.target.id !== 'phone-input') return;
    event.target.removeAttribute('aria-invalid'); document.getElementById('claim-error').textContent = '';
  });
  document.getElementById('confirm-claim').addEventListener('click', event => {
    if (readOnlyRules) { rulesDialog.close(); return; }
    if (activeRequest || event.currentTarget.disabled) return;
    event.currentTarget.disabled = true; rulesDialog.close(); claim();
  });
  document.addEventListener('click', event => {
    if (event.target.closest('#read-rules')) { openRules(true); return; }
    const button = event.target.closest('[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    if (action === 'copy-saved') copySavedCode();
    else if (action === 'copy') copyCode();
    else if (action === 'retry') init();
    else if (action === 'reclaim') { if (!isPostponed() && !isSelectedCampPending()) clearCoupon(); init(); }
    else if (action === 'register' && hasLiveCoupon()) { registerDialog.showModal(); registerDialog.scrollTop = 0; }
  });
  document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => button.closest('dialog').close()));
  document.querySelectorAll('.home-link,.camps-link').forEach(anchor => {
    anchor.href = safeUrl(anchor.classList.contains('camps-link') ? camps : home);
    anchor.addEventListener('click', event => {
      if (!hasLiveCoupon()) return;
      event.preventDefault(); document.getElementById('continue-link').href = anchor.href; document.getElementById('reminder-dialog').showModal();
    });
  });
  document.getElementById('continue-link').addEventListener('click', () => document.getElementById('reminder-dialog').close());
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') hasLiveCoupon(); });
  document.getElementById('registration-links').addEventListener('click', event => {
    if (event.target.closest('a') && !hasLiveCoupon()) event.preventDefault();
  });
  init();
})();
