import type { AppState } from './types';

export const appState: AppState = {
  progress: {},
  progressMeta: {},
  readingLog: {},
  syncQueue: [],
  syncState: typeof navigator === 'undefined' || navigator.onLine ? 'saved' : 'offline',
  currentUser: null,
  activeTab: 'Hoje',
  checklistQuery: '',
  checklistFilter: '',
  checklistOpenGroups: new Set(),
  checklistOpenItems: new Set(),
  highlightedSource: null,
  readingMode: 'ext',
  exploreSection: 'jornada',
  extrasFilter: 'rec',
  helpSection: 'ajuda',
  skipPending: null,
  skipOrigin: null,
  skipCommitted: false,
  focusedItemId: null
};
