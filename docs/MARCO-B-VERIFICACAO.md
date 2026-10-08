# Marco B — verificação

## Verificações executadas nesta entrega

### TypeScript

```bash
tsc --noEmit
```

Resultado: **OK**, sem erros.

### Arquitetura

```bash
node scripts/check-b-architecture.mjs
```

Resultado esperado/obtido:

```json
{
  "ok": true,
  "missing": [],
  "forbiddenViewSymbols": [],
  "missingRouterCapabilities": [],
  "missingHistoricalStorageKeys": [],
  "moduleEntryOk": true,
  "generatedDataMatchesCompat": true
}
```


### Router

```bash
node scripts/check-router-contract.mjs
```

Resultado:

```json
{
  "ok": true,
  "checks": {
    "checklistDecodes": true,
    "checklistRoundTrip": true,
    "hqDecodes": true,
    "hqRoundTrip": true,
    "unknownNormalizes": true,
    "linksFlagHonored": true
  }
}
```

O contrato inclui o round-trip literal de `#ler/checklist?f=pendentes&q=clone` e `#hq/123`.

### Migração de storage antigo

Fixture: `tests/fixtures/progress-v1-example.json`.

```bash
node scripts/simulate-b-storage-migration.mjs
```

Resultado:

```json
{
  "ok": true,
  "fromVersion": 0,
  "toVersion": 2,
  "changedValues": 0,
  "droppedIds": [],
  "generatedMetaRecords": 5,
  "logChanged": false
}
```

### Regressão do Marco A/A.1

Foram executados:

```bash
node scripts/check-id-snapshot.mjs
node scripts/check-catalog-snapshot.mjs
node scripts/simulate-progress-migration.mjs
node scripts/migrate-legacy-editorial.mjs --check
node scripts/verify-legacy-migration.mjs
node scripts/check-runtime-data.mjs
```

Resultados:

- 1.301 IDs preservados na mesma ordem;
- 46 arquivos do catálogo preservados byte a byte;
- `changedValues: 0`;
- `droppedIds: []`;
- `safeToRemoveLegacyModels: true`;
- 32 grupos editoriais antigos mapeados;
- 40/40 IDs antigos de detalhes preservados;
- 108 extras editoriais;
- 187 entradas da Saga do Clone;
- 158 fontes;
- zero erros no validator de runtime.

### Sintaxe dos scripts JavaScript/MJS

Todos os arquivos de `public/*.js`, `scripts/*.mjs`, `scripts/lib/*.mjs` e `vite.config.mjs` passaram em `node --check`.

## Limitação do ambiente de execução

O registry do npm não respondeu dentro da janela disponível, portanto a instalação local de Vite/Zod não pôde ser concluída neste ambiente e o comando `vite build` não pôde ser executado aqui.

A parte TypeScript foi validada com `tsc` 5.8.3 disponível no ambiente. Após `npm install` em uma máquina com acesso ao registry, a verificação final é:

```bash
npm run data:check
npm run b:check
npm run build
```

Nenhuma dependência extra foi usada para contornar essa limitação.
