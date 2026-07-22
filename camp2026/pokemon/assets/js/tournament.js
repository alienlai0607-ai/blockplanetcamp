/* ============================================================
   tournament.js — 賽事引擎（單機 localStorage）
   流程：登記 → 資格賽(抽籤3輪) → 排行榜 → 八強單淘汰 → 季軍 → 冠軍
   ============================================================ */
const T_KEY = 'bp_tournament';

const T = {
  /* ---------- 載入 / 儲存 ---------- */
  load() {
    return Store.get(T_KEY, T.blank());
  },
  save(s) { Store.set(T_KEY, s); },
  blank() {
    return {
      meta: { name: '布拉克星球寶可夢卡牌大賽', status: 'setup', qualRound: 0, qualTotalRounds: 3, createdAt: '' },
      trainers: [],
      qual: { rounds: [] },
      ko: { seeds: [], quarter: [], semi: [], final: null, third: null },
    };
  },
  reset() { Store.remove(T_KEY); },

  /* ---------- 訓練家 ---------- */
  addTrainer(s, name, photo) {
    const no = s.trainers.length ? Math.max(...s.trainers.map(t => t.no)) + 1 : 1;
    s.trainers.push({ id: 'T' + no + '_' + Math.floor(Math.random() * 1e6), no, name, photo: photo || '', tb: Math.random() });
    return s;
  },
  removeTrainer(s, id) {
    s.trainers = s.trainers.filter(t => t.id !== id);
    return s;
  },
  byId(s, id) { return s.trainers.find(t => t.id === id) || null; },

  /* ---------- 資格賽抽籤 ---------- */
  pastOpponents(s) {
    const map = {};
    s.trainers.forEach(t => map[t.id] = new Set());
    s.qual.rounds.forEach(r => r.forEach(m => {
      if (m.b) { map[m.a]?.add(m.b); map[m.b]?.add(m.a); }
    }));
    return map;
  },
  drawRound(s) {
    if (s.trainers.length < 2) throw new Error('至少需要 2 位訓練家');
    const past = T.pastOpponents(s);
    const ids = shuffle(s.trainers.map(t => t.id));
    const matches = [];
    const used = new Set();
    let table = 1;
    for (let i = 0; i < ids.length; i++) {
      const a = ids[i];
      if (used.has(a)) continue;
      // 找一個沒交手過、且還沒配對的對手
      let partner = null;
      for (let j = i + 1; j < ids.length; j++) {
        const b = ids[j];
        if (used.has(b)) continue;
        if (!past[a].has(b)) { partner = b; break; }
      }
      // 都交手過了 → 退而求其次找任何沒配對的
      if (!partner) {
        for (let j = i + 1; j < ids.length; j++) {
          const b = ids[j];
          if (!used.has(b)) { partner = b; break; }
        }
      }
      if (partner) {
        used.add(a); used.add(partner);
        matches.push({ table: table++, a, b: partner, winner: null });
      } else {
        // 落單 → 輪空(自動勝)
        used.add(a);
        matches.push({ table: table++, a, b: null, winner: a, bye: true });
      }
    }
    s.qual.rounds.push(matches);
    s.meta.qualRound = s.qual.rounds.length;
    s.meta.status = 'qualifier';
    return s;
  },
  setQualResult(s, roundIdx, table, winnerId) {
    const m = s.qual.rounds[roundIdx]?.find(x => x.table === table);
    if (m && !m.bye) m.winner = winnerId;
    return s;
  },

  /* ---------- 排行榜 ---------- */
  standings(s) {
    const rec = {};
    s.trainers.forEach(t => rec[t.id] = { ...t, wins: 0, losses: 0, played: 0 });
    s.qual.rounds.forEach(r => r.forEach(m => {
      if (!m.winner) return;
      if (m.bye) { if (rec[m.a]) rec[m.a].wins++; return; }
      if (!rec[m.a] || !rec[m.b]) return;
      rec[m.a].played++; rec[m.b].played++;
      if (m.winner === m.a) { rec[m.a].wins++; rec[m.b].losses++; }
      else { rec[m.b].wins++; rec[m.a].losses++; }
    }));
    const arr = Object.values(rec);
    arr.sort((x, y) => y.wins - x.wins || x.losses - y.losses || y.tb - x.tb);
    arr.forEach((t, i) => t.rank = i + 1);
    return arr;
  },
  qualComplete(s) {
    if (s.qual.rounds.length < s.meta.qualTotalRounds) return false;
    return s.qual.rounds.every(r => r.every(m => m.winner));
  },

  /* ---------- 產生八強 ---------- */
  seedKnockout(s) {
    const top = T.standings(s).slice(0, 8).map(t => t.id);
    if (top.length < 8) throw new Error('需要至少 8 位訓練家才能進入八強賽');
    s.ko.seeds = top;
    // 1v8, 4v5 → 上半；2v7, 3v6 → 下半
    s.ko.quarter = [
      { a: top[0], b: top[7], winner: null },
      { a: top[3], b: top[4], winner: null },
      { a: top[1], b: top[6], winner: null },
      { a: top[2], b: top[5], winner: null },
    ];
    s.ko.semi = [{ a: null, b: null, winner: null }, { a: null, b: null, winner: null }];
    s.ko.final = { a: null, b: null, winner: null };
    s.ko.third = { a: null, b: null, winner: null };
    s.meta.status = 'knockout';
    return s;
  },
  setKoResult(s, stage, idx, winnerId) {
    let m;
    if (stage === 'quarter') m = s.ko.quarter[idx];
    else if (stage === 'semi') m = s.ko.semi[idx];
    else if (stage === 'final') m = s.ko.final;
    else if (stage === 'third') m = s.ko.third;
    if (!m) return s;
    m.winner = winnerId;
    T.propagate(s);
    return s;
  },
  loser(m) { return m.winner ? (m.winner === m.a ? m.b : m.a) : null; },
  propagate(s) {
    const q = s.ko.quarter;
    // 上半：q0,q1 → semi0 ; 下半：q2,q3 → semi1
    if (q[0].winner && q[1].winner) { s.ko.semi[0].a = q[0].winner; s.ko.semi[0].b = q[1].winner; }
    if (q[2].winner && q[3].winner) { s.ko.semi[1].a = q[2].winner; s.ko.semi[1].b = q[3].winner; }
    const sm = s.ko.semi;
    if (sm[0].winner && sm[1].winner) {
      s.ko.final.a = sm[0].winner; s.ko.final.b = sm[1].winner;
      s.ko.third.a = T.loser(sm[0]); s.ko.third.b = T.loser(sm[1]);
    }
    if (s.ko.final.winner) s.meta.status = 'done';
    return s;
  },
  podium(s) {
    if (!s.ko.final?.winner) return null;
    return {
      first: s.ko.final.winner,
      second: T.loser(s.ko.final),
      third: s.ko.third?.winner || null,
    };
  },

  /* ---------- 匯出 / 匯入 ---------- */
  exportJSON(s) { return JSON.stringify(s, null, 2); },
  importJSON(text) {
    const obj = JSON.parse(text);
    if (!obj.meta || !Array.isArray(obj.trainers)) throw new Error('檔案格式不正確');
    return obj;
  },
};
