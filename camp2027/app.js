(() => {
  'use strict';
  const data = window.CAMP_DATA;
  if (!data) return;
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const ext = 'target="_blank" rel="noopener"';
  const campById = id => data.camps.find(c => c.id === id);
  let selectedCampus = 'all';
  const campusAllows = camp => !!camp && (selectedCampus === 'all' || camp.classroomIds.includes(selectedCampus));
  const availableCamps = () => data.camps.filter(campusAllows);
  const campusName = () => data.classrooms.find(c => c.id === selectedCampus)?.name || '全部教室';
  const campClassroom = camp => selectedCampus === 'all' ? camp.classroomLabel : campusName();
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
  const frameRevisions = new Map();
  const frameContent = new Map();
  const singleFrames = { lights: $('#lightsFrame'), drone: $('#droneFrame'), lego: $('#legoFrame') };
  const storyImage = (name, index) => 'assets/' + (name === 'lights' ? 'culture' : name) + '-frame-' + String(index + 1).padStart(2, '0') + '.webp' + (name === 'lights' ? (index === 4 ? '?v=banquet-float-20261013' : '?v=home-lights-20261013') : name === 'lego' || (name === 'drone' && index === 0) ? '?v=creative-journey-20261013' : '?v=scope-restore-20261013');
  const cultureThumbnail = index => 'assets/culture-thumb-' + String(index + 1).padStart(2, '0') + '.webp?v=' + (index === 4 ? 'banquet-float-20261013' : 'home-lights-20261013');
  const duelAssets = ['assets/drone-sprites.webp', 'assets/drone-monkey.webp?v=scope-restore-20261013', 'assets/drone-arena.webp', 'assets/drone-students.webp'];
  const preloadImage = window.CampImages.preload;
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
  function prepareDuelAssets(priority = 'low') {
    const requests = duelAssets.map(src => preloadImage(src, priority));
    return Promise.all(requests).then(results => {
      const loaded = results.every(Boolean);
      if (loaded) {
        $('.dragon-sprite', scenes.drone).style.backgroundImage = 'url("' + window.CampImages.source(duelAssets[0]) + '")';
        $('.monkey-sprite', scenes.drone).style.backgroundImage = 'url("' + window.CampImages.source(duelAssets[1]) + '")';
        $('.arena-background', scenes.drone).src = window.CampImages.source(duelAssets[2]);
        $('.drone-pilot', scenes.drone).src = window.CampImages.source(duelAssets[3]);
        document.body.classList.add('story-assets-drone-duel');
      }
      return loaded;
    });
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
  function warmSceneFrames(name) {
    if (navigator.connection?.saveData) return;
    const count = name === 'lights' ? 5 : name === 'drone' ? 3 : 6;
    for (let index = 0; index < count; index++) preloadImage(storyImage(name, index));
    if (name === 'drone') prepareDuelAssets();
  }
  function finishFrameLoad(name, revision, loaded) {
    if (frameRevisions.get(name) !== revision) return false;
    const frame = singleFrames[name];
    frame.dataset.loadState = loaded ? 'ready' : 'error';
    scenes[name].dataset.loadState = frame.dataset.loadState;
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
    frame.style.backgroundImage = 'url("' + window.CampImages.source(src) + '")';
    frame.dataset.loadedFrameIndex = String(index);
    frame.setAttribute('aria-label', frameContent.get(name)?.alt || '');
    frameContent.get(name)?.render?.();
    if (name === 'drone') {
      scenes.drone.classList.remove('duel-active');
      frame.setAttribute('aria-hidden', 'false');
      $('.drone-arena', scenes.drone).setAttribute('aria-hidden', 'true');
    }
    animateStoryFrame(frame);
    sceneReady(name);
    return true;
  }
  async function showDuel(revision) {
    const loaded = await prepareDuelAssets('high');
    if (!finishFrameLoad('drone', revision, loaded)) return false;
    scenes.drone.classList.add('duel-active');
    $('#droneFrame').dataset.loadedFrameIndex = '3';
    $('#droneFrame').setAttribute('aria-hidden', 'true');
    $('.drone-arena', scenes.drone).setAttribute('aria-hidden', 'false');
    $('.drone-arena', scenes.drone).setAttribute('aria-label', frameContent.get('drone')?.alt || '');
    frameContent.get('drone')?.render?.();
    sceneReady('drone');
    return true;
  }
  function loadCurrentFrame(name) {
    const frame = singleFrames[name], index = Number(frame.dataset.frameIndex || 0);
    const revision = (frameRevisions.get(name) || 0) + 1;
    frameRevisions.set(name, revision);
    frame.dataset.loadState = 'loading';
    scenes[name].dataset.loadState = 'loading';
    frame.setAttribute('aria-busy', 'true');
    frame.classList.remove('frame-enter');
    readyScenes.delete(name);
    sequences[name]?.sync();
    const request = name === 'drone' && index === 3 ? showDuel(revision) : showSingleFrame(name, index, revision);
    // Give the visible illustration the connection before warming the next one.
    request.then(loaded => {
      if (loaded && frameRevisions.get(name) === revision) {
        preloadNextFrame(name, index);
        warmSceneFrames(name);
      }
    });
    return request;
  };
  function prepareSceneAssets(name) {
    if (!singleFrames[name]) return Promise.resolve();
    if (!sceneAssetRequests.has(name)) {
      const request = loadCurrentFrame(name);
      if (name === 'lights') {
        $$('.lamp-picture[data-thumb-src]').forEach(picture => {
          preloadImage(picture.dataset.thumbSrc).then(loaded => {
            if (loaded) picture.style.backgroundImage = 'url("' + picture.dataset.thumbSrc + '")';
          });
        });
      }
      sceneAssetRequests.set(name, request);
    }
    return sceneAssetRequests.get(name);
  }
  function setStoryFrame(frame, index, alt, render) {
    if (!frame) return;
    const name = frame.closest('[data-motion-scene]')?.dataset.motionScene;
    frame.style.backgroundPosition = 'center';
    frame.dataset.frameIndex = String(index);
    frame.setAttribute('role', 'img');
    frameContent.set(name, { alt, render });
    if (frame.dataset.loadedFrameIndex === undefined) {
      frame.setAttribute('aria-label', alt);
      render?.();
    }
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
    const isPlaying = () => wantsPlayback && canAnimate() && !scenes[name]?.closest('[hidden]') && visibleScenes.has(name) && readyScenes.has(name);
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
    setStoryFrame($('#lightsFrame'), cultureFrame(item), '大聖老師與小橘人學員參與' + item.name + '的活動場景', () => {
      $('#experienceDetail').innerHTML = '<span class="experience-count">' + String(index + 1).padStart(2, '0') + ' / ' + String(experiences.length).padStart(2, '0') + '</span><h3>' + esc(item.name) + '</h3><p>' + esc(item.description) + '</p>' + learningList(item.learningPoints || item.bullets);
    });
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
    const stage = droneStages[index];
    // Keep the displayed scene and its caption together until the next is decoded.
    const frame = $('#droneFrame');
    setStoryFrame(frame, stage.frame, stage.alt, () => {
      if ($('#droneStepNumber')) $('#droneStepNumber').textContent = String(index + 1).padStart(2, '0');
      if ($('#droneStepTitle')) $('#droneStepTitle').textContent = stage.title;
      if ($('#droneStepText')) $('#droneStepText').textContent = stage.text;
      if ($('#flightCaption')) $('#flightCaption').textContent = stage.text;
    });
    $('.drone-arena', scenes.drone).setAttribute('role', 'img');
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
    setStoryFrame($('#legoFrame'), index, stage.alt, () => {
      $('#legoStepNumber').textContent = String(index + 1).padStart(2, '0');
      $('#legoStepTitle').textContent = stage.title;
      $('#legoStepText').textContent = stage.text;
    });
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
    }), { rootMargin: '1200px 0px', threshold: 0 });
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
    const observeUpcomingScenes = () => {
      Object.values(scenes).forEach(scene => assetObserver.observe(scene));
      // First illustrations are small and warm in a two-request queue after hero.
      if (!navigator.connection?.saveData) {
        Object.keys(singleFrames).forEach(name => preloadImage(storyImage(name, Number(singleFrames[name].dataset.frameIndex || 0))));
      }
    };
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


  // Two-day themes share the same dates; show one readable course at a time.
  const twoDayCamps = data.camps.filter(c => c.days === 2);
  $('#twoDayPanels').innerHTML = twoDayCamps.map((c, index) => {
    const [title, type = ''] = c.name.split('｜');
    const timeKnown = !/近期公布|稍後公布|待公布/.test(c.timeLabel);
    const details = timeKnown ? `${c.ageLabel} · ${c.timeLabel}；${c.priceLabel}。` : '費用與上課時段稍後公布。';
    return `<article id="panel-${esc(c.id)}" class="two-day-panel" role="tabpanel" tabindex="0" aria-labelledby="tab-${esc(c.id)}" ${index ? 'hidden' : ''}>
      <div class="two-day-story" data-two-day-story="${esc(c.id)}"></div>
      <div class="two-day-copy"><p class="eyebrow">${esc(c.daysLabel)} · 1/21–1/22</p><h3><span class="two-day-course-name">${esc(title)}</span><span class="two-day-course-type">${esc(type)}</span></h3><p class="two-day-subtitle">${esc(c.subtitle)}</p><p>${esc(c.description)}</p>
      <ul>${c.activities.map(activity => `<li>${esc(activity.title)}</li>`).join('')}</ul>
      <p class="two-day-campus">${esc(c.classroomLabel)}</p><p class="two-day-details-pending">${esc(details)}</p><div class="camp-actions"><button class="button" type="button" data-camp="${esc(c.id)}">看完整課程 <span aria-hidden="true">→</span></button><a class="text-link" href="${esc(c.registration.url)}" ${ext}>${esc(c.registration.kind === 'form' ? c.registration.label : 'LINE 洽詢')} ↗</a></div></div>
    </article>`;
  }).join('');
  function selectTwoDay(id, focus = false) {
    if (!twoDayCamps.some(c => c.id === id && campusAllows(c))) return;
    $$('[data-two-day-tab]').forEach(button => {
      const selected = button.dataset.twoDayTab === id;
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      if (selected && focus) button.focus();
      if (selected) {
        const tabs = button.parentElement;
        if (tabs.scrollWidth > tabs.clientWidth) {
          const cardRect = button.getBoundingClientRect(), tabsRect = tabs.getBoundingClientRect();
          if (cardRect.left < tabsRect.left || cardRect.right > tabsRect.right) {
            tabs.scrollLeft += cardRect.left - tabsRect.left;
          }
        }
      }
    });
    twoDayCamps.forEach(c => { $('#panel-' + c.id).hidden = c.id !== id; });
  }
  $$('[data-two-day-tab]').forEach(button => {
    button.addEventListener('click', () => selectTwoDay(button.dataset.twoDayTab));
    button.addEventListener('keydown', event => {
      const buttons = $$('[data-two-day-tab]').filter(el => !el.hidden);
      const index = buttons.indexOf(button);
      let next;
      if (event.key === 'ArrowRight') next = (index + 1) % buttons.length;
      if (event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      if (next === undefined) return;
      event.preventDefault(); selectTwoDay(buttons[next].dataset.twoDayTab, true);
    });
  });
  function followTwoDayHash() {
    const id = location.hash.slice(1);
    if (!twoDayCamps.some(c => c.id === id && campusAllows(c))) return;
    selectTwoDay(id); $('#two-day').scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', followTwoDayHash);
  $('#camps .camp-choice-grid').addEventListener('click', event => {
    const link = event.target.closest('.choice-camp-link');
    if (link && link.hash === location.hash && twoDayCamps.some(c => '#' + c.id === link.hash)) {
      event.preventDefault();
      followTwoDayHash();
    }
  });
  if (twoDayCamps.some(c => '#' + c.id === location.hash)) requestAnimationFrame(followTwoDayHash);

  // The calendar highlights only confirmed dates. No inferred daily timetable.
  const confirmedCalendarDates = [...new Set(data.camps.flatMap(c => c.dates))].sort();
  let calendarFilter = 'full-term', selectedDate = null;
  function campsOnDate(date) { return availableCamps().filter(c => c.id === calendarFilter && c.dates.includes(date)); }
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
    const dots = camps.map(c => `<i class="${esc(c.id) + '-dot'}"></i>`).join('');
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
    // The selected camp always shows its whole term, including after a date click.
    const camps = availableCamps();
    const camp = camps.find(c => c.id === calendarFilter && c.dates.length);
    const note = $('#calendarOverlapNote');
    if (note) {
      const overlaps = camp ? camps.filter(other => other.id !== camp.id && camp.dates.some(date => other.dates.includes(date))) : [];
      note.hidden = overlaps.length === 0;
      note.textContent = !camp || !overlaps.length ? '' : camp.id === 'full-term'
        ? '全期營與特色營日期重疊，請擇一報名。'
        : overlaps.some(other => other.id !== 'full-term')
          ? '與全期營及同日期特色營重疊，請擇一報名。'
          : '與全期營日期重疊，請擇一報名。';
    }
    if (!camp) { $('#calendarProgram').innerHTML = '<p>此營隊尚無已公布的日期。</p>'; return; }
    const periods = camp.dateLabel.split('、');
    const enrolment = camp.id === 'full-term' ? '冬令營全期營，須完整報名' : '共 ' + camp.days + ' 天，完整營期';
    const time = /近期公布|稍後公布|待公布/.test(camp.timeLabel) ? '' : '<p class="calendar-program-time">每日 ' + esc(camp.timeLabel) + '</p>';
    const classroom = '<p class="calendar-program-classroom">' + esc(campClassroom(camp)) + '</p>';
    const restNote = camp.id === 'full-term' ? '<p class="calendar-program-rest">週末休息</p>' : '';
    $('#calendarProgram').innerHTML = '<article class="calendar-course"><h3>' + esc(camp.name) + '</h3><p class="calendar-enrolment">' + esc(enrolment) + '</p><ul class="calendar-periods" aria-label="' + esc(camp.name) + '完整上課日期">' + periods.map(period => '<li>' + esc(period) + '</li>').join('') + '</ul>' + time + classroom + restNote + '<button type="button" data-camp="' + esc(camp.id) + '">查看完整課程與報名 <span aria-hidden="true">→</span></button></article>';
  }
  $$('[data-calendar-filter]').forEach(button => button.addEventListener('click', () => {
    if (button.hidden || !campusAllows(campById(button.dataset.calendarFilter))) return;
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
    if (camp.editorialChapters) {
      return '<section class="course-editorial" aria-label="課程介紹">' + camp.editorialChapters.map(chapter => '<div class="course-chapter"><div class="course-chapter-heading"><h3>' + esc(chapter.title) + '</h3></div>' + chapter.paragraphs.map(paragraph => '<p>' + esc(paragraph) + '</p>').join('') + '</div>').join('') + '<p class="course-invention-outcome">' + esc(camp.outcome) + '</p></section>';
    }
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
    }[camp.id] || camp.activities.map(activity => ({ title: activity.title, text: activity.description }));
    if (!chapters.length) return '';
    return '<section class="course-editorial" aria-label="課程介紹">' + chapters.map((chapter, index) => '<div class="course-chapter"><div class="course-chapter-heading"><h3>' + esc(chapter.title) + '</h3>' + (index === 0 ? doodle : '') + '</div><p>' + esc(chapter.text) + '</p></div>').join('') + '</section>';
  }

  function openCamp(id, trigger) {
    const c = campById(id); if (!campusAllows(c)) return;
    lastDialogTrigger = trigger;
    const titleParts = c.name.split('｜');
    const courseTitle = titleParts.length === 2 ? '<span class="course-title-main">' + esc(titleParts[0]) + '</span><span class="course-title-divider" aria-hidden="true">｜</span><span class="course-title-type">' + esc(titleParts[1]) + '</span>' : esc(c.name);
    const hasKnownTimeAndAge = !/近期公布|稍後公布|待公布/.test(c.timeLabel + c.ageLabel);
    const facts = id === 'full-term' || hasKnownTimeAndAge
      ? [['dates', '課程日期', c.dateLabel], ['age', '適合對象', c.ageLabel], ['time', '每日時間', c.timeLabel], ['classroom', '上課教室', campClassroom(c)], ['price', '課程費用', c.priceLabel]]
      : [['dates', '課程日期', c.dateLabel], ['classroom', '上課教室', campClassroom(c)], ['price', '課程費用', c.priceLabel]];
    const factsMarkup = '<div class="dialog-facts">' + facts.map(([key, label, value]) => '<div data-fact="' + key + '"><span>' + esc(label) + '</span>' + esc(value) + (key === 'price' && c.pricing ? '<p class="dialog-price-note">' + esc(c.priceNote).replace('，原價', '，<br>原價') + '</p>' : '') + '</div>').join('') + '</div>' + (id === 'full-term' ? '<p class="dialog-unknown-note">週末休息，請完整參與營期。</p>' : hasKnownTimeAndAge ? '' : '<p class="dialog-unknown-note">年齡與上課時段將另行公布。</p>');
    const fullTermExtras = id === 'full-term' ? '<section class="course-journey" aria-labelledby="courseJourneyTitle"><h3 id="courseJourneyTitle">寒假的文化旅程</h3><ul class="period-list">' + data.itinerary.periods.map(p => '<li><small>' + esc(p.label) + '</small><h4>' + esc(p.title) + '</h4><p>' + esc(p.description) + '</p></li>').join('') + '</ul><p class="dialog-note">' + esc(data.itinerary.note) + '</p><div class="dialog-event"><h4>2/2 晚上，邀請爸媽來作客。</h4><p>' + esc(c.parentEvent.description) + '<br>' + esc(c.parentEvent.note) + '</p></div></section>' : '';
    const poster = c.poster ? '<figure class="dialog-poster"><a href="' + esc(c.poster) + '" ' + ext + ' aria-label="開啟' + esc(c.name) + '完整海報"><picture>' + (c.posterMobile ? '<source media="(max-width:700px)" type="image/avif" srcset="' + esc(c.posterMobile.replace(/\.webp$/, '.avif')) + '"><source media="(max-width:700px)" type="image/webp" srcset="' + esc(c.posterMobile) + '">' : '') + '<source type="image/avif" srcset="' + esc(c.poster.replace(/\.webp$/, '.avif')) + '"><img src="' + esc(c.poster) + '" alt="' + esc(c.name) + '完整課程海報" loading="eager" fetchpriority="high" decoding="async"></picture></a><figcaption>點開查看完整海報 <span aria-hidden="true">↗</span></figcaption></figure>' : '';
    const courseHeader = c.courseHeader ? '<picture class="course-header-art"><source media="(max-width:700px)" type="image/avif" srcset="' + esc(c.courseHeaderMobile.replace(/\.webp$/, '.avif')) + '"><source media="(max-width:700px)" type="image/webp" srcset="' + esc(c.courseHeaderMobile) + '"><source type="image/avif" srcset="' + esc(c.courseHeader.replace(/\.webp$/, '.avif')) + '"><img src="' + esc(c.courseHeader) + '" width="' + c.courseHeaderWidth + '" height="' + c.courseHeaderHeight + '" alt="Game Lab 新春故事與遊戲創作封面" loading="lazy" decoding="async"></picture>' : '';
    const couponMessage = '有效優惠券可享早鳥價再打 95 折；領取狀態請查看優惠券頁。';
    const couponEntry = `<p class="dialog-coupon-pending">${couponMessage}<a href="coupon.html?campus=${selectedCampus}&camp=${c.id}">查看優惠券 ↗</a></p>`;
    const actions = '<div class="dialog-actions"><a href="' + esc(c.registration.url) + '" ' + ext + ' class="button">' + esc(c.registration.label) + ' <span aria-hidden="true">↗</span></a></div>';
    const care = c.extendedCare;
    const pickupNotes = c.pickupLabel ? '<p>接送安排：' + esc(c.pickupLabel) + '。</p>' + (care ? '<p>超過 ' + esc(care.startsAfter) + ' 接回：' + (Number.isFinite(care.ratePerHour) ? '延托費 NT$' + esc(care.ratePerHour) + '／小時，' + esc(care.rounding) + '。' : '延托安排與費用請先由教室確認。') + esc(care.notice || '') + '</p>' : '') : '';
    const equipmentNote = c.equipmentLabel ? '<p class="dialog-equipment-note">' + esc(c.equipmentLabel) + '</p>' : '';
    const registrationNotes = '<details class="dialog-registration-notes"><summary>報名與接送說明</summary><div>' + pickupNotes + '<p>' + esc(c.registration.note) + '</p><p>' + esc(data.campaign.relationship) + '</p></div></details>';
    const registration = '<section class="course-registration" aria-labelledby="courseRegistrationTitle"><h3 id="courseRegistrationTitle">日期與報名</h3>' + factsMarkup + actions + couponEntry + registrationNotes + '</section>';
    $('#dialogContent').innerHTML = '<div class="dialog-inner course-journal' + (poster ? '' : ' course-journal--text') + '">' + poster + '<article class="dialog-course-main">' + courseHeader + '<header class="course-introduction"><p class="eyebrow">' + esc(c.daysLabel) + '</p><h2 id="dialogTitle">' + courseTitle + '</h2><p class="dialog-subtitle">' + esc(c.subtitle) + '</p><p class="dialog-description">' + esc(c.editorialIntroduction || c.description) + '</p></header>' + renderCourseJournal(c) + fullTermExtras + equipmentNote + registration + '</article></div>';
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
  let currentFaqId = data.faqGroups[0].id;
  function renderFaq(id) {
    currentFaqId = id;
    const group = data.faqGroups.find(g => g.id === id);
    $('#faqList').innerHTML = group.items.map(campusFaqItem).map(item => `<details><summary>${esc(item.question)}</summary><div class="faq-answer"><p>${esc(item.answer)}</p>${item.action ? `<a href="${esc(item.action.url)}" ${item.action.url.startsWith('https:') ? ext : ''}>${esc(item.action.label)} ↗</a>` : ''}</div></details>`).join('');
    $$('[data-faq]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.faq === id)));
  }
  $$('[data-faq]').forEach(button => button.addEventListener('click', () => renderFaq(button.dataset.faq)));
  renderFaq(data.faqGroups[0].id);
  function renderClassrooms() {
    $('#classrooms').innerHTML = data.classrooms.filter(c => selectedCampus === 'all' || c.id === selectedCampus).map(c => `<article class="classroom"><h3>${esc(c.name)}</h3><p>${esc(c.address)}</p><div class="contact-links"><a href="${esc(c.phoneHref)}">${esc(c.phone)}</a><a href="${esc(c.mapUrl)}" ${ext}>開啟地圖 ↗</a></div></article>`).join('');
  }

  // One campus selection drives every course surface without rebuilding story players.
  function campusFaqItem(item) {
    if (selectedCampus === 'all') return item;
    const camps = availableCamps(), specialties = camps.filter(c => c.id !== 'full-term');
    const twoDay = specialties.filter(c => c.days === 2);
    const fiveDay = specialties.filter(c => c.days === 5);
    const names = list => list.map(c => c.name).join('、');
    const knownSpecialties = specialties.filter(c => !/近期公布|稍後公布|待公布/.test(c.timeLabel + c.ageLabel));
    const combinations = `可先參加 1/21–1/22 的${names(twoDay)}${twoDay.length > 1 ? '其中一個營隊' : ''}，再參加 1/25–1/29 的${fiveDay.map(c => c.name).join('或')}。${fiveDay.length > 1 ? '同日期五日營請擇一參加。' : ''}特色營均與冬令營全期營日期重疊，請勿重複報名。`;
    let answer = item.answer;
    if (item.question === '全期營有包含其他特色營嗎？') answer = `沒有。冬令營全期營是「五燈獎・大聖鬧辦桌」的完整課程；${campusName()}的特色營有${names(specialties)}，各有自己的課程與報名入口。`;
    if (item.question === '2 日營有哪些主題？') answer = `${campusName()}的兩日營為${names(twoDay)}，日期皆為 2027/1/21–1/22，${twoDay.length > 1 ? '請擇一參加。' : '兩天完成自己的作品。'}`;
    if (item.question === '適合幾年級的孩子？') answer = `五燈獎全期營適合國小一年級至六年級。${knownSpecialties.map(c => `${c.name}：${c.ageLabel}。`).join('')}`;
    if (item.question === '在哪裡上課？') {
      const classroom = data.classrooms.find(c => c.id === selectedCampus);
      answer = `${classroom.name}：${classroom.address}。本教室開設冬令營全期營，以及${names(specialties)}。`;
    }
    if (item.question === '可以報名不只一個營隊嗎？') answer = combinations;
    if (item.question === '特色營的日期與費用公布了嗎？') answer = `${campusName()}的${names(twoDay)}為 2027/1/21–1/22 兩日營；${names(fiveDay)}為 2027/1/25–1/29 五日營。${specialties.map(c => `${c.name}：${c.priceLabel}。`).join('')}早鳥截止日為 2026/11/30，完整費用與上課資訊可在各營隊的課程介紹及報名表查看。`;
    if (item.question === '優惠券適用哪些營隊？') answer = `${campusName()}各營隊已公布有效 95 折券的優惠價格。領券服務仍在準備中，開放狀態與適用營隊請以優惠券頁公告為準；兩日營的報名表已可直接填寫。實際應繳金額由官方 LINE 核對。`;
    if (item.question === '可以用在不只一個營隊嗎？') answer = `同一位學員可在日期不衝堂的適用營隊追加使用，仍須符合券面期限與報名規則。${combinations}領券與追加使用的開放狀態，請查看優惠券頁公告。`;
    if (item.question === '沒有積木設計或飛行經驗，可以參加嗎？') answer = `${campusName()}各營隊會依課程內容帶領孩子練習。歡迎告訴我們孩子的年級與經驗，確認適合的課程。`;
    return { ...item, answer };
  }
  const compactChoiceNames = {
    'full-term': ['五燈獎', '大聖鬧辦桌'],
    drone: ['祥龍', '無人機派對'],
    lego: ['LEGO IDEAS', '玩具設計總監'],
    'game-lab': ['Game Lab', '遊戲設計師養成營'],
    aviation: ['「機」不可失', '飛行航空科學營'],
    fragrance: ['小小生活工藝師', '新春香氛科學營']
  };
  function choiceNameMarkup(camp) {
    const [main, subtitle] = compactChoiceNames[camp.id] || [camp.name, ''];
    return `<span class="choice-camp-name"><span class="choice-name-wide" aria-hidden="true">${esc(camp.name)}</span><span class="choice-name-compact" aria-hidden="true"><span class="choice-name-main">${esc(main)}</span><span class="choice-name-subtitle">${esc(subtitle)}</span></span></span>`;
  }
  function renderCampChoices(camps) {
    const groups = [
      { id: 'full-term', title: '全期營', camps: camps.filter(c => c.id === 'full-term') },
      { id: 'five-day', title: '5 日主題', camps: camps.filter(c => c.days === 5) },
      { id: 'two-day', title: '2 日創作', camps: camps.filter(c => c.days === 2) }
    ];
    $('#camps .camp-choice-grid').innerHTML = groups.map(group => `
      <section class="camp-choice-option" aria-labelledby="choice-${group.id}">
        <h3 class="choice-interest" id="choice-${group.id}">${group.title}</h3>
        <ol class="choice-camp-list" role="list">${group.camps.map((camp, index) => `
          <li><a class="choice-camp-link" href="#${camp.id}" aria-label="${esc(camp.name)}"><span class="choice-number" aria-hidden="true">${index + 1}</span>${choiceNameMarkup(camp)}<span class="choice-arrow" aria-hidden="true">→</span></a></li>`).join('')}
        </ol>
      </section>`).join('');
  }
  function setCampusVisibility(element, visible) {
    element.setAttribute('data-campus-hidden', '');
    element.hidden = !visible;
  }
  function applyCampus(id) {
    if (id !== 'all' && !data.classrooms.some(c => c.id === id)) return;
    selectedCampus = id;
    $$('[data-registration-link]').forEach(link => { link.href = `register.html?campus=${id}`; });
    $$('[data-coupon-link]').forEach(link => { link.href = `coupon.html?campus=${id}`; });
    const camps = availableCamps(), fiveDay = camps.filter(c => c.days === 5), twoDay = camps.filter(c => c.days === 2);
    $$('[data-campus]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.campus === id)));
    $('#campusSelectionStatus').textContent = id === 'all' ? '目前顯示全部教室的營隊' : `顯示${campusName()}的 ${camps.length} 種營隊`;
    $('.hero-location').innerHTML = esc(id === 'all' ? '台南北區・東橋' : id === 'yongkang' ? '永康東橋教室' : campusName()) + ' <span>各營隊獨立報名</span>';
    $('.hero-note').innerHTML = (id === 'yongkang' ? '玩文化、設計原創玩具、發明飛行器，' : id === 'north' ? '玩文化、設計遊戲、調出新春香氣，' : '玩文化、操控無人機、設計原創玩具，') + '<br>把寒假過成一場創作冒險。';
    ['full-term', 'drone', 'lego'].forEach(campId => {
      const camp = campById(campId), section = $('#' + campId);
      setCampusVisibility(section.closest('.culture-chapter'), campusAllows(camp));
      $('.camp-facts', section).innerHTML = `<span>${esc(camp.dateLabel)}</span><span>${esc(campClassroom(camp))}</span>`;
    });
    renderCampChoices(camps);
    $$('[data-two-day-tab]').forEach(button => setCampusVisibility(button, campusAllows(campById(button.dataset.twoDayTab))));
    $('.two-day-tabs').classList.toggle('has-one-campus-course', twoDay.length === 1);
    $('.two-day-tabs').dataset.courseCount = String(twoDay.length);
    const activeTab = $('[data-two-day-tab][aria-selected="true"]');
    selectTwoDay(twoDay.some(c => c.id === activeTab?.dataset.twoDayTab) ? activeTab.dataset.twoDayTab : twoDay[0].id);
    $('#twoDayChoiceHelp').hidden = twoDay.length === 1;
    $('.two-day-intro').textContent = twoDay.length > 1 ? `${twoDay.length === 3 ? '三' : '兩'}個不同營隊，同日期擇一參加。` : `在${campusName()}，兩天做出自己的作品。`;
    $('.two-day-schedule-note').textContent = twoDay.length > 1 ? '兩日營皆於 1/21–1/22 上課，請擇一參加；與全期營僅日期重疊，課程各自獨立。' : '本營於 1/21–1/22 上課，與冬令營全期營日期重疊，請擇一參加。';
    $$('[data-calendar-filter]').forEach(button => setCampusVisibility(button, campusAllows(campById(button.dataset.calendarFilter))));
    if (!campusAllows(campById(calendarFilter))) calendarFilter = 'full-term';
    selectedDate = null;
    $$('[data-calendar-filter]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.calendarFilter === calendarFilter)));
    renderCalendars();
    renderFaq(currentFaqId);
    renderClassrooms();
    syncScenePlayback();
  }
  $$('[data-campus]').forEach(button => button.addEventListener('click', () => applyCampus(button.dataset.campus)));
  const initialCampus = new URLSearchParams(location.search).get('campus');
  applyCampus(data.classrooms.some(c => c.id === initialCampus) ? initialCampus : 'all');
})();
