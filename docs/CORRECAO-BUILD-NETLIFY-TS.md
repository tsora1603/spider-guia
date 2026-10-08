# Correção do build do Netlify: TypeScript e reset remoto

## Erros reportados

```text
src/reset/remote-reset.ts(8,49): error TS2339: Property 'SPIDER_REMOTE_RESET_VERIFIED' does not exist on type 'Window & typeof globalThis'.
tests/unit/remote-reset-protocol.test.ts(7,89): error TS2556: A spread argument must either have a tuple type or be passed to a rest parameter.
```

## Correções pontuais

1. `tsconfig.tests.json`: o `include` do projeto de testes agora inclui `src/**/*.d.ts`. Isso carrega `src/types/globals.d.ts`, que já declara `Window.SPIDER_REMOTE_RESET_VERIFIED`. Não foi adicionada uma declaração duplicada e a flag continua falsa por padrão em `public/config.js`.
2. `tests/unit/remote-reset-protocol.test.ts`: o mock de `resetThisDevice` recebe um único objeto de dependências e o repassa ao `resetLocal`, em vez de espalhar um array genérico de argumentos para uma função tipada sem parâmetros. A verificação da chamada continua disponível.

O protocolo SQL/RLS, a lógica de reset, as variáveis de ambiente, a navegação, os IDs e os links não foram alterados.

## Verificações executadas neste ambiente

- `tsc --showConfig -p tsconfig.tests.json`: confirmou a inclusão de `./src/types/globals.d.ts`.
- `node scripts/smoke-reset-stage4.mjs`: passou.
- `node scripts/smoke-local-reset-stage4.mjs`: passou.
- `node scripts/check-id-snapshot.mjs`: passou (1.301 IDs).
- `node scripts/check-catalog-snapshot.mjs`: passou (46 chunks).
- `node scripts/check-editorial-links.mjs`: passou (26 grupos, 28 destinos).
- `node scripts/check-runtime-data.mjs`: passou.

**Pendência:** a instalação `npm install` falhou devido a DNS (`EAI_AGAIN` ao acessar registry.npmjs.org). Assim, não foi possível executar o `npm run build` completo, os testes Vitest ou Playwright localmente. A tentativa de `tsc` sem dependências interrompeu com falta dos tipos do Node (`TS2688`), não sendo uma validação conclusiva de tipos.

## Como aplicar no GitHub

Na cópia local versionada do projeto, substitua somente `tsconfig.tests.json` e `tests/unit/remote-reset-protocol.test.ts` pelas versões corrigidas. No VS Code, revise as diferenças, faça commit e envie pelo botão **Sync Changes**. O Netlify conectado ao GitHub tentará o build novamente.

Para testar localmente em um ambiente com acesso ao npm:

```bash
npm install
npm run typecheck
npm run reset:local-smoke
npm run reset:smoke
npm run build
```

Não habilite `SPIDER_REMOTE_RESET_VERIFIED` sem homologação real do Supabase.
