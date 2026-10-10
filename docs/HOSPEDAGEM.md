# Execução e hospedagem

O SPIDER·GUIA é um site estático. Node.js é necessário para desenvolver e gerar o build; a hospedagem serve somente o conteúdo de `dist/`. Supabase é opcional para contas e sincronização. As rotas usam `#`, e `vite.config.mjs` define `base: './'`, permitindo publicar também sob `/nome-do-repositorio/`, sem regra de redirecionamento de SPA.

## Preparar uma cópia e rodar localmente

Instale Git, **Node.js 24** e npm. Confira com `git --version`, `node --version` e `npm --version`. Para manter uma versão própria no GitHub, crie um **fork** e clone o endereço dele. Para apenas experimentar o projeto original:

```bash
git clone https://github.com/tsora1603/spider-guia.git
cd spider-guia
npm ci
npm run dev
```

Execute os comandos na pasta que contém `package.json`. Abra a URL exibida pelo Vite (normalmente `http://localhost:5173`). `Ctrl+C` encerra o servidor. `npm ci` usa o lockfile e substitui a pasta de dependências; use `npm install` quando estiver alterando dependências intencionalmente e versione o lockfile atualizado.

Para uma cópia independente, revise `public/config.js` **antes de publicar**. O repositório já contém uma URL e uma chave publicável de Supabase: o fork mantém essa configuração até você alterá-la. Para usar apenas progresso local, deixe ambas vazias:

```js
window.SUPABASE_URL = '';
window.SUPABASE_ANON_KEY = '';
window.LINKS_ENABLED = true;
window.SPIDER_REMOTE_RESET_VERIFIED = false;
```

Para oferecer contas próprias, use seu projeto Supabase e siga [Supabase e segurança](SUPABASE-E-SEGURANCA.md). A chave publicável é destinada ao navegador; permissões dependem das políticas do banco. `public/config.js` é copiado para `dist/config.js` e fica público. Não existe injeção automática de variáveis Netlify ou `.env` nesse arquivo: preencher um painel de variáveis não substitui seus valores.

## Testar a versão de produção

```bash
npm run build
npm run preview
```

Abra a URL exibida, normalmente `http://localhost:4173`. O build gera dados, verifica TypeScript e produz `dist/`; `preview` serve o último build, sem reconstruí-lo. Use a prévia para conferir navegação, links e progresso antes de publicar. Os scripts e testes adicionais estão em [Manutenção](MANUTENCAO.md).

## Netlify conectado ao GitHub

1. Envie seu fork/repositório e a configuração desejada ao GitHub.
2. No Netlify, use **Add new project / Import an existing project** e conecte o repositório. Os nomes dos menus podem variar.
3. Selecione a branch de produção. Se `package.json` estiver na raiz do repositório, deixe **Base directory** vazia; se estiver numa subpasta, informe essa subpasta.
4. Confirme **Build command:** `npm run build`; **Publish directory:** `dist`; **Node:** `24`. O `netlify.toml` já contém esses valores.
5. Inicie o deploy e confira os logs. Teste a URL publicada e configure domínio próprio/HTTPS, se desejado, no painel do projeto.

Novos commits na branch conectada geram novos deploys. O workflow de qualidade no GitHub não bloqueia automaticamente o Netlify: mantenha alterações em branches e integre apenas depois dos checks. Deploy Previews podem ser usados para revisar pull requests conforme a configuração do projeto.

Para um deploy manual, rode `npm ci` e `npm run build` localmente e envie **a pasta `dist/`** pelo mecanismo de upload do Netlify. Nesse modo, cada atualização exige gerar e enviar novamente o build; o upload não configura publicação automática pelo GitHub.

## GitHub Pages

O workflow existente, `.github/workflows/quality.yml`, executa testes e **não publica** no Pages. Servir a raiz do código-fonte por **Deploy from a branch** não compila TypeScript nem substitui o build do Vite.

No repositório da sua cópia, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**. Confira a disponibilidade do Pages para o plano e a visibilidade do repositório. Para publicação automática, crie **um workflow separado** em `.github/workflows/pages.yml`, como este exemplo, ajustando `main` à branch publicada:

```yaml
name: Publish GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: npm
      - run: npm ci
      - run: npm run ci
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

Esse exemplo executa `npm run ci` antes do deploy; não inclui o Playwright e todos os smoke tests do workflow de qualidade. Proteja a branch publicada com os checks desse workflow antes de integrar pull requests. Não altere `quality.yml` para publicar: a checagem de arquitetura atual exige que ele continue dedicado a testes.

Após integrar o workflow, acompanhe **Actions → Publish GitHub Pages**. A URL normalmente será `https://USUARIO.github.io/REPOSITORIO/`; repositórios `USUARIO.github.io` usam a raiz. Não é necessário mudar a base relativa do Vite. Confira também uma rota como `#explorar/links` e os arquivos `config.js` e `assets/` no navegador.

O exemplo pressupõe `package.json` na raiz do repositório. Em um monorepo, configure `defaults.run.working-directory` no job de build, `cache-dependency-path` no setup do Node e `path` do artefato para a subpasta correspondente.

## Outro serviço estático ou servidor próprio

Gere o build e copie **todo o conteúdo de `dist/`**, incluindo `assets/`, `config.js`, ícones e chunks, para a pasta pública do serviço. Configure `index.html` como documento inicial e HTTPS. Não é necessário executar npm ou Node no servidor que entrega esses arquivos. Não publique apenas `index.html` nem a pasta `src/`.

Para simular um servidor estático simples, se Python 3 estiver instalado:

```bash
npm run build
python3 -m http.server 8080 --directory dist
```

Abra `http://localhost:8080`. Esse comando e `npm run preview` são ferramentas de verificação local; para operação contínua use um servidor HTTP ou serviço de hospedagem com HTTPS e gestão de processo. Para cada atualização, gere outro build e substitua o conjunto de arquivos de forma consistente, preferencialmente com deploy atômico e possibilidade de reversão. Evite cache prolongado de `index.html` e `config.js`; mantenha os assets antigos durante a transição se usuários puderem continuar com abas abertas.

## Problemas frequentes

| Sintoma                           | O que conferir                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `npm ci` falha                    | Node 24, diretório correto e lockfile coerente; se mudou dependências, atualize-o deliberadamente com `npm install` |
| Site em branco/404 de assets      | Publicação de `dist/` inteiro, URL com barra final na subpasta e base relativa do Vite                              |
| JSON editado não aparece          | Reconstrua dados/build; reinicie `npm run dev` e confira o deploy mais recente                                      |
| Aba Links ausente                 | `LINKS_ENABLED` em `public/config.js`; gere novo build após alterar                                                 |
| Login/sync falha                  | Configuração do seu Supabase, schema, rede e RLS; consulte o guia específico                                        |
| Progresso parece ter desaparecido | Navegador, perfil, domínio e porta podem ser diferentes; restaure um backup em Configurações                        |
| Playwright não encontra Chromium  | Execute `npx playwright install chromium`; em Linux/CI pode ser necessário `--with-deps`                            |

Para manutenção de links, atualizações, backups e reversão, siga [Manutenção](MANUTENCAO.md#rotina-de-quem-mantém-sua-própria-cópia).
