import { appState } from '../state/app-state';
import { progressStore, STORAGE_KEYS } from '../state/progress-store';
import { READING_PREFERENCES_KEY, readingPreferences } from '../preferences/reading-preferences';
import { DESIGN_PREFERENCES_KEY, designPreferences } from '../design/preferences';
import { ENGAGEMENT_STORAGE_KEY, engagementPreferences } from '../engagement/preferences';
import { SPOILER_LEVEL_KEY, LEGACY_CONSENT_KEYS, spoilerPreferences } from '../spoilers/preferences';
import { beginLocalReset, completeLocalReset } from './reset-guard';
import { SERVER_GENERATIONS_KEY, refreshGenerationAfterLocalReset } from '../sync/server-generation';
import type { createSyncEngine } from '../sync/sync-engine';

/** Inventário fechado: jamais remover chaves não pertencentes a este aplicativo. */
export const RESET_STORAGE_KEYS = [
  ...Object.values(STORAGE_KEYS),
  READING_PREFERENCES_KEY,
  DESIGN_PREFERENCES_KEY,
  ENGAGEMENT_STORAGE_KEY,
  SPOILER_LEVEL_KEY,
  ...LEGACY_CONSENT_KEYS,
  SERVER_GENERATIONS_KEY
] as const;

export interface LocalResetDependencies {
  sync: Pick<ReturnType<typeof createSyncEngine>, 'invalidate' | 'waitForInFlight'>;
  disconnect: () => Promise<void>;
}

let running = false;

export async function resetThisDevice({ sync, disconnect }: LocalResetDependencies): Promise<void> {
  if (running) throw new Error('O reset já está em andamento.');
  running = true;
  try {
    // Primeira escrita é o bloqueio recuperável após uma falha, crash ou outra aba.
    try {
      beginLocalReset();
    } catch {
      throw new Error('Não foi possível ativar a proteção persistente. Verifique as permissões de armazenamento do navegador. Nenhum dado foi apagado.');
    }
    sync.invalidate();
    // Nenhum push desta aba pode permanecer em voo quando o reset for concluído.
    await sync.waitForInFlight();
    // Uma falha na desconexão impede a limpeza. O bloqueio continua em vigor.
    await disconnect();
    for (const key of RESET_STORAGE_KEYS) {
      try {
        localStorage.removeItem(key);
        if (localStorage.getItem(key) !== null) throw new Error('Verificação falhou');
      } catch {
        throw new Error(`Falha ao remover o dado local ${key}. A nuvem permanece bloqueada; repita o reset.`);
      }
    }
    // Verificação final: removeItem pode falhar silenciosamente em alguns ambientes.
    if (RESET_STORAGE_KEYS.some(key => localStorage.getItem(key) !== null)) {
      throw new Error('A limpeza do armazenamento não foi concluída.');
    }
    refreshGenerationAfterLocalReset();
    // Antes de emitir notificações que remontam o onboarding, confirme a trava
    // durável de término. Falhas aqui ainda são relatadas como falha.
    completeLocalReset();
    appState.currentUser = null;
    progressStore.restoreSnapshot({});
    appState.syncQueue = [];
    appState.syncState = 'blocked';
    appState.checklistQuery = '';
    appState.checklistFilter = '';
    appState.checklistOpenGroups.clear();
    appState.checklistOpenItems.clear();
    appState.highlightedSource = null;
    appState.readingMode = 'ext';
    appState.exploreSection = 'jornada';
    appState.extrasFilter = 'rec';
    appState.helpSection = 'ajuda';
    appState.skipPending = null;
    appState.skipOrigin = null;
    appState.skipCommitted = false;
    appState.focusedItemId = null;
    engagementPreferences.resetInMemory();
    spoilerPreferences.resetInMemory();
    designPreferences.resetInMemory();
    readingPreferences.notifyReset();
  } finally {
    running = false;
  }
}
