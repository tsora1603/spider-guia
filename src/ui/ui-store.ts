export type UiChannel = 'route' | 'session' | 'sync';
type Listener = () => void;

const listeners = new Map<UiChannel, Set<Listener>>([
  ['route', new Set()],
  ['session', new Set()],
  ['sync', new Set()]
]);
const revisions: Record<UiChannel, number> = { route: 0, session: 0, sync: 0 };

export const uiStore = {
  subscribe(channel: UiChannel, listener: Listener) {
    listeners.get(channel)!.add(listener);
    return () => listeners.get(channel)!.delete(listener);
  },
  notify(channel: UiChannel) {
    revisions[channel] += 1;
    for (const listener of listeners.get(channel)!) listener();
  },
  getRevision(channel: UiChannel) {
    return revisions[channel];
  }
};
