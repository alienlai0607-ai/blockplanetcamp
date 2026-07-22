/* ============================================================
   learn.js — 學習區互動邏輯
   ============================================================ */
const Learn = {
  init() {
    Learn.tabs();
    Learn.lessons();
    Learn.types();
    Learn.quiz();
    Learn.badges();
    Learn.rules();
    Learn.calc();
    Learn.timer();
    // 開站時依 hash 切到對應分頁
    const h = location.hash.replace('#', '');
    if (h) Learn.showPane(h);
  },

  /* ---------- 分頁 ---------- */
  showPane(name) {
    document.querySelectorAll('[data-pane]').forEach(s => s.hidden = (s.dataset.pane !== name));
    document.querySelectorAll('#tabbar a').forEach(a =>
      a.classList.toggle('active', a.getAttribute('href') === '#' + name));
  },
  tabs() {
    document.querySelectorAll('#tabbar a').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const name = a.getAttribute('href').slice(1);
        location.hash = name;
        Learn.showPane(name);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    });
  },

  /* ---------- 教材 ---------- */
  doneLessons() { return Store.get('bp_lessons_done', []); },
  lessons() {
    const hub = document.getElementById('lessonHub');
    const view = document.getElementById('lessonView');
    const render = () => {
      hub.innerHTML = `<div class="lesson-nav">` + LESSONS.map(l => `
        <div class="card lesson-card" data-l="${l.num}">
          <div class="lesson-icon">${bpIcon(l.icon || 'card')}</div>
          <div class="num">第 ${l.num} 章</div>
          <h3>${esc(l.title)}</h3>
        </div>`).join('') + `</div>`;
      Learn.bindEvoControls(hub);
      Learn.bindGuideControls(hub);
      hub.querySelectorAll('.lesson-card').forEach(c =>
        c.addEventListener('click', () => openLesson(+c.dataset.l)));
    };
    const openLesson = (num) => {
      const i = LESSONS.findIndex(l => l.num === num);
      const l = LESSONS[i];
      // 記錄學習進度，列表不顯示狀態文字。
      const done = Learn.doneLessons();
      if (!done.includes(num)) { done.push(num); Store.set('bp_lessons_done', done); }
      hub.style.display = 'none';
      view.style.display = 'block';
      view.innerHTML = `
        <button class="btn ghost sm" id="backHub">← 回章節列表</button>
        <div class="card lesson-body" style="margin-top:14px">
          <div class="tag gold">第 ${l.num} 章</div>
          <h1 style="margin:10px 0">${bpIcon(l.icon || 'card')}${esc(l.title)}</h1>
          <div class="story">${esc(l.story)}</div>
          ${Learn.cardDemo(l.num)}
          ${l.body}
          <div class="toolbar" style="margin-top:26px">
            ${i > 0 ? `<button class="btn ghost" data-go="${LESSONS[i-1].num}">← 上一章</button>` : ''}
            <span class="spacer"></span>
            ${i < LESSONS.length-1 ? `<button class="btn" data-go="${LESSONS[i+1].num}">下一章 →</button>` :
              `<a class="btn gold" href="#quiz" id="toQuiz">${bpIcon('badge')}去考測驗</a>`}
          </div>
        </div>`;
      Learn.bindEvoControls(view);
      Learn.bindGuideControls(view);
      view.querySelector('#backHub').addEventListener('click', () => {
        view.style.display = 'none'; hub.style.display = 'block'; render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      view.querySelectorAll('[data-go]').forEach(b =>
        b.addEventListener('click', () => { openLesson(+b.dataset.go); window.scrollTo({ top: 0, behavior: 'smooth' }); }));
      const tq = view.querySelector('#toQuiz');
      if (tq) tq.addEventListener('click', e => { e.preventDefault(); location.hash = 'quiz'; Learn.showPane('quiz'); window.scrollTo({top:0}); });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    render();
  },

  cardDemo(num) {
    const source = typeof LESSON_CARD_DEMOS !== 'undefined' ? LESSON_CARD_DEMOS :
      (typeof OFFICIAL_CARD_DEMOS !== 'undefined' ? OFFICIAL_CARD_DEMOS : {});
    const d = source[num] || null;
    if (!d) return '';
    const images = d.imgs || (d.img ? [d.img] : []);
    const evoKeys = d.evolutions || (d.evolution ? [d.evolution] : []);
    const multiEvo = evoKeys.length > 1;
    const visual = evoKeys.length ? `
      <div class="evo-showcases ${multiEvo ? 'multi' : 'solo'}">
        ${evoKeys.map(key => Learn.evoCarousel(key, multiEvo)).join('')}
      </div>` : `
      <div class="demo-gallery">
        ${images.map(img => `
          <div class="demo-card-visual wide">
            <img src="${esc(img)}" alt="${esc(d.title)}" loading="lazy" onerror="this.closest('.demo-card-visual').classList.add('missing')">
            <div class="demo-card-missing">
              <b>找不到卡牌圖</b>
              <span>${esc(img.replace('../', ''))}</span>
            </div>
          </div>`).join('')}
      </div>`;
    return `
      <section class="official-card-demo ${multiEvo ? 'has-multiple-evo' : ''}">
        ${visual}
        <div class="demo-card-copy">
          <span class="tag gold">${esc(d.label || '卡牌示範')}</span>
          <h2>${esc(d.title)}</h2>
          <p>${esc(d.lesson)}</p>
          <div class="demo-mini-title">這章請準備</div>
          <div class="demo-chip-row">${d.cards.map(x => `<span class="tag">${esc(x)}</span>`).join('')}</div>
          <div class="demo-mini-title">請孩子看卡面這些位置</div>
          <ul class="demo-focus-list">${d.focus.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
          ${d.officialUrl ? `<a class="btn sm ghost" href="${esc(d.officialUrl)}" target="_blank" rel="noopener">打開參考資料</a>` : ''}
        </div>
      </section>
      ${Learn.lessonIllustration(num)}
      ${d.beginnerIntro ? Learn.beginnerCardGuide() : ''}
      ${d.anatomy ? Learn.cardAnatomy() : ''}
      ${d.fullRules ? Learn.fullCardRuleGuide() : ''}`;
  },

  lessonIllustration(num) {
    const card = (name, src, cls = '') => `
      <figure class="teach-card ${cls}">
        <img src="${esc(src)}" alt="${esc(name)}" loading="lazy">
        <figcaption>${esc(name)}</figcaption>
      </figure>`;
    const back = (label = '牌庫') => `<div class="teach-card-back"><span>${esc(label)}</span></div>`;
    const energyMeta = (label = '能量卡', type = '') => {
      const text = String(label);
      const inferred = type ||
        (text.includes('火') ? 'fire' :
        text.includes('水') ? 'water' :
        text.includes('草') || text.includes('葉') ? 'grass' :
        text.includes('超') || text.includes('念') ? 'psychic' :
        text.includes('鬥') || text.includes('拳') ? 'fighting' :
        text.includes('惡') || text.includes('暗') ? 'darkness' :
        text.includes('鋼') || text.includes('金') ? 'metal' :
        text.includes('無') ? 'colorless' : 'lightning');
      const data = {
        lightning: ['雷', 'Lightning'],
        fire: ['火', 'Fire'],
        water: ['水', 'Water'],
        grass: ['草', 'Grass'],
        psychic: ['超', 'Psychic'],
        fighting: ['鬥', 'Fighting'],
        darkness: ['惡', 'Darkness'],
        metal: ['鋼', 'Metal'],
        colorless: ['無', 'Colorless'],
      };
      const [symbol, name] = data[inferred] || data.lightning;
      return { key: inferred, symbol, name, label: text };
    };
    const energy = (label = '基本雷能量卡', type = '') => {
      const info = energyMeta(label, type);
      return `
        <figure class="teach-energy teach-energy-card ${info.key}">
          <img src="../assets/img/cards/energy/${esc(info.key)}.png?v=redraw1" alt="${esc(info.label)}" loading="lazy">
          <span class="energy-type-badge" aria-hidden="true">${esc(info.symbol)}</span>
          <figcaption>
            <strong>${esc(info.label)}</strong>
            <small>${esc(info.name)} Energy</small>
          </figcaption>
        </figure>`;
    };
    const trainer = (label = '訓練家卡') => `<div class="teach-trainer-card">${bpIcon('trainers')}<span>${esc(label)}</span></div>`;
    const stack = (count, label) => `<div class="teach-stack">${Array.from({ length: count }).map(() => back('')).join('')}<b>${esc(label)}</b></div>`;
    const points = (...items) => `<div class="teach-points">${items.map(x => `<span>${esc(x)}</span>`).join('')}</div>`;
    const wrap = (kind, title, body) => `
      <section class="lesson-graphic ${kind}">
        <div class="lesson-graphic-head">
          <span class="tag gold">課堂圖解</span>
          <h2>${esc(title)}</h2>
        </div>
        ${body}
      </section>`;

    const xiaobu1 = '../assets/img/mascot-cards/stages/xiaobu-stage-1.png';
    const xiaobu2 = '../assets/img/mascot-cards/stages/xiaobu-stage-2.png';
    const keke1 = '../assets/img/mascot-cards/stages/keke-stage-1.png';
    const aqiu1 = '../assets/img/mascot-cards/stages/aqiu-stage-1.png';
    const lala1 = '../assets/img/mascot-cards/stages/lala-stage-1.png';
    const xing1 = '../assets/img/mascot-cards/stages/xingxing-stage-1.png';
    const xing2 = '../assets/img/mascot-cards/stages/xingxing-stage-2.png';

    const board = (active = '', bench = '') => `
      <div class="teach-playmat">
        <div class="mat-zone prize">${stack(6, '獎勵卡 6 張')}</div>
        <div class="mat-zone active"><b>戰鬥區</b>${active}</div>
        <div class="mat-zone deck">${back('牌庫')}</div>
        <div class="mat-zone bench"><b>備戰區 最多 5 隻</b>${bench}</div>
        <div class="mat-zone discard"><b>棄牌堆</b></div>
      </div>`;

    const diagrams = {
      1: wrap('graphic-card-types', '先分清楚三種卡：角色、能量、支援',
        `<div class="teach-three-cards">
          ${card('寶可夢卡：上場戰鬥', xiaobu1)}
          ${energy('基本雷能量卡：貼在寶可夢身上', 'lightning')}
          ${trainer('訓練家卡：抽牌、找牌、補血')}
        </div>
        ${points('寶可夢卡有 HP 和招式', '能量卡是出招燃料', '訓練家卡使用後照文字處理')}`),
      2: wrap('graphic-read-card', '讀卡順序：上方、中間、底部',
        `<div class="teach-read-map">
          ${card('小布卡', xiaobu2)}
          <div class="read-band top"><b>上方</b><span>名稱、HP、屬性、進化階段</span></div>
          <div class="read-band middle"><b>中間</b><span>角色圖、特性、招式、傷害</span></div>
          <div class="read-band bottom"><b>底部</b><span>弱點、抵抗力、撤退、收集資訊</span></div>
          <div class="read-tools">${energy('基本水能量卡', 'water')}${trainer('訓練家卡')}</div>
        </div>`),
      3: wrap('graphic-table', '桌面擺法：誰會被打、誰在等候',
        `${board(card('克克出戰', keke1, 'active-card'), card('阿球備戰', aqiu1, 'bench-card'))}
        ${points('戰鬥區只有 1 隻會被攻擊', '備戰區最多 5 隻', '牌庫背面朝上，獎勵卡蓋 6 張')}`),
      4: wrap('graphic-opening', '開局：從手牌找基礎寶可夢',
        `<div class="teach-hand-flow">
          <div class="teach-hand">
            ${card('基礎：可放上場', xing1)}
            ${card('1 階：先留手牌', xing2)}
            ${energy('基本草能量卡', 'grass')}
            ${trainer('訓練家卡')}
          </div>
          <div class="teach-arrow">把基礎放到場上</div>
          ${board(card('小星星出戰', xing1), '')}
        </div>
        ${points('沒有基礎寶可夢就重抽', '進化卡不能直接當開局出戰', '獎勵卡開局蓋 6 張')}`),
      5: wrap('graphic-turn', '自己的回合：抽牌、做事、攻擊',
        `<div class="turn-flow-board">
          <div class="turn-step"><b>1</b><strong>從牌庫抽 1 張</strong>${back('牌庫')}</div>
          <div class="turn-step"><b>2</b><strong>自由做事</strong><div class="turn-card-row">${energy('基本雷能量卡', 'lightning')}${trainer('訓練家')}</div><ul><li>貼 1 張能量</li><li>放備戰寶可夢</li><li>進化、撤退</li><li>使用訓練家卡</li></ul></div>
          <div class="turn-step"><b>3</b><strong>使用招式</strong>${card('出戰寶可夢攻擊', lala1)}</div>
        </div>
        ${points('貼能量通常每回合 1 張', '支援者通常每回合 1 張', '攻擊後換對手回合')}`),
      6: wrap('graphic-attack', '攻擊：先看能量，再算傷害',
        `${board(`<div class="attack-source">${card('克克', keke1)}<div class="attach-energy-row">${energy('基本火能量卡', 'fire')}${energy('任意能量支付無色需求', 'water')}</div></div>`, card('小星星目標', xing1))}
        <div class="damage-formula"><span>招式 40</span><b>弱點 ×2</b><strong>80 傷害</strong></div>
        ${points('能量不夠不能出招', '弱點只看被攻擊的戰鬥寶可夢', '招式用完後能量仍留在身上')}`),
      7: wrap('graphic-evolution', '進化：從手牌拿下一階段疊上去',
        `<div class="evolution-flow-board">
          ${card('場上的小小布', xiaobu1)}
          <div class="teach-arrow">手牌有 Stage 1</div>
          ${card('疊上星布', xiaobu2)}
          <div class="energy-note">${energy('已貼好的基本雷能量卡', 'lightning')}<span>能量不是進化費用</span></div>
        </div>
        ${points('剛放上場通常不能馬上進化', '傷害與能量保留', '睡眠、麻痺、中毒等狀態會清除')}`),
      8: wrap('graphic-status', '特殊狀態：用方向和標記看懂',
        `<div class="status-board">
          <div>${card('睡眠 / 麻痺：轉橫', aqiu1, 'card-sideways')}<b>不能攻擊或撤退</b></div>
          <div>${card('混亂：上下顛倒', aqiu1, 'card-upside')}<b>攻擊前要擲幣</b></div>
          <div>${card('中毒 / 灼傷：放標記', aqiu1)}<span class="status-token">毒</span><span class="status-token burn">灼</span></div>
        </div>
        ${points('撤退或進化可清除多數特殊狀態', '狀態一定要用標記或轉向，不只口頭說')}`),
      9: wrap('graphic-win', '勝利：打倒對手，拿獎勵卡',
        `<div class="win-board">
          ${card('小布攻擊', xiaobu1)}
          <div class="teach-arrow">打倒</div>
          ${card('克克昏厥', keke1, 'fainted')}
          <div class="teach-arrow">拿 1 張</div>
          ${stack(6, '獎勵卡')}
        </div>
        ${points('拿完 6 張獎勵卡獲勝', '對手場上沒寶可夢也獲勝', '對手抽不出牌也獲勝')}`),
      10: wrap('graphic-strategy', '策略：能量集中，備戰接棒',
        `<div class="strategy-board">
          ${board(`<div class="attack-source">${card('主力小布', xiaobu2)}<div class="attach-energy-row">${energy('基本雷能量卡', 'lightning')}${energy('任意能量支付無色需求', 'water')}</div></div>`, `${card('拉拉備戰', lala1)}${card('阿球備戰', aqiu1)}`)}
          <div class="strategy-notes"><b>不要平均亂貼</b><span>先讓主力能出招，再養下一隻。</span></div>
        </div>
        ${points('主力要先貼夠能量', '備戰區準備下一隻', '快被打倒時考慮撤退')}`),
      11: wrap('graphic-mistakes', '常見錯誤：左邊錯，右邊改正',
        `<div class="mistake-board">
          <div class="mistake wrong"><b>錯</b><span>同回合貼兩張能量</span>${energy('基本火能量卡', 'fire')}${energy('基本水能量卡', 'water')}</div>
          <div class="mistake right"><b>對</b><span>通常一回合只貼 1 張</span>${energy('基本雷能量卡', 'lightning')}</div>
          <div class="mistake wrong"><b>錯</b><span>剛放上場立刻進化</span>${card('Stage 1', xiaobu2)}</div>
          <div class="mistake right"><b>對</b><span>等下一個自己的回合再進化</span>${card('基礎', xiaobu1)}</div>
        </div>
        ${points('支援者通常每回合 1 張', '弱點不要算到備戰區', '不確定就先停下來問裁判')}`),
    };
    return diagrams[num] || '';
  },

  beginnerCardGuide() {
    const items = [
      ['卡名', '先問：這張卡是誰？卡名就是你要派上場的角色。'],
      ['HP', '再看血量。受到的傷害累積到 HP 以上，這張卡就被打倒。'],
      ['屬性', '看左上角徽章。屬性會影響弱點、抵抗與能量選擇。'],
      ['角色圖', '中間大圖幫你快速認角色，上課時可以先用圖確認孩子有沒有拿對卡。'],
      ['招式區', '招式區告訴你「能做什麼」。左邊是需要的能量，右邊是傷害。'],
      ['底部資訊', '最底部是被攻擊和換人時要看的地方：弱點、抵抗、撤退。'],
    ];
    return `
      <section class="beginner-card-guide">
        <div class="beginner-card-visual">
          <div class="beginner-card-scan">
            <img src="../assets/img/mascot-cards/stages/xiaobu-stage-2.png" alt="星布卡牌新手導覽" loading="lazy">
            ${[
              ['1', 20, 4, 'top'], ['2', 96, 8, 'left'], ['3', 2, 15, 'right'],
              ['4', 98, 36, 'left'], ['5', 2, 63, 'right'], ['6', 98, 88, 'left'],
            ].map(m => `<button class="anatomy-marker" type="button" data-guide-marker="${m[0]}" data-label="${esc(items[+m[0] - 1][0])}" data-side="${m[3]}" style="left:${m[1]}%;top:${m[2]}%">${m[0]}</button>`).join('')}
          </div>
          <div class="guide-current-label" data-guide-current>1　卡名</div>
        </div>
        <div class="beginner-card-copy">
          <span class="tag gold">第一次看卡，只看這 6 個位置</span>
          <h2>一張卡不是圖片，是一張對戰說明書</h2>
          <p>先照 1 到 6 看，不需要背專有名詞。看懂這六格，就知道這張卡是誰、能撐多久、怎麼攻擊、被打時要注意什麼。</p>
          <div class="beginner-guide-list">
            ${items.map((x, i) => `
              <button class="anatomy-item" type="button" data-guide-item="${i + 1}">
                <b>${i + 1}</b>
                <span><strong>${esc(x[0])}</strong><em>${esc(x[1])}</em></span>
              </button>`).join('')}
          </div>
        </div>
      </section>`;
  },

  evoCarousel(key, compact = false) {
    const card = (typeof MASCOT_CARD_LIBRARY !== 'undefined' ? MASCOT_CARD_LIBRARY : []).find(x => x.key === key);
    if (!card) return '';
    const stages = card.stages || [];
    return `
      <article class="evo-card-carousel ${compact ? 'compact' : ''}" data-evo="${esc(key)}" data-stage="0">
        <div class="evo-head">
          <span class="tag gold">${esc(card.type)}屬性</span>
          <b>${esc(card.name)}</b>
          <small>${esc(card.role)}</small>
        </div>
        <div class="evo-frame">
          <button class="evo-arrow prev" type="button" data-evo-prev aria-label="上一階">‹</button>
          <div class="evo-stage-window">
            ${stages.map((s, i) => `
              <figure class="evo-stage ${i === 0 ? 'active' : ''}" data-stage-panel="${i}">
                <img src="${esc(s.img)}" alt="${esc(s.name)}卡牌" loading="lazy">
                <figcaption>
                  <strong>${esc(s.label)}</strong>
                  <span>${esc(s.name)} · HP ${esc(String(s.hp))}</span>
                </figcaption>
              </figure>`).join('')}
          </div>
          <button class="evo-arrow next" type="button" data-evo-next aria-label="下一階">›</button>
        </div>
        <div class="evo-dots" aria-label="進化階段">
          ${stages.map((s, i) => `<button class="${i === 0 ? 'active' : ''}" type="button" data-evo-dot="${i}" aria-label="${esc(s.label)}"></button>`).join('')}
        </div>
      </article>`;
  },

  bindEvoControls(root = document) {
    root.querySelectorAll('.evo-card-carousel').forEach(car => {
      const panels = [...car.querySelectorAll('[data-stage-panel]')];
      const dots = [...car.querySelectorAll('[data-evo-dot]')];
      const setStage = (idx) => {
        if (!panels.length) return;
        const next = (idx + panels.length) % panels.length;
        car.dataset.stage = String(next);
        panels.forEach((p, i) => p.classList.toggle('active', i === next));
        dots.forEach((d, i) => d.classList.toggle('active', i === next));
      };
      car.querySelector('[data-evo-prev]')?.addEventListener('click', () => setStage((+car.dataset.stage || 0) - 1));
      car.querySelector('[data-evo-next]')?.addEventListener('click', () => setStage((+car.dataset.stage || 0) + 1));
      dots.forEach(dot => dot.addEventListener('click', () => setStage(+dot.dataset.evoDot || 0)));
    });
  },

  bindGuideControls(root = document) {
    const boards = root.querySelectorAll('.beginner-card-guide, .card-anatomy-board');
    boards.forEach(board => {
      const setActive = (id) => {
        board.querySelectorAll('[data-guide-marker]').forEach(el =>
          el.classList.toggle('active', el.dataset.guideMarker === id));
        board.querySelectorAll('[data-guide-item]').forEach(el =>
          el.classList.toggle('active', el.dataset.guideItem === id));
        const current = board.querySelector('[data-guide-current]');
        const marker = board.querySelector(`[data-guide-marker="${id}"]`);
        if (current && marker) current.textContent = `${id}　${marker.dataset.label || ''}`;
      };
      board.querySelectorAll('[data-guide-marker]').forEach(el => {
        el.addEventListener('click', () => setActive(el.dataset.guideMarker));
        el.addEventListener('mouseenter', () => setActive(el.dataset.guideMarker));
      });
      board.querySelectorAll('[data-guide-item]').forEach(el => {
        el.addEventListener('click', () => setActive(el.dataset.guideItem));
        el.addEventListener('mouseenter', () => setActive(el.dataset.guideItem));
      });
      setActive('1');
    });
  },

  cardAnatomy() {
    const items = [
      ['名稱', '卡牌的角色名稱。牌組裡同名卡通常最多 4 張。'],
      ['HP', '右上角血量；受到等同或超過 HP 的傷害就會昏厥。'],
      ['屬性', '影響弱點與抵抗力，也會影響能量與策略選擇。'],
      ['進化標記', '看這裡確認是基礎、1 階或 2 階；進化要照來源名稱疊上去。'],
      ['特性', '不是攻擊；發動後通常不會結束回合。'],
      ['招式', '左邊看能量需求，右邊看傷害或效果文字。'],
      ['弱點', '被指定屬性打中時，通常傷害 x2。'],
      ['抵抗力', '被指定屬性攻擊時，依卡面減少傷害。'],
      ['撤退', '從出戰位退到備戰區時，要丟棄的能量數量。'],
    ];
    return `
      <section class="card-anatomy-board">
        <div class="anatomy-visual">
          <div class="anatomy-card-scan">
            <img src="../assets/img/mascot-cards/stages/xiaobu-stage-2.png" alt="小布卡牌卡面導覽" loading="lazy">
            ${[
              ['1', 16, 3, 'top'], ['2', 98, 8, 'left'], ['3', 2, 12, 'right'], ['4', 2, 62, 'right'],
              ['5', 98, 62, 'left'], ['6', 2, 78, 'right'], ['7', 2, 88, 'right'], ['8', 52, 94, 'top'],
              ['9', 98, 88, 'left'],
            ].map(m => `<button class="anatomy-marker" type="button" data-guide-marker="${m[0]}" data-label="${esc(items[+m[0] - 1][0])}" data-side="${m[3]}" style="left:${m[1]}%;top:${m[2]}%">${m[0]}</button>`).join('')}
          </div>
          <div class="guide-current-label" data-guide-current>1　名稱</div>
        </div>
        <div class="anatomy-copy">
          <span class="tag gold">像官方教材一樣讀卡</span>
          <h2>卡面 9 個玩法位置，一次看懂</h2>
          <p>這裡只放真正會影響上桌對戰的資訊：名稱、HP、屬性、進化、特性、招式、弱點、抵抗力、撤退。</p>
          <div class="anatomy-list">
            ${items.map((x, i) => `
              <button class="anatomy-item" type="button" data-guide-item="${i + 1}">
                <b>${i + 1}</b>
                <span><strong>${esc(x[0])}</strong>${esc(x[1])}</span>
              </button>`).join('')}
          </div>
        </div>
      </section>`;
  },

  fullCardRuleGuide() {
    const sections = typeof CARD_RULE_DETAIL_SECTIONS !== 'undefined' ? CARD_RULE_DETAIL_SECTIONS : [];
    if (!sections.length) return '';
    return `
      <section class="rule-detail-board">
        <aside class="rule-detail-nav" aria-label="卡牌種類導覽">
          <span class="tag gold">完整細節</span>
          <h2>卡牌種類和卡面介紹</h2>
          <p>照這個順序上課：先認卡種，再看卡面位置，最後看特殊規則。</p>
          <div class="rule-detail-links">
            ${sections.map(s => `<a href="#${esc(s.id)}">${bpIcon(s.icon || 'card')}${esc(s.title)}</a>`).join('')}
          </div>
        </aside>
        <div class="rule-detail-content">
          ${sections.map(s => `
            <article class="rule-topic" id="${esc(s.id)}">
              <div class="rule-topic-head">
                <span class="rule-topic-icon">${bpIcon(s.icon || 'card')}</span>
                <div>
                  <span class="tag">${esc(s.kicker)}</span>
                  <h3>${esc(s.title)}</h3>
                  <p>${esc(s.summary)}</p>
                </div>
              </div>
              ${Learn.ruleTopicVisual(s.id)}
              <div class="rule-point-grid">
                ${s.points.map((p, i) => `
                  <div class="rule-point">
                    <b>${i + 1}</b>
                    <span><strong>${esc(p[0])}</strong>${esc(p[1])}</span>
                  </div>`).join('')}
              </div>
              ${s.teacher ? `<div class="teacher-note">${bpIcon('judge')}<span>${esc(s.teacher)}</span></div>` : ''}
            </article>`).join('')}
        </div>
      </section>`;
  },

  ruleTopicVisual(id) {
    const card = (src, title, meta = '') => `
      <figure class="rule-mini-card">
        <img src="${src}" alt="${esc(title)}" loading="lazy">
        <figcaption><strong>${esc(title)}</strong>${meta ? `<span>${esc(meta)}</span>` : ''}</figcaption>
      </figure>`;
    const token = (label, type = '') => `<span class="rule-energy-token ${type}">${esc(label)}</span>`;
    if (id === 'rule-pokemon-card') {
      return `
        <div class="rule-topic-visual visual-play">
          <div class="visual-zone active-zone">
            <span class="zone-label">戰鬥區</span>
            ${card('../assets/img/mascot-cards/stages/xiaobu-stage-1.png', '小小布', 'HP 50')}
            <div class="attached-row">${token('雷', 'lightning')}</div>
          </div>
          <div class="visual-arrow">攻擊</div>
          <div class="visual-zone bench-zone">
            <span class="zone-label">對手出戰</span>
            ${card('../assets/img/mascot-cards/stages/keke-stage-1.png', '小克克', '受到傷害')}
          </div>
          <p class="visual-caption">寶可夢卡放到戰鬥區或備戰區。貼夠能量後，用招式攻擊對手；受到傷害累積到 HP 以上就昏厥。</p>
        </div>`;
    }
    if (id === 'rule-card-face') {
      return `
        <div class="rule-topic-visual visual-map">
          <div class="map-card-shell">
            <img src="../assets/img/mascot-cards/stages/xiaobu-stage-2.png" alt="卡面位置示意" loading="lazy">
          </div>
          <div class="map-layers">
            <div><b>上方</b><span>名稱、HP、屬性、階段</span></div>
            <div><b>中間</b><span>角色圖、特性、招式</span></div>
            <div><b>底部</b><span>弱點、抵抗、撤退、收集資訊</span></div>
          </div>
          <p class="visual-caption">新手先分三層看：上方看身份，中間看能做什麼，底部看被攻擊和換人時的規則。</p>
        </div>`;
    }
    if (id === 'rule-evolution') {
      return `
        <div class="rule-topic-visual visual-evolution">
          ${card('../assets/img/mascot-cards/stages/xiaobu-stage-1.png', '基礎 / Baby Stage', '先在場上')}
          <div class="evo-condition">
            <b>手牌有下一階段卡</b>
            <span>符合回合限制後，疊上去</span>
          </div>
          ${card('../assets/img/mascot-cards/stages/xiaobu-stage-2.png', '1 階 / Stage 1', '疊在原卡上')}
          <div class="evo-condition no-energy">
            <b>不是能量集滿進化</b>
            <span>能量是出招和撤退用</span>
          </div>
          ${card('../assets/img/mascot-cards/stages/xiaobu-stage-3.png', '2 階 / Final Stage', '繼續疊上去')}
          <p class="visual-caption">進化看「階段」和「從誰進化」，不是看身上有幾顆能量。傷害保留，特殊狀態會清除。</p>
        </div>`;
    }
    if (id === 'rule-type') {
      return `
        <div class="rule-topic-visual visual-type">
          <div class="type-card fire">${bpIcon('type')}火屬性攻擊</div>
          <div class="type-math">打中弱點 ×2</div>
          <div class="type-card grass">${bpIcon('type')}草屬性弱點</div>
          <div class="type-result">40 傷害 → 80 傷害</div>
          <p class="visual-caption">攻擊前先看對手底部的弱點與抵抗力。打到弱點通常先把傷害加倍，再處理其他效果。</p>
        </div>`;
    }
    if (id === 'rule-energy') {
      return `
        <div class="rule-topic-visual visual-energy">
          <div class="energy-card-wrap">
            ${card('../assets/img/mascot-cards/stages/xiaobu-stage-2.png', '星布', '招式需要 2 顆能量')}
            <div class="energy-attach">
              <span class="attach-label">能量貼在寶可夢身上</span>
              ${token('雷', 'lightning')}<span class="rule-cost-note">無色需求可用任意實際能量支付</span>
            </div>
          </div>
          <ol class="visual-steps">
            <li><b>從手牌貼</b><span>自己的回合通常只能貼 1 張能量。</span></li>
            <li><b>放在卡下方或旁邊</b><span>上課時可半壓在寶可夢卡下緣，表示它已經附著。</span></li>
            <li><b>看招式需求</b><span>招式左邊要幾顆，就要先湊到幾顆才能用。</span></li>
          </ol>
          <p class="visual-caption">能量夠了是可以使用招式；進化不是靠能量數量，而是手上有正確下一階段卡。</p>
        </div>`;
    }
    if (id === 'rule-trainer') {
      return `
        <div class="rule-topic-visual visual-trainer">
          ${[
            ['物品卡', '可用來找牌、抽牌、補血', 'i-card'],
            ['支援者卡', '效果強，每回合通常 1 張', 'i-trainers'],
            ['競技場卡', '放在場中央，影響雙方', 'i-screen'],
            ['寶可夢道具', '裝到寶可夢身上持續生效', 'i-badge'],
          ].map(x => `
            <div class="trainer-card-demo">
              <span class="bp-icon ${x[2]}"></span>
              <b>${x[0]}</b>
              <small>${x[1]}</small>
            </div>`).join('')}
          <p class="visual-caption">訓練家卡不是角色，不會放到戰鬥區打架；它們是用來支援你的牌組運轉。</p>
        </div>`;
    }
    if (id === 'rule-special') {
      return `
        <div class="rule-topic-visual visual-special">
          ${[
            ['寶可夢 ex', '更強，但被擊倒通常給更多獎勵卡', 'ex'],
            ['古代 / 未來', '看特殊標記，會和指定效果互動', 'mark'],
            ['訓練家的寶可夢', '名字帶訓練家，依卡面規則判斷', 'trainer'],
          ].map(x => `
            <div class="special-card-demo ${x[2]}">
              <span>${x[0]}</span>
              <b>${x[2] === 'ex' ? 'ex' : x[2] === 'mark' ? '古 / 未' : 'TRAINER'}</b>
              <small>${x[1]}</small>
            </div>`).join('')}
          <p class="visual-caption">看到特殊標記時，不要靠猜。先讀卡上的規則框，再決定獎勵卡、同名卡和效果怎麼處理。</p>
        </div>`;
    }
    return '';
  },

  /* ---------- 屬性相剋 ---------- */
  types() {
    const grid = document.getElementById('typeGrid');
    grid.innerHTML = TYPES.map(t => `
      <div class="type-chip">
        <span class="type-dot type-${t.key}" style="background:${t.color}"></span>
        <span><b>${t.name}屬性</b><small>怕：${t.weakTo.map(k => TYPE_MAP[k].name).join('、') || '—'}</small></span>
      </div>`).join('');
    const wl = document.getElementById('weakList');
    wl.innerHTML = TYPES.filter(t => t.beats.length).map(t => `
      <div class="weak-row">
        <span class="tag" style="background:${t.color}22;color:${t.color}">${t.name}</span>
        <span class="arrow">剋 ➜</span>
        ${t.beats.map(k => `<span class="tag" style="background:${TYPE_MAP[k].color}22;color:${TYPE_MAP[k].color}">${TYPE_MAP[k].name}</span>`).join('')}
        <span class="arrow">（傷害 ×2）</span>
      </div>`).join('');
  },

  /* ---------- 測驗 ---------- */
  quiz() {
    const card = document.getElementById('quizCard');
    let idx = 0, score = 0, locked = false;
    const start = () => { idx = 0; score = 0; locked = false; show(); };
    const show = () => {
      if (idx >= QUIZ.length) return finish();
      const q = QUIZ[idx];
      card.innerHTML = `
        <div class="quiz-progress"><i style="width:${(idx/QUIZ.length)*100}%"></i></div>
        <div class="tag">第 ${idx+1} / ${QUIZ.length} 題　目前 ${score} 分</div>
        <p class="quiz-q">${esc(q.q)}</p>
        <div class="quiz-options">
          ${q.options.map((o,i)=>`<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join('')}
        </div>
        <p id="quizWhy" style="color:var(--bp-muted);margin-top:14px"></p>`;
      locked = false;
      card.querySelectorAll('.quiz-opt').forEach(b =>
        b.addEventListener('click', () => pick(+b.dataset.i)));
    };
    const pick = (i) => {
      if (locked) return; locked = true;
      const q = QUIZ[idx];
      const opts = card.querySelectorAll('.quiz-opt');
      opts[q.answer].classList.add('correct');
      if (i === q.answer) score++; else opts[i].classList.add('wrong');
      card.querySelector('#quizWhy').innerHTML = `${bpIcon('check')} ${esc(q.why)}`;
      const next = el('button', 'btn', idx === QUIZ.length-1 ? '看結果' : '下一題 →');
      next.style.marginTop = '14px';
      next.addEventListener('click', () => { idx++; show(); });
      card.appendChild(next);
    };
    const finish = () => {
      const pass = score >= Math.ceil(QUIZ.length * 0.7);
      if (pass) {
        const b = Store.get('bp_badges', {});
        b.quiz = true; Store.set('bp_badges', b);
        Learn.renderBadges();
      }
      card.innerHTML = `
        <div style="text-align:center;padding:20px">
          <div style="font-size:64px">${bpIcon(pass ? 'badge' : 'heart')}</div>
          <h2 style="margin:10px 0">${score} / ${QUIZ.length} 分</h2>
          <p style="color:var(--bp-muted)">${pass ? '太棒了！你拿到「規則大師」徽章，可以上場比賽了！' : '再複習一下教材，你一定可以的！（答對 7 題以上拿徽章）'}</p>
          <button class="btn gold" id="quizAgain">再玩一次</button>
        </div>`;
      card.querySelector('#quizAgain').addEventListener('click', start);
    };
    start();
  },

  badges() { Learn.renderBadges(); },
  renderBadges() {
    const grid = document.getElementById('badgeGrid');
    if (!grid) return;
    const b = Store.get('bp_badges', {});
    const doneCount = Learn.doneLessons().length;
    const list = [
      { key: 'reader', icon: 'learn', name: '閱讀新星', earned: doneCount >= 1 },
      { key: 'scholar', icon: 'rules', name: '規則學者', earned: doneCount >= LESSONS.length },
      { key: 'quiz', icon: 'badge', name: '規則大師', earned: !!b.quiz },
      { key: 'ready', icon: 'battle', name: '參賽資格', earned: !!b.quiz },
    ];
    grid.innerHTML = list.map(x => `
      <div class="badge ${x.earned ? 'earned' : ''}">
        <div class="ring">${bpIcon(x.icon)}</div>
        <small>${x.name}</small>
      </div>`).join('');
  },

  /* ---------- 規則速查 / 狀態 ---------- */
  rules() {
    const qr = document.getElementById('quickRules');
    qr.innerHTML = QUICK_RULES.map(r => `
      <div class="weak-row" style="display:block">
        <b style="color:var(--bp-gold-2)">Q：${esc(r.q)}</b><br>
        <span style="color:var(--bp-text)">A：${esc(r.a)}</span>
      </div>`).join('');
    const sl = document.getElementById('statusList');
    sl.innerHTML = STATUS.map(s => `
      <div class="penalty-tier t2" style="border-color:var(--bp-primary)">
        <h4>${bpIcon(s.icon || 'status')}${esc(s.name)}</h4>
        <p>${esc(s.rule)}</p>
        <p style="color:var(--bp-green)">✓ 解除：${esc(s.clear)}</p>
      </div>`).join('');
  },

  /* ---------- 傷害計算機 ---------- */
  calc() {
    const base = document.getElementById('baseDmg');
    const sel = document.getElementById('weakSel');
    const extra = document.getElementById('extraDmg');
    const out = document.getElementById('dmgOut');
    const formula = document.getElementById('dmgFormula');
    const compute = () => {
      let b = +base.value || 0;
      const ex = +extra.value || 0;
      let total = b, parts = [`${b}`];
      if (sel.value === 'weak') { total = b * 2; parts = [`${b} ×2（弱點）`]; }
      else if (sel.value === 'resist') { total = b - 30; parts = [`${b} −30（抵抗）`]; }
      if (ex) { total += ex; parts.push(`${ex >= 0 ? '+' : ''}${ex}`); }
      if (total < 0) total = 0;
      out.textContent = total;
      formula.textContent = parts.join(' ') + ` = ${total} 傷害`;
    };
    [base, sel, extra].forEach(e => e.addEventListener('input', compute));
    compute();
  },

  /* ---------- 計時器 ---------- */
  timer() {
    const disp = document.getElementById('timerDisp');
    let total = 600, remain = 600, tick = null;
    const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;
    const paint = () => {
      disp.textContent = fmt(remain);
      disp.classList.toggle('warn', remain <= 60);
    };
    const stop = () => { if (tick) { clearInterval(tick); tick = null; } };
    document.querySelectorAll('[data-min]').forEach(b =>
      b.addEventListener('click', () => { stop(); total = remain = +b.dataset.min * 60; paint(); }));
    document.getElementById('timerStart').addEventListener('click', () => {
      if (tick) return;
      tick = setInterval(() => {
        if (remain <= 0) { stop(); disp.textContent = '時間到！'; disp.classList.add('warn'); return; }
        remain--; paint();
      }, 1000);
    });
    document.getElementById('timerPause').addEventListener('click', stop);
    document.getElementById('timerReset').addEventListener('click', () => { stop(); remain = total; paint(); });
    paint();
  },
};
