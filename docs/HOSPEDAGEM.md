# Execução e hospedagem

**[Site publicado no GitHub Pages](https://tsora1603.github.io/spider-guia/)**. A publicação usa `dist/`, gerado pelo Vite. As rotas com `#` e a base relativa permitem servir o site em `/spider-guia/` ou na raiz de um domínio.

## Preparar uma cópia e rodar localmente

Siga os comandos do [README](../README.md#começar). Para manter sua versão, crie um fork e clone o endereço dele.

**Antes de publicar um fork**, revise `public/config.js`: ele herda a configuração Supabase deste projeto. Para usar somente progresso local:

```js
window.SUPABASE_URL = '';
window.SUPABASE_ANON_KEY = '';
window.LINKS_ENABLED = true;
window.SPIDER_REMOTE_RESET_VERIFIED = false;
```

Para contas próprias, siga [Supabase](SUPABASE-E-SEGURANCA.md). `config.js` fica público no build; variáveis do painel ou `.env` não substituem seus valores automaticamente.

## Testar a versão de produção

```bash
npm run build
npm run preview
```

Abra `http://localhost:4173`, ou a URL exibida. `preview` serve o último build; encerre com `Ctrl+C`. Para verificar esse build na subpasta do Pages, instale Chromium com `npx playwright install chromium` e rode `npm run test:pages`.

## Ativar o GitHub Pages

O Pages **já está ativo neste repositório**. Para configurar uma cópia:

1. Abra **Settings → Pages → Build and deployment → Source → GitHub Actions**.
2. Envie um commit à `main` ou use **Actions → Quality and GitHub Pages → Run workflow**.
3. Aguarde qualidade, testes de navegador e **Publish GitHub Pages**. O endereço aparece em **Settings → Pages**.

O workflow `.github/workflows/quality.yml` publica o mesmo `dist/` testado. Outras branches e pull requests só executam checks; uma falha mantém a versão anterior no ar.

A URL de uma cópia será `https://USUARIO.github.io/REPOSITORIO/`. Pages em repositórios privados exige plano compatível; o conteúdo estático é normalmente público. Para domínio próprio, siga a [configuração oficial](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

## Concluir a transição do Netlify

A publicação no Pages está concluída. Para encerrar a hospedagem antiga:

1. Em `https://spider-guia.netlify.app/`, exporte o JSON em **Configurações**. Cada leitor com progresso local precisa fazer isso no próprio navegador.
2. No Pages, importe o JSON. Quem usa sincronização deve entrar novamente na mesma conta; o projeto Supabase continua o mesmo.
3. Atualize favoritos e links divulgados para o novo endereço. Não há domínio próprio nem DNS a transferir.
4. Após conferir o progresso no Pages, interrompa os deploys, desconecte o repositório e encerre o projeto antigo no **painel do Netlify**.

Remover `netlify.toml` não desliga o projeto no provedor. O progresso local pertence ao domínio e não acompanha automaticamente a mudança de endereço.

## Outro serviço estático ou servidor próprio

Rode `npm run build` e publique **todo o conteúdo de `dist/`**, com `index.html`, `assets/` e arquivos públicos. O servidor precisa apenas servir arquivos por HTTPS; atualize o conjunto inteiro a cada versão.

Para uma prévia local com Python 3: `python3 -m http.server 8080 --directory dist`. Abra `http://localhost:8080`.

## Problemas frequentes

| Problema                                 | O que conferir                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| Build falha                              | Node 24, `npm ci` e o primeiro erro em Actions                                    |
| Pages não encontrado ou deploy bloqueado | Source = GitHub Actions, plano, permissões e regras do environment `github-pages` |
| Site em branco ou assets 404             | `dist/` completo, barra final na URL e `base: './'`                               |
| Progresso ausente                        | Navegador/domínio corretos; restaure o backup                                     |
| Login ou sync falha                      | Configuração e permissões do [Supabase](SUPABASE-E-SEGURANCA.md)                  |
