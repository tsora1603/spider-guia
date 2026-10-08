import { useEffect, useRef, useState } from 'preact/hooks';
import { principalReadings } from '../data/model';
import { statusOf } from '../state/progress-store';
import { spoilerPreferences } from '../spoilers/preferences';
import type { SpoilerVisibility } from '../spoilers/model';
import { applyReadThrough } from '../runtime/controller';
import { readingPreferences, type ReadingDepth } from '../preferences/reading-preferences';
import { currentResetEpoch } from '../reset/reset-guard';

function inferredReadThrough() {
  let last = 0;
  for (const item of principalReadings) {
    const number = Number(item.historicalNumber);
    if (!number) continue;
    if (statusOf(item.id) === 'Não') break;
    last = number;
  }
  return last;
}

const depthOptions: Array<{ value: ReadingDepth; title: string; copy: string }> = [
  { value: 'complete', title: 'Completo', copy: 'Tudo na ordem do guia, incluindo contexto e opcionais.' },
  { value: 'essential', title: 'Essenciais', copy: 'Só as leituras classificadas como essenciais.' },
  { value: 'focus', title: 'Só o que importa para um arco ou filme', copy: 'Cria um plano enxuto a partir de um foco e remove leituras opcionais.' }
];

const spoilerOptions: Array<{ value: SpoilerVisibility; title: string; copy: string }> = [
  { value: 'nenhum', title: 'Nenhum', copy: 'Oculta spoilers leves e fortes.' },
  { value: 'leve', title: 'Leve', copy: 'Mostra contexto leve e mantém revelações fortes ocultas.' },
  { value: 'tudo', title: 'Tudo', copy: 'Mostra todo o conteúdo editorial.' }
];

export function Onboarding() {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const current = readingPreferences.get();
  const [step, setStep] = useState(1);
  const [depth, setDepth] = useState<ReadingDepth>(current.depth);
  const [focusQuery, setFocusQuery] = useState(current.focusQuery);
  const [spoilerLevel, setSpoilerLevel] = useState<SpoilerVisibility>(spoilerPreferences.get());
  const [readThrough, setReadThrough] = useState(() => current.readThrough || inferredReadThrough());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const canContinue = step !== 1 || depth !== 'focus' || focusQuery.trim().length >= 2;
  const finish = async () => {
    const epoch = currentResetEpoch();
    setSaving(true);
    const normalizedReadThrough = Math.max(0, Math.min(1000, Number(readThrough) || 0));
    if (normalizedReadThrough > 0) await applyReadThrough(normalizedReadThrough, { confirm: false, silentToast: true });
    if (epoch !== currentResetEpoch()) return;
    spoilerPreferences.set(spoilerLevel);
    readingPreferences.set({ onboardingComplete: true, depth, focusQuery, readThrough: normalizedReadThrough });
    dialogRef.current?.close();
    setSaving(false);
  };

  return <dialog ref={dialogRef} class="onboarding-dialog" aria-labelledby="onboarding-title" onCancel={event => event.preventDefault()}>
    <div class="onboarding-shell">
      <div class="onboarding-progress" aria-label={`Passo ${step} de 3`}><span class={step >= 1 ? 'on' : ''} /><span class={step >= 2 ? 'on' : ''} /><span class={step >= 3 ? 'on' : ''} /></div>
      <div class="onboarding-kicker">Configuração inicial · {step}/3</div>
      {step === 1 ? <section>
        <h2 id="onboarding-title">Como você quer ler?</h2>
        <p class="mu">Isso define o seu plano na tela Hoje e a próxima leitura recomendada. Você pode mudar depois em Configurações.</p>
        <div class="choice-stack" role="radiogroup" aria-label="Profundidade de leitura">
          {depthOptions.map(option => <label class={`choice-card ${depth === option.value ? 'selected' : ''}`} key={option.value}><input type="radio" name="reading-depth" value={option.value} checked={depth === option.value} onChange={() => setDepth(option.value)} /><span><b>{option.title}</b><small>{option.copy}</small></span></label>)}
        </div>
        {depth === 'focus' ? <div class="focus-field"><label for="onboarding-focus"><b>Qual é o foco?</b></label><input id="onboarding-focus" type="search" value={focusQuery} onInput={event => setFocusQuery(event.currentTarget.value)} placeholder="Ex.: Venom, Kraven, Saga do Clone" /><p class="mu sm">O foco cruza o termo com o catálogo, fases, marcos e Extras. Se o nome do filme não estiver nos dados, use um personagem, vilão ou arco associado.</p></div> : null}
      </section> : null}
      {step === 2 ? <section>
        <h2 id="onboarding-title">Quanto spoiler pode aparecer?</h2>
        <p class="mu">O nível vale para textos editoriais em todo o guia.</p>
        <div class="choice-stack" role="radiogroup" aria-label="Nível de spoilers">
          {spoilerOptions.map(option => <label class={`choice-card ${spoilerLevel === option.value ? 'selected' : ''}`} key={option.value}><input type="radio" name="spoiler-level-onboarding" value={option.value} checked={spoilerLevel === option.value} onChange={() => setSpoilerLevel(option.value)} /><span><b>{option.title}</b><small>{option.copy}</small></span></label>)}
        </div>
      </section> : null}
      {step === 3 ? <section>
        <h2 id="onboarding-title">Já leu até onde?</h2>
        <p class="mu">Use a numeração histórica da linha principal. Vamos marcar apenas edições da linha principal até esse ponto, sem alterar Extras, leituras puladas ou progresso existente.</p>
        <label class="read-through-field" for="onboarding-read-through"><span>Já li até a edição histórica</span><span class="read-through-input"><b>#</b><input id="onboarding-read-through" type="number" min="0" max="1000" inputMode="numeric" value={readThrough || ''} onInput={event => setReadThrough(Number(event.currentTarget.value) || 0)} placeholder="0" /></span></label>
        <button type="button" class="text-button" onClick={() => setReadThrough(0)}>Vou começar do início</button>
        {readThrough > 0 ? <p class="onboarding-preview" aria-live="polite">Ao concluir, o guia inicializa seu progresso até a <b>#{Math.min(1000, readThrough)}</b>.</p> : <p class="onboarding-preview mu">Nenhuma edição será marcada automaticamente.</p>}
      </section> : null}
      <div class="onboarding-actions">
        {step > 1 ? <button type="button" class="btn g" onClick={() => setStep(value => value - 1)} disabled={saving}>Voltar</button> : <span />}
        {step < 3 ? <button type="button" class="btn" onClick={() => setStep(value => value + 1)} disabled={!canContinue}>Continuar</button> : <button type="button" class="btn" onClick={() => void finish()} disabled={saving}>{saving ? 'Salvando…' : 'Salvar e começar'}</button>}
      </div>
    </div>
  </dialog>;
}
