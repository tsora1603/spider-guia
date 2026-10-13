# Sistema visual

Estilos em `src/design-system.css` (tokens/temas) e `src/styles.css` (layout). Use **Bangers** nos títulos, **Inter/system-ui** na interface e ícones de `lucide-preact` via `src/components/Icon.tsx`. O favicon é `public/icon.png`.

## Regras gerais

Use tokens para cores/espaçamento, foco visível, alvos de toque de pelo menos **44 px** e suporte a movimento reduzido. Confira temas claro/escuro/automático e escalas de fonte. Status devem ser reconhecíveis por texto; mantenha estilos inline, cores literais fora dos tokens e `!important` fora da interface.

## Componentes

### 1. Botões e controles (`.btn`, `.seg`)

Uma ação principal por decisão, com estado selecionado, desabilitado, carregando ou erro.

### 2. Cartões e metadados (`.card`, `.hero`, `.tag`, `.pill`)

Agrupe conteúdo com superfícies simples; etiquetas descrevem informações.

### 3. Busca e filtros (`ListSearch`, `FilterDropdown`)

Preserve foco, navegação por teclado e fechamento por Escape/clique externo.

### 4. Progresso e leituras (`.progress-bar`, `.progress-ring`, `.issue-entry`)

Distinga **Não / Sim / Pulei**. Marcar fica à esquerda e Pular à direita; **Mais informações** permanece visível quando existe ficha extra.

### 5. Navegação (`#nav`, `.side`)

Cinco destinos: Hoje, Checklist, Explorar, Ajuda e Configurações. Barra inferior no celular e navegação lateral no desktop.

### 6. Estados da tela (`.screen-state`)

Carregamento, vazio e erro oferecem uma próxima ação e preservam o progresso.

### 7. Modais (`dialog`)

Associe título, contenha/restaure foco e mantenha ações acessíveis em telas pequenas.

### 8. Checklist e Modo Foco

Agrupe apenas trechos consecutivos da mesma série. O Foco segue o mesmo plano, uma leitura por vez. **Ler** fica no título do grupo; **Sem link** fica desabilitado. Cada leitura mantém seu próprio status.

## Validação

`npm run stage4:check` verifica tokens, contraste AA, componentes e alvos de toque. Confira também responsividade e comportamento no navegador conforme [Manutenção](MANUTENCAO.md#comandos-úteis).
