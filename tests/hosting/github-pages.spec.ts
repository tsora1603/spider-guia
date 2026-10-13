import { expect, test } from '@playwright/test';

test('Pages: assets, chunks, rotas por hash e progresso funcionam na subpasta', async ({
  page
}) => {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 204, body: '' })
  );
  // Mantém config.js real; nenhuma consulta de conta é necessária neste teste estático.
  await page.route('https://*.supabase.co/**', (route) =>
    route.fulfill({ contentType: 'application/json', body: '[]' })
  );
  await page.addInitScript(() => {
    localStorage.setItem(
      'aranha-reading-preferences-v1',
      JSON.stringify({
        version: 1,
        onboardingComplete: true,
        depth: 'complete',
        focusQuery: '',
        readThrough: 0
      })
    );
  });

  const localResponses: { pathname: string; status: number }[] = [];
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => {
    const url = new URL(response.url());
    if (url.origin === 'http://127.0.0.1:4174') {
      localResponses.push({ pathname: url.pathname, status: response.status() });
    }
  });

  await page.goto('./#checklist/hq/1302');
  const volume = page.locator('#hq-1302');
  await expect(volume).toBeVisible();
  await volume.getByRole('button', { name: /Marcar como lida/ }).click();
  await expect(volume).toHaveAttribute('data-progress-status', 'Sim');
  await page.reload();
  await expect(volume).toHaveAttribute('data-progress-status', 'Sim');

  await volume.getByRole('button', { name: 'Ver este volume no guia' }).click();
  await expect(page).toHaveURL(/\/spider-guia\/#explorar\/clone\?passo=panini-saga-01$/);
  await expect(page.locator('[data-clone-section="base"] [data-clone-step]')).toHaveCount(19);
  await page.reload();
  await expect(page.locator('#clone-step-panini-saga-01')).toBeVisible();

  await page.goto('./#explorar/links');
  await expect(page.getByRole('searchbox', { name: 'Buscar links' })).toBeVisible();
  await expect(page.locator('.links-list article').first()).toBeVisible();
  await page.goto('./#configuracoes');
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toBeVisible();
  await page.goto('./#hoje');
  await expect(page.getByRole('heading', { name: 'Já li até...' })).toBeVisible();

  const icon = await page.locator('link[rel="icon"]').getAttribute('href');
  expect(icon).toBeTruthy();
  const iconResponse = await page.request.get(new URL(icon!, page.url()).href);
  expect(iconResponse.status()).toBe(200);
  expect(iconResponse.headers()['content-type']).toContain('image/png');
  const configResponse = localResponses.find(
    (response) => response.pathname === '/spider-guia/config.js'
  );
  expect(configResponse?.status).toBe(200);
  expect(localResponses.some((response) => response.pathname === '/spider-guia/validator.js')).toBe(
    true
  );
  expect(
    localResponses.filter((response) => /\/assets\/.*\.js$/.test(response.pathname)).length
  ).toBeGreaterThan(1);
  expect(localResponses.every((response) => response.pathname.startsWith('/spider-guia/'))).toBe(
    true
  );
  expect(localResponses.filter((response) => response.status >= 400)).toEqual([]);
  expect(errors).toEqual([]);
});
