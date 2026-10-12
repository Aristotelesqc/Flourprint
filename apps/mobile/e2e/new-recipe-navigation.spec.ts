import { expect, test } from './fixtures';

for (const english of [false, true]) {
  test(`Cancelling the chooser stays on the list; rapid blank creation opens one draft after dismissal${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.goto('/recipes');
    const newRecipe = page
      .getByRole('button', { name: english ? 'New recipe' : 'Nouvelle recette', exact: true })
      .filter({ visible: true });
    const modal = page.locator('ion-modal:not(.overlay-hidden)');
    await newRecipe.click();
    await modal.getByRole('button', { name: english ? 'Cancel' : 'Annuler', exact: true }).click();
    await expect(modal).toHaveCount(0);
    await expect(page).toHaveURL(/\/recipes$/);
    await newRecipe.click();
    await modal
      .getByRole('button', { name: english ? /Blank recipe/ : /Recette vierge/ })
      .evaluate((button) => {
        (button as HTMLElement).click();
        (button as HTMLElement).click();
      });
    await expect(modal).toHaveCount(0);
    await expect(page).toHaveURL(/\/drafts\//);
    const routed = page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
    await expect(routed).toHaveCount(1);
    await expect(
      routed.getByText(english ? 'Recipe 1' : 'Recette 1', { exact: true }),
    ).toBeVisible();
    await routed.locator('ion-back-button').click();
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(
      page.getByText(english ? 'Recipe 1' : 'Recette 1', { exact: true }).filter({ visible: true }),
    ).toHaveCount(1);
    await expect(
      page.getByText(english ? 'Recipe 2' : 'Recette 2', { exact: true }).filter({ visible: true }),
    ).toHaveCount(0);
  });
}
