(() => {
  'use strict';

  const data = window.CAMP_DATA;
  const list = document.getElementById('registrationList');
  const count = document.getElementById('campCount');
  const filters = [...document.querySelectorAll('[data-campus]')];
  const campusIds = new Set(['all', 'north', 'yongkang']);
  const requestedCampus = new URLSearchParams(location.search).get('campus');
  let campus = campusIds.has(requestedCampus) ? requestedCampus : 'all';
  const coupon = window.CAMPAIGN_COUPON;
  document.getElementById('registrationCouponTitle').textContent = `冬令營 ${coupon?.discountLabel || '95 折'}優惠券`;
  document.getElementById('registrationCouponStatus').textContent = couponOpeningLabel(coupon);

  function couponOpeningLabel(config) {
    if (!config || config.releaseStatus === 'postponed' || !config.opensAt) return '開放時間另行公告';
    const opening = new Date(config.opensAt);
    if (!Number.isFinite(opening.getTime())) return '開放時間另行公告';
    const parts = new Intl.DateTimeFormat('zh-TW', {
      timeZone: 'Asia/Taipei', month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit', hourCycle: 'h23'
    }).formatToParts(opening);
    const part = type => parts.find(item => item.type === type)?.value || '';
    const hour = Number(part('hour'));
    const period = hour >= 18 ? '晚上' : hour >= 12 ? '下午' : hour >= 6 ? '上午' : '凌晨';
    return `${part('month')}/${part('day')} ${period}${hour % 12 || 12}:${part('minute')} 開放`;
  }

  if (!data || !Array.isArray(data.camps)) {
    count.textContent = '營隊資料暫時無法載入，請重新整理。';
    return;
  }

  function textElement(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }

  function formUrlFor(camp) {
    if (data.campaign.pricingReady === false || camp.registration?.kind !== 'form') return null;
    try {
      const url = new URL(camp.registration.url);
      if (url.protocol !== 'https:') return null;
      const isPublishedForm = url.hostname === 'docs.google.com' && /^\/forms\/d\/e\/[^/]+\/viewform\/?$/.test(url.pathname);
      const isShortForm = url.hostname === 'forms.gle' && /^\/[A-Za-z0-9]+\/?$/.test(url.pathname);
      return isPublishedForm || isShortForm ? url.href : null;
    } catch {
      return null;
    }
  }

  function homeUrl(anchor = '') {
    return `index.html?campus=${campus}${anchor ? `#${encodeURIComponent(anchor)}` : ''}`;
  }

  function classroomLabel(camp) {
    const ids = campus === 'all' ? camp.classroomIds : [campus];
    return ids.map(id => id === 'yongkang' ? '永康東橋教室' : data.classrooms.find(item => item.id === id)?.name || '').filter(Boolean).join('／');
  }

  function makeCard(camp) {
    const card = document.createElement('article');
    card.className = 'registration-card';
    card.dataset.campId = camp.id;
    card.setAttribute('aria-labelledby', `register-title-${camp.id}`);

    const heading = document.createElement('div');
    heading.className = 'camp-heading';
    const title = textElement('h2', '', camp.name);
    title.id = `register-title-${camp.id}`;
    heading.append(title, textElement('p', 'camp-subtitle', camp.subtitle));

    const meta = document.createElement('div');
    meta.className = 'camp-meta';
    meta.append(textElement('p', 'camp-date', camp.dateLabel), textElement('p', 'camp-classroom', classroomLabel(camp)));

    const actions = document.createElement('div');
    actions.className = 'camp-actions';
    const introduction = textElement('a', 'camp-action', '課程介紹');
    introduction.href = homeUrl(camp.id);
    introduction.setAttribute('aria-label', `${camp.name}，課程介紹`);
    actions.append(introduction);

    const couponLink = textElement('a', 'camp-action camp-action-coupon', '領取優惠券');
    couponLink.href = `coupon.html?campus=${campus}&camp=${encodeURIComponent(camp.id)}`;
    couponLink.setAttribute('aria-label', `${camp.name}，領取優惠券`);
    actions.append(couponLink);

    const url = formUrlFor(camp);
    if (url) {
      const registration = textElement('a', 'camp-action camp-action-primary', '直接報名');
      registration.href = url;
      registration.target = '_blank';
      registration.rel = 'noopener noreferrer';
      registration.setAttribute('aria-label', `${camp.name}，直接報名，另開 Google 表單`);
      const arrow = textElement('span', '', '↗');
      arrow.setAttribute('aria-hidden', 'true');
      registration.append(arrow);
      actions.append(registration);
    } else {
      const pendingLabel = data.campaign.pricingReady === false ? '費用確認中' : '報名表準備中';
      const pending = textElement('button', 'camp-action', pendingLabel);
      pending.type = 'button';
      pending.disabled = true;
      pending.setAttribute('aria-label', `${camp.name}，${pendingLabel}`);
      actions.append(pending);
    }

    card.append(heading, meta, actions);
    return card;
  }

  function render() {
    const camps = data.camps.filter(camp => campus === 'all' || camp.classroomIds.includes(campus));
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.campus === campus)));
    document.querySelectorAll('[data-home-link]').forEach(link => { link.href = homeUrl(); });
    document.querySelectorAll('[data-coupon-link]').forEach(link => { link.href = `coupon.html?campus=${campus}`; });
    list.replaceChildren(...camps.map(makeCard));
    count.textContent = `${camps.length} 個營隊`;
  }

  filters.forEach(button => {
    button.addEventListener('click', () => {
      campus = button.dataset.campus;
      const url = new URL(location.href);
      url.searchParams.set('campus', campus);
      history.replaceState(null, '', url);
      render();
    });
  });

  render();
})();
