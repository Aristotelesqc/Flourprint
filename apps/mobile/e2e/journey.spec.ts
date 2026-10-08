import { expect, test, type Page } from '@playwright/test';

const openRecipe = async (page: Page) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
};

const unsaved = (page: Page) => page.getByText('Modifications non enregistrées');

test('typed decimals commit, and leaving an untouched field changes nothing', async ({ page }) => {
  await openRecipe(page);
  const saltGrams = page.getByLabel('Sel (g)', { exact: true });
  await saltGrams.fill('22,22222');
  await saltGrams.press('Enter');
  await expect(page.getByLabel('Sel, % boulanger (%)')).toHaveValue('2,22');
  await page.getByRole('button', { name: 'Enregistrer v2' }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await expect(unsaved(page)).toBeHidden();

  // The percentage shows 2,22 for 2,222222: visiting it must not round the recipe.
  const saltPct = page.getByLabel('Sel, % boulanger (%)');
  await saltPct.focus();
  await saltPct.blur();
  await page.getByLabel('Eau (g)', { exact: true }).focus();
  await page.getByLabel('Eau (g)', { exact: true }).blur();
  await expect(unsaved(page)).toBeHidden();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
});

test('an invalid entry stays visible and marked', async ({ page }) => {
  await openRecipe(page);
  const water = page.getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  await expect(water).toHaveAttribute('aria-invalid', 'true');
  await expect(water).toHaveValue('abc');
  await expect(unsaved(page)).toBeHidden();
});

test('a double tap starts one bake; parallel steps run with real overlap', async ({ page }) => {
  await openRecipe(page);
  await page.getByRole('button', { name: 'Processus' }).click();
  await page.getByRole('button', { name: 'Démarrer la cuisson' }).dblclick();
  await expect(page).toHaveURL(/\/bakes\//);

  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await expect(page.getByRole('button', { name: 'Préferment terminé' })).toBeVisible();
  // The scald runs while the preferment ferments: start it from its own row.
  await page.getByRole('button', { name: 'Commencer Échaudage' }).click();
  await expect(page.getByText('Aussi en cours')).toBeVisible();
  await page.getByRole('button', { name: 'Échaudage terminé' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  await expect(page.getByRole('button', { name: 'Commencer : Pétrissage' })).toBeVisible();
  // Latest log entries first: the scald started and ended while the preferment ran.
  const log = page.locator('p:visible', { hasText: / · / });
  await expect(log.nth(0)).toContainText('Préferment terminé');
  await expect(log.nth(1)).toContainText('Échaudage terminé');
  await expect(log.nth(2)).toContainText('Échaudage commencé');

  await page.locator('ion-back-button:visible').click();
  await page.getByRole('button', { name: 'Historique' }).click();
  // One bake despite the double tap (the header's "En cours" button is not a history item).
  await expect(page.locator('ion-item:visible')).toHaveCount(1);
  await expect(page.locator('ion-item:visible')).toContainText('En cours');
  await page.getByRole('button', { name: 'Processus' }).click();
  await expect(page.getByRole('button', { name: 'Voir la cuisson en cours' })).toBeVisible();
});

test('captures the main screens in light and dark', async ({ page }, testInfo) => {
  for (const colorScheme of ['light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme });
    await openRecipe(page);
    await testInfo.attach(`formula-${colorScheme}`, {
      body: await page.screenshot({ fullPage: true }),
      contentType: 'image/png',
    });
  }
});

test('speaks English on an English device @en', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible();
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByLabel('Water (g)', { exact: true })).toHaveValue('750');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});
