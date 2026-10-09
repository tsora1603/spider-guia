import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('aranha-reading-preferences-v1')) {
      localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({
        version: 1, onboardingComplete: true, depth: 'complete', focusQuery: '', readThrough: 0
      }));
    }
  });
});

test('séries consecutivas preservam Amazing Fantasy e o Annual entre as edições', async ({ page }) => {
  await page.goto('/#checklist');
  const groups = page.locator('.checklist-series-group');
  await expect(groups.nth(0)).toHaveAttribute('data-series', 'Amazing Fantasy');
  await expect(groups.nth(0).locator('.issue-entry')).toHaveAttribute('data-reading-id', '1');
  await expect(groups.nth(0).getByRole('button', { name: 'Link de leitura ainda não cadastrado' })).toBeDisabled();
  await expect(groups.nth(1)).toHaveAttribute('data-series-key', 'series-2');
  await expect(groups.nth(2)).toHaveAttribute('data-series-key', 'series-1227');
  await expect(groups.nth(3)).toHaveAttribute('data-series-key', 'series-18');
  const firstSeries = page.locator('[data-series-key="series-2"]');
  const toggle = firstSeries.locator('.checklist-series-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(firstSeries.locator('.issue-entry')).toHaveCount(16);
  expect(await firstSeries.locator('.issue-entry').evaluateAll(rows => rows.map(row => Number(row.getAttribute('data-reading-id')))))
    .toEqual(Array.from({ length: 16 }, (_, index) => index + 2));
  await toggle.click();
  await expect(firstSeries.locator('.issue-entry')).toHaveCount(0);
  await expect(groups.nth(2)).toHaveAttribute('data-series-key', 'series-1227');
});

test('botões verdes do grupo e da edição abrem o destino e permitem voltar', async ({ page }) => {
  await page.goto('/#checklist');
  const group = page.locator('[data-series-key="series-2"]');
  const groupLink = group.getByRole('button', { name: 'Ver links de The Amazing Spider-Man (1963) #1–#16', exact: true });
  await expect(groupLink).toHaveCSS('background-color', 'rgb(22, 115, 66)');
  await groupLink.click();
  await expect(page).toHaveURL(/#explorar\/links\?link=spider-man-1963/);
  await expect(page.locator('.link-card.is-targeted')).toBeFocused();
  await page.getByRole('button', { name: 'Voltar à leitura' }).click();
  const row = page.locator('#hq-2');
  await expect(row).toBeVisible();
  await expect(group.locator('.checklist-series-toggle')).toHaveAttribute('aria-expanded', 'true');
  await expect(row.locator('details')).not.toHaveAttribute('open', '');
  await row.getByRole('button', { name: /Marcar como lida/ }).click();
  await row.getByRole('button', { name: 'Ver links desta leitura' }).click();
  await expect(page).toHaveURL(/link=spider-man-1963/);
  await page.goBack();
  await expect(page.locator('#hq-2')).toHaveAttribute('data-progress-status', 'Sim');
  await expect(page.locator('#hq-2')).toBeFocused();
});

test('busca mantém separados os trechos da mesma série', async ({ page }) => {
  await page.goto('/#checklist');
  await page.getByRole('searchbox', { name: 'Buscar na Checklist' }).fill('The Amazing Spider-Man (1963)');
  const groups = page.locator('.checklist-series-group');
  await expect(groups.nth(0)).toHaveAttribute('data-series-key', 'series-2');
  await expect(groups.nth(1)).toHaveAttribute('data-series-key', 'series-18');
  await groups.nth(0).locator('.checklist-series-toggle').click();
  await expect(page.locator('#hq-2')).toBeVisible();
  await page.locator('#hq-2').getByRole('button', { name: /Marcar como lida/ }).click();
  await page.getByRole('button', { name: /Filtrar Checklist por status ou peso/ }).click();
  await page.getByRole('button', { name: 'Pendentes', exact: true }).click();
  await expect(page.locator('#hq-2')).toHaveCount(0);
  await expect(page.locator('#hq-3')).toBeVisible();
  await expect(groups.first()).toHaveAttribute('data-series-key', 'series-2');
});

test('link profundo abre um grupo distante e preserva seus detalhes ao recolher', async ({ page }) => {
  await page.goto('/#checklist/hq/1100');
  const row = page.locator('#hq-1100');
  await expect(row).toBeFocused();
  const groupKey = await page.locator('.checklist-series-group').filter({ has: row }).getAttribute('data-series-key');
  const group = page.locator(`[data-series-key="${groupKey}"]`);
  const toggle = group.locator('.checklist-series-toggle');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await row.locator('summary').click();
  await expect(row.locator('details')).toHaveAttribute('open', '');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await expect(row.locator('details')).toHaveAttribute('open', '');
});

test('dropdowns e links têm controles separados e funcionam por teclado', async ({ page }) => {
  await page.goto('/#checklist');
  const group = page.locator('[data-series-key="series-2"]');
  const toggle = group.locator('.checklist-series-toggle');
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Space');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Tab');
  await expect(group.locator('.reading-links-cta').first()).toBeFocused();
  await expect(group.locator('button button, summary button')).toHaveCount(0);
});

test('grupos e botões cabem no celular, inclusive com título comprido', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.goto('/#checklist');
  await page.locator('[data-series-key="series-2"] .checklist-series-toggle').click();
  const row = page.locator('#hq-2');
  const link = row.getByRole('button', { name: 'Ver links desta leitura' });
  await expect(link).toBeVisible();
  const bounds = await link.boundingBox();
  expect(bounds!.height).toBeGreaterThanOrEqual(44);
  expect(bounds!.width).toBeGreaterThanOrEqual(44);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await row.scrollIntoViewIfNeeded();
  await page.screenshot({ path: '/tmp/spider-checklist-mobile.png' });
  await page.goto('/#checklist/hq/707');
  await expect(page.locator('#hq-707')).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('a flag de Links oculta as ações dos grupos e das edições', async ({ page }) => {
  await page.route('**/config.js', route => route.fulfill({ contentType: 'application/javascript', body: 'window.LINKS_ENABLED = false;' }));
  await page.goto('/#checklist/hq/2');
  await expect(page.locator('#hq-2')).toBeVisible();
  await expect(page.locator('.checklist-series-group .reading-links-cta')).toHaveCount(0);
});
