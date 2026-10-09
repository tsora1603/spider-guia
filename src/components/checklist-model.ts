import type { ChecklistGroup, Reading } from '../data/model';
import { normalizeText } from '../data/model';
import { statusOf } from '../state/progress-store';

export type ChecklistFilterValue = '' | 'Não' | 'Sim' | 'Pulei' | 'ess';

/** Agrupa apenas séries consecutivas: anuais e crossovers mantêm sua posição. */
export function groupChecklistSeries(items: readonly Reading[]): ChecklistGroup[] {
  const groups: ChecklistGroup[] = [];
  for (const item of items) {
    const previous = groups[groups.length - 1];
    if (previous?.name === item.series) previous.items.push(item);
    else groups.push({ key: `series-${item.id}`, name: item.series, items: [item] });
  }
  return groups;
}

export function matchesChecklistItem(item: Reading, filter: ChecklistFilterValue, query: string) {
  const matchesFilter =
    !filter ||
    (filter === 'ess' ? item.weight === '● Essencial' : statusOf(item.id) === filter);
  const needle = normalizeText(query);
  return matchesFilter && (!needle || item.searchText.includes(needle));
}

export function filterChecklistGroups(groups: readonly ChecklistGroup[], filter: ChecklistFilterValue, query: string) {
  return groups
    .map(group => ({ ...group, items: group.items.filter(item => matchesChecklistItem(item, filter, query)) }))
    .filter(group => group.items.length > 0);
}

export function findGroupIndexForItem(groups: readonly ChecklistGroup[], itemId: number) {
  return groups.findIndex(group => group.items.some(item => item.id === itemId));
}

export interface VirtualWindow {
  start: number;
  end: number;
  top: number;
  bottom: number;
  total: number;
}

export function computeVirtualWindow(
  heights: readonly number[],
  scrollTop: number,
  viewportHeight: number,
  overscan = 700
): VirtualWindow {
  if (!heights.length) return { start: 0, end: 0, top: 0, bottom: 0, total: 0 };
  const lower = Math.max(0, scrollTop - overscan);
  const upper = scrollTop + viewportHeight + overscan;
  let cursor = 0;
  let start = 0;
  while (start < heights.length && cursor + heights[start] < lower) {
    cursor += heights[start];
    start += 1;
  }
  const top = cursor;
  let end = start;
  while (end < heights.length && cursor < upper) {
    cursor += heights[end];
    end += 1;
  }
  const total = heights.reduce((sum, height) => sum + height, 0);
  return { start, end, top, bottom: Math.max(0, total - cursor), total };
}
