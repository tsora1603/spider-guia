import { useEffect, useState } from 'preact/hooks';
import { designPreferences } from './preferences';

export function useDesignPreferences() {
  const [preferences, setPreferences] = useState(designPreferences.get);
  useEffect(() => designPreferences.subscribe(() => setPreferences(designPreferences.get())), []);
  return preferences;
}
