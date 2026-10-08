# Auditoria UX — Etapa 1: arquitetura da informação e navegação

Base: `spider-guia-reset-remoto-etapa4(3).zip`. Esta entrega implementa **somente a Etapa 1** dos prompts de auditoria; os ajustes visuais/funcionais posteriores permanecem nas Etapas 2–7.

## Mapa de navegação

| Destino principal | Conteúdo |
| --- | --- |
| Hoje `#hoje` | Próxima HQ, registro “Já li até…”, progresso/ritmo e contexto editorial já existentes |
| Checklist `#checklist` | Checklist por fase/arco, busca, filtros, progresso e links diretos `#checklist/hq/:id` |
| Explorar `#explorar/jornada` | Jornada, Extras (`#explorar/extras`), Saga do Clone (`#explorar/clone`) e Links (`#explorar/links`, quando habilitados) |
| Ajuda `#ajuda` | Como usar, legenda de pesos, atalhos; Glossário (`#ajuda/glossario`), Fontes por website (`#ajuda/fontes`) e Metodologia (`#ajuda/metodologia`) |
| Configurações `#configuracoes` | Plano, spoilers, aparência, configuração guiada, conta/sync, backup e reset |

O botão mobile de Configurações usa a legenda visual “Config.”; seu nome acessível permanece “Configurações”. Na lateral desktop o rótulo aparece completo. As cinco opções nunca são ocultadas em um menu. O controle Modo Foco ainda pertence a preferências; movê-lo para a Checklist faz parte da **Etapa 3**, não desta entrega.

## Rotas antigas → novas

| Antiga | Canônica |
| --- | --- |
| `#inicio` | `#hoje` |
| `#ler`, `#ler/checklist` | `#checklist` |
| `#ler/extras` | `#explorar/extras` |
| `#ler/clone` | `#explorar/clone` |
| `#jornada`, `#explorar` | `#explorar/jornada` |
| `#links` | `#explorar/links` (ou Jornada quando Links estão desativados) |
| `#mais`, `#mais/guia`, `#conta`, `#conta/ajuda`, `#conta/configuracoes` | `#configuracoes` |
| `#mais/ajuda`, `#ajuda/guia`, `#ajuda/como-usar` | `#ajuda` |
| `#mais/glossario`, `#conta/glossario` | `#ajuda/glossario` |
| `#mais/fontes`, `#conta/fontes` | `#ajuda/fontes` |
| `#mais/metodologia`, `#conta/metodologia` | `#ajuda/metodologia` |
| `#hq/:id` | `#checklist/hq/:id` |

**Por que `#conta/ajuda` vira Configurações?** Antes da migração, essa rota de fato exibia plano, sincronização, backup e reset. Preservar o significado é mais seguro do que deduzir o destino pelo nome do hash. As Fontes/Glossário/Metodologia antigos mudam para Ajuda.

O roteador usa `history.replaceState` somente para a normalização/atualização de filtros (sem nova entrada artificial no histórico); navegações explícitas continuam criando entradas no histórico de hash. `f` e `q` da Checklist são mantidos, parâmetros extras de URL são preservados em aliases, e links para HQs mantêm ID e parâmetros. O foco do teclado é transferido para o conteúdo principal quando há navegação acionada por botão e mudança de tela. A posição rola ao topo como no fluxo anterior; deep links de HQ continuam a ser resolvidos pelo controlador.

## Arquivos alterados

- `src/router/router.ts` — rotas, aliases e manutenção dos parâmetros.
- `src/views/App.tsx` — cinco destinos e lazy-loading separado para Ajuda/Configurações.
- `src/views/MoreView.tsx`, `src/views/HelpView.tsx` (novo) — separação dos conteúdos existentes.
- `src/runtime/controller.ts`, `src/state/app-state.ts`, `src/state/types.ts`, `src/reset/local-reset.ts` — seção ativa da Ajuda e resets de estado transitório.
- `src/views/HomeView.tsx`, `src/views/LinksView.tsx` — destinos e microtexto de navegação.
- `src/components/Icon.tsx`, `src/styles.css` — ícone de Configurações, barra mobile em cinco colunas e subnavegação responsiva.
- `tests/unit/router.test.ts`, `tests/e2e/spider-guia.spec.ts`, `scripts/check-navigation-stage1.mjs` (novo) — verificações e casos de regressão.
- `scripts/check-stage5-private.mjs`, `scripts/check-reading-preferences.mjs`, `package.json`, este documento e `LEIA-ME.md` — compatibilidade das verificações estáticas e instruções.

Não houve edição de dados/URLs curados, fontes editoriais, SQL, autenticação, estados de progresso ou protocolo de reset remoto. **Reset remoto segue bloqueado até homologação SQL/RLS real.**

## Validação e pendências

Executar `npm run stage1:check` para a verificação isolada de rotas, aliases, cinco destinos e separação dos conteúdos; `npm run b:router:check` é a verificação de contrato anterior. Executar também `npm run e:check`, `npm run build`, `npm run test:e2e`, `npm run reset:smoke`, `npm run reset:local-smoke` após `npm install`.

No ambiente de montagem deste ZIP, `npm install` falhou por DNS (`EAI_AGAIN` ao consultar `registry.npmjs.org`). Assim, build/Vitest/Playwright e homologação visual em browser com o app real **não foram executados**. O status dos scripts efetivamente executados deve ser informado separadamente, não presumido. Os breakpoints 320/360/390/768/1024/1440, tema claro/escuro, foco, escala grande e links de reset precisam ser homologados em navegador com dependências instaladas antes da publicação.

### Resultados observados nesta entrega

- `npm run stage1:check`: **14/14 verificações passaram** (cinco destinos, rotas canônicas, aliases, parâmetros, HQs, Links desativados, Ajuda separada e navegação mobile estática).
- `node scripts/check-router-contract.mjs`: **aprovado**.
- `node scripts/check-id-snapshot.mjs`: **1.301 IDs preservados**.
- `node scripts/check-catalog-snapshot.mjs`: **46 arquivos do catálogo íntegros**.
- `node scripts/check-reading-preferences.mjs`, `node scripts/check-stage5-private.mjs`, `node scripts/check-progress-interactions.mjs`, `node scripts/check-design-system.mjs`, `node scripts/check-extra-confirmation.mjs`, `node scripts/check-runtime-data.mjs` e testes estáticos B/C/D: **aprovados**.
- `node scripts/smoke-local-reset-stage4.mjs`: **aprovado**, incluindo prevenção de exclusão quando há falha de logout e bloqueio da nuvem.
- `node scripts/smoke-reset-stage4.mjs`: **aprovado**, incluindo isolamento por geração, retomada idempotente e flag remota desativada.
- Parse sintático de 13 arquivos TS/TSX alterados/testados: **sem erros de sintaxe**.
- `npm install`: **falhou (DNS EAI_AGAIN)**. `npm run e:check` completo, `npm run build`, Vitest, Playwright, tipagem integral e inspeção visual do aplicativo não puderam ser validados neste ambiente. Não confundir verificações estáticas com testes de interface reais.
