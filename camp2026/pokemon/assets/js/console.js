/* ============================================================
   console.js — 裁判控制台（賽事管理 + 罰則助手 + 爭議流程）
   ============================================================ */
const PASSWORD = 'block';

const Console = {
  pendingPhoto: '',
  pendingType: 'lightning',

  mascotByType: {
    grass: 'mascot-xingxing.jpg',
    fire: 'mascot-keke.jpg',
    water: 'mascot-lala.jpg',
    lightning: 'mascot-xiaobu.jpeg',
    psychic: 'mascot-aqiu.jpg',
    fighting: 'mascot-keke.jpg',
    darkness: 'mascot-aqiu.jpg',
    metal: 'mascot-xiaobu.jpeg',
    dragon: 'mascot-keke.jpg',
    colorless: 'mascot-xingxing.jpg',
  },

  typeMeta(key) {
    return TYPE_MAP[key] || TYPE_MAP.colorless;
  },

  mascotForType(key) {
    return Console.mascotByType[key] || Console.mascotByType.colorless;
  },

  trainerProfile(key) {
    const profiles = {
      grass: { title: '森林探索家', motto: '觀察、成長、穩定前進', energy: 'grass.png' },
      fire: { title: '火焰挑戰者', motto: '熱情、勇氣、果斷出擊', energy: 'fire.png' },
      water: { title: '潮汐策略家', motto: '冷靜、靈活、掌握節奏', energy: 'water.png' },
      lightning: { title: '閃電先鋒', motto: '敏捷、專注、搶得先機', energy: 'lightning.png' },
      psychic: { title: '心靈觀察員', motto: '洞察、預判、精準布局', energy: 'psychic.png' },
      fighting: { title: '格鬥實踐家', motto: '堅持、行動、正面突破', energy: 'fighting.png' },
      darkness: { title: '暗夜策略家', motto: '沉著、變化、出奇制勝', energy: 'darkness.png' },
      metal: { title: '鋼鐵守備者', motto: '紀律、耐心、穩固防線', energy: 'metal.png' },
      dragon: { title: '龍之遠征者', motto: '氣勢、膽識、挑戰極限', mark: '龍' },
      colorless: { title: '全能探險家', motto: '自在、適應、創造可能', mark: '無色' },
    };
    return profiles[key] || profiles.colorless;
  },

  trainerPass(tr, preview) {
    const type = Console.typeMeta(tr.type);
    const profile = Console.trainerProfile(type.key);
    const no = tr.no ? String(tr.no).padStart(3, '0') : '---';
    const name = tr.name || '訓練家姓名';
    const initial = esc(name.slice(0, 1));
    const registered = tr.registeredAt
      ? new Date(tr.registeredAt).toLocaleDateString('zh-TW')
      : new Date().toLocaleDateString('zh-TW');
    const photo = tr.photo
      ? `<img src="${tr.photo}" alt="${esc(name)}的正面照片">`
      : `<span class="trainer-pass-initial">${initial}</span>`;
    const typeMark = profile.energy
      ? `<img src="../assets/img/cards/energy/${profile.energy}" alt="${esc(type.name)}屬性能量卡">`
      : `<span>${esc(profile.mark)}</span>`;

    return `<div class="trainer-pass-frame">
      <article class="trainer-pass trainer-pass-${type.key}${preview ? ' is-preview' : ''}">
      <div class="trainer-pass-world" aria-hidden="true"></div>
      <div class="trainer-pass-mascot" aria-hidden="true"></div>
      <div class="trainer-pass-energy-lines" aria-hidden="true"></div>
      <header class="trainer-pass-header">
        <img src="../assets/img/brand/blockplanet-logo.png" alt="">
        <div>
          <span>2026 BLOCK PLANET CAMP LEAGUE</span>
          <b>寶可夢卡牌訓練家證</b>
        </div>
        <strong><small>TRAINER ID</small>No. ${no}</strong>
      </header>
      <div class="trainer-pass-body">
        <div class="trainer-pass-photo-wrap">
          <span>TRAINER PORTRAIT</span>
          <div class="trainer-pass-photo">${photo}</div>
          <b>正式參賽訓練家</b>
        </div>
        <div class="trainer-pass-identity">
          <span class="trainer-pass-label">TRAINER NAME</span>
          <h3>${esc(name)}</h3>
          <div class="trainer-pass-type">
            <div><b>${esc(profile.title)}</b><small>${esc(profile.motto)}</small></div>
          </div>
          <dl>
            <div><dt>TRAINER CLASS</dt><dd>${esc(type.name)}系</dd></div>
            <div><dt>STATUS</dt><dd>認證通過</dd></div>
            <div><dt>ISSUED</dt><dd>${registered}</dd></div>
          </dl>
        </div>
        <aside class="trainer-pass-affinity">
          <span>TYPE LICENSE</span>
          <div class="trainer-pass-energy">${typeMark}</div>
          <b>${esc(type.name)}系</b>
          <small>屬性認證</small>
        </aside>
      </div>
      <footer class="trainer-pass-footer">
        <b>TRAIN · LEARN · BATTLE</b>
        <span aria-hidden="true"></span>
        <strong>OFFICIAL CAMP TRAINER</strong>
      </footer>
      </article>
    </div>`;
  },

  init() {
    // 密碼
    const tryUnlock = () => {
      const v = document.getElementById('pwd').value.trim();
      if (v === PASSWORD) {
        sessionStorage.setItem('bp_console_ok', '1');
        document.getElementById('pwdErr').textContent = '';
        document.getElementById('lock').style.display = 'none';
        document.getElementById('panel').style.display = 'block';
        Console.boot();
      } else {
        document.getElementById('pwdErr').textContent = '密碼不對，再試一次（提示：block）';
      }
    };
    document.getElementById('unlock').addEventListener('click', tryUnlock);
    document.getElementById('pwd').addEventListener('keydown', e => { if (e.key === 'Enter') tryUnlock(); });
    if (sessionStorage.getItem('bp_console_ok') === '1') {
      document.getElementById('lock').style.display = 'none';
      document.getElementById('panel').style.display = 'block';
      Console.boot();
    }
  },

  boot() {
    // 分頁
    document.querySelectorAll('#ctabs a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const name = a.getAttribute('href').slice(1);
        document.querySelectorAll('[data-cpane]').forEach(s => s.hidden = s.dataset.cpane !== name);
        document.querySelectorAll('#ctabs a').forEach(x => x.classList.toggle('active', x === a));
      });
    });
    // 頂部工具
    document.getElementById('exportBtn').addEventListener('click', Console.exportData);
    document.getElementById('importBtn').addEventListener('click', () => document.getElementById('importFile').click());
    document.getElementById('importFile').addEventListener('change', Console.importData);
    document.getElementById('resetBtn').addEventListener('click', () => {
      if (confirm('確定要清空整個比賽資料？此動作無法復原（建議先匯出備份）。')) {
        T.reset(); Console.refresh();
      }
    });
    // 訓練家 modal
    Console.setupTrainerModal();
    window.addEventListener('resize', Console.fitTrainerPasses);
    // 罰則 / 爭議（靜態，一次渲染）
    Console.renderPenalty();
    Console.renderDispute();
    Console.refresh();
  },

  refresh() {
    const s = T.load();
    document.getElementById('flowSteps').innerHTML = BV.flow(s);
    Console.renderManage(s);
  },

  /* ---------- 賽事管理主畫面 ---------- */
  renderManage(s) {
    const box = document.getElementById('manageBox');
    let html = '';

    // 訓練家登記區
    html += `<div class="card" style="margin-bottom:18px">
      <div class="toolbar">
        <h2 class="section-title">${bpIcon('trainers')}訓練家登記（${s.trainers.length}）</h2>
        <span class="spacer"></span>
        ${s.meta.status === 'setup' ? `<button class="btn gold sm" id="addTrainerBtn">${bpIcon('plus')}新增訓練家</button>` : ''}
      </div>
      ${s.trainers.length ? `<div class="trainer-grid">` + s.trainers.map(t => {
        const type = Console.typeMeta(t.type);
        const profile = Console.trainerProfile(type.key);
        const mark = profile.energy
          ? `<img src="../assets/img/cards/energy/${profile.energy}" alt="">`
          : `<i>${esc(profile.mark)}</i>`;
        return `
        <div class="trainer trainer-type-${type.key}">
          <span class="tnum">#${t.no}</span>
          ${BV.photo(t,'photo')}
          <div class="tname">${esc(t.name)}</div>
          <div class="trainer-card-type">${mark}<span>${esc(profile.title)} · ${esc(type.name)}系</span></div>
          <button class="btn ghost sm trainer-pass-button" data-pass="${t.id}">${bpIcon('card')}查看訓練家證</button>
          ${s.meta.status === 'setup' ? `<button class="btn danger sm" style="margin-top:6px;padding:3px 10px" data-del="${t.id}">移除</button>` : ''}
        </div>`;
      }).join('') + `</div>` : `<div class="empty"><div class="big">${bpIcon('trainers')}</div><p>還沒有訓練家，按右上角新增。</p></div>`}
    </div>`;

    // 階段控制
    if (s.meta.status === 'setup') {
      const ready = s.trainers.length >= 2;
      html += `<div class="card">
        <h2 class="section-title">${bpIcon('draw')}開始資格賽</h2>
        <p class="section-sub">登記完成後抽籤開打。共 ${s.meta.qualTotalRounds} 輪資格賽，前 8 名晉級八強（需至少 8 位訓練家）。</p>
        <button class="btn gold ${ready?'':'disabled'}" id="startQual" ${ready?'':'disabled'}>${bpIcon('draw')}抽籤 ‧ 開始第 1 輪</button>
        ${s.trainers.length < 8 ? '<p class="tag red" style="margin-top:10px">目前不足 8 位，可先打資格賽，但晉級八強需 ≥ 8 位</p>' : ''}
      </div>`;
    } else if (s.meta.status === 'qualifier') {
      // 各輪結果輸入（最新輪在上）
      for (let i = s.qual.rounds.length - 1; i >= 0; i--) {
        html += Console.qualRoundEditor(s, i);
      }
      const lastDone = s.qual.rounds[s.qual.rounds.length-1].every(m => m.winner);
      const canNext = lastDone && s.qual.rounds.length < s.meta.qualTotalRounds;
      const canSeed = T.qualComplete(s) && s.trainers.length >= 8;
      html += `<div class="card"><h2 class="section-title">推進賽程</h2>
        <div class="toolbar">
          ${canNext ? `<button class="btn" id="nextRound">${bpIcon('draw')}抽下一輪（第 ${s.qual.rounds.length+1} 輪）</button>` : ''}
          ${T.qualComplete(s) ? `<button class="btn gold ${s.trainers.length>=8?'':'disabled'}" id="seedKo" ${s.trainers.length>=8?'':'disabled'}>${bpIcon('battle')}結束資格賽 ‧ 產生八強</button>` : ''}
          ${!lastDone ? '<span class="tag">請先回報本輪所有比分</span>' : ''}
        </div>
        ${T.qualComplete(s) && s.trainers.length<8 ? '<p class="tag red" style="margin-top:8px">不足 8 位訓練家，無法產生八強</p>' : ''}
      </div>`;
    } else if (s.meta.status === 'knockout' || s.meta.status === 'done') {
      html += Console.koEditor(s);
      html += `<div style="margin-top:18px">${BV.bracket(s)}</div>`;
      if (s.meta.status === 'done') {
        const p = T.podium(s); const c = T.byId(s, p.first);
        html = `<div class="champ-banner" style="margin-bottom:18px"><div class="crown"></div><h2>冠軍：${esc(c.name)}</h2><p style="color:var(--bp-muted)">比賽完成！到公開看板看頒獎動畫</p><a class="btn gold" href="index.html">${bpIcon('screen')}看頒獎</a></div>` + html;
      }
    }

    box.innerHTML = html;
    Console.bindManage(s);
  },

  qualRoundEditor(s, i) {
    const r = s.qual.rounds[i];
    return `<div class="card" style="margin-bottom:18px">
      <h2 class="section-title">${bpIcon('draw')}第 ${i+1} 輪 比分回報</h2>
      <p class="section-sub">桌上對戰結束後，點「勝」記錄結果。</p>
      <div class="match-list">` + r.map(m => {
        const a = T.byId(s, m.a), b = m.b ? T.byId(s, m.b) : null;
        if (m.bye) return `<div class="match"><div class="side win">${BV.photo(a,'ph')}<b>#${a?.no} ${esc(a?.name)}</b></div><div class="vs">輪空</div><div class="side right" style="color:var(--bp-muted)">自動晉級</div></div>`;
        const aw = m.winner === m.a, bw = m.winner === m.b;
        return `<div class="match">
          <div class="side ${aw?'win':''}">${BV.photo(a,'ph')}<span class="name"><b>#${a?.no} ${esc(a?.name)}</b></span></div>
          <div class="vs">VS</div>
          <div class="side right ${bw?'win':''}">${BV.photo(b,'ph')}<span class="name"><b>#${b?.no} ${esc(b?.name)}</b></span></div>
          <div class="table-no">${m.table} 號桌</div>
          <div class="win-btns">
            <button class="btn sm ${aw?'gold':'ghost'}" data-qwin="${i}|${m.table}|${m.a}">#${a?.no} 勝</button>
            <button class="btn sm ${bw?'gold':'ghost'}" data-qwin="${i}|${m.table}|${m.b}">#${b?.no} 勝</button>
          </div>
        </div>`;
      }).join('') + `</div></div>`;
  },

  koEditor(s) {
    const stageMatch = (stage, idx, m, labelA, labelB) => {
      if (!m || (!m.a && !m.b)) return `<div class="match"><div class="side" style="color:var(--bp-muted)">${labelA}</div><div class="vs">VS</div><div class="side right" style="color:var(--bp-muted)">${labelB}</div><div class="table-no">等待上一輪結果</div></div>`;
      const a = m.a ? T.byId(s, m.a) : null, b = m.b ? T.byId(s, m.b) : null;
      const aw = m.winner === m.a, bw = m.winner === m.b;
      const ready = m.a && m.b;
      return `<div class="match">
        <div class="side ${aw?'win':''}">${BV.photo(a,'ph')}<span class="name"><b>${a?esc(a.name):labelA}</b></span></div>
        <div class="vs">VS</div>
        <div class="side right ${bw?'win':''}">${BV.photo(b,'ph')}<span class="name"><b>${b?esc(b.name):labelB}</b></span></div>
        <div class="table-no">${stage==='final'?'冠軍賽':stage==='third'?'季軍賽':stage==='semi'?'四強':'八強'}</div>
        ${ready ? `<div class="win-btns">
          <button class="btn sm ${aw?'gold':'ghost'}" data-kwin="${stage}|${idx}|${m.a}">${esc(a.name)} 勝</button>
          <button class="btn sm ${bw?'gold':'ghost'}" data-kwin="${stage}|${idx}|${m.b}">${esc(b.name)} 勝</button>
        </div>` : ''}
      </div>`;
    };
    let h = `<div class="card"><h2 class="section-title">${bpIcon('battle')}八強賽 比分回報</h2><p class="section-sub">單局決勝，點「勝」晉級，樹狀圖自動更新。</p><div class="match-list">`;
    h += `<div class="table-no" style="color:var(--bp-gold)">— 八強 —</div>`;
    s.ko.quarter.forEach((m, i) => h += stageMatch('quarter', i, m, '種子','種子'));
    h += `<div class="table-no" style="color:var(--bp-gold)">— 四強 —</div>`;
    s.ko.semi.forEach((m, i) => h += stageMatch('semi', i, m, '勝者','勝者'));
    h += `<div class="table-no" style="color:var(--bp-gold)">— 冠軍賽 / 季軍賽 —</div>`;
    h += stageMatch('final', 0, s.ko.final, '四強勝者','四強勝者');
    h += stageMatch('third', 0, s.ko.third, '四強敗者','四強敗者');
    h += `</div></div>`;
    return h;
  },

  bindManage(s) {
    const add = document.getElementById('addTrainerBtn');
    if (add) add.addEventListener('click', () => Console.openTrainerModal());
    document.querySelectorAll('[data-del]').forEach(b =>
      b.addEventListener('click', () => {
        if (confirm('移除這位訓練家？')) { const st = T.load(); T.removeTrainer(st, b.dataset.del); T.save(st); Console.refresh(); }
      }));
    document.querySelectorAll('[data-pass]').forEach(b =>
      b.addEventListener('click', () => {
        const tr = T.byId(T.load(), b.dataset.pass);
        if (tr) Console.openCredential(tr, false);
      }));
    const sq = document.getElementById('startQual');
    if (sq) sq.addEventListener('click', () => { const st = T.load(); try { T.drawRound(st); T.save(st); Console.refresh(); } catch(e){ alert(e.message); } });
    const nr = document.getElementById('nextRound');
    if (nr) nr.addEventListener('click', () => { const st = T.load(); T.drawRound(st); T.save(st); Console.refresh(); });
    const sk = document.getElementById('seedKo');
    if (sk) sk.addEventListener('click', () => { const st = T.load(); try { T.seedKnockout(st); T.save(st); Console.refresh(); } catch(e){ alert(e.message); } });
    document.querySelectorAll('[data-qwin]').forEach(b =>
      b.addEventListener('click', () => {
        const [ri, table, win] = b.dataset.qwin.split('|');
        const st = T.load(); T.setQualResult(st, +ri, +table, win); T.save(st); Console.refresh();
      }));
    document.querySelectorAll('[data-kwin]').forEach(b =>
      b.addEventListener('click', () => {
        const [stage, idx, win] = b.dataset.kwin.split('|');
        const st = T.load(); T.setKoResult(st, stage, +idx, win); T.save(st); Console.refresh();
      }));
  },

  /* ---------- 新增訓練家 Modal ---------- */
  setupTrainerModal() {
    const modal = document.getElementById('trainerModal');
    const pick = document.getElementById('photoPick');
    const file = document.getElementById('photoFile');
    const nameInput = document.getElementById('trainerName');
    const typeOptions = document.getElementById('trainerTypeOptions');

    typeOptions.innerHTML = TYPES.map(type => `
      <button type="button" class="trainer-type-option trainer-type-${type.key}" data-trainer-type="${type.key}">
        <span class="trainer-type-dot">${esc(type.name)}</span>
        <b>${esc(type.name)}系</b>
      </button>`).join('');

    typeOptions.addEventListener('click', e => {
      const button = e.target.closest('[data-trainer-type]');
      if (!button) return;
      Console.pendingType = button.dataset.trainerType;
      Console.updateTrainerTypeSelection();
      Console.renderTrainerPassPreview();
    });

    nameInput.addEventListener('input', Console.renderTrainerPassPreview);
    pick.addEventListener('click', () => file.click());
    file.addEventListener('change', () => {
      const f = file.files[0]; if (!f) return;
      Console.resizeImage(f, 640, (dataURL) => {
        Console.pendingPhoto = dataURL;
        pick.innerHTML = `<img src="${dataURL}" alt="已選擇的正面照片"><span class="photo-change">更換照片</span>`;
        Console.renderTrainerPassPreview();
      });
    });
    document.getElementById('trainerCancel').addEventListener('click', () => Console.closeTrainerModal());
    modal.addEventListener('click', e => { if (e.target === modal) Console.closeTrainerModal(); });
    document.getElementById('trainerSave').addEventListener('click', () => {
      const name = nameInput.value.trim();
      if (!name) { alert('請輸入訓練家姓名'); nameInput.focus(); return; }
      const st = T.load();
      T.addTrainer(st, name, Console.pendingPhoto, {
        type: Console.pendingType,
      });
      const trainer = st.trainers[st.trainers.length - 1];
      T.save(st);
      Console.closeTrainerModal();
      Console.refresh();
      Console.openCredential(trainer, true);
    });

    const credential = document.getElementById('credentialModal');
    document.getElementById('credentialClose').addEventListener('click', Console.closeCredential);
    document.getElementById('credentialDone').addEventListener('click', Console.closeCredential);
    document.getElementById('credentialPrint').addEventListener('click', () => window.print());
    credential.addEventListener('click', e => { if (e.target === credential) Console.closeCredential(); });
  },
  openTrainerModal() {
    Console.pendingPhoto = '';
    Console.pendingType = 'lightning';
    document.getElementById('trainerName').value = '';
    document.getElementById('photoFile').value = '';
    document.getElementById('photoPick').innerHTML = `${bpIcon('plus')}<b>上傳正面照片</b><small>臉部清楚、單人入鏡</small>`;
    Console.updateTrainerTypeSelection();
    Console.renderTrainerPassPreview();
    document.getElementById('trainerModal').classList.add('open');
    document.getElementById('trainerName').focus();
  },
  closeTrainerModal() { document.getElementById('trainerModal').classList.remove('open'); },

  updateTrainerTypeSelection() {
    document.querySelectorAll('[data-trainer-type]').forEach(button => {
      const active = button.dataset.trainerType === Console.pendingType;
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  },

  renderTrainerPassPreview() {
    const root = document.getElementById('trainerPassPreview');
    if (!root) return;
    root.innerHTML = Console.trainerPass({
      no: null,
      name: document.getElementById('trainerName')?.value.trim() || '',
      photo: Console.pendingPhoto,
      type: Console.pendingType,
    }, true);
    requestAnimationFrame(Console.fitTrainerPasses);
  },

  openCredential(trainer, isNew) {
    document.getElementById('credentialEyebrow').textContent =
      isNew ? 'Trainer Registration Complete' : 'Official Trainer License';
    document.getElementById('credentialTitle').textContent =
      isNew ? `${trainer.name}，授證完成` : `${trainer.name}的訓練家證`;
    document.getElementById('credentialBody').innerHTML = Console.trainerPass(trainer, false);
    document.getElementById('credentialModal').classList.add('open');
    requestAnimationFrame(Console.fitTrainerPasses);
  },

  closeCredential() {
    document.getElementById('credentialModal').classList.remove('open');
  },

  fitTrainerPasses() {
    const baseWidth = 680;
    const baseHeight = 429;
    document.querySelectorAll('.trainer-pass-frame').forEach(frame => {
      const pass = frame.querySelector('.trainer-pass');
      if (!pass) return;
      const available = frame.clientWidth;
      if (!available) return;
      const scale = Math.min(1, available / baseWidth);
      pass.style.transform = `scale(${scale})`;
      frame.style.height = `${Math.ceil(baseHeight * scale)}px`;
    });
  },

  resizeImage(file, max, cb) {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale), h = Math.round(img.height * scale);
        const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        cb(cv.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  },

  /* ---------- 匯出 / 匯入 ---------- */
  exportData() {
    const s = T.load();
    const blob = new Blob([T.exportJSON(s)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '布拉克星球賽事備份.json';
    a.click();
  },
  importData(e) {
    const f = e.target.files[0]; if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { const obj = T.importJSON(reader.result); T.save(obj); Console.refresh(); alert('匯入成功！'); }
      catch (err) { alert('匯入失敗：' + err.message); }
    };
    reader.readAsText(f);
    e.target.value = '';
  },

  /* ---------- 罰則助手 ---------- */
  renderPenalty() {
    const box = document.getElementById('penaltyBox');
    box.innerHTML = `<div class="card">
      <h2 class="section-title">${bpIcon('penalty')}罰則助手</h2>
      <p class="section-sub">依官方 Play! Pokémon 罰則精神，調整成<strong>營隊孩子友善版</strong>。先判斷狀況，再依等級處理。</p>
      ${PENALTIES.map(p => `
        <div class="penalty-tier t${p.tier}">
          <h4>${p.label}</h4>
          <p><b>什麼時候：</b>${esc(p.when)}</p>
          <p><b>例子：</b>${p.examples.map(esc).join('、')}</p>
          <p style="color:var(--bp-green)"><b>怎麼處理：</b>${esc(p.action)}</p>
        </div>`).join('')}
      <div class="callout" style="margin-top:16px"><span class="ic">${bpIcon('heart')}</span><div>對孩子永遠<b>先教學、再判罰</b>，溫和說明原因，讓他學到、不是被處罰。嚴重判罰請兩位老師在場。</div></div>
    </div>`;
  },

  /* ---------- 爭議流程 ---------- */
  renderDispute() {
    const box = document.getElementById('disputeBox');
    box.innerHTML = `<div class="card">
      <h2 class="section-title">${bpIcon('dispute')}爭議排解流程</h2>
      <p class="section-sub">桌上吵起來別緊張，照這 6 步走。</p>
      ${DISPUTE_FLOW.map(d => `
        <div class="match" style="grid-template-columns:auto 1fr;text-align:left">
          <div class="vs" style="font-size:1.6rem">${d.step}</div>
          <div><b style="font-size:1.05rem">${esc(d.title)}</b><br><span style="color:var(--bp-muted)">${esc(d.desc)}</span></div>
        </div>`).join('')}
    </div>`;
  },
};
