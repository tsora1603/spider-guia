# Marco D — verificação

## Executado neste ambiente

Passaram:

- snapshot de 1.301 IDs na mesma ordem;
- snapshot SHA-256 dos 46 arquivos de catálogo;
- simulação de progresso antigo: `changedValues: 0`, `droppedIds: []`;
- migração de storage do Marco B: quatro chaves históricas preservadas;
- `safeToRemoveLegacyModels: true`;
- validator runtime: 1.301 itens, 108 extras, 187 entradas da Saga do Clone, 158 fontes, zero erros;
- contrato do router, inclusive `#hq/123` e query da Checklist;
- checks arquiteturais B/C adaptados ao estado pós-D;
- checker D: runtime sem heurística/audit/HTML injetado/gates por área;
- checker D de dados: 215 campos explicitamente migrados e 292 sugestões pendentes;
- `tsc --noEmit` com declarações temporárias mínimas de Preact apenas para esta execução; as declarações foram removidas antes da entrega.

## Limitação ambiental

`npm install` não concluiu porque o registry npm não respondeu dentro da janela disponível. Por isso não foi possível executar aqui o `vite build`, Prettier, ESLint nem o `data:build` com o Zod real instalado.

Nenhuma dependência foi vendorizada ou substituída para contornar essa limitação.

## Comandos para aceite local

```bash
npm install
npm run spoilers:explicit:check
npm run spoilers:suggest
npm run d:architecture:check
npm run d:spoilers:check
npm run d:regression:check
npm run d:check
npm run data:check
npm run format:check
npm run lint
npm run build
npm run preview
```

`npm run spoilers:suggest` apenas regera os arquivos de revisão; ele não edita os dados canônicos.
