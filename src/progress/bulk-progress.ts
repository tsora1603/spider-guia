import { checklistGroups, principalReadings, readings, type Reading } from '../data/model';
import { statusOf } from '../state/progress-store';
import { buildReadingPlan } from '../preferences/reading-plan';
import { readingPreferences, readingDepthName } from '../preferences/reading-preferences';
import type { ProgressStatus } from '../state/types';

export type BulkTargetStatus = 'Sim' | 'Não';
export type BulkSelection =
  | { kind: 'plan' }
  | { kind: 'group'; groupKey: string }
  | { kind: 'through'; itemId: number }
  | { kind: 'range'; startHistorical: number; endHistorical: number };

export interface BulkPreview {
  selection: BulkSelection;
  target: BulkTargetStatus;
  items: Reading[];
  changedItems: Reading[];
  total: number;
  changed: number;
  alreadyTarget: number;
  essential: number;
  read: number;
  skipped: number;
  pending: number;
  first: Reading | null;
  last: Reading | null;
  valid: boolean;
  error: string;
  label: string;
}

const principalByHistorical = new Map<number, Reading>();
for (const item of principalReadings) {
  const historical = Number(item.historicalNumber);
  if (Number.isFinite(historical) && !principalByHistorical.has(historical)) {
    principalByHistorical.set(historical, item);
  }
}

const cleanNumber = (value: number) => Number.isInteger(value) ? value : NaN;

export function historicalAnchor(number: number) {
  return principalByHistorical.get(cleanNumber(number)) || null;
}

export function selectionLabel(selection: BulkSelection) {
  if (selection.kind === 'plan') return `Plano atual: ${readingDepthName(readingPreferences.get())}`;
  if (selection.kind === 'group') {
    const group = checklistGroups.find(candidate => candidate.key === selection.groupKey);
    return group ? `Arco/fase: ${group.name}` : 'Arco/fase não encontrado';
  }
  if (selection.kind === 'through') {
    const item = readings.find(candidate => candidate.id === selection.itemId);
    if (!item) return 'Leitura de referência não encontrada';
    return `Tudo até ${item.series} ${item.issue}${item.historicalNumber ? ` (#${item.historicalNumber})` : ''}`;
  }
  const start = Math.min(selection.startHistorical, selection.endHistorical);
  const end = Math.max(selection.startHistorical, selection.endHistorical);
  return `Intervalo histórico #${start}–#${end}`;
}

export function selectBulkItems(selection: BulkSelection): { items: Reading[]; error: string } {
  if (selection.kind === 'plan') return { items: buildReadingPlan(readingPreferences.get()), error: '' };
  if (selection.kind === 'group') {
    const group = checklistGroups.find(candidate => candidate.key === selection.groupKey);
    if (!group) return { items: [], error: 'Escolha um arco ou fase válido.' };
    return { items: [...group.items].sort((a, b) => a.readingOrder - b.readingOrder), error: '' };
  }

  if (selection.kind === 'through') {
    const target = readings.find(candidate => candidate.id === selection.itemId);
    if (!target) return { items: [], error: 'Escolha uma leitura válida como referência.' };
    return {
      items: readings.filter(item => item.readingOrder <= target.readingOrder),
      error: ''
    };
  }

  const start = Math.min(cleanNumber(selection.startHistorical), cleanNumber(selection.endHistorical));
  const end = Math.max(cleanNumber(selection.startHistorical), cleanNumber(selection.endHistorical));
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 1 || end > 1000) {
    return { items: [], error: 'Use um intervalo histórico entre #1 e #1000.' };
  }
  const startItem = historicalAnchor(start);
  const endItem = historicalAnchor(end);
  if (!startItem || !endItem) {
    return { items: [], error: 'Uma das edições históricas informadas não existe no catálogo.' };
  }
  return {
    items: readings.filter(item => item.readingOrder >= startItem.readingOrder && item.readingOrder <= endItem.readingOrder),
    error: ''
  };
}

export function buildBulkPreview(
  selection: BulkSelection,
  target: BulkTargetStatus,
  getStatus: (id: number) => ProgressStatus = statusOf
): BulkPreview {
  const selected = selectBulkItems(selection);
  const items = selected.items;
  const statuses = items.map(item => getStatus(item.id));
  const changedItems = items.filter((item, index) => statuses[index] !== target);
  const read = statuses.filter(status => status === 'Sim').length;
  const skipped = statuses.filter(status => status === 'Pulei').length;
  const pending = statuses.filter(status => status === 'Não').length;
  return {
    selection,
    target,
    items,
    changedItems,
    total: items.length,
    changed: changedItems.length,
    alreadyTarget: items.length - changedItems.length,
    essential: items.filter(item => item.weight === '● Essencial').length,
    read,
    skipped,
    pending,
    first: items[0] || null,
    last: items[items.length - 1] || null,
    valid: !selected.error && items.length > 0,
    error: selected.error || (items.length ? '' : 'Nenhuma leitura foi selecionada.'),
    label: selectionLabel(selection)
  };
}

export function itemLabel(item: Reading | null) {
  if (!item) return '—';
  return `${item.series} ${item.issue}${item.historicalNumber ? ` · #${item.historicalNumber}` : ''}`;
}
