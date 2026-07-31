/* Multi-device live tournament sync, isolated by event date and venue. */
(function () {
  const CONFIG = {
    endpoint: localStorage.getItem('bp_sync_endpoint')
      || 'https://blockplanet-pokemon-camp-sync.alienlai0607.workers.dev',
    key: localStorage.getItem('bp_sync_key') || 'bp-camp-20260730-live',
    pollMs: 3000,
    requestTimeoutMs: 30000,
  };
  const clientId = localStorage.getItem('bp_sync_client_id')
    || `device_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  localStorage.setItem('bp_sync_client_id', clientId);

  const revisions = new Map();
  const queues = new Map();
  let pushing = false;
  let pollTimer = null;
  let retryTimer = null;
  let retryDelay = 1500;
  let trainerCount = 0;

  function validConfig() {
    return /^https?:\/\//.test(CONFIG.endpoint) && !CONFIG.endpoint.includes('BP_SYNC_');
  }

  function activeState() {
    return Store.get('bp_tournament', null);
  }

  function activeEventId() {
    const state = activeState();
    return state?.meta?.eventId || window.BPEvents?.activeId?.() || '';
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

  function copy(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function stateForSync(source) {
    const next = copy(source || {});
    next.trainers = (next.trainers || []).map(trainer => {
      const lightweight = { ...trainer };
      delete lightweight.photo;
      return lightweight;
    });
    return next;
  }

  function restoreLocalPhotos(remoteState, eventId) {
    const current = activeState();
    const photos = current?.meta?.eventId === eventId
      ? new Map((current.trainers || [])
        .filter(trainer => trainer.photo)
        .map(trainer => [trainer.id, trainer.photo]))
      : new Map();
    const next = copy(remoteState || {});
    next.meta ||= {};
    next.meta.eventId ||= eventId;
    next.trainers = (next.trainers || []).map(trainer => ({
      ...trainer,
      photo: trainer.photo || photos.get(trainer.id) || '',
    }));
    return next;
  }

  async function apiRequest(path, method, payload, since) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.requestTimeoutMs);
    const query = method === 'GET' && Number.isFinite(since) && since >= 0
      ? `${path.includes('?') ? '&' : '?'}since=${since}`
      : '';
    try {
      const response = await fetch(`${CONFIG.endpoint}${path}${query}`, {
        method,
        cache: 'no-store',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'X-BP-Sync-Key': CONFIG.key,
        },
        body: payload ? JSON.stringify(payload) : undefined,
      });
      if (!response.ok) {
        const error = new Error(`sync_${response.status}`);
        error.status = response.status;
        throw error;
      }
      return response.json();
    } finally {
      clearTimeout(timeout);
    }
  }

  function eventPath(eventId, suffix) {
    return `/api/events/${encodeURIComponent(eventId)}${suffix || '/state'}`;
  }

  async function requestEvent(method, eventId, payload) {
    return apiRequest(
      eventPath(eventId),
      method,
      payload,
      method === 'GET' ? (revisions.get(eventId) ?? -1) : -1,
    );
  }

  function apply(result, eventId) {
    if (!result || result.revision == null) return result;
    const previous = revisions.get(eventId) ?? -1;
    if (result.revision < previous) return result;
    revisions.set(eventId, result.revision);

    if (result.state && activeEventId() === eventId) {
      trainerCount = result.state.trainers?.length || 0;
      const restoredState = restoreLocalPhotos(result.state, eventId);
      if (restoredState.meta.eventId !== eventId) return result;
      const current = localStorage.getItem('bp_tournament');
      const next = JSON.stringify(restoredState);
      if (current !== next) {
        localStorage.setItem('bp_tournament', next);
        window.BPEvents?.save(restoredState).catch(console.error);
        window.dispatchEvent(new CustomEvent('bp-tournament-sync', {
          detail: { eventId, revision: result.revision, updatedAt: result.updatedAt },
        }));
      }
    }
    if (activeEventId() === eventId) {
      status(`多機同步中 · ${trainerCount} 位`, 'ok');
    }
    retryDelay = 1500;
    return result;
  }

  function scheduleRetry() {
    clearTimeout(retryTimer);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      flush();
    }, retryDelay);
    retryDelay = Math.min(retryDelay * 2, 15000);
  }

  async function flush() {
    if (!validConfig() || pushing || !queues.size) return;
    const [eventId, state] = queues.entries().next().value;
    queues.delete(eventId);
    pushing = true;
    if (eventId === activeEventId()) status('正在合併各裝置資料…', 'busy');
    try {
      apply(await requestEvent('POST', eventId, { clientId, state }), eventId);
    } catch (error) {
      queues.set(eventId, state);
      if (eventId === activeEventId()) status('正在重新連線，本機資料已保存', 'error');
      scheduleRetry();
    } finally {
      pushing = false;
      if (queues.size && !retryTimer) setTimeout(flush, 30);
    }
  }

  async function pull(eventId) {
    const targetId = eventId || activeEventId();
    if (!validConfig() || !targetId) return null;
    try {
      const result = await requestEvent('GET', targetId);
      apply(result, targetId);
      if (result.unchanged && targetId === activeEventId()) {
        status(`多機同步中 · ${trainerCount} 位`, 'ok');
      }
      return result;
    } catch (error) {
      if (targetId === activeEventId()) status('正在重新連線，本機資料已保存', 'error');
      throw error;
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

  async function ensureRemoteEvent(state) {
    const eventId = state?.meta?.eventId;
    if (!eventId) return null;
    try {
      return await pull(eventId);
    } catch (error) {
      if (error.status !== 404) throw error;
      return apiRequest('/api/events', 'POST', { clientId, state: stateForSync(state) });
    }
  }

  const BPSync = {
    config: CONFIG,
    queueMerge(state) {
      const eventId = state?.meta?.eventId;
      if (!eventId) return;
      queues.set(eventId, stateForSync(state));
      clearTimeout(retryTimer);
      retryTimer = null;
      setTimeout(flush, 80);
    },
    async listEvents() {
      return apiRequest('/api/events', 'GET');
    },
    async createEvent(state) {
      const result = await apiRequest('/api/events', 'POST', {
        clientId,
        state: stateForSync(state),
      });
      if (result?.event?.id && result.revision != null) {
        revisions.set(result.event.id, result.revision);
      }
      return result;
    },
    async pullEvent(eventId) {
      return pull(eventId);
    },
    async archiveEvent(eventId) {
      return apiRequest(eventPath(eventId, '/archive'), 'POST', { clientId });
    },
    async start() {
      if (!validConfig()) {
        status('同步尚未啟用', 'error');
        return;
      }
      const local = activeState();
      const eventId = local?.meta?.eventId;
      trainerCount = local?.trainers?.length || 0;
      if (local && eventId) {
        try {
          const remote = await ensureRemoteEvent(local);
          if (remote?.state && hasUnsyncedData(local, remote.state)) {
            BPSync.queueMerge(local);
            await flush();
          }
        } catch (_) {
          BPSync.queueMerge(local);
          status('正在重新連線，本機資料已保存', 'error');
        }
      }
      clearInterval(pollTimer);
      pollTimer = setInterval(() => pull().catch(() => {}), CONFIG.pollMs);
    },
  };

  window.BPSync = BPSync;
  window.addEventListener('online', () => {
    retryDelay = 1500;
    if (queues.size) flush();
    else pull().catch(() => {});
  });
  window.addEventListener('bp-event-changed', () => {
    const state = activeState();
    const eventId = state?.meta?.eventId;
    trainerCount = state?.trainers?.length || 0;
    if (!eventId) return;
    revisions.delete(eventId);
    ensureRemoteEvent(state)
      .then(result => {
        if (result?.state && hasUnsyncedData(state, result.state)) {
          BPSync.queueMerge(state);
        }
      })
      .catch(() => {
        BPSync.queueMerge(state);
        status('正在重新連線，本機資料已保存', 'error');
      });
  });
  window.addEventListener('DOMContentLoaded', () => BPSync.start());
})();
