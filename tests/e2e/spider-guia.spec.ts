import { expect, test, type Page } from '@playwright/test';

const SUPABASE_CDN = '**/supabase.min.js';
const DEFAULT_READING_PREFERENCES = {
  version: 1,
  onboardingComplete: true,
  depth: 'essential',
  focusQuery: '',
  readThrough: 0
};

async function mockExternalAssets(page: Page) {
  await page.route('https://fonts.googleapis.com/**', route =>
    route.fulfill({ status: 200, contentType: 'text/css', body: '' })
  );
  await page.route('https://fonts.gstatic.com/**', route =>
    route.fulfill({ status: 204, body: '' })
  );
  await page.route(SUPABASE_CDN, route =>
    route.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.supabase = undefined;' })
  );
}

async function mockAuthenticatedSupabase(page: Page) {
  await page.route('**/config.js', route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.SUPABASE_URL = 'https://e2e.invalid';
        window.SUPABASE_ANON_KEY = 'e2e-anon';
        window.LINKS_ENABLED = true;
      `
    })
  );
  await page.route(SUPABASE_CDN, route =>
    route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        (() => {
          let session = { user: { id: 'e2e-user', email: 'e2e@example.com' } };
          let authListener = null;
          window.supabase = {
            createClient() {
              return {
                auth: {
                  onAuthStateChange(callback) {
                    authListener = callback;
                    return { data: { subscription: { unsubscribe() {} } } };
                  },
                  async getSession() { return { data: { session } }; },
                  async signOut() {
                    session = null;
                    if (authListener) authListener('SIGNED_OUT', null);
                    return { error: null };
                  },
                  async signInWithOtp() { return { error: null }; }
                },
                from() {
                  return {
                    async select() { return { data: [], error: null }; },
                    async upsert() { return { error: null }; }
                  };
                }
              };
            }
          };
        })();
      `
    })
  );
}

async function initializeStorage(
  page: Page,
  options: {
    preferences?: Partial<typeof DEFAULT_READING_PREFERENCES>;
    progress?: Record<string, 'Sim' | 'Pulei'>;
    readingLog?: Record<string, number>;
  } = {}
) {
  const preferences = { ...DEFAULT_READING_PREFERENCES, ...(options.preferences || {}) };
  await page.addInitScript(
    ({ preferences, progress, readingLog }) => {
      localStorage.setItem('aranha-reading-preferences-v1', JSON.stringify(preferences));
      if (progress) localStorage.setItem('aranha-progress-v1', JSON.stringify(progress));
      if (readingLog) localStorage.setItem('aranha-log-v1', JSON.stringify(readingLog));
    },
    { preferences, progress: options.progress || null, readingLog: options.readingLog || null }
  );
}

async function readProgress(page: Page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('aranha-progress-v1') || '{}'));
}

test.describe('SPIDER·GUIA — fluxos críticos', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAssets(page);
  });

  test('onboarding salva as três preferências e inicializa o progresso', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.addInitScript(() => localStorage.clear());
    await page.goto('/#hoje');

    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Como você quer ler?');
    await dialog.getByRole('radio', { name: /Essenciais/ }).check();
    await dialog.getByRole('button', { name: 'Continuar' }).click();

    await expect(dialog).toContainText('Quanto spoiler pode aparecer?');
    await dialog.getByRole('radio', { name: /Leve/ }).check();
    await dialog.getByRole('button', { name: 'Continuar' }).click();

    await expect(dialog).toContainText('Já leu até onde?');
    await dialog.getByLabel('Já li até a edição histórica').fill('5');
    await dialog.getByRole('button', { name: 'Salvar e começar' }).click();
    await expect(dialog).toBeHidden();

    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('aranha-reading-preferences-v1') || '{}'))).toMatchObject({
      onboardingComplete: true,
      depth: 'essential',
      readThrough: 5
    });
    await expect.poll(() => page.evaluate(() => localStorage.getItem('aranha-spoiler-level-v1'))).toBe('leve');
    const progress = await readProgress(page);
    for (const id of ['2', '3', '4', '5', '6']) expect(progress[id]).toBe('Sim');
    expect(progress['1']).toBeUndefined(); // Leitura de contexto fora da linha não é marcada por número histórico.
  });

  test('Hoje respeita o modo de foco ao escolher a próxima leitura', async ({ page }) => {
    await initializeStorage(page, { preferences: { depth: 'focus', focusQuery: 'Kraven' } });
    await page.goto('/#hoje');
    const next = page.locator('.home-next');
    await expect(next).toContainText('Foco: Kraven');
    await expect(next).toContainText('The Spectacular Spider-Man Annual #7');
  });

  test('Hoje destaca atualização em lote e preserva confirmação', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#hoje');
    await expect(page.getByRole('heading', { name: 'Já li até...' })).toBeVisible();
    await page.locator('#home-read-through').fill('5');
    await page.getByRole('button', { name: /Revisar e atualizar/ }).click();
    await expect(page.getByRole('dialog')).toContainText('Marcar leituras como lidas?');
  });

  test('Home apresenta espaço de leitura contínuo, sem mosaico de cards', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#hoje');

    const home = page.locator('.reading-home');
    await expect(home.locator('.home-workspace')).toBeVisible();
    await expect(home.locator('.home-next')).toBeVisible();
    await expect(home.locator('.home-upto')).toBeVisible();
    await expect(home.locator('.home-plan')).toBeVisible();
    await expect(home.locator('.home-rhythm')).toBeVisible();
    await expect(home.locator('.card, .tile, .tiles')).toHaveCount(0);
    await expect(home.getByRole('heading', { name: 'Na sua jornada' })).toBeVisible();
    await expect(home.getByRole('button', { name: /Abrir leitura na Checklist/ })).toBeVisible();
  });

  test('Home mede o espaço disponível com sidebar antes de dividir colunas', async ({ page }) => {
    await page.setViewportSize({ width: 1000, height: 800 });
    await initializeStorage(page);
    await page.goto('/#hoje');

    const placements = await page.evaluate(() => {
      const next = document.querySelector('.home-next')!.getBoundingClientRect();
      const update = document.querySelector('.home-upto')!.getBoundingClientRect();
      return { nextBottom: next.bottom, updateTop: update.top };
    });
    expect(placements.updateTop).toBeGreaterThanOrEqual(placements.nextBottom - 1);
  });

  test('Home móvel mantém ações legíveis e valida a atualização em lote', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await initializeStorage(page);
    await page.goto('/#hoje');

    const input = page.locator('#home-read-through');
    const update = page.getByRole('button', { name: /Revisar e atualizar/ });
    await expect(input).toBeVisible();
    await expect(update).toBeDisabled();
    await input.fill('1001');
    await expect(update).toBeDisabled();
    await input.fill('4');
    await expect(update).toBeEnabled();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await update.click();
    await expect(page.getByRole('dialog')).toContainText('Marcar leituras como lidas?');
  });

  test('marcação individual não exibe toast redundante', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#hq/2');
    await page.locator('#hq-2').getByRole('button', { name: /Marcar como lida/ }).click();
    await expect(page.getByText('Progresso atualizado.')).toHaveCount(0);
    await expect.poll(async () => (await readProgress(page))['2']).toBe('Sim');
  });

  test('marcar uma HQ persiste o progresso local', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#hq/2');
    const row = page.locator('#hq-2');
    await expect(row).toBeVisible();

    await row.getByRole('button', { name: /Marcar como lida/ }).click();

    await expect.poll(async () => (await readProgress(page))['2']).toBe('Sim');
    await expect(page).toHaveURL(/#checklist\/hq\/2$/);
  });

  test('pular uma leitura essencial exige confirmação e salva Pulei', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#hq/2');
    const row = page.locator('#hq-2');
    await expect(row).toBeVisible();

    await row.locator('summary').click();
    await row.getByRole('button', { name: 'Pular', exact: true }).click();

    const dialog = page.locator('#skipdlg');
    await expect(dialog).toBeVisible();
    await page.getByRole('button', { name: 'Pular mesmo assim' }).click();

    await expect.poll(async () => (await readProgress(page))['2']).toBe('Pulei');
  });

  test('clique em spoiler revela o texto e remove a máscara individual', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#ler/extras');
    const firstExtra = page.locator('.extra-entry').first();
    await firstExtra.locator('summary').click();

    const hiddenStrong = firstExtra.locator('[data-spoiler-level="forte"]');
    const before = await hiddenStrong.count();
    expect(before).toBeGreaterThan(0);

    await hiddenStrong.first().click();
    await expect(firstExtra.locator('[data-spoiler-level="forte"]')).toHaveCount(before - 1);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('aranha-spoiler-level-v1'))).not.toBe('tudo');
  });

  test('spoiler pode ser revelado por teclado', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#ler/extras');
    const firstExtra = page.locator('.extra-entry').first();
    await firstExtra.locator('summary').click();

    const hiddenStrong = firstExtra.locator('[data-spoiler-level="forte"]');
    const before = await hiddenStrong.count();
    expect(before).toBeGreaterThan(0);

    await hiddenStrong.first().focus();
    await page.keyboard.press('Enter');
    await expect(firstExtra.locator('[data-spoiler-level="forte"]')).toHaveCount(before - 1);
  });

  test('nível global de spoilers revela conteúdo forte somente em Tudo', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#ler/extras');
    await expect(page).toHaveURL(/#explorar\/extras$/);
    const firstExtra = page.locator('.extra-entry').first();
    await firstExtra.locator('summary').click();

    const hiddenStrong = firstExtra.locator('[data-spoiler-level="forte"]');
    await expect(hiddenStrong.first()).toBeVisible();
    expect(await hiddenStrong.count()).toBeGreaterThan(0);

    await page.locator('#spoiler-level').selectOption('tudo');
    await expect(firstExtra.locator('[data-spoiler-level="forte"]')).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => localStorage.getItem('aranha-spoiler-level-v1'))).toBe('tudo');
  });

  test('Leituras Extras tornam os dois critérios de confirmação explícitos', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await initializeStorage(page);
    await page.goto('/#explorar/extras');

    const confirmed = page.locator('.extra-entry').filter({ hasText: 'Amazing Fantasy #15' });
    await confirmed.locator('summary').click();
    await expect(confirmed).toContainText('Confirmado');
    await expect(confirmed).toContainText('Posição: 100% evidência de fontes');
    await expect(confirmed).toContainText('Peso: ≥60% fontes · ≤40% dedução lógica');

    await page.getByRole('button', { name: /Filtrar leituras extras por categoria/ }).click();
    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    const partial = page.locator('.extra-entry').filter({ hasText: 'Annual #6 (1969)' });
    await partial.locator('summary').click();
    await expect(partial).toContainText('Parcial');
    await expect(partial).toContainText('Posição: 100% evidência de fontes');
    await expect(partial).toContainText('Peso: critério 60/40 não atendido');
  });

  test('logout não apaga progresso local existente', async ({ page }) => {
    await page.unroute(SUPABASE_CDN);
    await mockAuthenticatedSupabase(page);
    await initializeStorage(page, {
      progress: { '2': 'Sim', '63': 'Pulei' },
      readingLog: { '2': 1791331200000 }
    });

    await page.goto('/#inicio');
    await expect(page.getByRole('button', { name: 'Sair' })).toBeVisible();

    const before = await readProgress(page);
    await page.getByRole('button', { name: 'Sair' }).click();
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible();
    const after = await readProgress(page);

    expect(after).toEqual(before);
    expect(after).toEqual({ '2': 'Sim', '63': 'Pulei' });
  });

  test('offline continua permitindo marcar HQ e mantém estado local', async ({ page, context }) => {
    await initializeStorage(page);
    await page.goto('/#hq/2');
    await expect(page.locator('#hq-2')).toBeVisible();

    await context.setOffline(true);
    // Sem sessão Supabase, mesmo offline o progresso fica apenas neste aparelho.
    await expect(page.locator('.sync-status')).toContainText('Neste dispositivo');
    await page.locator('#hq-2').getByRole('button', { name: /Marcar como lida/ }).click();

    await expect.poll(async () => (await readProgress(page))['2']).toBe('Sim');
    await context.setOffline(false);
  });

  test('nova IA tem cinco destinos e funciona em 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await initializeStorage(page);
    await page.goto('/#inicio');
    await expect(page).toHaveURL(/#hoje$/);

    const nav = page.getByRole('navigation', { name: 'Navegação principal' });
    await expect(nav.getByRole('button')).toHaveCount(5);
    for (const label of ['Hoje', 'Checklist', 'Explorar', 'Ajuda', 'Configurações']) {
      await expect(nav.getByRole('button', { name: label, exact: true })).toBeVisible();
    }
    await expect(nav).toHaveCSS('position', 'fixed');
    await expect(nav.getByRole('button', { name: 'Configurações' }).locator('.nav-label-short')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const bounds = await nav.getByRole('button').evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    }));
    expect(bounds.every(box => box.left >= 0 && box.right <= 320 && box.width >= 44)).toBe(true);

    await nav.getByRole('button', { name: 'Ajuda', exact: true }).click();
    await expect(page).toHaveURL(/#ajuda$/);
    await expect(page.getByText('Um lugar para cada intenção')).toBeVisible();
    await page.getByRole('navigation', { name: 'Seções de Ajuda' }).getByRole('button', { name: 'Fontes' }).click();
    await expect(page).toHaveURL(/#ajuda\/fontes$/);
    await expect(page.getByText('Fontes documentais')).toBeVisible();


    await nav.getByRole('button', { name: 'Explorar', exact: true }).click();
    await expect(page).toHaveURL(/#explorar\/jornada$/);
    const globalSearch = page.getByRole('searchbox', { name: 'Buscar em todo o guia' });
    await globalSearch.fill('Jean DeWolff');
    await expect(page.locator('.explore-search-results')).toContainText(/Jean DeWolff/i);

    await nav.getByRole('button', { name: 'Configurações', exact: true }).click();
    await expect(page).toHaveURL(/#configuracoes$/);
    await expect(page.getByText('Leve seu progresso com você')).toBeVisible();
    await expect(page.getByText('Preferências de leitura')).toBeVisible();
  });

  test('rotas legadas de Ajuda e Configurações preservam o destino e histórico', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#conta/fontes?origem=antigo');
    await expect(page).toHaveURL(/#ajuda\/fontes\?origem=antigo$/);
    await expect(page.getByText('Fontes documentais')).toBeVisible();
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Configurações' }).click();
    await expect(page).toHaveURL(/#configuracoes$/);
    await expect(page.getByText('Leve seu progresso com você')).toBeVisible();
    await expect(page.getByText('Fontes documentais')).toHaveCount(0);
    await page.goBack();
    await expect(page).toHaveURL(/#ajuda\/fontes\?origem=antigo$/);
  });

  test('rota antiga da Checklist mantém busca e filtro ao redirecionar', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#ler/checklist?f=essenciais&q=venom');
    await expect(page).toHaveURL(/#checklist\?f=essenciais&q=venom$/);
    await expect(page.getByRole('searchbox', { name: 'Buscar na Checklist' })).toHaveValue('venom');
  });

  test('ações em lote pré-visualizam e desfazem tudo até aqui', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await initializeStorage(page);
    await page.goto('/#hq/6');

    const row = page.locator('#hq-6');
    await expect(row).toBeVisible();
    await row.locator('summary').click();
    await row.getByRole('button', { name: 'Tudo até aqui' }).click();

    const dialog = page.getByRole('dialog', { name: 'Editar em lote' });
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('6 mudanças de 6 itens');
    await expect(dialog).toContainText('Amazing Fantasy #15');
    await expect(dialog).toContainText('The Amazing Spider-Man (1963) 5');
    await dialog.getByRole('button', { name: 'Aplicar 6' }).click();

    await expect.poll(async () => {
      const progress = await readProgress(page);
      return ['1', '2', '3', '4', '5', '6'].every(id => progress[id] === 'Sim');
    }).toBe(true);

    const toast = page.locator('.toast').filter({ hasText: '6 leituras' }).last();
    await expect(toast).toContainText('Desfazer');
    await toast.getByRole('button', { name: 'Desfazer' }).click();
    await expect.poll(async () => {
      const progress = await readProgress(page);
      return ['1', '2', '3', '4', '5', '6'].every(id => progress[id] == null);
    }).toBe(true);
  });

  test('atalhos de teclado abrem ajuda, busca, lote e alternam uma leitura', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#hq/2');
    const row = page.locator('#hq-2');
    await expect(row).toBeVisible();

    await page.keyboard.press('Shift+/');
    const shortcutDialog = page.getByRole('dialog', { name: 'Atalhos' });
    await expect(shortcutDialog).toBeVisible();
    await expect(shortcutDialog).toContainText(/ações em lote na Checklist/i);
    await shortcutDialog.getByRole('button', { name: 'Fechar atalhos' }).click();

    await page.locator('#app').click({ position: { x: 10, y: 10 } });
    await page.keyboard.press('/');
    await expect(page.getByRole('searchbox', { name: 'Buscar na Checklist' })).toBeFocused();

    await page.getByRole('searchbox', { name: 'Buscar na Checklist' }).evaluate(element => (element as HTMLElement).blur());
    await page.keyboard.press('b');
    const bulkDialog = page.getByRole('dialog', { name: 'Editar em lote' });
    await expect(bulkDialog).toBeVisible();
    await bulkDialog.getByRole('button', { name: 'Cancelar' }).click();

    await row.focus();
    await page.keyboard.press('m');
    await expect.poll(async () => (await readProgress(page))['2']).toBe('Sim');
  });

  test('Checklist mostra estado vazio padronizado e oferece recuperação', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#checklist');
    const search = page.getByRole('searchbox', { name: 'Buscar na Checklist' });
    await search.fill('termo-que-nao-existe-aranha-999');

    const empty = page.locator('#app .screen-state.empty').filter({ hasText: 'Nenhuma leitura encontrada' });
    await expect(empty).toBeVisible();
    await expect(empty).toContainText('Nenhuma leitura encontrada');
    await empty.getByRole('button', { name: 'Limpar busca e filtros' }).click();
    await expect(page.locator('.checklist-series-group').first()).toBeVisible();
  });


  test('cada destino exibe estado de carregamento durante o lazy-load', async ({ page }) => {
    await initializeStorage(page);
    let releaseAccountChunk!: () => void;
    const accountChunkGate = new Promise<void>(resolve => { releaseAccountChunk = resolve; });
    await page.route('**/assets/MoreView-*.js', async route => {
      await accountChunkGate;
      await route.continue();
    });

    await page.goto('/#hoje');
    await expect(page.getByRole('textbox', { name: 'Buscar edição, série ou arco' })).toBeVisible();
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Configurações', exact: true }).click();
    await expect(page.locator('.screen-state.loading')).toContainText('Carregando Configurações');
    releaseAccountChunk();
    await expect(page.getByText('Preferências de leitura')).toBeVisible();
  });

  test('falha de chunk cai no estado de erro do destino sem apagar progresso', async ({ page }) => {
    await initializeStorage(page, { progress: { '2': 'Sim' } });
    await page.route('**/assets/MoreView-*.js', route => route.abort());
    await page.goto('/#hoje');
    await expect(page.getByRole('textbox', { name: 'Buscar edição, série ou arco' })).toBeVisible();

    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Configurações', exact: true }).click();
    const error = page.locator('.screen-state.error');
    await expect(error).toContainText('Não foi possível abrir Configurações');
    expect((await readProgress(page))['2']).toBe('Sim');
  });


  test('tema, escala e modo foco persistem em 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await initializeStorage(page);
    await page.goto('/#conta/ajuda');

    const design = page.locator('.design-preferences-card');
    await expect(design).toBeVisible();
    await design.getByRole('radio', { name: /Claro/ }).check();
    await design.getByRole('radio', { name: /Grande/ }).check();
    await design.getByRole('checkbox', { name: /Modo foco/ }).check();

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'large');
    await expect(page.locator('html')).toHaveAttribute('data-focus-mode', 'on');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('aranha-design-preferences-v1') || '{}'))).toEqual({
      version: 1,
      theme: 'light',
      fontScale: 'large',
      focusMode: true
    });

    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Checklist', exact: true }).click();
    const focusReader = page.getByRole('region', { name: 'Modo foco da Checklist' });
    await expect(focusReader).toBeVisible();
    await expect(focusReader.locator('.issue-entry')).toHaveCount(1);
    const before = await focusReader.locator('.issue-entry').getAttribute('data-reading-id');
    await focusReader.getByRole('button', { name: /Próxima/ }).click();
    await expect.poll(() => focusReader.locator('.issue-entry').getAttribute('data-reading-id')).not.toBe(before);

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(page.locator('html')).toHaveAttribute('data-font-scale', 'large');
    await expect(page.getByRole('region', { name: 'Modo foco da Checklist' })).toBeVisible();
  });

  test('tema automático acompanha preferência escura do sistema', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await initializeStorage(page);
    await page.addInitScript(() => localStorage.setItem('aranha-design-preferences-v1', JSON.stringify({ version: 1, theme: 'auto', fontScale: 'default', focusMode: false })));
    await page.goto('/#hoje');
    await expect(page.locator('html')).toHaveAttribute('data-theme-preference', 'auto');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('alvos principais mantêm pelo menos 44 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await initializeStorage(page);
    await page.goto('/#hq/2');
    const row = page.locator('#hq-2');
    await expect(row).toBeVisible();
    await row.locator('summary').click();

    const targets = [
      page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Checklist', exact: true }),
      page.getByRole('button', { name: 'Ações em lote B' }),
      row.getByRole('button', { name: /Marcar como lida/ }),
      row.getByRole('button', { name: 'Pular', exact: true }),
      page.getByRole('searchbox', { name: 'Buscar na Checklist' })
    ];
    for (const target of targets) {
      const box = await target.boundingBox();
      expect(box, 'alvo deve estar renderizado').not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });


  test('meta semanal é privada e persiste sem recursos sociais', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await initializeStorage(page);
    await page.goto('/#hoje');

    const card = page.locator('.engagement-card');
    await expect(card).toBeVisible();
    await expect(card).toContainText('Ritmo pessoal');
    await expect(card).toContainText('Não existe ranking, perfil público, sequência diária ou compartilhamento');
    await card.getByLabel('Meta semanal de leituras').fill('7');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('aranha-engagement-v1') || '{}'))).toEqual({ version: 1, weeklyGoal: 7 });
    await expect(page.getByRole('button', { name: /Compartilhar/i })).toHaveCount(0);
    await expect(page.getByText(/Lista de compras/i)).toHaveCount(0);
  });

  test('links editoriais existentes permanecem intactos', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#explorar/links');
    const wars = page.locator('.link-row').filter({ hasText: 'Marvel Super Heroes Secret Wars' }).first();
    await expect(wars).toBeVisible();
    await expect(wars.locator('summary')).toHaveCount(0);
    const link = wars.getByRole('link', { name: 'Guerras Secretas (abre em nova aba)', exact: true });
    await expect(link).toHaveAttribute('href', 'https://www.mediafire.com/file/i2yt34flnmkp02j/198412_Marvel_Super-Herois_Guerras_Secretas_008.cbr/file');
  });

});


test.describe('SPIDER·GUIA — sistema de listas (UX Etapa 2)', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAssets(page);
    await initializeStorage(page);
  });

  test('Checklist: dropdown seleciona, fecha, restaura foco e responde a Escape/clique externo', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 740 });
    await page.goto('/#checklist');
    const trigger = page.locator('.checklist-toolbar .filter-trigger');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    const menu = page.getByRole('group', { name: 'Filtrar Checklist por status ou peso' });
    await expect(menu).toBeVisible();
    await menu.getByRole('button', { name: 'Pendentes' }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expect(trigger).toContainText('Pendentes');
    await trigger.press('ArrowDown');
    await expect(menu).toBeVisible();
    await page.keyboard.press('End');
    await expect(menu.getByRole('button', { name: 'Essenciais' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.click();
    await page.getByRole('heading', { name: 'Checklist' }).click();
    await expect(menu).toHaveCount(0);
    await trigger.press('ArrowDown');
    await expect(menu.getByRole('button', { name: 'Pendentes', exact: true })).toBeFocused();
    await page.keyboard.press('End');
    await expect(menu.getByRole('button', { name: 'Essenciais', exact: true })).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(menu).toHaveCount(0);
  });

  test('Extras reutiliza o dropdown e preserva o filtro editorial', async ({ page }) => {
    await page.goto('/#explorar/extras');
    const trigger = page.getByRole('button', { name: /Filtrar leituras extras por categoria/ });
    await trigger.click();
    const menu = page.getByRole('group', { name: 'Filtrar leituras extras por categoria' });
    await menu.getByRole('button', { name: 'Todas', exact: true }).click();
    await expect(trigger).toContainText('Todas');
    await expect(menu).toHaveCount(0);
    await expect(page.locator('.extras-list .extra-entry').first()).toBeVisible();
  });

  test('Jornada, Links e Fontes não introduzem caixas internas escuras', async ({ page }) => {
    await page.goto('/#explorar/jornada');
    await expect(page.locator('.journey-body').first()).toBeVisible();
    const backgrounds = async (selector: string) => page.locator(selector).first().evaluate(element => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, shadow: style.boxShadow };
    });
    await expect.poll(() => backgrounds('.journey-body')).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
    await page.goto('/#explorar/links');
    await expect(page.locator('.links-list details')).toHaveCount(0);
    await expect.poll(() => backgrounds('.link-destination')).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
    await page.goto('/#ajuda/fontes');
    const site = page.locator('.source-site-group').first();
    await site.locator('summary').first().click();
    await expect.poll(() => backgrounds('.source-site-body')).toEqual({ background: 'rgba(0, 0, 0, 0)', shadow: 'none' });
  });

  test('Listas permanecem contidas em 320 px e 1440 px', async ({ page }) => {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 840 });
      for (const route of ['#checklist', '#explorar/jornada', '#explorar/extras', '#explorar/clone', '#ajuda/fontes']) {
        await page.goto(`/${route}`);
        await expect(page.locator('main')).toBeVisible();
        await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
      }
    }
  });
});

test.describe('UX Etapa 3 — progresso nas três listas', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAssets(page);
    await initializeStorage(page);
  });

  test('Pular fica visível com a edição fechada e exige confirmação só para essencial', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto('/#checklist/hq/2');
    const row = page.locator('#hq-2');
    await expect(row).toBeVisible();
    await expect(row.locator('.row-details')).not.toHaveAttribute('open', '');
    const skip = row.locator('.reading-row-end').getByRole('button', { name: 'Pular', exact: true });
    await expect(skip).toBeVisible();
    await skip.click();
    await expect(row.locator('.row-details')).not.toHaveAttribute('open', '');
    await expect(page.locator('#skipdlg')).toBeVisible();
    await page.getByRole('button', { name: 'Pular mesmo assim' }).click();
    await expect.poll(async () => (await readProgress(page))['2']).toBe('Pulei');
    await expect(row).toHaveAttribute('data-progress-status', 'Pulei');
    await row.getByRole('button', { name: 'Desfazer pulo' }).click();
    await expect.poll(async () => (await readProgress(page))['2'] || 'Não').toBe('Não');
    await expect(row).toHaveAttribute('data-progress-status', 'Não');
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test('filtro de status acompanha marcação/desmarcação sem refresh', async ({ page }) => {
    await page.goto('/#checklist/hq/2');
    const row = page.locator('#hq-2');
    await row.getByRole('button', { name: /Marcar como lida/ }).click();
    await expect.poll(async () => (await readProgress(page))['2']).toBe('Sim');
    const filter = page.getByRole('button', { name: /^Filtrar Checklist/ });
    await filter.click();
    await page.getByRole('button', { name: 'Lidas', exact: true }).click();
    await expect(page.locator('#hq-2')).toBeVisible();
    await expect(page.locator('#hq-2')).toContainText('Lida');
    await page.locator('#hq-2').getByRole('button', { name: /Marcar como não lida/ }).click();
    await expect.poll(() => page.locator('#hq-2').count()).toBe(0);
    await expect(page).toHaveURL(/f=lidas/);
  });

  test('Modo Foco é principal na Checklist, persiste e responde a J/K', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await page.goto('/#checklist');
    const toggle = page.locator('[data-focus-toggle]');
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    const focus = page.getByRole('region', { name: 'Modo foco da Checklist' });
    const first = await focus.locator('.issue-entry').getAttribute('data-reading-id');
    await page.keyboard.press('j');
    await expect.poll(() => focus.locator('.issue-entry').getAttribute('data-reading-id')).not.toBe(first);
    await page.keyboard.press('k');
    await expect.poll(() => focus.locator('.issue-entry').getAttribute('data-reading-id')).toBe(first);
    await expect(focus.locator('.issue-entry')).toHaveCount(1);
    await page.reload();
    await expect(page.locator('[data-focus-toggle]')).toHaveAttribute('aria-pressed', 'true');
    await focus.getByRole('button', { name: 'Sair do foco' }).click();
    await expect(page.locator('[data-focus-toggle]')).toHaveAttribute('aria-pressed', 'false');
  });

  test('Modo Foco não carrega o check verde da HQ anterior ao clicar Próxima', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 760 });
    await initializeStorage(page, { preferences: { depth: 'complete' } });
    await page.goto('/#checklist');
    await expect.poll(async () => Object.keys(await readProgress(page)).length).toBe(0);

    await page.locator('[data-focus-toggle]').click();
    const focus = page.getByRole('region', { name: 'Modo foco da Checklist' });
    const row = focus.locator('.issue-entry');
    const checkbox = focus.locator('.issue-entry > .ck');
    await expect(row).toHaveAttribute('data-reading-id', '1'); // Amazing Fantasy #15
    await expect(row).toHaveAttribute('data-progress-status', 'Não');
    await expect(checkbox).not.toHaveClass(/\bSim\b/);

    await checkbox.click();
    await expect(row).toHaveAttribute('data-progress-status', 'Sim');
    await expect(checkbox).toHaveClass(/\bSim\b/);
    await expect.poll(async () => (await readProgress(page))['1']).toBe('Sim');

    await focus.locator('[data-focus-nav="next"]').click();
    await expect(row).toHaveAttribute('data-reading-id', '2'); // Amazing Spider-Man #1
    await expect(row).toHaveAttribute('data-progress-status', 'Não');
    await expect(checkbox).not.toHaveClass(/\bSim\b/);
    await expect(checkbox).toHaveAttribute('aria-label', /Pendente\. Marcar como lida/);
    expect((await readProgress(page))['2']).toBeUndefined();

    await focus.locator('[data-focus-nav="previous"]').click();
    await expect(row).toHaveAttribute('data-reading-id', '1');
    await expect(row).toHaveAttribute('data-progress-status', 'Sim');
    await expect(checkbox).toHaveClass(/\bSim\b/);
  });

  test('Modo Foco avança várias HQs sem voltar à Amazing Fantasy #15 após mudanças de progresso', async ({ page }) => {
    await initializeStorage(page);
    await page.goto('/#checklist/hq/1'); // A rota de entrada continua apontando para a HQ 1.
    await page.locator('[data-focus-toggle]').click();
    const focus = page.getByRole('region', { name: 'Modo foco da Checklist' });
    const row = focus.locator('.issue-entry');
    const check = focus.locator('.issue-entry > .ck');
    const next = focus.locator('[data-focus-nav="next"]');
    const previous = focus.locator('[data-focus-nav="previous"]');

    await expect(row).toHaveAttribute('data-reading-id', '1');
    await check.click();
    await expect(row).toHaveAttribute('data-progress-status', 'Sim');
    await next.click();
    await expect(row).toHaveAttribute('data-reading-id', '2');
    await expect(check).not.toHaveClass(/\bSim\b/);

    // Este update recalcula a lista: não pode reimpor o ID 1 da rota antiga.
    await check.click();
    await expect(row).toHaveAttribute('data-progress-status', 'Sim');
    await next.click();
    await expect(row).toHaveAttribute('data-reading-id', '3');
    await expect(check).not.toHaveClass(/\bSim\b/);
    await next.click();
    await expect(row).toHaveAttribute('data-reading-id', '4');
    await previous.click();
    await expect(row).toHaveAttribute('data-reading-id', '3');
    await previous.click();
    await expect(row).toHaveAttribute('data-reading-id', '2');
    await expect(check).toHaveClass(/\bSim\b/);
    await previous.click();
    await expect(row).toHaveAttribute('data-reading-id', '1');
    await expect(check).toHaveClass(/\bSim\b/);
    expect((await readProgress(page))['3']).toBeUndefined();
  });

  test('Saga do Clone compartilha o progresso e mantém Pular no extremo direito', async ({ page }) => {
    await page.goto('/#explorar/clone');
    const row = page.locator('.clone-arc .issue-entry').first();
    await expect(row).toBeVisible();
    await expect(row.locator('.reading-row-end .skip-action')).toBeVisible();
    const id = await row.getAttribute('data-reading-id');
    await row.getByRole('button', { name: /Marcar como lida/ }).click();
    await expect.poll(async () => (await readProgress(page))[id!]).toBe('Sim');
    await page.goto(`/#checklist/hq/${id}`);
    await expect(page.locator(`#hq-${id}`)).toHaveAttribute('data-progress-status', 'Sim');
  });

  test('Saga do Clone usa o padrão visual compartilhado e mostra confirmação e fontes por item', async ({ page }) => {
    await page.goto('/#explorar/clone');
    const phase = page.locator('.clone-phase').first();
    await expect(phase).toHaveClass(/journey-phase/);
    await expect(phase).toHaveClass(/is-open/);
    const row = phase.locator('.clone-arc .issue-entry').first();
    await expect(row.locator('.extra-editorial-status')).toContainText('Confirmado');
    await row.locator('.row-details > summary').click();
    await expect(row).not.toContainText('Continue na linha principal');
    await expect(row).not.toContainText('Quanto ler:');
    await expect(row).not.toContainText('Confirmação:');
    await expect(row.getByText('Posição: 100% baseada em fontes')).toBeVisible();
    await row.getByText('Fontes consultadas', { exact: false }).click();
    await expect(row.locator('.extra-issue-source-list a.source-link')).not.toHaveCount(0);
  });

  test('Extras com várias edições apresentam três estados independentes', async ({ page }) => {
    await page.goto('/#explorar/extras');
    await page.getByRole('button', { name: /^Filtrar leituras extras/ }).click();
    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    const card = page.locator('.extra-entry').filter({ hasText: 'Marvel Team-Up #141–150' }).first();
    await expect(card).toBeVisible();
    await card.locator(':scope > .row-details > summary').click();
    const issues = card.locator('.extra-issue-list > .issue-entry');
    await expect(issues).toHaveCount(3);
    const first = issues.first();
    await expect(first.locator('.reading-row-end .skip-action')).toBeVisible();
    await first.getByRole('button', { name: /Marcar como lida/ }).click();
    await expect(card.locator(':scope > .row-details > summary')).toContainText('1 lidas');
    await expect(card.locator(':scope > .row-details > summary')).toContainText('2 pendentes');
    await expect(first).toHaveAttribute('data-progress-status', 'Sim');
  });

  test('Extras agrupados exibem confirmação por leitura e fontes consultadas sem repetir justificativas', async ({ page }) => {
    await page.goto('/#explorar/extras');
    await page.getByRole('button', { name: /^Filtrar leituras extras/ }).click();
    await page.getByRole('button', { name: 'Todas', exact: true }).click();
    const confirmed = page.locator('.extra-entry').filter({ hasText: 'Marvel Team-Up #141–150' }).first();
    await confirmed.locator(':scope > .row-details > summary').click();
    const row = confirmed.locator('.extra-issue-list > .issue-entry').first();
    await expect(row.locator('.extra-editorial-status')).toContainText('Confirmado');
    await expect(row).toContainText('Pendente');
    await row.locator(':scope > .issue-content > .row-details > summary').click();
    await expect(row.locator('.extra-issue-evidence')).toBeVisible();
    await expect(row.locator('.row-body')).not.toContainText('Como encaixar:');
    await expect(row.locator('.row-body')).not.toContainText('Por que ler:');
    await expect(row.locator('.row-body')).not.toContainText('Quanto ler:');
    await row.getByText('Fontes consultadas do conjunto', { exact: false }).click();
    const refs = row.locator('.extra-issue-source-list a.source-link');
    await expect(refs).toHaveCount(4);
    await expect(refs.first()).toHaveAttribute('href', /^https?:\/\//);
    await row.getByRole('button', { name: /Marcar como lida/ }).click();
    await expect(row).toHaveAttribute('data-progress-status', 'Sim');
    await expect(row.locator('.extra-editorial-status')).toContainText('Confirmado');

    const partial = page.locator('.extra-entry').filter({ hasText: 'Back in Black (Homem-Aranha' }).first();
    await partial.locator(':scope > .row-details > summary').click();
    await expect(partial.locator('.extra-issue-list .extra-editorial-status').first()).toContainText('Parcial');
  });

  test('deep link distante localiza a HQ mesmo com virtualização', async ({ page }) => {
    await page.goto('/#checklist/hq/1301');
    const target = page.locator('#hq-1301');
    await expect(target).toBeVisible();
    await expect(target).toBeFocused();
  });
});

test.describe('UX Etapa 5 — resultados contextuais de Explorar', () => {
  test.beforeEach(async ({ page }) => {
    await mockExternalAssets(page);
    await initializeStorage(page);
  });

  test('marco abre entrada exata, expande fase e volta à busca anterior', async ({ page }) => {
    await page.goto('/#explorar/jornada');
    const search = page.getByRole('searchbox', { name: 'Buscar em todo o guia' });
    await search.fill('Mestre Planejador');
    const journeyResults = page.locator('.search-result-group').filter({ has: page.getByRole('heading', { name: 'Jornada' }) });
    await journeyResults.getByRole('button', { name: /Mestre Planejador/ }).click();
    await expect(page).toHaveURL(/#explorar\/jornada\?marco=[a-z0-9-]+$/);
    const target = page.locator('[data-explore-target="marco"]');
    await expect(target).toBeVisible();
    await expect(target).toContainText('Mestre Planejador');
    await expect(target).toBeFocused();
    await target.getByRole('button', { name: /Começar este intervalo na Checklist/ }).click();
    await expect(page).toHaveURL(/#checklist\/hq\/\d+$/);
    await page.goBack();
    await expect(page.locator('[data-explore-target="marco"]')).toBeVisible();
    await page.goBack();
    await expect(search).toHaveValue('Mestre Planejador');
    await expect(page.locator('.explore-search-results')).toContainText('Mestre Planejador');
  });

  test('extra opcional é revelado mesmo se filtro inicial não permitir', async ({ page }) => {
    await page.goto('/#explorar/jornada');
    const search = page.getByRole('searchbox', { name: 'Buscar em todo o guia' });
    await search.fill('The Amazing Spider-Man Annual #2');
    const extrasGroup = page.locator('.search-result-group').filter({ has: page.getByRole('heading', { name: 'Extras' }) });
    await extrasGroup.getByRole('button').first().click();
    await expect(page).toHaveURL(/#explorar\/extras\?extra=[a-z0-9-]+$/);
    const target = page.locator('[data-explore-target="extra"]');
    await expect(target).toBeVisible();
    await expect(target.locator(':scope > details')).toHaveAttribute('open', '');
    await expect(target.locator('summary')).toBeFocused();
  });

  test('Links globais levam ao grupo curado e a busca local encontra rótulos', async ({ page }) => {
    await page.goto('/#explorar/jornada');
    const search = page.getByRole('searchbox', { name: 'Buscar em todo o guia' });
    await search.fill('Guerras Secretas');
    const linksGroup = page.locator('.search-result-group').filter({ has: page.getByRole('heading', { name: 'Links editoriais' }) });
    await linksGroup.getByRole('button').first().click();
    await expect(page).toHaveURL(/#explorar\/links\?link=/);
    const target = page.locator('[data-explore-target="link"]');
    await expect(target).toBeVisible();
    await expect(target).toBeFocused();
    await expect(target.locator('a.link-external').first()).toHaveAttribute('href', /https?:\/\//);
    await page.getByRole('searchbox', { name: 'Buscar links' }).fill('Guerras Secretas');
    await expect(page).toHaveURL(/lq=Guerras\+Secretas/);
    await expect(page.locator('.links-list .link-row')).not.toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('searchbox', { name: 'Buscar links' })).toHaveValue('Guerras Secretas');
  });

  test('rotas diretas e antigas preservam query e funcionam em 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.goto('/#jornada?marco=1&origem=antiga');
    await expect(page).toHaveURL(/#explorar\/jornada\?marco=1&origem=antiga$/);
    await expect(page.locator('#explore-milestone-1')).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.goto('/#explorar/extras?extra=1');
    await expect(page.locator('#explore-extra-1')).toBeVisible();
    await page.reload();
    await expect(page.locator('#explore-extra-1')).toBeVisible();
  });
});

test.describe('Refactor · Checklist = sequência da Home', () => {
  test.beforeEach(async ({ page }) => { await mockExternalAssets(page); });

  test('Essenciais: Home e Checklist começam na mesma HQ; foco avança sem voltar', async ({ page }) => {
    await initializeStorage(page, { preferences: { depth: 'essential' } });
    await page.goto('/#hoje');
    await expect(page.locator('.home-next')).toContainText('The Amazing Spider-Man (1963) 1');
    await page.goto('/#checklist');
    const list = page.locator('[data-reading-sequence="true"]');
    await list.locator('.checklist-series-toggle').first().click();
    await expect(list.locator('.issue-entry').first()).toHaveAttribute('data-reading-id', '2');
    await expect(page.locator('.checklist-group-header')).toHaveCount(0);
    await expect(page.locator('.checklist-sequence-heading')).toContainText('Plano: Essenciais');
    await page.locator('[data-focus-toggle]').click();
    const focus = page.getByRole('region', { name: 'Modo foco da Checklist' });
    const row = focus.locator('.issue-entry');
    await expect(row).toHaveAttribute('data-reading-id', '2');
    await row.locator('.ck').click();
    await expect(row).toHaveAttribute('data-progress-status', 'Sim');
    await focus.locator('[data-focus-nav="next"]').click();
    await expect(row).toHaveAttribute('data-reading-id', '3');
    await expect(row).toHaveAttribute('data-progress-status', 'Não');
    await focus.locator('[data-focus-nav="next"]').click();
    await expect(row).toHaveAttribute('data-reading-id', '4');
    await page.goto('/#hoje');
    await expect(page.locator('.home-next')).toContainText('The Amazing Spider-Man (1963) 2');
  });

  test('Completo: Amazing Fantasy #15 precede Amazing Spider-Man #1 no foco', async ({ page }) => {
    await initializeStorage(page, { preferences: { depth: 'complete' } });
    await page.goto('/#hoje');
    await expect(page.locator('.home-next')).toContainText('Amazing Fantasy #15');
    await page.goto('/#checklist');
    const list = page.locator('[data-reading-sequence="true"]');
    await expect(list.locator('.issue-entry').first()).toHaveAttribute('data-reading-id', '1');
    await page.locator('[data-focus-toggle]').click();
    const focus = page.getByRole('region', { name: 'Modo foco da Checklist' });
    const row = focus.locator('.issue-entry');
    await expect(row).toHaveAttribute('data-reading-id', '1');
    await focus.locator('[data-focus-nav="next"]').click();
    await expect(row).toHaveAttribute('data-reading-id', '2');
  });

  test('Link direto abre HQ fora do plano sem adicioná-la permanentemente à sequência', async ({ page }) => {
    await initializeStorage(page, { preferences: { depth: 'essential' } });
    await page.goto('/#checklist/hq/1');
    await expect(page.locator('#hq-1')).toBeVisible();
    await expect(page.locator('.checklist-plan-exception')).toContainText('não pertence ao plano ativo');
    await page.goto('/#checklist');
    await expect(page.locator('.checklist-plan-exception')).toHaveCount(0);
    await page.locator('.checklist-series-toggle').first().click();
    await expect(page.locator('.checklist-sequence-list .issue-entry').first()).toHaveAttribute('data-reading-id', '2');
  });

  test('Ações em lote oferecem Plano atual e não expõem fases/arcos na Checklist', async ({ page }) => {
    await initializeStorage(page, { preferences: { depth: 'essential' } });
    await page.goto('/#checklist');
    await page.getByRole('button', { name: /Ações em lote/ }).click();
    const dialog = page.getByRole('dialog', { name: 'Editar em lote' });
    await dialog.getByRole('button', { name: 'Plano atual' }).click();
    await expect(dialog).toContainText('Pré-visualização');
    await expect(dialog).not.toContainText('Fase / arco');
  });
});
