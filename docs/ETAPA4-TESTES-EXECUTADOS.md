# SPIDER·GUIA — Etapa 4: execução de testes (ambiente de entrega)

## Resultado efetivamente observado

| Verificação | Resultado | Escopo comprovado |
|---|---|---|
| `npm run reset:smoke` | **PASSOU** | Módulos TS reais transpidados com compilador global; servidor RPC simulado: push com geração 1, rejeição de operação antiga após geração 2, bloqueio de progresso local de geração excluída, autorização explícita com nuvem vazia, flag remota desativada, resposta de rede perdida e retry com **mesmo UUID** sem segunda exclusão; sintaxe dos arquivos de integração TS/TSX |
| `npm run reset:local-smoke` | **PASSOU** | Módulo `resetThisDevice` real, preferências/UI substituídas por mocks: falha de logout preserva armazenamento, limpeza seletiva remove chaves do SPIDER·GUIA e conserva chave externa, sessão/progresso/histórico reiniciados, trava de sync mantida |
| `node scripts/check-id-snapshot.mjs` | **PASSOU** | **1.301 IDs** idênticos e na mesma ordem |
| `node scripts/check-catalog-snapshot.mjs` | **PASSOU** | **46 arquivos** de catálogo idênticos byte a byte |
| `node scripts/check-router-contract.mjs` | **PASSOU** | Contrato das rotas existente |
| `node scripts/check-runtime-data.mjs` | **PASSOU** | Validação estática dos dados gerados |
| `node scripts/simulate-progress-migration.mjs` | **PASSOU** | Compatibilidade dos dados locais legados simulada |
| `diff -rq etapa3/data etapa4/data` e `src/data` | **SEM DIFERENÇAS** | Dados de origem/gerados preservados |
| Transpilação de TS/TSX com TypeScript global | **PASSOU quanto à sintaxe** | Não equivale a typecheck de projeto |
| `npm install --offline` | **FALHOU** | Dependências não presentes em cache (`ENOTCACHED`) |
| `npm install` | **FALHOU** | Registro npm inacessível (`EAI_AGAIN`) |
| `tsc --noEmit` | **INCONCLUSIVO** | Typecheck completo não é possível sem `preact`, `preact/jsx-runtime` e outras dependências; erros TS2307/TS2875 por falta desses pacotes |
| `npm test` (Vitest) | **NÃO EXECUTADO** | Vitest indisponível; testes de regressão foram incluídos, não homologados |
| `npm run test:e2e` (Playwright) | **NÃO EXECUTADO** | Playwright/browser/dependências indisponíveis |
| `npm run build` (Vite) | **NÃO EXECUTADO** | Vite e dependências indisponíveis |
| `supabase/tests/validate_permissions.sql` | **NÃO EXECUTADO** | Sem Supabase de staging/produção e sem Postgres local |
| Requisições concorrentes reais e RLS A/B | **NÃO EXECUTADAS** | Só foram testadas regras no mock JS, não isolamento/transações PostgreSQL |
| Acessibilidade/responsividade em navegador | **NÃO VERIFICADAS** | CSS e controles fornecidos; exigem inspeção manual/E2E |

**Atenção:** os testes de `scripts/smoke-reset-stage4.mjs` usam servidor RPC simulado e stub da limpeza local. Já o `scripts/smoke-local-reset-stage4.mjs` executa o reset local real com dependências de UI/preferências substituídas por mocks. São testes isolados, não demonstram RLS nem garantias transacionais do Supabase real.

O reset remoto está **indisponível** por padrão e nenhum DELETE remoto foi executado nesta etapa. A validação integral depende das instruções de implantação em `docs/RESET-REMOTO-ETAPA4.md`.
