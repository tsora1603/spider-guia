import { useEffect, useMemo, useState } from 'preact/hooks';
import { journeyPhases, milestones, principalReadings, projectChecklistIds } from '../data/model';
import { exploreRouteParam, focusEditorialTarget, milestoneAnchorKey } from './explore-navigation';
import { statusOf } from '../state/progress-store';
import { useProgressRevision } from '../ui/hooks';
import { percent } from '../components/Progress';
import { Icon } from '../components/Icon';
import { SpoilerText } from '../components/SpoilerText';
import { router } from '../runtime/controller';
import { ScreenState } from '../components/ScreenState';
import { ProgressBarVisual } from '../design/ProgressVisuals';

const ANC: Array<[RegExp, number]> = [[/origem do homem/i, 1], [/aquisição do traje/i, 251], [/jean dewolff/i, 272], [/ultimate/i, 545]];
const phaseIndexOf = (historical: number) => journeyPhases.findIndex((phase: any) => historical >= phase.historicalStart && historical <= phase.historicalEnd);
const anchorOf = (milestone: any) => milestone.historicalStart || (ANC.find(entry => entry[0].test(milestone.title)) || [null, 1])[1];
const range = (start: number, end: number) => principalReadings.filter(item => Number(item.historicalNumber) >= start && Number(item.historicalNumber) <= end);

function Milestone({ milestone, milestoneIndex, selected }: { milestone: any; milestoneIndex: number; selected: boolean; key?: any }) {
  const ids = milestone.historicalStart && milestone.historicalEnd ? projectChecklistIds(range(milestone.historicalStart, milestone.historicalEnd).map(item => item.id)) : [];
  useProgressRevision(ids);
  const value = ids.length ? percent(ids.filter(id => statusOf(id) === 'Sim').length, ids.length) : null;
  // Only link to a historic issue when the curated milestone explicitly names its number.
  const firstItem = milestone.historicalStart ? principalReadings.find(item => Number(item.historicalNumber) === milestone.historicalStart) : null;
  return <div class={`card editorial-anchor${selected ? ' is-targeted' : ''}`} id={`explore-milestone-${milestoneIndex}`} data-explore-target={selected ? 'marco' : undefined} tabIndex={-1}><div class="lbl">{milestone.year}{milestone.historicalStart ? ` · #${milestone.historicalStart}${milestone.historicalEnd && milestone.historicalEnd !== milestone.historicalStart ? `–${milestone.historicalEnd}` : ''}` : ''}</div><b class="milestone-title"><SpoilerText text={milestone.title} /></b><p class="mu sm"><SpoilerText text={milestone.description} /></p><div class="sm"><Icon name="book" /> {milestone.whereToRead} <span class={`tag ${String(milestone.weight).startsWith('●') ? 'e' : ''}`}>{milestone.weight}</span></div>{value != null ? <ProgressBarVisual value={value} label={`Progresso do marco ${milestone.title}`} className="milestone-progress" /> : null}{firstItem ? <button type="button" class="btn g editorial-checklist-link" onClick={event => router.navigate(`#checklist/hq/${firstItem.id}`, event.currentTarget)}>{milestone.historicalEnd && milestone.historicalEnd !== milestone.historicalStart ? 'Começar este intervalo na Checklist' : 'Ver edição na Checklist'} <Icon name="chevD" /></button> : null}</div>;
}

function JourneyPhase({ phase, index, open, onToggle, targetMilestone }: any) {
  const items = useMemo(() => range(phase.historicalStart, phase.historicalEnd), [phase.historicalStart, phase.historicalEnd]);
  const ids = useMemo(() => projectChecklistIds(items.map(item => item.id)), [items]);
  useProgressRevision(ids);
  const value = percent(ids.filter(id => statusOf(id) === 'Sim').length, ids.length);
  const phaseMilestones = milestones.filter((milestone: any) => phaseIndexOf(anchorOf(milestone)) === index);
  const firstReading = items.find(item => Number(item.historicalNumber) === phase.historicalStart);
  return <section class={`journey-phase ui-list-item disclosure-item${open ? ' is-open' : ''}`}>
    <button class="fh disclosure-summary ui-disclosure-summary" onClick={onToggle} aria-expanded={open}><div><div class="lbl">#{phase.historicalStart} – #{phase.historicalEnd}</div><b class="xt">{phase.name}</b><div class="mu sm">{phase.creators}</div></div><span class="c">{value}%<br /><Icon name={open ? 'chevU' : 'chevD'} /></span></button>
    <ProgressBarVisual value={value} label={`Progresso da fase ${phase.name}`} />
    {open ? <div class="journey-body disclosure-content">{phase.highlights ? <p class="sm"><SpoilerText text={phase.highlights} /></p> : null}{phase.notes ? <p class="sm mu"><SpoilerText text={phase.notes} /></p> : null}{phase.historicalStart <= 418 && phase.historicalEnd >= 394 ? <p><button class="btn g" onClick={event => router.navigate('#explorar/clone', event.currentTarget)}>Abrir ordem completa da Saga do Clone</button></p> : null}{firstReading ? <button type="button" class="btn g editorial-checklist-link" onClick={event => router.navigate(`#checklist/hq/${firstReading.id}`, event.currentTarget)}>Ir à primeira edição desta fase <Icon name="chevD" /></button> : null}{phaseMilestones.length ? <div class="tl disclosure-nested">{phaseMilestones.map((milestone: any) => <Milestone key={`${milestone.year}-${milestone.title}`} milestone={milestone} milestoneIndex={milestones.indexOf(milestone)} selected={targetMilestone === milestones.indexOf(milestone)} />)}</div> : null}</div> : <div class="mu sm journey-collapsed-meta">{phaseMilestones.length ? `${phaseMilestones.length} marco${phaseMilestones.length > 1 ? 's' : ''}` : 'Sem marcos listados'}</div>}
  </section>;
}

export function JourneyView() {
  const rawTarget = exploreRouteParam('marco');
  const targetMilestone = rawTarget === null ? null : (() => {
    const index = /^\d+$/.test(rawTarget) ? Number(rawTarget) : milestones.findIndex((entry: any) => milestoneAnchorKey(entry) === rawTarget);
    return index >= 0 && index < milestones.length ? index : null;
  })();
  const targetIndex = targetMilestone !== null ? phaseIndexOf(anchorOf(milestones[targetMilestone])) : -1;
  const [openPhases, setOpenPhases] = useState<Set<number>>(() => new Set(targetIndex >= 0 ? [targetIndex] : [0]));
  useEffect(() => {
    if (targetIndex < 0 || targetMilestone === null) return;
    setOpenPhases(current => current.has(targetIndex) ? current : new Set([...current, targetIndex]));
    const frame = requestAnimationFrame(() => focusEditorialTarget(`explore-milestone-${targetMilestone}`));
    return () => cancelAnimationFrame(frame);
  }, [targetIndex, targetMilestone]);
  if (!journeyPhases.length) return <ScreenState kind="empty" title="Jornada sem fases" message="Nenhuma fase editorial foi carregada no catálogo atual." />;
  return <><div class="list-callout sm mu">Cada fase da linha principal traz os marcos que valem a leitura, com seu progresso. Toque numa fase para abrir.</div><div class="journey-list disclosure-list ui-list">{journeyPhases.map((phase: any, index: number) => <JourneyPhase key={phase.name} phase={phase} index={index} open={openPhases.has(index)} targetMilestone={targetMilestone} onToggle={() => setOpenPhases(current => { const next = new Set(current); next.has(index) ? next.delete(index) : next.add(index); return next; })} />)}</div></>;
}
