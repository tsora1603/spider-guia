import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { itemsById, readings, type ChecklistGroup, type Reading } from '../data/model';
import { appState } from '../state/app-state';
import { router } from '../runtime/controller';
import { bulkProgressUi } from '../progress/bulk-ui';
import { IssueRow } from './IssueRow';
import { ReadingGroupLinksAction } from './ReadingLinksAction';
import { Icon } from './Icon';
import { FilterDropdown } from './FilterDropdown';
import { ListSearch } from './ListSearch';
import { ScreenState } from './ScreenState';
import { reconcileFocusSelection } from './focus-selection';
import { readingReturnFor } from '../links/return-context';
import { useDesignPreferences } from '../design/hooks';
import { designPreferences } from '../design/preferences';
import { useReadingPreferences } from '../preferences/hooks';
import { readingDepthName } from '../preferences/reading-preferences';
import { buildReadingPlan } from '../preferences/reading-plan';
import { summarizeReadingPlan } from '../views/home-model';
import { statusOf } from '../state/progress-store';
import { useProgressRevision } from '../ui/hooks';
import { computeVirtualWindow, groupChecklistSeries, matchesChecklistItem, type ChecklistFilterValue } from './checklist-model';

// A Home e a Checklist compartilham o mesmo plano e a mesma ordem canônica.
// Os grupos respeitam as intercalações; os chunks internos só reduzem o trabalho de renderização.
const CHUNK_SIZE = 24;
const catalogPositions = new Map(readings.map((item, index) => [item.id, index]));
const FILTERS: Array<[ChecklistFilterValue, string]> = [
  ['', 'Tudo'], ['Não', 'Pendentes'], ['Sim', 'Lidas'], ['Pulei', 'Puladas'], ['ess', 'Essenciais']
];

type ListChunk = { key: string; items: Reading[] };

function chunkItems(items: readonly Reading[]): ListChunk[] {
  const chunks: ListChunk[] = [];
  for (let index = 0; index < items.length; index += CHUNK_SIZE) {
    chunks.push({ key: `sequence-${items[index].id}`, items: items.slice(index, index + CHUNK_SIZE) });
  }
  return chunks;
}

function ChecklistSeriesGroup({ group, expanded, openItems, onItemToggle, onGroupToggle, onMeasured, measurementKey }: {
  key?: any;
  group: ChecklistGroup;
  expanded: boolean;
  openItems: ReadonlySet<number>;
  onItemToggle: (id: number, open: boolean) => void;
  onGroupToggle: (key: string) => void;
  onMeasured: (key: string, height: number) => void;
  measurementKey: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(entries => {
      const height = entries[0]?.borderBoxSize?.[0]?.blockSize || entries[0]?.contentRect.height || ref.current?.offsetHeight || 0;
      if (height) onMeasured(measurementKey, height);
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [measurementKey, onMeasured]);
  const first = group.items[0];
  const last = group.items[group.items.length - 1];
  const issueLabel = (item: Reading) => item.issue.startsWith('#') ? item.issue : `#${item.issue}`;
  const range = `${issueLabel(first)}–${issueLabel(last)}`;
  const single = group.items.length === 1;
  const read = group.items.filter(item => statusOf(item.id) === 'Sim').length;
  return <div ref={ref} class={`checklist-series-group${single ? ' is-single' : ''}`} data-series={group.name} data-series-key={group.key}>
    {single ? <IssueRow key={first.id} item={first} open={openItems.has(first.id)} onOpenChange={onItemToggle} prominentLinks /> : <>
      <div class="checklist-series-heading">
        <button class="checklist-series-toggle" type="button" aria-expanded={expanded} aria-controls={`${group.key}-items`}
          onClick={() => onGroupToggle(group.key)}>
          <span class="row-head"><b>{group.name}</b><span class="sm mu">{range} · {group.items.length} leituras · {read} lidas</span></span>
          <Icon name={expanded ? 'chevU' : 'chevD'} />
        </button>
        <ReadingGroupLinksAction itemIds={group.items.map(item => item.id)} label={`${group.name} ${range}`} />
      </div>
      <div id={`${group.key}-items`} hidden={!expanded} class="checklist-series-items">
        {expanded ? chunkItems(group.items).map(chunk => <div key={chunk.key} class="checklist-sequence-chunk" data-sequence-chunk={chunk.key}>
          {chunk.items.map(item => <IssueRow key={item.id} item={item} open={openItems.has(item.id)} onOpenChange={onItemToggle} prominentLinks />)}
        </div>) : null}
      </div>
    </>}
  </div>;
}

function FocusChecklist({ items, currentId, onCurrentId, onExit }: {
  items: readonly Reading[];
  currentId: number | null;
  onCurrentId: (id: number) => void;
  onExit: () => void;
}) {
  const index = Math.max(0, items.findIndex(item => item.id === currentId));
  const item = items[index] || items[0];
  const [expanded, setExpanded] = useState(true);
  if (!item) return null;
  const go = (nextIndex: number) => {
    const next = items[nextIndex];
    if (!next) return;
    setExpanded(true);
    onCurrentId(next.id);
    requestAnimationFrame(() => document.getElementById(`hq-${next.id}`)?.focus());
  };
  return <section class="focus-reader" aria-label="Modo foco da Checklist">
    <header class="focus-reader-head">
      <div><span class="lbl">Modo foco</span><b>Sequência do plano ativo</b><span class="mu sm">Leitura {index + 1} de {items.length} neste filtro</span></div>
      <button class="btn g focus-exit" type="button" onClick={onExit}>Sair do foco</button>
    </header>
    <div class="focus-reader-card">
      <IssueRow key={item.id} item={item} open={expanded} onOpenChange={(_id, nextOpen) => setExpanded(nextOpen)} prominentLinks />
    </div>
    <nav class="focus-reader-nav" aria-label="Navegação do modo foco">
      <button class="btn g" data-focus-nav="previous" type="button" disabled={index <= 0} onClick={() => go(index - 1)}><Icon name="arrowLeft" /> Anterior</button>
      <button class="btn" data-focus-nav="next" type="button" disabled={index >= items.length - 1} onClick={() => go(index + 1)}>Próxima <Icon name="arrowRight" /></button>
    </nav>
  </section>;
}

export function VirtualizedChecklist() {
  const [query, setQuery] = useState(appState.checklistQuery);
  const [filter, setFilter] = useState<ChecklistFilterValue>((appState.checklistFilter || '') as ChecklistFilterValue);
  const focusedItemId = appState.focusedItemId ?? readingReturnFor(history.state, location.hash, 'item');
  const progressRevision = useProgressRevision();
  const preferences = useReadingPreferences();
  const design = useDesignPreferences();
  const plan = useMemo(() => buildReadingPlan(preferences), [preferences.depth, preferences.focusQuery]);
  const planSummary = useMemo(() => summarizeReadingPlan(plan, statusOf), [plan, progressRevision]);
  const planIds = useMemo(() => new Set(plan.map(item => item.id)), [plan]);

  // Um link direto continua acessível, mesmo se a HQ não fizer parte do plano.
  // Essa exceção é mostrada apenas enquanto a rota específica estiver aberta.
  const outsidePlanItem = focusedItemId != null && !planIds.has(focusedItemId)
    ? itemsById[focusedItemId] : undefined;
  const orderedItems = useMemo(() => {
    if (!outsidePlanItem) return plan;
    return [...plan, outsidePlanItem].sort((a, b) => a.readingOrder - b.readingOrder);
  }, [plan, outsidePlanItem]);
  // Filtrar depois de agrupar impede a união de trechos separados por outra série.
  const groups = useMemo(() => groupChecklistSeries(orderedItems).map(group => ({
    ...group,
    items: group.items.filter(item => (outsidePlanItem != null && item.id === focusedItemId) || matchesChecklistItem(item, filter, query))
  })).filter(group => group.items.length), [orderedItems, outsidePlanItem, focusedItemId, filter, query, progressRevision]);
  const visibleItems = useMemo(() => groups.flatMap(group => group.items), [groups]);

  const [focusItemId, setFocusItemId] = useState<number | null>(() => focusedItemId ?? planSummary.next?.id ?? null);
  const [deepLinkPending, setDeepLinkPending] = useState<number | null>(() => focusedItemId ?? null);
  const [openItems, setOpenItems] = useState<Set<number>>(() => new Set(appState.checklistOpenItems));
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(appState.checklistOpenGroups));
  const [measured, setMeasured] = useState<Map<string, number>>(() => new Map());
  const [viewport, setViewport] = useState(() => ({ top: scrollY, height: innerHeight }));
  const hostRef = useRef<HTMLDivElement>(null);
  const focusWasActive = useRef(design.focusMode);

  useEffect(() => setDeepLinkPending(focusedItemId ?? null), [focusedItemId]);
  useEffect(() => {
    if (deepLinkPending == null) return;
    const group = groups.find(group => group.items.some(item => item.id === deepLinkPending));
    if (!group || group.items.length === 1) return;
    setOpenGroups(current => {
      if (current.has(group.key)) return current;
      const next = new Set(current).add(group.key);
      appState.checklistOpenGroups = new Set(next);
      return next;
    });
  }, [deepLinkPending, groups]);
  useEffect(() => {
    setQuery(appState.checklistQuery);
    setFilter((appState.checklistFilter || '') as ChecklistFilterValue);
  }, [appState.checklistQuery, appState.checklistFilter]);

  useEffect(() => {
    const update = () => setViewport({ top: scrollY, height: innerHeight });
    addEventListener('scroll', update, { passive: true });
    addEventListener('resize', update);
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update); };
  }, []);

  // Só ao ATIVAR o modo foco começa na próxima leitura da Home.
  // Progresso e re-renderizações posteriores não reiniciam a posição escolhida.
  useEffect(() => {
    if (design.focusMode && !focusWasActive.current) {
      setFocusItemId(focusedItemId ?? visibleItems.find(item => statusOf(item.id) === 'Não')?.id ?? visibleItems[0]?.id ?? null);
    }
    focusWasActive.current = design.focusMode;
  }, [design.focusMode]);

  useEffect(() => {
    if (!design.focusMode) return;
    const ids = visibleItems.map(item => item.id);
    setFocusItemId(current => reconcileFocusSelection(ids, current, catalogPositions, id => statusOf(id) === 'Não'));
  }, [design.focusMode, visibleItems]);

  // Um NOVO link direto pode alterar a seleção; nunca reaplicar a rota antiga
  // quando a atualização de progresso apenas recalcula a lista.
  useEffect(() => {
    if (design.focusMode && focusedItemId != null) setFocusItemId(focusedItemId);
  }, [design.focusMode, focusedItemId]);

  const toggleItem = useCallback((id: number, open: boolean) => {
    setOpenItems(current => {
      const next = new Set<number>(current);
      if (open) next.add(id); else next.delete(id);
      appState.checklistOpenItems = new Set(next);
      return next;
    });
  }, []);
  const onMeasured = useCallback((key: string, height: number) => {
    setMeasured(current => {
      if (Math.abs((current.get(key) || 0) - height) < 1) return current;
      const next = new Map(current); next.set(key, height); return next;
    });
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setDeepLinkPending(null);
    setOpenGroups(current => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key); else next.add(key);
      appState.checklistOpenGroups = new Set(next);
      return next;
    });
  }, []);

  const measurementKeys = useMemo(() => groups.map(group => `${group.key}:${openGroups.has(group.key)}:${group.items.map(item => item.id).join(',')}`), [groups, openGroups]);
  const heights = useMemo(() => groups.map((group, index) => measured.get(measurementKeys[index]) ||
    (group.items.length === 1 ? 112 : 92 + (openGroups.has(group.key) ? group.items.length * 112 : 0))), [groups, measured, measurementKeys, openGroups]);
  const hostTop = (hostRef.current?.getBoundingClientRect().top || 0) + scrollY;
  const relativeScroll = Math.max(0, viewport.top - hostTop);
  const forcedChunkIndex = deepLinkPending != null && !design.focusMode
    ? groups.findIndex(group => group.items.some(item => item.id === deepLinkPending)) : -1;
  const forcedTop = forcedChunkIndex < 0 ? null : heights.slice(0, forcedChunkIndex).reduce((sum, height) => sum + height, 0);
  const windowed = computeVirtualWindow(heights, forcedTop ?? relativeScroll, viewport.height, forcedTop == null ? 700 : 0);
  const visibleGroups = groups.slice(windowed.start, windowed.end);

  useEffect(() => {
    if (deepLinkPending == null || !visibleItems.some(item => item.id === deepLinkPending)) return;
    const targetId = deepLinkPending;
    const timeout = window.setTimeout(() => {
      if (!design.focusMode && forcedChunkIndex >= 0) {
        const top = (hostRef.current?.getBoundingClientRect().top || 0) + scrollY;
        scrollTo({ top: Math.max(0, top + heights.slice(0, forcedChunkIndex).reduce((sum, value) => sum + value, 0) - 110), behavior: 'auto' });
      }
      let attempts = 0;
      const focusWhenReady = () => {
        const target = document.getElementById(`hq-${targetId}`);
        if (target) {
          target.scrollIntoView({ block: 'center', behavior: 'auto' });
          target.focus({ preventScroll: true });
          setViewport({ top: scrollY, height: innerHeight });
          // Manter o chunk-alvo montado até a primeira navegação manual.
          // Liberá-lo imediatamente pode desmontar a HQ focada quando as
          // alturas estimadas da virtualização ainda estão sendo medidas.
        } else if (++attempts < 45) requestAnimationFrame(focusWhenReady);
      };
      requestAnimationFrame(focusWhenReady);
    }, 30);
    return () => clearTimeout(timeout);
  }, [deepLinkPending, design.focusMode, forcedChunkIndex, query, filter]);

  useEffect(() => {
    if (deepLinkPending == null || design.focusMode) return;
    const release = () => setDeepLinkPending(null);
    const releaseOnKey = (event: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '].includes(event.key)) release();
    };
    window.addEventListener('wheel', release, { passive: true });
    window.addEventListener('touchstart', release, { passive: true });
    window.addEventListener('keydown', releaseOnKey);
    return () => {
      window.removeEventListener('wheel', release);
      window.removeEventListener('touchstart', release);
      window.removeEventListener('keydown', releaseOnKey);
    };
  }, [deepLinkPending, design.focusMode]);

  const changeFilter = (next: ChecklistFilterValue) => {
    setFilter(next); appState.checklistFilter = next; router.replaceChecklistState();
  };
  const changeQuery = (next: string) => {
    setQuery(next); appState.checklistQuery = next;
    window.clearTimeout(window._t);
    window._t = window.setTimeout(() => router.replaceChecklistState(), 180);
  };
  const clearSearch = () => {
    setQuery(''); setFilter(''); appState.checklistQuery = ''; appState.checklistFilter = '';
    router.replaceChecklistState();
  };

  return <>
    <div class={`checklist-focus-control ${design.focusMode ? 'is-active' : ''}`}>
      <div class="checklist-focus-copy"><span class="lbl">Leitura sem distrações</span><strong>Modo Foco</strong><span class="sm mu">Uma edição por vez, seguindo a ordem de Sua próxima leitura.</span></div>
      <button type="button" class={`btn focus-mode-button ${design.focusMode ? 'g' : ''}`} data-focus-toggle aria-pressed={design.focusMode} onClick={() => designPreferences.set({ focusMode: !design.focusMode })}>
        <Icon name={design.focusMode ? 'check' : 'book'} /> {design.focusMode ? 'Ativo · Desativar' : 'Ativar Modo Foco'}
      </button>
    </div>
    <div class="checklist-sequence-heading">
      <div><span class="lbl">Sequência de leitura</span><strong>Plano: {readingDepthName(preferences)}</strong><p class="mu sm">Abra uma série para ver as edições. Anuais e outras leituras mantêm sua posição na sequência.</p>
        {planSummary.next ? <p class="checklist-next-hint sm"><b>Próxima:</b> {planSummary.next.series} {planSummary.next.issue}</p> : <p class="checklist-next-hint sm">{plan.length ? 'Nenhuma leitura pendente neste plano.' : 'O plano atual não contém leituras.'}</p>}
      </div>
      <div class="checklist-sequence-actions">
        {planSummary.next ? <button class="btn" type="button" onClick={event => router.navigate(`#checklist/hq/${planSummary.next.id}`, event.currentTarget)}>Ir à próxima</button> : null}
        <button class="btn g" type="button" onClick={event => router.navigate('#configuracoes', event.currentTarget)}>Alterar plano</button>
      </div>
    </div>
    {outsidePlanItem ? <p class="checklist-plan-exception sm" role="status">Esta HQ foi aberta por link direto e não pertence ao plano ativo. As demais leituras seguem seu plano.</p> : null}
    <ListSearch label="Buscar na Checklist" placeholder="Buscar série, edição ou arco" value={query} onChange={changeQuery} />
    <div class="checklist-toolbar ui-toolbar">
      <FilterDropdown label="Filtrar Checklist por status ou peso" options={FILTERS} value={filter} onChange={changeFilter} />
      <button class="btn g bulk-open-button" type="button" onClick={event => bulkProgressUi.open({ origin: event.currentTarget })}>Ações em lote <kbd>B</kbd></button>
    </div>
    <p class="mu sm ui-list-count">{visibleItems.length} {visibleItems.length === 1 ? 'leitura' : 'leituras'} na sequência · {planSummary.pending} pendentes no plano · {planSummary.read} lidas · {planSummary.skipped} puladas</p>
    {!visibleItems.length ? (
      <ScreenState kind="empty" title="Nenhuma leitura encontrada" message="A busca ou o filtro atual não corresponde a nenhuma leitura do plano ativo." actionLabel="Limpar busca e filtros" onAction={clearSearch} />
    ) : design.focusMode ? (
      <FocusChecklist items={visibleItems} currentId={focusItemId} onCurrentId={setFocusItemId} onExit={() => {
        if (focusItemId) setDeepLinkPending(focusItemId);
        designPreferences.set({ focusMode: false });
      }} />
    ) : (
      <div ref={hostRef} class="virtual-checklist checklist-sequence-list content-list ui-list" data-virtualized="true" data-reading-sequence="true">
        <svg class="virtual-spacer" aria-hidden="true" width="1" height={windowed.top} />
        {visibleGroups.map((group, index) => <ChecklistSeriesGroup key={group.key} group={group} expanded={openGroups.has(group.key)}
          openItems={openItems} onItemToggle={toggleItem} onGroupToggle={toggleGroup} onMeasured={onMeasured}
          measurementKey={measurementKeys[windowed.start + index]} />)}
        <svg class="virtual-spacer" aria-hidden="true" width="1" height={windowed.bottom} />
      </div>
    )}
  </>;
}
