# 1.18-SWdev14-battle 戰鬥音樂與動畫

- 野生戰鬥新增原創 8 秒循環晶片音樂，與招式／投球／捕捉成功音效混音。沿用設定頁的聲音開關；離開戰鬥、關閉螢幕或進入閒置時停止。
- 18 屬性各有像素特效，分為蓄力、飛行、命中與受擊；扣血條隨命中逐漸下降。輔助招式的光圈留在施術者身上。
- 精靈球使用有輪廓、反光、陰影與中央按鈕的像素圖，呈現弧線投球、吸入縮小、落地、三次搖晃、掙脫／成功。
- 成功捕捉後顯示星光、音效、放大的新夥伴與名稱；可進夥伴頁或回探索。
- 捕捉先確認保存成功才播放成功動畫；動畫期間不接受重複出招／捕捉。遊戲規則、捕捉機率、進度、作品區及連線協定不變。

使用網站選正確板型及「更新現有遊戲」，完成備份後更新。本版已編譯並經主機測試；實際音量、喇叭效果與動畫流暢度仍須實機確認。

# 1.18-SWdev13-link 連線友誼賽

# 連線友誼賽（2026-11-13）

StopWatch `1.18-SWdev13-link` 與微雪 1.75G `1.18-WSdev2-175g` 使用相同 ESP-NOW 通訊與戰鬥規則，可進行跨機型的一對一友誼賽。每位玩家派一隻目前出戰夥伴，不是每邊兩隻的雙打。尚未以兩台實機驗證射頻連線、觸控或電力表現。

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
字型授權與可重建 BDF 在 localization/font。

以下保留前版硬體與開發說明，版本以本文開頭為準。

# StopWatch SWdev12 USB firmware source

This source archive contains the complete sketch, including packed built-in assets, source hashes and build tools. Children use the website's precompiled firmware and do not need the SDK.

Developer toolchain: ESP32 Arduino 3.3.10, ESP32-S3 Dev Module, USB CDC on boot, 16 MB flash, OPI PSRAM, app3M_fat9M_16MB. Library/tool versions are recorded in tools/toolchain_archives.json. The included macOS build helper reuses the previously prepared TamaPoke toolchain; for a new environment install the pinned dependencies with Arduino CLI first.

Run arduino-cli compile with FQBN esp32:esp32:esp32s3:CDCOnBoot=cdc,FlashSize=16M,PSRAM=opi,PartitionScheme=app3M_fat9M_16MB and the firmware/TamaPoke sketch. USB-FORMAT.md documents the browser installer and artwork protocol.

Compiled and tested with host simulations. Not flashed to or validated on physical hardware in this release.

Retain the upstream license and credits.

SWdev12 reserves only the first 140 KiB of the existing ffat partition. Legacy data outside that prefix is retained. No partition-table change or NVS reset is needed. Update using the existing-game mode.
