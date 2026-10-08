# Patch de CI — Lucide Icons / Ajuda → Fontes

## Causa real

O teste `tests/e2e/help-settings-stage6.spec.ts`, em `Etapa 6 · fontes agrupadas e busca restaurada na URL sem mudar links editoriais`, procurava o **nome acessível literal** `Abrir fonte ↗`.

Após a migração para `lucide-preact`, a interface exibe `Abrir fonte` seguido de um SVG `ExternalLink` com `aria-hidden="true"`, que corretamente não integra o nome acessível. O Playwright esperava o símbolo antigo (`↗`) e estourava o timeout de 30 segundos, mesmo com o link presente.

## Alteração

Somente o teste foi alterado:
- Localiza `a.source-link` na linha de fonte já expandida, sem depender do caractere do ícone.
- Exige que o link esteja visível, tenha nome acessível `Abrir fonte` e contenha uma URL HTTP(S).
- Não desabilita o teste nem aumenta artificialmente seu timeout.

Nenhum arquivo de produção, catálogo, URLs, progresso, login ou Supabase foi alterado. A falha intermitente em `final-quality-stage7.spec.ts` passou no retry, e seus logs não são conclusivos sobre a causa; portanto não houve alteração especulativa nesse fluxo.

## Aplicar

Extraia o ZIP e copie `tests/e2e/help-settings-stage6.spec.ts` para o mesmo caminho no repositório (não apague `.git`). Faça commit e push.

Execute `npx playwright test tests/e2e/help-settings-stage6.spec.ts` para verificar especificamente a correção ou `npm run test:e2e` para toda a suíte. O CI do GitHub fará isso automaticamente após o push.

## Base

Preparado sobre `spider-guia-lucide-icons-projeto-completo.zip`, antes da reclassificação dos Extras 60/40; é compatível com essa reclassificação porque só altera um teste E2E.
