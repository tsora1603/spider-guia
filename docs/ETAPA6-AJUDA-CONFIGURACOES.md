# SPIDER·GUIA — Etapa 6: Ajuda, Configurações e fluxos delicados

Base: ZIP aprovado **Etapa 5 — Explorar, navegação contextual e busca**.
Esta entrega limita-se à organização da UI; não modifica catálogo, progresso, backend nem protocolo de sincronização/reset.

## Antes → depois

| Área | Antes | Agora |
| --- | --- | --- |
| Ajuda | Quatro abas e conteúdo de boas-vindas pouco orientado | Mesmas quatro abas (Como usar, Glossário, Fontes, Metodologia), mais atalhos diretos, contagens, pesquisa contextual, limpeza de busca e links profundos por item |
| Fontes | Website → registros expansíveis; busca não restaurável | Mesmo agrupamento, mesmos registros/URLs; busca também por nome/domínio do website, URL `?q=`, alvo individual `?fonte=N` que abre grupo e registro, rola e recebe foco |
| Glossário | Cards expansíveis e busca local | Mesmo texto editorial e padrão de cards; contagem filtrada, busca com URL e links `?termo=N` |
| Metodologia | Cards e histórico editorial | Mesmo conteúdo; contagem e âncoras `?bloco=N` para cada tópico |
| Configurações | Cards misturados sem organização explícita | Sete blocos nomeados: Plano, Spoilers, Aparência, Configuração guiada, Conta e sincronização, Backup, Gerenciamento de dados |
| Configuração guiada | Link discreto dentro do cartão do plano | Cartão próprio com CTA “Refazer configuração guiada”; a ação reutiliza `readingPreferences.set({ onboardingComplete: false })` |
| Sincronização | Texto e botões | Estado curto (nuvem/local/offline/erro/bloqueada) e explicação existente `homeSyncCopy()`; acesso a revisão de nuvem quando permitido |
| Backup e reset | Agrupados visualmente com outras preferências | Backup em cartão separado; reset aparece isolado, após preferências e backup, com *a mesma lógica existente* |

### Fluxos preservados

- Plano, persistência da preferência e confirmação de alteração não foram recriados; os controles existentes continuam usando `readingPreferences.set`.
- Spoilers, tema, fonte e Modo Foco seguem preferências originais. O Modo Foco continua destacado primariamente na Checklist; Configurações mantém o checkbox secundário conectado à mesma preferência.
- A exportação usa `exportProgress`; importação usa `handleProgressImport`. JSON continua limitado a progresso/histórico; não inclui metas/aparência.
- Login/logout usa `toggleAuth`. Estado protegido e recuperação de nuvem continuam sujeitos a `isSyncBlocked`, `mayUseCloud`, `cloudDecision` e regras originais.
- O diálogo de reset e reconexão não foi alterado. Reset local segue **padrão**; reset remoto permanece condicionado a login, conexão, `remoteResetAvailable`, `APAGAR`, exportação opcional e confirmação do servidor. Nenhum backend/SQL/RLS/flag foi alterado; a conta Supabase não é excluída.
- “Já li até...” permanece na Home, sem duplicação em Configurações.
- Todas as rotas canônicas e aliases da Etapa 1 continuam usando o mesmo roteador; parâmetros desconhecidos são preservados ao editar pesquisa em Ajuda.

## Arquivos modificados

- `src/views/HelpView.tsx`: hierarquia, atalhos, agrupamento/busca de Fontes, contagens, links individuais, foco.
- `src/views/MoreView.tsx`: sete grupos de Configurações, CTA, conta, backup e microcopy.
- `src/design/DesignPreferencesCard.tsx`: copy da aparência; lógica de preferência intacta.
- `src/styles.css`: layout e responsividade de Ajuda/Configurações com tokens existentes.
- `src/views/help-routing.ts`: helpers puros de URL para busca e âncoras.
- `scripts/check-ux-stage6.mjs`, `scripts/check-help-routing.mjs`: regressão estática e testes reais de parâmetros.
- `tests/e2e/help-settings-stage6.spec.ts`: cenários de busca/retorno, links diretos, fonte original, 320–1440px, refazer onboarding, backup e reset.
- `package.json`: novo comando `ux:stage6:check`, incluído na cadeia `e:check`.

## Validação executada no ambiente de edição

- `npm run ux:stage6:check`: **aprovado**, 12 verificações estruturais e 5 testes de comportamento de URL.
- `scripts/check-navigation-stage1.mjs`, `scripts/check-ui-stage2.mjs`, `scripts/check-ux-stage3.mjs`, `scripts/check-ux-stage4.mjs`, `scripts/check-ux-stage5.mjs`: **aprovados**.
- `scripts/check-progress-interactions.mjs`, `scripts/check-design-system.mjs`, `scripts/check-stage5-private.mjs`: **aprovados**.
- `scripts/check-id-snapshot.mjs`: **1.301 IDs em ordem preservada**.
- `scripts/check-catalog-snapshot.mjs`: **46 chunks inalterados**.
- `scripts/smoke-local-reset-stage4.mjs`, `scripts/smoke-reset-stage4.mjs`: **aprovados**, com reset remoto permanecendo desabilitado sem homologação.
- Parse de todos os arquivos TS e TSX de `src/` e `tests/`: **sem erros sintáticos**.
- Comparação binária com a Etapa 5: **nenhuma modificação** em `data/`, `src/data/`, `src/state/`, `src/sync/`, `src/reset/`, `src/router/`, `src/runtime/controller.ts`, SQL ou Supabase.

### Pendente — **não declarar como aprovado**

- `npm install` falhou com `EAI_AGAIN` para `registry.npmjs.org`.
- `npm run e:check` avançou até o lint mas parou por falta do executável `eslint`.
- `npm run build` parou por ausência de `zod` (instalação de dependências incompleta).
- `npm run test:e2e` não pôde executar a suite porque Playwright não está instalado; os novos testes ficaram escritos, porém não executados.
- Homologação visual real (320, 360, 390, 768, 1024 e 1440 px; temas; teclado; texto aumentado) e validação Supabase/RLS remoto requerem ambiente compatível.

## Próximo passo

Revisar e aprovar a Etapa 6 antes de iniciar **Etapa 7 — Qualidade final, acessibilidade e regressões**. A Etapa 7 não faz parte deste ZIP.
