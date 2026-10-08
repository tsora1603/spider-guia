# Marco A — remoção dos modelos legados (concluída no Marco A.1)

## Objetivo original

Eliminar `DATA.extras` e `DATA.leituras` quando a UI pudesse consumir somente `DATA.editorial.extras` + `itemIds`, sem alterar IDs, progresso ou conteúdo editorial de forma silenciosa.

## Situação atual

Migração concluída em 07/10/2026.

- `data/src/editorial/extras.json` é o modelo canônico.
- `data/src/legacy/` não existe mais.
- `scripts/build-data.mjs` não gera `DATA.extras` nem `DATA.leituras`.
- `app.js` deriva cards e detalhes diretamente de `editorial.extras`.
- `scripts/verify-legacy-migration.mjs` compara a projeção atual com uma fixture de regressão do modelo anterior.
- `safeToRemoveLegacyModels: true`.

A fixture `tests/fixtures/legacy-editorial-baseline.json` é deliberadamente mantida para regressão e não faz parte do runtime.

## Verificação

```bash
npm run data:migrate:legacy:check
npm run data:legacy:verify
npm run data:ids
npm run data:progress:compat
```

Consulte `docs/MARCO-A1-CONSOLIDACAO.md` e `docs/MARCO-A1-RESOLUCOES.md` para o resultado completo.
