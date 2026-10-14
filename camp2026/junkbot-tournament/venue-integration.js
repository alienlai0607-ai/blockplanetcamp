/* Live state is the single source for venue screens and official paper copies. */
'use strict';
const venuePlan = window.JunkbotVenuePlan;
function venueData() { return venuePlan.toView(state, {judgeId:typeof activeJudgeId==='function'?activeJudgeId():null}); }
function venuePrintView() {
  if (!venuePlan.isVenueState(state)) return '<div class="page-heading"><div><h1>賽務列印</h1><p>三場地分組賽程公布後，可列印各場地名單與對戰表。</p></div></div><button class="primary" data-view-jump="bracket">前往對戰賽程</button>';
  const groups=state.venuePlan.groups;
  return `<section class="venue-print-center"><div class="page-heading"><div><span class="kicker">OFFICIAL EVENT DOCUMENTS</span><h1>賽務列印</h1><p>紙本與目前正式賽程一致。選擇場地後可預覽、列印，或由列印視窗另存 PDF。</p></div><button class="primary" data-venue-print="all">列印全部場地</button></div><div class="venue-print-options">${['A','B','C','MAIN'].map(v=>{const own=groups.filter(g=>g.venue===v);return `<article><span class="venue-print-letter">${v==='MAIN'?'主舞台':`場地 ${v}`}</span><h2>${v==='MAIN'?'全國八強至決賽':own.map(g=>g.id).join('、')}</h2><p>${v==='MAIN'?'8 隊爭取冠軍 · 含季軍賽':`${own.length*9} 隊 · ${own.length} 席全國八強 · ${state.venuePlan.venueSchedules[v].length} 場`}</p><p>${v==='MAIN'?'對戰來源、晉級去向與賽果登錄表。':'各組名單、資格賽標記、首場對手，以及全場地叫號表。'}</p><button class="outline" data-venue-print="${v}">預覽／列印${v==='MAIN'?'主舞台':`場地 ${v}`}</button></article>`;}).join('')}</div><p class="venue-print-note">紙本保留原隊號，缺號不補。資格賽每組 2 隊先比，其餘 7 隊直接進組內八強。更動或判定後，請重新列印最新版本；紙上紀錄需由授權評審回填系統。</p></section>`;
}
let venuePrintLoading=false;
async function venueOpenPrint(scope) {
  if(venuePrintLoading)return;
  const requestedScope=String(scope||'').toUpperCase();
  const requestedCampus=campus, requestedJudge=judgeDeskId, requestedMutation=mutationRevision;
  if (role!=='control'||!judgeDeskAuthenticated||judgeDeskChooser) return showToast('請先驗證賽務密碼並選擇工作身分。',true);
  if(requestedCampus!==EVENT_SCOPE)return showToast('賽事資料來源不符，請重新進入賽務。',true);
  if(!['A','B','C','MAIN','ALL'].includes(requestedScope))return showToast('請選擇要列印的場地。',true);
  if (requestedJudge && requestedScope!==requestedJudge && !(requestedJudge==='A'&&requestedScope==='MAIN')) return showToast('請由總賽務列印其他場地。',true);
  if (!venuePlan.isVenueState(state)) return showToast('尚未公布三場地賽程。',true);
  if (pendingMutations || uiOperationPending || unsavedCampusStates.has(requestedCampus)) return showToast('請先完成同步，再列印正式文件。',true);
  venuePrintLoading=true;
  let buttons=[];
  try {
    buttons=[...document.querySelectorAll('[data-venue-print],.venue-tournament [data-print]')].map(button=>({button,disabled:button.disabled,busy:button.getAttribute('aria-busy')}));
    buttons.forEach(({button})=>{button.disabled=true;button.setAttribute('aria-busy','true');});
    showToast('正在讀取最新賽程，準備列印…');
    // A print snapshot has its own read. Background screen polling must not
    // cancel it, replace live state, or change the revision used for writes.
    const result=await apiGet(requestedCampus);
    if(role!=='control'||!judgeDeskAuthenticated||judgeDeskChooser||campus!==requestedCampus||judgeDeskId!==requestedJudge)throw new Error('工作身分或賽事已變更，請重新選擇列印場地。');
    if(judgeDeskId&&requestedScope!==judgeDeskId&&!(judgeDeskId==='A'&&requestedScope==='MAIN'))throw new Error('請由總賽務列印其他場地。');
    if(pendingMutations||uiOperationPending||unsavedCampusStates.has(requestedCampus)||mutationRevision!==requestedMutation)throw new Error('賽事資料正在更新，請完成同步後重新列印。');
    if(!result?.success||!result.state)throw new Error(result?.error||'無法取得最新賽程，請恢復連線後再列印。');
    const snapshot=normalizeState(result.state,requestedCampus);
    if(!venuePlan.isVenueState(snapshot))throw new Error('賽程已變更，請重新確認分組後列印。');
    window.JunkbotVenuePrint.open(venuePlan.toView(snapshot,{judgeId:requestedJudge}),requestedScope==='ALL'?'all':requestedScope);
  } catch(error) {
    showToast(error?.message||'無法準備列印，請稍後重試。',true);
  } finally {
    buttons.forEach(({button,disabled,busy})=>{button.disabled=disabled;if(busy===null)button.removeAttribute('aria-busy');else button.setAttribute('aria-busy',busy);});
    venuePrintLoading=false;
  }
}
function venueBind(root) {
  const component=root?.querySelector('.venue-tournament');
  if(!component)return;
  window.JunkbotVenueUI.bind(root,{
    onPrint:venueOpenPrint,
    onOpenMatch:async id=>{
      if(role!=='control')return;
      await syncQueue.catch(()=>null);
      if(!await loadCampusState(true))return showToast('無法確認最新賽程，請稍後重試。',true);
      try {await openArena(id);}catch(error){showToast(error.message,true);}
    }
  });
}
const venueOriginalBracketView=bracketView;
bracketView=function(control){
  if(state.entries.length===72&&!state.matches.length){
    if(!control)return '<section class="empty-card"><h2>三場地賽程尚未公布</h2><p>賽務確認抽籤後，將公布各隊場地、分組與對戰路線。</p></section>';
    return `<section class="venue-print-center"><div class="page-heading"><div><span class="kicker">THREE VENUES · NATIONAL TOURNAMENT</span><h1>準備建立三場地賽程</h1><p>已登錄 72 隊。保留原隊號，隨機抽定分組與完整晉級路線。</p></div><button class="primary" data-action="create-bracket">核對名單並抽籤</button></div><div class="venue-print-options"><article><span class="venue-print-letter">場地 A</span><h2>A1、A2、A3</h2><p>27 隊 · 24 場 · 3 隊晉級全國八強</p></article><article><span class="venue-print-letter">場地 B</span><h2>B1、B2、B3</h2><p>27 隊 · 24 場 · 3 隊晉級全國八強</p></article><article><span class="venue-print-letter">場地 C</span><h2>C1、C2</h2><p>18 隊 · 16 場 · 2 隊晉級全國八強</p></article><article><span class="venue-print-letter">主舞台</span><h2>全國八強至決賽</h2><p>8 隊 · 8 場（含季軍賽）· 三位評審集中</p></article></div><p class="venue-print-note">每組 9 隊：隨機 2 隊先比 1 場資格賽，其餘 7 隊直接進組內八強；之後依 8 → 4 → 2 → 1 淘汰，每組勝隊前往主舞台。八強前固定在原場地，全部路線一次抽定。抽籤公布後，即可列印各場地名單與對戰表。</p></section>`;
  }
  if(!venuePlan.isVenueState(state))return venueOriginalBracketView(control);
  const canReset=control&&!state.matches.some(m=>m.status==='completed')&&!activeMatchIds().length;
  return `<div class="page-heading venue-heading"><div><span class="kicker">THREE VENUES · NATIONAL TOURNAMENT</span><h1>三場地對戰賽程</h1><p>72 隊 · A、B 各 3 組，C 共 2 組；每組 9 隊取 1 隊，八強集中主舞台。</p></div>${canReset?'<details class="venue-draw-tools"><summary>賽程管理</summary><button class="outline" data-action="redraw-bracket">重新抽籤</button><button class="outline" data-action="reset-bracket">重設賽程</button></details>':''}</div>${window.JunkbotVenueUI.render(venueData(),{control,judgeId:control?activeJudgeId():null})}`;
};
const venueOriginalRenderControl=renderControl;
renderControl=function(){venueOriginalRenderControl();venueBind($('controlView'));};
const venueOriginalRenderAudience=renderAudience;
renderAudience=function(){venueOriginalRenderAudience();venueBind($('audienceView'));};

const venueOriginalMatchDisplayLabel=matchDisplayLabel;
matchDisplayLabel=function(item){return item?.callCode?`${item.venue==='MAIN'?'主舞台':`場地 ${item.venue}`} ${item.callCode} · ${item.label}`:venueOriginalMatchDisplayLabel(item);};
const venueOriginalFlowCode=flowCode;
flowCode=function(item){return item?.callCode?`${item.callCode} · ${item.groupId?`${item.groupId} 組` : item.label}`:venueOriginalFlowCode(item);};
const venueOriginalTournamentPlan=tournamentPlan;
tournamentPlan=function(count=state.entries.length){
  if(count!==72)return venueOriginalTournamentPlan(count);
  return {teamCount:72,bracketSize:64,roundCount:7,roundSizes:[72,64,32,16,8,4,2],byeCount:56,byeRoundCount:1,firstStage:'8 組資格賽'};
};
const venueOriginalShowDraw=showDrawConfirmation;
showDrawConfirmation=function(redraw=false){
  if(state.entries.length!==72)return venueOriginalShowDraw(redraw);
  const error=validateRoster();if(error)return showToast(error,true);
  if(activeMatchIds().length||state.matches.some(m=>m.status==='completed'))return showToast('已有開啟場次或正式賽果，不能重新抽籤。',true);
  openModal(`<div class="modal-head"><div><span class="section-kicker">THREE VENUES</span><h2>${redraw?'重新抽籤確認':'三場地抽籤確認'}</h2></div><button data-close-modal aria-label="關閉抽籤確認">×</button></div><div class="modal-body"><ul class="draw-confirm-list"><li><span>名單</span><b>72 隊，原隊號保留</b></li><li><span>場地 A / B / C</span><b>27 / 27 / 18 隊，取 3 / 3 / 2 席</b></li><li><span>各組資格賽</span><b>9 隊取 8：隨機 2 隊先賽，其餘 7 隊直接進組內八強</b></li><li><span>固定路線</span><b>組內 8 → 4 → 2 → 1；全國八強起至主舞台</b></li><li><span>正式對戰</span><b>分場 64 場＋主舞台 8 場（含季軍）</b></li></ul><p class="hint">${redraw?'此操作會更換全部分組與對手，舊紙本將失效。':'全部路線一次抽定；公布後名單鎖定。'}評審 A、B、C 固定各場地；主舞台由評審 A 登錄，B、C 協同。</p><label class="draw-ack"><input type="checkbox" id="drawAcknowledgement" required><span>已核對名單，確認本次三場地賽制與公告方式。</span></label><div class="modal-actions"><button class="outline" data-close-modal>返回核對</button><button class="primary" data-confirm-draw>${redraw?'確認重新抽籤':'確認名單並抽籤'}</button></div></div>`,true);
};
const venueOriginalCreateBracket=createBracket;
createBracket=async function(){
  if(state.entries.length!==72)return venueOriginalCreateBracket();
  const error=validateRoster();if(error)return showToast(error,true);
  try {
    const generated=venuePlan.generate(state.entries,fairRandom);
    state=venuePlan.fromDraw(generated,state,{replace:true,operatorName:operatorName||'演練賽務'});
    await saveState('三場地分組與完整晉級路線已公布');
    renderControl();
  }catch(error){showToast(error.message,true);}
};
const venueOriginalOpenArena=openArena;
openArena=async function(id){const reason=venuePlan.blockReason(state,id);if(reason){showToast(reason,true);return;}return venueOriginalOpenArena(id);};
const venueOriginalApiPost=apiPost;
apiPost=async function(payload){
  if(payload.action==='junkbot-match-patch'&&['open','countdown','start'].includes(payload.op)&&venuePlan.isVenueState(state)){
    let latest=state;
    if(!DEMO){const response=await apiGet(EVENT_SCOPE);if(!response.success)return response;latest=normalizeState(response.state,EVENT_SCOPE);}
    else {const saved=localStorage.getItem(JUDGE_DESK_STORAGE);if(saved)latest=normalizeState(JSON.parse(saved),EVENT_SCOPE);}
    const reason=venuePlan.blockReason(latest,payload.matchId);
    if(reason)return {success:false,code:'VENUE_NOT_READY',error:reason};
  }
  return venueOriginalApiPost(payload);
};
const venueOriginalDashboard=dashboardView;
dashboardView=function(){const html=venueOriginalDashboard();if(!venuePlan.isVenueState(state))return html;return `<section class="venue-dashboard-strip"><div><b>三場地分組賽已公布</b><span>A1–A3／B1–B3／C1–C2 · 八強至主舞台</span></div><button class="outline" data-view-jump="print">賽務列印</button></section>${html}`;};
const venueOriginalArenas=arenasView;
arenasView=function(){
  if(!venuePlan.isVenueState(state))return venueOriginalArenas();
  return `<div class="page-heading"><div><span class="kicker">VENUE CONTROL</span><h1>賽場控制</h1><p>各場地一次一場；主舞台待八個分組全數完成後開放。</p></div><button class="outline" data-view-jump="print">賽務列印</button></div>${['A','B','C','MAIN'].map(v=>{const items=state.matches.filter(m=>m.venue===v);const active=items.filter(m=>activeMatchIds().includes(m.id)&&m.status!=='completed');const ready=items.filter(m=>!active.includes(m)&&!venuePlan.blockReason(state,m.id)).sort((a,b)=>a.venueOrder-b.venueOrder);return `<section class="venue-arena-section"><h2>${v==='MAIN'?'主舞台':`場地 ${v}`}</h2><p>${v==='MAIN'?'由評審 A 登錄，B、C 協同。':state.venuePlan.groups.filter(g=>g.venue===v).map(g=>g.id).join('、')}${v==='MAIN'&&!venuePlan.mainReady(state)?' · 等待八組勝者全數產生。':''}</p><div class="arena-grid">${active.map(m=>arenaControlCard(m,true)).join('')}${ready.slice(0,3).map(m=>arenaControlCard(m,false)).join('')}${!active.length&&!ready.length?'<p class="hint">目前無可開賽場次；完成前場判定後自動更新。</p>':''}</div>${ready.length>3?`<p class="hint">另有 ${ready.length-3} 場已就緒；完成上述場次後自動顯示。</p>`:''}</section>`;}).join('')}`;
};
document.addEventListener('click',event=>{const button=event.target.closest('[data-venue-print]');if(button){event.preventDefault();venueOpenPrint(button.dataset.venuePrint);}});
