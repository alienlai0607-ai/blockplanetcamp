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
    Console.setupEventControls();
    window.addEventListener('resize', Console.fitTrainerPasses);
    // 罰則 / 爭議（靜態，一次渲染）
    Console.renderPenalty();
    Console.renderDispute();
    Console.refresh();
  },

  refresh() {
    const s = T.load();
    if (s.meta.status === 'qualifier' && s.qual.rounds.length < s.meta.qualTotalRounds) {
      T.drawQualifierSchedule(s);
      T.save(s);
    }
    document.getElementById('flowSteps').innerHTML = BV.flow(s);
    Console.renderEventControls(s);
    Console.renderManage(s);
  },

  setupEventControls() {
    const modal = document.getElementById('eventModal');
    const dateInput = document.getElementById('eventDate');
    const venueInput = document.getElementById('eventVenue');
    const createButton = document.getElementById('eventCreate');
    const close = () => modal.classList.remove('open');
    document.getElementById('newEventBtn').addEventListener('click', () => {
      dateInput.value = BPEvents.localDate();
      venueInput.value = '';
      modal.classList.add('open');
      setTimeout(() => venueInput.focus(), 30);
    });
    document.getElementById('eventCancel').addEventListener('click', close);
    modal.addEventListener('click', event => {
      if (event.target === modal) close();
    });
    createButton.addEventListener('click', async () => {
      const eventDate = dateInput.value;
      const venue = venueInput.value.trim();
      if (!eventDate || !venue) {
        alert('請填寫比賽日期與場地名稱。');
        return;
      }
      createButton.disabled = true;
      createButton.textContent = '正在建立…';
      try {
        await BPEvents.create({ eventDate, venue });
        close();
        Console.refresh();
      } catch (error) {
        alert(error.message || '建立賽事失敗');
      } finally {
        createButton.disabled = false;
        createButton.textContent = '建立並切換';
      }
    });
    document.getElementById('eventSelect').addEventListener('change', async event => {
      if (!event.target.value || event.target.value === BPEvents.activeId()) return;
      event.target.disabled = true;
      try {
        await BPEvents.switchTo(event.target.value);
        Console.refresh();
      } catch (error) {
        alert(error.message || '切換賽事失敗');
      } finally {
        event.target.disabled = false;
      }
    });
    document.getElementById('archiveEventBtn').addEventListener('click', async () => {
      const state = T.load();
      const title = `${state.meta.eventDate} · ${state.meta.venue}`;
      if (!confirm(`確定封存「${title}」？\n封存後仍可隨時切換查看與下載。`)) return;
      try {
        await BPEvents.archiveCurrent();
        Console.refresh();
      } catch (error) {
        alert(error.message || '封存失敗');
      }
    });
  },

  async renderEventControls(s) {
    const activeId = s.meta.eventId;
    const title = document.getElementById('eventCurrentTitle');
    const meta = document.getElementById('eventCurrentMeta');
    const select = document.getElementById('eventSelect');
    const archiveButton = document.getElementById('archiveEventBtn');
    if (!title || !meta || !select) return;

    title.textContent = `${s.meta.eventDate} · ${s.meta.venue}`;
    const statusLabels = {
      setup: '登記中',
      qualifier: '資格賽',
      ranking: '排行榜',
      knockout: '八強賽',
      done: '賽事完成',
    };
    meta.textContent = `${s.trainers.length} 位訓練家 · ${statusLabels[s.meta.status] || '準備中'}${s.meta.archivedAt ? ' · 已封存' : ''}`;
    archiveButton.disabled = Boolean(s.meta.archivedAt);
    archiveButton.textContent = s.meta.archivedAt ? '今日賽果已封存' : '封存今日賽果';

    try {
      const events = await BPEvents.list();
      if (T.load().meta.eventId !== activeId) return;
      select.innerHTML = events.map(event => {
        const archived = event.archivedAt ? ' · 已封存' : '';
        return `<option value="${esc(event.id)}" ${event.id === activeId ? 'selected' : ''}>${esc(event.eventDate)} · ${esc(event.venue)} · ${event.trainerCount} 位${archived}</option>`;
      }).join('');
    } catch (error) {
      console.error('無法讀取歷史賽事', error);
    }
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
        <p class="section-sub">一次排定每位訓練家的 ${s.meta.qualTotalRounds} 場對手與教室。選手打完一場後，只要下一位對手也完成前一場，就能立刻接著比。</p>
        <button class="btn gold ${ready?'':'disabled'}" id="startQual" ${ready?'':'disabled'}>${bpIcon('draw')}抽籤 ‧ 建立完整資格賽程</button>
        ${s.trainers.length < 8 ? '<p class="tag red" style="margin-top:10px">目前不足 8 位，可先打資格賽，但晉級八強需 ≥ 8 位</p>' : ''}
      </div>`;
    } else if (s.meta.status === 'qualifier') {
      // 三場賽程全部預先排定；各桌依選手進度獨立開打。
      for (let i = 0; i < s.qual.rounds.length; i++) {
        html += Console.qualRoundEditor(s, i);
      }
      const matches = s.qual.rounds.flat();
      const completed = matches.filter(m => m.winner).length;
      html += `<div class="card"><h2 class="section-title">推進賽程</h2>
        <div class="toolbar">
          <button class="btn ghost" id="downloadQual">${bpIcon('print')}下載教室賽程 PDF</button>
          ${T.qualComplete(s) ? `<button class="btn gold ${s.trainers.length>=8?'':'disabled'}" id="seedKo" ${s.trainers.length>=8?'':'disabled'}>${bpIcon('battle')}結束資格賽 ‧ 產生八強</button>` : ''}
          <span class="tag">已完成 ${completed} / ${matches.length} 場</span>
        </div>
        ${T.qualComplete(s) && s.trainers.length<8 ? '<p class="tag red" style="margin-top:8px">不足 8 位訓練家，無法產生八強</p>' : ''}
      </div>`;
    } else if (s.meta.status === 'knockout' || s.meta.status === 'done') {
      html += `<div class="card qualification-print-toolbar"><div class="toolbar"><div><h2 class="section-title">資格賽資料</h2><p class="section-sub">八強已產生，仍可下載依教室分類的完整資格賽紀錄。</p></div><span class="spacer"></span><button class="btn ghost" id="downloadQual">${bpIcon('print')}下載教室賽程 PDF</button></div></div>`;
      html += Console.koEditor(s);
      html += `<div style="margin-top:18px">${BV.bracket(s)}</div>`;
      if (s.meta.status === 'done') {
        const p = T.podium(s); const c = T.byId(s, p.first);
        html = `<div class="champ-banner" style="margin-bottom:18px"><div class="crown"></div><h2>冠軍：${esc(c.name)}</h2><p style="color:var(--bp-muted)">比賽完成！到公開看板看頒獎動畫</p><a class="btn gold" href="index.html">${bpIcon('screen')}看頒獎</a></div>` + html;
      }
    }

    if (s.qual.rounds.length) html += Console.qualPrintSheet(s);

    box.innerHTML = html;
    Console.bindManage(s);
  },

  qualRoundEditor(s, i) {
    const r = s.qual.rounds[i];
    const renderMatch = m => {
      const a = T.byId(s, m.a), b = m.b ? T.byId(s, m.b) : null;
      if (m.bye) {
        return `<div class="match qualifier-match is-bye">
          <div class="side win">${BV.photo(a,'ph')}<span class="name"><b>#${a?.no} ${esc(a?.name)}</b></span></div>
          <div class="vs">輪空</div>
          <div class="side right" style="color:var(--bp-muted)">自動晉級</div>
          <div class="match-location"><span class="table-no">第 ${m.table} 桌</span><span class="tag gold">已完成</span></div>
          <div class="win-btns"></div>
        </div>`;
      }
      const aw = m.winner === m.a, bw = m.winner === m.b;
      const ready = T.qualMatchReady(s, i, m);
      const state = m.winner ? '<span class="tag gold">已完成</span>' : ready ? '<span class="tag green">可開打</span>' : '<span class="tag">等待前一場</span>';
      return `<div class="match qualifier-match">
        <div class="side ${aw?'win':''}">${BV.photo(a,'ph')}<span class="name"><b>#${a?.no} ${esc(a?.name)}</b></span></div>
        <div class="vs">VS</div>
        <div class="side right ${bw?'win':''}">${BV.photo(b,'ph')}<span class="name"><b>#${b?.no} ${esc(b?.name)}</b></span></div>
        <div class="match-location"><span class="table-no">第 ${m.table} 桌</span>${state}</div>
        <div class="win-btns">
          <button class="btn sm ${aw?'gold':'ghost'}" data-qwin="${i}|${m.table}|${m.a}" ${ready?'':'disabled'}>#${a?.no} 勝</button>
          <button class="btn sm ${bw?'gold':'ghost'}" data-qwin="${i}|${m.table}|${m.b}" ${ready?'':'disabled'}>#${b?.no} 勝</button>
        </div>
      </div>`;
    };
    const roomGroups = [1, 2, 3].map(roomNo => {
      const matches = r
        .filter(m => T.qualClassroom(m, i) === roomNo)
        .sort((a, b) => Number(a.table) - Number(b.table));
      if (!matches.length) return '';
      const pending = matches.filter(m => !m.winner).length;
      return `<section class="qual-room-group room-${roomNo}">
        <header class="qual-room-head">
          ${BV.classroomBadge(matches[0], i)}
          <span class="qual-room-count">${matches.length} 場</span>
          <span class="qual-room-progress">${pending ? `尚有 ${pending} 場` : '本教室完成'}</span>
        </header>
        <div class="match-list">${matches.map(renderMatch).join('')}</div>
      </section>`;
    }).join('');
    return `<div class="card" style="margin-bottom:18px">
      <h2 class="section-title">${bpIcon('draw')}第 ${i+1} 輪 教室分流與比分回報</h2>
      <p class="section-sub">不用等其他桌。兩位選手都完成前一場時，此桌會顯示「可開打」；結束後立即點「勝」。</p>
      <div class="qual-room-groups">${roomGroups}</div>
    </div>`;
  },

  /* ---------- 資格賽列印資料表 ---------- */
  qualPrintSheet(s) {
    const rounds = s.qual.rounds || [];
    const eventDate = s.meta.eventDate || BPEvents.localDate(s.meta.createdAt);
    const venue = s.meta.venue || '布拉克星球教室';
    const opponentRows = s.trainers.map(t => {
      const opponents = rounds.map(r => {
        const m = r.find(x => x.a === t.id || x.b === t.id);
        if (!m) return '—';
        if (m.bye) return '輪空';
        const id = m.a === t.id ? m.b : m.a;
        const opponent = T.byId(s, id);
        return opponent ? `#${opponent.no} ${esc(opponent.name)}` : '—';
      });
      const opponentNumbers = rounds.map(r => {
        const m = r.find(x => x.a === t.id || x.b === t.id);
        if (!m) return '—';
        if (m.bye) return '輪空';
        const id = m.a === t.id ? m.b : m.a;
        const opponent = T.byId(s, id);
        return opponent ? `#${opponent.no}` : '—';
      });
      const record = T.standings(s).find(x => x.id === t.id) || { wins: 0, losses: 0, rank: '—' };
      return `<tr><td class="print-no">#${t.no}</td><td><b>${esc(t.name)}</b></td><td class="print-vs">VS：${opponentNumbers.join('、')}</td>${opponents.map(x => `<td>${x}</td>`).join('')}<td>${record.wins}</td><td>${record.losses}</td><td>${record.rank}</td></tr>`;
    }).join('');
    const matchRows = rounds.map((round, ri) => round.map(m => {
      const a = T.byId(s, m.a), b = m.b ? T.byId(s, m.b) : null;
      const winner = m.bye ? '輪空，自動勝' : m.winner ? `#${T.byId(s, m.winner)?.no} ${esc(T.byId(s, m.winner)?.name || '')} 勝` : '尚未回報';
      return `<tr><td>第 ${ri + 1} 輪</td><td>教室 ${T.qualClassroom(m, ri)}</td><td>第 ${m.table} 桌</td><td>#${a?.no} ${esc(a?.name || '')}</td><td>${b ? `#${b.no} ${esc(b.name)}` : '輪空'}</td><td>${winner}</td></tr>`;
    }).join('')).join('');
    return `<section class="qualification-print-sheet" id="qualificationPrintSheet">
      <header class="print-sheet-head"><div><p class="print-kicker">BLOCK PLANET CAMP LEAGUE</p><h1>資格賽對戰資料表</h1><p>${esc(s.meta.name)}　·　${esc(eventDate)}　·　${esc(venue)}　·　共 ${rounds.length} 輪</p></div><div class="print-date">賽事日期<br><b>${esc(eventDate)}</b></div></header>
      <section class="print-summary"><h2>訓練家對手總表</h2><p>每一列是一位訓練家；快速格式如「VS：#3、#10、#17」，各輪欄位可再逐一核對，輪空以「輪空」標示。</p><table><thead><tr><th>編號</th><th>訓練家</th><th>對手順序</th>${rounds.map((_, i) => `<th>第 ${i + 1} 輪 VS</th>`).join('')}<th>勝</th><th>負</th><th>排名</th></tr></thead><tbody>${opponentRows}</tbody></table></section>
      <section class="print-summary"><h2>各場對戰、教室與結果</h2><p>每輪依桌次平均輪替分配教室 1、2、3，讓各教室同時進行的場次盡量平均。</p><table><thead><tr><th>輪次</th><th>教室</th><th>桌號</th><th>訓練家 A</th><th>訓練家 B</th><th>結果</th></tr></thead><tbody>${matchRows}</tbody></table></section>
      <footer class="print-sheet-foot"><span>${esc(eventDate)}　·　${esc(venue)}　·　裁判確認後留存</span><span>資格賽共 ${rounds.length} 輪　·　前 8 名晉級八強</span></footer>
    </section>`;
  },

  /* ---------- 下載資格賽教室工作檔 ---------- */
  qualDownloadDocument(s) {
    const rounds = s.qual.rounds || [];
    const eventDate = s.meta.eventDate || BPEvents.localDate(s.meta.createdAt);
    const venue = s.meta.venue || '布拉克星球教室';
    const roomColors = {
      1: { main: '#1769e8', soft: '#edf5ff', label: '藍色教室' },
      2: { main: '#15966a', soft: '#ecfaf4', label: '綠色教室' },
      3: { main: '#e87917', soft: '#fff5e9', label: '橘色教室' },
    };
    const safe = value => String(value ?? '')
      .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;').replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
    const trainerLabel = trainer => trainer
      ? `<strong>#${safe(trainer.no)}</strong> ${safe(trainer.name)}`
      : '<span class="muted">輪空</span>';
    const roomSections = [1, 2, 3].map(roomNo => {
      const theme = roomColors[roomNo];
      const roomMatches = rounds.flatMap((round, roundIdx) =>
        round
          .filter(match => T.qualClassroom(match, roundIdx) === roomNo)
          .map(match => ({ match, roundIdx })));
      const roundBlocks = rounds.map((round, roundIdx) => {
        const matches = round.filter(match => T.qualClassroom(match, roundIdx) === roomNo);
        if (!matches.length) return '';
        const rows = matches.map((match, index) => {
          const a = T.byId(s, match.a);
          const b = match.b ? T.byId(s, match.b) : null;
          const winner = match.bye
            ? `${trainerLabel(a)}（輪空自動勝）`
            : match.winner
              ? `${trainerLabel(T.byId(s, match.winner))} 勝`
              : '<span class="muted">現場填寫</span>';
          return `<tr>
            <td>${index + 1}</td>
            <td>第 ${safe(match.table)} 桌</td>
            <td>${trainerLabel(a)}</td>
            <td class="vs">VS</td>
            <td>${trainerLabel(b)}</td>
            <td class="check">□ A　□ B</td>
            <td>${winner}</td>
            <td class="notes"></td>
          </tr>`;
        }).join('');
        return `<section class="round-block">
          <h2>第 ${roundIdx + 1} 輪 <span>${matches.length} 場</span></h2>
          <table>
            <thead><tr><th>順序</th><th>桌號</th><th>訓練家 A</th><th></th><th>訓練家 B</th><th>到場</th><th>勝者</th><th>裁判備註</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`;
      }).join('');
      return `<article class="room-sheet" style="--room:${theme.main};--room-soft:${theme.soft}">
        <header class="room-head">
          <div><p>BLOCK PLANET CAMP LEAGUE　·　${safe(eventDate)}　·　${safe(venue)}</p><h1>教室 ${roomNo} 裁判場次表</h1></div>
          <div class="room-chip">${theme.label}</div>
        </header>
        <div class="room-summary">
          <b>本教室共 ${roomMatches.length} 場</b>
          <span>選手與對手都完成上一場後即可開打，不必等待全體換輪。</span>
        </div>
        ${roundBlocks}
        <footer>${safe(eventDate)}　·　${safe(venue)}　·　教室 ${roomNo}　·　裁判簽名：________________　·　交回時間：________</footer>
      </article>`;
    }).join('');
    const routeRows = [...s.trainers]
      .sort((a, b) => a.no - b.no)
      .map(trainer => {
        const cells = rounds.map((round, roundIdx) => {
          const match = round.find(item => item.a === trainer.id || item.b === trainer.id);
          if (!match) return '<td>—</td>';
          const opponentId = match.a === trainer.id ? match.b : match.a;
          const opponent = opponentId ? T.byId(s, opponentId) : null;
          return `<td><b>教室 ${T.qualClassroom(match, roundIdx)}</b><br>${opponent ? `VS #${safe(opponent.no)} ${safe(opponent.name)}` : '輪空'}</td>`;
        }).join('');
        return `<tr><td><strong>#${safe(trainer.no)}</strong></td><td>${safe(trainer.name)}</td>${cells}</tr>`;
      }).join('');
    const generatedAt = new Date().toLocaleString('zh-TW', { hour12: false });
    return `<!doctype html>
<html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safe(s.meta.name)}－資格賽教室分配</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef3f9;color:#142b50;font-family:"Noto Sans TC","PingFang TC",Arial,sans-serif}
.cover,.room-sheet,.route-sheet{width:min(1180px,calc(100% - 32px));margin:24px auto;background:#fff;border:1px solid #cfdded;border-radius:12px;box-shadow:0 8px 24px #173a6914;padding:28px}
.cover{border-top:10px solid #1769e8}.eyebrow,.room-head p{margin:0 0 6px;color:#1769e8;font-size:12px;font-weight:900;letter-spacing:.08em}.cover h1,.room-head h1{margin:0;font-size:30px}.cover-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:22px}.metric{padding:14px;border:1px solid #d8e4f2;background:#f7faff;border-radius:8px}.metric span{display:block;color:#647895;font-size:13px}.metric b{font-size:22px}
.legend{display:flex;gap:12px;margin-top:18px;flex-wrap:wrap}.legend span{padding:8px 12px;border-radius:6px;font-weight:800}.notice{margin-top:18px;padding:14px 16px;background:#fff6d8;border-left:5px solid #ffc400;font-weight:700}
.room-sheet{border-top:10px solid var(--room);page-break-before:always}.room-head{display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid var(--room);padding-bottom:14px}.room-head p{color:var(--room)}.room-chip{background:var(--room);color:#fff;padding:10px 16px;border-radius:6px;font-weight:900}.room-summary{display:flex;gap:20px;align-items:center;margin:16px 0;padding:12px 14px;background:var(--room-soft);border-left:5px solid var(--room)}.room-summary span{color:#516681}
.round-block{margin-top:20px}.round-block h2{display:flex;align-items:center;justify-content:space-between;margin:0;padding:10px 12px;background:var(--room);color:#fff;font-size:19px;border-radius:6px 6px 0 0}.round-block h2 span{font-size:13px}
table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cdd8e6;padding:9px 8px;text-align:left;vertical-align:middle;font-size:13px}th{background:#edf2f8;color:#334b69}.round-block th:nth-child(1){width:6%}.round-block th:nth-child(2){width:9%}.round-block th:nth-child(3),.round-block th:nth-child(5){width:18%}.round-block th:nth-child(4){width:4%}.round-block th:nth-child(6){width:11%}.round-block th:nth-child(7){width:17%}.round-block th:nth-child(8){width:17%}.vs{text-align:center;font-weight:900}.check{white-space:nowrap}.notes{height:42px}.muted{color:#71829a}
.room-sheet footer{margin-top:22px;padding-top:14px;border-top:1px solid #cfdbea;text-align:right;color:#52667f;font-size:13px}.route-sheet{page-break-before:always;border-top:10px solid #ffc400}.route-sheet h1{margin-top:0}.route-sheet table th:nth-child(n+3),.route-sheet table td:nth-child(n+3){width:24%}
@media print{body{background:#fff}.cover,.room-sheet,.route-sheet{width:100%;margin:0;border-radius:0;box-shadow:none;border-left:0;border-right:0}.room-sheet,.route-sheet{page-break-before:always}button{display:none}}
@media(max-width:800px){.cover-grid{grid-template-columns:1fr 1fr}.cover,.room-sheet,.route-sheet{width:100%;margin:0 0 16px;border-radius:0;padding:16px}.room-summary{align-items:flex-start;flex-direction:column;gap:4px}.round-block{overflow:auto}.round-block table{min-width:900px}}
</style></head><body>
<section class="cover">
  <p class="eyebrow">BLOCK PLANET CAMP LEAGUE</p>
  <h1>${safe(s.meta.name)}－資格賽教室分配</h1>
  <div class="cover-grid">
    <div class="metric"><span>比賽日期</span><b>${safe(eventDate)}</b></div>
    <div class="metric"><span>比賽場地</span><b style="font-size:18px">${safe(venue)}</b></div>
    <div class="metric"><span>參賽訓練家</span><b>${s.trainers.length} 位</b></div>
    <div class="metric"><span>資格賽輪次</span><b>${rounds.length} 輪</b></div>
    <div class="metric"><span>總場次</span><b>${rounds.flat().length} 場</b></div>
    <div class="metric"><span>產生時間</span><b style="font-size:15px">${safe(generatedAt)}</b></div>
  </div>
  <div class="legend"><span style="background:#edf5ff;color:#1769e8">教室 1</span><span style="background:#ecfaf4;color:#15966a">教室 2</span><span style="background:#fff5e9;color:#e87917">教室 3</span></div>
  <div class="notice">自由流水賽制：每一場獨立開打。兩位選手完成上一場後，可直接到指定教室找裁判，不必等同輪其他場次。</div>
</section>
${roomSections}
<article class="route-sheet"><h1>訓練家移動總表</h1><p>${safe(eventDate)}　·　${safe(venue)}　·　中央裁判可用編號快速告知每位訓練家下一場的教室與對手。</p>
<table><thead><tr><th>編號</th><th>訓練家</th>${rounds.map((_, index) => `<th>第 ${index + 1} 輪</th>`).join('')}</tr></thead><tbody>${routeRows}</tbody></table></article>
</body></html>`;
  },

  async downloadQualificationFile(s) {
    const button = document.getElementById('downloadQual');
    const originalLabel = button?.innerHTML || '';
    const html2canvas = window.html2canvas;
    const JsPdf = window.jspdf?.jsPDF;
    if (!html2canvas || !JsPdf) {
      alert('PDF 元件尚未載入，請重新整理頁面後再試一次。');
      return;
    }

    if (button) {
      button.disabled = true;
      button.innerHTML = `${bpIcon('print')}正在製作 PDF…`;
    }

    const parsedDocument = new DOMParser().parseFromString(
      Console.qualDownloadDocument(s),
      'text/html'
    );
    const host = document.createElement('div');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = [
      'position:fixed',
      'left:-100000px',
      'top:0',
      'width:1212px',
      'background:#eef3f9',
      'pointer-events:none',
    ].join(';');

    try {
      const documentStyles = [...parsedDocument.querySelectorAll('style')]
        .map(style => style.textContent)
        .join('\n');
      const style = document.createElement('style');
      style.textContent = documentStyles;
      host.appendChild(style);
      [...parsedDocument.querySelectorAll('.cover, .room-sheet, .route-sheet')]
        .forEach(section => host.appendChild(document.importNode(section, true)));
      document.body.appendChild(host);
      await document.fonts?.ready;
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

      const sections = [...host.querySelectorAll('.cover, .room-sheet, .route-sheet')];
      if (!sections.length) throw new Error('找不到資格賽 PDF 內容');

      const pdf = new JsPdf({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
        compress: true,
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 5;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      let hasContent = false;

      for (const section of sections) {
        const canvas = await html2canvas(section, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          logging: false,
          windowWidth: 1212,
        });
        const pixelsPerMm = canvas.width / contentWidth;
        const maxSliceHeight = Math.max(1, Math.floor(contentHeight * pixelsPerMm));

        for (let top = 0; top < canvas.height; top += maxSliceHeight) {
          const sliceHeight = Math.min(maxSliceHeight, canvas.height - top);
          const slice = document.createElement('canvas');
          slice.width = canvas.width;
          slice.height = sliceHeight;
          const context = slice.getContext('2d');
          context.fillStyle = '#ffffff';
          context.fillRect(0, 0, slice.width, slice.height);
          context.drawImage(
            canvas,
            0, top, canvas.width, sliceHeight,
            0, 0, slice.width, sliceHeight
          );

          if (hasContent) pdf.addPage('a4', 'landscape');
          const renderedHeight = sliceHeight / pixelsPerMm;
          pdf.addImage(
            slice.toDataURL('image/jpeg', 0.94),
            'JPEG',
            margin,
            margin,
            contentWidth,
            renderedHeight,
            undefined,
            'FAST'
          );
          hasContent = true;
        }
      }

      const eventDate = s.meta.eventDate || BPEvents.localDate(s.meta.createdAt);
      const safeVenue = String(s.meta.venue || '布拉克星球教室').replace(/[\\/:*?"<>|]/g, '-');
      pdf.save(`布拉克星球_資格賽教室分配_${eventDate}_${safeVenue}_${s.trainers.length}人.pdf`);
    } catch (error) {
      console.error('Qualification PDF download failed:', error);
      alert('PDF 產生失敗，請重新整理頁面後再試一次。');
    } finally {
      host.remove();
      if (button) {
        button.disabled = false;
        button.innerHTML = originalLabel;
      }
    }
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
    if (sq) sq.addEventListener('click', () => { const st = T.load(); try { T.drawQualifierSchedule(st); T.save(st); Console.refresh(); } catch(e){ alert(e.message); } });
    const downloadQual = document.getElementById('downloadQual');
    if (downloadQual) downloadQual.addEventListener('click', () => Console.downloadQualificationFile(T.load()));
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
    const safeVenue = String(s.meta.venue || '場地').replace(/[\\/:*?"<>|]/g, '-');
    a.download = `布拉克星球賽事備份-${s.meta.eventDate}-${safeVenue}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
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
