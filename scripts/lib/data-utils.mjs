import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const SRC_DIR = path.join(ROOT, 'data', 'src');
export const SNAPSHOT_DIR = path.join(ROOT, 'data', 'snapshots');

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

export async function readDataJs(filePath = path.join(ROOT, 'data.js')) {
  const source = await fs.readFile(filePath, 'utf8');
  const match = source.match(/(?:^|\n)const\s+DATA\s*=\s*([\s\S]*);\s*$/);
  if (!match) {
    throw new Error(`Não foi possível localizar "const DATA = ...;" em ${filePath}.`);
  }
  return JSON.parse(match[1]);
}

export function slugify(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'fase';
}

export function itemRowToObject(row) {
  return {
    id: row[0],
    historicalNumber: row[1] === '' ? null : Number(row[1]),
    type: row[2],
    series: row[3],
    issue: row[4],
    phase: row[5],
    weight: row[6],
    brazilianEdition: row[7],
    instructions: row[8],
    readingOrder: row[9],
    note: row[10]
  };
}

export function itemObjectToRow(item) {
  return [
    item.id,
    item.historicalNumber == null ? '' : String(item.historicalNumber),
    item.type,
    item.series,
    item.issue,
    item.phase,
    item.weight,
    item.brazilianEdition,
    item.instructions,
    item.readingOrder,
    item.note
  ];
}

export function faseRowToObject(row) {
  if (/^\d+$/.test(String(row[0])) && /^\d+$/.test(String(row[1]))) {
    return {
      kind: 'phase',
      historicalStart: Number(row[0]),
      historicalEnd: Number(row[1]),
      name: row[2],
      creators: row[3],
      highlights: row[4],
      notes: row[5]
    };
  }
  return {
    kind: 'summary',
    label: row[0],
    name: row[2],
    creators: row[3],
    highlights: row[4],
    notes: row[5]
  };
}

export function faseObjectToRow(fase) {
  if (fase.kind === 'phase') {
    return [
      String(fase.historicalStart),
      String(fase.historicalEnd),
      fase.name,
      fase.creators,
      fase.highlights,
      fase.notes
    ];
  }
  return [fase.label, '', fase.name, fase.creators, fase.highlights, fase.notes];
}

export function marcoRowToObject(row) {
  return {
    year: row[0],
    title: row[1],
    description: row[2],
    whereToRead: row[3],
    historicalStart: row[4] === '' ? null : Number(row[4]),
    historicalEnd: row[5] === '' ? null : Number(row[5]),
    weight: row[6]
  };
}

export function marcoObjectToRow(marco) {
  return [
    marco.year,
    marco.title,
    marco.description,
    marco.whereToRead,
    marco.historicalStart == null ? '' : String(marco.historicalStart),
    marco.historicalEnd == null ? '' : String(marco.historicalEnd),
    marco.weight
  ];
}

export function pularRowToObject(row) {
  return { recommendation: row[0], item: row[1], range: row[2], weight: row[3], rule: row[4] };
}
export function pularObjectToRow(row) {
  return [row.recommendation, row.item, row.range, row.weight, row.rule];
}
export function sourceRowToObject(row) {
  return { source: row[0], usedFor: row[1], link: row[2] };
}
export function sourceObjectToRow(row) {
  return [row.source, row.usedFor, row.link];
}
export function glossaryRowToObject(row) {
  return { term: row[0], definition: row[1], example: row[2] };
}
export function glossaryObjectToRow(row) {
  return [row.term, row.definition, row.example];
}

export async function loadSourceManifest() {
  return readJson(path.join(SRC_DIR, 'manifest.json'));
}

export async function loadSourceItems(manifest = null) {
  const sourceManifest = manifest || await loadSourceManifest();
  const groups = await Promise.all(
    sourceManifest.catalogFiles.map(file => readJson(path.join(SRC_DIR, file)))
  );
  return groups.flatMap(group => group.items).sort((a, b) => a.readingOrder - b.readingOrder);
}
