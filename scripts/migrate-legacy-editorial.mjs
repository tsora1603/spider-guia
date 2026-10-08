import fs from 'node:fs/promises';
import path from 'node:path';
import { ROOT, SRC_DIR, readJson, writeJson } from './lib/data-utils.mjs';

const checkOnly = process.argv.includes('--check');
const extrasPath = path.join(SRC_DIR, 'editorial', 'extras.json');
const legacyDir = path.join(SRC_DIR, 'legacy');
const legacyReadingsPath = path.join(legacyDir, 'leituras.json');
const legacyExtrasPath = path.join(legacyDir, 'extras.json');
const baselinePath = path.join(ROOT, 'tests', 'fixtures', 'legacy-editorial-baseline.json');

const extras = await readJson(extrasPath);
const legacyAvailable = await exists(legacyReadingsPath) && await exists(legacyExtrasPath);
let legacyReadings = [];
let legacyExtras = {};

if (legacyAvailable) {
  legacyReadings = await readJson(legacyReadingsPath);
  legacyExtras = await readJson(legacyExtrasPath);
  if (!(await exists(baselinePath))) {
    await writeJson(baselinePath, {
      version: 1,
      capturedFrom: 'Marco A antes da consolidação A.1',
      readings: legacyReadings,
      extraDetailsById: legacyExtras
    });
  }
} else if (await exists(baselinePath)) {
  const baseline = await readJson(baselinePath);
  legacyReadings = baseline.readings || [];
  legacyExtras = baseline.extraDetailsById || {};
} else {
  throw new Error('Baseline legado ausente: não é possível verificar/aplicar a migração com segurança.');
}

const readingByGroup = new Map(legacyReadings.map(reading => [reading.n, reading]));
const oldDetailById = new Map(Object.entries(legacyExtras).map(([id, detail]) => [Number(id), detail]));

for (const extra of extras) {
  if (extra.legacyN != null && extra.readingGroup == null) extra.readingGroup = extra.legacyN;
  delete extra.legacyN;

  if (extra.readingGroup != null) {
    const legacy = readingByGroup.get(extra.readingGroup);
    if (!legacy) throw new Error(`readingGroup ${extra.readingGroup} não possui baseline legado.`);
    extra.unavailable = Boolean(legacy.unavailable);
    extra.where = legacy.where ?? null;
    extra.links = Array.isArray(legacy.links) ? legacy.links : [];
    extra.src = unique([...(extra.src || []), ...(legacy.sourceRefs || [])]);
  }

  if (extra.sourceRefs?.length) extra.src = unique([...(extra.src || []), ...extra.sourceRefs]);
  delete extra.sourceRefs;
}

// Resoluções editoriais explícitas.
const annual5 = byReadingGroup(2);
annual5.after = 61;
annual5.sequence = 'Leia depois da Amazing #61 e antes da #62 (posição histórica preservada para manter o snapshot de IDs/ordem).';
annual5.why = 'Peter descobre a verdade sobre Richard e Mary Parker e entende que seus pais eram agentes duplos. É um marco de desenvolvimento pessoal/familiar.';
annual5.brazilianEdition = 'a confirmar';
annual5.confirmation = 'Parcial';
annual5.confirmationNote = 'As fontes consultadas posicionam o Annual #5 depois da Amazing #62, mas o catálogo histórico do site o mantém depois da #61. A ordem do catálogo é preservada por compatibilidade; a divergência fica explícita.';
annual5.positionEvidence = 'Divergente — fontes indicam depois da #62; catálogo preservado depois da #61';
annual5.weightEvidence = 'Confirmado por fontes e conteúdo documentado';
annual5.confirmationDetail = 'Comics Back Issues e Crushing Krisis posicionam o Annual #5 depois da Amazing #62; o GCD confirma a edição e a história sobre os pais de Peter. Como o requisito de regressão exige os IDs na mesma ordem, o site mantém a posição histórica depois da #61 e marca o status geral como Parcial.';
annual5.just = annual5.confirmationDetail;
annual5.src = unique([...(annual5.src || []), 123]);

const whatIf30 = byReadingGroup(3);
whatIf30.confirmation = 'Parcial';
whatIf30.weightEvidence = 'Parcial — posição sustentada; peso Opcional ainda é classificação editorial';
whatIf30.confirmationDetail = 'A cronologia sustenta a posição relativa e a fonte identifica a história como um cenário “What If?” derivado da Saga do Clone; o peso Opcional continua sendo uma classificação editorial, por isso o status geral permanece Parcial.';
whatIf30.just = whatIf30.confirmationDetail;
whatIf30.src = unique([20, 124, 156, ...(whatIf30.src || [])]);

const alien = byReadingGroup(5);
alien.name = 'Marvel Team-Up #141–150 e Annual #7; Peter Parker, The Spectacular Spider-Man #90–100';
alien.itemIds = [256, 257, 258];
alien.howMuch = '22 edições (Marvel Team-Up #141–150 + Annual #7; Spectacular Spider-Man #90–100)';
alien.brazilianEdition = 'a confirmar';
alien.confirmation = 'Parcial';
alien.confirmationNote = 'A ordem da Saga do Traje Negro sustenta a posição; o peso Opcional continua sendo recomendação editorial. Amazing Spider-Man Annual #20 foi removido deste bloco por ser de 1986 e ter encaixe próprio depois da #282.';
alien.weightEvidence = 'Parcial — posição sustentada; peso Opcional ainda é classificação editorial';
alien.confirmationDetail = 'A fonte da Saga do Traje Negro inclui Marvel Team-Up #141–150, Marvel Team-Up Annual #7 e Spectacular Spider-Man #90–100. Amazing Spider-Man Annual #20 não pertence a esse bloco e permanece como leitura editorial própria depois da #282.';
alien.just = alien.confirmationDetail;
alien.src = unique([21, 124]);

const deWolff = byReadingGroup(7);
deWolff.brazilianEdition = 'a confirmar';

const honeymoon = byReadingGroup(9);
honeymoon.name = 'Peter Parker, The Spectacular Spider-Man Annual #7 (1987), a lua de mel';
honeymoon.why = 'É a lua de mel de Peter e Mary Jane e dá continuidade imediata ao casamento, desenvolvendo o relacionamento no começo da vida de casados.';
honeymoon.brazilianEdition = 'a confirmar';

const clone = byReadingGroup(12);
const cloneLegacy = readingByGroup.get(12);
clone.itemIds = [...cloneLegacy.itemIds];
clone.howMuch = `${clone.itemIds.length} entradas fora da numeração histórica; o roteiro completo em editorial.clone mantém 187 entradas, incluindo contexto, Amazing principal e epílogo.`;
clone.confirmationDetail = 'Este card representa somente as entradas fora da numeração histórica da Saga do Clone. O roteiro dedicado editorial.clone continua com 187 entradas e inclui, separadamente, contexto da saga original, capítulos da Amazing principal e leituras posteriores.';
clone.just = clone.confirmationDetail;

const spiderIsland = byReadingGroup(21);
spiderIsland.howMuch = '4 edições (+ minisséries)';
spiderIsland.brazilianEdition = 'a confirmar';
spiderIsland.confirmation = 'Parcial';
spiderIsland.weightEvidence = 'Parcial — posição sustentada; peso Opcional do bloco completo ainda não é uniforme nas fontes';
spiderIsland.confirmationDetail = 'As fontes sustentam a posição dos tie-ins de Spider-Island, mas não sustentam de forma uniforme que todo o bloco selecionado seja Opcional.';
spiderIsland.just = spiderIsland.confirmationDetail;

for (const group of [22, 26, 30, 32]) byReadingGroup(group).brazilianEdition = 'a confirmar';

// Preserve o detalhamento mais específico do runtime legado quando ele era mais conservador.
for (const extra of extras) {
  const oldDetails = (extra.itemIds || []).map(id => oldDetailById.get(id)).filter(Boolean);
  if (!oldDetails.length || extra.n === 38 || extra.readingGroup === 2) continue;
  const first = oldDetails[0];
  const same = field => oldDetails.every(detail => detail[field] === first[field]);
  if (same('confirmationDetail') && first.confirmationDetail) {
    extra.confirmationDetail = first.confirmationDetail;
    extra.just = first.confirmationDetail;
  }
  if (same('conf') && first.conf === 'Parcial' && extra.confirmation === 'Confirmado') {
    extra.confirmation = 'Parcial';
    extra.weightEvidence = 'Parcial — posição sustentada; peso/relevância ainda sem confirmação independente suficiente';
  }
}

// Contradição sistemática introduzida no Marco A: “Confirmado” com nota dizendo que o peso não tem evidência suficiente.
for (const extra of extras) {
  if (extra.confirmation === 'Confirmado' && /peso ainda não possui evidência suficiente/i.test(extra.confirmationNote || '')) {
    extra.confirmation = 'Parcial';
    extra.weightEvidence = 'Parcial — posição confirmada; peso editorial ainda sem confirmação independente';
    extra.confirmationDetail = `A posição é sustentada pelas fontes cronológicas/bibliográficas consultadas; o peso ${extra.weight.replace(/^[●◐○]\s*/, '')} ainda não possui confirmação independente suficiente. Status geral: Parcial.`;
    extra.just = extra.confirmationDetail;
  }
}

// Annual #20: associação duplicada removida. A posição histórica do catálogo é preservada por regressão,
// embora as fontes consultadas sustentem um encaixe posterior, depois da #282.
const annual20 = extras.find(extra => extra.n === 38);
annual20.after = 251;
annual20.sequence = 'Leia antes da Amazing #252, na posição histórica já usada pelo catálogo (compatibilidade de ordem).';
annual20.src = unique([123, 157]);
annual20.confirmation = 'Parcial';
annual20.confirmationNote = 'As fontes cronológicas/bibliográficas sustentam um encaixe em 1986, depois da #282, mas o catálogo histórico posiciona este ID antes da #252. A posição legada é preservada para manter o snapshot de IDs/ordem.';
annual20.positionEvidence = 'Divergente — fontes indicam depois da #282; catálogo preservado antes da #252';
annual20.weightEvidence = 'Parcial — peso editorial ainda sem confirmação independente';
annual20.confirmationDetail = 'Amazing Spider-Man Annual #20 é uma edição de 1986 e as fontes consultadas a posicionam depois da #282; portanto ela não pertence factualmente à Saga do Traje Negro. A associação duplicada com o bloco do traje negro foi removida, mas o ID 259 permanece na posição histórica anterior à #252 para cumprir a regressão de ordem. Status geral: Parcial.';
annual20.just = annual20.confirmationDetail;

// Campos editoriais que não são edições brasileiras nunca recebem notas de fonte herdadas do legado.
for (const group of [2, 7, 9]) {
  const extra = byReadingGroup(group);
  if (!extra.brazilianEdition || /^(Fonte:|Confirmado$)/i.test(extra.brazilianEdition)) extra.brazilianEdition = 'a confirmar';
}

// Normaliza ordenação de fontes e garante readingGroup único.
for (const extra of extras) extra.src = unique(extra.src || []).sort((a, b) => a - b);

if (checkOnly) {
  verifyTarget(extras);
  console.log('Migração editorial A.1 já aplicada e consistente.');
  process.exit(0);
}

await writeJson(extrasPath, extras);
if (legacyAvailable) await fs.rm(legacyDir, { recursive: true, force: true });
verifyTarget(extras);
console.log('Migração editorial A.1 aplicada: editorial.extras consolidado e data/src/legacy removido.');

function byReadingGroup(group) {
  const extra = extras.find(entry => entry.readingGroup === group || entry.legacyN === group);
  if (!extra) throw new Error(`Extra editorial do readingGroup ${group} não encontrado.`);
  return extra;
}

function unique(values) {
  return [...new Set(values.filter(value => value != null))];
}

async function exists(filePath) {
  try { await fs.access(filePath); return true; } catch { return false; }
}

function verifyTarget(entries) {
  const groups = entries.filter(entry => entry.readingGroup != null).map(entry => entry.readingGroup);
  if (groups.length !== 32 || new Set(groups).size !== 32 || groups.some((group, index) => [...groups].sort((a, b) => a - b)[index] !== index + 1)) {
    throw new Error('readingGroup deve preservar exatamente os grupos 1..32.');
  }
  if (entries.some(entry => 'legacyN' in entry)) throw new Error('legacyN ainda existe em editorial.extras.');
  const memberships = new Map();
  for (const entry of entries) for (const id of entry.itemIds || []) {
    const list = memberships.get(id) || [];
    list.push(entry.n);
    memberships.set(id, list);
  }
  const duplicates = [...memberships].filter(([, list]) => list.length > 1);
  if (duplicates.length) throw new Error(`itemIds duplicados entre extras: ${JSON.stringify(duplicates)}`);
  const cloneGroup = entries.find(entry => entry.readingGroup === 12);
  if (cloneGroup.itemIds.length !== 150) throw new Error(`Saga do Clone extra deveria ter 150 entradas fora da numeração; recebeu ${cloneGroup.itemIds.length}.`);
  if (entries.find(entry => entry.readingGroup === 5).itemIds.includes(259)) throw new Error('Annual #20 (ID 259) ainda está no bloco da Saga do Traje Negro.');
  const annual5 = entries.find(entry => entry.readingGroup === 2);
  if (annual5?.after !== 61 || annual5?.confirmation !== 'Parcial') throw new Error('Annual #5 perdeu a posição histórica/estado Parcial esperado.');
  const annual20 = entries.find(entry => (entry.itemIds || []).includes(259));
  if (annual20?.n !== 38 || annual20?.after !== 251 || annual20?.confirmation !== 'Parcial') throw new Error('Annual #20 perdeu a associação única/posição histórica esperada.');
}
