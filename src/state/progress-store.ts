import { appState } from './app-state';
import { canPersistLocalChange, isSyncBlocked } from '../reset/reset-guard';
import {
  STORAGE_VERSION,
  VALID_PROGRESS_STATUSES,
  migrateStorage,
  normalizeMetaRecord
} from './storage-migrations';
import type { ProgressRecord, ProgressStatus } from './types';

export const STORAGE_KEYS = {
  progress: 'aranha-progress-v1',
  log: 'aranha-log-v1',
  meta: 'aranha-progress-meta-v2',
  queue: 'aranha-sync-queue-v1',
  version: 'aranha-storage-version-v1'
} as const;


const allProgressListeners = new Set<() => void>();
const progressListenersById = new Map<number, Set<() => void>>();
let batchDepth = 0;
let pendingAll = false;
const pendingIds = new Set<number>();

const flushProgressNotifications = () => {
  if (pendingAll) {
    for (const bucket of progressListenersById.values()) for (const listener of bucket) listener();
  } else {
    for (const id of pendingIds) for (const listener of progressListenersById.get(id) || []) listener();
  }
  if (pendingAll || pendingIds.size) for (const listener of allProgressListeners) listener();
  pendingAll = false;
  pendingIds.clear();
};

const notifyProgress = (id?: number) => {
  if (id == null) pendingAll = true;
  else pendingIds.add(id);
  if (batchDepth === 0) flushProgressNotifications();
};

const readStoredJson = (key: string, fallback: unknown) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

export interface ProgressSnapshot {
  progress: Record<string, 'Sim' | 'Pulei'>;
  progressMeta: Record<string, ProgressRecord>;
  readingLog: Record<string, number>;
}

export interface ProgressSelectionSnapshot {
  entries: Record<string, {
    progress?: 'Sim' | 'Pulei';
    meta?: ProgressRecord;
    log?: number;
  }>;
}

export const progressStore = {
  load() {
    const migrated = migrateStorage({
      version: readStoredJson(STORAGE_KEYS.version, 0),
      progress: readStoredJson(STORAGE_KEYS.progress, {}),
      log: readStoredJson(STORAGE_KEYS.log, {}),
      meta: readStoredJson(STORAGE_KEYS.meta, {}),
      queue: readStoredJson(STORAGE_KEYS.queue, [])
    });
    appState.progress = migrated.progress;
    appState.readingLog = migrated.log;
    appState.progressMeta = migrated.meta;
    appState.syncQueue = migrated.queue;
    if (!isSyncBlocked()) this.save();
    notifyProgress();
  },

  subscribe(id: number, listener: () => void) {
    let bucket = progressListenersById.get(id);
    if (!bucket) {
      bucket = new Set();
      progressListenersById.set(id, bucket);
    }
    bucket.add(listener);
    return () => {
      bucket?.delete(listener);
      if (bucket && bucket.size === 0) progressListenersById.delete(id);
    };
  },

  subscribeMany(ids: readonly number[], listener: () => void) {
    const unsubscribers = [...new Set(ids)].map(id => this.subscribe(id, listener));
    return () => unsubscribers.forEach(unsubscribe => unsubscribe());
  },

  subscribeAll(listener: () => void) {
    allProgressListeners.add(listener);
    return () => allProgressListeners.delete(listener);
  },

  batch<T>(action: () => T): T {
    batchDepth += 1;
    try {
      return action();
    } finally {
      batchDepth -= 1;
      if (batchDepth === 0) flushProgressNotifications();
    }
  },

  notifyAll() {
    notifyProgress();
  },

  get(id: number): ProgressStatus {
    return appState.progress[String(id)] || 'Não';
  },

  record(id: number): ProgressRecord | null {
    const key = String(id);
    const meta = normalizeMetaRecord(appState.progressMeta[key]);
    if (meta) return meta;
    const status = appState.progress[key];
    return status === 'Sim' || status === 'Pulei' ? { status, updatedAt: 0 } : null;
  },

  set(
    id: number,
    status: ProgressStatus,
    options: { updatedAt?: number; updateLog?: boolean } = {}
  ) {
    const key = String(id);
    const candidate = Number(options.updatedAt);
    const updatedAt = Number.isFinite(candidate) && candidate >= 0 ? candidate : Date.now();
    if (!VALID_PROGRESS_STATUSES.has(status)) return;

    if (status === 'Não') delete appState.progress[key];
    else appState.progress[key] = status;

    appState.progressMeta[key] = { status, updatedAt };
    if (options.updateLog !== false) {
      if (status === 'Sim') appState.readingLog[key] = Date.now();
      else delete appState.readingLog[key];
    }
    notifyProgress(id);
  },

  setRecordTimestamp(id: number, updatedAt: number): ProgressRecord | null {
    const current = this.record(id);
    if (!current) return null;
    const next = { ...current, updatedAt };
    appState.progressMeta[String(id)] = next;
    return next;
  },

  snapshot(): ProgressSnapshot {
    return structuredClone({
      progress: appState.progress,
      progressMeta: appState.progressMeta,
      readingLog: appState.readingLog
    });
  },

  snapshotIds(ids: readonly number[]): ProgressSelectionSnapshot {
    const entries: ProgressSelectionSnapshot['entries'] = {};
    for (const id of new Set(ids)) {
      const key = String(id);
      const entry: ProgressSelectionSnapshot['entries'][string] = {};
      const progress = appState.progress[key];
      const meta = normalizeMetaRecord(appState.progressMeta[key]);
      const log = appState.readingLog[key];
      if (progress) entry.progress = progress;
      if (meta) entry.meta = structuredClone(meta);
      if (Number.isFinite(log)) entry.log = log;
      entries[key] = entry;
    }
    return { entries };
  },

  restoreIds(snapshot: ProgressSelectionSnapshot) {
    this.batch(() => {
      for (const [key, entry] of Object.entries(snapshot.entries || {})) {
        const id = Number(key);
        if (!Number.isInteger(id)) continue;
        if (entry.progress) appState.progress[key] = entry.progress;
        else delete appState.progress[key];
        if (entry.meta) appState.progressMeta[key] = structuredClone(entry.meta);
        else delete appState.progressMeta[key];
        if (Number.isFinite(entry.log)) appState.readingLog[key] = Number(entry.log);
        else delete appState.readingLog[key];
        notifyProgress(id);
      }
    });
  },

  restoreSnapshot(snapshot: Partial<ProgressSnapshot>) {
    appState.progress = structuredClone(snapshot.progress || {});
    appState.progressMeta = structuredClone(snapshot.progressMeta || {});
    appState.readingLog = structuredClone(snapshot.readingLog || {});
    notifyProgress();
  },

  replace(snapshot: Partial<ProgressSnapshot>) {
    this.restoreSnapshot(snapshot);
    this.save();
  },

  save() {
    if (!canPersistLocalChange()) return;
    try {
      localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(appState.progress));
      localStorage.setItem(STORAGE_KEYS.log, JSON.stringify(appState.readingLog));
      localStorage.setItem(STORAGE_KEYS.meta, JSON.stringify(appState.progressMeta));
      localStorage.setItem(STORAGE_KEYS.queue, JSON.stringify(appState.syncQueue));
      localStorage.setItem(STORAGE_KEYS.version, JSON.stringify(STORAGE_VERSION));
    } catch {
      // O site continua funcional mesmo quando storage está indisponível.
    }
  }
};

export const statusOf = (id: number) => progressStore.get(id);
export { VALID_PROGRESS_STATUSES, STORAGE_VERSION };
