import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  CatalogPhaseSchema,
  ChangelogEntrySchema,
  CloneSchema,
  ExtraSchema,
  EditorialMetaSchema,
  FaseSchema,
  GlossaryEntrySchema,
  MarcoSchema,
  MethodologyEntrySchema,
  SkipRuleSchema,
  SourceSchema
} from '../../data/schema.mjs';

const ROOT = process.cwd();
const readJson = async (relativePath: string) =>
  JSON.parse(await readFile(path.join(ROOT, relativePath), 'utf8'));

describe('schemas Zod dos dados canônicos', () => {
  it('valida os arquivos declarados no manifesto e preserva IDs únicos', async () => {
    const catalogDir = path.join(ROOT, 'data/src/catalog');
    const files = (await readdir(catalogDir)).filter((file) => file.endsWith('.json')).sort();
    const manifest = await readJson('data/src/manifest.json');
    expect(files).toEqual(manifest.catalogFiles.map((file: string) => path.basename(file)).sort());

    const ids: number[] = [];
    for (const file of files) {
      const phase = CatalogPhaseSchema.parse(
        JSON.parse(await readFile(path.join(catalogDir, file), 'utf8'))
      );
      ids.push(...phase.items.map((item: { id: number }) => item.id));
    }

    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort((a, b) => a - b)).toEqual(
      (await readJson('data/snapshots/item-ids.json')).sort((a: number, b: number) => a - b)
    );
  });

  it('valida os tipos editoriais completos', async () => {
    const [extras, clone, phases, milestones, skip, sources, glossary, methodology, changelog] =
      await Promise.all([
        readJson('data/src/editorial/extras.json'),
        readJson('data/src/editorial/clone.json'),
        readJson('data/src/fases.json'),
        readJson('data/src/marcos.json'),
        readJson('data/src/pular.json'),
        readJson('data/src/fontes.json'),
        readJson('data/src/glossario.json'),
        readJson('data/src/editorial/metodologia.json'),
        readJson('data/src/editorial/changelog.json')
      ]);

    expect(ExtraSchema.array().parse(extras)).toEqual(extras);
    const cloneEntries = CloneSchema.parse(clone).entries;
    expect(cloneEntries.length).toBeGreaterThan(0);
    expect(cloneEntries.every((entry) => entry.confirmation === 'Confirmado')).toBe(true);
    expect(
      cloneEntries.every((entry) => entry.confirmationCriteria.position === 'source-only')
    ).toBe(true);
    expect(cloneEntries.every((entry) => entry.sources.length > 0)).toBe(true);
    expect(FaseSchema.array().parse(phases).length).toBeGreaterThan(0);
    expect(MarcoSchema.array().parse(milestones).length).toBeGreaterThan(0);
    expect(SkipRuleSchema.array().parse(skip).length).toBeGreaterThan(0);
    expect(SourceSchema.array().parse(sources)).toEqual(sources);
    expect(GlossaryEntrySchema.array().parse(glossary).length).toBeGreaterThan(0);
    expect(MethodologyEntrySchema.array().parse(methodology).length).toBeGreaterThan(0);
    expect(ChangelogEntrySchema.array().parse(changelog).length).toBeGreaterThan(0);
    expect(
      EditorialMetaSchema.parse(await readJson('data/src/editorial/meta.json')).editorialVersion
    ).toBeGreaterThanOrEqual(5);
  });

  it('rejeita Confirmado quando posição ou peso não passam pelos dois critérios', async () => {
    const extras = await readJson('data/src/editorial/extras.json');
    const confirmed = extras.find((extra: any) => extra.confirmation === 'Confirmado');
    expect(confirmed).toBeTruthy();
    expect(
      ExtraSchema.safeParse({
        ...confirmed,
        confirmationCriteria: { ...confirmed.confirmationCriteria, position: 'not-met' }
      }).success
    ).toBe(false);
    expect(
      ExtraSchema.safeParse({
        ...confirmed,
        confirmationCriteria: { ...confirmed.confirmationCriteria, weight: 'not-met' }
      }).success
    ).toBe(false);
  });

  it('rejeita confirmação da Saga do Clone quando a posição não é 100% documental', async () => {
    const clone = await readJson('data/src/editorial/clone.json');
    const entry = clone.entries[0];
    expect(
      CloneSchema.safeParse({
        entries: [
          {
            ...entry,
            confirmationCriteria: { ...entry.confirmationCriteria, position: 'not-met' }
          }
        ]
      }).success
    ).toBe(false);
  });

  it('rejeita item com readingOrder inválido', () => {
    const invalid = {
      phase: 'Teste',
      items: [
        {
          id: 1,
          historicalNumber: 1,
          type: 'Principal',
          series: 'Teste',
          issue: '1',
          phase: 'Teste',
          weight: '● Essencial',
          instructions: '',
          readingOrder: 0,
          note: ''
        }
      ]
    };
    expect(CatalogPhaseSchema.safeParse(invalid).success).toBe(false);
  });
});
