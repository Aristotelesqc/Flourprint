import { createRequire } from 'node:module';
import {
  openGlobalDestination,
  editRecipe,
  editProcessStep,
  recipeCard,
} from './screen-actions.mjs';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const defaultsKey = 'flourprint:mockup:component-defaults';
const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'settings', lang: 'en', nav: 'A', capture: '1', motion: 'reduce', ...extra })}`;
const committed = async (field, value) => {
  await field.fill(value);
  await field.press('Enter');
};

test('explicit theme links keep the rendered theme and selected preference in sync', async ({
  page,
}) => {
  for (const theme of ['light', 'dark', 'amoled']) {
    await page.goto(route({ theme }));
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await expect(
      page.getByRole('button', {
        name: theme === 'light' ? 'Light' : theme === 'dark' ? 'Warm dark' : 'AMOLED',
        exact: true,
      }),
    ).toHaveAttribute('aria-pressed', 'true');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  }
});
test('scald defaults synchronize both directions and rejected values never save', async ({
  page,
}) => {
  await page.goto(route());
  const ratio = page.getByTestId('defaults-ratio-tangzhong');
  const hydration = page.getByTestId('defaults-hydration-tangzhong');
  await expect(ratio).toHaveValue('5');
  await expect(hydration).toHaveValue('500');
  await committed(ratio, '6');
  await expect(hydration).toHaveValue('600');
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).tangzhong.hydrationPct,
      defaultsKey,
    ),
  ).toBe(600);
  await committed(hydration, '700');
  await expect(ratio).toHaveValue('7');
  await committed(ratio, '1');
  await expect(ratio).toHaveAttribute('aria-invalid', 'true');
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).tangzhong.hydrationPct,
      defaultsKey,
    ),
  ).toBe(700);
  await expect(page.locator('.phone-content')).toContainText('tangzhong');
});
test('incomplete default text survives edits to its sibling and another preset', async ({
  page,
}) => {
  await page.goto(route());
  const ratio = page.getByTestId('defaults-ratio-tangzhong');
  await ratio.fill('-');
  await committed(page.getByTestId('defaults-flour-poolish'), '25');
  await expect(ratio).toHaveValue('-');
  await expect(ratio).toHaveAttribute('aria-invalid', 'true');
  await committed(page.getByTestId('defaults-hydration-tangzhong'), '600');
  await expect(ratio).toHaveValue('-');
  await expect(ratio).toHaveAttribute('aria-invalid', 'true');
  expect(
    await page.evaluate(
      (k) => JSON.parse(localStorage.getItem(k)).tangzhong.hydrationPct,
      defaultsKey,
    ),
  ).toBe(600);
});
test('stored defaults affect a new component without changing an existing one', async ({
  page,
}) => {
  await page.goto(route());
  await committed(page.getByTestId('defaults-flour-yudane'), '7');
  await openGlobalDestination(page, 'Recipes', 'en');
  await page.getByRole('searchbox').fill('Baguette');
  await page.getByRole('button', { name: 'Baguette', exact: true }).click();
  await editRecipe(page, 'en');
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await page.getByRole('button', { name: 'Add yudane', exact: true }).click();
  const flour = page.locator('[data-testid^="component-share-yudane-"]');
  // The actual stable field id is discovered from the created component, not an invented UUID.
  await expect(page.getByRole('button', { name: /Yudane/ }).first()).toBeVisible();
  await expect(page.locator('[data-testid^="component-hydration-yudane-"]')).toHaveValue('100');
  await expect(flour).toHaveValue('7');
  await expect(page.locator('.phone-content')).not.toContainText(/yudane-[0-9a-f]{6}/);
});
test('System theme follows OS and persists without resetting on reload', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto(route());
  await page.getByRole('button', { name: /^System(?:\(|$)/ }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.getByRole('button', { name: /^System(?:\(|$)/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});
test('ambient Fahrenheit is displayed and edited through core conversion', async ({ page }) => {
  await page.goto(route());
  const units = page.getByRole('group', { name: 'Ambient and dough temperature', exact: true });
  await units.getByRole('button', { name: '°F', exact: true }).click();
  await expect(units.getByRole('button', { name: '°F', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await openGlobalDestination(page, 'Recipes', 'en');
  await page.getByRole('searchbox').fill('Baguette');
  await page.getByRole('button', { name: 'Baguette', exact: true }).click();
  await editRecipe(page, 'en');
  await page.getByRole('tab', { name: 'Steps', exact: true }).click();
  const dialog = await editProcessStep(page, 'mix', 'en');
  const temp = dialog.getByRole('textbox', { name: 'Temperature', exact: true });
  await committed(temp, '70');
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click();
  await expect(page.locator('.phone-content')).toContainText('Temperature: 70 °F');
});
test('two preparations keep their notes and selected recipe when resumed from cards', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date('2026-10-19T12:00:00Z'));
  await page.goto(route({ screen: 'library', prep: 'fresh' }));
  await page.getByRole('searchbox').fill('Baguette');
  await page.getByRole('button', { name: 'Baguette', exact: true }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await page.getByRole('textbox', { name: 'Note text', exact: true }).fill('Baguette session only');
  await page.getByRole('dialog').getByRole('button', { name: 'Apply', exact: true }).click();
  await page.getByRole('tab', { name: /Shokupan/ }).click();
  await expect(page.locator('.phone-content')).not.toContainText('Baguette session only');
  await openGlobalDestination(page, 'Recipes', 'en');
  await expect(page.getByRole('tab', { name: 'Running (2)', exact: true })).toBeVisible();
  const baguette = recipeCard(page, 'Baguette');
  await baguette.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Baguette', exact: true })).toBeVisible();
  await expect(page.locator('.phone-content')).toContainText('Baguette session only');
});

test('component allocation refusal explains the engine reason once and keeps the formula', async ({
  page,
}) => {
  await page.goto(
    route({ screen: 'recipe', recipe: 'shokupan', mode: 'edit', section: 'ingredients' }),
  );
  await page.getByRole('button', { name: 'Add component', exact: true }).click();
  await page.getByRole('button', { name: 'Add yudane', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await expect(page.getByRole('alert')).toHaveCount(1);
  await expect(page.getByRole('alert')).toHaveText('Required water exceeds available water.');
  await expect(page.getByRole('button', { name: 'Undo change', exact: true })).toBeDisabled();
});
