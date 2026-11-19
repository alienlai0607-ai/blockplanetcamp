const $ = id => document.getElementById(id);
const workspace = document.querySelector('.workspace');
const viewButtons = [...document.querySelectorAll('[data-view]')];
for (const button of viewButtons) button.addEventListener('click', () => {
  const preview = button.dataset.view === 'preview';
  workspace.classList.toggle('view-preview', preview);
  for (const item of viewButtons) item.setAttribute('aria-pressed', String(item === button));
});
$('openTransfer').addEventListener('click', () => $('transferDialog').showModal());
const gameOpen=()=>document.querySelector('.machine').classList.contains('game-open');
$('ballPreview').addEventListener('click',()=>$(gameOpen()?'arcade-play':'playAnimation').click());

const theater=$('arcadeTheater');
const shell=document.querySelector('.pokeball-console');
const transport=$('arcadeTransport');
$('arcade-expand').onclick=()=>{
  if(theater.open||$('arcade-play').disabled)return;
  theater.append(shell,transport);
  theater.showModal();
  $('arcadePanel').contentWindow.arcadeCommand('start');
};
$('closeTheater').onclick=()=>theater.close();
theater.addEventListener('close',()=>{
  $('arcadeTools').before(shell);
  $('arcadeTools').prepend(transport);
  $('arcadePanel').contentWindow.arcadeCommand?.('pause');
  $('arcade-expand').focus();
});
const syncDeviceState = () => {
  const connected = !$('usbSend').disabled || !$('usbDisconnect').hidden;
  $('deviceConnection').classList.toggle('connected', connected);
  $('deviceConnection').textContent = connected ? '● 遊戲機已連接 · 此視窗為作品預覽' : '○ 實機未連接 · 目前為作品預覽';
  $('ballPreview').disabled = $(gameOpen()?'arcade-play':'playAnimation').disabled;
};
const observer = new MutationObserver(syncDeviceState);
for (const id of ['usbSend', 'usbDisconnect', 'playAnimation','arcade-play']) observer.observe($(id), {attributes:true,attributeFilter:['disabled','hidden']});
syncDeviceState();
