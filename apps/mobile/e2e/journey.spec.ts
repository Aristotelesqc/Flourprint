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

test('dough ready is recorded on a running fermentation step without ending it', async ({
  page,
}) => {
  await openRecipe(page);
  await page.getByRole('button', { name: 'Processus' }).click();
  await page.getByRole('button', { name: 'Démarrer la cuisson' }).click();
  await expect(page).toHaveURL(/\/bakes\//);

  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  // Not a dough step: no dough ready mark on the preferment.
  await expect(page.getByRole('button', { name: 'Pâte prête' })).toBeHidden();
  await page.getByRole('button', { name: 'Commencer Échaudage' }).click();
  await page.getByRole('button', { name: 'Échaudage terminé' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pétrissage' }).click();
  await page.getByRole('button', { name: 'Pétrissage terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pointage' }).click();
  await page.getByRole('button', { name: 'Pâte prête' }).click();
  await page.getByText('Test du doigt').click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // Recorded in the journal; the step is still running.
  await expect(page.locator('p:visible', { hasText: / · / }).first()).toContainText(
    'Pâte prête (Pointage, Test du doigt)',
  );
  await expect(page.getByRole('button', { name: 'Pointage terminé' })).toBeVisible();
});

test('copies all data for review, with the bake digest and its notes', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openRecipe(page);
  await page.getByRole('button', { name: 'Processus' }).click();
  await page.getByRole('button', { name: 'Démarrer la cuisson' }).click();
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await page.locator('textarea:visible').fill('Bulles fines');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Bulles fines')).toBeVisible();

  // In-app navigation: the browser build keeps its data in memory only.
  const advanced = page.getByLabel('Avancé').first();
  while (!(await advanced.isVisible())) {
    await page.locator('ion-back-button:visible').last().click();
    await page.waitForTimeout(500);
  }
  await advanced.click();
  await page.getByText('Copier toutes mes données').click();
  await expect(page.getByRole('status')).toContainText('1 cuisson');
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as {
    kind: string;
    device: { platform: string; timeZone: string };
    bakes: { status: string; observations: { stepId?: string; text?: string }[] }[];
  };
  expect(copied.kind).toBe('flourprint-feedback');
  expect(copied.device).toMatchObject({ platform: 'web', timeZone: 'America/Toronto' });
  expect(copied.bakes[0]?.status).toBe('active');
  expect(copied.bakes[0]?.observations).toEqual([
    expect.objectContaining({ stepId: 'poolish', text: 'Bulles fines' }),
  ]);
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

test('fermentation: room temperature gives times, a yeast dose and, in advanced mode, the water', async ({
  page,
}) => {
  await openRecipe(page);
  await expect(
    page.getByText('Entre la température ambiante pour avoir les temps.').first(),
  ).toBeVisible();
  const room = page.getByLabel('Température ambiante (°C)');
  await room.fill('21');
  await room.press('Enter');
  await expect(page.getByText('modèle provisoire', { exact: true })).toBeVisible();
  // The dough's progress is a share of the planned fermentation, with a provisional target.
  await expect(
    page.getByText(/Aux temps prévus : .* de la fermentation prévue/).first(),
  ).toBeVisible();
  await expect(page.getByText(/La cible « prête à cuire » est provisoire/)).toBeVisible();
  await expect(page.getByText(/doublé/)).toBeHidden();
  // Applying a suggested dose is an explicit edit of the draft.
  await page.getByRole('button', { name: 'Prendre cette dose' }).last().click();
  await expect(unsaved(page).first()).toBeVisible();
  // Applying a suggested time is an explicit edit too, and the step shows the new time.
  const useTime = page.getByRole('button', { name: 'Prendre ce temps' }).first();
  if (await useTime.isVisible()) await useTime.click();

  await page.getByText('Avancé', { exact: true }).click();
  const target = page.getByLabel('Température de pâte visée (°C)');
  await target.fill('25');
  await target.press('Enter');
  // 4 × 25 − 21 (room) − 21 (flour) − 21 (poolish at room temperature) = 37
  await expect(page.getByText('Eau à 37 °C')).toBeVisible();
  await expect(page.getByText(/friction du pétrin non comptée/)).toBeVisible();
});
