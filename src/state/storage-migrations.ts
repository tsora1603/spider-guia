import type { ProgressRecord, ProgressStatus, SyncQueueEntry } from './types';

export const STORAGE_VERSION = 2;
export const VALID_PROGRESS_STATUSES = new Set<ProgressStatus>(['Não', 'Sim', 'Pulei']);

export interface StorageSnapshot {
  version: number;
  progress: Record<string, 'Sim' | 'Pulei'>;
  log: Record<string, number>;
  meta: Record<string, ProgressRecord>;
  queue: SyncQueueEntry[];
}

const objectRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

export const normalizeMetaRecord = (record: unknown): ProgressRecord | null => {
  if (!record || typeof record !== 'object') return null;
  const candidate = record as Partial<ProgressRecord>;
  if (!VALID_PROGRESS_STATUSES.has(candidate.status as ProgressStatus)) return null;
  const updatedAt = Number(candidate.updatedAt);
  return {
    status: candidate.status as ProgressStatus,
    updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0
  };
};

export const normalizeQueue = (value: unknown): SyncQueueEntry[] =>
  Array.isArray(value)
    ? value
        .map(entry => {
          const candidate = entry as Partial<SyncQueueEntry> | null;
          const id = Number(candidate?.id);
          const updatedAt = Number(candidate?.updatedAt);
          const attempts = Number(candidate?.attempts);
          const nextAt = Number(candidate?.nextAt);
          if (
            !candidate?.userId ||
            !Number.isInteger(id) ||
            !VALID_PROGRESS_STATUSES.has(candidate.status as ProgressStatus)
          ) {
            return null;
          }
          return {
            userId: String(candidate.userId),
            id,
            status: candidate.status as ProgressStatus,
            updatedAt: Number.isFinite(updatedAt) && updatedAt >= 0 ? updatedAt : 0,
            attempts: Number.isFinite(attempts) && attempts >= 0 ? attempts : 0,
            nextAt: Number.isFinite(nextAt) && nextAt >= 0 ? nextAt : 0
          } satisfies SyncQueueEntry;
        })
        .filter((entry): entry is SyncQueueEntry => Boolean(entry))
    : [];

export function migrateStorage(input: {
  version?: unknown;
  progress?: unknown;
  log?: unknown;
  meta?: unknown;
  queue?: unknown;
}): StorageSnapshot {
  const parsedVersion = Number(input.version);
  const version = Number.isInteger(parsedVersion) && parsedVersion >= 0 ? parsedVersion : 0;

  const rawProgress = objectRecord(input.progress);
  const progress = Object.fromEntries(
    Object.entries(rawProgress).filter(
      ([, status]) => status === 'Sim' || status === 'Pulei'
    )
  ) as Record<string, 'Sim' | 'Pulei'>;

  const rawLog = objectRecord(input.log);
  const log = Object.fromEntries(
    Object.entries(rawLog)
      .map(([id, value]) => [id, Number(value)] as const)
      .filter(([, value]) => Number.isFinite(value) && value >= 0)
  );

  const rawMeta = objectRecord(input.meta);
  const meta = Object.fromEntries(
    Object.entries(rawMeta)
      .map(([id, record]) => [id, normalizeMetaRecord(record)] as const)
      .filter((entry): entry is [string, ProgressRecord] => Boolean(entry[1]))
  );

  // v0 -> v1: o progresso histórico não tinha metadado por item.
  if (version < 1) {
    for (const [id, status] of Object.entries(progress)) {
      if (!meta[id]) meta[id] = { status, updatedAt: 0 };
    }
  }

  // v1 -> v2: normaliza a fila persistida sem alterar o status local.
  const queue = normalizeQueue(input.queue);

  // Mesmo em instalações marcadas como novas, repara metadado ausente de forma idempotente.
  for (const [id, status] of Object.entries(progress)) {
    if (!meta[id]) meta[id] = { status, updatedAt: 0 };
  }

  return { version: STORAGE_VERSION, progress, log, meta, queue };
}
