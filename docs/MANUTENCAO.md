# Manutenção e publicação

Guia prático para editar o SPIDER·GUIA com VS Code, GitHub e Netlify.

## Fluxo diário

1. Abra a pasta do repositório no VS Code e faça a alteração no **arquivo-fonte**, nunca num arquivo gerado.
2. Teste localmente (`npm run dev`) e revise a mudança no navegador.
3. Rode os comandos adequados abaixo e depois `npm run build`.
4. Em **Source Control**, confira o diff, crie um **Commit** e use **Sync Changes/Push**.
5. Confira **GitHub → Actions** e **Netlify → Deploys**. Se o build do Netlify falhar, verifique os logs antes de tentar outro deploy.

O workflow GitHub Actions (`.github/workflows/quality.yml`) verifica lint, tipos, dados, Vitest, regressões e Playwright. **O Netlify publica independentemente do resultado do Actions**: para não publicar código não homologado, faça alterações em branch de trabalho e só integre à `main` depois de verificar os checks.

## Comandos úteis

| Comando | Quando usar |
| --- | --- |
| `npm run dev` | Prévia local (gera dados antes de abrir Vite) |
| `npm run links:check` | Ao editar `data/src/editorial/links.json` |
| `npm run data:build && npm run data:check` | Ao editar `data/src/` |
| `npm run reading-sequence:check` | Ao alterar plano, Checklist ou Modo Foco |
| `npm run icons:check` | Ao atualizar os ícones Lucide |
| `npm run typecheck && npm run test:unit` | Antes de enviar alterações de código |
| `npm run test:e2e` | Verificar fluxos reais no Playwright (requer navegador instalado) |
| `npm run e:check && npm run build` | Validação ampla e build de produção |
| `npm run reset:local-smoke && npm run reset:smoke` | Após mudanças em progresso, sync ou reset |

Instalação do Chromium do Playwright: `npx playwright install chromium`. O build produz a pasta **`dist/`**. `netlify.toml` usa **Node 24**, `npm run build` e `dist/`.

## Alterações comuns

**Links:** edite a lista de grupos em `data/src/editorial/links.json`. Acrescente destinos com `label` e `url` a `links` de um grupo; ou crie um grupo com `id` único, `title`, `links` e `coverage` (quando não houver `itemIds`). Associações `itemIds` e `extraId` precisam ser explícitas; não as deduza de intervalos. Preserve associações e URLs já existentes. Os links são editoriais; **Fontes** ficam em `data/src/fontes.json`. Referências bibliográficas brasileiras usadas na pesquisa ficam em `data/src/editorial/publication-evidence.json`, fora dos dados servidos no site. Não insira a seção “Onde procurar”.

**Dados editoriais:** edite `data/src/editorial/extras.json`, `clone.json`, `data/src/marcos.json` etc. Gere novamente os dados. Os status dos Extras respeitam **posição 100% por fontes** e **peso 60% fontes / até 40% dedução documentada**; não promova itens sem evidências suficientes. Revisão histórica detalhada: `data/review/extras-confirmacao-60-40.md`.

**Visual:** use tokens em `src/design-system.css`, padrões em `src/styles.css` e ícones de `lucide-preact` via `src/components/Icon.tsx`. Não altere o catálogo apenas para mudar a UI.

**Novo ZIP de alterações:** não apague a pasta `.git`; copie só os arquivos alterados sobre o repositório, examine o diff e preserve configurações locais, especialmente `public/config.js` quando tiver seus valores reais de Supabase.

## Cuidados

- `package-lock.json`, se gerado e usado pelo projeto, deve ser versionado. Não envie `node_modules/`, `dist/`, arquivos `.env` ou segredos.
- Não altere IDs existentes, significado de IDs ou `readingOrder` sem avaliar migração de progresso. Os snapshots em `data/snapshots/` são proteções/registro, não conteúdo para edição rotineira.
- Não faça `git push --force` para resolver testes; investigue o log e preserve o histórico.
- Testes simulados de reset **não** demonstram permissão RLS nem atomicidade no servidor real. Consulte [Supabase e segurança](SUPABASE-E-SEGURANCA.md).
