# SPIDER·GUIA — Etapa 2: reset local

> Nota de versão: a reconexão segura já foi implementada na Etapa 3. Consulte `docs/RECONEXAO-SEGURA-ETAPA3.md`; as referências à restrição de login abaixo descrevem o comportamento original da Etapa 2.

## Escopo

Implementado **somente o reset deste dispositivo**, na seção **Configurações (rota preservada `#conta/ajuda`) > Gerenciamento de dados**. A exclusão remota **não existe** nesta etapa e nenhum SQL ou tabela do Supabase foi alterado.

## Inventário de persistência removida

A remoção ocorre por chaves explícitas em `src/reset/local-reset.ts`:

- `aranha-progress-v1` — progresso;
- `aranha-log-v1` — histórico de leitura;
- `aranha-progress-meta-v2` — status por item e `updatedAt`;
- `aranha-sync-queue-v1` — fila de tentativas de sincronização;
- `aranha-storage-version-v1` — versão de migração;
- `aranha-reading-preferences-v1` — plano, foco, onboarding e já li até;
- `aranha-design-preferences-v1` — tema, fonte e modo foco;
- `aranha-engagement-v1` — meta semanal;
- `aranha-spoiler-level-v1` — visibilidade de spoilers;
- `aranha-spoiler-consent-extras-v2`, `aranha-spoiler-consent-links-v1`, `aranha-spoiler-consent-jornada-v2` — autorizações legadas que não podem migrar de volta.

`aranha-local-reset-guard-v1` é **mantida** após o reset: ela impede que um aparelho reinicializado importe ou envie progresso automaticamente até a implementação da reconexão segura (etapa posterior).

**Autenticação:** a sessão atual do projeto Supabase é desconectada exclusivamente pela API do SDK, `auth.signOut({scope:'local'})`, antes da limpeza. Não removemos arbitrariamente chaves `sb-*`, porque outras aplicações/projetos podem usar a mesma origem. Caso não seja possível acessar/verificar a sessão ou fazer logout, o reset é interrompido **antes de apagar os dados de leitura**. Se não existe cliente/sessão/credencial no projeto configurado, o reset pode ser realizado offline.

Não foi encontrada persistência própria adicional em `sessionStorage` ou IndexedDB na versão inspecionada. Não são removidos caches do navegador, downloads, arquivos externos nem chaves de outras aplicações.

## Protocolo de execução e recuperação

1. Modal acessível apresenta escopo, consequências, cancelamento e backup JSON existente (que exporta progresso e histórico; **não** inclui meta, aparência e preferências).
2. Persistir e reler `aranha-local-reset-guard-v1` com fase `preparing`. Se essa escrita falhar, **não remover nada**.
3. Invalidar a geração da sincronização e o timer de retry. `pull`, `push`, `enqueue` e `flush` conferem a trava antes de agir. Callbacks antigos descartam suas respostas.
4. Aguardar a conclusão dos *pushes já enviados* nesta aba, com prazo de 8 s. Um timeout aborta a limpeza e mantém a proteção.
5. Fazer `signOut({scope:'local'})` quando houver sessão; verificar `getSession()` e a ausência da chave de credencial padrão deste projeto. Se não for confirmada, abortar a limpeza.
6. Remover somente as chaves inventariadas, verificando cada remoção. Se ocorrer falha parcial, deixar a trava em `preparing`, exibir erro e permitir nova tentativa.
7. Marcar `completed` duravelmente e reconfigurar estado em memória: progresso/histórico/fila vazios; meta 5; tema `auto`; fonte `default`; modo foco desligado; spoilers `nenhum`; plano `essential`; onboarding não concluído e `readThrough = 0`.
8. Fechar o diálogo, navegar à tela Hoje e abrir o onboarding sem qualquer importação remota.

**Múltiplas abas:** evento `storage` do marcador invalida a sincronização e recarrega abas que ainda estavam abertas. Escritas de estado legado de abas iniciadas antes do reset são ignoradas ao detectarem a trava externa. A limpeza de todas as abas depende da propagação do evento do navegador; é recomendável fechar outras abas antes de iniciar.

**Interrupção/recarregamento:** com fase `preparing`, a sincronização continua bloqueada e o usuário pode repetir o reset. Com `completed`, o site carrega os defaults sem reexecutar `pull`/`push` e continua permitindo novas leituras apenas neste dispositivo. **Nenhuma reconexão automática** nesta etapa; login é ocultado/desabilitado quando bloqueado.

**Limite importante:** requisições de escrita *já transmitidas* por outra aba ou outro dispositivo não podem ser canceladas retroativamente pelo browser. O reset desta etapa não emite `DELETE` nem modifica propositalmente `public.progress`, mas não é possível garantir que uma escrita anterior em outro dispositivo nunca finalize. O reset remoto multi-dispositivo fica explicitamente fora deste escopo.

## Arquivos alterados

- Novos: `src/reset/reset-guard.ts`, `src/reset/local-reset.ts`, `src/reset/DeviceResetCard.tsx`.
- Integração: `src/runtime/controller.ts`, `src/sync/sync-engine.ts`, `src/state/types.ts`, `src/state/progress-store.ts`, `src/views/MoreView.tsx`, `src/views/App.tsx`, `src/styles.css`.
- Defaults e prevenção de gravação antiga: `src/engagement/preferences.ts`, `src/spoilers/preferences.ts`, `src/design/preferences.ts`, `src/preferences/reading-preferences.ts`.
- Proteção de callbacks assíncronos do onboarding: `src/components/Onboarding.tsx`.
- Regressões: `tests/unit/local-reset.test.ts`, `tests/unit/reset-sync.test.ts`, `tests/e2e/reset-local.spec.ts`.

## Testes

- Foram executados com sucesso os scripts de snapshot `node scripts/check-id-snapshot.mjs` (1.301 IDs) e `node scripts/check-catalog-snapshot.mjs` (46 arquivos byte a byte).
- O smoke test de lógica, executado por Node com transpilation TypeScript (fora da árvore entregue), validou limpeza de todas as chaves, preservação de terceiros, defaults, bloqueio de `pull`/`push`, ordem e erro de desconexão.
- Foram criados testes Vitest e Playwright cobrindo confirmação/cancelamento, backup, reset local, sessão autenticada e sem sessão, offline, falhas, chaves legadas, fila, operações concorrentes e permanência da trava após reload.
- **Não foi possível executar Vitest, Playwright, build completo, nem a checagem TypeScript integral:** o ZIP original não possui `package-lock.json` nem `node_modules`; a instalação via npm falhou por indisponibilidade de DNS do registro. A tentativa local de `tsc` apresenta erros de módulos Preact ausentes. É necessário `npm install`, `npm run typecheck`, `npm test`, `npm run build` e `npm run test:e2e` em ambiente com npm acessível.

## Etapa posterior

A etapa 3 deverá tratar a reconexão segura e o protocolo de reset remoto multi-dispositivo. Este pacote **não** implementa nem expõe exclusão de dados remotos.
