# 老師工具

官網導覽的「老師工具」下拉選單包含小島出發與照片小幫手。兩個入口共用 assets/teacher-access.js 的 sessionStorage 通行密碼；關閉分頁後失效。照片工具直接開網址也會詢問密碼，並提供鎖定工具按鈕。沿用本站既有防誤觸密碼模式，並非伺服器權限系統。小島出發仍保留原站登入與密碼流程。

照片工具照片只在瀏覽器處理，沒有上傳或保存到伺服器。支援 JPG、PNG、WebP，固定 A4 橫式、每頁四張 127 × 88.9 mm、6 mm 間距。

photo-print 為已建置靜態檔，來源位於相鄰 teacher-photo-print 專案的 app/、components/、official-export/。以 Node >=22.13 在該專案執行 `npx vite build --config official-export/vite.config.ts` 即更新此資料夾。官網既有 GitHub Pages 發布流程不變。
