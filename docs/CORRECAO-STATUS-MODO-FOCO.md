# Correção pontual — status visual no Modo Foco

## Reprodução

Com o progresso zerado: abrir **Checklist**, ativar **Modo Foco**, marcar **Amazing Fantasy #15** como lida e clicar em **Próxima**. Antes da correção, o controle de leitura de **The Amazing Spider-Man (1963) #1** podia continuar verde mesmo com o progresso dessa HQ em `Não`.

## Causa

`useProgressStatus(id)` inicializava o status somente na montagem, mantendo o estado local de outra edição quando o mesmo componente recebia um ID novo. A atualização da inscrição por `useEffect` não garantia a recomputação imediata do status para o novo ID. O Modo Foco reutilizava `IssueRow` sem chave por edição.

## Correção

- `src/ui/hooks.ts`: o status renderizado pertence sempre ao `id` atual; a assinatura de notificações do progresso é atualizada ao mudar o ID, com uma reconferência imediata para cobrir eventos entre render e assinatura.
- `src/components/VirtualizedChecklist.tsx`: `IssueRow` do Modo Foco recebe `key={item.id}` para isolar também o estado de detalhes ao trocar de HQ.
- `tests/e2e/spider-guia.spec.ts`: teste que reproduz exatamente a sequência acima, verifica botão, ARIA e progresso armazenado, e volta à HQ anterior para assegurar que ela continua marcada.

Nenhum dado, ID, CSS, migração, operação de progresso, Supabase ou protocolo de reset foi alterado.

## Verificação manual recomendada

1. Fazer backup do progresso, se necessário, e usar uma sessão limpa ou ambiente de testes sem leituras marcadas.
2. Ativar Modo Foco na Checklist, marcar Amazing Fantasy #15 como lida.
3. Clicar em **Próxima**: Amazing Spider-Man #1 deve mostrar **Pendente**, botão sem verde e nenhuma mudança de progresso para essa HQ.
4. Clicar em **Anterior**: Amazing Fantasy #15 deve continuar marcada como lida.
5. Opcional: marcar a segunda HQ como lida, avançar de novo e repetir para verificar a separação de estados consecutivos.

Os testes E2E foram adicionados, mas sua execução requer dependências npm e navegador de testes disponíveis.
