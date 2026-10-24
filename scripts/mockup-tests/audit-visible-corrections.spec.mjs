import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', nav: 'A', lang: 'fr', theme: 'dark', width: '360', scale: '130', motion: 'reduce', capture: '1', ...extra })}`;

for (const [locale, theme, width, scale] of [
  ['fr', 'light', 360, 130],
  ['fr', 'dark', 360, 130],
  ['fr', 'amoled', 360, 130],
  ['en', 'light', 393, 100],
]) {
  test(`L123 ${locale}/${theme}: long first menu action stays clear of Close without truncation`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.goto(route({ lang: locale, theme, width: String(width), scale: String(scale) }));
    const opener = page.getByRole('button', {
      name: locale === 'fr' ? 'Actions sur la recette' : 'Recipe actions',
      exact: true,
    });
    await opener.click();
    const menu = page.getByRole('dialog');
    const close = menu.getByRole('button', {
      name: locale === 'fr' ? 'Fermer' : 'Close',
      exact: true,
    });
    const label = locale === 'fr' ? 'Démarrer une autre préparation' : 'Start another preparation';
    const action = menu.getByRole('button', { name: label, exact: true });
    const closeBox = await close.boundingBox();
    const box = await action.boundingBox();
    expect(box.height).toBeGreaterThanOrEqual(48);
    expect(box.width).toBeGreaterThanOrEqual(48);
    expect(closeBox.width).toBeGreaterThanOrEqual(48);
    expect(closeBox.height).toBeGreaterThanOrEqual(48);
    expect(box.x + box.width).toBeLessThanOrEqual(closeBox.x + 0.5);
    const ink = await action.evaluate((button) => {
      const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
      const rects = [];
      while (walker.nextNode()) {
        if (!walker.currentNode.textContent.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(walker.currentNode);
        rects.push(
          ...[...range.getClientRects()].map((r) => ({
            x: r.x,
            y: r.y,
            right: r.right,
            bottom: r.bottom,
          })),
        );
      }
      return rects;
    });
    expect(ink.length).toBeGreaterThan(0);
    for (const rect of ink) {
      expect(rect.x).toBeGreaterThanOrEqual(box.x - 0.5);
      expect(rect.right).toBeLessThanOrEqual(box.x + box.width + 0.5);
      expect(rect.bottom).toBeLessThanOrEqual(box.y + box.height + 0.5);
    }
    if (locale === 'fr') expect(new Set(ink.map((r) => Math.round(r.y))).size).toBeGreaterThan(1);
    await page.keyboard.press('Escape');
    await expect(opener).toBeFocused();
  });

  test(`L127 ${locale}/${theme}: all three paused countdown targets fit inside the hero`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 852 });
    await page.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
    await page.goto(
      route({
        recipe: 'baguette',
        prep: 'fresh',
        lang: locale,
        theme,
        width: String(width),
        scale: String(scale),
      }),
    );
    await page
      .getByRole('button', { name: locale === 'fr' ? 'Lancer' : 'Start', exact: true })
      .click();
    await page.getByTestId('prep-pause-btn').click();
    await expect(page.getByTestId('prep-pause-btn')).toContainText(
      locale === 'fr' ? 'Reprendre' : 'Resume',
    );
    const hero = page.locator('[data-fp-container="fp.prep-hero"]');
    const heroBox = await hero.boundingBox();
    const controls = page.getByTestId('prep-countdown-row').getByRole('button');
    await expect(controls).toHaveCount(3);
    let previous;
    for (const button of await controls.all()) {
      const bounds = await button.boundingBox();
      expect(bounds.width).toBeGreaterThanOrEqual(48);
      expect(bounds.height).toBeGreaterThanOrEqual(48);
      expect(bounds.x).toBeGreaterThanOrEqual(heroBox.x);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(heroBox.x + heroBox.width);
      if (previous) {
        expect(bounds.x).toBeGreaterThanOrEqual(previous.x + previous.width - 0.5);
        expect(Math.abs(bounds.y - previous.y)).toBeLessThan(1);
      }
      previous = bounds;
    }
  });
}
