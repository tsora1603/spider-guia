# Validação da migração CI/CD — GitHub + Netlify

Base: `spider-guia-refactor-checklist-sequencia-home(1).zip`.

## Verificações executadas neste ambiente

- PASS: `node scripts/check-e-quality.mjs` — CI só testa, Netlify publica.
- PASS: verificações estáticas de navegação, UI Etapa 2, checklist Etapa 3, UX Etapa 5, qualidade Etapa 7 e lista de Links.
- PASS: `npm run data:ids` — 1.301 IDs na ordem original.
- PASS: `npm run data:catalog` — 46 chunks consistentes com as fontes.
- PASS: `npm run links:check` — 26 grupos e 28 URLs atuais.
- PASS: testes adversariais temporários de Links — link novo válido aceito; URL `javascript:` e ID inexistente rejeitados, com `public/links.js` restaurado integralmente.
- PASS: `npm run reading-sequence:check` — 14 verificações locais.
- PASS: `npm run reset:local-smoke` e `npm run reset:smoke`.
- PASS: `node --check` dos scripts alterados.
- `npm run e:check`: as verificações antes do lint passaram; execução interrompida em `eslint: not found`, porque o ambiente não possui dependências npm.
- `npm install --no-audit --no-fund`: falhou com `EAI_AGAIN` (sem DNS do registro npm).
- **Não foram executados:** `tsc`, Vitest, Playwright, build Vite, testes de Supabase remoto ou deploy real em GitHub/Netlify neste ambiente.

O atributo de formulário foi corrigido de `spellCheck` para `spellcheck` no código fonte. Sua compilação TypeScript precisa ser confirmada pela execução do job no GitHub.

## Preservação

- Catálogo, ordem e IDs existentes permanecem iguais no ZIP entregue.
- Links editoriais existentes e seus URLs permanecem iguais.
- Sincronização, resets, storage e regras de Supabase não foram alterados.
- `docs/ETAPA2-PRESERVACAO.json`, `docs/ETAPA7-BASELINE-INTEGRIDADE.json` e o snapshot histórico do catálogo permanecem apenas como documentos de auditoria, não como bloqueios do CI.
- O GitHub Actions executará `npm run data:build` **antes** de `npm run e:check` em um runner Node 24 com dependências instaladas.
