# Arquitetura e dados

## Visão geral

- **Front-end estático:** Vite + TypeScript + Preact, sem servidor próprio para servir as páginas; Netlify entrega `dist/`.
- **Navegação:** roteador por hash em `src/router/router.ts`, com aliases legados preservados. Cinco destinos: Hoje, Checklist, Explorar, Ajuda e Configurações.
- **Estado/progresso:** `src/state/`, `src/progress/` e persistência local; status individual `Não`, `Sim`, `Pulei` (pulado não equivale a lido).
- **Leitura:** `src/preferences/reading-plan.ts` define o plano da Home e da Checklist; ordenação por `readingOrder`. A divisão editorial em fases/marcos pertence à **Jornada**.
- **Modo Foco:** uma HQ visível por vez, dentro da sequência filtrada; navegação Anterior/Próxima sem reiniciar posição ou reaproveitar status de outra HQ.
- **Conteúdo e pesquisa:** `src/data/`, `src/views/`, `src/components/`. Ícones via `lucide-preact`; sistema de cores e espaçamento em `src/design-system.css`.
- **Conta/sync/reset:** `src/auth/`, `src/sync/`, `src/reset/`; Supabase opcional, com RLS e protocolo de gerações quando migrado.

## Fontes editáveis dos dados

| Caminho                                           | Responsabilidade                                          |
| ------------------------------------------------- | --------------------------------------------------------- |
| `data/src/catalog/`                               | 46 arquivos do catálogo, total de 1.301 leituras          |
| `data/src/editorial/extras.json`                  | 108 fichas de Extras, fontes, posição, peso e confirmação |
| `data/src/editorial/clone.json`                   | Saga do Clone                                             |
| `data/src/editorial/metodologia.json`             | Metodologia editorial                                     |
| `data/src/fases.json`, `data/src/marcos.json`     | Navegação por fases/marcos da Jornada                     |
| `data/src/fontes.json`, `data/src/glossario.json` | Referências e glossário                                   |
| `data/src/editorial/links.json`                                 | Grupos e URLs de Links editoriais (separados de Fontes)   |

`npm run data:build` valida e reconstrói `data.js`, `src/data/chunks/` e os índices `src/data/generated-*`. **Não altere esses artefatos manualmente.** Os IDs existentes e a ordem são preservados por snapshots/checagens e devem continuar estáveis para não quebrar progresso salvo.

## Links editoriais e cobertura

Os destinos externos são editados em `data/src/editorial/links.json`, validados pelo schema Zod em `data/schema.mjs` e pelo modelo semântico `data/link-model.mjs` (compartilhado entre Vite e Node). `npm run data:build` incorpora esses Links em `DATA.editorial.links`; não há scripts globais `links.js`/`link-model.js`. Os tipos ficam em `src/links/types.ts`. Este cadastro é independente das Fontes de pesquisa e da ordem de leitura. **Não converta intervalos numéricos em `itemIds`.**

- `id` e `title` identificam o grupo; `links: [{ label, url }]` representa os destinos. `stores` e `libraries` seguem o mesmo formato.
- `coverage` é uma lista opcional de coberturas: `{ type: 'lgy', ranges: [{ start: 442, end: 499 }] }` para numeração histórica; `{ type: 'series', series: 'Civil War', volume: '2006', ranges: [{ start: 1, end: 2 }] }` para numeração de série/volume; `{ type: 'one-shot', series: 'Nome da HQ', volume: '2020' }` para edição única. Há suporte a vários intervalos e a sufixos (`suffix: 'LR'`). Os rótulos são gerados por `formatCoverage`.
- Cada destino pode declarar sua própria `coverage`, substituindo a cobertura geral do grupo, e `extraId` para substituir a ficha associada (use `null` para nenhum Extra): útil quando uma URL aponta para um Annual e outra para capítulos distintos. A associação com URL não comprova disponibilidade atual do destino.
- `itemIds` é opcional e aponta **somente** para entradas explicitamente relacionadas do catálogo; grupos sem `itemIds` exigem `coverage`. Não deduza IDs de `LGY` ou do número de uma HQ.
- `extraId` aponta diretamente para o campo estável `n` de `data/src/editorial/extras.json`; grupos sem ficha correspondente não recebem esse campo. `readingGroup` permanece temporariamente para compatibilidade com dados históricos e é verificado contra a ficha referida, sem servir como identidade da ficha.
- `notes` contém observações editoriais; não misturar nele intervalos que possam ser representados com cobertura estruturada. `context` de Links históricos ainda é aceito no JSON. As fontes de evidência continuam em `data/src/fontes.json` e no registro bibliográfico `data/src/editorial/publication-evidence.json`.

**Exemplo de novo Link sem enumerar HQs:**

```js
{
  id: 'exemplo-serie',
  title: 'Série Exemplo (2025)',
  coverage: [{ type: 'series', series: 'Série Exemplo', volume: '2025', ranges: [{ start: 1, end: 12 }] }],
  links: [{ label: 'Destino externo', url: 'https://example.org/serie-exemplo' }]
}
```

Os Links originais continuam no mesmo índice e com os mesmos URLs. `npm run links:check` valida associação com IDs existentes, `extraId`, intervalos, URLs, duplicidades e o snapshot `data/snapshots/editorial-links-baseline.json` (sem impedir que novos grupos sejam adicionados ao final). **Divergência preservada:** `leitura-5` originalmente também aponta ao Annual #20 (`itemId: 259`), mas a ficha de Extras #30 contém apenas os IDs 256–258; a ficha independente #38 registra que o Annual não pertence factualmente à Saga do Traje Negro. Por isso, a referência primária do grupo é `extraId: 30` e o vínculo legado com o ID 259 **não foi convertido** em uma associação automática de Extras. A cobertura de cada URL foi declarada separadamente, e o destino específico do Annual #20 aponta à ficha #38. O destino Amazing (2015) #20–24 de `leitura-25` usa `extraId: null`, pois não há uma ficha individual daquela sequência principal. Em `spider-man-2025`, a cobertura numérica registra apenas a edição #29, única edição explicitamente identificada no texto original; o intervalo total do destino não foi presumido.

O catálogo permanece dividido em **46 arquivos de fase/arco**, enumerados em `data/src/manifest.json`, porque essa divisão também determina os chunks carregados sob demanda. O índice gerado (`src/data/generated-index.json`) fornece pesquisa compacta, associação de fase por ID e consulta `catalogLookup.bySeries`; não existe uma segunda base editável de HQs. O campo antigo de publicação brasileira foi removido dos dados ativos. Referências com valor de evidência permanecem em `data/src/editorial/publication-evidence.json` (arquivo de pesquisa não incluído no build), vinculadas a IDs de HQ/Extra e, quando disponíveis, às mesmas posições de `data/src/fontes.json`.

## Extras e confirmação

- **Posição no plano:** 100% respaldada por fontes, sem compensação por dedução.
- **Peso editorial:** pelo menos 60% de suporte factual e até 40% de dedução lógica explicitada. Não é pontuação matemática de links.
- **Confirmado:** somente quando posição e peso cumprem os requisitos. Caso contrário, **Parcial** (ou **A confirmar**, quando usado no cadastro).
- Na **Checklist**, o botão **Mais informações** leva à ficha exata de **Explorar → Extras** quando existe associação por `itemIds`; caso contrário, os detalhes permanecem na Checklist. A consulta editorial fica em Explorar, sem duplicar textos extensos na Checklist.
- Auditoria detalhada e fontes por item: `data/review/extras-confirmacao-60-40.md`.

## Endereços importantes

| Rota                                                                          | Destino                        |
| ----------------------------------------------------------------------------- | ------------------------------ |
| `#hoje`                                                                       | Home / próxima leitura         |
| `#checklist`, `#checklist/hq/:id`                                             | Lista contínua / HQ específica |
| `#explorar/jornada`, `#explorar/extras`, `#explorar/clone`, `#explorar/links` | Descoberta editorial           |
| `#ajuda`, `#ajuda/glossario`, `#ajuda/fontes`, `#ajuda/metodologia`           | Conteúdo de ajuda              |
| `#configuracoes`                                                              | Preferências, conta e dados    |

O roteador interpreta caminhos históricos (`#inicio`, `#ler/*`, `#conta/*` e outros) por aliases. Procure manter esses links em mudanças futuras. Busca e filtros podem ser serializados em parâmetros da URL.

## Qualidade e limites

Vitest (`tests/unit/`) testa lógica; Playwright (`tests/e2e/`) testa interface; `scripts/` reúne validadores e smoke tests. Ver [Manutenção](MANUTENCAO.md). Testes locais simulados não substituem testes reais de Supabase/RLS.
