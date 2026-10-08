import { describe, expect, it } from 'vitest';
import { checklistGroups } from '../../src/data/model';
import { buildReadingPlan } from '../../src/preferences/reading-plan';
import { readingPreferences } from '../../src/preferences/reading-preferences';
import {
  buildBulkPreview,
  selectBulkItems,
  type BulkSelection
} from '../../src/progress/bulk-progress';
import type { ProgressStatus } from '../../src/state/types';

describe('ações de progresso em lote', () => {
  it('Plano atual respeita a mesma seleção da Home', () => {
    const result = selectBulkItems({ kind: 'plan' });
    expect(result.error).toBe('');
    expect(result.items.map(item => item.id)).toEqual(buildReadingPlan(readingPreferences.get()).map(item => item.id));
  });
  it('seleciona uma fase/arco inteiro sem alterar a ordem canônica', () => {
    const group = checklistGroups.find(candidate => candidate.name === 'Lee e Ditko') || checklistGroups[0];
    const result = selectBulkItems({ kind: 'group', groupKey: group.key });

    expect(result.error).toBe('');
    expect(result.items.map(item => item.id)).toEqual(group.items.map(item => item.id));
    expect(result.items.every((item, index, all) => index === 0 || all[index - 1].readingOrder < item.readingOrder)).toBe(true);
  });

  it('"tudo até aqui" usa readingOrder e inclui a leitura intercalada inicial', () => {
    const result = selectBulkItems({ kind: 'through', itemId: 6 });

    expect(result.error).toBe('');
    expect(result.items.map(item => item.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('intervalo histórico inclui extras realmente posicionadas entre os limites', () => {
    const result = selectBulkItems({ kind: 'range', startHistorical: 16, endHistorical: 17 });

    expect(result.error).toBe('');
    expect(result.items.map(item => item.id)).toEqual([17, 1227, 18]);
  });

  it('pré-visualiza apenas o que de fato mudará', () => {
    const selection: BulkSelection = { kind: 'through', itemId: 6 };
    const states: Record<number, ProgressStatus> = { 1: 'Sim', 2: 'Pulei', 3: 'Não', 4: 'Sim', 5: 'Não', 6: 'Não' };
    const preview = buildBulkPreview(selection, 'Sim', id => states[id] || 'Não');

    expect(preview.total).toBe(6);
    expect(preview.changed).toBe(4);
    expect(preview.alreadyTarget).toBe(2);
    expect(preview.skipped).toBe(1);
    expect(preview.pending).toBe(3);
    expect(preview.changedItems.map(item => item.id)).toEqual([2, 3, 5, 6]);
  });

  it('rejeita intervalos fora da numeração histórica suportada', () => {
    const result = selectBulkItems({ kind: 'range', startHistorical: 0, endHistorical: 10 });
    expect(result.items).toEqual([]);
    expect(result.error).toMatch(/#1 e #1000/);
  });
});
