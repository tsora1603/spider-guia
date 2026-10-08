import { useEffect, useState } from 'preact/hooks';
import { useProgressRevision } from '../ui/hooks';
import { engagementPreferences } from './preferences';
import { weeklyReadCount } from './insights';
import { ProgressBarVisual } from '../design/ProgressVisuals';

/** Ritmo integrado à Home: sem caixa própria nem indicadores repetidos. */
export function EngagementCard() {
  useProgressRevision();
  const [, setPreferencesRevision] = useState(0);
  useEffect(() => engagementPreferences.subscribe(() => setPreferencesRevision(value => value + 1)), []);
  const goal = engagementPreferences.getWeeklyGoal();
  const weekly = weeklyReadCount();
  const weeklyPercent = Math.min(100, Math.round((weekly / goal) * 100));

  return <section class="home-rhythm engagement-card" aria-labelledby="personal-rhythm-title">
    <div class="home-rhythm-head">
      <div>
        <div class="home-eyebrow">Ritmo pessoal</div>
        <h3 id="personal-rhythm-title">Meta semanal</h3>
      </div>
      <label class="home-goal-field"><span>Meta</span><input type="number" min="1" max="50" inputMode="numeric" value={goal} aria-label="Meta semanal de leituras" onChange={event => engagementPreferences.setWeeklyGoal(Number(event.currentTarget.value))} /></label>
    </div>
    <p class="home-weekly-amount"><strong>{weekly}</strong><span> de {goal} leituras nesta semana</span></p>
    <ProgressBarVisual value={weeklyPercent} label={`Meta semanal: ${weekly} de ${goal}`} />
    <p class="home-rhythm-note mu sm">{weekly >= goal ? 'Meta desta semana alcançada.' : `Faltam ${goal - weekly} leituras para a meta da semana.`}</p>
    <p class="home-rhythm-private mu">A meta é só um marcador pessoal deste navegador. Não existe ranking, perfil público, sequência diária ou compartilhamento.</p>
  </section>;
}
