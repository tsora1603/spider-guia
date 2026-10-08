import { expect, test, type Page } from '@playwright/test';

async function prepare(page: Page, theme: 'dark' | 'light' | 'auto' = 'dark', scale: 'default' | 'large' = 'default') {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.fulfill({ status: 204, body: '' }));
  await page.addInitScript(({ theme, scale }) => {
    localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({ version: 1, onboardingComplete: true, depth: 'essential', focusQuery: '', readThrough: 0 }));
    localStorage.setItem('aranha-design-preferences-v1', JSON.stringify({ version: 1, theme, fontScale: scale, focusMode: false }));
  }, { theme, scale });
}

async function noPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

for (const width of [320, 360, 390, 768, 899, 900, 1024, 1440]) {
  test(`Etapa 7 · menu, conteúdo e responsividade em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await prepare(page);
    await page.goto('/#hoje');
    await expect(page.locator('#nav button')).toHaveCount(5);
    await noPageOverflow(page);
    const nav = page.locator('#nav');
    const position = await nav.evaluate(node => getComputedStyle(node).position);
    if (width < 900) {
      expect(position).toBe('fixed');
      const bounds = await nav.boundingBox();
      expect(bounds).not.toBeNull();
      expect(Math.abs((bounds!.y + bounds!.height) - 800)).toBeLessThanOrEqual(2);
      const sideHeight = await page.locator('.side').evaluate(node => node.getBoundingClientRect().height);
      expect(sideHeight).toBeLessThan(280); // regression: old 860–899px rules forced 100vh
    } else {
      expect(position).toBe('static');
      expect(await page.locator('.side').evaluate(node => getComputedStyle(node).position)).toBe('sticky');
    }
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Ajuda' }).click();
    await expect(page).toHaveURL(/#ajuda$/);
    await noPageOverflow(page);
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Configurações' }).click();
    await expect(page).toHaveURL(/#configuracoes$/);
    await noPageOverflow(page);
  });
}

for (const theme of ['dark', 'light', 'auto'] as const) {
  test(`Etapa 7 · fonte grande e tema ${theme} sem overflow`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await prepare(page, theme, 'large');
    for (const url of ['#hoje', '#checklist', '#explorar/extras', '#ajuda/fontes', '#configuracoes']) {
      await page.goto(`/${url}`);
      await expect(page.locator('#app')).toBeVisible();
      await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'large');
      await noPageOverflow(page);
    }
  });
}

test('Etapa 7 · filtro com teclado fecha por Escape e devolve o foco', async ({ page }) => {
  await prepare(page);
  await page.goto('/#checklist');
  const trigger = page.getByRole('button', { name: /Filtrar Checklist por status ou peso/ });
  await trigger.focus();
  await page.keyboard.press('ArrowDown');
  await expect(trigger).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('.filter-option').first()).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole('button', { name: 'Pendentes', exact: true }).click();
  await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await expect(trigger).toContainText('Pendentes');
});

test('Etapa 7 · estado local não se apresenta como progresso sincronizado', async ({ page }) => {
  await prepare(page);
  await page.goto('/#hoje');
  const status = page.locator('.side .sync-status');
  await expect(status).toHaveAttribute('data-state', 'local');
  await expect(status).toHaveText('Neste dispositivo');
});

test('Etapa 7 · acessibilidade de diálogos e preferência de menos movimento', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 320, height: 560 });
  await prepare(page);
  await page.goto('/#configuracoes');
  await page.getByRole('button', { name: 'Resetar todos os dados' }).click();
  const dialog = page.locator('.device-reset-dialog');
  await expect(dialog).toBeVisible();
  const result = await dialog.evaluate(node => ({ maxHeight: parseFloat(getComputedStyle(node).maxHeight), overflowY: getComputedStyle(node).overflowY }));
  expect(result.maxHeight).toBeLessThanOrEqual(560);
  expect(result.overflowY).toBe('auto');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
});


test('Etapa 7 · pular para o conteúdo mantém a rota e move o foco ao main', async ({ page }) => {
  await prepare(page);
  await page.goto('/#ajuda');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Pular para o conteúdo' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#ajuda$/);
  await expect(page.locator('#app')).toBeFocused();
});

test('Etapa 7 · aliases de URLs antigas continuam funcionando com parâmetros', async ({ page }) => {
  await prepare(page);
  for (const [oldHash, canonical] of [
    ['#inicio', '#hoje'],
    ['#ler/checklist?f=pendentes', '#checklist?f=pendentes'],
    ['#conta/fontes?origem=legado', '#ajuda/fontes?origem=legado'],
    ['#mais/metodologia', '#ajuda/metodologia'],
    ['#hq/2', '#checklist/hq/2']
  ]) {
    await page.goto(`/${oldHash}`);
    await expect.poll(() => page.evaluate(() => location.hash)).toBe(canonical);
    await expect(page.locator('#app')).toBeVisible();
  }
});
