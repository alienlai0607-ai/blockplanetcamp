// ========================================
//  布拉克星球 暑期營隊 95折優惠券系統
//  請將此程式碼貼到 Google Apps Script
// ========================================

const VALID_MINUTES = 60;   // 優惠券有效時間（分鐘）
const POOL_SIZE = 60;       // 優惠券總池大小

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
      case 'claim':  return respond(claimCoupon(e.parameter.fp || '', e.parameter.phone || ''));
      case 'verify': return respond(verifyCode(e.parameter.code || ''));
      case 'lookup': return respond(lookupByPhone(e.parameter.phone || ''));
      case 'addmore':
        if (e.parameter.key !== 'bp2026admin') return respond({ success: false, error: '權限不足' });
        return respond(addMoreCoupons(parseInt(e.parameter.count) || 0));
      // close 保留但不常用，過期會自動處理
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
  // 產生隨機 4 碼英數字（不含易混淆字元 0OIl1）
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let rand = '';
  for (let i = 0; i < 4; i++) {
    rand += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return 'BP-' + rand;
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
    sheet.appendRow([num, code, '可領取', '', '', '', '', '']);
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
    total: available + claimed
  };
}

// ===== 領取優惠券 =====
function claimCoupon(fingerprint, phone) {
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
          phone: data[i][6],
          discount: '95折'
        };
      }
    }
  }

  // 檢查此手機號碼是否已有有效的優惠券（直接回傳已領的券）
  if (phone) {
    const cleanPhone = fixPhone(phone);
    for (let i = 1; i < data.length; i++) {
      if (fixPhone(data[i][6]) === cleanPhone && data[i][2] === '已領取') {
        const expires = new Date(data[i][4]);
        if (expires > now) {
          return {
            success: false,
            existingCode: data[i][1],
            expiresAt: expires.toISOString(),
            phone: data[i][6],
            discount: '95折',
            message: '此手機已領取過，為您顯示已領的優惠碼'
          };
        }
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
      sheet.getRange(row, 7).setValue(phone || '');

      return {
        success: true,
        code: data[i][1],
        expiresAt: expires.toISOString(),
        phone: phone,
        discount: '95折'
      };
    }
  }

  return { success: false, error: '優惠券已全部領完！' };
}

// ===== 驗證優惠碼（只查詢，不改狀態）=====
function verifyCode(code) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const upperCode = code.toUpperCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === upperCode) {
      const status = data[i][2];
      const phone = data[i][6] || '';
      const claimedAt = data[i][3] ? new Date(data[i][3]).toLocaleString('zh-TW') : '';
      const expiresAt = data[i][4] ? new Date(data[i][4]).toLocaleString('zh-TW') : '';

      if (status === '已領取') {
        const expires = new Date(data[i][4]);
        // 給 10 分鐘的緩衝（防止剛好過期幾分鐘）
        const buffer = new Date(expires.getTime() + 10 * 60 * 1000);
        if (buffer > new Date()) {
          return { success: true, valid: true, discount: '95折', status: '✅ 優惠碼有效', phone: phone, claimedAt: claimedAt, expiresAt: expiresAt };
        } else {
          return { success: true, valid: false, status: '❌ 此優惠碼已過期', phone: phone };
        }
      } else if (status === '已使用') {
        return { success: true, valid: true, discount: '95折', status: '✅ 已使用（報名中）', phone: phone, claimedAt: claimedAt, expiresAt: expiresAt };
      } else if (status === '已過期') {
        return { success: true, valid: false, status: '❌ 此優惠碼已過期', phone: phone };
      } else if (status === '可領取') {
        return { success: true, valid: false, status: '❌ 此優惠碼尚未被領取' };
      }
    }
  }

  return { success: true, valid: false, status: '❌ 查無此優惠碼' };
}

// ===== 結案優惠碼（管理員手動關閉）=====
function closeCoupon(code) {
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();
  const upperCode = code.toUpperCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === upperCode && data[i][2] === '已領取') {
      sheet.getRange(i + 1, 3).setValue('已使用');
      sheet.getRange(i + 1, 8).setValue(new Date());
      return { success: true, status: '✅ 已結案，優惠碼標記為已使用' };
    }
  }

  return { success: false, status: '❌ 找不到可結案的優惠碼' };
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
  couponSheet.getRange(1, 1, 1, 8).setValues([
    ['編號', '優惠碼', '狀態', '領取時間', '到期時間', '領取者', '手機號碼', '使用時間']
  ]);
  couponSheet.getRange(1, 1, 1, 8).setFontWeight('bold').setBackground('#F5941E').setFontColor('white');

  // 產生優惠券（確保不重複）
  const coupons = [];
  const usedCodes = new Set();
  for (let i = 1; i <= POOL_SIZE; i++) {
    let code;
    do { code = formatCode(i); } while (usedCodes.has(code));
    usedCodes.add(code);
    coupons.push([i, code, '可領取', '', '', '', '', '']);
  }
  couponSheet.getRange(2, 1, coupons.length, 8).setValues(coupons);

  // 設定下一個編號
  settingsSheet.getRange(1, 1, 1, 2).setValues([['下一個編號', POOL_SIZE + 1]]);

  // 格式化
  couponSheet.setFrozenRows(1);
  couponSheet.autoResizeColumns(1, 8);

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

  Logger.log('✅ 初始化完成！已建立 ' + POOL_SIZE + ' 張優惠券');
}

// ===== 加開優惠券 =====
function addMoreCoupons(count) {
  if (!count || count < 1 || count > 100) {
    return { success: false, error: '數量需在 1～100 之間' };
  }

  const sheet = getSheet();
  const usedCodes = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    usedCodes.add(data[i][1]);
  }

  let added = 0;
  for (let j = 0; j < count; j++) {
    const num = getNextNumber();
    let code;
    do { code = formatCode(num); } while (usedCodes.has(code));
    usedCodes.add(code);
    sheet.appendRow([num, code, '可領取', '', '', '', '', '']);
    added++;
  }

  return { success: true, message: '✅ 已加開 ' + added + ' 張優惠券', added: added };
}

// ===== 用電話查詢所有報名紀錄 =====
function lookupByPhone(phone) {
  const cleanPhone = String(phone).replace(/[^0-9]/g, '').trim();
  if (!cleanPhone || cleanPhone.length < 9) {
    return { success: false, error: '請輸入正確的手機號碼' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  const results = [];
  let couponInfo = null;

  // 1. 先查優惠券系統（找最新的一筆，優先顯示已領取/已使用的）
  const couponSheet = ss.getSheetByName('優惠券');
  if (couponSheet) {
    const cData = couponSheet.getDataRange().getValues();
    let latestCoupon = null;
    for (let i = 1; i < cData.length; i++) {
      const cPhone = String(cData[i][6] || '').replace(/[^0-9]/g, '');
      if (cPhone && (cPhone === cleanPhone || cPhone.includes(cleanPhone) || cleanPhone.includes(cPhone))) {
        const info = {
          code: cData[i][1],
          status: cData[i][2],
          claimedAt: cData[i][3] ? new Date(cData[i][3]).toLocaleString('zh-TW') : '',
          expiresAt: cData[i][4] ? new Date(cData[i][4]).toLocaleString('zh-TW') : ''
        };
        // 優先顯示「已領取」或「已使用」的（最新有效的券）
        if (!latestCoupon || info.status === '已領取' || info.status === '已使用') {
          latestCoupon = info;
        }
      }
    }
    couponInfo = latestCoupon;
  }

  // 2. 掃描所有營隊工作表
  for (const sheet of allSheets) {
    const name = sheet.getName();
    if (name === '優惠券' || name === '設定') continue;

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const phoneCol = findColumnIndex(headers, ['家長聯絡電話', '聯絡電話', '手機', '電話']);
    if (phoneCol < 0) continue;

    const couponCol = findColumnIndex(headers, ['填寫您的優惠碼', '填寫優惠碼', '優惠碼']);
    const nameCol = findColumnIndex(headers, ['寶貝姓名', '孩子姓名', '學生姓名', '姓名']);
    const sessionCol = findColumnIndex(headers, ['梯次', '選擇', '場次', '教室']);
    const noteCol = findColumnIndex(headers, ['備註', '備注', '其他']);

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();

    for (let i = 0; i < data.length; i++) {
      const rawPhone = String(data[i][phoneCol] || '');
      if (!rawPhone) continue;

      // 電話比對：從欄位中提取所有 09 開頭手機號碼
      const phonesInField = extractPhones(rawPhone);
      const rawDigits = rawPhone.replace(/[^0-9]/g, '');
      const matched = phonesInField.some(p => p === cleanPhone) || rawDigits.includes(cleanPhone) || cleanPhone.includes(rawDigits);
      if (matched) {
        const campPrice = findCampPrice(name);
        const earlybird = campPrice ? campPrice.earlybird : 0;
        const duo = campPrice ? campPrice.duo : null;
        const couponCode = couponCol >= 0 ? String(data[i][couponCol] || '').trim() : '';
        const childName = nameCol >= 0 ? String(data[i][nameCol] || '').trim() : '';
        const session = sessionCol >= 0 ? String(data[i][sessionCol] || '').trim() : '';
        const noteText = noteCol >= 0 ? String(data[i][noteCol] || '') : '';
        const isDuo = duo && (noteText.includes('兩人同行') || noteText.includes('兩人') || noteText.includes('2人同行'));

        // 判斷價格
        let priceType = '早鳥價';
        let basePrice = earlybird;
        let finalPrice = earlybird;
        let hasCoupon = false;

        if (couponCode) {
          const coupon = lookupCoupon(couponCode);
          if (coupon && (coupon.status === '已領取' || coupon.status === '已使用')) {
            const cPhone = coupon.phone;
            if (!cPhone || phoneMatch(cleanPhone, cPhone)) {
              hasCoupon = true;
            }
          }
        }

        // 兩人同行 vs 95折 取較低，不疊加
        const couponPrice = hasCoupon ? (campPrice && campPrice.discounted ? campPrice.discounted : Math.round(earlybird * 0.95)) : earlybird;
        if (hasCoupon && isDuo) {
          if (couponPrice <= duo) {
            finalPrice = couponPrice;
            priceType = '95折（優於兩人同行）';
          } else {
            finalPrice = duo;
            priceType = '兩人同行（優於95折）';
          }
        } else if (hasCoupon) {
          finalPrice = couponPrice;
          priceType = '95折';
        } else if (isDuo) {
          finalPrice = duo;
          priceType = '兩人同行';
        }

        results.push({
          camp: name,
          childName: childName,
          session: session,
          couponCode: couponCode || '無',
          hasCoupon: hasCoupon,
          isDuo: isDuo,
          priceType: priceType,
          basePrice: earlybird,
          finalPrice: finalPrice,
          note: noteText.trim()
        });
      }
    }
  }

  // 計算總金額
  let totalBase = 0;
  let totalFinal = 0;
  results.forEach(r => { totalBase += r.basePrice; totalFinal += r.finalPrice; });

  return {
    success: true,
    phone: cleanPhone,
    coupon: couponInfo,
    registrations: results,
    totalBase: totalBase,
    totalFinal: totalFinal,
    totalSaved: totalBase - totalFinal,
    campCount: results.length
  };
}

// ═══════════════════════════════════════════════════════
//  自動計算系統 — 表單回覆自動算金額
// ═══════════════════════════════════════════════════════

// 營隊費用對照表（工作表名稱 → 價格）
const CAMP_PRICES = {
  '猴囝仔露營趣':           { earlybird: 6999, discounted: 6650, original: 7500, duo: null },
  '猴囝仔露營':              { earlybird: 6999, discounted: 6650, original: 7500, duo: null },
  '我是造船大師':            { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  'MAKER自造營':             { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  '水上裝置實驗室':          { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  '水上裝置實驗':            { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  '空中競技計畫':            { earlybird: 7999, discounted: 7600, original: 9500, duo: 7800 },
  '無人機足球營隊':          { earlybird: 7999, discounted: 7600, original: 9500, duo: 7800 },
  '無人機足球':              { earlybird: 7999, discounted: 7600, original: 9500, duo: 7800 },
  'Game Lab':                { earlybird: 7500, discounted: 7125, original: 8500, duo: 6800 },
  '設計師養成營':            { earlybird: 7500, discounted: 7125, original: 8500, duo: 6800 },
  'ROBLOX':                  { earlybird: 6999, discounted: 6650, original: 8500, duo: 6800 },
  '廢材機器人自造營':        { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  '廢材機器人':              { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  'HELLO MAKER':             { earlybird: 7500, discounted: 7125, original: 8800, duo: 7400 },
  'LEGO Ideas':              { earlybird: 6999, discounted: 6650, original: 8500, duo: 6800 },
  'LEGO Ideas玩具設計總監':  { earlybird: 6999, discounted: 6650, original: 8500, duo: 6800 },
  '飛行航空科學營':          { earlybird: 7999, discounted: 7600, original: null, duo: 7800 },
  '飛行航空':                { earlybird: 7999, discounted: 7600, original: null, duo: 7800 },
  '科學大師營':              { earlybird: 4800, discounted: 4560, original: null, duo: 4700 },
  '科學大師':                { earlybird: 4800, discounted: 4560, original: null, duo: 4700 },
  '蛋仔派對':               { earlybird: 4800, discounted: 4560, original: null, duo: 4700 },
  '3D列印':                  { earlybird: 4800, discounted: 4560, original: null, duo: 4700 },
};

// 根據工作表名稱找到對應營隊價格
function findCampPrice(sheetName) {
  for (const [key, val] of Object.entries(CAMP_PRICES)) {
    if (sheetName.includes(key) || sheetName.toLowerCase().includes(key.toLowerCase())) {
      return val;
    }
  }
  return null;
}

// 修正手機號碼（Google Sheets 可能會把 0920... 變成 920...）
function fixPhone(phone) {
  let p = String(phone || '').replace(/[^0-9]/g, '');
  if (p.length === 9 && !p.startsWith('0')) p = '0' + p;
  return p;
}

// 從文字中提取所有手機號碼（09開頭10碼）
function extractPhones(text) {
  const str = String(text || '');
  // 先找標準格式（連續10碼）
  let matches = str.match(/09\d{8}/g) || [];
  // 找有橫線或空格的格式（如 0903-422-288 或 0903 422 288）
  const dashMatches = str.match(/09\d{1,2}[-\s]?\d{2,3}[-\s]?\d{2,4}/g) || [];
  for (const dm of dashMatches) {
    const cleaned = dm.replace(/[^0-9]/g, '');
    if (cleaned.length === 10 && cleaned.startsWith('09') && !matches.includes(cleaned)) {
      matches.push(cleaned);
    }
  }
  // 退路：把整段文字的數字抽出來找
  if (matches.length === 0) {
    const digits = str.replace(/[^0-9]/g, '');
    if (digits.length >= 9) {
      const fixed = fixPhone(digits);
      if (fixed.startsWith('09') && fixed.length === 10 && !matches.includes(fixed)) {
        matches.push(fixed);
      }
    }
  }
  return matches;
}

// 比對手機：從表單欄位提取所有號碼，任一支吻合就算通過
function phoneMatch(formPhoneField, couponPhone) {
  if (!couponPhone) return false;
  const cleanCoupon = fixPhone(couponPhone);
  if (!cleanCoupon || cleanCoupon.length < 9) return false;
  // 提取表單中所有手機號碼
  const phones = extractPhones(formPhoneField);
  if (phones.length === 0) {
    const cleanForm = fixPhone(formPhoneField);
    return cleanForm === cleanCoupon || cleanForm.includes(cleanCoupon) || cleanCoupon.includes(cleanForm);
  }
  return phones.some(p => p === cleanCoupon || fixPhone(p) === cleanCoupon);
}

// 在表頭中找特定欄位的索引（排除系統自動產生的欄位）
function findColumnIndex(headers, keywords, excludeKeywords) {
  const excludes = excludeKeywords || ['💰', '🎟️', '📱', '💵'];
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i]).trim();
    // 跳過系統自動產生的欄位
    let isSystemCol = false;
    for (const ex of excludes) {
      if (h.includes(ex)) { isSystemCol = true; break; }
    }
    if (isSystemCol) continue;
    for (const kw of keywords) {
      if (h.includes(kw)) return i;
    }
  }
  return -1;
}

// 標記優惠碼為已使用（表單提交時自動呼叫）
function markCouponUsed(code) {
  try {
    const sheet = getSheet();
    if (!sheet) return;
    const data = sheet.getDataRange().getValues();
    const upperCode = String(code).toUpperCase().trim();
    for (let i = 1; i < data.length; i++) {
      if (data[i][1] === upperCode && data[i][2] === '已領取') {
        sheet.getRange(i + 1, 3).setValue('已使用');
        sheet.getRange(i + 1, 8).setValue(new Date());
        break;
      }
    }
  } catch(e) {
    Logger.log('markCouponUsed error: ' + e.message);
  }
}

// 正規化姓名（去空格、全形轉半形、統一大小寫）
function normalizeName(name) {
  if (!name) return '';
  return String(name)
    .trim()
    .replace(/\s+/g, '')       // 去所有空格
    .replace(/　/g, '')         // 去全形空格
    .replace(/[Ａ-Ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0)) // 全形轉半形
    .replace(/[ａ-ｚ]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xFEE0))
    .toUpperCase();             // 統一大寫
}

// 查詢優惠碼綁定的學員姓名（跨所有工作表找第一個使用此碼的姓名）
function getCouponBoundName(code) {
  if (!code) return null;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const allSheets = ss.getSheets();
  const upperCode = String(code).toUpperCase().trim();

  for (const sheet of allSheets) {
    const name = sheet.getName();
    if (name === '優惠券' || name === '設定') continue;
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) continue;

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const couponCol = findColumnIndex(headers, ['填寫您的優惠碼', '填寫優惠碼', '優惠碼']);
    const nameCol = findColumnIndex(headers, ['寶貝姓名', '孩子姓名', '學生姓名', '姓名']);
    if (couponCol < 0 || nameCol < 0) continue;

    const data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
    for (let i = 0; i < data.length; i++) {
      const rowCode = String(data[i][couponCol] || '').toUpperCase().trim();
      if (rowCode === upperCode) {
        const childName = String(data[i][nameCol] || '').trim();
        if (childName) return childName;
      }
    }
  }
  return null;
}

// 查詢優惠碼資訊（從優惠券工作表）
function lookupCoupon(code) {
  if (!code) return null;
  const sheet = getSheet();
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const upperCode = String(code).toUpperCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === upperCode) {
      return {
        code: data[i][1],
        status: data[i][2],
        phone: fixPhone(data[i][6]),
        expiresAt: data[i][4] ? new Date(data[i][4]) : null
      };
    }
  }
  return null;
}

// ===== 表單提交自動觸發 =====
function onFormSubmit(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
  } catch(lockErr) {
    Logger.log('onFormSubmit 鎖定失敗');
    return;
  }
  try {
    const sheet = e.range.getSheet();
    const sheetName = sheet.getName();

    // 跳過優惠券和設定工作表
    if (sheetName === '優惠券' || sheetName === '設定' || sheetName === '總帳') return;

    const row = e.range.getRow();
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];

    // 找關鍵欄位
    const couponCol = findColumnIndex(headers, ['填寫您的優惠碼', '填寫優惠碼', '優惠碼']);
    const phoneCol = findColumnIndex(headers, ['家長聯絡電話', '聯絡電話', '手機', '電話']);
    const noteCol = findColumnIndex(headers, ['備註', '備注', '其他']);
    const childNameCol = findColumnIndex(headers, ['寶貝姓名', '孩子姓名', '學生姓名', '姓名']);

    // 確保有結果欄位
    const resultCols = ['💰 方案', '🎟️ 優惠碼狀態', '📱 手機比對', '💵 應付金額'];
    let startCol = headers.length + 1;

    const existingIdx = findColumnIndex(headers, ['方案', '優惠碼狀態', '早鳥價'], []);
    if (existingIdx >= 0) {
      startCol = existingIdx + 1;
    } else {
      sheet.getRange(1, startCol, 1, resultCols.length).setValues([resultCols]);
      sheet.getRange(1, startCol, 1, resultCols.length).setFontWeight('bold').setBackground('#F5941E').setFontColor('white');
    }

    // 找營隊價格
    const campPrice = findCampPrice(sheetName);
    const earlybird = campPrice ? campPrice.earlybird : 0;
    const duoPrice = campPrice ? campPrice.duo : null;

    // 取得優惠碼、手機、備註
    const couponCode = couponCol >= 0 ? String(rowData[couponCol] || '').trim() : '';
    const rawFormPhone = phoneCol >= 0 ? String(rowData[phoneCol] || '') : '';
    const noteText = noteCol >= 0 ? String(rowData[noteCol] || '') : '';

    // 檢查是否兩人同行
    const isDuo = duoPrice && (noteText.includes('兩人同行') || noteText.includes('兩人') || noteText.includes('2人同行'));

    let couponStatus = '無優惠碼';
    let phoneResult = '—';
    let couponValid = false;

    // 驗證優惠碼
    if (couponCode) {
      const coupon = lookupCoupon(couponCode);

      if (!coupon) {
        couponStatus = '❌ 查無此碼';
      } else if (coupon.status === '已過期') {
        couponStatus = '❌ 已過期';
      } else if (coupon.status === '已領取') {
        const now = new Date();
        const buffer = coupon.expiresAt ? new Date(coupon.expiresAt.getTime() + 10 * 60 * 1000) : now;
        if (buffer >= now) {
          if (rawFormPhone && coupon.phone) {
            if (phoneMatch(rawFormPhone, coupon.phone)) {
              phoneResult = '✅ 吻合';
              couponValid = true;
              markCouponUsed(couponCode);
            } else {
              phoneResult = '❌ 不吻合';
              couponStatus = '⚠️ 碼有效但手機不符';
            }
          } else {
            phoneResult = '⚠️ 缺手機資料';
            couponValid = true;
            markCouponUsed(couponCode);
          }
          if (couponValid) {
            const currentChild = childNameCol >= 0 ? String(rowData[childNameCol] || '').trim() : '';
            if (!currentChild) {
              couponValid = false;
              couponStatus = '⚠️ 碼有效但表單缺少學員姓名，無法綁定';
            } else {
              couponStatus = '✅ 有效（學員：' + currentChild + '）';
            }
          }
        } else {
          couponStatus = '❌ 已過期';
        }
      } else if (coupon.status === '已使用') {
        if (rawFormPhone && coupon.phone && phoneMatch(rawFormPhone, coupon.phone)) {
          phoneResult = '✅ 吻合';
          // 檢查是否同一位學員
          const currentChild = childNameCol >= 0 ? normalizeName(rowData[childNameCol]) : '';
          const boundChild = normalizeName(getCouponBoundName(couponCode));
          if (boundChild && currentChild && boundChild !== currentChild) {
            couponValid = false;
            couponStatus = '❌ 此券已綁定「' + boundChild + '」，不可用於「' + currentChild + '」';
          } else if (boundChild && !currentChild) {
            couponValid = false;
            couponStatus = '⚠️ 此券已綁定「' + boundChild + '」，但此表單缺少姓名無法驗證';
          } else {
            couponValid = true;
            couponStatus = '✅ 有效（多營隊，學員：' + (boundChild || currentChild || '未知') + '）';
          }
        } else {
          couponStatus = '⚠️ 已使用（手機不符）';
        }
      }
    }

    // 計算最終價格（兩人同行 vs 95折 取較低，不疊加）
    let finalPrice = earlybird;
    let priceLabel = '早鳥價 $' + earlybird.toLocaleString();

    const couponPrice = couponValid ? (campPrice && campPrice.discounted ? campPrice.discounted : Math.round(earlybird * 0.95)) : earlybird;
    const actualDuoPrice = isDuo && duoPrice ? duoPrice : earlybird;

    if (couponValid && isDuo && duoPrice) {
      // 兩個都有：取較低的
      if (couponPrice <= duoPrice) {
        finalPrice = couponPrice;
        priceLabel = '95折 $' + couponPrice.toLocaleString() + '（優於兩人同行）';
      } else {
        finalPrice = duoPrice;
        priceLabel = '兩人同行 $' + duoPrice.toLocaleString() + '（優於95折）';
        couponStatus += '（兩人同行更優惠）';
      }
    } else if (couponValid) {
      finalPrice = couponPrice;
      priceLabel = '95折 $' + couponPrice.toLocaleString();
    } else if (isDuo && duoPrice) {
      finalPrice = duoPrice;
      priceLabel = '兩人同行 $' + duoPrice.toLocaleString();
    }

    // 寫入結果
    sheet.getRange(row, startCol, 1, 4).setValues([[
      priceLabel,
      couponStatus,
      phoneResult,
      '$' + finalPrice.toLocaleString()
    ]]);

    // 應付金額上色
    const priceCell = sheet.getRange(row, startCol + 3);
    if (finalPrice < earlybird) {
      priceCell.setBackground('#E8F5E9').setFontColor('#2E7D32').setFontWeight('bold');
    }

  } catch(err) {
    Logger.log('onFormSubmit 錯誤：' + err.message);
  } finally {
    lock.releaseLock();
  }
}

// ===== 手動：重新計算整個工作表的金額 =====
function recalcSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) { Logger.log('找不到工作表：' + sheetName); return; }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const couponCol = findColumnIndex(headers, ['填寫您的優惠碼', '填寫優惠碼', '優惠碼']);
  const phoneCol = findColumnIndex(headers, ['家長聯絡電話', '聯絡電話', '手機', '電話']);
  const noteCol = findColumnIndex(headers, ['備註', '備注', '其他']);
  const campPrice = findCampPrice(sheetName);
  const earlybird = campPrice ? campPrice.earlybird : 0;
  const duoPrice = campPrice ? campPrice.duo : null;

  const resultCols = ['💰 方案', '🎟️ 優惠碼狀態', '📱 手機比對', '💵 應付金額'];
  let startCol = headers.length + 1;
  const existingIdx = findColumnIndex(headers, ['方案', '優惠碼狀態', '早鳥價'], []);
  if (existingIdx >= 0) {
    startCol = existingIdx + 1;
  } else {
    sheet.getRange(1, startCol, 1, resultCols.length).setValues([resultCols]);
    sheet.getRange(1, startCol, 1, resultCols.length).setFontWeight('bold').setBackground('#F5941E').setFontColor('white');
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) { Logger.log('沒有資料'); return; }

  for (let row = 2; row <= lastRow; row++) {
    const rowData = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
    const couponCode = couponCol >= 0 ? String(rowData[couponCol] || '').trim() : '';
    const rawFormPhone = phoneCol >= 0 ? String(rowData[phoneCol] || '') : '';
    const noteText = noteCol >= 0 ? String(rowData[noteCol] || '') : '';
    const isDuo = duoPrice && (noteText.includes('兩人同行') || noteText.includes('兩人') || noteText.includes('2人同行'));

    let couponStatus = '無優惠碼';
    let phoneResult = '—';
    let couponValid = false;

    if (couponCode) {
      const coupon = lookupCoupon(couponCode);
      if (!coupon) {
        couponStatus = '❌ 查無此碼';
      } else if (coupon.status === '已過期') {
        couponStatus = '❌ 已過期';
      } else if (coupon.status === '已領取' || coupon.status === '已使用') {
        if (rawFormPhone && coupon.phone && phoneMatch(rawFormPhone, coupon.phone)) {
          phoneResult = '✅ 吻合';
          couponValid = true;
        } else if (rawFormPhone && coupon.phone) {
          phoneResult = '❌ 不吻合';
          couponStatus = '⚠️ 碼有效但手機不符';
        } else {
          phoneResult = '⚠️ 缺手機資料';
          couponValid = true;
        }
        if (couponValid) couponStatus = '✅ 有效';
      }
    }

    // 計算最終價格
    let finalPrice = earlybird;
    let priceLabel = '早鳥價 $' + earlybird.toLocaleString();
    const couponPrice = couponValid ? (campPrice && campPrice.discounted ? campPrice.discounted : Math.round(earlybird * 0.95)) : earlybird;

    if (couponValid && isDuo && duoPrice) {
      if (couponPrice <= duoPrice) {
        finalPrice = couponPrice;
        priceLabel = '95折 $' + couponPrice.toLocaleString() + '（優於兩人同行）';
      } else {
        finalPrice = duoPrice;
        priceLabel = '兩人同行 $' + duoPrice.toLocaleString() + '（優於95折）';
      }
    } else if (couponValid) {
      finalPrice = couponPrice;
      priceLabel = '95折 $' + couponPrice.toLocaleString();
    } else if (isDuo && duoPrice) {
      finalPrice = duoPrice;
      priceLabel = '兩人同行 $' + duoPrice.toLocaleString();
    }

    sheet.getRange(row, startCol, 1, 4).setValues([[
      priceLabel,
      couponStatus,
      phoneResult,
      '$' + finalPrice.toLocaleString()
    ]]);

    if (finalPrice < earlybird) {
      sheet.getRange(row, startCol + 3).setBackground('#E8F5E9').setFontColor('#2E7D32').setFontWeight('bold');
    }
  }

  Logger.log('✅ ' + sheetName + ' 重新計算完成，共 ' + (lastRow - 1) + ' 筆');
}

// ===== 重新計算所有營隊工作表 =====
function recalcAll() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheets = ss.getSheets();
  for (const sheet of sheets) {
    const name = sheet.getName();
    if (name === '優惠券' || name === '設定') continue;
    if (findCampPrice(name)) {
      recalcSheet(name);
    }
  }
  Logger.log('✅ 全部工作表重新計算完成');
}
