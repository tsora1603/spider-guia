import { createSyncEngine } from '../sync/sync-engine';
import { progressStore } from '../state/progress-store';
import { uiStore } from '../ui/ui-store';
import { showToast } from '../components/feedback';
export const sync = createSyncEngine({
  client: null,
  onStateChange: () => uiStore.notify('sync'),
  onLocalChanged: () => progressStore.notifyAll(),
  onToast: (message) => showToast(message)
});
