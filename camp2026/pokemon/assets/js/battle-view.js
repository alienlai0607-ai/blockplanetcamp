/* ============================================================
   battle-view.js — 賽事公開展示渲染（投影看板）
   也提供共用渲染給控制台使用
   ============================================================ */
const BV = {
  /* ---------- 共用：照片 ---------- */
  photo(tr, cls) {
    if (!tr) return `<span class="${cls}">?</span>`;
    if (tr.photo) return `<span class="${cls}" style="background-image:url('${tr.photo}');background-size:cover;background-position:center"></span>`;
    return `<span class="${cls}">${esc((tr.name || '?').slice(0,1))}</span>`;
  },
  name(tr) { return tr ? `${esc(tr.name)}` : '<i style="color:var(--bp-muted)">待定</i>'; },

  /* ---------- 訓練家牆 ---------- */
  trainerWall(s, elimSet) {
    elimSet = elimSet || new Set();
    if (!s.trainers.length) return '';
    return `<div class="card"><h2 class="section-title">${bpIcon('trainers')}參賽訓練家（${s.trainers.length}）</h2>
      <div class="trainer-grid">` + s.trainers.map(t => `
        <div class="trainer ${elimSet.has(t.id) ? 'elim' : ''}">
          <span class="tnum">#${t.no}</span>
          ${BV.photo(t, 'photo')}
          <div class="tname">${esc(t.name)}</div>
          ${elimSet.has(t.id) ? '<div class="elim-x">✕</div>' : ''}
        </div>`).join('') + `</div></div>`;
  },

  /* ---------- 排行榜 ---------- */
  standings(s) {
    const rows = T.standings(s);
    if (!rows.length) return '';
    return `<div class="card"><h2 class="section-title">${bpIcon('standings')}排行榜</h2>
      <p class="section-sub">依勝場排序，<span class="tag gold">前 8 名</span>晉級八強。</p>
      <div style="overflow-x:auto"><table class="table">
        <thead><tr><th>名次</th><th>訓練家</th><th>勝</th><th>負</th><th>已賽</th></tr></thead>
        <tbody>` + rows.map(t => `
          <tr class="${t.rank <= 8 ? 'qualify' : ''}">
            <td class="rank ${t.rank <= 3 ? 'top' : ''}">${t.rank}</td>
            <td>${BV.photo(t, 'mini-photo')} <b>${esc(t.name)}</b> <small style="color:var(--bp-muted)">#${t.no}</small></td>
            <td><span class="wins-pill">${t.wins}</span></td>
            <td><span class="loss-pill">${t.losses}</span></td>
            <td>${t.played}</td>
          </tr>`).join('') + `</tbody></table></div></div>`;
  },

  /* ---------- 資格賽某輪對戰（唯讀）---------- */
  qualRound(s, roundIdx, readonly) {
    const r = s.qual.rounds[roundIdx];
    if (!r) return '';
    return `<div class="card"><h2 class="section-title">${bpIcon('draw')}資格賽 第 ${roundIdx+1} 輪　配對</h2>
      <p class="section-sub">抽籤產生的對戰組合，桌上用真卡對決後回報結果。</p>
      <div class="match-list">` + r.map(m => {
        const a = T.byId(s, m.a), b = m.b ? T.byId(s, m.b) : null;
        if (m.bye) return `<div class="match"><div class="side win"><span class="ph">${esc((a?.name||'?').slice(0,1))}</span><span class="name">${BV.name(a)}</span></div><div class="vs">輪空</div><div class="side right" style="color:var(--bp-muted)">自動晉級</div></div>`;
        const aw = m.winner === m.a, bw = m.winner === m.b;
        return `<div class="match">
          <div class="side ${aw?'win':''}">${BV.photo(a,'ph')}<span class="name"><b>#${a?.no} ${esc(a?.name)}</b></span></div>
          <div class="vs">VS</div>
          <div class="side right ${bw?'win':''}">${BV.photo(b,'ph')}<span class="name"><b>#${b?.no} ${esc(b?.name)}</b></span></div>
          <div class="table-no">${m.table} 號桌${m.winner ? '　已回報' : '　進行中'}</div>
        </div>`;
      }).join('') + `</div></div>`;
  },

  /* ---------- 八強樹狀圖 ---------- */
  bracket(s) {
    const slot = (id, seed) => {
      const t = id ? T.byId(s, id) : null;
      const seedTxt = seed != null ? `<span class="seed">${seed}</span>` : '<span class="seed"></span>';
      return { t, seedTxt };
    };
    const mkMatch = (m, seedA, seedB) => {
      const a = slot(m.a, seedA), b = slot(m.b, seedB);
      const aCls = m.winner ? (m.winner === m.a ? 'win' : 'lose') : '';
      const bCls = m.winner ? (m.winner === m.b ? 'win' : 'lose') : '';
      return `<div class="bk-match ${m.winner ? 'decided' : ''}">
        <div class="bk-slot ${aCls}">${a.seedTxt}${BV.photo(a.t,'ph')}<span class="nm">${BV.name(a.t)}</span></div>
        <div class="bk-slot ${bCls}">${b.seedTxt}${BV.photo(b.t,'ph')}<span class="nm">${BV.name(b.t)}</span></div>
      </div>`;
    };
    const seedOf = (id) => { const i = s.ko.seeds.indexOf(id); return i >= 0 ? i + 1 : ''; };
    const q = s.ko.quarter, sm = s.ko.semi, f = s.ko.final, third = s.ko.third;
    return `<div class="card"><h2 class="section-title">${bpIcon('battle')}八強淘汰賽</h2>
      <p class="section-sub">單局決勝，贏的人晉級。種子序為資格賽名次。</p>
      <div class="bracket">
        <div class="round round-qf">
          <div class="round-title">八強</div>
          ${mkMatch(q[0], 1, 8)}${mkMatch(q[1], 4, 5)}${mkMatch(q[2], 2, 7)}${mkMatch(q[3], 3, 6)}
        </div>
        <div class="round round-sf">
          <div class="round-title">四強</div>
          ${mkMatch(sm[0], seedOf(sm[0].a), seedOf(sm[0].b))}
          ${mkMatch(sm[1], seedOf(sm[1].a), seedOf(sm[1].b))}
        </div>
        <div class="round round-final">
          <div class="round-title">冠軍賽</div>
          ${mkMatch(f, seedOf(f.a), seedOf(f.b))}
          <div class="round-title" style="margin-top:14px">季軍賽</div>
          ${mkMatch(third, seedOf(third.a), seedOf(third.b))}
        </div>
      </div></div>`;
  },

  /* ---------- 冠軍頒獎 ---------- */
  podium(s) {
    const p = T.podium(s);
    if (!p) return '';
    const c = T.byId(s, p.first), sec = T.byId(s, p.second), th = p.third ? T.byId(s, p.third) : null;
    return `
      <div class="champ-banner">
        <div class="crown" aria-hidden="true"></div>
        <div class="cphoto" style="${c.photo?`background-image:url('${c.photo}');background-size:cover;background-position:center`:''}">${c.photo?'':esc(c.name.slice(0,1))}</div>
        <div class="tag gold">布拉克星球寶可夢卡牌大師</div>
        <h2>${esc(c.name)}</h2>
        <p style="color:var(--bp-muted)">恭喜 #${c.no} 號訓練家奪下冠軍！</p>
      </div>
      <div class="card" style="margin-top:18px">
        <h2 class="section-title">${bpIcon('badge')}頒獎台</h2>
        <div class="podium">
          <div class="spot p2"><div class="ph" style="${sec.photo?`background-image:url('${sec.photo}');background-size:cover`:''}">${sec.photo?'':esc(sec.name.slice(0,1))}</div><b>亞軍 ${esc(sec.name)}</b><div class="pblock p2">2</div></div>
          <div class="spot p1"><div class="ph" style="${c.photo?`background-image:url('${c.photo}');background-size:cover`:''}">${c.photo?'':esc(c.name.slice(0,1))}</div><b>冠軍 ${esc(c.name)}</b><div class="pblock">1</div></div>
          <div class="spot p3"><div class="ph" style="${th&&th.photo?`background-image:url('${th.photo}');background-size:cover`:''}">${th?(th.photo?'':esc(th.name.slice(0,1))):'?'}</div><b>季軍 ${th?esc(th.name):'待定'}</b><div class="pblock p3">3</div></div>
        </div>
      </div>`;
  },

  /* ---------- 流程步驟條 ---------- */
  flow(s) {
    const order = ['setup','qualifier','knockout','done'];
    const cur = order.indexOf(s.meta.status);
    const labels = ['① 訓練家登記','② 資格賽','③ 八強淘汰','④ 冠軍誕生'];
    return labels.map((l,i) => `<div class="step ${i<cur?'done':''} ${i===cur?'active':''}">${l}</div>`).join('');
  },
};

/* ---------- 公開展示頁主渲染 ---------- */
const BattleView = {
  render() {
    const s = T.load();
    const fs = document.getElementById('flowSteps');
    const box = document.getElementById('content');
    if (fs) fs.innerHTML = BV.flow(s);
    document.getElementById('evtName').innerHTML = `${bpIcon('battle')}${esc(s.meta.name)}`;

    if (s.meta.status === 'setup' && s.trainers.length < 2) {
      document.getElementById('evtStatus').textContent = '尚未開賽';
      box.innerHTML = `<div class="card empty"><div class="big">${bpIcon('card')}</div>
        <h2>比賽還沒開始</h2>
        <p>請老師到「裁判控制台」登記訓練家、開始資格賽。</p>
        <a class="btn gold" href="console.html">前往裁判控制台</a></div>`
        + BV.trainerWall(s);
      return;
    }

    let html = '';
    const status = s.meta.status;
    document.getElementById('evtStatus').textContent =
      status === 'qualifier' ? `資格賽進行中（第 ${s.meta.qualRound} / ${s.meta.qualTotalRounds} 輪）` :
      status === 'knockout' ? '八強淘汰賽進行中' :
      status === 'done' ? '比賽結束 ‧ 冠軍誕生！' : '訓練家登記中';

    if (status === 'done') {
      html += BV.podium(s);
      html += BV.bracket(s);
      BattleView.confetti();
    } else if (status === 'knockout') {
      html += BV.bracket(s);
      html += BV.standings(s);
    } else if (status === 'qualifier') {
      html += BV.standings(s);
      for (let i = s.qual.rounds.length - 1; i >= 0; i--) html += BV.qualRound(s, i, true);
    }
    html += BV.trainerWall(s);
    box.innerHTML = html;
  },

  confetti() {
    const box = document.getElementById('confetti');
    if (!box) return;
    box.style.display = 'block';
    const colors = ['#ffcb05','#6c4cff','#ff4d6d','#2fd07a','#38bdf8'];
    let h = '';
    for (let i = 0; i < 80; i++) {
      const x = Math.random()*100, dur = 2.5+Math.random()*2.5, delay = Math.random()*1.5;
      const c = colors[Math.floor(Math.random()*colors.length)];
      h += `<i style="left:${x}%;background:${c};animation-duration:${dur}s;animation-delay:${delay}s"></i>`;
    }
    box.innerHTML = h;
    setTimeout(() => { box.style.display = 'none'; }, 6000);
  },
};
