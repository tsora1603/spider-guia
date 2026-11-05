# CI e testes

O Actions valida cada atualização de PR uma vez. Após o merge, valida a `main` e publica o mesmo build testado. Essa segunda validação protege o resultado da integração e os pushes diretos. Os nomes dos checks obrigatórios foram preservados.

## O que foi simplificado

| Antes | Agora / cobertura preservada |
| --- | --- |
| `push` em qualquer branch + `pull_request` | PRs, push na `main` e execução manual |
| Sequência de leitura executada duas vezes | Uma vez, dentro de `e:check` |
| Tipos e geração repetidos antes do build de navegador | CI valida primeiro e usa `build:bundle`; build local continua completo |
| Contrato de rotas com transpilações temporárias | `tests/unit/router.test.ts` já cobre esses casos |
| Smoke local de reset com módulos transpilados e stubs | `tests/unit/local-reset.test.ts` cobre limpeza, falhas e bloqueio; E2E cobre a interface |
| Teste que copiava nomes, etapas e valores do YAML | Removido; o próprio workflow executa os checks e verifica a publicação |
| Regex e E2E exigindo nomes/classes específicos do Lucide | Removidos; navegação, alvos de toque e responsividade continuam testados |
| Oito larguras de tela no mesmo fluxo | 320, 899, 900 e 1440 px: extremos e os dois lados do breakpoint |
| Overflow repetido em tema automático | Claro e escuro; preferência automática continua no teste funcional existente |
| Vídeo de toda execução e relatório em sucesso | Trace e screenshot de falhas; relatório enviado quando houver falha |

A suíte de navegador passou de 131 para 124 casos. Os 146 testes unitários foram mantidos. Não há estimativa de tempo total: instalação do Chromium e disponibilidade dos runners variam.

## O que continua necessário

- Progresso, backup, login, sincronização e reset: falhas podem perder ou restaurar indevidamente dados do leitor. O smoke remoto continua porque integra geração do servidor, resposta perdida e retomada do reset no mesmo fluxo.
- Integridade editorial, IDs, dados reproduzíveis, links e spoilers: protegem o catálogo e os leitores.
- Fluxos reais de navegação, teclado, carregamento de chunks, filtros e leitura em dispositivos pequenos.
- Build de produção, subdiretório do Pages e hashes da publicação: validam o artefato entregue.

Antes de acrescentar um teste, identifique uma falha observável que ele detecta e confira se já existe cobertura. Prefira testes unitários para regras puras; reserve o navegador para integração e comportamento da interface. Não use testes para congelar detalhes internos ou reproduzir a própria configuração.
