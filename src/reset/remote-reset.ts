import { appState } from '../state/app-state';
import { checkServerGeneration } from '../sync/server-generation';
import type { createSyncEngine } from '../sync/sync-engine';
import { resetThisDevice } from './local-reset';
import { REMOTE_RESET_INTENT_KEY, remoteResetIsPending } from './reset-guard';

/** Deployment flag is deliberately off until SQL/RLS/integration are verified on Supabase. */
export const remoteResetVerified = () => window.SPIDER_REMOTE_RESET_VERIFIED === true;
type Intent = { version: 1; userId: string; requestId: string; generation: number; phase: 'pending' | 'confirmed' };
type SyncControl = Pick<ReturnType<typeof createSyncEngine>, 'invalidate' | 'waitForInFlight'>;
export type RemoteResetDependencies = {
  client: any;
  sync: SyncControl;
  disconnect: () => Promise<void>;
};

export function cloudResetIntent(): Intent | null {
  const raw = localStorage.getItem(REMOTE_RESET_INTENT_KEY);
  if (!raw) return null;
  const value: unknown = JSON.parse(raw);
  const intent = value as Partial<Intent>;
  if (!intent || intent.version !== 1 || typeof intent.userId !== 'string' ||
    typeof intent.requestId !== 'string' || !Number.isSafeInteger(intent.generation) ||
    (intent.generation as number) < 1 || (intent.phase !== 'pending' && intent.phase !== 'confirmed')) {
    throw Error('Registro de reset remoto inválido. A sincronização continuará bloqueada.');
  }
  return intent as Intent;
}


function storeIntent(intent: Intent): void {
  const raw = JSON.stringify(intent);
  localStorage.setItem(REMOTE_RESET_INTENT_KEY, raw);
  if (localStorage.getItem(REMOTE_RESET_INTENT_KEY) !== raw) throw Error('Falha ao persistir a proteção do reset remoto.');
}

async function confirmAuthenticatedUser(client: any, userId: string): Promise<void> {
  const { data, error } = await client.auth.getUser();
  if (error || data?.user?.id !== userId || appState.currentUser?.id !== userId) {
    throw Error('Não foi possível confirmar a identidade autenticada. Nenhum dado foi excluído.');
  }
}

/** Lock de origem: uma única aba pode escolher/criar o recibo a cada vez.
 * Sem Web Locks, a exclusão remota não é oferecida: localStorage não é CAS. */
async function withRemoteLock<T>(action: () => Promise<T>): Promise<T> {
  if (!navigator.locks?.request) throw Error('Este navegador não oferece o bloqueio seguro entre abas necessário para o reset remoto.');
  return navigator.locks.request('spider-guia-reset-remoto', { mode: 'exclusive', ifAvailable: true }, async lock => {
    if (!lock) throw Error('Outra aba já está executando um reset. Feche as outras abas e tente novamente.');
    return action();
  });
}

/** Não chamar sem confirmação adicional APAGAR na interface. */
export async function resetDeviceAndCloud(deps: RemoteResetDependencies, confirmation: string): Promise<void> {
  return withRemoteLock(() => startRemoteReset(deps, confirmation));
}

async function startRemoteReset(deps: RemoteResetDependencies, confirmation: string): Promise<void> {
  if (confirmation !== 'APAGAR') throw Error('Digite APAGAR para confirmar a exclusão na nuvem.');
  if (!remoteResetVerified()) throw Error('Reset remoto indisponível: instalação Supabase ainda não validada.');
  if (!navigator.onLine) throw Error('É necessário estar online para apagar o progresso na nuvem.');
  const userId = appState.currentUser?.id;
  if (!userId || !deps.client) throw Error('Entre na conta antes do reset remoto.');
  if (remoteResetIsPending()) return resumeCloudResetUnlocked(deps);
  await confirmAuthenticatedUser(deps.client, userId);
  const protocol = await checkServerGeneration(deps.client, userId, { allowExplicitJoin: true });
  if (protocol.mode !== 'protected') throw Error('O servidor ainda não possui o protocolo de reset transacional. Nenhum dado foi excluído.');
  deps.sync.invalidate();
  await deps.sync.waitForInFlight();
  const intent: Intent = { version: 1, userId, generation: protocol.generation, requestId: crypto.randomUUID(), phase: 'pending' };
  // Antes da requisição: se conexão/navegador cair, reenvia MESMO request_id.
  storeIntent(intent);
  await resumeCloudResetUnlocked(deps);
}

/** Recuperação idempotente: conserva intent em caso de confirmação incerta. */
export async function resumeCloudReset(deps: RemoteResetDependencies): Promise<void> {
  return withRemoteLock(() => resumeCloudResetUnlocked(deps));
}

async function resumeCloudResetUnlocked(deps: RemoteResetDependencies): Promise<void> {
  const intent = cloudResetIntent();
  if (!intent) throw Error('Não existe reset remoto pendente.');
  deps.sync.invalidate();
  await deps.sync.waitForInFlight();
  if (intent.phase === 'pending') {
    if (!remoteResetVerified() || !navigator.onLine) throw Error('Reset remoto pendente de confirmação no servidor. Reconecte-se para verificar; nenhum dado local foi apagado.');
    await confirmAuthenticatedUser(deps.client, intent.userId);
    let response: any;
    try {
      response = await deps.client.rpc('spider_sync_reset', { p_generation: intent.generation, p_request_id: intent.requestId });
    } catch {
      throw Error('Não foi possível confirmar o resultado remoto. A operação pode ter sido aplicada. Tente verificar novamente; nenhum dado local foi apagado.');
    }
    if (response.error) throw Error(`O reset remoto não foi confirmado: ${response.error.message}. Nenhum dado local foi apagado. Mantenha esta requisição para recuperação.`);
    if (Number(response.data?.protocol) !== 4 || Number(response.data?.generation) !== intent.generation + 1) {
      throw Error('Resposta inesperada do servidor. Os dados locais permanecem intactos e a sincronização bloqueada.');
    }
    // A confirmação foi recebida e a transação completou; nunca reexecutar com novo id.
    storeIntent({ ...intent, phase: 'confirmed' });
  }
  // Mesmo que haja nova escrita legítima após o reset, jamais reexcluir registros.
  // O comprovante do reset basta; não repetir DELETE ao retomar a limpeza local.
  try {
    await resetThisDevice({ sync: deps.sync, disconnect: deps.disconnect });
    localStorage.removeItem(REMOTE_RESET_INTENT_KEY);
    if (localStorage.getItem(REMOTE_RESET_INTENT_KEY) !== null) throw Error('Falha ao remover o aviso de operação parcial.');
  } catch (error) {
    throw Error(`O reset remoto FOI CONFIRMADO, mas a limpeza deste dispositivo falhou. Não sincronize. Conclua a limpeza local novamente. Detalhe: ${error instanceof Error ? error.message : String(error)}`);
  }
}
