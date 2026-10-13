import { appState } from '../state/app-state';
import { progressStore, statusOf } from '../state/progress-store';
import type { ProgressStatus } from '../state/types';
import { currentResetEpoch } from '../reset/reset-guard';
import { checklistReadings, itemsById, editorialExtras, cloneEntries } from '../data/model';
import { readThroughSelection } from './read-through';
import { readingPreferences } from '../preferences/reading-preferences';
import { showToast } from '../components/feedback';
import { sync } from '../runtime/sync-service';
import { $, confirmAction } from '../ui/dialogs';
export async function setStatus(
  id: number,
  requested: ProgressStatus,
  _options: { silentToast?: boolean } = {}
) {
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
  const uniqueIds = [...new Set(ids)].filter(
    (id) => Boolean(itemsById[id]) && statusOf(id) !== target
  );
  if (!uniqueIds.length) return 0;

  const mutationEpoch = currentResetEpoch();
  const before = progressStore.snapshotIds(uniqueIds);
  const now = Date.now();
  progressStore.batch(() => {
    uniqueIds.forEach((id, index) => progressStore.set(id, target, { updatedAt: now + index }));
  });
  progressStore.save();

  const action =
    target === 'Sim'
      ? uniqueIds.length === 1
        ? 'marcada como lida'
        : 'marcadas como lidas'
      : uniqueIds.length === 1
        ? 'voltou para não lida'
        : 'voltaram para não lidas';
  showToast(
    `${uniqueIds.length} ${uniqueIds.length === 1 ? 'leitura' : 'leituras'} ${action} · ${selectionLabel}.`,
    {
      duration: 10000,
      undo: async () => {
        if (mutationEpoch !== currentResetEpoch()) return;
        progressStore.restoreIds(before);
        progressStore.save();
        await sync.syncLocalRecords(uniqueIds, { showError: true });
      }
    }
  );
  await sync.syncLocalRecords(uniqueIds, { showError: true });
  return uniqueIds.length;
}

const skipLocation = (id: number) => {
  const extra = editorialExtras.find((item) => (item.itemIds || []).includes(id));
  const inClone = cloneEntries.some((item) => item.id === id);
  if (extra) {
    const position = extra.after ? `Depois da #${extra.after}` : 'Antes da #1';
    const areas = inClone
      ? 'Leituras Extras, Saga do Clone e Checklist'
      : 'Leituras Extras e Checklist';
    return `Ela continuará disponível em ${areas}, na posição “${position}”, e poderá ser marcada como lida a qualquer momento.`;
  }
  if (inClone)
    return 'Ela continuará disponível na Saga do Clone e na Checklist para você marcar como lida depois.';
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
  const preview = readThroughSelection(number, checklistReadings, statusOf);
  if (!preview.pending.length) {
    if (!options.silentToast)
      showToast(
        `Nada a marcar: todas as edições principais até a #${number} já estão lidas ou puladas.`
      );
    return 0;
  }
  if (options.confirm !== false) {
    const preserved = [
      preview.alreadyRead
        ? `${preview.alreadyRead} já lida${preview.alreadyRead === 1 ? '' : 's'}`
        : '',
      preview.skipped ? `${preview.skipped} pulada${preview.skipped === 1 ? '' : 's'}` : ''
    ]
      .filter(Boolean)
      .join(' e ');
    const confirmed = await confirmAction({
      title: 'Marcar leituras como lidas?',
      message: `Até a edição histórica #${number}: ${preview.pending.length} ${preview.pending.length === 1 ? 'edição principal será marcada como lida' : 'edições principais serão marcadas como lidas'}. ${preserved ? `Permanecem inalteradas: ${preserved}. ` : ''}Extras e volumes Panini não serão marcados. Marque cada volume completo na Checklist. Confira antes de confirmar.`,
      confirmLabel: 'Marcar como lidas'
    });
    if (!confirmed) return 0;
  }
  if (mutationEpoch !== currentResetEpoch()) return 0;
  // Revalidar ao confirmar: uma alteração/sync durante o diálogo não pode ser sobrescrita.
  const items = preview.pending.filter((item) => statusOf(item.id) === 'Não');
  if (!items.length) return 0;
  const ids = items.map((item) => item.id);
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
    showToast(
      `${items.length} ${items.length === 1 ? 'edição principal marcada como lida' : 'edições principais marcadas como lidas'}.`,
      {
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
      }
    );
  }
  await sync.syncLocalRecords(ids, { showError: true });
  return items.length;
}

export async function markUpTo(number: number) {
  return applyReadThrough(number, { updateReadThrough: true });
}
