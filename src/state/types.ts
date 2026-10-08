export type ProgressStatus = 'Não' | 'Sim' | 'Pulei';
export type SyncState = 'saved' | 'syncing' | 'error' | 'offline' | 'blocked';

export interface ProgressRecord {
  status: ProgressStatus;
  updatedAt: number;
}

export interface SyncQueueEntry extends ProgressRecord {
  userId: string;
  id: number;
  attempts: number;
  nextAt: number;
}

export interface CurrentUser {
  id: string;
  email?: string;
}

export interface AppState {
  progress: Record<string, Exclude<ProgressStatus, 'Não'>>;
  progressMeta: Record<string, ProgressRecord>;
  readingLog: Record<string, number>;
  syncQueue: SyncQueueEntry[];
  syncState: SyncState;
  currentUser: CurrentUser | null;
  activeTab: string;
  checklistQuery: string;
  checklistFilter: string;
  checklistOpenGroups: Set<string>;
  checklistOpenItems: Set<number>;
  highlightedSource: number | null;
  readingMode: 'ext' | 'main' | 'clone';
  exploreSection: 'jornada' | 'extras' | 'clone' | 'links';
  extrasFilter: string;
  helpSection: 'ajuda' | 'glossario' | 'fontes' | 'metodologia';
  skipPending: number | null;
  skipOrigin: HTMLElement | null;
  skipCommitted: boolean;
  focusedItemId: number | null;
}
