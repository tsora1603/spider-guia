import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relative => fs.readFile(path.join(ROOT, relative), 'utf8');
const exists = async relative => fs.access(path.join(ROOT, relative)).then(() => true).catch(() => false);
const fail = message => { throw new Error(`Etapa 5: ${message}`); };

const [pkgSource, model, buildData, home, engagement, linksView, linkCardModel, generatedIndexSource] = await Promise.all([
  read('package.json'),
  read('src/data/model.ts'),
  read('scripts/build-data.mjs'),
  read('src/views/HomeView.tsx'),
  read('src/engagement/EngagementCard.tsx'),
  read('src/views/LinksView.tsx'),
  read('src/views/link-card-model.ts'),
  read('src/data/generated-index.json')
]);
const pkg = JSON.parse(pkgSource);
const generatedIndex = JSON.parse(generatedIndexSource);

const chunksDir = path.join(ROOT, 'src/data/chunks');
const chunkFiles = (await fs.readdir(chunksDir)).filter(name => name.endsWith('.json')).sort();
if (chunkFiles.length === 0) fail('Nenhum chunk de fase encontrado.');
if (!Array.isArray(generatedIndex.catalogChunks) || generatedIndex.catalogChunks.length !== chunkFiles.length) fail('Índice não corresponde ao conjunto de chunks.');
if (!Array.isArray(generatedIndex.itemIndex) || generatedIndex.itemIndex.length === 0) fail('Índice compacto vazio.');
const chunkIds = [];
const chunkOrders = [];
for (const file of chunkFiles) {
  const chunk = JSON.parse(await fs.readFile(path.join(chunksDir, file), 'utf8'));
  const fields = Object.fromEntries((chunk.itemFields || []).map((field, index) => [field, index]));
  for (const row of chunk.items || []) {
    chunkIds.push(Number(row[fields.id]));
    chunkOrders.push(Number(row[fields.readingOrder]));
  }
}
if (chunkIds.length !== generatedIndex.itemIndex.length || new Set(chunkIds).size !== chunkIds.length) fail('IDs de chunks ausentes ou duplicados.');
if (new Set(chunkOrders).size !== chunkIds.length || Math.min(...chunkOrders) !== 1 || Math.max(...chunkOrders) !== chunkIds.length) fail('readingOrder dos chunks deve ser sequencial, sem lacunas.');
if (!/catalogChunkLoaders/.test(model) || !/loadPhaseReadings/.test(model) || !/loadReadingDetails/.test(model)) fail('loader sob demanda por fase ausente.');
if (!/generated-index\.json/.test(model) || /generated-data\.json/.test(model)) fail('runtime deve importar o índice compacto, não o catálogo detalhado inteiro.');
if (!/generated-chunks/.test(buildData) || !/chunksDir/.test(buildData)) fail('build-data não gera chunks por fase.');

if (!/EngagementCard/.test(home)) fail('Hoje não exibe acompanhamento pessoal.');
if (!/Meta semanal/.test(engagement) || !/Próximo marco/.test(home)) fail('meta semanal ou próximo marco ausente.');
if (!/Não existe ranking, perfil público, sequência diária ou compartilhamento/.test(engagement)) fail('escopo privado não está explícito na interface.');

const forbiddenFiles = ['src/collection', 'src/share'];
for (const relative of forbiddenFiles) if (await exists(relative)) fail(`${relative} não deve existir no escopo privado.`);
const sourceFiles = [];
async function collect(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collect(full);
    else if (/\.(?:ts|tsx|mjs|js|json)$/.test(entry.name)) sourceFiles.push(full);
  }
}
await collect(path.join(ROOT, 'src'));
for (const relative of ['scripts/build-data.mjs']) sourceFiles.push(path.join(ROOT, relative));
const searchable = (await Promise.all(sourceFiles.map(file => fs.readFile(file, 'utf8')))).join('\n');
for (const pattern of ['navigator.share', 'shareProgressCard', 'paniniStoreUrl', 'paniniEditions', 'Lista de compras', 'Buscar na Panini', 'conta-colecao', 'badge-list']) {
  if (searchable.includes(pattern)) fail(`feature fora do escopo privado encontrada: ${pattern}`);
}

// A integridade estrutural dos Links continua sendo validada por check-editorial-links.mjs.
// O consumidor usa uma projeção tipada para apresentar destinos sem disclosures.
for (const required of [
  'editorialLinks', 'createEditorialLinkCards', 'href={destination.url}',
  'target="_blank"', 'rel="noopener noreferrer"'
]) if (!linksView.includes(required)) fail(`LinksView não mantém o destino externo: ${required}`);
for (const required of [
  'group.links', 'group.stores', 'group.libraries', 'model?.resolveExtraId', 'extraAnchorKey'
]) if (!linkCardModel.includes(required)) fail(`Projeção de Links não mantém as associações: ${required}`);
if ('paniniEditions' in generatedIndex) fail('índice contém projeção de catálogo oficial que não pertence ao escopo privado.');

if (!pkg.scripts?.['stage5:check']) fail('script stage5:check ausente.');
console.log(JSON.stringify({
  ok: true,
  phaseChunks: chunkFiles.length,
  personalGoals: true,
  socialFeatures: false,
  officialCatalogFeatures: false,
  linksValidatedBy: 'check-editorial-links.mjs'
}, null, 2));
