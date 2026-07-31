/* Tournament event archive backed by IndexedDB.
   Keeps full photos and results without exhausting localStorage. */
(function () {
  const DB_NAME = 'bp_camp_events';
  const DB_VERSION = 1;
  const STORE = 'events';
  const ACTIVE_KEY = 'bp_active_event_id';

  function clone(value) {
    return value == null ? value : JSON.parse(JSON.stringify(value));
  }

  function localDate(date) {
    const value = date instanceof Date ? date : new Date(date || Date.now());
    const offset = value.getTimezoneOffset() * 60000;
    return new Date(value.getTime() - offset).toISOString().slice(0, 10);
  }

  function slug(value) {
    return String(value || '')
      .trim()
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9\u4e00-\u9fff-]/g, '')
      .slice(0, 36);
  }

  function eventId(date, venue) {
    return `${date || localDate()}-${slug(venue) || 'main'}`;
  }

  function openDb() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          const store = db.createObjectStore(STORE, { keyPath: 'id' });
          store.createIndex('eventDate', 'eventDate');
          store.createIndex('updatedAt', 'updatedAt');
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function transact(mode, run) {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const store = tx.objectStore(STORE);
      let result;
      try {
        result = run(store);
      } catch (error) {
        db.close();
        reject(error);
        return;
      }
      tx.oncomplete = () => {
        db.close();
        resolve(result);
      };
      tx.onerror = () => {
        db.close();
        reject(tx.error);
      };
    });
  }

  function requestResult(request) {
    return new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  function normalizeState(state, options) {
    const next = clone(state || {});
    next.meta ||= {};
    const date = options?.eventDate || next.meta.eventDate || localDate(next.meta.createdAt);
    const venue = options?.venue || next.meta.venue || '布拉克星球教室';
    const id = options?.eventId || next.meta.eventId || eventId(date, venue);
    next.meta.eventId = id;
    next.meta.eventDate = date;
    next.meta.venue = venue;
    next.meta.createdAt ||= new Date().toISOString();
    return next;
  }

  function recordFromState(state) {
    const next = normalizeState(state);
    return {
      id: next.meta.eventId,
      eventDate: next.meta.eventDate,
      venue: next.meta.venue,
      name: next.meta.name || '布拉克星球寶可夢卡牌大賽',
      status: next.meta.status || 'setup',
      archivedAt: next.meta.archivedAt || '',
      trainerCount: next.trainers?.length || 0,
      updatedAt: new Date().toISOString(),
      state: next,
    };
  }

  const BPEvents = {
    localDate,
    eventId,
    activeId() {
      return localStorage.getItem(ACTIVE_KEY) || '';
    },
    async start() {
      const current = Store.get('bp_tournament', null);
      if (!current) {
        if (window.BPSync?.listEvents) {
          try {
            const remoteEvents = await window.BPSync.listEvents();
            const latest = remoteEvents.find(event => !event.archivedAt) || remoteEvents[0];
            if (latest?.id) {
              await BPEvents.switchTo(latest.id);
              return BPEvents.list();
            }
          } catch (_) {
            // A brand-new offline device starts empty and can reconnect later.
          }
        }
        return [];
      }
      const normalized = normalizeState(current);
      localStorage.setItem(ACTIVE_KEY, normalized.meta.eventId);
      localStorage.setItem('bp_tournament', JSON.stringify(normalized));
      await BPEvents.save(normalized);
      const events = await BPEvents.list();
      const currentEvent = events.find(event => event.id === normalized.meta.eventId);
      const latestActive = events.find(event => !event.archivedAt);
      if (currentEvent?.archivedAt && latestActive?.id
        && latestActive.id !== normalized.meta.eventId) {
        await BPEvents.switchTo(latestActive.id);
      }
      return events;
    },
    async save(state) {
      if (!state) return null;
      const record = recordFromState(state);
      await transact('readwrite', store => store.put(record));
      return record;
    },
    async get(id) {
      if (!id) return null;
      const db = await openDb();
      try {
        return await requestResult(db.transaction(STORE, 'readonly').objectStore(STORE).get(id));
      } finally {
        db.close();
      }
    },
    async list() {
      const db = await openDb();
      let records = [];
      try {
        records = await requestResult(db.transaction(STORE, 'readonly').objectStore(STORE).getAll());
      } finally {
        db.close();
      }
      const summaries = records.map(record => ({
        id: record.id,
        eventDate: record.eventDate,
        venue: record.venue,
        name: record.name,
        status: record.status,
        archivedAt: record.archivedAt,
        trainerCount: record.trainerCount,
        updatedAt: record.updatedAt,
      }));
      if (window.BPSync?.listEvents) {
        try {
          const remote = await window.BPSync.listEvents();
          const merged = new Map(summaries.map(event => [event.id, event]));
          remote.forEach(event => merged.set(event.id, { ...merged.get(event.id), ...event }));
          return [...merged.values()]
            .sort((a, b) => String(b.eventDate || '').localeCompare(String(a.eventDate || ''))
              || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        } catch (_) {
          // Offline devices can continue from their local event archive.
        }
      }
      return summaries
        .sort((a, b) => String(b.eventDate || '').localeCompare(String(a.eventDate || ''))
          || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
    },
    async switchTo(id) {
      const current = Store.get('bp_tournament', null);
      if (current) await BPEvents.save(current);
      let record = await BPEvents.get(id);
      if (window.BPSync?.pullEvent) {
        try {
          const remote = await window.BPSync.pullEvent(id);
          if (remote?.state) {
            record = recordFromState(remote.state);
            await BPEvents.save(record.state);
          }
        } catch (_) {
          // The local archive remains available when the network is offline.
        }
      }
      if (!record?.state) throw new Error('找不到這場賽事的保存資料');
      localStorage.setItem(ACTIVE_KEY, id);
      localStorage.setItem('bp_tournament', JSON.stringify(record.state));
      window.dispatchEvent(new CustomEvent('bp-event-changed', { detail: { id } }));
      return clone(record.state);
    },
    async create(options) {
      const current = Store.get('bp_tournament', null);
      if (current) await BPEvents.save(current);
      const date = options.eventDate || localDate();
      const venue = options.venue?.trim() || '布拉克星球教室';
      const id = eventId(date, venue);
      const existing = await BPEvents.get(id);
      let remoteExisting = false;
      if (window.BPSync?.listEvents) {
        try {
          const remoteEvents = await window.BPSync.listEvents();
          remoteExisting = remoteEvents.some(event => event.id === id);
        } catch (_) {
          // Offline creation remains available; the server still rejects duplicate IDs.
        }
      }
      if (existing || remoteExisting) {
        throw new Error('這個日期與場地已經有賽事，請直接切換');
      }
      const state = normalizeState({
        meta: {
          name: options.name?.trim() || '布拉克星球寶可夢卡牌大賽',
          status: 'setup',
          qualRound: 0,
          qualTotalRounds: 3,
          createdAt: new Date().toISOString(),
        },
        trainers: [],
        qual: { rounds: [] },
        ko: { seeds: [], quarter: [], semi: [], final: null, third: null },
      }, { eventId: id, eventDate: date, venue });
      await BPEvents.save(state);
      localStorage.setItem(ACTIVE_KEY, id);
      localStorage.setItem('bp_tournament', JSON.stringify(state));
      if (window.BPSync?.createEvent) await window.BPSync.createEvent(state);
      window.dispatchEvent(new CustomEvent('bp-event-changed', { detail: { id } }));
      return state;
    },
    async archiveCurrent() {
      const current = Store.get('bp_tournament', null);
      if (!current) throw new Error('目前沒有可封存的賽事');
      const state = normalizeState(current);
      state.meta.archivedAt = state.meta.archivedAt || new Date().toISOString();
      localStorage.setItem('bp_tournament', JSON.stringify(state));
      await BPEvents.save(state);
      if (window.BPSync?.archiveEvent) await window.BPSync.archiveEvent(state.meta.eventId);
      return state;
    },
  };

  window.BPEvents = BPEvents;
})();
