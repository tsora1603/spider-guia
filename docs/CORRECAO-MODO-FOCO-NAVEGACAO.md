# Correção adicional — Modo Foco / Próxima

## Sintoma

Após a correção do botão "Lido" que carregava o estado verde da HQ anterior, **Próxima** podia voltar para Amazing Fantasy #15, apesar de o usuário já estar em outra leitura.

## Causa

`VirtualizedChecklist.tsx` atualizava a seleção do Modo Foco dentro de um único efeito dependente de `focusItems` **e** `focusedItemId` (destino original da URL). Toda atualização de progresso refazia o filtro e recriava `focusItems`; o efeito podia então sobrescrever a seleção local com o ID antigo da rota.

Além disso, quando um filtro de status removia a HQ atual, a seleção podia cair na primeira leitura da lista.

## Alteração

- Separados os efeitos: (1) manter ou recuperar a seleção quando a lista/filtro mudar; (2) aplicar um destino de URL **apenas quando ele mudar** ou o modo for ativado.
- Introduzido `focus-selection.ts`: mantém a edição atual quando ela segue visível; se for removida pelo filtro, busca a próxima leitura elegível na ordem do catálogo e usa a anterior como alternativa.
- Mantida a propriedade `key={item.id}` em `IssueRow`, garantindo que a leitura exibida tenha controles próprios e que o botão não herde a cor/status da anterior.
- Não foram alterados os mecanismos de escrita do progresso, sincronização, reset, catálogo nem URLs editoriais.

## Regressões

- `npm run focus:navigation:check`: passa com Node 22 e testa 1 → 2 → 3 → 2, perda de item por filtro, lista vazia e separação de gatilhos de rota/progresso.
- `tests/e2e/spider-guia.spec.ts`: novo teste começa em `#checklist/hq/1`, marca as HQs 1 e 2, usa Próxima várias vezes, volta com Anterior e verifica que os estados `Sim`/`Não` permanecem independentes.
- Verificações estáticas de IDs (1.301), catálogo (46 arquivos), UI Etapas 1–3/7, lógica de progresso e smoke tests de reset local/remoto passaram.
- Sintaxe dos arquivos TS/TSX alterados validada via compilador TypeScript global.

**Não homologado no navegador:** `node_modules` não está disponível neste ambiente; build completo e Playwright não foram executados.
