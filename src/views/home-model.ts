import type { Reading } from '../data/model';
import type { ProgressStatus } from '../state/types';

/** Uma passagem pelo plano, preservando Pulei como estado separado de Sim. */
export function summarizeReadingPlan(plan: readonly Reading[], status: (id: number) => ProgressStatus) {
  let read = 0;
  let skipped = 0;
  let next: Reading | undefined;
  for (const item of plan) {
    const current = status(item.id);
    if (current === 'Sim') read += 1;
    else if (current === 'Pulei') skipped += 1;
    else if (!next) next = item;
  }
  return { read, skipped, pending: plan.length - read - skipped, total: plan.length, next };
}
