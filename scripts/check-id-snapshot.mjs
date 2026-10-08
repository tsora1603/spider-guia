import path from 'node:path';
import { ROOT, SNAPSHOT_DIR, loadSourceItems, readJson } from './lib/data-utils.mjs';

const items = await loadSourceItems();
const current = items.map(item => item.id);
const expected = await readJson(path.join(SNAPSHOT_DIR, 'item-ids.json'));

const max = Math.max(current.length, expected.length);
const differences = [];
for (let index = 0; index < max; index += 1) {
  if (current[index] !== expected[index]) {
    differences.push({ position: index + 1, expected: expected[index] ?? null, actual: current[index] ?? null });
    if (differences.length === 20) break;
  }
}

if (differences.length || current.length !== expected.length) {
  console.error('REGRESSÃO DE IDs: a lista de IDs mudou ou foi reordenada.');
  console.error(JSON.stringify({ expectedCount: expected.length, actualCount: current.length, differences }, null, 2));
  process.exit(1);
}

console.log(`Snapshot de IDs OK: ${current.length} IDs preservados na mesma ordem.`);
