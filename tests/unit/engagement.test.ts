import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENGAGEMENT_STORAGE_KEY, engagementPreferences } from '../../src/engagement/preferences';
import { nextProgressMilestone, weekStart } from '../../src/engagement/insights';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, String(value)); }
}

describe('acompanhamento pessoal', () => {
  beforeEach(() => vi.stubGlobal('localStorage', new MemoryStorage()));

  it('persiste a meta semanal local e limita valores extremos', () => {
    engagementPreferences.setWeeklyGoal(7);
    expect(JSON.parse(localStorage.getItem(ENGAGEMENT_STORAGE_KEY) || '{}')).toEqual({ version: 1, weeklyGoal: 7 });
    engagementPreferences.setWeeklyGoal(999);
    expect(JSON.parse(localStorage.getItem(ENGAGEMENT_STORAGE_KEY) || '{}').weeklyGoal).toBe(50);
    engagementPreferences.setWeeklyGoal(0);
    expect(JSON.parse(localStorage.getItem(ENGAGEMENT_STORAGE_KEY) || '{}').weeklyGoal).toBe(5);
  });

  it('considera segunda-feira como início da semana local', () => {
    const wednesday = new Date(2026, 9, 7, 16, 0, 0).getTime();
    const monday = new Date(2026, 9, 5, 0, 0, 0).getTime();
    expect(weekStart(wednesday)).toBe(monday);
  });

  it('usa marcos discretos sem ranking ou selos', () => {
    expect(nextProgressMilestone(0)).toBe(25);
    expect(nextProgressMilestone(25)).toBe(100);
    expect(nextProgressMilestone(999)).toBe(1000);
    expect(nextProgressMilestone(1000)).toBeNull();
  });
});
