# Supabase, contas e segurança

**Leia antes de alterar autenticação, sincronização ou reset.** A interface é pública no navegador; nenhum segredo administrativo deve ser incluído no repositório ou em `public/`.

## Configuração inicial

1. No Supabase, prepare uma instância de teste (staging) e um backup antes de alterar o banco de produção.
2. Em banco novo, execute **uma vez** `setup.sql` no SQL Editor e depois `supabase/migrations/20261007_000001_server_sync_generation.sql`. **Não execute `setup.sql` depois da migração:** suas políticas legadas de escrita direta podem reabrir privilégios. Em banco existente, avalie previamente o estado do schema.
3. Execute `supabase/tests/validate_permissions.sql` como administrador: todas as verificações `ok` devem retornar `true`. Esse check somente leitura não substitui testes com usuários autenticados distintos.
4. Em `public/config.js`, preencha **somente** a Project URL (sem `/rest/v1/`) e a **chave publicável** do Supabase. **Nunca** inclua `service_role`, `sb_secret_*`, senha de banco, tokens administrativos ou senha pessoal no navegador/GitHub.
5. Configure Auth conforme a modalidade do site: **login privado com e-mail e senha**, contas criadas pelo administrador em **Authentication → Users**, provedor Email ativado e cadastro público desativado em **Sign In / Providers**. Confirme administrativamente os e-mails das contas sob seu controle.
6. Faça deploy pelo GitHub Pages e teste login, logout, leitura local, `Sim`/`Pulei`/`Não`, sync em dois dispositivos e isolamento entre duas contas. Uma conta não pode consultar/alterar progresso da outra. Ao trocar o endereço, mantenha o mesmo projeto Supabase para conservar o progresso remoto e entre novamente na conta. Se houver URLs configuradas em **Authentication → URL Configuration**, atualize-as para o endereço publicado; o fluxo atual de e-mail/senha não depende de redirecionamento nem oferece recuperação por e-mail.

Se esquecer a senha, sem SMTP a recuperação é administrativa (painel ou Admin API **somente no servidor protegido**); usuário já logado pode alterar a senha informando a atual em Configurações. Não peça a senha atual dos amigos.

## Sincronização e progressos

- Tabela `public.progress`: registros por `user_id` e `ord`; status `Não`, `Sim`, `Pulei` e `updated_at`. Um desmarque é representado por **`Não`**, não pela exclusão da linha, para evitar ressurreição do status antigo no merge.
- O cliente usa `src/sync/sync-engine.ts` e `src/sync/server-generation.ts`. Com a migração, as RPCs protegidas (`spider_sync_state`, `spider_sync_push`, `spider_sync_confirm_empty`, `spider_sync_reset`) negociam a geração da conta.
- Um reset local preserva a nuvem, bloqueia sincronização antiga e exige decisão explícita na reconexão: continuar localmente ou restaurar a nuvem quando o protocolo permitir. Não ocorre importação remota automática após o reset.
- A conta Supabase **não** é excluída por nenhum dos dois modos de reset. A exportação JSON cobre progresso/histórico, **não** todas as preferências, aparência ou metas.

## Reset local

Disponível em Configurações → Gerenciamento de dados. O código está em `src/reset/local-reset.ts` e `src/reset/reset-guard.ts`. Ele remove as chaves **do próprio aplicativo** e preserva os dados da nuvem; requer confirmação, oferece backup, invalida sincronização pendente e não toca em arquivos exportados nem contas Supabase. Se uma limpeza for interrompida, a proteção de reset deve continuar ativa até recuperação segura.

## Reset de dispositivo + nuvem — implantação controlada

**Desabilitado por padrão** em `public/config.js` (`SPIDER_REMOTE_RESET_VERIFIED = false`). `true` é **apenas uma flag de exposição**, não uma garantia de segurança. Não a ative com base somente no `validate_permissions.sql`, nos mocks ou em um teste local.

Antes de considerar a ativação:

1. Em **staging**, valide migração/RLS e faça backup. Use contas **A e B**, dois dispositivos/abas para A e um para B, com dados fictícios.
2. Demonstre isolamento A/B, autenticação real, chamadas RPC permitidas/proibidas, incremento transacional de geração e `DELETE` restrito ao dono.
3. Apague a conta A com confirmação `APAGAR`: confira que o progresso B permanece e **clientes A com geração antiga não conseguem reenviar** dados apagados.
4. Simule perda de conexão antes/depois da chamada remota, resposta incerta, clique repetido, recarga, concorrência de abas e falha de limpeza local. O recibo com `request_id` deve permitir recuperação idempotente; uma falha não pode ser apresentada como sucesso.
5. Valide backup prévio, proteção da confirmação de HQs essenciais, reconexão segura, importação/exportação, browser Web Locks, login/logout e acessibilidade do modal.
6. Repita os testes pertinentes contra o ambiente real (sem usar dados importantes). Só então avalie colocar a flag `true`, versionar a mudança e monitorar o deploy.

Arquivos do protocolo: `src/reset/remote-reset.ts`, `src/reset/DeviceResetCard.tsx`, `src/reset/CloudReconnectDialog.tsx`, `src/sync/server-generation.ts`; SQL em `supabase/migrations/` e `supabase/tests/`.

## Verificações técnicas

```bash
npm run typecheck
npm run test:unit
npm run test:e2e
npm run reset:local-smoke
npm run reset:smoke
npm run build
```

**Limite explícito:** passar nos comandos acima e no SQL administrativo não demonstra sozinho a segurança real em múltiplas contas e dispositivos. Registre os resultados dos testes antes de habilitar exclusão remota.
