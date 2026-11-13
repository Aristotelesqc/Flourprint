import { expect, test } from './fixtures';
import { expectRecipeRevision, routed } from './ui-actions';

for (const en of [false, true]) {
  const suffix = en ? ' @en' : '';
  const labels = en
    ? {
        recipeName: 'Poolish + tangzhong',
        duplicateName: 'Poolish + tangzhong 2',
        menuButton: 'Recipe actions',
        duplicateAction: 'Duplicate recipe',
        summary: 'Dough summary',
        back: 'Back',
        libraryTitle: 'Recipes',
      }
    : {
        recipeName: 'Poolish + tangzhong',
        duplicateName: 'Poolish + tangzhong 2',
        menuButton: 'Actions sur la recette',
        duplicateAction: 'Dupliquer la recette',
        summary: 'Aperçu de la pâte',
        back: 'Retour',
        libraryTitle: 'Recettes',
      };

  test(`duplicate recipe from overflow actions${suffix}`, async ({ page }) => {
    await page.goto('/recipes');
    await expect(routed(page)).toHaveCount(1);
    await routed(page)
      .getByRole('heading', { name: labels.recipeName, level: 2, exact: true })
      .click();
    await expect(routed(page)).toHaveCount(1);
    await expect(
      routed(page)
        .locator('ion-header')
        .getByRole('heading', { level: 1, name: labels.recipeName }),
    ).toBeVisible();

    const originalUrl = page.url();
    await routed(page).getByRole('button', { name: labels.menuButton }).click();
    const menu = page.getByRole('menu');
    await expect(menu).toBeVisible();
    await menu.getByRole('menuitem', { name: labels.duplicateAction }).click();
    await expect(menu).toBeHidden();

    await expect(page).not.toHaveURL(originalUrl);
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await expect(routed(page)).toHaveCount(1);
    await expect(
      routed(page)
        .locator('ion-header')
        .getByRole('heading', { level: 1, name: labels.duplicateName }),
    ).toBeVisible();

    await expectRecipeRevision(page, 1);
    await expect(routed(page).getByRole('group', { name: labels.summary })).toBeVisible();

    while (new URL(page.url()).pathname !== '/recipes') {
      await expect(routed(page)).toHaveCount(1);
      const prevUrl = page.url();
      await routed(page).locator('ion-header').getByRole('button', { name: labels.back }).click();
      await expect(page).not.toHaveURL(prevUrl);
      await expect(routed(page)).toHaveCount(1);
    }

    await expect(
      routed(page).getByRole('heading', { level: 1, name: labels.libraryTitle }),
    ).toBeVisible();
    await expect(
      routed(page).getByRole('heading', { name: labels.recipeName, level: 2, exact: true }),
    ).toHaveCount(1);
    await expect(
      routed(page).getByRole('heading', { name: labels.duplicateName, level: 2, exact: true }),
    ).toHaveCount(1);
  });
}
