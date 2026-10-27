/* global window */
// Production fp.* components must consume the selected motion, not merely the bridge fixture.
import { createRequire } from 'node:module';
import { tokens } from '../src/tokens.ts';
import { defaultMotionManifest } from '../src/motions/default-manifest.ts';
import { recordPlayedTimings } from './overlay-motion-recording.mjs';
const requireMobile = createRequire(new URL('../../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const fixture = '/test/fixtures/foundation/index.html';

async function openFixture(page, testInfo, params = {}) {
  await page.addInitScript(recordPlayedTimings);
  const { theme, scale } = testInfo.project.metadata;
  await page.goto(`${fixture}?${new URLSearchParams({ theme, scale: String(scale), ...params })}`);
  await expect(
    page.getByRole('heading', { name: 'Shared foundation behaviour fixture' }),
  ).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() => window.getComputedStyle(window.document.documentElement).fontSize),
    )
    .toBe(scale === 130 ? '20.8px' : '16px');
}
const played = (page, phase) =>
  page.evaluate((value) => window.__played.filter((entry) => entry.phase === value), phase);
const clear = (page) =>
  page.evaluate(() => {
    window.__played = [];
  });
function expected(id, version) {
  if (version === 'alt') {
    const duration = id.includes('sheet-') ? 'effect' : 'spatial';
    const easing = id.includes('sheet-') ? 'standard' : 'decelerate';
    return {
      duration: Number.parseFloat(tokens.motion[`duration-${duration}`]),
      easing: tokens.motion[`easing-${easing}`],
    };
  }
  const { duration, easing } = defaultMotionManifest[id].standard;
  return {
    duration: Number.parseFloat(tokens.motion[`duration-${duration}`]),
    easing: tokens.motion[`easing-${easing}`],
  };
}
async function assertTiming(page, phase, version, prefix) {
  await expect.poll(async () => (await played(page, phase)).length).toBeGreaterThan(0);
  const entries = await played(page, phase);
  if (prefix === 'sheet') {
    expect(entries.some((entry) => entry.part.startsWith('ion-backdrop'))).toBe(true);
    expect(entries.some((entry) => entry.part.startsWith('div.modal-wrapper'))).toBe(true);
  }
  for (const entry of entries) {
    const part = prefix === 'sheet' && entry.part.startsWith('ion-backdrop') ? 'backdrop' : prefix;
    const wanted = expected(
      `fp.motion.${part}-${phase === 'willPresent' ? 'enter' : 'exit'}`,
      version,
    );
    expect(entry.duration).toBe(wanted.duration);
    expect(entry.easing).toBe(wanted.easing);
  }
}
for (const version of ['v1', 'alt']) {
  test(`production menu and sheet consume ${version} timing and easing`, async ({
    page,
  }, testInfo) => {
    await openFixture(page, testInfo, { version });
    const opener = page.getByRole('button', { name: 'Open actions', exact: true });
    await opener.click();
    const menu = page.getByRole('menu', { name: 'Fixture actions', exact: true });
    await expect(menu).toBeInViewport({ ratio: 1 });
    await assertTiming(page, 'willPresent', version, 'menu');
    await clear(page);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
    await assertTiming(page, 'willDismiss', version, 'menu');
    await clear(page);
    const sheetOpener = page.getByRole('button', { name: 'Open editor sheet', exact: true });
    await sheetOpener.click();
    const dialog = page.getByRole('dialog', { name: 'Edit fixture details', exact: true });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    await assertTiming(page, 'willPresent', version, 'sheet');
    await page.getByRole('textbox', { name: 'Sheet amount', exact: true }).fill('1,');
    await clear(page);
    await page.getByRole('button', { name: 'Cancel sheet', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(sheetOpener).toBeFocused();
    await assertTiming(page, 'willDismiss', version, 'sheet');
    await sheetOpener.click();
    await expect(page.getByRole('textbox', { name: 'Sheet amount', exact: true })).toHaveValue(
      '1,',
    );
  });
}
for (const mode of ['manual', 'system']) {
  test(`production overlays finish at zero with ${mode} reduced motion`, async ({
    page,
  }, testInfo) => {
    if (mode === 'system') await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page, testInfo, {
      version: 'alt',
      motion: mode === 'system' ? 'system' : 'standard',
      scopeMotion: mode === 'system' ? 'system' : 'reduced',
    });
    const opener = page.getByRole('button', { name: 'Open actions', exact: true });
    await opener.click();
    const menu = page.getByRole('menu', { name: 'Fixture actions', exact: true });
    await expect(menu).toBeInViewport({ ratio: 1 });
    await expect.poll(async () => (await played(page, 'willPresent')).length).toBeGreaterThan(0);
    for (const entry of await played(page, 'willPresent')) expect(entry.duration).toBe(0);
    await clear(page);
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(opener).toBeFocused();
    expect((await played(page, 'willDismiss')).length).toBeGreaterThan(0);
    for (const entry of await played(page, 'willDismiss')) expect(entry.duration).toBe(0);
    await clear(page);
    const sheetOpener = page.getByRole('button', { name: 'Open editor sheet', exact: true });
    await sheetOpener.click();
    const dialog = page.getByRole('dialog', { name: 'Edit fixture details', exact: true });
    await expect(dialog).toBeInViewport({ ratio: 1 });
    expect((await played(page, 'willPresent')).length).toBeGreaterThan(0);
    for (const entry of await played(page, 'willPresent')) expect(entry.duration).toBe(0);
    await clear(page);
    await page.getByRole('button', { name: 'Cancel sheet', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(sheetOpener).toBeFocused();
    expect((await played(page, 'willDismiss')).length).toBeGreaterThan(0);
    for (const entry of await played(page, 'willDismiss')) expect(entry.duration).toBe(0);
  });
}
test('production sheet still dismisses through a real drag after motion binding', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const opener = page.getByRole('button', { name: 'Open editor sheet', exact: true });
  await opener.click();
  const dialog = page.getByRole('dialog', { name: 'Edit fixture details', exact: true });
  await expect(dialog).toBeInViewport({ ratio: 1 });
  const heading = await page
    .getByRole('heading', { name: 'Edit fixture details', exact: true })
    .boundingBox();
  await page.mouse.move(heading.x + heading.width / 2, heading.y + heading.height / 2);
  await page.mouse.down();
  await page.mouse.move(heading.x + heading.width / 2, page.viewportSize().height - 4, {
    steps: 12,
  });
  await page.mouse.up();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
});
