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
  const singleFrames = { lights: $('#lightsFrame'), drone: $('#droneFrame'), lego: $('#legoFrame') };
  const storyImage = (name, index) => 'assets/' + (name === 'lights' ? 'culture' : name) + '-frame-' + String(index + 1).padStart(2, '0') + '.webp' + (name === 'lights' ? '?v=home-lights-20261013' : name === 'drone' ? '?v=scope-restore-20261013' : '');
  const cultureThumbnail = index => 'assets/culture-thumb-' + String(index + 1).padStart(2, '0') + '.webp?v=home-lights-20261013';
  const duelAssets = ['assets/drone-sprites.webp', 'assets/drone-monkey.webp?v=scope-restore-20261013', 'assets/drone-arena.webp', 'assets/drone-students.webp'];
  let duelRequest;
  function preloadImage(src) {
    if (!imageRequests.has(src)) {
      const request = new Promise(resolve => {
        const image = new Image();
        image.decoding = 'async';
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
    if (!duelRequest) duelRequest = Promise.all(duelAssets.map(preloadImage)).then(() => {
      document.body.classList.add('story-assets-drone-duel');
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
  async function showSingleFrame(name, index) {
    const frame = singleFrames[name], src = storyImage(name, index);
    readyScenes.delete(name);
    sequences[name]?.sync();
    await preloadImage(src);
    // A slower earlier request must not overwrite a newer manual selection.
    if (frame.dataset.frameIndex !== String(index)) return;
    frame.style.backgroundImage = 'url("' + src + '")';
    frame.dataset.loadedFrameIndex = String(index);
    animateStoryFrame(frame);
    sceneReady(name);
  }
  async function showDuel() {
    readyScenes.delete('drone');
    sequences.drone?.sync();
    await prepareDuelAssets();
    if ($('#droneFrame').dataset.frameIndex !== '3') return;
    scenes.drone.classList.add('duel-active');
    $('#droneFrame').setAttribute('aria-hidden', 'true');
    $('.drone-arena', scenes.drone).setAttribute('aria-hidden', 'false');
    sceneReady('drone');
  }
  function loadCurrentFrame(name) {
    const index = Number(singleFrames[name].dataset.frameIndex || 0);
    const request = name === 'drone' && index === 3 ? showDuel() : showSingleFrame(name, index);
    preloadNextFrame(name, index);
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
        const label = motionPaused ? '動態效果已暫停' : playing ? pauseLabel : playLabel;
        button.innerHTML = esc(label) + ' <span aria-hidden="true">' + (playing ? 'Ⅱ' : '▷') + '</span>';
        button.setAttribute('aria-pressed', String(playing));
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
      sync();
    }
    button?.addEventListener('click', toggle);
    render(0, false);
    return { sync, select, step: direction => select((index + direction + count) % count, true) };
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
    if (speak) {
      announce(item.name + '。' + item.description);
      const detail = $('#experienceDetail');
      const rect = detail.getBoundingClientRect();
      if (matchMedia('(max-width:600px)').matches && (rect.bottom > innerHeight - 76 || rect.top < 0)) {
        detail.scrollIntoView({ block: 'nearest', behavior: motionPaused ? 'auto' : 'smooth' });
      }
    }
  }
  sequences.lights = createSequence({
    name: 'lights', count: experiences.length, dwell: 5000, render: selectLamp,
    button: $('#lightsReplay'), playLabel: '播放五燈故事', pauseLabel: '暫停五燈故事',
    onRestart: () => litLamps.clear()
  });
  $$('[data-lamp]').forEach(button => button.addEventListener('click', () => sequences.lights.select(Number(button.dataset.lamp), true)));

  const droneStages = [
    { label: '文化造型', title: '讓神話角色準備起飛', text: '從中華神話找靈感，設計自己的無人機造型。', frame: 0, alt: '小橘人學員與老師一起在工作桌設計祥龍與大聖無人機造型', learningPoints: ['文化故事與造型發想', '設計自己的無人機造型'] },
    { label: '操控練習', title: '從穩穩起飛開始', text: '認識飛行原理與平衡，和老師一起練習基礎操控。', frame: 1, alt: '小橘人學員實際操作遙控器，老師在旁引導祥龍無人機的飛行', learningPoints: ['認識飛行原理與平衡', '練習基礎操控'] },
    { label: '路線挑戰', title: '和夥伴想好下一步', text: '一起觀察目標、規劃路線，合作挑戰障礙接力。', frame: 2, alt: '小橘人學員一起查看路線圖，操控大聖造型無人機穿越目標', learningPoints: ['規劃飛行路線', '障礙接力與團隊策略'] },
    { label: '團隊對決', title: '祥龍與大聖，合作迎戰！', text: '小橘人學員操控祥龍與大聖無人機，把練習帶進團隊競賽。', frame: 3, alt: '小橘人學員在老師指導下操控祥龍與大聖球籠無人機，在球場合作競賽', learningPoints: ['把操控練習用在團隊任務', '溝通合作與競賽策略'] }
  ];
  $('#droneSteps')?.replaceChildren();
  if ($('#droneSteps')) $('#droneSteps').innerHTML = droneStages.map((stage, i) => '<button data-drone-step="' + i + '" aria-pressed="' + (i === 0) + '" aria-controls="droneFrame droneStepTitle droneStepText" aria-label="第' + (i + 1) + '步：' + esc(stage.title) + '">' + esc(stage.label) + '</button>').join('');
  function setDroneStep(index, speak = false) {
    const stage = droneStages[index], duel = index === 3;
    // Keep the previous illustration visible until a newly selected duel is decoded.
    if (!duel) scenes.drone.classList.remove('duel-active');
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
    { label: '發想', title: '從故事找靈感', text: '觀察文化的形狀，把想像裝進腦袋。', alt: '小橘人學員和黃色紅髮、炭灰藍髮黃眼鏡兩位老師一起觀察故事書與祥龍模型', learningPoints: ['從中華故事找靈感', '觀察與文化發想'] },
    { label: '畫稿', title: '把點子畫下來', text: '一筆一畫，讓自己的原創設計成形。', alt: '小橘人學員在草稿本畫祥龍玩具，黃色紅髮與炭灰藍髮老師在旁指導', learningPoints: ['畫出自己的原創設計', '把想法轉為設計草圖'] },
    { label: '3D設計', title: '讓設計立體起來', text: '使用 3D 軟體，把草圖變成立體作品。', alt: '小橘人學員操作滑鼠與鍵盤，兩位老師引導建立祥龍的3D積木模型', learningPoints: ['使用 3D 設計軟體', '把草圖轉成 3D 作品'] },
    { label: '圖解', title: '把做法分享出去', text: '製作步驟圖與說明書，讓別人也能看懂。', alt: '小橘人學員閱讀印出的積木組裝圖解，黃色紅髮與炭灰藍髮老師在旁協助', learningPoints: ['製作組裝步驟圖', '整理作品說明書'] },
    { label: '包裝', title: '設計自己的盒組', text: '圖解、模型與包裝，慢慢成為完整作品。', alt: '小橘人學員使用膠帶準備包裝，兩位老師引導製作原創祥龍玩具盒', learningPoints: ['設計作品包裝', '整合圖解、模型與盒組'] },
    { label: '完成！', title: '這是我設計的！', text: '捧著自己的原創盒組，開心分享創作成果。', alt: '小橘人學員展示完成的祥龍積木玩具與原創盒組，黃色紅髮與炭灰藍髮黃眼鏡兩位老師一起鼓勵', learningPoints: ['完成自己的原創盒組', '分享創作成果'] }
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
    }), { rootMargin: '800px 0px', threshold: 0 });
    const playbackObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      const name = entry.target.dataset.motionScene;
      if (entry.isIntersecting) {
        visibleScenes.add(name);
        prepareSceneAssets(name);
      } else visibleScenes.delete(name);
      sequences[name]?.sync();
    }), { threshold: 0 });
    Object.values(scenes).forEach(scene => { assetObserver.observe(scene); playbackObserver.observe(scene); });
  } else {
    Object.keys(scenes).forEach(name => { visibleScenes.add(name); prepareSceneAssets(name); });
  }
  syncMotion();


  // The calendar highlights only confirmed dates. No inferred daily timetable.
  const confirmedCalendarDates = [...new Set(data.camps.flatMap(c => c.dates))].sort();
  let calendarFilter = 'all', selectedDate = null;
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
    const overlaps = camps.some((camp, index) => camps.slice(index + 1).some(other => camp.dates.some(date => other.dates.includes(date))));
    $('#calendarDetail').innerHTML = '<p class="calendar-summary-label">完整營隊日期</p>' + camps.map(c => {
      const periods = c.dateLabel.split('、');
      const enrolment = c.id === 'full-term' ? '共 9 天，全期報名' : '共 ' + c.days + ' 天，完整營期';
      const time = c.timeLabel.includes('近期公布') ? '' : '<p class="calendar-program-time">每日 ' + esc(c.timeLabel) + '</p>';
      const parentEvent = c.parentEvent ? '<p class="calendar-parent-event">' + esc(c.parentEvent.timeLabel) + '：' + esc(c.parentEvent.name) + '，家長出席與費用另行統計。</p>' : '';
      return '<article class="calendar-course"><h3>' + esc(c.name) + '</h3><p class="calendar-enrolment">' + esc(enrolment) + '</p><ul class="calendar-periods" aria-label="' + esc(c.name) + '完整上課日期">' + periods.map(period => '<li>' + esc(period) + '</li>').join('') + '</ul>' + time + parentEvent + '<button data-camp="' + esc(c.id) + '">查看完整課程與報名 →</button></article>';
    }).join('') + (overlaps ? '<p class="calendar-note">兩個完整營期部分日期重疊，報名前請確認安排。</p>' : '');
  }
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
  let courseStoryController = null;
  function courseStory(camp) {
    if (camp.id === 'full-term') {
      return experiences.map(item => ({
        title: item.name, text: item.description, learningPoints: item.learningPoints || item.bullets,
        frame: cultureFrame(item), className: 'culture-frame',
        alt: '大聖老師與小橘人學員參與' + item.name + '的活動場景'
      })).concat([{
        title: '辦桌成果分享', text: '一起策劃辦桌，分享文化探索與手作成果。',
        learningPoints: ['呈現文化探索與合作成果', '家長參與及費用另行統計'],
        frame: 5, className: 'culture-frame', alt: '大聖老師陪伴小橘人學員圍坐圓桌，開心分享共同完成的辦桌成果'
      }]);
    }
    if (camp.id === 'drone') {
      const titles = ['設計無人機造型', '練習飛行操控', '規劃路線與障礙接力', '組隊進行飛行對決'];
      return droneStages.map((stage, index) => ({ ...stage, title: titles[index], className: 'drone-frame' })).concat([
        { title: '認識檢查與維修', text: '練習問題判斷，認識無人機的基礎維修與維護。', learningPoints: ['問題判斷與排障', '基礎維修與維護'], frame: 4, className: 'drone-frame', alt: '老師與小橘人學員圍著工作桌，觀察無人機零件並練習檢查維護' },
        { title: '分享設計與飛行成果', text: '回顧文化造型創作、操控練習與團隊任務中的收穫。', learningPoints: ['分享文化造型創作', '回顧飛行與團隊體驗'], frame: 5, className: 'drone-frame', alt: '小橘人學員與老師一起展示祥龍與大聖無人機造型與設計作品' }
      ]);
    }
    if (camp.id === 'lego') return legoStages.map((stage, index) => ({ ...stage, frame: index, className: 'lego-frame' }));
    return [];
  }
  function renderStoryGallery(story) {
    if (!story.length) return '';
    const first = story[0];
    return '<div class="course-story-carousel" role="region" aria-roledescription="輪播" aria-label="孩子的活動體驗" tabindex="0" data-story-active="0"><figure class="course-story-slide" id="courseStorySlide"><img class="course-story-image" src="' + courseStoryImage(first) + '" alt="' + esc(first.alt) + '" width="1254" height="1254" loading="eager" decoding="async" draggable="false" data-frame-index="' + first.frame + '"><figcaption><h4>' + esc(first.title) + '</h4><p>' + esc(first.text) + '</p></figcaption></figure><div class="course-story-controls"><button type="button" data-story-prev aria-label="上一個活動" aria-controls="courseStorySlide"><span aria-hidden="true">←</span></button><div class="course-story-dots">' + story.map((stage, index) => '<button type="button" class="course-story-dot" data-story-index="' + index + '" aria-label="查看' + esc(stage.title) + '" aria-controls="courseStorySlide" aria-pressed="' + (index === 0) + '"></button>').join('') + '</div><button type="button" data-story-next aria-label="下一個活動" aria-controls="courseStorySlide"><span aria-hidden="true">→</span></button></div><p class="course-story-status sr-only" aria-live="polite" aria-atomic="true"></p></div>';
  }
  function courseStoryImage(stage) {
    const name = stage.className === 'culture-frame' ? 'lights' : stage.className === 'drone-frame' ? 'drone' : 'lego';
    return storyImage(name, stage.frame);
  }
  function mountCourseStory(story) {
    courseStoryController?.abort();
    courseStoryController = null;
    const carousel = $('.course-story-carousel', campDialog);
    if (!carousel || !story.length) return;
    const controller = new AbortController();
    courseStoryController = controller;
    const { signal } = controller;
    const slide = $('.course-story-slide', carousel), image = $('.course-story-image', carousel);
    const title = $('figcaption h4', slide), caption = $('figcaption p', slide), status = $('.course-story-status', carousel);
    let requestedIndex = 0, requestToken = 0, pointerStart = null;
    async function show(index, speak = true) {
      requestedIndex = (index + story.length) % story.length;
      const nextIndex = requestedIndex, stage = story[nextIndex], token = ++requestToken;
      carousel.setAttribute('aria-busy', 'true');
      const loaded = await preloadImage(courseStoryImage(stage));
      if (signal.aborted || token !== requestToken || !campDialog.open) return;
      carousel.setAttribute('aria-busy', 'false');
      if (!loaded) { status.textContent = '圖片暫時無法載入，請再選一次活動。'; return; }
      // Keep the image and its caption together until the chosen image is decoded.
      image.src = courseStoryImage(stage);
      image.alt = stage.alt;
      image.dataset.frameIndex = String(stage.frame);
      title.textContent = stage.title;
      caption.textContent = stage.text;
      carousel.dataset.storyActive = String(nextIndex);
      $$('[data-story-index]', carousel).forEach(dot => dot.setAttribute('aria-pressed', String(Number(dot.dataset.storyIndex) === nextIndex)));
      if (speak) status.textContent = stage.title + '，第 ' + (nextIndex + 1) + ' 張，共 ' + story.length + ' 張。';
      preloadImage(courseStoryImage(story[(nextIndex + 1) % story.length]));
    }
    $('[data-story-prev]', carousel).addEventListener('click', () => show(requestedIndex - 1), { signal });
    $('[data-story-next]', carousel).addEventListener('click', () => show(requestedIndex + 1), { signal });
    $$('[data-story-index]', carousel).forEach(dot => dot.addEventListener('click', () => show(Number(dot.dataset.storyIndex)), { signal }));
    carousel.addEventListener('keydown', event => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
      event.preventDefault();
      show(requestedIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }, { signal });
    slide.addEventListener('pointerdown', event => {
      if (!event.isPrimary || (event.pointerType !== 'touch' && event.pointerType !== 'pen')) return;
      pointerStart = { id: event.pointerId, x: event.clientX, y: event.clientY };
      slide.setPointerCapture(event.pointerId);
    }, { signal });
    slide.addEventListener('pointerup', event => {
      if (!pointerStart || pointerStart.id !== event.pointerId) return;
      const dx = event.clientX - pointerStart.x, dy = event.clientY - pointerStart.y;
      pointerStart = null;
      if (Math.abs(dx) >= 44 && Math.abs(dx) > Math.abs(dy) * 1.3) show(requestedIndex + (dx < 0 ? 1 : -1));
    }, { signal });
    slide.addEventListener('pointercancel', () => { pointerStart = null; }, { signal });
    show(0, false);
  }
  function openCamp(id, trigger) {
    const c = campById(id); if (!c) return;
    lastDialogTrigger = trigger;
    const facts = id === 'full-term'
      ? [['dates', '課程日期', c.dateLabel], ['age', '適合對象', c.ageLabel], ['time', '每日時間', c.timeLabel], ['classroom', '上課教室', c.classroomLabel], ['price', '課程費用', c.priceLabel]]
      : [['dates', '課程日期', c.dateLabel], ['price', '課程費用', c.priceLabel]];
    const factsMarkup = '<div class="dialog-facts">' + facts.map(([key, label, value]) => '<div data-fact="' + key + '"><span>' + esc(label) + '</span>' + esc(value) + (key === 'price' && c.pricing ? '<p class="dialog-price-note">' + esc(c.priceNote).replace('，原價', '，<br>原價') + '</p>' : '') + '</div>').join('') + '</div>' + (id === 'full-term' ? '' : '<p class="dialog-unknown-note">年齡、上課時段與教室將另行公布。</p>');
    const fullTermExtras = id === 'full-term' ? '<h3>9 天的文化旅程</h3><ul class="period-list">' + data.itinerary.periods.map(p => '<li><small>' + esc(p.dateLabel) + ' · ' + p.days + ' 天</small><h4>' + esc(p.title) + '</h4><p>' + esc(p.description) + '</p></li>').join('') + '</ul><p class="dialog-note">' + esc(data.itinerary.note) + '</p><div class="dialog-event"><h4>2/2 晚上，邀請爸媽來作客。</h4><p>' + esc(c.parentEvent.description) + '<br>' + esc(c.parentEvent.note) + '</p></div>' : '';
    const story = courseStory(c);
    const activities = story.length
      ? '<h3>孩子會怎麼參與？</h3>' + renderStoryGallery(story)
      : c.activities.length ? '<h3>孩子會經歷什麼？</h3><div class="activity-list">' + c.activities.map(a => '<div><h4>' + esc(a.title) + '</h4><p>' + esc(a.description) + '</p></div>').join('') + '</div>' : '';
    const poster = c.poster ? '<figure class="dialog-poster"><a href="' + esc(c.poster) + '" ' + ext + ' aria-label="開啟' + esc(c.name) + '完整海報"><img src="' + esc(c.poster) + '" alt="' + esc(c.name) + '完整課程海報" decoding="async"></a><figcaption>點開查看完整海報 ↗</figcaption></figure>' : '';
    const couponEntry = '<a href="coupon.html" class="camp-coupon-entry"><img class="camp-coupon-entry__logo" src="assets/brand-logo.png" width="32" height="32" alt="" loading="lazy" decoding="async"><span class="camp-coupon-entry__copy"><strong>冬令營優惠券</strong><span>10/15 開放・限量 60 張</span></span><span class="camp-coupon-entry__cta">查看領券資訊 <span aria-hidden="true">↗</span></span></a>';
    const actions = '<div class="dialog-actions"><a href="' + esc(c.registration.url) + '" ' + ext + ' class="button">' + esc(c.registration.label) + ' <span aria-hidden="true">↗</span></a></div>';
    const care = c.extendedCare;
    const pickupNotes = id === 'full-term' ? '<p>接送安排：' + esc(c.pickupLabel) + '。</p>' + (care ? '<p>超過 ' + esc(care.startsAfter) + ' 接回：延托費 NT$' + esc(care.ratePerHour) + '／小時，' + esc(care.rounding) + '。' + esc(care.notice) + '</p>' : '') : '';
    const registrationNotes = '<details class="dialog-registration-notes"><summary>報名與接送說明</summary><div>' + pickupNotes + '<p>' + esc(c.registration.note) + '</p><p>' + esc(data.campaign.relationship) + '</p></div></details>';
    $('#dialogContent').innerHTML = '<div class="dialog-inner"><p class="eyebrow">' + esc(c.daysLabel) + '</p><h2 id="dialogTitle">' + esc(c.name) + '</h2><p class="dialog-subtitle">' + esc(c.subtitle) + '</p><div class="dialog-course-layout"><div class="dialog-course-main"><p class="dialog-description">' + esc(c.description) + '</p>' + factsMarkup + activities + fullTermExtras + actions + couponEntry + registrationNotes + '</div>' + poster + '</div></div>';
    dialogIsOpen = true; syncScenePlayback();
    if (!campDialog.open) {
      pageOverflowBeforeDialog = document.body.style.overflow;
      campDialog.showModal();
    }
    campDialog.scrollTop = 0; document.body.style.overflow = 'hidden'; $('#dialogClose').focus();
    mountCourseStory(story);
  }
  document.addEventListener('click', event => { const trigger = event.target.closest('[data-camp]'); if (trigger) openCamp(trigger.dataset.camp, trigger); });
  $('#dialogClose').addEventListener('click', () => campDialog.close());
  campDialog.addEventListener('click', event => {
    if (event.target !== campDialog) return;
    const r = campDialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) campDialog.close();
  });
  campDialog.addEventListener('close', () => {
    courseStoryController?.abort();
    courseStoryController = null;
    document.body.style.overflow = pageOverflowBeforeDialog;
    dialogIsOpen = false; syncScenePlayback();
    lastDialogTrigger?.focus();
  });


  $('#faqCategories').innerHTML = data.faqGroups.map((group, i) => `<button data-faq="${esc(group.id)}" aria-pressed="${i === 0}" aria-controls="faqList">${esc(group.label)}</button>`).join('');
  function renderFaq(id) {
    const group = data.faqGroups.find(g => g.id === id);
    $('#faqList').innerHTML = group.items.map(item => `<details><summary>${esc(item.question)}</summary><div class="faq-answer"><p>${esc(item.answer)}</p>${item.action ? `<a href="${esc(item.action.url)}" ${item.action.url.startsWith('https:') ? ext : ''}>${esc(item.action.label)} ↗</a>` : ''}</div></details>`).join('');
    $$('[data-faq]').forEach(el => el.setAttribute('aria-pressed', String(el.dataset.faq === id)));
  }
  $$('[data-faq]').forEach(button => button.addEventListener('click', () => renderFaq(button.dataset.faq)));
  renderFaq(data.faqGroups[0].id);
  $('#classrooms').innerHTML = data.classrooms.map(c => `<article class="classroom"><h3>${esc(c.name)}</h3><p>${esc(c.address)}</p><div class="contact-links"><a href="${esc(c.phoneHref)}">${esc(c.phone)}</a><a href="${esc(c.mapUrl)}" ${ext}>開啟地圖 ↗</a></div></article>`).join('');
})();
