import { expect, test } from './fixtures';
import { editorSection, enterEditor, menuAction, routed } from './ui-actions';
import type { Page } from '@playwright/test';

const open = async (page: Page) => {
  await page.setViewportSize({ width: 360, height: 851 });
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/poolish-tangzhong$/);
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  await expect(routed(page)).toHaveCount(1);
};

test('whole-percent hydration presentation never becomes a rounded recipe edit', async ({
  page,
}) => {
  await open(page);
  await expect(routed(page).getByText('≈ 75 %', { exact: true })).toBeVisible();
  await enterEditor(page);
  const hydration = routed(page).getByLabel('Hydratation (%)', { exact: true });
  await expect(hydration).toHaveValue('75');
  await hydration.focus();
  await hydration.blur();
  await expect(routed(page).locator('ion-footer').getByRole('status')).toHaveText('À jour');
  await expect(routed(page).getByLabel('Eau (g)', { exact: true })).toHaveValue('750');
  // Lock the actual resolved value, including 0.2 g of water from the yeast estimate.
  await routed(page)
    .getByRole('button', { name: /Verrouiller l’hydratation à/ })
    .click();
  await menuAction(page, /^Examiner les modifications$/);
  await expect(page.locator('ion-modal:not(.overlay-hidden)')).toContainText(
    'Hydratation verrouillée à 75,02 %',
  );
});

test('component ratio commits through the domain; refusal retains text and blocks save', async ({
  page,
}) => {
  await open(page);
  await enterEditor(page);
  await editorSection(page, 'components');
  const ratio = routed(page).getByLabel('tangzhong, Ratio farine:liquide', { exact: true });
  await expect(ratio).toHaveValue('5');
  await ratio.fill('6');
  await ratio.press('Enter');
  await expect(routed(page).getByLabel('tangzhong, Hydratation (%)')).toHaveValue('600');
  await ratio.fill('0');
  await ratio.press('Enter');
  await expect(ratio).toHaveValue('0');
  await expect(ratio).toHaveAttribute('aria-invalid', 'true');
  await expect(routed(page).getByLabel('tangzhong, Hydratation (%)')).toHaveValue('600');
  await expect(routed(page).getByRole('button', { name: 'Enregistrer v2' })).toBeDisabled();
});

test('editor sections preserve one raw field and a page-wide invalid state', async ({ page }) => {
  await open(page);
  await enterEditor(page);
  const water = routed(page).getByLabel('Eau (g)', { exact: true });
  await expect(water).toHaveCount(1);
  await water.fill('abc');
  await editorSection(page, 'components');
  await expect(water).toBeHidden();
  await expect(water).toHaveValue('abc');
  await expect(routed(page).getByRole('button', { name: 'Enregistrer v2' })).toBeDisabled();
  await editorSection(page, 'composition');
  await expect(water).toBeVisible();
  await expect(water).toHaveValue('abc');
  await expect(water).toHaveAttribute('aria-invalid', 'true');
});
