# SPIDER·GUIA — autenticação privada por e-mail e senha

## Escopo

- O login público por Magic Link foi substituído por e-mail e senha (`auth.signInWithPassword`).
- **Não** há cadastro público, redefinição por e-mail ou link de acesso.
- Os usuários são criados manualmente pelo administrador em **Supabase → Authentication → Users → Add user**, com e-mail confirmado.
- Depois de criar as contas, desative **Allow new users to sign up** em Authentication → Sign In / Providers, mantendo Email habilitado.
- Usuários autenticados podem trocar a senha em **Configurações → Conta e sincronização**, confirmando a senha atual.
- Senhas não são persistidas no armazenamento do SPIDER·GUIA e nenhum arquivo contém credenciais de usuários.

## Antes de publicar

1. No Supabase, executar `setup.sql` e a migração em `supabase/migrations/` com RLS e permissões validadas.
2. Preencher **apenas** Project URL e chave pública em `public/config.js`. Nunca inserir `service_role`, `sb_secret_`, senhas pessoais ou API keys secretas no GitHub.
3. Criar e confirmar manualmente as contas e desativar cadastro público.
4. Publicar via GitHub → Netlify e testar login, logout, leitura local, sincronização e troca de senha entre dispositivos.
5. **Manter** `window.SPIDER_REMOTE_RESET_VERIFIED = false` até testes reais de segurança do reset remoto.

## Recuperação sem SMTP

Não há fluxo automático de recuperação de senha. Para senha esquecida, o administrador precisa efetuar uma redefinição segura (pelo painel, caso ofereça essa operação, ou usando a Admin API em um ambiente servidor protegido), e fornecer a senha temporária por canal privado. Outra opção é habilitar temporariamente um SMTP confiável para recuperação. Nunca coloque chave administrativa no navegador. Depois do login, o usuário deve trocar a senha em Configurações. Não solicitar as senhas atuais dos amigos.

## Arquivos alterados

- `index.html`: diálogo com e-mail e senha, sem cadastro público.
- `src/runtime/controller.ts`: autenticação e mensagens de erro.
- `src/auth/password-auth.ts`: adaptador de login, mensagens e mudança de senha.
- `src/views/MoreView.tsx`: formulário de alteração de senha.
- `src/styles.css`: layout responsivo e foco visível.
- `tests/unit/password-auth.test.ts` e `tests/e2e/private-password-auth.spec.ts`: regressões.

**Não alterados:** catálogo, IDs, `readingOrder`, progresso, sync, reset, Supabase SQL/RLS, links editoriais, build e workflow.
