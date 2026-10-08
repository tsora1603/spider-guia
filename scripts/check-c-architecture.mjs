import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const packageJson = JSON.parse(read('package.json'));
const allSrcFiles = [];
const walk = dir => {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    const rel = path.join(dir, name);
    const stat = fs.statSync(path.join(root, rel));
    if (stat.isDirectory()) walk(rel);
    else if (/\.(ts|tsx)$/.test(name)) allSrcFiles.push(rel);
  }
};
walk('src');
const source = allSrcFiles.map(file => `// ${file}\n${read(file)}`).join('\n');
const checks = {
  preactDependency: Boolean(packageJson.dependencies?.preact),
  rootUsesPreactRender: /render\(<App\s*\/>/.test(read('src/main.tsx')),
  legacyAppViewRemoved: !fs.existsSync(path.join(root, 'src/views/app-view.ts')),
  noGlobalInnerHtmlAssignment: !/\.innerHTML\s*=/.test(source),
  spoilerInnerHtmlRemoved: (source.match(/dangerouslySetInnerHTML/g) || []).length === 0,
  granularProgressSubscriptions: /subscribeMany/.test(read('src/state/progress-store.ts')) && /useProgressStatus/.test(read('src/components/IssueRow.tsx')),
  syncDoesNotInvalidateMainTree: /onStateChange:\s*\(\) => uiStore\.notify\('sync'\)/.test(read('src/runtime/controller.ts')) && /useUiRevision\('route'\)/.test(read('src/views/App.tsx')),
  routeSessionSyncAreSeparate: /type UiChannel = 'route' \| 'session' \| 'sync'/.test(read('src/ui/ui-store.ts')),
  keyedIssueRows: /key=\{item\.id\}/.test(read('src/components/VirtualizedChecklist.tsx')),
  virtualizedChecklist: /computeVirtualWindow/.test(read('src/components/VirtualizedChecklist.tsx')) && /data-virtualized="true"/.test(read('src/components/VirtualizedChecklist.tsx')),
  continuousReadingSequence: /buildReadingPlan\(preferences\)/.test(read('src/components/VirtualizedChecklist.tsx')) && /data-reading-sequence="true"/.test(read('src/components/VirtualizedChecklist.tsx')) && !/checklist-group-header/.test(read('src/components/VirtualizedChecklist.tsx')),
  noChecklistPagination: !/checklistLimit|data-cl-more|Mostrar mais/.test(source),
  routerStillUnified: fs.existsSync(path.join(root, 'src/router/router.ts')) && !/hashForState|canonicalHash|enterTab|navigateHash|applyRoute|handleHashRoute|acceptedHash/.test(source),
  historicalStorageKeysKept: ['aranha-progress-v1','aranha-log-v1','aranha-progress-meta-v2','aranha-sync-queue-v1'].every(key => read('src/state/progress-store.ts').includes(key))
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks, componentFiles: allSrcFiles.filter(file => file.endsWith('.tsx')).length }, null, 2));
if (!ok) process.exit(1);
