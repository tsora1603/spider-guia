import { supabaseModule } from '../fixtures/supabase-module';
import { expect, test } from '@playwright/test';

const mockedClient = `(() => {
  let session = { user: { id: 'e2e-user', email: 'e2e@example.com' } };
  let listener = () => {};
  window.__remoteRows = [{ord:1,status:'Sim',updated_at:'2026-04-01T00:00:00.000Z'}];
  window.__queries = 0;
  window.__pushes = 0;
  window.__deletes = 0;
  window.__authLogin = () => { session = {user:{id:'e2e-user',email:'e2e@example.com'}}; listener('SIGNED_IN',session); };
  window.supabase = {createClient: () => ({
    auth: {
      onAuthStateChange: fn => { listener = fn; return {data:{subscription:{unsubscribe(){}}}}; },
      getSession: async () => ({data:{session},error:null}),
      signOut: async () => {session=null; listener('SIGNED_OUT',null); return {error:null};},
      signInWithOtp: async () => ({error:null})
    },
    from: () => ({
      select: () => ({
        then: (ok, fail) => Promise.resolve({data:window.__remoteRows,error:null}).then(ok,fail),
        eq: () => ({order: () => ({range: async (from,to) => {window.__queries++; return {data:window.__remoteRows.slice(from,to+1),error:null};}})})
      }),
      upsert: async () => {window.__pushes++;return {error:null};},
      delete: () => {window.__deletes++;throw Error('DELETE não permitido');}
    })
  })};
})();`;

test.beforeEach(async ({ context }) => {
  // As rotas/mocks precisam valer também para abas criadas dentro do teste.
  await context.route('**/config.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.SUPABASE_URL='https://e2e.supabase.co';window.SUPABASE_ANON_KEY='fake';window.LINKS_ENABLED=true;"
    })
  );
  await context.route('**/supabase-sdk-*.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: supabaseModule(mockedClient)
    })
  );
  await context.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await context.addInitScript(() => {
    if (localStorage.getItem('e2e-reconnect-seeded')) return;
    localStorage.setItem('e2e-reconnect-seeded', '1');
    localStorage.setItem(
      'aranha-local-reset-guard-v1',
      JSON.stringify({ version: 2, phase: 'completed', decision: 'pending' })
    );
    localStorage.setItem(
      'aranha-reading-preferences-v1',
      JSON.stringify({
        version: 1,
        depth: 'essential',
        onboardingComplete: true,
        focusQuery: '',
        readThrough: 0
      })
    );
  });
});

test('login após reset: SELECT de consulta, sem push antes da escolha, e adiamento persiste', async ({
  page
}) => {
  await page.goto('/#conta/ajuda');
  const dialog = page.getByRole('dialog', { name: /Encontramos progresso salvo na nuvem/ });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText('1 registro encontrado');
  expect(await page.evaluate(() => (window as any).__pushes)).toBe(0);
  await dialog.getByRole('button', { name: 'Decidir depois' }).click();
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1')!).decision
    )
  ).toBe('pending');
  await page.reload();
  await expect(
    page.getByRole('dialog', { name: /Encontramos progresso salvo na nuvem/ })
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).__pushes)).toBe(0);
});

test('continuar sem sincronização mantém nuvem intacta e permite reconsiderar', async ({
  page
}) => {
  await page.goto('/#conta/ajuda');
  const dialog = page.locator('#cloud-reconnect-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Continuar sem sincronizar' }).click();
  await expect(dialog).toBeHidden();
  await page.reload();
  await expect(dialog).toBeHidden();
  expect(await page.evaluate(() => (window as any).__pushes)).toBe(0);
  await page.getByRole('button', { name: 'Decidir sobre o progresso na nuvem' }).click();
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => (window as any).__deletes)).toBe(0);
});

test('restauração explícita persiste consentimento e recupera o registro remoto', async ({
  page
}) => {
  await page.goto('/#conta/ajuda');
  const dialog = page.locator('#cloud-reconnect-dialog');
  await expect(dialog.getByRole('button', { name: 'Restaurar progresso da nuvem' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Restaurar progresso da nuvem' }).click();
  await expect(dialog).toBeHidden();
  const stored = await page.evaluate(() => ({
    guard: JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1') || '{}'),
    progress: JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}'),
    deletes: (window as any).__deletes
  }));
  expect(stored.guard.decision).toBe('restored');
  expect(stored.progress['1']).toBe('Sim');
  expect(stored.deletes).toBe(0);
  await page.reload();
  await expect(dialog).toBeHidden();
});

test('erro de rede na consulta bloqueia restauração sem reportar sucesso', async ({ page }) => {
  await page.goto('/#conta/ajuda');
  await expect(page.locator('#cloud-reconnect-dialog')).toBeVisible();
  await page.evaluate(() => {
    (window as any).__remoteRows = [];
  });
  await page
    .locator('#cloud-reconnect-dialog')
    .getByRole('button', { name: 'Decidir depois' })
    .click();
  await page.context().setOffline(true);
  await page.getByRole('button', { name: 'Decidir sobre o progresso na nuvem' }).click();
  const dialog = page.locator('#cloud-reconnect-dialog');
  await expect(dialog.getByRole('alert')).toContainText('Sem conexão');
  await expect(dialog.getByRole('button', { name: 'Restaurar progresso da nuvem' })).toHaveCount(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1')!).decision
    )
  ).toBe('pending');
});

test('logout e novo login não removem consentimento pendente nem sincronizam', async ({ page }) => {
  await page.goto('/#conta/ajuda');
  const dialog = page.locator('#cloud-reconnect-dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Decidir depois' }).click();
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByRole('button', { name: 'Entrar para sincronizar' })).toBeVisible();
  await page.evaluate(() => (window as any).__authLogin());
  await expect(dialog).toBeVisible();
  expect(await page.evaluate(() => (window as any).__pushes)).toBe(0);
  expect(
    await page.evaluate(
      () => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1')!).decision
    )
  ).toBe('pending');
});

test('outra aba aberta recarrega após concessão, sem herdá-la enquanto antiga', async ({
  page,
  context
}) => {
  await page.goto('/#conta/ajuda');
  const second = await context.newPage();
  await second.goto('/#conta/ajuda');
  await expect(second.locator('#cloud-reconnect-dialog')).toBeVisible();
  await second
    .locator('#cloud-reconnect-dialog')
    .getByRole('button', { name: 'Decidir depois' })
    .click();
  await page
    .locator('#cloud-reconnect-dialog')
    .getByRole('button', { name: 'Restaurar progresso da nuvem' })
    .click();
  await expect(page.locator('#cloud-reconnect-dialog')).toBeHidden();
  await expect
    .poll(() =>
      second.evaluate(
        () => JSON.parse(localStorage.getItem('aranha-local-reset-guard-v1') || '{}').decision
      )
    )
    .toBe('restored');
  await expect(second.locator('#cloud-reconnect-dialog')).toBeHidden();
  // Aba antiga não recebe permissão de sincronização automaticamente.
  expect(await second.evaluate(() => (window as any).__pushes)).toBe(0);
  // Ao recarregar, a aba já nasce sob a autorização compartilhada validada.
  await second.reload();
  await expect(second.locator('#cloud-reconnect-dialog')).toBeHidden();
  expect(await second.evaluate(() => (window as any).__deletes)).toBe(0);
});
