# Marco A — inconsistências encontradas (histórico, resolvidas no Marco A.1)

Este relatório registrava o bloqueio deixado pelo Marco A. As inconsistências abaixo foram **resolvidas no Marco A.1**; o registro é mantido para rastreabilidade.

## Estado original

- nenhum ID duplicado no catálogo;
- nenhum `readingOrder` duplicado ou com lacuna;
- sequência principal 1..1301 íntegra;
- 13 dos 32 grupos de `DATA.leituras` divergiam de `editorial.extras`;
- 40 IDs de `DATA.extras` possuíam diferenças de detalhe em relação ao modelo editorial;
- a Saga do Clone misturava a visão de “extras fora da numeração” com a rota dedicada completa;
- o Annual #20 aparecia simultaneamente em um bloco da Saga do Traje Negro e em seu registro próprio.

## Estado após o Marco A.1

```text
safeToRemoveLegacyModels: true
readingGroups: 32/32
legacy detail IDs preservados: 40/40
itemIds duplicados em editorial.extras: 0
DATA.extras: removido
DATA.leituras: removido
data/src/legacy: removido
```

As decisões campo a campo estão em `docs/MARCO-A1-RESOLUCOES.md`.
