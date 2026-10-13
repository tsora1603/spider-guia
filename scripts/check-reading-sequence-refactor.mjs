import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizeReadingPlan } from '../src/views/home-model.ts';
import { reconcileFocusSelection } from '../src/components/focus-selection.ts';

const file = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const index = JSON.parse(file('src/data/generated-index.json'));
const fields = Object.fromEntries(index.itemIndexFields.map((key, i) => [key, i]));
const catalog = index.itemIndex
  .map((row) => ({
    id: Number(row[fields.id]),
    readingOrder: Number(row[fields.readingOrder]),
    weight: row[fields.weight],
    type: row[fields.type],
    historicalNumber:
      row[fields.historicalNumber] == null ? null : Number(row[fields.historicalNumber])
  }))
  .sort((a, b) => a.readingOrder - b.readingOrder);
const essential = catalog.filter((item) => item.weight === '● Essencial');
const current = new Set([essential[0].id, essential[1].id]);
const status = (id) => (current.has(id) ? (id === essential[0].id ? 'Sim' : 'Pulei') : 'Não');
let count = 0;
function check(value, label) {
  assert.ok(value, label);
  console.log(`PASS ${++count}: ${label}`);
}
check(
  catalog.length > 0 && catalog.every((item, index) => item.readingOrder === index + 1),
  'Leituras na ordem canônica, sem lacunas'
);
check(
  catalog[0].id === 1 && essential[0].id === 2,
  'Completo começa com Amazing Fantasy; Essenciais com ASM #1'
);
const annualIndex = catalog.findIndex((item) => item.id === 1227);
check(
  catalog[annualIndex - 1].id === 17 && catalog[annualIndex + 1].id === 18,
  'Annual intercalado é preservado'
);
const summary = summarizeReadingPlan(essential, status);
check(
  summary.read === 1 && summary.skipped === 1 && summary.next?.id === essential[2].id,
  'Próxima respeita puladas e lidas'
);
const positions = new Map(catalog.map((item, index) => [item.id, index]));
const visibleIds = essential.map((item) => item.id);
check(
  reconcileFocusSelection(visibleIds, visibleIds[1], positions, () => true) === visibleIds[1],
  'Próxima não reinicia após atualização'
);
check(
  reconcileFocusSelection(visibleIds, visibleIds[2], positions, () => true) === visibleIds[2],
  'Segundo avanço não reinicia'
);
check(
  reconcileFocusSelection(visibleIds.slice(2), visibleIds[1], positions, () => true) ===
    visibleIds[2],
  'Filtro que remove HQ ativa mantém a posição seguinte'
);
console.log(`Refactor da sequência: ${count} verificações locais passaram.`);
