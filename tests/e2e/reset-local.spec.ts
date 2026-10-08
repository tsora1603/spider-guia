import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('https://fonts.googleapis.com/**', route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route('https://fonts.gstatic.com/**', route => route.fulfill({ status: 204, body: '' }));
  // Dados de teste inseridos uma única vez por origem, não recolocados no reload.
  await page.addInitScript(() => {
    if (localStorage.getItem('reset-e2e-fixture')) return;
    localStorage.setItem('reset-e2e-fixture', 'outra-aplicacao');
    localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify({ version: 1, onboardingComplete: true, depth: 'complete', focusQuery: '', readThrough: 5 }));
    localStorage.setItem('aranha-progress-v1', JSON.stringify({ 1: 'Sim' }));
    localStorage.setItem('aranha-log-v1', JSON.stringify({ 1: 12345 }));
    localStorage.setItem('aranha-engagement-v1', JSON.stringify({ version: 1, weeklyGoal: 13 }));
    localStorage.setItem('aranha-spoiler-consent-links-v1', '1');
  });
});

test('cancelamento não altera dados; backup JSON é oferecido antes da confirmação', async ({ page }) => {
  await page.goto('/#conta/ajuda');
  const button = page.getByRole('button', { name: 'Resetar todos os dados' });
  await expect(button).toBeVisible();
  await button.click();
  const dialog = page.getByRole('dialog', { name: /Resetar dados deste dispositivo/ });
  await expect(dialog).toContainText('não serão excluídos');
  const downloadPromise = page.waitForEvent('download');
  await dialog.getByRole('button', { name: 'Exportar backup JSON' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^spider-guia-progresso-.*\.json$/);
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toContain('Sim');
  expect(await page.evaluate(() => localStorage.getItem('aranha-local-reset-guard-v1'))).toBeNull();
});

test('reset local limpa apenas chaves próprias, abre onboarding e bloqueia reconexão após reload', async ({ page }) => {
  await page.goto('/#conta/ajuda');
  await page.getByRole('button', { name: 'Resetar todos os dados' }).click();
  const dialog = page.getByRole('dialog', { name: /Resetar dados deste dispositivo/ });
  await dialog.getByRole('button', { name: 'Resetar dispositivo' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('dialog', { name: /Como você quer ler/ })).toBeVisible();
  const stored = await page.evaluate(() => ({
    guard: JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1') || '{}'),
    progress: localStorage.getItem('aranha-progress-v1'),
    history: localStorage.getItem('aranha-log-v1'),
    legacy: localStorage.getItem('aranha-spoiler-consent-links-v1'),
    foreign: localStorage.getItem('reset-e2e-fixture')
  }));
  expect(stored.guard.phase).toBe('completed');
  expect(stored.progress).toBeNull();
  expect(stored.history).toBeNull();
  expect(stored.legacy).toBeNull();
  expect(stored.foreign).toBe('outra-aplicacao');
  await page.reload();
  await expect(page.getByRole('dialog', { name: /Como você quer ler/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toBeNull();
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1') || '{}').phase)).toBe('completed');
});

test('falha de logout interrompe a limpeza e não simula sucesso', async ({ page }) => {
  await page.route('**/config.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.SUPABASE_URL='https://e2e.invalid';window.SUPABASE_ANON_KEY='key';window.LINKS_ENABLED=true;"
  }));
  await page.route('**/supabase.min.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `window.supabase={createClient:()=>({auth:{onAuthStateChange:()=>{},getSession:async()=>({data:{session:{user:{id:'e2e'}}}}),signOut:async()=>({error:{message:'falha simulada'}})},from:()=>({select:async()=>({data:[],error:null}),upsert:async()=>({error:null})})})};`
  }));
  await page.goto('/#conta/ajuda');
  await page.getByRole('button', { name: 'Resetar todos os dados' }).click();
  const dialog = page.getByRole('dialog', { name: /Resetar dados deste dispositivo/ });
  await dialog.getByRole('button', { name: 'Resetar dispositivo' }).click();
  await expect(dialog.getByRole('alert')).toContainText('falha simulada');
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toContain('Sim');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1') || '{}').phase)).toBe('preparing');
});

test('reset offline sem sessão mantém o catálogo local e não tenta alcançar a nuvem', async ({ page, context }) => {
  await page.goto('/#conta/ajuda');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Resetar todos os dados' }).click();
  await page.getByRole('dialog', { name: /Resetar dados deste dispositivo/ }).getByRole('button', { name: 'Resetar dispositivo' }).click();
  await expect(page.getByRole('dialog', { name: /Como você quer ler/ })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toBeNull();
  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event('online')));
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1') || '{}').phase)).toBe('completed');
});

test('conta autenticada: somente logout local; nenhum DELETE remoto', async ({ page }) => {
  await page.route('**/config.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: "window.SUPABASE_URL='https://e2e.invalid';window.SUPABASE_ANON_KEY='key';window.LINKS_ENABLED=true;"
  }));
  await page.route('**/supabase.min.js', route => route.fulfill({
    status: 200, contentType: 'application/javascript',
    body: `(() => {
      let session = {user:{id:'e2e',email:'e2e@example.com'}};
      let listener = () => {};
      window.__remoteDeletes = 0;
      window.__logoutScope = null;
      window.supabase = {createClient: () => ({
        auth: {
          onAuthStateChange: fn => { listener = fn; },
          getSession: async () => ({data:{session},error:null}),
          signOut: async ({scope}) => {window.__logoutScope = scope;session = null;listener('SIGNED_OUT',null);return {error:null};}
        },
        from: () => ({
          select: async () => ({data:[],error:null}),
          upsert: async () => ({error:null}),
          delete: () => {window.__remoteDeletes++;throw Error('DELETE remoto proibido');}
        })
      })};
    })();`
  }));
  await page.goto('/#conta/ajuda');
  await expect(page.getByText('Conectado como e2e@example.com')).toBeVisible();
  await page.getByRole('button', { name: 'Resetar todos os dados' }).click();
  await page.getByRole('dialog', { name: /Resetar dados deste dispositivo/ }).getByRole('button', { name: 'Resetar dispositivo' }).click();
  expect(await page.evaluate(() => (window as any).__logoutScope)).toBe('local');
  expect(await page.evaluate(() => (window as any).__remoteDeletes)).toBe(0);
  expect(await page.evaluate(() => localStorage.getItem('aranha-progress-v1'))).toBeNull();
});
