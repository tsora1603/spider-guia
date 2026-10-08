/** Barreira persistente por dispositivo, preservada no login/logout.
 * Um grant só vale nesta aba após decisão explícita ou em uma aba NOVA,
 * carregada depois da decisão (abas antigas precisam recarregar).
 */
export const REMOTE_RESET_INTENT_KEY = 'aranha-cloud-reset-intent-v1';
export function remoteResetIsPending(): boolean {
  try { return localStorage.getItem(REMOTE_RESET_INTENT_KEY) !== null; }
  catch { return true; } // fail closed
}

export const LOCAL_RESET_GUARD_KEY = 'aranha-local-reset-guard-v1';
export type ResetPhase = 'preparing' | 'completed';
export type CloudDecision = 'pending' | 'local-only' | 'restored';
type Guard = { version: number; phase: ResetPhase; decision: CloudDecision; userId?: string; grant?: string };
let memoryBlocked = false;
let resetEpoch = 0;
export const currentResetEpoch = () => resetEpoch;

function readGuard(): Guard | null {
  try {
    const raw = localStorage.getItem(LOCAL_RESET_GUARD_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') throw Error('Marcador inválido');
    const value = parsed as Partial<Guard>;
    if (value.phase !== 'completed') return { version: 2, phase: 'preparing', decision: 'pending' };
    if (value.decision === 'restored' && typeof value.grant === 'string' && value.grant && typeof value.userId === 'string' && value.userId) {
      return { version: 2, phase: 'completed', decision: 'restored', grant: value.grant, userId: value.userId };
    }
    return { version: 2, phase: 'completed', decision: value.decision === 'local-only' ? 'local-only' : 'pending' };
  } catch {
    // Corrompido ou storage inacessível: falha fechada, sem sincronização.
    return { version: 2, phase: 'preparing', decision: 'pending' };
  }
}

const bootGuard = readGuard();
let expectedGuardRaw: string | null;
try { expectedGuardRaw = localStorage.getItem(LOCAL_RESET_GUARD_KEY); }
catch { expectedGuardRaw = null; }
let authorizedGrant: string | null = bootGuard?.decision === 'restored' ? bootGuard.grant || null : null;
const bootGuardExists = bootGuard !== null;

function persistGuard(value: Guard) {
  const serialized = JSON.stringify(value);
  localStorage.setItem(LOCAL_RESET_GUARD_KEY, serialized);
  if (localStorage.getItem(LOCAL_RESET_GUARD_KEY) !== serialized) throw Error('Não foi possível confirmar a proteção persistente contra sincronização.');
  expectedGuardRaw = serialized;
}

export function resetPhase(): ResetPhase | null { return readGuard()?.phase ?? null; }
export function cloudDecision(): CloudDecision | null { return readGuard()?.decision ?? null; }
export function cloudSyncAllowedForUser(userId: string): boolean {
  const guard = readGuard();
  if (!guard) return !remoteResetIsPending() && !memoryBlocked;
  return !remoteResetIsPending() && !memoryBlocked && guard.decision === 'restored' && guard.userId === userId && guard.grant === authorizedGrant;
}
export function isSyncBlocked(): boolean {
  const guard = readGuard();
  if (!guard) return memoryBlocked || remoteResetIsPending();
  return remoteResetIsPending() || memoryBlocked || guard.phase !== 'completed' || guard.decision !== 'restored' || guard.grant !== authorizedGrant;
}
export function canPersistLocalChange(): boolean {
  if (remoteResetIsPending()) return false;
  // Abas com uma versão anterior do marcador nunca podem regravar progresso antigo.
  try { if (localStorage.getItem(LOCAL_RESET_GUARD_KEY) !== expectedGuardRaw) return false; }
  catch { return false; }
  const guard = readGuard();
  if (!guard) return !memoryBlocked;
  return guard.phase === 'completed' && (memoryBlocked || bootGuardExists || authorizedGrant !== null);
}
export function beginLocalReset(): void {
  persistGuard({ version: 2, phase: 'preparing', decision: 'pending' });
  memoryBlocked = true;
  authorizedGrant = null;
  resetEpoch += 1;
}
export function completeLocalReset(): void {
  persistGuard({ version: 2, phase: 'completed', decision: 'pending' });
}
export function continueWithoutSync(): void {
  const guard = readGuard();
  if (!guard || guard.phase !== 'completed' || guard.decision === 'restored') throw Error('Esta decisão não está disponível.');
  persistGuard({ version: 2, phase: 'completed', decision: 'local-only' });
  memoryBlocked = true;
  authorizedGrant = null;
  resetEpoch += 1;
}
/** Executada SOMENTE após download completo, validação e salvamento local confirmado. */
export function authorizeRestoredCloud(userId: string): void {
  const guard = readGuard();
  if (remoteResetIsPending() || !guard || guard.phase !== 'completed' || guard.decision === 'restored') throw Error('O reset não está aguardando esta decisão.');
  if (!userId) throw Error('Sessão de usuário inválida.');
  if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
    throw Error('Este navegador não oferece geração segura da autorização de reconexão. A sincronização permanece bloqueada.');
  }
  const grant = crypto.randomUUID();
  persistGuard({ version: 2, phase: 'completed', decision: 'restored', userId, grant });
  authorizedGrant = grant;
  memoryBlocked = false;
  resetEpoch += 1;
}
/** Uma aba antiga ou uma conta diferente nunca herda permissão de escrita. */
export function mayUseCloud(userId: string): boolean { return cloudSyncAllowedForUser(userId); }

/** Uma geração alterada no servidor invalida autorizações e filas antigas.
 * Não apaga progresso local; oferece decisão explícita na próxima revisão. */
export function blockForChangedCloudGeneration(): void {
  const guard = readGuard();
  if (guard?.phase === 'completed' && guard.decision === 'pending') return;
  persistGuard({ version: 2, phase: 'completed', decision: 'pending' });
  memoryBlocked = true;
  authorizedGrant = null;
  resetEpoch++;
}
