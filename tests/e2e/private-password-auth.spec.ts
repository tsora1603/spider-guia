import { supabaseModule } from '../fixtures/supabase-module';
import { test, expect } from '@playwright/test';

const privateAuthMock = `(() => {
  let session = null;
  let callback = () => {};
  window.__authCalls = { login: 0, passwordChanges: 0 };
  window.supabase = { createClient: () => ({
    auth: {
      onAuthStateChange: fn => { callback = fn; return {data:{subscription:{unsubscribe(){}}}}; },
      getSession: async () => ({data:{session},error:null}),
      signInWithPassword: async ({email,password}) => {
        window.__authCalls.login++;
        if (email !== 'amigo@example.com' || password !== 'senha-correta')
          return {data:{user:null,session:null},error:{code:'invalid_credentials',message:'Invalid login credentials'}};
        session = {user:{id:'amigo',email}};
        callback('SIGNED_IN',session);
        return {data:{user:session.user,session},error:null};
      },
      updateUser: async ({password}) => { window.__authCalls.passwordChanges++; return {data:{user:session?.user},error:null}; },
      signOut: async () => {session=null;callback('SIGNED_OUT',null);return {error:null}}
    },
    from: () => ({
      select: () => ({
        eq: () => ({order: () => ({range: async () => ({data:[],error:null})})}),
        then: (resolve, reject) => Promise.resolve({data:[],error:null}).then(resolve,reject)
      }),
      upsert: async () => ({error:null})
    })
  })};
})();`;

test.beforeEach(async ({ page }) => {
  await page.route('**/config.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: "window.SUPABASE_URL='https://e2e.supabase.co';window.SUPABASE_ANON_KEY='public-test';window.LINKS_ENABLED=true;"
    })
  );
  await page.route('**/supabase-sdk-*.js', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: supabaseModule(privateAuthMock)
    })
  );
  await page.route('https://fonts.googleapis.com/**', (route) =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.addInitScript(() =>
    localStorage.setItem(
      'aranha-reading-preferences-v1',
      JSON.stringify({
        version: 1,
        onboardingComplete: true,
        depth: 'essential',
        focusQuery: '',
        readThrough: 0
      })
    )
  );
});

test('login privado: erro, entrar com senha, alterar senha e sair, sem cadastro', async ({
  page
}) => {
  await page.goto('/#configuracoes');
  await page.getByRole('button', { name: 'Entrar para sincronizar' }).click();
  const login = page.getByRole('dialog', { name: 'Entrar para sincronizar' });
  await expect(login).toBeVisible();
  await expect(login.getByText('Acesso para contas cadastradas')).toBeVisible();
  await expect(login.getByRole('button', { name: /criar conta|cadastrar/i })).toHaveCount(0);
  await expect(login.getByRole('button', { name: /enviar link/i })).toHaveCount(0);
  await login.getByLabel('E-mail').fill('amigo@example.com');
  await login.getByLabel('Senha', { exact: true }).fill('senha-errada');
  await login.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(login.getByRole('status')).toContainText('incorretos');
  await expect(login.getByLabel('Senha', { exact: true })).toHaveValue('');
  await login.getByLabel('Senha', { exact: true }).fill('senha-correta');
  await login.getByRole('button', { name: 'Mostrar' }).click();
  await expect(login.getByLabel('Senha', { exact: true })).toHaveAttribute('type', 'text');
  await login.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(login).toBeHidden();
  await expect(page.getByText('Conectado como amigo@example.com')).toBeVisible();
  await page.getByLabel('Senha atual').fill('senha-correta');
  await page.getByLabel('Nova senha', { exact: true }).fill('nova-senha-segura');
  await page.getByLabel('Confirmar nova senha').fill('nova-senha-segura');
  await page.getByRole('button', { name: 'Alterar senha' }).click();
  await expect(page.getByText('Senha alterada.')).toBeVisible();
  expect(await page.evaluate(() => (window as any).__authCalls.passwordChanges)).toBe(1);
  await page.getByRole('button', { name: 'Sair da conta' }).click();
  await expect(page.getByRole('button', { name: 'Entrar para sincronizar' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Alterar senha' })).toHaveCount(0);
});
