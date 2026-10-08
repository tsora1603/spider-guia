import { principalReadings } from '../data/model';
import { statusOf } from '../state/progress-store';
import { appState } from '../state/app-state';

export const PROGRESS_MILESTONES = [25, 100, 250, 500, 750, 1000] as const;

export function weekStart(timestamp = Date.now()) {
  const date = new Date(timestamp);
  const day = date.getDay();
  const distance = day === 0 ? 6 : day - 1;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - distance);
  return date.getTime();
}

export function weeklyReadCount(now = Date.now()) {
  const start = weekStart(now);
  return Object.entries(appState.readingLog).filter(([id, timestamp]) =>
    Number(timestamp) >= start && Number(timestamp) <= now && statusOf(Number(id)) === 'Sim'
  ).length;
}

export function highestContiguousHistorical() {
  let highest = 0;
  const ordered = principalReadings
    .filter(item => item.historicalNumber != null)
    .sort((a, b) => Number(a.historicalNumber) - Number(b.historicalNumber));
  for (const item of ordered) {
    if (Number(item.historicalNumber) !== highest + 1 || statusOf(item.id) !== 'Sim') break;
    highest = Number(item.historicalNumber);
  }
  return highest;
}

export function nextProgressMilestone(current = highestContiguousHistorical()) {
  return PROGRESS_MILESTONES.find(value => value > current) || null;
}
