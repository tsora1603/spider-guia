# Manutenção e publicação

Guia prático para editar o SPIDER·GUIA. Para instalação e publicação no Netlify, GitHub Pages ou servidor próprio, consulte [Execução e hospedagem](HOSPEDAGEM.md). Para colaborar por pull request, consulte [CONTRIBUTING.md](../CONTRIBUTING.md).

## Fluxo diário

1. Abra a pasta do repositório no VS Code e faça a alteração no **arquivo-fonte**, nunca num arquivo gerado.
2. Teste localmente (`npm run dev`) e revise a mudança no navegador.
3. Rode os comandos adequados abaixo e depois `npm run build`.
4. Em **Source Control**, confira o diff, crie um **Commit** e use **Sync Changes/Push**.
5. Confira **GitHub → Actions** e **Netlify → Deploys**. Se o build do Netlify falhar, verifique os logs antes de tentar outro deploy.

O workflow GitHub Actions (`.github/workflows/quality.yml`) verifica lint, tipos, dados, Vitest, regressões e Playwright. **O Netlify publica independentemente do resultado do Actions**: para não publicar código não homologado, faça alterações em branch de trabalho e só integre à `main` depois de verificar os checks.

## Comandos úteis

| Comando                                            | Quando usar                                                       |
| -------------------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                                      | Prévia local (gera dados antes de abrir Vite)                     |
| `npm run links:check`                              | Ao editar `data/src/editorial/links.json`                         |
| `npm run data:build && npm run data:check`         | Ao editar `data/src/`                                             |
| `npm run reading-sequence:check`                   | Ao alterar plano, Checklist ou Modo Foco                          |
| `npm run icons:check`                              | Ao atualizar os ícones Lucide                                     |
| `npm run typecheck && npm run test:unit`           | Antes de enviar alterações de código                              |
| `npm run test:e2e`                                 | Verificar fluxos reais no Playwright (requer navegador instalado) |
| `npm run e:check && npm run build`                 | Validação ampla e build de produção                               |
| `npm run reset:local-smoke && npm run reset:smoke` | Após mudanças em progresso, sync ou reset                         |

Instalação do Chromium do Playwright: `npx playwright install chromium`. O build produz a pasta **`dist/`**. `netlify.toml` usa **Node 24**, `npm run build` e `dist/`.

## Alterações comuns

**Links:** siga o procedimento abaixo e edite a lista de grupos em `data/src/editorial/links.json`. Acrescente destinos com `label` e `url`; para vincular o grupo à interface, use `targets` dos tipos `items`, `historical`, `extra` ou `cloneArc`. `extraTarget` escolhe uma ficha diferente para um destino, ou `null` a suprime. Preserve associações e URLs existentes e rode `npm run links:check`. Os links são editoriais; **Fontes** ficam em `data/src/fontes.json`. Referências bibliográficas brasileiras usadas na pesquisa ficam em `data/src/editorial/publication-evidence.json`, fora dos dados servidos no site. Não insira a seção “Onde procurar”.

**Dados editoriais:** edite `data/src/editorial/extras.json`, `clone.json`, `data/src/marcos.json` etc. Gere novamente os dados. Os status dos Extras respeitam **posição 100% por fontes** e **peso 60% fontes / até 40% dedução documentada**; não promova itens sem evidências suficientes. Revisão histórica detalhada: `data/review/extras-confirmacao-60-40.md`.

**Visual:** use tokens em `src/design-system.css`, padrões em `src/styles.css` e ícones de `lucide-preact` via `src/components/Icon.tsx`. Não altere o catálogo apenas para mudar a UI.

**Novo ZIP de alterações:** não apague a pasta `.git`; copie só os arquivos alterados sobre o repositório, examine o diff e preserve configurações locais, especialmente `public/config.js` quando tiver seus valores reais de Supabase.

## Cuidados

- `package-lock.json`, se gerado e usado pelo projeto, deve ser versionado. Não envie `node_modules/`, `dist/`, arquivos `.env` ou segredos.
- Não altere IDs existentes, significado de IDs ou `readingOrder` sem avaliar migração de progresso. Os snapshots em `data/snapshots/` são proteções/registro, não conteúdo para edição rotineira.
- Não faça `git push --force` para resolver testes; investigue o log e preserve o histórico.
- Testes simulados de reset **não** demonstram permissão RLS nem atomicidade no servidor real. Consulte [Supabase e segurança](SUPABASE-E-SEGURANCA.md).

## Como adicionar ou modificar links

1. Edite `data/src/editorial/links.json`, uma lista JSON de grupos. Use aspas duplas, não inclua comentários nem vírgula depois do último elemento.
2. Para acrescentar um destino a um grupo existente, adicione um objeto ao array `links` desse grupo, mantendo seu `id`, título e associações:

```json
{
  "label": "Novo destino de leitura",
  "url": "https://example.org/leitura"
}
```

Substitua a URL de exemplo por um destino real. `stores` e `libraries`, quando presentes, recebem objetos no mesmo formato. Confira manualmente o endereço e as permissões de acesso em uma janela sem login; os scripts validam a estrutura, mas não comprovam que o conteúdo externo está disponível.

### Criar um grupo

Acrescente um grupo ao final da lista, depois dos grupos históricos. Este exemplo cria somente um card em Explorar → Links:

```json
{
  "id": "nova-serie-2026",
  "title": "Nova série (2026)",
  "coverage": [
    {
      "type": "series",
      "series": "Nova série",
      "volume": "2026",
      "ranges": [{ "start": 1, "end": 3 }]
    }
  ],
  "links": [
    {
      "label": "Site oficial",
      "url": "https://example.org/nova-serie"
    }
  ]
}
```

Escolha um `id` único e estável. Ajuste nome, volume, cobertura e URL; não publique os exemplos como conteúdo real. `coverage` descreve o conteúdo do card, mas não cria botões na Checklist. Para associar leituras, acrescente `targets` ao grupo:

| Tipo                    | Formato                                                           | Onde obter o valor                                                 |
| ----------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------ |
| HQs específicas         | `{ "kind": "items", "ids": [123] }`                               | Campo `id` de `data/src/catalog/*.json`, conferindo série e edição |
| Linha principal por LGY | `{ "kind": "historical", "ranges": [{ "start": 1, "end": 10 }] }` | Numeração histórica; seleciona apenas itens `Principal`            |
| Ficha de Extra          | `{ "kind": "extra", "id": 30 }`                                   | Campo `n` de `data/src/editorial/extras.json`                      |
| Arco da Saga do Clone   | `{ "kind": "cloneArc", "id": "saga-do-clone-original-1975" }`     | Campo `arcId` de `data/src/editorial/clone.json`                   |

Os números acima ilustram o formato: confirme que correspondem ao conteúdo do destino antes de usá-los. Um grupo pode conter vários alvos. Para mudar a ficha de um destino específico, use `extraTarget` nesse destino; `null` suprime a ficha. Consulte [Arquitetura e dados](ARQUITETURA.md#links-editoriais-e-cobertura) para coberturas por destino.

### Corrigir ou remover um destino existente

Altere `url` ou `label` no arquivo-fonte; preserve o ID do grupo para manter URLs internas como `#explorar/links?link=<id>`. Remova um destino indisponível somente depois de avaliar as leituras que perderão seu botão. O schema exige ao menos um objeto em `links` por grupo.

Há uma proteção adicional: `scripts/check-link-integrity.mjs` compara os grupos iniciais com `data/snapshots/editorial-links-baseline.json` e exige seus IDs, títulos, posições e pares `label`/`url` originais. Por isso, substituir uma URL ou rótulo histórico, remover um destino histórico ou reordenar esses grupos faz `npm run links:check` falhar, mesmo que o JSON seja válido.

Para uma correção deliberada de URL/rótulo histórico, altere **somente a entrada correspondente** no snapshot junto com a fonte, documente o endereço anterior, o novo e o motivo no pull request, e peça revisão de quem mantém o catálogo. A remoção de um grupo histórico exige revisão conjunta da proteção de posição/IDs; prefira corrigir seu destino. Não regenere todo o snapshot nem desative a checagem para contornar uma falha. Destinos adicionados após o baseline não precisam ser incluídos nele automaticamente.

### Validar e publicar

```bash
npm run links:check
npm run data:build
npm run data:check
npm run build
npm run preview
```

Na prévia, confira Explorar → Links, a busca e os botões das leituras associadas. Confira `window.LINKS_ENABLED = true` em `public/config.js`: `false` oculta a seção e suas ações, mas não remove os dados do build. Após alterações em JSON durante `npm run dev`, execute novamente `data:build` ou reinicie o servidor, pois a geração ocorre ao iniciar o comando.

Revise o diff dos arquivos-fonte e dos artefatos gerados versionados, faça o pull request e publique conforme [Hospedagem](HOSPEDAGEM.md). Editar somente o JSON no GitHub não altera uma cópia já publicada sem um novo build/deploy.

## Rotina de quem mantém sua própria cópia

- Periodicamente, confira links externos, permissões e falhas nos deploys. Registre correções em issues com o grupo/URL afetado e passos para reproduzir.
- Antes de atualizar dependências, use uma branch; revise `package.json` e `package-lock.json`, rode `npm ci`, `npm run ci` e os testes dos fluxos afetados. Evite atualizações de versão principal sem revisar notas de compatibilidade.
- Para incorporar mudanças do projeto original, configure `upstream`, faça `git fetch upstream` e integre a branch desejada em uma branch de trabalho. Resolva conflitos preservando sua configuração e seus links; valide antes de integrar à branch publicada.
- Mantenha a branch de publicação, o domínio e o responsável por GitHub/Netlify/Supabase registrados para a equipe. Use acessos individuais e os mecanismos de colaboração das plataformas.
- Antes de trocar domínio, limpar dados ou migrar catálogo, exporte o progresso em Configurações. Progresso local pertence ao navegador e à origem (protocolo, domínio e porta); não acompanha automaticamente a mudança de endereço. Importe o backup no novo site. Dois sites sob a mesma origem podem compartilhar armazenamento local; prefira origens distintas para cópias independentes.
- Se uma versão falhar, reverta o commit por pull request ou restaure um deploy anterior no provedor. Uma reversão do site não reverte o banco Supabase; trate migrações separadamente.
