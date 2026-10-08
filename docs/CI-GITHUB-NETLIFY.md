# Publicação e testes: GitHub + Netlify

Esta é a configuração de manutenção contínua do SPIDER·GUIA. **O GitHub Actions não publica mais no GitHub Pages.** O Netlify é o único responsável pelo deploy.

## Primeira publicação

1. Abra a pasta do projeto no VS Code. Instale Node.js **24**, Git e as dependências com `npm install` (se o projeto ainda não tiver um `package-lock.json`).
2. Gere os dados com `npm run data:build`; rode `npm run e:check`, `npm run build` e `npm run test:e2e`. Os testes do navegador exigem Chromium (`npx playwright install chromium`).
3. Faça commit dos arquivos, **incluindo o `package-lock.json`** gerado pelo npm. Não inclua `node_modules`, `dist`, arquivos `.env` ou credenciais.
4. Envie o commit para a branch `main` no GitHub.
5. No Netlify, escolha **Add new project → Import an existing project → GitHub**, autorize o repositório e selecione `main` como branch de produção. O arquivo `netlify.toml` já define `npm run build`, `dist` e Node 24.
6. Confirme que o deploy Netlify terminou com sucesso e visite o endereço público; teste progressos, rotas e Links. Configure o domínio se desejar.
7. No GitHub, use **Settings → Pages** para desabilitar a publicação antiga do GitHub Pages, se estava ativada.

**Atenção:** o GitHub Actions e o Netlify rodam **independentemente** quando recebe um push. Um teste falhar no Actions **não bloqueia automaticamente** o deploy Netlify. Para exigir homologação antes de publicar, trabalhe em uma branch de alterações, revise os checks/preview deploy e só então faça merge na `main`. Configure proteções da branch no GitHub conforme disponibilidade do plano.

## Manutenção: editar, testar, salvar e publicar

1. No VS Code, altere `public/links.js` para editar Links, `data/src/` para catálogo/editorial, ou `src/` para interface.
2. Para Links: `npm run links:check`. Para dados: `npm run data:build` e `npm run data:check`. Para interface: `npm run e:check` e `npm run build`.
3. Em **Source Control** do VS Code, revise o diff; escreva uma mensagem e clique em **Commit**, depois **Sync Changes** para enviar ao GitHub.
4. Acompanhe GitHub → Actions e Netlify → Deploys. Na branch de produção, o Netlify publica o novo build se ele for bem-sucedido.
5. Se o build Netlify falhar, a versão anterior permanece publicada. Corrija o erro, faça novo commit e envie-o.

## Como funcionam as proteções

- `npm run data:build` recompila `data.js` e os chunks a partir de `data/src/`. **Não edite arquivos gerados manualmente.**
- `npm run data:check` valida schema, referências, projeção em chunks, integridade de IDs e ordem, e compatibilidade com o legado.
- `npm run links:check` verifica grupos, IDs de HQ e URLs válidas sem proibir adicionar ou corrigir um link. As alterações em URLs existentes devem ser revisadas no diff do Git.
- `npm run reset:local-smoke` e `npm run reset:smoke` protegem fluxos delicados. Os testes **não** validam um Supabase remoto real.
- As antigas referências em `docs/ETAPA2-PRESERVACAO.json`, `docs/ETAPA7-BASELINE-INTEGRIDADE.json` e `data/snapshots/catalog-sha256.json` são históricas, **não** impedem edições. Os IDs existentes ainda são protegidos pelo snapshot `data/snapshots/item-ids.json`.
- Se for necessário adicionar/reordenar HQs deliberadamente, planeje migração do progresso e atualização consciente do snapshot de IDs; nunca desative o teste para fazê-lo passar sem revisar compatibilidade.

## O que mudou nesta atualização

- Removido o deploy GitHub Pages e respectivas permissões/artefatos do workflow.
- GitHub Actions continua com lint, tipos, dados, Vitest, Playwright e smoke tests de reset.
- Netlify mantém build e publicação (`netlify.toml`).
- Corrigido o atributo Preact `spellcheck` de `DeviceResetCard.tsx`.
- Testes com SHA fixo de dados gerados, links e baseline visual foram convertidos em testes de comportamento/consistência. Os arquivos dos baselines históricos continuam para consulta.

## Limitações

Este pacote não conecta automaticamente sua conta GitHub ao Netlify nem habilita o Supabase. Os tokens administrativos nunca devem entrar em `public/` ou no repositório. A autorização da integração GitHub-Netlify exige ação do titular da conta.
