import type { SpoilerVisibility } from './model';
import { canPersistLocalChange } from '../reset/reset-guard';

export const SPOILER_LEVEL_KEY = 'aranha-spoiler-level-v1';
export const LEGACY_CONSENT_KEYS = [
  'aranha-spoiler-consent-extras-v2',
  'aranha-spoiler-consent-links-v1',
  'aranha-spoiler-consent-jornada-v2'
] as const;
const VALID_LEVELS = new Set<SpoilerVisibility>(['nenhum', 'leve', 'tudo']);
type Listener = () => void;
const listeners = new Set<Listener>();

function storageGet(key: string) {
  try { return localStorage.getItem(key); } catch { return null; }
}
function storageSet(key: string, value: string) {
  if (!canPersistLocalChange()) return;
  try { localStorage.setItem(key, value); } catch { /* localStorage indisponível */ }
}

function initialLevel(): SpoilerVisibility {
  const stored = storageGet(SPOILER_LEVEL_KEY) as SpoilerVisibility | null;
  if (stored && VALID_LEVELS.has(stored)) return stored;

  // Migração única e conservadora: consentimento antigo permitia entrar nas áreas,
  // mas os trechos fortes continuavam ocultos. "leve" é o equivalente mais próximo.
  const hadLegacyConsent = LEGACY_CONSENT_KEYS.some(key => storageGet(key) === '1');
  const migrated: SpoilerVisibility = hadLegacyConsent ? 'leve' : 'nenhum';
  storageSet(SPOILER_LEVEL_KEY, migrated);
  return migrated;
}

let currentLevel: SpoilerVisibility | null = null;
const ensureLoaded = () => (currentLevel ??= initialLevel());

export const spoilerPreferences = {
  get(): SpoilerVisibility {
    return ensureLoaded();
  },
  set(level: SpoilerVisibility) {
    if (!VALID_LEVELS.has(level) || ensureLoaded() === level) return;
    currentLevel = level;
    storageSet(SPOILER_LEVEL_KEY, level);
    for (const listener of listeners) listener();
  },
  resetInMemory() {
    currentLevel = 'nenhum';
    for (const listener of listeners) listener();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }
};
