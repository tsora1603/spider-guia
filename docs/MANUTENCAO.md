# Manutenção

Edite as fontes em `data/src/` e `src/`. `data.js`, `src/data/chunks/` e `src/data/generated-*` são gerados por `npm run data:build`. Preserve IDs existentes e exporte o progresso antes de mudar o catálogo.

## Como adicionar ou modificar links

Abra `data/src/editorial/links.json` no editor ou use **Edit** no GitHub. Essa lista de grupos aparece em **Explorar → Links**.

- **Corrigir:** altere `url` ou `label` no destino existente.
- **Adicionar um destino:** acrescente `{ "label": "Nome", "url": "https://..." }` ao array `links` do grupo. `stores` e `libraries` usam o mesmo formato.
- **Criar um grupo:** acrescente um objeto como este, substituindo os valores de exemplo:

```json
{
  "id": "novo-grupo",
  "title": "Título da HQ",
  "coverage": [{ "type": "one-shot", "series": "Título da HQ", "volume": "2026" }],
  "links": [{ "label": "Destino de leitura", "url": "https://example.org/leitura" }]
}
```

Use um ID único e estável. O exemplo cria um card na aba Links. Para associar botões a HQs, Extras ou arcos, acrescente `targets` conforme [Arquitetura](ARQUITETURA.md#links-editoriais-e-cobertura). Confira o endereço no navegador; os validadores não comprovam disponibilidade externa.

**Links históricos:** o validador protege IDs, ordem, títulos, rótulos e URLs originais. Para corrigir uma URL/rótulo histórico, ajuste também **somente a entrada correspondente** em `data/snapshots/editorial-links-baseline.json` e explique o motivo no pull request. Preserve a ordem dos grupos e ao menos um destino por grupo; não regenere o snapshot inteiro para contornar erros.

Valide a alteração:

```bash
npm run links:check
npm run data:build
npm run data:check
npm run build
npm run preview
```

Confira **Explorar → Links** e os botões associados. `LINKS_ENABLED` em `public/config.js` precisa estar `true`. Depois de editar JSON com o servidor aberto, rode `data:build` novamente ou reinicie `npm run dev`.

## Outras alterações

| Conteúdo               | Fonte                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| HQs e ordem            | `data/src/catalog/`                                               |
| Extras e Saga do Clone | `data/src/editorial/extras.json`, `data/src/editorial/clone.json` |
| Jornada                | `data/src/fases.json`, `data/src/marcos.json`                     |
| Fontes e glossário     | `data/src/fontes.json`, `data/src/glossario.json`                 |
| Visual                 | `src/design-system.css`, `src/styles.css`                         |

Para mudar cobertura, volumes ou ordem, siga os contratos de [Arquitetura](ARQUITETURA.md). Para contas e reset, siga [Supabase](SUPABASE-E-SEGURANCA.md).

## Comandos úteis

| Comando                                    | Uso                                  |
| ------------------------------------------ | ------------------------------------ |
| `npm run dev`                              | Desenvolvimento local                |
| `npm run data:build && npm run data:check` | Alterações nos dados                 |
| `npm run links:check`                      | Cadastro de links                    |
| `npm run ci`                               | Validações completas e build         |
| `npm run test:e2e`                         | Fluxos no navegador; requer Chromium |
| `npm run build && npm run test:pages`      | Build na subpasta do Pages           |
| `npm run reading-sequence:check`           | Plano, Checklist e Modo Foco         |

Instale o navegador de testes com `npx playwright install chromium`.

## Publicar ou reverter

Revise o diff e envie as alterações conforme [Contribuição](../CONTRIBUTING.md). Após integrar à **main**, o Actions testa e publica no Pages. Confira **Actions → Quality and GitHub Pages** e abra o site. Para desfazer uma alteração, envie um commit de reversão; mudanças no banco exigem tratamento separado.

## Rotina de quem mantém sua própria cópia

- Revise links externos e falhas em Actions periodicamente.
- Atualize dependências em uma branch, versione `package-lock.json` e valide com `npm run ci`.
- Para incorporar mudanças do original, configure `upstream`, faça `git fetch upstream` e integre em uma branch, preservando sua configuração e seus links.
- Guarde backups antes de trocar domínio ou catálogo. O JSON exportado contém progresso e histórico; preferências e aparência não entram nele.
- Mantenha os responsáveis por GitHub, domínio e Supabase registrados. Preserve o histórico Git e mantenha segredos fora do repositório.
