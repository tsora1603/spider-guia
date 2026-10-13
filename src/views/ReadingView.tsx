import { useEffect, useState } from 'preact/hooks';
import { appState } from '../state/app-state';
import { cloneGuide, editorialExtras } from '../data/model';
import { VirtualizedChecklist } from '../components/VirtualizedChecklist';
import { ExtraCard, CloneSummary, extraState } from '../components/Editorial';
import { useProgressCounts } from '../components/Progress';
import { itemsById } from '../data/model';
import { IssueRow } from '../components/IssueRow';
import { CloneGuideLinksAction } from '../components/ReadingLinksAction';
import { Icon } from '../components/Icon';
import { FilterDropdown } from '../components/FilterDropdown';
import { ScreenState } from '../components/ScreenState';
import { ProgressBarVisual } from '../design/ProgressVisuals';
import {
  exploreRouteParam,
  focusEditorialTarget,
  resolveExtraTargetIndex
} from './explore-navigation';
import { readingReturnFor } from '../links/return-context';

import {
  cloneGuideItemIds,
  findCloneGuideStep,
  type CloneGuideSection,
  type CloneGuideStep
} from '../clone-guide/model';

const EXTRA_FILTERS: Array<[string, string]> = [
  ['rec', 'Recomendadas'],
  ['go', 'Liberadas'],
  ['ess', 'Essenciais'],
  ['ctx', 'Contexto'],
  ['annual', 'Annuals'],
  ['event', 'Eventos/tie-ins'],
  ['opt', 'Opcionais'],
  ['all', 'Todas']
];

export function ExtrasView() {
  const directExtra = resolveExtraTargetIndex(exploreRouteParam('extra'), editorialExtras);
  const returnedExtraId = readingReturnFor(history.state, location.hash, 'extra');
  const rememberedIndex =
    returnedExtraId === null
      ? null
      : editorialExtras.findIndex((extra: any) => extra.n === returnedExtraId);
  const targetIndex =
    directExtra ?? (rememberedIndex !== null && rememberedIndex >= 0 ? rememberedIndex : null);
  const [filter, setFilter] = useState(
    directExtra !== null ? 'all' : appState.extrasFilter || 'rec'
  );
  useEffect(() => {
    if (targetIndex === null) return;
    if (directExtra !== null) setFilter('all');
    const frame = requestAnimationFrame(() => focusEditorialTarget(`explore-extra-${targetIndex}`));
    return () => cancelAnimationFrame(frame);
  }, [targetIndex, directExtra]);
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
  // Grupos não devem ocultar a entrada exata aberta pela busca/deep link.
  // No acesso normal preservamos o primeiro representante de cada grupo;
  // em um link direto, a entrada solicitada o representa temporariamente.
  const cards: any[] = [];
  const groupPositions = new Map<number, number>();
  for (const entry of filtered) {
    if (!entry.readingGroup) {
      cards.push(entry);
      continue;
    }
    const group = Number(entry.readingGroup);
    const existing = groupPositions.get(group);
    if (existing === undefined) {
      groupPositions.set(group, cards.length);
      cards.push(entry);
    } else if (targetIndex !== null && editorialExtras[targetIndex] === entry) {
      cards[existing] = entry;
    }
  }
  return (
    <>
      <div class="list-callout sm mu">
        Leituras fora da numeração histórica, integradas à mesma Checklist. Por padrão mostramos
        primeiro <b>Essenciais</b> e <b>Contexto</b>; use o filtro para explorar outras categorias.
      </div>
      <FilterDropdown
        label="Filtrar leituras extras por categoria"
        options={EXTRA_FILTERS}
        value={filter}
        onChange={(value) => {
          setFilter(value);
          appState.extrasFilter = value;
        }}
      />
      <p class="mu sm ui-list-count">
        {filtered.length} de {editorialExtras.length} entradas editoriais
      </p>
      {cards.length ? (
        <div class="content-list disclosure-list ui-list extras-list">
          {cards.map((entry: any) =>
            entry.special === 'clone' ? (
              <CloneSummary key="clone-summary" />
            ) : (
              <ExtraCard
                key={entry.id || entry.name}
                extra={entry}
                editorialIndex={editorialExtras.indexOf(entry)}
                targeted={editorialExtras.indexOf(entry) === targetIndex}
              />
            )
          )}
        </div>
      ) : (
        <ScreenState
          kind="empty"
          title="Nenhuma leitura neste filtro"
          message="Escolha outra categoria para continuar explorando as Leituras Extras."
        />
      )}
    </>
  );
}

function CloneStep({ step, targeted }: { step: CloneGuideStep; targeted: boolean }) {
  const counts = useProgressCounts(step.itemIds);
  return (
    <details
      id={`clone-step-${step.id}`}
      class={`clone-arc clone-guide-step disclosure-item editorial-anchor${targeted ? ' is-targeted' : ''}`}
      data-clone-step={step.id}
      open={targeted || step.number === 1 ? true : undefined}
    >
      <summary class="disclosure-summary ui-disclosure-summary">
        <div class="row-head">
          <b>
            <span class="clone-step-number">{step.number}.</span> {step.title}
          </b>
          <div class="row-meta disclosure-meta">
            <span class="tag">{step.format}</span>
          </div>
        </div>
        <Icon name="chevD" className="disclosure-chevron" />
      </summary>
      <div class="clone-step-body disclosure-content">
        <p class="clone-reading-order">
          <b>Leia:</b> {step.read}
        </p>
        {step.note ? <p class="sm mu clone-context">{step.note}</p> : null}
        {step.complement ? (
          <p class="clone-complement sm">
            <b>Completar ou conferir no original:</b> {step.complement}
          </p>
        ) : null}
        <CloneGuideLinksAction
          itemIds={step.itemIds}
          arcIds={step.arcIds}
          stepId={step.id}
          label={step.title}
        />
        <details class="clone-checklist disclosure-nested">
          <summary>
            HQs deste passo na Checklist · {counts.read} lidas · {counts.skipped} puladas
          </summary>
          <p class="sm mu">
            As marcas acompanham as HQs americanas do catálogo. Contos de um mesmo número podem
            aparecer em volumes diferentes; confira o sumário para completar a leitura do volume.
          </p>
          <div class="content-list disclosure-list ui-list">
            {step.itemIds.map((id) => {
              const reading = itemsById[id];
              return reading ? (
                <IssueRow
                  key={id}
                  item={reading}
                  anchor={false}
                  showBulkAction={false}
                  showLinks={false}
                  suppressEditorialDetails
                />
              ) : null;
            })}
          </div>
        </details>
        <details class="clone-originals sm disclosure-nested">
          <summary>Conteúdo americano de referência</summary>
          <ul>
            {step.originals.map((label) => (
              <li key={label}>{label}</li>
            ))}
          </ul>
        </details>
      </div>
    </details>
  );
}

function CloneSection({
  section,
  open,
  onToggle,
  targetId
}: {
  section: CloneGuideSection;
  open: boolean;
  onToggle: () => void;
  targetId: string | null;
}) {
  const ids = cloneGuideItemIds([section]);
  const counts = useProgressCounts(ids);
  return (
    <section
      class={`clone-phase journey-phase ui-list-item disclosure-item${open ? ' is-open' : ''}`}
      data-clone-section={section.id}
    >
      <button
        class="fh disclosure-summary ui-disclosure-summary"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`clone-section-${section.id}`}
      >
        <div>
          <b>{section.title}</b>
          <span class="mu sm">
            {' '}
            {section.steps.length} {section.id === 'base' ? 'volumes completos' : 'passos'}
          </span>
        </div>
        <Icon name={open ? 'chevU' : 'chevD'} />
      </button>
      <ProgressBarVisual
        value={counts.percent}
        label={`Progresso das HQs de ${section.title}`}
        className="phase-progress"
      />
      {open ? (
        <div id={`clone-section-${section.id}`} class="clone-content disclosure-content">
          <p class="clone-section-description sm mu">{section.description}</p>
          {section.steps.map((step) => (
            <CloneStep key={step.id} step={step} targeted={step.id === targetId} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export function CloneView() {
  const targetId = exploreRouteParam('passo');
  const target = findCloneGuideStep(cloneGuide, targetId);
  const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(['base']));
  useEffect(() => {
    if (!target) return;
    setOpenSections((current) => new Set([...current, target.section.id]));
    const frame = requestAnimationFrame(() => focusEditorialTarget(`clone-step-${target.step.id}`));
    return () => cancelAnimationFrame(frame);
  }, [targetId]);
  return (
    <>
      <div class="list-callout intro-note clone-guide-intro">
        <h3>{cloneGuide.title}</h3>
        {cloneGuide.intro.map((text) => (
          <p class="sm" key={text}>
            {text}
          </p>
        ))}
        <p class="sm mu">
          O progresso das HQs é compartilhado com a Checklist. Os encadernados da base não voltam à
          sequência complementar.
        </p>
      </div>
      <details class="list-callout clone-guide-help">
        <summary>Como interpretar os títulos e a numeração</summary>
        <p class="sm mu">{cloneGuide.legend}</p>
      </details>
      <div class="content-list disclosure-list ui-list clone-list">
        {cloneGuide.sections.map((section) => (
          <CloneSection
            key={section.id}
            section={section}
            targetId={targetId}
            open={openSections.has(section.id)}
            onToggle={() =>
              setOpenSections((current) => {
                const next = new Set(current);
                next.has(section.id) ? next.delete(section.id) : next.add(section.id);
                return next;
              })
            }
          />
        ))}
      </div>
      <section
        class="list-callout clone-guide-notes"
        aria-label="Integralidade e limites da pesquisa"
      >
        <h3>Integralidade e cuidados</h3>
        <p class="sm mu">
          As histórias brasileiras identificadas não comprovam a reprodução de todos os contos de
          cada original americano.
        </p>
        {cloneGuide.notes.map((note) => (
          <details key={note.title} class="disclosure-nested">
            <summary>{note.title}</summary>
            <p class="sm mu">{note.body}</p>
          </details>
        ))}
      </section>
      <section class="list-callout clone-guide-sources" aria-label="Fontes do guia brasileiro">
        <h3>Fontes do guia</h3>
        {cloneGuide.sources.map((source) => (
          <div key={source.title}>
            {source.url ? (
              <a class="source-link" href={source.url} target="_blank" rel="noopener noreferrer">
                <Icon name="search" /> {source.title}
              </a>
            ) : (
              <b class="sm">{source.title}</b>
            )}
            <p class="sm mu">{source.description}</p>
          </div>
        ))}
      </section>
    </>
  );
}

export function ReadingView() {
  return <VirtualizedChecklist />;
}
