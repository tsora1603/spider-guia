import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => fs.readFile(path.join(root, name), 'utf8');
const [explore, navigation, journey, links, extras, editorial, router, controller, e2e, jsonText] = await Promise.all([
  'src/views/ExploreView.tsx', 'src/views/explore-navigation.ts', 'src/views/JourneyView.tsx',
  'src/views/LinksView.tsx', 'src/views/ReadingView.tsx', 'src/components/Editorial.tsx',
  'src/router/router.ts', 'src/runtime/controller.ts', 'tests/e2e/spider-guia.spec.ts',
  'src/data/generated-index.json'
].map(read));
const data = JSON.parse(jsonText);
const assertIncludes = (source, text) => assert.ok(source.includes(text), `Esperado: ${text}`);
const passed = [];
function check(label, fn) { fn(); passed.push(label); }
check('índice completo e ordenação', () => {
  assert.equal(data.itemIndex.length, 1301);
  assert.equal(data.catalogChunks.length, 46);
});
check('busca global separa edições e resultados editoriais', () => {
  for (const text of ['issueResults', 'milestoneResults', 'extraResults', 'cloneResults', 'linkResults', 'getEditorialLinkGroups()']) assertIncludes(explore, text);
  assertIncludes(explore, 'linksEnabled ?');
});
check('marco abre item explícito, não seção genérica', () => {
  assertIncludes(explore, "exploreTarget('jornada', 'marco', milestoneAnchorKey(item))");
  assertIncludes(journey, 'targetMilestone === milestones.indexOf(milestone)');
  assertIncludes(journey, 'milestone.historicalStart ? principalReadings.find');
});
check('extra abre entrada e filtro não esconde item', () => {
  assertIncludes(explore, "exploreTarget('extras', 'extra', extraAnchorKey(item))");
  assertIncludes(extras, "setFilter('all')");
  assertIncludes(editorial, 'targeted ? true : undefined');
});
check('link direto respeita a flag e abre grupo', () => {
  assertIncludes(explore, "exploreTarget('links', 'link', group.key)");
  assertIncludes(links, "exploreRouteParam('link')");
  assertIncludes(links, "params.set('lq', value)");
  assertIncludes(links, 'href={entry.url}');
});
check('busca e retorno restauram contexto sem poluir histórico', () => {
  assertIncludes(navigation, 'history.replaceState(history.state');
  assertIncludes(navigation, "params.set('q', query)");
  assertIncludes(explore, "params.get('q')");
});
check('alvos recebem abertura, scroll e foco', () => {
  for (const source of [journey, links, extras]) assertIncludes(source, 'focusEditorialTarget(');
  assertIncludes(navigation, 'scrollIntoView(');
  assertIncludes(navigation, '.focus({ preventScroll: true })');
});
check('rotas legadas e parâmetros mantidos', () => {
  assertIncludes(router, "'#jornada': '#explorar/jornada'");
  assertIncludes(router, 'routeQuery: params.toString()');
  assertIncludes(controller, "new URLSearchParams(route.routeQuery || '').has('marco')");
});
check('testes e2e cobrem busca/resultado/voltar/mobile', () => {
  for (const text of ['UX Etapa 5', 'page.goBack()', '320, height: 740', 'data-explore-target="extra"', 'data-explore-target="link"']) assertIncludes(e2e, text);
});
console.log(JSON.stringify({ ok: true, checks: passed, count: passed.length }, null, 2));
