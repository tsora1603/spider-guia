import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const srcFiles = [];
const walk = dir => {
  for (const name of fs.readdirSync(path.join(root, dir))) {
    const rel = path.join(dir, name);
    const stat = fs.statSync(path.join(root, rel));
    if (stat.isDirectory()) walk(rel);
    else if (/\.(ts|tsx)$/.test(name)) srcFiles.push(rel);
  }
};
walk('src');
const runtimeSource = srcFiles.map(file => read(file)).join('\n');
const index = read('index.html');
const router = read('src/router/router.ts');
const component = read('src/components/SpoilerText.tsx');
const preferences = read('src/spoilers/preferences.ts');
const schema = read('data/schema.mjs');

const checks = {
  legacyRuntimeRemoved: !exists('public/spoilers.js') && !exists('src/runtime/spoilers.ts'),
  dialogsRemoved: !/spoilerdlg|spoilercancel|spoilercontinue|spoiler-warning/.test(index + runtimeSource),
  noDomAudit: !/\.audit\(|TreeWalker|NodeFilter|isSpoilerish/.test(runtimeSource),
  noRuntimeHeuristics: !/const\s+(phrases|hints)\s*=/.test(runtimeSource),
  noInjectedHtml: !/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(runtimeSource),
  routerHasNoSpoilerGate: !/spoilerArea|guardSpoiler/.test(router),
  declarativeSchema: /SpoilerLevelSchema = z\.enum\(\['leve', 'forte'\]\)/.test(schema) && /SpoilerTextSchema/.test(schema),
  globalControl: /Nível de spoilers/.test(component) && /value="nenhum"/.test(component) && /value="leve"/.test(component) && /value="tudo"/.test(component),
  persistedGlobalLevel: preferences.includes('aranha-spoiler-level-v1'),
  heuristicOnlyInMigrationScript: exists('scripts/suggest-spoilers.mjs') && !index.includes('spoilers.js')
};
const ok = Object.values(checks).every(Boolean);
console.log(JSON.stringify({ ok, checks }, null, 2));
if (!ok) process.exit(1);
