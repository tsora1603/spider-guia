# SPIDER·GUIA — Auditoria UX/UI · Etapa 2

**Base:** resultado da Etapa 1 (`spider-guia-etapa1-navegacao-5-destinos.zip`).
**Objetivo:** sistema visual e componentes de listas. Não iniciar os fluxos da Etapa 3 (Modo Foco na toolbar e botão Pular sempre visível), que exigem uma implementação separada.

## Mudanças aplicadas

1. **Menu de filtros compartilhado** (`src/components/FilterDropdown.tsx`) — substitui `details` com opções que ficavam abertas após selecionar. Um botão controla `aria-expanded` e um grupo de botões com `aria-pressed` oferece seleção, fechamento imediato, restauração de foco, Escape, clique externo, Tab, setas, Home e End. Menu reposiciona para cima quando não há espaço inferior e tem rolagem própria em viewport pequena. Integrado à Checklist e a Extras; os valores existentes persistem nos mesmos estados (e, na Checklist, na mesma URL).
2. **Busca padronizada** (`src/components/ListSearch.tsx`) — aplica a mesma tipografia, área de toque, rótulo acessível e estilo a Checklist, Explorar, Links, Glossário e Fontes. O campo usa `type="search"` e `data-shortcut-search`, preservando o atalho `/`. Testes Playwright que verificam Checklist passam a usar a semântica `searchbox` em vez de `textbox`.
3. **Listas com uma única superfície** (`ui-list`, `ui-list-item`, `ui-disclosure-summary`, `ui-list-count` e `ui-toolbar`) — borda, raio e elevação no contêiner, separadores entre entradas, largura e quebra de texto, alvos acessíveis e feedback coerente. Checklist continua sendo a referência de densidade. Jornada, Extras, Clone, Links e Fontes compartilham a hierarquia, sem alterar o conteúdo específico de cada uma.
4. **Sem quadrados internos mais escuros** — Jornada não usa mais o retângulo/sombra nos detalhes da fase e seus marcos são sublinhas; Links não usa mais gradiente de card nem painel interno; Fontes não usam sub-listas com borda e background aninhados; Clone mantém divisórias de arcos discretas. Glossário e Metodologia preservam cartões onde a semântica exige.
5. **CSS consolidado na origem** — regras das superfícies internas, menus antigos e estilos de links e fontes foram substituídas em `src/styles.css`; tokens `--surface-expanded`/`--surface-nested` ficam com a cor do contêiner nos dois temas para compatibilidade, sem escurecer novamente os disclosures. Foi corrigido o `background` abreviado em `input.s`, que apagava o ícone de pesquisa em cascata. `src/design-system.css` continua definindo temas, tokens e `focus-visible` globais.

## Decisões de escopo

- Ações de progresso continuam *fora* do resumo expansível; nenhuma solicitação de marcar, pular, sincronizar ou resetar foi alterada.
- O arranjo do botão **Pular no extremo direito e sempre visível**, assim como destaque do **Modo Foco** na Checklist, permanece reservado à Etapa 3 do plano. Não mover ações destrutivas enquanto a Etapa 2 organiza somente UI.
- As URLs são extraídas das mesmas fontes, e os `href` seguem usando `entry.url`. Nenhum link curado é reescrito, reordenado ou inventado.
- O verificador legado `check-stage5-private.mjs` foi atualizado para permitir alterações legítimas de UI em Links, mantendo a verificação de integridade de `public/links.js` e dos caminhos de destino no componente. Os dados não sofreram modificação.

## Arquivos alterados

**Componentes novos:** `src/components/FilterDropdown.tsx`, `src/components/ListSearch.tsx`.

**Alterados:** `src/styles.css`, `src/design-system.css`, `src/components/VirtualizedChecklist.tsx`, `src/components/Editorial.tsx`, `src/views/ReadingView.tsx`, `src/views/JourneyView.tsx`, `src/views/LinksView.tsx`, `src/views/HelpView.tsx`, `src/views/ExploreView.tsx`, `scripts/check-stage5-private.mjs`, `tests/e2e/spider-guia.spec.ts`, `docs/DESIGN-SYSTEM.md`, `package.json`.

**Verificação:** `scripts/check-ui-stage2.mjs` + `docs/ETAPA2-PRESERVACAO.json`. O manifesto registra SHA-256 de **68 arquivos protegidos** (`src/data`, `src/reset`, `src/sync`, `src/state`, `supabase`, `data.js`, `public/links.js`, `setup.sql`). Verificação disponível com `npm run stage2:check` (sem precisar de pacotes externos).

## Validação e limitações

- `npm run stage2:check`: passou.
- `npm run b:router:check` e `npm run stage3:check`: passaram.
- `npm run stage1:check`, `npm run stage4:check`, `npm run stage5:check`, `npm run reset:smoke`, `npm run reset:local-smoke`: passaram.
- TypeScript sintático: todas as fontes `.ts` e `.tsx` (exceto `.d.ts`) foram transpiladas individualmente, sem erro de sintaxe. CSS analisado com PostCSS: parse válido.
- `npm install` falhou por `EAI_AGAIN` na consulta ao registry. Assim, `npm run typecheck`, `npm run build`, `npm run e:check` completo, `npm run data:check` (depende de `zod`) e Playwright **não estão homologados**. Testes E2E da Etapa 2 foram **adicionados**, mas não executados. Não foi realizada inspeção visual real em 320/360/390/768/1024/1440 px, escala grande ou temas.
- Reset remoto depende de validação real no Supabase e continua bloqueado; nenhum SQL, flag ou protocolo foi alterado.

**Próxima etapa, somente após aprovação:** Etapa 3 — Checklist e fluxo de progresso.
