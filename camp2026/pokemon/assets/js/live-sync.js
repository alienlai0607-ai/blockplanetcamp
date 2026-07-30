/* Multi-device live tournament sync. The endpoint is injected before deployment. */
(function () {
  const CONFIG = {
    endpoint: 'https://radius-release-drinking-contacts.trycloudflare.com',
    key: 'bp-camp-20260730-live',
    pollMs: 3000,
    requestTimeoutMs: 30000,
  };
  const clientId = localStorage.getItem('bp_sync_client_id')
    || `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem('bp_sync_client_id', clientId);

  let revision = -1;
  let pushing = false;
  let queuedState = null;
  let timer = null;
  let retryTimer = null;
  let retryDelay = 1500;
  let trainerCount = 0;

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
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    const since = method === 'GET' && revision >= 0 ? `?since=${revision}` : '';
    try {
      const response = await fetch(`${CONFIG.endpoint}/api/state${since}`, {
        method,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-BP-Sync-Key': CONFIG.key,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!response.ok) throw new Error(`sync_${response.status}`);
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function apply(result) {
    if (!result || result.revision == null) return;
    if (result.revision < revision) return;
    revision = result.revision;
    if (result.state) {
      trainerCount = result.state.trainers?.length || 0;
      const current = localStorage.getItem('bp_tournament');
      const next = JSON.stringify(result.state);
      if (current !== next) {
        localStorage.setItem('bp_tournament', next);
        window.dispatchEvent(new CustomEvent('bp-tournament-sync', {
          detail: { revision, updatedAt: result.updatedAt },
        }));
      }
    }
    status(`多機同步中 · ${trainerCount} 位`, 'ok');
    retryDelay = 1500;
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(flush, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15000);
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
      status('正在重新連線，本機資料已保存', 'error');
      scheduleRetry();
    } finally {
      pushing = false;
    }
  }

  async function pull() {
    if (!validConfig() || pushing) return;
    try {
      const result = await request('GET');
      if (result.revision !== revision || result.state) {
        apply(result);
      } else {
        status(`多機同步中 · ${trainerCount} 位`, 'ok');
        retryDelay = 1500;
      }
    } catch (_) {
      status('正在重新連線，本機資料已保存', 'error');
    }
  }

  function hasUnsyncedData(local, remote) {
    if (!local) return false;
    if (!remote) return true;
    const remoteIds = new Set((remote.trainers || []).map(trainer => trainer.id));
    if ((local.trainers || []).some(trainer => !remoteIds.has(trainer.id))) return true;
    const remoteRounds = remote.qual?.rounds || [];
    return (local.qual?.rounds || []).some((round, roundIndex) =>
      (round || []).some((match, matchIndex) =>
        match?.winner && !remoteRounds[roundIndex]?.[matchIndex]?.winner
      )
    );
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
      trainerCount = local?.trainers?.length || 0;
      try {
        const remote = await request('GET');
        apply(remote);
        if (hasUnsyncedData(local, remote.state)) {
          queuedState = local;
          await flush();
        }
      } catch (_) {
        if (local) queuedState = local;
        status('正在重新連線，本機資料已保存', 'error');
        if (queuedState) scheduleRetry();
      }
      setInterval(pull, CONFIG.pollMs);
    },
  };

  window.BPSync = BPSync;
  window.addEventListener('online', () => {
    retryDelay = 1500;
    if (queuedState) flush();
    else pull();
  });
  window.addEventListener('DOMContentLoaded', () => BPSync.start());
})();
