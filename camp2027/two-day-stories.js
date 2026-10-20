(() => {
  'use strict';

  const stories = {
    'game-lab': {
      name: 'Game Lab 遊戲設計師養成營',
      frames: [
        { label: '故事與角色', title: '年獸來了，接下來會發生什麼？', text: '先寫下新春故事與腳本，再畫出原創像素角色，把角色的動作連成動畫。', alt: '圓滾滾的學員和老師一起畫功夫英雄與年獸的像素草稿，角色正逐步成形' },
        { label: '遊戲邏輯', title: '讓自己寫的故事，變成可以玩的冒險', text: '用積木程式把腳本轉成動作、事件與過關條件，讓故事隨著操作展開。', alt: '學員在電腦前組合積木程式，老師陪伴測試按鍵與像素角色的移動跳躍' },
        { label: '試玩修改', title: '交換試玩，看看故事和玩法清不清楚', text: '和同伴試玩、討論，找出不順的地方，再調整角色動作和遊戲規則。', alt: '學員交換試玩尚在調整的新春遊戲，討論問題並記下要修改的規則' },
        { label: '說故事分享', title: '這個故事，這款遊戲，都由我來介紹！', text: '親口分享角色、劇情與玩法。每位學員贈送一台遊戲機，由老師協助匯入自己的遊戲，帶回家分享。', alt: '學員開心展示自己完成的功夫英雄與年獸遊戲，老師和夥伴一起鼓掌分享成果' }
      ]
    },
    fragrance: {
      name: '小小生活工藝師｜新春香氛科學營',
      frames: [
        { label: '泡泡裡的驚喜', title: '再等一下，驚喜快出現了！', text: '觀察沐浴球遇水起泡，親手調製、塑形，把一份新年驚喜藏進泡泡裡。', alt: '灰色圓滾滾老師與學員觀察粉紅沐浴球在淺水盆裡起泡，一顆星星小禮物正慢慢露出來' },
        { label: '調香與配色', title: '把「你會喜歡」，做成香氣和色彩', text: '認識材料特性，挑選香氣、搭配蠟砂色彩與春節造型，做出自己的新春香氛蠟燭。', alt: '紅髮圓滾滾老師陪學員選擇香氣，將粉紅、奶油與金黃色蠟砂分層裝進未點燃的玻璃蠟燭杯' },
        { label: '把心意送出去', title: '這是我自己做的，特別送給你', text: '彩繪禮盒、設計標籤，寫下祝福卡，讓打開禮物的每一步都有孩子的巧思。', alt: '學員彩繪花朵禮盒和愛心祝福卡，開心送出裝有沐浴球與香氛蠟燭的親手製作禮物' }
      ]
    },
    aviation: {
      name: '「機」不可失 飛行航空科學營',
      frames: [
        { label: '畫草稿', title: '我想做的這個，也可以飛嗎？', text: '從過年找靈感，畫下自己的想法，一起研究怎麼讓它飛起來。', alt: '圓滾滾的學員從新春圖案找靈感，在紙上比較不同飛機造型與機翼草稿' },
        { label: '動手製作', title: '腦中的點子，慢慢有了形狀', text: '親手裁切、組裝，把零件一個個裝上去，做出自己的飛行器。', alt: '學員和老師在工作桌邊裁切材料、組裝機翼，製作尚未完成的自創飛行器' },
        { label: '調整重心', title: '哪一邊比較重？一起找平衡', text: '馬達要放哪裡？重心怎麼調整？為了讓作品起飛，動手研究飛行原理。', alt: '學員用手指檢查自製飛機的平衡，和老師討論重量位置並調整重心' },
        { label: '試飛改良', title: '看它怎麼飛，修改，再試一次', text: '練習操控、觀察飛行，每次試飛都替下一次調整留下線索。', alt: '學員在戶外試飛自己製作的新春飛機，夥伴觀察飛行路線並一起討論改良' }
      ]
    }
  };
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const smallScreen = window.matchMedia('(max-width:700px)');
  const dwell = 5800;
  const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // Cache the actual decoded picture, so a selected scene never fades to an empty image.
  // Only the visible story's current frame and one next frame are requested.
  const assets = new Map(), backgroundQueue = [];
  let backgroundCount = 0;
  function pump() {
    while (backgroundCount < 2 && backgroundQueue.length) {
      const entry = backgroundQueue.shift();
      if (entry.started) continue;
      backgroundCount++;
      entry.background = true;
      entry.start();
    }
  }
  function loadPicture(camp, index, priority) {
    const base = `assets/${camp}-story-${String(index + 1).padStart(2, '0')}`;
    const assetVersion = camp === 'aviation' && index === 3 ? '?v=foam-aircraft-20261019' : '';
    const key = base + (smallScreen.matches ? '-mobile' : '');
    let entry = assets.get(key);
    if (entry) {
      if (priority === 'high') { entry.image.fetchPriority = 'high'; entry.start(); }
      return entry.promise;
    }
    const picture = document.createElement('picture');
    const image = document.createElement('img');
    image.alt = stories[camp].frames[index].alt;
    image.width = 1024;
    image.height = 1024;
    image.decoding = 'async';
    image.fetchPriority = priority;
    image.draggable = false;
    image.loading = 'eager';
    [['image/avif', '(max-width:700px)', '-mobile.avif'], ['image/avif', '', '.avif'], ['image/webp', '(max-width:700px)', '-mobile.webp']].forEach(([type, media, suffix]) => {
      const source = document.createElement('source');
      source.type = type;
      if (media) source.media = media;
      source.srcset = base + suffix + assetVersion;
      picture.append(source);
    });
    picture.append(image);
    let done, timeout, fallback = false;
    entry = { image, picture, started: false, background: false, settled: false, promise: new Promise(resolve => { done = resolve; }) };
    assets.set(key, entry);
    const finish = loaded => {
      if (entry.settled) return;
      entry.settled = true;
      clearTimeout(timeout);
      image.onload = image.onerror = null;
      if (!loaded) assets.delete(key);
      if (entry.background) backgroundCount--;
      done(loaded ? picture : null);
      pump();
    };
    image.onload = async () => {
      try {
        if (image.decode) await image.decode();
        finish(image.naturalWidth > 0);
      } catch (_) { image.onerror?.(); }
    };
    image.onerror = () => {
      if (fallback) { finish(false); return; }
      fallback = true;
      picture.querySelectorAll('source').forEach(source => source.remove());
      clearTimeout(timeout);
      timeout = setTimeout(() => finish(false), 15000);
      image.src = key + '.webp' + assetVersion;
    };
    entry.start = () => {
      if (entry.started) return;
      entry.started = true;
      timeout = setTimeout(() => finish(false), 15000);
      image.src = base + '.webp' + assetVersion;
    };
    if (priority === 'high') entry.start();
    else { backgroundQueue.push(entry); pump(); }
    return entry.promise;
  }

  const players = [];
  function createPlayer(root) {
    const camp = root.dataset.twoDayStory, story = stories[camp];
    if (!story) return;
    const frameId = camp + '-story-frame';
    root.innerHTML = `<div class="two-day-story-stage" id="${frameId}" aria-busy="false"></div>
      <div class="two-day-story-error" hidden><span>這張插畫暫時無法顯示。</span><button type="button" data-story-retry>重新載入</button></div>
      <div class="two-day-story-caption"><h4>${esc(story.frames[0].title)}</h4><p>${esc(story.frames[0].text)}</p></div>
      <div class="two-day-story-steps" role="group" aria-label="${esc(story.name)}的創作過程">${story.frames.map((frame, index) => `<button type="button" data-story-select="${index}" aria-pressed="${index === 0}" aria-controls="${frameId}">${esc(frame.label)}</button>`).join('')}</div>
      <div class="two-day-story-controls"><div class="two-day-story-arrows"><button type="button" data-story-direction="-1" aria-label="上一個創作場景" aria-controls="${frameId}">←</button><button type="button" data-story-direction="1" aria-label="下一個創作場景" aria-controls="${frameId}">→</button></div><button type="button" class="two-day-story-play" data-story-play aria-pressed="true">暫停故事 <span aria-hidden="true">Ⅱ</span></button></div>
      <span class="two-day-story-announcement" role="status" aria-live="polite" aria-atomic="true"></span>`;
    const stage = root.querySelector('.two-day-story-stage');
    const title = root.querySelector('.two-day-story-caption h4');
    const text = root.querySelector('.two-day-story-caption p');
    const error = root.querySelector('.two-day-story-error');
    const playButton = root.querySelector('[data-story-play]');
    const announcement = root.querySelector('.two-day-story-announcement');
    const steps = [...root.querySelectorAll('[data-story-select]')];
    let near = false, visible = false, manualPaused = false, requested = 0, displayed = -1;
    let revision = 0, loading = false, failed = false, timer = null, deadline = 0, remaining = dwell;
    const active = () => !root.closest('[hidden]');
    const globallyPaused = () => {
      // The page-level control includes an explicit visitor choice; honor it before the OS default.
      const classes = document.body.classList;
      if (classes.contains('motion-paused')) return true;
      if (classes.contains('motion-enabled')) return false;
      return reducedMotion.matches;
    };
    const unobstructed = () => !document.hidden && !document.querySelector('#campDialog[open]');
    const canRun = () => visible && active() && unobstructed() && !globallyPaused() && !manualPaused && !loading && !failed && displayed >= 0;
    function stop(preserve = true) {
      if (timer !== null && preserve) remaining = Math.max(0, deadline - performance.now());
      clearTimeout(timer);
      timer = null;
    }
    function speak(message) { announcement.textContent = message; }
    function warmNext() {
      if (!near || !active() || !unobstructed() || displayed < 0 || globallyPaused() || manualPaused) return;
      loadPicture(camp, (displayed + 1) % story.frames.length, 'low');
    }
    function sync() {
      stop();
      const paused = globallyPaused();
      playButton.disabled = paused;
      playButton.title = paused ? '頁面動畫已關閉，仍可點選場景或使用左右箭頭。' : '';
      const wantsPlayback = !manualPaused && !paused;
      playButton.setAttribute('aria-pressed', String(wantsPlayback));
      playButton.innerHTML = paused ? '動畫已暫停' : manualPaused ? '播放故事 <span aria-hidden="true">▷</span>' : '暫停故事 <span aria-hidden="true">Ⅱ</span>';
      root.classList.toggle('story-is-playing', canRun());
      if (near && active() && unobstructed() && displayed < 0 && !loading && !failed) show(requested);
      if (!canRun()) return;
      deadline = performance.now() + remaining;
      timer = setTimeout(() => {
        timer = null;
        if (canRun()) show((displayed + 1) % story.frames.length);
        else sync();
      }, remaining);
    }
    async function show(index, manual = false) {
      if (manual) manualPaused = true;
      stop(false);
      remaining = dwell;
      requested = (index + story.frames.length) % story.frames.length;
      const mine = ++revision;
      if (!active() || !near || !unobstructed()) { sync(); return; }
      if (displayed === requested && !failed) {
        // A quick next/back can cancel an in-flight frame while keeping the current one.
        loading = false;
        stage.setAttribute('aria-busy', 'false');
        sync();
        return;
      }
      const next = requested;
      failed = false;
      loading = true;
      error.hidden = true;
      stage.setAttribute('aria-busy', 'true');
      sync();
      const picture = await loadPicture(camp, next, 'high');
      if (mine !== revision) return;
      loading = false;
      stage.setAttribute('aria-busy', 'false');
      if (!picture) {
        failed = true;
        error.hidden = false;
        if (manual) speak('插畫暫時無法載入，請按重新載入。');
        sync();
        return;
      }
      const old = [...stage.querySelectorAll('picture')].filter(node => node !== picture);
      picture.className = 'two-day-story-picture';
      if (picture.parentNode !== stage) stage.append(picture);
      // Decode has completed. Only now change the picture, selected label and caption.
      if (globallyPaused() || displayed < 0) {
        picture.classList.add('is-current');
        old.forEach(node => node.remove());
      } else {
        requestAnimationFrame(() => {
          // Re-selecting this same frame must not cancel its pending reveal.
          if (picture.parentNode !== stage || displayed !== next) return;
          picture.classList.add('is-current');
          picture.classList.remove('is-leaving');
          old.forEach(node => { node.classList.remove('is-current'); node.classList.add('is-leaving'); });
          setTimeout(() => old.forEach(node => { if (!node.classList.contains('is-current')) node.remove(); }), 420);
        });
      }
      displayed = next;
      root.dataset.storyFrame = String(next);
      title.textContent = story.frames[next].title;
      text.textContent = story.frames[next].text;
      steps.forEach((button, step) => button.setAttribute('aria-pressed', String(step === next)));
      if (manual) speak(story.frames[next].title + '。' + story.frames[next].text);
      sync();
      warmNext();
    }
    steps.forEach(button => button.addEventListener('click', () => show(Number(button.dataset.storySelect), true)));
    root.querySelectorAll('[data-story-direction]').forEach(button => button.addEventListener('click', () => show(requested + Number(button.dataset.storyDirection), true)));
    root.querySelector('[data-story-retry]').addEventListener('click', () => show(requested, true));
    playButton.addEventListener('click', () => {
      if (globallyPaused()) return;
      manualPaused = !manualPaused;
      speak(manualPaused ? '故事已暫停。' : '從目前場景繼續播放故事。');
      if (!manualPaused && failed) show(requested);
      else { sync(); if (!manualPaused) warmNext(); }
    });
    return {
      root,
      sync,
      setNear(value) { near = value; sync(); },
      setVisible(value) { visible = value; if (value) near = true; sync(); }
    };
  }
  document.querySelectorAll('[data-two-day-story]').forEach(root => {
    const player = createPlayer(root);
    if (player) players.push(player);
  });
  if (!players.length) return;
  const syncAll = () => players.forEach(player => player.sync());
  if ('IntersectionObserver' in window) {
    const byRoot = new Map(players.map(player => [player.root, player]));
    const nearObserver = new IntersectionObserver(entries => entries.forEach(entry => byRoot.get(entry.target)?.setNear(entry.isIntersecting)), { rootMargin: '450px 0px', threshold: 0 });
    const visibilityObserver = new IntersectionObserver(entries => entries.forEach(entry => byRoot.get(entry.target)?.setVisible(entry.isIntersecting)), { threshold: 0.18 });
    players.forEach(player => { nearObserver.observe(player.root); visibilityObserver.observe(player.root); });
  } else {
    // Older browsers still avoid downloading the other, hidden camp's story.
    players.forEach(player => { player.setNear(true); player.setVisible(true); });
  }
  document.addEventListener('visibilitychange', syncAll);
  reducedMotion.addEventListener('change', syncAll);
  const stateObserver = new MutationObserver(syncAll);
  stateObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
  document.querySelectorAll('.two-day-panel').forEach(panel => stateObserver.observe(panel, { attributes: true, attributeFilter: ['hidden'] }));
  const dialog = document.getElementById('campDialog');
  if (dialog) stateObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
  syncAll();
})();
