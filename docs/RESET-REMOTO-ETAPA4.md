# SPIDER·GUIA — Etapa 4: reset remoto e validação final

## Situação de implantação (importante)

**NÃO HABILITADO NO DEPLOY DE ENTREGA.** Não há acesso ao projeto Supabase em produção/staging, nem credenciais administrativas, nem ambiente PostgreSQL, para aplicar e validar a migração. A opção **“Resetar dispositivo e nuvem” está desabilitada por padrão** (`public/config.js`: `SPIDER_REMOTE_RESET_VERIFIED = false`). **Não marcar como verdadeiro** sem executar os procedimentos abaixo e obter resultados reais. O reset somente local da Etapa 2 permanece funcional; a reconexão protegida da Etapa 3 permanece disponível. Nenhum progresso remoto foi efetivamente excluído neste trabalho.

## Arquivos e implementação

- `supabase/migrations/20261007_000001_server_sync_generation.sql`: versão do progresso **no servidor por usuário**; RPCs `spider_sync_state`, `spider_sync_push`, `spider_sync_confirm_empty`, `spider_sync_reset`; recibos de idempotência por `(user_id, request_id)`; transações, lock por conta, aumento de geração + DELETE atômicos, privilégios mínimos.
- `supabase/tests/validate_permissions.sql`: validações administrativas somente leitura de RLS, privilégios e permissões.
- `src/sync/server-generation.ts`: negociação de protocolo RPC, associação geração/usuário local e bloqueio ao detectar mudança, inclusive em outras abas. Clientes sem migração usam o modo legado **somente quando o RPC está comprovadamente ausente**; outros erros falham fechados.
- `src/sync/sync-engine.ts`: escrita via RPC com `p_generation`, sem `upsert` direto quando protocolo 4 ativo; pull paginado e verificação da geração antes/depois; rejeição de operações obsoletas.
- `src/reset/remote-reset.ts`: confirmação autenticada com `auth.getUser`, idempotência (UUID persistido ANTES da chamada remota), bloqueio de sincronização, confirmação de resposta, limpeza local só DEPOIS, recuperação explícita de resultado incerto e limpeza local parcialmente concluída.
- `src/reset/reset-guard.ts` e `src/reset/local-reset.ts`: bloqueio de gerações antigas, intencionalidade preservada após falha/reload, limpeza seletiva da chave nova do protocolo no reset local.
- `src/reset/DeviceResetCard.tsx`: seletor padrão “somente dispositivo”, opção remota desabilitada até validação, campo obrigatório `APAGAR`, backup, cancelamento, recuperação pendente.
- `src/reset/CloudReconnectDialog.tsx`: quando servidor oferece protocolo 4 e a nuvem está vazia, disponibiliza início **explícito** de sincronização. Se o aparelho ainda carrega geração excluída, exige backup + reset local primeiro.
- `tests/unit/server-generation.test.ts`, `tests/unit/remote-reset-protocol.test.ts`, `tests/e2e/remote-reset-guard.spec.ts`, `scripts/smoke-reset-stage4.mjs`: regressões e verificações locais.

## Sequência de implantação obrigatória

1. **Faça backup do banco e do progresso de contas de teste.** Separe projeto de staging com pelo menos duas contas autenticadas A e B, dois navegadores para A e um para B. Não use contas de usuários reais para testes destrutivos.
2. Execute no **SQL Editor do staging** `supabase/migrations/20261007_000001_server_sync_generation.sql` integralmente. O script contém `BEGIN/COMMIT` e mantém os dados existentes. **Não execute `setup.sql` antigo depois da migração sem revisar as políticas.**
3. Execute `supabase/tests/validate_permissions.sql` no staging: **todos** os resultados `ok` devem ser verdadeiros. Inspecione também as grants e demais funções SQL instaladas para confirmar que NÃO haja outra rota de escrita direta ou função bypassando geração.
4. Teste PostgREST com JWTs autenticados de A/B (sem chave `service_role` no navegador). Confirme `spider_sync_state`/`spider_sync_push` em geração 1; push de A não altera B; RPC anônima negada; `INSERT/UPDATE/DELETE` direto de ambas as contas negados. Verifique que o catálogo não se altera.
5. Faça reset de A com `request_id` fixo (UUID). Confirme que a geração foi de N para N+1, o progresso remoto de A foi apagado e B preservado. Reenvie **mesmo** UUID/geração: o recibo informa replay sem nova exclusão. Um **novo** UUID com geração N deve falhar. Execute um push de A na geração N após o reset: deve falhar `SPIDER_STALE_GENERATION`. Um push assinado por B com geração válida deve continuar operando.
6. Faça o teste concorrente real: de dois clientes A, dispare escrita e reset ao mesmo tempo; a ordem pode variar, mas nenhum push de geração N **pode** persistir após commit do reset N→N+1. Simule resposta perdida após commit e recupere usando o mesmo `request_id`; interrompa navegador entre confirmação remota e limpeza local e valide recuperação sem novo DELETE. Confirme que login de um cliente antigo não envia dados anteriores nem restaura automaticamente.
7. **Só após todos os testes em staging** aplique a migração em produção em janela de implantação controlada, verifique grants/RLS, estado de usuários legados (geração 1) e que builds antigos perdem permissão de escrita direta. Prepare plano de rollback com backup: após reset real, rollback do esquema não recupera dados excluídos.
8. Em deploy validado, configure `window.SPIDER_REMOTE_RESET_VERIFIED = true` em `public/config.js` e publique junto com o protocolo 4. A flag **não** substitui as permissões no servidor; é apenas bloqueio de disponibilidade enquanto a migração não foi homologada.

## Contrato do reset

- **Confirmação:** usuário autenticado, online, campo `APAGAR`, SDK com `auth.getUser()` validado, protocolo 4 confirmado e **Web Locks API** disponível para exclusão mútua entre abas. Antes de tocar a nuvem, invalida callbacks e aguarda escritas em voo.
- **Execução:** persiste `aranha-cloud-reset-intent-v1` com UUID e geração original; desativa pull/push em qualquer aba atualizada; chama **RPC transacional** `spider_sync_reset` passando geração esperada e UUID. A função usa `auth.uid()`, lock por usuário; em uma única transação DELETE + incremento da geração + recibo.
- **Sucesso remoto:** valida resposta da RPC e salva o comprovante `confirmed` em armazenamento local. Só então chama `resetThisDevice`, com logout `scope:'local'`, limpeza seletiva e onboarding. A intenção é removida SOMENTE após limpeza confirmada. Sem sucesso da RPC, **nada é removido localmente**.
- **Indeterminado:** se rede cai depois do envio e antes da confirmação, mantém `pending`; ao retomar, reusa exatamente o UUID. Se a exclusão já ocorreu, o banco retorna o recibo sem excluir novamente. Se outro reset posterior alterou geração, não declara sucesso — exige intervenção para analisar.
- **Parcial:** se o banco confirmou, mas o logout ou armazenamento falhou, mantém `confirmed` e avisa explicitamente; botão de recuperação **não** chama DELETE novamente, só repete a limpeza local. Não remove a conta Supabase, nem arquivos JSON exportados, nem chaves de terceiros.
- **Outros dispositivos:** escrita de qualquer geração antiga rejeitada no servidor; clientes antigos de escrita direta não possuem privilégios; instalações novas que encontram geração maior que 1 sem autorização explícita ficam bloqueadas. A nova sincronização contra nuvem vazia exige decisão explícita e confirmação de vazio sob lock do servidor. Para gerações superiores a 1, **não se autoriza restauração ou nova sincronização enquanto houver registros locais pré-existentes**: exige backup e reset somente deste dispositivo, primeiro; isso impede reenvio acidental de leituras de gerações excluídas. Dispositivos com vínculo da geração antiga precisam limpar o progresso antigo primeiro.
- **Retrocompatibilidade:** dados existentes em `public.progress` são preservados pela migração. Na geração 1, novo cliente pode negociar sem exigir novo onboarding. Sem a migração, o protocolo antigo continua disponível mas **o reset remoto permanece indisponível**. Não confundir compatibilidade com garantia de reset remoto no backend não migrado.

## Resultados de teste nesta entrega

- Executados localmente: `node scripts/smoke-reset-stage4.mjs`; checks de IDs, catálogo, rotas e integridade de dados; verificações sintáticas de arquivos TS/TSX via transpilation sem dependências. Ver resultado no arquivo `docs/ETAPA4-TESTES-EXECUTADOS.md`.
- **NÃO executados:** suites Vitest e Playwright, build Vite, typecheck completo com dependências, responsividade/acessibilidade em navegador real; não foi possível instalar npm (`EAI_AGAIN`, registro inacessível). SQL não foi executado no Supabase, portanto **RLS e garantia transacional não foram validadas contra banco real**. Os testes com mocks verificam contrato no cliente, não RLS nem isolamento PostgreSQL.

## Checklist final manual (assinalar apenas depois de testar)

- [ ] staging: backup, migração e `validate_permissions.sql` 100% verdadeiros
- [ ] staging: JWT A/B, RLS, isolamento por usuário, service_role nunca publicado
- [ ] staging: atomicidade DELETE+incremento, replays, rejeição de geração antiga
- [ ] staging: duas abas e dois dispositivos, rede interrompida e retomada
- [ ] staging: cancelamento, digitação APAGAR, exportação e importação de backup
- [ ] staging: falha remota não limpa local; falha local após remota dá aviso parcial
- [ ] estágio pré-migração: reset local disponível, opção remota desabilitada
- [ ] npm: `npm ci` (ou `npm install` se o projeto não contiver lockfile)
- [ ] npm: `npm run typecheck && npm test && npm run test:e2e && npm run build`
- [ ] navegador: mobile/desktop, foco do diálogo, Escape, teclado, leitor de tela
- [ ] regressões: jornada, checklist, rotas, tema, preferências, spoilers, importação
- [ ] contas legadas: geração 1 sem perda de registros e novo login normal
- [ ] produção: migração verificada e monitoramento antes de ativar flag

**Não declarar esta etapa homologada enquanto os itens dependentes do Supabase real e do navegador continuarem pendentes.**
