# Sistema visual do SPIDER·GUIA

Fonte de verdade de estilo: `src/design-system.css` (tokens/temas) e `src/styles.css` (componentes/layout). Esta página documenta padrões em uso, não etapas históricas.

## Princípios

- Identidade com **Bangers** (títulos) e **Inter/system-ui** (interface), tema escuro/claro/automático e escalas de fonte.
- Tokens semânticos para superfícies, texto, bordas e estados (`--primary`, `--success`, `--warning`, `--danger` etc.); sem cor literal ou `!important` fora das regras previstas.
- Áreas clicáveis de pelo menos **44 px** (`--target-min: 2.75rem`), foco visível, contraste adequado e suporte a movimento reduzido.
- Ícones de interface de **`lucide-preact`** por meio de `src/components/Icon.tsx`. O favicon `public/icon.svg` é independente.
- Estados de progresso **Não / Sim / Pulei** sempre distinguíveis também por texto, não somente por cor.

## Componentes

### 1. Botão (`.btn`)
Uma ação principal por conjunto decisório; feedback de disabled/loading/erro e foco de teclado claro.

### 2. Cartão (`.card`, `.hero`)
Agrupamento sem inventar fundos aninhados; a Home privilegia espaço contínuo, não mosaico de cartões.

### 3. Etiqueta (`.tag`, `.pill`)
Metadados de peso/estado com rótulo legível. Não usar tag como botão.

### 4. Busca e filtros (`ListSearch`, `FilterDropdown`)
Controle acessível: teclado, Escape, clique externo, foco preservado e feedback após escolher opção.

### 5. Controle segmentado (`.seg`)
Alternância entre vistas mutuamente exclusivas, com estado selecionado reconhecível.

### 6. Progresso (`.progress-bar`, `.progress-ring`)
Resumo acessível por texto; leituras puladas não são contadas como lidas.

### 7. Linha de HQ (`.issue-entry`)
Marcar à esquerda, descrição/expansão no centro, Pular à direita; detalhe é continuação da linha. Na Checklist, Extras com ficha editorial têm link **Mais informações**.

### 8. Estado da tela (`.screen-state`)
Vazio, carregando ou erro, com próxima ação útil e sem apagar progresso por falhas de rede.

### 9. Modal (`dialog`)
Título associado, foco contido/restaurado e ações destrutivas com confirmações adequadas, sem cortar botões no celular.

### 10. Navegação (`#nav`, `.side`)
Cinco destinos principais; barra inferior no mobile e rail no desktop, com indicação de rota atual e labels acessíveis.

## Checklist e Modo Foco

Checklist segue a sequência de `buildReadingPlan`, agrupando somente trechos consecutivos da mesma série em dropdowns. Intercalações abrem um novo grupo quando a série retorna; edições isoladas usam a mesma superfície sem outro nível de expansão. Jornada concentra as fases/marcos. O Modo Foco usa a mesma sequência visível e atualiza estado por HQ ao avançar. Pesquisa e filtros preservam as divisões originais do plano. O botão verde **Ler** fica somente no título do grupo, fora do controle de expansão; leva aos vínculos explícitos na aba Links. Edições individuais não repetem essa ação. **Mais informações** fica sempre visível; itens com apenas a ficha extra não têm expansão vazia. **Sem link** é desabilitado nos grupos sem destino cadastrado. A superfície inteira do dropdown recebe `--surface-reading-selected` ao abrir ou receber foco; cabeçalhos e conteúdo permanecem transparentes. **Pular** usa uma cápsula visual de 28px dentro de uma área de toque de pelo menos 44px.

## Testes de coesão

`npm run stage4:check` verifica tokens, temas, contraste de pares definidos, alvo mínimo, ausência de estilos inline proibidos e **as dez seções de componentes deste documento**. Playwright verifica comportamento e responsividade; uma checagem estática não substitui a inspeção visual.
