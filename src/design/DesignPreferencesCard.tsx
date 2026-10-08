import { useDesignPreferences } from './hooks';
import { designPreferences, type FontScale, type ThemePreference } from './preferences';

const THEME_OPTIONS: Array<[ThemePreference, string, string]> = [
  ['auto', 'Automático', 'Segue o tema claro/escuro do aparelho.'],
  ['dark', 'Escuro', 'Mantém o tema escuro do SPIDER·GUIA.'],
  ['light', 'Claro', 'Usa superfícies claras com contraste AA.']
];

const SCALE_OPTIONS: Array<[FontScale, string, string]> = [
  ['compact', 'Compacta', '90% da escala padrão.'],
  ['default', 'Padrão', 'Equilíbrio entre densidade e leitura.'],
  ['large', 'Grande', '112,5% da escala padrão.']
];

export function DesignPreferencesCard() {
  const preferences = useDesignPreferences();
  return (
    <section class="card design-preferences-card">
      <h3>Personalizar a interface</h3>
      <p class="sm mu">Tema, tamanho de texto e um modo de leitura que mostra uma edição por vez.</p>

      <fieldset class="design-choice-group">
        <legend>Tema</legend>
        {THEME_OPTIONS.map(([value, label, description]) => (
          <label key={value}>
            <input type="radio" name="design-theme" checked={preferences.theme === value} onChange={() => designPreferences.set({ theme: value })} />
            <span><b>{label}</b><small>{description}</small></span>
          </label>
        ))}
      </fieldset>

      <fieldset class="design-choice-group">
        <legend>Escala de fonte</legend>
        {SCALE_OPTIONS.map(([value, label, description]) => (
          <label key={value}>
            <input type="radio" name="design-font-scale" checked={preferences.fontScale === value} onChange={() => designPreferences.set({ fontScale: value })} />
            <span><b>{label}</b><small>{description}</small></span>
          </label>
        ))}
      </fieldset>

      <label class="focus-mode-toggle">
        <input type="checkbox" checked={preferences.focusMode} onChange={event => designPreferences.set({ focusMode: event.currentTarget.checked })} />
        <span><b>Modo foco · uma edição por vez</b><small>Na Checklist, esconde a lista longa e mostra apenas a leitura atual com anterior/próxima.</small></span>
      </label>
    </section>
  );
}
