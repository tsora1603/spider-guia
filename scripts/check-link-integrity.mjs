import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT } from './lib/data-utils.mjs';

const baseline = JSON.parse(
  await fs.readFile(path.join(ROOT, 'data/snapshots/editorial-links-baseline.json'), 'utf8')
);
const current = JSON.parse(
  await fs.readFile(path.join(ROOT, 'data/src/editorial/links.json'), 'utf8')
);
for (const [index, original] of baseline.entries()) {
  const group = current[index];
  assert.ok(group, `Link original removido: ${original.id}`);
  assert.equal(group.id, original.id, `Ordem/ID de Link alterado em ${index}`);
  assert.equal(group.title, original.title, `Título alterado em ${original.id}`);
  if ('readingGroup' in original)
    assert.equal(
      group.readingGroup,
      original.readingGroup,
      `readingGroup alterado em ${original.id}`
    );
  if ('itemIds' in original)
    assert.equal(
      JSON.stringify(group.itemIds),
      JSON.stringify(original.itemIds),
      `itemIds alterados em ${original.id}`
    );
  for (const key of ['links', 'stores', 'libraries']) {
    const previous = original[key] || [];
    const actual = group[key] || [];
    for (const entry of previous) {
      assert.ok(
        actual.some((candidate) => candidate.label === entry.label && candidate.url === entry.url),
        `${original.id}: URL ou rótulo original perdido (${entry.url})`
      );
    }
  }
}
console.log(
  `Integridade histórica OK: ${baseline.length} IDs/títulos, associações legadas e ${baseline.reduce((count, g) => count + (g.links?.length || 0) + (g.stores?.length || 0) + (g.libraries?.length || 0), 0)} URLs originais preservados.`
);
