import type { CDPSession, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { enterEditor, routed } from './ui-actions';

const tabs = (page: Page) => routed(page).getByRole('tab');
async function bounds(locator: import('@playwright/test').Locator) {
  const result = await locator.boundingBox();
  if (!result) throw new Error('Missing navigation bounds');
  return result;
}

const carousel = (page: Page) => routed(page).locator('[data-fp-component="fp.section-carousel"]');

async function open(page: Page) {
  await page.setViewportSize({ width: 393, height: 900 });
  await page.goto('/recipes');
  await routed(page).getByRole('heading', { name: 'Poolish + tangzhong', exact: true }).click();
  await expect(carousel(page)).toBeVisible();
  await expect(routed(page)).toHaveCount(1);
}

async function scroll(page: Page, top?: number) {
  return routed(page)
    .locator('ion-content')
    .evaluate(async (node, next) => {
      const element = await (
        node as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
      ).getScrollElement();
      if (next !== undefined) element.scrollTop = next;
      return element.scrollTop;
    }, top);
}

async function finger(page: Page) {
  const cdp = await page.context().newCDPSession(page);
  const content = await routed(page).locator('ion-content').boundingBox();
  if (!content) throw new Error('Missing content');
  const y = content.y + 180;
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x = 310, dy = 0) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y: y + dy }],
    });
  return { cdp, send };
}

async function finish(cdp: CDPSession) {
  try {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes('Must send a TouchStart')) throw error;
  }
  await cdp.detach();
}

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';

  test(`tabs distribute spare width and keep long labels scrollable${suffix}`, async ({ page }) => {
    await open(page);
    const strip = routed(page).getByRole('tablist');
    const a = await bounds(tabs(page).nth(0));
    const z = await bounds(tabs(page).nth(2));
    const row = await bounds(strip);
    expect(Math.abs(a.x - row.x - (row.x + row.width - z.x - z.width))).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 360, height: 900 });
    await page.addStyleTag({ content: 'html,body { font-size:20.8px !important }' });
    await tabs(page).nth(2).click();
    await expect(tabs(page).nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect
      .poll(async () => {
        const tab = await bounds(tabs(page).nth(2));
        const viewport = await bounds(strip);
        return tab.x >= viewport.x - 1 && tab.x + tab.width <= viewport.x + viewport.width + 1;
      })
      .toBe(true);
  });

  test(`a vertical gesture interrupting a settle restores the selected pane${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await tabs(page).nth(1).click();
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    await tabs(page).nth(0).click();
    await carousel(page).evaluate((node) => {
      // Slow only this test's running animation so interruption is deterministic.
      for (const animation of node.getAnimations({ subtree: true })) animation.playbackRate = 0.25;
    });
    const { cdp, send } = await finger(page);
    try {
      await send('touchStart');
      await send('touchMove', 304, -70);
      await send('touchEnd');
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
      const root = await bounds(carousel(page));
      await expect
        .poll(
          async () => (await bounds(carousel(page).locator('[data-carousel-pane="process"]'))).x,
        )
        .toBeCloseTo(root.x, 0);
    } finally {
      await finish(cdp);
    }
  });

  test(`a second tab tap cancels an unfinished departure from that tab${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await tabs(page).nth(1).click();
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    await tabs(page).nth(0).click();
    await tabs(page).nth(1).click();
    await carousel(page).evaluate(async (node) => {
      await Promise.all(
        node
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => undefined)),
      );
    });
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    await expect(carousel(page).locator('[data-carousel-pane="process"]')).toBeVisible();
  });

  test(`carousel follows the finger and indicator, springs back, then commits${suffix}`, async ({
    page,
  }) => {
    await open(page);
    const pane = carousel(page).locator('[data-carousel-pane="formula"]');
    const start = await bounds(pane);
    const indicator = routed(page).locator('[data-tab-indicator]');
    const a = await tabs(page).nth(0).boundingBox();
    const b = await tabs(page).nth(1).boundingBox();
    if (!start || !a || !b) throw new Error('Missing measured navigation');
    const { cdp, send } = await finger(page);
    try {
      await send('touchStart');
      await send('touchMove', 220);
      await expect.poll(async () => (await bounds(pane)).x).toBeCloseTo(start.x - 90, 0);
      const progress = 90 / start.width;
      await expect
        .poll(async () => (await bounds(indicator)).x)
        .toBeCloseTo(a.x + (b.x - a.x) * progress, 0);
      await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
      // A stopped short drag must spring back even if its earlier movement was quick.
      await page.waitForTimeout(150);
      await send('touchEnd');
      await expect.poll(async () => (await bounds(pane)).x).toBeCloseTo(start.x, 0);
      await send('touchStart');
      await send('touchMove', 60);
      await page.waitForTimeout(150);
      await send('touchEnd');
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect(carousel(page).locator('[data-carousel-pane="process"]')).toBeVisible();
    } finally {
      await finish(cdp);
    }
  });

  test(`a short flick commits while pointer cancellation keeps the section${suffix}`, async ({
    page,
  }) => {
    await open(page);
    const { cdp, send } = await finger(page);
    try {
      await send('touchStart');
      await send('touchMove', 240);
      await send('touchCancel');
      await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
      await send('touchStart');
      await send('touchMove', 296);
      await send('touchMove', 245);
      await send('touchEnd');
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    } finally {
      await finish(cdp);
    }
  });

  test(`long Recipe and short History retain independent scroll and mounted state${suffix}`, async ({
    page,
  }) => {
    await open(page);
    const method = routed(page).getByTestId('recipe-method');
    await method.evaluate((node) => node.setAttribute('data-same-instance', 'yes'));
    const position = await scroll(page, 800);
    expect(position).toBeGreaterThan(400);
    await tabs(page).nth(2).click();
    await expect(tabs(page).nth(2)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => scroll(page)).toBe(0);
    const short = await routed(page)
      .locator('ion-content')
      .evaluate(async (node) => {
        const element = await (
          node as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
        ).getScrollElement();
        return element.scrollHeight - element.clientHeight;
      });
    expect(short).toBeLessThan(300);
    await tabs(page).nth(0).click();
    await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
    await expect.poll(() => scroll(page)).toBeCloseTo(position, 0);
    await expect(method).toHaveAttribute('data-same-instance', 'yes');
    await expect(method).toHaveCount(1);
  });

  test(`vertical scrolling and the Android edge do not switch tabs${suffix}`, async ({ page }) => {
    await open(page);
    const { cdp, send } = await finger(page);
    try {
      await send('touchStart', 20);
      await send('touchMove', 280);
      await send('touchEnd');
      await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
      await send('touchStart');
      await send('touchMove', 304, -70);
      await send('touchMove', 302, -150);
      await send('touchEnd');
      await expect.poll(() => scroll(page)).toBeGreaterThan(30);
      await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
    } finally {
      await finish(cdp);
    }
  });

  test(`invalid raw draft survives carousel navigation${suffix}`, async ({ page }) => {
    await open(page);
    await enterEditor(page);
    const water = routed(page).getByLabel(
      english ? 'Water, Final mix (g)' : 'Eau, Mélange final (g)',
      { exact: true },
    );
    await water.fill('abc');
    await tabs(page).nth(1).click();
    await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    await tabs(page).nth(2).click();
    await expect(tabs(page).nth(2)).toHaveAttribute('aria-selected', 'true');
    await tabs(page).nth(0).click();
    await expect(water).toBeVisible();
    await expect(water).toHaveValue('abc');
    await expect(water).toHaveAttribute('aria-invalid', 'true');
    await expect(
      routed(page)
        .getByTestId('recipe-draft-bar')
        .getByRole('button', { name: /^(Save|Enregistrer)$/ }),
    ).toBeDisabled();
  });

  test(`reduced motion keeps tracking static and completes selection instantly${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const pane = carousel(page).locator('[data-carousel-pane="formula"]');
    const start = await bounds(pane);
    const { cdp, send } = await finger(page);
    try {
      await send('touchStart');
      await send('touchMove', 60);
      expect((await bounds(pane)).x).toBeCloseTo(start.x, 0);
      await send('touchEnd');
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
      expect(
        await carousel(page).evaluate(
          (node) =>
            node.getAnimations({ subtree: true }).filter((a) => a.id === 'fp.motion:tab-carousel')
              .length,
        ),
      ).toBe(0);
    } finally {
      await finish(cdp);
    }
  });
}
