import { createRequire } from 'node:module';
import path from 'node:path';
import { stepMenu } from './screen-actions.mjs';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

const designs = ['compact', 'rail', 'outline'];
const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', mode: 'edit', section: 'steps', lang: 'fr', nav: 'A', theme: 'dark', width: '393', scale: '100', capture: '1', motion: 'reduce', ...extra })}`;
const row = (page, id) =>
  page.locator(`.phone-content .fp-step-draggable[data-step-id="${id}"]:visible`);
const titles = (page) => page.locator('.phone-content .step-title:visible');
const shot = async (page, name) => {
  if (process.env.FLOURPRINT_REVIEW_EVIDENCE)
    await page.screenshot({
      path: path.join(process.env.FLOURPRINT_REVIEW_EVIDENCE, `${name}.png`),
    });
};

test.describe('Gemini step variants', () => {
  test.use({ hasTouch: true });
  for (const theme of ['light', 'dark', 'amoled']) {
    for (const [width, scale] of [
      [393, 100],
      [360, 130],
    ]) {
      test(`density and readable layout ${theme} ${width}/${scale}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 852 });
        for (const design of designs)
          for (const nav of ['A'])
            for (const lang of ['fr', 'en']) {
              await page.goto(
                route({
                  stepDesign: design,
                  nav,
                  lang,
                  theme,
                  width: String(width),
                  scale: String(scale),
                }),
              );
              await expect(titles(page)).toHaveCount(10);
              const measures = await row(page, 'divide').evaluate((root) => {
                const node = root.querySelector('.step-row');
                const title = node.querySelector('.step-title');
                const bounds = node.getBoundingClientRect();
                return {
                  height: bounds.height,
                  titleWrap: getComputedStyle(title).overflowWrap,
                  overflow: node.scrollWidth > node.clientWidth + 1,
                  width: bounds.width,
                  available: root.closest('.phone-content').clientWidth,
                };
              });
              expect(measures.overflow, `${design}/${nav}/${lang}`).toBe(false);
              expect(measures.titleWrap).not.toBe('anywhere');
              expect(measures.width).toBeLessThanOrEqual(measures.available);
              if (scale === 100)
                expect(
                  measures.height,
                  `${design}/${nav}/${lang} Division height`,
                ).toBeLessThanOrEqual(96);
              await expect(page.locator('.step-more-actions:visible')).toHaveCount(0);
              if (lang === 'en') {
                await expect(page.locator('.phone-content')).not.toContainText('Température');
                await expect(page.locator('.phone-content')).toContainText('Temperature: 21 °C');
              }
              await shot(page, `steps-${design}-${nav}-${lang}-${theme}-${width}-${scale}`);
            }
      });
    }
  }

  for (const design of designs) {
    test(`actual touch drop previews the chain ${design}`, async ({ page, context }) => {
      await page.goto(route({ stepDesign: design }));
      const source = page.getByTestId('drag-handle-divide').filter({ visible: true });
      await source.scrollIntoViewIfNeeded();
      const from = await source.boundingBox();
      const target = await row(page, 'bulk').boundingBox();
      expect(from).toBeTruthy();
      expect(target).toBeTruthy();
      const session = await context.newCDPSession(page);
      const original = await titles(page).allTextContents();
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 }],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: target.x + target.width / 2, y: target.y + target.height / 4, id: 1 }],
      });
      await expect(row(page, 'divide')).toHaveClass(/is-origin-placeholder/);
      await expect(page.locator('.fp-drag-floating-card:visible')).toHaveCount(1);
      await expect(page.locator('.fp-drag-insertion-marker:visible')).toHaveCount(1);
      await shot(page, `touch-lift-${design}`);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      const dialog = page.getByRole('dialog');
      await expect(dialog).toContainText('Ce déplacement change les dépendances.');
      await expect(
        page.locator('.phone-content [role="status"]').filter({ hasText: 'Déplacement annulé.' }),
      ).toHaveCount(0);
      await expect(titles(page)).toHaveText(original);
      await dialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
      await expect(titles(page).nth(3)).toHaveText('4. Division');
      await expect(titles(page).nth(4)).toHaveText('5. Pointage');
      await expect(
        page
          .locator('.phone-content [role="status"]')
          .filter({ hasText: 'Modification des étapes appliquée au brouillon.' }),
      ).toHaveCount(1);
      await expect(page.getByTestId('drag-handle-divide').filter({ visible: true })).toBeFocused();
      await expect(page.locator('.fp-drag-floating-card:visible')).toHaveCount(0);
      await expect(page.locator('.fp-drag-insertion-marker:visible')).toHaveCount(0);
      await session.detach();
    });

    test(`row menu and compact removal cancellation ${design}`, async ({ page }) => {
      await page.goto(route({ stepDesign: design }));
      const before = await titles(page).allTextContents();
      const trigger = page.getByTestId('step-menu-bulk').filter({ visible: true });
      const menu = await stepMenu(page, 'bulk');
      const close = await menu.getByRole('button', { name: 'Fermer', exact: true }).boundingBox();
      const edit = await menu
        .getByRole('button', { name: 'Modifier l’étape', exact: true })
        .boundingBox();
      expect(close && edit).toBeTruthy();
      expect(
        close.x < edit.x + edit.width &&
          close.x + close.width > edit.x &&
          close.y < edit.y + edit.height &&
          close.y + close.height > edit.y,
      ).toBe(false);
      await shot(page, `step-menu-${design}`);
      await menu.getByRole('button', { name: 'Supprimer', exact: true }).click();
      const confirmation = page.getByRole('dialog');
      await expect(confirmation).toContainText('Pointage');
      expect((await confirmation.innerText()).match(/Pointage/g)).toHaveLength(1);
      const box = await confirmation.locator('.modal-sheet').boundingBox();
      expect(box.height).toBeLessThan(852 * 0.7);
      expect(box.y).toBeGreaterThan(20);
      expect(box.y + box.height).toBeLessThan(832);
      await shot(page, `step-remove-${design}`);
      await confirmation.getByRole('button', { name: 'Annuler', exact: true }).click();
      await expect(titles(page)).toHaveText(before);
      await expect(trigger).toBeFocused();
    });
  }

  test('touch autoscroll targets the phone content and cancellation is atomic', async ({
    page,
    context,
  }) => {
    await page.goto(route({ width: '360', scale: '130', stepDesign: 'compact' }));
    await page.setViewportSize({ width: 360, height: 852 });
    const handle = page.getByTestId('drag-handle-bulk').filter({ visible: true });
    await handle.scrollIntoViewIfNeeded();
    const from = await handle.boundingBox();
    const content = page.locator('.section-carousel-pane.is-active');
    const box = await content.boundingBox();
    const before = await content.evaluate((el) => el.scrollTop);
    const original = await titles(page).allTextContents();
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 }],
    });
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: box.x + box.width / 2, y: box.y + box.height - 12, id: 1 }],
    });
    await expect.poll(() => content.evaluate((el) => el.scrollTop)).toBeGreaterThan(before + 20);
    await session.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
    await expect(page.locator('.fp-drag-floating-card:visible')).toHaveCount(0);
    await expect(titles(page)).toHaveText(original);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await session.detach();
  });

  test('refused touch drop snaps back without changing the graph', async ({ page, context }) => {
    for (const design of designs) {
      await page.goto(route({ stepDesign: design }));
      const grip = page.getByTestId('drag-handle-bulk').filter({ visible: true });
      await row(page, 'divide').scrollIntoViewIfNeeded();
      await expect(grip).toBeInViewport();
      const from = await grip.boundingBox();
      const target = await row(page, 'divide').boundingBox();
      const before = await titles(page).allTextContents();
      const session = await context.newCDPSession(page);
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 }],
      });
      await session.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [
          { x: target.x + target.width / 2, y: target.y + target.height * 0.75, id: 1 },
        ],
      });
      await expect(row(page, 'bulk')).toHaveClass(/is-origin-placeholder/);
      await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      // L104: a refused touch drop returns immediately and explains without a blocking dialog.
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(page.locator('[data-process-refusal="MoveBreaksDependencies"]')).toBeVisible();
      await expect(page.locator('.fp-drag-floating-card:visible')).toHaveCount(0);
      await expect(page.locator('.fp-drag-insertion-marker:visible')).toHaveCount(0);
      await expect(titles(page)).toHaveText(before);
      await expect(grip).toBeFocused();
      await expect(
        page.getByRole('button', { name: 'Annuler la modification', exact: true }),
      ).toBeDisabled();
      await session.detach();
    }
  });
  test('long-press activation remains an explicit working option', async ({ page, context }) => {
    await page.goto(route({ dragActivation: 'hold' }));
    const grip = page.getByTestId('drag-handle-divide').filter({ visible: true });
    await grip.scrollIntoViewIfNeeded();
    const from = await grip.boundingBox();
    const session = await context.newCDPSession(page);
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 }],
    });
    await expect(row(page, 'divide')).toHaveClass(/is-origin-placeholder/);
    await expect(page.locator('.fp-drag-floating-card:visible')).toHaveCount(1);
    // Long-press lift may autoscroll: aim at the target's actual on-screen position.
    const liftedTarget = await row(page, 'bulk').boundingBox();
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [
        {
          x: liftedTarget.x + liftedTarget.width / 2,
          y: liftedTarget.y + liftedTarget.height / 4,
          id: 1,
        },
      ],
    });
    await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    const dialog = page.getByRole('dialog');
    await expect(dialog).toContainText('Ce déplacement change les dépendances.');
    await dialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
    await expect(titles(page).nth(3)).toHaveText('4. Division');
    await expect(grip).toBeFocused();
    await session.detach();
  });

  test('valid water target stays locked and no absorber offers no lock', async ({ page }) => {
    await page.goto(route({ recipe: 'baguette', section: 'ingredients' }));
    const target = page.getByTestId('hydration-target');
    await expect(target).toBeEnabled();
    await target.fill('75');
    await target.press('Enter');
    await expect(target).toBeDisabled();
    await expect(target).toHaveValue('75');
    await page.getByRole('button', { name: /Déverrouiller/ }).click();
    await expect(target).toBeEnabled();
    await page.getByRole('button', { name: 'Annuler', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Abandonner', exact: true }).click();
    await page.goto(route({ recipe: 'brioche', section: 'ingredients' }));
    await expect(page.getByTestId('hydration-target')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Verrouiller', exact: true })).toHaveCount(0);
  });
});
