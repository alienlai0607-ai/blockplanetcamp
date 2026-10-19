/* 2027C verified campaign content. Source notes are internal metadata, not public copy. */
window.CAMP_DATA = {
  campaign: {
    id: "2027C",
    name: "2027 布拉克星球冬令營",
    year: 2027,
    language: "zh-Hant",
    verifiedOn: "2026-10-19",
    relationship: "寒假全期營與各特色營獨立授課、獨立報名。",
    relationshipDetail: "冬令營全期營完整參與五燈獎課程；5 日與 2 日特色營各有自己的主題。全期營不包含其他特色營。"
  },
  links: {
    fullTermForm: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform",
    line: "https://lin.ee/zFqqFzQ",
    facebook: "https://www.facebook.com/blockplanet",
    instagram: "https://www.instagram.com/blockplanet_2021",
    coupon: "coupon.html",
    existingSite: "https://blockplanetcamp.com/camp2026/"
  },
  classrooms: [
    {
      id: "north",
      name: "北區教室",
      address: "台南市北區中華北路二段113號",
      phone: "06-3583735",
      phoneHref: "tel:+88663583735",
      mapUrl: "https://www.google.com/maps/search/台南市北區中華北路二段113號",
      sourceIds: ["full-term-form", "existing-site"]
    },
    {
      id: "yongkang",
      name: "東橋教室",
      address: "台南市永康區東橋一路558號",
      phone: "06-2089382",
      phoneHref: "tel:+88662089382",
      mapUrl: "https://www.google.com/maps/search/台南市永康區東橋一路558號",
      sourceIds: ["full-term-form", "existing-site"]
    }
  ],
  teacherLinks: [
    { name: "老師專區", label: "老師專區", url: "https://teacher.blockplanetcamp.com/", requiresExistingTeacherGate: true },
    { name: "系統", label: "系統", url: "https://blockplanetcamp.com/camp2026/weclass.html" },
    { name: "行政", label: "行政", url: "https://blockplanetcamp.com/camp2026/weclass.html?role=admin" },
    { name: "總後台", label: "總後台", url: "https://blockplanetcamp.com/camp2027/admin.html" },
    { name: "寶可夢卡牌大賽", label: "寶可夢卡牌大賽", url: "https://blockplanetcamp.com/camp2026/pokemon/index.html" },
    { name: "無人機足球晉級賽", label: "無人機足球晉級賽", url: "https://blockplanetcamp.com/camp2026/drone-soccer/index.html" },
    { name: "廢材機器人淘汰賽", label: "廢材機器人淘汰賽", url: "https://blockplanetcamp.com/camp2026/junkbot-tournament/index.html" }
  ],
  camps: [
    {
      id: "full-term",
      poster: "assets/lights-poster.webp",
      name: "五燈獎・大聖鬧辦桌",
      shortName: "五燈獎・大聖鬧辦桌",
      category: "冬令營全期營",
      subtitle: "從辦桌文化探索民俗與傳統技藝",
      days: 9,
      daysLabel: "冬令營全期營",
      dates: ["2027-01-21", "2027-01-22", "2027-01-25", "2027-01-26", "2027-01-27", "2027-01-28", "2027-01-29", "2027-02-01", "2027-02-02"],
      dateLabel: "2027/1/21–2/2",
      dateNote: "完整營期參加，週末休息。",
      ageLabel: "國小一年級至六年級",
      timeLabel: "09:00–17:00",
      pickupLabel: "07:30 開門，18:30 前接回",
      classroomIds: ["north", "yongkang"],
      classroomLabel: "東橋教室／北區教室",
      priceLabel: "早鳥 NT$12,000／人",
      priceNote: "11/30 前報名享早鳥價，原價 NT$15,000／人。",
      pricing: {
        currency: "TWD",
        original: 15000,
        earlyBird: 12000,
        earlyBirdDeadlineLabel: "11/30 前報名",
        earlyBirdDeadline: null,
        sourceId: "full-term-form",
        sourceNote: "表單明載 11/30 前；未另載年份或截止時分，不據此實作倒數。"
      },
      description: "跟著齊天大聖探索村落、操演戲偶、體驗捏麵人與畫糖，從陀螺與扯鈴認識旋轉，再合作布置自己的辦桌宴席。孩子把文化、觀察與創意帶進寒假。",
      highlights: ["五種文化體驗", "大崎村落創意基地走讀", "孩子共同策劃辦桌盛會"],
      activities: [
        {
          "title": "村落探索燈",
          "description": "大崎村落創意基地 玩學走讀",
          "learningPoints": [
            "在地文化",
            "環境觀察",
            "美感探索",
            "創意轉化"
          ],
          "frameIndex": 3,
          "experienceId": "village",
          "sourceIds": [
            "lights-final-poster"
          ]
        },
        {
          "title": "戲劇藝術燈",
          "description": "布袋戲文化與戲偶操演",
          "learningPoints": [
            "肢體與聲音表達",
            "故事改編",
            "團隊合作"
          ],
          "frameIndex": 2,
          "experienceId": "puppet",
          "sourceIds": [
            "lights-final-poster"
          ]
        },
        {
          "title": "傳統工藝燈",
          "description": "捏麵人創作與畫糖體驗",
          "learningPoints": [
            "材料探索",
            "造型設計",
            "精細動作"
          ],
          "frameIndex": 0,
          "experienceId": "craft",
          "sourceIds": [
            "lights-final-poster"
          ]
        },
        {
          "title": "童玩科學燈",
          "description": "陀螺與扯鈴的旋轉探索",
          "learningPoints": [
            "科學觀察",
            "手眼協調",
            "動作控制",
            "問題解決"
          ],
          "frameIndex": 1,
          "experienceId": "journey",
          "sourceIds": [
            "lights-final-poster"
          ]
        },
        {
          "title": "辦桌文化燈",
          "description": "辦桌文化與宴席布置",
          "learningPoints": [
            "文化理解",
            "美感設計",
            "空間規劃",
            "合作分工"
          ],
          "frameIndex": 4,
          "experienceId": "banquet",
          "sourceIds": [
            "lights-final-poster"
          ]
        }
      ],
      outcome: "孩子共同策劃的辦桌盛會，呈現文化探索、手藝與合作成果。",
      parentEvent: {
        name: "孩子的尾牙",
        date: "2027-02-02",
        timeLabel: "2/2（二）晚上",
        description: "開放家長報名參與成果展演與文化饗宴。",
        note: "家長出席與費用另行統計，請留意後續表單通知。"
      },
      extendedCare: {
        appliesToCampId: "full-term",
        startsAfter: "18:30",
        ratePerHour: 190,
        rounding: "未滿一小時以一小時計算",
        notice: "當天如需晚一點接回，請提前告知老師。"
      },
      registration: {
        kind: "form",
        label: "立即報名",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform",
        note: "此表單僅適用五燈獎全期營。"
      },
      sourceIds: ["full-term-form", "lights-final-poster", "user-confirmed-scope"],
      status: "details-verified"
    },
    {
      id: "drone",
      poster: "assets/drone-poster-uav.webp",
      name: "祥龍無人機派對",
      shortName: "祥龍無人機派對",
      category: "特色主題營",
      subtitle: "無人機足球 × 中華文化",
      days: 5,
      daysLabel: "5 日特色營",
      dates: ["2027-01-25", "2027-01-26", "2027-01-27", "2027-01-28", "2027-01-29"],
      dateLabel: "2027/1/25–1/29",
      dateNote: "五天獨立主題課程。",
      ageLabel: "歡迎 LINE 洽詢適合年齡",
      timeLabel: "每日時段近期公布",
      pickupLabel: "接送安排請 LINE 洽詢",
      classroomIds: ["north"],
      classroomLabel: "北區教室",
      priceLabel: "費用近期公布",
      priceNote: "歡迎先透過 LINE 了解課程與報名資訊。",
      pricing: null,
      description: "把中華神話變成專屬無人機造型，從飛行原理、基礎操控到路線規劃與團隊競賽，和夥伴一起迎接空中的挑戰。",
      highlights: ["設計文化主題飛行造型", "練習操控與障礙接力", "學習問題判斷與基礎維護"],
      activities: [
        { title: "中華創意飛", description: "融入中華神話，設計自己的無人機造型。" },
        { title: "科學與操控", description: "認識飛行原理與平衡，練習基礎操控。" },
        { title: "策略與競賽", description: "和夥伴合作規劃飛行路線，挑戰障礙接力賽。" },
        { title: "排障與維修", description: "練習問題判斷，認識基礎維修與維護。" }
      ],
      outcome: "文化造型創作、飛行操控與團隊任務的完整體驗。",
      registration: { kind: "form", label: "立即報名", url: "https://docs.google.com/forms/d/e/1FAIpQLSeEDR0yX9Q5__UJq0HIXpTm71_tHfoSa_dmJab6LX535jI94w/viewform", note: "前往 Google 表單填寫報名資料。" },
      sourceIds: ["drone-poster", "user-confirmed-scope"],
      status: "additional-details-upcoming"
    },
    {
      id: "lego",
      poster: "assets/lego-poster.webp",
      name: "LEGO IDEAS 玩具設計總監",
      shortName: "玩具設計總監",
      category: "特色主題營",
      subtitle: "把中華故事，拼成自己的原創盒組",
      days: 5,
      daysLabel: "5 日特色營",
      dates: ["2027-01-25", "2027-01-26", "2027-01-27", "2027-01-28", "2027-01-29"],
      dateLabel: "2027/1/25–1/29",
      dateNote: "與祥龍無人機派對同期，請擇一參加；也與五燈獎全期營重疊。",
      ageLabel: "歡迎 LINE 洽詢適合年齡",
      timeLabel: "每日時段近期公布",
      pickupLabel: "接送安排請 LINE 洽詢",
      classroomIds: ["yongkang", "north"],
      classroomLabel: "東橋教室／北區教室",
      priceLabel: "費用近期公布",
      priceNote: "歡迎先透過 LINE 了解課程與報名資訊。",
      pricing: null,
      description: "從中華故事發想，畫出原創設計，在 3D 軟體中建立作品，再製作步驟圖與說明書、設計包裝，完成自己的原創盒組。",
      highlights: ["從文化故事找靈感", "3D 設計與組裝圖解", "打造自己的原創盒組"],
      activities: [
        { title: "文化發想", description: "從中華故事出發，畫出自己的原創設計。" },
        { title: "3D 設計", description: "使用 3D 軟體，把點子拼成 3D 作品。" },
        { title: "圖解列印", description: "製作組裝步驟圖與說明書，讓自己的設計可以被理解。" },
        { title: "盒組發行", description: "設計包裝，完成屬於自己的原創盒組。" }
      ],
      outcome: "從發想到圖解、包裝的原創盒組設計成果。",
      registration: { kind: "form", label: "立即報名", url: "https://docs.google.com/forms/d/e/1FAIpQLSdH_h8GOVi9iSzJk2kjqdwXfRWkLC-gXRc_keDiIu4dk5XDKA/viewform", note: "前往 Google 表單填寫報名資料。" },
      sourceIds: ["lego-poster", "user-confirmed-scope", "lego-dates-20261019"],
      status: "additional-details-upcoming"
    },
    {
      id: "game-lab",
      poster: "assets/game-lab-poster.webp",
      posterPreview: "assets/game-lab-poster-preview.webp",
      posterWidth: 1086,
      posterHeight: 1448,
      selectionLabel: "設計遊戲",
      name: "Game Lab｜遊戲設計師養成營",
      shortName: "遊戲設計師養成營",
      category: "兩日主題營",
      subtitle: "年獸出沒！新春功夫大冒險",
      days: 2,
      daysLabel: "2 日特色營",
      dates: ["2027-01-21", "2027-01-22"],
      dateLabel: "2027/1/21–1/22",
      dateNote: "兩日營各主題同時開課，請擇一參加；也與五燈獎全期營前兩日重疊。",
      ageLabel: "適合年齡稍後公布",
      timeLabel: "每日時段稍後公布",
      pickupLabel: "接送安排稍後公布",
      classroomIds: ["north"],
      classroomLabel: "北區教室",
      priceLabel: "費用稍後公布",
      priceNote: "可先透過 LINE 報名，確認費用與開課安排。",
      pricing: null,
      introduction: "年獸來了！英雄長什麼樣子？要使出什麼招式？這次，角色、動作和遊戲規則，都由孩子來設計！",
      description: "兩天裡，孩子將使用 Microsoft MakeCode Arcade，從畫出像素角色開始，透過積木程式讓角色移動、跳躍、出招，親手做出自己的新春功夫遊戲！",
      highlights: ["自己畫角色與動作動畫", "用積木程式設計玩法", "試玩修改，分享自己的遊戲"],
      activities: [
        { title: "像素角色設計", description: "畫出功夫英雄與年獸，製作角色的動作動畫，讓想像中的人物動起來。", learningPoints: ["像素繪圖", "角色造型", "動作動畫"] },
        { title: "積木程式編寫", description: "設定移動、跳躍與攻擊，認識按鍵操作、事件觸發與程式執行的關係。", learningPoints: ["按鍵操作", "事件觸發", "積木程式"] },
        { title: "遊戲規則設計", description: "設定血量、得分與過關條件，練習條件判斷，也思考怎樣的挑戰才好玩。", learningPoints: ["條件判斷", "血量與得分", "關卡挑戰"] },
        { title: "試玩、修改與分享", description: "和同伴交換試玩，找出問題、調整玩法，完成能與家人朋友分享的遊戲作品。", learningPoints: ["測試除錯", "調整玩法", "作品分享"] }
      ],
      outcome: "自己畫角色、自己寫程式、自己決定怎麼玩！這個新春，一起做出一款自己也想一直玩的遊戲！",
      registration: { kind: "inquiry", label: "LINE 報名", url: "https://lin.ee/zFqqFzQ", note: "向我們說想報名 Game Lab，確認費用、年齡與每日時段。" },
      sourceIds: ["game-lab-user-20261019", "game-lab-poster"],
      status: "additional-details-upcoming"
    },
    {
      id: "aviation",
      poster: "assets/aviation-poster.webp",
      posterPreview: "assets/aviation-poster-preview.webp",
      posterWidth: 1122,
      posterHeight: 1402,
      selectionLabel: "打造飛行器",
      name: "「機」不可失｜飛行航空科學營",
      shortName: "「機」不可失",
      category: "兩日主題營",
      subtitle: "新春飛行發明家",
      days: 2,
      daysLabel: "2 日入門營",
      dates: ["2027-01-21", "2027-01-22"],
      dateLabel: "2027/1/21–1/22",
      dateNote: "兩日營各主題同時開課，請擇一參加；也與五燈獎全期營前兩日重疊。",
      ageLabel: "適合年齡稍後公布",
      timeLabel: "每日時段稍後公布",
      pickupLabel: "接送安排稍後公布",
      classroomIds: ["yongkang"],
      classroomLabel: "東橋教室",
      priceLabel: "費用稍後公布",
      priceNote: "可先透過 LINE 報名，確認費用與開課安排。",
      pricing: null,
      introduction: "新年第一個發明，從親手打造一架飛機開始。",
      description: "從新春找靈感，親手裁切、組裝自己的飛行器。找重心、練習遙控試飛，從每次測試裡修改；馬達等配件還能拆下重用，讓下一個點子繼續起飛。",
      editorialIntroduction: "「我想做的這個，也可以飛嗎？」孩子畫出來的，可能是一個紅包、一串鞭炮，也可能是一個需要他解釋半天，我們才看得懂的形狀。\n\n好，那就來研究，怎麼讓它飛起來。",
      editorialChapters: [
        {
          title: "從新春點子，做出自己的形狀",
          paragraphs: ["從過年找靈感，畫下自己的想法，再親手裁切、組裝，把零件一個個安裝上去。原本只存在腦中的東西，慢慢有了形狀，也有了準備起飛的模樣。"]
        },
        {
          title: "想讓它飛，先一起弄明白",
          paragraphs: ["不過，想讓它飛，還有幾件事得弄明白。馬達要放哪裡？機身哪一邊比較重？拿起遙控器之後，它會照著預想的方向前進嗎？", "飛行原理，就在孩子想讓作品離開地面的那一刻，變成了他想知道的事。兩天裡，我們會陪孩子認識原理、動手製作、練習操控，也陪他一起處理那些「怎麼跟想的不一樣」的時刻。"]
        },
        {
          title: "每一次試飛，都留下新線索",
          paragraphs: ["看它怎麼飛，回頭檢查，動手修改，再試一次。每次試飛，都替下一次調整留下線索。"]
        },
        {
          title: "下一個點子，也能繼續起飛",
          paragraphs: ["這套裝備和學到的設計技巧，可以跟著孩子的下一個點子走。", "回到家後想換個造型，有更好的點子，就將馬達等配件拆下，裝到新設計的機身上，繼續測試。"]
        }
      ],
      highlights: ["從新春靈感親手造飛機", "找重心、練操控、反覆試飛", "拆裝配件，讓下一個點子繼續飛"],
      activities: [
        { title: "設計新春飛行器", description: "從紅包、鞭炮或自己的新春點子畫出草稿，思考飛行器的造型與結構。", learningPoints: ["新春靈感", "造型設計", "設計草稿"] },
        { title: "裁切、組裝與安裝", description: "親手裁切、組裝機身，把馬達等配件逐一安裝上去，讓想法慢慢有了形狀。", learningPoints: ["動手製作", "零件安裝", "結構觀察"] },
        { title: "找重心與練習操控", description: "觀察機身哪一邊比較重，調整馬達與配件的位置，認識飛行原理並練習遙控。", learningPoints: ["重心與平衡", "飛行原理", "遙控練習"] },
        { title: "試飛、修改與再創作", description: "從試飛找到修改線索，再調整、再測試；馬達等配件可拆下重用，裝到下一個新設計的機身。", learningPoints: ["觀察與測試", "反覆改良", "拆裝配件延續創作"] }
      ],
      outcome: "兩天，不只是做一架套用相同市售框架的飛機，而是一起學會「發明」屬於自己、獨一無二的飛行器。",
      registration: { kind: "inquiry", label: "LINE 報名", url: "https://lin.ee/zFqqFzQ", note: "向我們說想報名飛行航空科學營，確認費用、年齡與開課安排。" },
      sourceIds: ["aviation-user-brief", "aviation-approved-poster", "aviation-editorial-20261019"],
      status: "additional-details-upcoming"
    },
    {
      id: "fragrance",
      poster: "assets/fragrance-poster.webp",
      posterMobile: "assets/fragrance-poster-mobile.webp",
      posterPreview: "assets/fragrance-poster-mobile.webp",
      posterWidth: 1086,
      posterHeight: 1448,
      selectionLabel: "香氛手作",
      name: "小小生活工藝師｜新春香氛科學營",
      shortName: "小小生活工藝師",
      category: "兩日主題營",
      subtitle: "把驚喜藏進禮物，把心意留在香氣裡",
      days: 2,
      daysLabel: "2 日特色營",
      dates: ["2027-01-21", "2027-01-22"],
      dateLabel: "2027/1/21–1/22",
      dateNote: "兩日營各主題同時開課，請擇一參加；也與五燈獎全期營前兩日重疊。",
      ageLabel: "國小學童",
      timeLabel: "09:00–17:00",
      pickupLabel: "接送安排稍後公布",
      classroomIds: ["north"],
      classroomLabel: "北區教室",
      priceLabel: "費用稍後公布",
      priceNote: "可先透過 LINE 報名，確認費用與接送安排。",
      pricing: null,
      introduction: "這個新年，換孩子來設計一份驚喜。想一想，這份禮物要送給誰？他喜歡什麼味道？打開時，看到什麼會開心？",
      description: "從觀察、實驗到動手設計，親手製作驚喜沐浴球、新春香氛蠟燭，再設計專屬禮盒與祝福卡。讓香氣、色彩與科學，成為孩子送祝福的好幫手。",
      editorialIntroduction: "「裡面會出現什麼？再等一下，好像快看到了！」\n\n玩過驚喜泡澡球的孩子，一定懂那種心情——看著泡泡冒出來，眼睛捨不得移開，期待藏在裡面的小禮物慢慢現身。就像拆盲包一樣，最好玩的，還有揭曉前那一刻的期待。\n\n這個新年，換孩子來設計這份驚喜。想一想，這份禮物要送給誰？他喜歡什麼味道？打開時，看到什麼會開心？把自己曾經感受過的期待，變成一份親手製作的心意。\n\n誰說美感，不能和科學一起玩？在兩天的創作裡，孩子將從觀察、實驗到動手設計，讓香氣、色彩與科學，成為送祝福的好幫手。",
      editorialChapters: [
        {
          title: "新年驚喜沐浴球",
          paragraphs: ["探索遇水起泡的科學，親手調製、塑形，設計藏在泡泡裡的新年驚喜。連「等待它慢慢出現」的過程，都是禮物的一部分。"]
        },
        {
          title: "新春香氛蠟燭",
          paragraphs: ["認識材料特性，挑選香氣、搭配蠟砂色彩與春節造型，把「我覺得你會喜歡」做成看得見、聞得到的作品。"]
        },
        {
          title: "專屬禮盒與祝福卡",
          paragraphs: ["彩繪盒面、設計標籤，寫下想說的話。從打開包裝的第一眼，到使用禮物時的小驚喜，每一步都有孩子的巧思。"]
        }
      ],
      highlights: ["探索起泡科學，設計沐浴球驚喜", "調香配色，製作新春香氛蠟燭", "彩繪禮盒與祝福卡，親手送心意"],
      activities: [
        { title: "新年驚喜沐浴球", description: "探索遇水起泡的科學，親手調製、塑形，設計藏在泡泡裡的新年驚喜。", learningPoints: ["觀察與實驗", "起泡科學", "調製與塑形"] },
        { title: "新春香氛蠟燭", description: "認識材料特性，挑選香氣、搭配蠟砂色彩與春節造型，做出看得見、聞得到的心意。", learningPoints: ["材料特性", "香氣與配色", "造型設計"] },
        { title: "專屬禮盒與祝福卡", description: "彩繪盒面、設計標籤，寫下想說的話，讓包裝與禮物都藏著孩子的巧思。", learningPoints: ["包裝設計", "美感創作", "心意表達"] }
      ],
      outcome: "「這是我自己做的，特別送給你。」期待孩子捧著禮物說出這句話，也期待收到的人，在熟悉的香氣裡，想起這份暖暖的心意。",
      registration: { kind: "inquiry", label: "LINE 報名", url: "https://lin.ee/zFqqFzQ", note: "向我們說想報名北區教室的新春香氛科學營，確認費用與接送安排。" },
      sourceIds: ["fragrance-user-20261019", "fragrance-poster"],
      status: "additional-details-upcoming"
    }
  ],
  cultureExperiences: {
    "title": "五燈獎的五種文化體驗",
    "introduction": "從村落走讀、戲偶操演、傳統工藝到童玩科學與辦桌文化，點亮孩子的寒假。",
    "metadata": {
      "sourceId": "lights-final-poster",
      "isOfficialLampNaming": true,
      "order": "依使用者提供的2027正式海報，由左至右",
      "frameIndexBasis": "culture-story原始六格為工藝、童玩、戲劇、走讀、辦桌、成果；frameIndex為0起算。",
      "note": "五燈名稱、副標及學習重點以2027正式海報為準；全期正式主題維持使用者先前確認的五燈獎・大聖鬧辦桌。"
    },
    "items": [
      {
        "id": "village",
        "number": "01",
        "name": "村落探索燈",
        "shortName": "村落探索燈",
        "description": "大崎村落創意基地 玩學走讀",
        "learningPoints": [
          "在地文化",
          "環境觀察",
          "美感探索",
          "創意轉化"
        ],
        "frameIndex": 3,
        "bullets": [
          "在地文化",
          "環境觀察",
          "美感探索",
          "創意轉化"
        ],
        "sourceIds": [
          "lights-final-poster"
        ]
      },
      {
        "id": "puppet",
        "number": "02",
        "name": "戲劇藝術燈",
        "shortName": "戲劇藝術燈",
        "description": "布袋戲文化與戲偶操演",
        "learningPoints": [
          "肢體與聲音表達",
          "故事改編",
          "團隊合作"
        ],
        "frameIndex": 2,
        "bullets": [
          "肢體與聲音表達",
          "故事改編",
          "團隊合作"
        ],
        "sourceIds": [
          "lights-final-poster"
        ]
      },
      {
        "id": "craft",
        "number": "03",
        "name": "傳統工藝燈",
        "shortName": "傳統工藝燈",
        "description": "捏麵人創作與畫糖體驗",
        "learningPoints": [
          "材料探索",
          "造型設計",
          "精細動作"
        ],
        "frameIndex": 0,
        "bullets": [
          "材料探索",
          "造型設計",
          "精細動作"
        ],
        "sourceIds": [
          "lights-final-poster"
        ]
      },
      {
        "id": "journey",
        "number": "04",
        "name": "童玩科學燈",
        "shortName": "童玩科學燈",
        "description": "陀螺與扯鈴的旋轉探索",
        "learningPoints": [
          "科學觀察",
          "手眼協調",
          "動作控制",
          "問題解決"
        ],
        "frameIndex": 1,
        "bullets": [
          "科學觀察",
          "手眼協調",
          "動作控制",
          "問題解決"
        ],
        "sourceIds": [
          "lights-final-poster"
        ]
      },
      {
        "id": "banquet",
        "number": "05",
        "name": "辦桌文化燈",
        "shortName": "辦桌文化燈",
        "description": "辦桌文化與宴席布置",
        "learningPoints": [
          "文化理解",
          "美感設計",
          "空間規劃",
          "合作分工"
        ],
        "frameIndex": 4,
        "bullets": [
          "文化理解",
          "美感設計",
          "空間規劃",
          "合作分工"
        ],
        "sourceIds": [
          "lights-final-poster"
        ]
      }
    ]
  },
  itinerary: {
    campId: "full-term",
    title: "一起把文化辦成一場盛會",
    note: "以下為三週主題安排；每日活動順序請依教室通知。",
    periods: [
      { id: "week-1", label: "第一週", dateLabel: "1/21–1/22", days: 2, title: "辦桌開席 × 民藝探奇 × 窗花迎新", description: "認識辦桌與待客文化，討論各班表演與工作分配，探索捏麵人、畫糖等傳統技藝，親手剪出迎新窗花。", dates: ["2027-01-21", "2027-01-22"] },
      { id: "week-2", label: "第二週", dateLabel: "1/25–1/29", days: 5, title: "巧手民藝 × 西遊冒險 × 掌中有戲", description: "跟畫糖專家學手藝，體驗捏麵人、西遊人物與陀螺挑戰；製作戲偶、練習操偶配音與短劇，並走訪大崎村落創意基地。", dates: ["2027-01-25", "2027-01-26", "2027-01-27", "2027-01-28", "2027-01-29"] },
      { id: "week-3", label: "第三週", dateLabel: "2/1–2/2", days: 2, title: "五燈齊亮 × 辦桌大作戰 × 請世界吃桌", description: "合作設計活動、排練演出、製作道具並布置場地，把累積的故事、手藝與創意，化為孩子共同策劃的辦桌盛會。", dates: ["2027-02-01", "2027-02-02"] }
    ],
    days: [
      { number: 1, date: "2027-01-21", label: "1/21（四）", periodId: "week-1" },
      { number: 2, date: "2027-01-22", label: "1/22（五）", periodId: "week-1" },
      { number: 3, date: "2027-01-25", label: "1/25（一）", periodId: "week-2" },
      { number: 4, date: "2027-01-26", label: "1/26（二）", periodId: "week-2" },
      { number: 5, date: "2027-01-27", label: "1/27（三）", periodId: "week-2" },
      { number: 6, date: "2027-01-28", label: "1/28（四）", periodId: "week-2" },
      { number: 7, date: "2027-01-29", label: "1/29（五）", periodId: "week-2" },
      { number: 8, date: "2027-02-01", label: "2/1（一）", periodId: "week-3" },
      { number: 9, date: "2027-02-02", label: "2/2（二）", periodId: "week-3", eveningEvent: "孩子的尾牙；家長參與與費用另行統計。" }
    ],
    sourceIds: ["full-term-form", "user-confirmed-scope"],
    metadata: { dailyActivityAssignmentsKnown: false, note: "來源提供三週活動安排，未提供逐日課表；不能把週主題任意分配至特定一天。" }
  },
  comparison: {
    title: "找到適合孩子的寒假安排",
    introduction: "先看營期安排，再選孩子有興趣的主題。各營隊獨立報名。",
    campIds: ["full-term", "drone", "lego", "game-lab", "aviation", "fragrance"],
    fields: [
      { key: "daysLabel", label: "營隊方案" },
      { key: "dateLabel", label: "課程日期" },
      { key: "ageLabel", label: "適合年齡" },
      { key: "timeLabel", label: "課程時間" },
      { key: "classroomLabel", label: "上課教室" },
      { key: "priceLabel", label: "課程費用" }
    ],
    note: "各營隊的年齡、費用與接送安排分別適用；有疑問歡迎透過 LINE 詢問。"
  },
  faqGroups: [
    {
      id: "choosing", label: "怎麼選營隊", items: [
        { question: "全期營有包含其他特色營嗎？", answer: "沒有。冬令營全期營是「五燈獎・大聖鬧辦桌」的完整課程；LEGO IDEAS、祥龍無人機派對、Game Lab、飛行航空科學營與新春香氛科學營各有自己的課程與報名入口。", sourceIds: ["user-confirmed-scope", "fragrance-user-20261019"] },
        { question: "冬令營全期營是哪幾天？", answer: "冬令營全期營為 2027/1/21–2/2，週末休息。請完整參與營期。", sourceIds: ["full-term-form", "user-confirmed-scope"] },
        { question: "2 日營有哪些主題？", answer: "2027/1/21–1/22 有三種主題：北區教室的 Game Lab 遊戲設計師養成營，用 MakeCode Arcade 創作新春功夫遊戲；北區教室的小小生活工藝師，新春香氛科學營，製作驚喜沐浴球、香氛蠟燭與專屬禮盒；東橋教室的「機」不可失 飛行航空科學營，從造型、重心到反覆試飛，親手打造飛機。各主題同時開課，請擇一參加。", sourceIds: ["game-lab-user-20261019", "aviation-user-brief", "fragrance-user-20261019"] },
        { question: "適合幾年級的孩子？", answer: "五燈獎全期營適合國小一年級至六年級，新春香氛科學營適合國小學童。其餘營隊的適合年齡將分別公布，報名前可透過 LINE 確認。", sourceIds: ["full-term-form", "fragrance-poster"] },
        { question: "沒有積木設計或飛行經驗，可以參加嗎？", answer: "飛行營包含飛行原理與基礎操控；玩具設計營會從文化發想開始，延伸至 3D 設計、圖解與包裝。歡迎告訴我們孩子的年級與經驗，由教室協助確認適合的課程。", sourceIds: ["drone-poster", "lego-poster"] }
      ]
    },
    {
      id: "daily-life", label: "上課與營隊生活", items: [
        { question: "全期營每天幾點上課？可以提早送到教室嗎？", answer: "全期營上課時間是 09:00–17:00，教室最早 07:30 開放，請於 18:30 前接回。各特色營的每日時段與接送安排請另向教室確認。", sourceIds: ["full-term-form"] },
        { question: "全期營如果超過 18:30 才能接回，怎麼辦？", answer: "請提前告知老師。全期營超過 18:30 接回，延托費為每小時 NT$190，未滿一小時以一小時計算。", sourceIds: ["full-term-form"] },
        { question: "在哪裡上課？", answer: "冬令營全期營與 LEGO IDEAS 可選東橋教室或北區教室；祥龍無人機派對只在北區教室。兩日營的 Game Lab 與新春香氛科學營在北區教室，飛行航空科學營在東橋教室。東橋教室：台南市永康區東橋一路558號；北區教室：台南市北區中華北路二段113號。", sourceIds: ["full-term-form", "campus-period-20261019", "fragrance-user-20261019"] },
        { question: "全期營有戶外活動嗎？", answer: "有。第二週的主題安排包含大崎村落創意基地走讀，觀察村落中的藝術與生活。出發時間與當日準備事項請依教室通知。", sourceIds: ["full-term-form"] },
        { question: "午餐、午休和需要攜帶的物品怎麼安排？", answer: "請透過 LINE 告訴我們想參加的營隊，由教室提供該營的餐食、午休及攜帶物品說明。各營安排請分別確認。", sourceIds: [] },
        { question: "爸媽可以參加最後的辦桌嗎？", answer: "全期營最後一天 2/2（二）晚上將舉辦「孩子的尾牙」，開放家長報名參與成果展演與文化饗宴。家長出席與費用會另行統計，請留意後續表單通知。", sourceIds: ["full-term-form"] }
      ]
    },
    {
      id: "registration", label: "報名與費用", items: [
        { question: "全期營怎麼報名？", answer: "點選「立即報名」可前往五燈獎專屬 Google 表單，閱讀課程、費用及報名說明。特色營可由各營的「LINE 報名」入口聯繫。", action: { label: "前往全期營報名表", url: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform" }, sourceIds: ["full-term-form"] },
        { question: "全期營費用是多少？", answer: "五燈獎全期營 11/30 前報名享早鳥價 NT$12,000／人，原價 NT$15,000／人。這是 冬令營全期營的費用；各特色營的費用將另行公布。", sourceIds: ["full-term-form"] },
        { question: "可以報名不只一個營隊嗎？", answer: "可以。先從 1/21–1/22 的兩日營選一個主題，再參加 1/25–1/29 的祥龍無人機派對或 LEGO IDEAS 玩具設計總監，五日營也請擇一。各特色營都與五燈獎冬令營全期營重疊，同一位孩子不能同時參加全期營與重疊的特色營。", sourceIds: ["full-term-form", "drone-poster", "game-lab-user-20261019", "aviation-user-brief", "lego-dates-20261019", "fragrance-user-20261019"] },
        { question: "想請假、取消或更換梯次，可以怎麼處理？", answer: "請透過 LINE 提供所報名的營隊、教室及希望調整的日期，由教室說明該方案的處理方式。付款前也可以先詢問相關規則。", sourceIds: [] },
        { question: "特色營的日期與費用公布了嗎？", answer: "Game Lab、飛行航空科學營與新春香氛科學營皆為 2027/1/21–1/22 兩日營；祥龍無人機派對與 LEGO IDEAS 玩具設計總監皆為 2027/1/25–1/29 五日營。同日期的主題請擇一參加。新春香氛科學營適合國小學童，每日 09:00–17:00；其他尚未確認的資訊與各特色營費用將陸續公布。", sourceIds: ["drone-poster", "user-confirmed-scope", "lego-dates-20261019", "fragrance-poster"] }
      ]
    },
    {
      id: "coupon", label: "優惠券怎麼用", items: [
        { question: "優惠券什麼時候開放？", answer: "優惠券已延後開放，新的開放時間另行公布。目前可先瀏覽各營隊課程與報名資訊。", action: { label: "查看優惠券資訊", url: "coupon.html" }, sourceIds: ["coupon-update-20261019"] },
        { question: "優惠券適用哪些營隊？", answer: "這次 95 折優惠規劃納入五燈獎・大聖鬧辦桌、祥龍無人機派對、LEGO IDEAS 玩具設計總監，以及 Game Lab、飛行航空科學營、新春香氛科學營等兩日營。正式領取方式將隨開放公告說明。", sourceIds: ["coupon-winter-rules", "coupon-update-20261019", "fragrance-user-20261019"] },
        { question: "領到優惠券後，接著怎麼做？", answer: "正式開放後，領取優惠券、複製優惠碼，並在領取後 60 分鐘內依頁面說明完成報名。一支手機限領一張，限同一位學員使用。", sourceIds: ["coupon-winter-rules"] },
        { question: "可以用在不只一個營隊嗎？", answer: "同一位學員可在日期不衝堂的營隊追加使用，仍須符合券面期限與報名規則。1/21–1/22 的兩日營請擇一，可再追加 1/25–1/29 的祥龍無人機派對或 LEGO IDEAS，五日營也請擇一。各特色營都與五燈獎全期營重疊，不能與全期營同時追加。", sourceIds: ["coupon-winter-rules", "game-lab-user-20261019", "lego-dates-20261019", "fragrance-user-20261019"] },
        { question: "95 折怎麼算？能和同行優惠合併嗎？", answer: "五燈獎按早鳥價 NT$12,000 計算，95 折為 NT$11,400，五燈獎沒有同行價。其他營隊若有兩人同行價，與 95 折優惠擇優使用、不疊加；各營價格以正式公布資訊為準。", sourceIds: ["coupon-winter-rules"] }
      ]
    }
  ],
  sources: [
    { id: "fragrance-user-20261019", type: "user-provided-copy", title: "小小生活工藝師｜新春香氛科學營文案與教室日期", checkedOn: "2026-10-19", verification: "使用者提供完整文案並確認2027/1/21–1/22兩日營、北區教室。課程為驚喜沐浴球、新春香氛蠟燭、專屬禮盒與祝福卡；未提供費用、接送安排或專屬報名表，維持稍後公布及LINE報名。" },
    { id: "fragrance-poster", type: "provided-image", title: "新春香氛手作科學營.png", path: "assets/fragrance-poster.webp", checkedOn: "2026-10-19", verification: "使用者提供海報為1086×1448，明載1月21、22日、適合國小及09:00–17:00。以使用者文字副標「把驚喜藏進禮物，把心意留在香氣裡」作網站文案，保留原海報內容。" },
    { id: "campus-period-20261019", type: "user-confirmation", title: "冬令營全期營呈現與各營教室確認", checkedOn: "2026-10-19", verification: "全期營對外改稱冬令營全期營，日期統一顯示2027/1/21–2/2，實際課程日期與週末休息不變。全期營及LEGO為東橋／北區；祥龍無人機派對只在北區；Game Lab在北區；飛行航空在東橋。" },
    { id: "lego-dates-20261019", type: "user-confirmation", title: "LEGO IDEAS 五日營日期確認", checkedOn: "2026-10-19", verification: "使用者確認 LEGO IDEAS 五日營為2027年1月25日至29日；同步首頁、課程資料、行事曆與日期重疊說明。費用、年齡、時段、教室與優惠券開放狀態未變更。" },
    { id: "aviation-editorial-20261019", type: "user-provided-copy", title: "「機」不可失｜新春飛行發明家完整課程文案", checkedOn: "2026-10-19", verification: "依使用者本次完整文案更新主副標、首頁摘要、完整介紹與活動敘述；保留從新春發想到裁切組裝、馬達與重心、遙控試飛、反覆修改及配件拆裝重用的過程。此次呈現不作2–3架數量保證；既有日期、費用、時段、教室及報名資料未更動。" },
    { id: "game-lab-user-20261019", type: "user-confirmation", title: "Game Lab 兩日營文案與日期", checkedOn: "2026-10-19", verification: "使用者明確更正為2027年1月21、22日，非2月1、2日；採Microsoft MakeCode Arcade與提供的四項課程文案；費用、年齡、時段、教室與專屬報名表尚未提供。" },
    { id: "game-lab-poster", type: "provided-image", title: "Game Lab 冬令營兩日營海報.png", path: "assets/game-lab-poster.webp", provenance: "assets/two-day-poster-sources.json", checkedOn: "2026-10-19", verification: "採使用者最新提供的含日期版本，已視覺核對1月21、22日、GAME LAB、遊戲設計師養成營、新春功夫副標、兩日營及四項課程；保持原海報內容，只轉換網頁格式。" },
    { id: "aviation-user-brief", type: "user-confirmation", title: "「機」不可失2.0飛行航空科學營課程與命名", checkedOn: "2026-10-19", verification: "使用者先前確認兩日入門、從造型與重心到反覆試飛，預計製作約2–3架飛機；2026-10-19補充確認航空營也是2027年1月21、22日。新春副標與照片海報沿用前序版本。費用、年齡、時段、教室與專屬報名表未提供。" },
    { id: "aviation-approved-poster", type: "existing-generated-poster", title: "飛行航空科學營照片融合版海報", path: "assets/aviation-poster.webp", provenance: "assets/two-day-poster-sources.json", checkedOn: "2026-10-19", verification: "沿用既有新春海報與使用者提供的製作、試飛、成果照片；只轉換網頁格式。" },
    { id: "coupon-winter-rules", type: "user-confirmation", title: "2027冬令營優惠規則對話確認", checkedOn: "2026-10-19", verification: "沿用95折、領券後60分鐘內完成報名、一手機一張限同一學員、與同行價擇優不疊加；五燈獎12000元按95折為11400元且無同行價；日期不衝堂可追加使用、日期未定人工核對。" },
    { id: "coupon-update-20261019", type: "user-confirmation", title: "優惠券延後與兩日營納入", checkedOn: "2026-10-19", verification: "使用者要求先建完整網站，優惠券延後公開，未提供新開放時間；兩日營加入適用方案，不自動重新開放領券。" },
    {"id": "lights-final-poster", "type": "provided-final-image", "title": "2027五燈獎冬令營辦桌20261012-01.jpg", "path": "../03_原始素材/今年營隊/2027五燈獎冬令營辦桌20261012-01.jpg", "checkedOn": "2026-10-12", "verification": "已視覺核對2027年份、五燈由左至右順序、活動副標與全部學習重點；整體主題名稱維持使用者先前確認版本。"},
    { id: "full-term-form", type: "public-form", title: "2027冬令營《五燈獎・大聖鬧辦桌》報名表", url: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform", checkedOn: "2026-10-12", verification: "可見課程介紹頁與費用頁重新核對；未填寫資料、未提交報名。" },
    { id: "drone-poster", type: "provided-pdf", title: "2027寒假 無人機營隊.pdf", path: "../03_原始素材/今年營隊/2027寒假 無人機營隊.pdf", verification: "逐字視覺核對海報標題、五日日期與四組課程介紹。" },
    { id: "lego-poster", type: "provided-image", title: "2027 寒假lego idea .png", path: "../03_原始素材/今年營隊/2027 寒假lego idea .png", verification: "核對文化發想、3D軟體、圖解列印與盒組發行四項流程。" },
    { id: "user-confirmed-scope", type: "user-confirmation", title: "對話確認的營隊方案", verification: "全期營9日；全期與5日／2日特色營各有完整課程；兩日營主題與日期依2026-10-19及前序使用者確認更新；正式全期營名稱以報名表為準。" },
    { id: "existing-site", type: "existing-site-source", title: "2026網站既有教室、聯絡與老師入口", url: "https://blockplanetcamp.com/camp2026/", localSource: "blockplanet-official/camp2026/index.html", verification: "本地來源比對04資料夾既有清單；教室地址另與2027全期表單核對。" },
    { id: "coupon-baseline", type: "existing-feature-inventory", title: "既有優惠券功能保留清單", path: "../04_清單與交接/既有功能保留清單.json", verification: "只引用使用流程，不將2026年度開放日期、發券量或適用營隊當成2027年度設定。" }
  ]
};
