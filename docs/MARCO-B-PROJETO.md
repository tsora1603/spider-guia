# Marco B — Projeto

## Objetivo

Migrar o SPIDER·GUIA pós-Marco A.1 para uma base modular Vite + TypeScript, sem alterar catálogo, IDs, ordem de leitura, dados editoriais ou progresso existente.

## Decisões

### Vite estático

`vite.config.mjs` usa `base: './'`. O build continua sendo um conjunto de arquivos estáticos e o router usa hash, portanto GitHub Pages e Netlify não precisam de fallback de servidor.

### TypeScript modular

O antigo `app.js` foi removido. A camada de visualização atual está em `src/views/app-view.ts`; estado, storage, router e sync foram extraídos para módulos próprios.

Não foi introduzido Preact neste marco. Isso evita misturar a migração arquitetural com a componentização, que pertence ao Marco C.

### Dados

`data/src/` continua sendo a fonte canônica. `scripts/build-data.mjs` agora gera também `src/data/generated-data.json`, consumido pelo bundle TypeScript. `data.js` permanece apenas como artefato de regressão/compatibilidade das ferramentas do Marco A.1; o navegador não o carrega.

### Adaptadores preservados

`links.js`, `spoilers.js` e `validator.js` foram movidos para `public/` e continuam byte-equivalentes ao comportamento anterior. Eles são deliberadamente preservados porque Links não deve ser reeditado neste marco e o sistema de spoilers só será substituído no Marco D.

## Router único

`src/router/router.ts` substitui os antigos:

- `hashForState`
- `canonicalHash`
- `enterTab`
- `navigateHash`
- `applyRoute`
- `handleHashRoute`
- `acceptedHash`

A view não contém nenhum desses símbolos.

O router possui:

- parser de hash;
- serializer canônico;
- navegação programática;
- troca de aba;
- sincronização dos filtros da Checklist para a URL;
- guarda de spoiler por callback;
- deep-link `#hq/<id>`;
- normalização de rotas inválidas.

Estado da checklist é representado na URL. Exemplo:

```text
#ler/checklist?f=pendentes&q=clone
```

## progressStore

`src/state/progress-store.ts` preserva as quatro chaves históricas exatamente como estavam e adiciona somente um marcador de versão independente.

`src/state/storage-migrations.ts` contém a migração versionada:

- v0 → v1: cria `progressMeta` ausente a partir de `aranha-progress-v1`, com `updatedAt: 0`;
- v1 → v2: normaliza a fila persistida;
- reparo idempotente: se um status antigo existir sem metadata, metadata é recriada sem mudar o status.

Nenhuma migração renomeia IDs, reordena HQs ou troca `Sim`/`Pulei`.

## Sync

`src/sync/sync-engine.ts` porta o comportamento estabilizado:

- merge local/remoto por `updated_at`;
- empate com status divergente preserva o local, como na versão estabilizada;
- `Não` continua sendo tombstone sincronizável;
- falha de rede entra em fila persistida;
- backoff exponencial continua limitado;
- pull e push serializado continuam separados;
- logout chama `pause()` e não altera o `progressStore`.

`mergeRecords()` ficou exportado como função pura para ser coberto por Vitest no Marco E.

## Limites intencionais deste marco

A renderização ainda é imperativa e pode reconstruir áreas de DOM. Isso não é uma regressão nova: é a camada visual anterior portada para TypeScript. A substituição por Preact, atualização granular e preservação estrutural de foco/scroll/details pertence ao Marco C.
