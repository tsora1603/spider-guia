# SPIDER·GUIA 6.1.0

Versão privada do guia de leitura, construída com Vite + TypeScript + Preact.
Mantém catálogo, IDs, links editoriais, progresso, sincronização opcional via Supabase,
46 chunks por fase, UX e identidade visual.

## Validar no Windows

```cmd
npm install
npm run build
npm run test:unit
npm run test:e2e
```

Inclui testes de navegação em cinco destinos e aliases legados. Consulte o relatório real do Playwright para a quantidade de testes aprovados.

## Reset seguro — Etapa 4

A Etapa 4 inclui protocolo de geração controlada no servidor, migração SQL e recuperação idempotente do reset remoto. **O reset remoto está desabilitado por padrão**, aguardando aplicação/homologação SQL/RLS no Supabase real. Não ativar o recurso sem seguir `docs/RESET-REMOTO-ETAPA4.md`. O reset local continua disponível. Os resultados efetivamente observados constam de `docs/ETAPA4-TESTES-EXECUTADOS.md`.

## Auditoria UX — Etapa 1

A navegação agora tem cinco destinos independentes: Hoje, Checklist, Explorar, Ajuda e Configurações. Veja o mapa, aliases, arquivos e validações em [`docs/ETAPA1-NAVEGACAO.md`](docs/ETAPA1-NAVEGACAO.md). Para validar o roteador sem iniciar o servidor, use `npm run stage1:check`.


## Auditoria UX — Etapa 2

Checklist, Jornada, Extras, Saga do Clone, Links e Fontes compartilham hierarquia e superfície de lista. Os controles de filtros de Checklist e Extras foram substituídos por um menu acessível reutilizável. Buscas locais compartilham `ListSearch`; painéis internos escuros foram removidos dos disclosures de Jornada, Links e Fontes. Glossário e Metodologia preservam seus cards.

Ver [`docs/ETAPA2-UX-UI.md`](docs/ETAPA2-UX-UI.md) para detalhes e limitações. Rode `npm run stage2:check` para verificar UI estática e preservar os 68 arquivos críticos. Os testes E2E adicionados exigem instalação das dependências e servidor Vite. O Modo Foco destacado e o botão Pular sempre visível foram implementados na Etapa 3.


## Auditoria UX — Etapas 3 a 7 (versão consolidada)

As etapas posteriores incluem Modo Foco/ações de progresso, Home de uso cotidiano, Explorar com links diretos, Ajuda/Configurações separadas e acabamento de acessibilidade.

**Relatório final:** [`docs/ETAPA7-QUALIDADE-ACESSIBILIDADE.md`](docs/ETAPA7-QUALIDADE-ACESSIBILIDADE.md). **Integridade:** `npm run ux:stage7:check` confere 135 arquivos protegidos por SHA-256 e o catálogo de 1.301 IDs/46 chunks.

Os testes estáticos e smoke tests passaram no ambiente de edição. **Build, Vitest, Playwright, homologação visual e Supabase remoto não foram aprovados aqui** por indisponibilidade das dependências/npm e de servidor de teste real. Execute os comandos da seção “Validar no Windows” após instalar as dependências e consulte o relatório antes de publicar.
