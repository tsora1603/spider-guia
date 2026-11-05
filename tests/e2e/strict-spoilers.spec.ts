import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/config.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "window.SUPABASE_URL='';window.SUPABASE_ANON_KEY='';window.LINKS_ENABLED=true;"
    })
  );
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' })
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
});

for (const [index, title] of [
  [5, 'A morte de Gwen Stacy'],
  [6, 'Harry Osborn vira Duende Verde']
] as const) {
  test(`${title}: forte e oculto por padrão, inclusive em Leve`, async ({ page }) => {
    await page.goto(`/#explorar/jornada?marco=${index}`);
    const card = page.locator(`#explore-milestone-${index}`);
    const heading = card.locator('.milestone-title');
    const hidden = heading.getByRole('button', { name: 'Revelar spoiler forte' });
    await expect(hidden).toBeVisible();
    await expect(heading.getByText(title, { exact: true })).toBeHidden();
    await expect(page.locator('#spoiler-level')).toHaveValue('nenhum');
    expect(await card.ariaSnapshot()).not.toContain(title);
    await page.locator('#spoiler-level').selectOption('leve');
    await expect(hidden).toBeVisible();
    await expect(heading.getByText(title, { exact: true })).toBeHidden();
    await hidden.focus();
    await page.keyboard.press('Enter');
    await expect(heading.getByText(title, { exact: true })).toBeVisible();
    await page.locator('#spoiler-level').selectOption('nenhum');
    await expect(hidden).toBeVisible();
    await hidden.click();
    await page.locator('#spoiler-level').selectOption('leve');
    await expect(hidden).toBeVisible();
    await page.locator('#spoiler-level').selectOption('tudo');
    await expect(heading.getByText(title, { exact: true })).toBeVisible();
    await page.locator('#spoiler-level').selectOption('nenhum');
    await page.reload();
    await expect(heading.getByText(title, { exact: true })).toBeHidden();
  });
}

test('busca encontra título protegido; revelar não aciona a navegação do resultado', async ({
  page
}) => {
  await page.goto('/#explorar/jornada');
  await page.getByRole('searchbox', { name: 'Buscar em todo o guia' }).fill('Harry Osborn');
  const result = page
    .locator('.search-result-group')
    .filter({ has: page.getByRole('heading', { name: 'Jornada', exact: true }) })
    .locator('.search-result')
    .first();
  await expect(result).toContainText('1974');
  expect(await result.ariaSnapshot()).not.toContain('vira Duende Verde');
  const url = page.url();
  await result.getByRole('button', { name: 'Revelar spoiler forte' }).click();
  await expect(page).toHaveURL(url);
  await expect(result.getByText('Harry Osborn vira Duende Verde')).toBeVisible();
  await result.click();
  await expect(
    page.locator('[data-explore-target="marco"] .milestone-title [data-spoiler-level="forte"]')
  ).toBeVisible();
});

test('título oficial com morte fica oculto em Extras, Links e referências', async ({ page }) => {
  await page.goto('/#explorar/extras');
  // Use the shared search to locate the curated card without relying on its position.
  await page.getByRole('searchbox', { name: 'Buscar em todo o guia' }).fill('Jean DeWolff');
  const results = page.locator('.explore-search-results');
  await expect(results.locator('[data-spoiler-level="forte"]').first()).toBeVisible();
  expect(await results.ariaSnapshot()).not.toContain('A Morte de Jean DeWolff');
  await page.goto('/#explorar/links');
  await page.getByRole('searchbox', { name: 'Buscar links' }).fill('Jean DeWolff');
  const card = page.locator('.link-card').first();
  await expect(card.locator('[data-spoiler-level="forte"]')).toBeVisible();
  await expect(card).not.toHaveAttribute('aria-label', /Morte de Jean/);
  await page.goto('/#ajuda/fontes?fonte=69');
  await expect(page.locator('#fonte-69 [data-spoiler-level="forte"]')).toBeVisible();
});
