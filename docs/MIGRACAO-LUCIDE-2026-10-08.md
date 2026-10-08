# SPIDER·GUIA — migração completa dos ícones de interface para Lucide

## Implementação

- Instalada dependência **`lucide-preact`** em `package.json` (compatível com a stack Preact existente).
- `src/components/Icon.tsx` deixa de conter `<svg>`, paths ou transformações manuais. Agora centraliza componentes oficiais do Lucide, com nomes antigos preservados para não quebrar chamadores.
- Navegação de cinco destinos: House, CheckCheck, Route, Info e **Settings** (corrige a engrenagem deformada).
- Ações nas edições, filtros, estado de progresso, Modo Foco, links, Jornada e Ajuda usam o mesmo catálogo de SVGs.
- Substituídos glifos de interface improvisados (setas nos botões, marca de seleção no filtro e caracteres de expansão nos `<summary>`) por componentes Lucide.
- `aria-hidden="true"` e `focusable="false"` são aplicados aos SVGs decorativos; os rótulos e ações permanecem nos respectivos controles.
- Estilos compartilhados (24×24 viewBox, traço 2, `currentColor`, tamanhos responsivos), mantendo os temas claro/escuro.

## Fora do escopo por não serem ícones de interface

- `public/icon.svg`: favicon e imagem de compartilhamento do projeto. Não é um botão da interface; sua identidade visual continua independente.
- `src/design/ProgressVisuals.tsx`: SVG técnico do gráfico circular de progresso.
- `virtual-spacer` em `VirtualizedChecklist.tsx`: elementos técnicos usados para reservar altura na virtualização.

## Instalação e publicação no GitHub + Netlify

1. Copie os arquivos do patch para a raiz do repositório, sem substituir `.git` nem `public/config.js`.
2. Execute **`npm install`** na pasta do projeto. Isso instala Lucide e atualiza/cria `package-lock.json`.
3. Confirme que **`package-lock.json`** foi incluído no commit, caso exista no repositório. Sem atualizar o lockfile, `npm ci` no GitHub poderá falhar.
4. Execute `npm run icons:check`, `npm run typecheck`, `npm run build` e, com Chromium configurado, `npm run test:e2e`.
5. Faça commit dos arquivos + lockfile e use **Sync Changes**. O Netlify poderá publicar após o novo build.

## Evidências e limites

O teste `scripts/check-lucide-icons.mjs` garante que a engrenagem e outros ícones venham da biblioteca e que glifos CSS obsoletos não retornem. O teste E2E `tests/e2e/lucide-icons.spec.ts` confere renderização de cada destino em 320, 390 e 1440 px e chevrons da Checklist.

A instalação npm e os testes de navegador **não foram executados neste ambiente**, porque `registry.npmjs.org` apresentou `EAI_AGAIN`. As verificações estáticas e de integridade executadas estão registradas no relatório de entrega. A versão publicada precisa passar no Netlify/GitHub antes de ser considerada homologada.
