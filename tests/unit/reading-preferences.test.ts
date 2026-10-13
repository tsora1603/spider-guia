import { beforeEach, describe, expect, it, vi } from 'vitest';
import { buildReadingPlan } from '../../src/preferences/reading-plan';
import {
  READING_PREFERENCES_KEY,
  normalizeReadingPreferences,
  readingPreferences
} from '../../src/preferences/reading-preferences';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() {
    return this.values.size;
  }
  clear() {
    this.values.clear();
  }
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  key(index: number) {
    return [...this.values.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
  setItem(key: string, value: string) {
    this.values.set(key, String(value));
  }
}

describe('preferências de leitura', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
  });

  it('começa sem onboarding concluído e usa Essenciais como padrão seguro', () => {
    expect(readingPreferences.get()).toEqual({
      version: 1,
      onboardingComplete: false,
      depth: 'essential',
      focusQuery: '',
      readThrough: 0
    });
  });

  it('persiste profundidade, foco e marco de leitura', () => {
    readingPreferences.set({
      onboardingComplete: true,
      depth: 'focus',
      focusQuery: '  Kraven  ',
      readThrough: 250
    });
    expect(JSON.parse(localStorage.getItem(READING_PREFERENCES_KEY) || '{}')).toEqual({
      version: 1,
      onboardingComplete: true,
      depth: 'focus',
      focusQuery: 'Kraven',
      readThrough: 250
    });
  });

  it('normaliza valores inválidos sem inventar um foco', () => {
    expect(
      normalizeReadingPreferences({
        onboardingComplete: 'sim',
        depth: 'focus',
        focusQuery: ' ',
        readThrough: 9000
      })
    ).toEqual({
      version: 1,
      onboardingComplete: false,
      depth: 'essential',
      focusQuery: '',
      readThrough: 1000
    });
  });

  it('monta planos distintos para Completo, Essenciais e foco', () => {
    const complete = buildReadingPlan({ depth: 'complete', focusQuery: '' });
    const essential = buildReadingPlan({ depth: 'essential', focusQuery: '' });
    const focus = buildReadingPlan({ depth: 'focus', focusQuery: 'Kraven' });

    expect(complete).toHaveLength(1236);
    expect(essential.length).toBeLessThan(complete.length);
    expect(essential.every((item) => item.weight === '● Essencial')).toBe(true);
    expect(focus.length).toBeGreaterThan(0);
    expect(focus.length).toBeLessThan(essential.length);
    expect(focus.every((item) => item.weight !== '○ Opcional')).toBe(true);
  });
});
