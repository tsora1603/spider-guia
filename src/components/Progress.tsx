import { statusOf } from '../state/progress-store';
import { useProgressRevision } from '../ui/hooks';
import { Icon } from './Icon';
import { requestStatus } from '../runtime/controller';
import type { ProgressStatus } from '../state/types';
import { ProgressBarVisual } from '../design/ProgressVisuals';

export const progressStatusLabel = (status: ProgressStatus) => status === 'Sim' ? 'Lida' : status === 'Pulei' ? 'Pulada' : 'Pendente';

export const percent = (value: number, total: number) => (total ? Math.round((100 * value) / total) : 0);

export function useProgressCounts(ids: readonly number[]) {
  useProgressRevision(ids);
  let read = 0;
  let skipped = 0;
  for (const id of ids) {
    const status = statusOf(id);
    if (status === 'Sim') read += 1;
    else if (status === 'Pulei') skipped += 1;
  }
  return { read, skipped, total: ids.length, percent: percent(read, ids.length) };
}

export function ProgressBar({ ids, label, compact = false }: { ids: readonly number[]; label: string; compact?: boolean }) {
  const { read, total, percent: value } = useProgressCounts(ids);
  return (
    <div class={compact ? 'group-progress-block compact' : 'group-progress-block'}>
      {!compact && <div class="group-progress-copy"><span>{read}/{total}</span><b>{value}%</b></div>}
      <ProgressBarVisual value={value} label={label} />
    </div>
  );
}

export function StatusButton({ id, status, labelPrefix }: { id: number; status: ProgressStatus; labelPrefix?: string }) {
  const label = status === 'Sim' ? 'Marcar como não lida' : 'Marcar como lida';
  return (
    <button
      class={`ck ${status}`}
      onClick={event => requestStatus(id, 'Sim', event.currentTarget)}
      aria-label={labelPrefix ? `${labelPrefix}: ${progressStatusLabel(status)}. ${label}` : `${progressStatusLabel(status)}. ${label}`}
      title={`Estado atual: ${progressStatusLabel(status)}. ${label}`}
    >
      {status === 'Sim' ? <Icon name="check" /> : status === 'Pulei' ? <Icon name="skipa" /> : null}
    </button>
  );
}

export function SkipButton({ id, status }: { id: number; status: ProgressStatus }) {
  return (
    <button class="skip-action reading-skip" type="button" aria-label={status === 'Pulei' ? 'Desfazer pulo' : 'Pular'} onClick={event => requestStatus(id, 'Pulei', event.currentTarget)}>
      <span class="reading-skip-label"><Icon name="skipa" /><span>{status === 'Pulei' ? 'Desfazer pulo' : 'Pular'}</span></span>
    </button>
  );
}
