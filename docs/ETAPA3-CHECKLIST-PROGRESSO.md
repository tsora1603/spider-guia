# SPIDER·GUIA — Etapa 3: Checklist e fluxo de progresso

**Base:** ZIP aprovado da Etapa 2 (`spider-guia-etapa2-sistema-visual-listas.zip`).
**Escopo:** apenas a Etapa 3 do plano de auditoria UX/UI. Próxima etapa não iniciada.

## Entregas

1. **Modo Foco na Checklist.** Controle prioritário e sempre visível, com `aria-pressed`, descrição, ativação/desativação, navegação Anterior/Próxima, atalhos J/K e saída. Usa **exatamente** `designPreferences.focusMode` e o storage já existente. A opção de Configurações continua como atalho secundário, com o mesmo valor; não há segunda preferência.
2. **Linha canônica de edição.** `IssueRow` unifica Checklist, Saga do Clone e as edições de Extras em grupo. Ação de marcar fica à esquerda, metadados/detalhes no centro e Pular/Desfazer sempre à direita, **fora do elemento expansível**. Abrir detalhes não dispara ação de progresso e vice-versa. Edição essencial continua usando a confirmação existente (`requestStatus`).
3. **Extras simples e grupos.** Em entrada com uma HQ, `ExtraCard` exibe o botão Pular visível mesmo com o resumo recolhido. Em entradas com múltiplas HQs, o resumo identifica quantas são lidas, puladas e pendentes; cada edição possui suas próprias ações e detalhes ao expandir o grupo. A disponibilidade **Liberado/Ainda não** agora tem indicação própria e não substitui o status do progresso. O filtro Liberadas usa essa disponibilidade. A origem do progresso é sempre `progressStore`, não há novo armazenamento.
4. **Saga do Clone.** Reutiliza as linhas de edição e mantém parte, ordem de leitura, anotação com proteção de spoiler e agrupamentos editoriais. Contadores separam lidas de puladas.
5. **Filtro reativo e deep links.** Checklist refiltra quando o progresso muda. A virtualização inclui temporariamente o grupo de uma HQ referenciada em `#checklist/hq/:id`, abre a fase e tenta focar a linha; ao sair do Foco também volta à edição atual. As pesquisas, grupos, URLs de filtro, seleções em lote e navegação por hash permanecem.

## Arquivos alterados

- `src/components/IssueRow.tsx`: padrão compartilhado e detalhe expandível.
- `src/components/Editorial.tsx`: ações e contadores de Extras, linhas de grupos.
- `src/views/ReadingView.tsx`: linha de Saga do Clone e filtro de liberação.
- `src/components/Progress.tsx`: nomes e acessibilidade dos três estados, botões.
- `src/components/VirtualizedChecklist.tsx`: Modo Foco, contadores, refiltro e deep links.
- `src/ui/hooks.ts`: revisão de progresso retornada pelo hook existente.
- `src/styles.css`: disposição de três zonas, 320 px, hierarquia do Modo Foco.
- `tests/e2e/spider-guia.spec.ts`: cenários específicos de Etapa 3.
- `scripts/check-ux-stage3.mjs` e `package.json`: verificação estática adicional (`npm run ux:stage3:check`).

## Testes e evidências

- **20 verificações estáticas e de regressão executadas com sucesso**: arquitetura, rotas Etapa 1, UI Etapa 2, interações antigas, design, catálogo e IDs, requisitos de Extras, preferências, verificação da migração, regras privadas e smoke tests de reset local/remoto.
- **14 invariantes específicos da Etapa 3** passaram via `node scripts/check-ux-stage3.mjs`.
- **75 arquivos TypeScript/TSX** analisados sintaticamente sem erros; `styles.css` e `design-system.css` analisados com parser CSS.
- O manifesto imutável da Etapa 2 confirmou **68 arquivos protegidos idênticos** aos originais, incluindo dados e infraestrutura.
- **Não executados:** typecheck completo, build Vite, Vitest, Playwright e inspeção responsiva real. O comando `npm install` falhou com `EAI_AGAIN` ao consultar `registry.npmjs.org`, portanto as dependências não estão presentes. Os cenários E2E foram adicionados, mas **não foram executados**. É necessário rodá-los em ambiente com npm e navegador.
- **Supabase real não testado.** Nenhum SQL, política RLS, protocolo remoto, flag de verificação, sistema de sincronização ou rotina de reset foi modificado nesta etapa.

### Comandos de homologação no ambiente do projeto

```sh
npm install
npm run ux:stage3:check
npm run e:check
npm run build
npm run test:e2e
npm run reset:smoke
npm run reset:local-smoke
```

### Revisão manual recomendada

- Testar em 320/360/390/768/1024/1440 px, claro/escuro, fonte grande e `prefers-reduced-motion`.
- Abrir `#checklist/hq/1301` e alternar filtros, grupos e Modo Foco.
- Conferir as confirmações de Pular essencial em Checklist, Extra e Saga do Clone.
- Conferir grupo de Extras com múltiplas HQs, navegação Tab/Enter/Escape e retorno do foco.
