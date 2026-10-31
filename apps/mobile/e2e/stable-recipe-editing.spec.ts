import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import {
  expectRecipeRevision,
  enterEditor,
  editorSection,
  menuAction,
  routed,
  showPlanning,
} from './ui-actions';

const rectangle = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected a visible control');
  return box;
};

const enterEditing = enterEditor;

const openRecipe = async (page: Page) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
  await expectRecipeRevision(page, 1);
  await enterEditing(page);
  await expect(content(page)).toHaveCount(1);
};

const content = (page: Page) =>
  page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden) > ion-content');
const scrollTop = (page: Page) =>
  content(page).evaluate(
    async (host) =>
      (
        await (
          host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
        ).getScrollElement()
      ).scrollTop,
  );
const scrollTo = (page: Page, top: number) =>
  content(page).evaluate(async (host, target) => {
    const scroll = await (
      host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
    ).getScrollElement();
    scroll.scrollTop = target;
  }, top);
const settled = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

for (const english of [false, true]) {
  test(`first edit keeps quantity controls and action bar in place at 360px${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme: english ? 'light' : 'dark' });
    await openRecipe(page);
    const doughWeight = page.getByRole('button', {
      name: english ? 'Dough' : 'Pâte',
      exact: true,
    });
    const group = page.getByRole('group', {
      name: english ? 'Final mix' : 'Mélange final',
    });
    const footer = page.locator('ion-footer:visible');
    await settled(page);
    const before = {
      group: await rectangle(group),
      footer: await rectangle(footer),
      content: await rectangle(content(page)),
    };
    await doughWeight.click();
    await expect(footer.getByRole('status')).toHaveText(
      english ? 'Unsaved changes' : 'Modifications non enregistrées',
    );
    await settled(page);
    const after = {
      group: await rectangle(group),
      footer: await rectangle(footer),
      content: await rectangle(content(page)),
    };
    expect(after.group.y).toBeCloseTo(before.group.y, 0);
    expect(after.footer.height).toBeCloseTo(before.footer.height, 0);
    expect(after.content.height).toBeCloseTo(before.content.height, 0);
    for (const button of await footer.getByRole('button').all()) {
      const box = await rectangle(button);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
    }
    const review = routed(page).getByRole('button', {
      name: english ? 'Edit actions' : 'Menu édition',
      exact: true,
    });
    await menuAction(page, /^(Examiner les modifications|Review changes)$/);
    const sheet = page.locator('ion-modal:not(.overlay-hidden)');
    await expect(
      sheet.getByRole('heading', {
        name: english ? 'Draft changes' : 'Modifications du brouillon',
        exact: true,
      }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(review).toBeFocused();
    await expect(
      page.getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true }),
    ).toBeEnabled();
  });
}

test('panels retain independent positions, incomplete fields and planner controls', async ({
  page,
}) => {
  await openRecipe(page);
  const waterFinal = page.getByLabel('Eau, Mélange final (g)', { exact: true });
  await waterFinal.fill('abc');
  await waterFinal.blur();
  await scrollTo(page, 450);
  await expect.poll(() => scrollTop(page)).toBe(450);
  await showPlanning(page);
  await expect.poll(() => scrollTop(page)).toBe(0);
  await page.getByRole('button', { name: 'À une heure', exact: true }).click();
  const time = page.locator('input[type="datetime-local"]:visible');
  await time.fill('2026-11-05T14:00');
  await scrollTo(page, 400);
  await expect.poll(() => scrollTop(page)).toBe(400);
  await page.getByRole('tab', { name: 'Historique', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(0);
  await routed(page).getByRole('tab', { name: 'Recette', exact: true }).click();
  await enterEditor(page);
  await expect.poll(() => scrollTop(page)).toBe(450);
  await expect(waterFinal).toHaveValue('abc');
  await expect(waterFinal).toHaveAttribute('aria-invalid', 'true');
  await showPlanning(page);
  await expect.poll(() => scrollTop(page)).toBe(400);
  await expect(time).toHaveValue('2026-11-05T14:00');
  await routed(page).getByRole('tab', { name: 'Recette', exact: true }).click();
  await enterEditor(page);
  await expect.poll(() => scrollTop(page)).toBe(450);
  // Switch again during restoration frames on the generated/read panels.
  await showPlanning(page);
  await page.evaluate(async () => {
    const header = document.querySelector(
      'ion-router-outlet > .ion-page:not(.ion-page-hidden) ion-header',
    );
    if (!header) throw new Error('Recipe header missing');
    const click = (label: string) => {
      const button = [...header.querySelectorAll('button')].find(
        (button) => button.textContent === label,
      );
      if (!button) throw new Error(`Missing tab: ${label}`);
      button.click();
    };
    click('Planification');
    await new Promise(requestAnimationFrame);
    click('Historique');
    await new Promise(requestAnimationFrame);
    click('Recette');
  });
  await enterEditor(page);
  await expect.poll(() => scrollTop(page)).toBe(450);
  await showPlanning(page);
  await expect.poll(() => scrollTop(page)).toBe(400);
});

test('review distinguishes process-only changes from formula changes', async ({ page }) => {
  await openRecipe(page);
  await editorSection(page, 'steps');
  const duration = page.getByLabel('Durée : Pétrissage', { exact: true });
  await duration.fill('12 min');
  await duration.press('Enter');
  await menuAction(page, /^Examiner les modifications$/);
  const sheet = page.locator('ion-modal:not(.overlay-hidden)');
  await expect(sheet).toContainText('Aucune modification de la formule.');
  await expect(sheet).toContainText('Paramètres du processus modifiés.');
  await expect(sheet).not.toContainText('Aucune modification du processus.');
});

test('review of a new recipe does not claim it matches a saved revision', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText('Recette vierge').first().click();
  await menuAction(page, /^Examiner les modifications$/);
  const sheet = page.locator('ion-modal:not(.overlay-hidden)');
  await expect(sheet).toContainText('Nouvelle recette : aucune version enregistrée à comparer.');
  await expect(sheet).not.toContainText('Aucune modification du processus.');
});

test('invalid edit blocks save, persists across hidden panels, and allows clean recovery and save', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openRecipe(page);
  const footer = page.locator('ion-footer:visible');
  const footerBefore = await rectangle(footer);

  // 1. Valid edit to Salt (stage field: Sel, Mélange final (g), originally 20g -> 22g)
  const salt = page.getByLabel('Sel, Mélange final (g)', { exact: true });
  await salt.fill('22');
  await salt.blur();
  await expect(footer.getByRole('status')).toHaveText('Modifications non enregistrées');

  // 2. Invalid edit to stage Water (originally 200g)
  const waterFinal = page.getByLabel('Eau, Mélange final (g)', { exact: true });
  await waterFinal.fill('abc');
  await waterFinal.blur();
  await expect(waterFinal).toHaveAttribute('aria-invalid', 'true');

  const saveButton = footer.getByRole('button', { name: 'Enregistrer', exact: true });
  await expect(saveButton).toBeDisabled();
  await expect(footer.getByRole('status', { includeHidden: true })).toHaveText(
    'Corriger les champs invalides',
  );

  // Verify unchanged 88px footer geometry
  const footerInvalid = await rectangle(footer);
  expect(footerInvalid.height).toBeCloseTo(footerBefore.height, 0);

  // 3. Hidden panel persistence: switch tabs while invalid field is present
  await showPlanning(page);
  await expect(footer.getByRole('button', { name: 'Démarrer la préparation' })).toBeDisabled();
  await expect(waterFinal).toHaveValue('abc');

  await page.getByRole('tab', { name: 'Historique', exact: true }).click();
  await expect(footer.getByRole('button', { name: 'Démarrer la préparation' })).toBeDisabled();
  await expect(waterFinal).toHaveValue('abc');

  // 4. Return to Recipe: invalid value preserved, no accidental v2
  await routed(page).getByRole('tab', { name: 'Recette', exact: true }).click();
  await enterEditor(page);
  await expect(waterFinal).toHaveValue('abc');
  await expect(waterFinal).toHaveAttribute('aria-invalid', 'true');
  await expect(saveButton).toBeDisabled();
  await expectRecipeRevision(page, 1);

  // 5. Recovery: enter valid stage number (170g brings total water 750g -> 720g)
  await waterFinal.fill('170');
  await waterFinal.blur();
  await expect(waterFinal).not.toHaveAttribute('aria-invalid', 'true');
  await expect(saveButton).toBeEnabled();
  await expect(footer.getByRole('status')).toHaveText('Modifications non enregistrées');

  // 6. Save succeeds and creates Version 2
  await saveButton.click();
  await expectRecipeRevision(page, 2);
  await expect(footer.getByRole('status')).toHaveCount(0);

  // 7. Route return retains valid saved quantities
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('flourprint-preview', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          const saved = await new Promise<unknown>((resolve, reject) => {
            const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          if (typeof saved !== 'string') return false;
          const backup = JSON.parse(saved) as {
            recipes: readonly { revisions: readonly { version: number }[] }[];
          };
          return backup.recipes.some((recipe) =>
            recipe.revisions.some((revision) => revision.version === 2),
          );
        } finally {
          db.close();
        }
      }),
    )
    .toBe(true);
  const savedOrigin = new URL(page.url()).origin;
  await page.goto(`${savedOrigin}/recipes`);
  await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
  await expectRecipeRevision(page, 2);
  await enterEditing(page);
  await expect(page.getByLabel('Sel, Mélange final (g)', { exact: true })).toHaveValue('22');
  await expect(page.getByLabel('Eau, Mélange final (g)', { exact: true })).toHaveValue('170');
});

test('FR fermentation card header does not cause horizontal scroll at 360px and 393px', async ({
  page,
}) => {
  for (const width of [360, 393]) {
    await page.setViewportSize({ width, height: 800 });
    await openRecipe(page);
    await editorSection(page, 'result');
    await settled(page);

    const hasHorizontalOverflow = await content(page).evaluate(async (host) => {
      const scroll = await (
        host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
      ).getScrollElement();
      return scroll.scrollWidth > scroll.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    const basicBtn = page.getByRole('button', { name: 'De base', exact: true });
    const advBtn = page.getByRole('button', { name: 'Avancé', exact: true });
    await expect(basicBtn).toBeVisible();
    await expect(advBtn).toBeVisible();

    const basicBox = await rectangle(basicBtn);
    const advBox = await rectangle(advBtn);
    expect(basicBox.x + basicBox.width).toBeLessThanOrEqual(width);
    expect(advBox.x + advBox.width).toBeLessThanOrEqual(width);
    expect(basicBox.height).toBeGreaterThanOrEqual(36);
    expect(advBox.height).toBeGreaterThanOrEqual(36);
  }
});

test('discard abandons raw invalid text and a later edit can be saved', async ({ page }) => {
  await openRecipe(page);
  const footer = page.locator('ion-footer:visible');
  const waterFinal = page.getByLabel('Eau, Mélange final (g)', { exact: true });
  await waterFinal.fill('abc');
  await waterFinal.blur();
  await expect(footer.getByRole('status', { includeHidden: true })).toHaveText(
    'Corriger les champs invalides',
  );

  const footerCancel = footer.getByRole('button', { name: 'Annuler', exact: true });
  if (await footerCancel.isVisible()) {
    await footerCancel.click();
  } else {
    const footerDiscard = footer.getByRole('button', {
      name: 'Abandonner les modifications',
      exact: true,
    });
    if (await footerDiscard.isVisible()) {
      await footerDiscard.click();
    } else {
      const overflow = page
        .locator('ion-header:visible')
        .getByRole('button', { name: 'Menu édition' });
      if (await overflow.isVisible()) {
        await overflow.click();
        await page
          .getByRole('menu')
          .getByRole('menuitem', { name: 'Abandonner les modifications', exact: true })
          .click();
      } else {
        await page.locator('ion-header:visible ion-button[aria-label="Abandonner"]').click();
      }
    }
  }

  const alert = page.locator('ion-alert');
  if (await alert.isVisible()) {
    await alert
      .getByRole('button', {
        name: /^(Abandonner les modifications|Abandonner|Discard changes|Discard)$/,
      })
      .click();
  }

  await expect(footer.getByRole('status')).toHaveCount(0);
  await enterEditing(page);
  await expect(waterFinal).toHaveValue('200');
  await expect(waterFinal).not.toHaveAttribute('aria-invalid', 'true');
  await expect(footer.getByRole('status')).toHaveText('À jour');

  const saltFinal = page.getByLabel('Sel, Mélange final (g)', { exact: true });
  await saltFinal.fill('22');
  await saltFinal.press('Enter');
  await footer.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expectRecipeRevision(page, 2);
});

test('domain-refused quantity blocks save until the stored value is restored', async ({ page }) => {
  await openRecipe(page);
  await editorSection(page, 'composition');
  const footer = page.locator('ion-footer:visible');
  const salt = page.getByLabel('Sel, Mélange final (g)', { exact: true });
  await salt.fill('22');
  await salt.press('Enter');

  // Change flour share to -1 or invalid value through flour % field, or domain-refuse via flours
  const flourShare = routed(page).getByRole('textbox', {
    name: 'Farine de blé entier, % (%)',
    exact: true,
  });
  await flourShare.fill('-10');
  await flourShare.blur();
  await expect(flourShare).toHaveAttribute('aria-invalid', 'true');

  const save = footer.getByRole('button', { name: 'Enregistrer', exact: true });
  await expect(save).toBeDisabled();

  await flourShare.fill('20');
  await flourShare.blur();
  await expect(save).toBeEnabled();
  await save.click();
  await expectRecipeRevision(page, 2);
  await enterEditing(page);
  await expect(salt).toHaveValue('22');
});

test('removing an invalid ingredient unregisters its save blocker', async ({ page }) => {
  await openRecipe(page);
  const footer = page.locator('ion-footer:visible');

  // Target salt row's Edit button to open ingredient detail bottom-sheet
  const saltRow = page
    .getByLabel('Sel, Mélange final (g)', { exact: true })
    .locator('xpath=ancestor::div[input[@type="checkbox"] or div/input[@type="checkbox"]][1]');
  await saltRow.getByRole('button', { name: 'Modifier l’ingrédient', exact: true }).click();

  const sheet = page.locator('ion-modal:not(.overlay-hidden)').filter({
    has: page.getByRole('heading', {
      name: 'Modifier l’ingrédient sur la recette : Sel',
      exact: true,
    }),
  });
  await expect(sheet).toBeVisible();

  const totalGrams = sheet.getByLabel('Grammes totaux de la recette (g)', { exact: true });
  await totalGrams.fill('abc');
  await totalGrams.blur();
  await expect(footer.getByRole('status', { includeHidden: true })).toHaveText(
    'Corriger les champs invalides',
  );

  const removeBtn = sheet.getByRole('button', { name: 'Supprimer l’ingrédient', exact: true });
  await removeBtn.click();
  await expect(sheet).toBeHidden();

  await expect(page.getByLabel('Sel, Mélange final (g)', { exact: true })).toHaveCount(0);
  const save = footer.getByRole('button', { name: 'Enregistrer', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expectRecipeRevision(page, 2);
});

test('invalid quantity explains disabled save in English @en', async ({ page }) => {
  await openRecipe(page);
  const salt = page.getByLabel('Salt, Final mix (g)', { exact: true });
  await salt.fill('22');
  await salt.press('Enter');
  const waterFinal = page.getByLabel('Water, Final mix (g)', { exact: true });
  await waterFinal.fill('abc');
  await waterFinal.blur();
  const footer = page.locator('ion-footer:visible');
  await expect(footer.getByRole('status')).toHaveText('Correct invalid fields');
  await expect(footer.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
});

test('ordinary Saves retain their label and revisions without promoting reference versions', async ({
  page,
}) => {
  await openRecipe(page);
  const recipeId = new URL(page.url()).pathname.split('/').at(-1);
  const save = routed(page)
    .locator('ion-footer')
    .getByRole('button', { name: 'Enregistrer', exact: true });
  const savedState = () =>
    page.evaluate(
      (id) =>
        new Promise((resolve, reject) => {
          const open = indexedDB.open('flourprint-preview', 1);
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const transaction = db.transaction('snapshots', 'readonly');
            const request = transaction.objectStore('snapshots').get('backup');
            transaction.onabort = () => {
              db.close();
              reject(transaction.error);
            };
            transaction.oncomplete = () => {
              db.close();
              if (typeof request.result !== 'string') {
                resolve(undefined);
                return;
              }
              const snapshot = JSON.parse(request.result) as {
                recipes: readonly {
                  id: string;
                  revisions: readonly { version: number }[];
                  referenceVersions?: readonly unknown[];
                }[];
              };
              const recipe = snapshot.recipes.find((entry) => entry.id === id);
              resolve(
                recipe && {
                  recipes: snapshot.recipes.length,
                  revisions: recipe.revisions
                    .map((revision) => revision.version)
                    .sort((a, b) => a - b),
                  referenceVersions: recipe.referenceVersions?.length ?? 0,
                },
              );
            };
          };
        }),
      recipeId,
    );

  // Poolish water is 300g, Tangzhong water is 250g, Final water is 200g (Total = 750g).
  // Changing Final water from 200g to 170g yields 720g total.
  // Changing Final water from 170g to 180g yields 730g total.
  for (const [stageWaterGrams, version] of [
    ['170', 2],
    ['180', 3],
  ] as const) {
    await expect(save).toHaveAccessibleName('Enregistrer');
    const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
    await water.fill(stageWaterGrams);
    await water.press('Enter');
    await expect(save).toBeEnabled();
    await save.click();
    await expect(
      routed(page).getByRole('button', { name: 'Démarrer la préparation', exact: true }),
    ).toBeVisible();
    await expect.poll(savedState, { timeout: 10_000 }).toEqual({
      recipes: 1,
      revisions: version === 2 ? [1, 2] : [1, 2, 3],
      referenceVersions: 0,
    });
    await enterEditor(page);
    await expect(water).toHaveValue(stageWaterGrams);
    await expect(save).toHaveAccessibleName('Enregistrer');
    await expect(save).toBeDisabled();
  }
});
