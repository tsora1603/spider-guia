import { spoilerPlainText } from '../spoilers/model';
import generatedIndex from './generated-index.json';
import { catalogChunkLoaders } from './generated-chunks';
import type { CloneGuide } from '../clone-guide/model';

export const DATA = generatedIndex as any;

export interface Reading {
  id: number;
  historicalNumber: number | null;
  type: string;
  series: string;
  issue: string;
  phase: string;
  weight: string;
  notes: string;
  readingOrder: number;
  extraNote: string;
  searchText: string;
  detailsLoaded?: boolean;
}

export const normalizeText = (value: unknown) =>
  spoilerPlainText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const indexFieldIndex = Object.fromEntries(
  (DATA.itemIndexFields || []).map((field: string, index: number) => [field, index])
);
const indexField = (row: unknown[], field: string) => row[indexFieldIndex[field]];

const toIndexReading = (row: unknown[]): Reading => {
  const reading: Reading = {
    id: Number(indexField(row, 'id')),
    historicalNumber: indexField(row, 'historicalNumber') == null ? null : Number(indexField(row, 'historicalNumber')),
    type: String(indexField(row, 'type')),
    series: String(indexField(row, 'series')),
    issue: String(indexField(row, 'issue')),
    phase: String(indexField(row, 'phase')),
    weight: String(indexField(row, 'weight')),
    notes: '',
    readingOrder: Number(indexField(row, 'readingOrder')),
    extraNote: '',
    searchText: '',
    detailsLoaded: false
  };
  reading.searchText = normalizeText([reading.series, reading.issue, reading.phase, reading.weight, reading.type, reading.historicalNumber ? `#${reading.historicalNumber}` : '', String(indexField(row, 'searchHint') || '')].join(' '));
  return reading;
};

const chunkFieldIndex = new Map<string, Record<string, number>>();
const chunkReadingCache = new Map<number, Reading>();
const chunkPromiseCache = new Map<string, Promise<Map<number, Reading>>>();

const toDetailedReading = (row: unknown[], fields: string[]): Reading => {
  let fieldIndex = chunkFieldIndex.get(fields.join('|'));
  if (!fieldIndex) {
    fieldIndex = Object.fromEntries(fields.map((field, index) => [field, index]));
    chunkFieldIndex.set(fields.join('|'), fieldIndex);
  }
  const value = (field: string) => row[fieldIndex![field]];
  const reading: Reading = {
    id: Number(value('id')),
    historicalNumber: value('historicalNumber') == null || value('historicalNumber') === '' ? null : Number(value('historicalNumber')),
    type: String(value('type')),
    series: String(value('series')),
    issue: String(value('issue')),
    phase: String(value('phase')),
    weight: String(value('weight')),
    notes: String(value('instructions') ?? ''),
    readingOrder: Number(value('readingOrder')),
    extraNote: String(value('note') ?? ''),
    searchText: normalizeText(row.map(entry => spoilerPlainText(entry)).join(' ')),
    detailsLoaded: true
  };
  return reading;
};

export const readings: Reading[] = (DATA.itemIndex || [])
  .map(toIndexReading)
  .sort((a: Reading, b: Reading) => a.readingOrder - b.readingOrder);

export const itemsById: Record<number, Reading> = Object.fromEntries(
  readings.map(item => [item.id, item])
);

export const catalogChunks = DATA.catalogChunks || [];
export const catalogChunkByPhase: Record<string, any> = Object.fromEntries(
  catalogChunks.map((chunk: any) => [chunk.phase, chunk])
);

export async function loadPhaseReadings(phase: string): Promise<Map<number, Reading>> {
  const cachedPromise = chunkPromiseCache.get(phase);
  if (cachedPromise) return cachedPromise;
  const loader = catalogChunkLoaders[phase];
  if (!loader) return new Map();
  const promise = loader().then((chunk: any) => {
    const map = new Map<number, Reading>();
    for (const row of chunk.items || []) {
      const reading = toDetailedReading(row, chunk.itemFields || []);
      chunkReadingCache.set(reading.id, reading);
      map.set(reading.id, reading);
    }
    return map;
  }).catch(error => {
    chunkPromiseCache.delete(phase);
    throw error;
  });
  chunkPromiseCache.set(phase, promise);
  return promise;
}

export async function loadReadingDetails(id: number): Promise<Reading | null> {
  const cached = chunkReadingCache.get(id);
  if (cached) return cached;
  const index = itemsById[id];
  if (!index) return null;
  const phase = await loadPhaseReadings(index.phase);
  return phase.get(id) || index;
}

export function cachedReadingDetails(id: number): Reading | null {
  return chunkReadingCache.get(id) || null;
}

export const editorialData = DATA.editorial || {};
export const editorialExtras = editorialData.extras || [];
export const cloneEntries = editorialData.clone?.entries || [];
export const cloneGuide: CloneGuide = editorialData.clone?.guide;

/** Associação editorial explícita: a Checklist só oferece detalhes em Explorar
 * quando existe uma entrada de Extras que realmente referencia a HQ.
 * Não inventar destinos para leituras sem ficha editorial própria.
 */
export const extraEditorialByItemId: Record<number, any> = Object.fromEntries(
  editorialExtras.flatMap((extra: any) =>
    (extra.itemIds || []).map((id: number) => [id, extra])
  )
);

export const extraDetailsById = Object.fromEntries(
  editorialExtras.flatMap((extra: any) =>
    (extra.itemIds || []).map((id: number) => [
      id,
      {
        porque: extra.why || '',
        quanto: extra.howMuch || '',
        conf: extra.confirmation || 'A confirmar',
        confirmationDetail: extra.confirmationDetail || extra.just || ''
      }
    ])
  )
);

export const readingGroups = editorialExtras
  .filter((extra: any) => Number.isInteger(extra.readingGroup))
  .sort((a: any, b: any) => a.readingGroup - b.readingGroup)
  .map((extra: any) => ({
    n: extra.readingGroup,
    after: extra.after,
    peso: extra.weight,
    nome: extra.name,
    sem: Boolean(extra.unavailable),
    ordem: extra.sequence,
    porque: extra.why,
    conf: extra.confirmation || 'A confirmar',
    quanto: extra.howMuch,
    where: extra.where ?? null,
    links: extra.links || [],
    ords: extra.itemIds || [],
    src: extra.src || [],
    just: extra.just || extra.confirmationDetail || ''
  }));

export interface ChecklistGroup {
  key: string;
  name: string;
  items: Reading[];
}

export const checklistGroups: ChecklistGroup[] = (() => {
  const groups = new Map<string, Reading[]>();
  for (const item of readings) {
    const key = item.phase || 'Sem fase';
    const bucket = groups.get(key) || [];
    bucket.push(item);
    groups.set(key, bucket);
  }
  return [...groups.entries()].map(([name, items], index) => ({
    key: `phase-${index + 1}`,
    name,
    items
  }));
})();

const namedRows = (rows: unknown[][], fields: string[]) =>
  rows.map(row => Object.fromEntries(fields.map((field, index) => [field, row[index]])));

export const journeyPhases = namedRows(DATA.fases.r, [
  'historicalStart',
  'historicalEnd',
  'name',
  'creators',
  'highlights',
  'notes'
])
  .filter((phase: any) => Number(phase.historicalStart) > 0)
  .map((phase: any) => ({
    ...phase,
    historicalStart: Number(phase.historicalStart),
    historicalEnd: Number(phase.historicalEnd)
  }));

export const milestones = namedRows(DATA.marcos.r, [
  'year',
  'title',
  'description',
  'whereToRead',
  'historicalStart',
  'historicalEnd',
  'weight'
]).map((milestone: any) => ({
  ...milestone,
  historicalStart: milestone.historicalStart ? Number(milestone.historicalStart) : null,
  historicalEnd: milestone.historicalEnd ? Number(milestone.historicalEnd) : null
}));

export const principalReadings = readings.filter(item => item.type === 'Principal');
export const essentialReadings = readings.filter(item => item.weight === '● Essencial');
