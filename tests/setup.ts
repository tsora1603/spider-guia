import { loadEditorialDetails } from '../src/data/model';

// Testes de domínio usam o conjunto editorial completo; carregamento sob demanda é coberto no navegador.
await loadEditorialDetails('all');
