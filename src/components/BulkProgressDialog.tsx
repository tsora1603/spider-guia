import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { principalReadings } from '../data/model';
import { applyBulkStatus } from '../runtime/controller';
import {
  buildBulkPreview,
  historicalAnchor,
  itemLabel,
  type BulkSelection,
  type BulkTargetStatus
} from '../progress/bulk-progress';
import { bulkProgressUi } from '../progress/bulk-ui';
import { ScreenState } from './ScreenState';

function selectionFromMode(
  mode: BulkSelection['kind'],
  throughHistorical: string,
  rangeStart: string,
  rangeEnd: string
): BulkSelection {
  if (mode === 'plan' || mode === 'group') return { kind: 'plan' };
  if (mode === 'through') {
    const anchor = historicalAnchor(Number(throughHistorical));
    return { kind: 'through', itemId: anchor?.id || -1 };
  }
  return {
    kind: 'range',
    startHistorical: Number(rangeStart),
    endHistorical: Number(rangeEnd)
  };
}

export function BulkProgressDialog() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const originRef = useRef<HTMLElement | null>(null);
  const [mode, setMode] = useState<BulkSelection['kind']>('through');
  const [target, setTarget] = useState<BulkTargetStatus>('Sim');
  const [throughHistorical, setThroughHistorical] = useState('');
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);

  useEffect(() => bulkProgressUi.subscribe(request => {
    originRef.current = request.origin || (document.activeElement as HTMLElement | null);
    setTarget(request.target || 'Sim');
    const selection = request.selection;
    if (selection?.kind === 'plan' || selection?.kind === 'group') {
      setMode('plan');
    } else if (selection?.kind === 'through') {
      setMode('through');
      const item = principalReadings.find(candidate => candidate.id === selection.itemId);
      setThroughHistorical(item?.historicalNumber ? String(item.historicalNumber) : '');
    } else if (selection?.kind === 'range') {
      setMode('range');
      setRangeStart(String(selection.startHistorical));
      setRangeEnd(String(selection.endHistorical));
    }
    setRevision(value => value + 1);
    if (dialogRef.current && !dialogRef.current.open) dialogRef.current.showModal();
  }), []);

  const selection = useMemo(
    () => selectionFromMode(mode, throughHistorical, rangeStart, rangeEnd),
    [mode, throughHistorical, rangeStart, rangeEnd, revision]
  );
  const preview = buildBulkPreview(selection, target);
  const close = () => dialogRef.current?.close();
  const submit = async () => {
    if (!preview.valid || !preview.changed) return;
    setBusy(true);
    try {
      await applyBulkStatus(preview.changedItems.map(item => item.id), target, preview.label);
      close();
    } finally {
      setBusy(false);
    }
  };

  const statusChangeCopy = target === 'Sim'
    ? `${preview.pending} pendentes e ${preview.skipped} puladas estão na seleção.`
    : `${preview.read} lidas e ${preview.skipped} puladas estão na seleção.`;

  return (
    <dialog
      ref={dialogRef}
      id="bulk-progress-dialog"
      class="bulk-progress-dialog"
      aria-labelledby="bulk-progress-title"
      onClose={() => originRef.current?.focus?.()}
    >
      <form method="dialog" onSubmit={event => event.preventDefault()}>
        <div class="bulk-dialog-head">
          <div>
            <div class="lbl">Ações de progresso</div>
            <h2 id="bulk-progress-title">Editar em lote</h2>
          </div>
          <button class="dialog-close" type="button" aria-label="Fechar ações em lote" onClick={close}>×</button>
        </div>
        <p class="mu sm">Escolha o recorte, confira exatamente o que muda e só então confirme. Toda ação pode ser desfeita.</p>

        <div class="seg bulk-mode-tabs" aria-label="Tipo de seleção em lote">
          <button type="button" class={mode === 'plan' ? 'on' : ''} aria-pressed={mode === 'plan'} onClick={() => setMode('plan')}>Plano atual</button>
          <button type="button" class={mode === 'through' ? 'on' : ''} aria-pressed={mode === 'through'} onClick={() => setMode('through')}>Tudo até aqui</button>
          <button type="button" class={mode === 'range' ? 'on' : ''} aria-pressed={mode === 'range'} onClick={() => setMode('range')}>Intervalo</button>
        </div>

        {mode === 'plan' ? <p class="mu sm">Inclui todas as leituras do mesmo plano usado na Home e na Checklist, na ordem de leitura. Confira a prévia antes de aplicar.</p> : null}
        {mode === 'through' ? (
          <label class="bulk-field"><span>Marcar tudo até a edição histórica</span><div class="bulk-number"><b>#</b><input aria-label="Edição histórica para tudo até aqui" type="number" min="1" max="1000" inputMode="numeric" value={throughHistorical} onInput={event => setThroughHistorical(event.currentTarget.value)} placeholder="250" /></div></label>
        ) : null}
        {mode === 'range' ? (
          <fieldset class="bulk-range"><legend>Intervalo histórico</legend><label><span>De</span><div class="bulk-number"><b>#</b><input aria-label="Início do intervalo" type="number" min="1" max="1000" inputMode="numeric" value={rangeStart} onInput={event => setRangeStart(event.currentTarget.value)} placeholder="100" /></div></label><label><span>Até</span><div class="bulk-number"><b>#</b><input aria-label="Fim do intervalo" type="number" min="1" max="1000" inputMode="numeric" value={rangeEnd} onInput={event => setRangeEnd(event.currentTarget.value)} placeholder="125" /></div></label></fieldset>
        ) : null}

        <fieldset class="bulk-target"><legend>Aplicar</legend><label><input type="radio" name="bulk-target" checked={target === 'Sim'} onChange={() => setTarget('Sim')} /> <span><b>Marcar como lidas</b><small>Itens pulados nesta seleção passam a lidos.</small></span></label><label><input type="radio" name="bulk-target" checked={target === 'Não'} onChange={() => setTarget('Não')} /> <span><b>Voltar a não lidas</b><small>Remove tanto “lida” quanto “pulada” desta seleção.</small></span></label></fieldset>

        {!preview.valid ? (
          <ScreenState kind="empty" compact title="Defina uma seleção válida" message={preview.error} />
        ) : (
          <section class="bulk-preview" aria-live="polite">
            <div class="bulk-preview-title"><span class="lbl">Pré-visualização</span><b>{preview.changed} {preview.changed === 1 ? 'mudança' : 'mudanças'} de {preview.total} itens</b></div>
            <div class="bulk-preview-grid">
              <div><span>Primeira</span><b>{itemLabel(preview.first)}</b></div>
              <div><span>Última</span><b>{itemLabel(preview.last)}</b></div>
              <div><span>Essenciais</span><b>{preview.essential}</b></div>
              <div><span>Já no destino</span><b>{preview.alreadyTarget}</b></div>
            </div>
            <p class="mu sm">{statusChangeCopy}</p>
            {target === 'Sim' && preview.skipped ? <p class="bulk-warning sm"><b>Atenção:</b> {preview.skipped} {preview.skipped === 1 ? 'leitura pulada será convertida' : 'leituras puladas serão convertidas'} em lida.</p> : null}
          </section>
        )}

        <div class="dialog-actions bulk-actions">
          <button class="btn g" type="button" onClick={close}>Cancelar</button>
          <button class="btn" type="button" disabled={busy || !preview.valid || preview.changed === 0} onClick={() => void submit()}>{busy ? 'Aplicando…' : preview.changed ? `Aplicar ${preview.changed}` : 'Nada para alterar'}</button>
        </div>
      </form>
    </dialog>
  );
}
