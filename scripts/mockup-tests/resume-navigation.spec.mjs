import { createRequire } from 'node:module';
import { setTimeout as gesturePause } from 'node:timers/promises';
import { attachBrowserDiagnostics, installPointerDiagnostics } from './browser-diagnostics.mjs';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
test.beforeEach(async ({ page }) => installPointerDiagnostics(page));
test.afterEach(async ({ page }, testInfo) => attachBrowserDiagnostics(page, testInfo));
const address = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'baguette', section: 'ingredients', nav: 'A', lang: 'en', theme: 'dark', width: '393', scale: '100', motion: 'standard', capture: '1', ...extra })}`;
const sectionTab = (page, name) => page.getByRole('tab', { name, exact: true });
async function gesture(
  page,
  context,
  { fromX = 310, toX = 55, y, toY, duration = 650, cancel = false, during },
) {
  const area = await page.locator('.section-carousel-container').boundingBox();
  const yy = y ?? area.y + Math.min(area.height / 3, 130);
  const session = await context.newCDPSession(page);
  const touch = async (type, x, atY = yy) =>
    session.send('Input.dispatchTouchEvent', {
      type,
      touchPoints:
        type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x: area.x + x, y: atY, id: 1 }],
    });
  await touch('touchStart', fromX);
  for (let i = 1; i <= 6; i++) {
    // Deliberate input timing distinguishes a slow drag from a flick; no application race wait.
    await gesturePause(duration / 6);
    await touch('touchMove', fromX + ((toX - fromX) * i) / 6, yy + (((toY ?? yy) - yy) * i) / 6);
  }
  if (during) await during();
  await touch(cancel ? 'touchCancel' : 'touchEnd');
  await session.detach();
}
test.describe('navigation A carousel acceptance', () => {
  test.use({ hasTouch: true });
  test('mounted panels stay aligned and exact draft input survives tab changes', async ({
    page,
  }) => {
    await page.goto(address({ mode: 'edit' }));
    const salt = page.getByTestId('ingredient-grams-salt');
    await salt.fill('8.125');
    await salt.press('Enter');
    const editedValue = await salt.inputValue();
    for (const name of ['Steps', 'Planning', 'History', 'Ingredients']) {
      await sectionTab(page, name).click();
      await expect(sectionTab(page, name)).toHaveAttribute('aria-selected', 'true');
      await expect
        .poll(() => page.locator('.section-carousel-container').evaluate((el) => el.scrollLeft))
        .toBe(0);
      await expect
        .poll(() =>
          page
            .locator('.section-carousel-pane.is-active')
            .evaluate((el) =>
              Math.abs(
                el.getBoundingClientRect().x -
                  el.closest('.section-carousel-container').getBoundingClientRect().x,
              ),
            ),
        )
        .toBeLessThan(1);
    }
    await expect(salt).toHaveValue(editedValue);
    await expect(page.getByTestId('save-recipe')).toBeVisible();
    await expect(
      page.locator('.section-carousel-pane[aria-hidden="true"]:not([inert])'),
    ).toHaveCount(0);
  });
  test('slow drag beyond half follows the finger and changes section', async ({
    page,
    context,
  }) => {
    await page.goto(address());
    await gesture(page, context, {
      during: async () => {
        const metrics = await page.locator('.section-carousel-track').evaluate((el) => ({
          transform: getComputedStyle(el).transform,
          animations: el.getAnimations().length,
        }));
        expect(metrics.transform).not.toBe('none');
        expect(metrics.transform).not.toBe('matrix(1, 0, 0, 1, 0, 0)');
        await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
      },
    });
    await expect(sectionTab(page, 'Steps')).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() =>
        page
          .locator('.section-carousel-pane.is-active')
          .evaluate((el) =>
            Math.abs(
              el.getBoundingClientRect().x -
                el.closest('.section-carousel-container').getBoundingClientRect().x,
            ),
          ),
      )
      .toBeLessThan(1);
  });
  test('short slow drag springs back but short fast flick commits', async ({ page, context }) => {
    await page.goto(address());
    await gesture(page, context, { fromX: 290, toX: 160, duration: 900 });
    await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() =>
        page.locator('.section-carousel-track').evaluate((el) => el.getAnimations().length),
      )
      .toBe(0);
    await gesture(page, context, { fromX: 290, toX: 210, duration: 35 });
    await expect(sectionTab(page, 'Steps')).toHaveAttribute('aria-selected', 'true');
  });
  test('a short flick held still before release springs back instead of using stale velocity', async ({
    page,
    context,
  }) => {
    await page.goto(address());
    await gesture(page, context, {
      fromX: 290,
      toX: 210,
      duration: 35,
      during: () => gesturePause(260),
    });
    await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() =>
        page.locator('.section-carousel-track').evaluate((el) => el.getAnimations().length),
      )
      .toBe(0);
  });
  test('the shared carousel moves the actual selected tab indicator with the finger', async ({
    page,
    context,
  }) => {
    await page.goto(address());
    await expect(page.locator('[data-fp-component="fp.section-carousel"]')).toHaveAttribute(
      'data-fp-version',
      'v1',
    );
    const indicator = page.locator('.section-tabs .tab-indicator');
    const x = () =>
      indicator.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
    const initial = await x();
    await gesture(page, context, {
      during: async () => {
        await expect.poll(x).toBeGreaterThan(initial + 20);
        await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
      },
    });
    await expect(sectionTab(page, 'Steps')).toHaveAttribute('aria-selected', 'true');
  });
  test('the catalogue operates the same versioned carousel with a real touch swipe', async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/mockup.html?screen=catalogue&lang=en&motion=reduce');
    const carousel = page
      .locator(
        '[data-testid="catalogue-fp.section-carousel-v1"] [data-fp-component="fp.section-carousel"]',
      )
      .first();
    await carousel.scrollIntoViewIfNeeded();
    const bounds = await carousel.boundingBox();
    expect(bounds.height).toBeGreaterThan(200);
    await expect(carousel.locator('.section-carousel-pane.is-active')).toHaveAttribute(
      'data-section',
      'ingredients',
    );
    const session = await context.newCDPSession(page);
    const at = (type, x) =>
      session.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ id: 1, x: bounds.x + x, y: bounds.y + 110 }],
      });
    await at('touchStart', bounds.width - 45);
    for (let i = 1; i <= 6; i++) {
      await gesturePause(80);
      await at('touchMove', bounds.width - 45 - ((bounds.width - 95) * i) / 6);
    }
    await at('touchEnd');
    await session.detach();
    await expect(carousel.locator('.section-carousel-pane.is-active')).toHaveAttribute(
      'data-section',
      'steps',
    );
  });
  test('pointer cancellation beyond half never commits a tab change', async ({ page, context }) => {
    await page.goto(address());
    await gesture(page, context, { cancel: true });
    await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(() =>
        page
          .locator('.section-carousel-pane.is-active')
          .evaluate((el) =>
            Math.abs(
              el.getBoundingClientRect().x -
                el.closest('.section-carousel-container').getBoundingClientRect().x,
            ),
          ),
      )
      .toBeLessThan(1);
  });
  test('screen-edge gesture is excluded', async ({ page, context }) => {
    await page.goto(address());
    await gesture(page, context, { fromX: 8, toX: 280, duration: 100 });
    await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
  });
  test('the scrolling pane keeps native vertical touch scrolling', async ({ page, context }) => {
    await page.goto(address());
    const area = await page.locator('.section-carousel-container').boundingBox();
    await gesture(page, context, {
      fromX: 150,
      toX: 150,
      y: area.y + 430,
      toY: area.y + 170,
      duration: 500,
    });
    await expect
      .poll(() => page.locator('.section-carousel-pane.is-active').evaluate((el) => el.scrollTop))
      .toBeGreaterThan(100);
    await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
  });
  test('a nested horizontal scroller consumes its own touch gesture', async ({ page, context }) => {
    await page.goto(address());
    // Exercise the carousel's existing scroll-area exclusion with an actual native scroll owner.
    await page.locator('.section-carousel-pane.is-active').evaluate((pane) => {
      const scroller = document.createElement('div');
      scroller.dataset.testid = 'nested-horizontal-scroller';
      scroller.style.cssText =
        'overflow-x:auto;overflow-y:hidden;flex:none;height:80px;touch-action:pan-x';
      const content = document.createElement('div');
      content.style.cssText = 'width:1200px;height:80px';
      scroller.append(content);
      pane.prepend(scroller);
    });
    const scroller = page.getByTestId('nested-horizontal-scroller');
    const box = await scroller.boundingBox();
    await gesture(page, context, { y: box.y + 40, duration: 500 });
    await expect.poll(() => scroller.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(sectionTab(page, 'Ingredients')).toHaveAttribute('aria-selected', 'true');
  });
  test('manual reduced motion uses instant change without finger-follow slide', async ({
    page,
    context,
  }) => {
    await page.goto(address({ motion: 'reduce' }));
    const initial = await page
      .locator('.section-carousel-track')
      .evaluate((el) => getComputedStyle(el).transform);
    await gesture(page, context, {
      duration: 150,
      during: async () => {
        expect(
          await page
            .locator('.section-carousel-track')
            .evaluate((el) => getComputedStyle(el).transform),
        ).toBe(initial);
      },
    });
    await expect(sectionTab(page, 'Steps')).toHaveAttribute('aria-selected', 'true');
    expect(
      await page.locator('.section-carousel-track').evaluate((el) => el.getAnimations().length),
    ).toBe(0);
  });
});
