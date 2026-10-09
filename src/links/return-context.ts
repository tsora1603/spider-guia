/** Navegação contextual visual, independente de progresso, storage e sincronização.
 * O estado fica na entrada do histórico da leitura, não na página de Links.
 */
const KEY = 'spiderReadingReturn';
export type ReadingReturn = { hash: string; kind: 'item' | 'extra'; id: number };

export function rememberReadingReturn(kind: ReadingReturn['kind'], id: number): void {
  const previous = history.state && typeof history.state === 'object' ? history.state : {};
  history.replaceState(
    { ...previous, [KEY]: { kind, id, hash: location.hash } },
    '',
    location.href
  );
}

export function readingReturnFor(
  state: unknown,
  hash: string,
  kind: ReadingReturn['kind']
): number | null {
  if (!state || typeof state !== 'object') return null;
  const marker = (state as Record<string, unknown>)[KEY];
  if (!marker || typeof marker !== 'object') return null;
  const value = marker as Partial<ReadingReturn>;
  return value.hash === hash &&
    value.kind === kind &&
    Number.isSafeInteger(value.id) &&
    (value.id || 0) > 0
    ? value.id!
    : null;
}
