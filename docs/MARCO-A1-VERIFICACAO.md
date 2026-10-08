# Marco A.1 — verificação executada

Data: 07/10/2026

## Checks executados neste ambiente

### Sintaxe Node/JavaScript

Executado `node --check` sobre:

- `app.js`
- `validator.js`
- `spoilers.js`
- `links.js`
- `config.js`
- todos os `scripts/*.mjs`
- todos os `scripts/lib/*.mjs`
- `data/schema.mjs`

Resultado: **OK**.

### Snapshot de IDs

```text
Snapshot de IDs OK: 1301 IDs preservados na mesma ordem.
```

### Snapshot integral do catálogo

```text
Snapshot do catálogo OK: 46 arquivos preservados byte a byte.
```

O snapshot SHA-256 foi capturado a partir do Marco A anterior à consolidação A.1.

### Compatibilidade de progresso antigo

```json
{
  "ok": true,
  "storageKeysPreserved": [
    "aranha-progress-v1",
    "aranha-log-v1"
  ],
  "progressEntries": 5,
  "logEntries": 3,
  "changedValues": 0,
  "droppedIds": []
}
```

As chaves auxiliares `aranha-progress-meta-v2` e `aranha-sync-queue-v1` também não foram renomeadas no runtime.

### Migração editorial

```text
Migração editorial A.1 já aplicada e consistente.
```

### Remoção dos modelos legados

```text
safeToRemoveLegacyModels: true
mappedReadingGroups: 32
legacyDetailIdsPreserved: 40/40
intentionalReadingDifferences: 60
intentionalDetailDifferences: 7
```

Todos os checks internos do verificador retornaram `ok: true`, incluindo:

- zero referências editoriais órfãs;
- zero `itemIds` duplicados entre `editorial.extras`;
- Saga do Clone separada em 150 entradas no card e 187 na rota completa;
- Annual #20 sem associação duplicada;
- Annual #5/Annual #20 com divergências cronológicas explicitadas sem reordenar o catálogo;
- `data/src/legacy/` ausente;
- runtime sem `DATA.extras`, `DATA.leituras` ou `legacyN`;
- `data.js` sem os modelos legados no topo.

### Validator do runtime

O `data.js` gerado foi carregado em um contexto Node `vm` junto de `links.js` e `validator.js`.

```json
{
  "ok": true,
  "errors": [],
  "summary": {
    "items": 1301,
    "idsUnique": 1301,
    "readingOrdersUnique": 1301,
    "extras": 108,
    "cloneEntries": 187,
    "linkGroups": 26,
    "sources": 158
  }
}
```

## Limitação do ambiente

O registry do npm não ficou acessível neste ambiente durante a execução, então não foi possível concluir `npm install` e, consequentemente, executar aqui o `scripts/build-data.mjs` com a cópia instalada do Zod.

O código do build e do schema passou por `node --check`; as invariantes independentes de dependências foram executadas; e o `data.js` desta entrega foi atualizado a partir das mesmas fontes canônicas e da mesma projeção do build, com as invariantes estruturais verificadas antes da escrita.

Em um ambiente com acesso ao npm, a verificação final reproduzível é:

```bash
npm install
npm run data:build
npm run data:check
npm run lint
npm run format:check
```

`npm run data:check` também valida com Zod a projeção derivada dos 32 cards (`LeituraSchema`), além de `ItemSchema`, `FaseSchema`, `ExtraSchema`, `CloneSchema` e `MarcoSchema`.
