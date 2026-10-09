import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT,
  SRC_DIR,
  readJson,
  loadSourceManifest,
  itemObjectToRow,
  faseObjectToRow,
  marcoObjectToRow,
  pularObjectToRow,
  sourceObjectToRow,
  glossaryObjectToRow
} from './lib/data-utils.mjs';
import { buildReadingGroups } from './lib/editorial-projection.mjs';
import { validateEditorialLinks } from '../data/link-model.mjs';
import {
  CatalogPhaseSchema,
  FaseSchema,
  ExtraSchema,
  EditorialLinkGroupSchema,
  LeituraSchema,
  CloneSchema,
  MarcoSchema,
  SkipRuleSchema,
  SourceSchema,
  GlossaryEntrySchema,
  MethodologyEntrySchema,
  ChangelogEntrySchema,
  EditorialMetaSchema
} from '../data/schema.mjs';

const checkOnly = process.argv.includes('--check');
const manifest = await loadSourceManifest();
const groups = [];
for (const relative of manifest.catalogFiles) {
  const group = CatalogPhaseSchema.parse(await readJson(path.join(SRC_DIR, relative)));
  groups.push(group);
}
const items = groups.flatMap(group => group.items).sort((a, b) => a.readingOrder - b.readingOrder);
const fases = zodArray(FaseSchema, await readJson(path.join(SRC_DIR, 'fases.json')), 'fases');
const marcos = zodArray(MarcoSchema, await readJson(path.join(SRC_DIR, 'marcos.json')), 'marcos');
const pular = zodArray(SkipRuleSchema, await readJson(path.join(SRC_DIR, 'pular.json')), 'pular');
const fontes = zodArray(SourceSchema, await readJson(path.join(SRC_DIR, 'fontes.json')), 'fontes');
const glossario = zodArray(GlossaryEntrySchema, await readJson(path.join(SRC_DIR, 'glossario.json')), 'glossario');
const editorialExtras = zodArray(ExtraSchema, await readJson(path.join(SRC_DIR, 'editorial', 'extras.json')), 'editorial.extras');
const editorialLinks = zodArray(EditorialLinkGroupSchema, await readJson(path.join(SRC_DIR, 'editorial', 'links.json')), 'editorial.links');
const derivedReadings = zodArray(LeituraSchema, buildReadingGroups(editorialExtras), 'editorial.readingGroups (derived)');
const clone = CloneSchema.parse(await readJson(path.join(SRC_DIR, 'editorial', 'clone.json')));
const metodologia = zodArray(MethodologyEntrySchema, await readJson(path.join(SRC_DIR, 'editorial', 'metodologia.json')), 'editorial.metodologia');
const changelog = zodArray(ChangelogEntrySchema, await readJson(path.join(SRC_DIR, 'editorial', 'changelog.json')), 'editorial.changelog');
const editorialMeta = EditorialMetaSchema.parse(await readJson(path.join(SRC_DIR, 'editorial', 'meta.json')));
validateInvariants({ items, fases, marcos, editorialExtras, derivedReadings, clone, fontes });
const linkErrors = validateEditorialLinks(editorialLinks, { knownItemIds: new Set(items.map(item => item.id)), extras: editorialExtras });
if (linkErrors.length) throw new Error(`Links editoriais inválidos: ${JSON.stringify(linkErrors)}`);

const ITEM_INDEX_FIELDS = [
  'id',
  'historicalNumber',
  'type',
  'series',
  'issue',
  'phase',
  'weight',
  'readingOrder',
  'searchHint'
];
const SEARCH_STOPWORDS = new Set('como encaixar leia leitura depois antes linha principal porque ajuda confirmacao confirmado confirmada parcial contexto opcional essencial continue marque checklist uma para com sem que por das dos nas nos nao sim sua seu suas seus this the and spider man amazing edition issue volume vol panini'.split(' '));
const compactSearchHint = item => {
  const text = [item.instructions, item.note].filter(Boolean).join(' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const tokens = text.match(/[a-z0-9#]+/g) || [];
  return [...new Set(tokens.filter(token => token.length >= 3 && !SEARCH_STOPWORDS.has(token)))].join(' ');
};
const itemIndexRow = item => ITEM_INDEX_FIELDS.map(field => field === 'searchHint' ? compactSearchHint(item) : item[field] ?? null);
const chunkDescriptors = groups.map((group, index) => {
  const relative = manifest.catalogFiles[index];
  const file = path.basename(relative);
  return {
    key: file.replace(/\.json$/i, ''),
    file,
    phase: group.phase,
    itemIds: group.items.map(item => item.id),
    firstReadingOrder: Math.min(...group.items.map(item => item.readingOrder)),
    lastReadingOrder: Math.max(...group.items.map(item => item.readingOrder))
  };
});
const output = {
  items: items.map(itemObjectToRow),
  marcos: {
    h: ['Ano', 'Marco / arco', 'O que acontece', 'Onde ler', 'Hist. início', 'Hist. fim', 'Peso'],
    r: marcos.map(marcoObjectToRow)
  },
  fases: {
    h: ['Hist. início', 'Hist. fim', 'Fase', 'Criadores / detalhes', 'Destaques', 'Observações'],
    r: fases.map(faseObjectToRow)
  },
  pular: {
    h: ['Posso pular?', 'Item', 'Faixa / exemplos', 'Peso', 'Regra'],
    r: pular.map(pularObjectToRow)
  },
  fontes: {
    h: ['Fonte', 'Usada para', 'Link'],
    r: fontes.map(sourceObjectToRow)
  },
  glossario: {
    h: ['Termo', 'O que é', 'Exemplo'],
    r: glossario.map(glossaryObjectToRow)
  },
  schemaVersion: manifest.schemaVersion,
  itemFields: manifest.itemFields,
  editorial: {
    extras: editorialExtras,
    links: editorialLinks,
    clone,
    metodologia,
    changelog,
    sourcesAppended: editorialMeta.sourcesAppended,
    confirmationPolicy: editorialMeta.extraConfirmationPolicy
  },
  editorialVersion: editorialMeta.editorialVersion
};

if (!checkOnly) {
  const banner = '/* GERADO por scripts/build-data.mjs a partir de data/src/. Não edite manualmente. */\n';
  await fs.writeFile(path.join(ROOT, 'data.js'), `${banner}const DATA=${JSON.stringify(output)};\n`, 'utf8');
  const generatedDir = path.join(ROOT, 'src', 'data');
  await fs.mkdir(generatedDir, { recursive: true });
  await fs.writeFile(path.join(generatedDir, 'generated-data.json'), `${JSON.stringify(output)}\n`, 'utf8');

  const catalogLookup = { bySeries: Object.fromEntries([...new Set(items.map(item => item.series))].map(series => [series, items.filter(item => item.series === series).map(item => ({ id: item.id, issue: item.issue, historicalNumber: item.historicalNumber }))])) };
  const indexOutput = {
    catalogLookup,
    itemIndexFields: ITEM_INDEX_FIELDS,
    itemIndex: items.map(itemIndexRow),
    catalogChunks: chunkDescriptors,
    marcos: output.marcos,
    fases: output.fases,
    pular: output.pular,
    fontes: output.fontes,
    glossario: output.glossario,
    schemaVersion: output.schemaVersion,
    editorial: output.editorial,
    editorialVersion: output.editorialVersion
  };
  await fs.writeFile(path.join(generatedDir, 'generated-index.json'), `${JSON.stringify(indexOutput)}\n`, 'utf8');

  const chunksDir = path.join(generatedDir, 'chunks');
  await fs.rm(chunksDir, { recursive: true, force: true });
  await fs.mkdir(chunksDir, { recursive: true });
  for (let index = 0; index < groups.length; index += 1) {
    const descriptor = chunkDescriptors[index];
    const chunk = {
      phase: groups[index].phase,
      itemFields: manifest.itemFields,
      items: groups[index].items.map(itemObjectToRow)
    };
    await fs.writeFile(path.join(chunksDir, descriptor.file), `${JSON.stringify(chunk)}\n`, 'utf8');
  }

  const loaderEntries = chunkDescriptors.map(descriptor =>
    `  ${JSON.stringify(descriptor.phase)}: () => import('./chunks/${descriptor.file}').then(module => module.default)`
  );
  const loaderSource = `/* GERADO por scripts/build-data.mjs. Não edite manualmente. */\n` +
    `export const catalogChunkLoaders: Record<string, () => Promise<any>> = {\n${loaderEntries.join(',\n')}\n};\n`;
  await fs.writeFile(path.join(generatedDir, 'generated-chunks.ts'), loaderSource, 'utf8');
}

console.log(`Dados válidos: ${items.length} itens, ${new Set(items.map(item => item.id)).size} IDs, ${editorialExtras.length} extras editoriais, ${clone.entries.length} entradas da Saga do Clone.`);
if (checkOnly) console.log('Modo --check: data.js não foi reescrito.');

function zodArray(schema, value, label) {
  if (!Array.isArray(value)) throw new Error(`${label} deve ser uma lista.`);
  return value.map((entry, index) => {
    const result = schema.safeParse(entry);
    if (!result.success) {
      throw new Error(`${label}[${index}] inválido:\n${result.error}`);
    }
    return result.data;
  });
}

function validateInvariants({ items, fases, marcos, editorialExtras, derivedReadings, clone, fontes }) {
  const ids = items.map(item => item.id);
  const orders = items.map(item => item.readingOrder);
  const idSet = new Set(ids);
  const orderSet = new Set(orders);
  const errors = [];
  const fail = message => errors.push(message);

  if (!items.length) fail('O catálogo está vazio.');
  if (idSet.size !== ids.length) fail('Há IDs duplicados.');
  if (orderSet.size !== orders.length) fail('Há readingOrder duplicados.');

  const sortedOrders = [...orders].sort((a, b) => a - b);
  if (sortedOrders.some((order, index) => order !== index + 1)) {
    fail(`readingOrder deve formar a sequência 1..${items.length}, sem lacunas.`);
  }

  for (const group of manifest.catalogFiles.map((file, index) => ({ file, group: groups[index] }))) {
    for (const item of group.group.items) {
      if (item.phase !== group.group.phase) fail(`${group.file}: item ${item.id} declara fase diferente do arquivo.`);
    }
  }

  const historical = items
    .filter(item => item.type === 'Principal')
    .map(item => item.historicalNumber)
    .filter(number => number != null)
    .sort((a, b) => a - b);
  if (historical.length !== 1000 || historical.some((number, index) => number !== index + 1)) {
    fail('A linha histórica Principal não corresponde exatamente a #1–#1000.');
  }

  const realFases = fases.filter(fase => fase.kind === 'phase');
  realFases.forEach(fase => {
    if (fase.historicalStart > fase.historicalEnd) fail(`Fase "${fase.name}" tem início maior que fim.`);
  });
  marcos.forEach(marco => {
    if (marco.historicalStart != null && marco.historicalEnd != null && marco.historicalStart > marco.historicalEnd) {
      fail(`Marco "${marco.title}" tem início maior que fim.`);
    }
  });

  const validateItemIds = (label, itemIds) => {
    for (const id of itemIds || []) if (!idSet.has(id)) fail(`${label} referencia ID inexistente ${id}.`);
  };
  editorialExtras.forEach((extra, index) => validateItemIds(`editorial.extras[${index}]`, extra.itemIds));
  if (derivedReadings.length !== 32) fail(`A projeção de leitura deve ter 32 grupos; recebeu ${derivedReadings.length}.`);
  const readingGroups = editorialExtras.filter(extra => extra.readingGroup != null).map(extra => extra.readingGroup).sort((a, b) => a - b);
  if (readingGroups.length !== 32 || readingGroups.some((group, index) => group !== index + 1)) fail('editorial.extras deve preservar exatamente readingGroup 1..32.');
  const editorialMemberships = new Map();
  editorialExtras.forEach(extra => (extra.itemIds || []).forEach(id => {
    const owners = editorialMemberships.get(id) || [];
    owners.push(extra.n);
    editorialMemberships.set(id, owners);
  }));
  const duplicateEditorialIds = [...editorialMemberships].filter(([, owners]) => owners.length > 1);
  if (duplicateEditorialIds.length) fail(`Há itemIds duplicados entre editorial.extras: ${JSON.stringify(duplicateEditorialIds)}.`);
  clone.entries.forEach((entry, index) => {
    validateItemIds(`editorial.clone.entries[${index}]`, [entry.id]);
    const item = items.find(candidate => candidate.id === entry.id);
    if (item && item.readingOrder !== entry.readingOrder) fail(`Clone ID ${entry.id}: readingOrder divergente (${entry.readingOrder} vs ${item.readingOrder}).`);
  });

  const sourceCount = fontes.length;
  editorialExtras.forEach(extra => {
    for (const sourceIndex of extra.src || []) {
      if (sourceIndex < 0 || sourceIndex >= sourceCount) fail(`${extra.name} referencia fonte inexistente ${sourceIndex}.`);
    }
  });

  if (errors.length) throw new Error(`Falha de validação dos dados:\n- ${errors.join('\n- ')}`);
}
