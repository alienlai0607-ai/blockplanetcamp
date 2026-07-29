/* ============================================================
   card-system.js — 教材卡牌視覺元件與正式規則示範資料
   卡圖負責角色辨識；規則與文字留在 HTML，避免鎖死在圖片裡。
   ============================================================ */

const BP_CARD_PATH = '../assets/img/mascot-cards/stages/';

const BP_CARD_LINES = {
  xiaobu: {
    name: '小布', type: 'lightning', typeName: '雷',
    stages: [
      { stage: '基礎', name: '小小布', hp: 50, file: 'xiaobu-stage-1.png', evolvesFrom: '', attacks: [['無', '閃亮光點', '20']] },
      { stage: '1 階', name: '星布', hp: 90, file: 'xiaobu-stage-2.png', evolvesFrom: '小小布', attacks: [['雷無', '星光電擊', '40'], ['雷雷無', '閃耀連擊', '70+']] },
      { stage: '2 階', name: '小布', hp: 140, file: 'xiaobu-stage-3.png', evolvesFrom: '星布', attacks: [['雷雷無', '超新星爆發', '120']] },
    ],
  },
  lala: {
    name: '拉拉', type: 'water', typeName: '水',
    stages: [
      { stage: '基礎', name: '小拉拉', hp: 50, file: 'lala-stage-1.png', evolvesFrom: '', attacks: [['水', '水滴輕拍', '20']] },
      { stage: '1 階', name: '葉波拉拉', hp: 90, file: 'lala-stage-2.png', evolvesFrom: '小拉拉', attacks: [['水無', '水葉回復', '30']] },
      { stage: '2 階', name: '拉拉', hp: 140, file: 'lala-stage-3.png', evolvesFrom: '葉波拉拉', attacks: [['水水無', '星河療癒', '100']] },
    ],
  },
  aqiu: {
    name: '阿球', type: 'psychic', typeName: '超',
    stages: [
      { stage: '基礎', name: '小阿球', hp: 50, file: 'aqiu-stage-1.png', evolvesFrom: '', attacks: [['超', '星盤觀察', '20']] },
      { stage: '1 階', name: '星智阿球', hp: 90, file: 'aqiu-stage-2.png', evolvesFrom: '小阿球', attacks: [['超無', '規則判讀', '40']] },
      { stage: '2 階', name: '阿球', hp: 140, file: 'aqiu-stage-3.png', evolvesFrom: '星智阿球', attacks: [['超超無', '宇宙裁決', '110']] },
    ],
  },
  xingxing: {
    name: '星星', type: 'grass', typeName: '草',
    stages: [
      { stage: '基礎', name: '小星星', hp: 40, file: 'xingxing-stage-1.png', evolvesFrom: '', attacks: [['草', '安撫泡泡', '10']] },
      { stage: '1 階', name: '護芽星星', hp: 80, file: 'xingxing-stage-2.png', evolvesFrom: '小星星', attacks: [['草無', '嫩葉守護', '30']] },
      { stage: '2 階', name: '星星', hp: 130, file: 'xingxing-stage-3.png', evolvesFrom: '護芽星星', attacks: [['草草無', '星樹祝福', '90']] },
    ],
  },
  keke: {
    name: '克克', type: 'fire', typeName: '火',
    stages: [
      { stage: '基礎', name: '小克克', hp: 50, file: 'keke-stage-1.png', evolvesFrom: '', attacks: [['火', '出發喇叭', '20']] },
      { stage: '1 階', name: '旋風克克', hp: 90, file: 'keke-stage-2.png', evolvesFrom: '小克克', attacks: [['火無', '彎道衝刺', '50']] },
      { stage: '2 階', name: '克克', hp: 150, file: 'keke-stage-3.png', evolvesFrom: '旋風克克', attacks: [['火火無', '冠軍衝線', '120']] },
    ],
  },
};

const BP_TRAINER_CARDS = {
  item: {
    kind: '物品', name: '高級球', accent: 'blue', art: 'ball', artFile: 'high-grade-ball-art.png',
    rule: '必須將自己的 2 張手牌丟棄才可使用。從自己的牌庫選擇 1 張寶可夢卡，在給對手看過後加入手牌，並且重洗牌庫。',
    timing: '自己的回合可使用任意張物品卡。使用後丟到棄牌區。',
  },
  tool: {
    kind: '寶可夢道具', name: '氣球', accent: 'violet', art: 'balloon', artFile: 'air-balloon-art.png',
    rule: '附有這張卡的寶可夢，撤退所需的能量減少 2 個。',
    timing: '附在寶可夢身上持續生效。每隻寶可夢通常只能附 1 張寶可夢道具。',
  },
  supporter: {
    kind: '支援者', name: '博士的研究', accent: 'orange', art: 'teacher', artFile: 'aqiu-research-art.png',
    rule: '將自己的手牌全部丟棄。然後，從自己的牌庫抽出 7 張卡。',
    timing: '自己的回合只能使用 1 張支援者卡。先攻玩家的最初回合不能使用。',
  },
  stadium: {
    kind: '競技場', name: '布拉克星球練習場', accent: 'green', art: 'stadium', artFile: 'classroom-stadium-art.png',
    rule: '場上雙方所有基礎寶可夢的撤退所需能量，各減少 1 個無色能量。',
    timing: '放在場中央持續生效。場上已有同名競技場時不能使用；不同名稱會替換舊場地。',
  },
};

const CardUI = {
  pokemon(key = 'xiaobu', stageIndex = 0, caption = '') {
    const line = BP_CARD_LINES[key] || BP_CARD_LINES.xiaobu;
    const card = line.stages[stageIndex] || line.stages[0];
    return `<figure class="tcg-card pokemon-card-figure" data-type="${esc(line.type)}">
      <img src="${BP_CARD_PATH}${esc(card.file)}" alt="${esc(card.name)}寶可夢卡" loading="eager" decoding="async">
      <figcaption><b>${esc(card.stage)} · ${esc(card.name)}</b><span>HP ${card.hp}${caption ? ` · ${esc(caption)}` : ''}</span></figcaption>
    </figure>`;
  },

  energy(type = 'lightning', caption = '') {
    const t = TYPE_MAP[type] || TYPE_MAP.lightning;
    return `<figure class="tcg-card energy-card-figure" data-type="${esc(type)}">
      <div class="energy-card-face" aria-label="基本${esc(t.name)}能量卡">
        <header><b>基本${esc(t.name)}能量</b><span>${esc(t.name)}</span></header>
        <div class="energy-card-art"><i class="energy-core"></i></div>
        <footer>ENERGY <small>BLOCK PLANET TEACHING DECK</small></footer>
      </div>
      <figcaption><b>基本${esc(t.name)}能量</b>${caption ? `<span>${esc(caption)}</span>` : ''}</figcaption>
    </figure>`;
  },

  specialEnergy(type = 'colorless', caption = '附帶特殊效果') {
    const t = TYPE_MAP[type] || TYPE_MAP.colorless;
    return `<figure class="tcg-card energy-card-figure special-energy-figure" data-type="${esc(type)}">
      <div class="energy-card-face special" aria-label="特殊能量卡">
        <header><b>特殊能量</b><span>SPECIAL</span></header>
        <div class="energy-card-art"><i class="energy-core"></i><strong>特殊效果</strong></div>
        <p>附著後依卡面文字提供能量與額外效果。</p>
        <footer>ENERGY <small>READ THE CARD TEXT</small></footer>
      </div>
      <figcaption><b>特殊能量</b><span>${esc(caption)} · ${esc(t.name)}示範</span></figcaption>
    </figure>`;
  },

  pokemonEx(key = 'xiaobu', caption = '昏厥時對手拿 2 張獎賞卡') {
    const line = BP_CARD_LINES[key] || BP_CARD_LINES.xiaobu;
    const card = line.stages[2];
    return `<figure class="tcg-card pokemon-card-figure pokemon-ex-figure" data-type="${esc(line.type)}">
      <div class="pokemon-ex-face">
        <img src="${BP_CARD_PATH}${esc(card.file)}" alt="${esc(card.name)} ex 教學復刻卡" loading="eager" decoding="async">
        <span class="ex-mark">ex</span>
        <div class="ex-rule"><b>ex 規則</b><span>這隻寶可夢昏厥時，對手拿取 2 張獎賞卡。</span></div>
      </div>
      <figcaption><b>${esc(card.name)} ex</b><span>${esc(caption)}</span></figcaption>
    </figure>`;
  },

  trainer(kind = 'item', compact = false) {
    const c = BP_TRAINER_CARDS[kind] || BP_TRAINER_CARDS.item;
    return `<figure class="tcg-card trainer-card-figure ${esc(c.accent)} ${compact ? 'compact' : ''}">
      <div class="trainer-card-face">
        <div class="trainer-card-band"><span>${esc(c.kind)}</span><b>訓練家</b></div>
        <h4>${esc(c.name)}</h4>
        <div class="trainer-art trainer-art-${esc(c.art)}" style="background-image:url('../assets/img/trainer-cards/${esc(c.artFile)}')"><i></i></div>
        <p>${esc(c.rule)}</p>
        <div class="trainer-rule-strip">${esc(c.timing)}</div>
        <small>BLOCK PLANET · CAMP</small>
      </div>
      <figcaption><b>${esc(c.kind)}</b><span>${esc(c.timing)}</span></figcaption>
    </figure>`;
  },

  back(label = '牌庫') {
    return `<figure class="tcg-card card-back-figure"><div class="card-back-face"><img src="../assets/img/brand/blockplanet-logo.png" alt=""><span>${esc(label)}</span></div></figure>`;
  },

  prize(count = 6) {
    return `<div class="prize-stack" aria-label="${count} 張獎賞卡">${Array.from({ length: Math.min(count, 6) }, (_, i) => `<i style="--i:${i}"></i>`).join('')}<b>獎賞卡 ${count} 張</b></div>`;
  },

  energyCost(types) {
    return `<span class="energy-cost">${types.map(type => `<i class="energy-symbol ${esc(type)}" title="${esc(TYPE_MAP[type]?.name || '無色')}能量"></i>`).join('')}</span>`;
  },
};
