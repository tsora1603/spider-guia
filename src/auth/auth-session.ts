import type { SupabaseClient } from '@supabase/supabase-js';
import { appState } from '../state/app-state';
import { isSyncBlocked, mayUseCloud, resetPhase } from '../reset/reset-guard';
import { uiStore } from '../ui/ui-store';
import { sync } from '../runtime/sync-service';
import { supabaseConfig } from '../config/public';
export let supabaseClient: SupabaseClient | null = null;
let supabaseLoadPromise: Promise<typeof import('./supabase-sdk') | null> | null = null;
let supabaseAuthWired = false;
let authSubscription: { unsubscribe(): void } | null = null;

function hasSupabaseConfig() {
  return Boolean(supabaseConfig());
}

function wireSupabaseAuth() {
  if (!supabaseClient || supabaseAuthWired) return;
  supabaseAuthWired = true;
  const boundClient = supabaseClient;
  const subscription = supabaseClient.auth.onAuthStateChange((_event, session) => {
    if (boundClient !== supabaseClient) return;
    const previousUser = appState.currentUser;
    if (isSyncBlocked() || (session?.user && !mayUseCloud(session.user.id))) {
      appState.currentUser = resetPhase() !== 'preparing' ? session?.user || null : null;
      sync.invalidate();
      uiStore.notify('session');
      return;
    }
    appState.currentUser = session?.user || null;
    if (appState.currentUser && appState.currentUser.id !== previousUser?.id) {
      sync.setSyncState('syncing');
      void sync.pull();
    } else if (!appState.currentUser && previousUser) {
      sync.pause();
      sync.setSyncState('saved');
    }
    uiStore.notify('session');
  });
  authSubscription = subscription?.data?.subscription || null;
  void supabaseClient.auth.getSession().then(({ data }) => {
    if (boundClient !== supabaseClient) return;
    if (data.session) {
      appState.currentUser = resetPhase() === 'preparing' ? null : data.session.user;
      if (!isSyncBlocked() && mayUseCloud(data.session.user.id)) void sync.pull();
      else sync.invalidate();
    }
    uiStore.notify('session');
  });
}

async function loadSupabaseLibrary() {
  if (!navigator.onLine || !hasSupabaseConfig()) return null;
  if (!supabaseLoadPromise) {
    supabaseLoadPromise = import('./supabase-sdk')
      .catch(() => null)
      .finally(() => {
        supabaseLoadPromise = null;
      });
  }
  return supabaseLoadPromise;
}

export async function ensureSupabaseClient(forLocalReset = false) {
  if (!forLocalReset && resetPhase() === 'preparing') return null;
  if (supabaseClient) return supabaseClient;
  if (!hasSupabaseConfig()) return null;
  const library = await loadSupabaseLibrary();
  if (!library || supabaseClient) return supabaseClient;
  if (!forLocalReset && resetPhase() === 'preparing') return null;
  const config = supabaseConfig();
  if (!config) return null;
  supabaseClient = library.createClient(config.url, config.key);
  if (!supabaseClient) return null;
  sync.setClient(supabaseClient);
  wireSupabaseAuth();
  uiStore.notify('session');
  return supabaseClient;
}

/** A chave padrão de sessão é de propriedade do Supabase para ESTE projeto. A remoção
 * deve ser feita pelo SDK; só a consultamos para detectar sessões offline. */
function authStorageKey(): string | null {
  if (!hasSupabaseConfig()) return null;
  try {
    const projectRef = new URL(supabaseConfig()!.url).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch {
    return null;
  }
}

export async function disconnectForDeviceReset(): Promise<void> {
  const key = authStorageKey();
  // Se a biblioteca não estiver carregada e nenhuma credencial estiver armazenada,
  // o dispositivo já está desconectado (inclusive sem conexão de rede).
  if (!supabaseClient && !appState.currentUser) {
    if (!key || localStorage.getItem(key) === null) return;
  }
  const client = await ensureSupabaseClient(true);
  if (!client)
    throw new Error(
      'Não foi possível acessar a autenticação para desconectar este dispositivo. Nenhum dado de leitura foi apagado.'
    );
  const before = await client.auth.getSession();
  if (before.error)
    throw new Error(`Não foi possível verificar a sessão antes do reset: ${before.error.message}`);
  // Sem sessão nem credencial persistida, não há motivo para uma chamada de
  // logout que poderia falhar offline. Este é o caminho offline seguro.
  if (!before.data?.session && (!key || localStorage.getItem(key) === null)) {
    appState.currentUser = null;
    sync.setClient(null);
    authSubscription?.unsubscribe();
    authSubscription = null;
    supabaseAuthWired = false;
    supabaseClient = null;
    uiStore.notify('session');
    return;
  }
  const result = await client.auth.signOut({ scope: 'local' });
  if (result.error)
    throw new Error(`Não foi possível sair da conta com segurança: ${result.error.message}`);
  const session = await client.auth.getSession();
  if (session.error || session.data?.session || (key && localStorage.getItem(key) !== null)) {
    throw new Error('Não foi possível confirmar a desconexão da conta neste dispositivo.');
  }
  appState.currentUser = null;
  sync.setClient(null);
  authSubscription?.unsubscribe();
  authSubscription = null;
  supabaseAuthWired = false;
  supabaseClient = null;
  uiStore.notify('session');
}
