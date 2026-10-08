import { useEffect, useState } from 'preact/hooks';
import { readingPreferences } from './reading-preferences';

export function useReadingPreferences() {
  const [preferences, setPreferences] = useState(readingPreferences.get);
  useEffect(() => readingPreferences.subscribe(() => setPreferences(readingPreferences.get())), []);
  return preferences;
}
