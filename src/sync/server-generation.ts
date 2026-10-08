import { blockForChangedCloudGeneration } from '../reset/reset-guard';

/** Protocol 4 is optional until the SQL migration is applied. It never enables remote deletion. */
export const SERVER_GENERATIONS_KEY = 'aranha-server-generations-v1';
let expectedRaw: string | null;
try { expectedRaw = localStorage.getItem(SERVER_GENERATIONS_KEY); }
catch { expectedRaw = null; }
function assertSameTabVersion() {
  if (localStorage.getItem(SERVER_GENERATIONS_KEY) !== expectedRaw) {
    blockForChangedCloudGeneration();
    throw Error('Outra aba alterou a versão de sincronização. Recarregue a página para revisar a nuvem.');
  }
}
export type ServerProtocol = { mode: 'legacy' } | { mode: 'protected'; generation: number; count: number };

function readKnown(userId: string): number | null {
  const raw = localStorage.getItem(SERVER_GENERATIONS_KEY);
  if (raw === null) return null;
  const parsed: unknown = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Versões locais de sincronização inválidas. A sincronização foi suspensa.');
  const value = (parsed as Record<string, unknown>)[userId];
  if (value === undefined) return null;
  if (!Number.isSafeInteger(value) || (value as number) < 1) throw Error('Versão de sincronização inválida.');
  return value as number;
}

export function getKnownGeneration(userId: string): number | null { return readKnown(userId); }
/** Reinicia somente a expectativa desta aba, após a limpeza seletiva confirmada. */
export function refreshGenerationAfterLocalReset(): void { expectedRaw = localStorage.getItem(SERVER_GENERATIONS_KEY); }

export function saveKnownGeneration(userId: string, generation: number): void {
  if (!userId || !Number.isSafeInteger(generation) || generation < 1) throw Error('Versão inválida.');
  const raw = localStorage.getItem(SERVER_GENERATIONS_KEY);
  const parsed: unknown = raw ? JSON.parse(raw) : {};
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw Error('Armazenamento de versões inválido.');
  const next = { ...parsed, [userId]: generation };
  const serialized = JSON.stringify(next);
  localStorage.setItem(SERVER_GENERATIONS_KEY, serialized);
  if (localStorage.getItem(SERVER_GENERATIONS_KEY) !== serialized) throw Error('Não foi possível persistir a versão da sincronização.');
  expectedRaw = serialized;
}

function isMissingProtocol(error: any): boolean {
  // Only PostgREST's unambiguous function-not-found code allows legacy fallback.
  return error?.code === 'PGRST202' && /spider_sync_state/.test(String(error?.message || ''));
}

export async function checkServerGeneration(client: any, userId: string, options: { allowExplicitJoin?: boolean } = {}): Promise<ServerProtocol> {
  if (!userId || !client) throw Error('Não há sessão para consultar a geração do servidor.');
  assertSameTabVersion();
  if (!navigator.onLine) throw Error('Sem conexão: a verificação da sincronização não pôde ser concluída.');
  // Mocks antigos e SDKs sem RPC conservam comportamento pré-migração, sem reset remoto.
  if (typeof client.rpc !== 'function') return { mode: 'legacy' };
  const response = await client.rpc('spider_sync_state');
  if (response?.error) {
    if (isMissingProtocol(response.error)) return { mode: 'legacy' };
    throw Error(`Não foi possível validar a proteção do servidor: ${response.error.message || 'falha desconhecida'}`);
  }
  const info = response?.data;
  if (!info || Number(info.protocol) !== 4 || !Number.isSafeInteger(info.generation) || info.generation < 1 || !Number.isSafeInteger(info.count) || info.count < 0) {
    throw Error('Resposta de protocolo incompatível: sincronização suspensa.');
  }
  const generation = Number(info.generation);
  let known: number | null;
  try { known = readKnown(userId); }
  catch (error) { blockForChangedCloudGeneration(); throw error; }
  if (!options.allowExplicitJoin && ((known !== null && known !== generation) || (known === null && generation > 1))) {
    blockForChangedCloudGeneration();
    throw Error('O progresso da nuvem foi reiniciado em outro dispositivo. Revise a nuvem antes de sincronizar.');
  }
  if (known === null && generation === 1) saveKnownGeneration(userId, generation);
  return { mode: 'protected', generation, count: Number(info.count) };
}

export function isStaleGenerationError(error: any): boolean {
  return /SPIDER_STALE_GENERATION|SPIDER_RESET_RECEIPT_OUTDATED/.test(String(error?.message || ''));
}
