import { editorialExtras, milestones, normalizeText, principalReadings, readings, type Reading } from '../data/model';
import type { ReadingPreferences } from './reading-preferences';

const tokens = (query: string) => normalizeText(query).split(/\s+/).filter(Boolean);
const matchesTokens = (value: unknown, queryTokens: string[]) => {
  if (!queryTokens.length) return false;
  const haystack = normalizeText(value);
  return queryTokens.every(token => haystack.includes(token));
};
const searchableValues = (values: unknown[]) => values.map(value => normalizeText(value)).join(' ');

export function focusedReadingIds(query: string) {
  const queryTokens = tokens(query);
  if (!queryTokens.length) return new Set<number>();
  const ids = new Set<number>();

  for (const item of readings) {
    if (matchesTokens(item.searchText, queryTokens)) ids.add(item.id);
  }

  for (const milestone of milestones as any[]) {
    if (!matchesTokens(searchableValues([milestone.title, milestone.description, milestone.whereToRead]), queryTokens)) continue;
    if (!milestone.historicalStart || !milestone.historicalEnd) continue;
    for (const item of principalReadings) {
      const number = Number(item.historicalNumber);
      if (number >= milestone.historicalStart && number <= milestone.historicalEnd) ids.add(item.id);
    }
  }

  for (const extra of editorialExtras as any[]) {
    if (!matchesTokens(searchableValues([extra.name, extra.why, extra.howMuch, extra.category]), queryTokens)) continue;
    for (const id of extra.itemIds || []) ids.add(Number(id));
  }

  return ids;
}

export function buildReadingPlan(preferences: Pick<ReadingPreferences, 'depth' | 'focusQuery'>, source: readonly Reading[] = readings) {
  if (preferences.depth === 'complete') return [...source];
  if (preferences.depth === 'essential') return source.filter(item => item.weight === '● Essencial');
  const ids = focusedReadingIds(preferences.focusQuery);
  return source.filter(item => ids.has(item.id) && item.weight !== '○ Opcional');
}
