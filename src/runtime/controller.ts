import { appState } from '../state/app-state';
import { progressStore } from '../state/progress-store';
import {
  cloudDecision,
  isSyncBlocked,
  mayUseCloud,
  LOCAL_RESET_GUARD_KEY,
  REMOTE_RESET_INTENT_KEY
} from '../reset/reset-guard';
import { SERVER_GENERATIONS_KEY } from '../sync/server-generation';
import { DATA } from '../data/model';
import { uiStore } from '../ui/ui-store';
import { sync } from './sync-service';
import { linksEnabled } from '../config/public';
import { supabaseClient, ensureSupabaseClient } from '../auth/auth-session';
import { initializeAuthDialog } from '../auth/login-dialog';
import { $, initializeDialogs } from '../ui/dialogs';
import { router } from './navigation';
import { setStatus } from '../progress/actions';
export { linksEnabled } from '../config/public';
export { router } from './navigation';
export { supabaseClient, ensureSupabaseClient } from '../auth/auth-session';
export { toggleAuth } from '../auth/login-dialog';
export { confirmAction } from '../ui/dialogs';
export {
  setStatus,
  applyBulkStatus,
  requestStatus,
  applyReadThrough,
  markUpTo
} from '../progress/actions';
export { exportProgress, handleProgressImport } from '../progress/backup-actions';
export {
  resetLocalDevice,
  inspectCloudAfterReset,
  confirmCloudRestore,
  confirmStartOnEmptyCloud,
  remoteResetAvailable,
  getInterruptedCloudReset,
  resetCloudAndDevice,
  finishInterruptedCloudReset,
  confirmLocalOnly
} from '../reset/device-actions';
export const editorialLinks = linksEnabled ? DATA.editorial.links : [];
let initialized = false;

export function homeSyncCopy() {
  if (appState.currentUser && !mayUseCloud(appState.currentUser.id) && !isSyncBlocked())
    return 'Esta conta não foi autorizada para sincronização após o reset. Entre novamente com a conta que realizou a restauração.';
  if (isSyncBlocked())
    return cloudDecision() === 'local-only'
      ? 'Você escolheu continuar sem sincronizar. A nuvem permanece intacta; para reconsiderar, use a opção de reconexão.'
      : 'Sincronização bloqueada após reset local. Entre na conta para decidir se deseja restaurar o progresso da nuvem.';
  if (!navigator.onLine)
    return 'Offline. O progresso continua salvo neste aparelho e será sincronizado quando a conexão voltar.';
  if (appState.currentUser) {
    if (appState.syncState === 'syncing') return 'Sincronizando seu progresso entre aparelhos.';
    if (appState.syncState === 'error')
      return 'O progresso está salvo neste aparelho. Há alterações aguardando uma nova tentativa de sincronização.';
    return 'Progresso salvo e sincronizado entre seus aparelhos.';
  }
  if (supabaseClient)
    return 'Progresso salvo neste aparelho. Toque em Entrar no topo para sincronizar entre aparelhos.';
  return 'Progresso salvo apenas neste aparelho.';
}

export function initializeRuntime() {
  if (initialized) return;
  initialized = true;
  progressStore.load();
  if (isSyncBlocked()) sync.invalidate();
  initializeDialogs((id) => setStatus(id, 'Pulei'));
  initializeAuthDialog();
  addEventListener('storage', (event) => {
    if (
      event.key === LOCAL_RESET_GUARD_KEY ||
      event.key === REMOTE_RESET_INTENT_KEY ||
      event.key === SERVER_GENERATIONS_KEY
    ) {
      sync.invalidate();
      // Outra aba deve descartar todo o estado em memória, inclusive sessões
      // do SDK e callbacks antigos, e reabrir sem conectar à nuvem.
      location.reload();
    }
  });

  document.querySelector('.skip-link')?.addEventListener('click', (event) => {
    event.preventDefault();
    ($('#app') as HTMLElement | null)?.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    const dropdown = document.querySelector<HTMLDetailsElement>('.filter-dropdown[open]');
    if (dropdown && !dropdown.contains(event.target as Node)) dropdown.removeAttribute('open');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      const dropdown = document.querySelector<HTMLDetailsElement>('.filter-dropdown[open]');
      if (dropdown) {
        dropdown.removeAttribute('open');
        dropdown.querySelector<HTMLElement>('summary')?.focus();
      }
    }
  });

  void ensureSupabaseClient();

  addEventListener('focus', () => {
    if (appState.currentUser && !isSyncBlocked() && mayUseCloud(appState.currentUser.id))
      void sync.pull();
    else uiStore.notify('sync');
  });
  addEventListener('online', () => {
    void ensureSupabaseClient().then(() => {
      if (appState.currentUser && !isSyncBlocked() && mayUseCloud(appState.currentUser.id)) {
        sync.setSyncState('syncing');
        void sync.pull();
      } else sync.setSyncState(isSyncBlocked() ? 'blocked' : 'saved');
    });
  });
  addEventListener('offline', () => {
    sync.pause();
    sync.setSyncState('offline');
  });

  if (new URLSearchParams(location.search).get('debug') === '1' && window.SpiderValidator) {
    void import('../data/diagnostics')
      .then((module) => module.validateFullData(editorialLinks))
      .then((result) => {
        window.__SPIDER_VALIDATION__ = result;
        result.errors.forEach((error) =>
          console.error(`[Spider·Guia:${error.code}] ${error.message}`)
        );
      })
      .catch((error) =>
        console.error('Não foi possível executar a validação de diagnóstico.', error)
      );
  }

  router.start();
}
