/* global document, getComputedStyle, innerHeight */
// Browser acceptance for component geometry and versioned motion, separate from screenshot review.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repo = fileURLToPath(new URL('../../../../', import.meta.url));
const require = createRequire(path.join(repo, 'apps/mobile/package.json'));
const { chromium, expect } = require('@playwright/test');
const origin = process.env.FLOURPRINT_REVIEW_ORIGIN;
const output = process.env.FLOURPRINT_REVIEW_EVIDENCE;
if (!origin || !output) throw Error('Set FLOURPRINT_REVIEW_ORIGIN and FLOURPRINT_REVIEW_EVIDENCE');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  args: ['--no-proxy-server'],
  ...(process.env.FLOURPRINT_TEST_BROWSER
    ? { executablePath: process.env.FLOURPRINT_TEST_BROWSER }
    : {}),
});
const settle = (p) =>
  p.waitForFunction(() => document.getAnimations().every((a) => a.playState !== 'running'));
const records = [];
try {
  for (const theme of ['light', 'dark', 'amoled'])
    for (const nav of ['A', 'B'])
      for (const [width, scale] of [
        [393, 100],
        [360, 130],
      ]) {
        const context = await browser.newContext({
          viewport: { width, height: 852 },
          locale: 'fr-CA',
          timezoneId: 'America/Toronto',
          reducedMotion: 'no-preference',
        });
        const p = await context.newPage();
        const errors = [];
        p.on('pageerror', (e) => errors.push(e.message));
        await p.clock.setFixedTime(new Date('2026-10-16T12:00:00Z'));
        for (const screen of ['library', 'recipe', 'preparation']) {
          await p.goto(
            new URL(
              `mockup.html?capture=1&screen=${screen}&nav=${nav}&theme=${theme}&lang=fr&width=${width}&scale=${scale}`,
              origin,
            ).href,
          );
          await expect(p.getByRole('heading', { level: 1 })).toBeVisible();
          await settle(p);
          if (process.env.FLOURPRINT_REVIEW_FONT) {
            const bytes = await readFile(process.env.FLOURPRINT_REVIEW_FONT);
            await p.addStyleTag({
              content: `@font-face{font-family:ReviewFont;src:url(data:font/ttf;base64,${bytes.toString('base64')})} :root {--fp-type-font-family:ReviewFont,sans-serif}`,
            });
            await p.evaluate(() => document.fonts.ready);
          }
          if (screen === 'library' && nav === 'B' && width === 393 && scale === 100) {
            const fourth = await p
              .locator('[data-fp-component="fp.recipe-card"]')
              .nth(3)
              .boundingBox();
            const bottom = await p
              .locator('.phone-content')
              .evaluate((el) => el.getBoundingClientRect().bottom);
            assert(
              fourth && fourth.y + fourth.height < bottom,
              'Four complete recipe cards fit with the active platform font',
            );
          }
          const geometry = await p.evaluate(() => {
            const visible = (el) => {
              const b = el.getBoundingClientRect();
              return b.width > 0 && b.height > 0 && b.bottom > 0 && b.top < innerHeight;
            };
            return [
              ...document.querySelectorAll(
                '[data-fp-component="fp.button"], [data-fp-component="fp.icon-button"], .tabs-chips .tab-btn, .tabs-pills .tab-btn, .active-prep-chip',
              ),
            ]
              .filter(visible)
              .map((el) => {
                const b = el.getBoundingClientRect(),
                  shape = el
                    .querySelector('.button-shape,.icon-button-shape,.tab-shape,.active-prep-shape')
                    ?.getBoundingClientRect();
                return {
                  id: el.dataset.fpComponent ?? el.className,
                  text: el.getAttribute('aria-label') ?? el.textContent.trim(),
                  hit: { w: b.width, h: b.height, x: b.x, y: b.y },
                  paint: shape ? { w: shape.width, h: shape.height } : null,
                  pill: el.matches('.tab-btn,.active-prep-chip'),
                };
              });
          });
          for (const item of geometry) {
            assert(item.hit.h >= 47.9, `Short target ${JSON.stringify(item)}`);
            if (item.id === 'fp.icon-button') assert(item.hit.w >= 47.9);
            assert(item.paint, `Missing paint element ${item.id}`);
            assert(
              Math.abs(item.paint.h - (item.pill ? 32 : 40)) < 0.8,
              `Paint size ${JSON.stringify(item)}`,
            );
          }
          if (screen === 'recipe' && nav === 'A') {
            const row = await p
              .locator('.phone-thumb-bar > button')
              .evaluateAll((elements) => elements.map((el) => el.getBoundingClientRect().y));
            assert.equal(
              row.length,
              4,
              'Read-only recipe keeps edit, planning, resume/start and overflow',
            );
            assert(
              Math.max(...row) - Math.min(...row) < 1,
              `The complete contextual toolbar stays on one aligned row: ${JSON.stringify({ theme, nav, width, scale, row, geometry })}`,
            );
          }
          const surfaces = await p.evaluate(() =>
            [
              ...document.querySelectorAll(
                '.recipe-card,.surface,.disclosure,.metric-tile,.hydration-summary-box,.phone-header,.phone-footer,.phone-bottom-nav,.stat-pill,.badge',
              ),
            ]
              .filter((el) => !el.closest('dialog'))
              .map((el) => {
                const s = getComputedStyle(el);
                return {
                  class: el.className,
                  bg: s.backgroundColor,
                  shadow: s.boxShadow,
                  blur: s.backdropFilter,
                };
              }),
          );
          for (const s of surfaces) {
            assert.equal(s.shadow, 'none', `Anchored shadow ${s.class}`);
            assert.equal(s.blur, 'none');
            assert(
              !/^rgba\(.*?,\s*(?:0?\.\d+)\)$/.test(s.bg),
              `Translucent surface ${JSON.stringify(s)}`,
            );
          }
          if (screen === 'recipe') {
            await p.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
            const dialog = p.getByRole('dialog');
            await expect(dialog).toBeVisible();
            await settle(p);
            const boxes = await dialog.getByRole('button').evaluateAll((elements) =>
              elements.map((el) => {
                const b = el.getBoundingClientRect();
                return {
                  text: el.getAttribute('aria-label') ?? el.textContent.trim(),
                  x: b.x,
                  y: b.y,
                  right: b.right,
                  bottom: b.bottom,
                  w: b.width,
                  h: b.height,
                };
              }),
            );
            for (const box of boxes)
              assert(box.h >= 47.9, `Short menu target ${JSON.stringify(box)}`);
            for (let i = 0; i < boxes.length; i++)
              for (let j = i + 1; j < boxes.length; j++) {
                const a = boxes[i],
                  b = boxes[j];
                assert(
                  Math.min(a.right, b.right) - Math.max(a.x, b.x) < 0.8 ||
                    Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) < 0.8,
                  `Overlapping menu actions ${JSON.stringify([a, b])}`,
                );
              }
            await p.keyboard.press('Escape');
            await expect(dialog).toHaveCount(0);
            await settle(p);
          }
          if (screen === 'library') {
            const first = p.getByRole('tab', { name: /^Toutes \(/ });
            const last = p.getByRole('tab', { name: /^Brouillons \(/ });
            await first.press('End');
            await expect(last).toHaveAttribute('aria-selected', 'true');
            await expect
              .poll(() =>
                last.evaluate((el) => {
                  const b = el.getBoundingClientRect(),
                    n = el.parentElement.getBoundingClientRect();
                  return b.left >= n.left - 1 && b.right <= n.right + 1;
                }),
              )
              .toBe(true);
            await last.press('Home');
            await expect(first).toHaveAttribute('aria-selected', 'true');
            await expect
              .poll(() =>
                first.evaluate((el) => {
                  const b = el.getBoundingClientRect(),
                    n = el.parentElement.getBoundingClientRect();
                  return b.left >= n.left - 1 && b.right <= n.right + 1;
                }),
              )
              .toBe(true);
          }
          const image = `${screen}-${nav}-${theme}-${width}-${scale}.png`;
          await p.screenshot({ path: path.join(output, image) });
          records.push({ screen, nav, theme, width, scale, geometry, image, errors: [...errors] });
          assert.deepEqual(errors, []);
        }
        await context.close();
      }
  // Manual and OS reduction must both suppress component transitions, even with data-motion=standard.
  for (const mode of ['standard', 'manual-reduced', 'system-reduced']) {
    const context = await browser.newContext({
      viewport: { width: 393, height: 852 },
      locale: 'fr-CA',
      reducedMotion: mode === 'system-reduced' ? 'reduce' : 'no-preference',
    });
    const p = await context.newPage();
    await p.goto(
      new URL(
        `mockup.html?capture=1&screen=recipe&theme=dark&motion=${mode === 'manual-reduced' ? 'reduce' : 'standard'}`,
        origin,
      ).href,
    );
    await settle(p);
    const check = p.getByTestId('ingredient-row-final:salt').getByRole('checkbox');
    await check.scrollIntoViewIfNeeded();
    await check.check();
    const duration = await p
      .locator('[data-fp-component="fp.weighing-checkbox"] .checkbox-custom')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    assert.equal(duration, mode === 'standard' ? '0.15s, 0.15s, 0.15s' : '0s');
    const disclosure = p.locator('.disclosure-header').first();
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await settle(p);
    await disclosure.click();
    await settle(p);
    await p.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click();
    await expect(p.getByRole('dialog')).toBeVisible();
    if (mode === 'standard')
      await expect
        .poll(() =>
          p.evaluate(
            () =>
              document.getAnimations().filter((a) => a.id === 'fp.motion:fp.motion.sheet-enter')
                .length,
          ),
        )
        .toBeGreaterThan(0);
    else
      assert.equal(
        await p.evaluate(
          () => document.getAnimations().filter((a) => a.playState === 'running').length,
        ),
        0,
      );
    await settle(p);
    await p.keyboard.press('Escape');
    await expect(p.getByRole('dialog')).toHaveCount(0);
    await p.getByRole('button', { name: 'Modifier', exact: true }).click();
    await p.getByTestId('ingredient-grams-milk').fill('160');
    await p.getByTestId('ingredient-grams-milk').press('Enter');
    await expect(p.getByTestId('ingredient-grams-milk')).toHaveValue('160');
    records.push({ motionMode: mode, duration, overlayClosed: true, firstEditAccepted: true });
    await context.close();
  }
  for (const name of [
    'button',
    'icon-button',
    'bottom-bar',
    'group-card',
    'ingredient-row',
    'number-field',
    'prep-hero',
    'recipe-card',
    'step-node',
    'tabs',
    'weighing-checkbox',
    'bottom-sheet',
    'floating-menu',
  ]) {
    const css = await readFile(
      path.join(repo, 'packages/ui/src/components', name, 'v1.css'),
      'utf8',
    );
    assert(
      !/\btransition\s*:|@keyframes|\banimation(?:-name)?\s*:/.test(css),
      `Component-authored timing ${name}`,
    );
  }
  await writeFile(
    path.join(output, 'layout-motion.json'),
    JSON.stringify({ verifiedAt: new Date().toISOString(), records }, null, 2) + '\n',
  );
  console.log(`Passed ${records.length} layout/motion cases; 36 companion screenshots`);
} finally {
  await browser.close();
}
