import { expect, type Page } from '@playwright/test';

export const routed = (page: Page) =>
  page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
/** Legacy test-area names target sections in the single document, never editor destinations. */
export const editorSection = async (
  page: Page,
  name: 'composition' | 'components' | 'steps' | 'result',
) => {
  await expect(routed(page)).toHaveCount(1);
  if (name === 'steps') {
    await routed(page).getByTestId('recipe-method').scrollIntoViewIfNeeded();
    return;
  }
  const names = {
    composition: /^(Farines|Flours)(?:\s|\(|$)/,
    components: /^(Pr\u00e9-p\u00e2tes|Pre-doughs)(?:\s|\(|$)/,
    result: /^(Fermentation et conditions|Fermentation and conditions)(?:\s|\(|$)/,
  };
  const disclosure = routed(page).getByRole('button', { name: names[name] });
  await expect(disclosure).toBeVisible();
  if ((await disclosure.getAttribute('aria-expanded')) === 'false') await disclosure.click();
};
export const menuAction = async (page: Page, action: RegExp) => {
  await expect(routed(page)).toHaveCount(1);
  await routed(page)
    .getByRole('button', {
      name: /^(Actions sur la recette|Recipe actions|Menu édition|Edit actions|Actions de préparation|Preparation actions)$/,
    })
    .click();
  const sheet = page.getByRole('menu');
  await sheet.getByRole('menuitem', { name: action }).click();
  await expect(sheet).toBeHidden();
};
export const enterEditor = async (page: Page) => {
  await expect(routed(page)).toHaveCount(1);
  const editor = routed(page).getByRole('button', { name: /^(Menu édition|Edit actions)$/ });
  const edit = routed(page)
    .locator('ion-footer')
    .getByRole('button', {
      name: /^(Modifier la recette|Edit recipe|Modifier|Edit)$/,
    });
  // A restored draft can enter editing while the returning Ionic page settles.
  await expect(edit.or(editor)).toBeVisible();
  if (!(await editor.isVisible())) await edit.click();
  await expect(
    routed(page).getByRole('tab', { name: /^(Recette|Recipe)$/, exact: true }),
  ).toHaveAttribute('aria-selected', 'true');
  await expect(
    routed(page)
      .locator('ion-footer')
      .getByRole('button', { name: /^(Enregistrer|Save|Save recipe)$/, exact: true }),
  ).toBeVisible();
};
export const showPlanning = async (page: Page) => {
  await routed(page)
    .getByRole('tab', { name: /^(Planification|Planning)$/ })
    .click();
  await expect(
    routed(page).getByRole('button', { name: /^(Commencer \u00e0|Start at)$/ }),
  ).toBeVisible();
};

/** L103: the internal retained revision is tested in storage, never as a user version label. */
export const expectRecipeRevision = async (page: Page, version: number) => {
  await expect(routed(page).locator('ion-header').getByRole('heading', { level: 1 })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const id = /^\/recipes\/([^/]+)$/.exec(location.pathname)?.[1];
        if (!id) return null;
        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('flourprint-preview', 1);
          request.onsuccess = () => resolve(request.result);
          request.onerror = () => reject(request.error);
        });
        try {
          const snapshot = await new Promise<unknown>((resolve, reject) => {
            const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          if (typeof snapshot !== 'string') return null;
          const backup = JSON.parse(snapshot) as {
            recipes: { id: string; revisions: { version: number }[] }[];
          };
          return (
            backup.recipes.find((recipe) => recipe.id === decodeURIComponent(id))?.revisions.at(-1)
              ?.version ?? null
          );
        } finally {
          db.close();
        }
      }),
    )
    .toBe(version);
  await expect(routed(page).getByText(`Version ${version}`, { exact: true })).toHaveCount(0);
};
