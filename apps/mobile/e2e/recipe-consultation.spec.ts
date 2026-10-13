import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const routed = (page: Page) => page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
const openSaved = async (page: Page) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
};
const edit = (page: Page, english = false) =>
  routed(page).getByRole('button', { name: english ? 'Edit' : 'Modifier', exact: true });
const read = (page: Page, english = false) =>
  routed(page).getByRole('button', {
    name: english ? 'Read recipe' : 'Lire la recette',
    exact: true,
  });
const footer = (page: Page) => routed(page).locator('ion-footer:visible');

for (const english of [false, true]) {
  test(`saved recipes open for reading; explicit editing creates no draft${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: english ? 393 : 360, height: 851 });
    await page.emulateMedia({ colorScheme: english ? 'light' : 'dark' });
    await openSaved(page);
    await expect(footer(page)).toHaveCount(0);
    await expect(routed(page).locator('input:not([type="checkbox"]):visible')).toHaveCount(0);
    await expect(routed(page).locator('select:visible')).toHaveCount(0);
    await expect(
      routed(page).getByRole('button', { name: english ? 'Plan' : 'Planifier', exact: true }),
    ).toBeVisible();
    await expect(
      routed(page).getByRole('button', { name: english ? 'Rename' : 'Renommer' }),
    ).toHaveCount(0);
    expect(await page.evaluate(() => document.activeElement?.tagName)).not.toBe('INPUT');
    await edit(page, english).click();
    await expect(
      routed(page).getByRole('heading', { name: 'Poolish + tangzhong', exact: true }),
    ).toBeVisible();
    await expect(footer(page).getByRole('status')).toHaveText(english ? 'Up to date' : 'À jour');
    await expect(
      footer(page).getByRole('button', {
        name: english ? 'Save v2' : 'Enregistrer v2',
        exact: true,
      }),
    ).toBeDisabled();
    const water = routed(page).getByLabel(english ? 'Water (g)' : 'Eau (g)', { exact: true });
    await expect(water).toHaveValue('750');
    await water.focus();
    await water.blur();
    await read(page, english).click();
    await expect(footer(page)).toHaveCount(0);
    await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  });
}

test('consultation and editing share weighing state without inventing a saved observation', async ({
  page,
}) => {
  await openSaved(page);
  const firstItem = routed(page).getByRole('checkbox').filter({ visible: true }).first();
  await firstItem.check();
  await edit(page).click();
  await expect(firstItem).toBeChecked();
  await expect(footer(page).getByRole('status')).toHaveText('À jour');
  const water = routed(page).getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  await footer(page).getByRole('button', { name: 'Abandonner les modifications' }).click();
  await page
    .locator('ion-alert')
    .getByRole('button', { name: 'Abandonner les modifications' })
    .click();
  await expect(footer(page)).toHaveCount(0);
  await expect(firstItem).toBeChecked();
  await expect(
    routed(page)
      .getByText(/Aide temporaire de pesée/)
      .filter({ visible: true }),
  ).toBeVisible();
});

test('valid raw text is committed only from the focused field before a mode command', async ({
  page,
}) => {
  await openSaved(page);
  await edit(page).click();
  const water = routed(page).getByLabel('Eau (g)', { exact: true });
  await water.fill('720');
  // An assistive/programmatic activation may not move browser focus first.
  await routed(page)
    .locator('ion-button')
    .filter({ hasText: 'Lire la recette' })
    .evaluate((host) => {
      (host as HTMLElement).click();
    });
  await expect(water).toHaveValue('720');
  await expect(footer(page).getByRole('status')).toHaveText('Modifications non enregistrées');
  await footer(page).getByRole('button', { name: 'Enregistrer v2', exact: true }).click();
  await expect(footer(page)).toHaveCount(0);
  await edit(page).click();
  await expect(water).toHaveValue('720');
});

test('a changed weighing quantity stays unchecked when the previous quantity is restored', async ({
  page,
}) => {
  await openSaved(page);
  const waterItem = routed(page).getByRole('checkbox', { name: /^Eau / });
  await waterItem.check();
  await edit(page).click();
  const water = routed(page).getByLabel('Eau (g)', { exact: true });
  await water.fill('720');
  await water.press('Enter');
  await expect(waterItem).not.toBeChecked();
  await water.fill('750');
  await water.press('Enter');
  await expect(waterItem).not.toBeChecked();
});

test('a long build label keeps recipe-list actions reachable at 360px', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 851 });
  await page.goto('/recipes');
  // Synthetic presentation fixture, not a deployed build-identity claim.
  await page.getByTestId('app-build-label').evaluate((host) => {
    host.textContent = 'v0.2.0-toasted-crust';
  });
  const actions = routed(page).locator('ion-header').getByRole('button');
  for (const action of await actions.all()) {
    await expect(action).toBeVisible();
    const box = await action.boundingBox();
    if (!box) throw new Error('Recipe-list action has no visible bounds');
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(360);
  }
  await routed(page).getByRole('button', { name: 'Nouvelle recette', exact: true }).click();
  await expect(
    page
      .locator('ion-modal:not(.overlay-hidden)')
      .getByRole('button', { name: /^Recette vierge / }),
  ).toBeVisible();
});

test('planning inputs survive entering and leaving editing without creating a recipe revision', async ({
  page,
}) => {
  await openSaved(page);
  await routed(page).getByRole('button', { name: 'Planifier', exact: true }).click();
  await routed(page).getByRole('button', { name: 'Prêt pour', exact: true }).click();
  const when = routed(page).locator('input[type="datetime-local"]');
  await when.fill('2026-11-05T14:00');
  const target = routed(page).getByRole('combobox', {
    name: /^Prêt à la fin de/,
    includeHidden: true,
  });
  await target.selectOption('mix');
  await expect(routed(page).getByLabel('Durée : Pétrissage', { exact: true })).toHaveCount(0);
  await expect(footer(page)).toHaveCount(0);
  await edit(page).click();
  await expect(when).toHaveValue('2026-11-05T14:00');
  await expect(target).toHaveValue('mix');
  await expect(routed(page).getByLabel('Durée : Pétrissage', { exact: true })).toBeVisible();
  await read(page).click();
  await routed(page).getByRole('button', { name: 'Planification', exact: true }).click();
  await expect(when).toHaveValue('2026-11-05T14:00');
  await expect(target).toHaveValue('mix');
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
});

test('raw-only invalid input cannot disappear into consultation or start an old recipe', async ({
  page,
}) => {
  await openSaved(page);
  await edit(page).click();
  const water = routed(page).getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await read(page).click();
  await expect(water).toHaveValue('abc');
  await expect(footer(page).getByRole('status')).toHaveText('Corriger les champs invalides');
  await routed(page)
    .locator('ion-header')
    .getByRole('button', { name: 'Démarrer', exact: true })
    .click();
  const alert = page.locator('ion-alert:not(.overlay-hidden)');
  await expect(alert).toContainText('Enregistrer les modifications');
  await expect(alert.getByRole('button', { name: 'Démarrer', exact: true })).toHaveCount(0);
  await alert.getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\//);
});

test('a persisted revision draft resumes in editing after a document reload', async ({ page }) => {
  await openSaved(page);
  await edit(page).click();
  const recipeId = new URL(page.url()).pathname.split('/').at(-1);
  const salt = routed(page).getByLabel('Sel (g)', { exact: true });
  await salt.fill('22');
  await salt.press('Enter');
  await expect(footer(page).getByRole('status')).toHaveText('Modifications non enregistrées');
  await expect
    .poll(() =>
      page.evaluate(async (id) => {
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
            drafts: readonly { origin: { kind: string; recipeId?: string } }[];
          };
          return backup.drafts.some(
            (draft) => draft.origin.kind === 'revision' && draft.origin.recipeId === id,
          );
        } finally {
          db.close();
        }
      }, recipeId),
    )
    .toBe(true);
  await page.reload();
  await expect(salt).toHaveValue('22');
  await expect(footer(page).getByRole('status')).toHaveText('Modifications non enregistrées');
  await expect(edit(page)).toHaveCount(0);
});
