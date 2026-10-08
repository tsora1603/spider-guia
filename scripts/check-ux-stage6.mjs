import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFile(path.join(root, name), 'utf8');
const [help, more, design, reset, reconnect, styles, e2e, indexText] = await Promise.all([
  'src/views/HelpView.tsx', 'src/views/MoreView.tsx', 'src/design/DesignPreferencesCard.tsx',
  'src/reset/DeviceResetCard.tsx', 'src/reset/CloudReconnectDialog.tsx',
  'src/styles.css', 'tests/e2e/help-settings-stage6.spec.ts', 'src/data/generated-index.json'
].map(read));
const passed = [];
function check(label, fn) { fn(); passed.push(label); }
function includes(text, ...snippets) { for (const snippet of snippets) assert.ok(text.includes(snippet), `Ausente: ${snippet}`); }

check('integridade do índice principal', () => {
  const index = JSON.parse(indexText);
  assert.equal(index.itemIndex.length, 1301);
  assert.equal(index.catalogChunks.length, 46);
});
check('Ajuda contém as quatro subseções existentes', () => {
  for (const route of ['#ajuda', '#ajuda/glossario', '#ajuda/fontes', '#ajuda/metodologia']) includes(help, route);
  includes(help, 'Como usar', 'Peso da leitura', 'Atalhos de teclado', 'editorialData.metodologia', 'DATA.glossario.r', 'DATA.fontes.r');
});
check('fontes agrupadas e domínios/URLs preservados no componente', () => {
  includes(help, 'groupedSources(', 'SOURCE_SITE_NAMES', 'firstSourceUrl(source)', 'sourceSite(url)', 'sourceUses', 'href={url}', 'rel="noopener noreferrer"');
});
check('busca do glossário e fontes restaura contexto e pode ser limpa', () => {
  includes(help, 'readHelpParams()', 'withHelpSearch(location.hash, value)', 'history.replaceState(history.state', 'setQuery(', 'Limpar busca', 'role="status"');
});
check('permalinks abrem fonte, termo e metodologia sem mudar o catálogo', () => {
  for (const id of ['`fonte-${index}`', '`glossario-${index}`', '`metodologia-${index}`', '`#ajuda/fontes?fonte=${index}`', '`#ajuda/glossario?termo=${index}`', '`#ajuda/metodologia?bloco=${index}`']) includes(help, id);
  includes(help, 'scrollIntoView(', 'focus({ preventScroll: true })', 'helpTargetIndex(params,');
});
check('Configurações têm sete responsabilidades claras', () => {
  for (const section of ['Plano de leitura', 'Spoilers', 'Aparência', 'Configuração guiada', 'Conta e sincronização', 'Backup', 'Gerenciamento de dados']) includes(more, `title="${section}"`);
  assert.equal((more.match(/<SettingsBlock /g) || []).length, 7);
});
check('Configurações evitam duplicação do Já li até e usam o mesmo onboarding', () => {
  assert.ok(!more.includes('markUpTo') && !more.includes('account-read-through'));
  includes(more, "readingPreferences.set({ onboardingComplete: false })", 'Refazer configuração guiada');
});
check('preferências visuais continuam compartilhadas e modo foco é secundário', () => {
  includes(more, '<DesignPreferencesCard />');
  includes(design, 'designPreferences.set({ focusMode:', 'focusMode: event.currentTarget.checked');
});
check('login, importação, exportação e reconexão continuam usando operações existentes', () => {
  includes(more, 'toggleAuth', 'handleProgressImport(file)', 'exportProgress', "new Event('spider:cloud-review')", 'homeSyncCopy()', 'isSyncBlocked()', 'mayUseCloud(');
  includes(reconnect, 'confirmStartOnEmptyCloud(preview)', 'confirmCloudRestore(preview)');
});
check('reset padrão, backup e segurança remota continuam intactos', () => {
  includes(reset, "useState<Mode>('device')", "typed !== 'APAGAR'", 'disabled={!remoteReady}', 'remoteResetAvailable()', 'getInterruptedCloudReset()', 'finishInterruptedCloudReset()', 'exportProgress()', 'Resetar somente este dispositivo');
});
check('layout flexível, teclado e temas sem tokens novos rígidos', () => {
  includes(styles, '.settings-layout', '.help-layout', '.settings-onboarding-action', '.help-quick-links', '.help-search-toolbar', '.help-layout .is-targeted', '@media(max-width:599px)');
  assert.ok(!/#[0-9a-f]{6}/i.test(styles.slice(styles.lastIndexOf('/* Auditoria UX · Etapa 6:'))));
});
check('cenários E2E de Ajuda, Configurações, backup e reset adicionados', () => {
  includes(e2e, '320, 360, 390, 768, 1024, 1440', 'termo=0', 'fonte=0', 'bloco=0', 'Refazer configuração guiada', 'Resetar dispositivo e nuvem', 'Exportar backup JSON');
});
console.log(JSON.stringify({ ok: true, count: passed.length, checks: passed }, null, 2));
