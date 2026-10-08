import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = await mkdtemp(path.join(tmpdir(), 'spider-stage1-'));
const app = await readFile(path.join(root, 'src/views/App.tsx'), 'utf8');
const help = await readFile(path.join(root, 'src/views/HelpView.tsx'), 'utf8');
const settings = await readFile(path.join(root, 'src/views/MoreView.tsx'), 'utf8');
const styles = await readFile(path.join(root, 'src/styles.css'), 'utf8');

try {
  const compilation = spawnSync('tsc', [
    'src/router/router.ts', 'src/state/app-state.ts', 'src/state/types.ts',
    '--module', 'commonjs', '--moduleResolution', 'node', '--target', 'ES2020',
    '--outDir', output, '--skipLibCheck', '--esModuleInterop'
  ], { cwd: root, encoding: 'utf8' });
  if (compilation.status !== 0) throw new Error(`Falha ao compilar roteador: ${compilation.stdout || compilation.stderr}`);
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  const require = createRequire(pathToFileURL(path.join(output, 'runner.cjs')));
  const { LEGACY_ROUTE_MAP, parseHash, routeToHash } = require(path.join(output, 'router/router.js'));
  const routes = ['#hoje', '#checklist', '#explorar/jornada', '#explorar/extras', '#explorar/clone', '#explorar/links', '#ajuda', '#ajuda/glossario', '#ajuda/fontes', '#ajuda/metodologia', '#configuracoes'];
  const destinations = new Set(routes.map(hash => parseHash(hash, true).tab));
  const checks = {
    fiveDestinations: ['Hoje', 'Checklist', 'Explorar', 'Ajuda', 'Configurações'].every(tab => destinations.has(tab)) && destinations.size === 5,
    routesRoundTrip: routes.every(hash => routeToHash(parseHash(hash, true)) === hash),
    allLegacyAliases: Object.entries(LEGACY_ROUTE_MAP).every(([oldHash, newHash]) => routeToHash(parseHash(oldHash, true)) === newHash),
    legacyQueryPreserved: Object.entries(LEGACY_ROUTE_MAP).every(([oldHash, newHash]) => routeToHash(parseHash(`${oldHash}?utm=leitura`, true)) === `${newHash}?utm=leitura`),
    hqAndQueryPreserved: routeToHash(parseHash('#hq/874?src=link', true)) === '#checklist/hq/874?src=link',
    checklistFilterAndQueryPreserved: routeToHash(parseHash('#ler/checklist?f=puladas&q=clone', true)) === '#checklist?f=puladas&q=clone',
    extraChecklistParamsPreserved: routeToHash(parseHash('#ler/checklist?f=puladas&q=clone&src=link', true)) === '#checklist?src=link&f=puladas&q=clone',
    linksFlagPreserved: routeToHash(parseHash('#explorar/links', false)) === '#explorar/jornada',
    oldAccountStillSettings: parseHash('#conta/ajuda', true).tab === 'Configurações',
    helpAndSettingsSeparate: parseHash('#conta/fontes', true).tab === 'Ajuda' && !/function Glossary|function Sources|function Methodology/.test(settings) && /function Glossary|function Sources|function Methodology/.test(help),
    helpKeepsEditorialContents: /Peso da leitura/.test(help) && /Como usar/.test(help) && /Atalhos de teclado/.test(help) && /groupedSources/.test(help),
    settingsKeepsCriticalFeatures: ['ReadingPreferencesCard', 'DesignPreferencesCard', 'DeviceResetCard', 'handleProgressImport', 'exportProgress', 'toggleAuth'].every(symbol => settings.includes(symbol)),
    fiveVisibleNavButtons: (app.match(/\{ key: '(?:Hoje|Checklist|Explorar|Ajuda|Configurações)', icon:/g) || []).length === 5 && /repeat\(5,minmax\(0,1fr\)\)/.test(styles),
    mobileConfigHasFullAccessibleName: /aria-label=\{item.key\}/.test(app) && /nav-label-short/.test(app)
  };
  const failed = Object.keys(checks).filter(key => !checks[key]);
  console.log(JSON.stringify({ ok: failed.length === 0, checks }, null, 2));
  if (failed.length) process.exitCode = 1;
} finally {
  await rm(output, { recursive: true, force: true });
}
