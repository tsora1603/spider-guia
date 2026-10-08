import type { BulkSelection, BulkTargetStatus } from './bulk-progress';

export interface BulkDialogRequest {
  selection?: BulkSelection;
  target?: BulkTargetStatus;
  origin?: HTMLElement | null;
}

type Listener = (request: BulkDialogRequest) => void;
const listeners = new Set<Listener>();

export const bulkProgressUi = {
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
  open(request: BulkDialogRequest = {}) {
    for (const listener of listeners) listener(request);
  }
};
