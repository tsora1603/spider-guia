import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({
    version: 1, onboardingComplete: true, depth: 'essential', focusQuery: '', readThrough: 0
  })));
});

async function openIssue(page: import('@playwright/test').Page, id: number) {
  await page.goto(`/#checklist/hq/${id}`);
  const row = page.locator(`#hq-${id}`);
  await expect(row).toBeVisible();
  const details = row.locator(':scope > details');
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator('summary').click();
  }
  return row;
}

test.describe('Etapa 3 — Links contextuais da leitura', () => {
  test('HQ individual abre o card exato, recebe foco e oferece retorno', async ({ page }) => {
    const row = await openIssue(page, 256);
    await expect(row).not.toContainText('Onde encontrar no Brasil');
    const cta = row.getByRole('button', { name: /Ver links desta leitura/ });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page).toHaveURL(/#explorar\/links\?link=leitura-5/);
    const target = page.locator('.links-list .link-card.is-targeted');
    await expect(target).toHaveCount(1);
    await expect(target).toBeFocused();
    await expect(target).toContainText('Marvel Team-Up');
    await page.getByRole('button', { name: 'Voltar à leitura' }).click();
    await expect(page).toHaveURL(/#checklist\/hq\/256/);
    await expect(page.locator('#hq-256')).toBeVisible();
  });

  test('Links para Extras usam fichas específicas e voltam ao conjunto', async ({ page }) => {
    await page.goto('/#explorar/extras?extra=256-257-258');
    const card = page.locator('[data-explore-target="extra"]');
    await expect(card).toContainText('Marvel Team-Up');
    await expect(card.getByRole('button', { name: 'Ver links desta leitura' })).toBeVisible();
    await expect(card).not.toContainText('Edição brasileira:');
    await card.getByRole('button', { name: 'Ver links desta leitura' }).click();
    await expect(page.locator('.link-card.is-targeted')).toHaveCount(1);
    await page.getByRole('button', { name: 'Voltar à leitura' }).click();
    await expect(page.locator('[data-explore-target="extra"]')).toContainText('Marvel Team-Up');
  });

  test('sem vínculo explícito não existe CTA por aproximação de numeração LGY', async ({
    page
  }) => {
    const row = await openIssue(page, 1);
    await expect(row.getByRole('button', { name: 'Ver links desta leitura' })).toHaveCount(0);
  });

  test('vários grupos selecionados aparecem juntos, com foco, sem dropdowns', async ({ page }) => {
    await page.goto('/#explorar/links?link=leitura-5&link=leitura-6');
    await expect(page.locator('.links-list .link-card')).toHaveCount(2);
    await expect(page.locator('.links-list .is-targeted')).toHaveCount(2);
    await expect(page.locator('.links-list .link-card').first()).toBeFocused();
    await expect(page.locator('.links-list summary, .links-list details')).toHaveCount(0);
    await page.getByRole('button', { name: 'Ver todos os links' }).click();
    await expect(page.locator('.links-list .link-card')).toHaveCount(34);
    await page.goBack();
    await expect(page.locator('.links-list .is-targeted')).toHaveCount(2);
  });

  test('busca, histórico, largura e teclado funcionam em desktop e mobile', async ({ page }) => {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      const row = await openIssue(page, 256);
      await row.getByRole('button', { name: 'Ver links desta leitura' }).click();
      await expect(page.locator('.link-card.is-targeted')).toBeFocused();
      await page.goBack();
      await expect(page.locator('#hq-256')).toBeVisible();
      await page.goto('/#explorar/links?lq=Marvel');
      await expect(page.getByRole('searchbox', { name: 'Buscar links' })).toHaveValue('Marvel');
      await page.getByRole('searchbox', { name: 'Buscar links' }).fill('Guerras Secretas');
      await expect(page.locator('.links-list .link-card')).toHaveCount(1);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
    }
  });
});
