# SPIDER·GUIA — Etapa 7: qualidade final, acessibilidade e regressões

**Base:** ZIP aprovado da Etapa 6, `spider-guia-etapa6-ajuda-configuracoes.zip`.

**Resultado:** entrega final da auditoria UX/UI em sete etapas. Mudanças limitadas à interface, navegação acessível, CSS, testes e documentação; catálogo, links, progresso, sincronização, segurança e backend permanecem intactos. **Esta auditoria não é uma homologação visual em navegador nem uma aprovação do reset remoto no Supabase.**

## Antes → depois

| Área | Antes | Após a Etapa 7 |
| --- | --- | --- |
| Responsividade | Uma folha de estilo antiga entrava em modo desktop a partir de 860 px, outra só a 900 px; na faixa 860–899 havia regras conflitantes, inclusive `height:100vh` do cabeçalho | Um único breakpoint desktop de **900 px**; menu inferior até 899 px e rail lateral a partir de 900 px; estilos duplicados do rail consolidados |
| Navegação por teclado | O atalho estático **Pular para o conteúdo** usava `#app`, que o roteador tratava como hash de rota e podia redirecionar para Hoje | O clique/Enter foca o `main` e rola até o conteúdo **sem alterar rota/histórico** |
| Foco e movimento | Alguns botões e campos tinham anéis de foco desiguais; parte das microanimações ainda permanecia ativa com `prefers-reduced-motion` | Anéis de foco para navegação/atalhos/resultado/ações, animação do carregamento desativada e transições restantes ajustadas sem `!important` |
| Diálogos | Diálogo genérico não tinha limite de altura nem rolagem vertical padronizada | `max-height: calc(100dvh - 24px)`, `overflow-y:auto` e contenção de rolagem; modais protegidos conservam controles e confirmações |
| Espaços reduzidos | Cabeçalho e indicador de sincronização podiam ficar apertados em telas de 320 px | Ajustes de quebra e largura do cabeçalho e preservação do contorno de foco do menu inferior |
| Sincronização | Cabeçalho podia mostrar **Salvo** mesmo em modo local sem login | **Neste dispositivo** em modo local; **Sincronizado** somente com conta ativa e estado salvo; bloqueios/erros/offline permanecem distintos |
| Testes / histórico | Regressões e snapshots distribuídos nas seis etapas anteriores | Testes E2E transversais de tamanhos, temas, escala grande, foco, filtro, diálogo, rotas legadas e sincronização local; snapshot SHA-256 de 135 arquivos críticos comparados à Etapa 6 |

## Preservações verificadas

- **1.301 IDs na mesma ordem** e **46 arquivos de chunk** do catálogo sem alteração.
- **135 arquivos protegidos iguais à Etapa 6, byte a byte**, com hashes SHA-256 em `docs/ETAPA7-BASELINE-INTEGRIDADE.json`.
- Comparação cobre `data/`, `src/data/`, `src/state/`, `src/sync/`, `src/reset/`, `src/progress/`, `src/router/`, `supabase/`, `src/runtime/controller.ts`, `public/links.js` e `setup.sql`.
- URLs editoriais já curadas, grupos de Fontes por website, dados e textos da planilha integrados mantidos. Nenhuma seção “Onde procurar” foi acrescentada.
- Os três estados de progresso **Não / Sim / Pulei**, Modo Foco, Extras, Saga do Clone, progresso global e confirmação para pular Essenciais continuam usando os mecanismos anteriores.
- Reset **somente dispositivo** continua padrão; operação de reset remoto permanece desabilitada até homologação administrativa de SQL/RLS/Supabase real. Nenhum arquivo de Supabase, SQL, reset, guard ou sincronização foi modificado; a conta não é excluída.

## Arquivos alterados ou adicionados

- `src/styles.css` — breakpoint consolidado, refinamento de foco, diálogo, cabeçalho estreito e movimento reduzido.
- `src/main.tsx` — correção de acessibilidade do skip link sem interferir na navegação hash.
- `src/views/App.tsx` — mensagem real do estado local/sincronizado.
- `tests/e2e/final-quality-stage7.spec.ts` — 16 cenários E2E novos (escritos, **não executados** neste ambiente).
- `scripts/check-quality-stage7.mjs` — validações da Etapa 7 e integridade SHA-256.
- `docs/ETAPA7-BASELINE-INTEGRIDADE.json` — snapshot dos arquivos protegidos da Etapa 6.
- `docs/ETAPA7-QUALIDADE-ACESSIBILIDADE.md` — esta documentação.
- `package.json` — `npm run ux:stage7:check` incorporado à cadeia `e:check`.
- `LEIA-ME.md` — índice atualizado para a etapa final.

## Verificações de fato executadas

| Verificação | Resultado observado |
| --- | --- |
| `npm run stage1:check`, `npm run stage2:check` | **Passaram** |
| `npm run stage3:check`, `npm run stage4:check`, `npm run stage5:check` | **Passaram** |
| `npm run ux:stage4:check`, `npm run ux:stage5:check`, `npm run ux:stage6:check` | **Passaram** |
| `npm run ux:stage7:check` | **8 grupos de verificações passaram**, incluindo 135 hashes |
| `node scripts/check-id-snapshot.mjs` | **1.301 IDs na mesma ordem** |
| `node scripts/check-catalog-snapshot.mjs` | **46 chunks inalterados** |
| `node scripts/check-progress-interactions.mjs`, `node scripts/check-runtime-data.mjs` | **Passaram** |
| `npm run reset:local-smoke` | **Passou** (limpeza local controlada, segurança de logout) |
| `npm run reset:smoke` | **Passou** (simulações de geração, recuperação idempotente e bloqueio remoto) |
| Parse via compilador TypeScript global | **82 arquivos TS/TSX em `src/` e `tests/`, zero erros de sintaxe** |
| Parse CSS com `tinycss2` e `npm run stage4:check` | **Sem erros de parsing**; tokens, contraste, alvo de 44 px e ausência de `!important` e estilos inline verificados |

## Bloqueios do ambiente — não confundir com testes aprovados

- `npm install` falhou em `registry.npmjs.org` com `EAI_AGAIN` (DNS/rede). Não foi possível baixar as dependências.
- `npm run e:check` **iniciou, passou os controles estáticos e parou em `lint`** porque `eslint` não está instalado (`exit 127`). Não foi possível obter aprovação integral.
- `npm run build` parou já em `data:build` porque o pacote `zod` está ausente; não houve build Vite.
- `npm run typecheck` relatou módulos externos ausentes (`preact`, `preact/hooks`, `preact/jsx-runtime`, entre outros). O parsing sintático isolado **não substitui** o typecheck.
- `npm run test:unit` não executou: `vitest` não encontrado.
- `npm run test:e2e` não executou os testes: o binário instalado globalmente é o Playwright CLI de automação, não o runner `@playwright/test`; retornou `unknown command 'test'`.
- **Não houve renderização/homologação visual real**, screenshots de aplicação renderizada nem testes contra Supabase real. As larguras 320/360/390/768/899/900/1024/1440, temas e fonte ampliada são **cobertos pelos testes escritos**, mas continuam pendentes de execução.

## Como homologar em um ambiente com Node/npm disponíveis

```bash
npm install
npm run e:check
npm run build
npm run test:e2e
npm run reset:smoke
npm run reset:local-smoke
```

Inspecionar visualmente **Hoje, Checklist, Explorar (Jornada, Extras, Clone e Links habilitados), Ajuda e Configurações** em 320, 360, 390, 768, 899, 900, 1024 e 1440 px; em tema escuro/claro/automático, fonte grande e `prefers-reduced-motion`. Validar Tab/Enter/Escape, anel de foco, barra inferior sem oclusão, deep links, erros/empty/loading, diálogos com teclado virtual, voltar/avançar, progresso compartilhado e ausência de rolagem horizontal. Verificar console e relatórios reais do Playwright. Para reset remoto, aplicar/homologar SQL e RLS em Supabase de teste **antes** de liberar a opção; smoke local não equivale a aprovação remota.

**Conclusão:** a Etapa 7 está codificada e consolidada em ZIP, com testes estáticos e snapshots aprovados. A aprovação de produção depende dos testes completos e da homologação visual/servidor acima, indisponíveis neste ambiente.
