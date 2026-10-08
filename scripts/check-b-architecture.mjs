import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'src/state/app-state.ts',
  'src/state/progress-store.ts',
  'src/state/storage-migrations.ts',
  'src/router/router.ts',
  'src/views/App.tsx',
  'src/components/feedback.ts',
  'src/data/model.ts',
  'src/data/generated-data.json',
  'src/sync/sync-engine.ts',
  'src/main.tsx',
  'vite.config.mjs',
  'tsconfig.json'
];
const missing = [];
for (const relative of required) {
  try { await fs.access(path.join(ROOT, relative)); } catch { missing.push(relative); }
}
const srcFiles = [];
async function walk(relative) {
  for (const entry of await fs.readdir(path.join(ROOT, relative), { withFileTypes: true })) {
    const next = path.join(relative, entry.name);
    if (entry.isDirectory()) await walk(next);
    else if (/\.(ts|tsx)$/.test(entry.name)) srcFiles.push(next);
  }
}
await walk('src');
const source = (await Promise.all(srcFiles.map(async file => await fs.readFile(path.join(ROOT, file), 'utf8')))).join('\n');
const router = await fs.readFile(path.join(ROOT, 'src/router/router.ts'), 'utf8');
const progress = await fs.readFile(path.join(ROOT, 'src/state/progress-store.ts'), 'utf8');
const index = await fs.readFile(path.join(ROOT, 'index.html'), 'utf8');
const generated = JSON.parse(await fs.readFile(path.join(ROOT, 'src/data/generated-data.json'), 'utf8'));
const dataJs = await fs.readFile(path.join(ROOT, 'data.js'), 'utf8');
const dataMatch = dataJs.match(/const DATA=(.*);\s*$/s);
const compatData = dataMatch ? JSON.parse(dataMatch[1]) : null;
const generatedDataMatchesCompat = compatData != null && JSON.stringify(compatData) === JSON.stringify(generated);
const forbiddenViewSymbols = ['hashForState','canonicalHash','navigateHash','handleHashRoute','acceptedHash','DATA.extras','DATA.leituras','legacyN'].filter(symbol => source.includes(symbol));
const requiredRouterCases = ['#checklist/hq/', "params.set('f'", "params.get('q')", 'replaceChecklistState', 'LEGACY_ROUTE_MAP'].filter(token => !router.includes(token));
const requiredStorageKeys = ['aranha-progress-v1','aranha-log-v1','aranha-progress-meta-v2','aranha-sync-queue-v1'].filter(key => !progress.includes(key));
const moduleEntryOk = index.includes('type="module"') && index.includes('/src/main.tsx');
const ok = !missing.length && !forbiddenViewSymbols.length && !requiredRouterCases.length && !requiredStorageKeys.length && moduleEntryOk && generatedDataMatchesCompat;
console.log(JSON.stringify({ ok, missing, forbiddenViewSymbols, missingRouterCapabilities: requiredRouterCases, missingHistoricalStorageKeys: requiredStorageKeys, moduleEntryOk, generatedDataMatchesCompat }, null, 2));
if (!ok) process.exitCode = 1;
