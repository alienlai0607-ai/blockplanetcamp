# 1.18-WSdev5-175g 觸控座標修正

修正微雪 CO5300 螢幕 rotation=0 下，原始 CST9217 觸控座標與畫面方向相反的問題。依官方設定反轉 X/Y，且只在進入 UI 事件佇列前轉換一次。保留 WSdev3 的 QMI8658 開機修復與 WSdev4 的觸控取樣／診斷改進。

已在微雪實機完成寫入與讀回校驗，開機／NVS 及作品標頭區更新前後一致。實際點擊的原始座標 (310,172) 轉為畫面 (156,294)，命中探索按鈕，探索頁由關閉變成開啟；使用者已確認可以正常操作。這項驗證包含實際按鈕動作，不只計算觸控事件。

主機測試使用真正的解碼器、事件串流、遊戲手勢與 onTap 函式，涵蓋探索、夥伴、連線、餵食、遊戲、燈光、洗澡、滑動方向及邊界；ASan/UBSan 通過。跨機型無線對戰、電池／電源行為與長時間測試仍待完成。

[Waveshare 官方觸控方向設定](https://github.com/waveshareteam/ESP32-S3-Touch-AMOLED-1.75/blob/main/examples/arduino/06_LVGL_Widgets/06_LVGL_Widgets.ino)

# 連線友誼賽（2026-11-13）

StopWatch `1.18-SWdev13-link` 與微雪 1.75G `1.18-WSdev5-175g` 使用相同 ESP-NOW 通訊與戰鬥規則，可進行跨機型的一對一友誼賽。每位玩家派一隻目前出戰夥伴，不是每邊兩隻的雙打。微雪單台實際按鈕操作已驗證，使用者確認正常；跨機型射頻連線與電力表現仍待雙機驗證。

1. 兩台都透過網站更新各自板型的韌體。已有遊戲選「更新現有遊戲」，保留進度與作品；先完成完整備份。
2. 在「夥伴」選擇出戰，再回主畫面按「連線」。
3. 一人「建立對戰」，另一人「加入對戰」，核對相同六位數房間號碼與對手夥伴。
4. 雙方都按「準備好了」才開戰；每回合各自選招，依速度與優先度結算。
5. 友誼賽統一 Lv.50，採物種基本能力與現有招式，不套用養成加成；不捕捉、不獎勵經驗、不改寫夥伴或作品。養成的實際等級保持不變。
6. 連線中斷超過 3 秒暫停選招、等待恢復；20 秒未恢復取消對戰，不判輸。也可主動「離開對戰」。

使用 2.4 GHz ESP-NOW 固定 channel 6，不需基地台、網際網路、GPS、手機或額外通訊模組。只在連線頁開啟無線，退出後關閉；不清除 Wi-Fi 憑證。附近列表最多顯示四個有效房間。房間號碼用來人工確認，並非密碼；此版未提供密碼學身分驗證，不適用競技排名。未加入遠端網路對戰、交換寶可夢、二對二或自繪角色上場。

通訊會核對版本、規則、對手、每場隨機識別碼、回合與狀態摘要。主機計算回合，另一台用同樣的選招與亂數重新計算並核對；重送不會多扣血或重複結算。只有正式對戰按鍵可選招，動畫與等待時不會連點出招。完整格式與自動測試在 `device/link/`。

測試包含 160 場隨機物種的完整對戰，注入 25% 丟包、30% 重複及 600 ms 延遲／亂序；另測雙方確認、遺失回合 ACK、陌生／過期場次封包、非法招式、狀態不一致、斷線恢復／逾時與時鐘溢位。使用真實韌體繪圖函式產生九個連線畫面並檢查圓形邊界，另保留原本野生戰鬥與升級測試。這些是主機模擬，不能取代雙機驗證。


## 編譯與原始碼

執行 `python3 tools/build.py`（Apple Silicon Mac）可重新建置，只編譯不燒錄。
連線核心測試：`c++ -std=c++17 -I firmware/TamaPoke tests/link_tests.cpp -o /tmp/tamapoke-link-test && /tmp/tamapoke-link-test`。
觸控解碼／佇列測試：`c++ -std=c++17 tests/touch_tests.cpp -o /tmp/tamapoke-touch-test && /tmp/tamapoke-touch-test`。
觸控座標到實際按鈕測試：`python3 tests/check_touch_buttons.py`。
實際遊戲手勢函式測試：`python3 tests/check_touch_gestures.py`。
字型授權與可重建 BDF 在 localization/font。

以下保留前版硬體與開發說明，版本以本文開頭為準。

# TamaPoke 微雪 1.75G 開發版

目標：Waveshare ESP32-S3-Touch-AMOLED-1.75-G（GPS 版），16 MB Flash、8 MB OPI PSRAM、466 × 466 圓形 AMOLED。**不適用 1.75C 或 StopWatch。**
版本：`1.18-WSdev1-175g`。源自現有 SWdev12 遊戲功能，換成微雪專用硬體驅動。編譯與測試結果見 verification；尚未在此板實際燒錄驗證。

## 已接入的功能

繁體中文、放大的角色、餵食洗澡、隨機時段探索、探索今日步數、18 屬性戰鬥、捕捉與 24 格夥伴收藏、戰鬥經驗升級、自繪早中晚背景與 USB 作品傳輸。

151 隻一般角色的壓縮素材內嵌在韌體，不需要 SD 卡；異色沿用一般造型。早中晚背景可從訓練家網站寫入。自繪角色動畫會保存，尚未加入可培養夥伴綁定。

GPS LC76G 與 TF 卡插槽保留，這版未啟用。探索沿用動作感測器與隨機有效活動時間，不依 GPS 定位。

## 網站安裝

https://blockplanetcamp.com/teacher-tools/pokemon-trainer/

1. 用電腦版 Chrome／Edge 開啟，按「安裝／更新遊戲系統」。
2. 板型選「微雪 Waveshare 1.75G（GPS 版）」。
3. 剛收到的原廠板選「第一次安裝」；已有本開發版則選「更新現有遊戲」。第一次安裝會清除原廠系統與內部資料。
4. 接上資料用 USB 線，按「連接並備份」，選 USB JTAG/serial debug unit（Mac 通常是 cu.usbmodem）。
5. 等完整 16 MB 備份校驗完成，下載保存，再確認寫入。
6. 寫入與讀回校驗完成後重新開機。回創作頁「連接遊戲機」，應顯示微雪 1.75G 與本版版本。

若無法連接：拔 USB，按住 BOOT 再插 USB，稍候放開。若另接電池，先關機，再按住 BOOT 開機。勿將 StopWatch 的按鍵指示套用到微雪。

第一次使用先在設定調整時間，再測主畫面點按、滑動、探索步數與一場戰鬥。此版不自動將 StopWatch 的進度搬到另一台設備。

## 本機建置

雙擊 Build_Waveshare.command，或執行 `python3 tools/build.py`。只編譯，不燒錄。使用 Arduino ESP32 3.3.10、GFX 1.6.9、SensorLib 0.5.1、XPowersLib 0.3.3、U8g2 2.36.19；所有下載依 tools/toolchain_archives.json 驗證 SHA-256。

分割配置：app3M_fat9M_16MB；作品只用 ffat 前 140 KiB，更新時不更動 NVS 與作品。沒有掛載或格式化 FAT 檔案系統。兩份作品槽先校驗、最後提交，斷線不取代原作品。

## 硬體介面

| 功能 | 微雪驅動／腳位 |
|---|---|
| 螢幕 | CO5300；QSPI CS12、CLK38、D0–D3 4/5/6/7；Reset39 |
| 觸控 | CST9217 0x5A；IRQ11、Reset40；獨立採樣與事件佇列 |
| 共用 I²C | SDA15、SCL14，100 kHz；完整交易互斥保護 |
| 探索／步數 | QMI8658 0x6B，±4g，加速度輸出單位 g |
| 時鐘 | PCF85063 0x51 |
| 電源 | AXP2101 0x34；BLDO1 3.3V 供螢幕 |
| 聲音 | ES8311；MCLK42、BCLK9、WS45、OUT8、PA46 |
| GPS | LC76G，保留未啟用 |

來源：[Waveshare 官方硬體參考](https://github.com/waveshareteam/ESP32-S3-Touch-AMOLED-1.75/blob/main/HARDWARE_REFERENCE.md)、原版 TamaPoke 1.18 與 SensorLib。原始碼 MIT；角色素材 PMD SpriteCollab CC BY-NC 4.0，詳見 LICENSE 與 CREDITS.md。
