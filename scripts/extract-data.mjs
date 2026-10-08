import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ROOT,
  SRC_DIR,
  SNAPSHOT_DIR,
  readDataJs,
  writeJson,
  slugify,
  itemRowToObject,
  faseRowToObject,
  marcoRowToObject,
  pularRowToObject,
  sourceRowToObject,
  glossaryRowToObject
} from './lib/data-utils.mjs';

const resetSnapshot = process.argv.includes('--reset-snapshot');
const dataFileArg = process.argv.find(arg => arg.startsWith('--from='));
const dataFile = dataFileArg ? path.resolve(ROOT, dataFileArg.slice('--from='.length)) : path.join(ROOT, 'data.js');
const data = await readDataJs(dataFile);

await fs.rm(SRC_DIR, { recursive: true, force: true });
await fs.mkdir(path.join(SRC_DIR, 'catalog'), { recursive: true });
await fs.mkdir(path.join(SRC_DIR, 'editorial'), { recursive: true });

const items = data.items.map(itemRowToObject).sort((a, b) => a.readingOrder - b.readingOrder);
const grouped = new Map();
for (const item of items) {
  if (!grouped.has(item.phase)) grouped.set(item.phase, []);
  grouped.get(item.phase).push(item);
}

const catalogFiles = [];
let phaseIndex = 0;
for (const [phase, phaseItems] of grouped) {
  phaseIndex += 1;
  const filename = `${String(phaseIndex).padStart(3, '0')}-${slugify(phase)}.json`;
  const relative = `catalog/${filename}`;
  catalogFiles.push(relative);
  await writeJson(path.join(SRC_DIR, relative), { phase, items: phaseItems });
}

await writeJson(path.join(SRC_DIR, 'fases.json'), data.fases.r.map(faseRowToObject));
await writeJson(path.join(SRC_DIR, 'marcos.json'), data.marcos.r.map(marcoRowToObject));
await writeJson(path.join(SRC_DIR, 'pular.json'), data.pular.r.map(pularRowToObject));
await writeJson(path.join(SRC_DIR, 'fontes.json'), data.fontes.r.map(sourceRowToObject));
await writeJson(path.join(SRC_DIR, 'glossario.json'), data.glossario.r.map(glossaryRowToObject));
await writeJson(path.join(SRC_DIR, 'editorial', 'extras.json'), data.editorial?.extras || []);
await writeJson(path.join(SRC_DIR, 'editorial', 'clone.json'), data.editorial?.clone || { entries: [] });
await writeJson(path.join(SRC_DIR, 'editorial', 'metodologia.json'), data.editorial?.metodologia || []);
await writeJson(path.join(SRC_DIR, 'editorial', 'changelog.json'), data.editorial?.changelog || []);
await writeJson(path.join(SRC_DIR, 'editorial', 'meta.json'), {
  sourcesAppended: data.editorial?.sourcesAppended || 0,
  editorialVersion: data.editorialVersion ?? 1
});

await writeJson(path.join(SRC_DIR, 'manifest.json'), {
  sourceFormatVersion: 1,
  schemaVersion: data.schemaVersion ?? 1,
  itemFields: data.itemFields || [
    'id', 'historicalNumber', 'type', 'series', 'issue', 'phase', 'weight',
    'brazilianEdition', 'instructions', 'readingOrder', 'note'
  ],
  catalogFiles
});

const snapshotPath = path.join(SNAPSHOT_DIR, 'item-ids.json');
try {
  await fs.access(snapshotPath);
  if (!resetSnapshot) {
    console.log(`Snapshot preservado: ${path.relative(ROOT, snapshotPath)} (use --reset-snapshot apenas para criar uma nova linha de base deliberadamente).`);
  } else {
    await writeJson(snapshotPath, items.map(item => item.id));
    console.log(`Snapshot recriado deliberadamente: ${path.relative(ROOT, snapshotPath)}.`);
  }
} catch {
  await writeJson(snapshotPath, items.map(item => item.id));
  console.log(`Snapshot criado: ${path.relative(ROOT, snapshotPath)}.`);
}

console.log(`Extração concluída: ${items.length} itens em ${catalogFiles.length} arquivos de fase/arco.`);
