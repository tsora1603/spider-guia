import { progressPages } from './progress-pages';
import { appState } from '../state/app-state';
import { isSyncBlocked, mayUseCloud, blockForChangedCloudGeneration } from '../reset/reset-guard';
import { checkServerGeneration, isStaleGenerationError, type ServerProtocol } from './server-generation';
import { progressStore, VALID_PROGRESS_STATUSES } from '../state/progress-store';
import type { ProgressRecord, SyncState } from '../state/types';

const RETRY_BASE_MS = 5000;
const RETRY_MAX_MS = 60000;

export interface SyncEngineOptions {
  client: any;
  onStateChange(state: SyncState): void;
  onLocalChanged(): void;
  onToast(message: string): void;
}

export interface SyncRecord extends ProgressRecord {
  id: number;
}

export function mergeRecords(local: ProgressRecord | null, remote: ProgressRecord | null) {
  if (local && remote) {
    if (local.updatedAt > remote.updatedAt || (local.updatedAt === remote.updatedAt && local.status !== remote.status)) {
      return { winner: 'local' as const, record: local };
    }
    if (remote.updatedAt > local.updatedAt) return { winner: 'remote' as const, record: remote };
    return { winner: 'equal' as const, record: local };
  }
  if (local) return { winner: 'local' as const, record: local };
  if (remote) return { winner: 'remote' as const, record: remote };
  return { winner: 'none' as const, record: null };
}

export function createSyncEngine(options: SyncEngineOptions) {
  let client = options.client;
  let pushSequence: Promise<any> = Promise.resolve();
  let retryTimer: number | null = null;
  let pullNeedsRetry = false;
  let pullInFlight: Promise<any> | null = null;
  let generation = 0;
  const inFlightWrites = new Set<Promise<unknown>>();
  const permitted = () => !isSyncBlocked() && (!appState.currentUser || mayUseCloud(appState.currentUser.id));
  const allowed = (epoch: number) => epoch === generation && permitted();
  const trackWrite = <T>(operation: Promise<T>): Promise<T> => {
    inFlightWrites.add(operation);
    void operation.then(() => inFlightWrites.delete(operation), () => inFlightWrites.delete(operation));
    return operation;
  };

  const setSyncState = (state: SyncState) => {
    appState.syncState = !permitted() ? 'blocked' : navigator.onLine ? state : 'offline';
    options.onStateChange(appState.syncState);
  };

  const queueKey = (userId: string, id: number) => `${userId}:${id}`;
  const queuedForCurrentUser = () => {
    const userId = appState.currentUser?.id;
    return userId ? appState.syncQueue.filter(entry => entry.userId === userId) : [];
  };

  const removeQueuedRecords = (userId: string, ids: number[]) => {
    const wanted = new Set(ids.map(Number));
    appState.syncQueue = appState.syncQueue.filter(
      entry => entry.userId !== userId || !wanted.has(Number(entry.id))
    );
  };

  const scheduleRetry = () => {
    if (retryTimer != null) window.clearTimeout(retryTimer);
    retryTimer = null;
    if (!permitted() || !navigator.onLine || !appState.currentUser) return;
    const queue = queuedForCurrentUser();
    const nextQueueAt = queue.length
      ? Math.min(...queue.map(entry => entry.nextAt || Date.now()))
      : Infinity;
    const nextPullAt = pullNeedsRetry ? Date.now() + RETRY_BASE_MS : Infinity;
    const nextAt = Math.min(nextQueueAt, nextPullAt);
    if (!Number.isFinite(nextAt)) return;
    retryTimer = window.setTimeout(() => {
      if (pullNeedsRetry) void pull();
      else void flushSyncQueue();
    }, Math.max(250, nextAt - Date.now()));
  };

  const enqueueRecords = (userId: string, records: SyncRecord[]) => {
    if (!permitted()) return;
    const byKey = new Map(
      appState.syncQueue.map(entry => [queueKey(entry.userId, entry.id), entry])
    );
    for (const record of records) {
      const key = queueKey(userId, record.id);
      const previous = byKey.get(key);
      const attempts = (previous?.attempts || 0) + 1;
      byKey.set(key, {
        userId,
        id: Number(record.id),
        status: record.status,
        updatedAt: Number(record.updatedAt) || Date.now(),
        attempts,
        nextAt:
          Date.now() +
          Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** Math.min(attempts - 1, 4))
      });
    }
    appState.syncQueue = [...byKey.values()];
    progressStore.save();
    scheduleRetry();
  };

  const currentRecords = (ids: number[]): SyncRecord[] => {
    const now = Date.now();
    return ids
      .map(Number)
      .filter(Number.isInteger)
      .map((id, index) => {
        let record = progressStore.record(id);
        if (!record) return null;
        if (!record.updatedAt) record = progressStore.setRecordTimestamp(id, now + index);
        return record ? { id, ...record } : null;
      })
      .filter((record): record is SyncRecord => Boolean(record));
  };

  const performPushRecords = async (
    user: { id: string },
    records: SyncRecord[],
    { showError = false }: { showError?: boolean } = {}
  ) => {
    const epoch = generation;
    if (!allowed(epoch)) return { ok: false, blocked: true };
    if (!client || !user || !records.length) return { ok: true };
    if (appState.currentUser?.id !== user.id) {
      enqueueRecords(user.id, records);
      return { ok: false, paused: true };
    }
    if (!navigator.onLine) {
      enqueueRecords(user.id, records);
      setSyncState('offline');
      return { ok: false, offline: true };
    }
    setSyncState('syncing');
    try {
      const protocol: ServerProtocol = await checkServerGeneration(client, user.id);
      if (!allowed(epoch) || appState.currentUser?.id !== user.id) return { ok: false, blocked: true };
      const payload = records.map(record => ({
        user_id: user.id,
        ord: Number(record.id),
        status: record.status,
        updated_at: new Date(record.updatedAt).toISOString()
      }));
      const response: any = await trackWrite(Promise.resolve(client.rpc('spider_sync_push', {
            p_generation: protocol.generation,
            p_records: payload.map(({ ord, status, updated_at }) => ({ ord, status, updated_at }))
          })));
      if (!allowed(epoch)) return { ok: false, blocked: true };
      if (response.error) throw response.error;
      removeQueuedRecords(user.id, records.map(record => record.id));
      progressStore.save();
      if (appState.currentUser?.id === user.id) {
        setSyncState(queuedForCurrentUser().length ? 'error' : 'saved');
      }
      return { ok: true };
    } catch (error) {
      if (!allowed(epoch)) return { ok: false, blocked: true };
      if (isStaleGenerationError(error)) {
        blockForChangedCloudGeneration();
        invalidate();
        options.onToast('A nuvem foi reiniciada em outro dispositivo. A sincronização foi bloqueada para proteger suas leituras.');
        return { ok: false, blocked: true };
      }
      enqueueRecords(user.id, records);
      if (appState.currentUser?.id === user.id) {
        setSyncState('error');
        if (showError) options.onToast('Não foi possível sincronizar agora. O progresso continua salvo neste aparelho.');
      }
      return { ok: false, error };
    }
  };

  const pushRecords = (records: SyncRecord[], pushOptions: { showError?: boolean } = {}) => {
    const user = appState.currentUser;
    if (!permitted()) return Promise.resolve({ ok: false, blocked: true });
    if (!client || !user || !records.length) return Promise.resolve({ ok: true });
    const task = () => performPushRecords(user, records, pushOptions);
    pushSequence = pushSequence.then(task, task);
    return pushSequence;
  };

  const syncLocalRecords = (ids: number[], pushOptions: { showError?: boolean } = {}) =>
    !permitted() ? Promise.resolve({ ok: false, blocked: true }) : pushRecords(currentRecords(ids), pushOptions);

  const flushSyncQueue = async () => {
    if (!permitted()) return;
    const user = appState.currentUser;
    if (!client || !user) return;
    if (!navigator.onLine) {
      setSyncState('offline');
      return;
    }
    const now = Date.now();
    const due = [];
    const staleKeys = new Set<string>();
    for (const entry of queuedForCurrentUser()) {
      const current = progressStore.record(entry.id);
      if (!current || current.status !== entry.status || current.updatedAt !== entry.updatedAt) {
        staleKeys.add(queueKey(entry.userId, entry.id));
        continue;
      }
      if ((entry.nextAt || 0) <= now) due.push(entry);
    }
    if (staleKeys.size) {
      appState.syncQueue = appState.syncQueue.filter(
        entry => !staleKeys.has(queueKey(entry.userId, entry.id))
      );
      progressStore.save();
    }
    if (!due.length) {
      setSyncState(queuedForCurrentUser().length ? 'error' : 'saved');
      scheduleRetry();
      return;
    }
    await pushRecords(
      due.map(entry => ({ id: entry.id, status: entry.status, updatedAt: entry.updatedAt }))
    );
    scheduleRetry();
  };

  const pull = async () => {
    if (!permitted()) return { ok: false, blocked: true };
    const epoch = generation;
    if (!client || !appState.currentUser) {
      setSyncState('saved');
      return;
    }
    if (!navigator.onLine) {
      setSyncState('offline');
      scheduleRetry();
      return;
    }
    if (pullInFlight) return pullInFlight;
    const userId = appState.currentUser.id;
    pullInFlight = (async () => {
      setSyncState('syncing');
      let data: any[];
      try {
        const protocol: ServerProtocol = await checkServerGeneration(client, userId);
        if (!allowed(epoch) || appState.currentUser?.id !== userId) return { ok: false, blocked: true };
        const pages: any[] = [];
        for await (const page of progressPages(client, userId)) {
          if (!allowed(epoch)) return { ok: false, blocked: true };
          pages.push(...page);
        }
        const finalProtocol = await checkServerGeneration(client, userId);
        if (finalProtocol.generation !== protocol.generation)
          throw Error('A geração remota mudou durante o download.');
        data = pages;
      } catch (error) {
        if (!allowed(epoch)) return { ok: false, blocked: true };
        if (isSyncBlocked()) { invalidate(); return { ok: false, blocked: true }; }
        pullNeedsRetry = true;
        setSyncState('error');
        scheduleRetry();
        return { ok: false, error };
      }
      if (!allowed(epoch) || appState.currentUser?.id !== userId) return { ok: false };
      pullNeedsRetry = false;
      const remote = new Map<number, ProgressRecord>();
      for (const row of data) {
        const id = Number(row.ord);
        const status = row.status;
        const updatedAt = Date.parse(row.updated_at || '') || 0;
        if (Number.isInteger(id) && VALID_PROGRESS_STATUSES.has(status)) {
          remote.set(id, { status, updatedAt });
        }
      }
      const localIds = new Set([
        ...Object.keys(appState.progress).map(Number),
        ...Object.keys(appState.progressMeta).map(Number)
      ]);
      const ids = new Set([...localIds, ...remote.keys()]);
      const outboundIds: number[] = [];
      let localChanged = false;
      let migratedTimestamp = Date.now();
      for (const id of ids) {
        if (!Number.isInteger(id)) continue;
        let local = progressStore.record(id);
        const server = remote.get(id) || null;
        const result = mergeRecords(local, server);
        if (result.winner === 'local' && local) {
          if (!server && !local.updatedAt) {
            local = progressStore.setRecordTimestamp(id, migratedTimestamp++);
            localChanged = true;
          }
          if (local) outboundIds.push(id);
        } else if (result.winner === 'remote' && server) {
          progressStore.set(id, server.status, {
            updatedAt: server.updatedAt,
            updateLog: false
          });
          localChanged = true;
        }
      }
      if (localChanged) progressStore.save();
      if (outboundIds.length) await syncLocalRecords(outboundIds);
      if (!allowed(epoch)) return { ok: false, blocked: true };
      await flushSyncQueue();
      if (!allowed(epoch)) return { ok: false, blocked: true };
      if (localChanged) options.onLocalChanged();
      setSyncState(queuedForCurrentUser().length ? 'error' : 'saved');
      scheduleRetry();
      return { ok: true };
    })().finally(() => {
      pullInFlight = null;
    });
    return pullInFlight;
  };

  const pause = () => {
    if (retryTimer != null) window.clearTimeout(retryTimer);
    retryTimer = null;
    pullNeedsRetry = false;
  };

  const invalidate = () => {
    generation++;
    pause();
    setSyncState('blocked');
  };

  const waitForInFlight = async (timeoutMs = 8000) => {
    const start = Date.now();
    while (inFlightWrites.size) {
      const remaining = timeoutMs - (Date.now() - start);
      if (remaining <= 0) throw new Error('Uma sincronização anterior ainda está em andamento. Tente novamente quando ela terminar.');
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          Promise.allSettled([...inFlightWrites]),
          new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Não foi possível confirmar a interrupção das operações pendentes.')), remaining); })
        ]);
      } finally {
        if (timer !== undefined) clearTimeout(timer);
      }
    }
  };

  const setClient = (nextClient: any) => {
    client = nextClient;
  };

  return {
    pull,
    syncLocalRecords,
    flushSyncQueue,
    invalidate,
    waitForInFlight,
    setSyncState,
    setClient,
    pause,
    queuedForCurrentUser
  };
}
