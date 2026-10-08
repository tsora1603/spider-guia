# Marco E — Qualidade, CI e deploy estático

## Escopo

O Marco E adiciona testes automatizados e CI sem alterar os contratos funcionais fechados nos Marcos A.1–D. O runtime de produção continua contendo apenas Preact e assets estáticos gerados pelo Vite.

## Vitest

Arquivos:

- `tests/unit/state.test.ts` — migração v0/v1, chaves históricas, tombstone e batching;
- `tests/unit/sync-merge.test.ts` — precedência por `updated_at`, incluindo desmarcação offline;
- `tests/unit/router.test.ts` — filtro/busca em URL, deep-link e feature flag de Links;
- `tests/unit/schema.test.ts` — validação Zod dos 46 arquivos do catálogo e dos modelos editoriais.

O teste de estado usa `localStorage` em memória e não exige DOM emulator; por isso não foi adicionada dependência como jsdom/happy-dom.

## Playwright

`tests/e2e/spider-guia.spec.ts` cobre:

1. marcar HQ e persistir `aranha-progress-v1`;
2. pular HQ essencial somente depois do diálogo;
3. revelar spoiler forte apenas em nível `Tudo`;
4. sair da conta mantendo exatamente o progresso local;
5. continuar marcando HQ offline.

A suíte intercepta Google Fonts e Supabase CDN. O caso de logout injeta um cliente Supabase fake em memória com `getSession`, `onAuthStateChange`, `signOut`, `select` e `upsert`. Nenhum segredo é necessário.

O `playwright.config.ts` sobe `npm run build` + `npm run preview`; portanto E2E roda contra o artefato de produção, não contra uma view simulada.

## ESLint + TypeScript

O ESLint existente só cobria JS/MJS. O Marco E adiciona `typescript-eslint` para analisar `src/**/*.{ts,tsx}`, testes e arquivos de configuração. `tsconfig.tests.json` separa a tipagem de testes/configs da tipagem do app.

## GitHub Actions

Um único workflow encadeia:

```text
quality → e2e → build → deploy-pages
```

O deploy só existe em `push` para o branch padrão do repositório. Pull requests executam todas as verificações e o build, mas não publicam.

Actions usadas:

- `actions/checkout@v7`;
- `actions/setup-node@v7`;
- `actions/upload-artifact@v5` para relatório Playwright;
- `actions/upload-pages-artifact@v3`;
- `actions/deploy-pages@v5`.

## Hospedagem estática

O contrato é testado por `scripts/check-e-quality.mjs`:

- `vite.config.mjs` mantém `base: './'`;
- output continua `dist/`;
- `netlify.toml` usa `npm run build` e publica `dist`;
- não existe dependência de runtime de servidor;
- o workflow de Pages publica somente `dist/`.

## Lockfile

O ambiente desta geração não conseguia resolver `registry.npmjs.org`, então não foi possível produzir um `package-lock.json` confiável. O workflow suporta o estado atual com fallback para `npm install`; assim que o primeiro `npm install` for executado em ambiente com acesso ao registry, deve-se versionar o lockfile. A partir daí o mesmo workflow passa automaticamente a usar `npm ci`.
