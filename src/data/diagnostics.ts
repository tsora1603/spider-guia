import { DATA, readings, editorialExtras, cloneEntries, loadEditorialDetails } from './model';
import { catalogChunkLoaders } from './generated-chunks';
import { validateEditorialLinks } from '../../data/link-model.mjs';
import type { EditorialLinkGroup } from '../links/types';

/** Usa os mesmos chunks do site; só baixa o catálogo completo quando debug=1. */
export async function validateFullData(links: EditorialLinkGroup[]) {
  const [chunks] = await Promise.all([
    Promise.all(Object.values(catalogChunkLoaders).map((loader) => loader())),
    loadEditorialDetails('all')
  ]);
  const fullData = {
    ...DATA,
    itemFields: chunks[0]?.itemFields || [],
    items: chunks.flatMap((chunk) => chunk.items)
  };
  const result = window.SpiderValidator!.validate(fullData, links);
  result.errors.push(
    ...validateEditorialLinks(links, {
      knownItemIds: new Set(readings.map((item) => item.id)),
      extras: editorialExtras,
      cloneArcIds: new Set(cloneEntries.map((entry) => entry.arcId))
    })
  );
  result.ok = result.errors.length === 0;
  return result;
}
