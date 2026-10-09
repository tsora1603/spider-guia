# SPIDER·GUIA

Guia privado de leitura do Homem-Aranha, feito com **Vite + TypeScript + Preact**. O catálogo tem **1.301 leituras em 46 arquivos de fase**, com progresso local e sincronização opcional via Supabase.

## Começar

Requer **Node.js 24** e npm. Na raiz do projeto:

```bash
npm install           # ou npm ci, se houver package-lock.json versionado
npm run dev           # abre o endereço exibido pelo Vite
```

```bash
npm run build         # valida dados e TypeScript, gera dist/
npm run test:unit     # Vitest
npm run test:e2e      # Playwright (primeiro: npx playwright install chromium)
```

Para checagem mais ampla: `npm run e:check`, `npm run reset:local-smoke` e `npm run reset:smoke`. A instalação e o CI podem exigir outras dependências do ambiente. **Aprovação em testes locais não comprova a segurança do Supabase real.**

## Onde fica cada coisa

| Tarefa                                                      | Fonte editável                                                       |
| ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Links de **Explorar → Links**                               | `data/src/editorial/links.json`                                      |
| Habilitar Links, configurar Supabase e flag de reset remoto | `public/config.js`                                                   |
| HQs e `readingOrder`                                        | `data/src/catalog/`                                                  |
| Extras, Saga do Clone, fases, marcos e metodologia          | `data/src/editorial/`, `data/src/fases.json`, `data/src/marcos.json` |
| Glossário e fontes                                          | `data/src/glossario.json`, `data/src/fontes.json`                    |
| Interface, navegação e estilos                              | `src/`, `src/design-system.css`, `src/styles.css`                    |
| Ícone do navegador                                          | `public/icon.svg`                                                    |

**Não edite arquivos gerados** (`data.js`, `src/data/chunks/`, `src/data/generated-*.json`, `src/data/generated-chunks.ts`). Eles são reconstruídos por `npm run data:build` a partir de `data/src/`.

Para adicionar Links, preserve os grupos e URLs existentes, acrescente o destino em `data/src/editorial/links.json` e rode `npm run links:check`. O modelo de cobertura, as associações explícitas com Extras e exemplos de cadastro estão em [Arquitetura e dados](docs/ARQUITETURA.md#links-editoriais-e-cobertura). Para alterações editoriais, rode `npm run data:build` e `npm run data:check`. Mudanças em IDs ou ordem de leitura podem afetar progresso salvo e exigem migração deliberada.

## Como o usuário navega

- **Hoje:** continuar lendo, “Já li até...”, progresso e ritmo.
- **Checklist:** dropdowns por trechos consecutivos de cada série, com status **Não / Sim / Pulei** e Modo Foco; usa o mesmo plano/ordem da Home. Anuais e outras séries continuam intercalados: a série reaparece em outro dropdown quando a leitura retorna a ela. Edições isoladas usam o mesmo visual, sem um nível extra de agrupamento. O botão verde **Ler** fica somente no título do grupo e leva aos destinos associados na aba Links; **Sem link** indica um grupo sem destino cadastrado. Itens individuais não repetem essa ação.
- **Explorar:** Jornada (fases e marcos), Extras (fichas e fontes), Saga do Clone e Links (quando habilitados). Links são cards de largura total com destinos externos acessíveis diretamente; `coverage` fornece o resumo e `targets` vincula o mesmo cadastro à Checklist, aos Extras e aos arcos da Saga do Clone. A busca local e `#explorar/links?link=<id>` continuam disponíveis.
- **Ajuda:** como usar, glossário, fontes e metodologia.
- **Configurações:** plano, spoilers, aparência, conta, backup e reset.

Uma leitura extra com ficha editorial exibe **Mais informações** sempre visível na Checklist, apontando diretamente para **Explorar → Extras**.

## Publicação e contas

- **GitHub:** histórico de alterações e testes automáticos; **Netlify:** build e publicação a partir da branch conectada (`netlify.toml`). O GitHub Actions **não** publica no GitHub Pages.
- **Supabase:** login privado por **e-mail e senha** (contas criadas pelo administrador), progresso sincronizado por usuário e controles de exclusão segura. O site funciona sem login, com progresso somente local.
- **Reset remoto:** não habilite `SPIDER_REMOTE_RESET_VERIFIED` só porque os scripts SQL passaram; a validação deve incluir testes reais multiusuário/multidispositivo. Nunca publique senhas, `service_role` ou `sb_secret_*`.

## Documentação mantida

- [Manutenção e publicação](docs/MANUTENCAO.md) — como editar, testar, fazer commit e publicar.
- [Arquitetura e dados](docs/ARQUITETURA.md) — pastas, rotas, modelo editorial e geração de dados.
- [Supabase e segurança](docs/SUPABASE-E-SEGURANCA.md) — contas, RLS, sincronização, backup e reset.
- [Sistema visual](docs/DESIGN-SYSTEM.md) — tokens, componentes e padrões de acessibilidade.

**Evidências editoriais (não documentação operacional):** `data/review/extras-confirmacao-60-40.md` (análise detalhada dos 108 Extras) e `data/review/spoiler-suggestions.md` (sugestões para revisão, sem aplicação automática).

### Links contextuais nas leituras

Os botões **Ler** dos grupos da Checklist e **Ver links desta leitura** nas
fichas de Extras usam `src/links/associations.ts`. O índice é baseado
exclusivamente em `data/src/editorial/links.json`. O campo `targets` aceita IDs de HQ,
intervalos históricos da linha principal, fichas de Extras e IDs estáveis de arcos da
Saga do Clone. `extraTarget` pode substituir ou suprimir a ficha de um destino. Cobertura,
títulos e nomes nunca geram associações implícitas. Sem vínculo
explícito e URL HTTP(S) válida, não há navegação para um destino de leitura.

Na Checklist, o botão fica apenas no título do grupo, inclusive recolhido. Grupos
reúnem os links de suas edições sem repetir destinos; grupos sem associação exibem
**Sem link** desabilitado. Edições com ficha extra mantêm **Mais informações** fora
da área recolhível. Quando esse é o único conteúdo, não há expansão vazia. As associações da linha principal usam alvos `historical`,
restritos aos itens `Principal` dos oito grupos de séries. Anuais e outras revistas
não herdam esses vínculos. Amazing Fantasy **#15** permanece sem destino cadastrado.

O hash `#explorar/links?link=<id>` permanece aceito. Para múltiplos
cards, repita `link` na URL. O parâmetro opcional `from` registra uma rota
interna de retorno; o botão **Voltar à leitura** restaura a ficha ou o hash
de origem, sem alterar o estado de progresso. Navegação Back/Forward funciona
independentemente do botão. Notas bibliográficas brasileiras usadas como evidência foram preservadas
em `data/src/editorial/publication-evidence.json`, fora dos dados de interface;
as fontes de pesquisa da aplicação continuam em `data/src/fontes.json`.

Na volta pelo histórico do navegador, a posição da HQ/Extra é recuperada por
um marcador de interface na própria entrada do histórico (`history.state`).
Filtros e buscas do hash original permanecem intactos; o marcador não entra em
progresso, backup, Supabase ou sincronização.
