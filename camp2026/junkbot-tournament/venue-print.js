/* Compact A4 referee sheets. Reads an existing draw snapshot; never changes it. */
(function () {
  'use strict';
  const SCOPES = ['A', 'B', 'C', 'MAIN'];
  const escape = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let activeOverlay = null;
  let previousFocus = null;
  const venueName = (venue) => venue === 'MAIN' ? '主舞台' : `場地 ${venue}`;
  const dateText = (value) => {
    const date = value ? new Date(value) : new Date();
    if (Number.isNaN(date.getTime())) return '未提供';
    return new Intl.DateTimeFormat('zh-TW', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
  };
  function context(data) {
    if (!data || !Array.isArray(data.teams) || !Array.isArray(data.groups) || !Array.isArray(data.matches)) throw new Error('目前沒有可列印的分組賽程。');
    const teams = new Map(data.teams.map((team) => [team.id, team]));
    const matches = new Map(data.matches.map((match) => [match.id, match]));
    const groups = new Map(data.groups.map((group) => [group.id, group]));
    const nineGroup = data.groups.length === 9 && data.groups.every((group) => group.teamIds?.length === 8);
    const mainDraw = data.mainDraw || {};
    const number = (id) => teams.get(id)?.teamNumber ?? '—';
    const team = (id) => {
      const item = teams.get(id);
      return item ? `${item.teamNumber} 號 ${item.teamName || '未填隊名'}` : '待確認';
    };
    const call = (id) => matches.get(id)?.callCode || matches.get(id)?.code || id || '—';
    function participantId(match, index, visited = new Set()) {
      if (!match || visited.has(match.id)) return null;
      visited.add(match.id);
      const resolved = match.participantIds?.[index];
      if (teams.has(resolved)) return resolved;
      const slot = match.slots?.[index];
      if (slot?.teamId && teams.has(slot.teamId)) return slot.teamId;
      const source = matches.get(slot?.matchId);
      if (!source) return null;
      const winnerId = source.winnerId || source.winnerTeamId;
      if (slot.outcome !== 'loser') return teams.has(winnerId) ? winnerId : null;
      const loserId = source.loserId || source.loserTeamId;
      if (teams.has(loserId)) return loserId;
      if (!teams.has(winnerId)) return null;
      const sides = [participantId(source, 0, new Set(visited)), participantId(source, 1, new Set(visited))];
      return sides.find((id) => id && id !== winnerId) || null;
    }
    function participant(match, index) {
      const id = participantId(match, index);
      if (id) return team(id);
      const slot = match.slots?.[index];
      if (!slot) return '待確認';
      const source = matches.get(slot.matchId);
      const group = source && groups.get(source.groupId);
      if (group?.winnerMatchId === source.id && match.venue === 'MAIN') return `${group.id} 組冠軍`;
      return `${call(slot.matchId)} ${slot.outcome === 'loser' ? '敗隊' : '勝隊'}`;
    }
    function round(match) {
      if (match.venue === 'MAIN' && (match.roundSize === 9 || match.id === 'MAIN-Q')) return '九進八';
      if (match.stage === 'qualification') return '資格賽';
      if (match.groupId) return ({ 8: '組內八強', 4: '組內四強', 2: '組冠軍賽' })[match.groupRoundSize] || match.label || '組內賽';
      return match.label || ({ 8: '八強賽', 4: '準決賽' })[match.roundSize] || '主舞台';
    }
    function destination(match) {
      if (nineGroup && match.groupId && groups.get(match.groupId)?.winnerMatchId === match.id && !match.nextMatchId) return '主舞台現場抽籤';
      const next = match.nextMatchId ? `${call(match.nextMatchId)}` : (match.id === 'MAIN-BRONZE' || /BRONZE/i.test(match.id) ? '季軍' : '冠軍');
      const prefix = match.nextMatchId && matches.get(match.nextMatchId)?.venue === 'MAIN' && match.venue !== 'MAIN' ? '主舞台 ' : '';
      return `${prefix}${next}${match.loserNextMatchId ? `；敗隊至 ${call(match.loserNextMatchId)}` : ''}`;
    }
    const schedule = (venue) => {
      const ids = data.venueSchedules?.[venue];
      return Array.isArray(ids) ? ids.map((id) => matches.get(id)).filter(Boolean) : data.matches.filter((match) => match.venue === venue).sort((a, b) => (a.venueOrder || 0) - (b.venueOrder || 0));
    };
    return { data, teams, matches, groups, number, team, call, participantId, participant, round, destination, schedule, nineGroup, mainDraw };
  }
  function heading(title, subtitle) {
    return `<div class="vp-page-heading"><h2>${escape(title)}</h2><p>${escape(subtitle)}</p></div>`;
  }
  function resultCell(match, ctx) {
    const winner = match.winnerId || match.winnerTeamId;
    const value = ctx.teams.has(winner) ? `${ctx.number(winner)} 號` : '________';
    return `<div class="vp-result">勝隊：${escape(value)}<br>裁判：________</div>`;
  }
  function fixtureTable(matches, ctx, withGroup) {
    return `<table class="vp-table vp-fixtures${withGroup ? ' vp-call-table' : ''}"><colgroup><col class="vp-col-call"><col class="vp-col-round"><col class="vp-col-side"><col class="vp-col-side"><col class="vp-col-next"><col class="vp-col-result"></colgroup><thead><tr><th>叫號</th><th>${withGroup ? '組別／輪次' : '輪次'}</th><th>對戰隊伍 1</th><th>對戰隊伍 2</th><th>勝隊前往</th><th>賽果紀錄</th></tr></thead><tbody>${matches.map((match) => `<tr><td class="vp-code">${escape(match.callCode || match.code)}</td><td>${withGroup && match.groupId ? `<strong>${escape(match.groupId)}</strong><br>` : ''}${escape(ctx.round(match))}</td><td>${escape(ctx.participant(match, 0))}</td><td>${escape(ctx.participant(match, 1))}</td><td class="vp-destination">${escape(ctx.destination(match))}</td><td>${resultCell(match, ctx)}</td></tr>`).join('')}</tbody></table>`;
  }
  function signoff(label) {
    return `<div class="vp-signoff"><span>${escape(label)}：________________</span><span>裁判／紀錄：________________</span><span>時間：________</span></div>`;
  }
  function groupPage(group, ctx) {
    const ids = group.teamIds || [];
    const qualifiers = new Set(group.qualifierTeamIds || []);
    const matches = (group.matchIds || []).map((id) => ctx.matches.get(id)).filter(Boolean);
    const sorted = [...ids].sort((a, b) => Number(ctx.number(a)) - Number(ctx.number(b)));
    const qualifier = matches.find((match) => match.stage === 'qualification');
    const note = ctx.nineGroup ? '本組 8 隊從同一輪開始，8 → 4 → 2 → 1；無資格賽、無輪空，連勝 3 場者為組冠軍。組冠軍前往主舞台重新抽籤。' : qualifier ? `${qualifier.callCode} 資格賽：${ctx.participant(qualifier, 0)} vs ${ctx.participant(qualifier, 1)}。勝隊進入組內八強。` : '資格賽以本組對戰表為準。';
    const rosterRows = sorted.map((id) => {
      const item = ctx.teams.get(id) || {};
      // First fixture always means the original draw's entry, even after results exist.
      const first = matches.find((match) => match.slots?.some((slot) => slot.teamId === id));
      const slot = first?.slots?.findIndex((side) => side.teamId === id) ?? -1;
      const opponent = first && slot >= 0 ? ctx.participant(first, 1 - slot) : '待確認';
      return `<tr><td class="vp-number">${escape(item.teamNumber)}</td><td>${escape(item.teamName || '未填隊名')}</td><td>${escape(item.playerName || '—')}</td><td>${ctx.nineGroup ? '組內八強' : qualifiers.has(id) ? '<strong>先打資格賽</strong>' : '直接進組內八強'}</td><td class="vp-code">${escape(first?.callCode || '—')}</td><td>${escape(opponent)}</td></tr>`;
    }).join('');
    const mainDestination = group.winnerMainMatchId ? ctx.call(group.winnerMainMatchId) : ctx.nineGroup ? '現場抽籤' : '待確認';
    const rosterNote = ctx.nineGroup ? '隊號沿用原報名編號；缺號不補號。全組 8 隊均從組內八強起賽，沒有輪空。' : `隊號沿用原報名編號；缺號不補號。資格賽 ${qualifiers.size} 隊，另 ${ids.length - qualifiers.size} 隊直接進組內八強。`;
    return { venue: group.venue, kind: 'group', title: `${venueName(group.venue)}・${group.id} 組`, html: `${heading(`${venueName(group.venue)} ｜ ${group.id} 組`, `${ids.length} 隊・${matches.length} 場・取 1 隊前往主舞台 ${mainDestination}`)}<div class="vp-key-note">${escape(note)}</div><h3>參賽名單與首場報到</h3><table class="vp-table vp-roster"><colgroup><col style="width:7%"><col style="width:25%"><col style="width:12%"><col style="width:17%"><col style="width:10%"><col style="width:29%"></colgroup><thead><tr><th>隊號</th><th>隊伍名稱</th><th>選手姓名</th><th>${ctx.nineGroup ? '起賽輪次' : '入賽方式'}</th><th>首場叫號</th><th>首場對手</th></tr></thead><tbody>${rosterRows}</tbody></table><p class="vp-small-note">${escape(rosterNote)}</p><h3>本組完整對戰與晉級</h3>${fixtureTable(matches, ctx, false)}<p class="vp-small-note">依「叫號」到 ${venueName(group.venue)} 報到；勝隊依表列場次續賽。本組冠軍前往主舞台，時間以現場公告為準。</p>${signoff('本組晉級隊號')}<div class="vp-notes">備註：________________________________________________________________________________</div>` };
  }
  function venueCallPages(venue, ctx) {
    const matches = ctx.schedule(venue);
    const groups = ctx.data.groups.filter((group) => group.venue === venue);
    const pages = [];
    const pageSize = 12;
    for (let start = 0; start < matches.length; start += pageSize) {
      const slice = matches.slice(start, start + pageSize);
      pages.push({ venue, kind: 'schedule', title: `${venueName(venue)}・叫號總表`, html: `${heading(`${venueName(venue)} ｜ 賽務叫號總表`, `第 ${start + 1}–${start + slice.length} 場／共 ${matches.length} 場 · ${groups.map((group) => group.id).join('、')} · 共 ${groups.reduce((count, group) => count + group.teamIds.length, 0)} 隊`)}<div class="vp-key-note">${groups.map((group) => `${escape(group.id)} 組取 1 隊`).join('；')}，共 ${groups.length} 隊晉級${ctx.nineGroup ? '主舞台，待九組冠軍到齊後現場抽籤' : '主舞台八強'}。每場勝隊依「勝隊前往」欄接續賽程。</div>${fixtureTable(slice, ctx, true)}<div class="vp-call-guidance"><h3>現場執行</h3><p>1. 叫號前確認雙方隊號、隊名與裁判。</p><p>2. 紀錄勝隊後，告知下一場叫號；請預留選手整理機器人的時間。</p><p>3. 叫號為建議順序；遇等待前場賽果或準備未完成，由賽務調整實際開賽時間。</p></div>${signoff('場地負責人')}<div class="vp-notes">異動／備註：___________________________________________________________________________</div>` });
    }
    return pages;
  }
  function mainPage(ctx) {
    const matches = ctx.schedule('MAIN');
    const rows = ctx.data.groups.map((group) => {
      const final = ctx.matches.get(group.winnerMatchId);
      const winner = final?.winnerId || final?.winnerTeamId;
      return `<tr><td><strong>${escape(group.id)}</strong></td><td>${escape(venueName(group.venue))}</td><td>${ctx.teams.has(winner) ? escape(ctx.team(winner)) : '隊號：________　隊名：________________'}</td><td class="vp-code">${escape(ctx.call(group.winnerMainMatchId))}</td><td>□ 已報到</td></tr>`;
    }).join('');
    return { venue: 'MAIN', kind: 'main', title: '主舞台・八強決賽', html: `${heading('主舞台 ｜ 八強・決賽賽務表', '8 組冠軍報到・八強 4 場・準決賽 2 場・季軍賽 1 場・冠軍賽 1 場')}<div class="vp-key-note">八強起集中主舞台。評審 A 登錄正式結果，評審 B、C 協同判定。</div><h3>八強報到名單</h3><table class="vp-table vp-main-roster"><colgroup><col style="width:10%"><col style="width:14%"><col style="width:49%"><col style="width:13%"><col style="width:14%"></colgroup><thead><tr><th>晉級組別</th><th>原場地</th><th>組冠軍隊伍</th><th>八強叫號</th><th>報到</th></tr></thead><tbody>${rows}</tbody></table><h3>主舞台完整對戰</h3>${fixtureTable(matches, ctx, false)}<p class="vp-small-note">準決賽勝隊進入冠軍賽，敗隊進入季軍賽。表列賽果須經現場裁判確認。</p>${signoff('主舞台負責人')}<div class="vp-awards"><span>冠軍隊號：________</span><span>亞軍隊號：________</span><span>季軍隊號：________</span></div>` };
  }
  // Compact nine-group sheets consume the same immutable draw snapshot as the screen.
  function orderedMatches(venue, ctx) {
    const seen = new Set();
    return ctx.schedule(venue).filter((match) => {
      if (seen.has(match.id)) return false;
      seen.add(match.id);
      return true;
    });
  }
  function teamLabel(id, ctx, lot) {
    const item = ctx.teams.get(id);
    if (!item) return '';
    return `<span class="vp-team-label"><strong class="vp-team-number">${escape(item.teamNumber)} 號</strong> <span>${escape(item.teamName || '未填隊名')}</span>${lot ? ` <small class="vp-team-lot">籤 ${lot}</small>` : ''}</span>`;
  }
  function compactParticipant(match, index, ctx, showLot) {
    const id = ctx.participantId(match, index);
    const direct = match.slots?.[index]?.teamId;
    const position = showLot && direct && Array.isArray(ctx.mainDraw.positions) ? ctx.mainDraw.positions.indexOf(direct) + 1 : 0;
    return id ? teamLabel(id, ctx, position) : `<span class="vp-source">${escape(ctx.participant(match, index))}</span>`;
  }
  function compactWinner(match, ctx) {
    const id = match.winnerId || match.winnerTeamId;
    return ctx.teams.has(id) ? `<strong class="vp-winner-number">${escape(ctx.number(id))} 號</strong>` : '<span class="vp-write-line" aria-label="填寫勝隊號"></span>';
  }
  function staffLine() {
    return '<div class="vp-staff-line">裁判／紀錄姓名：<span class="vp-staff-blank"></span></div>';
  }
  function entryReminder() {
    return '<p class="vp-entry-reminder">紙本結果請回填系統，確認後再進行後續場次。</p>';
  }
  function simpleTableHead(second) {
    return `<colgroup><col class="vp-simple-call"><col class="vp-simple-group"><col class="vp-simple-side"><col class="vp-simple-side"><col class="vp-simple-winner"></colgroup><thead><tr><th>場次</th><th>${escape(second)}</th><th>對戰隊伍 1</th><th>對戰隊伍 2</th><th>勝隊號</th></tr></thead>`;
  }
  function venueExecutionPage(venue, ctx) {
    const matches = orderedMatches(venue, ctx);
    const groups = ctx.data.groups.filter((group) => group.venue === venue).sort((a, b) => a.id.localeCompare(b.id, 'zh-TW', { numeric: true }));
    const groupBlocks = matches.filter((match, index) => !index || match.groupId !== matches[index - 1].groupId).map((match) => match.groupId);
    // Old snapshots retain their real interleaved schedule; print never silently redraws it.
    const grouped = groupBlocks.length === groups.length && new Set(groupBlocks).size === groups.length;
    const stageLabels = { 8: '組內八強', 4: '組內四強', 2: '組冠軍賽｜勝隊至主舞台報到' };
    const shortRounds = { 8: '八強', 4: '四強', 2: '組冠軍' };
    let previousSection;
    const rows = matches.map((match) => {
      const section = grouped ? match.groupId : match.groupRoundSize;
      let divider = '';
      if (section !== previousSection) {
        previousSection = section;
        const count = matches.filter((item) => (grouped ? item.groupId : item.groupRoundSize) === section).length;
        const title = grouped ? `${match.groupId}｜第 ${groupBlocks.indexOf(match.groupId) + 1} 組` : stageLabels[section] || ctx.round(match);
        const note = grouped ? `${count} 場・組冠軍至主舞台報到` : `${count} 場`;
        divider = `<tr class="vp-stage-row"${grouped ? ` data-group-id="${escape(match.groupId)}"` : ''}><th colspan="5">${escape(title)}<span>${escape(note)}</span></th></tr>`;
      }
      const second = grouped ? shortRounds[match.groupRoundSize] || ctx.round(match) : match.groupId || '';
      return `${divider}<tr class="vp-match-row" data-match-id="${escape(match.id)}"><td class="vp-code">${escape(ctx.call(match.id))}</td><td class="${grouped ? 'vp-group-round' : 'vp-group-id'}">${escape(second)}</td><td>${compactParticipant(match, 0, ctx, false)}</td><td>${compactParticipant(match, 1, ctx, false)}</td><td class="vp-winner-cell">${compactWinner(match, ctx)}</td></tr>`;
    }).join('');
    const description = grouped ? `${groupBlocks.join(' → ')}，每組比完再換下一組・共 ${matches.length} 場` : `${groups.map((group) => group.id).join('・')}　共 ${matches.length} 場，依下表順序叫號`;
    return { venue, kind: 'venue-simple', title: `${venueName(venue)}・裁判執行表`, html: `${heading(`${venueName(venue)} ｜ 裁判執行表`, description)}${staffLine()}<table class="vp-table vp-execution-table">${simpleTableHead(grouped ? '輪次' : '組別')}<tbody>${rows}</tbody></table>${entryReminder()}` };
  }
  function venueAnnouncementPage(venue, ctx) {
    const groups = ctx.data.groups.filter((group) => group.venue === venue).sort((a, b) => a.id.localeCompare(b.id, 'zh-TW', { numeric: true }));
    const blocks = groups.map((group, index) => {
      const ids = [...(group.teamIds || [])].sort((a, b) => String(ctx.number(a)).localeCompare(String(ctx.number(b)), 'zh-TW', { numeric: true }));
      const rows = ids.map((id) => {
        const item = ctx.teams.get(id) || {};
        return `<tr data-team-id="${escape(id)}"><td class="vp-announcement-number">${escape(item.teamNumber ?? '—')} 號</td><td>${escape(item.teamName || '未填隊名')}</td><td>${escape(item.playerName || '—')}</td></tr>`;
      }).join('');
      return `<section class="vp-announcement-group" data-group-id="${escape(group.id)}"><h3><strong>${escape(group.id)}</strong><span>第 ${index + 1} 組</span><small>${ids.length} 隊</small></h3><table class="vp-table vp-announcement-table"><colgroup><col style="width:18mm"><col style="width:105mm"><col style="width:63mm"></colgroup><thead><tr><th>隊號</th><th>隊伍名稱</th><th>選手姓名</th></tr></thead><tbody>${rows}</tbody></table></section>`;
    }).join('');
    const sequence = groups.map((group) => group.id).join(' → ');
    return { venue, kind: 'announcement', title: `${venueName(venue)}・排隊公告`, html: `${heading(`${venueName(venue)} ｜ 排隊公告`, `${sequence}，每組全部比完後，再進行下一組。`)}${blocks}` };
  }
  function mainPendingPage(ctx) {
    const groups = [...ctx.data.groups].sort((a, b) => a.id.localeCompare(b.id, 'zh-TW', { numeric: true }));
    const rows = groups.map((group) => {
      const final = ctx.matches.get(group.winnerMatchId);
      const winner = final?.winnerId || final?.winnerTeamId;
      return `<tr data-group-id="${escape(group.id)}"><td class="vp-group-id">${escape(group.id)}</td><td>${teamLabel(winner, ctx)}</td><td class="vp-lot-write"><span class="vp-write-line" aria-label="填寫抽中籤位"></span></td><td class="vp-checkin-cell"><span class="vp-check-box" aria-label="已報到勾選框"></span></td></tr>`;
    }).join('');
    return { venue: 'MAIN', kind: 'checkin-simple', title: '主舞台・報到與抽籤', html: `${heading('主舞台 ｜ 報到與抽籤表', '尚未抽籤・本表供現場登錄，並非正式對戰表')}<ol class="vp-draw-steps"><li>確認九組冠軍全數報到。</li><li>各抽 1–9 號籤，每個籤位只用一次。</li><li>將籤位登錄系統；籤 1、2 先進行九進八。</li></ol>${staffLine()}<table class="vp-table vp-checkin-table"><colgroup><col style="width:18mm"><col style="width:115mm"><col style="width:31mm"><col style="width:22mm"></colgroup><thead><tr><th>組別</th><th>晉級隊伍</th><th>抽中籤位</th><th>報到</th></tr></thead><tbody>${rows}</tbody></table><p class="vp-entry-reminder">抽籤登錄完成後，重新列印主舞台裁判執行表。</p>` };
  }
  function mainRound(match) {
    if (match.id === 'MAIN-Q' || match.roundSize === 9) return '九進八';
    if (/BRONZE/i.test(match.id) || match.roundSize === 3) return '季軍賽';
    if (/FINAL/i.test(match.id) || match.roundSize === 2) return '冠軍賽';
    return ({ 8: '八強', 4: '準決賽' })[match.roundSize] || '主舞台';
  }
  function mainAwards(ctx, matches) {
    const final = matches.find((match) => match.id === 'MAIN-FINAL') || matches.find((match) => match.roundSize === 2);
    const bronze = matches.find((match) => /BRONZE/i.test(match.id) || match.roundSize === 3);
    const champion = final?.winnerId || final?.winnerTeamId;
    const recordedRunner = final?.loserId || final?.loserTeamId;
    const runner = ctx.teams.has(champion) ? (ctx.teams.has(recordedRunner) ? recordedRunner : [ctx.participantId(final, 0), ctx.participantId(final, 1)].find((id) => id && id !== champion)) : null;
    const third = bronze?.winnerId || bronze?.winnerTeamId;
    return `<div class="vp-simple-awards">${[['冠軍', champion], ['亞軍', runner], ['季軍', third]].map(([label, id]) => `<span>${label}隊號：${ctx.teams.has(id) ? `<strong>${escape(ctx.number(id))} 號</strong>` : '<span class="vp-award-blank"></span>'}</span>`).join('')}</div>`;
  }
  function mainDrawnPages(ctx) {
    const matches = orderedMatches('MAIN', ctx);
    const rows = matches.map((match) => `<tr class="vp-match-row" data-match-id="${escape(match.id)}"><td class="vp-code">${escape(ctx.call(match.id))}</td><td class="vp-main-round">${escape(mainRound(match))}</td><td>${compactParticipant(match, 0, ctx, true)}</td><td>${compactParticipant(match, 1, ctx, true)}</td><td class="vp-winner-cell">${compactWinner(match, ctx)}</td></tr>`).join('');
    return [{ venue: 'MAIN', kind: 'main-simple', title: '主舞台・裁判執行表', html: `${heading('主舞台 ｜ 裁判執行表', `已完成抽籤・共 ${matches.length} 場，依下表順序叫號`)}<p class="vp-main-roles">三位評審共同判定，由評審 A 登錄結果。</p>${staffLine()}<table class="vp-table vp-execution-table vp-main-execution">${simpleTableHead('輪次')}<tbody>${rows}</tbody></table><p class="vp-bronze-note">準決賽勝隊進冠軍賽；敗隊進季軍賽。</p>${mainAwards(ctx, matches)}${entryReminder()}` }];
  }
  function render(data, scope, options = {}) {
    const selected = scope == null ? 'all' : String(scope).toUpperCase();
    if (selected !== 'ALL' && selected !== 'all' && !SCOPES.includes(selected)) throw new Error('請選擇場地 A、B、C 或主舞台。');
    const kind = options?.kind || 'execution';
    if (!['execution', 'announcement'].includes(kind)) throw new Error('請選擇裁判執行表或排隊公告。');
    if (kind === 'announcement' && selected === 'MAIN') throw new Error('排隊公告僅適用於場地 A、B、C。');
    const ctx = context(data);
    const venues = selected.toUpperCase() === 'ALL' ? (kind === 'announcement' ? SCOPES.filter((venue) => venue !== 'MAIN') : SCOPES) : [selected];
    const pages = [];
    venues.forEach((venue) => {
      if (kind === 'announcement') pages.push(venueAnnouncementPage(venue, ctx));
      else if (venue === 'MAIN') pages.push(...(ctx.nineGroup ? ctx.mainDraw.status === 'drawn' ? mainDrawnPages(ctx) : [mainPendingPage(ctx)] : [mainPage(ctx)]));
      else if (ctx.nineGroup) pages.push(venueExecutionPage(venue, ctx));
      else {
        data.groups.filter((group) => group.venue === venue).sort((a, b) => a.id.localeCompare(b.id, 'zh-TW', { numeric: true })).forEach((group) => pages.push(groupPage(group, ctx)));
        pages.push(...venueCallPages(venue, ctx));
      }
    });
    const meta = data.metadata || {};
    const draft = meta.preview !== false;
    const status = draft ? '預排草案・非正式賽程' : '正式賽程';
    const title = meta.title || '2026 全國廢材機器人大賽';
    const generated = dateText();
    return `<div class="vp-document${ctx.nineGroup || kind === 'announcement' ? ' vp-document-simple' : ' vp-document-legacy'}" data-print-kind="${escape(kind)}" data-print-scope="${escape(selected)}" data-print-pages="${pages.length}">${pages.map((page, index) => `<section class="vp-page vp-page-${page.kind}" aria-label="${escape(page.title)} 第 ${index + 1} 頁" data-venue="${escape(page.venue)}"><header class="vp-page-header"><div><strong>${escape(title)}</strong><span>相撲機器人｜${kind === 'announcement' ? '排隊公告' : '賽務用紙本'}</span></div>${draft ? `<b class="vp-status vp-status-draft">${status}</b>` : ''}</header><div class="vp-page-content">${page.html}</div><footer class="vp-page-footer"><div><span>列印 ${escape(generated)}（臺北時間）</span><span>第 ${index + 1} 頁／共 ${pages.length} 頁</span></div></footer></section>`).join('')}</div>`;
  }

  function close() {
    if (!activeOverlay) return;
    activeOverlay.remove();
    activeOverlay = null;
    document.body.classList.remove('vp-print-open');
    document.removeEventListener('keydown', handleKeydown);
    if (previousFocus?.isConnected && typeof previousFocus.focus === 'function') previousFocus.focus();
    previousFocus = null;
  }
  function handleKeydown(event) {
    if (!activeOverlay) return;
    if (event.key === 'Escape') { event.preventDefault(); close(); return; }
    if (event.key !== 'Tab') return;
    const elements = [...activeOverlay.querySelectorAll('button:not([disabled]), [href], [tabindex="0"]')];
    if (!elements.length) return;
    const first = elements[0], last = elements[elements.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  function open(data, scope, returnFocus, options = {}) {
    const content = render(data, scope, options);
    close();
    previousFocus = returnFocus?.isConnected ? returnFocus : document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'vp-print-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'vp-dialog-title');
    const label = !scope || String(scope).toLowerCase() === 'all' ? '全部場地' : venueName(String(scope).toUpperCase());
    const simple = data.groups.length === 9 && data.groups.every((group) => group.teamIds?.length === 8);
    const announcement = options?.kind === 'announcement';
    const summary = announcement ? '每個場地一張 A4；全部公告共 3 張。' : simple ? '每個場地一張 A4；全部列印共 4 張。' : 'A4 直式，可列印或另存 PDF。';
    overlay.innerHTML = `<div class="vp-toolbar"><div><h2 id="vp-dialog-title">${escape(label)}・${announcement ? '排隊公告' : '賽務列印'}</h2><p>${summary}</p></div><div class="vp-toolbar-actions"><button type="button" class="vp-close">關閉</button><button type="button" class="vp-print-button">列印／另存 PDF</button></div></div><div class="vp-screen-notice">列印設定請選 A4、直式，並關閉瀏覽器的「頁首及頁尾」。紙本為此刻賽程快照；更新賽果後可重新開啟列印。</div><div class="vp-paper-viewport" role="region" aria-label="A4 列印預覽，可左右捲動" tabindex="0">${content}</div>`;
    overlay.querySelector('.vp-close').addEventListener('click', close);
    overlay.querySelector('.vp-print-button').addEventListener('click', () => window.print());
    document.body.appendChild(overlay);
    activeOverlay = overlay;
    document.body.classList.add('vp-print-open');
    document.addEventListener('keydown', handleKeydown);
    overlay.querySelector('.vp-close').focus();
    return overlay;
  }
  window.JunkbotVenuePrint = Object.freeze({ render, open, close });
}());
