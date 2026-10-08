import './styles.css';
import './design-system.css';
import { render } from 'preact';
import { App } from './views/App';
import { initializeRuntime } from './runtime/controller';
import { designPreferences } from './design/preferences';

const root = document.querySelector<HTMLElement>('#root');
if (!root) throw new Error('Elemento #root não encontrado.');

designPreferences.initialize();
initializeRuntime();
render(<App />, root);

// O link de acesso rápido aponta para #app no HTML estático, mas os hashes do
// SPIDER·GUIA são rotas. Focar o conteúdo sem alterar location.hash evita
// perder a tela atual ou criar uma entrada indevida no histórico.
document.querySelector<HTMLAnchorElement>('.skip-link')?.addEventListener('click', event => {
  event.preventDefault();
  const main = document.getElementById('app');
  main?.focus({ preventScroll: true });
  main?.scrollIntoView({ block: 'start', behavior: 'auto' });
});
