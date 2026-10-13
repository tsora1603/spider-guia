import type { ProgressStatus } from '../state/types';

export const PROGRESS_EXPORT_FORMAT = 'spider-guia-progress';
export const PROGRESS_EXPORT_VERSION = 1;
const VALID = new Set(['Não', 'Sim', 'Pulei']);

export interface BackupEntry {
  id: number;
  status: ProgressStatus;
  updatedAt: number;
}

/** Aceita o catálogo histórico completo ou o registro completo com os novos volumes. Nunca aceita subconjuntos arbitrários. */
export function validateProgressBackup(
  payload: any,
  historicalIds: readonly number[],
  registeredIds: readonly number[]
) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload))
    throw new Error('O arquivo não contém um objeto JSON válido.');
  if (payload.format !== PROGRESS_EXPORT_FORMAT)
    throw new Error('Este arquivo não é um backup do SPIDER·GUIA.');
  if (payload.version !== PROGRESS_EXPORT_VERSION)
    throw new Error(`Versão de backup incompatível. Esperada: ${PROGRESS_EXPORT_VERSION}.`);
  if (!Array.isArray(payload.items))
    throw new Error('O backup deve conter a lista completa de itens.');
  const supported = new Set(registeredIds);
  const seen = new Set<number>();
  const items: BackupEntry[] = payload.items.map((entry: any) => {
    const id = Number(entry?.id);
    if (!Number.isInteger(id) || !supported.has(id))
      throw new Error(`ID de leitura inválido no backup: ${entry?.id}.`);
    if (seen.has(id)) throw new Error(`ID duplicado no backup: ${id}.`);
    seen.add(id);
    if (!VALID.has(entry?.status)) throw new Error(`Status inválido no ID ${id}.`);
    let updatedAt = 0;
    if (entry.updatedAt != null && entry.updatedAt !== '') {
      updatedAt =
        typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.parse(entry.updatedAt);
      if (!Number.isFinite(updatedAt) || updatedAt < 0)
        throw new Error(`updatedAt inválido no ID ${id}.`);
    }
    return { id, status: entry.status, updatedAt };
  });
  const full = (ids: readonly number[]) =>
    seen.size === ids.length && ids.every((id) => seen.has(id));
  const legacy = full(historicalIds);
  if (!legacy && !full(registeredIds))
    throw new Error('O backup não contém um catálogo completo reconhecido.');
  const readingLog: Record<string, number> = {};
  if (payload.readingLog != null) {
    if (typeof payload.readingLog !== 'object' || Array.isArray(payload.readingLog))
      throw new Error('O histórico local do backup é inválido.');
    for (const [key, value] of Object.entries(payload.readingLog)) {
      const id = Number(key),
        timestamp = Number(value);
      if (!Number.isInteger(id) || !seen.has(id) || !Number.isFinite(timestamp) || timestamp < 0)
        throw new Error('O histórico local do backup contém dados inválidos.');
      readingLog[String(id)] = timestamp;
    }
  }
  return { items, readingLog, legacy };
}

/** Um backup antigo não apaga marcações próprias dos volumes, que ele ainda não conhecia. */
export function retainMissingVolumeProgress(
  backup: ReturnType<typeof validateProgressBackup>,
  volumeIds: readonly number[],
  record: (id: number) => { status: ProgressStatus; updatedAt: number } | null,
  currentLog: Record<string, number>
) {
  if (!backup.legacy) return backup;
  const items = [...backup.items];
  const readingLog = { ...backup.readingLog };
  const present = new Set(items.map((item) => item.id));
  for (const id of volumeIds) {
    if (present.has(id)) continue;
    const previous = record(id);
    items.push({ id, status: previous?.status || 'Não', updatedAt: previous?.updatedAt || 0 });
    if (Number.isFinite(currentLog[String(id)])) readingLog[String(id)] = currentLog[String(id)];
  }
  return { ...backup, items, readingLog };
}
