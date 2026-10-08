import { useEffect, useState } from 'preact/hooks';
import { cachedReadingDetails, itemsById, loadReadingDetails, type Reading } from './model';

export function useReadingDetails(id: number | null | undefined, enabled = true) {
  const initial = id == null ? null : cachedReadingDetails(id) || itemsById[id] || null;
  const [item, setItem] = useState<Reading | null>(initial);
  const [loading, setLoading] = useState(Boolean(id != null && enabled && !cachedReadingDetails(id)));
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let active = true;
    if (id == null) {
      setItem(null);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }
    const cached = cachedReadingDetails(id);
    setItem(cached || itemsById[id] || null);
    if (!enabled || cached) {
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }
    setLoading(true);
    setError(null);
    loadReadingDetails(id).then(result => {
      if (!active) return;
      setItem(result);
      setLoading(false);
    }).catch(reason => {
      if (!active) return;
      setError(reason instanceof Error ? reason : new Error(String(reason)));
      setLoading(false);
    });
    return () => { active = false; };
  }, [id, enabled]);

  return { item, loading, error };
}
