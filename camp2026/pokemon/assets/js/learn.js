/* ============================================================
   learn.js — 平板教室用圖解教材
   ============================================================ */

const Learn = {
  currentLesson: null,
  currentSlide: 0,
  fitRun: 0,

  init() {
    Learn.bindTabs();
    Learn.hub();
    Learn.types();
    Learn.quiz();
    Learn.rules();
    Learn.calc();
    Learn.timer();
    window.addEventListener('resize', () => Learn.fitVisual());
  },

  doneLessons() { return Store.get('bp_lessons_done', []); },
  markDone(num) {
    const done = Learn.doneLessons();
    if (!done.includes(num)) Store.set('bp_lessons_done', done.concat(num));
    Learn.renderBadges();
  },

  bindTabs() {
    const show = (name) => {
      document.querySelectorAll('[data-pane]').forEach(p => { p.hidden = p.dataset.pane !== name; });
      document.querySelectorAll('#tabbar a').forEach(a => a.classList.toggle('active', a.getAttribute('href') === `#${name}`));
      if (name !== 'lessons') {
        document.getElementById('lessonHub').style.display = '';
        document.getElementById('lessonView').style.display = 'none';
      }
    };
    document.querySelectorAll('#tabbar a').forEach(a => a.addEventListener('click', e => {
      e.preventDefault();
      const name = a.getAttribute('href').slice(1);
      history.replaceState(null, '', `#${name}`);
      show(name);
    }));
    const first = location.hash.slice(1);
    show(['lessons', 'types', 'quiz', 'rules', 'calc', 'timer'].includes(first) ? first : 'lessons');
  },

  hub() {
    const box = document.getElementById('lessonHub');
    const done = Learn.doneLessons();
    box.innerHTML = `
      <section class="lesson-hub-head">
        <div><span class="eyebrow">11 個教學單元</span><h2>一畫面只教一件事</h2><p>每章 3 張教學投影片；卡片、能量與桌面位置都直接畫給孩子看。</p></div>
        <div class="lesson-progress"><b>${done.length}<small>/ ${LESSONS.length}</small></b><span>已完成</span></div>
      </section>
      <div class="lesson-grid">${LESSONS.map(l => `
        <button class="lesson-card ${done.includes(l.num) ? 'done' : ''}" data-lesson="${l.num}">
          <span class="lesson-card-head">
            <span class="lesson-index">${String(l.num).padStart(2, '0')}</span>
            <span class="lesson-state">${done.includes(l.num) ? '已完成' : '開始'}</span>
          </span>
          <span class="lesson-card-copy">
            <span class="lesson-card-title-row"><span class="lesson-icon">${bpIcon(l.icon)}</span><span class="lesson-title">${esc(l.title)}</span></span>
            <span class="lesson-story">${esc(l.story)}</span>
            <span class="lesson-meta">3 張互動圖解</span>
          </span>
          <span class="lesson-illustration"><img src="../assets/img/lesson-chibis/${esc(l.hubArt)}" alt="${esc(l.hubAlt)}" loading="lazy" decoding="async"></span>
        </button>`).join('')}</div>`;
    box.querySelectorAll('[data-lesson]').forEach(b => b.addEventListener('click', () => Learn.openLesson(+b.dataset.lesson)));
  },

  openLesson(num) {
    const lesson = LESSONS.find(l => l.num === num);
    if (!lesson) return;
    Learn.currentLesson = lesson;
    Learn.currentSlide = 0;
    document.body.classList.add('lesson-open');
    document.getElementById('lessonHub').style.display = 'none';
    document.getElementById('lessonView').style.display = '';
    Learn.renderLesson();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  renderLesson() {
    const lesson = Learn.currentLesson;
    const slide = lesson.slides[Learn.currentSlide];
    const view = document.getElementById('lessonView');
    const last = Learn.currentSlide === lesson.slides.length - 1;
    view.innerHTML = `
      <section class="lesson-deck">
        <header class="lesson-deck-head">
          <button class="icon-btn" id="lessonBack" aria-label="回到章節列表" title="回到章節列表">←</button>
          <div><span>第 ${lesson.num} 章</span><h2>${esc(lesson.title)}</h2></div>
          <div class="slide-count">${Learn.currentSlide + 1} / ${lesson.slides.length}</div>
        </header>
        <div class="lesson-slide">
          <div class="lesson-slide-copy">
            <span class="eyebrow">課堂圖解 ${Learn.currentSlide + 1}</span>
            <h3>${esc(slide.title)}</h3>
            <p>${esc(slide.lead)}</p>
          </div>
          <div class="lesson-visual" data-visual="${esc(slide.visual)}">${Learn.visual(slide.visual)}</div>
          <div class="lesson-takeaways">${slide.points.map((p, i) => `<div><b>${i + 1}</b><span>${esc(p)}</span></div>`).join('')}</div>
        </div>
        <footer class="lesson-deck-nav">
          <button class="btn ghost" id="slidePrev" ${Learn.currentSlide === 0 ? 'disabled' : ''}>← 上一張</button>
          <div class="slide-dots">${lesson.slides.map((_, i) => `<button data-slide="${i}" class="${i === Learn.currentSlide ? 'on' : ''}" aria-label="第 ${i + 1} 張"></button>`).join('')}</div>
          <button class="btn gold" id="slideNext">${last ? '完成本章' : '下一張 →'}</button>
        </footer>
      </section>`;

    document.getElementById('lessonBack').addEventListener('click', () => Learn.closeLesson());
    document.getElementById('slidePrev').addEventListener('click', () => {
      if (Learn.currentSlide > 0) { Learn.currentSlide--; Learn.renderLesson(); }
    });
    document.getElementById('slideNext').addEventListener('click', () => {
      if (last) { Learn.markDone(lesson.num); Learn.closeLesson(); }
      else { Learn.currentSlide++; Learn.renderLesson(); }
    });
    view.querySelectorAll('[data-slide]').forEach(b => b.addEventListener('click', () => {
      Learn.currentSlide = +b.dataset.slide;
      Learn.renderLesson();
    }));
    Learn.bindCardZoom(view);
    Learn.fitVisual();
  },

  bindCardZoom(scope) {
    scope.querySelectorAll('.tcg-card').forEach(card => {
      if (card.dataset.zoomBound === '1') return;
      card.dataset.zoomBound = '1';
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-label', `${card.innerText.trim().split('\n')[0] || '卡牌'}，放大查看`);
      card.title = '放大查看卡牌';
      const open = e => {
        if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
        e.preventDefault();
        Learn.openCardZoom(card);
      };
      card.addEventListener('click', open);
      card.addEventListener('keydown', open);
    });
  },

  openCardZoom(card) {
    document.querySelector('.card-zoom')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'card-zoom';
    const clone = card.cloneNode(true);
    clone.classList.remove('compact');
    clone.removeAttribute('role');
    clone.removeAttribute('tabindex');
    clone.removeAttribute('title');
    overlay.innerHTML = `<div class="card-zoom-panel"><button class="card-zoom-close" aria-label="關閉放大卡牌">${bpIcon('close')}</button></div>`;
    overlay.querySelector('.card-zoom-panel').appendChild(clone);
    const close = () => overlay.remove();
    overlay.querySelector('.card-zoom-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.body.appendChild(overlay);
    overlay.querySelector('.card-zoom-close').focus();
    const onKey = e => { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  },

  fitVisual() {
    const visual = document.querySelector('#lessonView .lesson-visual');
    const child = visual?.firstElementChild;
    if (!visual || !child) return;
    const run = ++Learn.fitRun;
    const nativeLayout = new Set(['opening-hand', 'mulligan']);
    if (nativeLayout.has(visual.dataset.visual)) {
      visual.classList.remove('is-fitted');
      visual.style.removeProperty('--fit-scale');
      return;
    }
    const scrollOnPhone = new Set(['card-kinds', 'evolution-line', 'strategy-trainers', 'status-sideways', 'status-tokens', 'win-prizes', 'mistake-energy', 'mistake-supporter']);
    if (matchMedia('(max-width: 700px)').matches && scrollOnPhone.has(visual.dataset.visual)) {
      visual.classList.remove('is-fitted');
      visual.style.removeProperty('--fit-scale');
      return;
    }
    const fit = () => requestAnimationFrame(() => {
      if (run !== Learn.fitRun || !visual.isConnected || visual.firstElementChild !== child) return;
      const cs = getComputedStyle(visual);
      const innerWidth = visual.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      const innerHeight = visual.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
      const width = Math.max(child.scrollWidth, child.offsetWidth);
      const height = Math.max(child.scrollHeight, child.offsetHeight);
      const scale = Math.min(1, (innerWidth - 6) / width, (innerHeight - 6) / height);
      if (scale < .985) {
        visual.style.setProperty('--fit-scale', Math.max(.42, scale).toFixed(3));
        visual.classList.add('is-fitted');
      } else {
        visual.classList.remove('is-fitted');
        visual.style.removeProperty('--fit-scale');
      }
    });
    const images = [...visual.querySelectorAll('img')];
    const ready = images.length
      ? Promise.all(images.map(img => img.decode?.().catch(() => {}) || Promise.resolve()))
      : Promise.resolve();
    fit();
    ready.then(fit);
    document.fonts?.ready.then(fit);
    [120, 360, 700].forEach(delay => window.setTimeout(fit, delay));
  },

  closeLesson() {
    document.body.classList.remove('lesson-open');
    document.getElementById('lessonView').style.display = 'none';
    document.getElementById('lessonHub').style.display = '';
    Learn.hub();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  visual(type) {
    const p = (key, stage, cap = '') => CardUI.pokemon(key, stage, cap);
    const e = (typeName, cap = '') => CardUI.energy(typeName, cap);
    const t = (kind, compact = false) => CardUI.trainer(kind, compact);
    const arrow = (label = '') => `<div class="scene-arrow"><i></i>${label ? `<span>${esc(label)}</span>` : ''}</div>`;
    const action = (icon, title, sub) => `<div class="action-tile">${bpIcon(icon)}<b>${esc(title)}</b><small>${esc(sub)}</small></div>`;
    const actionCard = (visual, title, sub) => `<article class="action-card"><div class="action-card-visual">${visual}</div><div><b>${esc(title)}</b><small>${esc(sub)}</small></div></article>`;
    const token = (cls, name, detail) => `<div class="status-figure ${esc(cls)}"><div class="status-card">${p('aqiu', 0)}</div><span class="status-mark"></span><b>${esc(name)}</b><small>${esc(detail)}</small></div>`;

    const scenes = {
      'card-kinds': () => `<div class="scene-three scene-card-kinds">${p('xiaobu', 0, '寶可夢：上場對戰')}${e('lightning', '能量：支付招式')}${t('supporter', true)}${CardUI.pokemonEx('xiaobu', '特殊卡：讀 ex 規則')}</div>`,
      'card-overview': () => `<div class="card-map">${p('xiaobu', 1)}<div class="map-callouts"><span><b>上方</b>名稱 · HP · 屬性 · 階段</span><span><b>中間</b>角色圖 · 特性 · 招式</span><span><b>底部</b>弱點 · 抵抗 · 撤退</span></div></div>`,
      'battle-goal': () => `<div class="battle-scene"><div>${p('xiaobu', 1, '攻擊方')}${CardUI.energyCost(['lightning', 'colorless'])}</div>${arrow('使用招式 40')}<div class="target-hit">${p('keke', 0, '受到 40 傷害')}<span class="damage-burst">40</span></div></div>`,
      anatomy: () => `<div class="anatomy-scene"><div class="anatomy-card-wrap">${p('xiaobu', 1)}${['名稱', 'HP', '屬性', '階段', '招式', '底部'].map((x, i) => `<span class="anatomy-pin pin-${i + 1}">${i + 1}</span>`).join('')}</div><ol>${['卡名：這張卡是誰', 'HP：可承受多少傷害', '屬性：能量與弱點判讀', '階段：基礎、1 階或 2 階', '招式：需求、名稱、傷害、效果', '底部：弱點、抵抗力、撤退'].map((x, i) => `<li><b>${i + 1}</b>${esc(x)}</li>`).join('')}</ol></div>`,
      'attack-line': () => `<div class="attack-read-scene">${p('xiaobu', 1)}<div class="attack-zoom"><span class="zoom-label">招式區放大</span><div>${CardUI.energyCost(['lightning', 'colorless'])}<b>星光電擊</b><strong>40</strong></div><p>左邊先確認需求，右邊再看傷害；下方效果文字也要完整處理。</p></div></div>`,
      'bottom-line': () => `<div class="bottom-read-scene">${p('lala', 1)}<div class="bottom-zoom"><div><span>弱點</span><b>依卡面 ×2</b></div><div><span>抵抗力</span><b>依卡面減傷</b></div><div><span>撤退</span><b>${CardUI.energyCost(['colorless', 'colorless'])}</b></div><em>每張卡都可能不同，請讀正在被攻擊的那張卡。</em></div></div>`,
      playmat: () => Learn.playmat(`${p('xiaobu', 0, '戰鬥區')}`, `${p('lala', 0, '備戰 1')}${p('aqiu', 0, '備戰 2')}`),
      zones: () => `<div class="zone-scene">${CardUI.prize(6)}${CardUI.back('牌庫')}<div class="discard-figure">${t('item', true)}<b>棄牌區</b></div><div class="zone-key"><span>背面朝上</span><span>彼此分開</span><span>位置固定</span></div></div>`,
      attached: () => `<div class="attach-scene">
        <section class="attach-demo">
          <span class="scene-label">同一隻寶可夢</span>
          <div class="attach-stack">
            <div class="attach-main">${p('xiaobu', 1, '場上的寶可夢')}</div>
            <div class="attach-card">${e('lightning', '附著的能量')}</div>
            <div class="attach-card">${t('tool', true)}<b>寶可夢道具</b></div>
          </div>
        </section>
        <section class="attach-copy">
          <span class="scene-label">桌面擺法</span>
          <h4>卡片跟著同一隻寶可夢</h4>
          <div><b>1</b><span>能量卡放在寶可夢下方，露出屬性與張數。</span></div>
          <div><b>2</b><span>寶可夢道具也放在下方，露出卡名與效果。</span></div>
          <div><b>3</b><span>進化時一起保留；離場時依卡片規則處理。</span></div>
        </section>
      </div>`,
      'opening-hand': () => `<div class="opening-scene">
        <section class="opening-hand-panel">
          <span class="scene-label">起手牌 7 張</span>
          <div class="hand-fan">${CardUI.back()}${CardUI.back()}${p('xingxing', 0)}${e('grass')}${t('item', true)}${CardUI.back()}${CardUI.back()}</div>
          <b class="scene-note">先找有「基礎」標記的寶可夢</b>
        </section>
        ${arrow('找到基礎')}
        <section class="chosen-basic"><span class="scene-label">選出 1 張</span>${p('xingxing', 0, '放到戰鬥區')}</section>
      </div>`,
      mulligan: () => `<div class="mulligan-scene">
        <section class="bad-hand">
          <span class="scene-label">沒有基礎寶可夢</span>
          <div class="bad-hand-row">${e('water')}${t('item', true)}${t('supporter', true)}</div>
          <b class="scene-note">公開手牌給對手確認</b>
        </section>
        ${arrow('洗回牌庫，重抽 7 張')}
        <section class="new-hand"><span class="scene-label">重抽成功</span>${p('lala', 0, '找到基礎')}<b>可以開始擺場</b></section>
      </div>`,
      'setup-ready': () => `<div class="setup-scene"><div>${Learn.playmat(p('xingxing', 0), p('lala', 0))}</div><div class="setup-checks"><span>抽 7 張</span><span>放基礎寶可夢</span><span>蓋 6 張獎賞卡</span><b>一起翻開</b></div></div>`,
      'draw-step': () => `<div class="draw-scene">${CardUI.back('牌庫頂')}${arrow('抽 1 張')}<div class="hand-slot">${t('item', true)}<b>加入手牌</b></div><span class="must-do">回合開始必做</span></div>`,
      'free-actions': () => `<div class="action-showcase">${actionCard(p('lala', 0), '放基礎寶可夢', '放到備戰區')}${actionCard(p('xingxing', 1), '進化', '疊上正確進化卡')}${actionCard(e('lightning'), '附能量', '通常每回合 1 張')}${actionCard(t('supporter', true), '訓練家卡', '照文字執行效果')}${actionCard(p('keke', 0), '撤退', '支付卡面撤退費用')}${actionCard(p('aqiu', 1), '使用特性', '依卡片文字與時機')}</div>`,
      'turn-end': () => `<div class="turn-timeline"><div><b>1</b><span>抽 1 張</span>${CardUI.back()}</div>${arrow()}<div><b>2</b><span>自由行動</span>${e('lightning')}</div>${arrow()}<div class="final-step"><b>3</b><span>使用招式</span>${p('xiaobu', 1)}</div><em>攻擊後回合結束</em></div>`,
      'energy-ready': () => `<div class="energy-lesson-scene"><div class="ready-pokemon">${p('xiaobu', 1, '招式需要 2 個能量')}<div class="attached-energy-pair">${e('lightning', '第 1 張')}${e('lightning', '第 2 張')}</div></div><div class="energy-legend"><b>${CardUI.energyCost(['lightning', 'colorless'])} 星光電擊 40</b><span>雷需求由雷能量支付</span><span>無色需求也可由雷能量支付</span></div></div>`,
      'attack-ready': () => `<div class="attack-ready-scene"><div class="red-frame"><div>${p('xiaobu', 1)}</div><div class="attached-energy-pair">${e('lightning')}${e('lightning')}</div></div><div class="red-rule"><span>能量已符合</span><b>${CardUI.energyCost(['lightning', 'colorless'])} 星光電擊 40</b><strong>可以宣告攻擊</strong></div></div>`,
      'damage-math': () => `<div class="damage-scene"><div>${p('xiaobu', 1, '招式傷害 40')}</div>${arrow('讀對手卡面')}<div class="weakness-target">${p('lala', 0, '底部寫：雷 ×2')}<div class="math-box"><span>40</span><i>× 2</i><b>80</b></div></div></div>`,
      'evolution-line': () => `<div class="evolution-scene">${p('aqiu', 0)}${arrow('疊上 1 階')}${p('aqiu', 1)}${arrow('疊上 2 階')}${p('aqiu', 2)}</div>`,
      'evolution-wait': () => `<div class="wait-scene"><div class="just-played">${p('xingxing', 0)}<span>本回合剛上場</span></div><div class="stop-sign">現在不能進化</div>${arrow('等到下個自己的回合')}<div>${p('xingxing', 1)}<b>再進化</b></div></div>`,
      'evolution-result': () => `<div class="evolution-result-scene">
        <div class="evolution-result-row">
          <article class="evolution-result-card">
            <div class="evolution-result-art">${p('aqiu', 0)}<span class="damage-chip">30</span><span class="status-chip">中毒</span></div>
            <span class="result-stage">進化前</span>
          </article>
          ${arrow('進化')}
          <article class="evolution-result-card">
            <div class="evolution-result-art">${p('aqiu', 1)}<span class="damage-chip">30</span><span class="status-cleared">狀態解除</span></div>
            <span class="result-stage">進化後</span>
          </article>
        </div>
        <div class="evolution-result-summary">
          <span><b>30</b> 傷害保留</span>
          <span>能量與道具保留</span>
          <strong>特殊狀態解除</strong>
        </div>
      </div>`,
      'status-sideways': () => `<div class="status-grid">${token('sleep', '睡眠', '橫放；檢查時擲幣')}${token('paralyze', '麻痺', '橫放；經過下個自己回合解除')}</div>`,
      'status-tokens': () => `<div class="status-grid">${token('poison', '中毒', '每次檢查 10 傷害')}${token('burn', '灼傷', '每次檢查 20 傷害，再擲幣')}</div>`,
      'status-confused': () => `<div class="confused-scene"><div class="upside-down">${p('aqiu', 0)}</div><div class="coin"><span>正面</span><b>正常攻擊</b></div><div class="coin bad"><span>反面</span><b>攻擊失敗 + 自傷 30</b></div></div>`,
      'win-prizes': () => `<div class="prize-rule-scene"><div class="prize-case">${p('keke', 0, '一般寶可夢')}<div class="prize-count one">${CardUI.back('獎賞')}<b>對手拿 1 張</b></div></div><div class="prize-case special">${CardUI.pokemonEx('xiaobu')}<div class="prize-count two">${CardUI.back('獎賞')}${CardUI.back('獎賞')}<b>對手拿 2 張</b></div></div></div>`,
      'win-empty-field': () => `<div class="empty-field-scene"><div class="ko-card">${p('keke', 0)}<span>昏厥</span></div>${arrow()}<div class="empty-bench"><b>戰鬥區：空</b><b>備戰區：空</b><strong>沒有寶可夢可出戰 → 敗北</strong></div></div>`,
      'win-deckout': () => `<div class="deckout-scene"><div class="empty-deck">${CardUI.back('牌庫')}<span>0 張</span></div>${arrow('回合開始要抽 1 張')}<div class="cannot-draw">抽不到牌<strong>敗北</strong></div></div>`,
      'strategy-main': () => `<div class="strategy-scene">
        <article class="strategy-case good-plan">
          <div class="strategy-case-visual">
            <div class="strategy-unit strategy-unit-main">${p('xiaobu', 1)}<b>1 階 · 星布</b></div>
            <div class="strategy-energy-group">${e('lightning')}${e('lightning')}<b>2 張雷能量</b></div>
          </div>
          <div class="strategy-case-copy"><span>集中培養</span><strong>下回合可以出招</strong></div>
        </article>
        <article class="strategy-case bad-plan">
          <div class="strategy-case-visual strategy-split">
            <div class="strategy-unit">${p('lala', 0)}${e('water')}<b>小拉拉 + 1 水</b></div>
            <div class="strategy-unit">${p('keke', 0)}${e('fire')}<b>小克克 + 1 火</b></div>
          </div>
          <div class="strategy-case-copy"><span>平均分散</span><strong>兩隻都還不能出招</strong></div>
        </article>
      </div>`,
      'strategy-bench': () => Learn.playmat(`${p('xiaobu', 1, '主力')}`, `${p('lala', 1, '下一棒')}${p('aqiu', 0, '支援')}`),
      'strategy-trainers': () => `<div class="trainer-showcase">${t('item')}${t('supporter')}${t('tool')}${t('stadium')}</div>`,
      'mistake-energy': () => `<div class="mistake-scene"><div class="wrong-case">${p('xiaobu', 0)}${e('lightning')}${e('lightning')}<b>同回合手動附 2 張</b></div><span class="fix-arrow">修正</span><div class="right-case">${p('xiaobu', 0)}${e('lightning')}<b>只附 1 張</b></div></div>`,
      'mistake-supporter': () => `<div class="mistake-scene"><div class="wrong-case">${t('supporter', true)}${t('supporter', true)}<b>同回合 2 張支援者</b></div><span class="fix-arrow">修正</span><div class="right-case">${t('supporter', true)}<b>選最需要的 1 張</b></div></div>`,
      'judge-check': () => `<div class="judge-scene">
        <figure class="judge-mascot">
          <img src="../assets/img/trainer-cards/aqiu-research-art.png" alt="裁判阿球保持桌面並向孩子說明規則">
          <figcaption><b>裁判阿球</b><span>先保留現場，再依序查證</span></figcaption>
        </figure>
        <div class="judge-steps">${action('pause', '1 停手', '保持桌面')}${action('listen', '2 聽雙方', '各說一次')}${action('rules', '3 讀卡查規則', '不憑印象')}${action('judge', '4 裁定', '說明並記錄')}</div>
      </div>`,
    };
    return (scenes[type] || scenes['card-kinds'])();
  },

  playmat(active, bench) {
    return `<div class="teach-playmat">
      <div class="playmat-prize">${CardUI.prize(6)}</div>
      <div class="playmat-active"><span>戰鬥區</span>${active}</div>
      <div class="playmat-deck">${CardUI.back('牌庫')}</div>
      <div class="playmat-bench"><span>備戰區 · 最多 5 隻</span><div>${bench}</div></div>
      <div class="playmat-discard"><span>棄牌區</span></div>
    </div>`;
  },

  types() {
    const grid = document.getElementById('typeGrid');
    if (grid) grid.innerHTML = TYPES.map(t => `<div class="type-chip"><span class="type-dot type-${t.key}" style="background:${t.color}"></span><span><b>${esc(t.name)}屬性</b><small>辨識能量與卡面符號</small></span></div>`).join('');
    const list = document.getElementById('weakList');
    if (list) list.innerHTML = `
      <section class="type-reading-demo">
        <div>${CardUI.pokemon('lala', 0, '被攻擊方')}</div>
        <div class="type-rule-copy">
          <span class="eyebrow">正確判讀方式</span>
          <h3>不要背固定屬性表，直接讀被攻擊卡的底部</h3>
          <div class="type-rule-row"><b>1</b><span>確認攻擊方招式的屬性與傷害</span></div>
          <div class="type-rule-row"><b>2</b><span>讀被攻擊寶可夢的弱點倍率與抵抗數字</span></div>
          <div class="type-rule-row"><b>3</b><span>再依卡面與招式效果完成計算</span></div>
        </div>
      </section>`;
  },

  quiz() {
    const card = document.getElementById('quizCard');
    if (!card || typeof QUIZ === 'undefined') return;
    let idx = 0, score = 0, locked = false;
    const show = () => {
      if (idx >= QUIZ.length) return finish();
      const q = QUIZ[idx];
      card.innerHTML = `<div class="quiz-progress"><i style="width:${(idx / QUIZ.length) * 100}%"></i></div><span class="eyebrow">第 ${idx + 1} / ${QUIZ.length} 題</span><p class="quiz-q">${esc(q.q)}</p><div class="quiz-options">${q.options.map((o, i) => `<button class="quiz-opt" data-i="${i}">${esc(o)}</button>`).join('')}</div><p id="quizWhy" class="quiz-why"></p>`;
      locked = false;
      card.querySelectorAll('.quiz-opt').forEach(b => b.addEventListener('click', () => pick(+b.dataset.i)));
    };
    const pick = i => {
      if (locked) return;
      locked = true;
      const q = QUIZ[idx], opts = card.querySelectorAll('.quiz-opt');
      opts[q.answer].classList.add('correct');
      if (i === q.answer) score++; else opts[i].classList.add('wrong');
      document.getElementById('quizWhy').textContent = q.why;
      const next = el('button', 'btn gold quiz-next', idx === QUIZ.length - 1 ? '看結果' : '下一題 →');
      next.addEventListener('click', () => { idx++; show(); });
      card.appendChild(next);
    };
    const finish = () => {
      const pass = score >= Math.ceil(QUIZ.length * .7);
      if (pass) { const b = Store.get('bp_badges', {}); b.quiz = true; Store.set('bp_badges', b); }
      card.innerHTML = `<div class="quiz-finish">${bpIcon(pass ? 'badge' : 'learn')}<span class="eyebrow">測驗完成</span><h2>${score} / ${QUIZ.length}</h2><p>${pass ? '你已經抓到關鍵規則，可以進入實桌練習。' : '回教材重看不熟的章節，再挑戰一次。'}</p><button class="btn gold" id="quizAgain">再玩一次</button></div>`;
      document.getElementById('quizAgain').addEventListener('click', () => { idx = 0; score = 0; show(); });
      Learn.renderBadges();
    };
    show();
  },

  renderBadges() {
    const grid = document.getElementById('badgeGrid');
    if (!grid) return;
    const b = Store.get('bp_badges', {}), done = Learn.doneLessons().length;
    const badges = [
      ['learn', '第一步', done >= 1], ['rules', '規則完成', done >= LESSONS.length], ['badge', '測驗通過', !!b.quiz], ['battle', '準備上桌', !!b.quiz],
    ];
    grid.innerHTML = badges.map(x => `<div class="badge ${x[2] ? 'earned' : ''}"><div class="ring">${bpIcon(x[0])}</div><small>${esc(x[1])}</small></div>`).join('');
  },

  rules() {
    const qr = document.getElementById('quickRules');
    if (qr) qr.innerHTML = `<div class="quick-rule-grid">${QUICK_RULES.map((r, i) => `<article><b>${String(i + 1).padStart(2, '0')}</b><div class="quick-rule-visual">${Learn.ruleVisual(r.visual)}</div><div><h3>${esc(r.q)}</h3><p>${esc(r.a)}</p></div></article>`).join('')}</div>`;
    const cards = document.getElementById('cardRuleShowcase');
    if (cards) cards.innerHTML = `<section class="official-card-guide">
      <div class="official-card-head"><span class="eyebrow">官方規則架構</span><h3>四大類卡，一眼看懂使用方式</h3><p>不只認圖，還要知道卡牌用完後放哪裡、一回合能用幾張。</p></div>
      <div class="official-card-row">
        <article>${CardUI.pokemon('xiaobu', 0)}<div><b>寶可夢卡</b><span>放到戰鬥區或備戰區，使用 HP、特性與招式對戰。</span></div></article>
        <article>${CardUI.energy('lightning')}<div><b>基本能量</b><span>通常每回合從手牌附 1 張，用來支付招式與撤退。</span></div></article>
        <article>${CardUI.specialEnergy('colorless')}<div><b>特殊能量</b><span>也提供能量，但還有額外文字，必須逐張讀完。</span></div></article>
        <article>${CardUI.pokemonEx('xiaobu')}<div><b>特殊寶可夢</b><span>名稱含 ex 且有 ex 規則；昏厥時對手拿 2 張獎賞卡。</span></div></article>
      </div>
      <h3 class="trainer-guide-title">訓練家卡四種用法</h3>
      <div class="official-trainer-row">${['item','tool','supporter','stadium'].map(k => `<article>${CardUI.trainer(k)}<div><b>${esc(BP_TRAINER_CARDS[k].kind)}</b><span>${esc(BP_TRAINER_CARDS[k].timing)}</span></div></article>`).join('')}</div>
      <h3 class="trainer-guide-title">特殊規則要看卡面，不靠猜</h3>
      <div class="official-special-rules">
        <article><div class="special-rule-visual">${CardUI.pokemonEx('xiaobu')}<strong class="rule-prize two">2 張</strong></div><div><b>寶可夢 ex</b><span>名稱含 ex；這隻寶可夢昏厥時，對手拿取 2 張獎賞卡。</span></div></article>
        <article><div class="special-rule-visual mega">${CardUI.pokemonEx('keke')}<em>MEGA</em><strong class="rule-prize three">3 張</strong></div><div><b>超級進化寶可夢 ex</b><span>依卡面專屬規則處理；昏厥時，對手拿取 3 張獎賞卡。</span></div></article>
        <article><div class="special-rule-visual labels">${CardUI.pokemon('lala', 1)}<i>古代</i><i>未來</i></div><div><b>古代／未來標記</b><span>標記本身沒有額外效果；只有卡面文字或其他卡指定時才產生作用。</span></div></article>
        <article><div class="special-rule-visual lineage">${CardUI.pokemon('xingxing', 0)}<span class="mini-arrow"></span>${CardUI.pokemon('xingxing', 1)}</div><div><b>訓練家的寶可夢</b><span>進化時要核對完整來源名稱；不同訓練家的同種寶可夢不能混著進化。</span></div></article>
      </div>
    </section>`;
    const sl = document.getElementById('statusList');
    if (sl) sl.innerHTML = `<div class="status-rule-grid">${STATUS.map(s => `<article class="status-rule-card"><div class="status-rule-visual ${esc(s.icon)}">${CardUI.pokemon('aqiu', 0)}<span></span></div><div><span class="eyebrow">${esc(s.pose)}</span><h3>${esc(s.name)}</h3><p>${esc(s.rule)}</p><small>解除：${esc(s.clear)}</small></div></article>`).join('')}</div>`;
    Learn.bindCardZoom(document.querySelector('[data-pane="rules"]'));
  },

  ruleVisual(type) {
    const visuals = {
      deck: CardUI.back('牌庫頂'),
      energy: CardUI.energy('lightning'),
      supporter: CardUI.trainer('supporter', true),
      item: CardUI.trainer('item', true),
      evolution: CardUI.pokemon('xingxing', 1),
      bench: CardUI.pokemon('lala', 0),
      weakness: CardUI.pokemon('lala', 0),
      retreat: `${CardUI.pokemon('xiaobu', 0)}${CardUI.energy('lightning')}`,
      ex: CardUI.pokemonEx('xiaobu'),
      prize: CardUI.prize(6),
    };
    return visuals[type] || CardUI.back();
  },

  calc() {
    const base = document.getElementById('baseDmg'), sel = document.getElementById('weakSel'), extra = document.getElementById('extraDmg'), out = document.getElementById('dmgOut'), formula = document.getElementById('dmgFormula');
    if (!base || !sel || !extra || !out || !formula) return;
    const compute = () => {
      const raw = +base.value || 0, add = +extra.value || 0;
      let total = raw, text = `${raw}`;
      if (sel.value === 'weak') { total = raw * 2; text = `${raw} × 2`; }
      if (sel.value === 'resist') { total = raw - 30; text = `${raw} − 30`; }
      total = Math.max(0, total + add);
      out.textContent = total;
      formula.textContent = `${text}${add ? ` ${add > 0 ? '+' : '−'} ${Math.abs(add)}` : ''} = ${total} 傷害`;
    };
    [base, sel, extra].forEach(x => x.addEventListener('input', compute));
    compute();
  },

  timer() {
    const disp = document.getElementById('timerDisp');
    if (!disp) return;
    let total = 600, remain = total, tick = null;
    const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
    const paint = () => { disp.textContent = fmt(remain); disp.classList.toggle('warn', remain <= 60); };
    const stop = () => { clearInterval(tick); tick = null; };
    document.querySelectorAll('[data-min]').forEach(b => b.addEventListener('click', () => { stop(); total = remain = +b.dataset.min * 60; paint(); }));
    document.getElementById('timerStart')?.addEventListener('click', () => { if (tick) return; tick = setInterval(() => { if (remain <= 0) { stop(); disp.textContent = '時間到'; disp.classList.add('warn'); return; } remain--; paint(); }, 1000); });
    document.getElementById('timerPause')?.addEventListener('click', stop);
    document.getElementById('timerReset')?.addEventListener('click', () => { stop(); remain = total; paint(); });
    paint();
  },
};
