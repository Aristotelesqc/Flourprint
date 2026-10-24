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

for (const [locale, width, scale] of [
  ['fr', 360, 130],
  ['en', 393, 100],
]) {
  test(`paused countdown retains three full labels in one row with wide metrics: ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
    await page.goto(
      `/mockup.html?screen=recipe&recipe=baguette&prep=fresh&nav=A&lang=${locale}&width=${width}&scale=${scale}&capture=1&motion=reduce`,
    );
    await page
      .getByRole('button', { name: locale === 'fr' ? 'Lancer' : 'Start', exact: true })
      .click();
    await page.getByTestId('prep-pause-btn').click();
    await widenMetrics(page);
    const hero = await page.locator('[data-fp-container="fp.prep-hero"]').boundingBox();
    const buttons = page.getByTestId('prep-countdown-row').getByRole('button');
    await expect(buttons).toHaveCount(3);
    let previous;
    for (const button of await buttons.all()) {
      const box = await button.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(48);
      expect(box.height).toBeGreaterThanOrEqual(48);
      expect(box.x).toBeGreaterThanOrEqual(hero.x);
      expect(box.x + box.width).toBeLessThanOrEqual(hero.x + hero.width);
      if (previous) {
        expect(Math.abs(box.y - previous.y)).toBeLessThan(1);
        expect(box.x).toBeGreaterThanOrEqual(previous.x + previous.width - 0.5);
      }
      const ink = await button.evaluate((node) => {
        const walker = document.createTreeWalker(
          node.querySelector('.button-content'),
          NodeFilter.SHOW_TEXT,
        );
        const result = [];
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          result.push(
            ...[...range.getClientRects()].map((rect) => ({ left: rect.left, right: rect.right })),
          );
        }
        return result;
      });
      for (const rect of ink) {
        expect(rect.left).toBeGreaterThanOrEqual(box.x - 0.5);
        expect(rect.right).toBeLessThanOrEqual(box.x + box.width + 0.5);
      }
      previous = box;
    }
    await expect(page.getByTestId('prep-pause-btn')).toContainText(
      locale === 'fr' ? 'Reprendre' : 'Resume',
    );
  });
}
