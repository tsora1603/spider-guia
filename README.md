# SPIDER·GUIA

Guia de leitura do Homem-Aranha **TOTALMENTE vibe-codado** com **1.236 leituras**, Checklist, Saga do Clone, links e progresso salvo no navegador. Contas cadastradas pelo administrador podem sincronizar pelo Supabase.

**[Abrir o site no GitHub Pages](https://tsora1603.github.io/spider-guia/)**

## Começar

Instale **Git e Node.js 24**. No terminal:

```bash
git clone https://github.com/tsora1603/spider-guia.git
cd spider-guia
npm ci
npm run dev
```

Abra o endereço exibido pelo Vite, normalmente `http://localhost:5173`. Encerre com `Ctrl+C`. Quem usa nvm pode instalar a versão de `.nvmrc` com `nvm install`.

## O que editar

| Alteração                   | Arquivo ou pasta                                                  |
| --------------------------- | ----------------------------------------------------------------- |
| Adicionar ou corrigir links | `data/src/editorial/links.json`                                   |
| HQs e ordem de leitura      | `data/src/catalog/`                                               |
| Extras e Saga do Clone      | `data/src/editorial/extras.json`, `data/src/editorial/clone.json` |
| Interface e estilos         | `src/`, `src/design-system.css`, `src/styles.css`                 |
| Supabase e opções do site   | `public/config.js`                                                |

Edite as fontes; os arquivos gerados são reconstruídos por `npm run data:build`. Para publicar uma cópia própria, revise `public/config.js` conforme o guia de hospedagem.

## Guias

- [Hospedagem](docs/HOSPEDAGEM.md): prévia de produção, Pages, cópia própria e saída do Netlify.
- [Manutenção](docs/MANUTENCAO.md): editar links, validar e atualizar o site.
- [Contribuição](CONTRIBUTING.md): enviar alterações por pull request.
- [Arquitetura](docs/ARQUITETURA.md): dados, IDs, rotas e volumes Panini.
- [Supabase](docs/SUPABASE-E-SEGURANCA.md): contas, sincronização e reset.
- [Sistema visual](docs/DESIGN-SYSTEM.md): padrões da interface.

Pushes na **main** publicam automaticamente no Pages após os testes. Acompanhe **Actions → Quality and GitHub Pages**.
