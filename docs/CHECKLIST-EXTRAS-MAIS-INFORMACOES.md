# SPIDER·GUIA — Extras: detalhes em Explorar, leitura na Checklist

## Objetivo

Na Checklist (inclusive Modo Foco), as edições do tipo **Leitura fora da linha** com ficha editorial em Explorar deixam de repetir a edição brasileira, instruções de encaixe, justificativas, quantidade, status de confirmação e observações. No detalhe expansível aparece somente um link de aparência de botão, **Mais informações**, em verde, levando ao item exato da seção **Explorar → Extras**.

As fichas completas, notas com spoilers, fontes, critérios 60/40 e associações editoriais continuam disponíveis em Explorar. O layout da linha continua com marcar à esquerda, título e peso no centro, pular à direita. Os estados Não/Sim/Pulei e a ordem de leitura não foram alterados.

## Destinos e exceções

- A associação utiliza exclusivamente `itemIds` das entradas editoriais existentes e a chave de URL `extraAnchorKey` já usada pela busca.
- O filtro de Extras muda automaticamente para **Todas** ao abrir o destino, e a ficha correspondente é expandida e focalizada (comportamento já existente no `ExtrasView`).
- Leituras extras sem ficha editorial vinculada continuam com seus detalhes originais; o código **não cria** links genéricos ou atribuições por suposição.
- As linhas mostradas **dentro de Explorar → Extras** continuam com seus detalhes, para não gerar links repetidos para a própria ficha. A Saga do Clone e as HQs da linha principal não foram modificadas.

## Arquivos

- `src/data/model.ts`: índice `extraEditorialByItemId` das relações explícitas.
- `src/components/IssueRow.tsx`: modo de detalhes enxutos para Extras apenas na Checklist.
- `src/design-system.css`: botão-link com tokens verdes do tema, foco acessível e altura de toque mínima.
- `tests/unit/extra-checklist-link.test.ts`: valida correspondência de IDs e links específicos, inclusive grupos com múltiplas HQs.
- `tests/e2e/extra-checklist-info-link.spec.ts`: valida a renderização e a navegação de ida/volta.

## Testes de publicação

Execute `npm install`, `npm run typecheck`, `npm run test:unit`, `npm run build` e `npm run test:e2e` em um ambiente com as dependências instaladas. A mudança não demanda SQL nem modificações no Supabase.
