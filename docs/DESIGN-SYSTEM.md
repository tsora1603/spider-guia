# SPIDER·GUIA — Sistema de design (Etapa 4)

## Princípios

O sistema preserva Bangers para títulos de identidade e Inter/system-ui para leitura. Tokens são semânticos: componentes não escolhem cores por tema; consomem `--page`, `--surface-*`, `--text-*`, `--border-*`, `--primary`, `--link`, `--success`, `--warning` e `--danger`. Tema, escala e modo foco ficam em `aranha-design-preferences-v1`.

## Tokens

- **Cor:** superfícies `page/1/2/control/inset/field/hover/dialog`, texto `text/muted/soft/subtle`, bordas, primary/accent/link e estados success/warning/danger.
- **Espaço:** `--space-1/2/3/4/5/6/8/10`, de 4 a 40 px na escala padrão.
- **Tipografia:** `--font-body`, `--font-display`, `--text-xs/sm/md/lg/xl/2xl/3xl`, com escala raiz compacta/padrão/grande.
- **Raio:** `--radius-xs/sm/md/lg/pill`.
- **Elevação:** `--elevation-1`, `--elevation-2` e `--elevation-focus`.
- **Alvo mínimo:** `--target-min: 2.75rem` (44 px na escala padrão; cresce com fonte grande).

## Temas

`Auto` resolve `prefers-color-scheme` e acompanha mudanças do sistema. `Escuro` e `Claro` fixam o tema. Os pares críticos passam WCAG AA para texto normal: texto principal, texto secundário, links, texto de botão primário e estados semânticos.

## Componentes documentados

### 1. Button (`.btn`, `.btn.g`)
Ação primária e secundária. Altura mínima de 44 px, foco visível de 3 px, estado disabled sem remover o rótulo. Use um único primário por grupo de decisão quando possível.

### 2. Card (`.card`, `.hero`)
Superfície de agrupamento. Usa `surface-1`, `border`, raio médio e elevação 1. `hero` adiciona ênfase por borda primária, sem depender só da cor para significado.

### 3. Tag / Pill (`.tag`, `.pill`)
Metadado curto, nunca ação. `tag.e` representa Essencial; pills de estado combinam texto/ícone e cor. Não usar como único meio de comunicar progresso.

### 4. Search field (`ListSearch`, `.ui-search`) e filtros (`FilterDropdown`)
Busca global/local com alvo >=44 px, placeholder secundário e foco visível. `/` pode focar a busca da tela atual. O componente `ListSearch` usa `type=search`, e `FilterDropdown` unifica o menu acessível em Checklist e Extras: botões reais, `aria-expanded`, `aria-pressed`, teclado (setas, Home, End, Escape, Tab), clique externo, fechamento após escolha, restauração de foco e abertura para cima quando necessário. Não usar `<details>` como dropdown de ação.

### 5. Segmented control (`.seg`)
Alternância entre visões mutuamente exclusivas. Cada botão mantém >=44 px e estado ativo textual/visual. Não usar para ações destrutivas.

### 6. Progress (`.progress-bar`, `.progress-ring`)
`<progress>` nativo para barras e SVG sem estilo inline para o anel. Sempre recebe rótulo acessível; porcentagem também aparece em texto quando relevante.

### 7. Disclosure / Issue row (`details`, `.issue-entry`)
Linha expansível de leitura. Summary >=52 px, estado de progresso em botão separado de 44 px e conteúdo adicional após a divisória. O foco nunca depende de hover.

### 8. Screen state (`.screen-state`)
Padrão único para vazio, carregando e erro. Ícone decorativo + título + mensagem + ação opcional; erros não apagam progresso local.

### 9. Dialog (`dialog`, `.bulk-progress-dialog`, `.onboarding-dialog`)
Modal com título associado, fechamento explícito, ações >=44 px e backdrop. Em 360 px, ações críticas ficam alcançáveis e sem overflow horizontal.

### 10. Navigation (`#nav`, `.side`)
Cinco destinos (Hoje, Checklist, Explorar, Ajuda e Configurações). Mobile: barra inferior fixa com alvo >=56 px. Desktop: rail lateral. Estado atual usa `aria-current="page"` e contraste próprio da superfície de navegação.

## Coesão das listas — auditoria UX Etapa 2

- `ui-list` / `ui-list-item`: superfície, divisórias, raio e elevação do **contêiner**, não de cada linha; densidade e hierarquia da Checklist aplicadas à Jornada, Extras, Clone, Links e Fontes.
- `ui-disclosure-summary`: abertura/fechamento e foco explícitos. Progresso (botão `.ck`) continua fora do `summary`; separar ações de navegação, expansão e progresso.
- `row-body` / `disclosure-content`: continuação da linha, sem superfícies rebaixadas, caixas internas mais escuras, sombras nem bordas concêntricas.
- `tag` e `pill`: mesmo conjunto de estados em todas as listas, sem inventar semânticas de leitura.
- Jornada: marcos como sublinhas separadas por divisórias. Links: destinos reais preservados, sem painel escuro aninhado. Fontes: cada website continua agrupado, com entradas planas e sem borda aninhada. Clone: arcos separados por divisórias discretas.
- Glossário e Metodologia continuam com cartões onde são semanticamente úteis, usando os mesmos tokens.
- Temas escuro/claro/automático, preferências e lógica de progresso não foram alterados; `--surface-expanded` e `--surface-nested` permanecem aliases visuais para compatibilidade histórica, sem aprofundar a cor.

## Modo foco

Quando ativado, a Checklist aplica os filtros/busca normalmente, mas renderiza somente uma edição do resultado por vez. `Anterior` e `Próxima` avançam no recorte atual; `J/K` acionam as mesmas ações. O modo não altera progresso, `readingOrder`, URL canônica nem catálogo.

## Acessibilidade verificada

O checker `npm run stage4:check` reprova `!important`, `style=` em `src`, cores hex fora do arquivo de tokens, ausência de foco global, alvo mínimo, documentação incompleta e contraste abaixo de 4,5:1 nos pares textuais críticos. Playwright cobre tema claro/escuro/auto, persistência, escala grande, foco em 360×740 e dimensões dos principais alvos.
