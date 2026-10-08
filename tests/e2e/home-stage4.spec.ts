import { expect, test, type Page } from '@playwright/test';

async function seedHome(page: Page, options: { progress?: Record<string, string>; baseline?: number; depth?: string; focusQuery?: string } = {}) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.fulfill({ status: 204, body: '' }));
  await page.addInitScript(({ progress, baseline, depth, focusQuery }) => {
    localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({
      version: 1, onboardingComplete: true, depth: depth || 'essential', focusQuery: focusQuery || '', readThrough: baseline || 0
    }));
    localStorage.setItem('aranha-progress-v1', JSON.stringify(progress || {}));
  }, options);
}

const storedProgress = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}'));
const storedBaseline = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('aranha-reading-preferences-v1') || '{}').readThrough);

test('Hoje: prévia, cancelar, confirmar e desfazer preservam Extras, Sim e Pulei', async ({ page }) => {
  await seedHome(page, { baseline: 2, progress: { 2: 'Sim', 3: 'Pulei' } });
  await page.goto('/#hoje');
  await page.locator('#home-read-through').fill('5');
  await expect(page.locator('#home-read-through-preview')).toContainText('3 edições principais a marcar');
  const before = await storedProgress(page);
  const confirm = page.locator('#confirmdlg');
  await page.getByRole('button', { name: 'Revisar e atualizar' }).click();
  await expect(confirm).toContainText('3 edições principais serão marcadas');
  await expect(confirm).toContainText('1 pulada');
  await expect(confirm).toContainText('Extras e leituras fora da linha histórica não serão marcados');
  await confirm.getByRole('button', { name: 'Cancelar' }).click();
  await expect(confirm).toBeHidden();
  expect(await storedProgress(page)).toEqual(before);
  expect(await storedBaseline(page)).toBe(2);

  await page.getByRole('button', { name: 'Revisar e atualizar' }).click();
  await confirm.getByRole('button', { name: 'Marcar como lidas' }).click();
  await expect.poll(() => storedBaseline(page)).toBe(5);
  await expect.poll(() => storedProgress(page)).toMatchObject({ 2: 'Sim', 3: 'Pulei', 4: 'Sim', 5: 'Sim', 6: 'Sim' });
  expect((await storedProgress(page))['1']).toBeUndefined();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect.poll(() => storedProgress(page)).toEqual(before);
  await expect.poll(() => storedBaseline(page)).toBe(2);
});

test('Hoje: progresso do plano diferencia lidas, puladas e pendentes; plano configurável', async ({ page }) => {
  await seedHome(page, { progress: { 2: 'Sim', 3: 'Pulei' }, depth: 'complete' });
  await page.goto('/#hoje');
  const progress = page.locator('.home-plan');
  await expect(progress).toContainText('Plano ativo · Completo');
  await expect(progress).toContainText('pulada');
  await expect(progress).toContainText('por ler');
  await expect(page.getByRole('button', { name: /Plano: Completo/ })).toBeVisible();
  await page.getByRole('button', { name: /Plano: Completo/ }).click();
  await expect(page).toHaveURL(/#configuracoes/);
  await expect(page.locator('#account-read-through')).toHaveCount(0);
});

test('Hoje: plano de foco sem resultados não bloqueia alteração de preferências', async ({ page }) => {
  await seedHome(page, { depth: 'focus', focusQuery: 'zzzz-sem-leituras-9876' });
  await page.goto('/#hoje');
  await expect(page.getByText('Nenhuma leitura encontrada para este plano')).toBeVisible();
  await page.getByRole('button', { name: 'Ajustar preferências' }).click();
  await expect(page).toHaveURL(/#configuracoes/);
});

test('Hoje: ação de registro acessível no mobile e sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 740 });
  await seedHome(page);
  await page.goto('/#hoje');
  await expect(page.locator('.home-next')).toBeVisible();
  await expect(page.locator('.home-upto')).toBeVisible();
  await page.locator('#home-read-through').fill('5');
  await expect(page.getByRole('button', { name: 'Revisar e atualizar' })).toBeEnabled();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

for (const width of [320, 390, 768, 1024, 1440]) {
  test(`Hoje: responsividade e ações acessíveis em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seedHome(page);
    await page.goto('/#hoje');
    await expect(page.locator('.home-next')).toBeVisible();
    await expect(page.locator('.home-upto')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const height = await page.getByRole('button', { name: 'Revisar e atualizar' }).evaluate(el => el.getBoundingClientRect().height);
    expect(height).toBeGreaterThanOrEqual(44);
  });
}
