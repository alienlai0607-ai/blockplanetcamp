/* 2027 production coupon configuration. Server enforces the opening time.
 * No admin credentials belong in this public file. Never use the 2026 coupon pool.
 */
window.CAMPAIGN_COUPON = Object.freeze({
  campaignId: '2027C',
  enabled: true,
  rulesConfirmed: true,
  backendReady: true,
  openingDate: '2026-10-16',
  opensAt: '2026-10-16T19:30:00+08:00', // Confirmed Taiwan opening time; server opening gate remains enforced.
  apiUrl: 'https://script.google.com/macros/s/AKfycbw0seQA-F9j2TzTKO6ylWA8XdbF_51uKAsXxF4iZP26pj4eAo6stAXdO4R15uVClHc-/exec',
  requestTimeoutMs: 15000,
  initialPoolSize: 60,
  discountLabel: '95 折',
  validMinutes: 60,
  eligibleCamps: ['五燈獎・大聖鬧辦桌', '祥龍飛行派對', 'LEGO IDEAS 玩具設計總監'],
  registrationCamps: [
    {id: 'full-term', name: '五燈獎・大聖鬧辦桌', description: '9 日全期營・早鳥優惠券價 NT$11,400', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform'},
    {id: 'drone', name: '祥龍飛行派對', description: '5 日特色營・雲端報名表', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeEDR0yX9Q5__UJq0HIXpTm71_tHfoSa_dmJab6LX535jI94w/viewform'},
    {id: 'lego', name: 'LEGO IDEAS 玩具設計總監', description: '5 日特色營・雲端報名表', url: 'https://docs.google.com/forms/d/e/1FAIpQLSdH_h8GOVi9iSzJk2kjqdwXfRWkLC-gXRc_keDiIu4dk5XDKA/viewform'},
  ],
  publicCouponUrl: 'https://blockplanetcamp.com/camp2027/coupon.html',
  homeUrl: 'index.html',
  campsUrl: 'index.html#camps',
  lineUrl: 'https://lin.ee/zFqqFzQ',
  storagePrefix: 'bp_2027c_coupon',
});
