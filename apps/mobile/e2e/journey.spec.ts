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

test('opens on the recipes; diagnostics sit behind the advanced menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  await expect(page.getByText('Vérifications de l’appareil')).toBeHidden();
  await page.getByLabel('Avancé').first().click();
  await page.getByText('Vérifications de l’appareil').click();
  await expect(page).toHaveURL(/\/device-checks$/);
});

const variant = (id: string, name: string, createdAt: string) => ({
  id,
  name,
  familyId: 'family-test',
  revisions: [
    {
      recipeId: id,
      version: 1,
      createdAt,
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
});

test('imports a recipes file additively; a family shows one variant, the starred one', async ({
  page,
}) => {
  const file = {
    name: 'recettes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-10-08T18:00:00.000Z',
        recipes: [
          variant('older', 'Pain test 1', '2026-01-01T12:00:00.000Z'),
          variant('newer', 'Pain test 2', '2026-02-01T12:00:00.000Z'),
        ],
        families: [{ id: 'family-test', name: 'Pain test' }],
      }),
    ),
  };
  await page.goto('/advanced');
  const picker = page.locator('input[type=file]');
  await picker.setInputFiles(file);
  await expect(page.getByText('2 recettes importées.')).toBeVisible();
  await picker.setInputFiles(file);
  await expect(page.getByText('Aucune nouvelle recette, 2 déjà présentes.')).toBeVisible();

  // Ionic keeps hidden pages in the stack: only visible text counts.
  const shown = (text: string) => page.getByText(text, { exact: true }).locator('visible=true');
  await page.locator('ion-back-button:visible').click();
  await expect(shown('Pain test 2')).toHaveCount(1);
  await expect(shown('Pain test 1')).toHaveCount(0);
  await expect(shown('2 variantes')).toHaveCount(1);

  await shown('Pain test 2').click();
  await page.getByRole('listitem').filter({ hasText: 'Pain test 1' }).click();
  await expect(page.getByText('Variantes de Pain test')).toBeVisible();
  await page.getByRole('button', { name: 'Afficher cette variante par défaut' }).click();
  await expect(
    page.getByRole('button', { name: 'Afficher la plus récente par défaut' }),
  ).toBeVisible();
  await page.locator('ion-back-button:visible').click();
  await expect(shown('Pain test 1')).toHaveCount(1);
  await expect(shown('Pain test 2')).toHaveCount(0);

  // A running bake of a variant not shown by default keeps its name on the recipe list.
  await shown('Pain test 1').click();
  await page.getByRole('listitem').filter({ hasText: 'Pain test 2' }).click();
  await expect(shown('Pain test 2').first()).toBeVisible();
  await page.getByRole('button', { name: 'Processus' }).click();
  await page.getByRole('button', { name: 'Démarrer la cuisson' }).click();
  await expect(page).toHaveURL(/\/bakes\//);
  const back = page.locator('ion-back-button:visible');
  await expect(back).toHaveCount(1);
  await back.click();
  await expect(page).toHaveURL(/\/recipes\/newer$/);
  await expect(back).toHaveCount(1);
  await back.click();
  await expect(shown('Cuisson en cours · Pain test 2')).toHaveCount(1);
});

test('a locked total water holds while eggs are added; preparations are editable', async ({
  page,
}) => {
  await openRecipe(page);
  // 75 % water, no other water source but the yeast's estimate: lock it.
  await page.getByText(/Barrer à/).click();
  await expect(page.getByText('Eau totale barrée').first()).toBeVisible();
  const water = page.getByText('Suit l’eau totale barrée');
  await expect(water).toBeVisible();

  await page.getByRole('button', { name: '+ Ajouter un ingrédient' }).click();
  await page.getByLabel('+ Ajouter un ingrédient').selectOption({ label: 'Œuf' });
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const egg = page.getByLabel('Œuf (g)', { exact: true });
  await egg.fill('100');
  await egg.press('Enter');
  // 100 g of egg at 76 % water: the added water drops by 76 g, total water stays.
  await expect(page.getByText('Œuf ajouté')).toBeVisible();
  await expect(page.getByText(/Eau, % boulanger : 75 % → 67,4 %/)).toBeVisible();

  // The tangzhong's hydration is editable; 1:1 makes it a yudane.
  await page.getByLabel('tangzhong, Hydratation (%)').fill('100');
  await page.getByLabel('tangzhong, Hydratation (%)').press('Enter');
  await expect(page.getByText('yudane').first()).toBeVisible();
});
