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
| `data/src/editorial/links.json`                   | Grupos e URLs de Links editoriais (separados de Fontes)   |

`npm run data:build` valida e reconstrói `data.js`, `src/data/chunks/` e os índices `src/data/generated-*`. **Não altere esses artefatos manualmente.** Os IDs existentes e a ordem são preservados por snapshots/checagens e devem continuar estáveis para não quebrar progresso salvo.

## Links editoriais e cobertura

Os destinos externos são editados em `data/src/editorial/links.json`, validados pelo schema Zod em `data/schema.mjs` e pelo modelo semântico `data/link-model.mjs` (compartilhado entre Vite e Node). `npm run data:build` incorpora esses Links em `DATA.editorial.links`; não há scripts globais `links.js`/`link-model.js`. Os tipos ficam em `src/links/types.ts`. Este cadastro é independente das Fontes de pesquisa e da ordem de leitura. **Números de edição e LGY não são IDs de progresso:** cadastre o ID real do registro do catálogo após conferir sua identidade e cobertura.

- `id` e `title` identificam o grupo; `links: [{ label, url }]` representa os destinos. `stores` e `libraries` seguem o mesmo formato.
- `coverage` é uma lista opcional de coberturas: `{ type: 'lgy', ranges: [{ start: 442, end: 499 }] }` para numeração histórica; `{ type: 'series', series: 'Civil War', volume: '2006', ranges: [{ start: 1, end: 2 }] }` para numeração de série/volume; `{ type: 'one-shot', series: 'Nome da HQ', volume: '2020' }` para edição única. Há suporte a vários intervalos e a sufixos (`suffix: 'LR'`). Os rótulos são gerados por `formatCoverage`.
- Cada destino pode declarar sua própria `coverage`, substituindo a cobertura geral do grupo, e `extraTarget` para substituir a ficha associada (use `null` para nenhum Extra). A associação com URL não comprova disponibilidade atual do destino.
- `targets` é a fonte única das associações contextuais: `items` recebe IDs do catálogo; `historical` recebe intervalos LGY e seleciona somente itens `Principal`; `extra` recebe o `n` estável de uma ficha; `cloneArc` recebe o `arcId` estável de um arco. Grupos sem `targets` exigem `coverage` e servem apenas como cards de Links.

Os oito grupos das séries principais têm associações explícitas com os registros
`Principal` cobertos: LGY 1–964 e a edição #29 de 2025. Esse cadastro não inclui
anuais ou outras séries por coincidência de numeração. A aplicação continua usando
os alvos `historical` para os botões das edições e a união desses vínculos para cada
dropdown. `coverage` continua sendo apenas apresentação. Os alvos `extra` alimentam os botões das fichas; os alvos `cloneArc` alimentam os destinos dos passos correspondentes no guia brasileiro da Saga do Clone.

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

Os Links originais continuam no mesmo índice e com os mesmos URLs. `npm run links:check` valida IDs de itens, Extras e arcos, intervalos, URLs, duplicidades e o snapshot `data/snapshots/editorial-links-baseline.json`. **Divergência preservada:** `leitura-5` aponta às fichas #30 e #38; a cobertura de cada URL permanece separada, e o destino do Annual #20 usa `extraTarget: 38`. O destino Amazing (2015) #20–24 de `leitura-25` usa `extraTarget: null`, pois não há ficha individual daquela sequência principal. Em `spider-man-2025`, somente a edição #29 tem alvo cadastrado.

O catálogo permanece dividido em **46 arquivos de fase/arco**, enumerados em `data/src/manifest.json`, porque essa divisão também determina os chunks carregados sob demanda. O índice gerado (`src/data/generated-index.json`) fornece pesquisa compacta, associação de fase por ID e consulta `catalogLookup.bySeries`; não existe uma segunda base editável de HQs. O campo antigo de publicação brasileira foi removido dos dados ativos. Referências com valor de evidência permanecem em `data/src/editorial/publication-evidence.json` (arquivo de pesquisa não incluído no build), vinculadas a IDs de HQ/Extra e, quando disponíveis, às mesmas posições de `data/src/fontes.json`.

## Extras e confirmação

- **Posição no plano:** 100% respaldada por fontes, sem compensação por dedução.
- **Peso editorial:** pelo menos 60% de suporte factual e até 40% de dedução lógica explicitada. Não é pontuação matemática de links.
- **Confirmado:** somente quando posição e peso cumprem os requisitos. Caso contrário, **Parcial** (ou **A confirmar**, quando usado no cadastro).
- Na **Checklist**, o botão **Mais informações** leva à ficha exata de **Explorar → Extras** quando existe associação por `itemIds`; caso contrário, os detalhes permanecem na Checklist. A consulta editorial fica em Explorar, sem duplicar textos extensos na Checklist.
- Auditoria detalhada e fontes por item: `data/review/extras-confirmacao-60-40.md`.

## Endereços importantes

| Rota                                                                          | Destino                                                                        |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `#hoje`                                                                       | Home / próxima leitura                                                         |
| `#checklist`, `#checklist/hq/:id`                                             | Sequência agrupada por série / HQ específica, com abertura automática do grupo |
| `#explorar/jornada`, `#explorar/extras`, `#explorar/clone`, `#explorar/links` | Descoberta editorial                                                           |
| `#ajuda`, `#ajuda/glossario`, `#ajuda/fontes`, `#ajuda/metodologia`           | Conteúdo de ajuda                                                              |
| `#configuracoes`                                                              | Preferências, conta e dados                                                    |

O roteador interpreta caminhos históricos (`#inicio`, `#ler/*`, `#conta/*` e outros) por aliases. Procure manter esses links em mudanças futuras. Busca e filtros podem ser serializados em parâmetros da URL.

## Qualidade e limites

Vitest (`tests/unit/`) testa lógica; Playwright (`tests/e2e/`) testa interface; `scripts/` reúne validadores e smoke tests. Ver [Manutenção](MANUTENCAO.md). Testes locais simulados não substituem testes reais de Supabase/RLS.

## Guia brasileiro da Saga do Clone

A tela `#explorar/clone` usa `guide` em `data/src/editorial/clone.json`: introdução, blocos, passos, notas de integralidade e fontes. A base tem exatamente A Saga do Clone, volumes 1–18, e Ben Reilly, volume 1, lidos inteiros e em sequência. Os capítulos restantes começam em Cyberwar; New Warriors #66 e outras HQs já cobertas não são reinseridos.

Cada passo possui ID estável, número, edição brasileira ou americana, instrução de leitura, originais de referência, `itemIds` do catálogo e `arcIds` explícitos. A busca abre `#explorar/clone?passo=<id>`, expandindo e focando o passo. Os links de leitura retornam ao mesmo alvo. `CloneGuideSchema` verifica a ordem dos 19 volumes e a unicidade dos passos; `data:build` verifica as referências ao catálogo e aos arcos.

`entries` conserva as referências editoriais anteriores para compatibilidade dos IDs de arcos e dos vínculos existentes; não é o roteiro exibido. Os passos reutilizam as HQs da Checklist, sem novo armazenamento de progresso. O progresso é deduplicado por ID, pois contos de um mesmo número americano podem estar em mais de um volume. Ele não certifica integralidade de uma edição brasileira.

Para corrigir disponibilidade ou cobertura, edite os passos/notas de `guide`, preserve os IDs existentes e gere os dados novamente. Uma correspondência de revista não comprova todos os contos: registre cortes confirmados e dúvidas separadamente. A auditoria bibliográfica fornecida pelo leitor é a base das correspondências brasileiras; a ordem americana é retomada somente após os 19 volumes.
