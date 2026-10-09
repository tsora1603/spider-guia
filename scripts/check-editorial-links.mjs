import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, loadSourceItems } from './lib/data-utils.mjs';

import { formatCoverage, validateEditorialLinks } from '../data/link-model.mjs';
const groups = JSON.parse(
  await fs.readFile(path.join(ROOT, 'data/src/editorial/links.json'), 'utf8')
);
assert.ok(Array.isArray(groups) && groups.length > 0, 'Nenhum grupo editorial');
const itemIds = new Set((await loadSourceItems()).map((item) => item.id));
const extras = JSON.parse(
  await fs.readFile(path.join(ROOT, 'data/src/editorial/extras.json'), 'utf8')
);
const errors = validateEditorialLinks(groups, {
  knownItemIds: itemIds,
  extras
});
assert.equal(errors.length, 0, `Links inválidos: ${JSON.stringify(errors)}`);
for (const group of groups) {
  if (group.coverage) {
    const label = formatCoverage(group.coverage);
    assert.ok(label && !label.includes('undefined'), `Rótulo de coverage inválido: ${group.id}`);
  }
  for (const dest of [...group.links, ...(group.stores || []), ...(group.libraries || [])]) {
    if (dest.coverage) assert.ok(formatCoverage(dest.coverage));
  }
}
const total = groups.reduce(
  (count, group) =>
    count + group.links.length + (group.stores?.length || 0) + (group.libraries?.length || 0),
  0
);
console.log(
  `Links editoriais OK: ${groups.length} grupos, ${total} destinos, ${groups.filter((group) => group.coverage).length} coberturas, ${groups.filter((group) => group.extraId).length} associações explícitas.`
);
