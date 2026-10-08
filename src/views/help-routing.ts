/** URL state for the informational Help screens; no new router or storage contract. */
export function helpQueryParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.split('?')[1] || '');
}

/** Keep unrelated route parameters, but remove the previous item when a search changes. */
export function withHelpSearch(hash: string, value: string): string {
  const path = hash.split('?')[0] || '#ajuda';
  const params = helpQueryParams(hash);
  for (const name of ['fonte', 'termo', 'bloco']) params.delete(name);
  if (value.trim()) params.set('q', value);
  else params.delete('q');
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

/** Malformed or out-of-range deep links must never focus nonexistent content. */
export function helpTargetIndex(params: URLSearchParams, key: string, length: number): number | null {
  const raw = params.get(key);
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const value = Number(raw);
  return Number.isSafeInteger(value) && value >= 0 && value < length ? value : null;
}
