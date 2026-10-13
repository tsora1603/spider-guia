import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const snapshot = () => {
  const files = [
    'data.js',
    ...fs
      .readdirSync('src/data')
      .filter((name) => /^generated-.*\.(json|ts)$/.test(name))
      .map((name) => `src/data/${name}`),
    ...fs
      .readdirSync('src/data/chunks')
      .filter((name) => name.endsWith('.json'))
      .map((name) => path.join('src/data/chunks', name))
  ];
  return Object.fromEntries(
    files
      .sort()
      .map((file) => [file, createHash('sha256').update(fs.readFileSync(file)).digest('hex')])
  );
};
const before = snapshot();
const result = spawnSync(process.execPath, ['scripts/build-data.mjs'], { stdio: 'inherit' });
assert.equal(result.status, 0, 'Não foi possível reconstruir os dados.');
const after = snapshot();
const changed = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
  (file) => before[file] !== after[file]
);
assert.equal(
  changed.length,
  0,
  `Dados gerados desatualizados: ${changed.join(', ')}. Rode npm run data:build e versione o resultado.`
);
console.log(`Dados reproduzíveis: ${Object.keys(after).length} arquivos conferidos.`);
