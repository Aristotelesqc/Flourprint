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
