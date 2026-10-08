import { useMemo, useState } from 'preact/hooks';
import { editorialExtras, journeyPhases, milestones, readings, type Reading } from '../data/model';
import { statusOf } from '../state/progress-store';
import { useProgressRevision, useUiRevision } from '../ui/hooks';
import { Icon } from '../components/Icon';
import { SpoilerText } from '../components/SpoilerText';
import { percent } from '../components/Progress';
import { extraState } from '../components/Editorial';
import { homeSyncCopy, markUpTo, router } from '../runtime/controller';
import { useReadingPreferences } from '../preferences/hooks';
import { buildReadingPlan } from '../preferences/reading-plan';
import { readingDepthName } from '../preferences/reading-preferences';
import { ScreenState } from '../components/ScreenState';
import { ProgressBarVisual } from '../design/ProgressVisuals';
import { useReadingDetails } from '../data/hooks';
import { EngagementCard } from '../engagement/EngagementCard';
import { summarizeReadingPlan } from './home-model';
import { readThroughSelection } from '../progress/read-through';
import { isSyncBlocked, mayUseCloud } from '../reset/reset-guard';
import { appState } from '../state/app-state';

function HomeSyncStatus() {
  useUiRevision('session');
  useUiRevision('sync');
  return <div class="home-sync sm mu"><span>{homeSyncCopy()}</span>{(isSyncBlocked() || (appState.currentUser && !mayUseCloud(appState.currentUser.id))) ? <button type="button" class="home-text-action" onClick={event => router.navigate('#configuracoes', event.currentTarget)}>Revisar sincronização →</button> : null}</div>;
}

function HomeProgress({ summary, label }: { summary: ReturnType<typeof summarizeReadingPlan>; label: string }) {
  const { read, skipped, pending, total } = summary;
  const value = percent(read, total);
  return (
    <section class="home-plan" aria-labelledby="home-plan-heading">
      <div class="home-progress-head">
        <div>
          <div class="home-eyebrow">Plano ativo · {label}</div>
          <h3 id="home-plan-heading">Progresso da leitura</h3>
        </div>
        <div class="home-progress-amount" aria-label={`${value}% lido`}>
          <strong>{value}%</strong><span>lido</span>
        </div>
      </div>
      <ProgressBarVisual value={value} label={`Progresso do plano ${label}: ${read} de ${total} leituras lidas`} className="home-plan-bar" />
      <div class="home-progress-caption">
        <span><b>{read.toLocaleString('pt-BR')}</b> de {total.toLocaleString('pt-BR')} {read === 1 ? 'lida' : 'lidas'}</span>
        {skipped > 0 ? <span><b>{skipped.toLocaleString('pt-BR')}</b> {skipped === 1 ? 'pulada' : 'puladas'}</span> : null}
        <span><b>{pending.toLocaleString('pt-BR')}</b> por ler</span>
      </div>
    </section>
  );
}

function HomeNext({ plan, next, skipped, label, focusQuery }: { plan: readonly Reading[]; next: Reading | undefined; skipped: number; label: string; focusQuery: string }) {
  const { item: detailedNext } = useReadingDetails(next?.id, Boolean(next));
  const displayNext = detailedNext || next;
  if (!plan.length) {
    return <section class="home-next"><ScreenState kind="empty" title="Nenhuma leitura encontrada para este plano" message={`O foco “${focusQuery}” não encontrou leituras não opcionais no catálogo atual.`} actionLabel="Ajustar preferências" onAction={() => router.navigate('#configuracoes')} /></section>;
  }
  return (
    <section class="home-next" aria-labelledby="home-next-heading">
      <div class="home-eyebrow">Sua próxima leitura <span class="home-eyebrow-separator">/</span> {label}</div>
      {displayNext ? <>
        <h3 class="home-issue-title" id="home-next-heading">{displayNext.series} {displayNext.issue}</h3>
        <div class="chips home-issue-tags">
          <span class={`tag ${displayNext.weight.startsWith('●') ? 'e' : ''}`}>{displayNext.weight}</span>
          {displayNext.historicalNumber ? <span class="tag">Edição histórica #{displayNext.historicalNumber}</span> : null}
        </div>
        {displayNext.extraNote || displayNext.notes ? <p class="home-next-description mu sm"><SpoilerText text={[displayNext.extraNote, displayNext.notes].filter(Boolean).join('\n')} /></p> : null}
        <button class="btn home-continue-button" onClick={event => router.navigate(`#checklist/hq/${displayNext.id}`, event.currentTarget)}><Icon name="play" /> Abrir leitura na Checklist</button>
      </> : <>
        <h3 class="home-issue-title" id="home-next-heading">{skipped ? 'Sem leituras pendentes' : 'Plano concluído!'}</h3>
        <p class="home-next-description mu">{skipped ? `Você leu ou pulou todas as edições deste plano. ${skipped} ${skipped === 1 ? 'edição continua marcada como pulada' : 'edições continuam marcadas como puladas'}.` : `Você leu todas as edições do plano ${label.toLowerCase()}.`}</p>
        <button class="btn g home-continue-button" onClick={event => router.navigate(skipped ? '#checklist?f=puladas' : '#explorar/jornada', event.currentTarget)}>{skipped ? 'Revisar leituras puladas' : 'Revisitar a jornada'}</button>
      </>}
    </section>
  );
}

export function HomeView() {
  useProgressRevision();
  const preferences = useReadingPreferences();
  const [search, setSearch] = useState('');
  const [upTo, setUpTo] = useState('');
  const [updating, setUpdating] = useState(false);
  const plan = useMemo(() => buildReadingPlan(preferences), [preferences.depth, preferences.focusQuery]);
  const summary = summarizeReadingPlan(plan, statusOf);
  const planIds = plan.map(item => item.id);
  const planIdSet = new Set(planIds);
  const label = readingDepthName(preferences);
  const next = summary.next;
  const unlocked = editorialExtras.filter((extra: any) => {
    if (extraState(extra).className !== 'go') return false;
    if (preferences.depth === 'complete') return true;
    if (preferences.depth === 'essential') return String(extra.weight).startsWith('●');
    return (extra.itemIds || []).some((id: number) => planIdSet.has(id));
  });
  const phase = next?.historicalNumber ? journeyPhases.find((entry: any) => Number(next.historicalNumber) >= entry.historicalStart && Number(next.historicalNumber) <= entry.historicalEnd) : null;
  const phaseItems = phase ? plan.filter(item => item.type === 'Principal' && Number(item.historicalNumber) >= phase.historicalStart && Number(item.historicalNumber) <= phase.historicalEnd) : [];
  const phasePercent = phase && phaseItems.length ? percent(phaseItems.filter(item => statusOf(item.id) === 'Sim').length, phaseItems.length) : 0;
  const milestone = next?.historicalNumber ? milestones.find((item: any) => item.historicalStart && item.historicalEnd >= Number(next.historicalNumber)) : null;
  const validUpTo = /^\d+$/.test(upTo.trim()) && Number(upTo) >= 1 && Number(upTo) <= 1000;
  const preview = validUpTo ? readThroughSelection(Number(upTo), readings, statusOf) : null;
  const submitReadThrough = async () => {
    if (!validUpTo || !preview?.pending.length || updating) return;
    setUpdating(true);
    try {
      const applied = await markUpTo(Number(upTo));
      if (applied > 0) setUpTo('');
    } catch {
      // Falhas de sincronização são relatadas pelo motor de sync; manter o formulário disponível.
    } finally {
      setUpdating(false);
    }
  };

  return <div class="reading-home">
    <header class="home-heading">
      <div>
        <div class="home-eyebrow">SPIDER·GUIA / HOJE</div>
        <h2>Seu espaço de leitura</h2>
        <p class="mu sm">Continue de onde parou ou registre o que já leu.</p>
        <button type="button" class="home-plan-link" onClick={event => router.navigate('#configuracoes', event.currentTarget)}>Plano: <strong>{label}</strong> · Alterar nas Configurações <span aria-hidden="true">→</span></button>
      </div>
      <div class="home-search-wrap">
        <label class="sr-only" for="home-search">Buscar edição, série ou arco</label>
        <input id="home-search" class="s home-search" data-shortcut-search aria-label="Buscar edição, série ou arco" placeholder="Buscar edição, série ou arco (Enter)" value={search} onInput={event => setSearch(event.currentTarget.value)} onKeyDown={event => { if (event.key === 'Enter' && search.trim()) router.navigate(`#checklist?q=${encodeURIComponent(search.trim())}`, event.currentTarget); }} />
      </div>
    </header>

    <div class="home-workspace">
      <div class="home-workspace-actions">
        <HomeNext plan={plan} next={next} skipped={summary.skipped} label={label} focusQuery={preferences.focusQuery} />
        <section class="home-upto" aria-labelledby="home-upto-title">
          <div class="home-eyebrow">Atualização em lote</div>
          <h3 id="home-upto-title">Já li até...</h3>
          <p class="mu sm">Leu várias HQs? Registre tudo de uma vez, usando a numeração histórica da série principal.</p>
          <form class="home-upto-form" onSubmit={event => { event.preventDefault(); void submitReadThrough(); }}>
            <label for="home-read-through">Última edição histórica lida</label>
            <div class="home-upto-fields">
              <div class="home-upto-number"><span aria-hidden="true">#</span><input id="home-read-through" type="number" min={1} max={1000} step={1} required inputMode="numeric" placeholder="Ex.: 350" value={upTo} disabled={updating} aria-describedby="home-read-through-preview home-read-through-help" onInput={event => setUpTo(event.currentTarget.value)} /></div>
              <button class="btn" type="submit" disabled={!preview?.pending.length || updating}>{updating ? 'Atualizando…' : 'Revisar e atualizar'} <span aria-hidden="true">→</span></button>
            </div>
          </form>
          <p class="home-upto-preview sm" id="home-read-through-preview" aria-live="polite">{preview
            ? preview.pending.length
              ? <><strong>{preview.pending.length} {preview.pending.length === 1 ? 'edição principal a marcar' : 'edições principais a marcar'}</strong>{preview.alreadyRead || preview.skipped ? ` · ${[preview.alreadyRead ? `${preview.alreadyRead} já ${preview.alreadyRead === 1 ? 'lida' : 'lidas'}` : '', preview.skipped ? `${preview.skipped} ${preview.skipped === 1 ? 'pulada preservada' : 'puladas preservadas'}` : ''].filter(Boolean).join(' · ')}` : ''}</>
              : 'Nenhuma edição pendente até este número.'
            : 'Digite um número de 1 a 1000 para ver a prévia.'}</p>
          <p class="home-upto-help mu" id="home-read-through-help">Confira a seleção e confirme antes de salvar. Extras e leituras puladas não serão alterados. A atualização pode ser desfeita.</p>
        </section>
      </div>
      <div class="home-workspace-progress">
        <HomeProgress summary={summary} label={label} />
        <EngagementCard />
      </div>
    </div>

    {(phase || milestone || unlocked.length > 0) ? <section class="home-journey" aria-labelledby="home-journey-heading">
      <div class="home-section-head">
        <div>
          <div class="home-eyebrow">O que vem pela frente</div>
          <h2 id="home-journey-heading">Na sua jornada</h2>
        </div>
        <button class="home-text-action" onClick={event => router.navigate('#explorar/jornada', event.currentTarget)}>Ver jornada completa <span aria-hidden="true">→</span></button>
      </div>
      <div class="home-journey-rows">
        {phase ? <div class="home-journey-row">
          <div class="home-journey-label">Fase atual <span>#{phase.historicalStart}–#{phase.historicalEnd}</span></div>
          <div class="home-journey-content">
            <h3>{phase.name}</h3>
            <p class="mu sm">{phase.creators}</p>
            <div class="home-phase-progress"><ProgressBarVisual value={phasePercent} label={`Progresso na fase ${phase.name}`} /><span class="mu sm">{phasePercent}% nesta fase</span></div>
          </div>
        </div> : null}
        {milestone ? <div class="home-journey-row">
          <div class="home-journey-label">Próximo marco <span>{milestone.year}</span></div>
          <div class="home-journey-content">
            <h3><SpoilerText text={milestone.title} /></h3>
            <p class="mu sm"><SpoilerText text={milestone.description} /></p>
            <p class="home-milestone-location sm"><Icon name="book" /> {milestone.whereToRead} <span class={`tag ${String(milestone.weight).startsWith('●') ? 'e' : ''}`}>{milestone.weight}</span></p>
          </div>
        </div> : null}
        {unlocked.length > 0 ? <div class="home-journey-row home-journey-row-extras">
          <div class="home-journey-label">Leituras extras</div>
          <div class="home-journey-content">
            <details class="home-extras" >
              <summary><span><b>{unlocked.length} {unlocked.length === 1 ? 'extra disponível' : 'extras disponíveis'}</b><small class="mu">Conteúdos liberados no seu ponto da leitura</small></span><Icon name="chevD" /></summary>
              <div class="home-extras-body">
                {unlocked.slice(0, 3).map((extra: any) => <div class="home-extra-line" key={extra.name}><strong>{extra.name}</strong><span class="mu sm">{extra.after ? `Depois da #${extra.after}` : 'Antes da #1'} · {extra.weight}</span></div>)}
                <button class="home-text-action" onClick={event => router.toTab('Ler', event.currentTarget, { readingMode: 'ext', extraFilter: preferences.depth === 'complete' ? 'go' : 'rec' })}>Ver todas as extras <span aria-hidden="true">→</span></button>
              </div>
            </details>
          </div>
        </div> : null}
      </div>
    </section> : null}
    <HomeSyncStatus />
  </div>;
}
