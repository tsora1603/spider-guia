import fs from 'node:fs';

const read = path => fs.readFileSync(path, 'utf8');
const data = JSON.parse(read('src/data/generated-data.json'));

const fields = Object.fromEntries(data.itemFields.map((field, index) => [field, index]));
const byHistorical = new Map(
  data.items
    .filter(row => row[fields.type] === 'Principal')
    .map(row => [Number(row[fields.historicalNumber]), row])
);
const start16 = byHistorical.get(16);
const end17 = byHistorical.get(17);
const between16And17 = start16 && end17
  ? data.items.filter(row => Number(row[fields.readingOrder]) >= Number(start16[fields.readingOrder]) && Number(row[fields.readingOrder]) <= Number(end17[fields.readingOrder])).map(row => Number(row[fields.id]))
  : [];

const source = {
  bulk: read('src/progress/bulk-progress.ts'),
  bulkDialog: read('src/components/BulkProgressDialog.tsx'),
  checklist: read('src/components/VirtualizedChecklist.tsx'),
  issue: read('src/components/IssueRow.tsx'),
  shortcuts: read('src/components/KeyboardShortcuts.tsx'),
  states: read('src/components/ScreenState.tsx'),
  app: read('src/views/App.tsx'),
  controller: read('src/runtime/controller.ts'),
  e2e: read('tests/e2e/spider-guia.spec.ts')
};

const checks = {
  catalogStill1301: data.items.length === 1301,
  threeBulkSelections: ["kind: 'group'", "kind: 'through'", "kind: 'range'"].every(token => source.bulk.includes(token)),
  rangeUsesReadingOrder: source.bulk.includes('item.readingOrder >= startItem.readingOrder') && source.bulk.includes('item.readingOrder <= endItem.readingOrder'),
  rangeKeepsIntercalatedExtras: JSON.stringify(between16And17) === JSON.stringify([17, 1227, 18]),
  previewBeforeApply: source.bulkDialog.includes('Pré-visualização') && source.bulkDialog.includes('preview.changedItems.map'),
  undoUsesSnapshot: source.controller.includes('applyBulkStatus') && source.controller.includes('const before = progressStore.snapshotIds(uniqueIds)') && source.controller.includes('progressStore.restoreIds(before)'),
  noBulkSkip: source.bulk.includes("export type BulkTargetStatus = 'Sim' | 'Não'") && !source.bulkDialog.includes("target === 'Pulei'"),
  planBulkEntryPoint: source.checklist.includes('Ações em lote') && source.bulkDialog.includes('Plano atual') && source.bulk.includes("kind: 'plan'"),
  throughEntryPoint: source.issue.includes('Tudo até aqui') && source.issue.includes("kind: 'through'"),
  keyboardShortcuts: ['?', "event.key === '/'", "event.key.toLowerCase() === 'b'", "event.key.toLowerCase() === 'j'", "event.key.toLowerCase() === 'k'", "event.key.toLowerCase() === 'm'"].every(token => source.shortcuts.includes(token)),
  loadingState: source.app.includes('Suspense fallback={<ScreenState kind="loading"'),
  errorBoundary: source.app.includes('ViewErrorBoundary') && source.states.includes('getDerivedStateFromError'),
  emptyState: source.states.includes("kind: ScreenStateKind") && source.checklist.includes('Nenhuma leitura encontrada'),
  playwrightCoverage: source.e2e.includes('pré-visualizam e desfazem tudo até aqui') && source.e2e.includes('atalhos de teclado') && source.e2e.includes('estado vazio padronizado') && source.e2e.includes('estado de carregamento') && source.e2e.includes('estado de erro')
};

const failed = Object.entries(checks).filter(([, ok]) => !ok).map(([name]) => name);
console.log(JSON.stringify({ ok: failed.length === 0, checks, summary: { items: data.items.length, sampleRange16to17: between16And17 } }, null, 2));
if (failed.length) process.exit(1);
