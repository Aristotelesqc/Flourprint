import { createRequire } from 'node:module';
import { openGlobalDestination, recipeCard } from './screen-actions.mjs';

const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', nav: 'A', lang: 'fr', theme: 'dark', width: '393', scale: '100', motion: 'reduce', capture: '1', ...extra })}`;

test('L18 the running recipe card keeps the same held countdown as Preparation', async ({
  page,
}) => {
  const epoch = Date.parse('2026-10-23T12:00:00Z');
  await page.clock.setFixedTime(new Date(epoch));
  await page.goto(route({ recipe: 'baguette', lang: 'en', prep: 'fresh' }));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByTestId('prep-current-step')).toHaveAttribute('data-step', 'poolish');
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
  await page.getByTestId('prep-pause-btn').click();
  await page.clock.setFixedTime(new Date(epoch + 11 * 60_000));
  await openGlobalDestination(page, 'Recipes', 'en');
  await expect(recipeCard(page, 'Baguette')).toContainText('Running · 13 h 59');
  await expect(recipeCard(page, 'Baguette')).not.toContainText('13 h 49');
  await recipeCard(page, 'Baguette').getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
});

for (const locale of ['fr', 'en']) {
  test(`audit History includes the active preparation without inventing a cooked outcome: ${locale}`, async ({
    page,
  }) => {
    await page.goto(route({ section: 'history', lang: locale }));
    const history = page.getByTestId('recipe-history-view');
    const preparations = history
      .locator('section')
      .filter({ has: page.locator('#heading-preparations') });
    await expect(preparations.locator('.history-item')).toHaveCount(1);
    await expect(preparations).toContainText(locale === 'fr' ? 'En cours' : 'Running');
    await expect(preparations).not.toContainText(
      locale === 'fr' ? 'Aucune préparation enregistrée' : 'No preparations',
    );
    await expect(preparations).not.toContainText(locale === 'fr' ? 'Cuit' : 'Cooked');
    await expect(preparations).not.toContainText(locale === 'fr' ? 'Non notée' : 'Unrated');
  });

  test(`L108 Planning contains projected strand windows rather than a second step list: ${locale}`, async ({
    page,
  }) => {
    await page.goto(route({ section: 'planning', lang: locale }));
    const planning = page.locator('[data-process-root="planning"]');
    await expect(planning).toBeVisible();
    await expect(planning.locator('[data-fp-component="fp.step-node"]')).toHaveCount(0);
    await expect(planning.locator('[data-fp-component="fp.sortable-list"]')).toHaveCount(0);
    await expect(planning).toContainText('→');
    await expect(planning.locator('input[type="datetime-local"]')).toBeVisible();
    await expect(planning.locator('select').first()).toBeEnabled();
    await expect(planning).toContainText(locale === 'fr' ? 'Tangzhong' : 'Tangzhong');
    await expect(planning).not.toContainText('flourprint.commercial-yeast');
    const diagnostics = planning.getByRole('button', { name: /Fermentation/ });
    await diagnostics.click();
    await expect(planning).toContainText(locale === 'fr' ? '2,9' : '2.9');
    await expect(planning).not.toContainText(locale === 'fr' ? '2,866' : '2.866');
  });

  test(`L111 settings cannot clear weighing checks automatically on a route change: ${locale}`, async ({
    page,
  }) => {
    await page.goto(route({ screen: 'settings', lang: locale }));
    const main = page.getByRole('main');
    await expect(main).not.toContainText(
      locale === 'fr' ? 'Effacer au changement' : 'Clear when switching',
    );
    await expect(main).not.toContainText(
      locale === 'fr' ? 'Conserver pendant la visite' : 'Keep during this visit',
    );
    await expect(
      main.getByRole('button', {
        name: locale === 'fr' ? 'Effacer les coches' : 'Clear checks',
        exact: true,
      }),
    ).toBeVisible();
    await openGlobalDestination(page, locale === 'fr' ? 'Recettes' : 'Recipes', locale);
    await expect(page.getByRole('main')).toBeVisible();
  });
}

test.describe('audit: refused-slot feedback before release', () => {
  test.use({ hasTouch: true });
  for (const [locale, width, scale] of [
    ['fr', 393, 100],
    ['en', 360, 130],
  ]) {
    test(`${locale} ${width}/${scale}: the hovered refusal matches the final refusal and restores the original order`, async ({
      page,
      context,
    }) => {
      await page.setViewportSize({ width, height: 852 });
      await page.goto(
        route({
          lang: locale,
          mode: 'edit',
          width: String(width),
          scale: String(scale),
          dragActivation: 'hold',
        }),
      );
      const active = page.locator('.section-carousel-pane.is-active');
      const rows = active.locator('.fp-step-draggable');
      const source = rows.first();
      const id = await source.getAttribute('data-step-id');
      const handle = page.getByTestId(`drag-handle-${id}`).filter({ visible: true });
      await handle.scrollIntoViewIfNeeded();
      const from = await handle.boundingBox();
      const target = await rows.nth(1).boundingBox();
      const original = await active.locator('.step-title').allTextContents();
      const cdp = await context.newCDPSession(page);
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 }],
      });
      await expect(page.locator('.fp-drag-floating-card')).toBeVisible();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height * 0.8, id: 1 }],
      });
      const cue = page.locator('.fp-sortable-drop-refusal-cue');
      await expect.poll(() => rows.first().getAttribute('data-step-id')).not.toBe(id);
      // Auto-scroll can move the drawn slot away from the original row coordinates.
      // Release inside the actual travelling placeholder, as a baker aiming at it would.
      const slot = await active.locator('.is-origin-placeholder').boundingBox();
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: slot.x + slot.width / 2, y: slot.y + slot.height / 2, id: 1 }],
      });
      await expect(cue).toBeVisible();
      const explanation = await cue.innerText();
      expect(explanation.trim().length).toBeGreaterThan(10);
      const cueBounds = await cue.boundingBox();
      expect(cueBounds.x).toBeGreaterThanOrEqual(0);
      expect(cueBounds.x + cueBounds.width).toBeLessThanOrEqual(width);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await expect(cue).toHaveCount(0);
      const refusal = page.locator('[data-process-refusal]');
      await expect(refusal).toContainText(explanation);
      await expect(page.locator('.fp-touch-refusal-scrim')).toBeVisible();
      await expect(active.locator('.step-title')).toHaveText(original);
      await expect(handle).toBeFocused();
      await expect(
        page.getByRole('button', {
          name: locale === 'fr' ? 'Annuler la modification' : 'Undo change',
          exact: true,
        }),
      ).toBeDisabled();
      await refusal
        .getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true })
        .click();
      await expect(page.locator('.fp-touch-refusal-scrim')).toHaveCount(0);
      await cdp.detach();
    });
  }
});
