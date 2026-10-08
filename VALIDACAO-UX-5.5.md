# Etapa 5.5 — experiência de leitura

## Decisões
- A marcação individual usa o próprio estado visual como feedback; sync continua tratando erros.
- A Home prioriza próxima leitura e atualização por número histórico, depois indicadores e marcos.
- O seletor de spoiler mantém `select` nativo acessível a teclado/leitores de tela, mas recebe aparência integrada aos controles.
- Glossário utiliza cards com expansão nativa, alinhados à Metodologia.
- Jornada, Links, Fontes e demais listas compartilham affordances de hover/foco sem alterar conteúdo ou URLs.

## Validação manual
- [ ] Celular estreito (320–420px): CTA, campo numérico e cartões sem transbordamento.
- [ ] Desktop: próxima leitura e atualização rápida visíveis no topo sem grandes lacunas.
- [ ] Marcar/desmarcar uma HQ: mudança silenciosa; sincronização e erro ainda funcionam.
- [ ] Já li até: confirmação, cancelar, desfazer, limite de 1 a 1000 e persistência.
- [ ] Seleção de spoilers: mouse, Tab, setas, Enter, leitores de tela; ambos os temas.
- [ ] Glossário: busca com/sem resultados; expansão e fechamento por teclado.
- [ ] Jornada, Extras, Clone, Links, Fontes: foco, expansão, densidade, responsividade.
- [ ] Links pré-existentes, progresso offline/sync e rotas antigas.
- [ ] Build, unitários e E2E no ambiente com dependências instaladas.

## Ambiente de verificação
A distribuição recebida não contém package-lock.json nem node_modules. npm ci não pode ser usado sem lockfile; a tentativa npm install offline falhou por pacote ausente no cache, e a tentativa online excedeu o tempo de execução. Portanto os testes não foram declarados como aprovados.
