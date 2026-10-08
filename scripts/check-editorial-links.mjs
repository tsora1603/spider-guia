import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { ROOT, loadSourceItems } from './lib/data-utils.mjs';

// Valida o conteúdo editável de public/links.js sem comparar hashes históricos.
// Executa apenas em sandbox VM Node com uma janela simulada, sem rede ou DOM.
const source = await fs.readFile(path.join(ROOT, 'public/links.js'), 'utf8');
const sandbox = { window: { LINKS_ENABLED: true } };
vm.runInNewContext(source, sandbox, { filename: 'public/links.js', timeout: 1_000 });
const groups = sandbox.window.EDITORIAL_LINKS;
assert.ok(Array.isArray(groups), 'EDITORIAL_LINKS deve ser um array');
assert.ok(groups.length > 0, 'Sem grupos de links editoriais');
assert.equal(typeof sandbox.window.getEditorialLinks, 'function', 'getEditorialLinks ausente');
assert.equal(sandbox.window.getEditorialLinks(), groups, 'getEditorialLinks deve retornar os grupos definidos');
const knownIds = new Set((await loadSourceItems()).map(item => item.id));
const seen = new Set();
let total = 0;
const nonEmpty = (value, label) => assert.ok(typeof value === 'string' && value.trim(), `${label} deve ser texto não vazio`);
function destination(entry, label) {
  assert.ok(entry && typeof entry === 'object' && !Array.isArray(entry), `${label} deve ser objeto`);
  nonEmpty(entry.label, `${label}.label`);
  nonEmpty(entry.url, `${label}.url`);
  let url;
  try { url = new URL(entry.url); } catch { assert.fail(`${label}: URL inválida`); }
  assert.ok(['https:', 'http:'].includes(url.protocol) && url.hostname, `${label}: URL deve ser http(s)`);
  total++;
}
for (const [i, group] of groups.entries()) {
  const label = `EDITORIAL_LINKS[${i}]`;
  assert.ok(group && typeof group === 'object', `${label} deve ser objeto`);
  nonEmpty(group.id, `${label}.id`);
  assert.ok(!seen.has(group.id), `${label}: ID duplicado ${group.id}`);
  seen.add(group.id);
  nonEmpty(group.title, `${label}.title`);
  if (group.context != null) assert.equal(typeof group.context, 'string', `${label}.context deve ser texto`);
  if (group.readingGroup != null) assert.ok(Number.isInteger(group.readingGroup) && group.readingGroup > 0, `${label}.readingGroup inválido`);
  assert.ok(Array.isArray(group.itemIds) && group.itemIds.length > 0, `${label}.itemIds vazio`);
  for (const id of group.itemIds) assert.ok(Number.isInteger(id) && knownIds.has(id), `${label}: HQ inexistente ${id}`);
  if (group.brazilianEdition != null) nonEmpty(group.brazilianEdition, `${label}.brazilianEdition`);
  for (const key of ['links', 'stores', 'libraries']) {
    if (key === 'links') assert.ok(Array.isArray(group[key]), `${label}.links precisa ser array`);
    else if (group[key] != null) assert.ok(Array.isArray(group[key]), `${label}.${key} precisa ser array`);
    for (const [j, entry] of (group[key] || []).entries()) destination(entry, `${label}.${key}[${j}]`);
  }
}
console.log(`Links editoriais OK: ${groups.length} grupos, ${total} destinos HTTP(S), IDs válidos e sem duplicidade.`);
