# SPIDER·GUIA — Etapa 5: Explorar, navegação contextual e busca

Base: ZIP aprovado `spider-guia-etapa4-home-jornada.zip`. Esta entrega contém **somente a Etapa 5** da auditoria UX/UI.

## Mudanças implementadas

- Busca global de Explorar reúne resultados agrupados de **Checklist, Jornada, Extras, Saga do Clone e, somente se habilitados, Links editoriais**. Limites de resultados por grupo evitam sobrecarregar o celular. A busca de Links inclui o nome do grupo, edições relacionadas, contexto, edição brasileira e rótulos/destinos curados (sem duplicar o grupo).
- Edições da Checklist e da Saga do Clone continuam usando `#checklist/hq/:id`. Resultado de Jornada abre **o marco exato** com `#explorar/jornada?marco=<chave>`; Extras abrem a entrada exata com `#explorar/extras?extra=<chave>`; Links abrem o grupo exato com `#explorar/links?link=<id>`. A ficha editorial especial da Saga do Clone segue para `#explorar/clone`.
- Chaves de marco são derivadas de ano+título; chaves de Extras preferem IDs imutáveis do catálogo e os grupos de Links reutilizam seu `id` original. A posição original ainda é aceita para `marco` e `extra` como compatibilidade de navegação.
- Fase de Jornada é expandida para revelar o marco; Extras ajustam o filtro para **Todas** ao receber um link direto; grupo de Links é aberto. Em todos os casos, o destino recebe contorno discreto, scroll e foco acessível. A navegação do navegador restaura a pesquisa anterior.
- Busca global usa `q` na hash via `history.replaceState` (sem criar uma entrada no histórico por tecla), e a busca local de Links usa `lq`, inclusive após reload. Filtros/URLs antigos mantidos, sem adicionar a seção “Onde procurar”.
- Jornada ganhou atalhos para **a primeira edição explicitamente identificada** de cada fase ou marco que tem numeração histórica fornecida. Marcos sem número histórico explícito não recebem mapeamentos criados por inferência. Progresso compartilhado, peso, disponibilidade editorial e confirmação dos Extras foram mantidos.
- Todos os links editoriais existentes continuam usando as URLs originais (`public/links.js` não foi modificado). Fontes documentais continuam exclusivamente em Ajuda.

## Arquivos alterados

- `src/views/ExploreView.tsx`: resultados diretos e restauração da busca.
- `src/views/JourneyView.tsx`: âncoras de marcos, expansão e atalhos verificados.
- `src/views/ReadingView.tsx`: chegada contextual em Extras sob filtros.
- `src/views/LinksView.tsx`: abertura direta, busca local com URL e inclusão na busca global.
- `src/views/explore-navigation.ts` (novo): chaves estáveis, parâmetros e foco.
- `src/components/Editorial.tsx`: âncora/opção de expansão do Extra escolhido.
- `src/runtime/controller.ts`: evita voltar ao topo antes de focar o alvo direto.
- `src/styles.css`: realce/CTA compatíveis com os tokens existentes.
- `tests/e2e/spider-guia.spec.ts`: cenários de busca, links, retorno, reload e 320 px.
- `scripts/check-ux-stage5.mjs` e `scripts/check-explore-targets.mjs` (novos) e `package.json`: verificações locais da Etapa 5.

## Verificações executadas

- `npm run ux:stage5:check`: **aprovado** (9 verificações de contratos de UI + 14 verificações de navegação/URL/chaves). Verificados 30 marcos e 108 Extras com identificadores sem colisões.
- `node scripts/check-navigation-stage1.mjs`, `node scripts/check-ui-stage2.mjs`, `node scripts/check-ux-stage3.mjs`, `node --experimental-strip-types scripts/check-ux-stage4.mjs`, `node scripts/check-stage5-private.mjs`, `node scripts/check-catalog-snapshot.mjs`: **aprovados**.
- `node scripts/smoke-reset-stage4.mjs` e `node scripts/smoke-local-reset-stage4.mjs`: **aprovados** (testes locais; não homologam Supabase real).
- Comparação byte a byte entre base Etapa 4 e entrega: **142 arquivos protegidos intactos**, incluindo catálogo, estado/progresso, Supabase, SQL, reset, fontes e `public/links.js`. Catálogo com 1.301 leituras e 46 chunks preservado.
- Sintaxe TypeScript/TSX inspecionada pelo compilador TypeScript global, sem diagnósticos sintáticos.

## Pendências de homologação

- `npm run build` não concluiu: `data/schema.mjs` não encontrou a dependência `zod` (pacotes npm não estão instalados no ambiente). Typecheck completo, Vitest e Playwright **não foram executados**.
- Os novos cenários E2E foram **escritos, mas não executados**. Validar manualmente em 320/360/390/768/1024/1440 px, com navegação por teclado, light/dark, tipos maiores, URL direta, clique/Voltar/reload e busca de Links habilitada/desabilitada.
- Não houve autenticação em Supabase real nem validação remota de RLS ou protocolo de reset; não houve mudanças nessas áreas.

**Encerramento:** Etapa 6 (Ajuda e Configurações) não foi iniciada.
