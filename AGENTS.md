# 布拉克星球暑期營隊網站 — AI 協作完整交接文件

> 給任何 AI 助手（Codex / Claude / 其他）的系統全貌。改動前必讀。
> 最後更新：2026-07-22

## 🌌 系統總覽

布拉克星球（台南兒童 STEAM 教育機構，永康＋北區兩教室）2026 暑期營隊的完整線上營運平台：
**家長報名前台 + 老師後台 + 教具訂購 + 優惠券 + 報價單 + 活動子站**。

核心架構原則：**一個人就能維護**。

- 前端：純靜態 HTML（無框架、無 build step），GitHub Pages 部署
- 後端：單一 Google Apps Script Web App + 單一 Google 試算表（就是資料庫）
- 網域：`blockplanetcamp.com`（CNAME 在 repo 根目錄）
- 老師 KPI 系統在另一個 repo（`teacher-system` → `teacher.blockplanetcamp.com`）

### ⚠️ 最重要的三條鐵律

1. **後端是 Apps Script**：改 `camp2026/apps-script.gs` 後必須由使用者手動貼到
   script.google.com 重新部署（AI 沒有 Google 憑證）。部署可能換 URL。
2. **URL 換了要同步 8 個檔案**：`grep -rl "AKfycb" --include="*.html" --include="*.js"`
   找出所有引用舊 URL 的檔案一次替換（admin / coupon / coupon-admin / coupon-test /
   teacher / matrix-open / spike / drone-soccer/app.js）。
3. **資料以 Google Sheet 為準**，不是資料庫。欄位順序、格式（電話欄 `@` 文字格式）都有意義。

### 目前 Apps Script 部署 URL（2026-07-22）

```
https://script.google.com/macros/s/AKfycbyn7Rpmmfk0zAgME4TDEy0FYA3cckQZTfQD_6peGTv6HH5TmPc2mOXfNc-Dj9S2HNI/exec
```

Apps Script 專案名稱「優惠券系統」，綁定營隊報名試算表（試算表 → 擴充功能 → Apps Script 可開啟）。
專案內只維護 `程式碼.gs`（= repo 的 `camp2026/apps-script.gs`），「未命名.gs」放一次性工具函式勿動。

---

## 📁 檔案地圖（camp2026/）

### 家長入口（公開）
| 檔案 | 用途 |
|---|---|
| `index.html` | 營隊總覽 + 報名頁（主入口，~1600 行單檔含 CSS/JS） |
| `quiz.html` | 「找營隊」互動測驗 |
| `coupon.html` | 家長領 95 折券（FingerprintJS + 手機 10 碼驗證） |
| `matrix-open.html` | MATRIX 教具訂購單（`matrix.html` 是舊連結 redirect） |
| `spike.html` | LEGO SPIKE Prime 45678 訂購單（黃藍主題，學員價 15500） |
| `quote.html` | 學校報價單產生器（前端純生成 PDF） |

### 活動子站（首頁「🛠 老師系統」下拉選單進入）
| 資料夾 | 用途 |
|---|---|
| `pokemon/` | 寶可夢卡牌大賽子站（index / battle / learn，含賽事主控台） |
| `drone-soccer/` | 無人機足球晉級賽系統（詳見下方專章） |

### 內部管理（不對外宣傳，密碼是防誤觸不是真安全）
| 檔案 | 用途 |
|---|---|
| `admin.html` | 總後台六分頁：營隊總名單／電話查詢／優惠券／MATRIX／SPIKE／報價單。頁面密碼 `BLOCK` |
| `teacher.html` | 老師營隊名單查詢（兄弟姊妹偵測、特殊照護警示、簽到表） |
| `weclass.html` | WeClass 接管系統：建單推播＋收款＋支出＋現金流＋安親核對。通行密碼 `block` |
| `coupon-admin.html` / `coupon-test.html` | 券管理／測試 |

### 其他
- `apps-script.gs` — 後端完整原始碼備份（**權威版本**，改後端先改這裡再貼上去）
- `backups/` — 本地資料備份，**刻意不進 git**
- `posters/` — 海報圖檔

---

## 🔌 Apps Script API 全表

### GET actions（`?action=...`）
| action | 權限 | 用途 |
|---|---|---|
| `status` | 公開 | 優惠券統計 `{available, claimed, used, expired, total}` |
| `claim&fp=X&phone=Y` | 公開 | 領券（手機 10 碼） |
| `verify&code=X` | 公開 | 驗證優惠碼 |
| `lookup&phone=X` | 公開 | 家長電話查全部報名 |
| `teacher` | 公開 | 所有營隊名單（含 0 人營隊） |
| `addmore&count=N` | `key=bp2026admin` | 加開券（上限 100） |
| `matrix-submit&...` | 公開 | 建 MATRIX 訂單 |
| `matrix-list` / `matrix-status&row=N&status=X` | `key=bp2026admin` | 訂單列表／改狀態 |
| `spike-submit` / `spike-list` / `spike-status` | 同上 | SPIKE 版（完全對稱） |
| `finance-summary` / `expense-*` | `password=block0607` | 收支／支出 CRUD |
| `drone-pilots` | 公開 | 無人機駕駛員名冊 |
| `drone-state` | 公開 | 無人機賽事狀態 JSON |

### POST actions（`Content-Type: text/plain` 送 JSON，避免 CORS preflight）
| body | 用途 |
|---|---|
| `{action:'drone-pilot-add', name, nickname, phone, level, photo}` | 建駕照（photo = base64 data URL ≤48000 字元） |
| `{action:'drone-state-set', state}` | 存賽事狀態（≤48000 字元） |

**curl 測 POST 注意**：用 `curl -sL -d '...'`（不要 `-X POST`），Apps Script 302 轉址後要轉 GET 才拿得到 JSON。

---

## 🚢 部署流程

### 前端（HTML/JS/CSS）
```
cd ~/Projects/blockplanet-website && git pull → 改檔 → commit → push
→ GitHub Pages 自動部署到 blockplanetcamp.com（約 1 分鐘）
```

### 後端（apps-script.gs）標準流程
1. 改本地 `camp2026/apps-script.gs`
2. `pbcopy < camp2026/apps-script.gs` 複製整份
3. 使用者開 Apps Script 編輯器 → `程式碼.gs` 全選貼上 → Cmd+S
4. 部署 → 管理部署 → ✏️ 鉛筆 → 版本「新版本」→ 部署
5. **URL 若變** → grep 舊 URL 同步 8 個檔案 → commit + push
6. 送測試單驗證（見下方測試流程），測完請使用者刪測試 row

### ⚠️ 本地環境地雷
- 工作路徑：`~/Projects/blockplanet-website/`（2026-07-22 起）
- **絕對不要用** `~/Desktop/blockplanet-website/`：iCloud 把 .git pack 抽成 dataless，git 指令會永久卡死
- GitHub 帳號 `alienlai0607-ai`，repo `blockplanetcamp`

### 端對端測試（改後端後必跑）
```bash
API="<目前 URL>"
curl -sL "$API?action=status"                 # 舊系統活著
curl -sL "$API?action=drone-pilots"           # 新系統活著
curl -sL "$API?action=matrix-submit&order_no=BP-TEST-$(date +%s)&parent=測試勿擾&phone=0900000000&student=測試&team=測試&items=TEST|1|0&qty=1&total=0&saved=0&note=[TEST]"
curl -sL "$API?action=matrix-list&key=bp2026admin"   # 撈回驗證，看 phone 前導 0 有沒有被吃
```

---

## 💰 價格規則（營運中的真實價格，改動要小心）

### CAMP_PRICES 全表
| 營隊（key 模糊比對）| 早鳥 | 95折 | 兩人同行 | 原價 | noCoupon |
|---|---:|---:|---:|---:|:---:|
| 猴囝仔露營趣 | 6,999 | 6,650 | — | 7,500 | |
| 我是造船大師／MAKER自造營 | 7,500 | 7,125 | 7,400 | 8,800 | |
| 水上裝置實驗室 | 7,500 | 7,125 | 7,400 | 8,800 | |
| 空中競技計畫／無人機足球 | 7,999 | 7,600 | 7,800 | 9,500 | |
| Game Lab | 7,500 | 7,125 | **6,800** | 8,500 | |
| ROBLOX | 6,999 | 6,650 | 6,800 | 8,500 | |
| HELLO MAKER／廢材機器人 | 7,500 | 7,125 | 7,400 | 8,800 | |
| LEGO Ideas | 6,999 | 6,650 | 6,800 | 8,500 | |
| 飛行航空科學營 | 7,999 | 7,600 | 7,800 | 9,500 | |
| 科學大師營／蛋仔派對／3D列印 | 4,800 | 4,560 | 4,700 | 6,000 | |
| 7月包月 | 16,000 | — | — | 16,000 | ✓ |
| 小一新生營／太空人見習生 | 11,900 | — | — | 15,000 | ✓ |

### 價格決策 6 步（與 onFormSubmit 1:1 對齊）
```
1. 包月覆蓋（最優先）：安親 $15,500／非安親 $16,000
2. effectiveBase：安親+可用券營隊 → discounted；其他 → earlybird
3. 券有效：安親 → floorHundred(discounted×0.95)；非安親 → discounted
4. 券+兩人同行同時成立 → 取較低者
5. 只有券 → couponPrice
6. 只有兩人同行且 duo < effectiveBase → duoPrice
```
- **安親判定**：名字在 `AFTERSCHOOL_STUDENTS`（~55 人，normalizeName 雙向 includes 比對）
- **兩人同行觸發字**：備註含「兩人同行／兩人／2人同行」
- **floorHundred**：`Math.floor(n/100)*100`（$6,769 → $6,700）
- 同金額陷阱：discounted 價 = 一般人用券 = 安親無券，光看金額無法區分身份

## 🎟 優惠券系統

- 格式 `BP-XXXX`（30 字元集，排除 I/L/O/0）；初始池 60 張（`initCoupons()`）
- 生命週期：可領取 →(領)→ 已領取（60 分鐘 + 10 分鐘 buffer）→(用)→ 已使用；過期 1:1 自動補新券
- **池不會維持 60**：只有「過期」才補，領走未過期不補、手動刪不補
- 手機綁定：領券記手機；用券時 `extractPhones` 從表單抽全部 09 手機任一吻合即過
- 姓名綁定：券第一次用鎖定學員姓名，之後跨營隊可重複用但**換名字拒絕**（防手足共用）
- `cleanupExpired()` 在每次 doGet 開頭跑（無 time trigger）
- 刪多開的券：無 delete API，貼一次性函式到「未命名.gs」手動執行（只刪「可領取」，從底部往上刪）

## 🔧 內部慣例（tribal knowledge）

- **onFormSubmit**（唯一自動 trigger）：表單送出 → 在該營隊 sheet 最右側寫 4 個橘底欄位
  `💰 方案｜🎟️ 優惠碼狀態｜📱 手機比對｜💵 應付金額`；排除 優惠券/設定/總帳 分頁
- **欄位定位靠 keyword fallback**（`findColumnIndex`）：學員姓名試「寶貝姓名→孩子姓名→學生姓名→姓名」等，
  老師改表單題目不用改程式；讀 emoji 欄要傳空 excludeKeywords（歷史 bug）
- **電話**：`fixPhone` 9 碼自動補 0；Sheet 電話欄一律 `setNumberFormat('@')` 防前導 0 被吃（重大歷史 bug，已修）
- **teacher.html**：session 日期會解析特殊粗體/全形數字產生簽到表；家長電話配對偵測兄弟姊妹；
  過敏/健康/藥物欄非空自動紅色警示；付款判定寬鬆 `/(已|完|OK|ok|是|付)/`
- **financeSummary 付款判定較嚴**（`v/V/移轉/已付/已繳/已匯`）— teacher 給人看、finance 算錢，刻意分開
- **教具訂購**：MATRIX（BP 前綴）/ SPIKE（SP 前綴）完全對稱，13 欄，狀態 未付款/已付款/已出貨
- **支出**：6 分類（耗材/講師費/場地/餐飲/交通/行政），sheet `支出記錄`，密碼 `block0607`
- **沒有任何 email/推播**：家長操作只有前端顯示，行政要主動看後台

## 🚁 無人機足球晉級賽（drone-soccer/，2026-07-22 上線）

- 流程：駕照建檔（拍照）→ 現場報到 → 每 3 人組成 1 隊 → 兩支三人隊進行 3 對 3 → 整隊共同晉級與奪冠
- 6 人：兩支三人隊直接進行冠軍戰；9 人：三支三人隊進行 3 場循環預賽，依勝場、得失分差、總得分選前兩隊進總決賽
- 賽事資料版本 `tournamentVersion: 2`；舊版個人賽資料會清除賽程但保留報到名單，重新組隊即可
- 檔案：`index.html`（靜態骨架）+ `app.js`（全部邏輯，vanilla JS）+ `styles.css` + `assets/`（品牌素材）
- 照片：前端 canvas 壓縮（420→180px 梯度，目標 ≤45000 字元 base64）存 Sheet 儲存格
- 音效：比賽畫面可試聽並選擇 4 首一般賽事音樂與 3 首最後 30 秒音樂（全部 CC0）；預設「Boss Fight Bounce／星球彈跳」搭配「Final Stand Max／最終決戰 MAX」。倒數到 0:30 時一般音樂立即停止、終局音樂從第一拍重新播放，並疊加換曲警報、Web Audio 重鼓、心跳與急促琶音；最後 10 秒進入第三階段，數字放到滿版、畫面強烈震動並逐秒重擊；來源與授權記錄在 `drone-soccer/AUDIO-CREDITS.md`
- 終局判定：時間歸零後依隊伍比分自動顯示勝隊、三位隊員與滿版彩帶，再由裁判確認勝隊晉級／奪冠；若最高分同分則顯示決勝加分，不會隨機選勝隊，裁判加上致勝分後立即重新判定
- 駕照列印：85.6×54mm 公版正反面，`@media print` 只印卡片，列印選「實際大小/100%」
- 駕照刪除：使用 `drone-pilot-delete` POST；前端二次確認後永久刪除。若駕駛員已加入隊伍，後端保留其他人報到資料並清除分組與賽程
- 練習賽：首頁可直接開啟免駕照練習模式，使用完整 3 分鐘、MAX 戰鬥音樂、最後 30 秒 Climax、雙隊計分／暫停／重設；練習成績不會寫入正式賽程或 Sheet
- `?demo=1` = 示範模式（localStorage，不動正式資料）
- Sheet 分頁：`無人機駕照`（10 欄：ID/駕照編號/姓名/暱稱/電話/等級/勝場/出賽/建檔時間/照片）、
  `無人機賽事`（single row：Key=main / Payload JSON / 更新時間）

## 🔢 常數速查

| 常數 | 值 | 位置 |
|---|---|---|
| 券有效 | 60 分鐘 + 10 分 buffer | apps-script.gs |
| 券池初始 | 60 張 | 同上 |
| admin key | `bp2026admin` | query string |
| 財務密碼 | `block0607` | apps-script.gs |
| admin.html 頁面密碼 | `BLOCK` | sessionStorage `bp_admin_unlocked_v1` |
| weclass 通行密碼 | `block` | weclass.html |
| 無人機照片上限 | 48000 字元 | dronePilotAdd |

## 🗃 Google Sheet 分頁全表

`優惠券`／`設定`（B1=nextNumber）／`總帳`／`MATRIX訂單`／`SPIKE教具訂單`／`支出記錄`／
`無人機駕照`／`無人機賽事`／各營隊報名分頁（動態，對應 Google Form）

## 🧭 協作風格（使用者偏好）

- 繁體中文回覆；精簡、不冗長、不 AI 感
- 日常操作直接做不用問；只有「花錢／傷電腦／公開發布」才先確認
- 要貼到別處的程式碼/長文一律自動 `pbcopy`
- 改前端後用瀏覽器自動化實測（手機 390 + 桌機 1280），不要只看 code
- 測試單送完請使用者手動刪 Sheet 測試 row
