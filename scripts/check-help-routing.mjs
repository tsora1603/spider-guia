import assert from 'node:assert/strict';
import { helpQueryParams, withHelpSearch, helpTargetIndex } from '../src/views/help-routing.ts';

const checks = [];
function check(name, callback) { callback(); checks.push(name); }
check('pesquisa retorna rota original preservando parâmetros desconhecidos', () => {
  const updated = withHelpSearch('#ajuda/fontes?origem=antigo&fonte=5', 'Wikipédia');
  assert.equal(updated, '#ajuda/fontes?origem=antigo&q=Wikip%C3%A9dia');
  assert.equal(helpQueryParams(updated).get('q'), 'Wikipédia');
});
check('limpar pesquisa remove alvo antigo sem perder parâmetros externos', () => {
  assert.equal(withHelpSearch('#ajuda/glossario?origem=antigo&q=Venom&termo=12', ''), '#ajuda/glossario?origem=antigo');
});
check('pesquisa não empilha filtros de origem', () => {
  const updated = withHelpSearch('#ajuda/fontes?q=algo&fonte=0&src=interno', 'Outro');
  assert.equal(updated, '#ajuda/fontes?q=Outro&src=interno');
});
check('índice zero é um alvo válido', () => {
  assert.equal(helpTargetIndex(helpQueryParams('#ajuda/fontes?fonte=0'), 'fonte', 3), 0);
});
check('alvos ausentes, negativos, não numéricos e fora da coleção são ignorados', () => {
  for (const source of ['#ajuda/fontes', '#ajuda/fontes?fonte=-1', '#ajuda/fontes?fonte=2.5', '#ajuda/fontes?fonte=%5B%5D', '#ajuda/fontes?fonte=99', '#ajuda/fontes?fonte=99999999999999999999999']) {
    assert.equal(helpTargetIndex(helpQueryParams(source), 'fonte', 3), null, source);
  }
});
console.log(JSON.stringify({ ok: true, count: checks.length, checks }, null, 2));
