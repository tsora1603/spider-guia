import { useEffect, useMemo, useState } from 'preact/hooks';
import { progressStore, statusOf } from '../state/progress-store';
import { uiStore, type UiChannel } from './ui-store';

export function useUiRevision(channel: UiChannel) {
  const [, setRevision] = useState(uiStore.getRevision(channel));
  useEffect(() => {
    const update = () => setRevision(uiStore.getRevision(channel));
    const unsubscribe = uiStore.subscribe(channel, update);
    // Recupera notificações que possam ter ocorrido entre o primeiro render e
    // a inscrição do efeito (por exemplo, getSession() resolvendo imediatamente).
    update();
    return unsubscribe;
  }, [channel]);
}

export function useProgressStatus(id: number) {
  // A mesma linha pode representar outra HQ (ex.: ao avançar no Modo Foco).
  // Não renderize o status da edição anterior enquanto o efeito troca a inscrição.
  const [snapshot, setSnapshot] = useState(() => ({ id, status: statusOf(id) }));
  useEffect(() => {
    const update = () => {
      const nextStatus = statusOf(id);
      setSnapshot(previous => previous.id === id && previous.status === nextStatus
        ? previous
        : { id, status: nextStatus });
    };
    const unsubscribe = progressStore.subscribe(id, update);
    update(); // Reconfere mudanças entre renderização e inscrição.
    return unsubscribe;
  }, [id]);
  return snapshot.id === id ? snapshot.status : statusOf(id);
}

export function useProgressRevision(ids?: readonly number[]) {
  const [revision, setRevision] = useState(0);
  const stableKey = ids ? ids.join(',') : '*';
  const stableIds = useMemo(() => (ids ? [...ids] : null), [stableKey]);
  useEffect(() => {
    const update = () => setRevision(value => value + 1);
    return stableIds ? progressStore.subscribeMany(stableIds, update) : progressStore.subscribeAll(update);
  }, [stableIds]);
  return revision;
}
