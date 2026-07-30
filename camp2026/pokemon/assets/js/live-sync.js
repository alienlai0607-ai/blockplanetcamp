/* Multi-device live tournament sync. The endpoint is injected before deployment. */
(function () {
  const CONFIG = {
    endpoint: 'https://radius-release-drinking-contacts.trycloudflare.com',
    key: 'bp-camp-20260730-live',
    pollMs: 1200,
  };
  const clientId = localStorage.getItem('bp_sync_client_id')
    || `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem('bp_sync_client_id', clientId);

  let revision = -1;
  let pushing = false;
  let queuedState = null;
  let timer = null;

  function validConfig() {
    return /^https:\/\//.test(CONFIG.endpoint) && !CONFIG.endpoint.includes('BP_SYNC_');
  }

  function status(text, mode) {
    let chip = document.getElementById('bpSyncStatus');
    if (!chip) {
      chip = document.createElement('div');
      chip.id = 'bpSyncStatus';
      chip.style.cssText = [
        'position:fixed', 'top:8px', 'left:50%', 'transform:translateX(-50%)',
        'z-index:10000', 'padding:7px 13px', 'border-radius:999px',
        'font:800 13px/1.2 "Noto Sans TC",sans-serif', 'box-shadow:0 4px 16px #1233',
        'pointer-events:none', 'transition:.2s',
      ].join(';');
      document.body.appendChild(chip);
    }
    chip.textContent = text;
    chip.style.background = mode === 'ok' ? '#dff8e9' : mode === 'busy' ? '#fff2b8' : '#ffe1e1';
    chip.style.color = mode === 'ok' ? '#08783f' : mode === 'busy' ? '#735600' : '#a3172d';
  }

  async function request(method, payload) {
    const response = await fetch(`${CONFIG.endpoint}/api/state`, {
      method,
      cache: 'no-store',
      headers: {
        'Content-Type': 'application/json',
        'X-BP-Sync-Key': CONFIG.key,
      },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (!response.ok) throw new Error(`sync_${response.status}`);
    return response.json();
  }

  function apply(result) {
    if (!result || result.revision == null) return;
    if (result.revision < revision) return;
    revision = result.revision;
    if (result.state) {
      const current = localStorage.getItem('bp_tournament');
      const next = JSON.stringify(result.state);
      if (current !== next) {
        localStorage.setItem('bp_tournament', next);
        window.dispatchEvent(new CustomEvent('bp-tournament-sync', {
          detail: { revision, updatedAt: result.updatedAt },
        }));
      }
    }
    status(`多機同步中 · ${result.state?.trainers?.length || 0} 位`, 'ok');
  }

  async function flush() {
    if (!validConfig() || pushing || !queuedState) return;
    pushing = true;
    const state = queuedState;
    queuedState = null;
    status('正在合併各裝置資料…', 'busy');
    try {
      apply(await request('POST', { clientId, state }));
    } catch (error) {
      queuedState = state;
      status('同步暫時中斷，資料仍保留在本機', 'error');
    } finally {
      pushing = false;
      if (queuedState) setTimeout(flush, 250);
    }
  }

  async function pull() {
    if (!validConfig() || pushing) return;
    try {
      const result = await request('GET');
      if (result.revision !== revision) apply(result);
    } catch (_) {
      status('同步暫時中斷，資料仍保留在本機', 'error');
    }
  }

  const BPSync = {
    queueMerge(state) {
      queuedState = JSON.parse(JSON.stringify(state));
      clearTimeout(timer);
      timer = setTimeout(flush, 80);
    },
    async start() {
      if (!validConfig()) {
        status('同步尚未啟用', 'error');
        return;
      }
      const local = Store.get('bp_tournament', null);
      if (local) {
        queuedState = local;
        await flush();
      } else {
        await pull();
      }
      setInterval(pull, CONFIG.pollMs);
    },
  };

  window.BPSync = BPSync;
  window.addEventListener('DOMContentLoaded', () => BPSync.start());
})();
