import { expect, test, type Page } from '@playwright/test';

async function seed(page: Page, progress: Record<string, string> = { 2: 'Sim', 3: 'Pulei' }) {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.fulfill({ status: 204, body: '' }));
  await page.addInitScript(data => {
    localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({ version: 1, onboardingComplete: true, depth: 'essential', focusQuery: '', readThrough: 0 }));
    localStorage.setItem('aranha-progress-v1', JSON.stringify(data));
  }, progress);
}

for (const width of [320, 360, 390, 768, 1024, 1440]) {
  test(`Etapa 6 · Ajuda e Configurações não extrapolam ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await seed(page);
    for (const path of ['#ajuda', '#ajuda/glossario', '#ajuda/fontes', '#ajuda/metodologia', '#configuracoes']) {
      await page.goto(`/${path}`);
      await expect(page.locator('#app')).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  });
}

test('Etapa 6 · fontes agrupadas e busca restaurada na URL sem mudar links editoriais', async ({ page }) => {
  await seed(page);
  await page.goto('/#ajuda/fontes');
  const search = page.getByRole('searchbox', { name: 'Buscar fonte' });
  await search.fill('Wikipédia');
  await expect(page).toHaveURL(/#ajuda\/fontes\?q=/);
  await page.reload();
  await expect(search).toHaveValue('Wikipédia');
  await expect(page.locator('.source-site-list .source-site-group').first()).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(search).toHaveValue('');
  await expect(page).toHaveURL(/#ajuda\/fontes$/);
  const first = page.locator('.source-site-group:has(a.source-link)').first();
  if (!(await first.evaluate(node => (node as HTMLDetailsElement).open))) await first.locator('summary').first().click();
  const row = first.locator('.source-row:has(a.source-link)').first();
  if (!(await row.evaluate(node => (node as HTMLDetailsElement).open))) await row.locator('summary').first().click();
  // O ícone externo é um SVG Lucide decorativo (aria-hidden), não parte do nome acessível.
  // Valide o destino real e o texto do link sem depender de caracteres desenhados pelo ícone.
  const sourceLink = row.locator('a.source-link');
  await expect(sourceLink).toBeVisible();
  await expect(sourceLink).toHaveAccessibleName('Abrir fonte');
  await expect(sourceLink).toHaveAttribute('href', /^https?:\/\//);
});

test('Etapa 6 · permalink de fonte abre grupo e foco no item', async ({ page }) => {
  await seed(page);
  await page.goto('/#ajuda/fontes?fonte=0');
  await expect(page.locator('#fonte-0')).toBeVisible();
  await expect(page.locator('#fonte-0')).toHaveAttribute('open', '');
  await expect(page.locator('#fonte-0')).toHaveClass(/is-targeted/);
  await expect(page.locator('#fonte-0').locator('summary').first()).toBeFocused();
});

test('Etapa 6 · links individuais de glossário e metodologia e buscas', async ({ page }) => {
  await seed(page);
  await page.goto('/#ajuda');
  const quick = page.getByRole('navigation', { name: 'Acesso rápido à Ajuda' });
  await quick.getByRole('button', { name: /Glossário/ }).click();
  await expect(page).toHaveURL(/#ajuda\/glossario$/);
  const search = page.getByRole('searchbox', { name: 'Buscar termo' });
  await search.fill('zzz-termo-inexistente');
  await expect(page.getByText('Nenhum termo encontrado')).toBeVisible();
  await page.getByRole('button', { name: 'Limpar busca' }).click();
  await expect(page.locator('.glossary-card').first()).toBeVisible();
  await page.goto('/#ajuda/glossario?termo=0');
  await expect(page.locator('#glossario-0')).toHaveAttribute('open', '');
  await page.goto('/#ajuda/metodologia?bloco=0');
  await expect(page.locator('#metodologia-0')).toHaveClass(/is-targeted/);
});

test('Etapa 6 · onboarding visível e preserva progresso, sem duplicar Já li até', async ({ page }) => {
  await seed(page);
  await page.goto('/#configuracoes');
  for (const title of ['Plano de leitura', 'Spoilers', 'Aparência', 'Configuração guiada', 'Conta e sincronização', 'Backup', 'Gerenciamento de dados']) {
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  }
  await expect(page.locator('#account-read-through')).toHaveCount(0);
  await expect(page.locator('#reset-section-title')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Exportar JSON' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Importar JSON' })).toBeVisible();
  await page.getByRole('button', { name: 'Refazer configuração guiada' }).click();
  await expect(page.locator('.onboarding-dialog')).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}'))).toMatchObject({ 2: 'Sim', 3: 'Pulei' });
});

test('Etapa 6 · reset mantém o padrão local e bloqueia nuvem não verificada', async ({ page }) => {
  await seed(page);
  await page.goto('/#configuracoes');
  await page.getByRole('button', { name: 'Resetar todos os dados' }).click();
  const dialog = page.locator('.account-reset-card .device-reset-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('radio', { name: /Resetar somente este dispositivo/ })).toBeChecked();
  await expect(dialog.getByRole('radio', { name: 'Resetar dispositivo e nuvem' })).toBeDisabled();
  await expect(dialog.getByRole('button', { name: 'Exportar backup JSON' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}'))).toMatchObject({ 2: 'Sim', 3: 'Pulei' });
});
