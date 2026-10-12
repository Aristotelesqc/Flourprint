import { expect, test } from '@playwright/test';
import { sampleBackup } from '../test/fixtures/sample-recipe';

for (const english of [false, true]) {
  test(`Trashed Recipe suppresses contextual editors until restored${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    const backup = sampleBackup();
    const snapshot = JSON.stringify({
      ...backup,
      recipes: backup.recipes.map((recipe) => ({
        ...recipe,
        trashedAt: '2026-10-12T12:00:00.000Z',
      })),
    });
    await page.addInitScript((data: string) => {
      const open = indexedDB.open('flourprint-preview', 1);
      open.onupgradeneeded = () => open.result.createObjectStore('snapshots');
      open.onsuccess = () => {
        const db = open.result;
        const tx = db.transaction('snapshots', 'readwrite');
        tx.objectStore('snapshots').put(data, 'backup');
        tx.oncomplete = () => db.close();
      };
    }, snapshot);
    await page.goto('/recipes/poolish-tangzhong');
    const routed = page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
    await expect(routed.getByText('Version 1', { exact: true })).toBeVisible();
    await expect(routed).toHaveCount(1);
    const editHydration = routed.getByRole('button', {
      name: english ? 'Edit hydration' : 'Modifier l’hydratation',
      exact: true,
    });
    await expect(editHydration).toHaveCount(0);
    await expect(
      routed.getByRole('button', { name: english ? 'Start' : 'Démarrer', exact: true }),
    ).toHaveCount(0);
    await routed
      .getByRole('button', { name: english ? 'Planning' : 'Planification', exact: true })
      .click();
    await expect(
      routed.getByRole('button', { name: english ? / in recipe$/ : / dans la recette$/ }),
    ).toHaveCount(0);
    await expect(routed.locator('input:visible')).toHaveCount(0);
    await routed
      .getByRole('button', { name: english ? 'Restore' : 'Restaurer', exact: true })
      .click();
    await expect(
      routed.getByRole('button', {
        name: english ? 'Edit Bulk fermentation in recipe' : 'Modifier Pointage dans la recette',
        exact: true,
      }),
    ).toBeVisible();
    await routed.getByRole('button', { name: english ? 'Recipe' : 'Recette', exact: true }).click();
    await expect(editHydration).toBeVisible();
  });
}
