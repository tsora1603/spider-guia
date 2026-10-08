import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { SRC_DIR, ROOT, readJson, loadSourceManifest, loadSourceItems, itemObjectToRow } from './lib/data-utils.mjs';

// O catálogo editável mora em data/src/. Nunca verificar SHA de arquivos gerados:
// executar data:build primeiro; testar integridade e projeção, não imutabilidade.
const manifest = await loadSourceManifest();
const items = await loadSourceItems(manifest);
const ids = new Set(items.map(item => item.id));
const orders = new Set(items.map(item => item.readingOrder));
assert.ok(items.length > 0, 'Catálogo vazio');
assert.equal(ids.size, items.length, 'IDs duplicados no catálogo');
assert.equal(orders.size, items.length, 'readingOrder duplicado no catálogo');
assert.deepEqual([...orders].sort((a, b) => a - b), items.map((_, i) => i + 1), 'Ordem de leitura com lacunas');

const index = await readJson(path.join(ROOT, 'src/data/generated-index.json'));
const idPos = index.itemIndexFields.indexOf('id');
const orderPos = index.itemIndexFields.indexOf('readingOrder');
assert.ok(idPos >= 0 && orderPos >= 0, 'Campos id e readingOrder ausentes do índice');
assert.deepEqual(index.itemIndex.map(row => [row[idPos], row[orderPos]]), items.map(item => [item.id, item.readingOrder]), 'Índice diverge do catálogo-fonte; execute npm run data:build');
for (const item of items) {
  const indexRow = index.itemIndex[item.readingOrder - 1];
  for (const field of ['historicalNumber', 'type', 'series', 'issue', 'phase', 'weight']) {
    const position = index.itemIndexFields.indexOf(field);
    assert.ok(position >= 0, `Campo ${field} ausente do índice`);
    assert.equal(indexRow[position], item[field] ?? null, `HQ ${item.id}: campo ${field} diverge do catálogo-fonte`);
  }
}
assert.equal(index.catalogChunks.length, manifest.catalogFiles.length, 'Número de chunks diferente do manifesto');
const fromChunks = [];
for (let i = 0; i < manifest.catalogFiles.length; i++) {
  const sourceFile = manifest.catalogFiles[i];
  const chunkName = path.basename(sourceFile);
  const descriptor = index.catalogChunks[i];
  assert.equal(descriptor.file, chunkName, `Chunk ${i} não corresponde ao manifesto`);
  const source = await readJson(path.join(SRC_DIR, sourceFile));
  const chunk = await readJson(path.join(ROOT, 'src/data/chunks', chunkName));
  assert.equal(chunk.phase, source.phase, `Fase divergente em ${chunkName}`);
  assert.deepEqual(chunk.itemFields, manifest.itemFields, `Campos divergentes em ${chunkName}`);
  const fieldIdx = Object.fromEntries(chunk.itemFields.map((field, col) => [field, col]));
  assert.ok(Number.isInteger(fieldIdx.id) && Number.isInteger(fieldIdx.readingOrder), `Campos obrigatórios ausentes em ${chunkName}`);
  const chunkPairs = chunk.items.map(row => [row[fieldIdx.id], row[fieldIdx.readingOrder]]);
  const normalize = row => row.map((value, col) => col === fieldIdx.historicalNumber ? (value == null || value === '' ? null : Number(value)) : value);
  assert.deepEqual(chunk.items.map(normalize), source.items.map(itemObjectToRow).map(normalize), `Dados do chunk divergentes de ${sourceFile}`);
  assert.deepEqual(descriptor.itemIds, source.items.map(item => item.id), `Descritor divergente em ${chunkName}`);
  fromChunks.push(...chunkPairs);
}
assert.deepEqual(fromChunks.sort((a,b)=>a[1]-b[1]), items.map(item => [item.id, item.readingOrder]), 'Chunks não cobrem todas as leituras na ordem correta');
console.log(`Integridade do catálogo OK: ${items.length} IDs únicos; ${index.catalogChunks.length} chunks consistentes com as fontes.`);
