/* 2027C 優惠券設定。確認正式活動及共用後端後，才可開啟 enabled。
 * 保留原 action=status / action=claim API 合約；不在前端重寫計價規則。
 * 此檔不能放入管理密碼或任何私密金鑰。
 */
window.CAMPAIGN_COUPON = Object.freeze({
  campaignId: '2027C',
  enabled: false,
  rulesConfirmed: false,
  backendReady: false, // 須先完成獨立2027年度券池及表單觸發器，不能使用暑期active pool
  opensAt: '2026-10-15T00:00:00+08:00', // 使用者已確認10/15；未指定時刻，暫定台灣00:00
  initialPoolSize: 60, // 使用者已確認；僅為活動公告，實際剩餘量仍讀API
  legacyApiUrl: 'https://script.google.com/macros/s/AKfycbzgP4w_VtsepL0QBLcTu5xjNBKRoLT5-yAcYLgRtbDvSIkZ8oXtVMck9Bt3KU9vwuxG/exec', // 保留來源：camp2026/coupon.html，不呼叫此暑期池
  apiUrl: '', // 年度部署完成後由實作者填入產生的URL；不要求家長/使用者提供工程資訊
  publicCouponUrl: 'https://blockplanetcamp.com/2027C/coupon.html', // 預定發布路徑；目前未發布
  discountLabel: '95 折', // 保留既有優惠規則；2027活動確認後才對外顯示
  validMinutes: 60,
  eligibleCamps: [], // 必填2027可使用的營隊名稱；不能複製2026清單
  excludedCamps: [],
  homeUrl: 'index.html',
  campsUrl: 'index.html#camps',
  lineUrl: 'https://lin.ee/zFqqFzQ',
  storagePrefix: 'bp_2027c_coupon', // 不讀、不清除2026的 bp_coupon_* 儲存
});
