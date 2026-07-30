/* Qualification schedule download fallback for browsers without reliable printing. */
(() => {
  const colors = {
    1: ['#1769e8', '#edf5ff', '藍色教室'],
    2: ['#15966a', '#ecfaf4', '綠色教室'],
    3: ['#e87917', '#fff5e9', '橘色教室'],
  };
  const safe = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
  })[char]);
  const trainer = (s, id) => s.trainers.find(item => item.id === id);
  const label = item => item
    ? `<strong>#${safe(item.no)}</strong> ${safe(item.name)}`
    : '<span class="muted">輪空</span>';

  function build(s) {
    const rounds = s.qual?.rounds || [];
    const roomSheets = [1, 2, 3].map(room => {
      const [main, soft, colorName] = colors[room];
      const all = rounds.flatMap((round, roundIndex) => round
        .filter(match => T.qualClassroom(match, roundIndex) === room)
        .map(match => ({ match, roundIndex })));
      const blocks = rounds.map((round, roundIndex) => {
        const matches = round.filter(match => T.qualClassroom(match, roundIndex) === room);
        if (!matches.length) return '';
        const rows = matches.map((match, index) => {
          const a = trainer(s, match.a);
          const b = match.b ? trainer(s, match.b) : null;
          const winner = match.bye ? `${label(a)}（輪空自動勝）`
            : match.winner ? `${label(trainer(s, match.winner))} 勝`
              : '<span class="muted">現場填寫</span>';
          return `<tr><td>${index + 1}</td><td>第 ${safe(match.table)} 桌</td><td>${label(a)}</td><td class="vs">VS</td><td>${label(b)}</td><td>□ A　□ B</td><td>${winner}</td><td class="note"></td></tr>`;
        }).join('');
        return `<section class="round"><h2>第 ${roundIndex + 1} 輪 <small>${matches.length} 場</small></h2><table><thead><tr><th>順序</th><th>桌號</th><th>訓練家 A</th><th></th><th>訓練家 B</th><th>到場</th><th>勝者</th><th>裁判備註</th></tr></thead><tbody>${rows}</tbody></table></section>`;
      }).join('');
      return `<article class="sheet" style="--room:${main};--soft:${soft}"><header><div><p>BLOCK PLANET CAMP LEAGUE</p><h1>教室 ${room} 裁判場次表</h1></div><b>${colorName}</b></header><aside><strong>本教室共 ${all.length} 場</strong><span>選手與對手都完成上一場後即可開打，不必等待全體換輪。</span></aside>${blocks}<footer>教室 ${room}　裁判簽名：________________　交回時間：________</footer></article>`;
    }).join('');
    const routes = [...s.trainers].sort((a, b) => a.no - b.no).map(item => {
      const cells = rounds.map((round, roundIndex) => {
        const match = round.find(row => row.a === item.id || row.b === item.id);
        if (!match) return '<td>—</td>';
        const otherId = match.a === item.id ? match.b : match.a;
        const other = otherId ? trainer(s, otherId) : null;
        return `<td><b>教室 ${T.qualClassroom(match, roundIndex)}</b><br>${other ? `VS #${safe(other.no)} ${safe(other.name)}` : '輪空'}</td>`;
      }).join('');
      return `<tr><td><b>#${safe(item.no)}</b></td><td>${safe(item.name)}</td>${cells}</tr>`;
    }).join('');
    return `<!doctype html><html lang="zh-Hant"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>資格賽教室分配</title><style>
*{box-sizing:border-box}body{margin:0;background:#eef3f9;color:#142b50;font-family:"Noto Sans TC","PingFang TC",Arial,sans-serif}.cover,.sheet,.routes{width:min(1180px,calc(100% - 32px));margin:24px auto;background:#fff;border:1px solid #cfdded;border-radius:12px;padding:28px}.cover{border-top:10px solid #1769e8}.cover p,header p{margin:0 0 6px;color:#1769e8;font-size:12px;font-weight:900;letter-spacing:.08em}.cover h1,header h1{margin:0;font-size:30px}.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin:22px 0}.stats div{padding:14px;background:#f4f8fd;border:1px solid #d5e2f1;border-radius:8px}.stats span{display:block;color:#687d98}.stats b{font-size:22px}.tip{padding:14px 16px;background:#fff5ce;border-left:5px solid #ffc400;font-weight:700}.sheet{border-top:10px solid var(--room);page-break-before:always}.sheet header{display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid var(--room);padding-bottom:14px}.sheet header p{color:var(--room)}.sheet header>b{padding:10px 16px;background:var(--room);color:#fff;border-radius:6px}.sheet aside{display:flex;gap:20px;margin:16px 0;padding:12px 14px;background:var(--soft);border-left:5px solid var(--room)}.sheet aside span{color:#526984}.round{margin-top:20px}.round h2{display:flex;justify-content:space-between;margin:0;padding:10px 12px;background:var(--room);color:#fff;border-radius:6px 6px 0 0;font-size:19px}.round small{font-size:13px}table{width:100%;border-collapse:collapse;table-layout:fixed}th,td{border:1px solid #cdd8e6;padding:9px 8px;text-align:left;font-size:13px}th{background:#edf2f8}.round th:nth-child(1){width:6%}.round th:nth-child(2){width:9%}.round th:nth-child(3),.round th:nth-child(5){width:18%}.round th:nth-child(4){width:4%}.round th:nth-child(6){width:11%}.round th:nth-child(7),.round th:nth-child(8){width:17%}.vs{text-align:center;font-weight:900}.note{height:42px}.muted{color:#71829a}.sheet footer{margin-top:22px;padding-top:14px;border-top:1px solid #cfdaea;text-align:right}.routes{page-break-before:always;border-top:10px solid #ffc400}.routes th:nth-child(n+3){width:24%}@media print{body{background:#fff}.cover,.sheet,.routes{width:100%;margin:0;border-radius:0;border-left:0;border-right:0}.sheet,.routes{page-break-before:always}}@media(max-width:800px){.cover,.sheet,.routes{width:100%;margin:0 0 16px;border-radius:0;padding:16px}.stats{grid-template-columns:1fr}.round{overflow:auto}.round table{min-width:900px}}
</style></head><body><section class="cover"><p>BLOCK PLANET CAMP LEAGUE</p><h1>${safe(s.meta?.name || '布拉克星球寶可夢卡牌大賽')}－資格賽教室分配</h1><div class="stats"><div><span>參賽訓練家</span><b>${s.trainers.length} 位</b></div><div><span>資格賽輪次</span><b>${rounds.length} 輪</b></div><div><span>總場次</span><b>${rounds.flat().length} 場</b></div></div><div class="tip">自由流水賽制：兩位選手完成上一場後，可直接到指定教室找裁判，不必等同輪其他場次。</div></section>${roomSheets}<article class="routes"><h1>訓練家移動總表</h1><p>中央裁判可用編號快速告知下一場教室與對手。</p><table><thead><tr><th>編號</th><th>訓練家</th>${rounds.map((_, index) => `<th>第 ${index + 1} 輪</th>`).join('')}</tr></thead><tbody>${routes}</tbody></table></article></body></html>`;
  }

  function download() {
    const s = T.load();
    const blob = new Blob([build(s)], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `布拉克星球_資格賽教室分配_${s.trainers.length}人_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  function relabel() {
    document.querySelectorAll('#printQual,#downloadQual').forEach(button => {
      if (button.dataset.qualDownloadReady === 'true') return;
      button.dataset.qualDownloadReady = 'true';
      button.id = 'downloadQual';
      const icon = button.querySelector('.bp-icon');
      button.replaceChildren(...(icon ? [icon] : []), document.createTextNode('下載教室賽程檔'));
    });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('#downloadQual,#printQual')) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    download();
  }, true);
  new MutationObserver(relabel).observe(document.documentElement, { childList: true, subtree: true });
  relabel();
  window.BPQualFile = { build, download };
})();
