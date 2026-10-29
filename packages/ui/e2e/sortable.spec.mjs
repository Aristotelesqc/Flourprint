/* global document, window */
import { createRequire } from 'node:module';
import { writeFile } from 'node:fs/promises';

const requireMobile = createRequire(new URL('../../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');

const originalOrder = ['Drag Autolyse', 'Drag Mix', 'Drag Bulk'];
const movedOrder = ['Drag Mix', 'Drag Autolyse', 'Drag Bulk'];

async function openControlledExample(page, testInfo) {
  await page.goto('/catalogue.html#fp.sortable-list');
  await page
    .getByRole('group', { name: 'Theme', exact: true })
    .getByRole('radio', { name: testInfo.project.metadata.theme, exact: true })
    .check();
  await page
    .getByRole('group', { name: 'Width', exact: true })
    .getByRole('radio', { name: `${testInfo.project.use.viewport.width} px`, exact: true })
    .check();
  await page
    .getByRole('group', { name: 'Text', exact: true })
    .getByRole('radio', { name: `${testInfo.project.metadata.scale} %`, exact: true })
    .check();
  const section = page.locator('section[id="fp.sortable-list"]');
  const example = section
    .getByRole('heading', { name: 'Controlled list with slots', exact: true })
    .locator('..');
  await expect(example.getByRole('button', { name: 'Drag Autolyse', exact: true })).toBeVisible();
  await expect.poll(() => handleOrder(example)).toEqual(originalOrder);
  const picture = testInfo.outputPath('sortable-controlled.png');
  await example.screenshot({ path: picture });
  await testInfo.attach('production-controlled-example', {
    path: picture,
    contentType: 'image/png',
  });
  await page.evaluate(() => {
    window.sortablePointerEvents = [];
    for (const type of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      document.addEventListener(
        type,
        (event) =>
          window.sortablePointerEvents.push({
            type,
            at: performance.now(),
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
            target: event.target.getAttribute?.('aria-label') ?? event.target.tagName,
          }),
        true,
      );
    }
  });
  return example;
}

const handleOrder = (example) =>
  example
    .getByRole('button', { name: /^Drag / })
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));

const liveAnnouncement = (page, text) =>
  page.locator('[aria-live="polite"]').filter({ hasText: text });

async function record(page, example, testInfo, details = {}) {
  const observations = JSON.stringify(
    {
      ...details,
      handleOrder: await handleOrder(example),
      browser: await page.evaluate(() => ({
        activeTag: document.activeElement?.tagName,
        activeLabel: document.activeElement?.getAttribute('aria-label'),
        liveText: [...document.querySelectorAll('[aria-live="polite"]')].map(
          (node) => node.textContent,
        ),
        pointerEvents: window.sortablePointerEvents,
        originMeasurements: window.sortableOriginMeasurements,
        settleAnimations: window.sortableSettleAnimations,
        osReduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
        scopedMotion: document.querySelector('main')?.getAttribute('data-motion'),
        reducedStyles: [...document.querySelectorAll('html, main, [data-slot-after="beta"]')].map(
          (node) => {
            const style = window.getComputedStyle(node);
            return {
              tag: node.tagName,
              slot: node.getAttribute('data-slot-after'),
              motion: node.getAttribute('data-motion'),
              durationEffect: style.getPropertyValue('--duration-effect'),
              durEffect: style.getPropertyValue('--dur-effect'),
              transitionDuration: style.transitionDuration,
            };
          },
        ),
      })),
    },
    null,
    2,
  );
  const observationPath = testInfo.outputPath('sortable-observations.json');
  await writeFile(observationPath, observations);
  await testInfo.attach('sortable-observations', {
    path: observationPath,
    contentType: 'application/json',
  });
}

test('sortable keyboard pickup, current slot drop, announcement and handle focus', async ({
  page,
}, testInfo) => {
  const example = await openControlledExample(page, testInfo);
  try {
    const handle = example.getByRole('button', { name: 'Drag Autolyse', exact: true });
    await handle.focus();
    await expect(handle).toBeFocused();
    await page.keyboard.press('Space');
    await expect(liveAnnouncement(page, 'Picked up Autolyse.')).toHaveCount(1);
    const slot = example.locator('[data-slot-after="step-2"]');
    await expect(slot).toBeVisible();
    // The pinned native KeyboardSensor moves by ten pixels per arrow activation.
    // Stop at its actual owned slot, not at an assumed row index or stale geometry.
    for (let presses = 0; presses < 30; presses += 1) {
      if ((await slot.getAttribute('data-drop-target')) === 'true') break;
      await page.keyboard.press('ArrowDown');
    }
    await expect(slot).toHaveAttribute('data-drop-target', 'true');
    await page.keyboard.press('Space');
    await expect.poll(() => handleOrder(example)).toEqual(movedOrder);
    await expect(liveAnnouncement(page, 'Dropped Autolyse after Mix.')).toHaveCount(1);
    await expect(example.getByRole('button', { name: 'Drag Autolyse', exact: true })).toBeFocused();
  } finally {
    await record(page, example, testInfo);
  }
});

test('sortable pointer hold follows the pointer and drops inside the current drawn slot', async ({
  page,
}, testInfo) => {
  const example = await openControlledExample(page, testInfo);
  let pressed = false;
  const details = {};
  try {
    const handle = example.getByRole('button', { name: 'Drag Autolyse', exact: true });
    await handle.scrollIntoViewIfNeeded();
    const handleBox = await handle.boundingBox();
    const origin = example.locator('[data-sortable-id="step-1"]');
    await origin.evaluate((node) => {
      window.sortableOriginMeasurements = [];
      const nativeBounds = node.getBoundingClientRect.bind(node);
      // Observation only: retain the native rectangle without changing returned geometry.
      node.getBoundingClientRect = () => {
        const rect = nativeBounds();
        window.sortableOriginMeasurements.push({
          at: performance.now(),
          width: rect.width,
          height: rect.height,
          style: node.getAttribute('style'),
          children: [...node.children].map((child) => ({
            className: child.className,
            hidden: child.getAttribute('aria-hidden'),
          })),
        });
        return rect;
      };
    });
    details.originBefore = await origin.boundingBox();
    const x = handleBox.x + handleBox.width / 2;
    const y = handleBox.y + handleBox.height / 2;
    await page.mouse.move(x, y);
    await page.mouse.down();
    pressed = true;
    // Real native PointerSensor Delay(350) activation; no synthetic drag events or timer bypass.
    const placeholder = origin.locator(':scope > [aria-hidden="true"]').first();
    await expect(placeholder).toBeVisible({ timeout: 2_000 });
    await expect(liveAnnouncement(page, 'Picked up Autolyse.')).toHaveCount(1);
    details.originDuring = await origin.boundingBox();
    expect(Math.abs(details.originDuring.height - details.originBefore.height)).toBeLessThanOrEqual(
      1,
    );
    expect(Math.abs(details.originDuring.width - details.originBefore.width)).toBeLessThanOrEqual(
      1,
    );
    const overlay = example.locator('[popover]:popover-open');
    await expect(overlay).toBeVisible();
    details.overlayBefore = await overlay.boundingBox();
    await page.mouse.move(x - 35, y + 35, { steps: 5 });
    await expect
      .poll(async () => {
        const box = await overlay.boundingBox();
        if (!box) return Number.POSITIVE_INFINITY;
        return Math.max(
          Math.abs(box.x - details.overlayBefore.x + 35),
          Math.abs(box.y - details.overlayBefore.y - 35),
        );
      })
      .toBeLessThanOrEqual(1);
    details.overlayAfter = await overlay.boundingBox();
    const slot = example.locator('[data-slot-after="step-2"]');
    await expect(slot).toBeVisible();
    await slot.evaluate(async (node) => {
      await Promise.all(
        node
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    let slotBox = await slot.boundingBox();
    await page.mouse.move(slotBox.x + slotBox.width / 2, slotBox.y + slotBox.height / 2, {
      steps: 8,
    });
    await expect(slot).toHaveAttribute('data-drop-target', 'true');
    // The outer padding is part of the visibly opened slot: remeasure after hover/scroll
    // and release inside that current drawn element, rather than its inner painted rail.
    slotBox = await slot.boundingBox();
    details.releaseSlot = slotBox;
    details.release = { x: slotBox.x + slotBox.width / 2, y: slotBox.y + 2 };
    await page.mouse.move(details.release.x, details.release.y);
    await page.mouse.up();
    pressed = false;
    await expect.poll(() => handleOrder(example)).toEqual(movedOrder);
    await expect(liveAnnouncement(page, 'Dropped Autolyse after Mix.')).toHaveCount(1);
  } finally {
    if (pressed) await page.mouse.up();
    await record(page, example, testInfo, details);
  }
});

const fixtureOriginalOrder = ['Drag Alpha', 'Drag Beta', 'Drag Gamma'];
const fixtureMovedOrder = ['Drag Beta', 'Drag Alpha', 'Drag Gamma'];
const fixturePath = '/test/fixtures/sortable/index.html';

async function openSortableFixture(
  page,
  testInfo,
  { osReduced = false, manualReduced = false, long = false } = {},
) {
  await page.emulateMedia({ reducedMotion: osReduced ? 'reduce' : 'no-preference' });
  const query = new URLSearchParams({
    theme: testInfo.project.metadata.theme,
    scale: String(testInfo.project.metadata.scale),
    ...(manualReduced ? { motion: 'reduced' } : {}),
    ...(long ? { long: 'true' } : {}),
  });
  await page.goto(`${fixturePath}?${query}`);
  await expect(page.getByRole('heading', { name: 'Sortable verification fixture' })).toBeVisible();
  const list = page.getByRole('region', { name: 'Controlled list', exact: true });
  const expected = long
    ? [
        ...fixtureOriginalOrder,
        ...Array.from({ length: 24 }, (_, index) => `Drag Item ${index + 4}`),
      ]
    : fixtureOriginalOrder;
  await expect.poll(() => handleOrder(list)).toEqual(expected);
  return list;
}

async function fixtureEvents(page) {
  return JSON.parse(
    await page.locator('pre[aria-label="Intent and activation log"]').textContent(),
  );
}

async function liftWithKeyboard(page, list) {
  const handle = list.getByRole('button', { name: 'Drag Alpha', exact: true });
  await handle.focus();
  await expect(handle).toBeFocused();
  await page.keyboard.press('Space');
  await expect(liveAnnouncement(page, 'Picked up Alpha.')).toHaveCount(1);
}

async function chooseBetaSlotWithKeyboard(page, list) {
  const slot = list.locator('[data-slot-after="beta"]');
  await expect(slot).toBeVisible();
  for (let presses = 0; presses < 40; presses += 1) {
    if ((await slot.getAttribute('data-drop-target')) === 'true') break;
    await page.keyboard.press('ArrowDown');
  }
  await expect(slot).toHaveAttribute('data-drop-target', 'true');
}

async function expectOneCancelledGesture(page, list) {
  await expect.poll(() => handleOrder(list)).toEqual(fixtureOriginalOrder);
  await expect(liveAnnouncement(page, 'Cancelled Alpha.')).toHaveCount(1);
  await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
  await expect
    .poll(async () => (await fixtureEvents(page)).filter((event) => 'active' in event))
    .toEqual([{ active: true }, { active: false }]);
  await expect
    .poll(async () => (await fixtureEvents(page)).filter((event) => 'intent' in event))
    .toEqual([{ intent: null }]);
}

test('sortable release outside after a valid hover keeps the controlled order', async ({
  page,
}, testInfo) => {
  const list = await openSortableFixture(page, testInfo);
  let pressed = false;
  try {
    const handle = list.getByRole('button', { name: 'Drag Alpha', exact: true });
    // A native tap never activates the hold sensor or emits application callbacks.
    await handle.click();
    await expect.poll(() => fixtureEvents(page)).toEqual([]);
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    pressed = true;
    await expect(liveAnnouncement(page, 'Picked up Alpha.')).toHaveCount(1);
    const slot = list.locator('[data-slot-after="beta"]');
    await expect(slot).toBeVisible();
    await slot.evaluate(async (node) => {
      await Promise.all(
        node
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const target = await slot.boundingBox();
    await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 6 });
    await expect(slot).toHaveAttribute('data-drop-target', 'true');
    // Current rectangle, deliberately outside every list-owned slot after valid hover.
    const current = await list.boundingBox();
    await page.mouse.move(Math.max(0, current.x - 2), target.y + target.height / 2, { steps: 4 });
    await page.mouse.up();
    pressed = false;
    await expectOneCancelledGesture(page, list);
  } finally {
    if (pressed) await page.mouse.up();
    await record(page, list, testInfo, { fixtureEvents: await fixtureEvents(page) });
  }
});

test('sortable Escape and public ref cancel finish one activated gesture each', async ({
  page,
}, testInfo) => {
  for (const action of ['escape', 'ref']) {
    const list = await openSortableFixture(page, testInfo);
    try {
      await liftWithKeyboard(page, list);
      await chooseBetaSlotWithKeyboard(page, list);
      if (action === 'escape') await page.keyboard.press('Escape');
      else await page.getByRole('button', { name: 'Cancel current drag', exact: true }).click();
      await expectOneCancelledGesture(page, list);
      await expect(list.getByRole('button', { name: 'Drag Alpha', exact: true })).toBeFocused();
      if (action === 'ref') {
        await expect
          .poll(async () => (await fixtureEvents(page)).filter((event) => 'cancelResult' in event))
          .toEqual([{ cancelResult: true }]);
        await page.getByRole('button', { name: 'Cancel current drag', exact: true }).click();
        await expect
          .poll(async () => (await fixtureEvents(page)).filter((event) => 'cancelResult' in event))
          .toEqual([{ cancelResult: true }, { cancelResult: false }]);
      }
    } finally {
      await record(page, list, testInfo, { action, fixtureEvents: await fixtureEvents(page) });
    }
  }
});

test('sortable controlled disable cancels once and prevents reactivation', async ({
  page,
}, testInfo) => {
  const list = await openSortableFixture(page, testInfo);
  try {
    await liftWithKeyboard(page, list);
    await chooseBetaSlotWithKeyboard(page, list);
    await page.getByRole('button', { name: 'Disable sorting', exact: true }).click();
    await expectOneCancelledGesture(page, list);
    const handle = list.getByRole('button', { name: 'Drag Alpha', exact: true });
    await expect(handle).toHaveAttribute('aria-disabled', 'true');
    await handle.focus();
    await page.keyboard.press('Space');
    await expect
      .poll(async () => (await fixtureEvents(page)).filter((event) => 'active' in event))
      .toEqual([{ active: true }, { active: false }]);
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
  } finally {
    await record(page, list, testInfo, { fixtureEvents: await fixtureEvents(page) });
  }
});

for (const mode of ['OS', 'manual', 'manual mid-gesture']) {
  test(`sortable ${mode} reduced motion keeps final order, announcement and keyboard focus`, async ({
    page,
  }, testInfo) => {
    const list = await openSortableFixture(page, testInfo, {
      osReduced: mode === 'OS',
      manualReduced: mode === 'manual',
    });
    try {
      await liftWithKeyboard(page, list);
      if (mode === 'manual mid-gesture') {
        await page.getByRole('button', { name: 'Manual reduced motion', exact: true }).click();
      }
      await chooseBetaSlotWithKeyboard(page, list);
      const slot = list.locator('[data-slot-after="beta"]');
      await expect.soft(slot).toHaveCSS('transition-duration', '0s');
      // Observe actual native settle animations; no timing substitution or artificial delay.
      await page.evaluate(() => {
        window.sortableSettleAnimations = [];
        const nativeAnimate = window.Element.prototype.animate;
        window.Element.prototype.animate = function (...args) {
          const animation = nativeAnimate.apply(this, args);
          window.sortableSettleAnimations.push({
            duration: animation.effect?.getTiming().duration,
            easing: animation.effect?.getTiming().easing,
            target: this.tagName,
          });
          return animation;
        };
      });
      await page.keyboard.press('Space');
      await expect.poll(() => handleOrder(list)).toEqual(fixtureMovedOrder);
      await expect(liveAnnouncement(page, 'Dropped Alpha after Beta.')).toHaveCount(1);
      await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
      expect(
        await page.evaluate(() =>
          window.sortableSettleAnimations.filter((entry) => Number(entry.duration) > 0),
        ),
      ).toEqual([]);
      await expect(list.getByRole('button', { name: 'Drag Alpha', exact: true })).toBeFocused();
    } finally {
      await record(page, list, testInfo, { mode, fixtureEvents: await fixtureEvents(page) });
    }
  });
}

async function ionicScrollMetrics(page) {
  return page.locator('ion-content').evaluate(async (content) => {
    const scroll = await content.getScrollElement();
    const rect = scroll.getBoundingClientRect();
    return {
      top: scroll.scrollTop,
      height: scroll.clientHeight,
      total: scroll.scrollHeight,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
    };
  });
}

test('sortable native pointer auto-scroll reaches the real Ionic shadow scroll element', async ({
  page,
}, testInfo) => {
  const list = await openSortableFixture(page, testInfo, { long: true });
  let pressed = false;
  const details = {};
  try {
    details.initialScroll = await ionicScrollMetrics(page);
    expect(details.initialScroll.total).toBeGreaterThan(details.initialScroll.height);
    const handle = list.getByRole('button', { name: 'Drag Alpha', exact: true });
    const box = await handle.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    pressed = true;
    await expect(liveAnnouncement(page, 'Picked up Alpha.')).toHaveCount(1);
    details.afterActivation = await ionicScrollMetrics(page);
    const edge = details.afterActivation.rect;
    await page.mouse.move(box.x + box.width / 2, edge.y + edge.height * 0.95, { steps: 16 });
    await expect
      .poll(async () => (await ionicScrollMetrics(page)).top, { timeout: 4_000 })
      .toBeGreaterThan(details.afterActivation.top);
    details.firstScroll = await ionicScrollMetrics(page);
    // Native continued scrolling while held: no synthetic scroll or further pointer motion.
    await expect
      .poll(async () => (await ionicScrollMetrics(page)).top, { timeout: 4_000 })
      .toBeGreaterThan(details.firstScroll.top);
    details.continuedScroll = await ionicScrollMetrics(page);
    await page.keyboard.press('Escape');
    await page.mouse.up();
    pressed = false;
    await expect(liveAnnouncement(page, 'Cancelled Alpha.')).toHaveCount(1);
    await expect
      .poll(async () => (await fixtureEvents(page)).filter((event) => 'intent' in event))
      .toEqual([{ intent: null }]);
  } finally {
    if (pressed) {
      await page.keyboard.press('Escape');
      await page.mouse.up();
    }
    details.finalScroll = await ionicScrollMetrics(page);
    await record(page, list, testInfo, { ...details, fixtureEvents: await fixtureEvents(page) });
  }
});

for (const ending of ['drop', 'cancel']) {
  test(`sortable native top-layer ${ending} preserves an existing Ionic scroll offset`, async ({
    page,
  }, testInfo) => {
    const list = await openSortableFixture(page, testInfo, { long: true });
    let pressed = false;
    const details = {};
    try {
      await page.locator('ion-content').evaluate(async (content) => {
        const scroll = await content.getScrollElement();
        const source = document.querySelector('[data-sortable-id="item-8"]');
        const sourceRect = source.getBoundingClientRect();
        const viewRect = scroll.getBoundingClientRect();
        await content.scrollToPoint(
          0,
          scroll.scrollTop + sourceRect.y - viewRect.y + (sourceRect.height - viewRect.height) / 2,
          0,
        );
      });
      details.initialScroll = await ionicScrollMetrics(page);
      expect(details.initialScroll.top).toBeGreaterThan(0);
      const beforeOrder = await handleOrder(list);
      const handle = list.getByRole('button', { name: 'Drag Item 8', exact: true });
      const source = list.locator('[data-sortable-id="item-8"]');
      const box = await handle.boundingBox();
      details.sourceBefore = await source.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      pressed = true;
      await expect(liveAnnouncement(page, 'Picked up Item 8.')).toHaveCount(1);
      const overlay = page.locator('[data-dnd-overlay][popover="manual"]:popover-open');
      await expect(overlay).toBeVisible();
      details.overlay = await overlay.boundingBox();
      details.nativeOverlay = await overlay.evaluate((node) => ({
        topLayer: node.matches(':popover-open'),
        popover: node.getAttribute('popover'),
        pointerEvents: window.getComputedStyle(node).pointerEvents,
      }));
      expect(details.nativeOverlay).toEqual({
        topLayer: true,
        popover: 'manual',
        pointerEvents: 'none',
      });
      const picture = testInfo.outputPath('ionic-top-layer-held.png');
      await page.screenshot({ path: picture });
      await testInfo.attach('ionic-native-top-layer-held', {
        path: picture,
        contentType: 'image/png',
      });
      if (ending === 'drop') {
        const slot = list.locator('[data-slot-after="item-9"]');
        await expect(slot).toBeVisible();
        await slot.evaluate(async (node) =>
          Promise.all(
            node
              .getAnimations({ subtree: true })
              .map((animation) => animation.finished.catch(() => {})),
          ),
        );
        const rect = await slot.boundingBox();
        await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2, { steps: 6 });
        await expect(slot).toHaveAttribute('data-drop-target', 'true');
        await page.mouse.up();
        pressed = false;
        const expected = beforeOrder.filter((name) => name !== 'Drag Item 8');
        expected.splice(expected.indexOf('Drag Item 9') + 1, 0, 'Drag Item 8');
        await expect.poll(() => handleOrder(list)).toEqual(expected);
        await expect(liveAnnouncement(page, 'Dropped Item 8 after Item 9.')).toHaveCount(1);
      } else {
        await page.keyboard.press('Escape');
        await page.mouse.up();
        pressed = false;
        await expect.poll(() => handleOrder(list)).toEqual(beforeOrder);
        await expect(liveAnnouncement(page, 'Cancelled Item 8.')).toHaveCount(1);
      }
      await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
      await expect
        .poll(async () =>
          Math.abs((await ionicScrollMetrics(page)).top - details.initialScroll.top),
        )
        .toBeLessThanOrEqual(1);
    } finally {
      if (pressed) {
        await page.keyboard.press('Escape');
        await page.mouse.up();
      }
      details.finalScroll = await ionicScrollMetrics(page);
      await record(page, list, testInfo, {
        ...details,
        ending,
        fixtureEvents: await fixtureEvents(page),
      });
    }
  });
}
