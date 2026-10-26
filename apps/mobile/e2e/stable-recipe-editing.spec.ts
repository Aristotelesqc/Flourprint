import { expect, test } from './fixtures';
import type { Locator, Page } from '@playwright/test';
import { enterEditor, editorSection, menuAction, routed, showPlanning } from './ui-actions';

const rectangle = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected a visible control');
  return box;
};

const enterEditing = enterEditor;

const openRecipe = async (page: Page) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
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
    const dough = page.getByRole('button', { name: english ? 'Dough' : 'Pâte', exact: true });
    const group = page.getByRole('group').filter({ has: dough });
    const footer = page.locator('ion-footer:visible');
    await settled(page);
    const before = {
      group: await rectangle(group),
      footer: await rectangle(footer),
      content: await rectangle(content(page)),
    };
    await dough.click();
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
      page.getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true }),
    ).toBeEnabled();
  });
}

test('panels retain independent positions, incomplete fields and planner controls', async ({
  page,
}) => {
  await openRecipe(page);
  const water = page.getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  await scrollTo(page, 450);
  await expect.poll(() => scrollTop(page)).toBe(450);
  await showPlanning(page);
  await expect.poll(() => scrollTop(page)).toBe(0);
  await page.getByRole('button', { name: 'À une heure', exact: true }).click();
  const time = page.locator('input[type="datetime-local"]:visible');
  await time.fill('2026-11-05T14:00');
  await scrollTo(page, 400);
  await expect.poll(() => scrollTop(page)).toBe(400);
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(0);
  await routed(page).getByRole('button', { name: 'Recette', exact: true }).click();
  await enterEditor(page);
  await expect.poll(() => scrollTop(page)).toBe(450);
  await expect(water).toHaveValue('abc');
  await expect(water).toHaveAttribute('aria-invalid', 'true');
  await showPlanning(page);
  await expect.poll(() => scrollTop(page)).toBe(400);
  await expect(time).toHaveValue('2026-11-05T14:00');
  await routed(page).getByRole('button', { name: 'Recette', exact: true }).click();
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

  // 1. Valid edit to Salt
  const salt = page.getByLabel('Sel (g)', { exact: true });
  await salt.fill('22');
  await salt.blur();
  await expect(footer.getByRole('status')).toHaveText('Modifications non enregistrées');

  // 2. Invalid edit to Water
  const water = page.getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  await expect(water).toHaveAttribute('aria-invalid', 'true');

  const saveButton = footer.getByRole('button', { name: 'Enregistrer v2', exact: true });
  await expect(saveButton).toBeDisabled();
  await expect(footer.getByRole('status')).toHaveText('Corriger les champs invalides');

  // Verify unchanged 88px footer geometry
  const footerInvalid = await rectangle(footer);
  expect(footerInvalid.height).toBeCloseTo(footerBefore.height, 0);

  // 3. Hidden panel persistence: switch tabs while invalid field is present
  await showPlanning(page);
  await expect(footer.getByRole('button', { name: 'Démarrer la préparation' })).toBeDisabled();
  await expect(water).toHaveValue('abc');

  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await expect(footer.getByRole('button', { name: 'Démarrer la préparation' })).toBeDisabled();
  await expect(water).toHaveValue('abc');

  // 4. Return to Recipe: invalid value preserved, no accidental v2
  await routed(page).getByRole('button', { name: 'Recette', exact: true }).click();
  await enterEditor(page);
  await expect(water).toHaveValue('abc');
  await expect(water).toHaveAttribute('aria-invalid', 'true');
  await expect(saveButton).toBeDisabled();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();

  // 5. Recovery: enter valid number
  await water.fill('720');
  await expect(water).not.toHaveAttribute('aria-invalid', 'true');
  await expect(saveButton).toBeEnabled();
  await expect(footer.getByRole('status')).toHaveText('Modifications non enregistrées');

  // 6. Save succeeds and creates Version 2
  await saveButton.click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await expect(footer.getByRole('status')).toHaveCount(0);

  // 7. Route return retains valid saved quantities
  // The preview snapshots asynchronously (ADR 0015). Wait for the saved revision,
  // rather than racing a document reload against its three-second persistence timer.
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
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await enterEditing(page);
  await expect(page.getByLabel('Sel (g)', { exact: true })).toHaveValue('22');
  await expect(page.getByLabel('Eau (g)', { exact: true })).toHaveValue('720');
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
  const water = page.getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  await expect(footer.getByRole('status')).toHaveText('Corriger les champs invalides');
  // No domain draft exists yet: discarding raw text must still be available.
  const footerDiscard = footer.getByRole('button', { name: 'Abandonner les modifications' });
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
  await page
    .locator('ion-alert')
    .getByRole('button', { name: 'Abandonner les modifications' })
    .click();
  await expect(footer.getByRole('status')).toHaveCount(0);
  await enterEditing(page);
  await expect(water).toHaveValue('750');
  await expect(water).not.toHaveAttribute('aria-invalid', 'true');
  await expect(footer.getByRole('status')).toHaveText('À jour');
  await page.getByLabel('Sel (g)', { exact: true }).fill('22');
  await page.getByLabel('Sel (g)', { exact: true }).press('Enter');
  await footer.getByRole('button', { name: 'Enregistrer v2', exact: true }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
});

test('domain-refused quantity blocks save until the stored value is restored', async ({ page }) => {
  await openRecipe(page);
  const footer = page.locator('ion-footer:visible');
  const salt = page.getByLabel('Sel (g)', { exact: true });
  await salt.fill('22');
  await salt.press('Enter');
  const flour = page.getByLabel('Farine totale (g)', { exact: true });
  await flour.fill('0');
  await flour.blur();
  await expect(flour).toHaveAttribute('aria-invalid', 'true');
  const save = footer.getByRole('button', { name: 'Enregistrer v2', exact: true });
  await expect(save).toBeDisabled();
  await flour.fill('1000');
  await flour.blur();
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await enterEditing(page);
  await expect(salt).toHaveValue('22');
});

test('removing an invalid ingredient unregisters its save blocker', async ({ page }) => {
  await openRecipe(page);
  const footer = page.locator('ion-footer:visible');
  const salt = page.getByLabel('Sel (g)', { exact: true });
  await salt.fill('abc');
  await salt.blur();
  await expect(footer.getByRole('status')).toHaveText('Corriger les champs invalides');
  await page.getByRole('button', { name: 'Retirer : Sel', exact: true }).click();
  await expect(salt).toHaveCount(0);
  const save = footer.getByRole('button', { name: 'Enregistrer v2', exact: true });
  await expect(save).toBeEnabled();
  await save.click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
});

test('invalid quantity explains disabled save in English @en', async ({ page }) => {
  await openRecipe(page);
  const salt = page.getByLabel('Salt (g)', { exact: true });
  await salt.fill('22');
  await salt.press('Enter');
  const water = page.getByLabel('Water (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  const footer = page.locator('ion-footer:visible');
  await expect(footer.getByRole('status')).toHaveText('Correct invalid fields');
  await expect(footer.getByRole('button', { name: 'Save v2', exact: true })).toBeDisabled();
});
