# SPIDER·GUIA — Etapa 3: reconexão segura após reset local

## Escopo

A Etapa 3 parte da Etapa 2. **Não altera catálogo, dados editoriais, IDs, rotas, SQL ou registros do Supabase por exclusão.** A reinicialização local continua disponível. Não há reset remoto nem opção para sobrescrever remotamente todo o progresso.

## Estados e decisão

O marcador existente `aranha-local-reset-guard-v1` agora usa `version: 2` e conserva `phase: preparing | completed`. No estado `completed`, `decision` é:

- `pending` (inclusive marcadores legados da Etapa 2): aguarda escolha; autenticar é permitido, sincronizar não.
- `local-only`: escolha explícita por continuar somente neste dispositivo; mantém autenticação opcional e o bloqueio de pull, push, retry e fila. Pode reconsiderar em Configurações, sem desbloqueio automático.
- `restored`: confirmado depois de um SELECT remoto paginado, validação, mesclagem e confirmação da gravação local. O grant persistido é vinculado ao `userId`; uma aba carregada antes da concessão não o herda.

O estado `preparing` continua bloqueando login e sincronização, pois pode representar um reset interrompido. O login/logout não remove nem redefine o marcador.

## Fluxo

1. Após login com marcador `pending`, o diálogo abre automaticamente; nenhum callback de autenticação chama `pull` ou `push` enquanto bloqueado.
2. Consulta **read-only** de `public.progress`, filtrada por `user_id`, ordenada por `ord`, em páginas de 500 registros. A interface distingue progresso encontrado, nuvem vazia e falha de conexão.
3. **Decidir depois**: fecha a interface e preserva `pending`. No próximo login ou recarregamento o diálogo reaparece.
4. **Continuar sem sincronizar**: salva `local-only`, sem apagar nada nem iniciar fila. Em Configurações > Conta e sincronização, o usuário pode abrir a decisão novamente.
5. **Restaurar progresso da nuvem**: somente se há registros válidos. Consulta novamente o servidor e compara impressões de todo o snapshot local e remoto (não apenas contagens). Mudanças exigem nova consulta/decisão. Dados do catálogo desconhecidos não são importados; status/horários inválidos ou duplicações impedem a restauração.
6. Aplica o merge por `updatedAt`, com empate divergente favorecendo o local. Confirma persistência seletiva em `localStorage`, esvazia filas anteriores e **só então** grava a decisão `restored` com autorização vinculada ao usuário. A partir daí a sincronização normal pode prosseguir.
7. Abas antigas recebem `storage` e recarregam. Antes do reload, o grant armazenado difere do token de autorização da aba antiga, portanto ela não pode puxar nem enviar leituras; a versão do marcador também é verificada antes de cada salvamento local, impedindo escritas obsoletas.

## Comportamento explícito e limites

- A restauração **pode atualizar registros locais antigos** segundo `updatedAt`; a quantidade de colisões e a regra de resolução são informadas antes da confirmação. Registros locais mais recentes podem ser enviados ao servidor *depois* da decisão. Nenhuma importação acontece automaticamente.
- O Supabase não contém histórico de leitura completo (`aranha-log-v1`); um registro remoto `Sim` restaura o status, mas não inventa uma data de leitura passada.
- Se a nuvem está vazia, **não** há o que restaurar. A Etapa 3 mantém a sincronização bloqueada; habilitar um envio inicial irrestrito de progresso sobre uma nuvem potencialmente alterada por outro dispositivo exigiria uma negociação transacional no servidor e não foi incluído nesta etapa.
- A autorização é vinculada à mesma conta. Entrar com outra conta não libera acesso automático; é necessário usar a conta que confirmou a restauração.
- Sem um protocolo transacional no servidor, não é possível garantir um snapshot perfeitamente atômico de modificações simultâneas de vários dispositivos durante a leitura paginada. O fluxo faz uma segunda consulta e compara conteúdo, não promete isolamento serializável.
- Se a rede ou o armazenamento falham **antes** do grant, o bloqueio permanece. Se falhar uma sincronização **posterior** à restauração salva, valem os mecanismos existentes de retry e o progresso local já recuperado permanece.
- Nunca executa DELETE remoto, não exclui conta nem tokens manualmente, e não chama `localStorage.clear()`.

## Arquivos envolvidos

- `src/reset/reset-guard.ts`: versão 2 do marcador, decisão persistente, grant por conta/aba.
- `src/reset/cloud-reconnect.ts`: SELECT seguro, validação, preview e confirmação da mesclagem.
- `src/reset/CloudReconnectDialog.tsx`: diálogo acessível e reabertura manual.
- `src/runtime/controller.ts`: autenticação segura, integração com o engine e religações do SDK após reset.
- `src/sync/sync-engine.ts`: autorização conferida por conta em cada operação/retentativa.
- `src/views/App.tsx`, `src/views/MoreView.tsx`, `src/reset/DeviceResetCard.tsx` e `src/styles.css`: UI.
- `tests/unit/cloud-reconnect.test.ts`, `tests/e2e/cloud-reconnect.spec.ts`: casos de regressão.

## Verificações

Executar em ambiente com acesso às dependências: `npm install`, `npm run typecheck`, `npm test`, `npm run test:e2e` e `npm run build`.

Verificações sem npm: `node scripts/check-id-snapshot.mjs`, `node scripts/check-catalog-snapshot.mjs`, `node scripts/check-router-contract.mjs`, `node scripts/check-runtime-data.mjs`; smoke de fluxo em JS transpilation de TS sem dependências do app. Vide resumo da entrega para os resultados efetivamente executados.
