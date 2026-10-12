/* 2027C verified campaign content. Source notes are internal metadata, not public copy. */
window.CAMP_DATA = {
  campaign: {
    id: "2027C",
    name: "2027 布拉克星球冬令營",
    year: 2027,
    language: "zh-Hant",
    verifiedOn: "2026-10-12",
    relationship: "寒假全期營與各特色營獨立授課、獨立報名。",
    relationshipDetail: "9 日全期營完整參與五燈獎課程；5 日與 2 日特色營各有自己的主題。全期營不包含其他特色營。"
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
      name: "永康教室",
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
    { name: "後台", label: "後台", url: "https://blockplanetcamp.com/camp2026/admin.html" },
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
      category: "寒假全期營",
      subtitle: "從辦桌文化探索民俗與傳統技藝",
      days: 9,
      daysLabel: "9 日全期營",
      dates: ["2027-01-21", "2027-01-22", "2027-01-25", "2027-01-26", "2027-01-27", "2027-01-28", "2027-01-29", "2027-02-01", "2027-02-02"],
      dateLabel: "1/21–1/22、1/25–1/29、2/1–2/2",
      dateNote: "三段日期，共 9 個課程日。",
      ageLabel: "國小一年級至六年級",
      timeLabel: "09:00–17:00",
      pickupLabel: "07:30 開門，18:30 前接回",
      classroomIds: ["north", "yongkang"],
      classroomLabel: "北區／永康教室可選",
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
        label: "報名 9 日全期營",
        url: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform",
        note: "此表單僅適用五燈獎全期營。"
      },
      sourceIds: ["full-term-form", "lights-final-poster", "user-confirmed-scope"],
      status: "details-verified"
    },
    {
      id: "drone",
      poster: "assets/drone-poster.webp",
      name: "祥龍飛行派對",
      shortName: "祥龍飛行派對",
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
      classroomIds: [],
      classroomLabel: "開課教室請 LINE 洽詢",
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
      registration: { kind: "inquiry", label: "LINE 洽詢飛行營", url: "https://lin.ee/zFqqFzQ", note: "向教室了解年齡、費用與開課安排。" },
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
      dates: [],
      dateLabel: "開課日期近期公布",
      dateNote: "五天獨立主題課程。",
      ageLabel: "歡迎 LINE 洽詢適合年齡",
      timeLabel: "每日時段近期公布",
      pickupLabel: "接送安排請 LINE 洽詢",
      classroomIds: [],
      classroomLabel: "開課教室請 LINE 洽詢",
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
      registration: { kind: "inquiry", label: "LINE 洽詢玩具設計營", url: "https://lin.ee/zFqqFzQ", note: "向教室了解開課日期、年齡與費用。" },
      sourceIds: ["lego-poster", "user-confirmed-scope"],
      status: "additional-details-upcoming"
    },
    {
      id: "two-day",
      name: "2 日特色營",
      shortName: "2 日特色營",
      category: "特色主題營",
      subtitle: "兩天的主題體驗，精彩內容近期公布",
      days: 2,
      daysLabel: "2 日特色營",
      dates: [],
      dateLabel: "開課日期近期公布",
      dateNote: "獨立課程與報名方案。",
      ageLabel: "歡迎 LINE 洽詢適合年齡",
      timeLabel: "每日時段近期公布",
      pickupLabel: "接送安排請 LINE 洽詢",
      classroomIds: [],
      classroomLabel: "開課教室請 LINE 洽詢",
      priceLabel: "費用近期公布",
      priceNote: "主題與課程內容將陸續公布。",
      pricing: null,
      description: "想安排兩天的寒假體驗，歡迎先向教室了解最新課程消息。",
      highlights: ["2 天獨立課程", "主題近期公布"],
      activities: [],
      outcome: null,
      registration: { kind: "inquiry", label: "LINE 洽詢 2 日營", url: "https://lin.ee/zFqqFzQ", note: "了解最新主題與開課資訊。" },
      sourceIds: ["user-confirmed-scope"],
      status: "details-upcoming"
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
    title: "9 天，一起把文化辦成一場盛會",
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
    introduction: "先看想參加的天數，再選孩子有興趣的主題。各營隊獨立報名。",
    campIds: ["full-term", "drone", "lego", "two-day"],
    fields: [
      { key: "daysLabel", label: "參加天數" },
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
        { question: "全期營有包含樂高營或飛行營嗎？", answer: "沒有。9 日全期營是「五燈獎・大聖鬧辦桌」的完整課程；玩具設計總監、祥龍飛行派對與 2 日特色營都屬於獨立課程，需要各自報名。", sourceIds: ["user-confirmed-scope"] },
        { question: "9 日全期營是哪幾天？", answer: "課程分為 1/21–1/22、1/25–1/29、2/1–2/2 三段，共 9 天。這是完整全期營的日期安排，不是三個分開報名的營隊。", sourceIds: ["full-term-form", "user-confirmed-scope"] },
        { question: "2 日營是五日營的縮短版嗎？", answer: "2 日特色營是獨立課程與報名方案。主題、日期和課程內容將陸續公布，歡迎透過 LINE 了解最新消息。", sourceIds: ["user-confirmed-scope"] },
        { question: "適合幾年級的孩子？", answer: "五燈獎全期營適合國小一年級至六年級。玩具設計總監、祥龍飛行派對與 2 日特色營的適合年齡，請分別向教室洽詢。", sourceIds: ["full-term-form"] },
        { question: "沒有積木設計或飛行經驗，可以參加嗎？", answer: "飛行營包含飛行原理與基礎操控；玩具設計營會從文化發想開始，延伸至 3D 設計、圖解與包裝。歡迎告訴我們孩子的年級與經驗，由教室協助確認適合的課程。", sourceIds: ["drone-poster", "lego-poster"] }
      ]
    },
    {
      id: "daily-life", label: "上課與營隊生活", items: [
        { question: "全期營每天幾點上課？可以提早送到教室嗎？", answer: "全期營上課時間是 09:00–17:00，教室最早 07:30 開放，請於 18:30 前接回。各特色營的每日時段與接送安排請另向教室確認。", sourceIds: ["full-term-form"] },
        { question: "全期營如果超過 18:30 才能接回，怎麼辦？", answer: "請提前告知老師。全期營超過 18:30 接回，延托費為每小時 NT$190，未滿一小時以一小時計算。", sourceIds: ["full-term-form"] },
        { question: "在哪裡上課？", answer: "五燈獎全期營可選北區教室（台南市北區中華北路二段113號）或永康教室（台南市永康區東橋一路558號）。各特色營開課教室請透過 LINE 洽詢。", sourceIds: ["full-term-form"] },
        { question: "全期營有戶外活動嗎？", answer: "有。第二週的主題安排包含大崎村落創意基地走讀，觀察村落中的藝術與生活。出發時間與當日準備事項請依教室通知。", sourceIds: ["full-term-form"] },
        { question: "午餐、午休和需要攜帶的物品怎麼安排？", answer: "請透過 LINE 告訴我們想參加的營隊，由教室提供該營的餐食、午休及攜帶物品說明。各營安排請分別確認。", sourceIds: [] },
        { question: "爸媽可以參加最後的辦桌嗎？", answer: "全期營最後一天 2/2（二）晚上將舉辦「孩子的尾牙」，開放家長報名參與成果展演與文化饗宴。家長出席與費用會另行統計，請留意後續表單通知。", sourceIds: ["full-term-form"] }
      ]
    },
    {
      id: "registration", label: "報名與費用", items: [
        { question: "全期營怎麼報名？", answer: "點選「報名 9 日全期營」可前往五燈獎專屬 Google 表單，閱讀課程、費用及報名說明。特色營請由各營的 LINE 洽詢入口聯絡教室。", action: { label: "前往全期營報名表", url: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform" }, sourceIds: ["full-term-form"] },
        { question: "全期營費用是多少？", answer: "五燈獎全期營 11/30 前報名享早鳥價 NT$12,000／人，原價 NT$15,000／人。這是 9 日全期營的費用；各特色營的費用將另行公布。", sourceIds: ["full-term-form"] },
        { question: "如果課程日期重疊，可以一起報名嗎？", answer: "飛行營 1/25–1/29 與全期營第二週日期重疊。請先向教室確認孩子的參加安排，再選擇適合的方案。", sourceIds: ["full-term-form", "drone-poster"] },
        { question: "想請假、取消或更換梯次，可以怎麼處理？", answer: "請透過 LINE 提供所報名的營隊、教室及希望調整的日期，由教室說明該方案的處理方式。付款前也可以先詢問相關規則。", sourceIds: [] },
        { question: "特色營的日期與費用什麼時候公布？", answer: "祥龍飛行派對已公布為 2027/1/25–1/29 五日營。玩具設計總監的開課日期，以及各特色營的費用、適合年齡和每日時段將陸續公布，歡迎 LINE 洽詢最新資訊。", sourceIds: ["drone-poster", "user-confirmed-scope"] }
      ]
    },
    {
      id: "coupon", label: "優惠券怎麼用", items: [
        { question: "在哪裡查看優惠券？", answer: "點選「查看優惠券」前往優惠券頁，可查看開放時間與領取方式。當年度的適用營隊與條件請依券面說明。", action: { label: "查看優惠券", url: "coupon.html" }, sourceIds: ["coupon-baseline"] },
        { question: "領到優惠券後，接著怎麼做？", answer: "請依優惠券頁的指示完成領取並查看優惠碼，再按頁面提供的報名與 LINE 確認流程使用。", sourceIds: ["coupon-baseline"] },
        { question: "優惠券可以用在哪個營隊？能和早鳥價一起用嗎？", answer: "適用營隊、使用期限與價格方案的搭配方式，請依券面及報名說明確認；不確定時，可先將想參加的營隊告訴教室。", sourceIds: ["coupon-baseline"] },
        { question: "優惠券有使用期限嗎？", answer: "請留意券面顯示的有效期限與倒數，並在期限內依頁面說明完成使用流程。", sourceIds: ["coupon-baseline"] },
        { question: "找不到已領取的優惠券或遇到問題，怎麼辦？", answer: "可先重新進入優惠券頁，依頁面提示操作；仍有問題時，請透過 LINE 聯絡教室協助。", sourceIds: ["coupon-baseline"] }
      ]
    }
  ],
  sources: [
    {"id": "lights-final-poster", "type": "provided-final-image", "title": "2027五燈獎冬令營辦桌20261012-01.jpg", "path": "../03_原始素材/今年營隊/2027五燈獎冬令營辦桌20261012-01.jpg", "checkedOn": "2026-10-12", "verification": "已視覺核對2027年份、五燈由左至右順序、活動副標與全部學習重點；整體主題名稱維持使用者先前確認版本。"},
    { id: "full-term-form", type: "public-form", title: "2027冬令營《五燈獎・大聖鬧辦桌》報名表", url: "https://docs.google.com/forms/d/e/1FAIpQLSfqclQFsLtNujPctIfk_elu3umDNIWr1W6C1MSIs5wc3BIVFg/viewform", checkedOn: "2026-10-12", verification: "可見課程介紹頁與費用頁重新核對；未填寫資料、未提交報名。" },
    { id: "drone-poster", type: "provided-pdf", title: "2027寒假 無人機營隊.pdf", path: "../03_原始素材/今年營隊/2027寒假 無人機營隊.pdf", verification: "逐字視覺核對海報標題、五日日期與四組課程介紹。" },
    { id: "lego-poster", type: "provided-image", title: "2027 寒假lego idea .png", path: "../03_原始素材/今年營隊/2027 寒假lego idea .png", verification: "核對文化發想、3D軟體、圖解列印與盒組發行四項流程。" },
    { id: "user-confirmed-scope", type: "user-confirmation", title: "對話確認的營隊方案", verification: "全期營9日；全期與5日／2日特色營獨立課程、獨立報名；兩日營主題未提供；正式全期營名稱以報名表為準。" },
    { id: "existing-site", type: "existing-site-source", title: "2026網站既有教室、聯絡與老師入口", url: "https://blockplanetcamp.com/camp2026/", localSource: "blockplanet-official/camp2026/index.html", verification: "本地來源比對04資料夾既有清單；教室地址另與2027全期表單核對。" },
    { id: "coupon-baseline", type: "existing-feature-inventory", title: "既有優惠券功能保留清單", path: "../04_清單與交接/既有功能保留清單.json", verification: "只引用使用流程，不將2026年度開放日期、發券量或適用營隊當成2027年度設定。" }
  ]
};
