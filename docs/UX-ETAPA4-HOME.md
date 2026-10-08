# SPIDER·GUIA — UX/UI Etapa 4 · Home e jornada cotidiana

**Origem:** ZIP aprovado da Etapa 3 (`spider-guia-etapa3-checklist-progresso.zip`).
**Escopo:** somente a Home, seu fluxo de atualização histórica, nomenclatura adjacente em Configurações e testes de regressão. Não foram alterados dados, identificadores, links, backend, RLS, Supabase, storage nem protocolo de reset.

## Decisões de UX implementadas

- Mantido o **espaço contínuo de leitura**, sem converter a Home em mosaico de cards. As ações "Abrir leitura na Checklist" e "Já li até..." formam a área central e têm hierarquia visual equivalente no desktop; no mobile aparecem uma após a outra antes das métricas secundárias. Input e botão se adaptam a larguras estreitas (inclusive 320px).
- Exposto atalho claro **Plano: [nome] · Alterar nas Configurações** na Home; os três planos Completo, Essenciais e Foco preservam a lógica vigente. Plano vazio fornece rota de recuperação. Para plano sem itens pendentes, a mensagem distingue a conclusão por leitura dos itens pulados.
- "Já li até..." removido de Configurações, preservado somente na Home e no onboarding inicial. Antes de confirmar, a Home mostra quantidade de edições da série histórica principal a alterar e quantas já lidas/puladas serão preservadas. O diálogo nativo do produto apresenta os mesmos dados, pede confirmação e aceita Cancelar. Após sucesso, oferece **Desfazer**.
- O lote histórico nunca marca Extras ou leituras fora da numeração histórica (incluindo Amazing Fantasy #15, que aparece como leitura de contexto). Essa correção também se aplica ao onboarding, que foi esclarecido textualmente. O lote não sobrescreve estados `Sim` ou `Pulei`, e a seleção é revalidada depois do diálogo para não reverter alterações feitas enquanto este estava aberto.
- Preferência `readThrough` só é atualizada **depois da confirmação e aplicação bem-sucedida**; em cancelamento, permanece inalterada. O Desfazer também restaura essa preferência quando ainda corresponde ao lote desfeito. Não houve alteração da chave, versão ou estrutura do storage.
- Resumo calculado em **uma passagem pelo plano**, separando lidas, puladas e pendentes e determinando a próxima leitura sem contar `Pulei` como `Sim`. O plano só é reconstruído se profundidade ou consulta de Foco mudarem. Quando progresso muda na Checklist, a Home lê o estado global já atualizado.
- Meta semanal permanece local e secundária. Removida apenas a duplicação do marco histórico no bloco da meta; fase e próximo marco permanecem na seção "Na sua jornada". Sincronização offline/bloqueada mantém aviso discreto; se houver bloqueio, a Home fornece acesso às Configurações.

## Arquivos alterados/adicionados

- `src/views/HomeView.tsx`: interface da Home, estado e ações.
- `src/views/home-model.ts` (**novo**): resumo puro dos três status.
- `src/progress/read-through.ts` (**novo**): seleção histórica pura e preview compartilhado.
- `src/runtime/controller.ts`: confirmação, revalidação, sincronização do marcador histórico e restauração via Desfazer. Sem alterações no motor de sync.
- `src/views/MoreView.tsx`: remove o fluxo duplicado.
- `src/components/Onboarding.tsx`: esclarece os limites do lote histórico.
- `src/engagement/EngagementCard.tsx`: elimina redundância de marcos.
- `src/styles.css`, `src/design-system.css`: layout da Home e remoção de regras não utilizadas.
- `scripts/check-ux-stage4.mjs` (**novo**), `scripts/check-stage5-private.mjs`, `package.json`: validações locais e ajuste da verificação de marco para a nova seção, sem relaxar a política privada.
- `tests/e2e/home-stage4.spec.ts` (**novo**), `tests/e2e/spider-guia.spec.ts`: regressões de cancelamento, confirmação, desfazer, estados, rotas, Home responsiva e comportamento de onboarding.

## Verificações realmente executadas

- `npm run ux:stage4:check`: **14/14 verificações locais aprovadas**.
- Scripts de navegação Etapa 1, UI Etapa 2, progresso Etapa 3, privacidade, preferências, catálogo e IDs: **aprovados**.
- `npm run reset:smoke` e `npm run reset:local-smoke`: **aprovados**; não equivalem a validação remota com RLS real.
- Transpilação **sintática** de TypeScript/TSX via TypeScript global e parser CSS: **aprovados**. Não constitui `tsc --noEmit` completo.
- `npm install --offline`: **falhou** (`ENOTCACHED`, sem dependências no cache).
- `npm run e:check`: **interrompido** ao chamar `eslint` (não instalado). Verificações anteriores ao lint passaram.
- `npm run build`: **não concluído**: pacote `zod` ausente na execução de `data:build`.
- `npm run test:e2e`: **não executado**: Playwright não instalado. Testes escritos, não homologados. Nenhuma captura real em navegador ou varredura de acessibilidade automatizada foi realizada.

### Homologação recomendada em ambiente com npm

1. `npm install && npm run e:check && npm run build && npm run test:e2e`.
2. Conferir visualmente larguras 320, 360, 390, 768, 1024 e 1440 px, temas claro/escuro/automático, zoom e teclado.
3. Testar Home → Checklist → marcar, pular e desfazer → voltar à Home, com e sem rede.
4. Testar `Já li até...` com progresso previamente lido/pulado, Cancelar, Confirmar, Desfazer, sem alterar Extras e com alteração simultânea de estado durante a confirmação.

**Não começar a Etapa 5** sem aprovação da presente entrega.
