import { expect, test } from '@playwright/test';

test.describe('Explorar → Links: cards de ação direta', () => {
  test('todos os destinos são acessíveis sem abrir dropdown e nenhuma HQ é listada automaticamente', async ({
    page
  }) => {
    await page.goto('/#explorar/links');
    const cards = page.locator('.links-list .link-card');
    await expect(cards).toHaveCount(34);
    await expect(page.locator('.links-list details, .links-list summary')).toHaveCount(0);
    const actions = page.locator('.links-list a.link-external');
    await expect(actions).toHaveCount(36);
    await expect(actions.first()).toHaveAttribute('target', '_blank');
    await expect(actions.first()).toHaveAttribute('rel', /noopener/);
    await expect(actions.first().locator('svg.lucide-external-link')).toBeVisible();
    await expect(cards.first().getByRole('link', { name: /Google Drive/ })).toBeVisible();
    await expect(cards.first().locator('.link-coverage')).toContainText('LGY');
    await expect(cards.first().locator('.link-issues, .link-context')).toHaveCount(0);
    await expect(
      cards.first().getByRole('button', { name: 'Ver na ficha de Leituras Extras' })
    ).toHaveCount(0);
  });

  test('URLs múltiplos preservam coberturas e abrem fichas distintas sem botões aninhados', async ({
    page
  }) => {
    await page.goto('/#explorar/links?link=leitura-5');
    const target = page.locator('[data-explore-target="link"]');
    await expect(target).toBeVisible();
    await expect(target).toBeFocused();
    const destinations = target.locator('.link-destination');
    await expect(destinations).toHaveCount(2);
    await expect(
      destinations.first().getByRole('link', { name: /Marvel Team Up/ })
    ).toHaveAttribute('href', /https?:\/\//);
    await expect(destinations.nth(1).getByRole('link', { name: /AMS Annual #20/ })).toHaveAttribute(
      'href',
      /https?:\/\//
    );
    await expect(target.locator('a button, button a')).toHaveCount(0);
    await destinations
      .nth(1)
      .getByRole('button', { name: 'Ver na ficha de Leituras Extras' })
      .click();
    await expect(page).toHaveURL(/#explorar\/extras\?extra=/);
    await expect(page.locator('[data-explore-target="extra"]')).toContainText(
      'The Amazing Spider-Man Annual #20'
    );
  });

  test('busca, destaque de deep link, teclado e largura total em mobile e desktop', async ({
    page
  }) => {
    for (const width of [320, 1440]) {
      await page.setViewportSize({ width, height: 800 });
      await page.goto('/#explorar/links?link=leitura-25');
      const list = page.locator('.links-list');
      const card = page.locator('[data-explore-target="link"]');
      await expect(card).toBeFocused();
      const listBox = await list.boundingBox();
      const cardBox = await card.boundingBox();
      expect(listBox).not.toBeNull();
      expect(cardBox).not.toBeNull();
      expect(Math.abs(cardBox!.width - listBox!.width)).toBeLessThanOrEqual(2);
      await expect(page.locator('.links-list .is-targeted')).toHaveCount(1);
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
        .toBe(true);
      const search = page.getByRole('searchbox', { name: 'Buscar links' });
      await search.fill('Guerras Secretas');
      await expect(page.locator('.links-list .link-card')).toHaveCount(1);
      await expect(page).toHaveURL(/lq=Guerras\+Secretas/);
      await page.reload();
      await expect(page.getByRole('searchbox', { name: 'Buscar links' })).toHaveValue(
        'Guerras Secretas'
      );
      await search.focus();
      await page.keyboard.press('Tab');
      await expect(page.locator('.links-list a.link-external').first()).toBeFocused();
    }
  });
});
