import { memo } from 'preact/compat';
import { useState } from 'preact/hooks';
import type { Reading } from '../data/model';
import { extraDetailsById, extraEditorialByItemId } from '../data/model';
import { extraAnchorKey, exploreTarget } from '../views/explore-navigation';
import { useReadingDetails } from '../data/hooks';
import { useProgressStatus } from '../ui/hooks';
import { SpoilerText } from './SpoilerText';
import { SkipButton, StatusButton, progressStatusLabel } from './Progress';
import { Icon } from './Icon';
import { bulkProgressUi } from '../progress/bulk-ui';

const noteFor = (item: Reading) => {
  const notes = item.notes || '';
  const extraNote = item.extraNote || '';
  const filteredNotes = extraDetailsById[item.id]
    ? notes.split('\n').filter(line => !/^(Por que ajuda|Confirmação):/.test(line)).join('\n')
    : notes;
  return [extraNote, filteredNotes]
    .filter((value, index, values) => value && values.indexOf(value) === index)
    .join('\n');
};

type CloneContext = { part?: string | number; readingOrder?: number; note?: unknown };

/** Uma linha de edição, compartilhada pela Checklist, Extras e Saga do Clone.
 * O controle de pular nunca fica dentro de <details>: permanece acessível fechada.
 */
export const IssueRow = memo(function IssueRow({
  item,
  open,
  onOpenChange,
  anchor = true,
  showBulkAction = true,
  context
}: {
  key?: any;
  item: Reading;
  open?: boolean;
  onOpenChange?(id: number, open: boolean): void;
  anchor?: boolean;
  showBulkAction?: boolean;
  context?: CloneContext;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const expanded = open ?? localOpen;
  const status = useProgressStatus(item.id);
  // A Checklist é uma sequência operacional; o conteúdo editorial dos Extras
  // pertence a Explorar > Extras. Em Explorar, manter as fichas completas.
  const editorialExtra = anchor && !context && item.type === 'Leitura fora da linha'
    ? extraEditorialByItemId[item.id] : null;
  const { item: detailedItem, loading: detailLoading, error: detailError } = useReadingDetails(item.id, expanded && !editorialExtra);
  const resolvedItem = detailedItem || item;
  const detail = extraDetailsById[item.id];
  const note = noteFor(resolvedItem);
  const hasDetail = Boolean(editorialExtra || (resolvedItem.detailsLoaded && (resolvedItem.brazilianEdition || note || detail)));
  return (
    <div id={anchor ? `hq-${item.id}` : undefined} tabIndex={-1} data-keyboard-reading data-reading-id={item.id} data-progress-status={status} class={`list-entry issue-entry ui-list-item ${status === 'Não' ? '' : 'is-done'}`}>
      <StatusButton id={item.id} status={status} labelPrefix={`${item.series} ${item.issue}`} />
      <details
        class="row-details disclosure-item"
        open={expanded}
        onToggle={event => {
          const next = event.currentTarget.open;
          if (open === undefined) setLocalOpen(next);
          else onOpenChange?.(item.id, next);
        }}
      >
        <summary class="disclosure-summary ui-disclosure-summary">
          <div class="row-head">
            <b>{item.series} {item.issue}</b>
            <div class="row-meta disclosure-meta">
              {item.historicalNumber ? <span class="mu sm">#{item.historicalNumber}</span> : null}
              <span class={`tag ${item.weight.startsWith('●') ? 'e' : ''}`}>{item.weight}</span>
              {item.type !== 'Principal' ? <span class="tag">{item.type}</span> : null}
              <span class={`reading-status reading-status-${status === 'Sim' ? 'read' : status === 'Pulei' ? 'skipped' : 'pending'}`}>{progressStatusLabel(status)}</span>
              {context?.part ? <span class="tag">Parte {context.part}</span> : null}
              {expanded && resolvedItem.detailsLoaded && !hasDetail && !context?.note ? <span class="mu sm">sem detalhes adicionais</span> : null}
            </div>
          </div>
          <Icon name="chevD" className="disclosure-chevron" />
        </summary>
        <div class="row-body disclosure-content">
          {editorialExtra ? (
            <a
              class="extra-more-info-link"
              href={exploreTarget('extras', 'extra', extraAnchorKey(editorialExtra))}
              aria-label={`Mais informações sobre ${item.series} ${item.issue} em Explorar, Extras`}
            >
              <Icon name="info" size={18} /> Mais informações <Icon name="arrowRight" size={18} />
            </a>
          ) : <>
          {context ? <div class="sm mu clone-context">{context.readingOrder != null ? `Ordem ${context.readingOrder}` : ''}{context.note ? <> · <SpoilerText text={context.note} /></> : null}</div> : null}
          {showBulkAction && item.historicalNumber ? <div class="issue-actions"><button class="skip-action bulk-inline-action" type="button" onClick={event => bulkProgressUi.open({ selection: { kind: 'through', itemId: item.id }, origin: event.currentTarget })}>Tudo até aqui</button></div> : null}
          {detailLoading ? <div class="ex mu sm" role="status">Carregando detalhes desta fase…</div> : null}
          {detailError ? <div class="ex sm" role="alert">Não foi possível carregar os detalhes desta fase. Tente novamente ao reabrir a edição.</div> : null}
          {resolvedItem.brazilianEdition ? <div class="ex"><Icon name="book" /> {resolvedItem.brazilianEdition}</div> : null}
          {note ? <div class="ex nt"><SpoilerText text={note} inline={false} /></div> : null}
          {detail ? (
            <div class="ex">
              {detail.porque ? <><b>Por que ler:</b> <SpoilerText text={detail.porque} /><br /></> : null}
              {detail.quanto ? <><b>Quanto ler:</b> {detail.quanto} </> : null}
              {detail.conf ? <>· <b>Confirmação:</b> {detail.conf}</> : null}
              {detail.confirmationDetail ? <div class="sm mu"><SpoilerText text={detail.confirmationDetail} inline={false} /></div> : null}
            </div>
          ) : null}
          </>}
        </div>
      </details>
      <div class="reading-row-end"><SkipButton id={item.id} status={status} /></div>
    </div>
  );
});
