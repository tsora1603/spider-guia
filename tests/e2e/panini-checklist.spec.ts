import { expect, test, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';

async function prepare(page: Page, progress: Record<string, string> = {}) {
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', (route) =>
    route.fulfill({ status: 204, body: '' })
  );
  await page.route('**/config.js', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: 'window.SUPABASE_URL="";window.SUPABASE_ANON_KEY="";window.LINKS_ENABLED=true;'
    })
  );
  await page.addInitScript((progress) => {
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
    localStorage.setItem('aranha-progress-v1', JSON.stringify(progress));
  }, progress);
}
const stored = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}'));

test('Checklist Panini: link antigo abre volume, preserva história e Modo Foco avança por volumes', async ({
  page
}) => {
  await prepare(page, { '410': 'Sim' });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#checklist/hq/410');
  await expect(
    page.getByRole('status').filter({ hasText: 'substituída na Checklist' })
  ).toBeVisible();
  const volume = page.locator('#hq-1302');
  await expect(volume).toBeVisible();
  await expect(volume).toHaveAttribute('data-progress-status', 'Não');
  await expect(page.locator('#hq-410')).toHaveCount(0);
  await volume.getByRole('button', { name: /Marcar como lida/ }).click();
  await expect(volume).toHaveAttribute('data-progress-status', 'Sim');
  expect(await stored(page)).toMatchObject({ '410': 'Sim', '1302': 'Sim' });
  expect((await stored(page))['1303']).toBeUndefined();
  await page.getByRole('button', { name: 'Ativar Modo Foco' }).click();
  await page.locator('[data-focus-nav="next"]').click();
  await expect(page.locator('.focus-reader .issue-entry')).toHaveAttribute(
    'data-reading-id',
    '1303'
  );
  await expect(page.locator('.focus-reader .issue-entry')).toHaveAttribute(
    'data-progress-status',
    'Não'
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Checklist Panini: volume e guia compartilham a mesma marcação independente', async ({
  page
}) => {
  await prepare(page);
  await page.goto('/#checklist/hq/1302');
  await page.locator('#hq-1302').getByRole('button', { name: 'Ver este volume no guia' }).click();
  await expect(page).toHaveURL(/#explorar\/clone\?passo=panini-saga-01/);
  const step = page.locator('#clone-step-panini-saga-01');
  await step.locator('.clone-checklist > summary').click();
  const row = step.locator('.issue-entry');
  await expect(row).toHaveCount(1);
  await expect(row).toHaveAttribute('data-reading-id', '1302');
  await row.getByRole('button', { name: /Marcar como lida/ }).click();
  await page.goto('/#checklist/hq/1302');
  await expect(page.locator('#hq-1302')).toHaveAttribute('data-progress-status', 'Sim');
  await page.goto('/#checklist/hq/1303');
  await expect(page.locator('#hq-1303')).toHaveAttribute('data-progress-status', 'Não');
});

test('Checklist Panini: backup novo inclui referências e volumes, e backup antigo preserva volumes', async ({
  page
}, info) => {
  await prepare(page, { '410': 'Sim', '1302': 'Sim' });
  await page.goto('/#configuracoes');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar JSON' }).click();
  const download = await downloading;
  const path = info.outputPath('backup-atual.json');
  await download.saveAs(path);
  const exported = JSON.parse(await readFile(path, 'utf8'));
  expect(exported.items).toHaveLength(1320);
  expect(exported.items.find((item: { id: number }) => item.id === 410).status).toBe('Sim');
  expect(exported.items.find((item: { id: number }) => item.id === 1302).status).toBe('Sim');
  const old = {
    format: 'spider-guia-progress',
    version: 1,
    items: Array.from({ length: 1301 }, (_, index) => ({
      id: index + 1,
      status: index + 1 === 410 ? 'Pulei' : 'Não',
      updatedAt: null
    })),
    readingLog: {}
  };
  await page
    .getByLabel('Selecionar arquivo JSON para importação')
    .setInputFiles({
      name: 'backup-antigo.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(old))
    });
  const dialog = page.getByRole('dialog', { name: 'Importar progresso?' });
  await expect(dialog).toContainText('marcações atuais dos volumes Panini');
  await dialog.getByRole('button', { name: 'Importar e sobrescrever' }).click();
  await expect.poll(() => stored(page)).toMatchObject({ '410': 'Pulei', '1302': 'Sim' });
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click();
  await expect.poll(() => stored(page)).toMatchObject({ '410': 'Sim', '1302': 'Sim' });
});
