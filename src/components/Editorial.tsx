import { useMemo } from 'preact/hooks';
import { DATA, editorialExtras, itemsById, readings } from '../data/model';
import { statusOf } from '../state/progress-store';
import { useProgressRevision } from '../ui/hooks';
import { Icon } from './Icon';
import { SpoilerText } from './SpoilerText';
import { SkipButton, StatusButton, useProgressCounts, progressStatusLabel } from './Progress';
import { IssueRow } from './IssueRow';
import { ProgressBarVisual } from '../design/ProgressVisuals';

export function SourceLinks({ indexes = [] }: { indexes?: number[] }) {
  return <>
    {indexes.map(index => {
      const source = DATA.fontes.r[index];
      if (!source) return null;
      const title = String(source[0]).replace(/\s*\(atualizado.*$/, '');
      const url = String(source[2] || '').split(/\s*;\s*/)[0];
      return /^https?:\/\//.test(url)
        ? <a class="source-link" href={url} target="_blank" rel="noopener"><Icon name="search" /> {title} <Icon name="chevR" /></a>
        : <span class="source-link"><Icon name="search" /> {title}</span>;
    })}
  </>;
}

type ConfirmationCriteria = {
  position?: 'source-only' | 'not-met';
  weight?: 'evidence-led-80-20' | 'not-met';
};

export function EvidenceBox({ status, detail, sources, criteria }: { status?: string; detail?: unknown; sources?: number[]; criteria?: ConfirmationCriteria }) {
  if (!status && !detail && !(sources || []).length && !criteria) return null;
  const confirmed = status === 'Confirmado';
  const positionPass = criteria?.position === 'source-only';
  const weightPass = criteria?.weight === 'evidence-led-80-20';
  return (
    <div class={`cf ${confirmed ? 'ok' : 'p'}`}>
      <b>{confirmed ? <><Icon name="shield" /> Confirmado</> : status || 'Parcial'}</b>
      {criteria ? (
        <div class="cf-criteria" aria-label="Critérios de confirmação">
          <span class={positionPass ? 'criterion-pass' : 'criterion-fail'}>
            <Icon name={positionPass ? 'check' : 'minus'} /> Posição: {positionPass ? '100% evidência de fontes' : 'critério de 100% não atendido'}
          </span>
          <span class={weightPass ? 'criterion-pass' : 'criterion-fail'}>
            <Icon name={weightPass ? 'check' : 'minus'} /> Peso: {weightPass ? '≥80% evidência · ≤20% dedução' : 'critério 80/20 não atendido'}
          </span>
        </div>
      ) : null}
      {detail ? <span class="jt"><SpoilerText text={detail} /></span> : null}
      {(sources || []).length ? <><span>{sources!.length > 1 ? 'Fontes consultadas:' : 'Fonte consultada:'}</span><SourceLinks indexes={sources} /></> : <span>sem fonte específica registrada</span>}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value?: unknown }) {
  if (!value) return null;
  return <div class="k"><span>{label}</span><SpoilerText text={value} /></div>;
}

function unlockDependencyId(after: number | null | undefined) {
  if (!after) return null;
  return readings.find(item => item.type === 'Principal' && Number(item.historicalNumber) === Number(after))?.id || null;
}

export function extraState(extra: any) {
  const ids: number[] = extra.itemIds || [];
  const read = ids.filter(id => statusOf(id) === 'Sim').length;
  const skipped = ids.filter(id => statusOf(id) === 'Pulei').length;
  const dependency = unlockDependencyId(extra.after);
  const unlocked = !dependency || statusOf(dependency) === 'Sim';
  // Editorial availability and the user's three-state progress are independent.
  // Preserve className's legacy meaning for current Home and Extras filters.
  const availability = unlocked ? 'Liberado' : 'Ainda não';
  const className = ids.length && read === ids.length ? 'ok'
    : ids.length && read + skipped === ids.length ? 'is-skipped'
      : unlocked ? 'go' : 'no';
  const label = className === 'ok' ? 'Concluído'
    : className === 'is-skipped' ? 'Pulado' : availability;
  return { className, label, availability, read, skipped, pending: ids.length - read - skipped, total: ids.length };
}

export function ExtraCard({ extra, editorialIndex, targeted = false }: { extra: any; editorialIndex?: number; targeted?: boolean; key?: any }) {
  const dependency = unlockDependencyId(extra.after);
  const subscriptionIds = useMemo(() => [...(extra.itemIds || []), ...(dependency ? [dependency] : [])], [extra]);
  useProgressRevision(subscriptionIds);
  const state = extraState(extra);
  const id = extra.itemIds?.[0];
  const singleStatus = id ? statusOf(id) : 'Não';
  const hasSingleIssue = state.total === 1 && Boolean(id);
  return (
    <div id={editorialIndex != null ? `explore-extra-${editorialIndex}` : undefined} data-explore-target={targeted ? 'extra' : undefined} class={`list-entry ui-list-item extra-entry editorial-anchor ${state.className}${targeted ? ' is-targeted' : ''}`}>
      {hasSingleIssue
        ? <StatusButton id={id} status={singleStatus} />
        : <span class="group-progress" aria-label={`${state.read} lidas e ${state.skipped} puladas em ${state.total} edições`}>{state.read}/{state.total}</span>}
      <details class="row-details disclosure-item" open={targeted ? true : undefined}>
        <summary class="disclosure-summary ui-disclosure-summary">
          <div class="row-head">
            <b><SpoilerText text={extra.name} /></b>
            <div class="row-meta disclosure-meta">
              <span class={`tag ${String(extra.weight || '').startsWith('●') ? 'e' : ''}`}>{extra.weight}</span>
              <span class={`pill ${state.availability === 'Liberado' ? 'go' : 'no'}`} title="Momento editorial recomendado">{state.availability}</span>
              {hasSingleIssue
                ? <span class={`reading-status reading-status-${singleStatus === 'Sim' ? 'read' : singleStatus === 'Pulei' ? 'skipped' : 'pending'}`}>{progressStatusLabel(singleStatus)}</span>
                : <span class="reading-status" aria-label="Progresso das edições">{state.read} lidas · {state.skipped} puladas · {state.pending} pendentes</span>}
              <span class="mu sm">{extra.after ? `Depois da #${extra.after}` : 'Antes da #1'}</span>
              {extra.unavailable ? <span class="tag">sem link</span> : null}
            </div>
          </div>
          <Icon name="chevD" className="disclosure-chevron" />
        </summary>
        <div class="row-body disclosure-content">
          <EvidenceBox status={extra.confirmation} detail={extra.confirmationDetail || extra.just} sources={extra.src || []} criteria={extra.confirmationCriteria} />
          <KeyValue label="Em que ordem" value={extra.sequence} />
          <KeyValue label="Por que ajuda" value={extra.why} />
          {extra.brazilianEdition ? <div class="ex"><Icon name="book" /> {extra.brazilianEdition}</div> : null}
          {state.total > 1 ? <div class="extra-issue-list content-list disclosure-list ui-list" aria-label={`Edições de ${extra.name}`}>
            {extra.itemIds.map((itemId: number) => {
              const item = itemsById[itemId];
              return item ? <IssueRow key={itemId} item={item} anchor={false} showBulkAction={false} /> : null;
            })}
          </div> : null}
          {hasSingleIssue && itemsById[id] ? <div class="sm mu">Abra a Checklist para consultar também a ficha completa desta edição.</div> : null}
        </div>
      </details>
      {hasSingleIssue ? <div class="reading-row-end"><SkipButton id={id} status={singleStatus} /></div> : null}
    </div>
  );
}

export function CloneSummary() {
  const ids = DATA.editorial.clone.entries.map((entry: any) => entry.id) as number[];
  const counts = useProgressCounts(ids);
  return (
    <div class="list-callout ed-note">
      <div class="ed-sum"><div><div class="lbl">Ordem especializada</div><b class="xt">Saga do Clone · {ids.length} entradas</b><p class="mu sm">8 fases editoriais, crossovers e partes em uma ordem especializada. O progresso é o mesmo da Checklist.</p></div><b>{counts.percent}%</b></div>
      <ProgressBarVisual value={counts.percent} label="Progresso da Saga do Clone" />
    </div>
  );
}

export const editorialExtrasWithoutDuplicateGroups = (() => {
  const seen = new Set<number>();
  return editorialExtras.filter((entry: any) => {
    if (!entry.readingGroup) return true;
    if (seen.has(entry.readingGroup)) return false;
    seen.add(entry.readingGroup);
    return true;
  });
})();
