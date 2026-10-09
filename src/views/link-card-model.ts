import type { EditorialCoverage, EditorialDestination, EditorialLinkGroup } from '../links/types';
import { normalizeText, type Reading } from '../data/model';
import { extraAnchorKey } from './explore-navigation';

export interface LinkCardDestination {
  label: string;
  url: string;
  /** Only shown when it differs from the card's shared coverage. */
  coverageLabel: string;
  extraTarget: string | null;
}

export interface EditorialLinkCard {
  key: string;
  name: string;
  coverageLabel: string;
  destinations: LinkCardDestination[];
  /** Searchable editorial metadata is deliberately never rendered as card prose. */
  searchText: string;
}

type ExtraReference = { n: number; name: unknown; itemIds?: number[]; after?: number };
type CoverageModel = {
  formatCoverage(coverage: EditorialCoverage[]): string;
  resolveExtraId(group: EditorialLinkGroup, destination?: EditorialDestination): number | null;
};

/** Presentation-only projection: never infer a catalog or Extras association from ranges. */
export function createEditorialLinkCards(
  groups: readonly EditorialLinkGroup[],
  extras: readonly ExtraReference[],
  model: CoverageModel | undefined,
  itemsById: Readonly<
    Record<number, Pick<Reading, 'series' | 'issue' | 'historicalNumber' | 'type'>>
  >
): EditorialLinkCard[] {
  const extrasById = new Map(extras.map((extra) => [extra.n, extra]));
  const coverageLabel = (coverage?: EditorialCoverage[]) =>
    coverage?.length ? model?.formatCoverage(coverage) || '' : '';

  return groups.flatMap((group) => {
    const destinations = [
      ...(group.links || []),
      ...(group.stores || []),
      ...(group.libraries || [])
    ];
    if (!destinations.length) return [];
    const commonCoverage = coverageLabel(group.coverage);
    // With different destination-specific coverages, label each action instead of
    // suggesting that every URL covers the aggregate shown in the group header.
    const distinctCoverages = destinations.some((destination) => {
      const own = coverageLabel(destination.coverage);
      return own && own !== commonCoverage;
    });
    const cardDestinations = destinations.map((destination) => {
      // An explicit null on a destination intentionally suppresses the inherited Extra target.
      const extraId =
        model?.resolveExtraId(group, destination) ??
        (Object.prototype.hasOwnProperty.call(destination, 'extraTarget')
          ? destination.extraTarget
          : null);
      const extra = extraId != null ? extrasById.get(extraId) : undefined;
      const specificCoverage = coverageLabel(destination.coverage);
      return {
        label: destination.label,
        url: destination.url,
        coverageLabel: distinctCoverages
          ? specificCoverage || commonCoverage
          : specificCoverage && specificCoverage !== commonCoverage
            ? specificCoverage
            : '',
        extraTarget: extra ? extraAnchorKey(extra) : null
      };
    });
    const directIds = (group.targets || []).flatMap((target) =>
      target.kind === 'items' ? target.ids : []
    );
    const extraIds = (group.targets || []).flatMap((target) =>
      target.kind === 'extra' ? extrasById.get(target.id)?.itemIds || [] : []
    );
    const historicalTargets = (group.targets || []).filter(
      (target) => target.kind === 'historical'
    );
    const historicalIds = Object.entries(itemsById)
      .filter(
        ([, item]) =>
          item.type === 'Principal' &&
          item.historicalNumber != null &&
          historicalTargets.some(
            (target) =>
              target.kind === 'historical' &&
              target.ranges.some(
                (range) =>
                  item.historicalNumber! >= range.start && item.historicalNumber! <= range.end
              )
          )
      )
      .map(([id]) => Number(id));
    const issueNames = [...new Set([...directIds, ...extraIds, ...historicalIds])]
      .map((id) => itemsById[id])
      .filter(Boolean)
      .map((item) => `${item.series} ${item.issue}`);
    const name = group.title || 'Link editorial';
    return [
      {
        key: group.id,
        name,
        coverageLabel: distinctCoverages ? '' : commonCoverage,
        destinations: cardDestinations,
        searchText: normalizeText(
          [
            name,
            commonCoverage,
            ...cardDestinations.flatMap((destination) => [
              destination.label,
              destination.url,
              destination.coverageLabel
            ]),
            ...issueNames,
            ...(group.targets || []).flatMap((target) =>
              target.kind === 'cloneArc' ? [target.id] : []
            ),
            group.notes,
            group.context
          ].join(' ')
        )
      }
    ];
  });
}

/** Legacy display labels remain untouched in the source catalog and URLs. */
export function destinationActionLabel(label: string): string {
  const generic = /^link\s*\[([^\]]+)\]$/i.exec(label.trim());
  return generic ? generic[1].trim() : label;
}
