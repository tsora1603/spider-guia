import { test, expect } from '@playwright/test';
import { configuredCloneSteps } from '../fixtures/configured-links';

test.beforeEach(async ({ page }) => {
  await page.route('**/config.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "window.SUPABASE_URL='';window.SUPABASE_ANON_KEY='';window.LINKS_ENABLED=true;"
    })
  );
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({
      contentType: 'text/css',
      body: ''
    })
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      'aranha-reading-preferences-v1',
      JSON.stringify({
        version: 1,
        onboardingComplete: true,
        depth: 'essential',
        focusQuery: '',
        readThrough: 0
      })
    );
    localStorage.setItem('aranha-progress-v1', JSON.stringify({ 2: 'Sim' }));
  });
});

test('Hoje não baixa descrições ou SDK; as seções carregam conteúdo sem alterar progresso', async ({
  page
}) => {
  const scripts: string[] = [];
  page.on('request', (request) => {
    if (request.resourceType() === 'script') scripts.push(request.url());
  });
  await page.goto('/#hoje');
  await expect(page.getByText('Sua próxima leitura')).toBeVisible();
  expect(scripts.some((url) => /generated-(extra|clone|help)-details|supabase-sdk/.test(url))).toBe(
    false
  );
  const progress = await page.evaluate(() => localStorage.getItem('aranha-progress-v1'));
  await page.getByRole('button', { name: 'Ajuda', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Glossário', exact: true })).toBeVisible();
  expect(scripts.some((url) => /generated-help-details/.test(url))).toBe(true);
  expect(scripts.some((url) => /generated-(extra|clone)-details/.test(url))).toBe(false);
  await page.getByRole('button', { name: 'Explorar', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Saga do Clone', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Saga do Clone', exact: true }).click();
  await expect(page.locator(`[data-clone-step="${configuredCloneSteps[0].id}"]`)).toBeVisible();
  expect(scripts.some((url) => /generated-extra-details/.test(url))).toBe(true);
  expect(scripts.some((url) => /generated-clone-details/.test(url))).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toBe(progress);
});

test('falha de um arquivo editorial oferece recuperação e preserva progresso', async ({ page }) => {
  await page.route('**/generated-help-details-*.js', (route) => route.abort());
  await page.goto('/#ajuda');
  await expect(page.getByText('Não foi possível abrir Ajuda')).toBeVisible();
  const progress = await page.evaluate(() => localStorage.getItem('aranha-progress-v1'));
  await page.unroute('**/generated-help-details-*.js');
  await page.getByRole('button', { name: 'Tentar novamente' }).click();
  await expect(page.getByRole('button', { name: 'Glossário', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toBe(progress);
});

test('diagnóstico valida o catálogo completo usando os chunks existentes', async ({ page }) => {
  await page.goto('/?debug=1#hoje');
  await expect
    .poll(() => page.evaluate(() => (window.__SPIDER_VALIDATION__ as { ok?: boolean })?.ok))
    .toBe(true);
});
