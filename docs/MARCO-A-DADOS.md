# Marco A — Dados

## Decisão de arquitetura deste marco

O site continua 100% estático e sem build obrigatório para publicação. `data.js` permanece versionado e carregado por `<script>` como hoje, mas passa a ser **gerado** a partir de JSONs sustentáveis em `data/src/`.

A fonte editável usa campos nomeados. Exemplo de item:

```json
{
  "id": 1,
  "historicalNumber": null,
  "type": "Leitura fora da linha",
  "series": "Amazing Fantasy",
  "issue": "#15",
  "phase": "Leitura intercalada",
  "weight": "◐ Contexto",
  "brazilianEdition": "...",
  "instructions": "...",
  "readingOrder": 1,
  "note": ""
}
```

O array posicional só existe no `data.js` gerado por compatibilidade com o payload atual. `app.js` e `validator.js` agora usam os nomes de `DATA.itemFields` para itens, evitando os antigos índices mágicos `row[6]`/`row[9]`; a migração completa do consumidor para TypeScript fica para o Marco B, como solicitado.

## Árvore adicionada

```text
data/
├── schema.mjs
├── snapshots/
│   └── item-ids.json
└── src/
    ├── manifest.json
    ├── catalog/
    │   ├── 001-leitura-intercalada.json
    │   ├── 002-lee-e-ditko.json
    │   ├── ...
    │   └── 046-era-moderna-2026.json
    ├── editorial/
    │   ├── extras.json
    │   ├── clone.json
    │   ├── metodologia.json
    │   ├── changelog.json
    │   └── meta.json
    ├── legacy/
    │   ├── extras.json
    │   └── leituras.json
    ├── fases.json
    ├── marcos.json
    ├── pular.json
    ├── fontes.json
    └── glossario.json
scripts/
├── extract-data.mjs
├── build-data.mjs
├── check-id-snapshot.mjs
├── simulate-progress-migration.mjs
├── verify-legacy-migration.mjs
└── lib/
    └── data-utils.mjs
tests/
└── fixtures/
    └── progress-v1-example.json
docs/
├── MARCO-A-DADOS.md
├── MARCO-A-INCONSISTENCIAS.md
└── MARCO-A-LEGACY-MIGRATION.md
```

## Schemas Zod

`data/schema.mjs` contém schemas para os seis tipos pedidos:

- `ItemSchema`
- `FaseSchema`
- `ExtraSchema`
- `CloneSchema` / `CloneEntrySchema`
- `MarcoSchema`
- `LeituraSchema`

Também há schemas auxiliares para regras de pulo, fontes, glossário, metodologia e changelog, para o build validar todo o material que recompõe `data.js`.

## Scripts

### Extrair a base atual

```bash
node scripts/extract-data.mjs
```

Lê `data.js`, converte itens/fases/marcos/leituras para objetos nomeados e cria os JSONs por `phase`. O snapshot de IDs é preservado se já existir.

Para criar deliberadamente uma nova linha de base de IDs:

```bash
node scripts/extract-data.mjs --reset-snapshot
```

### Validar e gerar `data.js`

```bash
npm run data:build
```

O build usa Zod, valida unicidade de `id` e `readingOrder`, exige `readingOrder` contínuo de `1..N`, valida referências de extras/clone/legado/fontes e então gera o payload compacto. Não existe `1301` fixo no build; `N` é `items.length`.

### Verificação completa do Marco A

```bash
npm run data:check
```

Executa validação sem reescrever `data.js`, compara o snapshot de IDs e simula um progresso no formato antigo.

### Auditar remoção dos legados

A remoção foi concluída no Marco A.1. O comando agora funciona como regressão permanente:

```bash
npm run data:legacy:verify
```

O resultado esperado é `safeToRemoveLegacyModels: true`. Para ver as diferenças intencionais entre o baseline antigo e a projeção canônica atual:

```bash
node scripts/verify-legacy-migration.mjs --details
```

Consulte `docs/MARCO-A1-CONSOLIDACAO.md` e `docs/MARCO-A1-RESOLUCOES.md`.

## Regressão e compatibilidade

A extração foi rodada sobre o `data.js` recebido e o novo build foi comparado estruturalmente com o objeto `DATA` original. Resultado: **round-trip semanticamente idêntico**.

> **Nota A.1:** essa equivalência descreve o estado do Marco A. O Marco A.1 faz mudanças editoriais intencionais e documentadas em `editorial.extras`, mas mantém o catálogo de 1.301 itens, IDs e ordem intactos.

Verificações obtidas neste marco:

```text
Itens:                       1301
IDs únicos:                  1301
readingOrder únicos:         1301
Faixa de readingOrder:       1..1301, sem lacunas
Arquivos de fase/arco:       46
Extras editoriais:           108
Entradas Saga do Clone:      187
Snapshot de IDs:             OK, mesma ordem
IDs duplicados:              nenhum
readingOrder duplicado:      nenhum
readingOrder quebrado:       nenhum
Round-trip data.js:          OK
```

## Simulação de progresso antigo

O fixture contém somente as chaves históricas pré-metadados:

```json
{
  "aranha-progress-v1": {
    "1": "Sim",
    "63": "Pulei",
    "278": "Sim",
    "701": "Sim",
    "1152": "Pulei"
  },
  "aranha-log-v1": {
    "1": 1791331200000,
    "278": 1791417600000,
    "701": 1791504000000
  }
}
```

A simulação confirma que todos os IDs continuam resolvendo no catálogo novo e que o objeto antes/depois é idêntico:

```text
changedValues: 0
droppedIds: []
```

Nenhuma chave de `localStorage` foi alterada no Marco A.
