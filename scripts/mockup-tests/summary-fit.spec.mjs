import { createRequire } from 'node:module';
import { markMilkPowderWaterUnknown } from './screen-actions.mjs';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');

for (const locale of ['fr', 'en']) {
  for (const [width, scale] of [
    [393, 100],
    [360, 130],
  ]) {
    test(`library header retains whole visible hit targets: ${locale}/${width}/${scale}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 852 });
      await page.goto(
        `/mockup.html?screen=library&nav=A&lang=${locale}&width=${width}&scale=${scale}&capture=1&motion=reduce`,
      );
      const boxes = await page.locator('header.phone-header button').evaluateAll((buttons) =>
        buttons.map((button) => {
          const box = button.getBoundingClientRect();
          const frame = button.closest('.phone-frame').getBoundingClientRect();
          return {
            label: button.getAttribute('aria-label'),
            width: box.width,
            height: box.height,
            left: box.left - frame.left,
            right: box.right - frame.right,
          };
        }),
      );
      expect(boxes.length).toBeGreaterThanOrEqual(2);
      for (const box of boxes) {
        expect(box.width, box.label).toBeGreaterThanOrEqual(48);
        expect(box.height, box.label).toBeGreaterThanOrEqual(48);
        expect(box.left, box.label).toBeGreaterThanOrEqual(0);
        expect(box.right, box.label).toBeLessThanOrEqual(0);
      }
    });
  }
  for (const theme of ['light', 'dark', 'amoled']) {
    for (const [width, scale] of [
      [393, 100],
      [360, 130],
    ]) {
      test(`summary labels, values and help targets do not collide: ${locale}/${theme}/${width}/${scale}`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 852 });
        await page.goto(
          `/mockup.html?screen=recipe&recipe=shokupan&nav=A&lang=${locale}&theme=${theme}&width=${width}&scale=${scale}&capture=1&motion=reduce`,
        );
        const tiles = page.locator('[data-fp-container="fp.hero-summary"] .metric-tile');
        await expect(tiles).toHaveCount(4);
        const layout = await tiles.evaluateAll((nodes) =>
          nodes.map((tile) => {
            const bounds = tile.getBoundingClientRect();
            const value = tile.querySelector('.metric-value').getBoundingClientRect();
            const help = tile.querySelector('button').getBoundingClientRect();
            const text = [
              ...tile.querySelectorAll('.metric-label-group > span, .metric-value, .metric-sub'),
            ].flatMap((node) => {
              const range = document.createRange();
              range.selectNodeContents(node);
              return [...range.getClientRects()].map((rect) => ({
                left: rect.left,
                right: rect.right,
                top: rect.top,
                bottom: rect.bottom,
              }));
            });
            return {
              label: tile.textContent,
              overflow: tile.scrollWidth - tile.clientWidth,
              bounds: {
                left: bounds.left,
                right: bounds.right,
                top: bounds.top,
                bottom: bounds.bottom,
              },
              text,
              helpWidth: help.width,
              helpHeight: help.height,
              valueHelpGap: help.left - value.right,
            };
          }),
        );
        for (const metric of layout) {
          expect(metric.overflow, metric.label).toBeLessThanOrEqual(1);
          expect(metric.helpWidth, metric.label).toBeGreaterThanOrEqual(48);
          expect(metric.helpHeight, metric.label).toBeGreaterThanOrEqual(48);
          expect(metric.valueHelpGap, metric.label).toBeGreaterThanOrEqual(-0.5);
          for (const rect of metric.text) {
            expect(rect.left, metric.label).toBeGreaterThanOrEqual(metric.bounds.left - 0.5);
            expect(rect.right, metric.label).toBeLessThanOrEqual(metric.bounds.right + 0.5);
            expect(rect.top, metric.label).toBeGreaterThanOrEqual(metric.bounds.top - 0.5);
            expect(rect.bottom, metric.label).toBeLessThanOrEqual(metric.bounds.bottom + 0.5);
          }
        }
      });
    }
  }

  test(`incomplete profile names only missing properties and water legend exposes toggle state: ${locale}`, async ({
    page,
  }) => {
    await page.goto(
      `/mockup.html?screen=recipe&recipe=shokupan&nav=A&lang=${locale}&capture=1&motion=reduce`,
    );
    const notice = page.locator('button.warning-banner-actionable');
    const copy =
      locale === 'fr'
        ? {
            title: 'Profil incomplet',
            fat: 'Matières grasses',
            sugar: 'Sucres',
            water: 'Teneur en eau',
            help: 'Détail de l’hydratation',
          }
        : {
            title: 'Incomplete profile',
            fat: 'Fat',
            sugar: 'Sugars',
            water: 'Water content',
            help: 'Hydration breakdown',
          };
    await expect(notice).toHaveAccessibleName(new RegExp(copy.title));
    await expect(page.getByRole('button', { name: new RegExp(`^${copy.title}`) })).toHaveCount(1);
    await expect(notice).toContainText(copy.fat);
    await expect(notice).toContainText(copy.sugar);
    await expect(notice).not.toContainText(copy.water);
    await page.getByRole('button', { name: copy.help, exact: true }).click();
    const source = page.getByRole('dialog').locator('button[aria-pressed]').first();
    await expect(source).toHaveAttribute('aria-pressed', 'false');
    await source.click();
    await expect(source).toHaveAttribute('aria-pressed', 'true');
    await source.click();
    await expect(source).toHaveAttribute('aria-pressed', 'false');
    await page.keyboard.press('Escape');
    await markMilkPowderWaterUnknown(page, locale);
    await expect(notice).toContainText(copy.water);
  });
}
