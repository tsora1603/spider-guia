import type { EditorialLinkGroup } from './types';

export interface LinkAssociations {
  /** IDs editoriais de Links, na ordem original. Nunca números de edição LGY. */
  byItemId: ReadonlyMap<number, readonly string[]>;
  /** `n` é a identidade explícita da ficha de Extras. */
  byExtraId: ReadonlyMap<number, readonly string[]>;
  /** Identidade estável do arco em editorial.clone. */
  byCloneArcId: ReadonlyMap<string, readonly string[]>;
}

/** Apenas `targets` produz CTAs; cobertura e título são metadados de apresentação. */
export function createLinkAssociations(
  groups: readonly EditorialLinkGroup[],
  items: ReadonlyArray<{
    id: number;
    historicalNumber: number | null;
    type: string;
    sourceItemIds?: number[];
  }>,
  extras: ReadonlyArray<{ n: number; itemIds?: number[] }>,
  knownCloneArcIds: ReadonlySet<string> = new Set()
): LinkAssociations {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const extraById = new Map(extras.map((extra) => [extra.n, extra]));
  const byItemId = new Map<number, string[]>();
  const byExtraId = new Map<number, string[]>();
  const byCloneArcId = new Map<string, string[]>();
  const seenGroupIds = new Set<string>();

  const add = <Key extends number | string>(map: Map<Key, string[]>, key: Key, groupId: string) => {
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

    for (const target of group.targets || []) {
      if (target.kind === 'items') {
        for (const itemId of target.ids) if (itemById.has(itemId)) add(byItemId, itemId, group.id);
      } else if (target.kind === 'historical') {
        for (const item of items) {
          if (item.type !== 'Principal' || item.historicalNumber == null) continue;
          if (
            target.ranges.some(
              (range) =>
                item.historicalNumber! >= range.start && item.historicalNumber! <= range.end
            )
          )
            add(byItemId, item.id, group.id);
        }
      } else if (target.kind === 'extra') {
        const extra = extraById.get(target.id);
        if (!extra) continue;
        add(byExtraId, target.id, group.id);
        for (const itemId of extra.itemIds || [])
          if (itemById.has(itemId)) add(byItemId, itemId, group.id);
      } else if (knownCloneArcIds.has(target.id)) {
        add(byCloneArcId, target.id, group.id);
      }
    }
  }
  return { byItemId, byExtraId, byCloneArcId };
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
export function linkTargetsForItems(
  associations: LinkAssociations,
  ids: readonly number[]
): string[] {
  return [...new Set(ids.flatMap((id) => [...linkTargetsFor(associations, 'item', id)]))];
}

export function linkTargetsForCloneArc(
  associations: LinkAssociations,
  arcId: string
): readonly string[] {
  return associations.byCloneArcId.get(arcId) || [];
}

/** Encadernados exigem destino próprio; a cobertura americana não é um link do volume. */
export function linkTargetsForCloneStep(
  associations: LinkAssociations,
  step: { checklistId?: number; itemIds: readonly number[]; arcIds: readonly string[] }
): string[] {
  if (step.checklistId) return [...linkTargetsFor(associations, 'item', step.checklistId)];
  return [
    ...new Set([
      ...linkTargetsForItems(associations, step.itemIds),
      ...step.arcIds.flatMap((arcId) => [...linkTargetsForCloneArc(associations, arcId)])
    ])
  ];
}
