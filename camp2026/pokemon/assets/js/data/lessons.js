/* ============================================================
   lessons.js — 教學 11 章內容（資料驅動）
   每章：故事情境開場 + 條列重點 + 進階補充(only-advanced)
   ============================================================ */
const LESSONS = [
  {
    num: 1, icon: 'card', title: '什麼是寶可夢卡牌',
    story: '先拿一張「小布卡」在手上。你看到的不是普通圖片，而是一張可以上場對戰的角色資料表。',
    body: `
      <h2>先把一張卡當成「角色資料表」</h2>
      <ul>
        <li><b>上方</b>告訴你：這張卡叫什麼、現在是第幾階段、還有多少 HP。</li>
        <li><b>中間大圖</b>是角色本體，幫你一眼認出這張卡是誰。</li>
        <li><b>下方招式區</b>告訴你：要貼幾顆能量、可以打多少傷害、還有沒有額外效果。</li>
        <li><b>最底部</b>告訴你：怕什麼屬性、抵抗什麼、想撤退要付幾顆能量。</li>
      </ul>
      <div class="callout"><span class="ic"><span class="bp-icon i-battle"></span></span><div><b>新手先記一句：</b>寶可夢卡就是「角色 + 血量 + 招式 + 弱點」放在同一張紙上。會找這四件事，就能開始看懂卡。</div></div>
      <h2>那比賽在做什麼？</h2>
      <ul>
        <li>兩位訓練家各自用一副牌上場。</li>
        <li>把角色放到場上，貼能量，使用招式攻擊對手。</li>
        <li>打倒對手角色後拿獎勵卡，先達成勝利條件的人獲勝。</li>
      </ul>
      <div class="only-advanced callout"><span class="ic"><span class="bp-icon i-rules"></span></span><div><b>進階：</b>正式牌組通常是 60 張，同名卡數量有限制；營隊會依課程規則簡化。</div></div>
    `,
  },
  {
    num: 2, icon: 'rules', title: '認識卡牌',
    story: '把一張卡拿在手上，上面密密麻麻的圖案其實都有意思。我們一個一個看懂它。',
    body: `
      <h2>卡牌三大類</h2>
      <ul>
        <li><b>寶可夢卡</b>：上場對戰的主角，有 HP（血量）、屬性、招式。</li>
        <li><b>能量卡</b>：寶可夢攻擊的「燃料」，要先貼能量才能放招。</li>
        <li><b>訓練家卡</b>：道具 / 支援者 / 競技場，幫你抽牌、補血、搞破壞。</li>
      </ul>
      <h2>寶可夢卡看哪裡</h2>
      <ul>
        <li><b>HP</b>：右上角數字，歸零就被打倒。</li>
        <li><b>屬性</b>：右上角符號（火、水、草等）。</li>
        <li><b>招式 / 傷害</b>：中間，左邊是要的能量，右邊是傷害值。</li>
        <li><b>弱點 / 抵抗力 / 撤退</b>：最下方一排。</li>
      </ul>
      <div class="only-advanced callout"><span class="ic"><span class="bp-icon i-rules"></span></span><div><b>進階：</b>招式左側的能量符號代表「需要哪種、幾顆能量」；無色無色可用任何能量補。</div></div>
    `,
  },
  {
    num: 3, icon: 'screen', title: '對戰桌面',
    story: '坐到對戰桌前，先把桌面擺好。每個位置都有名字，擺對了才不會亂。',
    body: `
      <h2>你的場地有這些區</h2>
      <ul>
        <li><b>戰鬥區（出戰位）</b>：放 1 隻「現在正在打架」的寶可夢。</li>
        <li><b>備戰區（候補）</b>：最多 5 隻待命的寶可夢。</li>
        <li><b>牌庫</b>：抽牌的地方（背面朝上）。</li>
        <li><b>獎勵卡區</b>：開局放 6 張，打倒對手就拿一張。</li>
        <li><b>棄牌堆</b>：用過 / 被打倒的卡放這。</li>
      </ul>
      <div class="callout"><span class="ic"><span class="bp-icon i-screen"></span></span><div>兩人的桌面是<b>鏡像</b>的，面對面擺，戰鬥區對戰鬥區。</div></div>
    `,
  },
  {
    num: 4, icon: 'draw', title: '遊戲開始',
    story: '比賽要開始了！先決定誰先攻，再把寶可夢偷偷擺好，一起翻開——預備，開始！',
    body: `
      <h2>開局 5 步驟</h2>
      <ol>
        <li><b>猜先</b>：擲硬幣 / 猜拳，贏的人決定誰先攻。</li>
        <li><b>洗牌抽 7 張</b>：兩人各抽 7 張手牌。</li>
        <li><b>擺寶可夢</b>：出戰位放 1 隻「基礎寶可夢」，備戰區可再放最多 5 隻（先蓋著）。</li>
        <li><b>放獎勵卡</b>：從牌庫頂拿 6 張，蓋著放獎勵卡區。</li>
        <li><b>一起翻開</b>，開始！</li>
      </ol>
      <div class="callout"><span class="ic"><span class="bp-icon i-status"></span></span><div><b>沒有基礎寶可夢？</b>叫「<b>重抽（Mulligan）</b>」：亮出手牌、洗回去重抽 7 張，對手每遇你重抽一次可多抽 1 張。</div></div>
      <div class="only-advanced callout"><span class="ic"><span class="bp-icon i-rules"></span></span><div><b>進階：</b>先攻方第一回合<b>不能攻擊、不能用支援者卡</b>。</div></div>
    `,
  },
  {
    num: 5, icon: 'timer', title: '每回合流程',
    story: '輪到你了！每個回合就像照著食譜走：先抽牌，再做事，最後攻擊。記住順序就不會卡關。',
    body: `
      <h2>一個回合的順序</h2>
      <ol>
        <li><b>抽 1 張牌</b>（一定要抽；抽不出來就輸了→牌庫耗盡）。</li>
        <li><b>做這些事</b>（順序自由）：
          <ul>
            <li>把基礎寶可夢放上備戰區（可放多隻）</li>
            <li>進化寶可夢、使用特性</li>
            <li>玩道具卡（可多張）</li>
            <li><b>貼 1 顆能量</b>（每回合限 1 次）</li>
            <li>用 1 張支援者卡（每回合限 1 張）</li>
            <li>撤退出戰寶可夢（每回合限 1 次）</li>
          </ul>
        </li>
        <li><b>攻擊 1 次</b>（能量夠就放招），然後換對手。</li>
      </ol>
      <div class="callout"><span class="ic"><span class="bp-icon i-timer"></span></span><div>口訣：<b>抽 → 做事 → 攻擊</b>。攻擊完回合就結束。</div></div>
    `,
  },
  {
    num: 6, icon: 'battle', title: '攻擊與傷害',
    story: '能量集滿，是時候出招了！但傷害不是寫多少就多少——對手的「弱點」會讓你打更痛。',
    body: `
      <h2>怎麼攻擊</h2>
      <ul>
        <li>看招式左邊要的能量，<b>貼夠了</b>才能用。</li>
        <li>宣告招式 → 算傷害 → 放傷害指示物。</li>
      </ul>
      <h2>傷害怎麼算</h2>
      <ul>
        <li><b>弱點</b>：對手怕你這屬性 → 傷害 <b>×2</b>！（如火打草）</li>
        <li><b>抵抗力</b>：對手扛得住 → 傷害 <b>−20 或 −30</b>。</li>
        <li>備戰區的寶可夢<b>不會</b>被算弱點抵抗（只有出戰位會被打）。</li>
      </ul>
      <div class="callout"><span class="ic"><span class="bp-icon i-calc"></span></span><div>例：招式 50 傷害，對手有火弱點 → 50 × 2 = <b>100 傷害</b>！想練習算傷害？去「裁判台」的傷害計算機。</div></div>
      <div class="only-advanced callout"><span class="ic"><span class="bp-icon i-rules"></span></span><div><b>進階：</b>弱點先乘、抵抗力後減；其他加減效果依卡片指示再套用。</div></div>
    `,
  },
  {
    num: 7, icon: 'badge', title: '進化',
    story: '小火龍長大會變成火恐龍！卡牌也一樣，疊上進化卡，你的寶可夢會變得更強。',
    body: `
      <h2>進化規則</h2>
      <ul>
        <li>把進化卡<b>疊在</b>對應的寶可夢上（基礎 → 一階 → 二階）。</li>
        <li>進化後 HP、招式都升級，<b>原本的傷害指示物保留</b>。</li>
        <li>⛔ <b>剛放上場那回合不能進化</b>；對戰第 1 回合也不能進化。</li>
        <li>進化還能<b>清除特殊狀態</b>（睡著、中毒等都好了）。</li>
      </ul>
      <div class="only-advanced callout"><span class="ic"><span class="bp-icon i-rules"></span></span><div><b>進階：</b>「快速球 / 進化道具」等可跳過限制；同回合可進化多隻，只要各自符合條件。</div></div>
    `,
  },
  {
    num: 8, icon: 'status', title: '特殊狀態',
    story: '有些招式不只打傷害，還會讓對手睡著、麻痺、中毒……這些「特殊狀態」很煩，要學會處理。',
    body: `
      <h2>五種特殊狀態</h2>
      <ul>
        <li><b>睡眠</b>：卡片轉橫放，不能攻擊 / 撤退；回合間擲幣正面才醒。</li>
        <li><b>麻痺</b>：卡片轉橫放，這回合不能攻擊 / 撤退；下回合自動解除。</li>
        <li><b>中毒</b>：每回合之間放 1 顆傷害（10 點）。</li>
        <li><b>灼傷</b>：回合間受傷害，擲幣決定是否痊癒。</li>
        <li><b>混亂</b>：卡片上下顛倒，攻擊要擲幣，反面就自己受 30。</li>
      </ul>
      <div class="callout"><span class="ic"><span class="bp-icon i-rules"></span></span><div><b>怎麼解？</b>把寶可夢<b>撤退到備戰區</b>、或<b>進化</b>，狀態就清掉了！</div></div>
    `,
  },
  {
    num: 9, icon: 'battle', title: '勝利條件',
    story: '怎樣才算贏？有三條路通往勝利，記住它們，你才知道要往哪打。',
    body: `
      <h2>三種獲勝方式</h2>
      <ul>
        <li><b>拿完 6 張獎勵卡</b>：打倒對手寶可夢就拿 1 張，先拿完贏。</li>
        <li><b>對手沒寶可夢了</b>：打倒對手出戰位，且他備戰區也空了。</li>
        <li><b>對手牌庫耗盡</b>：換他抽牌卻抽不出來，他就輸。</li>
      </ul>
      <div class="callout"><span class="ic"><span class="bp-icon i-battle"></span></span><div>最常見的就是<b>搶 6 張獎勵卡</b>，這是主要目標！</div></div>
    `,
  },
  {
    num: 10, icon: 'rules', title: '新手技巧',
    story: '規則都會了，怎麼打得更聰明？這幾招讓你從「會玩」變「會贏」。',
    body: `
      <h2>5 個實用心法</h2>
      <ul>
        <li><b>能量別亂貼</b>：集中貼給主力，太分散會打不動。</li>
        <li><b>備戰區先養好</b>：出戰位被打倒，要有人能立刻補上。</li>
        <li><b>善用弱點</b>：派剋對手屬性的寶可夢上場，傷害翻倍。</li>
        <li><b>該撤就撤</b>：主力快被打倒，撤回去保命再戰。</li>
        <li><b>先抽牌再打</b>：用訓練家卡補手牌，選擇變多。</li>
      </ul>
    `,
  },
  {
    num: 11, icon: 'penalty', title: '常見錯誤',
    story: '新手最常踩這幾個雷，先知道就能避開，比賽時也不會被裁判糾正。',
    body: `
      <h2>別再犯這些錯</h2>
      <ul>
        <li>一回合貼了<b>兩顆以上</b>能量（限 1 顆）。</li>
        <li>一回合用了<b>兩張支援者</b>卡（限 1 張）。</li>
        <li>寶可夢<b>剛放上場就想進化</b>（要等下回合）。</li>
        <li>忘記<b>回合開始要抽牌</b>。</li>
        <li>把弱點抵抗<b>算到備戰區</b>（只算出戰位）。</li>
        <li>睡眠 / 麻痺時還想攻擊或撤退（不行）。</li>
      </ul>
      <div class="callout"><span class="ic"><span class="bp-icon i-judge"></span></span><div>真的吵起來怎麼辦？老師會用「裁判台」的<b>規則速查</b>跟<b>罰則助手</b>公正處理！</div></div>
    `,
  },
];

const OFFICIAL_CARD_DEMOS = {
  1: {
    title: '真卡示範：先分清楚三種卡',
    img: '../assets/img/cards/lesson-01-card-types.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['任一張寶可夢卡', '任一張基本能量卡', '任一張訓練家卡'],
    focus: ['左上卡名與卡種', '卡面中間圖像區', '下方規則文字'],
    lesson: '拿三張真卡並排看：有 HP / 招式的是寶可夢卡；只有能量符號的是能量卡；寫道具、支援者、競技場的是訓練家卡。',
  },
  2: {
    title: '真卡示範：一張寶可夢卡要讀哪裡',
    img: '../assets/img/cards/lesson-02-card-anatomy.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['任一張基礎寶可夢卡'],
    focus: ['右上 HP', '招式左側能量需求', '招式右側傷害', '最下方弱點 / 抵抗力 / 撤退'],
    lesson: '請孩子用手指出 HP、屬性、招式、傷害、弱點、抵抗力、撤退費用，確認他不是只看圖案。',
  },
  3: {
    title: '真卡示範：用真卡擺出桌面',
    img: '../assets/img/cards/lesson-03-playmat-layout.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['2 張寶可夢卡', '1 疊牌庫', '6 張獎勵卡'],
    focus: ['戰鬥區', '備戰區', '牌庫', '獎勵卡區', '棄牌堆'],
    lesson: '用真卡直接排桌面，比看文字快很多：出戰位只能 1 隻，備戰區最多 5 隻，獎勵卡開局蓋 6 張。',
  },
  4: {
    title: '真卡示範：開局手牌與基礎寶可夢',
    img: '../assets/img/cards/lesson-04-opening-hand.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['7 張手牌', '至少 1 張基礎寶可夢卡'],
    focus: ['基礎 / 進化標示', '出戰位蓋牌', '備戰區蓋牌', '6 張獎勵卡'],
    lesson: '讓孩子從 7 張手牌裡找「基礎寶可夢」。找不到就示範重抽，並讓對手知道可多抽 1 張。',
  },
  5: {
    title: '真卡示範：回合中能做什麼',
    img: '../assets/img/cards/lesson-05-turn-actions.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['寶可夢卡', '能量卡', '道具卡', '支援者卡'],
    focus: ['每回合抽 1 張', '每回合貼 1 顆能量', '支援者每回合 1 張', '攻擊後回合結束'],
    lesson: '用卡片排出「抽牌 → 做事 → 攻擊」。特別提醒：能量不是想貼幾張就貼幾張。',
  },
  6: {
    title: '真卡示範：招式、能量與傷害',
    img: '../assets/img/cards/lesson-06-attack-damage.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['有明確傷害數字的寶可夢卡', '對手有弱點的寶可夢卡'],
    focus: ['招式能量需求', '傷害數字', '弱點符號', '抵抗力數字'],
    lesson: '請孩子先看能量夠不夠，再看傷害。若打中弱點，就把卡上的傷害數字乘以 2。',
  },
  7: {
    title: '真卡示範：基礎、一階、二階進化',
    img: '../assets/img/cards/lesson-07-evolution-line.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['同一條進化線的基礎 / 一階 / 二階寶可夢'],
    focus: ['左上進化階段', '進化來源名稱', '疊在原本寶可夢上'],
    lesson: '把進化線照順序疊起來。傷害指示物留在上面，但睡眠、麻痺、中毒等特殊狀態會清掉。',
  },
  8: {
    title: '真卡示範：特殊狀態怎麼放',
    img: '../assets/img/cards/lesson-08-special-conditions.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['會造成睡眠 / 麻痺 / 中毒等效果的寶可夢卡'],
    focus: ['招式效果文字', '卡片轉向', '中毒 / 灼傷標記'],
    lesson: '不要只念效果，直接把卡轉橫、上下顛倒或放狀態標記，孩子會更快記住。',
  },
  9: {
    title: '真卡示範：怎樣算贏',
    img: '../assets/img/cards/lesson-09-win-conditions.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['6 張獎勵卡', '被擊倒的寶可夢卡', '空牌庫示範'],
    focus: ['獎勵卡張數', '戰鬥區與備戰區是否還有寶可夢', '牌庫是否抽得出牌'],
    lesson: '把 6 張獎勵卡一張張拿走，比口頭說明更清楚。三種勝利條件都用真卡擺一次。',
  },
  10: {
    title: '真卡示範：策略判斷',
    img: '../assets/img/cards/lesson-10-basic-strategy.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['主力寶可夢', '備戰寶可夢', '能量卡', '抽牌用訓練家卡'],
    focus: ['能量集中貼給誰', '備戰區是否有下一隻', '對手弱點', '撤退費用'],
    lesson: '讓孩子用真卡回答：這顆能量該貼誰？快被打倒要不要撤？下一隻能不能接上？',
  },
  11: {
    title: '真卡示範：常見犯規直接抓出來',
    img: '../assets/img/cards/lesson-11-common-mistakes.jpg',
    officialUrl: 'https://asia.pokemon-card.com/tw/card-search/',
    cards: ['能量卡', '支援者卡', '剛放上場的寶可夢', '有弱點 / 抵抗的寶可夢'],
    focus: ['一回合能量次數', '支援者使用次數', '進化限制', '弱點只算出戰位'],
    lesson: '老師可以把錯誤場面擺出來，請孩子指出哪裡不合法，再修正成正確狀態。',
  },
};

const MASCOT_CARD_LIBRARY = [
  {
    key: 'xiaobu',
    name: '小布',
    type: '雷',
    role: '電光速度 · 觀察主題',
    img: '../assets/img/mascot-cards/xiaobu-three-stage-card-concept.png',
    stages: [
      { label: 'Baby Stage', name: '小小布', hp: 50, img: '../assets/img/mascot-cards/stages/xiaobu-stage-1.png' },
      { label: 'Stage 1', name: '星布', hp: 90, img: '../assets/img/mascot-cards/stages/xiaobu-stage-2.png' },
      { label: 'Final Stage', name: '小布', hp: 140, img: '../assets/img/mascot-cards/stages/xiaobu-stage-3.png' },
    ],
  },
  {
    key: 'lala',
    name: '拉拉',
    type: '水',
    role: '水流回復 · 葉片造型',
    img: '../assets/img/mascot-cards/lala-three-stage-card-concept.png',
    stages: [
      { label: 'Baby Stage', name: '小拉拉', hp: 50, img: '../assets/img/mascot-cards/stages/lala-stage-1.png' },
      { label: 'Stage 1', name: '葉波拉拉', hp: 90, img: '../assets/img/mascot-cards/stages/lala-stage-2.png' },
      { label: 'Final Stage', name: '拉拉', hp: 140, img: '../assets/img/mascot-cards/stages/lala-stage-3.png' },
    ],
  },
  {
    key: 'aqiu',
    name: '阿球',
    type: '超',
    role: '精神判讀 · 裁判主題',
    img: '../assets/img/mascot-cards/aqiu-three-stage-card-concept.png',
    stages: [
      { label: 'Baby Stage', name: '小阿球', hp: 50, img: '../assets/img/mascot-cards/stages/aqiu-stage-1.png' },
      { label: 'Stage 1', name: '星智阿球', hp: 90, img: '../assets/img/mascot-cards/stages/aqiu-stage-2.png' },
      { label: 'Final Stage', name: '阿球', hp: 140, img: '../assets/img/mascot-cards/stages/aqiu-stage-3.png' },
    ],
  },
  {
    key: 'xingxing',
    name: '星星',
    type: '草',
    role: '草系守護 · 星光支援',
    img: '../assets/img/mascot-cards/xingxing-three-stage-card-concept.png',
    stages: [
      { label: 'Baby Stage', name: '小星星', hp: 40, img: '../assets/img/mascot-cards/stages/xingxing-stage-1.png' },
      { label: 'Stage 1', name: '星芽星星', hp: 80, img: '../assets/img/mascot-cards/stages/xingxing-stage-2.png' },
      { label: 'Final Stage', name: '星星', hp: 130, img: '../assets/img/mascot-cards/stages/xingxing-stage-3.png' },
    ],
  },
  {
    key: 'keke',
    name: '克克',
    type: '火',
    role: '火焰勇氣 · 旋輪衝刺',
    img: '../assets/img/mascot-cards/keke-three-stage-card-concept.png',
    stages: [
      { label: 'Baby Stage', name: '小克克', hp: 50, img: '../assets/img/mascot-cards/stages/keke-stage-1.png' },
      { label: 'Stage 1', name: '旋風克克', hp: 90, img: '../assets/img/mascot-cards/stages/keke-stage-2.png' },
      { label: 'Final Stage', name: '克克', hp: 150, img: '../assets/img/mascot-cards/stages/keke-stage-3.png' },
    ],
  },
];

const LESSON_CARD_DEMOS = {
  1: {
    label: '第一張卡',
    title: '先用小布看懂：一張卡到底在說什麼',
    imgs: ['../assets/img/mascot-cards/stages/xiaobu-stage-1.png'],
    evolutions: ['xiaobu'],
    cards: ['小小布 Baby Stage 卡'],
    focus: ['卡名：這張卡是誰', 'HP：還能承受多少傷害', '招式：可以做什麼', '能量：出招前要貼多少', '弱點與撤退：被打和換人時要看哪裡'],
    lesson: '新手不用先背所有規則。第一步只要看懂小布卡上的六個位置：卡名、HP、屬性、角色圖、招式區、底部資訊。',
    beginnerIntro: true,
  },
  2: {
    label: '卡面讀法',
    title: '用小布學會讀一張寶可夢風格卡',
    imgs: ['../assets/img/mascot-cards/xiaobu-three-stage-card-concept.png'],
    evolutions: ['xiaobu'],
    cards: ['小布三階段卡'],
    focus: ['Baby Stage / Stage 1 / Final Stage', 'HP 變化', '招式名稱與傷害數字', '能量需求圓點', '弱點、抵抗力、撤退費用'],
    lesson: '請孩子用手指出：名字在哪、HP 在哪、招式要幾顆能量、傷害是多少。能找到這些位置，就能開始讀真實對戰卡。',
    anatomy: true,
    fullRules: true,
  },
  3: {
    label: '桌面擺放',
    title: '用克克與阿球排出對戰桌面',
    imgs: ['../assets/img/mascot-cards/keke-three-stage-card-concept.png', '../assets/img/mascot-cards/aqiu-three-stage-card-concept.png'],
    evolutions: ['keke', 'aqiu'],
    cards: ['克克出戰位', '阿球備戰區', '6 張獎勵卡', '牌庫與棄牌堆'],
    focus: ['出戰位只能 1 隻', '備戰區最多 5 隻', '獎勵卡蓋 6 張', '牌庫背面朝上'],
    lesson: '把克克當成正在比賽的主力，阿球放在備戰區。孩子要能說出哪一隻會受到攻擊、哪一區最多可以放幾隻。',
  },
  4: {
    label: '開局示範',
    title: '用星星示範：開局先找基礎型態',
    imgs: ['../assets/img/mascot-cards/xingxing-three-stage-card-concept.png'],
    evolutions: ['xingxing'],
    cards: ['小星星 Baby Stage', '星芽星星 Stage 1', '星星 Final Stage'],
    focus: ['開局只能先放基礎 / Baby Stage', '進化卡先留在手牌', '沒有基礎就重抽', '獎勵卡在開局蓋好'],
    lesson: '請孩子指出哪張可以一開始放上場。進化型態不能直接當開局寶可夢，這是新手最容易漏掉的地方。',
  },
  5: {
    label: '回合流程',
    title: '用拉拉練習：抽牌、貼能量、再攻擊',
    imgs: ['../assets/img/mascot-cards/lala-three-stage-card-concept.png'],
    evolutions: ['lala'],
    cards: ['拉拉三階段卡', '任意能量代幣', '一張訓練家卡'],
    focus: ['每回合先抽 1 張', '每回合通常只能貼 1 顆能量', '支援者每回合 1 張', '攻擊後回合結束'],
    lesson: '能量是拿來支付招式與撤退，不是拿來進化。進化要看階段與來源名稱，這一點請孩子大聲講一次。',
  },
  6: {
    label: '攻擊與傷害',
    title: '用克克示範：能量夠了才可以出招',
    imgs: ['../assets/img/mascot-cards/keke-three-stage-card-concept.png'],
    evolutions: ['keke'],
    cards: ['克克火屬性卡', '能量代幣', '有弱點的對手卡'],
    focus: ['招式左邊要幾顆能量', '右邊傷害數字', '打中弱點傷害 x2', '抵抗力會減傷'],
    lesson: '請孩子先看克克的招式需要幾個能量圓點，再看傷害。若對手弱點被打中，才把傷害乘以 2。',
  },
  7: {
    label: '進化線',
    title: '五隻吉祥物都能從小隻長到最終型態',
    imgs: ['../assets/img/mascot-cards/xiaobu-three-stage-card-concept.png', '../assets/img/mascot-cards/lala-three-stage-card-concept.png'],
    evolutions: ['xiaobu', 'lala', 'aqiu', 'xingxing', 'keke'],
    cards: ['Baby Stage', 'Stage 1', 'Final Stage'],
    focus: ['進化來源名稱', '疊在原本角色上', '傷害指示物保留', '特殊狀態會清除'],
    lesson: '進化不是付能量就進化。要照卡上階段與來源名稱疊上去，而且剛放上場那回合通常不能進化。',
  },
  8: {
    label: '特殊狀態',
    title: '用阿球裁判卡記住狀態處理',
    imgs: ['../assets/img/mascot-cards/aqiu-three-stage-card-concept.png'],
    evolutions: ['aqiu'],
    cards: ['阿球超屬性卡', '狀態標記', '傷害指示物'],
    focus: ['招式效果文字', '睡眠 / 麻痺要轉橫', '混亂上下顛倒', '中毒與灼傷放標記'],
    lesson: '阿球是裁判系代表。示範時不要只講文字，直接把卡轉向或放標記，孩子比較容易記住。',
  },
  9: {
    label: '勝利條件',
    title: '用小布與克克示範拿獎勵卡',
    imgs: ['../assets/img/mascot-cards/xiaobu-three-stage-card-concept.png', '../assets/img/mascot-cards/keke-three-stage-card-concept.png'],
    evolutions: ['xiaobu', 'keke'],
    cards: ['6 張獎勵卡', '被擊倒的角色卡', '空牌庫示範'],
    focus: ['拿完 6 張獎勵卡', '對手場上沒有寶可夢', '對手抽不出牌'],
    lesson: '讓孩子實際把 6 張獎勵卡一張一張拿走，比背文字更清楚。三種勝利條件都要能說出來。',
  },
  10: {
    label: '策略判斷',
    title: '五色卡分工：主攻、支援、裁判、回復、衝刺',
    imgs: MASCOT_CARD_LIBRARY.map(x => x.img),
    evolutions: ['xiaobu', 'lala', 'aqiu', 'xingxing', 'keke'],
    cards: ['主力卡', '備戰卡', '能量代幣', '抽牌支援卡'],
    focus: ['能量集中貼給誰', '誰快被打倒要撤退', '備戰區是否有下一隻', '誰能打對手弱點'],
    lesson: '請孩子選一張主力和一張備戰，說出為什麼。策略不是只看誰可愛，而是看能量、傷害、HP 與弱點。',
  },
  11: {
    label: '錯誤修正',
    title: '用五色卡抓出新手常見錯誤',
    imgs: ['../assets/img/mascot-cards/lala-three-stage-card-concept.png', '../assets/img/mascot-cards/aqiu-three-stage-card-concept.png'],
    evolutions: ['lala', 'aqiu'],
    cards: ['剛放上場的角色卡', '多貼的能量', '第二張支援者', '備戰區角色'],
    focus: ['一回合只能貼一次能量', '支援者每回合一次', '剛上場不能立刻進化', '弱點只算出戰位'],
    lesson: '老師可以故意擺錯：多貼一顆能量、剛放就進化、把弱點算到備戰區。請孩子指出錯誤，再修成正確狀態。',
  },
};

const CARD_RULE_DETAIL_SECTIONS = [
  {
    id: 'rule-pokemon-card',
    icon: 'card',
    kicker: '卡牌 4 大類之一',
    title: '寶可夢卡',
    summary: '寶可夢卡是上場戰鬥的角色。它有 HP、屬性、進化階段、招式、弱點、抵抗力和撤退費用。',
    points: [
      ['用來做什麼', '放到戰鬥區或備戰區，負責攻擊對手，也會承受對手攻擊。'],
      ['HP 是什麼', '可以想成血量。受到的傷害累積到 HP 以上，這隻寶可夢就會昏厥。'],
      ['招式怎麼看', '招式左邊看需要幾顆能量，右邊看傷害，下面看額外效果。'],
      ['底部資訊', '弱點、抵抗力、撤退費用都在底部；被攻擊和換人時會用到。'],
    ],
    teacher: '上課先讓孩子只找 4 件事：名稱、HP、招式、底部資訊。找得到，再講進化和特殊規則。',
  },
  {
    id: 'rule-card-face',
    icon: 'rules',
    kicker: '卡面位置',
    title: '寶可夢卡 9 個玩法位置',
    summary: '上桌對戰先看名稱、HP、屬性、進化、特性、招式、弱點、抵抗和撤退。收藏資訊先不放進新手教學。',
    points: [
      ['1 名稱', '這張卡是誰；同名卡在正式牌組通常有張數限制。'],
      ['2 HP', '受到等同或超過 HP 的傷害後會昏厥。'],
      ['3 屬性', '影響弱點、抵抗力和能量策略。'],
      ['4 進化標記', '看它是基礎、1 階還是 2 階。'],
      ['5 特性', '不是攻擊，使用後通常不會結束回合。'],
      ['6 招式', '用來攻擊或產生效果；要先看能量需求。'],
      ['7 弱點', '被指定屬性打中時，通常傷害會變大。'],
      ['8 抵抗力', '被指定屬性攻擊時，依卡面減少傷害。'],
      ['9 撤退', '從戰鬥區換到備戰區時，要丟棄幾顆能量。'],
    ],
    teacher: '新手課只講這 9 個對戰會用的位置，讓孩子先能上桌判斷與操作。',
  },
  {
    id: 'rule-evolution',
    icon: 'badge',
    kicker: '寶可夢卡細節',
    title: '進化階段與進化方式',
    summary: '寶可夢通常分成基礎、1 階、2 階。進化是把手上的下一階段卡疊上去，不是能量集滿自動進化。',
    points: [
      ['基礎', '可以直接放到場上，是開局最重要的卡。'],
      ['手牌要有下一階段', '想進化時，要從手牌拿出對應的 1 階或 2 階卡。'],
      ['疊在原卡上', '1 階疊在指定基礎上；2 階疊在指定 1 階上。'],
      ['不能立刻進化', '剛放上場的那一回合通常不能馬上進化；對戰第 1 回合也通常不能進化。'],
      ['傷害保留', '進化後，原本放在身上的傷害指示物仍然留著。'],
      ['狀態清除', '睡眠、麻痺、中毒等特殊狀態會因進化而清除。'],
    ],
    teacher: '請孩子說一次：能量是拿來出招和撤退；進化靠的是手上的下一階段卡。',
  },
  {
    id: 'rule-type',
    icon: 'type',
    kicker: '屬性與相剋',
    title: '寶可夢屬性與屬性相剋',
    summary: '屬性會影響弱點和抵抗力。打中弱點時，傷害通常會加倍；遇到抵抗力時，傷害會減少。',
    points: [
      ['看屬性', '屬性通常在卡面上方，用徽章或符號表示。'],
      ['看弱點', '對手弱點如果剛好是你的攻擊屬性，傷害通常 x2。'],
      ['看抵抗力', '如果對手有抵抗力，依卡面減少傷害。'],
      ['只算出戰位', '大多數情況下，弱點與抵抗力只在攻擊出戰寶可夢時使用。'],
    ],
    teacher: '實體上課時，讓孩子先用手指弱點欄，再做傷害計算。',
  },
  {
    id: 'rule-energy',
    icon: 'energy',
    kicker: '卡牌 4 大類之一',
    title: '能量卡',
    summary: '能量卡是寶可夢使用招式和撤退時需要的資源。上課時可把能量半壓在寶可夢卡下方，表示它已附著。',
    points: [
      ['放在哪裡', '貼到某隻寶可夢身上；實體教學時可放在卡下方或旁邊。'],
      ['每回合 1 張', '自己的回合做事階段貼，通常每回合只能從手牌貼 1 張能量。'],
      ['招式要幾顆', '看招式左邊的能量符號。湊到需求後，才可以使用那個招式。'],
      ['無色費用', '招式上的無色符號可以用任何屬性的實際能量支付。'],
      ['特殊能量', '除了提供能量，還可能有額外效果或限制。'],
      ['能量不是進化費用', '進化看階段與來源名稱，不是看貼了幾顆能量。'],
    ],
    teacher: '孩子常把能量和進化混在一起，這裡一定要分清楚。',
  },
  {
    id: 'rule-trainer',
    icon: 'judge',
    kicker: '卡牌 4 大類之一',
    title: '訓練家卡',
    summary: '訓練家卡不是上場戰鬥的角色，而是幫助你抽牌、找牌、補血、換人或改變場地。',
    points: [
      ['物品卡', '通常一回合可以使用多張，效果用完後放到棄牌堆。'],
      ['寶可夢道具', '裝在寶可夢身上，提供持續效果；通常每隻只能裝有限數量。'],
      ['支援者卡', '效果通常較強，但每回合通常只能使用 1 張。'],
      ['競技場卡', '放在場地中央，會持續影響雙方；新的競技場通常會替換舊的。'],
    ],
    teacher: '裁判提醒口訣：物品多張、支援者一張、競技場場上通常留一張。',
  },
  {
    id: 'rule-special',
    icon: 'badge',
    kicker: '卡牌 4 大類之一',
    title: '特殊卡牌',
    summary: '特殊卡牌會加入額外規則。常見例子包含寶可夢 ex、古代/未來卡牌、訓練家的寶可夢等。',
    points: [
      ['寶可夢 ex', '通常 HP 高、招式強，但被擊倒時對手通常會拿 2 張獎勵卡。'],
      ['古代 / 未來', '卡面有特殊標記，會和特定卡牌效果互動。'],
      ['訓練家的寶可夢', '卡名會帶訓練家名稱，可想成某位訓練家帶來的專屬寶可夢；依卡面文字處理。'],
      ['先讀規則框', '看到特殊標記時，先看卡上的規則文字，再決定怎麼處理。'],
    ],
    teacher: '特殊卡牌不要靠猜；請孩子養成「先讀規則框」的習慣。',
  },
];
