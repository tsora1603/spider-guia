# Marco C — UI por componentes

## Objetivo

Substituir a renderização imperativa/global do Marco B por Preact, mantendo os contratos do A.1/B e tornando a atualização de progresso granular.

## Decisões

### Preact, não lit-html

Foi usado Preact porque o requisito inclui componentes com estado local persistente (`<details>`, grupos abertos, filtros), subscriptions por ID e reconciliação granular. Não foi adicionada biblioteca de estado nem biblioteca de virtualização.

### Sem `innerHTML` global

`src/views/app-view.ts` foi removido. `src/main.tsx` monta uma única raiz Preact. Nenhum arquivo TypeScript atribui `.innerHTML`.

Há um único `dangerouslySetInnerHTML` em `SpoilerText.tsx`. Ele encapsula exclusivamente o markup produzido pelo sistema legado `SpiderSpoilers`, que será eliminado no Marco D; textos passam antes pelo escape fornecido ao adaptador.

### Progresso granular

`progressStore` passou a oferecer:

- `subscribe(id, listener)`;
- `subscribeMany(ids, listener)`;
- `subscribeAll(listener)`;
- `batch(action)`;
- `notifyAll()`.

`IssueRow` usa `useProgressStatus(id)` e `memo`. Cabeçalhos de grupo assinam somente os IDs do próprio grupo. A barra lateral assina somente a linha principal.

O status de sync não dispara atualização do App: `uiStore` separa os canais `route`, `session` e `sync`.

### Preservação de UI

A Checklist mantém explicitamente:

- `checklistOpenGroups: Set<string>`;
- `checklistOpenItems: Set<number>`.

Esses sets vivem em `appState`, portanto sobrevivem à virtualização e à troca de abas. Dentro da árvore montada, Preact mantém os mesmos nós DOM por `key={item.id}`.

Não existe chamada de `scrollTo` ao alterar progresso. Scroll só é alterado por mudança de rota/deep-link.

## Checklist agrupada

Os grupos são derivados de `Reading.phase`. O catálogo atual produz 46 grupos e 1.301 itens; cada ID pertence exatamente a um grupo.

O grupo mostra:

- nome de fase/arco;
- quantidade de itens;
- lidas/total;
- percentual;
- barra de progresso.

Filtros históricos e busca continuam funcionando sobre os mesmos itens.

## Virtualização

A virtualização é por grupo:

1. grupos fechados recebem uma estimativa compacta;
2. grupos abertos recebem estimativa baseada no número de itens;
3. grupos montados são medidos por `ResizeObserver`;
4. `computeVirtualWindow()` calcula início/fim e spacers superior/inferior com 700 px de overscan;
5. somente grupos na janela são montados.

A escolha por grupo evita uma biblioteca extra e mantém a semântica colapsável. Como grupos fechados não montam suas HQs, a quantidade de nós DOM continua pequena mesmo com 1.301 itens no catálogo.

## Deep-link e virtualização

`#hq/<id>` continua sendo resolvido pelo router do Marco B. `VirtualizedChecklist` localiza o grupo do ID, o abre, calcula seu deslocamento virtual e usa uma pequena sequência de `requestAnimationFrame` para focar a HQ depois que ela for montada.

## Componentes principais

```text
src/
├── components/
│   ├── Editorial.tsx
│   ├── Icon.tsx
│   ├── IssueRow.tsx
│   ├── Progress.tsx
│   ├── SpoilerText.tsx
│   ├── VirtualizedChecklist.tsx
│   └── checklist-model.ts
├── runtime/
│   ├── controller.ts
│   └── spoilers.ts
├── ui/
│   ├── hooks.ts
│   └── ui-store.ts
└── views/
    ├── App.tsx
    ├── HomeView.tsx
    ├── JourneyView.tsx
    ├── LinksView.tsx
    ├── MoreView.tsx
    └── ReadingView.tsx
```

## Compatibilidade

O Marco C não altera o schema do progresso, IDs, `readingOrder`, catálogo, router público ou merge de sync.

O logout continua apenas encerrando a sessão/pausando sync; não existe limpeza do `progressStore`.
