# SPIDER·GUIA — Checklist guiada pela sequência da Home

**Base:** `spider-guia-correcao-navegacao-modo-foco.zip` (versão mais recente aprovada).

## Alterações de produto

- **Uma única fonte para o plano**: tanto a Home quanto a Checklist chamam `buildReadingPlan(preferences)` e `summarizeReadingPlan(plan, statusOf)`. A ordem é a do catálogo (`readingOrder`), sem reclassificar HQs por fase.
- **Lista contínua**: cabeçalhos de fases/arcos e expansões por fase foram removidos da Checklist. Fases e marcos continuam na Jornada de Explorar, sem alteração editorial.
- **Planos respeitados**: Completo mostra as 1.301 leituras; Essenciais mostra somente peso `● Essencial`; Foco aplica o filtro existente por palavras e mantém a ordem das HQs correspondentes.
- **Próxima leitura**: o topo da Checklist mostra a mesma próxima leitura pendente da Home e oferece “Ir à próxima”. Quando todas estiverem lidas/puladas, indica que não existem pendências.
- **Modo Foco**: na ausência de link direto, começa pela primeira HQ pendente do plano/filtro. Próxima e Anterior caminham pela mesma ordem visível, sem reimpor a rota inicial ao mudar o progresso; linhas são identificadas por `item.id` e o botão de lida exibe o status da HQ correta.
- **Busca e filtros**: trabalham sobre o plano ativo; as linhas permanecem ordenadas por `readingOrder`. Leitura lida não se confunde com pulada. Um link direto de uma HQ fora do plano abre uma exceção temporária com aviso e não modifica as preferências do usuário.
- **Desempenho**: a sequência longa continua virtualizada em segmentos internos de 24 HQs, sem agrupamento editorial. Segmentos são indexados pela primeira HQ para evitar reaproveitamento incorreto de alturas ao filtrar.
- **Lote**: a interface substitui “Arco inteiro” por “Plano atual”, preservando a prévia, confirmação e as opções existentes “Tudo até aqui” e “Intervalo” com seu comportamento histórico. O código de seleção por fase legado permanece no módulo de domínio, sem opção de agrupamento na UI da Checklist.

## Arquivos alterados

- `src/components/VirtualizedChecklist.tsx`: lista contínua, plano da Home, Modo Foco, deep links e virtualização.
- `src/components/BulkProgressDialog.tsx`, `src/progress/bulk-progress.ts`: seleção por plano atual.
- `src/styles.css`: estilo contínuo, atalho de próxima leitura, responsividade.
- `tests/unit/checklist-sequence.test.ts`, `tests/unit/bulk-progress.test.ts`, `tests/e2e/spider-guia.spec.ts`: regressões.
- `scripts/check-reading-sequence-refactor.mjs`, verificações legadas de arquitetura/Checklist/qualidade e `package.json`: contratos atualizados, sem mascarar alteração intencional.

## Verificações e limitações

- `npm run reading-sequence:check`: verifica 1.301 registros, ordem, Annual intercalado, correspondência de funções Home/Checklist, puladas e navegação do foco.
- `npm run data:ids` e `npm run data:catalog`: IDs e chunks preservados.
- Os smoke tests locais de reset, verificações de rotas/UX e sintaxe dos arquivos alterados são executáveis sem dependências adicionais.
- `docs/ETAPA7-BASELINE-INTEGRIDADE.json` é preservado como referência histórica. A checagem agora discrimina **134 arquivos críticos inalterados** e **1 alteração intencional** (`src/progress/bulk-progress.ts`, seleção por plano); não declara falsa igualdade com a versão antiga.
- **Pendente:** build com dependências, Vitest, Playwright, revisão visual real em mobile/desktop, Supabase real. `preact`, Vite e Vitest não estão instalados neste ambiente. Os cenários Playwright foram adicionados, mas não executados.
