# Home 5.6 — espaço de leitura, não dashboard de cards

## Decisão de produto

A Home é uma **mesa de leitura orientada a tarefas**, com conteúdo em fluxo editorial. A ordem da informação segue o que a pessoa precisa fazer, não uma coleção de estatísticas: **continuar uma HQ ou registrar várias de uma vez → conferir avanço e meta pessoal → consultar fase e próximo marco**.

## O que mudou

- Um único bloco contínuo reúne a próxima leitura e a ação “Já li até...”, sem cartões independentes. O formulário mantém a confirmação prévia existente em `markUpTo`.
- Progresso do plano e meta semanal ficam dentro desse bloco, separados por divisórias, sem círculos, tiles nem métricas redundantes.
- Fase atual, próximo marco editorial e extras passam a formar uma sequência simples de linhas; extras ficam recolhidas até serem solicitadas.
- Busca acessível continua disponível na Home e o atalho de teclado permanece. O layout adapta-se ao mobile e evita colunas estreitas.
- Dados, IDs, critérios editoriais, lógica de sync, rotas, links e cadastro de preferências de leitura não foram modificados.

## Validação manual

- [ ] Em 360 px, 645 px e desktop, verificar legibilidade, sem rolagem horizontal ou elementos sobrepostos.
- [ ] Em tema escuro e claro, conferir contraste, bordas, estados de foco e botões.
- [ ] Abrir a próxima leitura e confirmar a navegação para a HQ correta na Checklist.
- [ ] Em “Já li até...”, testar entrada inválida, número válido e **a confirmação antes da gravação**.
- [ ] Alterar a meta semanal, recarregar e verificar persistência.
- [ ] Concluir uma HQ, voltar à Home e verificar atualizações de próxima leitura/progresso/fase.
- [ ] Em Explorar, conferir que o botão de jornada e as leituras extras levam ao destino esperado.
- [ ] Testar os níveis de spoiler, tabulação por teclado e leitor de tela para labels e progressos.
- [ ] Confirmar exibição do estado de sincronização offline/online e ausência de toast por HQ isolada.

## Testes

Três casos E2E foram adicionados: hierarquia sem mosaico, adaptação com sidebar e formulário/mobile. Para verificar em ambiente com dependências instaladas: `npm ci` (quando houver lockfile) ou `npm install`, `npm run build`, `npm run test:unit` e `npm run test:e2e`.
