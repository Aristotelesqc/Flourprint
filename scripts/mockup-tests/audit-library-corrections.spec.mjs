import { createRequire } from 'node:module';
import { stepMenu, summaryMetric } from './screen-actions.mjs';
import { attachBrowserDiagnostics } from './browser-diagnostics.mjs';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');

test.afterEach(async ({ page }, testInfo) => attachBrowserDiagnostics(page, testInfo));

const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', mode: 'edit', lang: 'fr', nav: 'A', theme: 'light', width: '393', scale: '100', capture: '1', motion: 'reduce', ...extra })}`;

test('L29/L123 step menu stays near its actual opener and Escape returns focus', async ({
  page,
}) => {
  for (const [width, scale] of [
    [393, 100],
    [360, 130],
  ]) {
    await page.setViewportSize({ width, height: 852 });
    await page.goto(route({ width: String(width), scale: String(scale) }));
    const trigger = page.getByTestId('step-menu-bulk').filter({ visible: true });
    await trigger.scrollIntoViewIfNeeded();
    const triggerBox = await trigger.boundingBox();
    const menu = await stepMenu(page, 'bulk');
    const popup = menu.locator('.menu-popup');
    const popupBox = await popup.boundingBox();
    const contentBox = await page.locator('main.phone-content').boundingBox();
    expect(popupBox.y).toBeGreaterThanOrEqual(contentBox.y);
    expect(popupBox.y + popupBox.height).toBeLessThanOrEqual(contentBox.y + contentBox.height);
    const anchorGap = Math.min(
      Math.abs(popupBox.y - (triggerBox.y + triggerBox.height)),
      Math.abs(triggerBox.y - (popupBox.y + popupBox.height)),
    );
    expect(anchorGap).toBeLessThanOrEqual(16);
    const closeBox = await menu.getByRole('button', { name: 'Fermer', exact: true }).boundingBox();
    const editBox = await menu
      .getByRole('button', { name: 'Modifier l’étape', exact: true })
      .boundingBox();
    expect(
      closeBox.x >= editBox.x + editBox.width || closeBox.y >= editBox.y + editBox.height,
    ).toBe(true);
    const remove = menu.getByRole('button', { name: 'Supprimer', exact: true });
    const destructiveBorder = await remove.evaluate((el) => getComputedStyle(el).borderTopWidth);
    expect(Number.parseFloat(destructiveBorder)).toBeGreaterThanOrEqual(1);
    const actions = menu.locator('.menu-actions button');
    expect(await actions.count()).toBeGreaterThanOrEqual(5);
    for (const action of await actions.all()) {
      await action.evaluate((el) => el.scrollIntoView({ block: 'center', inline: 'nearest' }));
      await expect(action).toBeInViewport({ ratio: 1 });
      await action.click({ trial: true });
    }
    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
  }
});

for (const metric of [
  ['Matières grasses', 'Matières grasses'],
  ['Sucres', 'Sucres'],
]) {
  test(`L123 closing ${metric[1]} restores its actual summary opener`, async ({ page }) => {
    await page.goto(route({ mode: 'read' }));
    const help = summaryMetric(page, metric[0]).getByRole('button', {
      name: metric[0],
      exact: true,
    });
    await help.click();
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Fermer', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(help).toBeFocused();
  });
}

for (const theme of ['light', 'dark', 'amoled']) {
  test(`L115/L123 tabs remain fully readable and focus is rounded at 360/130: ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 852 });
    await page.goto(route({ mode: 'read', width: '360', scale: '130', theme }));
    const nav = page.getByRole('tablist', { name: 'Navigation', exact: true });
    const tabs = nav.getByRole('tab');
    await expect(tabs).toHaveCount(3);
    const layout = await nav.evaluate((el) => {
      const bounds = el.getBoundingClientRect();
      return {
        overflow: el.scrollWidth - el.clientWidth,
        bounds: { left: bounds.left, right: bounds.right },
        tabs: [...el.querySelectorAll('[role="tab"]')].map((tab) => {
          const rect = tab.getBoundingClientRect();
          const label = tab.querySelector('.tab-label').getBoundingClientRect();
          return {
            left: rect.left,
            right: rect.right,
            height: rect.height,
            labelRight: label.right,
          };
        }),
      };
    });
    expect(layout.overflow).toBeLessThanOrEqual(1);
    for (const tab of layout.tabs) {
      expect(tab.height).toBeGreaterThanOrEqual(48);
      expect(tab.left).toBeGreaterThanOrEqual(layout.bounds.left - 1);
      expect(tab.right).toBeLessThanOrEqual(layout.bounds.right + 1);
      expect(tab.labelRight).toBeLessThanOrEqual(tab.right + 1);
    }
    await tabs.last().focus();
    const focus = await tabs.last().evaluate((el) => {
      const style = getComputedStyle(el);
      return {
        radius: style.borderRadius,
        outline: style.outlineWidth,
        offset: style.outlineOffset,
      };
    });
    expect(Number.parseFloat(focus.radius)).toBeGreaterThan(0);
    expect(Number.parseFloat(focus.outline)).toBeGreaterThanOrEqual(2);
    expect(Number.parseFloat(focus.offset)).toBeGreaterThanOrEqual(0);
  });
}

test('L123 every visible edit form control has a real 48 px input target', async ({ page }) => {
  await page.goto(route());
  const fields = page.locator(
    '.section-carousel-pane.is-active input:not([type="checkbox"]):not([type="radio"]):visible, .section-carousel-pane.is-active select:visible, .header-name-input:visible',
  );
  expect(await fields.count()).toBeGreaterThan(5);
  for (const field of await fields.all()) {
    const box = await field.boundingBox();
    expect(
      box.height,
      await field.evaluate((el) => el.getAttribute('data-testid') ?? el.outerHTML.slice(0, 220)),
    ).toBeGreaterThanOrEqual(48);
  }
});
