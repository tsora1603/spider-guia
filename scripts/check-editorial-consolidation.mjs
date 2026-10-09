import assert from 'node:assert/strict';
import { readJson, SRC_DIR } from './lib/data-utils.mjs';
import path from 'node:path';
const extras = await readJson(path.join(SRC_DIR, 'editorial/extras.json'));
const groups = extras
  .filter((entry) => entry.readingGroup != null)
  .map((entry) => entry.readingGroup)
  .sort((a, b) => a - b);
assert.deepEqual(
  groups,
  Array.from({ length: 32 }, (_, i) => i + 1)
);
assert.ok(extras.every((entry) => !Object.hasOwn(entry, 'brazilianEdition')));
console.log(
  'Migração histórica consolidada; nenhum campo de publicação brasileira permanece nos Extras ativos.'
);
