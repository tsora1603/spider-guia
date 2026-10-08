import assert from 'node:assert/strict';
import fs from 'node:fs/promises';

const read = name => fs.readFile(new URL(`../${name}`, import.meta.url), 'utf8');
const [baselineText, indexText, styles, app, e2e, main] = await Promise.all([
  read('data/snapshots/item-ids.json'), read('src/data/generated-index.json'),
  read('src/styles.css'), read('src/views/App.tsx'), read('tests/e2e/final-quality-stage7.spec.ts'), read('src/main.tsx')
]);
const expectedIds = JSON.parse(baselineText);
const index = JSON.parse(indexText);
let count = 0;
function check(message, fn) { fn(); count += 1; console.log(`OK ${count}: ${message}`); }
check('índice atual consistente com os IDs versionados', () => {
  assert.equal(index.itemIndex.length, expectedIds.length);
  assert.ok(index.catalogChunks.length > 0);
  const idColumn = index.itemIndexFields.indexOf('id');
  assert.ok(idColumn >= 0);
  assert.deepEqual(index.itemIndex.map(row => row[idColumn]), expectedIds);
});
// Integridade de arquivos gerados, editorial e segurança é verificada pelos
// testes de dados, tipos, migrações, reset e progressos (não por SHA de 2026).
const bulk = await read('src/progress/bulk-progress.ts');
check('ações em lote operam sobre o plano ativo', () => {
  assert.match(bulk, /buildReadingPlan\(readingPreferences\.get\(\)\)/);
  assert.match(bulk, /kind: 'plan'/);
});
check('breakpoint de menu desktop coincide com o rail de 900px', () => {
  assert.ok(!styles.includes('@media(min-width:860px)'));
  assert.match(styles, /@media\(min-width:900px\)/);
  assert.match(styles, /@media\(max-width:899px\)/);
});
check('diálogos não extrapolam viewport vertical', () => {
  assert.match(styles, /dialog\{[^}]*max-height:calc\(100dvh - 24px\);overflow-y:auto/);
});
check('respeita preferência de movimento reduzido e foco por teclado', () => {
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)\{\s*html\{scroll-behavior:auto\}/);
  assert.match(styles, /\.state-spinner\{animation:none\}/);
  assert.match(styles, /#nav button:focus-visible/);
});
check('estado local separado de sincronização remota', () => {
  assert.match(app, /!supabaseClient \|\| !appState\.currentUser \? 'local'/);
  assert.match(app, /local: 'Neste dispositivo'/);
});
check('atalho de acesso ao conteúdo mantém a rota atual', () => {
  assert.match(main, /\.skip-link'\)\?\.addEventListener\('click', event =>/);
  assert.match(main, /event\.preventDefault\(\)/);
  assert.match(main, /main\?\.focus\(\{ preventScroll: true \}\)/);
  assert.ok(e2e.includes('pular para o conteúdo mantém a rota'));
});
check('testes E2E adicionados para breakpoints, modos de contraste e fluxo sensível', () => {
  for (const expected of ['320, 360, 390, 768, 899, 900, 1024, 1440', "'dark', 'light', 'auto'", "'large'", 'Escape', 'Resetar todos os dados']) assert.ok(e2e.includes(expected), `E2E faltando ${expected}`);
});
console.log(`Etapa 7: ${count} grupos de verificações passaram.`);
