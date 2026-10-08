import { beforeEach, describe, expect, it } from 'vitest';
import { DESIGN_PREFERENCES_KEY, designPreferences, normalizeDesignPreferences, resolveTheme } from '../../src/design/preferences';

const memory = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => memory.set(key, value),
    removeItem: (key: string) => memory.delete(key),
    clear: () => memory.clear()
  }
});

describe('preferências do sistema de design', () => {
  beforeEach(() => memory.clear());

  it('normaliza valores desconhecidos para o contrato seguro', () => {
    expect(normalizeDesignPreferences({ theme: 'neon', fontScale: 'gigante', focusMode: 1 })).toEqual({
      version: 1,
      theme: 'auto',
      fontScale: 'default',
      focusMode: false
    });
  });

  it('persiste tema, escala e modo foco', () => {
    designPreferences.set({ theme: 'light', fontScale: 'large', focusMode: true });
    expect(JSON.parse(memory.get(DESIGN_PREFERENCES_KEY) || '{}')).toEqual({
      version: 1,
      theme: 'light',
      fontScale: 'large',
      focusMode: true
    });
  });

  it('resolve Auto conforme o tema do sistema', () => {
    expect(resolveTheme('auto', true)).toBe('dark');
    expect(resolveTheme('auto', false)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('light', true)).toBe('light');
  });
});
