# Contribuir pelo GitHub

1. Crie um fork, clone sua cópia e siga o [README](README.md#começar).
2. Crie uma branch: `git switch -c minha-alteracao`.
3. Edite os arquivos-fonte. Se alterar dados, rode `npm run data:build` e inclua os arquivos gerados versionados.
4. Valide conforme [Manutenção](docs/MANUTENCAO.md#comandos-úteis). Para documentação, confira links e formatação.
5. Revise o diff, faça commit, envie a branch e abra um pull request para `main`.

Descreva o que mudou e como validou. Correções de links devem indicar a URL anterior, a nova e o motivo; alterações editoriais precisam citar fontes. Preserve IDs e ordem de leitura ou documente a migração de progresso.

Mantenha configurações pessoais, segredos, `node_modules/`, `dist/` e relatórios fora do commit.

Quem revisa deve conferir o diff e os checks de **Quality and GitHub Pages**. Administradores podem exigir revisão e checks nas regras de proteção da branch.

Após integrar à `main`, acompanhe **Publish GitHub Pages**. Para desfazer uma alteração, envie um commit de reversão; o workflow publica novamente após validar.

Para relatar problemas, abra uma issue com a rota, passos para reproduzir e navegador usado. Remova dados pessoais de anexos.
