import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, SRC_DIR, readJson, readDataJs, loadSourceItems } from './lib/data-utils.mjs';
import { buildReadingGroups, buildExtraDetailsById } from './lib/editorial-projection.mjs';

const details = process.argv.includes('--details');
const baseline = await readJson(path.join(ROOT, 'tests', 'fixtures', 'legacy-editorial-baseline.json'));
const editorial = await readJson(path.join(SRC_DIR, 'editorial', 'extras.json'));
const clone = await readJson(path.join(SRC_DIR, 'editorial', 'clone.json'));
const items = await loadSourceItems();
const readingGroups = buildReadingGroups(editorial);
const extraDetails = buildExtraDetailsById(editorial);
const itemIds = new Set(items.map(item => item.id));

const checks = [];
const check = (name, ok, detail = null) => checks.push({ name, ok, ...(detail ? { detail } : {}) });

const groupNumbers = readingGroups.map(group => group.n);
check('readingGroups 1..32', groupNumbers.length === 32 && groupNumbers.every((group, index) => group === index + 1));

const baselineGroups = new Map((baseline.readings || []).map(group => [group.n, group]));
const missingBaselineGroups = groupNumbers.filter(group => !baselineGroups.has(group));
check('todos os grupos antigos mapeados', missingBaselineGroups.length === 0, missingBaselineGroups);

const oldDetailIds = Object.keys(baseline.extraDetailsById || {}).map(Number);
const missingDetailIds = oldDetailIds.filter(id => !extraDetails[id]);
check('todos os IDs antigos de detalhes continuam resolvendo', missingDetailIds.length === 0, missingDetailIds);

const missingCatalogIds = [...new Set([
  ...readingGroups.flatMap(group => group.itemIds || []),
  ...clone.entries.map(entry => entry.id),
  ...oldDetailIds
])].filter(id => !itemIds.has(id));
check('nenhuma referência editorial órfã', missingCatalogIds.length === 0, missingCatalogIds);

const memberships = new Map();
for (const extra of editorial) {
  for (const id of extra.itemIds || []) {
    const owners = memberships.get(id) || [];
    owners.push(extra.n);
    memberships.set(id, owners);
  }
}
const duplicateMemberships = [...memberships].filter(([, owners]) => owners.length > 1);
check('itemIds sem duplicação entre editorial.extras', duplicateMemberships.length === 0, duplicateMemberships);

const cloneGroup = editorial.find(extra => extra.readingGroup === 12);
check('Saga do Clone separa card e roteiro completo', cloneGroup?.itemIds?.length === 150 && clone.entries.length === 187, {
  extraCardEntries: cloneGroup?.itemIds?.length ?? null,
  cloneRouteEntries: clone.entries.length
});

const alienGroup = editorial.find(extra => extra.readingGroup === 5);
const annual20 = editorial.find(extra => (extra.itemIds || []).includes(259));
check('Annual #20 sem associação duplicada e ordem histórica preservada', !alienGroup?.itemIds?.includes(259) && annual20?.n === 38 && annual20.after === 251 && annual20.confirmation === 'Parcial', {
  alienItemIds: alienGroup?.itemIds || [],
  annual20EditorialN: annual20?.n ?? null,
  annual20After: annual20?.after ?? null
});

const annual5 = editorial.find(extra => extra.readingGroup === 2);
check('Annual #5 preserva ordem histórica e registra divergência de fonte', annual5?.after === 61 && annual5?.confirmation === 'Parcial');

const legacyDirExists = await exists(path.join(SRC_DIR, 'legacy'));
check('data/src/legacy removido', !legacyDirExists);

const runtimeFiles = [];
await collectRuntimeFiles(path.join(ROOT, 'src'));
const appSource = (await Promise.all(runtimeFiles.map(file => fs.readFile(file, 'utf8')))).join('\n');
check('runtime não usa DATA.extras', !/DATA\.extras\b/.test(appSource));
check('runtime não usa DATA.leituras', !/DATA\.leituras\b/.test(appSource));
check('runtime não usa legacyN', !/\blegacyN\b/.test(appSource));

let builtData = null;
try { builtData = await readDataJs(); } catch {}
if (builtData) {
  check('data.js não publica DATA.extras', !Object.prototype.hasOwnProperty.call(builtData, 'extras'));
  check('data.js não publica DATA.leituras', !Object.prototype.hasOwnProperty.call(builtData, 'leituras'));
}

const readingDiffs = compareReadings(baseline.readings || [], readingGroups);
const detailDiffs = compareDetails(baseline.extraDetailsById || {}, extraDetails);
const failed = checks.filter(entry => !entry.ok);
const report = {
  safeToRemoveLegacyModels: failed.length === 0,
  checks,
  mappedReadingGroups: readingGroups.length,
  legacyDetailIdsPreserved: oldDetailIds.length - missingDetailIds.length,
  legacyDetailIdsTotal: oldDetailIds.length,
  intentionalReadingDifferences: readingDiffs.length,
  intentionalDetailDifferences: detailDiffs.length,
  ...(details ? { readingDiffs, detailDiffs } : {})
};

console.log(JSON.stringify(report, null, 2));
if (failed.length) process.exitCode = 2;

function compareReadings(before, after) {
  const beforeByN = new Map(before.map(group => [group.n, group]));
  const fields = ['after','weight','name','unavailable','sequence','why','confirmation','howMuch','where','links','itemIds','brazilianEdition','sourceRefs','justification'];
  const diffs = [];
  for (const group of after) {
    const old = beforeByN.get(group.n) || {};
    for (const field of fields) {
      const left = old[field] ?? null;
      const right = group[field] ?? null;
      if (!same(field, left, right)) diffs.push({ group: group.n, field, before: left, after: right });
    }
  }
  return diffs;
}

function compareDetails(before, after) {
  const fields = ['porque','quanto','conf','confirmationDetail'];
  const diffs = [];
  for (const [id, old] of Object.entries(before)) {
    const current = after[id];
    if (!current) { diffs.push({ id: Number(id), field: 'missing', before: old, after: null }); continue; }
    for (const field of fields) {
      const left = old[field] ?? null;
      const right = current[field] ?? null;
      if (JSON.stringify(left) !== JSON.stringify(right)) diffs.push({ id: Number(id), field, before: left, after: right });
    }
  }
  return diffs;
}

function same(field, left, right) {
  if (field === 'sourceRefs' && Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify([...left].sort((a,b)=>a-b)) === JSON.stringify([...right].sort((a,b)=>a-b));
  }
  return JSON.stringify(left) === JSON.stringify(right);
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}


async function collectRuntimeFiles(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await collectRuntimeFiles(full);
    else if (/\.(ts|tsx)$/.test(entry.name)) runtimeFiles.push(full);
  }
}
