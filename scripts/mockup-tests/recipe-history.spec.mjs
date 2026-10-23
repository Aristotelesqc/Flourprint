import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

const route = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'baguette', section: 'ingredients', nav: 'A', lang: 'en', theme: 'dark', width: '393', scale: '100', motion: 'reduce', capture: '1', ...extra })}`;
const dialog = (page) => page.locator('dialog:modal:not([data-fp-ghost])');
const saved = (page) => page.locator('[aria-labelledby="heading-saved-history"]');
const references = (page) => page.locator('[aria-labelledby="heading-ref-versions"]');
const tab = (page, name) => page.getByRole('tab', { name, exact: true }).click();
async function saltEdit(page, value) {
  await tab(page, 'Recipe');
  const edit = page.getByRole('button', { name: 'Edit', exact: true });
  if (await edit.isVisible()) await edit.click();
  const input = page.getByTestId('ingredient-grams-salt');
  await input.fill(value);
  await input.press('Enter');
  return input;
}
async function save(page) {
  await page.getByTestId('save-recipe').click();
  await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
}
async function promote(page, version, name) {
  await page.getByTestId(`promote-revision-${version}`).click();
  if (name) await dialog(page).getByRole('textbox').fill(name);
  await dialog(page).getByRole('button', { name: 'Promote', exact: true }).click();
}
async function restore(page, version) {
  await page.getByTestId(`restore-revision-${version}`).click();
  await dialog(page).getByRole('button', { name: 'Restore', exact: true }).click();
}

test.describe('L103 saved history and explicit reference versions', () => {
  test('saves recoverable states without milestones, promotion stays pinned, restore preserves later history', async ({
    page,
  }) => {
    await page.goto(route());
    await saltEdit(page, '17');
    await save(page);
    await tab(page, 'History');
    await expect(saved(page).getByTestId('restore-revision-1')).toBeVisible();
    await expect(references(page)).toContainText('No reference versions');
    await expect(page.getByRole('banner')).not.toContainText(/Version 2|v2/);
    await promote(page, 2, 'Preferred salt');
    await expect(references(page)).toContainText('Version 1');
    await expect(references(page)).toContainText('Preferred salt');
    await expect(saved(page).getByTestId('promote-revision-3')).toHaveCount(0);

    await saltEdit(page, '19');
    await save(page);
    await tab(page, 'History');
    await expect(saved(page).getByTestId('restore-revision-2')).toBeVisible();
    await expect(saved(page).getByTestId('restore-revision-1')).toBeVisible();
    await expect(references(page)).toContainText('Source revision: #2');
    await expect(references(page).getByRole('heading', { level: 3 })).toHaveCount(1);
    await restore(page, 1);
    await expect(saved(page).getByTestId('restore-revision-3')).toBeVisible();
    await expect(saved(page).getByTestId('restore-revision-2')).toBeVisible();
    await expect(references(page)).toContainText('Source revision: #2');
    await tab(page, 'Recipe');
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('12');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await tab(page, 'History');
    await expect(saved(page).getByTestId('promote-revision-5')).toHaveCount(0);
  });

  test('unchanged save and edit-then-undo save do not append a revision', async ({ page }) => {
    await page.goto(route());
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await save(page);
    await tab(page, 'History');
    await expect(saved(page).getByTestId('promote-revision-1')).toBeVisible();
    await expect(saved(page).getByTestId('restore-revision-1')).toHaveCount(0);
    await saltEdit(page, '17');
    await page.getByRole('button', { name: 'Undo change', exact: true }).click();
    await save(page);
    await tab(page, 'History');
    await expect(saved(page).getByTestId('promote-revision-1')).toBeVisible();
    await expect(saved(page).getByTestId('promote-revision-2')).toHaveCount(0);
    await expect(references(page)).toContainText('No reference versions');
  });

  test('restore leaves an open draft intact and its stale Save conflicts without losing input', async ({
    page,
  }) => {
    await page.goto(route());
    await saltEdit(page, '17');
    await save(page);
    await saltEdit(page, '19');
    await tab(page, 'History');
    await promote(page, 2, 'Saved baseline');
    await tab(page, 'Recipe');
    await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('19');
    await tab(page, 'History');
    await restore(page, 1);
    await tab(page, 'Recipe');
    await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('19');
    await page.getByTestId('save-recipe').click();
    await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('19');
    await expect(page.getByTestId('save-recipe')).toBeVisible();
    await tab(page, 'History');
    await expect(page.getByRole('alert').filter({ hasText: /History conflict/ })).toBeVisible();
    await expect(saved(page).getByTestId('promote-revision-4')).toHaveCount(0);
    await expect(references(page)).toContainText('Source revision: #2');
  });

  test('promoting the same saved revision twice refuses without a second reference version', async ({
    page,
  }) => {
    await page.goto(route({ section: 'history' }));
    await promote(page, 1, 'Baseline');
    await promote(page, 1);
    await expect(dialog(page).getByRole('alert')).toContainText('already referenced');
    await page.keyboard.press('Escape');
    await expect(references(page).getByRole('heading', { level: 3 })).toHaveCount(1);
    await expect(saved(page).getByTestId('promote-revision-2')).toHaveCount(0);
  });
});
