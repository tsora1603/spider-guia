import { appState } from '../state/app-state';
import { sync } from '../runtime/sync-service';
import {
  ensureSupabaseClient,
  supabaseClient,
  disconnectForDeviceReset
} from '../auth/auth-session';
import { isSyncBlocked, resetPhase, remoteResetIsPending } from './reset-guard';
import {
  readCloudRecords,
  previewCloud,
  restoreFromCloud,
  stayOnDevice,
  authorizeEmptyCloud,
  type CloudPreview
} from './cloud-reconnect';
import { resetThisDevice } from './local-reset';
import {
  cloudResetIntent,
  remoteResetVerified,
  resetDeviceAndCloud,
  resumeCloudReset
} from './remote-reset';
import { checkServerGeneration } from '../sync/server-generation';
import { uiStore } from '../ui/ui-store';
/** Reset somente local. Não faz DELETE ou UPDATE em public.progress. */
export async function resetLocalDevice(): Promise<void> {
  if (remoteResetIsPending())
    throw Error(
      'Existe um reset remoto pendente. Conclua a recuperação antes de apagar o dispositivo.'
    );
  await resetThisDevice({ sync, disconnect: disconnectForDeviceReset });
  uiStore.notify('session');
  uiStore.notify('sync');
  uiStore.notify('route');
  // O login é novamente permitido, mas a barreira impede qualquer pull/push.
  void ensureSupabaseClient();
}

/** SELECT read-only. O callback de login nunca chama esta função por conta própria. */
export async function inspectCloudAfterReset(): Promise<CloudPreview> {
  if (remoteResetIsPending())
    throw Error('Termine o reset remoto pendente antes de revisar a nuvem.');
  if (resetPhase() !== 'completed' || !isSyncBlocked())
    throw Error('Não há decisão de reconexão pendente.');
  const userId = appState.currentUser?.id;
  if (!userId) throw Error('Entre na conta antes de consultar o progresso remoto.');
  const client = await ensureSupabaseClient();
  if (!client) throw Error('A conexão com o Supabase está indisponível.');
  const records = await readCloudRecords(client, userId);
  if (appState.currentUser?.id !== userId)
    throw Error('A conta conectada mudou durante a consulta.');
  const protocol =
    typeof client.rpc === 'function'
      ? await checkServerGeneration(client, userId, { allowExplicitJoin: true })
      : { mode: 'legacy' as const };
  const preview = previewCloud(records);
  if (protocol.mode === 'protected') preview.protocolGeneration = protocol.generation;
  return preview;
}

export async function confirmCloudRestore(preview: CloudPreview): Promise<void> {
  if (remoteResetIsPending()) throw Error('Termine o reset remoto pendente antes de restaurar.');
  const userId = appState.currentUser?.id;
  const client = supabaseClient;
  if (!userId || !client) throw Error('É necessário estar conectado para restaurar.');
  await restoreFromCloud(
    {
      client,
      userId,
      invalidate: sync.invalidate,
      waitForInFlight: sync.waitForInFlight,
      afterRestored: async () => {
        uiStore.notify('sync');
        // O primeiro download já foi aplicado e validado. Reutiliza o merge normal.
        await sync.pull();
      }
    },
    preview
  );
  uiStore.notify('session');
  uiStore.notify('sync');
}

export async function confirmStartOnEmptyCloud(preview: CloudPreview): Promise<void> {
  if (remoteResetIsPending())
    throw Error('Termine o reset remoto pendente antes de iniciar a sincronização.');
  const userId = appState.currentUser?.id;
  if (!userId || !supabaseClient) throw Error('Entre na conta antes de começar.');
  await authorizeEmptyCloud(
    {
      client: supabaseClient,
      userId,
      invalidate: sync.invalidate,
      waitForInFlight: sync.waitForInFlight,
      afterRestored: async () => {
        await sync.pull();
      }
    },
    preview
  );
  uiStore.notify('session');
  uiStore.notify('sync');
}

/** Funcionalidade fica inacessível até migração e RLS validadas no servidor real. */
export function remoteResetAvailable(): boolean {
  return (
    remoteResetVerified() &&
    Boolean(supabaseClient && appState.currentUser && navigator.onLine && navigator.locks?.request)
  );
}
export function getInterruptedCloudReset() {
  return cloudResetIntent();
}
export async function resetCloudAndDevice(confirmation: string): Promise<void> {
  if (!remoteResetAvailable()) throw Error('Reset remoto indisponível ou sem sessão/conexão.');
  await resetDeviceAndCloud(
    { client: supabaseClient, sync, disconnect: disconnectForDeviceReset },
    confirmation
  );
  uiStore.notify('session');
  uiStore.notify('sync');
  uiStore.notify('route');
  void ensureSupabaseClient();
}
export async function finishInterruptedCloudReset(): Promise<void> {
  await resumeCloudReset({ client: supabaseClient, sync, disconnect: disconnectForDeviceReset });
  uiStore.notify('session');
  uiStore.notify('sync');
  uiStore.notify('route');
  void ensureSupabaseClient();
}

export function confirmLocalOnly(): void {
  stayOnDevice(sync.invalidate);
  uiStore.notify('session');
  uiStore.notify('sync');
}
