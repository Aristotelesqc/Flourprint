import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

// Wider fallback metrics reproduce the two Linux CI failures on Windows too.
const widenMetrics = (page) =>
  page.addStyleTag({
    content: '.phone-frame, .phone-frame * { font-family: Verdana, sans-serif !important; }',
  });

test('library retains four complete cards with wide fallback font metrics', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
  await page.goto(
    '/mockup.html?screen=library&nav=A&lang=fr&width=393&scale=100&capture=1&motion=reduce',
  );
  await widenMetrics(page);
  const cards = page.locator('[data-fp-component="fp.recipe-card"]');
  expect(await cards.first().evaluate((el) => el.getBoundingClientRect().height)).toBeLessThan(160);
  expect(await cards.nth(3).evaluate((el) => el.getBoundingClientRect().bottom)).toBeLessThan(
    await page.locator('.phone-content').evaluate((el) => el.getBoundingClientRect().bottom),
  );
  const resume = page.getByRole('banner').getByRole('button', { name: 'Reprendre', exact: true });
  const target = await resume.boundingBox();
  expect(target.width).toBeGreaterThanOrEqual(48);
  expect(target.height).toBeGreaterThanOrEqual(48);
  await resume.click();
  await expect(page.getByTestId('prep-next-btn')).toBeVisible();
});

test('stage edits retain full labels and 48px inputs with wide metrics at 360/130', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 852 });
  await page.goto(
    '/mockup.html?screen=recipe&recipe=shokupan&mode=edit&nav=A&lang=fr&width=360&scale=130&capture=1&motion=reduce',
  );
  await widenMetrics(page);
  const rows = page.locator('[data-fp-component="fp.ingredient-row"].is-editing');
  await expect(rows).not.toHaveCount(0);
  for (const row of await rows.all()) {
    const box = await row.boundingBox();
    expect(box.height).toBeLessThan(240);
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
    expect(
      await row.locator('.ingredient-info').evaluate((el) => el.getBoundingClientRect().width),
    ).toBeGreaterThanOrEqual(120);
    for (const input of await row.locator('input').all()) {
      expect(
        await input.evaluate((el) => el.getBoundingClientRect().height),
      ).toBeGreaterThanOrEqual(48);
    }
  }
  const milk = page.getByTestId('ingredient-row-final:milk');
  await expect(milk).toContainText('cette étape');
  await expect(milk).toContainText('36 %');
  await expect(milk.getByTestId('ingredient-grams-milk')).toHaveValue('113');
});
