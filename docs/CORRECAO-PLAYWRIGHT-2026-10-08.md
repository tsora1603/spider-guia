# SPIDER·GUIA — correção das falhas Playwright de 08/10/2026

**Base:** último ZIP recebido do projeto (`spider-guia-login-privado-email-senha.zip`).
**Evidência:** `logs_102197599632.zip`, execução do GitHub Actions com 97 cenários (9 falhas + 1 instável na repetição).

## Correções de testes desatualizados

- `private-password-auth.spec.ts`: seletor exato para **Nova senha** (não confunde com **Confirmar nova senha**).
- `final-quality-stage7.spec.ts`: escopo do diálogo de reset do dispositivo, excluindo o diálogo separado de reconexão.
- `remote-reset-guard.spec.ts`: prepara onboarding antes de acessar Configurações; continua verificando que reset remoto não validado está desativado.
- `spider-guia.spec.ts`: filtro de Extras pelo botão acessível atual, estado **Neste dispositivo** para uso offline sem conta e estado vazio exclusivo da Checklist (não o do modal de lote).
- `cloud-reconnect.spec.ts`: `context.route` e `context.addInitScript` cobrem ambas as abas do teste, não apenas a primeira; verifica ausência de push na aba antiga e recarregamento.

## Correções funcionais

- `src/views/explore-navigation.ts` e `ReadingView.tsx`: IDs editoriais numéricos como `1228` têm prioridade sobre posições numéricas legadas em `?extra=`. Assim, o Annual #2 da busca abre a entrada precisa em vez de interpretar `1228` como índice. A exibição agrupada mantém o destino diretamente aberto como representante de seu grupo quando necessário. IDs, status e dados editoriais não foram alterados.
- `src/components/VirtualizedChecklist.tsx`: a virtualização mantém a HQ acessada por deep link montada e focada até que o usuário inicie a navegação/rolagem; elimina a desmontagem imediata do alvo enquanto as alturas estão sendo medidas.
- `src/components/FilterDropdown.tsx`: `Tab` e `Shift+Tab` nas bordas do menu fecham o popup e movem o foco de modo determinístico, sem aprisionar teclado.
- `src/reset/CloudReconnectDialog.tsx`: eventos de armazenamento entre abas encerram a janela obsoleta depois da autorização na outra aba ou de um reset remoto pendente. **Isso não concede permissão de sincronização à aba antiga**; somente o marcador/autorização de boot permite sincronizar após recarregar. O protocolo de RLS/SQL/reset remoto não foi alterado.
- `scripts/check-ux-stage3.mjs`: a verificação estática da virtualização foi atualizada para exigir foco e persistência segura do chunk até navegação humana (em vez de exigir o código antigo que soltava o chunk imediatamente).
- `scripts/check-explore-targets.mjs`: cobertura de resolução dos IDs de Extras, inclusive ID numérico que antes era confundido com posição.

## Preservação

Somente 12 arquivos preexistentes foram alterados em relação ao ZIP base; arquivos `data/src`, os 1.301 IDs, ordenação, `setup.sql`, migrações, URLs editoriais e políticas de Supabase permaneceram intactos.

## Verificações realmente executadas neste ambiente

- Verificação sintática de AST TypeScript/TSX nos arquivos modificados: **passou**.
- `check-id-snapshot.mjs`: **1.301 IDs preservados**.
- `check-catalog-snapshot.mjs`: **46 chunks consistentes**.
- `check-editorial-links.mjs`: **26 grupos / 28 URLs válidas**.
- `check-explore-targets.mjs`, `check-ui-stage2.mjs`, `check-ux-stage3.mjs`, `check-ux-stage5.mjs`, `check-ux-stage6.mjs`, `check-quality-stage7.mjs`, `check-focus-navigation.mjs`, `check-reading-sequence-refactor.mjs`, `check-stage5-private.mjs`: **passaram**.
- `smoke-local-reset-stage4.mjs` e `smoke-reset-stage4.mjs`: **passaram**.

**Não executados aqui:** `npm run build`, Vitest e Playwright completo. `npm install` falhou por DNS (`EAI_AGAIN`, registro npm indisponível). Não se deve declarar os cenários E2E como aprovados até uma execução verde no GitHub.

## Como aplicar no seu repositório GitHub

1. Faça backup ou um commit da versão atual do repositório.
2. Extraia o ZIP do patch em uma pasta temporária. Copie **o conteúdo de `spider-guia/`** para a **raiz** do seu projeto local, mantendo `.git` e as configurações específicas do seu ambiente.
3. Revise os 12 arquivos alterados em **VS Code → Source Control**.
4. Rode `npm install` se ainda não houver dependências; depois `npm run e:check`, `npm run build`, `npm run test:e2e`, `npm run reset:local-smoke` e `npm run reset:smoke`.
5. Crie o commit `Corrige testes E2E e links diretos` e execute **Sync Changes**.
6. Abra o **GitHub Actions → Playwright critical flows**. Se falhar, compartilhe o log dessa nova execução e **não presuma que os erros estejam resolvidos**.

O patch deve ser aplicado sobre a versão de login privado com senha. Se houve mudanças adicionais posteriores no seu GitHub, confira os conflitos antes de substituir arquivos.
