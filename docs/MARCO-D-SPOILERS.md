# Marco D — spoilers declarativos

## Objetivo

Substituir o sistema heurístico do runtime por marcações declarativas no dado, sem alterar catálogo, IDs, progresso, rotas ou sync.

## Arquitetura final

- `src/spoilers/model.ts`: tipos `SpoilerTextValue`, `SpoilerPart`, níveis `leve|forte` e conversão para texto puro.
- `src/spoilers/preferences.ts`: preferência global persistida em `aranha-spoiler-level-v1`.
- `src/components/SpoilerText.tsx`: render Preact sem HTML injetado e controle global `Nenhum / Leve / Tudo`.
- `data/schema.mjs`: `SpoilerTextSchema` aceita campo inteiro ou partes declarativas.
- `scripts/migrate-explicit-spoilers.mjs`: migração idempotente dos campos que já eram explicitamente `strong=true` no Marco C.
- `scripts/suggest-spoilers.mjs`: copia a heurística antiga somente para gerar uma lista de revisão; não é importado pelo site.
- `data/review/spoiler-suggestions.{json,md}`: propostas pendentes de revisão humana.

Foram removidos:

- `public/spoilers.js`;
- `src/runtime/spoilers.ts`;
- regex `hints` do runtime;
- frases literais do runtime;
- `TreeWalker`/audit de DOM;
- `dangerouslySetInnerHTML`;
- três consentimentos/gates por área;
- diálogo `spoilerdlg`;
- `spoilerArea`/`guardSpoiler` do router.

## Formato declarativo

Campo inteiro forte:

```json
{
  "text": "Texto editorial",
  "spoiler": "forte"
}
```

Trechos mistos:

```json
{
  "parts": [
    { "text": "Contexto sem spoiler. " },
    { "text": "Revelação leve", "spoiler": "leve" },
    { "text": " e texto normal. " },
    { "text": "Grande revelação", "spoiler": "forte" }
  ]
}
```

Strings simples continuam válidas e significam conteúdo sem marcação de spoiler.

## Controle global

A preferência possui três valores:

- `nenhum`: oculta `leve` e `forte`;
- `leve`: mostra `leve`, oculta `forte`;
- `tudo`: mostra todos os trechos.

A preferência é global e persistida em `aranha-spoiler-level-v1`.

Migração de preferências antigas: se não existe a nova chave e o usuário já havia aceitado pelo menos um dos três gates antigos, a preferência inicial é `leve`; caso contrário, é `nenhum`. As chaves antigas não são apagadas.

## Migração aplicada sem heurística

Somente campos que o Marco C já ocultava integralmente por decisão explícita da UI (`strong=true`) foram convertidos automaticamente para `spoiler: "forte"`:

- 108 `editorial.extras[].why`;
- 59 `editorial.clone.entries[].note` não vazios;
- 30 `marcos[].description`;
- 18 `fases[].highlights` não vazios.

Essa conversão não usa regex nem decide conteúdo novo; apenas move uma decisão existente da view para o dado.

## Sugestões não aplicadas

`scripts/suggest-spoilers.mjs` replica a heurística que ainda passava por `SpoilerText` no Marco C e gera a lista de revisão.

Resultado atual:

- 292 sugestões;
- 42 sugeridas como `leve`;
- 250 sugeridas como `forte`;
- `appliedAutomatically: 0`;
- todas com `decision: "pending"`.

A lista é deliberadamente conservadora e pode conter falsos positivos. Nenhuma dessas 292 propostas altera o runtime até revisão humana.

## Compatibilidade

O Marco D não altera as chaves de progresso:

```text
aranha-progress-v1
aranha-log-v1
aranha-progress-meta-v2
aranha-sync-queue-v1
```

A nova chave de preferência de spoiler é independente:

```text
aranha-spoiler-level-v1
```

O catálogo continua com 1.301 IDs na mesma ordem e os 46 arquivos de catálogo permanecem byte a byte iguais ao snapshot do Marco A.1.
