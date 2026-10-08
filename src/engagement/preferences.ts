import { canPersistLocalChange } from '../reset/reset-guard';

const STORAGE_KEY = 'aranha-engagement-v1';
const listeners = new Set<() => void>();
let weeklyGoal = 5;
let loaded = false;

const clampGoal = (value: unknown) => Math.max(1, Math.min(50, Math.round(Number(value) || 5)));

const load = () => {
  if (loaded) return;
  loaded = true;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed?.version === 1) weeklyGoal = clampGoal(parsed.weeklyGoal);
  } catch { /* ignora preferência inválida */ }
};

const persist = () => {
  if (!canPersistLocalChange()) return;
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, weeklyGoal })); } catch { /* armazenamento indisponível */ }
};

export const engagementPreferences = {
  getWeeklyGoal() {
    load();
    return weeklyGoal;
  },
  setWeeklyGoal(value: number) {
    load();
    weeklyGoal = clampGoal(value);
    persist();
    listeners.forEach(listener => listener());
  },
  resetInMemory() {
    weeklyGoal = 5;
    loaded = true;
    listeners.forEach(listener => listener());
  },
  subscribe(listener: () => void) {
    load();
    listeners.add(listener);
    return () => listeners.delete(listener);
  }
};

export { STORAGE_KEY as ENGAGEMENT_STORAGE_KEY };
