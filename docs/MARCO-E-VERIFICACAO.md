# Marco E — Verificação

## Executado neste ambiente

Passaram sem depender de download npm:

```text
scripts/check-e-quality.mjs                 OK
snapshot de IDs                             1301 / 1301 OK
snapshot SHA-256 do catálogo                46 / 46 OK
simulação histórica A.1                     changedValues 0; droppedIds []
simulação de storage B                      changedValues 0; droppedIds []; logChanged false
verificação de legado                       safeToRemoveLegacyModels true
validator runtime                           0 erros
Checklist C                                 1301 itens / 46 grupos OK
arquitetura de spoilers D                   OK
conteúdo declarativo de spoilers D          OK
node --check nos scripts/configs JS/MJS      OK
parse JSON/TOML/YAML                         OK
sintaxe TypeScript/TSX (34 arquivos)          0 erros
```

O checker do Marco E reportou:

```json
{
  "ok": true,
  "staticHosting": true,
  "unitSuites": 4,
  "e2eCriticalFlows": 5,
  "githubPages": true,
  "netlify": true,
  "runtimeDependencies": ["preact"]
}
```

## Não executado por limitação externa

`registry.npmjs.org` retornou `EAI_AGAIN`. Consequentemente não foi possível instalar localmente Vitest, Playwright, `typescript-eslint` e as versões declaradas de Vite/Zod/Preact para executar:

```text
npm run test:unit
npm run test:e2e
npm run lint (com parser TypeScript novo)
npm run typecheck (com types das novas dependências)
npm run build
```

Esses passos estão codificados no GitHub Actions e nos comandos locais. O Playwright segue a recomendação de CI de instalar browser/dependências com `playwright install --with-deps` e usa um worker no CI.

## Critério de aceite em ambiente com npm

```bash
npm install
npx playwright install --with-deps chromium
npm run e:check
npm run test:e2e
npm run build
```

Todos devem retornar exit code 0 e `dist/` deve conter o site estático.
