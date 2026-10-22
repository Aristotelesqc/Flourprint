import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

const active = (page) => page.locator('.section-carousel-pane.is-active');
const row = (page, id) => active(page).locator(`.fp-step-draggable[data-step-id="${id}"]`);
const titles = (page) => active(page).locator('.step-title');
const floating = (page) => page.locator('.fp-drag-floating-card');
// Intentional autoscroll changes viewport coordinates, not the position within the list.
const contentTop = (page, id) =>
  row(page, id).evaluate(
    (element) =>
      element.getBoundingClientRect().top +
      (element.closest('.section-carousel-pane')?.scrollTop ?? 0),
  );
const url = (extra) =>
  `/mockup.html?${new URLSearchParams({
    screen: 'recipe',
    recipe: 'shokupan',
    section: 'steps',
    mode: 'read',
    nav: 'A',
    lang: 'en',
    theme: 'dark',
    width: '393',
    scale: '100',
    motion: 'reduce',
    capture: '1',
    stepDesign: 'compact',
    dragActivation: 'move',
    ...extra,
  })}`;

async function lift(context, page, activation) {
  const handle = page.getByTestId('drag-handle-divide').filter({ visible: true });
  await handle.scrollIntoViewIfNeeded();
  const from = await handle.boundingBox();
  const source = await row(page, 'divide').boundingBox();
  const target = await row(page, 'bulk').boundingBox();
  const original = await titles(page).allTextContents();
  const originalSourceTop = await contentTop(page, 'divide');
  const originalTargetTop = await contentTop(page, 'bulk');
  const cdp = await context.newCDPSession(page);
  const start = { x: from.x + from.width / 2, y: from.y + from.height / 2, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  if (activation === 'hold') await expect(floating(page)).toBeVisible();
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: start.x - 16, y: start.y - 20, id: 1 }],
  });
  await expect(floating(page)).toBeVisible();
  return { source, target, original, originalSourceTop, originalTargetTop, start, cdp };
}

test.describe('owner-selected Compact: travelling insertion space', () => {
  test.use({ hasTouch: true });
  for (const locale of ['fr', 'en']) {
    test(`${locale}: accessible handle guidance matches the native keyboard alternative`, async ({
      page,
    }) => {
      await page.goto(url({ lang: locale }));
      const handle = page.getByTestId('drag-handle-divide').filter({ visible: true });
      await expect(handle).toHaveAttribute(
        'aria-description',
        locale === 'fr'
          ? 'Glisser pour réordonner, ou utiliser Flèche Haut / Bas'
          : 'Drag to reorder, or use Arrow Up / Down',
      );
      await expect(handle).toHaveAttribute('aria-keyshortcuts', 'ArrowUp ArrowDown');
      await expect(
        page.locator('[id^="dnd-kit-description-"],[id^="dnd-kit-announcement-"]'),
      ).toHaveCount(0);
    });
  }

  test('a real pointer release at the viewport origin cannot commit the previous candidate', async ({
    page,
    context,
  }) => {
    await page.goto(url({ mode: 'edit' }));
    const handle = page.getByTestId('drag-handle-divide').filter({ visible: true });
    await handle.scrollIntoViewIfNeeded();
    const from = await handle.boundingBox();
    const target = await row(page, 'bulk').boundingBox();
    const before = await titles(page).allTextContents();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height * 0.2, {
      steps: 5,
    });
    await expect(floating(page)).toBeVisible();
    const cdp = await context.newCDPSession(page);
    // Release coordinates are authoritative even without an intervening move event.
    await cdp.send('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x: 0,
      y: 0,
      button: 'left',
      buttons: 0,
      clickCount: 1,
    });
    await expect(floating(page)).toHaveCount(0);
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    await expect(titles(page)).toHaveText(before);
    await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
    await cdp.detach();
  });
  for (const [width, scale] of [
    [393, 100],
    [360, 130],
  ]) {
    for (const theme of ['light', 'dark', 'amoled']) {
      test(`${theme} ${width}/${scale}: neighbours move before release; cancellation restores exactly`, async ({
        page,
        context,
      }) => {
        await page.setViewportSize({ width, height: 852 });
        // Reading -> editing is covered separately. Compare geometry in one established mode.
        await page.goto(url({ width: String(width), scale: String(scale), theme, mode: 'edit' }));
        const { cdp, source, target, original, originalSourceTop, originalTargetTop, start } =
          await lift(context, page, 'move');
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: [{ x: start.x - 28, y: target.y + target.height * 0.2, id: 1 }],
        });
        await expect(active(page).locator('.is-origin-placeholder')).toHaveCount(1);
        await expect
          .poll(() => contentTop(page, 'divide'))
          .toBeLessThan(originalSourceTop - source.height / 2);
        await expect
          .poll(() => contentTop(page, 'bulk'))
          .toBeGreaterThan(originalTargetTop + source.height / 2);
        const placeholder = await row(page, 'divide').boundingBox();
        expect(placeholder.height).toBeCloseTo(source.height, 0);
        await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
        await expect(page.locator('dialog:modal')).toHaveCount(0);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
        await expect(floating(page)).toHaveCount(0);
        await expect(titles(page)).toHaveText(original);
        expect(await contentTop(page, 'divide')).toBeCloseTo(originalSourceTop, 0);
        await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
        await expect(
          page.getByTestId('drag-handle-divide').filter({ visible: true }),
        ).toBeFocused();
        await cdp.detach();
      });
    }
  }

  test('hold activation also previews space; moving outside never commits the last valid preview', async ({
    page,
    context,
  }) => {
    await page.goto(url({ dragActivation: 'hold' }));
    const { cdp, original, target, start } = await lift(context, page, 'hold');
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: start.x - 25, y: target.y + target.height * 0.2, id: 1 }],
    });
    await expect.poll(async () => titles(page).allTextContents()).not.toEqual(original);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{ x: 10, y: 10, id: 1 }],
    });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await expect(floating(page)).toHaveCount(0);
    await expect(titles(page)).toHaveText(original);
    await expect(page.locator('dialog:modal')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
    await cdp.detach();
  });
});
