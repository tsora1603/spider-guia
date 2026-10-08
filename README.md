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

| Tarefa | Fonte editável |
| --- | --- |
| Links de **Explorar → Links** | `public/links.js` |
| Habilitar Links, configurar Supabase e flag de reset remoto | `public/config.js` |
| HQs e `readingOrder` | `data/src/catalog/` |
| Extras, Saga do Clone, fases, marcos e metodologia | `data/src/editorial/`, `data/src/fases.json`, `data/src/marcos.json` |
| Glossário e fontes | `data/src/glossario.json`, `data/src/fontes.json` |
| Interface, navegação e estilos | `src/`, `src/design-system.css`, `src/styles.css` |
| Ícone do navegador | `public/icon.svg` |

**Não edite arquivos gerados** (`data.js`, `src/data/chunks/`, `src/data/generated-*.json`, `src/data/generated-chunks.ts`). Eles são reconstruídos por `npm run data:build` a partir de `data/src/`.

Para adicionar Links, preserve os grupos e URLs existentes, acrescente o destino em `public/links.js` e rode `npm run links:check`. Para alterações editoriais, rode `npm run data:build` e `npm run data:check`. Mudanças em IDs ou ordem de leitura podem afetar progresso salvo e exigem migração deliberada.

## Como o usuário navega

- **Hoje:** continuar lendo, “Já li até...”, progresso e ritmo.
- **Checklist:** sequência contínua do plano ativo, com status **Não / Sim / Pulei** e Modo Foco; usa o mesmo plano/ordem da Home.
- **Explorar:** Jornada (fases e marcos), Extras (fichas e fontes), Saga do Clone e Links (quando habilitados).
- **Ajuda:** como usar, glossário, fontes e metodologia.
- **Configurações:** plano, spoilers, aparência, conta, backup e reset.

Uma leitura extra com ficha editorial pode exibir **Mais informações** na Checklist, apontando diretamente para **Explorar → Extras**.

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
