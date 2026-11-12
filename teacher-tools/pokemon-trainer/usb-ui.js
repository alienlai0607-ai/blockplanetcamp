import {ArtworkConnection} from './usb.js?v=4';
import {FirmwareInstaller,latestBackup} from './firmware.js?v=3';

export function mountDevicePanel({getArtwork,download,toast}){
  const $=id=>document.getElementById(id),supported=globalThis.isSecureContext&&!!navigator.serial;
  let connection=null,info=null,busy=false,controller=null,installer=null,firmwareBusy=false,backup=null,downloaded=false;
  let diagnosticLines=[];
  function diagnostic(message){diagnosticLines.push(`${new Date().toISOString()} ${String(message).slice(0,600)}`);diagnosticLines=diagnosticLines.slice(-120);$('firmwareLog').textContent=diagnosticLines.join('\n');$('firmwareDownloadLog').disabled=firmwareBusy||!diagnosticLines.length;}
  const status=(text,error=false)=>{$('usbStatus').textContent=text;$('usbStatus').classList.toggle('error',error);};
  const storageHelp=detail=>/^1\.18-SWdev11-/.test(detail?.fw||'')?'作品尚未寫入。請按下方「安裝／更新遊戲系統」，選「更新現有遊戲」更新到 SWdev12 作品區修正版，再重新連接傳送。':'作品儲存區未通過安全檢查，已停止寫入。請保留完整 USB 備份供檢查。';
  const firmwareStatus=(text,error=false)=>{$('firmwareStatus').textContent=text;$('firmwareStatus').classList.toggle('error',error);};
  function controls(){
    $('usbConnect').disabled=!supported||busy||!!connection||firmwareBusy;
    $('usbSend').disabled=!connection||!info||info.storage==='blocked'||busy||firmwareBusy;
    $('usbDisconnect').hidden=!connection;$('usbDisconnect').disabled=busy;
    $('usbCancel').hidden=!busy;$('openFirmware').disabled=busy||firmwareBusy;
  }
  function flashControls(){
    $('firmwareConnect').disabled=!supported||firmwareBusy||!!installer?.ready||!$('confirmStopWatch').checked;
    $('firmwareInstall').disabled=firmwareBusy||!installer?.ready||!downloaded||!$('confirmBackup').checked||($('firmwareMode').value==='install'&&!$('confirmErase').checked);
    $('firmwareBackup').disabled=!backup||firmwareBusy;
    $('firmwarePreviousBackup').disabled=firmwareBusy;
    $('firmwareDownloadLog').disabled=firmwareBusy||!diagnosticLines.length;
    $('firmwareClose').disabled=firmwareBusy;
    $('firmwareMode').disabled=firmwareBusy||!!installer?.ready;
    $('confirmStopWatch').disabled=firmwareBusy||!!installer?.ready;
    $('confirmBackup').disabled=firmwareBusy||!downloaded;
    $('confirmErase').disabled=firmwareBusy;
    $('firstInstallNotice').hidden=$('firmwareMode').value!=='install';
  }
  $('usbConnect').addEventListener('click',async()=>{
    if(busy||connection||firmwareBusy||!supported)return;
    busy=true;controls();status('請在瀏覽器視窗選擇你的 StopWatch。');
    let candidate;
    try{
      const port=await navigator.serial.requestPort();
      candidate=new ArtworkConnection(port,{onDisconnect:()=>{connection=null;info=null;controls();status('設備已離線，重新接上後可再連接。');}});
      info=await candidate.open();connection=candidate;
      status(info.storage==='blocked'?storageHelp(info):`已連接 StopWatch · ${info.fw}${info.size?' · 已有自繪背景':''}`,info.storage==='blocked');
    }catch(error){if(candidate)await candidate.close();connection=null;info=null;status(error.name==='NotFoundError'?'已取消選擇設備。':error.message,true);}
    finally{busy=false;controls();}
  });
  $('usbDisconnect').addEventListener('click',async()=>{if(busy)return;const old=connection;connection=null;info=null;await old?.close();controls();status('已中斷連接，可以拔下設備。');});
  $('usbSend').addEventListener('click',async()=>{
    if(busy||!connection||!info)return;
    let bytes;try{bytes=getArtwork();}catch(error){toast(error.message);return;}
    if(!bytes)return;const current=connection;controller=new AbortController();busy=true;$('usbCancel').disabled=false;controls();
    try{
      info=await current.upload(bytes,{signal:controller.signal,onProgress:({phase,done,total})=>{
        $('usbProgress').hidden=false;$('usbProgress').value=done/total;
        if(phase==='sending')status(`正在傳送作品… ${Math.floor(done/total*100)}%`);
        if(phase==='committing'){$('usbProgress').removeAttribute('value');$('usbCancel').disabled=true;status('正在儲存與校驗，請保持連線。');}
      }});
      status('作品已寫入並校驗成功！早、中、晚背景已套用，遊戲進度保留。');toast('新背景已放進遊戲機！');
    }catch(error){$('usbProgress').hidden=true;if(error.code==='storage_blocked'){if(info)info.storage='blocked';status(storageHelp(info),true);}else status(error.message,true);}
    finally{busy=false;controller=null;controls();}
  });
  $('usbCancel').addEventListener('click',()=>{controller?.abort();$('usbCancel').disabled=true;status('正在取消傳送…');});
  $('openFirmware').addEventListener('click',async()=>{
    if(busy||firmwareBusy)return;
    const old=connection;connection=null;info=null;await old?.close();controls();
    $('firmwareDialog').showModal();flashControls();
  });
  async function closeFirmware(){if(firmwareBusy)return;await installer?.close();installer=null;backup=null;downloaded=false;$('confirmBackup').checked=false;$('firmwareDialog').close();controls();flashControls();}
  $('firmwareClose').addEventListener('click',closeFirmware);
  $('firmwareDialog').addEventListener('cancel',event=>{event.preventDefault();if(!firmwareBusy)closeFirmware();});
  for(const id of ['confirmStopWatch','confirmBackup','confirmErase','firmwareMode'])$(id).addEventListener('change',flashControls);
  const phases={connecting:'正在辨識設備…',backup:'正在讀取並備份原設備…',recovering:'USB 讀取中斷，正在重新連接並校驗已讀資料，請保持接線…',checkingBackup:'16 MB 已讀完，正在校驗備份…',ready:'備份已校驗並保存在此瀏覽器。請下載備份，確認後開始寫入。',writing:'正在寫入遊戲系統，請勿拔線或關閉分頁…',verifying:'正在讀回校驗韌體…',verified:'韌體寫入與讀回校驗完成。',failed:'更新未完成。請保留備份，重新進入下載模式後再試。'};
  $('firmwareConnect').addEventListener('click',async()=>{
    if(firmwareBusy||installer?.ready||!supported||!$('confirmStopWatch').checked)return;
    firmwareBusy=true;downloaded=false;backup=null;$('confirmBackup').checked=false;diagnosticLines=[];diagnostic('USB installer read-fix 3 · '+$('firmwareMode').value);$('firmwareProgress').hidden=true;$('firmwareProgress').value=0;flashControls();controls();
    try{
      const port=await navigator.serial.requestPort();
      let lastStep='';
      installer=new FirmwareInstaller({log:diagnostic,progress:(phase,p)=>{firmwareStatus(phases[phase]+(['backup','writing','verifying'].includes(phase)?` ${Math.floor(p*100)}%`:''));$('firmwareProgress').hidden=false;$('firmwareProgress').value=p;const step=`${phase} ${Math.floor(p*10)*10}%`;if(step!==lastStep){diagnostic(step);lastStep=step;}}});
      backup=await installer.connect(port,{mode:$('firmwareMode').value,boardConfirmed:$('confirmStopWatch').checked});
      $('firmwareVersion').textContent=`將安裝 ${installer.release.manifest.version} · 僅適用 StopWatch C152`;
    }catch(error){diagnostic(error.message);await installer?.close();installer=null;firmwareStatus(error.name==='NotFoundError'?'已取消選擇設備。':error.message,true);}
    finally{firmwareBusy=false;flashControls();controls();}
  });
  function downloadBackup(record){
    const stamp=record.createdAt.replace(/[^0-9]/g,'').slice(0,14),name=`StopWatch-backup-${stamp}`;
    download(new Blob([record.bytes],{type:'application/octet-stream'}),name+'.bin');
    // Keep metadata in the same durable database; one click produces one download.
    firmwareStatus(`已開始下載 ${name}.bin（16 MB）。請確認檔案已存好，再勾選下方確認。`);
  }
  $('firmwareBackup').addEventListener('click',()=>{if(!backup||firmwareBusy)return;downloadBackup(backup);downloaded=true;flashControls();});
  $('firmwarePreviousBackup').addEventListener('click',async()=>{
    try{const previous=await latestBackup();if(!previous){firmwareStatus('這個瀏覽器尚無設備備份。');return;}downloadBackup(previous);}
    catch{firmwareStatus('無法讀取瀏覽器備份，請使用先前下載的備份檔。',true);}
  });
  $('firmwareDownloadLog').addEventListener('click',()=>{if(firmwareBusy||!diagnosticLines.length)return;download(new Blob([diagnosticLines.join('\n')],{type:'text/plain;charset=utf-8'}),'StopWatch-USB-diagnostic.txt');});
  $('firmwareInstall').addEventListener('click',async()=>{
    if($('firmwareInstall').disabled)return;firmwareBusy=true;flashControls();controls();
    try{const result=await installer.install({backupSaved:downloaded&&$('confirmBackup').checked,eraseConfirmed:$('confirmErase').checked});firmwareStatus(`${result.version} 已寫入並通過讀回校驗。請確認設備重新開機，再關閉此視窗並按「連接遊戲機」驗證回應。`);}
    catch(error){diagnostic(error.message);firmwareStatus(error.message+' 若設備停在黑畫面，請依下方說明重新進入下載模式再試。',true);}
    finally{firmwareBusy=false;flashControls();controls();}
  });
  window.addEventListener('beforeunload',event=>{if(busy||firmwareBusy){event.preventDefault();event.returnValue='';}});
  if(!supported)status('繪圖仍可使用；USB 寫入請用電腦版 Chrome 或 Edge 開啟這個網站。');
  controls();flashControls();
}
