/* Live state is the single source for venue screens and official paper copies. */
'use strict';
const venuePlan = window.JunkbotVenuePlan;
function venueData() { return venuePlan.toView(state, {judgeId:typeof activeJudgeId==='function'?activeJudgeId():null}); }
function venuePrintView() {
  if (!venuePlan.isVenueState(state)) return '<div class="page-heading"><div><h1>賽務列印</h1><p>分組賽程公布後，即可列印各場地名單與對戰表。</p></div></div><button class="primary" data-view-jump="bracket">前往對戰賽程</button>';
  const groups=state.venuePlan.groups, nine=venuePlan.isNewState(state), drawn=state.venuePlan.mainDraw?.status==='drawn';
  return `<section class="venue-print-center"><div class="page-heading"><div><h1>賽務列印</h1><p>排隊公告給選手找組別；裁判執行表用來叫號、記錄勝隊。</p></div><div class="venue-judge-actions">${nine?'<button class="primary" data-venue-print="all" data-print-kind="announcement">全部排隊公告・3 張</button>':''}<button class="outline" data-venue-print="all" data-print-kind="execution">全部裁判表${nine?'・4 張':''}</button></div></div><div class="venue-print-options">${['A','B','C','MAIN'].map(v=>{
    const own=groups.filter(g=>g.venue===v), main=v==='MAIN';
    const title=main?(nine&&!drawn?'報到與抽籤表':'主舞台對戰表'):own.map(g=>g.id).join(' → ');
    const detail=main?(nine&&!drawn?'九組冠軍報到後現場抽籤':`${nine?'9':'8'} 場，包含季軍賽`):`${own.reduce((n,g)=>n+g.teamIds.length,0)} 隊，每組選出冠軍後再換下一組`;
    return `<article><span class="venue-print-letter">${main?'主舞台':`場地 ${v}`}</span><h2>${title}</h2><p>${detail}</p><div class="venue-judge-actions">${!main&&nine?`<button class="primary" data-venue-print="${v}" data-print-kind="announcement">排隊公告・1 張</button>`:''}<button class="outline" data-venue-print="${v}" data-print-kind="execution">${main&&!drawn?'報到與抽籤表':'裁判執行表'}${nine?'・1 張':''}</button></div></article>`;
  }).join('')}</div><p class="venue-print-note">列印時會讀取最新資料。紙上賽果請回填系統；主舞台抽籤登錄後，再列印對戰表。</p></section>`;
}
let venuePrintLoading=false;
async function venueOpenPrint(scope, kind='execution') {
  if(venuePrintLoading)return;
  const requestedScope=String(scope||'').toUpperCase();
  const requestedKind=kind==='announcement'?'announcement':'execution';
  const requestedCampus=campus, requestedJudge=judgeDeskId, requestedMutation=mutationRevision;
  if (role!=='control'||!judgeDeskAuthenticated||judgeDeskChooser) return showToast('請先驗證賽務密碼並選擇工作身分。',true);
  if(requestedCampus!==EVENT_SCOPE)return showToast('賽事資料來源不符，請重新進入賽務。',true);
  if(!['A','B','C','MAIN','ALL'].includes(requestedScope))return showToast('請選擇要列印的場地。',true);
  if(requestedKind==='announcement'&&requestedScope==='MAIN')return showToast('主舞台請使用報到與抽籤表。',true);
  if (requestedJudge && requestedScope!==requestedJudge && !(requestedJudge==='A'&&requestedScope==='MAIN')) return showToast('請由總賽務列印其他場地。',true);
  if (!venuePlan.isVenueState(state)) return showToast('尚未公布三場地賽程。',true);
  if (pendingMutations || uiOperationPending || unsavedCampusStates.has(requestedCampus)) return showToast('請先完成同步，再列印正式文件。',true);
  const printTrigger=document.activeElement;
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
    window.JunkbotVenuePrint.open(venuePlan.toView(snapshot,{judgeId:requestedJudge}),requestedScope==='ALL'?'all':requestedScope,printTrigger,{kind:requestedKind});
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
    onMainDraw:venueShowMainDraw,
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
    return `<section class="venue-print-center"><div class="page-heading"><div><span class="kicker">THREE VENUES · NATIONAL TOURNAMENT</span><h1>準備建立三場地賽程</h1><p>已登錄 72 隊。保留原隊號，隨機抽定九組及組內晉級路線。</p></div><button class="primary" data-action="create-bracket">核對名單並抽籤</button></div><div class="venue-print-options"><article><span class="venue-print-letter">場地 A</span><h2>A1、A2、A3</h2><p>24 隊 · 21 場 · 3 位組冠軍前往主舞台</p></article><article><span class="venue-print-letter">場地 B</span><h2>B1、B2、B3</h2><p>24 隊 · 21 場 · 3 位組冠軍前往主舞台</p></article><article><span class="venue-print-letter">場地 C</span><h2>C1、C2、C3</h2><p>24 隊 · 21 場 · 3 位組冠軍前往主舞台</p></article><article><span class="venue-print-letter">主舞台</span><h2>全國八強至決賽</h2><p>9 隊 · 9 場（含季軍賽）· 三位評審集中</p></article></div><p class="venue-print-note">每組 8 隊，8 → 4 → 2 → 1，連勝 3 場成為組冠軍。分組賽固定在原場地；九位冠軍至主舞台重新抽籤。抽籤公布後，即可列印各場地名單與對戰表。</p></section>`;
  }
  if(!venuePlan.isVenueState(state))return venueOriginalBracketView(control);
  const canReset=control&&!state.matches.some(m=>m.status==='completed')&&!activeMatchIds().length;
  return `<div class="page-heading venue-heading"><div><span class="kicker">THREE VENUES · NATIONAL TOURNAMENT</span><h1>三場地對戰賽程</h1><p>${venuePlan.isNewState(state)?'72 隊 · A、B、C 各 24 隊、各 3 組；每組 8 隊取 1 位冠軍，九位冠軍上主舞台抽籤。':'72 隊 · 原八組賽制；八強集中主舞台。'}</p></div>${canReset?'<details class="venue-draw-tools"><summary>賽程管理</summary><button class="outline" data-action="redraw-bracket">重新抽籤</button><button class="outline" data-action="reset-bracket">重設賽程</button></details>':''}</div>${window.JunkbotVenueUI.render(venueData(),{control,judgeId:control?activeJudgeId():null})}`;
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
  return {teamCount:72,bracketSize:72,roundCount:7,roundSizes:[72,36,18,9,8,4,2],byeCount:0,byeRoundCount:0,firstStage:'9 組八強賽'};
};
const venueOriginalShowDraw=showDrawConfirmation;
showDrawConfirmation=function(redraw=false){
  if(state.entries.length!==72)return venueOriginalShowDraw(redraw);
  const error=validateRoster();if(error)return showToast(error,true);
  if(activeMatchIds().length||state.matches.some(m=>m.status==='completed'))return showToast('已有開啟場次或正式賽果，不能重新抽籤。',true);
  openModal(`<div class="modal-head"><div><span class="section-kicker">THREE VENUES</span><h2>${redraw?'重新抽籤確認':'三場地抽籤確認'}</h2></div><button data-close-modal aria-label="關閉抽籤確認">×</button></div><div class="modal-body"><ul class="draw-confirm-list"><li><span>名單</span><b>72 隊，原隊號保留</b></li><li><span>場地 A / B / C</span><b>各 24 隊，各產生 3 位組冠軍</b></li><li><span>各組賽制</span><b>每組 8 隊，組內無輪空；連勝 3 場出線</b></li><li><span>晉級路線</span><b>組內 8 → 4 → 2 → 1；九位冠軍上主舞台重新抽籤</b></li><li><span>正式對戰</span><b>分場 63 場＋主舞台 9 場（含季軍）</b></li></ul><p class="hint">${redraw?'此操作會更換全部分組與對手，舊紙本將失效。':'分組公布後名單鎖定；主舞台籤位現場另抽。'}評審 A、B、C 固定各場地；主舞台由評審 A 登錄，B、C 協同。</p><label class="draw-ack"><input type="checkbox" id="drawAcknowledgement" required><span>已核對名單，確認本次三場地賽制與公告方式。</span></label><div class="modal-actions"><button class="outline" data-close-modal>返回核對</button><button class="primary" data-confirm-draw>${redraw?'確認重新抽籤':'確認名單並抽籤'}</button></div></div>`,true);
};
const venueOriginalCreateBracket=createBracket;
createBracket=async function(){
  if(state.entries.length!==72)return venueOriginalCreateBracket();
  const error=validateRoster();if(error)return showToast(error,true);
  try {
    if(!DEMO){const capability=await apiGet(EVENT_SCOPE);if(!capability.success||!capability.capabilities?.mainStageDraw)throw new Error('賽事服務尚未支援主舞台抽籤，請先完成系統更新。');}
    const generated=venuePlan.generate(state.entries,fairRandom);
    state=venuePlan.fromDraw(generated,state,{replace:true,operatorName:operatorName||'演練賽務'});
    await saveState('九組分組賽已公布；主舞台待九組完成後現場抽籤');
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
dashboardView=function(){const html=venueOriginalDashboard();if(!venuePlan.isVenueState(state))return html;const nine=venuePlan.isNewState(state);return `<section class="venue-dashboard-strip"><div><b>${nine?'九組分組賽已公布':'三場地分組賽已公布'}</b><span>${nine?'A1–A3／B1–B3／C1–C3 · 每場地 24 隊、21 場 · 九位冠軍至主舞台抽籤':'A1–A3／B1–B3／C1–C2 · 八強至主舞台'}</span></div><div class="venue-judge-actions">${venueMainDrawButton()}<button class="outline" data-view-jump="print">賽務列印</button></div></section>${html}`;};
const venueOriginalArenas=arenasView;
arenasView=function(){
  if(!venuePlan.isVenueState(state))return venueOriginalArenas();
  return `<div class="page-heading"><div><span class="kicker">VENUE CONTROL</span><h1>賽場控制</h1><p>各場地一次一場；${venuePlan.isNewState(state)?'九組全數完成後，在主舞台現場抽籤再開賽。':'主舞台待八個分組全數完成後開放。'}</p></div><button class="outline" data-view-jump="print">賽務列印</button></div>${['A','B','C','MAIN'].map(v=>{const items=state.matches.filter(m=>m.venue===v);const active=items.filter(m=>activeMatchIds().includes(m.id)&&m.status!=='completed');const ready=items.filter(m=>!active.includes(m)&&!venuePlan.blockReason(state,m.id)).sort((a,b)=>a.venueOrder-b.venueOrder);return `<section class="venue-arena-section"><h2>${v==='MAIN'?'主舞台':`場地 ${v}`}</h2><p>${v==='MAIN'?'由評審 A 登錄，B、C 協同。':state.venuePlan.groups.filter(g=>g.venue===v).map(g=>g.id).join('、')}${v==='MAIN'&&!venuePlan.mainReady(state)?(venuePlan.isNewState(state)?' · 等待九組完成與現場抽籤。':' · 等待八組勝者全數產生。'):''}</p>${v==='MAIN'?venueMainDrawButton():''}<div class="arena-grid">${active.map(m=>arenaControlCard(m,true)).join('')}${ready.slice(0,3).map(m=>arenaControlCard(m,false)).join('')}${!active.length&&!ready.length?'<p class="hint">目前無可開賽場次；完成前場判定後自動更新。</p>':''}</div>${ready.length>3?`<p class="hint">另有 ${ready.length-3} 場已就緒；完成上述場次後自動顯示。</p>`:''}</section>`;}).join('')}`;
};
document.addEventListener('click',event=>{const button=event.target.closest('[data-venue-print]');if(button){event.preventDefault();venueOpenPrint(button.dataset.venuePrint,button.dataset.printKind);}});

let venueMainDrawDraft=null, venueMainDrawLoading=false;
function venueCanManageMainDraw(){return role==='control'&&judgeDeskAuthenticated&&!judgeDeskChooser&&!judgeDeskId&&campus===EVENT_SCOPE;}
function venueMainDrawButton(){
  if(!venueCanManageMainDraw()||!venuePlan.isNewState(state)||state.venuePlan.mainDraw?.status==='drawn')return '';
  const complete=venuePlan.finalists(state).filter(f=>f.teamId).length;
  return `<button class="primary" data-venue-main-draw ${complete===9?'':'disabled'}>${complete===9?'主舞台現場抽籤':`主舞台待九組完成（${complete}/9）`}</button>`;
}
async function venueShowMainDraw(){
  if(venueMainDrawLoading||!venueCanManageMainDraw())return;
  if(pendingMutations||uiOperationPending||unsavedCampusStates.has(campus))return showToast('請先完成資料同步。',true);
  venueMainDrawLoading=true;
  const requestedMutation=mutationRevision;
  try {
    const response=await apiGet(EVENT_SCOPE);
    if(!venueCanManageMainDraw()||pendingMutations||uiOperationPending||mutationRevision!==requestedMutation)throw new Error('工作身分或賽事已變更，請重新開啟抽籤。');
    if(!response.success||!response.state)throw new Error(response.error||'無法取得最新賽程。');
    if(!DEMO&&!response.capabilities?.mainStageDraw)throw new Error('賽事服務尚未完成更新，暫時不能登錄主舞台籤位。');
    const latest=normalizeState(response.state,EVENT_SCOPE);
    if(!venuePlan.isNewState(latest)||!venuePlan.groupsComplete(latest))throw new Error('請先完成九組的全部正式判定。');
    if(latest.venuePlan.mainDraw?.status==='drawn')throw new Error('主舞台籤位已公布，請更新賽程查看；不可重新抽籤。');
    if((latest.activeMatchIds||[]).length||latest.activeMatchId)throw new Error('請先完成所有已開啟的場次。');
    const finalists=venuePlan.finalists(latest).map(f=>({...f,team:latest.entries.find(t=>t.id===f.teamId)}));
    venueMainDrawDraft={revision:latest.revision,finalists,positions:Array(9).fill(''),method:'onsite-lots',submitted:false};
    const rules=['九進八 M-01','九進八 M-01','八強 M-02，對 M-01 勝隊','八強 M-03','八強 M-03','八強 M-04','八強 M-04','八強 M-05','八強 M-05'];
    openModal(`<div class="modal-head"><div><span class="section-kicker">MAIN STAGE DRAW</span><h2>主舞台現場抽籤</h2></div><button data-close-modal aria-label="關閉主舞台抽籤">×</button></div><div class="modal-body venue-main-draw"><p>九位組冠軍全部到齊。請將現場抽出的籤號填入下表；也可由電腦隨機排定九個籤位。</p><p class="venue-draw-rule"><b>1、2 號籤先比九進八；3–9 號籤首輪輪空。</b>八強起依固定路線晉級，另有季軍賽。籤位公布後鎖定。</p><div class="venue-draw-toolbar"><button class="outline" data-venue-random-main>電腦隨機排定籤位</button><span id="venueMainDrawMethod">登錄現場紙籤結果</span></div><div class="venue-main-draw-grid">${rules.map((rule,index)=>`<label><span><b>${index+1} 號籤</b> · ${rule}</span><select data-venue-lot="${index}" aria-label="${index+1} 號籤"><option value="">選擇組冠軍</option>${finalists.map(f=>`<option value="${esc(f.teamId)}">${esc(f.groupId)} · ${esc(f.team.teamNumber)} 號｜${esc(f.team.teamName)}</option>`).join('')}</select></label>`).join('')}</div><p id="venueMainDrawError" role="alert" class="venue-draw-error"></p><label class="draw-ack"><input type="checkbox" id="venueMainDrawAck"><span>已核對九位組冠軍及全部籤位，確認公布後不得重抽。</span></label><div class="modal-actions"><button class="outline" data-close-modal>返回核對</button><button class="primary" data-venue-submit-main>確認公布主舞台籤位</button></div></div>`,true);
  }catch(error){showToast(error.message,true);}finally{venueMainDrawLoading=false;}
}
function venueReadMainLots(){return [...document.querySelectorAll('[data-venue-lot]')].map(select=>select.value);}
function venueUpdateMainLots(){
  if(!venueMainDrawDraft||venueMainDrawDraft.submitted)return;
  const values=venueReadMainLots();
  venueMainDrawDraft.positions=values;
  const repeated=values.filter(Boolean).length-new Set(values.filter(Boolean)).size;
  $('venueMainDrawError').textContent=repeated?'同一位組冠軍不能填入兩個籤位，請重新核對。':'';
  $('venueMainDrawAck').checked=false;
}
async function venueSubmitMainDraw(){
  const draft=venueMainDrawDraft;
  if(!draft||!venueCanManageMainDraw()||uiOperationPending||pendingMutations)return;
  const positions=venueReadMainLots(),expected=draft.finalists.map(f=>f.teamId);
  if(positions.length!==9||new Set(positions).size!==9||positions.some(id=>!expected.includes(id)))return $('venueMainDrawError').textContent='請為九個籤位各選一位組冠軍，不可空白或重複。';
  if(!$('venueMainDrawAck')?.checked)return $('venueMainDrawError').textContent='請先核對籤位並勾選確認。';
  if(unsavedCampusStates.has(campus))return $('venueMainDrawError').textContent='請先同步尚未儲存的賽事資料。';
  // Keep the same positions for a retry after an ambiguous network failure.
  draft.positions=positions;draft.submitted=true;
  uiOperationPending=true;pendingMutations+=1;mutationRevision+=1;
  const controls=[...$('modalRoot').querySelectorAll('button,select,input')];controls.forEach(el=>el.disabled=true);
  $('venueMainDrawError').textContent='正在公布，請稍候…';setSync('saving','公布主舞台籤位');
  try {
    const result=await apiPost({action:'junkbot-main-draw',password:controlPassword,campus:EVENT_SCOPE,expectedRevision:draft.revision,entryIds:positions,drawMethod:draft.method,judgeName:operatorName});
    if(!result.success||!result.state){const error=new Error(result.error||'未收到儲存確認。請維持相同籤位重試，系統會核對是否已公布。');error.code=result.code;throw error;}
    state=normalizeState(result.state,EVENT_SCOPE);knownRevision=state.revision;
    lastSuccessfulSyncAt=new Date().toISOString();syncConflict=false;connectionOk=true;
    saveSpectatorCache(`bp-junkbot-spectator-cache-${DEMO?'demo-':''}${EVENT_SCOPE}`,JSON.stringify(state));
    setSync('','已公布');uiOperationPending=false;closeModal();venueMainDrawDraft=null;renderControl();showToast('主舞台九個籤位及九場對戰已公布。');
  }catch(error){
    if(['REVISION_CONFLICT','MAIN_DRAW_LOCKED'].includes(error.code)){
      try {
        const latestResponse=await apiGet(EVENT_SCOPE);
        if(latestResponse.success&&latestResponse.state){
          const latest=normalizeState(latestResponse.state,EVENT_SCOPE);
          if(latest.venuePlan?.mainDraw?.status==='drawn'){
            state=latest;knownRevision=latest.revision;connectionOk=true;syncConflict=false;
            lastSuccessfulSyncAt=new Date().toISOString();setSync('','已公布');
            saveSpectatorCache(`bp-junkbot-spectator-cache-${DEMO?'demo-':''}${EVENT_SCOPE}`,JSON.stringify(state));
            uiOperationPending=false;closeModal();venueMainDrawDraft=null;renderControl();
            showToast('另一台裝置已公布主舞台籤位，已顯示正式結果，請核對。');return;
          }
          const latestIds=venuePlan.isNewState(latest)?venuePlan.finalists(latest).map(f=>f.teamId):[];
          if(latestIds.length===9&&latestIds.every(id=>expected.includes(id))&&venuePlan.groupsComplete(latest)){
            draft.revision=latest.revision;error.message='賽事資料剛由另一台裝置更新；九位冠軍與您填入的籤位均已保留。請以原籤位再次確認公布。';
          }
        }
      }catch(readError){/* Retain the original draft for a safe retry. */}
    }
    connectionOk=false;setSync('error','請確認公布結果');
    $('venueMainDrawError').textContent=`${error.message} 若連線中斷，請按下方按鈕以原籤位重試。`;
    controls.filter(el=>el.matches('button')).forEach(el=>el.disabled=false);
    const retry=document.querySelector('[data-venue-submit-main]');if(retry)retry.textContent='以原籤位重試公布';
    const random=document.querySelector('[data-venue-random-main]');if(random)random.disabled=true;
  }finally{uiOperationPending=false;pendingMutations-=1;}
}
document.addEventListener('change',event=>{if(event.target.matches('[data-venue-lot]')&&venueMainDrawDraft&&!venueMainDrawDraft.submitted){venueMainDrawDraft.method='onsite-lots';$('venueMainDrawMethod').textContent='登錄現場紙籤結果';venueUpdateMainLots();}});
document.addEventListener('click',event=>{
  if(event.target.closest('[data-venue-main-draw]'))venueShowMainDraw();
  if(event.target.closest('[data-venue-random-main]')&&venueMainDrawDraft&&!venueMainDrawDraft.submitted&&!uiOperationPending){
    const positions=venuePlan.shuffle(venueMainDrawDraft.finalists.map(f=>f.teamId),fairRandom);
    document.querySelectorAll('[data-venue-lot]').forEach((select,index)=>{select.value=positions[index];});
    venueMainDrawDraft.method='computer-random';$('venueMainDrawMethod').textContent='電腦隨機籤位 · 尚未公布';venueUpdateMainLots();
  }
  if(event.target.closest('[data-venue-submit-main]'))venueSubmitMainDraw();
});
