import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const url = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', section: 'steps', mode: 'read', nav: 'A', lang: 'en', theme: 'dark', width: '393', scale: '100', motion: 'reduce', capture: '1', ...extra })}`;
const active = (page) => page.locator('.section-carousel-pane.is-active');
const row = (page, id) => active(page).locator(`.fp-step-draggable[data-step-id="${id}"]`);
const titles = (page) => active(page).locator('.step-title');
const floating = (page) => page.locator('.fp-drag-floating-card');
const modal = (page) => page.locator('dialog:modal:not([data-fp-ghost])');
async function pointer(context, page, id = 'divide') {
  const handle = page.getByTestId(`drag-handle-${id}`).filter({ visible: true });
  await handle.scrollIntoViewIfNeeded();
  const rect = await handle.boundingBox();
  const cdp = await context.newCDPSession(page);
  const start = { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2, id: 1 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [start] });
  return {
    start,
    move: async (x, y) =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id: 1 }] }),
    end: async () => cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }),
    cancel: async () =>
      cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }),
    close: async () => cdp.detach(),
  };
}

test.describe('L104 direct drag enters editing', () => {
  test.use({ hasTouch: true });

  for (const design of ['compact', 'rail', 'outline']) {
    for (const activation of ['move', 'hold']) {
      test(`${design}/${activation}: lift floats above groups and follows both axes; outside release is clean`, async ({
        page,
        context,
      }) => {
        await page.goto(url({ stepDesign: design, dragActivation: activation }));
        const before = await titles(page).allTextContents();
        const gesture = await pointer(context, page);
        const source = await row(page, 'divide').boundingBox();
        if (activation === 'move') {
          await expect(page.getByTestId('save-recipe')).toHaveCount(0);
          await gesture.move(gesture.start.x - 22, gesture.start.y - 30);
        }
        await expect(floating(page)).toBeVisible();
        await expect(page.getByTestId('save-recipe')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
        const lifted = await floating(page).boundingBox();
        await gesture.move(gesture.start.x - 57, gesture.start.y - 60);
        await expect
          .poll(async () => (await floating(page).boundingBox()).x)
          .toBeCloseTo(source.x - 57, 0);
        await expect
          .poll(async () => (await floating(page).boundingBox()).y)
          .toBeCloseTo(source.y - 60, 0);
        expect(lifted.width).toBeCloseTo(source.width, 0);
        const layer = page.locator('.fp-drag-portal-layer');
        expect(await layer.evaluate((element) => element.parentElement === document.body)).toBe(
          true,
        );
        expect(
          await layer.evaluate((element) => Number(getComputedStyle(element).zIndex)),
        ).toBeGreaterThan(100);
        expect(
          await floating(page).evaluate((element) => getComputedStyle(element).backgroundColor),
        ).not.toBe('rgba(0, 0, 0, 0)');
        await expect(layer.locator('button,input,select,a[href]')).toHaveCount(0);
        await expect(row(page, 'divide')).toHaveClass(/is-origin-placeholder/);
        await gesture.move(20, 12);
        await gesture.end();
        await expect(floating(page)).toHaveCount(0);
        await expect(titles(page)).toHaveText(before);
        await expect(modal(page)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        await expect(modal(page)).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
        await gesture.close();
      });
    }
  }

  test('a handle tap opens no draft', async ({ page, context }) => {
    await page.goto(url());
    const gesture = await pointer(context, page);
    await gesture.end();
    await expect(floating(page)).toHaveCount(0);
    await expect(page.getByTestId('save-recipe')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await gesture.close();
  });

  test('a refused first-group move preserves the original visual reference', async ({
    page,
    context,
  }) => {
    await page.goto(url({ mode: 'edit' }));
    const source = active(page).locator('.fp-step-draggable').first();
    const sourceId = await source.getAttribute('data-step-id');
    const target = await active(page).locator('.fp-step-draggable').nth(1).boundingBox();
    const before = await source.boundingBox();
    const original = await titles(page).allTextContents();
    const gesture = await pointer(context, page, sourceId);
    await gesture.move(target.x + target.width / 2, target.y + target.height * 0.8);
    await gesture.end();
    await expect(page.locator('[data-process-refusal]')).toBeVisible();
    await expect(floating(page)).toHaveCount(0);
    const after = await source.boundingBox();
    expect(after.x).toBeCloseTo(before.x, 0);
    expect(after.y).toBeCloseTo(before.y, 0);
    await expect(titles(page)).toHaveText(original);
    await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
    await gesture.close();
  });

  test('the reading-mode keyboard alternative previews the new draft without becoming stale', async ({
    page,
  }) => {
    await page.goto(url({ stepDesign: 'rail' }));
    const before = await titles(page).allTextContents();
    await page.getByTestId('drag-handle-divide').filter({ visible: true }).press('ArrowUp');
    await expect(page.getByTestId('save-recipe')).toBeVisible();
    await expect(modal(page)).toContainText('This move changes dependencies');
    await expect(modal(page)).not.toContainText('draft has changed');
    const apply = modal(page).getByRole('button', { name: 'Apply', exact: true });
    await expect(apply).toBeEnabled();
    await apply.click();
    await expect(titles(page)).not.toHaveText(before);
    await page.getByRole('button', { name: 'Undo change', exact: true }).click();
    await expect(titles(page)).toHaveText(before);
    await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
  });

  for (const motion of ['standard', 'reduce']) {
    test(`outside drop uses actual return motion, respecting ${motion}`, async ({
      page,
      context,
    }) => {
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.goto(url({ motion }));
      const gesture = await pointer(context, page);
      await gesture.move(gesture.start.x - 45, gesture.start.y - 40);
      await expect(floating(page)).toBeVisible();
      await gesture.move(20, 12);
      await gesture.end();
      if (motion === 'standard') {
        // dnd-kit animates its geometry-owning overlay, rather than the inner painted card.
        const readAnimation = () =>
          floating(page).evaluate((element) => {
            const target = element.closest('[data-dnd-overlay]') ?? element;
            const running = target.getAnimations().find((item) => item.playState === 'running');
            return running
              ? {
                  duration: running.effect.getTiming().duration,
                  frames: running.effect.getKeyframes(),
                }
              : null;
          });
        await expect.poll(readAnimation, { intervals: [10, 20, 30], timeout: 1000 }).not.toBeNull();
        const animation = await readAnimation();
        expect(animation.duration).toBeGreaterThan(0);
        const position = (frame) => frame.translate ?? frame.transform;
        expect(position(animation.frames[0])).toBeTruthy();
        expect(position(animation.frames[0])).not.toBe(position(animation.frames.at(-1)));
      } else {
        expect(
          await page.evaluate(
            () =>
              document.getAnimations().filter((animation) => {
                const target = animation.effect?.target;
                return (
                  target instanceof Element &&
                  (target.matches('[data-dnd-overlay]') || target.closest('[data-sortable-id]'))
                );
              }).length,
          ),
        ).toBe(0);
      }
      await expect(floating(page)).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
      await gesture.close();
    });
  }

  test('browser Back during dragging cancels only the gesture and preserves previous draft work', async ({
    page,
    context,
  }) => {
    await page.goto(url({ mode: 'edit' }));
    await page.getByTestId('recipe-name').fill('Retained draft');
    await page.evaluate(() => history.pushState({}, '', location.href + '#gesture'));
    const gesture = await pointer(context, page);
    await gesture.move(gesture.start.x - 30, gesture.start.y - 35);
    await expect(floating(page)).toBeVisible();
    await page.evaluate(() => history.back());
    await expect(floating(page)).toHaveCount(0);
    await expect(modal(page)).toHaveCount(0);
    await expect(page.getByTestId('recipe-name')).toHaveValue('Retained draft');
    await expect(page.getByRole('tab', { name: 'Steps', exact: true })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    await gesture.end();
    await expect(page.getByTestId('recipe-name')).toHaveValue('Retained draft');
    await gesture.close();
  });

  test('an accepted move from reading is one undoable operation and remains unsaved until Save', async ({
    page,
    context,
  }) => {
    await page.goto(url());
    const before = await titles(page).allTextContents();
    const gesture = await pointer(context, page);
    const target = await row(page, 'bulk').boundingBox();
    await gesture.move(target.x + target.width / 2, target.y + target.height / 4);
    await expect(page.getByTestId('save-recipe')).toBeVisible();
    await gesture.end();
    await expect(modal(page)).toContainText('This move changes dependencies');
    await modal(page).getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(titles(page)).not.toHaveText(before);
    await page.getByRole('button', { name: 'Undo change', exact: true }).click();
    await expect(titles(page)).toHaveText(before);
    await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(titles(page)).not.toHaveText(before);
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal(page)).toBeVisible();
    await modal(page).getByRole('button', { name: 'Discard', exact: true }).click();
    await expect(titles(page)).toHaveText(before);
    await expect(page.getByTestId('save-recipe')).toHaveCount(0);
    await gesture.close();
  });
});
