import { appState } from '../state/app-state';
import { progressStore } from '../state/progress-store';
import type { ProgressStatus, ProgressRecord } from '../state/types';
import { currentResetEpoch } from '../reset/reset-guard';
import { readings, catalogReadings, paniniVolumes, itemsById } from '../data/model';
import {
  PROGRESS_EXPORT_FORMAT,
  PROGRESS_EXPORT_VERSION,
  validateProgressBackup,
  retainMissingVolumeProgress
} from './backup';
import { showToast } from '../components/feedback';
import { sync } from '../runtime/sync-service';
import { confirmAction } from '../ui/dialogs';
export function exportProgress() {
  const payload = {
    format: PROGRESS_EXPORT_FORMAT,
    version: PROGRESS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    catalogItems: readings.length,
    items: readings.map((item) => {
      const record = progressStore.record(item.id);
      return {
        id: item.id,
        status: record?.status || 'Não',
        updatedAt: record?.updatedAt ? new Date(record.updatedAt).toISOString() : null
      };
    }),
    readingLog: Object.fromEntries(
      Object.entries(appState.readingLog).filter(
        ([id, timestamp]) => itemsById[Number(id)] && Number.isFinite(Number(timestamp))
      )
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

function validateProgressImport(payload: unknown) {
  return validateProgressBackup(
    payload,
    catalogReadings.map((item) => item.id),
    readings.map((item) => item.id)
  );
}

function replaceLocalProgress(
  items: Array<{ id: number; status: ProgressStatus }>,
  readingLog: Record<string, number>
) {
  const now = Date.now();
  const progress: Record<string, 'Sim' | 'Pulei'> = {};
  const meta: Record<string, ProgressRecord> = {};
  items.forEach((entry, index) => {
    if (entry.status !== 'Não') progress[String(entry.id)] = entry.status;
    meta[String(entry.id)] = { status: entry.status, updatedAt: now + index };
  });
  appState.progress = progress;
  appState.progressMeta = meta;
  appState.readingLog = structuredClone(readingLog || {});
  if (appState.currentUser)
    appState.syncQueue = appState.syncQueue.filter(
      (entry) => entry.userId !== appState.currentUser?.id
    );
  progressStore.save();
  progressStore.notifyAll();
}

export async function handleProgressImport(file?: File | null) {
  if (!file) return;
  const mutationEpoch = currentResetEpoch();
  let normalized: ReturnType<typeof validateProgressImport>;
  try {
    normalized = validateProgressImport(JSON.parse(await file.text()));
  } catch (error) {
    showToast(`Arquivo inválido: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }
  if (mutationEpoch !== currentResetEpoch()) return;
  const confirmed = await confirmAction({
    title: 'Importar progresso?',
    message: normalized.legacy
      ? 'Este backup preserva o progresso histórico das HQs. As marcações atuais dos volumes Panini, ausentes no arquivo antigo, serão mantidas. A importação pode ser desfeita.'
      : 'O progresso deste aparelho será sobrescrito pelo arquivo selecionado. Esta ação pode ser desfeita logo após a importação.',
    confirmLabel: 'Importar e sobrescrever'
  });
  if (!confirmed || mutationEpoch !== currentResetEpoch()) return;
  const before = progressStore.snapshot();
  // Reavalie os volumes após a confirmação para preservar alterações concorrentes.
  const imported = retainMissingVolumeProgress(
    normalized,
    paniniVolumes.map((item) => item.id),
    (id) => progressStore.record(id),
    appState.readingLog
  );
  replaceLocalProgress(imported.items, imported.readingLog);
  const allIds = readings.map((item) => item.id);
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
