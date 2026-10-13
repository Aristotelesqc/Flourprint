import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { menuAction, routed } from './ui-actions';

/** One step back in the app, once the navigation and the Ionic page transition are over. */
const goBack = async (page: Page) => {
  const before = page.url();
  await page.locator('ion-back-button:visible').last().click();
  await expect(page).not.toHaveURL(before);
  await expect(page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)')).toHaveCount(1);
};

/** The browser build keeps its data in memory between reloads only: navigate inside the app. */
const backToRecipes = async (page: Page, title: string) => {
  while (new URL(page.url()).pathname !== '/recipes') await goBack(page);
  await expect(page.getByRole('heading', { name: title }).locator('visible=true')).toHaveCount(1);
};

const recipeCard = (page: Page, name: string) =>
  routed(page).locator('ion-router-link[router-link^="/recipes/"]').filter({ hasText: name });

const second = (name: string) => ({
  kind: 'flourprint-recipes',
  schemaVersion: 1,
  exportedAt: '2026-10-08T18:00:00.000Z',
  families: [],
  recipes: [
    {
      id: 'second',
      name,
      revisions: [
        {
          recipeId: 'second',
          version: 1,
          createdAt: '2026-10-08T12:00:00.000Z',
          formula: {
            flours: [{ id: 'flour', sharePct: 100 }],
            ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
            components: [],
            anchor: { kind: 'flourTotal', grams: 500 },
          },
          process: {
            steps: [{ id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap' }],
          },
        },
      ],
    },
  ],
});

test('the trash: put a recipe aside, restore it, delete it for good, empty the trash', async ({
  page,
}) => {
  test.slow();
  await page.goto('/recipes');

  // A bake of the sample recipe, started before anything goes to the trash.
  await recipeCard(page, 'Poolish + tangzhong').click();
  await page
    .locator('ion-footer:visible, ion-header:visible')
    .getByRole('button', { name: /Démarrer/ })
    .first()
    .click();
  await page.locator('ion-alert').getByRole('button', { name: 'Démarrer' }).click();
  await expect(page).toHaveURL(/\/bakes\//);
  await backToRecipes(page, 'Recettes');

  // Trash it from the recipe page, after a confirmation that can be cancelled.
  await recipeCard(page, 'Poolish + tangzhong').click();
  const clickTrash = async () => {
    await menuAction(page, /^Mettre à la corbeille$/);
  };
  await clickTrash();
  const alert = page.locator('ion-alert');
  await expect(alert).toContainText('Ses versions et ses fournées sont conservées');
  await alert.getByRole('button', { name: 'Annuler' }).click();
  await expect(alert).toHaveCount(0);
  await expect(page).toHaveURL(/\/recipes\/.+/);
  await clickTrash();
  await alert.getByRole('button', { name: 'Mettre à la corbeille' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText(/Aucune recette pour l’instant/)).toBeVisible();
  await expect(recipeCard(page, 'Poolish + tangzhong')).toHaveCount(0);
  // Trashing the recipe leaves its current preparation visible and usable.
  await expect(
    routed(page)
      .locator('ion-router-link[router-link^="/bakes/"]')
      .filter({ hasText: 'Poolish + tangzhong' }),
  ).toHaveCount(1);

  // It sits in the trash (Advanced), with the time it went there.
  await page.getByLabel('Avancé').locator('visible=true').first().click();
  await page.locator('ion-item:visible', { hasText: 'Corbeille' }).click();
  await expect(page).toHaveURL(/\/trash$/);
  const entry = page.getByRole('region', { name: 'Poolish + tangzhong' });
  await expect(entry).toContainText('version 1');

  // Restore: back in the list, trash empty.
  await entry.getByRole('button', { name: 'Restaurer' }).click();
  await expect(page.getByText('La corbeille est vide.')).toBeVisible();
  await backToRecipes(page, 'Recettes');
  await expect(recipeCard(page, 'Poolish + tangzhong')).toBeVisible();

  // Trash it again, then delete it for good, after a confirmation.
  await recipeCard(page, 'Poolish + tangzhong').click();
  await clickTrash();
  await alert.getByRole('button', { name: 'Mettre à la corbeille' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await page.getByLabel('Avancé').locator('visible=true').first().click();
  await page.locator('ion-item:visible', { hasText: 'Corbeille' }).click();
  await page
    .getByRole('region', { name: 'Poolish + tangzhong' })
    .getByRole('button', { name: 'Supprimer définitivement' })
    .click();
  await expect(alert).toContainText('seront supprimées pour de bon');
  await alert.getByRole('button', { name: 'Annuler' }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Poolish + tangzhong' })).toBeVisible();
  await page
    .getByRole('region', { name: 'Poolish + tangzhong' })
    .getByRole('button', { name: 'Supprimer définitivement' })
    .click();
  await alert.getByRole('button', { name: 'Supprimer définitivement' }).click();
  await expect(page.getByText('La corbeille est vide.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vider la corbeille' })).toHaveCount(0);

  // The bake of the deleted recipe is still there, under a "deleted recipe" label.
  await backToRecipes(page, 'Recettes');
  await page.getByLabel('Préparations en cours').locator('visible=true').first().click();
  const bake = page.getByRole('region', { name: 'Recette supprimée' });
  await expect(bake).toBeVisible();
  await bake.getByText('Ouvrir', { exact: true }).click();
  await expect(page).toHaveURL(/\/bakes\/.+/);
  await expect(
    routed(page).getByRole('heading', { name: 'Recette supprimée', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Commencer : Préferment' }).locator('visible=true'),
  ).toHaveCount(1);

  // Two recipes in the trash, emptied at once, after a confirmation.
  await backToRecipes(page, 'Recettes');
  await page.getByLabel('Avancé').locator('visible=true').first().click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'recettes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(second('Pain du jour'))),
  });
  await expect(page.getByText('1 recette importée.')).toBeVisible();
  await backToRecipes(page, 'Recettes');
  await recipeCard(page, 'Pain du jour').click();
  await clickTrash();
  await alert.getByRole('button', { name: 'Mettre à la corbeille' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await page.getByLabel('Avancé').locator('visible=true').first().click();
  await page.locator('ion-item:visible', { hasText: 'Corbeille' }).click();
  await expect(page.getByRole('region', { name: 'Pain du jour' })).toBeVisible();
  await page.getByRole('button', { name: 'Vider la corbeille' }).click();
  await expect(alert).toContainText('1 recette');
  await alert.getByRole('button', { name: 'Annuler' }).click();
  await expect(alert).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Pain du jour' })).toBeVisible();
  await page.getByRole('button', { name: 'Vider la corbeille' }).click();
  await alert.getByRole('button', { name: 'Vider la corbeille' }).click();
  await expect(page.getByText('La corbeille est vide.')).toBeVisible();
  await backToRecipes(page, 'Recettes');
  await expect(page.getByText(/Aucune recette pour l’instant/)).toBeVisible();
});

test('the trash, in English @en', async ({ page }) => {
  await page.goto('/recipes');
  await recipeCard(page, 'Poolish + tangzhong').click();
  await menuAction(page, /^Move to trash$/);
  await page.locator('ion-alert').getByRole('button', { name: 'Move to trash' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText(/No recipe yet/)).toBeVisible();
  await page.getByLabel('Advanced').locator('visible=true').first().click();
  await page.locator('ion-item:visible', { hasText: 'Trash' }).click();
  await page
    .getByRole('region', { name: 'Poolish + tangzhong' })
    .getByRole('button', { name: 'Restore' })
    .click();
  await expect(page.getByText('The trash is empty.')).toBeVisible();
  await backToRecipes(page, 'Recipes');
  await expect(recipeCard(page, 'Poolish + tangzhong')).toBeVisible();
});
