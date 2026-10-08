import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const exists = file => fs.existsSync(path.join(root, file));
const failures = [];
const ok = (condition, message) => {
  if (!condition) failures.push(message);
};

const pkg = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/quality.yml');
const vite = read('vite.config.mjs');
const netlify = read('netlify.toml');
const playwright = read('playwright.config.ts');
const e2eSpec = read('tests/e2e/spider-guia.spec.ts');
const unitSuites = fs.readdirSync(path.join(root, 'tests/unit')).filter(name => name.endsWith('.test.ts')).length;
const e2eCriticalFlows = (e2eSpec.match(/\btest\('/g) || []).length;

for (const file of [
  'vitest.config.ts',
  'playwright.config.ts',
  'tests/unit/state.test.ts',
  'tests/unit/sync-merge.test.ts',
  'tests/unit/router.test.ts',
  'tests/unit/schema.test.ts',
  'tests/unit/reading-preferences.test.ts',
  'tests/unit/extra-confirmation.test.ts',
  'tests/unit/bulk-progress.test.ts',
  'tests/e2e/spider-guia.spec.ts',
  '.github/workflows/quality.yml',
  'netlify.toml'
]) ok(exists(file), `Arquivo obrigatório ausente: ${file}`);

for (const dep of ['vitest', '@playwright/test']) {
  ok(Boolean(pkg.devDependencies?.[dep]), `Dependência de qualidade ausente: ${dep}`);
}
for (const script of ['test:unit', 'test:e2e', 'e:check', 'build']) {
  ok(Boolean(pkg.scripts?.[script]), `Script obrigatório ausente: ${script}`);
}

ok(/base:\s*['"]\.\/['"]/.test(vite), 'Vite precisa manter base relativa para deploy estático portátil.');
ok(/outDir:\s*['"]dist['"]/.test(vite), 'Vite precisa continuar gerando dist/.');
ok(/publish\s*=\s*"dist"/.test(netlify), 'Netlify precisa publicar dist/.');
ok(/command\s*=\s*"npm run build"/.test(netlify), 'Netlify precisa usar npm run build.');
ok(/playwright install --with-deps chromium/.test(workflow), 'CI precisa instalar Chromium para Playwright.');
ok(/npm run e:check/.test(workflow), 'CI precisa executar o quality gate do Marco E.');
ok(/npm run test:e2e/.test(workflow), 'CI precisa executar Playwright.');
ok(/npm run data:build/.test(workflow), 'CI deve regenerar dados antes dos testes.');
ok(!/deploy-pages|upload-pages-artifact|pages: write|id-token: write/.test(workflow), 'CI não deve publicar no GitHub Pages.');
ok(/npm run reset:local-smoke/.test(workflow) && /npm run reset:smoke/.test(workflow), 'CI precisa testar resets local e remoto.');
ok(/webServer:[\s\S]*npm run build[\s\S]*npm run preview/.test(playwright), 'Playwright deve testar o build de produção via preview.');

const runtimeDeps = Object.keys(pkg.dependencies || {});
const serverRuntimeDeps = runtimeDeps.filter(name => /^(express|fastify|koa|next|nuxt|@remix-run\/node|hono)$/.test(name));
ok(serverRuntimeDeps.length === 0, `Runtime de servidor introduzido: ${serverRuntimeDeps.join(', ')}`);

if (failures.length) {
  console.error('Marco E — falhas de arquitetura/qualidade:');
  failures.forEach(item => console.error(`- ${item}`));
  process.exit(1);
}

console.log(JSON.stringify({
  ok: true,
  staticHosting: true,
  unitSuites,
  e2eCriticalFlows,
  githubPages: false,
  netlify: true,
  deploymentOwnedBy: 'Netlify',
  runtimeDependencies: runtimeDeps
}, null, 2));
