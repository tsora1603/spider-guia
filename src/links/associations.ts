import type { EditorialLinkGroup } from './types';

export interface LinkAssociations {
  /** IDs editoriais de Links, na ordem original. Nunca números de edição LGY. */
  byItemId: ReadonlyMap<number, readonly string[]>;
  /** `n` é a identidade explícita da ficha de Extras. */
  byExtraId: ReadonlyMap<number, readonly string[]>;
}

/** Apenas os relacionamentos declarados em itemIds e extraId produzem CTAs.
 * `coverage`, título e readingGroup não são evidências de identidade.
 */
export function createLinkAssociations(
  groups: readonly EditorialLinkGroup[],
  knownItemIds: ReadonlySet<number>,
  knownExtraIds: ReadonlySet<number>
): LinkAssociations {
  const byItemId = new Map<number, string[]>();
  const byExtraId = new Map<number, string[]>();
  const seenGroupIds = new Set<string>();

  const add = (map: Map<number, string[]>, key: number, groupId: string) => {
    const list = map.get(key) || [];
    if (!list.includes(groupId)) list.push(groupId);
    map.set(key, list);
  };
  for (const group of groups) {
    if (!group.id || seenGroupIds.has(group.id)) continue;
    seenGroupIds.add(group.id);
    const destinations = [
      ...(group.links || []),
      ...(group.stores || []),
      ...(group.libraries || [])
    ];
    const validDestinations = destinations.filter((destination) => {
      try {
        const url = new URL(destination.url);
        return (url.protocol === 'http:' || url.protocol === 'https:') && Boolean(url.hostname);
      } catch {
        return false;
      }
    });
    if (!validDestinations.length) continue;

    for (const itemId of group.itemIds || []) {
      if (Number.isSafeInteger(itemId) && knownItemIds.has(itemId)) add(byItemId, itemId, group.id);
    }
    for (const destination of validDestinations) {
      const extraId = Object.prototype.hasOwnProperty.call(destination, 'extraId')
        ? destination.extraId
        : group.extraId;
      if (extraId != null && knownExtraIds.has(extraId)) add(byExtraId, extraId, group.id);
    }
  }
  return { byItemId, byExtraId };
}

/** Compartilhado pela Checklist, Modo Foco e Extras. */
export function linkTargetsFor(
  associations: LinkAssociations,
  kind: 'item' | 'extra',
  id: number
): readonly string[] {
  return (kind === 'item' ? associations.byItemId : associations.byExtraId).get(id) || [];
}

/** União dos vínculos explícitos das edições, sem duplicar cards de Links. */
export function linkTargetsForItems(associations: LinkAssociations, ids: readonly number[]): string[] {
  return [...new Set(ids.flatMap(id => [...linkTargetsFor(associations, 'item', id)]))];
}
