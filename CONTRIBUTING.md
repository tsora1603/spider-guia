# Contribuir pelo GitHub

Comece pelo [README](README.md), pelo [guia de execução](docs/HOSPEDAGEM.md) e pelas regras de [manutenção dos dados e links](docs/MANUTENCAO.md). Não é necessário administrar o Pages ou o banco de produção para propor alterações. Pull requests executam os checks; a publicação acontece somente após integração à `main` e aprovação de todos os testes.

## Preparar e enviar uma alteração

1. Crie um fork se não tiver permissão de escrita, clone sua cópia e instale com `npm ci` (Node 24).
2. Crie uma branch: `git switch -c docs/instrucoes-hospedagem` (use um nome adequado à tarefa).
3. Edite os arquivos-fonte. Para dados, execute `npm run data:build` e inclua os artefatos gerados que já são versionados; não os edite manualmente.
4. Confira a mudança no navegador e rode os comandos adequados em [Manutenção](docs/MANUTENCAO.md#comandos-úteis). Para código/dados, use `npm run ci`; para fluxos de interface, execute também os testes pertinentes do Playwright. Para documentação, confira links relativos, comandos e formatação.
5. Revise `git diff` e `git status`. Não inclua configurações pessoais do Supabase, segredos, `node_modules/`, `dist/` nem relatórios de testes.
6. Adicione apenas os arquivos desejados, crie o commit, envie a branch com `git push -u origin NOME-DA-BRANCH` e abra um pull request para a branch de destino do projeto.

No pull request, explique o problema, a mudança, os comandos de validação e o resultado. Inclua capturas de tela quando ajudarem a revisar uma alteração visual. Correções de links devem informar o grupo, o endereço anterior e o novo; mudanças no baseline precisam explicar por que são necessárias. Alterações editoriais precisam citar evidências e preservar IDs/ordem de leitura ou descrever sua migração.

## Revisão e integração

Quem mantém o repositório deve conferir o diff, os checks de **Quality and GitHub Pages** e a prévia quando houver. Configure regras de proteção da branch de produção com revisão e checks obrigatórios para impedir integração antes da validação. Essas regras são configurações do GitHub e não são ativadas por este documento.

Após integrar, confira o job **Publish GitHub Pages** e teste a versão publicada. Para reverter um problema, envie um commit de reversão à `main`; o workflow valida e publica novamente, preservando o histórico. Mudanças no banco têm procedimento próprio em [Supabase e segurança](docs/SUPABASE-E-SEGURANCA.md).

Para relatar um problema, abra uma issue com URL/rota, comportamento esperado, passos para reproduzir, navegador e capturas úteis. Remova dados pessoais, tokens e backups de progresso antes de anexar arquivos.
