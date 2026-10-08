import { appState } from '../state/app-state';
import { progressStore, statusOf, VALID_PROGRESS_STATUSES } from '../state/progress-store';
import type { ProgressStatus } from '../state/types';
import { createSyncEngine } from '../sync/sync-engine';
import { currentResetEpoch, isSyncBlocked, mayUseCloud, cloudDecision, resetPhase, LOCAL_RESET_GUARD_KEY, REMOTE_RESET_INTENT_KEY, remoteResetIsPending } from '../reset/reset-guard';
import { readCloudRecords, previewCloud, restoreFromCloud, stayOnDevice, authorizeEmptyCloud, type CloudPreview } from '../reset/cloud-reconnect';
import { resetThisDevice } from '../reset/local-reset';
import { cloudResetIntent, remoteResetVerified, resetDeviceAndCloud, resumeCloudReset } from '../reset/remote-reset';
import { checkServerGeneration, SERVER_GENERATIONS_KEY } from '../sync/server-generation';
import { createRouter } from '../router/router';
import { showToast } from '../components/feedback';
import { DATA, readings, itemsById, editorialExtras, cloneEntries } from '../data/model';
import { uiStore } from '../ui/ui-store';
import { readThroughSelection } from '../progress/read-through';
import { readingPreferences } from '../preferences/reading-preferences';
import { loginWithPassword, passwordAuthError } from '../auth/password-auth';

const PROGRESS_EXPORT_FORMAT = 'spider-guia-progress';
const PROGRESS_EXPORT_VERSION = 1;

export const linksEnabled = window.LINKS_ENABLED !== false && typeof window.getEditorialLinks === 'function';
export const editorialLinks: any[] = linksEnabled ? (window.getEditorialLinks?.() as any[]) || [] : [];

const SUPABASE_CDN_URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';

export let supabaseClient: any = null;
let supabaseLoadPromise: Promise<any> | null = null;
let supabaseAuthWired = false;
let authSubscription: { unsubscribe(): void } | null = null;

const sync = createSyncEngine({
  client: null,
  onStateChange: () => uiStore.notify('sync'),
  onLocalChanged: () => progressStore.notifyAll(),
  onToast: message => showToast(message)
});

function hasSupabaseConfig() {
  return Boolean(window.SUPABASE_URL && !/COLE/.test(window.SUPABASE_URL) && window.SUPABASE_ANON_KEY);
}

function wireSupabaseAuth() {
  if (!supabaseClient || supabaseAuthWired) return;
  supabaseAuthWired = true;
  const boundClient = supabaseClient;
  const subscription = supabaseClient.auth.onAuthStateChange((_event: unknown, session: any) => {
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
      ($('#dlg') as HTMLDialogElement | null)?.close();
      sync.setSyncState('syncing');
      void sync.pull();
    } else if (!appState.currentUser && previousUser) {
      sync.pause();
      sync.setSyncState('saved');
    }
    uiStore.notify('session');
  });
  authSubscription = subscription?.data?.subscription || null;
  void supabaseClient.auth.getSession().then(({ data }: any) => {
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
  if (window.supabase) return window.supabase;
  if (!navigator.onLine || !hasSupabaseConfig()) return null;
  if (supabaseLoadPromise) return supabaseLoadPromise;
  supabaseLoadPromise = new Promise(resolve => {
    const existing = document.querySelector<HTMLScriptElement>('script[data-spider-supabase]');
    if (existing) {
      if (window.supabase) resolve(window.supabase);
      else {
        existing.addEventListener('load', () => resolve(window.supabase || null), { once: true });
        existing.addEventListener('error', () => resolve(null), { once: true });
      }
      return;
    }
    const script = document.createElement('script');
    script.src = SUPABASE_CDN_URL;
    script.async = true;
    script.dataset.spiderSupabase = 'true';
    script.addEventListener('load', () => resolve(window.supabase || null), { once: true });
    script.addEventListener('error', () => resolve(null), { once: true });
    document.head.appendChild(script);
  }).finally(() => {
    supabaseLoadPromise = null;
  });
  return supabaseLoadPromise;
}

export async function ensureSupabaseClient(forLocalReset = false) {
  if (!forLocalReset && resetPhase() === 'preparing') return null;
  if (supabaseClient) return supabaseClient;
  if (!hasSupabaseConfig()) return null;
  const library = window.supabase || (await loadSupabaseLibrary());
  if (!library || supabaseClient) return supabaseClient;
  if (!forLocalReset && resetPhase() === 'preparing') return null;
  supabaseClient = library.createClient(window.SUPABASE_URL, window.SUPABASE_ANON_KEY);
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
    const projectRef = new URL(window.SUPABASE_URL).hostname.split('.')[0];
    return projectRef ? `sb-${projectRef}-auth-token` : null;
  } catch { return null; }
}

async function disconnectForDeviceReset(): Promise<void> {
  const key = authStorageKey();
  // Se a biblioteca não estiver carregada e nenhuma credencial estiver armazenada,
  // o dispositivo já está desconectado (inclusive sem conexão de rede).
  if (!supabaseClient && !appState.currentUser) {
    if (!key || localStorage.getItem(key) === null) return;
  }
  const client = await ensureSupabaseClient(true);
  if (!client) throw new Error('Não foi possível acessar a autenticação para desconectar este dispositivo. Nenhum dado de leitura foi apagado.');
  const before = await client.auth.getSession();
  if (before.error) throw new Error(`Não foi possível verificar a sessão antes do reset: ${before.error.message}`);
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
  if (result.error) throw new Error(`Não foi possível sair da conta com segurança: ${result.error.message}`);
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

/** Reset somente local. Não faz DELETE ou UPDATE em public.progress. */
export async function resetLocalDevice(): Promise<void> {
  if (remoteResetIsPending()) throw Error('Existe um reset remoto pendente. Conclua a recuperação antes de apagar o dispositivo.');
  await resetThisDevice({ sync, disconnect: disconnectForDeviceReset });
  uiStore.notify('session');
  uiStore.notify('sync');
  uiStore.notify('route');
  // O login é novamente permitido, mas a barreira impede qualquer pull/push.
  void ensureSupabaseClient();
}

/** SELECT read-only. O callback de login nunca chama esta função por conta própria. */
export async function inspectCloudAfterReset(): Promise<CloudPreview> {
  if (remoteResetIsPending()) throw Error('Termine o reset remoto pendente antes de revisar a nuvem.');
  if (resetPhase() !== 'completed' || !isSyncBlocked()) throw Error('Não há decisão de reconexão pendente.');
  const userId = appState.currentUser?.id;
  if (!userId) throw Error('Entre na conta antes de consultar o progresso remoto.');
  const client = await ensureSupabaseClient();
  if (!client) throw Error('A conexão com o Supabase está indisponível.');
  const records = await readCloudRecords(client, userId);
  if (appState.currentUser?.id !== userId) throw Error('A conta conectada mudou durante a consulta.');
  const protocol = typeof client.rpc === 'function'
    ? await checkServerGeneration(client, userId, { allowExplicitJoin: true }) : { mode: 'legacy' as const };
  const preview = previewCloud(records);
  if (protocol.mode === 'protected') preview.protocolGeneration = protocol.generation;
  return preview;
}

export async function confirmCloudRestore(preview: CloudPreview): Promise<void> {
  if (remoteResetIsPending()) throw Error('Termine o reset remoto pendente antes de restaurar.');
  const userId = appState.currentUser?.id;
  const client = supabaseClient;
  if (!userId || !client) throw Error('É necessário estar conectado para restaurar.');
  await restoreFromCloud({
    client, userId,
    invalidate: sync.invalidate,
    waitForInFlight: sync.waitForInFlight,
    afterRestored: async () => {
      uiStore.notify('sync');
      // O primeiro download já foi aplicado e validado. Reutiliza o merge normal.
      await sync.pull();
    }
  }, preview);
  uiStore.notify('session');
  uiStore.notify('sync');
}

export async function confirmStartOnEmptyCloud(preview: CloudPreview): Promise<void> {
  if (remoteResetIsPending()) throw Error('Termine o reset remoto pendente antes de iniciar a sincronização.');
  const userId = appState.currentUser?.id;
  if (!userId || !supabaseClient) throw Error('Entre na conta antes de começar.');
  await authorizeEmptyCloud({ client: supabaseClient, userId, invalidate: sync.invalidate,
    waitForInFlight: sync.waitForInFlight, afterRestored: async () => { await sync.pull(); } }, preview);
  uiStore.notify('session');
  uiStore.notify('sync');
}

/** Funcionalidade fica inacessível até migração e RLS validadas no servidor real. */
export function remoteResetAvailable(): boolean {
  return remoteResetVerified() && Boolean(supabaseClient && appState.currentUser && navigator.onLine && navigator.locks?.request);
}
export function getInterruptedCloudReset() { return cloudResetIntent(); }
export async function resetCloudAndDevice(confirmation: string): Promise<void> {
  if (!remoteResetAvailable()) throw Error('Reset remoto indisponível ou sem sessão/conexão.');
  await resetDeviceAndCloud({ client: supabaseClient, sync, disconnect: disconnectForDeviceReset }, confirmation);
  uiStore.notify('session'); uiStore.notify('sync'); uiStore.notify('route');
  void ensureSupabaseClient();
}
export async function finishInterruptedCloudReset(): Promise<void> {
  await resumeCloudReset({ client: supabaseClient, sync, disconnect: disconnectForDeviceReset });
  uiStore.notify('session'); uiStore.notify('sync'); uiStore.notify('route');
  void ensureSupabaseClient();
}

export function confirmLocalOnly(): void {
  stayOnDevice(sync.invalidate);
  uiStore.notify('session');
  uiStore.notify('sync');
}

let confirmResolver: ((value: boolean) => void) | null = null;
let confirmOrigin: HTMLElement | null = null;
let initialized = false;

const $ = <T extends Element = HTMLElement>(selector: string) => document.querySelector<T>(selector);

export function confirmAction({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar'
}: {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  const dialog = $('#confirmdlg') as HTMLDialogElement | null;
  if (!dialog) return Promise.resolve(false);
  if (confirmResolver) confirmResolver(false);
  confirmOrigin = document.activeElement as HTMLElement | null;
  const titleNode = $('#confirm-title');
  const copyNode = $('#confirm-copy');
  const ok = $('#confirmok') as HTMLButtonElement | null;
  const cancel = $('#confirmcancel') as HTMLButtonElement | null;
  if (titleNode) titleNode.textContent = title;
  if (copyNode) copyNode.textContent = message;
  if (ok) ok.textContent = confirmLabel;
  if (cancel) cancel.textContent = cancelLabel;
  return new Promise<boolean>(resolve => {
    confirmResolver = resolve;
    dialog.showModal();
    cancel?.focus();
  });
}

export async function setStatus(id: number, requested: ProgressStatus, _options: { silentToast?: boolean } = {}) {
  const previousStatus = statusOf(id);
  const next: ProgressStatus = previousStatus === requested ? 'Não' : requested;
  progressStore.set(id, next);
  progressStore.save();
  // A confirmação de uma leitura individual é o próprio estado da Checklist.
  // Erros de sincronização continuam sendo comunicados pela camada de sync.
  await sync.syncLocalRecords([id], { showError: true });
}

export async function applyBulkStatus(
  ids: readonly number[],
  target: Extract<ProgressStatus, 'Sim' | 'Não'>,
  selectionLabel = 'seleção'
) {
  const uniqueIds = [...new Set(ids)].filter(id => Boolean(itemsById[id]) && statusOf(id) !== target);
  if (!uniqueIds.length) return 0;

  const mutationEpoch = currentResetEpoch();
  const before = progressStore.snapshotIds(uniqueIds);
  const now = Date.now();
  progressStore.batch(() => {
    uniqueIds.forEach((id, index) => progressStore.set(id, target, { updatedAt: now + index }));
  });
  progressStore.save();

  const action = target === 'Sim'
    ? (uniqueIds.length === 1 ? 'marcada como lida' : 'marcadas como lidas')
    : (uniqueIds.length === 1 ? 'voltou para não lida' : 'voltaram para não lidas');
  showToast(`${uniqueIds.length} ${uniqueIds.length === 1 ? 'leitura' : 'leituras'} ${action} · ${selectionLabel}.`, {
    duration: 10000,
    undo: async () => {
      if (mutationEpoch !== currentResetEpoch()) return;
      progressStore.restoreIds(before);
      progressStore.save();
      await sync.syncLocalRecords(uniqueIds, { showError: true });
    }
  });
  await sync.syncLocalRecords(uniqueIds, { showError: true });
  return uniqueIds.length;
}

const skipLocation = (id: number) => {
  const extra = editorialExtras.find((item: any) => (item.itemIds || []).includes(id));
  const inClone = cloneEntries.some((item: any) => item.id === id);
  if (extra) {
    const position = extra.after ? `Depois da #${extra.after}` : 'Antes da #1';
    const areas = inClone ? 'Leituras Extras, Saga do Clone e Checklist' : 'Leituras Extras e Checklist';
    return `Ela continuará disponível em ${areas}, na posição “${position}”, e poderá ser marcada como lida a qualquer momento.`;
  }
  if (inClone) return 'Ela continuará disponível na Saga do Clone e na Checklist para você marcar como lida depois.';
  return 'Ela continuará disponível na Checklist para você marcar como lida depois.';
};

export function requestStatus(id: number, status: ProgressStatus, origin?: HTMLElement | null) {
  const item = itemsById[id];
  if (status === 'Pulei' && statusOf(id) !== 'Pulei' && item?.weight === '● Essencial') {
    appState.skipPending = id;
    appState.skipOrigin = origin || null;
    appState.skipCommitted = false;
    const location = $('#skiploc');
    if (location) location.textContent = skipLocation(id);
    const dialog = $('#skipdlg') as HTMLDialogElement | null;
    dialog?.showModal();
    ($('#skipback') as HTMLButtonElement | null)?.focus();
    return;
  }
  void setStatus(id, status);
}

export async function applyReadThrough(
  number: number,
  options: { confirm?: boolean; silentToast?: boolean; updateReadThrough?: boolean } = {}
) {
  const mutationEpoch = currentResetEpoch();
  if (!Number.isInteger(number) || number < 1 || number > 1000) {
    if (!options.silentToast) showToast('Digite um número de 1 a 1000.');
    return 0;
  }
  const preview = readThroughSelection(number, readings, statusOf);
  if (!preview.pending.length) {
    if (!options.silentToast) showToast(`Nada a marcar: todas as edições principais até a #${number} já estão lidas ou puladas.`);
    return 0;
  }
  if (options.confirm !== false) {
    const preserved = [
      preview.alreadyRead ? `${preview.alreadyRead} já lida${preview.alreadyRead === 1 ? '' : 's'}` : '',
      preview.skipped ? `${preview.skipped} pulada${preview.skipped === 1 ? '' : 's'}` : ''
    ].filter(Boolean).join(' e ');
    const confirmed = await confirmAction({
      title: 'Marcar leituras como lidas?',
      message: `Até a edição histórica #${number}: ${preview.pending.length} ${preview.pending.length === 1 ? 'edição principal será marcada como lida' : 'edições principais serão marcadas como lidas'}. ${preserved ? `Permanecem inalteradas: ${preserved}. ` : ''}Extras e leituras fora da linha histórica não serão marcados. Confira antes de confirmar.`,
      confirmLabel: 'Marcar como lidas'
    });
    if (!confirmed) return 0;
  }
  if (mutationEpoch !== currentResetEpoch()) return 0;
  // Revalidar ao confirmar: uma alteração/sync durante o diálogo não pode ser sobrescrita.
  const items = preview.pending.filter(item => statusOf(item.id) === 'Não');
  if (!items.length) return 0;
  const ids = items.map(item => item.id);
  const before = progressStore.snapshotIds(ids);
  const previousBaseline = readingPreferences.get().readThrough;
  const nextBaseline = Math.max(previousBaseline, number);
  const now = Date.now();
  progressStore.batch(() => {
    items.forEach((item, index) => progressStore.set(item.id, 'Sim', { updatedAt: now + index }));
  });
  progressStore.save();
  if (options.updateReadThrough) readingPreferences.set({ readThrough: nextBaseline });
  if (!options.silentToast) {
    showToast(`${items.length} ${items.length === 1 ? 'edição principal marcada como lida' : 'edições principais marcadas como lidas'}.`, {
      duration: 8000,
      undo: async () => {
        if (mutationEpoch !== currentResetEpoch()) return;
        progressStore.restoreIds(before);
        progressStore.save();
        if (options.updateReadThrough && readingPreferences.get().readThrough === nextBaseline) {
          readingPreferences.set({ readThrough: previousBaseline });
        }
        await sync.syncLocalRecords(ids, { showError: true });
      }
    });
  }
  await sync.syncLocalRecords(ids, { showError: true });
  return items.length;
}

export async function markUpTo(number: number) {
  return applyReadThrough(number, { updateReadThrough: true });
}

export function exportProgress() {
  const payload = {
    format: PROGRESS_EXPORT_FORMAT,
    version: PROGRESS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    catalogItems: readings.length,
    items: readings.map(item => {
      const record = progressStore.record(item.id);
      return {
        id: item.id,
        status: record?.status || 'Não',
        updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : null
      };
    }),
    readingLog: Object.fromEntries(
      Object.entries(appState.readingLog).filter(([id, timestamp]) => itemsById[Number(id)] && Number.isFinite(Number(timestamp)))
    )
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `spider-guia-progresso-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast('Download do backup JSON iniciado. Confira se o arquivo foi salvo antes de resetar.');
}

function validateProgressImport(payload: any) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new Error('O arquivo não contém um objeto JSON válido.');
  if (payload.format !== PROGRESS_EXPORT_FORMAT) throw new Error('Este arquivo não é um backup do SPIDER·GUIA.');
  if (payload.version !== PROGRESS_EXPORT_VERSION) throw new Error(`Versão de backup incompatível. Esperada: ${PROGRESS_EXPORT_VERSION}.`);
  if (!Array.isArray(payload.items) || payload.items.length !== readings.length) throw new Error(`O backup deve conter ${readings.length} itens.`);
  const seen = new Set<number>();
  const items = payload.items.map((entry: any) => {
    const id = Number(entry?.id);
    if (!Number.isInteger(id) || !itemsById[id]) throw new Error(`ID de leitura inválido no backup: ${entry?.id}.`);
    if (seen.has(id)) throw new Error(`ID duplicado no backup: ${id}.`);
    seen.add(id);
    if (!VALID_PROGRESS_STATUSES.has(entry?.status)) throw new Error(`Status inválido no ID ${id}.`);
    let updatedAt = 0;
    if (entry.updatedAt != null && entry.updatedAt !== '') {
      updatedAt = typeof entry.updatedAt === 'number' ? entry.updatedAt : Date.parse(entry.updatedAt);
      if (!Number.isFinite(updatedAt) || updatedAt < 0) throw new Error(`updatedAt inválido no ID ${id}.`);
    }
    return { id, status: entry.status as ProgressStatus, updatedAt };
  });
  const readingLog: Record<string, number> = {};
  if (payload.readingLog != null) {
    if (typeof payload.readingLog !== 'object' || Array.isArray(payload.readingLog)) throw new Error('O histórico local do backup é inválido.');
    for (const [idText, value] of Object.entries(payload.readingLog)) {
      const id = Number(idText);
      const timestamp = Number(value);
      if (!Number.isInteger(id) || !itemsById[id] || !Number.isFinite(timestamp) || timestamp < 0) throw new Error('O histórico local do backup contém dados inválidos.');
      readingLog[String(id)] = timestamp;
    }
  }
  return { items, readingLog };
}

function replaceLocalProgress(items: Array<{ id: number; status: ProgressStatus }>, readingLog: Record<string, number>) {
  const now = Date.now();
  const progress: Record<string, 'Sim' | 'Pulei'> = {};
  const meta: Record<string, any> = {};
  items.forEach((entry, index) => {
    if (entry.status !== 'Não') progress[String(entry.id)] = entry.status;
    meta[String(entry.id)] = { status: entry.status, updatedAt: now + index };
  });
  appState.progress = progress;
  appState.progressMeta = meta;
  appState.readingLog = structuredClone(readingLog || {});
  if (appState.currentUser) appState.syncQueue = appState.syncQueue.filter(entry => entry.userId !== appState.currentUser?.id);
  progressStore.save();
  progressStore.notifyAll();
}

export async function handleProgressImport(file?: File | null) {
  if (!file) return;
  const mutationEpoch = currentResetEpoch();
  let normalized: ReturnType<typeof validateProgressImport>;
  try {
    normalized = validateProgressImport(JSON.parse(await file.text()));
  } catch (error: any) {
    showToast(`Arquivo inválido: ${error.message}`);
    return;
  }
  if (mutationEpoch !== currentResetEpoch()) return;
  const confirmed = await confirmAction({
    title: 'Importar progresso?',
    message: 'O progresso deste aparelho será sobrescrito pelo arquivo selecionado. Esta ação pode ser desfeita logo após a importação.',
    confirmLabel: 'Importar e sobrescrever'
  });
  if (!confirmed || mutationEpoch !== currentResetEpoch()) return;
  const before = progressStore.snapshot();
  replaceLocalProgress(normalized.items, normalized.readingLog);
  const allIds = readings.map(item => item.id);
  void sync.syncLocalRecords(allIds, { showError: true });
  showToast('Progresso importado.', {
    duration: 8000,
    undo: async () => {
      if (mutationEpoch !== currentResetEpoch()) return;
      progressStore.restoreSnapshot(before);
      progressStore.save();
      await sync.syncLocalRecords(allIds, { showError: true });
    }
  });
}

export const router = createRouter({
  linksEnabled,
  apply(route, scroll) {
    appState.activeTab = route.tab;
    if (route.readingMode) appState.readingMode = route.readingMode;
    if (route.exploreSection) appState.exploreSection = route.exploreSection;
    if (route.helpSection) appState.helpSection = route.helpSection;
    if (route.name === 'checklist') {
      appState.checklistFilter = route.checklistFilter || '';
      appState.checklistQuery = route.checklistQuery || '';
      appState.focusedItemId = null;
    } else if (route.name === 'hq' && route.itemId != null) {
      appState.readingMode = 'main';
      appState.checklistFilter = '';
      appState.checklistQuery = '';
      appState.focusedItemId = route.itemId;
    } else {
      appState.focusedItemId = null;
    }
    if (route.tab !== 'Ajuda' || route.helpSection !== 'fontes') appState.highlightedSource = null;
    uiStore.notify('route');
    if (scroll && route.name !== 'hq' && !(route.tab === 'Explorar' && new URLSearchParams(route.routeQuery || '').has('marco')) && !(route.tab === 'Explorar' && new URLSearchParams(route.routeQuery || '').has('extra')) && !(route.tab === 'Explorar' && new URLSearchParams(route.routeQuery || '').has('link'))) requestAnimationFrame(() => scrollTo(0, 0));
  },
  itemExists(id) {
    return Boolean(itemsById[id]);
  },
  onInvalidItem(id) {
    showToast(`HQ ${id} não existe no catálogo atual.`);
  }
});

export function homeSyncCopy() {
  if (appState.currentUser && !mayUseCloud(appState.currentUser.id) && !isSyncBlocked()) return 'Esta conta não foi autorizada para sincronização após o reset. Entre novamente com a conta que realizou a restauração.';
  if (isSyncBlocked()) return cloudDecision() === 'local-only' ? 'Você escolheu continuar sem sincronizar. A nuvem permanece intacta; para reconsiderar, use a opção de reconexão.' : 'Sincronização bloqueada após reset local. Entre na conta para decidir se deseja restaurar o progresso da nuvem.';
  if (!navigator.onLine) return 'Offline. O progresso continua salvo neste aparelho e será sincronizado quando a conexão voltar.';
  if (appState.currentUser) {
    if (appState.syncState === 'syncing') return 'Sincronizando seu progresso entre aparelhos.';
    if (appState.syncState === 'error') return 'O progresso está salvo neste aparelho. Há alterações aguardando uma nova tentativa de sincronização.';
    return 'Progresso salvo e sincronizado entre seus aparelhos.';
  }
  if (supabaseClient) return 'Progresso salvo neste aparelho. Toque em Entrar no topo para sincronizar entre aparelhos.';
  return 'Progresso salvo apenas neste aparelho.';
}

function closeOnBackdrop(dialog: HTMLDialogElement | null) {
  if (!dialog) return;
  dialog.addEventListener('pointerdown', event => {
    const rect = dialog.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) dialog.close();
  });
}

function initializeDialogsAndAuth() {
  const confirmDialog = $('#confirmdlg') as HTMLDialogElement | null;
  ($('#confirmcancel') as HTMLButtonElement | null)?.addEventListener('click', () => confirmDialog?.close());
  ($('#confirmok') as HTMLButtonElement | null)?.addEventListener('click', () => {
    const resolve = confirmResolver;
    confirmResolver = null;
    confirmDialog?.close();
    resolve?.(true);
  });
  if (confirmDialog) confirmDialog.onclose = () => {
    if (confirmResolver) {
      const resolve = confirmResolver;
      confirmResolver = null;
      resolve(false);
    }
    confirmOrigin?.focus?.();
    confirmOrigin = null;
  };

  const skipDialog = $('#skipdlg') as HTMLDialogElement | null;
  ($('#skipback') as HTMLButtonElement | null)?.addEventListener('click', () => skipDialog?.close());
  ($('#skipgo') as HTMLButtonElement | null)?.addEventListener('click', async () => {
    const id = appState.skipPending;
    const origin = appState.skipOrigin;
    appState.skipCommitted = true;
    skipDialog?.close();
    if (id != null) await setStatus(id, 'Pulei');
    origin?.focus();
  });
  if (skipDialog) skipDialog.onclose = () => {
    if (!appState.skipCommitted) appState.skipOrigin?.focus();
    appState.skipPending = null;
    appState.skipOrigin = null;
    appState.skipCommitted = false;
  };

  const loginDialog = $('#dlg') as HTMLDialogElement | null;
  const loginForm = $('#login-form') as HTMLFormElement | null;
  const loginEmail = $('#em') as HTMLInputElement | null;
  const loginPassword = $('#login-password') as HTMLInputElement | null;
  const loginSubmit = $('#go') as HTMLButtonElement | null;
  const loginShowPassword = $('#login-show-password') as HTMLButtonElement | null;
  const loginMessage = $('#msg') as HTMLElement | null;
  let loginPending = false;
  const clearLogin = () => {
    loginForm?.reset();
    if (loginPassword) loginPassword.type = 'password';
    if (loginShowPassword) {
      loginShowPassword.textContent = 'Mostrar';
      loginShowPassword.setAttribute('aria-pressed', 'false');
    }
    if (loginMessage) loginMessage.textContent = '';
  };
  loginDialog?.addEventListener('close', clearLogin);
  loginDialog?.addEventListener('cancel', event => { if (loginPending) event.preventDefault(); });
  loginDialog?.addEventListener('pointerdown', event => {
    if (loginPending || !loginDialog) return;
    const rect = loginDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)
      loginDialog.close();
  });
  ($('#cl') as HTMLButtonElement | null)?.addEventListener('click', () => {
    if (!loginPending) loginDialog?.close();
  });
  loginShowPassword?.addEventListener('click', () => {
    if (!loginPassword) return;
    const isVisible = loginPassword.type === 'password';
    loginPassword.type = isVisible ? 'text' : 'password';
    loginShowPassword.textContent = isVisible ? 'Ocultar' : 'Mostrar';
    loginShowPassword.setAttribute('aria-pressed', String(isVisible));
    loginPassword.focus();
  });
  loginForm?.addEventListener('submit', async event => {
    event.preventDefault();
    if (loginPending || !loginForm.reportValidity()) return;
    if (!navigator.onLine || !supabaseClient) {
      if (loginMessage) loginMessage.textContent = 'Sem conexão com o Supabase. Você pode continuar lendo neste dispositivo.';
      return;
    }
    const email = loginEmail?.value.trim() || '';
    const password = loginPassword?.value || '';
    if (!email || !password) return;
    loginPending = true;
    loginForm.setAttribute('aria-busy', 'true');
    if (loginSubmit) { loginSubmit.disabled = true; loginSubmit.textContent = 'Entrando…'; }
    if (loginShowPassword) loginShowPassword.disabled = true;
    const cancelButton = $('#cl') as HTMLButtonElement | null;
    if (cancelButton) cancelButton.disabled = true;
    if (loginMessage) loginMessage.textContent = '';
    try {
      const result = await loginWithPassword(supabaseClient, email, password);
      if (result.error) {
        if (loginMessage) loginMessage.textContent = passwordAuthError(result.error);
        if (loginPassword) { loginPassword.value = ''; loginPassword.focus(); }
      } else if (result.data?.session) {
        loginDialog?.close();
      } else if (loginMessage) {
        loginMessage.textContent = 'Não foi possível confirmar a sessão. Tente novamente.';
      }
    } catch {
      if (loginMessage) loginMessage.textContent = 'Falha de conexão. Tente novamente.';
      if (loginPassword) loginPassword.value = '';
    } finally {
      loginPending = false;
      loginForm.removeAttribute('aria-busy');
      if (loginSubmit) { loginSubmit.disabled = false; loginSubmit.textContent = 'Entrar'; }
      if (loginShowPassword) loginShowPassword.disabled = false;
      if (cancelButton) cancelButton.disabled = false;
    }
  });

  [$('#xd'), skipDialog, confirmDialog].forEach(dialog => closeOnBackdrop(dialog as HTMLDialogElement | null));
}

export function toggleAuth() {
  if (resetPhase() === 'preparing' || !supabaseClient) return;
  if (appState.currentUser) void supabaseClient.auth.signOut(resetPhase() ? { scope: 'local' } : undefined);
  else {
    const dialog = $('#dlg') as HTMLDialogElement | null;
    if (dialog && !dialog.open) { dialog.showModal(); ($('#em') as HTMLInputElement | null)?.focus(); }
  }
}

export function initializeRuntime() {
  if (initialized) return;
  initialized = true;
  progressStore.load();
  if (isSyncBlocked()) sync.invalidate();
  initializeDialogsAndAuth();
  addEventListener('storage', event => {
    if (event.key === LOCAL_RESET_GUARD_KEY || event.key === REMOTE_RESET_INTENT_KEY || event.key === SERVER_GENERATIONS_KEY) {
      sync.invalidate();
      // Outra aba deve descartar todo o estado em memória, inclusive sessões
      // do SDK e callbacks antigos, e reabrir sem conectar à nuvem.
      location.reload();
    }
  });

  document.querySelector('.skip-link')?.addEventListener('click', event => {
    event.preventDefault();
    ($('#app') as HTMLElement | null)?.focus();
  });
  document.addEventListener('pointerdown', event => {
    const dropdown = document.querySelector<HTMLDetailsElement>('.filter-dropdown[open]');
    if (dropdown && !dropdown.contains(event.target as Node)) dropdown.removeAttribute('open');
  });
  document.addEventListener('keydown', event => {
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
    if (appState.currentUser && !isSyncBlocked() && mayUseCloud(appState.currentUser.id)) void sync.pull();
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
    const result = window.SpiderValidator.validate(DATA, linksEnabled ? editorialLinks : []);
    window.__SPIDER_VALIDATION__ = result;
    if (!result.ok) result.errors.forEach(error => console.error(`[Spider·Guia:${error.code}] ${error.message}`));
  }

  router.start();
}
