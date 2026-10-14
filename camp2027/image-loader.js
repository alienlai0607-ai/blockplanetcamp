(() => {
  'use strict';
  // Keep decoded images reusable and let a selected frame jump ahead of prefetches.
  const requests = new Map(), queue = [];
  let warming = 0;
  const responsive = /^assets\/(?:culture-frame-0[1-5]|drone-frame-0[1-3]|lego-frame-0[1-6]|drone-(?:sprites|monkey|arena|students))\.webp(?:\?|$)/;
  function pump() {
    while (warming < 2 && queue.length) {
      const entry = queue.shift();
      if (entry.started) continue;
      warming++;
      entry.background = true;
      entry.start();
    }
  }
  function preload(src, priority = 'low') {
    let entry = requests.get(src);
    if (!entry) {
      const image = new Image();
      let resolve;
      entry = { image, started: false, status: 'queued', promise: new Promise(done => { resolve = done; }) };
      requests.set(src, entry);
      image.decoding = 'async';
      image.fetchPriority = priority;
      const finish = loaded => {
        if (entry.settled) return;
        entry.settled = true;
        entry.status = loaded ? 'ready' : 'error';
        if (!loaded) requests.delete(src);
        if (entry.background) warming--;
        resolve(loaded);
        pump();
      };
      image.onload = async () => {
        try { await image.decode?.(); finish(true); }
        catch { image.onerror(); }
      };
      image.onerror = () => {
        if (entry.settled) return;
        // An unavailable optimized asset must not leave the story stuck.
        if (entry.picture) {
          entry.picture.replaceChildren();
          entry.picture = null;
          image.removeAttribute('srcset');
          image.src = src;
        } else finish(false);
      };
      entry.start = () => {
        if (entry.started) return;
        entry.started = true;
        entry.status = 'loading';
        if (responsive.test(src)) {
          const base = src.split('.webp')[0];
          const picture = document.createElement('picture');
          const mobile = document.createElement('source');
          mobile.type = 'image/avif';
          mobile.media = '(max-width:700px)';
          mobile.srcset = base + '-mobile.avif';
          const desktop = document.createElement('source');
          desktop.type = 'image/avif';
          desktop.srcset = base + '.avif';
          const fallback = document.createElement('source');
          fallback.media = '(max-width:700px)';
          fallback.srcset = base + '-mobile.webp';
          picture.append(mobile, desktop, fallback, image);
          entry.picture = picture;
        }
        image.src = src;
      };
      if (priority === 'high') entry.start();
      else { queue.push(entry); pump(); }
    } else if (priority === 'high') {
      entry.image.fetchPriority = 'high';
      entry.start();
    }
    return entry.promise;
  }
  window.CampImages = {
    preload,
    source: src => requests.get(src)?.image.currentSrc || src
  };
})();
