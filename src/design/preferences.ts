import { canPersistLocalChange } from '../reset/reset-guard';

export type ThemePreference = 'auto' | 'dark' | 'light';
export type FontScale = 'compact' | 'default' | 'large';

export interface DesignPreferences {
  version: 1;
  theme: ThemePreference;
  fontScale: FontScale;
  focusMode: boolean;
}

export const DESIGN_PREFERENCES_KEY = 'aranha-design-preferences-v1';

const DEFAULT_PREFERENCES: DesignPreferences = {
  version: 1,
  theme: 'auto',
  fontScale: 'default',
  focusMode: false
};

const themes = new Set<ThemePreference>(['auto', 'dark', 'light']);
const scales = new Set<FontScale>(['compact', 'default', 'large']);
const listeners = new Set<() => void>();
let mediaQuery: MediaQueryList | null = null;
let mediaListenerAttached = false;

export function normalizeDesignPreferences(value: unknown): DesignPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ...DEFAULT_PREFERENCES };
  const candidate = value as Partial<DesignPreferences>;
  return {
    version: 1,
    theme: themes.has(candidate.theme as ThemePreference) ? candidate.theme as ThemePreference : 'auto',
    fontScale: scales.has(candidate.fontScale as FontScale) ? candidate.fontScale as FontScale : 'default',
    focusMode: candidate.focusMode === true
  };
}

function readStored(): DesignPreferences {
  try {
    const raw = localStorage.getItem(DESIGN_PREFERENCES_KEY);
    return raw ? normalizeDesignPreferences(JSON.parse(raw)) : { ...DEFAULT_PREFERENCES };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function writeStored(next: DesignPreferences) {
  if (!canPersistLocalChange()) return;
  try {
    localStorage.setItem(DESIGN_PREFERENCES_KEY, JSON.stringify(next));
  } catch {
    // Preferências visuais continuam funcionais durante a sessão quando storage falha.
  }
}

export function resolveTheme(theme: ThemePreference, systemDark: boolean): 'dark' | 'light' {
  return theme === 'auto' ? (systemDark ? 'dark' : 'light') : theme;
}

export function applyDesignPreferences(preferences = readStored()) {
  if (typeof document === 'undefined') return preferences;
  const systemDark = typeof matchMedia === 'function' ? matchMedia('(prefers-color-scheme: dark)').matches : true;
  document.documentElement.dataset.theme = resolveTheme(preferences.theme, systemDark);
  document.documentElement.dataset.themePreference = preferences.theme;
  document.documentElement.dataset.fontScale = preferences.fontScale;
  document.documentElement.dataset.focusMode = preferences.focusMode ? 'on' : 'off';
  return preferences;
}

function ensureSystemThemeListener() {
  if (typeof matchMedia !== 'function' || mediaListenerAttached) return;
  mediaQuery = matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', () => {
    const current = readStored();
    if (current.theme === 'auto') {
      applyDesignPreferences(current);
      for (const listener of listeners) listener();
    }
  });
  mediaListenerAttached = true;
}

export const designPreferences = {
  get(): DesignPreferences {
    return readStored();
  },

  set(value: Partial<DesignPreferences>) {
    const next = normalizeDesignPreferences({ ...this.get(), ...value, version: 1 });
    writeStored(next);
    applyDesignPreferences(next);
    for (const listener of listeners) listener();
    return next;
  },

  resetInMemory() {
    applyDesignPreferences({ ...DEFAULT_PREFERENCES });
    for (const listener of listeners) listener();
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  initialize() {
    ensureSystemThemeListener();
    return applyDesignPreferences();
  }
};
