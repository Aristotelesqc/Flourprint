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
  await expect(page.getByRole('button', { name: /Prête à/ })).toBeHidden();
  await page.getByRole('button', { name: 'Commencer Échaudage' }).click();
  await page.getByRole('button', { name: 'Échaudage terminé' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pétrissage' }).click();
  await page.getByRole('button', { name: 'Pétrissage terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pointage' }).click();
  // The bulk is followed by shaping: the dough is ready to shape, not to bake.
  await page.getByRole('button', { name: 'Prête à façonner' }).click();
  await page.getByText('Test du doigt').click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  // Recorded in the journal; the step is still running.
  await expect(page.locator('p:visible', { hasText: / · / }).first()).toContainText(
    'Prête à façonner (Pointage, Test du doigt)',
  );
  await expect(page.getByRole('button', { name: 'Pointage terminé' })).toBeVisible();
});

test('a note attaches to a step; an ended bake takes a rated review note', async ({ page }) => {
  await openRecipe(page);
  await page.getByRole('button', { name: 'Processus' }).click();
  await page.getByRole('button', { name: 'Démarrer la cuisson' }).click();
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  // Attached to the running step by default; the baker may pick another.
  await expect(page.getByRole('button', { name: 'Préferment', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fermentation', pressed: true })).toBeVisible();
  await page.locator('textarea:visible').fill('Bulles fines');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Préferment : Bulles fines')).toBeVisible();

  await page.getByRole('button', { name: 'Abandonner' }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Abandonner' }).click();
  await page.getByRole('button', { name: 'Ajouter une note' }).click();
  await expect(page.getByRole('button', { name: 'Mie', pressed: true })).toBeVisible();
  await page.getByRole('button', { name: '★★★★', exact: true }).click();
  await page.locator('textarea:visible').fill('Mie serrée');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('★★★★ Mie serrée')).toBeVisible();
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
  await expect(page.getByText('Préferment : Bulles fines')).toBeVisible();

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
  await page.getByText(/Verrouiller à/).click();
  await expect(page.getByText('Eau totale verrouillée').first()).toBeVisible();
  const water = page.getByText('Suit l’eau totale verrouillée');
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
    page.getByText('Entrer la température ambiante pour avoir les temps.').first(),
  ).toBeVisible();
  const room = page.getByLabel('Température ambiante (°C)');
  await room.fill('21');
  await room.press('Enter');
  await expect(page.getByText('modèle provisoire', { exact: true })).toBeVisible();
  // The dough's progress is a share of the planned fermentation, with a provisional target.
  await expect(
    page.getByText(/Aux temps prévus : .* de la fermentation prévue/).first(),
  ).toBeVisible();
  await expect(page.getByText(/La cible « prête à cuire » n’est pas calibrée/)).toBeVisible();
  // The default target is the model's own end point; another one is an explicit choice.
  await expect(
    page.getByRole('button', { name: 'Point final du modèle', pressed: true }),
  ).toBeVisible();
  const progress = page.getByText(/Aux temps prévus : .* de la fermentation prévue/).first();
  const before = await progress.textContent();
  await page.getByRole('button', { name: 'Expérimentale (×2)' }).click();
  await expect(
    page.getByRole('button', { name: 'Expérimentale (×2)', pressed: true }),
  ).toBeVisible();
  await expect(progress).not.toHaveText(before ?? '');
  await expect(page.getByText(/doublé/)).toBeHidden();
  // Applying a suggested dose is an explicit edit of the draft.
  await page.getByRole('button', { name: 'Prendre cette dose' }).last().click();
  await expect(unsaved(page).first()).toBeVisible();
  // Applying a suggested time is an explicit edit too, and the step shows the new time.
  const useTime = page.getByRole('button', { name: 'Prendre ce temps' });
  const offered = await useTime.count();
  expect(offered).toBeGreaterThan(0);
  await useTime.first().click();
  // Applied with its provenance: no longer offered for that step.
  await expect(useTime).toHaveCount(offered - 1);

  await page.getByText('Avancé', { exact: true }).click();
  const target = page.getByLabel('Température de pâte visée (°C)');
  await target.fill('25');
  await target.press('Enter');
  // 4 × 25 − 21 (room) − 21 (flour) − 21 (poolish at room temperature) = 37
  await expect(page.getByText('Eau à 37 °C')).toBeVisible();
  await expect(page.getByText(/friction du pétrin non comptée/)).toBeVisible();
});

test('follows several bakes on one screen, with actions and notes per bake', async ({ page }) => {
  await page.goto('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'recettes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-10-08T18:00:00.000Z',
        recipes: [variant('other', 'Pain test 1', '2026-01-01T12:00:00.000Z')],
        families: [{ id: 'family-test', name: 'Pain test' }],
      }),
    ),
  });
  await expect(page.getByText('1 recette importée.')).toBeVisible();
  const shown = (text: string) => page.getByText(text, { exact: true }).locator('visible=true');
  const back = async () => {
    await page.locator('ion-back-button:visible').last().click();
    await page.waitForTimeout(500);
  };
  await back();
  for (const name of ['Poolish + tangzhong', 'Pain test 1']) {
    await shown(name).first().click();
    await page.getByRole('button', { name: 'Processus' }).click();
    await page.getByRole('button', { name: 'Démarrer la cuisson' }).click();
    await expect(page).toHaveURL(/\/bakes\//);
    await back();
    await back();
  }

  await page.getByText('Suivre les 2 cuissons').click();
  await expect(page).toHaveURL(/\/bakes$/);
  const poolish = page.getByRole('region', { name: 'Poolish + tangzhong' });
  const lean = page.getByRole('region', { name: 'Pain test 1' });
  await expect(poolish).toBeVisible();
  await expect(lean).toBeVisible();

  await lean.getByRole('button', { name: 'Commencer : Pétrissage' }).click();
  await expect(lean.getByRole('button', { name: 'Pétrissage terminé' })).toBeVisible();
  await poolish.getByRole('button', { name: 'Note', exact: true }).click();
  await page.locator('textarea:visible').fill('Cuisine à 23 °C');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await poolish.getByRole('link', { name: 'Ouvrir' }).click();
  await expect(page.getByText('Cuisine à 23 °C')).toBeVisible();
});

test('the advanced menu tells the state of reminders', async ({ page }) => {
  await page.goto('/advanced');
  await expect(page.getByText('Rappels', { exact: true })).toBeVisible();
  // Headless Chromium never grants notifications; the state is still shown.
  await expect(page.getByText(/Les rappels (sont|ne sont)/)).toBeVisible();
});

test('a proof running beside the preheat still takes its ready-to-bake mark', async ({ page }) => {
  await openRecipe(page);
  await page.getByRole('button', { name: 'Processus' }).click();
  await page.getByRole('button', { name: 'Démarrer la cuisson' }).click();
  await expect(page).toHaveURL(/\/bakes\//);
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Commencer Échaudage' }).click();
  await page.getByRole('button', { name: 'Échaudage terminé' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pétrissage' }).click();
  await page.getByRole('button', { name: 'Pétrissage terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pointage' }).click();
  await page.getByRole('button', { name: 'Pointage terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Façonnage' }).click();
  await page.getByRole('button', { name: 'Façonnage terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Apprêt' }).click();
  await page.getByRole('button', { name: 'Commencer Préchauffage' }).click();
  // The preheat ends first and holds the focus; the proof runs beside it.
  await expect(page.getByRole('button', { name: 'Préchauffage terminé' })).toBeVisible();
  await page.getByRole('button', { name: 'Prête à cuire Apprêt' }).click();
  await page.getByText('Toucher', { exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('p:visible', { hasText: / · / }).first()).toContainText(
    'Prête à cuire (Apprêt, Toucher)',
  );
  // Neither step ended.
  await expect(page.getByRole('button', { name: 'Préchauffage terminé' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Terminé Apprêt' })).toBeVisible();
});

test('a template starts a named draft that becomes a recipe once saved', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText('Pizza néo-napolitaine', { exact: true }).click();
  // The style guide comes first: traits and usual ranges, marked as not yet verified.
  const guide = page.getByRole('region', { name: 'À propos de ce style' });
  await expect(guide).toContainText('Fourchettes habituelles');
  await expect(guide).toContainText('pas encore vérifiées');
  await page.getByRole('button', { name: 'Partir de ce modèle' }).click();
  await expect(page).toHaveURL(/\/drafts\//);
  // The draft keeps the guide of its template.
  await expect(page.getByRole('region', { name: 'À propos de ce style' })).toBeVisible();
  await expect(page.getByText('Pizza néo-napolitaine 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Brouillon, pas encore enregistré').first()).toBeVisible();
  // A template passes the check as is.
  await page.getByRole('button', { name: 'Vérifier', exact: true }).click();
  await expect(page.getByText('Rien à signaler')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await page.getByRole('button', { name: 'Enregistrer comme recette' }).click();
  await expect(page).toHaveURL(/\/recipes\/.+/);
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
});

test('a blank recipe takes any edit; the check blocks the save and says why', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText('Recette vierge').first().click();
  await expect(page.getByText('Recette 1', { exact: true })).toBeVisible();
  // Flours that do not add up to 100 %: accepted in a draft, quantities shown as unknown.
  const share = page.getByLabel('Farine à pain, Part');
  await share.fill('80');
  await share.press('Enter');
  await expect(page.getByText(/Les quantités ne peuvent pas encore être calculées/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer comme recette' }).click();
  await expect(page.getByText('À corriger avant d’enregistrer ou de cuire')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  await share.fill('100');
  await share.press('Enter');
  await expect(page.getByRole('button', { name: 'Vérifier', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Supprimer le brouillon' }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Supprimer le brouillon' }).click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(page.getByText('Recette 1', { exact: true })).toBeHidden();
});

test('an info button opens a bottom sheet that explains the term and closes', async ({ page }) => {
  await openRecipe(page);
  await page.getByRole('button', { name: 'Explication : Taille de la recette' }).click();
  const sheet = page.locator('ion-modal:visible');
  await expect(sheet.getByRole('heading', { name: /Taille de la recette/ })).toBeVisible();
  await expect(sheet).toContainText('Chaque gramme de la recette');
  await sheet.getByRole('button', { name: 'En savoir plus' }).click();
  await expect(sheet).toContainText('pertes déclarées');
  await sheet.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.locator('ion-modal:visible')).toHaveCount(0);

  await page.getByRole('button', { name: 'Explication : Eau ajoutée' }).click();
  await expect(page.locator('ion-modal:visible')).toContainText('Eau ajoutée et eau totale');
});
