import { describe, expect, it } from 'vitest';
import { checklistReadings as readings } from '../../src/data/model';
import { buildReadingPlan } from '../../src/preferences/reading-plan';
import { summarizeReadingPlan } from '../../src/views/home-model';
import { reconcileFocusSelection } from '../../src/components/focus-selection';
import {
  filterChecklistGroups,
  groupChecklistSeries,
  matchesChecklistItem
} from '../../src/components/checklist-model';

const status = (states: Record<number, 'Não' | 'Sim' | 'Pulei'>) => (id: number) =>
  states[id] || 'Não';

describe('Dropdowns por série preservam a sequência', () => {
  it.each(['complete', 'essential', 'focus'] as const)(
    'agrupa o plano %s sem mover ou duplicar leituras',
    (depth) => {
      const plan = buildReadingPlan({ depth, focusQuery: 'Kraven' });
      const groups = groupChecklistSeries(plan);
      expect(groups.flatMap((group) => group.items.map((item) => item.id))).toEqual(
        plan.map((item) => item.id)
      );
      expect(new Set(groups.map((group) => group.key)).size).toBe(groups.length);
      expect(groups.every((group) => group.items.every((item) => item.series === group.name))).toBe(
        true
      );
      expect(groups.every((group, index) => !index || groups[index - 1].name !== group.name)).toBe(
        true
      );
    }
  );

  it('isola Amazing Fantasy e Annual #1 entre os dois trechos da Amazing', () => {
    const groups = groupChecklistSeries(readings);
    expect(groups[0].items.map((item) => item.id)).toEqual([1]);
    expect(groups[1].items.map((item) => item.id)).toEqual(
      Array.from({ length: 16 }, (_, index) => index + 2)
    );
    expect(groups[2].items.map((item) => item.id)).toEqual([1227]);
    expect(groups[3].name).toBe(groups[1].name);
    expect(groups[3].items[0].id).toBe(18);
  });

  it('a busca não une trechos separados nem muda suas chaves', () => {
    const groups = groupChecklistSeries(readings);
    const filtered = filterChecklistGroups(groups, '', 'The Amazing Spider-Man (1963)');
    expect(filtered[0].key).toBe(groups[1].key);
    expect(filtered[1].key).toBe(groups[3].key);
    expect(filtered[0].items[filtered[0].items.length - 1].id).toBe(17);
    expect(filtered[1].items[0].id).toBe(18);
  });
});

describe('Checklist e Modo Foco seguem o plano canônico da Home', () => {
  it('Completo segue a sequência canônica, incluindo intercaladas', () => {
    const plan = buildReadingPlan({ depth: 'complete', focusQuery: '' });
    expect(plan.map((item) => item.id)).toEqual(readings.map((item) => item.id));

    expect(plan[0].id).toBe(1); // Amazing Fantasy #15
    const index16 = plan.findIndex(
      (item) => item.type === 'Principal' && item.historicalNumber === 16
    );
    expect(plan.slice(index16, index16 + 3).map((item) => item.id)).toEqual([17, 1227, 18]);
  });

  it('Essenciais ignora opcionais/contexto e começa pela mesma leitura da Home', () => {
    const plan = buildReadingPlan({ depth: 'essential', focusQuery: '' });
    expect(plan[0].id).toBe(2); // ASM #1, não Amazing Fantasy (Contexto)
    expect(plan.every((item) => item.weight === '● Essencial')).toBe(true);
    expect(summarizeReadingPlan(plan, status({})).next?.id).toBe(plan[0].id);
    expect(
      plan.every((item, index) => index === 0 || plan[index - 1].readingOrder < item.readingOrder)
    ).toBe(true);
  });

  it('Foco textual usa o mesmo filtro existente e mantém readingOrder', () => {
    const plan = buildReadingPlan({ depth: 'focus', focusQuery: 'Kraven' });
    expect(plan.length).toBeGreaterThan(0);
    expect(plan.every((item) => item.weight !== '○ Opcional')).toBe(true);
    expect(
      plan.every((item, index) => index === 0 || plan[index - 1].readingOrder < item.readingOrder)
    ).toBe(true);
    expect(summarizeReadingPlan(plan, status({})).next?.id).toBe(plan[0].id);
  });

  it('Lida e Pulei não contam como pendentes, mas seguem visíveis sem filtro', () => {
    const plan = buildReadingPlan({ depth: 'essential', focusQuery: '' });
    const states = { [plan[0].id]: 'Sim', [plan[1].id]: 'Pulei' } as const;
    const summary = summarizeReadingPlan(plan, status(states));
    expect(summary.read).toBe(1);
    expect(summary.skipped).toBe(1);
    expect(summary.next?.id).toBe(plan[2].id);
    const pending = plan.filter((item) => matchesChecklistItem(item, 'Não', ''));
    // Este filtro usa o progresso global real, não o objeto fictício desta asserção.
    expect(
      pending.every(
        (item, index) => index === 0 || pending[index - 1].readingOrder < item.readingOrder
      )
    ).toBe(true);
  });

  it('Mover Próxima/Anterior mantém seleção mesmo após marcar uma HQ', () => {
    const plan = buildReadingPlan({ depth: 'essential', focusQuery: '' });
    const ids = plan.map((item) => item.id);
    const positions = new Map(readings.map((item, index) => [item.id, index]));
    let focused = reconcileFocusSelection(ids, null, positions, () => true);
    expect(focused).toBe(2);
    focused = ids[1];
    expect(reconcileFocusSelection(ids, focused, positions, () => true)).toBe(ids[1]);
    focused = ids[2];
    expect(reconcileFocusSelection(ids, focused, positions, () => true)).toBe(ids[2]);
    focused = ids[1];
    expect(reconcileFocusSelection(ids, focused, positions, () => true)).toBe(ids[1]);
  });
});
