import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';
import { enterEditor, editorSection, menuAction, routed, showPlanning } from './ui-actions';

const enterEditing = enterEditor;

const openRecipe = async (page: Page) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  await enterEditing(page);
};

/**
 * One step back in the app, returning once the navigation and the Ionic page transition are over:
 * the URL changed and a single page of the outlet is left shown (the leaving one is hidden when
 * its transition ends). Clicking again earlier would hit the leaving page's back button.
 */
const goBack = async (page: Page) => {
  await expect(routed(page)).toHaveCount(1);
  const before = page.url();
  const read = routed(page).getByRole('button', { name: /^(Lire la recette|Read recipe)$/ });
  if (await read.isVisible()) {
    await read.click();
    const keep = page
      .locator('ion-alert')
      .getByRole('button', { name: /^(Conserver le brouillon et quitter|Keep draft and leave)$/ });
    await expect
      .poll(
        async () => (await keep.isVisible()) || !(await read.isVisible()) || page.url() !== before,
      )
      .toBe(true);
    if (await keep.isVisible()) await keep.click();
    await expect(read).toBeHidden();
    if (page.url() !== before) return;
    await expect(
      routed(page).getByRole('button', { name: /^(Recette|Recipe)$/, exact: true }),
    ).toBeVisible();
  }
  await routed(page).locator('ion-back-button').click();
  await expect(page).not.toHaveURL(before);
  await expect(page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)')).toHaveCount(1);
};

const unsaved = (page: Page) => page.getByText('Modifications non enregistrées');

/** The start button of the open recipe (in footer or header). */
const headerStart = (page: Page) =>
  page
    .locator('ion-footer:visible, ion-header:visible')
    .getByRole('button', {
      name: /Démarrer/,
    })
    .first();

/** Starts a bake now from the recipe header or footer, through its confirmation, and opens it. */
const startBake = async (page: Page) => {
  const read = routed(page).getByRole('button', { name: 'Lire la recette', exact: true });
  if (await read.isVisible()) await read.click();
  await headerStart(page).click();
  const alert = page.locator('ion-alert');
  await expect(alert).toContainText('Démarrer la préparation maintenant ?');
  await alert.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page).toHaveURL(/\/bakes\//);
  await expect(routed(page)).toHaveCount(1);
};

test('typed decimals commit, and leaving an untouched field changes nothing', async ({ page }) => {
  await openRecipe(page);
  const saltGrams = page.getByLabel('Sel (g)', { exact: true });
  await saltGrams.fill('22,22222');
  await saltGrams.press('Enter');
  await expect(page.getByLabel('Sel, % boulanger (%)')).toHaveValue('2,22');
  await page.getByRole('button', { name: 'Enregistrer v2' }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await expect(unsaved(page)).toBeHidden();

  await expect(
    page.locator('ion-footer:visible').getByRole('button', { name: 'Démarrer la préparation' }),
  ).toBeVisible();
  await enterEditing(page);
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
  // A double tap opens one confirmation; a double tap on it starts one bake.
  await routed(page).getByRole('button', { name: 'Lire la recette', exact: true }).click();
  await headerStart(page).dblclick();
  await expect(page.locator('ion-alert')).toHaveCount(1);
  await page.locator('ion-alert').getByRole('button', { name: 'Démarrer' }).dblclick();
  await expect(page).toHaveURL(/\/bakes\//);
  await expect(routed(page)).toHaveCount(1);

  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await expect(page.getByRole('button', { name: 'Préferment terminé' })).toBeVisible();
  // The scald runs while the preferment ferments: start it from its own row.
  await page.getByRole('button', { name: 'Commencer Échaudage' }).click();
  await expect(page.getByText('Aussi en cours')).toBeVisible();
  await page.getByRole('button', { name: 'Échaudage terminé' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  await expect(page.getByRole('button', { name: 'Commencer : Pétrissage' })).toBeVisible();
  // Latest log entries first: the scald started and ended while the preferment ran.
  const log = page.getByTestId('preparation-journal').locator('p', { hasText: / · / });
  await expect(log.nth(0)).toContainText('Préferment terminé');
  await expect(log.nth(1)).toContainText('Échaudage terminé');
  await expect(log.nth(2)).toContainText('Échaudage commencé');

  await page.locator('ion-back-button:visible').click();
  await page.getByRole('button', { name: 'Historique' }).click();
  // One bake despite the double tap (the header's "En cours" button is not a history item).
  await expect(page.locator('ion-item:visible')).toHaveCount(1);
  await expect(page.locator('ion-item:visible')).toContainText('En cours');
  await showPlanning(page);
  await expect(
    routed(page).getByRole('button', { name: 'Reprendre la préparation' }),
  ).toBeVisible();
});

test('dough ready is recorded on a running fermentation step without ending it', async ({
  page,
}) => {
  await openRecipe(page);
  await startBake(page);

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
  await startBake(page);
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  // Attached to the running step by default; the baker may pick another.
  await expect(page.getByRole('button', { name: 'Préferment', pressed: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fermentation', pressed: true })).toBeVisible();
  await page.locator('textarea:visible').fill('Bulles fines');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Préferment : Bulles fines')).toBeVisible();

  await menuAction(page, /^Abandonner/);
  await page.locator('ion-alert').getByRole('button', { name: 'Abandonner' }).click();
  await page.getByRole('button', { name: 'Ajouter une note' }).click();
  await expect(page.getByRole('button', { name: 'Mie', pressed: true })).toBeVisible();
  await page.getByRole('button', { name: '★★★★', exact: true }).click();
  await page.locator('textarea:visible').fill('Mie serrée');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('★★★★ Mie serrée')).toBeVisible();

  // An ended bake can be reopened; its earlier end stays in the log (bake-session.md).
  await menuAction(page, /^Rouvrir$/);
  await page.locator('ion-alert').getByRole('button', { name: 'Rouvrir' }).click();
  await routed(page)
    .locator('ion-header')
    .getByRole('button', { name: 'Actions de préparation' })
    .click();
  await expect(
    page.locator('ion-action-sheet').getByRole('button', { name: /^Abandonner/ }),
  ).toBeVisible();
  await page
    .locator('ion-action-sheet')
    .getByRole('button', { name: 'Annuler', exact: true })
    .click();
  await expect(page.getByText('★★★★ Mie serrée')).toBeVisible();
});

test('finishes in one tap with the intended outcome, then corrects it', async ({ page }) => {
  await openRecipe(page);
  await startBake(page);
  // Run every step through the main action until the bake can be finished.
  const main = routed(page).locator('ion-footer ion-button');
  const allDone = page.getByText('Toutes les étapes sont terminées.');
  for (let i = 0; i < 40 && !(await allDone.isVisible()); i++) {
    if (await main.count()) {
      const before = await main.first().textContent();
      await main.first().click();
      await expect
        .poll(async () => !(await main.count()) || (await main.first().textContent()) !== before)
        .toBe(true);
    } else
      await page
        .getByRole('button', { name: /^Commencer / })
        .first()
        .click();
  }
  await expect(allDone).toBeVisible();
  // The recipe bakes: one tap records it as cooked; the choice beside offers another result.
  await expect(page.getByRole('button', { name: 'Autre résultat' })).toBeVisible();
  await page.getByRole('button', { name: 'Terminer · Cuit' }).click();
  await expect(page.getByTestId('bake-outcome')).toHaveText('Résultat : Cuit');

  // Two short lists: the result, then what became of the raw dough.
  await menuAction(page, /^Modifier le résultat$/);
  await page.locator('ion-alert').getByText('Cuit et pâte crue', { exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('ion-alert')).toContainText('Devenir de la pâte crue');
  await page.locator('ion-alert').getByText('congelée', { exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByTestId('bake-outcome')).toHaveText(
    'Résultat : Cuit et pâte crue, congelée',
  );
  // Another result starts from "not said": saving at once records it.
  await menuAction(page, /^Modifier le résultat$/);
  await page.locator('ion-alert').getByText('Pâte crue', { exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('ion-alert')).toContainText('Devenir de la pâte crue');
  await page.locator('ion-alert').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByTestId('bake-outcome')).toHaveText('Résultat : Pâte crue');
});

test('finishes as frozen dough before its planned bake, keeping the steps as recorded', async ({
  page,
}) => {
  await openRecipe(page);
  await startBake(page);
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  // The bake is not reached: finishing now asks for the result, completes no step.
  await menuAction(page, /^Terminer maintenant/);
  await page.locator('ion-alert').getByText('Pâte crue', { exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Enregistrer' }).click();
  await page.locator('ion-alert').getByText('congelée', { exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByTestId('bake-outcome')).toHaveText('Résultat : Pâte crue, congelée');
  await expect(page.getByText(/Préferment terminé/).first()).toBeVisible();
  await expect(page.getByText(/Cuisson terminé/)).toHaveCount(0);
});

test('a recipe states how it ends', async ({ page }) => {
  await openRecipe(page);
  await editorSection(page, 'result');
  const ends = page.getByLabel('Fin prévue');
  await expect(ends.locator('option:checked')).toHaveText('Automatique : Cuit');
  await ends.selectOption({ label: 'Pâte crue, congelée' });
  await expect(ends.locator('option').filter({ hasText: 'Automatique : Cuit' })).toHaveCount(1);
  await expect(unsaved(page).first()).toBeVisible();
  // Every accepted combination has its option, including a mixed result given away.
  await ends.selectOption({ label: 'Cuit et pâte crue, donnée' });
  await expect(ends.locator('option:checked')).toHaveText('Cuit et pâte crue, donnée');
});

test('copies all data for review, with the bake digest and its notes', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await openRecipe(page);
  await startBake(page);
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Note', exact: true }).click();
  await page.locator('textarea:visible').fill('Bulles fines');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Préferment : Bulles fines')).toBeVisible();

  // In-app navigation: the browser build keeps its data in memory only.
  const advanced = page.getByLabel('Avancé').first();
  while (!(await advanced.isVisible())) {
    await goBack(page);
  }
  await advanced.click();
  await page.getByText('Copier toutes mes données').click();
  await expect(page.getByRole('status')).toContainText('1 fournée');
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
  await enterEditing(page);
  await expect(page.getByLabel('Water (g)', { exact: true })).toHaveValue('750');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('pulling the recipe list down checks for a newer dev build', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  // A non-release build (this one is local): the same check as in Advanced.
  const box = await page.getByRole('heading', { name: 'Recettes' }).boundingBox();
  if (!box) throw new Error('no heading');
  await page.mouse.move(box.x + 20, box.y + 5);
  await page.mouse.down();
  for (let y = 10; y <= 260; y += 25) await page.mouse.move(box.x + 20, box.y + y);
  await page.mouse.up();
  await expect(page.getByText(/est déjà la dernière version/)).toBeVisible();
});

/** Pulls the recipe list down, as a finger would. */
const pullRecipes = async (page: Page) => {
  const box = await page
    .getByRole('heading', { name: 'Recettes' })
    .locator('visible=true')
    .boundingBox();
  if (!box) throw new Error('no heading');
  await page.mouse.move(box.x + 20, box.y + 5);
  await page.mouse.down();
  for (let y = 10; y <= 260; y += 25) await page.mouse.move(box.x + 20, box.y + y);
  await page.mouse.up();
};

test('a newer dev build loads only after the browser data is saved', async ({ page }) => {
  // A deployment newer than this build; then the same build once reloaded.
  let newer = true;
  await page.route('**/build.json*', (route) =>
    route.fulfill({
      json: newer
        ? { build: '0.2.0-dev.999+newer', label: 'v0.2.0-newer-build', channel: 'dev' }
        : { build: '0.2.0-local', label: 'v0.2.0-local', channel: 'local' },
    }),
  );
  await page.goto('/recipes');
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText('Recette vierge').first().click();
  await expect(page.getByText('Recette 1', { exact: true })).toBeVisible();
  // At once back to the list, in the app (a navigation would reload the page), and pull: no
  // wait for the periodic snapshot.
  await goBack(page);
  await expect(page.getByRole('heading', { name: 'Recettes' }).locator('visible=true')).toHaveCount(
    1,
  );
  const reloaded = page.waitForEvent('load');
  // The gesture itself is covered above; here the refresher of the shown list fires directly.
  await page.evaluate(() => {
    const refresher = document.querySelector(
      'ion-router-outlet > .ion-page:not(.ion-page-hidden) ion-refresher',
    );
    refresher?.dispatchEvent(new CustomEvent('ionRefresh', { detail: { complete: () => {} } }));
  });
  await reloaded;
  newer = false;
  await expect(page.getByText('Recette 1').first()).toBeVisible();
});

test('an unreachable site reloads nothing', async ({ page }) => {
  await page.route('**/build.json*', (route) => route.abort());
  await page.goto('/recipes');
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  await pullRecipes(page);
  await expect(page.getByText(/Site injoignable/)).toBeVisible();
});

test('opens on the recipes; diagnostics sit behind the advanced menu', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Recettes' })).toBeVisible();
  // ADR 0016: the app bar names the running build (`v0.2.0-local` in this test build).
  await expect(page.getByTestId('app-build-label').first()).toHaveText(/^v\d+\.\d+\.\d+(-|$)/);
  await expect(page.getByText('Vérifications de l’appareil')).toBeHidden();
  await page.getByLabel('Avancé').first().click();
  // A non-release build offers to load the latest deployment; this one is already it.
  await page.getByText('Charger la dernière version dev').click();
  await expect(page.getByText(/est déjà la dernière version/)).toBeVisible();
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
  await startBake(page);
  const back = page.locator('ion-back-button:visible');
  await expect(back).toHaveCount(1);
  await back.click();
  await expect(page).toHaveURL(/\/recipes\/newer$/);
  await expect(back).toHaveCount(1);
  await back.click();
  await expect(
    routed(page).getByRole('link', { name: /Préparation en cours.*Pain test 2.*Reprendre/ }),
  ).toHaveCount(1);
});

test('a locked hydration holds while eggs are added; preparations are editable', async ({
  page,
}) => {
  await openRecipe(page);
  // 75 % water, no other water source but the yeast's estimate: lock it at its current value.
  await page.getByRole('button', { name: /Verrouiller l’hydratation à/ }).click();
  await expect(
    page.getByRole('button', { name: 'Déverrouiller l’hydratation', pressed: true }),
  ).toBeVisible();
  const water = page.getByText('Suit l’hydratation verrouillée');
  await expect(water).toBeVisible();

  await page.getByRole('button', { name: '+ Ajouter un ingrédient' }).click();
  await page.getByLabel('+ Ajouter un ingrédient').selectOption({ label: 'Œuf' });
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const egg = page.getByLabel('Œuf (g)', { exact: true });
  await egg.fill('100');
  await egg.press('Enter');
  // 100 g of egg at 76 % water: the added water drops by 76 g, total water stays.
  await menuAction(page, /^Examiner les modifications$/);
  await expect(page.getByText('Œuf ajouté')).toBeVisible();
  await expect(page.getByText(/Eau, % boulanger : 75 % → 67,4 %/)).toBeVisible();
  const review = page.locator('ion-modal:not(.overlay-hidden)');
  await review.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(review).toBeHidden();

  // The tangzhong's hydration is editable; 1:1 makes it a yudane.
  await editorSection(page, 'components');
  await page.getByLabel('tangzhong, Hydratation (%)').fill('100');
  await page.getByLabel('tangzhong, Hydratation (%)').press('Enter');
  await expect(page.getByText('yudane').first()).toBeVisible();

  // A preparation is removed by a compact button that still names it.
  await page.getByRole('button', { name: 'Retirer : yudane' }).click();
  await expect(page.getByRole('button', { name: 'Retirer : yudane' })).toHaveCount(0);
});

test('typing a hydration locks it there; an egg then lowers the added water', async ({ page }) => {
  await openRecipe(page);
  await expect(page.getByText('Poids', { exact: true }).first()).toBeVisible();
  // The flour's registry entry is summarized under its name.
  await expect(page.getByText('Protéines ≈ 13,5 %').first()).toBeVisible();

  const hydration = page.getByLabel('Hydratation (%)', { exact: true });
  await hydration.fill('70');
  await hydration.press('Enter');
  await expect(
    page.getByRole('button', { name: 'Déverrouiller l’hydratation', pressed: true }),
  ).toBeVisible();
  await expect(hydration).toHaveValue('70');
  await menuAction(page, /^Examiner les modifications$/);
  await expect(page.getByText('Hydratation verrouillée à 70 %')).toBeVisible();
  const review = page.locator('ion-modal:not(.overlay-hidden)');
  await review.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(review).toBeHidden();
  // Only the shown page: during a transition Ionic keeps the previous one in the DOM.
  const added = routed(page).locator('[data-ingredient-id="water"]');
  await expect(added).toHaveCount(1);
  const before = await added.textContent();

  await page.getByRole('button', { name: '+ Ajouter un ingrédient' }).click();
  await page.getByLabel('+ Ajouter un ingrédient').selectOption({ label: 'Œuf' });
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  const egg = page.getByLabel('Œuf (g)', { exact: true });
  await egg.fill('100');
  await egg.press('Enter');
  await menuAction(page, /^Examiner les modifications$/);
  await expect(review.getByText('Œuf ajouté')).toBeVisible();
  await review.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(review).toBeHidden();
  // The hydration stays at 70 %; the added water gives up the egg's water.
  await expect(hydration).toHaveValue('70');
  await expect(added).not.toHaveText(before ?? '');

  // The lock icon unlocks: every quantity keeps its value.
  await page.getByRole('button', { name: 'Déverrouiller l’hydratation' }).click();
  await expect(page.getByRole('button', { name: /Verrouiller l’hydratation à/ })).toBeVisible();
  await expect(page.getByText('Suit l’hydratation verrouillée')).toHaveCount(0);
});

test('fermentation: room temperature gives times, a yeast dose and, in advanced mode, the water', async ({
  page,
}) => {
  await openRecipe(page);
  await editorSection(page, 'result');
  await expect(
    page.getByText('Entrer la température ambiante pour avoir les temps.').first(),
  ).toBeVisible();
  const room = page.getByLabel('Température ambiante (°C)');
  await room.fill('21');
  await room.press('Enter');
  await expect(page.getByText('provisoire', { exact: true }).first()).toBeVisible();
  // One readable result line: whole percentages of the target, never "100,03 %".
  const progress = page.getByText(/^Le plan atteint \d+ % de la cible$/).first();
  await expect(progress).toBeVisible();
  // The target and the ranges sit behind "Details", in plain sentences.
  await page.getByRole('button', { name: 'Détails' }).first().click();
  await expect(page.getByText(/le plan atteint entre .* de la cible/).first()).toBeVisible();
  const readiness = page.getByLabel('Cible « prête à cuire »', { exact: true });
  await expect(readiness).toHaveValue('flourprint.model-end-point');
  const before = await progress.textContent();
  await readiness.selectOption({ label: 'Expérimentale (×2)' });
  await expect(progress).not.toHaveText(before ?? '');
  await expect(page.getByText(/doublé/)).toBeHidden();
  // Applying a suggested dose is an explicit edit of the draft.
  await page
    .getByRole('button', { name: /^Utiliser .* de / })
    .first()
    .click();
  await expect(unsaved(page).first()).toBeVisible();
  // Applying a suggested time is an explicit edit too.
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

const startTemplate = async (page: Page, name: string) => {
  await page.goto('/recipes');
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText(name, { exact: true }).click();
  await page.getByRole('button', { name: 'Partir de ce modèle' }).click();
  await expect(page).toHaveURL(/\/drafts\//);
};

test('a fermentation schedule replaces the dough steps; Auto fills a step from the model', async ({
  page,
}) => {
  await startTemplate(page, 'Pain boule en cocotte');
  await editorSection(page, 'result');
  await page
    .getByLabel('Horaire', { exact: true })
    .selectOption({ label: 'Pointage lent au froid' });
  await page.getByRole('button', { name: 'Appliquer', exact: true }).click();
  // The cold step is in the fridge at 4 °C.
  await expect(page.getByLabel('Retard au froid, température (°C)')).toHaveValue('4');
  await expect(page.getByText('frigo', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Retard au froid, durée')).toHaveValue('18 h');
  // The schedule's last step follows the model: its time is filled by it.
  const auto = page.getByRole('button', { name: 'Apprêt : durée selon le modèle' });
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByLabel('Apprêt, durée')).toBeVisible();
  await auto.click();
  await expect(auto).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Apprêt, durée')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: /^Apprêt : environ \d.* selon le modèle, détails$/ }),
  ).toHaveText(/≈ \d/);
  // Only one step follows the model: Auto on the bulk puts the proof back to manual.
  await page.getByRole('button', { name: 'Pointage : durée selon le modèle' }).click();
  await expect(auto).toHaveAttribute('aria-pressed', 'false');
});

test('the boil of bagels ends the dough: it is not a fermentation step', async ({ page }) => {
  await startTemplate(page, 'Bagels');
  await editorSection(page, 'result');
  await expect(page.getByRole('button', { name: 'Retirer Façonnage' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Retirer Ébullition' })).toHaveCount(0);
  await expect(page.getByLabel('Ébullition, durée')).toHaveCount(0);
});

test('starts a bake whose recipe file references a built-in vessel', async ({ page }) => {
  const base = variant('skillet', 'Pizza poêle', '2026-01-01T12:00:00.000Z');
  const bake = {
    id: 'bake',
    operation: 'bake',
    dependsOn: ['mix'],
    schedule: 'asap',
    plannedDurationS: 600,
    equipment: {
      appliance: 'oven',
      mode: 'bottom',
      setpointC: 230,
      vessel: { item: { id: 'cast-iron-skillet', version: 1 }, cover: 'open' },
    },
  };
  const recipe = {
    ...base,
    revisions: base.revisions.map((r) => ({
      ...r,
      process: { steps: [...r.process.steps, bake] },
    })),
  };
  await page.goto('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'recettes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-10-08T18:00:00.000Z',
        recipes: [recipe],
        families: [{ id: 'family-test', name: 'Pain test' }],
      }),
    ),
  });
  await expect(page.getByText('1 recette importée.')).toBeVisible();
  await page.locator('ion-back-button:visible').click();
  await page.getByText('Pizza poêle', { exact: true }).locator('visible=true').click();
  await startBake(page);
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
    await goBack(page);
  };
  await back();
  for (const name of ['Poolish + tangzhong', 'Pain test 1']) {
    await shown(name).first().click();
    await startBake(page);
    await back();
    await back();
  }

  await page.getByText('Suivre les 2 fournées').click();
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
  await editorSection(page, 'result');
  await editorSection(page, 'result');
  await startBake(page);
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
  // The selected source and its editorial decisions remain visible before starting a draft.
  const guide = page.getByRole('region', { name: 'À propos de ce style' });
  await expect(guide).toContainText('Valeurs de référence de la recette retenue');
  await expect(guide).toContainText('sans constituer un consensus ni une prédiction');
  await guide.getByText('Source et choix éditoriaux (anglais)', { exact: true }).click();
  await expect(guide).toContainText('Baking Steel');
  await page.getByRole('button', { name: 'Partir de ce modèle' }).click();
  await expect(page).toHaveURL(/\/drafts\//);
  // The draft keeps the guide of its template. Only the routed page: the template picker, an
  // overlay outside the router outlet that holds the same guide, can still be closing over it.
  await expect(
    page
      .locator('ion-router-outlet .ion-page:not(.ion-page-hidden)')
      .getByRole('region', { name: 'À propos de ce style' }),
  ).toBeVisible();
  await expect(page.getByText('Pizza néo-napolitaine 1', { exact: true })).toBeVisible();
  await expect(page.getByText('Brouillon, pas encore enregistré').first()).toBeVisible();
  // A template passes the check as is.
  await menuAction(page, /^Vérifier la recette(?: \(\d+\))?$/);
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
  await expect(page.locator('ion-modal:not(.overlay-hidden)')).toHaveCount(0);
  // Flours that do not add up to 100 %: accepted in a draft, quantities shown as unknown.
  const share = page.getByLabel('Farine à pain, Part');
  await share.fill('80');
  await share.press('Enter');
  await expect(page.getByText(/Les quantités ne peuvent pas encore être calculées/)).toBeVisible();
  await page.getByRole('button', { name: 'Enregistrer comme recette' }).click();
  await expect(page.getByText('À corriger avant d’enregistrer ou de démarrer')).toBeVisible();
  await page.getByRole('button', { name: 'Fermer' }).click();
  // Ionic gives the focus back to the save button once the sheet is gone: wait for it, or the
  // Enter below can land on that button and save the recipe.
  await expect(page.getByText('À corriger avant d’enregistrer ou de démarrer')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Enregistrer comme recette' })).toBeFocused();
  await share.fill('100');
  await share.press('Enter');
  await routed(page).getByRole('button', { name: 'Menu édition', exact: true }).click();
  await expect(
    page.locator('ion-action-sheet').getByRole('button', { name: /^Vérifier la recette/ }),
  ).toBeVisible();
  await page
    .locator('ion-action-sheet')
    .getByRole('button', { name: 'Annuler', exact: true })
    .click();
  await expect(page.locator('ion-action-sheet')).toHaveCount(0);
  await menuAction(page, /^Abandonner les modifications$/);
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

  await page.getByRole('button', { name: 'Explication : Hydratation', exact: true }).click();
  await expect(page.locator('ion-modal:visible')).toContainText('Hydratation et eau ajoutée');
});

test('the planner can follow now; starting always starts now', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-03-02T08:00:00-05:00') });
  await openRecipe(page);
  await showPlanning(page);
  // "Now" is the default: no time to pick, the plan starts at the current time.
  await expect(page.getByRole('button', { name: 'Maintenant' })).toBeVisible();
  await expect(page.locator('input[type="datetime-local"]')).toBeHidden();
  await page.getByRole('button', { name: 'À une heure' }).click();
  await page.locator('input[type="datetime-local"]').fill('2026-03-05T14:00');
  await expect(page.getByText(/La préparation démarre au moment du toucher/)).toBeVisible();
  await startBake(page);
  // The timers run from the tap (08:00), not from the planned 14:00 three days later.
  await expect(page.getByText(/Début prévu 0?8[:h]00/).first()).toBeVisible();
});

test('a customized flour keeps its properties and is offered by the flour picker', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/recipes');
  await page.getByLabel('Farines', { exact: true }).first().click();
  await expect(page).toHaveURL(/\/flours$/);
  await expect(page.getByText('Aucune farine personnelle pour l’instant.')).toBeVisible();

  // A built-in flour is read-only: customizing it gives a personal copy to fill in.
  await page.locator('ion-item:visible', { hasText: 'Farine à pain' }).first().click();
  const sheet = page.locator('ion-modal:visible');
  await expect(sheet.getByText(/Une farine de base décrit une catégorie/)).toBeVisible();
  await expect(sheet.getByText(/plus riche en protéines que la tout usage/)).toBeVisible();
  await expect(sheet.getByText('≈ 13,5 % ± 1 %')).toBeVisible();
  await sheet.getByRole('button', { name: 'Personnaliser' }).click();
  await expect(sheet.getByLabel('Nom', { exact: true })).toHaveValue('Farine à pain');
  // The typical protein is copied; typing the bag's value replaces it.
  await expect(sheet.getByLabel('Protéines (%) : valeur')).toHaveValue('13,5');
  await sheet.getByLabel('Protéines (%) : valeur').fill('13,2');
  await sheet.getByLabel('Protéines (%) : base').selectOption({ label: 'Tel que vendu' });
  await sheet
    .getByLabel('Protéines (%) : source', { exact: true })
    .selectOption({ label: 'Étiquette de l’emballage' });
  await sheet.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.locator('ion-modal:visible')).toHaveCount(0);
  const mine = page.locator('ion-item:visible', { hasText: '1 propriété connue' });
  await expect(mine).toContainText('Farine à pain');
  await expect(mine).toContainText('Version 1');

  // In a recipe, the picker offers it among the personal flours.
  await page.locator('ion-back-button:visible').click();
  await page.getByText('Poolish + tangzhong').first().click();
  await enterEditing(page);
  await page.getByRole('button', { name: '+ Ajouter une farine' }).click();
  const picker = page.locator('select:visible').filter({ has: page.locator('optgroup') });
  const personal = picker.locator('optgroup[label="Farines personnelles"] option');
  await expect(personal).toHaveText(['Farine à pain']);
  await picker.selectOption((await personal.getAttribute('value')) ?? '');
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByLabel('Farine à pain, Part')).toHaveCount(2);

  // The entry, with its source and basis, is in the data copied for review.
  const advanced = page.getByLabel('Avancé').first();
  while (!(await advanced.isVisible())) {
    await goBack(page);
  }
  await advanced.click();
  await page.getByText('Copier toutes mes données').click();
  await expect(page.getByRole('status')).toBeVisible();
  const copied = JSON.parse(await page.evaluate(() => navigator.clipboard.readText())) as {
    backup: { flours: { version: number; basedOn: unknown; properties: unknown }[] };
  };
  expect(copied.backup.flours).toEqual([
    expect.objectContaining({
      version: 1,
      basedOn: { id: 'bread-flour', version: 2 },
      properties: expect.objectContaining({
        proteinPct: {
          status: 'known',
          value: 13.2,
          unit: 'pct',
          basis: 'asIs',
          source: { kind: 'package' },
        },
        ashPct: { status: 'unknown' },
      }),
    }),
  ]);
});

/** Sets 3 folds 20 min apart on the bulk, from the authored Method in the Recipe tab. */
const foldTheBulk = async (page: Page) => {
  await editorSection(page, 'steps');
  await page.getByRole('button', { name: 'Modifier l’étape Pointage' }).click();
  const sheet = page.locator('ion-modal:visible');
  await sheet.getByLabel('Nombre de séries').fill('3');
  await sheet.getByLabel('Nombre de séries').press('Enter');
  await sheet.getByLabel('Intervalle entre les séries').fill('20 min');
  await sheet.getByLabel('Intervalle entre les séries').press('Enter');
  await sheet.getByRole('button', { name: 'Fermer' }).click();
  await expect(page.locator('ion-modal:visible')).toHaveCount(0);
};

test('a draft takes a new step and a step technique, shown under the step', async ({ page }) => {
  await openRecipe(page);
  await editorSection(page, 'steps');
  await page
    .getByTestId('recipe-method')
    .filter({ visible: true })
    .getByRole('button', { name: '+ Ajouter une étape' })
    .click();
  await page.getByLabel('Après', { exact: true }).selectOption({ label: 'Pointage' });
  await page.getByLabel('Nouvelle étape', { exact: true }).selectOption({ label: 'Dégazage' });
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Modifier l’étape Dégazage' })).toBeVisible();
  await expect(unsaved(page).first()).toBeVisible();
  // The new step sits between the bulk and the shaping.
  await expect(page.getByText('Après Dégazage').filter({ visible: true })).toHaveCount(0);
  const authoredOrder = await routed(page)
    .getByTestId('recipe-method')
    .getByRole('button', { name: /^Modifier l’étape / })
    .allTextContents();
  expect(authoredOrder.findIndex((name) => name.includes('Dégazage'))).toBeLessThan(
    authoredOrder.findIndex((name) => name.includes('Façonnage')),
  );

  await foldTheBulk(page);
  await expect(
    page.getByText('3 séries de rabats / 20 min').filter({ visible: true }),
  ).toBeVisible();
});

test('bake mode shows the next fold set and records it in the log', async ({ page }) => {
  await openRecipe(page);
  await foldTheBulk(page);
  await page.getByRole('button', { name: 'Enregistrer v2' }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await startBake(page);
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  await page.getByRole('button', { name: 'Commencer Échaudage' }).click();
  await page.getByRole('button', { name: 'Échaudage terminé' }).click();
  await page.getByRole('button', { name: 'Préferment terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pétrissage' }).click();
  await page.getByRole('button', { name: 'Pétrissage terminé' }).click();
  await page.getByRole('button', { name: 'Commencer : Pointage' }).click();

  const folds = page.getByRole('region', { name: 'Rabats : Pointage' });
  await expect(folds).toContainText('Série 1/3 · dans 20 min');
  await folds.getByRole('button', { name: 'Rabat fait' }).click();
  await expect(page.locator('p:visible', { hasText: / · / }).first()).toContainText(
    'Rabats 1/3 faits (Pointage)',
  );
  await expect(folds).toContainText('Série 2/3');
  // The step keeps running: a set never ends it.
  await expect(page.getByRole('button', { name: 'Pointage terminé' })).toBeVisible();
});

test('the browser preview keeps its data across a reload, until it is erased', async ({ page }) => {
  await page.goto('/recipes');
  await expect(page.getByText(/gardées dans ce navigateur/)).toBeVisible();
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText('Recette vierge').first().click();
  await expect(page.getByText('Recette 1', { exact: true })).toBeVisible();
  // The snapshot is saved every few seconds and when the page is hidden: wait for the saved
  // snapshot itself to hold the new recipe, not for a delay.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<boolean>((resolve) => {
              const open = indexedDB.open('flourprint-preview', 1);
              open.onerror = () => resolve(false);
              open.onsuccess = () => {
                const db = open.result;
                // The store may not exist yet: that is a "not yet", never a hang.
                try {
                  const read = db.transaction('snapshots').objectStore('snapshots').get('backup');
                  read.onerror = () => {
                    db.close();
                    resolve(false);
                  };
                  read.onsuccess = () => {
                    db.close();
                    resolve(typeof read.result === 'string' && read.result.includes('Recette 1'));
                  };
                } catch {
                  db.close();
                  resolve(false);
                }
              };
            }),
        ),
      { timeout: 15_000 },
    )
    .toBe(true);
  await page.reload();
  await page.goto('/recipes');
  await expect(page.getByText('Recette 1').first()).toBeVisible();

  await page.goto('/advanced');
  await page.getByText('Effacer les données du navigateur').click();
  // Erasing reloads the page: wait for that reload before navigating, or the two collide.
  await Promise.all([
    page.waitForEvent('load'),
    page
      .locator('ion-alert')
      .getByRole('button', { name: 'Effacer les données du navigateur' })
      .click(),
  ]);
  await page.goto('/recipes');
  // Nothing is seeded: erasing leaves an empty list, not the reference recipe.
  await expect(page.getByText('Aucune recette', { exact: false }).first()).toBeVisible();
  await expect(page.getByText('Poolish + tangzhong')).toHaveCount(0);
  await expect(page.getByText('Recette 1')).toHaveCount(0);

  // Development builds can load the sample again, for trying the app or reviewing it.
  await page.goto('/advanced');
  await page.getByText('Charger les recettes d’exemple').click();
  await expect(page.getByText('1 recette importée.')).toBeVisible();
  await page.getByText('Charger les recettes d’exemple').click();
  await expect(page.getByText('Aucune nouvelle recette, 1 déjà présente.')).toBeVisible();
  // In-app navigation: a reload could come before the snapshot is saved.
  await goBack(page);
  await expect(page.getByText('Poolish + tangzhong').locator('visible=true')).toHaveCount(1);
});

/** Back to the recipe list in the app (the browser build keeps its data in memory). */
const backToRecipes = async (page: Page) => {
  while (new URL(page.url()).pathname !== '/recipes') {
    await goBack(page);
  }
  await expect(page.getByRole('heading', { name: 'Recettes' }).locator('visible=true')).toHaveCount(
    1,
  );
};

/** Opens the sample recipe from the recipe list shown. */
const openShownRecipe = async (page: Page) => {
  await routed(page)
    .locator('ion-router-link[router-link^="/recipes/"]')
    .filter({ has: page.locator('.m3-card') })
    .filter({ hasText: 'Poolish + tangzhong' })
    .click();
  await expect(routed(page)).toHaveCount(1);
};

const openAdvanced = async (page: Page) => {
  await backToRecipes(page);
  await page.getByLabel('Avancé').locator('visible=true').first().click();
  await expect(page).toHaveURL(/\/advanced$/);
};

const setSimulation = async (page: Page, on: boolean) => {
  const toggle = page.getByRole('switch', { name: /Mode simulation/ });
  if ((await toggle.getAttribute('aria-checked')) !== String(on)) await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', String(on));
};

test('a simulated bake keeps to its own world, on a clock that can be advanced', async ({
  page,
}) => {
  // The longest journey (about 20 s on a fast machine): it crosses eleven page transitions, so
  // a slow runner needs more than the default budget. Every assertion keeps its own timeout.
  test.slow();
  await page.goto('/advanced');
  await setSimulation(page, true);
  await expect(page.getByText(/Mode simulation · heure simulée/)).toBeVisible();
  await backToRecipes(page);
  await openShownRecipe(page);
  const read = routed(page).getByRole('button', { name: 'Lire la recette', exact: true });
  if (await read.isVisible()) await read.click();
  await headerStart(page).click();
  await expect(page.locator('ion-alert')).toContainText('historique de simulation');
  await page.locator('ion-alert').getByRole('button', { name: 'Démarrer' }).click();
  await expect(page).toHaveURL(/\/bakes\//);
  await expect(routed(page)).toHaveCount(1);

  // The preferment runs 12 h; the scald starts as late as it can, 11 h from now.
  await page.getByRole('button', { name: 'Commencer : Préferment' }).click();
  const advance = page.getByRole('region', { name: 'Avancer le temps' });
  await expect(advance).toContainText('Échaudage');
  await advance.getByRole('button', { name: 'Au prochain moment prévu' }).click();
  await expect(page.getByText('À faire aussi maintenant')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commencer Échaudage' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Préferment' })).toHaveAttribute(
    'aria-valuetext',
    '1 h restantes',
  );

  // Real mode: the simulated bake is gone from the bakes and the history.
  await openAdvanced(page);
  await setSimulation(page, false);
  await expect(page.getByText(/Mode simulation · heure simulée/)).toHaveCount(0);
  await backToRecipes(page);
  await page.getByLabel('Préparations en cours').locator('visible=true').first().click();
  await expect(page.getByText(/Aucune préparation en cours/)).toBeVisible();
  await backToRecipes(page);
  await openShownRecipe(page);
  await page.getByRole('button', { name: 'Historique' }).click();
  await expect(page.getByText(/Aucune préparation pour l’instant/)).toBeVisible();

  // Simulation again: it is back.
  await openAdvanced(page);
  await setSimulation(page, true);
  await backToRecipes(page);
  await page.getByLabel('Préparations en cours').locator('visible=true').first().click();
  await expect(page.getByRole('region', { name: 'Poolish + tangzhong' })).toBeVisible();

  // Its statistics, then erasing the simulation history.
  await openAdvanced(page);
  await page.locator('ion-item[router-link="/stats"]:visible').click();
  await expect(page.getByText('Fournées simulées')).toBeVisible();
  await expect(page.getByRole('region', { name: 'Dernières fournées' })).toContainText(
    'Poolish + tangzhong',
  );
  await goBack(page);
  await expect(page).toHaveURL(/\/advanced$/);
  await page.getByText('Effacer l’historique de simulation').locator('visible=true').click();
  await expect(page.locator('ion-alert')).toContainText('1 fournée sera effacée');
  await page.locator('ion-alert').getByRole('button', { name: 'Effacer' }).click();
  await expect(page.getByText('1 fournée effacée.')).toBeVisible();
  await backToRecipes(page);
  await page.getByLabel('Préparations en cours').locator('visible=true').first().click();
  await expect(page.getByText(/Aucune préparation en cours/)).toBeVisible();
});

test('temperatures follow the unit chosen for their context', async ({ page }) => {
  await openRecipe(page);
  await editorSection(page, 'result');
  const room = page.getByLabel('Température ambiante (°C)');
  await room.fill('21');
  await room.press('Enter');
  await expect(unsaved(page).first()).toBeVisible();

  await openAdvanced(page);
  await page.getByRole('group', { name: 'Ambiante' }).getByRole('button', { name: '°F' }).click();
  await backToRecipes(page);
  await openShownRecipe(page);
  await enterEditor(page);
  await editorSection(page, 'result');
  const fahrenheit = page.getByLabel('Température ambiante (°F)');
  await expect(fahrenheit).toHaveValue('70');
  await fahrenheit.fill('75');
  await fahrenheit.press('Enter');

  // Stored in °C: 75 °F is 23.9 °C.
  await openAdvanced(page);
  await page.getByRole('group', { name: 'Ambiante' }).getByRole('button', { name: '°C' }).click();
  await backToRecipes(page);
  await openShownRecipe(page);
  await enterEditor(page);
  await editorSection(page, 'result');
  await expect(page.getByLabel('Température ambiante (°C)')).toHaveValue('23,9');
});
