# Marco A.1 — consolidação editorial e remoção dos modelos legados

Data: 07/10/2026

## Objetivo

Resolver as divergências deixadas deliberadamente abertas no Marco A, migrar o runtime vanilla para uma única fonte editorial e remover `DATA.extras` / `DATA.leituras` **antes** do Marco B, sem alterar IDs, `readingOrder` ou progresso persistido.

## Resultado

A migração está concluída.

- `data/src/editorial/extras.json` é a única fonte dos cards de “Leituras Extras” e dos detalhes por item.
- `DATA.extras` foi removido do `data.js` gerado.
- `DATA.leituras` foi removido do `data.js` gerado.
- `data/src/legacy/` foi removido.
- `app.js` não referencia `DATA.extras`, `DATA.leituras` ou `legacyN`.
- Os 32 grupos históricos de leitura foram preservados como `readingGroup: 1..32`.
- Os 40 IDs que possuíam detalhes no antigo `DATA.extras` continuam resolvendo no índice derivado de `editorial.extras`.
- Nenhum `itemId` aparece em mais de um registro de `editorial.extras`.
- O catálogo principal não foi alterado: os 46 JSON de `data/src/catalog/` são byte a byte iguais aos do Marco A.
- O snapshot preserva os mesmos 1.301 IDs, na mesma ordem.
- A simulação de progresso antigo retorna `changedValues: 0` e `droppedIds: []`.

## Arquitetura após a consolidação

```text
data/
├── schema.mjs
├── snapshots/
│   └── item-ids.json
└── src/
    ├── manifest.json
    ├── catalog/
    │   └── 46 arquivos por fase/arco
    ├── editorial/
    │   ├── extras.json
    │   ├── clone.json
    │   ├── metodologia.json
    │   ├── changelog.json
    │   └── meta.json
    ├── fases.json
    ├── marcos.json
    ├── pular.json
    ├── fontes.json
    └── glossario.json

scripts/
├── build-data.mjs
├── extract-data.mjs
├── migrate-legacy-editorial.mjs
├── verify-legacy-migration.mjs
├── check-id-snapshot.mjs
├── check-catalog-snapshot.mjs
├── check-runtime-data.mjs
├── simulate-progress-migration.mjs
└── lib/
    ├── data-utils.mjs
    └── editorial-projection.mjs

tests/fixtures/
├── progress-v1-example.json
└── legacy-editorial-baseline.json
```

`legacy-editorial-baseline.json` é somente fixture de regressão. Ele não é carregado pelo site nem publicado em `DATA`.

## Runtime

Os detalhes antes obtidos de `DATA.extras` agora são um índice derivado diretamente de `DATA.editorial.extras` com `flatMap(itemIds)`. Os cards antes obtidos de `DATA.leituras` também são derivados da mesma coleção, filtrando `readingGroup` e projetando os campos esperados pela UI.

O mesmo comportamento é isolado em `scripts/lib/editorial-projection.mjs` para os testes de regressão, sem introduzir uma segunda fonte de dados.

O runtime atual continua em JavaScript puro. Vite, TypeScript e componentes continuam reservados ao Marco B/C.

## Resoluções editoriais relevantes

### Amazing Spider-Man Annual #5 (1968)

As fontes consultadas (Comics Back Issues e Crushing Krisis) convergem em **depois da Amazing #62**, e o GCD confirma a identificação bibliográfica. Porém o catálogo histórico do site já posiciona o ID 63 depois da #61. Como o Marco A exige os mesmos IDs na mesma ordem, o A.1 **não reordena** o item: mantém `after: 61`, marca o registro como `Parcial` e grava a divergência no próprio dado.

Fontes registradas em `data/src/fontes.json`: 62, 63 e 123.

### Saga do Traje Negro / Amazing Spider-Man Annual #20

O bloco editorial da Saga do Traje Negro passa a conter:

- Marvel Team-Up #141–150;
- Marvel Team-Up Annual #7;
- Peter Parker, The Spectacular Spider-Man #90–100.

`Amazing Spider-Man Annual #20` (ID 259) deixa de pertencer ao bloco editorial do traje negro e fica em seu próprio registro. As fontes consultadas o situam no período de 1986, depois da Amazing #282; entretanto o catálogo histórico do site já mantém o ID 259 antes da #252. Reordená-lo quebraria o snapshot exigido pelo Marco A.

Por isso, a associação duplicada foi removida, mas a posição histórica foi preservada (`after: 251`) e marcada como `Parcial`, com a divergência explícita. O ID 259 e seu `readingOrder` permanecem inalterados.

Fontes registradas: How To Love Comics (21), Crushing Krisis (123) e GCD Annual #20 (157).

### Saga do Clone

Dois conceitos estavam fundidos no modelo anterior:

- card de extras da Saga do Clone;
- roteiro dedicado completo da Saga do Clone.

Eles agora ficam separados por finalidade:

- `editorial.extras`, `readingGroup: 12`: **150** entradas fora da numeração histórica;
- `editorial.clone.entries`: **187** entradas do roteiro completo, incluindo contexto, Amazing principal e epílogo.

Não houve exclusão de itens do roteiro dedicado.

### Status “Confirmado” contraditórios

O Marco A continha registros com `confirmation: "Confirmado"` ao mesmo tempo em que a própria `confirmationNote` dizia que o peso ainda não possuía evidência suficiente. A consolidação não manteve essa contradição.

Transições deliberadas:

- 81 registros: `Confirmado` → `Parcial`.

O Annual #5 permanece `Parcial` porque a evidência consultada e a ordem histórica preservada não coincidem.

Isso não altera IDs, ordem ou progresso; altera somente a honestidade do status editorial.

## Compatibilidade com progresso existente

As chaves permanecem:

```text
aranha-progress-v1
aranha-log-v1
aranha-progress-meta-v2
aranha-sync-queue-v1
```

A fixture de progresso antigo é processada sem transformação dos IDs/valores.

Resultado esperado:

```json
{
  "ok": true,
  "changedValues": 0,
  "droppedIds": []
}
```

## Comandos

Instalação das ferramentas de desenvolvimento:

```bash
npm install
```

Verificação completa:

```bash
npm run data:check
```

Verificações específicas:

```bash
npm run data:migrate:legacy:check
npm run data:legacy:verify
npm run data:ids
npm run data:catalog
npm run data:runtime:check
npm run data:progress:compat
```

Gerar novamente `data.js` a partir da fonte canônica:

```bash
npm run data:build
```

Aplicar a migração em uma cópia **pré-A.1** do Marco A:

```bash
npm run data:migrate:legacy
npm run data:build
npm run data:check
```

O script é idempotente no estado A.1 e usa `tests/fixtures/legacy-editorial-baseline.json` para provar a cobertura do modelo antigo mesmo depois da exclusão de `data/src/legacy/`.

## Critérios de aceite

```text
safeToRemoveLegacyModels: true
mappedReadingGroups: 32
legacyDetailIdsPreserved: 40/40
itemIds duplicados em editorial.extras: 0
Saga do Clone (card): 150
Saga do Clone (rota completa): 187
IDs do catálogo: 1301, mesma ordem
arquivos do catálogo: 46/46, SHA-256 idêntico ao Marco A
changedValues: 0
droppedIds: []
DATA.extras publicado: não
DATA.leituras publicado: não
```

## Dependências

Nenhuma dependência nova foi adicionada no Marco A.1. Zod, ESLint e Prettier permanecem as únicas dependências de desenvolvimento introduzidas anteriormente.
