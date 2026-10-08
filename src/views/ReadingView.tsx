import { useEffect, useMemo, useState } from 'preact/hooks';
import { appState } from '../state/app-state';
import { cloneEntries, editorialExtras } from '../data/model';
import { VirtualizedChecklist } from '../components/VirtualizedChecklist';
import { ExtraCard, CloneSummary, extraState } from '../components/Editorial';
import { useProgressCounts } from '../components/Progress';
import { itemsById } from '../data/model';
import { IssueRow } from '../components/IssueRow';
import { Icon } from '../components/Icon';
import { FilterDropdown } from '../components/FilterDropdown';
import { ScreenState } from '../components/ScreenState';
import { ProgressBarVisual } from '../design/ProgressVisuals';
import { exploreRouteParam, focusEditorialTarget, extraAnchorKey } from './explore-navigation';

const EXTRA_FILTERS: Array<[string, string]> = [
  ['rec', 'Recomendadas'], ['go', 'Liberadas'], ['ess', 'Essenciais'], ['ctx', 'Contexto'],
  ['annual', 'Annuals'], ['event', 'Eventos/tie-ins'], ['opt', 'Opcionais'], ['all', 'Todas']
];

export function ExtrasView() {
  const rawTarget = exploreRouteParam('extra');
  const targetIndex = rawTarget === null ? null : (() => {
    const index = /^\d+$/.test(rawTarget) ? Number(rawTarget) : editorialExtras.findIndex((entry: any) => extraAnchorKey(entry) === rawTarget);
    return index >= 0 && index < editorialExtras.length ? index : null;
  })();
  const [filter, setFilter] = useState(targetIndex !== null ? 'all' : appState.extrasFilter || 'rec');
  useEffect(() => {
    if (targetIndex === null) return;
    setFilter('all');
    const frame = requestAnimationFrame(() => focusEditorialTarget(`explore-extra-${targetIndex}`));
    return () => cancelAnimationFrame(frame);
  }, [targetIndex]);
  const filtered = editorialExtras.filter((entry: any) => {
    const availability = extraState(entry).availability;
    if (filter === 'rec') return entry.weight !== '○ Opcional';
    if (filter === 'go') return availability === 'Liberado';
    if (filter === 'ess') return String(entry.weight).startsWith('●');
    if (filter === 'ctx') return String(entry.weight).startsWith('◐');
    if (filter === 'annual') return entry.category === 'annual';
    if (filter === 'event') return entry.category === 'event' || entry.category === 'saga';
    if (filter === 'opt') return String(entry.weight).startsWith('○');
    return true;
  });
  const seenGroups = new Set<number>();
  const cards = filtered.filter((entry: any) => {
    if (!entry.readingGroup) return true;
    if (seenGroups.has(entry.readingGroup)) return false;
    seenGroups.add(entry.readingGroup);
    return true;
  });
  return (
    <>
      <div class="list-callout sm mu">Leituras fora da numeração histórica, integradas à mesma Checklist. Por padrão mostramos primeiro <b>Essenciais</b> e <b>Contexto</b>; use o filtro para explorar outras categorias.</div>
      <FilterDropdown
        label="Filtrar leituras extras por categoria"
        options={EXTRA_FILTERS}
        value={filter}
        onChange={value => { setFilter(value); appState.extrasFilter = value; }}
      />
      <p class="mu sm ui-list-count">{filtered.length} de {editorialExtras.length} entradas editoriais</p>
      {cards.length ? <div class="content-list disclosure-list ui-list extras-list">
        {cards.map((entry: any) => entry.special === 'clone' ? <CloneSummary key="clone-summary" /> : <ExtraCard key={entry.id || entry.name} extra={entry} editorialIndex={editorialExtras.indexOf(entry)} targeted={editorialExtras.indexOf(entry) === targetIndex} />)}
      </div> : <ScreenState kind="empty" title="Nenhuma leitura neste filtro" message="Escolha outra categoria para continuar explorando as Leituras Extras." />}
    </>
  );
}

function CloneIssue({ entry }: { entry: any; key?: any }) {
  const reading = itemsById[entry.id];
  if (!reading) return null;
  return <IssueRow item={reading} anchor={false} showBulkAction={false} context={{ part: entry.part, readingOrder: entry.readingOrder, note: entry.note }} />;
}

export function CloneView() {
  const phases = useMemo(() => {
    const result: any[] = [];
    for (const entry of cloneEntries as any[]) {
      let phase = result.find(item => item.name === entry.phase);
      if (!phase) { phase = { name: entry.phase, arcs: [] }; result.push(phase); }
      let arc = phase.arcs.find((item: any) => item.name === entry.crossover);
      if (!arc) { arc = { name: entry.crossover, entries: [] }; phase.arcs.push(arc); }
      arc.entries.push(entry);
    }
    return result;
  }, []);
  const [openPhases, setOpenPhases] = useState<Set<number>>(() => new Set([0]));
  return (
    <>
      <div class="list-callout sm mu intro-note">A Saga do Clone é uma visão editorial sobre as <b>mesmas HQs</b> da Checklist. Marcar aqui atualiza imediatamente o progresso global; não existe um segundo sistema de estado.</div>
      {phases.length ? <div class="content-list disclosure-list ui-list clone-list">
        {phases.map((phase, index) => {
          const ids = phase.arcs.flatMap((arc: any) => arc.entries.map((entry: any) => entry.id));
          return <ClonePhase key={phase.name} phase={phase} index={index} ids={ids} open={openPhases.has(index)} onToggle={() => setOpenPhases(current => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; })} />;
        })}
      </div> : <ScreenState kind="empty" title="Saga do Clone sem entradas" message="Nenhuma leitura da Saga do Clone foi carregada no catálogo atual." />}
    </>
  );
}

function ClonePhase({ phase, ids, open, onToggle }: any) {
  const counts = useProgressCounts(ids);
  return (
    <section class="clone-phase ui-list-item disclosure-item">
      <button class="clone-phase-button disclosure-summary ui-disclosure-summary" onClick={onToggle} aria-expanded={open}>
        <div><b>{phase.name}</b><span class="mu sm"> {ids.length} entradas · {phase.arcs.length} {phase.arcs.length === 1 ? 'arco' : 'arcos'}</span></div>
        <span class="c">{counts.read} lidas · {counts.skipped} puladas · {counts.percent}% <Icon name={open ? 'chevU' : 'chevD'} /></span>
      </button>
      <ProgressBarVisual value={counts.percent} label={`Progresso de ${phase.name}`} className="phase-progress" />
      {open ? <div class="clone-content disclosure-content">{phase.arcs.map((arc: any) => <section class="clone-arc disclosure-nested" key={arc.name || 'none'}><h4>{arc.name || 'Sem crossover específico'}</h4>{arc.entries.map((entry: any) => <CloneIssue key={`${entry.id}-${entry.readingOrder}`} entry={entry} />)}</section>)}</div> : null}
    </section>
  );
}

export function ReadingView() {
  return <VirtualizedChecklist />;
}
