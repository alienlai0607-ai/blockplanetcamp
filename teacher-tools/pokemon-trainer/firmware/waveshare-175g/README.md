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
