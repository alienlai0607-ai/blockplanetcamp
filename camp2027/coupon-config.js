/* The public opening matches the verified 2027 server setting.
 * Two-day camps remain informational until their prices and forms are ready.
 */
window.CAMPAIGN_COUPON = Object.freeze({
  campaignId: '2027C',
  enabled: true,
  releaseStatus: 'scheduled',
  rulesConfirmed: true,
  backendReady: true,
  openingDate: '2026-10-20',
  opensAt: '2026-10-20T19:00:00+08:00',
  apiUrl: 'https://script.google.com/macros/s/AKfycbw0seQA-F9j2TzTKO6ylWA8XdbF_51uKAsXxF4iZP26pj4eAo6stAXdO4R15uVClHc-/exec',
  requestTimeoutMs: 15000,
  initialPoolSize: 60,
  discountLabel: '95 折',
  validMinutes: 60,
  eligibleCamps: ['五燈獎・大聖鬧辦桌', '祥龍無人機派對', 'LEGO IDEAS 玩具設計總監'],
  plannedEligibleCamps: ['Game Lab｜遊戲設計師養成營', '「機」不可失｜飛行航空科學營', '小小生活工藝師｜新春香氛科學營'],
  registrationCamps: [
    {id: 'full-term', classroomIds: ['north', 'yongkang'], name: '五燈獎・大聖鬧辦桌', description: '冬令營全期營・2027/1/21–2/2・東橋教室／北區教室・雲端報名表', kind: 'form', url: 'https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform'},
    {id: 'drone', classroomIds: ['north'], name: '祥龍無人機派對', description: '5 日特色營・1/25–1/29・北區教室・雲端報名表', kind: 'form', url: 'https://docs.google.com/forms/d/e/1FAIpQLSeEDR0yX9Q5__UJq0HIXpTm71_tHfoSa_dmJab6LX535jI94w/viewform'},
    {id: 'lego', classroomIds: ['north', 'yongkang'], name: 'LEGO IDEAS 玩具設計總監', description: '5 日特色營・1/25–1/29・東橋教室／北區教室・雲端報名表', kind: 'form', sessionDates: ['2027-01-25', '2027-01-26', '2027-01-27', '2027-01-28', '2027-01-29'], url: 'https://docs.google.com/forms/d/e/1FAIpQLSdH_h8GOVi9iSzJk2kjqdwXfRWkLC-gXRc_keDiIu4dk5XDKA/viewform'},
    {id: 'game-lab', classroomIds: ['north'], name: 'Game Lab｜遊戲設計師養成營', description: '2 日營・1/21–1/22・北區教室・報名表準備中，LINE 洽詢', kind: 'line', sessionDates: ['2027-01-21', '2027-01-22'], url: 'https://lin.ee/zFqqFzQ'},
    {id: 'aviation', classroomIds: ['yongkang'], name: '「機」不可失｜飛行航空科學營', description: '2 日營・1/21–1/22・東橋教室・報名表準備中，LINE 洽詢', kind: 'line', sessionDates: ['2027-01-21', '2027-01-22'], url: 'https://lin.ee/zFqqFzQ'},
    {id: 'fragrance', classroomIds: ['north'], name: '小小生活工藝師｜新春香氛科學營', description: '2 日營・1/21–1/22・北區教室・報名表準備中，LINE 洽詢', kind: 'line', sessionDates: ['2027-01-21', '2027-01-22'], url: 'https://lin.ee/zFqqFzQ'},
  ],
  publicCouponUrl: 'https://blockplanetcamp.com/camp2027/coupon.html',
  homeUrl: 'index.html',
  campsUrl: 'index.html#camps',
  lineUrl: 'https://lin.ee/zFqqFzQ',
  storagePrefix: 'bp_2027c_coupon',
});
