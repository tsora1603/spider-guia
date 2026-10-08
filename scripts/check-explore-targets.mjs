import assert from 'node:assert/strict';
import { exploreTarget, exploreRouteParam, replaceExploreSearch, focusEditorialTarget, milestoneAnchorKey, extraAnchorKey } from '../src/views/explore-navigation.ts';

import fs from 'node:fs';
const catalog = JSON.parse(fs.readFileSync(new URL('../src/data/generated-index.json', import.meta.url), 'utf8'));
const milestoneKeys = catalog.marcos.r.map(([year, title]) => milestoneAnchorKey({year, title}));
const extraKeys = catalog.editorial.extras.map(extraAnchorKey);
assert.equal(new Set(milestoneKeys).size, milestoneKeys.length, 'marcos têm chaves distintas');
assert.equal(new Set(extraKeys).size, extraKeys.length, 'extras têm chaves distintas');

const location = { hash: '#explorar/jornada' };
const historyCalls = [];
const history = { state: { proof: 'kept' }, replaceState(state, title, hash) {
  assert.equal(state.proof, 'kept');
  historyCalls.push(hash);
  location.hash = hash;
}};
Object.assign(globalThis, { location, history, window: globalThis });
assert.equal(exploreTarget('jornada', 'marco', 11), '#explorar/jornada?marco=11');
assert.equal(exploreTarget('extras', 'extra', 12), '#explorar/extras?extra=12');
assert.equal(exploreTarget('links', 'link', 'leitura-4'), '#explorar/links?link=leitura-4');
location.hash = '#explorar/jornada?marco=7&origem=antiga';
assert.equal(exploreRouteParam('marco'), '7');
replaceExploreSearch('Jean DeWolff');
assert.equal(location.hash, '#explorar/jornada?origem=antiga&q=Jean+DeWolff');
assert.equal(exploreRouteParam('marco'), null);
replaceExploreSearch('');
assert.equal(location.hash, '#explorar/jornada?origem=antiga');
assert.equal(historyCalls.length, 2);
location.hash = '#checklist';
replaceExploreSearch('nada');
assert.equal(location.hash, '#checklist', 'busca não reescreve rotas fora de Explorar');

const summary = { focused: false, focus(options) { assert.equal(options.preventScroll, true); this.focused = true; } };
const item = { scrolled: false, scrollIntoView(options) { assert.equal(options.block, 'center'); this.scrolled = true; }, matches() { return true; }, querySelector() { return summary; } };
Object.assign(globalThis, { document: { getElementById(id) { return id === 'explore-link-0' ? item : null; } } });
focusEditorialTarget('explore-link-0');
assert.equal(item.scrolled, true);
assert.equal(summary.focused, true);
focusEditorialTarget('unlisted');
console.log(JSON.stringify({ ok: true, checks: 14, uniqueMilestones: milestoneKeys.length, uniqueExtras: extraKeys.length, historyReplacements: historyCalls.length }, null, 2));
