import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({
    version: 1, onboardingComplete: true, depth: 'essential', focusQuery: '', readThrough: 0
  })));
});

/** A Checklist deve evitar duplicar fichas editoriais extensas. */
test('Amazing Fantasy #15 oferece apenas Mais informações e abre a ficha exata em Explorar', async ({ page }) => {
  await page.goto('/#checklist/hq/1');
  const row = page.locator('#hq-1');
  await expect(row).toBeVisible();
  const disclosure = row.locator(':scope > details');
  if (!(await disclosure.evaluate(element => (element as HTMLDetailsElement).open))) {
    await disclosure.locator('summary').click();
  }
  const link = disclosure.getByRole('link', { name: /Mais informações sobre Amazing Fantasy #15/i });
  await expect(link).toBeVisible();
  await expect(link).toHaveAttribute('href', '#explorar/extras?extra=1');
  await expect(disclosure.locator('.extra-more-info-link svg.lucide-info')).toBeVisible();
  await expect(disclosure).not.toContainText('Por que ler:');
  await expect(disclosure).not.toContainText('Quanto ler:');
  await expect(disclosure).not.toContainText('Como encaixar:');
  await expect(disclosure).not.toContainText('Confirmação:');
  await link.click();
  await expect(page).toHaveURL(/#explorar\/extras\?extra=1$/);
  const target = page.locator('[data-explore-target="extra"]');
  await expect(target).toBeVisible();
  await expect(target).toContainText('Amazing Fantasy #15');
  await expect(target).toContainText('Posição:');
  await page.goBack();
  await expect(page.locator('#hq-1')).toBeVisible();
});

test('link de uma edição pertencente a um Extra com várias HQs abre o grupo correto', async ({ page }) => {
  await page.goto('/#checklist/hq/256');
  const row = page.locator('#hq-256');
  await expect(row).toBeVisible();
  const details = row.locator(':scope > details');
  if (!(await details.evaluate(element => (element as HTMLDetailsElement).open))) {
    await details.locator('summary').click();
  }
  const link = details.locator('a.extra-more-info-link');
  await expect(link).toHaveAttribute('href', '#explorar/extras?extra=256-257-258');
  await link.click();
  await expect(page.locator('[data-explore-target="extra"]')).toContainText('Marvel Team-Up');
});
