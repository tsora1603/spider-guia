import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { CatalogPhaseSchema, EditorialLinkGroupSchema, ExtraSchema } from '../../data/schema.mjs';
import { validateEditorialLinks } from '../../data/link-model.mjs';
import type { EditorialLinkGroup } from '../../src/links/types';

const load = (file: string) => JSON.parse(readFileSync(file, 'utf8'));
const manifest = load('data/src/manifest.json');
const items = manifest.catalogFiles.flatMap(
  (file: string) => CatalogPhaseSchema.parse(load(`data/src/${file}`)).items
);
const extras = ExtraSchema.array().parse(load('data/src/editorial/extras.json'));
const links = EditorialLinkGroupSchema.array().parse(load('data/src/editorial/links.json'));
const evidence = load('data/src/editorial/publication-evidence.json');
const sources = load('data/src/fontes.json');

describe('Etapa 4 — migração editorial sem mudança de conteúdo', () => {
  it('mantém catálogo, IDs e ordem; não exporta campo brasileiro obsoleto', () => {
    expect(items).toHaveLength(1301);
    expect(
      items
        .map((item: { readingOrder: number }) => item.readingOrder)
        .sort((a: number, b: number) => a - b)
    ).toEqual(Array.from({ length: 1301 }, (_, i) => i + 1));
    expect(
      items.every((item: object) => !Object.prototype.hasOwnProperty.call(item, 'brazilianEdition'))
    ).toBe(true);
    expect(
      extras.every(
        (item: object) => !Object.prototype.hasOwnProperty.call(item, 'brazilianEdition')
      )
    ).toBe(true);
    const runtime = load('src/data/generated-index.json');
    expect(runtime.itemIndexFields).not.toContain('brazilianEdition');
    expect(JSON.stringify(runtime.editorial)).not.toContain('brazilianEdition');
    expect(runtime.catalogLookup.bySeries).toBeTruthy();
  });

  it('preserva as fontes e evidências fora dos dados enviados ao navegador', () => {
    expect(sources).toHaveLength(166);
    expect(evidence).toHaveLength(21);
    expect(
      evidence.every(
        (entry: {
          subject: { type: string; id: number };
          citation: string;
          sourceRefs?: number[];
        }) =>
          Boolean(entry.citation) &&
          (entry.subject.type === 'extra'
            ? extras.some((extra: { n: number }) => extra.n === entry.subject.id)
            : items.some((item: { id: number }) => item.id === entry.subject.id)) &&
          (entry.sourceRefs || []).every(
            (id) => Number.isInteger(id) && id >= 0 && id < sources.length
          )
      )
    ).toBe(true);
    expect(JSON.stringify(load('src/data/generated-index.json'))).not.toContain(
      'publication-evidence'
    );
  });

  it('preserva cobertura, URLs e vínculos determinísticos da Etapa 3', () => {
    expect(links).toHaveLength(34);
    expect(
      links.flatMap((group: { links: unknown[]; stores?: unknown[]; libraries?: unknown[] }) => [
        ...group.links,
        ...(group.stores || []),
        ...(group.libraries || [])
      ])
    ).toHaveLength(36);
    expect(
      validateEditorialLinks(links as EditorialLinkGroup[], {
        knownItemIds: new Set(items.map((item: { id: number }) => item.id)),
        extras: extras as unknown as Array<{ n: number; readingGroup?: number; itemIds?: number[] }>
      })
    ).toEqual([]);
    const output = load('src/data/generated-index.json').editorial.links;
    expect(output).toEqual(links);
  });
});
