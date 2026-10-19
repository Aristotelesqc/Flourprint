import { createRequire } from 'node:module';
import { openGlobalDestination, recipeCard } from './screen-actions.mjs';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', nav: 'A', lang: 'en', motion: 'reduce', capture: '1', ...extra })}`;

test('allocated milk contributes to component hydration without a false editable target', async ({
  page,
}) => {
  await page.goto(route({ mode: 'edit', section: 'ingredients' }));
  const hydration = page.getByTestId('component-hydration-tangzhong');
  await expect(hydration).toHaveValue('580.5');
  await expect(hydration).toBeDisabled();
  await expect(page.getByTestId('component-ratio-tangzhong')).toBeEnabled();
});

test('preparation context tiles open weighing without losing checked quantities', async ({
  page,
}) => {
  await page.goto(route({ screen: 'preparation', prep: 'cooking' }));
  const tiles = page.locator('[data-fp-component="fp.context-tiles"]');
  await expect(tiles).toContainText('177 °C');
  await tiles.getByRole('button', { name: 'Weigh', exact: true }).click();
  const quantities = page.getByRole('button', { name: /^Frozen quantities/ });
  await expect(quantities).toHaveAttribute('aria-expanded', 'true');
  const firstCheck = page.getByRole('checkbox').first();
  await firstCheck.check();
  await quantities.click();
  await tiles.getByRole('button', { name: 'Weigh', exact: true }).click();
  await expect(firstCheck).toBeChecked();
});

test('two preparations of the same recipe stay independently selectable', async ({ page }) => {
  await page.goto(route({ prep: 'fresh' }));
  await page.getByRole('button', { name: 'Recipe actions', exact: true }).click();
  await page.getByRole('button', { name: 'Start another preparation', exact: true }).click();
  const sessions = page.getByRole('tablist', { name: 'Select active preparation', exact: true });
  await expect(sessions.getByRole('tab')).toHaveCount(2);
  const labels = await sessions.getByRole('tab').allTextContents();
  expect(new Set(labels).size).toBe(2);
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Second shokupan only');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply', exact: true }).click();
  await sessions.getByRole('tab').first().click();
  await expect(page.locator('.phone-content')).not.toContainText('Second shokupan only');
  await sessions.getByRole('tab').last().click();
  await expect(page.locator('.phone-content')).toContainText('Second shokupan only');
});

test('trash confirms a named recipe and restores it through settings', async ({ page }) => {
  await page.goto(route());
  await page.getByRole('button', { name: 'Recipe actions', exact: true }).click();
  await page.getByRole('button', { name: 'Move to trash', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Shokupan');
  await dialog.getByRole('button', { name: 'Move to trash', exact: true }).click();
  await expect(recipeCard(page, 'Shokupan')).toHaveCount(0);
  await openGlobalDestination(page, 'Settings', 'en');
  await page.getByRole('button', { name: 'Open trash', exact: true }).click();
  await expect(page.getByTestId('trash-view')).toContainText('Shokupan');
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.getByTestId('trash-view')).toContainText('No recipes in trash');
  await openGlobalDestination(page, 'Recipes', 'en');
  await expect(recipeCard(page, 'Shokupan')).toBeVisible();
});
