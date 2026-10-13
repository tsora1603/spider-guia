# Supabase, contas e segurança

O site funciona sem login. Supabase é usado para contas privadas e sincronização. O conteúdo de `public/config.js` fica público: use apenas Project URL e chave publicável; mantenha `service_role`, `sb_secret_*`, senhas e tokens administrativos fora do navegador/repositório.

O SDK vem de `@supabase/supabase-js`, versionado no npm e carregado sob demanda. Para atualizá-lo, altere a dependência e o lockfile e execute os testes de login, sincronização e reset.

## Configuração inicial

1. Prepare staging e backup antes de alterar produção. Em banco novo, execute **uma vez** `setup.sql` e depois `supabase/migrations/20261007_000001_server_sync_generation.sql`. **Não execute `setup.sql` após a migração:** ele reinstala políticas legadas.
2. Execute `supabase/tests/validate_permissions.sql` como administrador; todos os resultados `ok` devem ser `true`.
3. Preencha `SUPABASE_URL` (sem `/rest/v1/`) e `SUPABASE_ANON_KEY` em `public/config.js` com os dados do **seu** projeto.
4. Ative o provedor Email, desative cadastro público em **Sign In / Providers** e crie/confirme contas em **Authentication → Users**. O login usa e-mail e senha.
5. Publique e teste login/logout, sincronização em dois dispositivos e isolamento entre duas contas reais. Uma conta não pode consultar ou alterar dados da outra.

Mantenha o projeto Supabase ao trocar a hospedagem para conservar o progresso remoto. Atualize URLs configuradas em **Authentication → URL Configuration**, se houver. A sessão exige novo login no novo domínio.

Recuperação de senha é feita pelo administrador no painel; não há recuperação por e-mail no site. Uma conta logada pode trocar a senha em Configurações, informando a atual.

## Progresso e reset local

`public.progress` guarda `user_id`, `ord`, status e `updated_at`. Desmarcar grava **Não**, preservando o registro para a sincronização. **Pulei** continua separado de **Sim**.

O reset local, em Configurações, oferece backup e limpa somente dados do aplicativo neste dispositivo. A nuvem permanece; ao reconectar, o usuário escolhe como continuar. A conta Supabase continua existindo. O JSON exportado contém progresso/histórico, sem preferências, aparência ou metas.

Se a limpeza for interrompida, mantenha a proteção de reset ativa até concluir a recuperação.

## Reset de dispositivo e nuvem

Mantenha `SPIDER_REMOTE_RESET_VERIFIED = false` até validar o protocolo em ambiente real. A flag só expõe a opção na interface; testes locais e SQL administrativo não comprovam, sozinhos, a segurança multiusuário.

Antes de habilitar, use staging, dados fictícios, contas A/B e dois dispositivos para A:

- Confirme permissões das RPCs e isolamento A/B. Apague o progresso A com confirmação **APAGAR**; B deve permanecer intacto.
- Verifique incremento transacional de geração e bloqueio de envios de clientes A com geração antiga.
- Simule resposta perdida, clique repetido, recarga, abas concorrentes e falha na limpeza local. O `request_id` deve permitir recuperação sem repetir a exclusão; falhas não podem aparecer como sucesso.
- Confira backup, importação, reconexão, Web Locks e confirmações acessíveis, incluindo as de HQs essenciais. Registre os resultados antes de ativar a flag.

Código: `src/reset/`, `src/sync/server-generation.ts`, `src/sync/sync-engine.ts`. SQL: `supabase/migrations/` e `supabase/tests/`. As RPCs protegidas são `spider_sync_state`, `spider_sync_push`, `spider_sync_confirm_empty` e `spider_sync_reset`.

Para validar o cliente, rode `npm run ci`, `npm run test:e2e`, `npm run reset:local-smoke` e `npm run reset:smoke`. Preserve também os testes reais de contas e dispositivos descritos acima.
