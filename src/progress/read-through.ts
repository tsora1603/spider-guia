import type { Reading } from '../data/model';
import type { ProgressStatus } from '../state/types';

/** Apenas edições da linha histórica principal; nunca incluir Extras nem leituras de contexto. */
export function readThroughSelection(
  number: number,
  source: readonly Reading[],
  status: (id: number) => ProgressStatus
) {
  const eligible = Number.isInteger(number) && number >= 1 && number <= 1000
    ? source.filter(item => item.type === 'Principal' && item.historicalNumber != null && item.historicalNumber >= 1 && item.historicalNumber <= number)
    : [];
  const pending = [] as Reading[];
  let alreadyRead = 0;
  let skipped = 0;
  for (const item of eligible) {
    const current = status(item.id);
    if (current === 'Sim') alreadyRead += 1;
    else if (current === 'Pulei') skipped += 1;
    else pending.push(item);
  }
  return { pending, alreadyRead, skipped, total: eligible.length };
}
