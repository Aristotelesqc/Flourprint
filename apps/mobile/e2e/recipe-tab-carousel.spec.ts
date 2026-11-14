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

  for (const input of ['tab tap', 'touch swipe'] as const) {
    test(`finishing a ${input} keeps the underline at its destination before selection commits${suffix}`, async ({
      page,
    }) => {
      await open(page);
      // Cover font metrics where medium and bold have substantially different advances (CI/Linux).
      await page.addStyleTag({
        content: '[role="tab"] { font-family: Arial, sans-serif !important; }',
      });
      await carousel(page).evaluate((node) => {
        const track = node.firstElementChild;
        if (!(track instanceof HTMLElement)) throw new Error('Missing carousel track');
        const animate = track.animate;
        track.animate = function (this: HTMLElement, ...args: Parameters<HTMLElement['animate']>) {
          this.animate = animate;
          const animation = animate.apply(this, args);
          animation.pause();
          return animation;
        };
      });
      const gesture = input === 'touch swipe' ? await finger(page) : undefined;
      try {
        if (gesture) {
          await gesture.send('touchStart');
          await gesture.send('touchMove', 70);
          await gesture.send('touchEnd');
        } else {
          await tabs(page).nth(1).click();
        }
        await expect
          .poll(() =>
            carousel(page).evaluate((node) =>
              node
                .getAnimations({ subtree: true })
                .some((a) => a.id === 'fp.motion:tab-carousel' && a.playState === 'paused'),
            ),
          )
          .toBe(true);
        const end = await carousel(page).evaluate(async (node) => {
          const animation = node
            .getAnimations({ subtree: true })
            .find((a) => a.id === 'fp.motion:tab-carousel');
          const host = node.closest('.ion-page');
          const indicator = host?.querySelector('[data-tab-indicator]');
          const destination = host?.querySelectorAll('[role="tab"]')[1];
          if (!animation || !indicator || !destination)
            throw new Error('Missing transition geometry');
          // Observe the actual terminal pose in the finish microtask, before React can commit selection.
          const terminal = animation.finished.then(() => ({
            indicator: indicator.getBoundingClientRect().toJSON(),
            destination: destination.getBoundingClientRect().toJSON(),
          }));
          animation.finish();
          return terminal;
        });
        expect(end.indicator.x).toBeCloseTo(end.destination.x, 0);
        expect(end.indicator.width).toBeCloseTo(end.destination.width, 0);
        await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
        await expect
          .poll(async () => (await bounds(routed(page).locator('[data-tab-indicator]'))).x)
          .toBeCloseTo(end.destination.x, 0);
      } finally {
        if (gesture) await finish(gesture.cdp);
      }
    });
  }

  for (const large of [false, true]) {
    test(`the tab strip shares finger tracking, springback and section commits${large ? ' at 130%' : ''}${suffix}`, async ({
      page,
    }) => {
      await open(page);
      if (large) {
        await page.setViewportSize({ width: 360, height: 900 });
        await page.addStyleTag({ content: 'html,body { font-size:20.8px !important }' });
      }
      const strip = routed(page).getByRole('tablist');
      const row = await bounds(strip);
      const root = await bounds(carousel(page));
      const track = carousel(page).locator(':scope > div');
      const indicator = strip.locator('[data-tab-indicator]');
      const initialIndicator = await bounds(indicator);
      const startX = row.x + row.width - 12;
      const y = row.y + row.height / 2;
      const cdp = await page.context().newCDPSession(page);
      const send = (type: 'touchStart' | 'touchMove' | 'touchEnd' | 'touchCancel', x: number) =>
        cdp.send('Input.dispatchTouchEvent', {
          type,
          touchPoints: type === 'touchEnd' || type === 'touchCancel' ? [] : [{ x, y }],
        });
      const offset = () =>
        track.evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41);
      try {
        await send('touchStart', startX);
        await send('touchMove', startX - 60);
        await expect.poll(offset).toBeCloseTo(-60, 0);
        await expect
          .poll(async () => (await bounds(indicator)).x)
          .toBeGreaterThan(initialIndicator.x);
        // Expire the release-velocity window while holding below halfway.
        await page.evaluate(async () => {
          const end = performance.now() + 160;
          await new Promise<void>((resolve) => {
            const frame = () =>
              performance.now() < end ? requestAnimationFrame(frame) : resolve();
            requestAnimationFrame(frame);
          });
        });
        await send('touchEnd', 0);
        await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
        await expect.poll(offset).toBeCloseTo(0, 0);
        await send('touchStart', startX);
        await send('touchMove', startX - root.width * 0.65);
        await send('touchEnd', 0);
        await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
        await expect.poll(offset).toBeCloseTo(-root.width, 0);
        const selected = await bounds(tabs(page).nth(1));
        expect(selected.x).toBeGreaterThanOrEqual(row.x - 1);
        expect(selected.x + selected.width).toBeLessThanOrEqual(row.x + row.width + 1);
        await send('touchStart', row.x + 12);
        await send('touchMove', row.x + 12 + root.width * 0.65);
        await send('touchEnd', 0);
        await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
        await expect.poll(offset).toBeCloseTo(0, 0);
      } finally {
        await finish(cdp);
      }
    });
  }

  test(`a held swipe does not rerender React or remeasure tabs for each pointer sample${suffix}`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      const probe = { armed: false, commits: 0, tabRects: 0, injected: false };
      Object.assign(window, {
        __swipeProbe: probe,
        __REACT_DEVTOOLS_GLOBAL_HOOK__: {
          supportsFiber: true,
          inject() {
            probe.injected = true;
            return 1;
          },
          onCommitFiberRoot() {
            if (probe.armed) probe.commits++;
          },
          onCommitFiberUnmount() {},
        },
      });
      const original = Element.prototype.getBoundingClientRect;
      Element.prototype.getBoundingClientRect = function () {
        if (probe.armed && this.getAttribute('role') === 'tab') probe.tabRects++;
        return original.call(this);
      };
    });
    await open(page);
    const { cdp, send } = await finger(page);
    const probe = () =>
      page.evaluate(
        () =>
          (
            window as unknown as {
              __swipeProbe: {
                armed: boolean;
                commits: number;
                tabRects: number;
                injected: boolean;
              };
            }
          ).__swipeProbe,
      );
    try {
      await send('touchStart');
      await send('touchMove', 290);
      await expect
        .poll(() =>
          carousel(page)
            .locator(':scope > div')
            .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41),
        )
        .toBeCloseTo(-20, 0);
      await page.evaluate(() => {
        const cost = (
          window as unknown as {
            __swipeProbe: { armed: boolean; commits: number; tabRects: number };
          }
        ).__swipeProbe;
        cost.armed = true;
        cost.commits = 0;
        cost.tabRects = 0;
      });
      for (let i = 1; i <= 20; i++) await send('touchMove', 290 - i * 4);
      await expect
        .poll(() =>
          carousel(page)
            .locator(':scope > div')
            .evaluate((node) => new DOMMatrixReadOnly(getComputedStyle(node).transform).m41),
        )
        .toBeCloseTo(-100, 0);
      const held = await probe();
      expect(held.injected).toBe(true);
      expect(held.commits).toBe(0);
      expect(held.tabRects).toBe(0);
    } finally {
      await send('touchCancel');
      await finish(cdp);
    }
  });

  test(`a touch tab release works when WebView omits the compatibility click${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await page.evaluate(() => {
      document.addEventListener(
        'click',
        (event) => {
          if ((event.target as HTMLElement).closest('[role="tab"]') && event.detail > 0)
            event.stopImmediatePropagation();
        },
        true,
      );
    });
    const cdp = await page.context().newCDPSession(page);
    const target = await bounds(tabs(page).nth(1));
    const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      cdp.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y }],
      });
    try {
      await send('touchStart', target.x + target.width / 2, target.y + target.height / 2);
      await send('touchEnd', 0, 0);
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
      const other = await bounds(tabs(page).nth(0));
      await send('touchStart', other.x + other.width / 2, other.y + other.height / 2);
      await send('touchMove', other.x + other.width / 2 + 20, other.y + other.height / 2);
      await send('touchEnd', 0, 0);
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
    } finally {
      await finish(cdp);
    }
  });

  test(`tabs distribute spare width and keep long labels scrollable${suffix}`, async ({ page }) => {
    await open(page);
    const strip = routed(page).getByRole('tablist');
    const a = await bounds(tabs(page).nth(0));
    const z = await bounds(tabs(page).nth(2));
    const row = await bounds(strip);
    expect(Math.abs(a.x - row.x - (row.x + row.width - z.x - z.width))).toBeLessThanOrEqual(1);
    await page.setViewportSize({ width: 360, height: 900 });
    await page.addStyleTag({ content: 'html,body { font-size:20.8px !important }' });
    const expectAllTabsWithinStrip = async () => {
      await expect
        .poll(async () => {
          const viewport = await bounds(strip);
          const count = await tabs(page).count();
          if (count !== 3) return false;
          for (let i = 0; i < count; i++) {
            const tab = tabs(page).nth(i);
            const tabBox = await bounds(tab);
            const labelBox = await bounds(tab.locator('[aria-hidden="true"] + span'));
            if (
              tabBox.x < viewport.x - 1 ||
              tabBox.x + tabBox.width > viewport.x + viewport.width + 1 ||
              labelBox.x < viewport.x - 1 ||
              labelBox.x + labelBox.width > viewport.x + viewport.width + 1
            ) {
              return false;
            }
          }
          return true;
        })
        .toBe(true);
    };
    await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
    await expectAllTabsWithinStrip();
    await tabs(page).nth(2).click();
    await expect(tabs(page).nth(2)).toHaveAttribute('aria-selected', 'true');
    await expectAllTabsWithinStrip();
    await tabs(page).nth(0).click();
    await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
    await expectAllTabsWithinStrip();
  });

  for (const input of ['touch', 'mouse'] as const) {
    test(`a vertical ${input} gesture interrupting a settle restores the selected pane${suffix}`, async ({
      page,
    }) => {
      await open(page);
      await tabs(page).nth(1).click();
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
      await carousel(page).evaluate((node) => {
        // Freeze the next departure beyond halfway before it can finish on a slow runner.
        const track = node.firstElementChild;
        if (!(track instanceof HTMLElement)) throw new Error('Missing carousel track');
        const animate = track.animate;
        track.animate = function (this: HTMLElement, ...args: Parameters<HTMLElement['animate']>) {
          this.animate = animate;
          const animation = animate.apply(this, args);
          animation.pause();
          animation.currentTime = 110;
          return animation;
        };
      });
      await tabs(page).nth(0).click();
      await expect(tabs(page).nth(1)).toHaveAttribute('aria-selected', 'true');
      await expect
        .poll(() =>
          carousel(page).evaluate((node) =>
            node
              .getAnimations({ subtree: true })
              .some((animation) => animation.playState === 'paused'),
          ),
        )
        .toBe(true);
      const { cdp, send } = await finger(page);
      try {
        if (input === 'touch') {
          await send('touchStart');
          await send('touchMove', 304, -70);
          await send('touchEnd');
        } else {
          const content = await bounds(routed(page).locator('ion-content'));
          await page.mouse.move(310, content.y + 180);
          await page.mouse.down();
          await page.mouse.move(304, content.y + 110);
          await page.mouse.up();
        }
        await carousel(page).evaluate(async (node) => {
          await Promise.all(
            node
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished.catch(() => undefined)),
          );
        });
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
  }

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
    await page.clock.install();
    await open(page);
    const { cdp, send } = await finger(page);
    try {
      await send('touchStart');
      await send('touchMove', 240);
      await send('touchCancel');
      await expect(tabs(page).nth(0)).toHaveAttribute('aria-selected', 'true');
      // Explicit sample intervals isolate the velocity assertion from CDP scheduling.
      await page.clock.pauseAt(new Date((await page.evaluate(() => Date.now())) + 1000));
      try {
        await send('touchStart');
        await page.clock.runFor(16);
        await send('touchMove', 296);
        await page.clock.runFor(16);
        await send('touchMove', 245);
        await page.clock.runFor(16);
        await send('touchEnd');
      } finally {
        await page.clock.resume();
      }
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
