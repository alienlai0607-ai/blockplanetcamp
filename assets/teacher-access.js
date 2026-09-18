/* Shared convenience password gate for teacher tools on this static site.
   This prevents accidental entry; it is not server-side authorization. */
(() => {
  'use strict';
  const key = 'bp_teacher_tools_unlocked_v1';
  let memoryUnlocked = false;
  let pending = null;
  const isUnlocked = () => { try { return memoryUnlocked || sessionStorage.getItem(key) === 'yes'; } catch { return memoryUnlocked; } };
  const dialog = document.createElement('dialog');
  dialog.id = 'teacherAccessDialog';
  dialog.setAttribute('aria-labelledby', 'teacherAccessTitle');
  dialog.setAttribute('aria-describedby', 'teacherAccessDescription');
  dialog.innerHTML = '<form id="teacherAccessForm"><button type="button" class="teacher-access-close" aria-label="關閉密碼視窗">×</button><span class="teacher-access-kicker">BLOCK PLANET · TEACHERS</span><h2 id="teacherAccessTitle">老師工具</h2><p id="teacherAccessDescription">輸入老師通行密碼，開啟教室工具。</p><label for="teacherAccessPassword">通行密碼</label><input id="teacherAccessPassword" type="password" autocomplete="current-password" required autofocus><p class="teacher-access-error" id="teacherAccessError" role="alert"></p><button type="submit" class="teacher-access-submit">解鎖並開啟</button></form>';
  document.body.append(dialog);
  const input = dialog.querySelector('input');
  const error = dialog.querySelector('[role="alert"]');
  function requireAccess(action) {
    if (isUnlocked()) { action(); return; }
    pending = action; input.value = ''; error.textContent = '';
    if (!dialog.open) dialog.showModal();
    input.focus();
  }
  dialog.querySelector('form').addEventListener('submit', event => {
    event.preventDefault();
    if (input.value !== 'block') { error.textContent = '密碼不正確，請再試一次。'; input.select(); return; }
    memoryUnlocked = true;
    try { sessionStorage.setItem(key, 'yes'); } catch {}
    const action = pending; pending = null; input.value = ''; dialog.close(); action?.();
  });
  dialog.querySelector('.teacher-access-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => { pending = null; input.value = ''; });
  dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if(event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
  window.BlockTeacherAccess = { require: requireAccess, lock() { memoryUnlocked = false; try {sessionStorage.removeItem(key);} catch {} } };
  document.querySelectorAll('[data-teacher-tool]').forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    requireAccess(() => { window.location.assign(link.href); });
  }));
  const dropdown = document.getElementById('teacherToolsMenu');
  if (dropdown) {
    document.addEventListener('click', event => {if(!dropdown.contains(event.target)) dropdown.open = false;});
    document.addEventListener('keydown', event => {if(event.key === 'Escape' && dropdown.open){dropdown.open=false;dropdown.querySelector('summary').focus();}});
    dropdown.addEventListener('focusout', () => {setTimeout(()=>{if(!dropdown.contains(document.activeElement))dropdown.open=false;},0);});
  }
  window.dispatchEvent(new Event('teacher-access-ready'));
})();
