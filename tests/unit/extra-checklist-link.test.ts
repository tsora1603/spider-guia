import { describe, expect, it } from 'vitest';
import { editorialExtras, extraEditorialByItemId, readings } from '../../src/data/model';
import { extraAnchorKey, exploreTarget, resolveExtraTargetIndex } from '../../src/views/explore-navigation';

describe('Checklist → ficha editorial de Extras', () => {
  const outsideLine = readings.filter(item => item.type === 'Leitura fora da linha');

  it('utiliza apenas associações explícitas, sem inventar fichas para HQs sem destino', () => {
    const expectedLinks = new Map<number, unknown>();
    for (const entry of editorialExtras) {
      for (const id of entry.itemIds || []) {
        const reading = outsideLine.find(item => item.id === id);
        if (!reading) continue;
        expect(expectedLinks.has(id)).toBe(false);
        expectedLinks.set(id, entry);
      }
    }
    expect(expectedLinks.size).toBeGreaterThan(0);
    expect(outsideLine.some(item => !expectedLinks.has(item.id))).toBe(true);
    for (const item of outsideLine) {
      expect(extraEditorialByItemId[item.id]).toBe(expectedLinks.get(item.id));
    }
  });

  it('resolve a entrada exata, inclusive quando um Extra reúne várias HQs', () => {
    const multiIssueExtra = editorialExtras.find((extra: any) =>
      (extra.itemIds || []).length > 1 && (extra.itemIds || []).some((id: number) =>
        outsideLine.some(item => item.id === id)
      )
    );
    expect(multiIssueExtra).toBeTruthy();
    for (const item of outsideLine.filter(item => Boolean(extraEditorialByItemId[item.id]))) {
      const extra = extraEditorialByItemId[item.id];
      const key = extraAnchorKey(extra);
      const index = resolveExtraTargetIndex(key, editorialExtras);
      expect(index).not.toBeNull();
      expect(editorialExtras[index!]).toBe(extra);
      expect(exploreTarget('extras', 'extra', key)).toContain('#explorar/extras?extra=');
    }
  });
});
