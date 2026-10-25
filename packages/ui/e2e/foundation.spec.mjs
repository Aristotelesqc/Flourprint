/* global window, document, getComputedStyle, Element */
import { createRequire } from 'node:module';
import { tokens } from '../src/tokens.ts';

const requireMobile = createRequire(new URL('../../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const fixturePath = '/test/fixtures/foundation/index.html';

const rgb = (hex) =>
  `rgb(${[1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16)).join(', ')})`;
const color = (theme, role) => rgb(tokens.colors[`${theme === 'light' ? '' : `${theme}-`}${role}`]);
const settings = (testInfo) => testInfo.project.metadata;

async function openFixture(page, testInfo, overrides = {}) {
  const { theme, scale } = settings(testInfo);
  const query = new URLSearchParams({ theme, scale: String(scale), ...overrides });
  await page.goto(`${fixturePath}?${query}`);
  await expect(
    page.getByRole('heading', { name: 'Shared foundation behaviour fixture' }),
  ).toBeVisible();
}

// Ionic renders the dialog role in shadow DOM; the labelled host owns its slotted content.
const overlayContent = (page, title) =>
  page.getByLabel(title, { exact: true }).filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  });

async function minTouch(page, locator) {
  const rootSize = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  const minimum = Number.parseFloat(tokens.spacing.touch) * rootSize;
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  // Browser layout is quantized to subpixels; compare final physical CSS-pixel rounding.
  expect(Math.round(box.height)).toBeGreaterThanOrEqual(Math.round(minimum));
}

async function buttonFocusRing(locator) {
  await expect(locator).toBeFocused();
  await expect
    .poll(() => locator.evaluate((node) => getComputedStyle(node).outlineStyle))
    .not.toBe('none');
}

test('raw strings remain raw, variants retain targets and the selected theme', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const field = page.getByRole('textbox', { name: 'Raw amount', exact: true });
  await field.fill('1,');
  await field.blur();
  await expect(field).toHaveValue('1,');
  await minTouch(page, field);
  await expect(field).toHaveCSS('border-top-width', '0px');
  const { theme } = settings(testInfo);
  for (const name of [
    'Primary action',
    'Secondary action',
    'Quiet action',
    'Destructive action',
    'Unavailable action',
  ]) {
    const action = page.getByRole('button', { name, exact: true });
    await minTouch(page, action);
    await expect(action).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    await expect(action).toHaveCSS('border-top-width', '0px');
  }
  await expect(page.getByRole('button', { name: 'Unavailable action' })).toBeDisabled();
  const primary = page.getByRole('button', { name: 'Primary action', exact: true });
  await expect
    .poll(() => primary.evaluate((node) => getComputedStyle(node, '::before').backgroundColor))
    .toBe(color(theme, 'primary'));
  await field.focus();
  await page.keyboard.press('Tab');
  await buttonFocusRing(primary);
});

test('disclosure keeps mounted raw input and restores focus when collapsed from inside', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const trigger = page.getByRole('button', { name: 'Preserved details', exact: true });
  const input = page.getByLabel('Disclosure scratch value', { exact: true });
  await input.fill('1,');
  for (let iteration = 0; iteration < 3; iteration += 1) {
    await page.getByRole('button', { name: 'Collapse from inside', exact: true }).click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await expect(trigger).toBeFocused();
    await expect(input).toBeAttached();
    // Overflow-clipped descendants retain boxes; verify the collapsed ARIA region and focus exclusion.
    const controlledId = await trigger.getAttribute('aria-controls');
    await expect
      .poll(async () => (await page.locator(`[id="${controlledId}"]`).boundingBox())?.height)
      .toBe(0);
    await expect(
      page.getByRole('textbox', { name: 'Disclosure scratch value', exact: true }),
    ).toHaveCount(0);
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(input).toHaveValue('1,');
  }
});

test('tabs have real labelled panels, skip disabled tabs and preserve panel fields', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const tablist = page.getByRole('tablist', { name: 'Fixture sections' });
  const first = tablist.getByRole('tab', { name: 'First section', exact: true });
  const second = tablist.getByRole('tab', { name: 'Second section', exact: true });
  const third = tablist.getByRole('tab', { name: 'Third section', exact: true });
  await page.getByLabel('Panel scratch value', { exact: true }).fill('kept,');
  await first.focus();
  await page.keyboard.press('ArrowRight');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel', { name: 'Second section' })).toContainText(
    'Second panel content',
  );
  await expect(tablist.getByRole('tab', { name: 'Unavailable section' })).toBeDisabled();
  await page.keyboard.press('End');
  await expect(third).toBeFocused();
  await page.keyboard.press('Home');
  await expect(first).toBeFocused();
  await expect(page.getByLabel('Panel scratch value', { exact: true })).toHaveValue('kept,');
  await minTouch(page, first);
});

test('menu keeps disabled and destructive actions visible, separates Close and restores exact opener', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const opener = page.getByRole('button', { name: 'Open actions', exact: true });
  await opener.click();
  const menu = page.getByRole('menu', { name: 'Fixture actions', exact: true });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await expect(menu.getByRole('menuitem', { name: 'Unavailable menu action' })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: 'Unavailable menu action' })).toBeDisabled();
  const deletion = menu.getByRole('menuitem', { name: 'Delete fixture entry', exact: true });
  await expect(deletion).toBeInViewport();
  await minTouch(page, deletion);
  const close = menu.getByRole('button', { name: 'Close actions', exact: true });
  const first = menu.getByRole('menuitem', {
    name: 'Edit a descriptive fixture entry',
    exact: true,
  });
  const [closeBox, firstBox, deleteBox, menuBox] = await Promise.all([
    close.boundingBox(),
    first.boundingBox(),
    deletion.boundingBox(),
    menu.boundingBox(),
  ]);
  expect(closeBox.y + closeBox.height).toBeLessThanOrEqual(firstBox.y);
  const rootSize = await page.evaluate(() =>
    Number.parseFloat(getComputedStyle(document.documentElement).fontSize),
  );
  expect(menuBox.y + menuBox.height - deleteBox.y - deleteBox.height).toBeLessThanOrEqual(
    Number.parseFloat(tokens.spacing['card-padding']) * rootSize,
  );
  await page.keyboard.press('End');
  await expect(deletion).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(opener).toBeFocused();
});

test('menu executes its action only after the real Ionic dismissal event', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  await page.getByRole('button', { name: 'Open actions', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Fixture actions', exact: true });
  await menu.getByRole('menuitem', { name: 'Export fixture entry', exact: true }).click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('status', { name: 'Action result' })).toHaveText(
    'Action executed after dismissal',
  );
});

test('long menus visibly disclose scrolling and retain the final destructive action', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  await page.getByRole('button', { name: 'Open long actions', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Many fixture actions', exact: true });
  await expect(menu.getByText('More actions below', { exact: true })).toBeVisible();
  const last = menu.getByRole('menuitem', { name: 'Final destructive action', exact: true });
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await last.click();
  await expect(menu).toBeHidden();
  await expect(page.getByRole('status', { name: 'Action result' })).toHaveText(
    'Action executed after dismissal',
  );
});

test('guarded Ionic dialog retains raw text through refused and accepted dismissal', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const opener = page.getByRole('button', { name: 'Open compact dialog', exact: true });
  await opener.click();
  await expect(page.getByRole('dialog', { name: 'Edit a measurement', exact: true })).toBeVisible();
  const dialog = overlayContent(page, 'Edit a measurement');
  const input = dialog.getByRole('textbox', { name: 'Dialog amount', exact: true });
  await input.fill('1,');
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(dialog).toBeVisible();
  await expect(input).toHaveValue('1,');
  await dialog.getByRole('button', { name: 'Allow dialog dismissal', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(
    overlayContent(page, 'Edit a measurement').getByRole('textbox', {
      name: 'Dialog amount',
      exact: true,
    }),
  ).toHaveValue('1,');
});

test('Ionic sheet cancellation keeps its mounted raw field for reopening', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const opener = page.getByRole('button', { name: 'Open editor sheet', exact: true });
  await opener.click();
  await expect(
    page.getByRole('dialog', { name: 'Edit fixture details', exact: true }),
  ).toBeVisible();
  const sheet = overlayContent(page, 'Edit fixture details');
  await sheet.getByRole('textbox', { name: 'Sheet amount', exact: true }).fill('1,');
  await sheet.getByRole('button', { name: 'Cancel sheet', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await expect(
    overlayContent(page, 'Edit fixture details').getByRole('textbox', {
      name: 'Sheet amount',
      exact: true,
    }),
  ).toHaveValue('1,');
});

test('Ionic select exposes readable options and keeps disabled values unavailable', async ({
  page,
}, testInfo) => {
  await openFixture(page, testInfo);
  const select = page.getByRole('button', { name: /^Choose flour,/ });
  await minTouch(page, select);
  await select.focus();
  await select.press('Space');
  await expect(page.getByRole('radio', { name: 'Unavailable flour', exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Unavailable flour', exact: true })).toBeDisabled();
  await page.getByRole('radio', { name: 'Second flour', exact: true }).click();
  await expect(page.getByRole('status', { name: 'Selected option' })).toHaveText('second');
  await expect(select).toHaveAccessibleName('Choose flour, Second flour');
});

test('floating Ionic hosts preserve scoped Light, Dark and AMOLED surface tokens', async ({
  page,
}, testInfo) => {
  const { theme } = settings(testInfo);
  await openFixture(page, testInfo, { theme: 'light', scopeTheme: theme });
  await page.getByRole('button', { name: 'Open actions', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Fixture actions', exact: true });
  await expect
    .poll(() => menu.evaluate((node) => getComputedStyle(node).backgroundColor))
    .toBe(color(theme, 'surface'));
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Open compact dialog', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit a measurement', exact: true })).toBeVisible();
  const dialog = overlayContent(page, 'Edit a measurement');
  const dialogInput = dialog.getByRole('textbox', { name: 'Dialog amount', exact: true });
  await expect
    .poll(() => dialogInput.evaluate((node) => getComputedStyle(node).color))
    .toBe(color(theme, 'on-surface'));
  await dialog.getByRole('button', { name: 'Allow dialog dismissal', exact: true }).click();
  await dialog.getByRole('button', { name: 'Close dialog', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Open editor sheet', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Edit fixture details', exact: true }),
  ).toBeVisible();
  const sheet = overlayContent(page, 'Edit fixture details');
  await expect
    .poll(() =>
      sheet
        .getByRole('textbox', { name: 'Sheet amount', exact: true })
        .evaluate((node) => getComputedStyle(node).color),
    )
    .toBe(color(theme, 'on-surface'));
  await sheet.getByRole('button', { name: 'Cancel sheet', exact: true }).click();
  await expect(sheet).toBeHidden();
  await page.getByText('First flour', { exact: true }).filter({ visible: true }).click();
  await expect
    .poll(() =>
      page
        .getByRole('radio', { name: 'First flour', exact: true })
        .evaluate((node) => getComputedStyle(node).color),
    )
    .toBe(color(theme, 'on-surface'));
});

test('scoped reduced motion suppresses the first Ionic opening animation', async ({
  page,
}, testInfo) => {
  await page.addInitScript(() => {
    window.__foundationDurations = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (keyframes, options) {
      const duration = typeof options === 'number' ? options : options?.duration;
      if (typeof duration === 'number') window.__foundationDurations.push(duration);
      return original.call(this, keyframes, options);
    };
  });
  await openFixture(page, testInfo, { motion: 'standard', scopeMotion: 'reduced' });
  await page.getByRole('button', { name: 'Open compact dialog', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Edit a measurement', exact: true })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Edit a measurement', exact: true }),
  ).toBeInViewport({ ratio: 1 });
  await expect(page.getByRole('dialog', { name: 'Edit a measurement', exact: true })).toHaveCSS(
    'opacity',
    '1',
  );
  const durations = await page.evaluate(() => window.__foundationDurations);
  expect(durations.every((duration) => duration === 0)).toBe(true);
});

test('catalogue exposes generated component examples with labelled theme and size choices', async ({
  page,
}, testInfo) => {
  const { theme, scale } = settings(testInfo);
  await page.goto('/catalogue.html');
  await page
    .getByRole('group', { name: 'Theme', exact: true })
    .getByRole('radio', { name: theme, exact: true })
    .check();
  await page
    .getByRole('group', { name: 'Width', exact: true })
    .getByRole('radio', { name: `${testInfo.project.use.viewport.width} px`, exact: true })
    .check();
  await page
    .getByRole('group', { name: 'Text', exact: true })
    .getByRole('radio', { name: `${scale} %`, exact: true })
    .check();
  await page
    .getByRole('group', { name: 'Motion', exact: true })
    .getByRole('radio', { name: 'reduced', exact: true })
    .check();
  for (const id of [
    'fp.button',
    'fp.surface',
    'fp.number-field',
    'fp.disclosure',
    'fp.tabs',
    'fp.floating-menu',
    'fp.bottom-sheet',
    'fp.dialog',
    'fp.select',
  ]) {
    await expect(page.getByRole('heading', { name: id, exact: true })).toBeVisible();
  }
  const actions = page.getByRole('button', { name: 'Actions', exact: true });
  await actions.click();
  await expect(page.getByRole('menu', { name: 'Formula options', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(actions).toBeFocused();
});
