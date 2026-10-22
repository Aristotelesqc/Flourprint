import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

for (const [width, scale] of [
  [393, 100],
  [360, 130],
]) {
  for (const locale of ['fr', 'en']) {
    test(`Compact titles stay outside action targets: ${locale} ${width}/${scale}, read and edit`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 852 });
      for (const mode of ['read', 'edit']) {
        const params = new URLSearchParams({
          screen: 'recipe',
          recipe: 'shokupan',
          section: 'steps',
          nav: 'A',
          lang: locale,
          theme: 'dark',
          width: String(width),
          scale: String(scale),
          motion: 'reduce',
          capture: '1',
          stepDesign: 'compact',
          mode,
        });
        await page.goto('/mockup.html?' + params);
        const rows = page.locator('.section-carousel-pane.is-active .step-row');
        await expect(rows.first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const measurements = await rows.evaluateAll((elements) =>
          elements.map((row) => {
            const title = row.querySelector('.step-title');
            const actions = row.querySelector('.step-actions-cell');
            if (!title || !actions) throw new Error('Missing title/action cluster');
            const range = document.createRange();
            range.selectNodeContents(title);
            const detailRange = document.createRange();
            const details = row.querySelector('.step-details');
            if (details) detailRange.selectNodeContents(details);
            const bounds = row.getBoundingClientRect();
            const target = actions.getBoundingClientRect();
            const ink = [...range.getClientRects(), ...detailRange.getClientRects()].filter(
              (rect) => rect.width > 0 && rect.height > 0,
            );
            const css = getComputedStyle(title);
            return {
              title: title.textContent,
              collides: ink.some(
                (rect) =>
                  rect.right > target.left + 0.5 &&
                  rect.left < target.right - 0.5 &&
                  rect.bottom > target.top + 0.5 &&
                  rect.top < target.bottom - 0.5,
              ),
              escapes: ink.some(
                (rect) => rect.left < bounds.left - 0.5 || rect.right > bounds.right + 0.5,
              ),
              overflowWrap: css.overflowWrap,
              wordBreak: css.wordBreak,
              targets: [...actions.querySelectorAll('button')].map((button) => {
                const rect = button.getBoundingClientRect();
                return { width: rect.width, height: rect.height };
              }),
            };
          }),
        );
        expect(measurements.length).toBeGreaterThan(5);
        for (const measurement of measurements) {
          expect(measurement.collides, `${mode}: ${measurement.title}`).toBe(false);
          expect(measurement.escapes, `${mode}: ${measurement.title}`).toBe(false);
          expect(measurement.overflowWrap).not.toBe('anywhere');
          expect(measurement.wordBreak).not.toBe('break-all');
          for (const target of measurement.targets) {
            expect(target.width).toBeGreaterThanOrEqual(47.9);
            expect(target.height).toBeGreaterThanOrEqual(47.9);
          }
        }
      }
    });
  }
}
