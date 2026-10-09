/** Internal editorial anchors are positions in the versioned curated index, not inferred HQ mappings. */
export type EditorialTarget = 'marco' | 'extra' | 'link';

const slug = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Stable across editorial reordering; historic numeric targets remain accepted by the views. */
export const milestoneAnchorKey = (milestone: { year: unknown; title: unknown }): string =>
  `${slug(milestone.year)}-${slug(milestone.title)}`;

/** Catalog item IDs are immutable, including when an extra contains several issues. */
export const extraAnchorKey = (extra: {
  itemIds?: number[];
  name: unknown;
  after?: number;
}): string =>
  extra.itemIds?.length ? extra.itemIds.join('-') : `${slug(extra.name)}-${extra.after || 0}`;

/** IDs editoriais podem ser inteiramente numéricos (ex.: "1228").
 * Eles são chaves estáveis, não índices; os links legados por índice continuam
 * aceitos somente quando não há uma chave editorial correspondente.
 */
export function resolveExtraTargetIndex(
  raw: string | null,
  extras: readonly { itemIds?: number[]; name: unknown; after?: number }[]
): number | null {
  if (raw === null) return null;
  const byKey = extras.findIndex((entry) => extraAnchorKey(entry) === raw);
  if (byKey >= 0) return byKey;
  if (!/^\d+$/.test(raw)) return null;
  const legacyIndex = Number(raw);
  return Number.isSafeInteger(legacyIndex) && legacyIndex >= 0 && legacyIndex < extras.length
    ? legacyIndex
    : null;
}

export function exploreTarget(
  section: string,
  target: EditorialTarget,
  value: number | string
): string {
  const params = new URLSearchParams();
  params.set(target, String(value));
  return `#explorar/${section}?${params.toString()}`;
}

/** A única representação de multi-targets usa `link` repetido no hash.
 * Preserva deep links individuais e permite voltar ao ponto de leitura.
 */
export function contextualLinksTarget(linkIds: readonly string[], from?: string): string {
  const params = new URLSearchParams();
  for (const id of new Set(linkIds.filter(Boolean))) params.append('link', id);
  if (from && /^#(?:checklist(?:\/hq\/\d+)?|explorar\/(?:extras|clone))(?:\?|$)/.test(from)) {
    params.set('from', from);
  }
  return `#explorar/links${params.size ? `?${params.toString()}` : ''}`;
}

/** Aceita tanto os IDs estáveis quanto índices numéricos de URLs legadas. */
export function resolveLinkTargets(raw: readonly string[], linkIds: readonly string[]): string[] {
  const available = new Set(linkIds);
  const found: string[] = [];
  for (const value of raw) {
    const target = available.has(value)
      ? value
      : /^\d+$/.test(value)
        ? linkIds[Number(value)]
        : undefined;
    if (target && !found.includes(target)) found.push(target);
  }
  return found;
}

export function exploreRouteParam(param: EditorialTarget): string | null {
  const query = window.location.hash.split('?').slice(1).join('?');
  return new URLSearchParams(query).get(param);
}

/** Returning from a result restores the search terms from the previous history entry. */
export function replaceExploreSearch(query: string): void {
  const [path, raw = ''] = window.location.hash.split('?');
  if (!path.startsWith('#explorar/')) return;
  const params = new URLSearchParams(raw);
  params.delete('marco');
  params.delete('extra');
  params.delete('link');
  if (query.trim()) params.set('q', query);
  else params.delete('q');
  const next = params.toString();
  history.replaceState(history.state, '', `${path}${next ? `?${next}` : ''}`);
}

export function focusEditorialTarget(elementId: string): void {
  const target = document.getElementById(elementId);
  if (!target) return;
  target.scrollIntoView({ block: 'center', behavior: 'auto' });
  const interactive = target.matches('details')
    ? target.querySelector<HTMLElement>('summary')
    : target.querySelector<HTMLElement>('summary');
  (interactive || target).focus({ preventScroll: true });
}
