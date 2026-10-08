import { canPersistLocalChange } from '../reset/reset-guard';

export type ReadingDepth = 'complete' | 'essential' | 'focus';

export interface ReadingPreferences {
  version: 1;
  onboardingComplete: boolean;
  depth: ReadingDepth;
  focusQuery: string;
  readThrough: number;
}

export const READING_PREFERENCES_KEY = 'aranha-reading-preferences-v1';

const DEFAULT_PREFERENCES: ReadingPreferences = {
  version: 1,
  onboardingComplete: false,
  depth: 'essential',
  focusQuery: '',
  readThrough: 0
};

const listeners = new Set<() => void>();
const validDepths = new Set<ReadingDepth>(['complete', 'essential', 'focus']);

const clampReadThrough = (value: unknown) => {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(1000, Math.trunc(number)));
};

export function normalizeReadingPreferences(value: unknown): ReadingPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_PREFERENCES };
  const candidate = value as Partial<ReadingPreferences>;
  const depth = validDepths.has(candidate.depth as ReadingDepth) ? (candidate.depth as ReadingDepth) : 'essential';
  const focusQuery = typeof candidate.focusQuery === 'string' ? candidate.focusQuery.trim().slice(0, 120) : '';
  return {
    version: 1,
    onboardingComplete: candidate.onboardingComplete === true,
    depth: depth === 'focus' && !focusQuery ? 'essential' : depth,
    focusQuery,
    readThrough: clampReadThrough(candidate.readThrough)
  };
}

function readStored() {
  try {
    const raw = localStorage.getItem(READING_PREFERENCES_KEY);
    return raw ? normalizeReadingPreferences(JSON.parse(raw)) : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function writeStored(next: ReadingPreferences) {
  if (!canPersistLocalChange()) return;
  try {
    localStorage.setItem(READING_PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // O guia continua funcional com os padrões quando o storage está indisponível.
  }
}

export const readingPreferences = {
  get(): ReadingPreferences {
    return readStored();
  },

  set(value: Partial<ReadingPreferences>) {
    const next = normalizeReadingPreferences({ ...this.get(), ...value, version: 1 });
    writeStored(next);
    for (const listener of listeners) listener();
    return next;
  },

  notifyReset() {
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

export const readingDepthName = (preferences: Pick<ReadingPreferences, 'depth' | 'focusQuery'>) => {
  if (preferences.depth === 'complete') return 'Completo';
  if (preferences.depth === 'focus') return preferences.focusQuery ? `Foco: ${preferences.focusQuery}` : 'Foco';
  return 'Essenciais';
};
