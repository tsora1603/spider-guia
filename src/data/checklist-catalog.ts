import type { Reading } from './model';
import type { CloneGuide } from '../clone-guide/model';

/** Mantém as HQs históricas no registro de IDs, mas só os volumes na sequência operacional. */
export function createChecklistCatalog(catalog: readonly Reading[], guide: CloneGuide) {
  const base = guide.sections[0].steps;
  const byId = new Map(catalog.map((item) => [item.id, item]));
  const coveredBy = new Map<number, number[]>();
  const anchor = Math.min(
    ...base.flatMap((step) => step.itemIds.map((id) => byId.get(id)!.readingOrder))
  );
  const volumeIds = new Set<number>();
  const volumes: Reading[] = base.map((step, index) => {
    const id = step.checklistId;
    if (!id || byId.has(id) || volumeIds.has(id))
      throw new Error(`ID de volume inválido: ${step.id}`);
    volumeIds.add(id);
    for (const sourceId of step.itemIds) {
      if (!byId.has(sourceId)) throw new Error(`HQ desconhecida no volume ${step.id}: ${sourceId}`);
      const owners = coveredBy.get(sourceId) || [];
      coveredBy.set(sourceId, [...owners, id]);
    }
    return {
      id,
      historicalNumber: null,
      type: 'Volume Panini',
      series: index < 18 ? 'A Saga do Clone (Panini)' : 'A Saga do Clone — Ben Reilly (Panini)',
      issue: `#${index < 18 ? index + 1 : 1}`,
      phase: 'Saga do Clone · volumes Panini',
      weight: '● Essencial',
      notes: `${step.read}${step.note ? `\n${step.note}` : ''}`,
      extraNote: '',
      readingOrder: anchor - 0.5 + index / 100,
      searchText:
        `${step.title} ${step.edition} saga do clone panini ${step.originals.join(' ')} ${step.itemIds.map((sourceId) => byId.get(sourceId)!.searchText).join(' ')}`
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase(),
      detailsLoaded: true,
      guideStepId: step.id,
      sourceItemIds: [...step.itemIds]
    };
  });
  const registry = [...catalog, ...volumes].sort((a, b) => a.readingOrder - b.readingOrder);
  const sequence = registry.filter((item) => !coveredBy.has(item.id));
  const projectIds = (ids: readonly number[]) => [
    ...new Set(ids.flatMap((id) => coveredBy.get(id) || [id]))
  ];
  const resolveId = (id: number) => coveredBy.get(id)?.[0] || id;
  return { registry, sequence, volumes, coveredBy, projectIds, resolveId };
}
