(() => {
  'use strict';
  const data = window.CAMP_DATA;
  if (!data) return;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ext = 'target="_blank" rel="noopener"';
  const campById = id => data.camps.find(c => c.id === id);
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let motionPaused = reducedMotion.matches;
  let userMotionPaused = false;
  const scenes = Object.fromEntries($$('[data-motion-scene]').map(el => [el.dataset.motionScene, el]));
  const announce = message => { $('#announcer').textContent = message; };

  // Keep the original teacher URLs and the existing teacher-only entry gate.
  $('#teacherLinks').innerHTML = data.teacherLinks.map(link => `<a href="${esc(link.url)}" ${ext}${link.requiresExistingTeacherGate ? ' data-teacher-gate' : ''}>${esc(link.label)}</a>`).join('');
  let teacherUnlocked = false;
  $('[data-teacher-gate]').addEventListener('click', event => {
    event.preventDefault();
    const key = 'bp_teacher_unlocked_v1';
    try { teacherUnlocked = teacherUnlocked || sessionStorage.getItem(key) === '1'; } catch {}
    if (teacherUnlocked) { window.open(event.currentTarget.href, '_blank', 'noopener'); return; }
    const value = (window.prompt('🔒 老師專區需要密碼才能進入') || '').trim().toUpperCase();
    if (value === 'BLOCK') {
      teacherUnlocked = true;
      try { sessionStorage.setItem(key, '1'); } catch {}
      window.open(event.currentTarget.href, '_blank', 'noopener');
    } else if (value) window.alert('❌ 密碼錯誤，請再試一次');
  });
  const navToggle = $('#navToggle');
  const nav = $('#mainNav');
  function closeNav() { nav.classList.remove('is-open'); navToggle.setAttribute('aria-expanded', 'false'); }
  navToggle.addEventListener('click', () => {
    const open = navToggle.getAttribute('aria-expanded') !== 'true';
    navToggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('is-open', open);
  });
  $$('a', nav).forEach(a => a.addEventListener('click', closeNav));
  document.addEventListener('click', event => {
    if (!$('#teacherToolsMenu').contains(event.target)) $('#teacherToolsMenu').open = false;
    if (!event.target.closest('.site-header')) closeNav();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      if (nav.classList.contains('is-open')) { closeNav(); navToggle.focus(); }
      if ($('#teacherToolsMenu').open) { $('#teacherToolsMenu').open = false; $('#teacherToolsMenu summary').focus(); }
    }
  });

  // Stories start automatically when visible; offscreen pauses preserve manual choices.
  const visibleScenes = new Set();
  const readyScenes = new Set();
  const sceneAssetRequests = new Map();
  const imageRequests = new Map();
  const frameRevisions = new Map();
  const singleFrames = { lights: $('#lightsFrame'), drone: $('#droneFrame'), lego: $('#legoFrame') };
  const storyImage = (name, index) => 'assets/' + (name === 'lights' ? 'culture' : name) + '-frame-' + String(index + 1).padStart(2, '0') + '.webp' + (name === 'lights' ? (index === 4 ? '?v=banquet-float-20261013' : '?v=home-lights-20261013') : name === 'lego' || (name === 'drone' && index === 0) ? '?v=creative-journey-20261013' : '?v=scope-restore-20261013');
  const cultureThumbnail = index => 'assets/culture-thumb-' + String(index + 1).padStart(2, '0') + '.webp?v=' + (index === 4 ? 'banquet-float-20261013' : 'home-lights-20261013');
  const duelAssets = ['assets/drone-sprites.webp', 'assets/drone-monkey.webp?v=scope-restore-20261013', 'assets/drone-arena.webp', 'assets/drone-students.webp'];
  let duelRequest;
  function preloadImage(src, priority = 'low') {
    if (!imageRequests.has(src)) {
      const request = new Promise(resolve => {
        const image = new Image();
        image.decoding = 'async';
        image.fetchPriority = priority;
        image.onload = () => image.decode ? image.decode().catch(() => {}).then(() => resolve(true)) : resolve(true);
        image.onerror = () => { imageRequests.delete(src); resolve(false); };
        image.src = src;
      });
      imageRequests.set(src, request);
    }
    return imageRequests.get(src);
  }
  function sceneReady(name) {
    document.body.classList.add('story-assets-' + name);
    readyScenes.add(name);
    sequences[name]?.sync();
  }
  function animateStoryFrame(frame) {
    frame.classList.remove('frame-enter');
    if (!motionPaused && visibleScenes.has(frame.closest('[data-motion-scene]')?.dataset.motionScene)) {
      void frame.offsetWidth; frame.classList.add('frame-enter');
    }
  }
  function prepareDuelAssets() {
    if (!duelRequest) duelRequest = Promise.all(duelAssets.map(src => preloadImage(src))).then(results => {
      const loaded = results.every(Boolean);
      if (loaded) document.body.classList.add('story-assets-drone-duel');
      else duelRequest = undefined;
      return loaded;
    });
    return duelRequest;
  }
  function preloadNextFrame(name, index) {
    if (name === 'lights') {
      // The lamp sequence follows the poster, not the numbered image files.
      const current = experiences.findIndex(item => cultureFrame(item) === index);
      const next = experiences[(current + 1) % experiences.length];
      if (next) preloadImage(storyImage(name, cultureFrame(next)));
      return;
    }
    const next = (index + 1) % (name === 'drone' ? 4 : 6);
    if (name === 'drone' && next === 3) prepareDuelAssets();
    else preloadImage(storyImage(name, next));
  }
  function finishFrameLoad(name, revision, loaded) {
    if (frameRevisions.get(name) !== revision) return false;
    const frame = singleFrames[name];
    frame.dataset.loadState = loaded ? 'ready' : 'error';
    frame.setAttribute('aria-busy', 'false');
    if (!loaded) {
      sequences[name]?.pause();
      if (visibleScenes.has(name)) announce('圖片暫時無法載入，請再點選一次。');
    }
    return loaded;
  }
  async function showSingleFrame(name, index, revision) {
    const frame = singleFrames[name], src = storyImage(name, index);
    const loaded = await preloadImage(src, 'high');
    // Every selection has its own revision, including returning to the same lamp.
    if (!finishFrameLoad(name, revision, loaded)) return false;
    frame.style.backgroundImage = 'url("' + src + '")';
    frame.dataset.loadedFrameIndex = String(index);
    animateStoryFrame(frame);
    sceneReady(name);
    return true;
  }
  async function showDuel(revision) {
    const loaded = await prepareDuelAssets();
    if (!finishFrameLoad('drone', revision, loaded)) return false;
    scenes.drone.classList.add('duel-active');
    $('#droneFrame').dataset.loadedFrameIndex = '3';
    $('#droneFrame').setAttribute('aria-hidden', 'true');
    $('.drone-arena', scenes.drone).setAttribute('aria-hidden', 'false');
    sceneReady('drone');
    return true;
  }
  function loadCurrentFrame(name) {
    const frame = singleFrames[name], index = Number(frame.dataset.frameIndex || 0);
    const revision = (frameRevisions.get(name) || 0) + 1;
    frameRevisions.set(name, revision);
    frame.dataset.loadState = 'loading';
    frame.setAttribute('aria-busy', 'true');
    frame.classList.remove('frame-enter');
    readyScenes.delete(name);
    sequences[name]?.sync();
    const request = name === 'drone' && index === 3 ? showDuel(revision) : showSingleFrame(name, index, revision);
    // Give the visible illustration the connection before warming the next one.
    request.then(loaded => {
      if (loaded && frameRevisions.get(name) === revision) preloadNextFrame(name, index);
    });
    return request;
  };
  function prepareSceneAssets(name) {
    if (!singleFrames[name]) return Promise.resolve();
    if (!sceneAssetRequests.has(name)) {
      if (name === 'lights') {
        $$('.lamp-picture[data-thumb-src]').forEach(picture => {
          picture.style.backgroundImage = 'url("' + picture.dataset.thumbSrc + '")';
        });
      }
      const request = loadCurrentFrame(name);
      sceneAssetRequests.set(name, request);
    }
    return sceneAssetRequests.get(name);
  }
  function setStoryFrame(frame, index, alt) {
    if (!frame) return;
    const name = frame.closest('[data-motion-scene]')?.dataset.motionScene;
    frame.style.backgroundPosition = 'center';
    frame.dataset.frameIndex = String(index);
    frame.setAttribute('role', 'img');
    frame.setAttribute('aria-label', alt);
    if (singleFrames[name]) {
      if (sceneAssetRequests.has(name)) loadCurrentFrame(name);
    } else animateStoryFrame(frame);
  }
  const learningList = (points, className = 'experience-points') => points?.length
    ? '<ul class="' + className + '">' + points.map(point => '<li>' + esc(point) + '</li>').join('') + '</ul>'
    : '';
  let dialogIsOpen = false;
  const sequences = {};
  const canAnimate = () => !motionPaused && !document.hidden && !dialogIsOpen;

  function createSequence({ name, count, dwell, render, button, playLabel, pauseLabel, onRestart }) {
    let index = 0, timer = null, wantsPlayback = true, deadline = 0;
    const duration = step => typeof dwell === 'function' ? dwell(step) : dwell;
    let remaining = duration(0);
    const scene = scenes[name];
    const isPlaying = () => wantsPlayback && canAnimate() && visibleScenes.has(name) && readyScenes.has(name);
    function stopTimer(preserveRemaining = true) {
      if (timer !== null && preserveRemaining) remaining = Math.max(0, deadline - performance.now());
      clearTimeout(timer); timer = null;
    }
    function sync() {
      stopTimer();
      const playing = isPlaying();
      if (playing) scene?.classList.add('is-playing');
      // Keep is-playing when paused so CSS animations retain their current position.
      scene?.classList.toggle('scene-paused', !playing);
      if (button) {
        const playbackRequested = wantsPlayback && !motionPaused;
        const label = motionPaused ? '動態效果已暫停' : playbackRequested ? pauseLabel : playLabel;
        button.innerHTML = esc(label) + ' <span aria-hidden="true">' + (playbackRequested ? 'Ⅱ' : '▷') + '</span>';
        button.setAttribute('aria-pressed', String(playbackRequested));
      }
      if (!playing) return;
      deadline = performance.now() + remaining;
      timer = setTimeout(() => {
        timer = null;
        if (!isPlaying()) { sync(); return; }
        index = (index + 1) % count;
        if (index === 0) onRestart?.();
        render(index, false);
        remaining = duration(index);
        sync();
      }, remaining);
    }
    function select(next, speak = false) {
      // A manual choice stays selected until the visitor explicitly presses play.
      wantsPlayback = false;
      stopTimer(false);
      index = Math.max(0, Math.min(count - 1, next));
      remaining = Math.max(5000, duration(index));
      render(index, speak);
      sync();
    }
    function toggle() {
      if (motionPaused) {
        announce('頁面動畫目前已暫停，仍可逐一點選內容；可在頁尾開啟頁面動畫。');
        return;
      }
      wantsPlayback = !wantsPlayback;
      if (wantsPlayback && singleFrames[name].dataset.loadState === 'error') loadCurrentFrame(name);
      sync();
    }
    button?.addEventListener('click', toggle);
    render(0, false);
    return { sync, select, pause: () => { wantsPlayback = false; sync(); }, step: direction => select((index + direction + count) % count, true) };
  }

  const experiences = data.cultureExperiences.items;
  const cultureFrameById = { village: 3, puppet: 2, craft: 0, journey: 1, banquet: 4 };
  const cultureFrame = item => item.frameIndex ?? cultureFrameById[item.id] ?? 0;
  const litLamps = new Set();
  $('#lampRack').innerHTML = experiences.map((item, i) => '<button class="lamp" data-lamp="' + i + '" aria-pressed="' + (i === 0) + '" aria-controls="experienceDetail lightsFrame" aria-label="第' + (i + 1) + '燈：' + esc(item.name) + '"><span class="lamp-orb"><span class="lamp-picture" data-thumb-src="' + cultureThumbnail(cultureFrame(item)) + '" aria-hidden="true"></span><span class="lamp-number" aria-hidden="true">' + String(i + 1).padStart(2, '0') + '</span></span><span class="lamp-label">' + esc(item.name) + '</span></button>').join('');
  function selectLamp(index, speak = false) {
    const item = experiences[index];
    litLamps.add(index);
    $$('[data-lamp]').forEach((el, i) => {
      el.setAttribute('aria-pressed', String(index === i));
      el.classList.toggle('is-lit', litLamps.has(i));
      el.classList.toggle('is-selected', index === i);
    });
    setStoryFrame($('#lightsFrame'), cultureFrame(item), '大聖老師與小橘人學員參與' + item.name + '的活動場景');
    $('#experienceDetail').innerHTML = '<span class="experience-count">' + String(index + 1).padStart(2, '0') + ' / ' + String(experiences.length).padStart(2, '0') + '</span><h3>' + esc(item.name) + '</h3><p>' + esc(item.description) + '</p>' + learningList(item.learningPoints || item.bullets);
    if (speak) announce(item.name + '。' + item.description);
  }
  sequences.lights = createSequence({
    name: 'lights', count: experiences.length, dwell: 5000, render: selectLamp,
    button: $('#lightsReplay'), playLabel: '播放五燈故事', pauseLabel: '暫停五燈故事',
    onRestart: () => litLamps.clear()
  });
  $$('[data-lamp]').forEach(button => button.addEventListener('click', () => sequences.lights.select(Number(button.dataset.lamp), true)));

  const droneStages = [
    { label: '文化造型', title: '從故事裡，畫出第一個想法', text: '觀察神話裡的龍與雲紋，先畫草稿、比較造型，再決定想怎麼做。', frame: 0, alt: '小橘人學員讀神龍繪本，在紙上畫不同的無人機造型草稿，老師陪伴討論與修改', learningPoints: ['文化故事與造型發想', '設計自己的無人機造型'] },
    { label: '操控練習', title: '從穩穩起飛開始', text: '認識飛行原理與平衡，和老師一起練習基礎操控。', frame: 1, alt: '小橘人學員實際操作遙控器，老師在旁引導祥龍無人機的飛行', learningPoints: ['認識飛行原理與平衡', '練習基礎操控'] },
    { label: '路線挑戰', title: '和夥伴想好下一步', text: '一起觀察目標、規劃路線，合作挑戰障礙接力。', frame: 2, alt: '小橘人學員一起查看路線圖，操控大聖造型無人機穿越目標', learningPoints: ['規劃飛行路線', '障礙接力與團隊策略'] },
    { label: '團隊對決', title: '祥龍與大聖，合作迎戰！', text: '小橘人學員操控祥龍與大聖無人機，把練習帶進團隊競賽。', frame: 3, alt: '小橘人學員在老師指導下操控祥龍與大聖球籠無人機，在球場合作競賽', learningPoints: ['把操控練習用在團隊任務', '溝通合作與競賽策略'] }
  ];
  $('#droneSteps')?.replaceChildren();
  if ($('#droneSteps')) $('#droneSteps').innerHTML = droneStages.map((stage, i) => '<button data-drone-step="' + i + '" aria-pressed="' + (i === 0) + '" aria-controls="droneFrame droneStepTitle droneStepText" aria-label="第' + (i + 1) + '步：' + esc(stage.title) + '">' + esc(stage.label) + '</button>').join('');
  function setDroneStep(index, speak = false) {
    const stage = droneStages[index], duel = index === 3;
    // Use the frame's loading state until the selected illustration is ready.
    scenes.drone.classList.remove('duel-active');
    const frame = $('#droneFrame');
    setStoryFrame(frame, stage.frame, stage.alt);
    const duelVisible = duel && scenes.drone.classList.contains('duel-active');
    if (frame) frame.setAttribute('aria-hidden', String(duelVisible));
    const arena = $('.drone-arena', scenes.drone);
    if (arena) { arena.setAttribute('aria-hidden', String(!duelVisible)); arena.setAttribute('role', 'img'); arena.setAttribute('aria-label', stage.alt); }
    if ($('#droneStepNumber')) $('#droneStepNumber').textContent = String(index + 1).padStart(2, '0');
    if ($('#droneStepTitle')) $('#droneStepTitle').textContent = stage.title;
    if ($('#droneStepText')) $('#droneStepText').textContent = stage.text;
    if ($('#flightCaption')) $('#flightCaption').textContent = stage.text;
    $$('[data-drone-step]').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(index === i));
      button.classList.toggle('is-complete', i < index);
    });
    if (speak) announce(stage.title + '。' + stage.text);
  }
  sequences.drone = createSequence({
    name: 'drone', count: droneStages.length, dwell: index => index === 3 ? 8000 : 5000, render: setDroneStep,
    button: $('#droneReplay'), playLabel: '播放飛行旅程', pauseLabel: '暫停飛行旅程'
  });
  $$('[data-drone-step]').forEach(button => button.addEventListener('click', () => sequences.drone.select(Number(button.dataset.droneStep), true)));

  const legoStages = [
    { label: '發想', title: '故事裡，藏著什麼點子？', text: '一起翻故事、看龍的形狀，記下好奇的細節。玩具還沒有答案，想像才剛開始。', alt: '紅髮老師和三位圓滾滾小橘人閱讀神龍山水繪本，一位學員拿筆記錄靈感，還沒有完成玩具', learningPoints: ['從中華故事找靈感', '觀察與文化發想'] },
    { label: '畫稿', title: '先畫下來，再改一改', text: '輪子要多大？龍頭放哪裡？畫幾種草稿，擦掉、再試，慢慢找到自己的設計。', alt: '小橘人學員比較不同輪子與龍頭的鉛筆草稿，動手畫圖和擦改，老師在旁引導', learningPoints: ['畫出自己的原創設計', '把想法轉為設計草圖'] },
    { label: '3D設計', title: '讓草稿慢慢立體起來', text: '在 3D 軟體裡逐步搭建、調整零件，讓紙上的想法一點一點成形。', alt: '小橘人操作滑鼠，夥伴拿草稿比對，灰身藍髮眼鏡老師協助調整螢幕上尚未完成的積木模型', learningPoints: ['使用 3D 設計軟體', '把草圖轉成 3D 作品'] },
    { label: '圖解', title: '照著圖解，試著組一次', text: '把做法整理成步驟圖，和夥伴邊看邊試，發現問題就一起調整。', alt: '兩位小橘人合作閱讀自己整理的步驟圖並安裝輪軸，龍頭與部分輪子還在工作板上等待組裝', learningPoints: ['製作組裝步驟圖', '整理作品說明書'] },
    { label: '包裝', title: '親手做好作品的家', text: '畫盒面、折紙盒、貼膠帶，連包裝都留下自己的創意與手作痕跡。', alt: '小橘人攤開牛皮紙盒片，親手畫圖案與貼膠帶，紅髮老師協助折盒，作品在旁準備裝入', learningPoints: ['設計作品包裝', '整合圖解、模型與盒組'] },
    { label: '完成！', title: '這是我設計的！', text: '從第一筆草稿到親手完成的盒組，開心舉起作品，把自己的創作故事說給大家聽。', alt: '三位圓橘學員開心舉起完成的龍車、抱著自製盒組和展示草稿，灰身藍髮老師在旁鼓掌', learningPoints: ['完成自己的原創盒組', '分享創作成果'] }
  ];
  $('#legoSteps').innerHTML = legoStages.map((stage, i) => '<button data-lego-step="' + i + '" aria-pressed="' + (i === 0) + '" aria-controls="legoFrame legoStepTitle legoStepText" aria-label="第' + (i + 1) + '步：' + esc(stage.title) + '">' + esc(stage.label) + '</button>').join('');
  function setLegoStep(index, speak = false) {
    const stage = legoStages[index];
    setStoryFrame($('#legoFrame'), index, stage.alt);
    $('#legoStepNumber').textContent = String(index + 1).padStart(2, '0');
    $('#legoStepTitle').textContent = stage.title;
    $('#legoStepText').textContent = stage.text;
    $$('[data-lego-step]').forEach((button, i) => {
      button.setAttribute('aria-pressed', String(index === i));
      button.classList.toggle('is-complete', i < index);
    });
    if (speak) announce(stage.title + '。' + stage.text);
  }
  sequences.lego = createSequence({
    name: 'lego', count: legoStages.length, dwell: 4000, render: setLegoStep,
    button: $('#legoReplay'), playLabel: '播放製作過程', pauseLabel: '暫停製作過程'
  });
  $$('[data-lego-step]').forEach(button => button.addEventListener('click', () => sequences.lego.select(Number(button.dataset.legoStep), true)));

  $$('[data-scene-step]').forEach(button => button.addEventListener('click', () => {
    sequences[button.dataset.sceneStep]?.step(Number(button.dataset.direction));
  }));

  function syncScenePlayback() { Object.values(sequences).forEach(sequence => sequence.sync()); }
  function syncMotion() {
    document.body.classList.toggle('motion-paused', motionPaused);
    document.body.classList.toggle('motion-enabled', !motionPaused);
    $('#motionToggle').setAttribute('aria-pressed', String(motionPaused));
    $('#motionToggle').innerHTML = motionPaused ? '開啟頁面動畫 <span aria-hidden="true">▷</span>' : '暫停頁面動畫 <span aria-hidden="true">Ⅱ</span>';
    syncScenePlayback();
  }
  $('#motionToggle').addEventListener('click', () => {
    motionPaused = !motionPaused;
    userMotionPaused = motionPaused;
    syncMotion(); announce(motionPaused ? '頁面動畫已暫停。各項內容仍可點選。' : '已開啟頁面動畫。');
  });
  reducedMotion.addEventListener('change', event => {
    motionPaused = event.matches || userMotionPaused;
    syncMotion();
  });
  document.addEventListener('visibilitychange', syncScenePlayback);
  if ('IntersectionObserver' in window) {
    const assetObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      prepareSceneAssets(entry.target.dataset.motionScene);
      assetObserver.unobserve(entry.target);
    }), { rootMargin: matchMedia('(max-width:700px)').matches ? '400px 0px' : '800px 0px', threshold: 0 });
    const playbackObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      const name = entry.target.dataset.motionScene;
      if (entry.isIntersecting) {
        visibleScenes.add(name);
        prepareSceneAssets(name);
      } else visibleScenes.delete(name);
      sequences[name]?.sync();
    }), { threshold: 0 });
    Object.values(scenes).forEach(scene => playbackObserver.observe(scene));
    // On entry, the hero gets first use of the connection. A directly visible
    // story still loads immediately through playbackObserver (including anchors).
    const observeUpcomingScenes = () => Object.values(scenes).forEach(scene => assetObserver.observe(scene));
    const heroImage = $('.hero-illustration');
    if (!heroImage || heroImage.complete) observeUpcomingScenes();
    else {
      heroImage.addEventListener('load', observeUpcomingScenes, { once: true });
      heroImage.addEventListener('error', observeUpcomingScenes, { once: true });
    }
  } else {
    Object.keys(scenes).forEach(name => { visibleScenes.add(name); prepareSceneAssets(name); });
  }
  syncMotion();


  // The calendar highlights only confirmed dates. No inferred daily timetable.
  const confirmedCalendarDates = [...new Set(data.camps.flatMap(c => c.dates))].sort();
  let calendarFilter = 'all', selectedDate = null, selectedCalendarCampId = 'full-term';
  function campsOnDate(date) { return data.camps.filter(c => c.dates.includes(date) && (calendarFilter === 'all' || c.id === calendarFilter)); }
  function dateLabel(date) { const [y,m,d] = date.split('-').map(Number); const weekday = '日一二三四五六'[new Date(y,m-1,d).getDay()]; return `${m} 月 ${d} 日（${weekday}）`; }
  function calendarDate(key) { const [year, month, day] = key.split('-').map(Number); return new Date(year, month - 1, day); }
  function calendarKey(date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
  const calendarRangeStart = calendarDate(confirmedCalendarDates[0]);
  const calendarRangeEnd = calendarDate(confirmedCalendarDates[confirmedCalendarDates.length - 1]);
  calendarRangeStart.setDate(calendarRangeStart.getDate() - calendarRangeStart.getDay());
  calendarRangeEnd.setDate(calendarRangeEnd.getDate() + 6 - calendarRangeEnd.getDay());
  function calendarDay(key, label) {
    const camps = campsOnDate(key);
    if (!camps.length) return `<span class="date-cell" data-calendar-day="${key}" aria-label="${esc(dateLabel(key))}">${label}</span>`;
    const dots = camps.map(c => `<i class="${c.id === 'drone' ? 'drone-dot' : ''}"></i>`).join('');
    return `<button class="date-cell is-event" data-calendar-day="${key}" data-date="${key}" aria-controls="calendarDetail" aria-pressed="${selectedDate === key}" aria-label="${esc(dateLabel(key))}，查看${esc(camps.map(c=>c.name).join('、'))}的完整營期"><span>${label}</span><span class="date-dots" aria-hidden="true">${dots}</span></button>`;
  }
  function renderCompactCalendar() {
    const first = calendarDate(confirmedCalendarDates[0]), last = calendarDate(confirmedCalendarDates[confirmedCalendarDates.length - 1]);
    const rangeLabel = `${first.getFullYear()} · ${first.getMonth() + 1}/${first.getDate()}–${last.getMonth() + 1}/${last.getDate()}`;
    const headings = '日一二三四五六'.split('').map(day => `<span class="weekday">${day}</span>`).join('');
    const cells = [];
    // The complete published range stays fixed when a family switches camp filters.
    for (let date = new Date(calendarRangeStart); date <= calendarRangeEnd; date.setDate(date.getDate() + 1)) {
      cells.push(calendarDay(calendarKey(date), `${date.getMonth() + 1}/${date.getDate()}`));
    }
    $('#calendarCompact').innerHTML = `<div class="compact-calendar-heading"><h3>寒假三週總覽</h3><p>${rangeLabel}</p></div><div class="month-grid compact-calendar-grid">${headings}${cells.join('')}</div>`;
  }
  function renderCalendars() {
    $('#calendarGrid').innerHTML = [0, 1].map(month => {
      const start = new Date(2027, month, 1).getDay(), count = new Date(2027, month + 1, 0).getDate();
      const headings = '日一二三四五六'.split('').map(day => `<span class="weekday">${day}</span>`).join('');
      const blanks = '<span aria-hidden="true"></span>'.repeat(start);
      const cells = Array.from({length: count}, (_, n) => {
        const day = n + 1, key = `2027-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        return calendarDay(key, day);
      }).join('');
      return `<div class="month"><h3>${month + 1} 月 <small>2027 ${month === 0 ? 'JANUARY' : 'FEBRUARY'}</small></h3><div class="month-grid">${headings}${blanks}${cells}</div></div>`;
    }).join('');
    renderCompactCalendar();
    $$('[data-date]').forEach(button => button.addEventListener('click', () => { selectedDate = button.dataset.date; $$('[data-date]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.date === selectedDate))); renderCampSchedule(); }));
    renderCampSchedule();
  }
  function renderCampSchedule() {
    // A date is a way to find a camp, never a one-day registration option.
    const camps = calendarFilter !== 'all'
      ? data.camps.filter(c => c.id === calendarFilter && c.dates.length)
      : selectedDate ? campsOnDate(selectedDate) : data.camps.filter(c => c.dates.length);
    if (!camps.some(c => c.id === selectedCalendarCampId)) selectedCalendarCampId = camps[0]?.id || null;
    const picker = $('#calendarProgramPicker');
    const candidateIds = camps.map(c => c.id).join(',');
    // Keep the active button in the DOM so switching programs preserves focus.
    if (picker.dataset.candidates !== candidateIds) {
      picker.innerHTML = camps.map(c => '<button type="button" data-calendar-camp="' + esc(c.id) + '" aria-controls="calendarProgram" aria-pressed="false">' + esc(c.id === 'full-term' ? '五燈獎' : c.name) + '</button>').join('');
      picker.dataset.candidates = candidateIds;
    }
    picker.hidden = camps.length < 2;
    $$('[data-calendar-camp]', picker).forEach(button => button.setAttribute('aria-pressed', String(button.dataset.calendarCamp === selectedCalendarCampId)));
    const overlaps = camps.some((camp, index) => camps.slice(index + 1).some(other => camp.dates.some(date => other.dates.includes(date))));
    const camp = camps.find(c => c.id === selectedCalendarCampId);
    const note = $('#calendarOverlapNote');
    note.hidden = !overlaps;
    if (!camp) { $('#calendarProgram').innerHTML = '<p>此日期尚無已公布的營隊。</p>'; return; }
    const periods = camp.dateLabel.split('、');
    const enrolment = camp.id === 'full-term' ? '共 9 天，須完整報名' : '共 ' + camp.days + ' 天，完整營期';
    const time = camp.timeLabel.includes('近期公布') ? '' : '<p class="calendar-program-time">每日 ' + esc(camp.timeLabel) + '</p>';
    $('#calendarProgram').innerHTML = '<article class="calendar-course"><h3>' + esc(camp.name) + '</h3><p class="calendar-enrolment">' + esc(enrolment) + '</p><ul class="calendar-periods" aria-label="' + esc(camp.name) + '完整上課日期">' + periods.map(period => '<li>' + esc(period) + '</li>').join('') + '</ul>' + time + '<button type="button" data-camp="' + esc(camp.id) + '">查看完整課程與報名 <span aria-hidden="true">→</span></button></article>';
  }
  $('#calendarProgramPicker').addEventListener('click', event => {
    const button = event.target.closest('[data-calendar-camp]');
    if (!button) return;
    selectedCalendarCampId = button.dataset.calendarCamp;
    renderCampSchedule();
  });
  $$('[data-calendar-filter]').forEach(button => button.addEventListener('click', () => {
    calendarFilter = button.dataset.calendarFilter;
    $$('[data-calendar-filter]').forEach(el => el.setAttribute('aria-pressed', String(el === button)));
    selectedDate = null;
    renderCalendars();
  }));
  renderCalendars();

  const campDialog = $('#campDialog');
  let lastDialogTrigger = null;
  let pageOverflowBeforeDialog = '';

  function renderCourseJournal(camp) {
    const doodles = {
      'full-term': 'assets/course-doodle-culture.webp',
      drone: 'assets/course-doodle-drone.webp',
      lego: 'assets/course-doodle-lego.webp'
    };
    const doodle = doodles[camp.id]
      ? '<img class="course-doodle" src="' + doodles[camp.id] + '" alt="" aria-hidden="true" width="76" height="76" loading="lazy" decoding="async">'
      : '';
    if (camp.id === 'full-term') {
      return '<section class="course-editorial" aria-labelledby="courseExperienceTitle"><div class="course-chapter-heading"><h3 id="courseExperienceTitle">五種體驗，一起玩文化</h3>' + doodle + '</div><ul class="course-experience-list">' + camp.activities.map(activity => '<li><strong>' + esc(activity.title) + '</strong><span>' + esc(activity.description) + '</span></li>').join('') + '</ul></section>';
    }
    const chapters = {
      drone: [
        { title: '把神話變成飛行造型', text: '從中華神話找靈感，設計自己的無人機造型，把文化故事帶進飛行任務。' },
        { title: '認識原理，練習操控', text: '認識飛行原理與平衡，練習基礎操控，再和夥伴規劃路線、挑戰障礙接力。' },
        { title: '合作挑戰，也學會維護', text: '在團隊任務中練習合作與問題判斷，認識基礎維修與維護，回顧設計與飛行的收穫。' }
      ],
      lego: [
        { title: '從故事畫出自己的點子', text: '從中華故事出發，把想像畫成原創設計，找到自己想做的玩具。' },
        { title: '把想法拼成 3D 作品', text: '使用 3D 軟體建立作品，讓紙上的點子成為看得見的立體設計。' },
        { title: '完成說明書與原創盒組', text: '製作組裝步驟圖與說明書，再設計包裝，完成從發想到盒組的創作過程。' }
      ]
    }[camp.id] || [];
    if (!chapters.length) return '';
    return '<section class="course-editorial" aria-label="課程介紹">' + chapters.map((chapter, index) => '<div class="course-chapter"><div class="course-chapter-heading"><h3>' + esc(chapter.title) + '</h3>' + (index === 0 ? doodle : '') + '</div><p>' + esc(chapter.text) + '</p></div>').join('') + '</section>';
  }

  function openCamp(id, trigger) {
    const c = campById(id); if (!c) return;
    lastDialogTrigger = trigger;
    const facts = id === 'full-term'
      ? [['dates', '課程日期', c.dateLabel], ['age', '適合對象', c.ageLabel], ['time', '每日時間', c.timeLabel], ['classroom', '上課教室', c.classroomLabel], ['price', '課程費用', c.priceLabel]]
      : [['dates', '課程日期', c.dateLabel], ['price', '課程費用', c.priceLabel]];
    const factsMarkup = '<div class="dialog-facts">' + facts.map(([key, label, value]) => '<div data-fact="' + key + '"><span>' + esc(label) + '</span>' + esc(value) + (key === 'price' && c.pricing ? '<p class="dialog-price-note">' + esc(c.priceNote).replace('，原價', '，<br>原價') + '</p>' : '') + '</div>').join('') + '</div>' + (id === 'full-term' ? '' : '<p class="dialog-unknown-note">年齡、上課時段與教室將另行公布。</p>');
    const fullTermExtras = id === 'full-term' ? '<section class="course-journey" aria-labelledby="courseJourneyTitle"><h3 id="courseJourneyTitle">9 天的文化旅程</h3><ul class="period-list">' + data.itinerary.periods.map(p => '<li><small>' + esc(p.dateLabel) + ' · ' + p.days + ' 天</small><h4>' + esc(p.title) + '</h4><p>' + esc(p.description) + '</p></li>').join('') + '</ul><p class="dialog-note">' + esc(data.itinerary.note) + '</p><div class="dialog-event"><h4>2/2 晚上，邀請爸媽來作客。</h4><p>' + esc(c.parentEvent.description) + '<br>' + esc(c.parentEvent.note) + '</p></div></section>' : '';
    const poster = c.poster ? '<figure class="dialog-poster"><a href="' + esc(c.poster) + '" ' + ext + ' aria-label="開啟' + esc(c.name) + '完整海報"><img src="' + esc(c.poster) + '" alt="' + esc(c.name) + '完整課程海報" loading="eager" fetchpriority="high" decoding="async"></a><figcaption>點開查看完整海報 <span aria-hidden="true">↗</span></figcaption></figure>' : '';
    const couponEntry = '<a href="coupon.html" class="camp-coupon-entry"><img class="camp-coupon-entry__logo" src="assets/brand-logo.png" width="32" height="32" alt="" loading="lazy" decoding="async"><span class="camp-coupon-entry__copy"><strong>冬令營優惠券</strong><span>10/16 19:30 開放・限量 60 張</span></span><span class="camp-coupon-entry__cta">查看領券資訊 <span aria-hidden="true">↗</span></span></a>';
    const actions = '<div class="dialog-actions"><a href="' + esc(c.registration.url) + '" ' + ext + ' class="button">' + esc(c.registration.label) + ' <span aria-hidden="true">↗</span></a></div>';
    const care = c.extendedCare;
    const pickupNotes = id === 'full-term' ? '<p>接送安排：' + esc(c.pickupLabel) + '。</p>' + (care ? '<p>超過 ' + esc(care.startsAfter) + ' 接回：延托費 NT$' + esc(care.ratePerHour) + '／小時，' + esc(care.rounding) + '。' + esc(care.notice) + '</p>' : '') : '';
    const registrationNotes = '<details class="dialog-registration-notes"><summary>報名與接送說明</summary><div>' + pickupNotes + '<p>' + esc(c.registration.note) + '</p><p>' + esc(data.campaign.relationship) + '</p></div></details>';
    const registration = '<section class="course-registration" aria-labelledby="courseRegistrationTitle"><h3 id="courseRegistrationTitle">日期與報名</h3>' + factsMarkup + actions + couponEntry + registrationNotes + '</section>';
    $('#dialogContent').innerHTML = '<div class="dialog-inner course-journal' + (poster ? '' : ' course-journal--text') + '">' + poster + '<article class="dialog-course-main"><header class="course-introduction"><p class="eyebrow">' + esc(c.daysLabel) + '</p><h2 id="dialogTitle">' + esc(c.name) + '</h2><p class="dialog-subtitle">' + esc(c.subtitle) + '</p><p class="dialog-description">' + esc(c.description) + '</p></header>' + renderCourseJournal(c) + fullTermExtras + registration + '</article></div>';
    dialogIsOpen = true; syncScenePlayback();
    if (!campDialog.open) {
      pageOverflowBeforeDialog = document.body.style.overflow;
      campDialog.showModal();
    }
    campDialog.scrollTop = 0; document.body.style.overflow = 'hidden'; $('#dialogClose').focus({ preventScroll: true });
  }
  document.addEventListener('click', event => { const trigger = event.target.closest('[data-camp]'); if (trigger) openCamp(trigger.dataset.camp, trigger); });
  $('#dialogClose').addEventListener('click', () => campDialog.close());
  campDialog.addEventListener('click', event => {
    if (event.target !== campDialog) return;
    const r = campDialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) campDialog.close();
  });
  campDialog.addEventListener('close', () => {
    document.body.style.overflow = pageOverflowBeforeDialog;
    dialogIsOpen = false; syncScenePlayback();
    lastDialogTrigger?.focus({ preventScroll: true });
  });


  const faqShortLabels = { choosing: '選營隊', 'daily-life': '營隊生活', registration: '報名費用', coupon: '優惠券' };
  $('#faqCategories').innerHTML = data.faqGroups.map((group, i) => `<button data-faq="${esc(group.id)}" aria-pressed="${i === 0}" aria-controls="faqList"><span class="faq-label-full">${esc(group.label)}</span><span class="faq-label-short">${esc(faqShortLabels[group.id] || group.label)}</span></button>`).join('');
  function renderFaq(id) {
    const group = data.faqGroups.find(g => g.id === id);
    $('#faqList').innerHTML = group.items.map(item => `<details><summary>${esc(item.question)}</summary><div class="faq-answer"><p>${esc(item.answer)}</p>${item.action ? `<a href="${esc(item.action.url)}" ${item.action.url.startsWith('https:') ? ext : ''}>${esc(item.action.label)} ↗</a>` : ''}</div></details>`).join('');
    $$('[data-faq]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.faq === id)));
  }
  $$('[data-faq]').forEach(button => button.addEventListener('click', () => renderFaq(button.dataset.faq)));
  renderFaq(data.faqGroups[0].id);
  $('#classrooms').innerHTML = data.classrooms.map(c => `<article class="classroom"><h3>${esc(c.name)}</h3><p>${esc(c.address)}</p><div class="contact-links"><a href="${esc(c.phoneHref)}">${esc(c.phone)}</a><a href="${esc(c.mapUrl)}" ${ext}>開啟地圖 ↗</a></div></article>`).join('');
})();
