import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readThroughSelection } from '../src/progress/read-through.ts';
import { summarizeReadingPlan } from '../src/views/home-model.ts';

const text = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const index = JSON.parse(text('src/data/generated-index.json'));
const fields = Object.fromEntries(index.itemIndexFields.map((name, i) => [name, i]));
const readings = index.itemIndex.map((row) =>
  Object.fromEntries(
    ['id', 'type', 'historicalNumber', 'weight'].map((key) => [key, row[fields[key]]])
  )
);
let checks = 0;
const ok = (condition, message) => {
  assert.ok(condition, message);
  console.log(`PASS ${++checks}: ${message}`);
};

const current = new Map([
  [2, 'Sim'],
  [3, 'Pulei']
]);
const status = (id) => current.get(id) || 'Não';
const preview = readThroughSelection(5, readings, status);
ok(
  preview.pending.length === 3 && preview.alreadyRead === 1 && preview.skipped === 1,
  'prévia separa pendentes, lidas e puladas'
);
ok(
  preview.pending.every((item) => item.type === 'Principal'),
  'nenhuma leitura extra ou contextual é marcada'
);
ok(
  !preview.pending.some((item) => item.id === 1) &&
    readThroughSelection(1, readings, status).total === 1,
  'Amazing Fantasy #15 fora da linha histórica permanece intocada'
);
ok(
  readThroughSelection(0, readings, status).total === 0 &&
    readThroughSelection(1001, readings, status).total === 0,
  'números históricos inválidos não selecionam itens'
);
ok(
  readThroughSelection(1000, readings, status).pending.every((item) => item.type === 'Principal'),
  'seleção até #1000 limita-se à linha principal'
);
const summary = summarizeReadingPlan(readings.slice(0, 6), status);
ok(
  summary.read === 1 && summary.skipped === 1 && summary.pending === 4 && summary.next?.id === 1,
  'progresso mantém Pulei separado de Sim e respeita readingOrder'
);
ok(
  summarizeReadingPlan([readings[1], readings[2]], (id) => (id === 2 ? 'Sim' : 'Pulei')).next ===
    undefined,
  'plano sem pendências não confunde pulada com lida'
);
ok(summarizeReadingPlan([], status).total === 0, 'plano vazio não inventa progresso');
console.log(`Leitura acumulada: ${checks} verificações passaram.`);
