import fs from 'node:fs';

const data = JSON.parse(fs.readFileSync('src/data/generated-data.json', 'utf8'));
const index = Object.fromEntries(data.itemFields.map((field, i) => [field, i]));
const items = data.items.map(row => ({
  id: Number(row[index.id]),
  phase: String(row[index.phase] || 'Sem fase'),
  weight: String(row[index.weight] || ''),
  readingOrder: Number(row[index.readingOrder])
}));
const groups = new Map();
for (const item of items) {
  const bucket = groups.get(item.phase) || [];
  bucket.push(item);
  groups.set(item.phase, bucket);
}
const groupedIds = [...groups.values()].flat().map(item => item.id);
const unique = new Set(groupedIds);
const orders = items.map(item => item.readingOrder);
const essentials = items.filter(item => item.weight === '● Essencial').length;
const source = fs.readFileSync('src/components/checklist-model.ts', 'utf8');
const virtualSource = fs.readFileSync('src/components/VirtualizedChecklist.tsx', 'utf8');
const checks = {
  catalogItems: items.length === 1301,
  groupCount: groups.size === 46,
  everyItemGroupedOnce: groupedIds.length === items.length && unique.size === items.length,
  readingOrderUntouched: orders.every((value, index) => value === index + 1),
  hasEssentialFilter: essentials > 0 && /filter === 'ess'/.test(source),
  hasQueryFilter: /item\.searchText\.includes/.test(source),
  hasOverscanWindow: /overscan = 700/.test(source),
  measuresDynamicChunkHeight: /ResizeObserver/.test(virtualSource),
  preservesOpenItemState: /openItems/.test(virtualSource),
  usesContinuousPlan: /buildReadingPlan\(preferences\)/.test(virtualSource) && /chunkItems\(visibleItems\)/.test(virtualSource) && !/checklistGroups/.test(virtualSource),
  deepLinkVirtualizationBridge: /focusWhenReady/.test(virtualSource) && /forcedChunkIndex/.test(virtualSource)
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks, summary: { items: items.length, groups: groups.size, essentials } }, null, 2));
if (!ok) process.exit(1);
