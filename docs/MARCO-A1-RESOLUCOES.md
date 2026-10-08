# Marco A.1 — registro das resoluções de inconsistências

Este documento registra as decisões aplicadas pela migração. O objetivo é impedir que diferenças entre o modelo legado e o modelo editorial sejam resolvidas de forma implícita.

## 1. `DATA.leituras` x `editorial.extras`

Os 32 grupos legados passam a ser representados por `readingGroup: 1..32` em `editorial.extras`.

| Grupo | Divergência anterior | Resolução A.1 |
| --- | --- | --- |
| 2 | `after`, `why`, `brazilianEdition` | Fontes indicam depois da #62, mas o catálogo permanece depois da #61 para preservar o snapshot; status `Parcial`; edição BR = `a confirmar`. |
| 3 | `sourceRefs` | Fontes unificadas em `src`; status geral conservador = `Parcial`. |
| 5 | `brazilianEdition`, fontes e composição | Annual #20 removido do bloco; ficam MTU #141–150 + Annual #7 e Spectacular #90–100; edição BR = `a confirmar`. |
| 7 | `brazilianEdition` | Valor legado `Confirmado` não era uma edição; normalizado para `a confirmar`. |
| 9 | nome, `why`, `brazilianEdition` | Nome explicita “a lua de mel”; justificativa consolidada; edição BR = `a confirmar`. |
| 12 | `howMuch`, `itemIds` | Card = 150 itens fora da numeração; rota `editorial.clone` = 187 entradas completas. |
| 17 | `brazilianEdition` | Campo canônico preservado; sem dado de fonte colocado em campo de edição. |
| 21 | `howMuch`, `brazilianEdition` | Texto normalizado; edição BR = `a confirmar`; status `Parcial`. |
| 22 | `brazilianEdition` | `a confirmar`. |
| 25 | `brazilianEdition` | Campo canônico preservado sem copiar nota de fonte indevida. |
| 26 | `brazilianEdition` | `a confirmar`. |
| 30 | `brazilianEdition` | `a confirmar`. |
| 32 | `brazilianEdition` | `a confirmar`. |

`sourceRefs` deixou de existir no schema canônico. Todas as referências de fonte vivem em `src`.

## 2. `DATA.extras` x `editorial.extras`

Os 40 IDs do antigo mapa de detalhes continuam acessíveis por meio de um índice derivado de `editorial.extras`. Nenhum desses IDs foi removido.

A migração preserva o detalhe legado quando ele é mais conservador que o registro editorial. Quando a divergência era uma contradição entre “Confirmado” e uma nota dizendo que faltava evidência do peso, prevalece `Parcial`.

Há 7 diferenças intencionais no snapshot normalizado de detalhes. Elas se concentram nas correções verificadas do Annual #5, no bloco da Saga do Traje Negro e no Annual #20.

## 3. Duplicação de `itemIds`

Antes da consolidação existiam duas associações editoriais duplicadas relevantes:

- ID 152 aparecia tanto no registro próprio de What If? #30 quanto no bloco amplo da Saga do Clone;
- ID 259 aparecia tanto no bloco da Saga do Traje Negro quanto no registro próprio do Annual #20.

Depois da consolidação, `editorial.extras` exige associação única por `itemId` e o build/verificador rejeitam qualquer duplicação.

A rota dedicada `editorial.clone.entries` não está sujeita a essa regra porque é uma visão de roteiro e pode referenciar itens que também têm registros editoriais próprios.

## 4. Evidência adicionada/corrigida

- Fonte 62: descrição corrigida para refletir o que a própria ordem consultada mostra: Annual #5 **depois da #62**.
- Fonte 157: GCD do Amazing Spider-Man Annual #20 (1986), adicionada como evidência bibliográfica/data.
- Nos dois casos, a evidência externa é registrada mesmo quando a ordem histórica do catálogo é preservada por compatibilidade.

## 5. Regras de segurança implementadas

`scripts/verify-legacy-migration.mjs` falha se qualquer uma destas condições voltar a ocorrer:

- grupos 1..32 incompletos;
- ID antigo de detalhes sem resolução;
- referência editorial órfã;
- `itemId` duplicado entre `editorial.extras`;
- Saga do Clone sem a separação 150/187;
- Annual #20 duplicado no bloco do traje negro ou sem o marcador de divergência/compatibilidade;
- Annual #5 sem a posição histórica/estado `Parcial` esperados;
- diretório `data/src/legacy` presente;
- runtime usando `DATA.extras`, `DATA.leituras` ou `legacyN`;
- `data.js` publicando os modelos removidos.

A saída final deve conter:

```text
safeToRemoveLegacyModels: true
```
