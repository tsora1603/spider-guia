import { appState } from '../state/app-state';
import { progressStore, STORAGE_KEYS, VALID_PROGRESS_STATUSES, type ProgressSnapshot } from '../state/progress-store';
import { cloudDecision, isSyncBlocked, authorizeRestoredCloud, continueWithoutSync, resetPhase, currentResetEpoch, LOCAL_RESET_GUARD_KEY } from './reset-guard';
import { itemsById } from '../data/model';
import { mergeRecords } from '../sync/sync-engine';
import { checkServerGeneration, saveKnownGeneration, getKnownGeneration } from '../sync/server-generation';
import type { ProgressStatus } from '../state/types';

const PAGE_SIZE = 500;
export type CloudPreview = { count: number; collisions: number; localCount: number; localFingerprint: string; remoteFingerprint: string; storageFingerprint: string; protocolGeneration?: number };
type RemoteItem = { id: number; status: ProgressStatus; updatedAt: number };

/** Apenas SELECT, paginado e filtrado pelo uid autenticado, mesmo com RLS. */
export async function readCloudRecords(client: any, userId: string): Promise<RemoteItem[]> {
  if (!navigator.onLine) throw Error('Sem conexão com a internet. A sincronização continua bloqueada.');
  if (!client || !userId || !isSyncBlocked() || resetPhase() !== 'completed') throw Error('Consulta protegida indisponível.');
  const rows: RemoteItem[] = [];
  const seen = new Set<number>();
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await client.from('progress')
      .select('ord,status,updated_at')
      .eq('user_id', userId)
      .order('ord', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1);
    if (response.error) throw Error(`Falha ao consultar a nuvem: ${response.error.message || 'erro desconhecido'}`);
    if (!Array.isArray(response.data)) throw Error('A nuvem retornou dados inválidos. Nada foi restaurado.');
    for (const row of response.data) {
      const id = Number(row?.ord);
      if (!Number.isInteger(id) || !itemsById[id]) continue; // IDs fora do catálogo não são importados.
      const time = typeof row?.updated_at === 'string' ? Date.parse(row.updated_at) : NaN;
      if (!VALID_PROGRESS_STATUSES.has(row?.status) || !Number.isFinite(time) || time < 0 || seen.has(id)) {
        throw Error('Há registros inválidos ou duplicados na nuvem. Nada foi restaurado.');
      }
      seen.add(id);
      rows.push({ id, status: row.status, updatedAt: time });
    }
    if (response.data.length < PAGE_SIZE) return rows;
    if (offset > 100000) throw Error('Quantidade de registros inesperada na nuvem.');
  }
}

function localStorageFingerprint(): string {
  return JSON.stringify([STORAGE_KEYS.progress, STORAGE_KEYS.meta, STORAGE_KEYS.log, STORAGE_KEYS.queue].map(key => localStorage.getItem(key)));
}

export function previewCloud(records: RemoteItem[]): CloudPreview {
  const existing = new Set([...Object.keys(appState.progressMeta), ...Object.keys(appState.progress)].map(Number));
  return { count: records.length, collisions: records.filter(r => existing.has(r.id)).length, localCount: existing.size,
    localFingerprint: JSON.stringify(progressStore.snapshot()), remoteFingerprint: JSON.stringify(records), storageFingerprint: localStorageFingerprint() };
}

export interface ReconnectDependencies {
  client: any;
  userId: string;
  invalidate(): void;
  waitForInFlight(): Promise<void>;
  afterRestored(): Promise<unknown>;
}

let restoring = false;
export async function restoreFromCloud(deps: ReconnectDependencies, expected: CloudPreview): Promise<void> {
  if (restoring) throw Error('Já existe uma restauração em andamento.');
  if (cloudDecision() === 'restored' || resetPhase() !== 'completed') throw Error('Esta decisão já foi concluída ou não está disponível.');
  restoring = true;
  try {
    deps.invalidate();
    await deps.waitForInFlight();
    const epoch = currentResetEpoch();
    const userId = deps.userId;
    const guardBefore = localStorage.getItem(LOCAL_RESET_GUARD_KEY);
    const protocolBefore = typeof deps.client.rpc === 'function'
      ? await checkServerGeneration(deps.client, userId, { allowExplicitJoin: true }) : { mode: 'legacy' as const };
    const data = await readCloudRecords(deps.client, userId);
    const protocolAfter = typeof deps.client.rpc === 'function'
      ? await checkServerGeneration(deps.client, userId, { allowExplicitJoin: true }) : { mode: 'legacy' as const };
    if (protocolBefore.mode !== protocolAfter.mode || (protocolBefore.mode === 'protected' &&
        (protocolAfter.mode !== 'protected' || protocolBefore.generation !== protocolAfter.generation))) {
      throw Error('A geração da nuvem mudou durante a consulta.');
    }
    if (epoch !== currentResetEpoch() || !isSyncBlocked() || guardBefore !== localStorage.getItem(LOCAL_RESET_GUARD_KEY) || appState.currentUser?.id !== userId) {
      throw Error('Sua sessão ou a proteção de sincronização mudou. Revise novamente antes de restaurar.');
    }
    const preview = previewCloud(data);
    if (protocolAfter.mode === 'protected' && protocolAfter.generation > 1 && expected.localCount > 0) {
      throw Error('Há dados locais que podem pertencer a uma geração excluída. Faça backup e resete este aparelho antes de restaurar uma nuvem reiniciada.');
    }
    if (!data.length) throw Error('Não há progresso na nuvem para restaurar. A sincronização permanece bloqueada.');
    if ((expected.protocolGeneration !== undefined &&
        (protocolAfter.mode !== 'protected' || protocolAfter.generation !== expected.protocolGeneration)) ||
        preview.localFingerprint !== expected.localFingerprint || preview.remoteFingerprint !== expected.remoteFingerprint || preview.storageFingerprint !== expected.storageFingerprint) {
      throw Error('O progresso local ou remoto mudou. Confira os dados novamente antes de confirmar.');
    }
    if (!navigator.onLine) throw Error('A conexão caiu. A sincronização permanece bloqueada.');
    // Operação síncrona (sem await entre cálculo, persistência e grant).
    // Mantém o registro com updatedAt mais recente; empate divergente favorece o local.
    const before = progressStore.snapshot();
    const previousQueue = structuredClone(appState.syncQueue);
    const merged: ProgressSnapshot = structuredClone(before);
    for (const row of data) {
      const local = progressStore.record(row.id);
      const result = mergeRecords(local, { status: row.status, updatedAt: row.updatedAt });
      if (result.winner === 'remote') {
        const key = String(row.id);
        if (row.status === 'Não') delete merged.progress[key];
        else merged.progress[key] = row.status;
        merged.progressMeta[key] = { status: row.status, updatedAt: row.updatedAt };
        if (row.status !== 'Sim') delete merged.readingLog[key];
        // Histórico original não existe no Supabase: não inventar timestamp de leitura.
      }
    }
    try {
      progressStore.restoreSnapshot(merged);
      appState.syncQueue = []; // Filas anteriores ao reset nunca podem voltar a ser enviadas.
      progressStore.save();
      const progress = JSON.parse(localStorage.getItem(STORAGE_KEYS.progress) || 'null');
      const meta = JSON.parse(localStorage.getItem(STORAGE_KEYS.meta) || 'null');
      const queue = JSON.parse(localStorage.getItem(STORAGE_KEYS.queue) || 'null');
      const history = JSON.parse(localStorage.getItem(STORAGE_KEYS.log) || 'null');
      if (JSON.stringify(progress) !== JSON.stringify(merged.progress) || JSON.stringify(meta) !== JSON.stringify(merged.progressMeta) || JSON.stringify(queue) !== '[]' || JSON.stringify(history) !== JSON.stringify(merged.readingLog)) {
        throw Error('Não foi possível verificar a gravação local.');
      }
      if (guardBefore !== localStorage.getItem(LOCAL_RESET_GUARD_KEY) || appState.currentUser?.id !== userId) {
        throw Error('Outra aba alterou a proteção ou a sessão.');
      }
      if (protocolAfter.mode === 'protected') saveKnownGeneration(userId, protocolAfter.generation);
      authorizeRestoredCloud(userId);
    } catch (cause) {
      progressStore.restoreSnapshot(before);
      appState.syncQueue = previousQueue;
      progressStore.save();
      throw cause;
    }
    progressStore.notifyAll();
    // A restauração já foi persistida. Problemas em um pull posterior não a desfazem.
    await deps.afterRestored();
  } finally {
    restoring = false;
  }
}

export function stayOnDevice(invalidate: () => void): void {
  invalidate();
  continueWithoutSync();
}

/** Novo começo após reset: somente com nuvem realmente vazia e RPC transacional. */
export async function authorizeEmptyCloud(deps: ReconnectDependencies, expected: CloudPreview): Promise<void> {
  if (cloudDecision() === 'restored' || resetPhase() !== 'completed' || !isSyncBlocked()) throw Error('A decisão não está pendente.');
  if (!navigator.onLine) throw Error('Sem conexão. A sincronização permanece bloqueada.');
  deps.invalidate();
  await deps.waitForInFlight();
  const userId = deps.userId;
  const before = localStorage.getItem(LOCAL_RESET_GUARD_KEY);
  const protocol = await checkServerGeneration(deps.client, userId, { allowExplicitJoin: true });
  if (protocol.mode !== 'protected') throw Error('O servidor precisa da migração de sincronização para iniciar uma nova nuvem.');
  if (protocol.generation > 1 && expected.localCount > 0) {
    throw Error('Há progresso local que pode ser anterior ao reset remoto. Faça backup e resete somente este dispositivo; inicie a sincronização com o aparelho vazio.');
  }
  const knownGeneration = getKnownGeneration(userId);
  if (knownGeneration !== null && knownGeneration !== protocol.generation) {
    throw Error('Este aparelho possui progresso de uma geração excluída. Faça backup e resete os dados locais antes de iniciar uma nova sincronização.');
  }
  if (protocol.count !== 0 || expected.count !== 0 ||
      (expected.protocolGeneration !== undefined && expected.protocolGeneration !== protocol.generation)) {
    throw Error('A nuvem ou sua versão mudou. Reavalie os registros antes de continuar.');
  }
  const response = await deps.client.rpc('spider_sync_confirm_empty', { p_generation: protocol.generation });
  if (response.error || Number(response.data?.generation) !== protocol.generation || Number(response.data?.count) !== 0) {
    throw Error('Não foi possível confirmar que a nuvem está vazia. Nada será sincronizado.');
  }
  if (before !== localStorage.getItem(LOCAL_RESET_GUARD_KEY) || appState.currentUser?.id !== userId ||
      JSON.stringify(progressStore.snapshot()) !== expected.localFingerprint ||
      localStorageFingerprint() !== expected.storageFingerprint) {
    throw Error('O estado local, a sessão ou a proteção mudou. Revise novamente.');
  }
  saveKnownGeneration(userId, protocol.generation);
  authorizeRestoredCloud(userId);
  await deps.afterRestored();
}
