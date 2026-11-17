const $ = id => document.getElementById(id);
const workspace = document.querySelector('.workspace');
const viewButtons = [...document.querySelectorAll('[data-view]')];
for (const button of viewButtons) button.addEventListener('click', () => {
  const preview = button.dataset.view === 'preview';
  workspace.classList.toggle('view-preview', preview);
  for (const item of viewButtons) item.setAttribute('aria-pressed', String(item === button));
});
$('openTransfer').addEventListener('click', () => $('transferDialog').showModal());
$('ballPreview').addEventListener('click', () => $('playAnimation').click());
const syncDeviceState = () => {
  const connected = !$('usbSend').disabled || !$('usbDisconnect').hidden;
  $('deviceConnection').classList.toggle('connected', connected);
  $('deviceConnection').textContent = connected ? '● 遊戲機已連接 · 此視窗為作品預覽' : '○ 實機未連接 · 目前為作品預覽';
  $('ballPreview').disabled = $('playAnimation').disabled;
};
const observer = new MutationObserver(syncDeviceState);
for (const id of ['usbSend', 'usbDisconnect', 'playAnimation']) observer.observe($(id), {attributes:true,attributeFilter:['disabled','hidden']});
syncDeviceState();
