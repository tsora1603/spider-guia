import assert from 'node:assert/strict';
import fs from 'node:fs';
import { summarizeReadingPlan } from '../src/views/home-model.ts';
import { reconcileFocusSelection } from '../src/components/focus-selection.ts';

const file = path => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const index = JSON.parse(file('src/data/generated-index.json'));
const fields = Object.fromEntries(index.itemIndexFields.map((key, i) => [key, i]));
const catalog = index.itemIndex.map(row => ({
  id: Number(row[fields.id]),
  readingOrder: Number(row[fields.readingOrder]),
  weight: row[fields.weight],
  type: row[fields.type],
  historicalNumber: row[fields.historicalNumber] == null ? null : Number(row[fields.historicalNumber])
})).sort((a, b) => a.readingOrder - b.readingOrder);
const essential = catalog.filter(item => item.weight === '● Essencial');
const current = new Set([essential[0].id, essential[1].id]);
const status = id => current.has(id) ? id === essential[0].id ? 'Sim' : 'Pulei' : 'Não';
let count = 0;
function check(value, label) { assert.ok(value, label); console.log(`PASS ${++count}: ${label}`); }
check(catalog.length === 1301 && catalog.every((item, index) => item.readingOrder === index + 1), '1.301 leituras na ordem canônica');
check(catalog[0].id === 1 && essential[0].id === 2, 'Completo começa com Amazing Fantasy; Essenciais com ASM #1');
const annualIndex = catalog.findIndex(item => item.id === 1227);
check(catalog[annualIndex - 1].id === 17 && catalog[annualIndex + 1].id === 18, 'Annual intercalado é preservado');
const summary = summarizeReadingPlan(essential, status);
check(summary.read === 1 && summary.skipped === 1 && summary.next?.id === essential[2].id, 'Próxima respeita puladas e lidas');
const positions = new Map(catalog.map((item, index) => [item.id, index]));
const visibleIds = essential.map(item => item.id);
check(reconcileFocusSelection(visibleIds, visibleIds[1], positions, () => true) === visibleIds[1], 'Próxima não reinicia após atualização');
check(reconcileFocusSelection(visibleIds, visibleIds[2], positions, () => true) === visibleIds[2], 'Segundo avanço não reinicia');
check(reconcileFocusSelection(visibleIds.slice(2), visibleIds[1], positions, () => true) === visibleIds[2], 'Filtro que remove HQ ativa mantém a posição seguinte');
const home = file('src/views/HomeView.tsx');
const checklist = file('src/components/VirtualizedChecklist.tsx');
const bulk = file('src/components/BulkProgressDialog.tsx');
check(home.includes('buildReadingPlan(preferences)') && checklist.includes('buildReadingPlan(preferences)'), 'Home e Checklist importam a mesma construção do plano');
check(home.includes('summarizeReadingPlan(plan, statusOf)') && checklist.includes('summarizeReadingPlan(plan, statusOf)'), 'Mesmo critério para localizar a próxima leitura');
check(!checklist.includes('checklistGroups') && !checklist.includes('checklist-group-header') && checklist.includes('data-reading-sequence="true"'), 'Nenhuma divisão visível de fases na Checklist');
check(checklist.includes('const CHUNK_SIZE = 24') && checklist.includes('computeVirtualWindow('), 'Virtualização permanece como detalhe técnico');
check(checklist.includes('outsidePlanItem') && checklist.includes('focusedItemId') && checklist.includes('checklist-plan-exception'), 'HQ fora do plano abre por link direto sem alterar plano');
check(checklist.includes('key={item.id}') && checklist.includes('reconcileFocusSelection'), 'Modo Foco preserva estado por HQ e navegação manual');
check(bulk.includes('Plano atual') && !bulk.includes('Arco inteiro') && !bulk.includes('Fase / arco'), 'Ações em lote não agrupam a Checklist por fases');
console.log(`Refactor da sequência: ${count} verificações locais passaram.`);
