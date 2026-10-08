import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, SRC_DIR, readJson } from './lib/data-utils.mjs';
import { strongField } from './lib/spoiler-data.mjs';

const checkOnly = process.argv.includes('--check');
const changes = [];

async function update(relative, transform) {
  const file = path.join(SRC_DIR, relative);
  const value = await readJson(file);
  const before = JSON.stringify(value);
  transform(value);
  const after = JSON.stringify(value);
  if (before !== after) {
    changes.push(relative);
    if (!checkOnly) await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  }
}

await update('editorial/extras.json', entries => {
  for (const extra of entries) extra.why = strongField(extra.why);
});
await update('editorial/clone.json', clone => {
  for (const entry of clone.entries || []) if (entry.note) entry.note = strongField(entry.note);
});
await update('marcos.json', entries => {
  for (const entry of entries) if (entry.description) entry.description = strongField(entry.description);
});
await update('fases.json', entries => {
  for (const entry of entries) if (entry.highlights) entry.highlights = strongField(entry.highlights);
});

if (checkOnly && changes.length) {
  console.error(`Migração explícita pendente em: ${changes.join(', ')}`);
  process.exit(1);
}
console.log(changes.length ? `Campos explícitos migrados: ${changes.join(', ')}` : 'Campos explícitos de spoiler já estão declarativos.');
