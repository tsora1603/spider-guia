import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CloneGuideSchema } from '../../data/schema.mjs';
import {
  cloneGuideItemIds,
  findCloneGuideStep,
  type CloneGuide
} from '../../src/clone-guide/model';

const guide = JSON.parse(readFileSync('data/src/editorial/clone.json', 'utf8')).guide as CloneGuide;

// Contratos editoriais que impedem voltar aos encadernados ou repetir HQs já cobertas.
describe('guia brasileiro da Saga do Clone', () => {
  it('mantém os 19 volumes inteiros na base e a continuação começa em Cyberwar', () => {
    expect(CloneGuideSchema.safeParse(guide).success).toBe(true);
    const base = guide.sections[0].steps;
    expect(base.map((step) => step.id)).toEqual([
      ...Array.from(
        { length: 18 },
        (_, index) => `panini-saga-${String(index + 1).padStart(2, '0')}`
      ),
      'panini-ben-01'
    ]);
    expect(base.every((step) => step.read === 'Leia o volume inteiro, na ordem do sumário.')).toBe(
      true
    );
    expect(guide.sections[1].steps[0].originals).toEqual([
      'Web of Scarlet Spider #2',
      'Amazing Scarlet Spider #2'
    ]);
    const baseIds = new Set(cloneGuideItemIds([guide.sections[0]]));
    expect(cloneGuideItemIds(guide.sections.slice(1)).filter((id) => baseIds.has(id))).toEqual([]);
    expect(base[15].itemIds).toContain(497); // New Warriors #66 já está no volume 16.
    expect(cloneGuideItemIds(guide.sections.slice(1))).not.toContain(497);
  });

  it('rejeita volumes fora de ordem, passos repetidos e base incompleta', () => {
    const reordered = structuredClone(guide);
    [reordered.sections[0].steps[0], reordered.sections[0].steps[1]] = [
      reordered.sections[0].steps[1],
      reordered.sections[0].steps[0]
    ];
    expect(CloneGuideSchema.safeParse(reordered).success).toBe(false);
    const repeated = structuredClone(guide);
    repeated.sections[1].steps[0].id = repeated.sections[0].steps[0].id;
    expect(CloneGuideSchema.safeParse(repeated).success).toBe(false);
    const reassigned = structuredClone(guide);
    [reassigned.sections[0].steps[0].checklistId, reassigned.sections[0].steps[1].checklistId] = [
      1303, 1302
    ];
    expect(CloneGuideSchema.safeParse(reassigned).success).toBe(false);
    const incomplete = structuredClone(guide);
    incomplete.sections[0].steps.pop();
    expect(CloneGuideSchema.safeParse(incomplete).success).toBe(false);
    expect(CloneGuideSchema.safeParse({ ...guide, sections: [] }).success).toBe(false);
  });

  it('preserva as ressalvas de cortes e não indica volumes excluídos', () => {
    const steps = guide.sections.flatMap((section) => section.steps);
    expect(steps.find((step) => step.itemIds.includes(493))?.complement).toContain('última página');
    expect(steps.find((step) => step.itemIds.includes(514))?.read).toContain('Antologia completa');
    expect(
      guide.notes.find((note) => note.title === 'Venom: Along Came a Spider #1–4')?.body
    ).toContain('omitido');
    expect(JSON.stringify(guide)).not.toMatch(
      /Ben Reilly.{0,30}(?:vol\.?|volume)\s*(?:[2-9]|10|11)\b/i
    );
  });

  it('resolve alvos estáveis e atribui progresso independente aos 19 volumes', () => {
    const found = findCloneGuideStep(guide, 'panini-saga-02');
    expect(found?.section.id).toBe('base');
    expect(found?.step.number).toBe(2);
    expect(findCloneGuideStep(guide, 'inexistente')).toBeNull();
    expect(findCloneGuideStep(guide, null)).toBeNull();
    const ids = cloneGuideItemIds([guide.sections[0]]);
    expect(ids).toEqual(Array.from({ length: 19 }, (_, index) => 1302 + index));
    const catalog = JSON.parse(readFileSync('src/data/generated-index.json', 'utf8'));
    const idIndex = catalog.itemIndexFields.indexOf('id');
    const known = new Set([
      ...catalog.itemIndex.map((row: unknown[]) => Number(row[idIndex])),
      ...ids
    ]);
    expect(cloneGuideItemIds(guide.sections).every((id) => known.has(id))).toBe(true);
  });
});
