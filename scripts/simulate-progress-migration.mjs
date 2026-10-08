import path from 'node:path';
import assert from 'node:assert/strict';
import { ROOT, loadSourceItems, readJson } from './lib/data-utils.mjs';

const fixture = await readJson(path.join(ROOT, 'tests', 'fixtures', 'progress-v1-example.json'));
const items = await loadSourceItems();
const validIds = new Set(items.map(item => String(item.id)));

// Marco A não muda formato/chave de localStorage. A "migração" é deliberadamente identidade:
// somente verificamos que todo ID persistido no formato antigo continua resolvendo no novo catálogo-fonte.
const migrated = structuredClone(fixture);
for (const id of Object.keys(fixture['aranha-progress-v1'])) {
  assert(validIds.has(id), `ID antigo ${id} não existe mais no catálogo.`);
}
for (const id of Object.keys(fixture['aranha-log-v1'])) {
  assert(validIds.has(id), `ID antigo ${id} do log não existe mais no catálogo.`);
}
assert.deepEqual(migrated, fixture);

console.log(JSON.stringify({
  ok: true,
  storageKeysPreserved: Object.keys(fixture),
  progressEntries: Object.keys(fixture['aranha-progress-v1']).length,
  logEntries: Object.keys(fixture['aranha-log-v1']).length,
  changedValues: 0,
  droppedIds: []
}, null, 2));
