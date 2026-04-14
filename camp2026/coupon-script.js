// ========================================
//  布拉克星球 暑期營隊 95折優惠券系統
//  請將此程式碼貼到 Google Apps Script
// ========================================

const VALID_MINUTES = 60;   // 優惠券有效時間（分鐘）
const POOL_SIZE = 200;      // 優惠券總池大小

// ===== 網頁 API 入口 =====
function doGet(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch(err) {
    return respond({ success: false, error: '系統忙碌中，請稍後再試' });
  }

  try {
    cleanupExpired();
    const action = (e.parameter.action || '').toLowerCase();

    switch(action) {
      case 'status': return respond(getStatus());
      case 'claim':  return respond(claimCoupon(e.parameter.fp || ''));
      case 'verify': return respond(verifyCode(e.parameter.code || ''));
      default:       return respond({ success: false, error: '無效的操作' });
    }
  } finally {
    lock.releaseLock();
  }
}

function respond(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== 工具函數 =====
function getSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('優惠券');
}

function getSettingsSheet() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('設定');
}

function getNextNumber() {
  const ss = getSettingsSheet();
  const num = ss.getRange('B1').getValue();
  ss.getRange('B1').setValue(num + 1);
  return num;
}

function formatCode(num) {
  return 'BP-' + String(num).padStart(3, '0');
}

// ===== 清理過期優惠券 =====
function cleanupExpired() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date();
  let expiredCount = 0;

  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === '已領取' && data[i][4]) {
      const expiresAt = new Date(data[i][4]);
      if (expiresAt < now) {
        sheet.getRange(i + 1, 3).setValue('已過期');
        expiredCount++;
      }
    }
  }

  // 補回新的優惠券到池子裡
  for (let j = 0; j < expiredCount; j++) {
    const num = getNextNumber();
    const code = formatCode(num);
    sheet.appendRow([num, code, '可領取', '', '', '', '']);
  }
}

// ===== 查詢狀態 =====
function getStatus() {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  let available = 0;
  let claimed = 0;
  let used = 0;
  let expired = 0;

  for (let i = 1; i < data.length; i++) {
    const status = data[i][2];
    if (status === '可領取') available++;
    else if (status === '已領取') claimed++;
    else if (status === '已使用') used++;
    else if (status === '已過期') expired++;
  }

  return {
    success: true,
    available: available,
    claimed: claimed,
    used: used,
    expired: expired,
    total: POOL_SIZE
  };
}

// ===== 領取優惠券 =====
function claimCoupon(fingerprint) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const now = new Date();

  // 檢查此裝置是否已有有效的優惠券
  for (let i = 1; i < data.length; i++) {
    if (data[i][5] === fingerprint && data[i][2] === '已領取') {
      const expires = new Date(data[i][4]);
      if (expires > now) {
        return {
          success: true,
          alreadyClaimed: true,
          code: data[i][1],
          expiresAt: expires.toISOString(),
          discount: '95折'
        };
      }
    }
  }

  // 找到第一張可領取的優惠券
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === '可領取') {
      const expires = new Date(now.getTime() + VALID_MINUTES * 60 * 1000);
      const row = i + 1;

      sheet.getRange(row, 3).setValue('已領取');
      sheet.getRange(row, 4).setValue(now);
      sheet.getRange(row, 5).setValue(expires);
      sheet.getRange(row, 6).setValue(fingerprint);

      return {
        success: true,
        code: data[i][1],
        expiresAt: expires.toISOString(),
        discount: '95折'
      };
    }
  }

  return { success: false, error: '優惠券已全部領完！' };
}

// ===== 驗證優惠碼 =====
function verifyCode(code) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const upperCode = code.toUpperCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === upperCode) {
      const status = data[i][2];
      if (status === '已領取') {
        const expires = new Date(data[i][4]);
        if (expires > new Date()) {
          // 標記為已使用
          sheet.getRange(i + 1, 3).setValue('已使用');
          sheet.getRange(i + 1, 7).setValue(new Date());
          return { success: true, valid: true, discount: '95折', status: '✅ 優惠碼有效！已標記為使用' };
        } else {
          return { success: true, valid: false, status: '❌ 此優惠碼已過期' };
        }
      } else if (status === '已使用') {
        return { success: true, valid: false, status: '❌ 此優惠碼已被使用過' };
      } else if (status === '已過期') {
        return { success: true, valid: false, status: '❌ 此優惠碼已過期' };
      }
    }
  }

  return { success: true, valid: false, status: '❌ 查無此優惠碼' };
}

// ===== 初始化（只需執行一次）=====
function initCoupons() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 建立或清空「優惠券」工作表
  let couponSheet = ss.getSheetByName('優惠券');
  if (!couponSheet) {
    couponSheet = ss.insertSheet('優惠券');
  } else {
    couponSheet.clear();
  }

  // 建立或清空「設定」工作表
  let settingsSheet = ss.getSheetByName('設定');
  if (!settingsSheet) {
    settingsSheet = ss.insertSheet('設定');
  } else {
    settingsSheet.clear();
  }

  // 設定表頭
  couponSheet.getRange(1, 1, 1, 7).setValues([
    ['編號', '優惠碼', '狀態', '領取時間', '到期時間', '領取者', '使用時間']
  ]);
  couponSheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#F5941E').setFontColor('white');

  // 產生 200 張優惠券
  const coupons = [];
  for (let i = 1; i <= POOL_SIZE; i++) {
    coupons.push([i, formatCode(i), '可領取', '', '', '', '']);
  }
  couponSheet.getRange(2, 1, coupons.length, 7).setValues(coupons);

  // 設定下一個編號
  settingsSheet.getRange(1, 1, 1, 2).setValues([['下一個編號', POOL_SIZE + 1]]);

  // 格式化
  couponSheet.setFrozenRows(1);
  couponSheet.autoResizeColumns(1, 7);

  // 條件格式：不同狀態不同顏色
  const range = couponSheet.getRange('C2:C1000');
  const rules = couponSheet.getConditionalFormatRules();

  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('可領取').setBackground('#C8E6C9').setFontColor('#2E7D32')
    .setRanges([range]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('已領取').setBackground('#FFF3E0').setFontColor('#E65100')
    .setRanges([range]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('已使用').setBackground('#E3F2FD').setFontColor('#1565C0')
    .setRanges([range]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo('已過期').setBackground('#FFEBEE').setFontColor('#C62828')
    .setRanges([range]).build());

  couponSheet.setConditionalFormatRules(rules);

  Logger.log('✅ 初始化完成！已建立 ' + POOL_SIZE + ' 張優惠券（BP-001 ~ BP-200）');
}
