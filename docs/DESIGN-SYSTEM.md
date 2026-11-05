# Sistema visual

`src/design-system.css` define tokens e temas; `src/styles.css`, layouts. Use Bangers nos títulos, Inter/system-ui na interface e `lucide-preact` por meio de `Icon`. Favicon: `public/icon.png`.

- Use tokens, foco visível, alvos de toque de pelo menos 44 px e movimento reduzido. Evite estilos inline, cores literais fora dos tokens e `!important`.
- `ListSearch` e `FilterDropdown` concentram busca e filtros; preserve teclado, Escape e retorno de foco.
- `ScreenState` apresenta carregamento, vazio e erro sem apagar progresso.
- Modais precisam de título acessível, foco contido/restaurado e conteúdo acessível em telas pequenas.
- Diferencie Não, Sim e Pulei por texto. Checklist e Foco usam o mesmo plano; cada leitura tem status próprio. Ler aparece no grupo; Sem link permanece desabilitado.
- A navegação tem cinco destinos, com barra inferior no celular e lateral no desktop. Confira temas claro/escuro/automático e escalas de fonte.

`npm run design:check` verifica regras estáticas e contraste dos tokens. Dimensões reais, responsividade e teclado são conferidos nos testes de navegador.
