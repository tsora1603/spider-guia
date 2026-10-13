import { describe, expect, it, beforeEach } from 'vitest';
import {
  catalogReadings,
  checklistReadings,
  readings,
  paniniVolumes,
  coveredByPanini,
  resolveChecklistId,
  projectChecklistIds,
  cloneGuide
} from '../../src/data/model';
import { buildReadingPlan } from '../../src/preferences/reading-plan';
import { createChecklistCatalog } from '../../src/data/checklist-catalog';
import { progressStore, statusOf } from '../../src/state/progress-store';
import { appState } from '../../src/state/app-state';
import { createLinkAssociations, linkTargetsFor } from '../../src/links/associations';
import { readThroughSelection } from '../../src/progress/read-through';
import { selectBulkItems } from '../../src/progress/bulk-progress';

describe('Checklist com volumes Panini e referências históricas preservadas', () => {
  beforeEach(() => {
    appState.progress = {};
    appState.progressMeta = {};
    appState.readingLog = {};
  });
  it('substitui somente as 84 HQs cobertas por 19 volumes unitários e consecutivos', () => {
    expect(catalogReadings).toHaveLength(1301);
    expect(paniniVolumes).toHaveLength(19);
    expect(readings).toHaveLength(1320);
    expect(checklistReadings).toHaveLength(1236);
    expect(coveredByPanini.size).toBe(84);
    const first = checklistReadings.findIndex((item) => item.id === 1302);
    expect(checklistReadings.slice(first, first + 19).map((item) => item.id)).toEqual(
      Array.from({ length: 19 }, (_, index) => 1302 + index)
    );
    expect(checklistReadings[first + 19].id).toBe(492); // Cyberwar
    expect(checklistReadings.some((item) => coveredByPanini.has(item.id))).toBe(false);
    expect(buildReadingPlan({ depth: 'complete', focusQuery: '' })).toEqual(checklistReadings);
    expect(new Set(readings.map((item) => item.id)).size).toBe(readings.length);
  });
  it('mantém marcações antigas, sem concluir automaticamente volumes que repartem contos', () => {
    progressStore.set(410, 'Sim', { updatedAt: 100 });
    expect(statusOf(410)).toBe('Sim');
    expect(statusOf(1302)).toBe('Não');
    progressStore.set(1302, 'Sim', { updatedAt: 101 });
    expect(statusOf(1303)).toBe('Não');
    progressStore.set(1312, 'Sim', { updatedAt: 102 }); // volume 11
    expect(statusOf(1315)).toBe('Não'); // volume 14, outros contos dos mesmos especiais
    expect(progressStore.record(410)?.updatedAt).toBe(100);
  });
  it('resolve links antigos e deduplica a cobertura em indicadores', () => {
    expect(resolveChecklistId(410)).toBe(1302);
    expect(projectChecklistIds([410, 410])).toEqual([1302, 1303]);
    expect(resolveChecklistId(492)).toBe(492);
    const focused = buildReadingPlan({ depth: 'focus', focusQuery: 'Amazing 394' });
    expect(focused.some((item) => item.id === 1302)).toBe(true);
    expect(focused.some((item) => item.id === 410)).toBe(false);
  });
  it('herda links somente pela cobertura explícita, sem inventar destinos', () => {
    const groups = [
      {
        id: 'original',
        title: 'Original',
        links: [{ label: 'Ler', url: 'https://example.org/hq' }],
        targets: [{ kind: 'items' as const, ids: [410] }]
      }
    ];
    const associations = createLinkAssociations(groups, readings, []);
    expect(linkTargetsFor(associations, 'item', 1302)).toEqual(['original']);
    expect(linkTargetsFor(associations, 'item', 1303)).toEqual(['original']);
    expect(linkTargetsFor(associations, 'item', 1304)).toEqual([]);
  });
  it('marca histórica não conclui volumes inteiros nem reintroduz HQs cobertas', () => {
    const selection = readThroughSelection(407, checklistReadings, () => 'Não');
    expect(selection.pending.some((item) => item.guideStepId || coveredByPanini.has(item.id))).toBe(
      false
    );
    const range = selectBulkItems({ kind: 'range', startHistorical: 394, endHistorical: 400 });
    expect(range.items).toEqual([]);
    expect(range.error).toContain('volumes Panini');
  });
  it('rejeita colisões de ID antes de montar uma sequência', () => {
    const invalid = structuredClone(cloneGuide);
    invalid.sections[0].steps[0].checklistId = 410;
    expect(() => createChecklistCatalog(catalogReadings, invalid)).toThrow('ID de volume inválido');
  });
});
