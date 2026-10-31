import { expect, test } from './fixtures';
import { expectRecipeRevision, enterEditor, menuAction, routed, showPlanning } from './ui-actions';
import type { Page } from '@playwright/test';

const openEditor = async (page: Page) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/recipes');
  await routed(page).getByText('Poolish + tangzhong', { exact: true }).click();
  await expectRecipeRevision(page, 1);
  await enterEditor(page);
};
const footer = (page: Page) => routed(page).locator('ion-footer:visible');

// Regression coverage for raw-input guards and ephemeral editor history.
test('undo handles a focused valid edit committed inside the action before older edits', async ({
  page,
}) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await expect(water).toHaveValue('170');
  await water.fill('180');
  await water.focus();
  // Assistive/programmatic activation does not move focus before the click handler.
  await footer(page)
    .getByRole('button', { name: 'Annuler la dernière modification', exact: true })
    .evaluate((button) => (button as HTMLElement).click());
  await expect(water).toHaveValue('170');
  await footer(page).getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(water).toHaveValue('180');
});

test('undo never silently destroys invalid raw input', async ({ page }) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await water.fill('abc');
  await water.press('Tab');
  await expect(water).toHaveAttribute('aria-invalid', 'true');
  await expect(water).toHaveAttribute('aria-describedby', /.+/);
  expect(
    await water.evaluate((input) => {
      const id = input.getAttribute('aria-describedby');
      return id ? document.getElementById(id)?.textContent : undefined;
    }),
  ).toContain('Entrer un nombre');
  await footer(page)
    .getByRole('button', { name: 'Annuler la dernière modification', exact: true })
    .evaluate((button) => (button as HTMLElement).click());
  // A refusal or explicit confirmation can be presented, but unconfirmed text remains.
  await expect(water).toHaveValue('abc');
  await expect(
    footer(page).getByRole('button', { name: 'Enregistrer', exact: true }),
  ).toBeDisabled();
});

test('accepted draft data survives reload but the undo stack does not', async ({ page }) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await expect(
    footer(page).getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeEnabled();
  // Navigate through the app before reload, as required for asynchronous draft persistence.
  await routed(page).getByRole('button', { name: 'Lire la recette', exact: true }).click();
  await enterEditor(page);
  // The preview saves periodically (ADR 0015); faster menus are not a persistence barrier.
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<boolean>((resolve, reject) => {
              const request = indexedDB.open('flourprint-preview', 1);
              request.onerror = () => reject(request.error);
              request.onsuccess = () => {
                const db = request.result;
                const tx = db.transaction('snapshots', 'readonly');
                const saved = tx.objectStore('snapshots').get('backup');
                tx.oncomplete = () => {
                  db.close();
                  const snapshot =
                    typeof saved.result === 'string'
                      ? (JSON.parse(saved.result) as { drafts?: unknown[] })
                      : undefined;
                  resolve(Array.isArray(snapshot?.drafts) && snapshot.drafts.length > 0);
                };
                tx.onabort = () => {
                  db.close();
                  reject(tx.error);
                };
              };
            }),
        ),
      { timeout: 10_000 },
    )
    .toBe(true);
  await page.reload();
  await expect(routed(page).getByLabel('Eau, Mélange final (g)', { exact: true })).toHaveValue(
    '170',
  );
  await expect(
    footer(page).getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeDisabled();
});

test('newly accepted edit invalidates old redo stack', async ({ page }) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await expect(water).toHaveValue('170');
  await water.fill('180');
  await water.press('Enter');
  await expect(water).toHaveValue('180');

  // Undo to 720: Redo becomes enabled
  await footer(page)
    .getByRole('button', { name: 'Annuler la dernière modification', exact: true })
    .click();
  await expect(water).toHaveValue('170');
  await expect(footer(page).getByRole('button', { name: 'Rétablir', exact: true })).toBeEnabled();

  // New accepted edit (740) branches history and invalidates redo stack
  await water.fill('740');
  await water.press('Enter');
  await expect(water).toHaveValue('740');
  await expect(footer(page).getByRole('button', { name: 'Rétablir', exact: true })).toBeDisabled();
});

test('reset restores baseline on confirmation and cleans unchanged saved recipe', async ({
  page,
}) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await expect(water).toHaveValue('170');
  await expect(
    footer(page).getByRole('button', { name: 'Enregistrer', exact: true }),
  ).toBeEnabled();

  // Reset prompts confirmation
  await menuAction(page, /^Réinitialiser$/);
  const alert = page.locator('ion-alert:not(.overlay-hidden)');
  await expect(alert).toBeVisible();

  // Cancel leaves edit intact
  await alert.getByRole('button', { name: 'Annuler' }).click();
  await expect(alert).toBeHidden();
  await expect(water).toHaveValue('170');
  await expect(
    footer(page).getByRole('button', { name: 'Enregistrer', exact: true }),
  ).toBeEnabled();

  // Confirming reset restores baseline (750) and clears dirty/save state for unchanged saved recipe
  await menuAction(page, /^Réinitialiser$/);
  await page
    .locator('ion-alert:not(.overlay-hidden)')
    .getByRole('button', { name: 'Réinitialiser' })
    .click();
  await expect(water).toHaveValue('200');
  await expect(
    footer(page).getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeDisabled();
  await expect(footer(page).getByRole('button', { name: 'Rétablir', exact: true })).toBeDisabled();
  await expect(
    footer(page).getByRole('button', { name: 'Enregistrer', exact: true }),
  ).toBeDisabled();
});

test('history scope survives read and planning preview navigation', async ({ page }) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await expect(water).toHaveValue('170');
  await expect(
    footer(page).getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeEnabled();

  // Switch to planning preview (process tab)
  await showPlanning(page);
  await enterEditor(page);
  await expect(
    footer(page).getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeEnabled();

  // Switch to read consultation (back to formula consultation)
  await routed(page).getByRole('button', { name: 'Lire la recette', exact: true }).click();
  await enterEditor(page);
  await expect(
    footer(page).getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeEnabled();

  // Undo is still functional after previews
  await footer(page)
    .getByRole('button', { name: 'Annuler la dernière modification', exact: true })
    .click();
  await expect(water).toHaveValue('200');
});

test('footer maintains 48px targets and compact Save pill at 360px', async ({ page }) => {
  await openEditor(page);
  const saveBtn = footer(page).getByRole('button', { name: /Enregistrer/i });
  const undoBtn = footer(page).getByRole('button', {
    name: 'Annuler la dernière modification',
    exact: true,
  });
  const redoBtn = footer(page).getByRole('button', { name: 'Rétablir', exact: true });
  const resetBtn = footer(page).getByRole('button', { name: 'Annuler', exact: true });

  const undoBox = await undoBtn.boundingBox();
  const redoBox = await redoBtn.boundingBox();
  const resetBox = await resetBtn.boundingBox();
  const saveBox = await saveBtn.boundingBox();

  expect(undoBox?.height).toBeGreaterThanOrEqual(48);
  expect(undoBox?.width).toBeGreaterThanOrEqual(48);
  expect(redoBox?.height).toBeGreaterThanOrEqual(48);
  expect(redoBox?.width).toBeGreaterThanOrEqual(48);
  expect(resetBox?.height).toBeGreaterThanOrEqual(48);
  expect(resetBox?.width).toBeGreaterThanOrEqual(48);
  expect(saveBox?.height).toBeGreaterThanOrEqual(48);
  // Full-width Save pill occupies the full width across the 360px viewport
  expect(saveBox?.width).toBeGreaterThanOrEqual(48);
  if (!saveBox) throw new Error('Save control has no visible bounds');
  expect(saveBox.x + saveBox.width).toBeLessThanOrEqual(360);
});

test('undo cap boundary preserves modified draft at oldest retained snapshot without clearing to baseline', async ({
  page,
}) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  const undoBtn = footer(page).getByRole('button', {
    name: 'Annuler la dernière modification',
    exact: true,
  });
  const saveBtn = footer(page).getByRole('button', { name: 'Enregistrer', exact: true });

  // Baseline starts at 750. Perform 55 accepted commits (751 through 805).
  for (let grams = 201; grams <= 255; grams++) {
    await water.fill(String(grams));
    await water.press('Enter');
  }
  await expect(water).toHaveValue('255');
  await expect(saveBtn).toBeEnabled();

  // 50 Undo operations exhaust the 50-entry history cap to reach 755.
  for (let i = 0; i < 50; i++) {
    await undoBtn.click();
  }

  // The oldest retained snapshot is 755 (not the evicted 750 baseline).
  await expect(water).toHaveValue('205');
  // Undo is now exhausted, but modified draft and Save remain enabled.
  await expect(undoBtn).toBeDisabled();
  await expect(saveBtn).toBeEnabled();
});

test('an equivalent accepted value neither creates an undo state nor invalidates redo', async ({
  page,
}) => {
  await openEditor(page);
  const water = routed(page).getByLabel('Eau, Mélange final (g)', { exact: true });
  await water.fill('170');
  await water.press('Enter');
  await water.fill('180');
  await water.press('Enter');
  await footer(page)
    .getByRole('button', { name: 'Annuler la dernière modification', exact: true })
    .click();
  await expect(water).toHaveValue('170');
  await water.fill('170,0');
  await water.press('Enter');
  await expect(footer(page).getByRole('button', { name: 'Rétablir', exact: true })).toBeEnabled();
  await footer(page).getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(water).toHaveValue('180');
});
