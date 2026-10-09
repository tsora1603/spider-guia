import { expect, test } from '@playwright/test';

/** Regressão: a engrenagem do menu não pode voltar ao SVG desenhado à mão. */
test('navegação usa ícones SVG oficiais Lucide em mobile e desktop', async ({ page }) => {
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#hoje');
    for (const [label, icon] of [
      ['Hoje', 'house'],
      ['Checklist', 'check-check'],
      ['Explorar', 'route'],
      ['Ajuda', 'info'],
      ['Configurações', 'settings']
    ] as const) {
      const glyph = page.locator(`#nav button[aria-label="${label}"] svg.lucide-${icon}`);
      await expect(glyph).toBeVisible();
      await expect(glyph).toHaveAttribute('viewBox', '0 0 24 24');
      await expect(glyph).toHaveAttribute('aria-hidden', 'true');
      const box = await glyph.boundingBox();
      expect(box?.width).toBeGreaterThan(12);
      expect(box?.height).toBeGreaterThan(12);
    }
  }
});

test('Checklist usa chevrons Lucide nos grupos expansíveis', async ({ page }) => {
  await page.goto('/#checklist');
  const chevron = page.locator('.checklist-series-toggle > svg.lucide-chevron-down').first();
  await expect(chevron).toBeAttached();
  await expect(chevron).toHaveAttribute('aria-hidden', 'true');
});
