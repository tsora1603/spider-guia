# Execução e hospedagem

O SPIDER·GUIA é um site estático hospedado pelo **GitHub Pages**. Node.js é necessário para desenvolver e gerar o build; o Pages serve somente o conteúdo de `dist/`. Supabase é opcional para contas e sincronização. As rotas usam `#`, e `vite.config.mjs` define `base: './'`: o mesmo build funciona em `/spider-guia/` e na raiz de um domínio próprio, sem redirecionamento de SPA.

## Preparar uma cópia e rodar localmente

Instale Git, **Node.js 24** e npm. Confira com `git --version`, `node --version` e `npm --version`. Quem usa nvm pode executar `nvm install` e `nvm use` na raiz, conforme `.nvmrc`. Para manter uma versão própria no GitHub, crie um **fork** e clone o endereço dele. Para experimentar o projeto original, com acesso ao repositório:

```bash
git clone https://github.com/tsora1603/spider-guia.git
cd spider-guia
npm ci
npm run dev
```

Execute os comandos na pasta que contém `package.json`. Abra a URL exibida pelo Vite (normalmente `http://localhost:5173`). `Ctrl+C` encerra o servidor. `npm ci` usa o lockfile e substitui a pasta de dependências; use `npm install` quando estiver alterando dependências intencionalmente e versione o lockfile atualizado.

Para uma cópia independente, revise `public/config.js` **antes de publicar**. O repositório contém uma URL e uma chave publicável de Supabase: o fork mantém essa configuração até você alterá-la. Para usar apenas progresso local, deixe ambas vazias:

```js
window.SUPABASE_URL = '';
window.SUPABASE_ANON_KEY = '';
window.LINKS_ENABLED = true;
window.SPIDER_REMOTE_RESET_VERIFIED = false;
```

Para oferecer contas próprias, use seu projeto Supabase e siga [Supabase e segurança](SUPABASE-E-SEGURANCA.md). A chave publicável é destinada ao navegador; permissões dependem das políticas do banco. `public/config.js` é copiado para `dist/config.js` e fica público. Variáveis de GitHub Actions ou `.env` não substituem automaticamente os valores desse arquivo.

## Testar a versão de produção

```bash
npm run build
npm run preview
```

Abra a URL exibida, normalmente `http://localhost:4173`. O build gera dados, verifica TypeScript e produz `dist/`; `preview` serve o último build, sem reconstruí-lo. Use a prévia para conferir navegação, links e progresso. Para testar o mesmo build sob a subpasta usada no Pages:

```bash
npx playwright install chromium
npm run test:pages
```

O teste abre `/spider-guia/`, verifica os scripts públicos, ícone, chunks, rotas diretas, recarga e persistência das marcações. Usa o `dist/` existente; não gera outro build. Os testes completos e outros comandos estão em [Manutenção](MANUTENCAO.md).

## Ativar o GitHub Pages

1. Envie o repositório e a configuração desejada ao GitHub. O workflow já está em `.github/workflows/quality.yml`; não é necessário criar um segundo workflow de publicação.
2. Como administrador, abra **Settings → Pages → Build and deployment → Source → GitHub Actions**. Não selecione publicação da raiz do código por branch: o site exige o build do Vite.
3. Confira em **Settings → Actions → General** que Actions e as actions oficiais usadas no workflow são permitidos. As permissões de publicação estão declaradas somente no job de deploy.
4. No environment **github-pages**, se houver restrição de branches, permita `main`. Se forem exigidos revisores para deploy, a publicação aguardará essa aprovação.
5. Faça push na `main` ou abra **Actions → Quality and GitHub Pages → Run workflow**, selecionando `main`.
6. Aguarde os três jobs: qualidade, Playwright e publicação. A URL confirmada aparece no job **Publish GitHub Pages**, no environment `github-pages` e em **Settings → Pages**.

O endereço padrão deste repositório é `https://tsora1603.github.io/spider-guia/`. Uma cópia usa `https://USUARIO.github.io/REPOSITORIO/`; repositórios `USUARIO.github.io` usam a raiz. Abra o endereço com barra final e confira também `#explorar/links`, `#explorar/clone` e `#configuracoes`.

**Disponibilidade e acesso:** Pages em repositórios privados exige um plano compatível, como GitHub Pro, Team ou Enterprise. Não é necessário tornar o código público se o plano permitir. O site do Pages é normalmente público mesmo quando o código é privado; as contas e o progresso sincronizado continuam protegidos pelo Supabase. Consulte as [condições oficiais do Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages). Publicar no Pages não cria proteção de acesso ao conteúdo estático.

### Como cada atualização é publicada

O workflow executa, nesta ordem:

1. Instalação reproduzível com Node 24, geração dos dados, lint, tipos, testes unitários e regressões de progresso/reset/sequência.
2. Playwright contra o build de produção e teste adicional desse **mesmo build** na subpasta `/spider-guia/`.
3. Upload de `dist/` como artefato `github-pages` e deploy por `actions/deploy-pages`.

A publicação só ocorre na `main`, após aprovação dos dois jobs de testes. Pull requests e outras branches apenas verificam a alteração. Uma falha não substitui o site publicado. A permissão `pages: write` e o token OIDC ficam restritos ao job de deploy; não é necessário cadastrar um token pessoal como secret. A ativação inicial do Pages precisa ser feita por um administrador com acesso às configurações.

O artefato enviado é o que passou pelo Playwright, sem reconstrução entre teste e publicação. Deploys em andamento não são cancelados por novos pushes. Para atualizar links ou conteúdo, altere as fontes e envie o commit: o Actions gera e publica os arquivos automaticamente.

## Concluir a transição do Netlify

Nesta migração, o endereço antigo é `https://spider-guia.netlify.app/` e o novo endereço padrão é `https://tsora1603.github.io/spider-guia/`. Não há domínio próprio a transferir, portanto nenhuma alteração de DNS é necessária. As instruções de domínio abaixo servem para quem mantém uma cópia com domínio próprio.

A configuração de build do Netlify foi removida do repositório. Isso não desliga, por si só, um projeto já conectado no painel do Netlify. Conclua a mudança na seguinte ordem:

1. **Antes de mudar o endereço**, no site antigo abra **Configurações → Exportar JSON** e guarde o backup. Cada leitor com progresso apenas local precisa exportar no seu próprio navegador/perfil. Avise os leitores do novo endereço enquanto o antigo ainda estiver acessível.
2. Publique no Pages e confirme que o deploy foi aprovado. Teste Checklist, os 19 volumes Panini, Saga do Clone, Links, backup e recarga de uma rota por hash.
3. No novo endereço, importe o JSON em Configurações. O armazenamento local e a sessão não passam automaticamente de `*.netlify.app` para `*.github.io`. Para progresso sincronizado, mantenha o projeto Supabase existente e entre novamente na mesma conta. Teste login e sincronização antes de desativar o site antigo.
4. Se existir domínio próprio, configure-o primeiro em **Settings → Pages → Custom domain**. Valide a propriedade do domínio e altere os registros DNS conforme a [documentação oficial](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site). Remova os registros que apontavam para o Netlify; aguarde DNS e certificado e ative **Enforce HTTPS**. Usando o mesmo domínio e HTTPS, o armazenamento desse navegador normalmente permanece na mesma origem. O Pages mantém a configuração de domínio nas suas próprias configurações; não depende de um `CNAME` gerado pelo Vite neste fluxo via Actions.
5. Atualize links divulgados, favoritos e URLs configuradas no Supabase, se houver. Registre o endereço definitivo e quem administra domínio/Pages.
6. Depois de validar a nova hospedagem e a transferência de progresso, no painel do Netlify interrompa os deploys automáticos e desconecte o repositório. Remova o domínio do projeto antigo após a mudança de DNS. Encerre o projeto/assinatura antiga quando não for mais necessário manter acesso para a transição; a exclusão do projeto remove seu endereço antigo.

A retirada do Netlify é uma etapa no painel do provedor, separada do commit. Se o objetivo for encerrar totalmente a hospedagem, mantenha o site antigo somente pelo período necessário para transferir backups e divulgar o novo endereço, e depois encerre-o. Para reverter um problema no Pages, reverta o commit por pull request; o workflow publicará novamente após os checks. Preserve backups de progresso e trate mudanças no banco separadamente.

## Outro serviço estático ou servidor próprio

Gere o build e copie **todo o conteúdo de `dist/`**, incluindo `assets/`, `config.js`, `validator.js`, ícone e chunks, para a pasta pública do serviço. Configure `index.html` como documento inicial e HTTPS. Não é necessário executar npm ou Node no servidor que entrega os arquivos. Não publique apenas `index.html` ou a pasta `src/`.

Para simular um servidor estático simples, com Python 3:

```bash
npm run build
python3 -m http.server 8080 --directory dist
```

Abra `http://localhost:8080`. Esse comando e `npm run preview` são ferramentas de verificação local; para operação contínua use um servidor HTTP ou serviço de hospedagem com HTTPS e gestão de processo. A cada atualização, substitua o conjunto de arquivos de forma consistente, preferencialmente com deploy atômico e reversão. Evite cache prolongado de `index.html` e `config.js`; mantenha os assets antigos durante a transição se usuários puderem continuar com abas abertas.

## Problemas frequentes

| Sintoma                                        | O que conferir                                                                                                                                                                                 |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` falha                                 | Node 24, diretório correto e lockfile coerente; se mudou dependências, atualize-o deliberadamente com `npm install`                                                                            |
| Job de deploy diz que Pages não foi encontrado | Ative **Settings → Pages → Source → GitHub Actions**; confira plano e visibilidade                                                                                                             |
| Deploy recebe 403                              | Permissões do job (`pages: write` e `id-token: write`), políticas da organização e restrições do environment; um token de integração sem acesso a Pages não consegue ativar o serviço pela API |
| Deploy aguardando aprovação                    | Regras de revisão do environment `github-pages`                                                                                                                                                |
| Site em branco/404 de assets                   | `dist/` inteiro, URL com barra final e base relativa do Vite; execute `npm run build && npm run test:pages`                                                                                    |
| JSON editado não aparece                       | Confira geração dos dados e o deploy da `main` mais recente; reinicie `npm run dev`                                                                                                            |
| Aba Links ausente                              | `LINKS_ENABLED` em `public/config.js`; gere outro build após alterar                                                                                                                           |
| Login/sync falha                               | Configuração do Supabase, schema, rede e RLS; consulte o guia específico                                                                                                                       |
| Progresso parece ter desaparecido              | Confira navegador, perfil e origem; restaure o backup em Configurações                                                                                                                         |
| Playwright não encontra Chromium               | Execute `npx playwright install chromium`; em Linux/CI pode ser necessário `--with-deps`                                                                                                       |

Para manutenção de links, atualizações, backups e reversão, siga [Manutenção](MANUTENCAO.md#rotina-de-quem-mantém-sua-própria-cópia).
