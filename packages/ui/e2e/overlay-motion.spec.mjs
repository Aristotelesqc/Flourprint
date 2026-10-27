/* global window, document */
// The Ionic overlay motion bridge (ADR 0021): the selected motion item sets the timing of the
// native popover and sheet animations, while their geometry, gestures and focus stay Ionic's.
import { createRequire } from 'node:module';
import { tokens } from '../src/tokens.ts';

const requireMobile = createRequire(new URL('../../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const fixturePath = '/test/fixtures/overlay-motion/index.html';
const ms = (token) => Number.parseFloat(tokens.motion[`duration-${token}`]);

// After each willPresent / willDismiss, once the bridge's microtask has run, record the running
// Web Animations of the overlay and its shadow parts: the timing that actually plays.
const recordPlayedTimings = () => {
  window.__played = [];
  const record = (event) => {
    const overlay = event.target;
    if (!(overlay instanceof window.HTMLElement) || !overlay.shadowRoot) return;
    setTimeout(() => {
      const parts = [overlay, ...overlay.shadowRoot.querySelectorAll('*')];
      for (const element of parts) {
        for (const animation of element.getAnimations()) {
          if (animation.playState !== 'running') continue;
          window.__played.push({
            phase: event.type,
            part: element === overlay ? 'host' : element.localName + '.' + element.className,
            duration: animation.effect.getTiming().duration,
          });
        }
      }
    }, 0);
  };
  document.addEventListener('willPresent', record, true);
  document.addEventListener('willDismiss', record, true);
};

async function openFixture(page, testInfo, params) {
  await page.addInitScript(recordPlayedTimings);
  const theme = testInfo.project.metadata.theme;
  await page.goto(`${fixturePath}?${new URLSearchParams({ theme, ...params })}`);
  await expect(page.getByRole('heading', { name: 'Overlay motion bridge fixture' })).toBeVisible();
}

const played = (page, phase) =>
  page.evaluate((p) => window.__played.filter((entry) => entry.phase === p), phase);
const clearPlayed = (page) => page.evaluate(() => (window.__played = []));

for (const [version, menu, sheet] of [
  ['v1', 'effect', 'sheet'],
  ['alt', 'spatial', 'effect'],
]) {
  test(`menu and sheet play the selected ${version} timing with native geometry`, async ({
    page,
  }, testInfo) => {
    await openFixture(page, testInfo, { version });

    const opener = page.getByRole('button', { name: 'Open bridged menu' });
    await opener.click();
    const menuEl = page.getByRole('menu', { name: 'Bridged menu' });
    await expect(menuEl).toBeInViewport({ ratio: 1 });
    await expect.poll(async () => (await played(page, 'willPresent')).length).toBeGreaterThan(0);
    for (const entry of await played(page, 'willPresent')) expect(entry.duration).toBe(ms(menu));
    // Anchored to its opener: Ionic placed it next to the button, not centred on the screen.
    const anchor = await opener.boundingBox();
    const box = await menuEl.boundingBox();
    expect(
      Math.min(
        Math.abs(box.y - (anchor.y + anchor.height)),
        Math.abs(box.y + box.height - anchor.y),
      ),
    ).toBeLessThan(48);

    await clearPlayed(page);
    await page.keyboard.press('Escape');
    await expect(menuEl).toBeHidden();
    await expect(opener).toBeFocused();
    const menuLeave = await played(page, 'willDismiss');
    expect(menuLeave.length).toBeGreaterThan(0);
    for (const entry of menuLeave) expect(entry.duration).toBe(ms(menu));

    await clearPlayed(page);
    const sheetOpener = page.getByRole('button', { name: 'Open bridged sheet' });
    await sheetOpener.click();
    const dialog = page.getByRole('dialog', { name: 'Bridged sheet' });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    const enter = await played(page, 'willPresent');
    const wrapper = enter.filter((entry) => entry.part.startsWith('div.modal-wrapper'));
    const backdrop = enter.filter((entry) => entry.part.startsWith('ion-backdrop'));
    expect(wrapper.length).toBeGreaterThan(0);
    for (const entry of wrapper) expect(entry.duration).toBe(ms(sheet));
    for (const entry of backdrop) expect(entry.duration).toBe(ms('sheet'));
    // The breakpoint geometry is Ionic's: fully open sheet ends at the bottom of the viewport.
    await expect
      .poll(() =>
        page.evaluate(() => {
          const modal = document.querySelector('ion-modal');
          const rect = modal.shadowRoot.querySelector('.modal-wrapper').getBoundingClientRect();
          return Math.round(window.innerHeight - rect.bottom);
        }),
      )
      .toBe(0);

    // The sheet's drag gesture still works: drag the sheet down to dismiss it.
    await clearPlayed(page);
    const heading = page.getByRole('heading', { name: 'Bridged sheet' });
    const start = await heading.boundingBox();
    const viewport = page.viewportSize();
    await page.mouse.move(start.x + 10, start.y + 5);
    await page.mouse.down();
    await page.mouse.move(start.x + 10, viewport.height - 4, { steps: 12 });
    await page.mouse.up();
    await expect(dialog).toBeHidden();
    await expect(sheetOpener).toBeFocused();
  });
}

test('reduced motion plays no overlay animation, and the sheet still closes', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo, { version: 'alt', motion: 'reduced' });
  const opener = page.getByRole('button', { name: 'Open bridged menu' });
  await opener.click();
  await expect(page.getByRole('menu', { name: 'Bridged menu' })).toBeInViewport({ ratio: 1 });
  for (const entry of await played(page, 'willPresent')) expect(entry.duration).toBe(0);
  await page.keyboard.press('Escape');
  await expect(opener).toBeFocused();

  await clearPlayed(page);
  await page.getByRole('button', { name: 'Open bridged sheet' }).click();
  const dialog = page.getByRole('dialog', { name: 'Bridged sheet' });
  await expect(dialog).toBeInViewport({ ratio: 1 });
  for (const entry of await played(page, 'willPresent')) expect(entry.duration).toBe(0);
  await page.getByRole('button', { name: 'Close bridged sheet' }).click();
  await expect(dialog).toBeHidden();
  for (const entry of await played(page, 'willDismiss')) expect(entry.duration).toBe(0);
});
