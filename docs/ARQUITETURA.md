# Arquitetura e dados

Site estático em **Vite + TypeScript estrito + Preact**, publicado pelo GitHub Pages. `data/src/` é a fonte editorial; `npm run data:build` gera `data.js`, índices e chunks em `src/data/`. `npm run build` produz `dist/`.

## Mapa do código

| Área                                       | Local                                                |
| ------------------------------------------ | ---------------------------------------------------- |
| Inicialização e fachada de compatibilidade | `src/runtime/controller.ts`                          |
| Rotas por hash                             | `src/router/router.ts`                               |
| Telas e componentes                        | `src/views/`, `src/components/`                      |
| Plano compartilhado por Home e Checklist   | `src/preferences/reading-plan.ts`                    |
| Estado, progresso e backup                 | `src/state/`, `src/progress/`                        |
| Login, sincronização e reset               | `src/auth/`, `src/sync/`, `src/reset/`               |
| Validação editorial                        | `data/schema.mjs`, `data/link-model.mjs`, `scripts/` |

`sync/progress-pages.ts` centraliza a consulta paginada por conta usada pela sincronização protegida e pela reconexão; resultados incompletos ou inválidos interrompem a operação.

O controlador inicializa o aplicativo; as operações ficam em `auth/auth-session.ts`, `progress/*actions.ts`, `reset/device-actions.ts` e `runtime/sync-service.ts`. Serviços não importam o controlador. `npm run architecture:check` verifica dependências e ciclos de execução.

Os tipos editoriais derivam de `data/schema.mjs`. O índice mantém IDs e associações; `loadEditorialDetails()` carrega textos de Extras, Clone e Ajuda antes de exibir as seções. O SDK Supabase também usa importação dinâmica, com versão fixada no npm.

Os arquivos do catálogo são listados em `data/src/manifest.json`. Os arquivos gerados não são editáveis. **IDs e `readingOrder` devem permanecer estáveis**: alterações podem exigir migração de progresso e revisão dos snapshots.

## Links editoriais e cobertura

`data/src/editorial/links.json` é a fonte dos destinos e associações. Cada grupo tem `id`, `title` e `links: [{ label, url }]`; `stores` e `libraries` são opcionais.

`coverage` descreve o conteúdo do card. Aceita `lgy` com intervalos históricos, `series` com nome/volume/intervalos, ou `one-shot` com nome/volume. Intervalos usam `{ "start": 1, "end": 3 }`; séries podem ter `suffix`. Um destino pode declarar cobertura própria.

**`targets` cria as associações dos botões:**

| Tipo            | Exemplo                                                           | Identificador                               |
| --------------- | ----------------------------------------------------------------- | ------------------------------------------- |
| HQ ou volume    | `{ "kind": "items", "ids": [1302] }`                              | `id` do catálogo ou `checklistId` do volume |
| Linha principal | `{ "kind": "historical", "ranges": [{ "start": 1, "end": 10 }] }` | LGY; seleciona apenas itens `Principal`     |
| Extra           | `{ "kind": "extra", "id": 30 }`                                   | `n` de `extras.json`                        |
| Arco do Clone   | `{ "kind": "cloneArc", "id": "saga-do-clone-original-1975" }`     | `arcId` de `clone.json`                     |

Confirme a correspondência antes de usar os exemplos. Números de edição não são IDs. Sem `targets`, o grupo precisa de `coverage` e aparece somente na aba Links. `extraTarget` em um destino substitui a ficha associada; `null` a suprime. Títulos e coberturas não criam vínculos automaticamente.

Volumes Panini exigem um alvo `items` com o `checklistId` do volume exato. Links das HQs americanas ou dos arcos não ativam o botão do encadernado; sem destino próprio, ele mostra **Sem link**.

Os botões **Ler** da Checklist reúnem os destinos do grupo de leituras. `#explorar/links?link=<id>` abre um card; o parâmetro `from` guarda a rota para **Voltar à leitura**. O histórico restaura posição/filtros sem alterar progresso.

Fontes de pesquisa ficam em `data/src/fontes.json`. Evidências brasileiras ficam em `data/src/editorial/publication-evidence.json`, fora do build. Para editar destinos e preservar o baseline, siga [Manutenção](MANUTENCAO.md#como-adicionar-ou-modificar-links).

## Extras e confirmação

A política de confirmação exige respaldo documental da posição e peso; critérios em `data/src/editorial/meta.json` e evidências em `data/review/`. `itemIds` vincula a leitura à ficha exibida em **Mais informações**.

## Guia brasileiro da Saga do Clone

Edite `guide` em `data/src/editorial/clone.json`. A base é **A Saga do Clone 1–18**, seguida de **Ben Reilly 1**, todos inteiros e em sequência. As leituras restantes começam em Cyberwar; HQs já cobertas, como New Warriors #66, não retornam ao roteiro.

Passos têm IDs estáveis, `itemIds` para cobertura e `arcIds` para links. `entries` preserva referências anteriores. Ao corrigir uma edição, documente contos ausentes e dúvidas de cobertura, preserve IDs e gere os dados novamente. O schema valida ordem, unicidade e referências.

## Checklist com volumes Panini

`src/data/checklist-catalog.ts` substitui 84 HQs pelos 19 volumes. Os IDs **1302–1320** são reservados aos `checklistId` dos volumes; altere a cobertura nos `itemIds` do passo em `clone.json`.

| Coleção do modelo   | Conteúdo                                                          |
| ------------------- | ----------------------------------------------------------------- |
| `catalogReadings`   | 1.301 HQs históricas                                              |
| `readings`          | 1.320 registros para backup/sync, incluindo os volumes            |
| `checklistReadings` | 1.236 leituras visíveis; usadas por Home, Checklist, Foco e busca |

Volumes têm marcações próprias; HQs antigas não os concluem automaticamente. Backups antigos com as 1.301 HQs continuam aceitos e preservam as marcações atuais dos volumes. Links para HQs substituídas abrem o volume correspondente. “Já li até” usa somente HQs principais visíveis; volumes exigem marcação explícita.

## Endereços importantes

| Rota                                                                | Destino                                          |
| ------------------------------------------------------------------- | ------------------------------------------------ |
| `#hoje`                                                             | Próxima leitura                                  |
| `#checklist`, `#checklist/hq/:id`                                   | Lista ou leitura específica                      |
| `#explorar/jornada`, `extras`, `clone`, `links`                     | Seções de Explorar; cada nome segue `#explorar/` |
| `#ajuda`, `#ajuda/glossario`, `#ajuda/fontes`, `#ajuda/metodologia` | Ajuda                                            |
| `#configuracoes`                                                    | Plano, aparência, conta e dados                  |

Preserve aliases antigos como `#inicio`, `#ler/*` e `#conta/*`. Testes de lógica ficam em `tests/unit/`, de interface em `tests/e2e/` e de hospedagem em `tests/hosting/`.

## Compatibilidades ainda em uso

- `src/router/router.ts` e `views/explore-navigation.ts` aceitam URLs antigas e alvos numéricos.
- `state/storage-migrations.ts` lê versões anteriores do progresso; `progress/backup.ts` aceita backups do catálogo anterior aos volumes Panini. Chaves `aranha-*` continuam em uso.
- `setup.sql` continua como etapa inicial do banco; aplique depois a migração de `supabase/migrations/`. O cliente exige as RPCs do protocolo protegido, sem fallback para escrita direta. Consulte [Supabase](SUPABASE-E-SEGURANCA.md).
- `data.js`, `generated-data.json`, `public/validator.js` e os baselines editoriais continuam servindo à validação/compatibilidade. O catálogo completo não é importado pelo bundle inicial; o validador global ainda é carregado pelo HTML e usado com `?debug=1`.
- `data/src/pular.json` também segue no contrato gerado/validador, embora não tenha tela própria.
- O controlador mantém a fachada de exports; `FilterDropdown` controla os filtros em Preact.

A cobertura #1–#1000 continua sendo um contrato editorial validado no build. Os limites da interface e das ações derivam do índice em `data/historical-range.mjs`. Volumes declaram `publication: { series, issue }` junto a `checklistId` em `clone.json`; a Checklist usa esses campos, preservando os IDs. Links vêm de `links.json`.
