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

| Caminho | Responsabilidade |
| --- | --- |
| `data/src/catalog/` | 46 arquivos do catálogo, total de 1.301 leituras |
| `data/src/editorial/extras.json` | 108 fichas de Extras, fontes, posição, peso e confirmação |
| `data/src/editorial/clone.json` | Saga do Clone |
| `data/src/editorial/metodologia.json` | Metodologia editorial |
| `data/src/fases.json`, `data/src/marcos.json` | Navegação por fases/marcos da Jornada |
| `data/src/fontes.json`, `data/src/glossario.json` | Referências e glossário |
| `public/links.js` | Grupos e URLs de Links editoriais (separados de Fontes) |

`npm run data:build` valida e reconstrói `data.js`, `src/data/chunks/` e os índices `src/data/generated-*`. **Não altere esses artefatos manualmente.** Os IDs existentes e a ordem são preservados por snapshots/checagens e devem continuar estáveis para não quebrar progresso salvo.

## Extras e confirmação

- **Posição no plano:** 100% respaldada por fontes, sem compensação por dedução.
- **Peso editorial:** pelo menos 60% de suporte factual e até 40% de dedução lógica explicitada. Não é pontuação matemática de links.
- **Confirmado:** somente quando posição e peso cumprem os requisitos. Caso contrário, **Parcial** (ou **A confirmar**, quando usado no cadastro).
- Na **Checklist**, o botão **Mais informações** leva à ficha exata de **Explorar → Extras** quando existe associação por `itemIds`; caso contrário, os detalhes permanecem na Checklist. A consulta editorial fica em Explorar, sem duplicar textos extensos na Checklist.
- Auditoria detalhada e fontes por item: `data/review/extras-confirmacao-60-40.md`.

## Endereços importantes

| Rota | Destino |
| --- | --- |
| `#hoje` | Home / próxima leitura |
| `#checklist`, `#checklist/hq/:id` | Lista contínua / HQ específica |
| `#explorar/jornada`, `#explorar/extras`, `#explorar/clone`, `#explorar/links` | Descoberta editorial |
| `#ajuda`, `#ajuda/glossario`, `#ajuda/fontes`, `#ajuda/metodologia` | Conteúdo de ajuda |
| `#configuracoes` | Preferências, conta e dados |

O roteador interpreta caminhos históricos (`#inicio`, `#ler/*`, `#conta/*` e outros) por aliases. Procure manter esses links em mudanças futuras. Busca e filtros podem ser serializados em parâmetros da URL.

## Qualidade e limites

Vitest (`tests/unit/`) testa lógica; Playwright (`tests/e2e/`) testa interface; `scripts/` reúne validadores e smoke tests. Ver [Manutenção](MANUTENCAO.md). Testes locais simulados não substituem testes reais de Supabase/RLS.
