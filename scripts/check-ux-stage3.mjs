import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const ui = read('src/components/VirtualizedChecklist.tsx');
const issue = read('src/components/IssueRow.tsx');
const editorial = read('src/components/Editorial.tsx');
const clone = read('src/views/ReadingView.tsx');
const progress = read('src/components/Progress.tsx');
const source = read('src/runtime/controller.ts');
const e2e = read('tests/e2e/spider-guia.spec.ts');
const checks = {
  focusUsesExistingPreference: ui.includes('designPreferences.set({ focusMode: !design.focusMode })') && ui.includes('data-focus-toggle aria-pressed={design.focusMode}'),
  focusSupportsKeyboard: ui.includes('data-focus-nav="previous"') && ui.includes('data-focus-nav="next"'),
  focusIsControlled: ui.includes('open={expanded} onOpenChange='),
  threeStates: ['Sim', 'Não', 'Pulei'].every(status => (progress + issue + source).includes(status)),
  skipOutsideDisclosure: issue.indexOf('<div class="reading-row-end"><SkipButton') > issue.indexOf('</details>'),
  extraSkipOutsideDisclosure: editorial.indexOf('<div class="reading-row-end"><SkipButton') > editorial.indexOf('</details>'),
  sameRowInThreeViews: ui.includes('<IssueRow') && editorial.includes('<IssueRow') && clone.includes('<IssueRow'),
  extrasMultiItem: editorial.includes('extra.itemIds.map') && editorial.includes('state.skipped') && editorial.includes('state.pending'),
  editorialSeparateFromProgress: editorial.includes('const availability =') && editorial.includes('progressStatusLabel(singleStatus)'),
  statusFilterUpdates: ui.includes('const progressRevision = useProgressRevision()') && /filter, query, progressRevision\]\)/.test(ui),
  remoteSecurityUntouched: source.includes('requestStatus(id: number') && source.includes('appState.skipPending = id'),
  forcedDeepLink: ui.includes('const forcedChunkIndex =') && ui.includes('setDeepLinkPending(current => current === targetId ? null : current)'),
  e2eCoverage: ['Pular fica visível', 'filtro de status acompanha', 'Modo Foco é principal', 'Saga do Clone compartilha', 'Extras com várias', 'deep link distante'].every(t => e2e.includes(t))
};
console.log(JSON.stringify({ ok: Object.values(checks).every(Boolean), checks }, null, 2));
if (Object.values(checks).some(value => !value)) process.exitCode = 1;
