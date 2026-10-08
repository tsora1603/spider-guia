# Marco C — verificação

## Executado neste ambiente

### `npm run c:check`

Passou nas verificações executáveis disponíveis:

- estrutura Preact presente;
- antigo `app-view.ts` removido;
- nenhum `.innerHTML =` no TypeScript;
- único `dangerouslySetInnerHTML` isolado em `SpoilerText.tsx`;
- subscriptions granulares de progresso;
- canais de rota/sessão/sync separados;
- Checklist agrupada e virtualizada;
- 46 grupos;
- 1.301 itens pertencendo exatamente a um grupo;
- `readingOrder` 1..1301 preservado;
- estado de grupos/itens abertos preservado;
- bridge do deep-link com a virtualização presente.

### Regressões B

`b:storage:compat`:

```text
changedValues: 0
droppedIds: []
logChanged: false
```

`b:router:check`:

```text
checklistDecodes: true
checklistRoundTrip: true
hqDecodes: true
hqRoundTrip: true
unknownNormalizes: true
linksFlagHonored: true
```

### Regressões A/A.1

```text
Snapshot de IDs: 1301 IDs na mesma ordem
Snapshot do catálogo: 46 arquivos byte a byte preservados
safeToRemoveLegacyModels: true
DATA.extras: ausente
DATA.leituras: ausente
legacyN: ausente
validator runtime: 0 erros
```

Resumo do validator:

```text
items: 1301
idsUnique: 1301
readingOrdersUnique: 1301
extras: 108
cloneEntries: 187
linkGroups: 26
sources: 158
```

## TypeScript

A sintaxe e os tipos internos do projeto foram verificados com `tsc --noEmit`. Como o registry npm não resolveu DNS neste ambiente, foram usadas declarações temporárias mínimas dos módulos Preact apenas para permitir que o compilador verificasse o restante da árvore. Essas declarações temporárias **não fazem parte da entrega**.

A validação definitiva com os tipos oficiais do Preact deve ser reproduzida após:

```bash
npm install
npm run typecheck
```

## Limitação ambiental

`npm install` não pôde concluir porque `registry.npmjs.org` não resolveu DNS. Por isso não foi possível executar aqui:

```text
vite build
prettier --check
eslint com as dependências locais
```

Não foi vendorizado Preact nem adicionada dependência alternativa para contornar a rede.

Depois de `npm install`, a sequência de aceite é:

```bash
npm run typecheck
npm run format
npm run format:check
npm run lint
npm run data:check
npm run c:check
npm run build
```

`npm run format` aparece antes de `format:check` porque os novos `.tsx` foram criados sem acesso ao binário local do Prettier neste ambiente.
