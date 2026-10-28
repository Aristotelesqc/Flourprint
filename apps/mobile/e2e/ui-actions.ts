import { expect, type Page } from '@playwright/test';

export const routed = (page: Page) =>
  page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
export const editorSection = async (
  page: Page,
  name: 'composition' | 'components' | 'steps' | 'result',
) => {
  await expect(routed(page)).toHaveCount(1);
  const names = {
    composition: /^(Composition)$/,
    components: /^(Composants|Components)$/,
    steps: /^(Étapes|Steps)$/,
    result: /^(Résultat|Result)$/,
  };
  await routed(page).getByRole('button', { name: names[name] }).click();
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
    routed(page).getByRole('button', { name: 'Composition', exact: true }),
  ).toBeVisible();
};
export const showPlanning = async (page: Page) => {
  const editor = routed(page).getByRole('button', { name: /^(Menu édition|Edit actions)$/ });
  if (await editor.isVisible()) await menuAction(page, /^(Planification|Planning)$/);
  else
    await routed(page)
      .getByRole('tab', { name: /^(Planification|Planning)$/ })
      .click();
  await expect(
    routed(page).getByRole('button', { name: /^(Commencer à|Start at)$/ }),
  ).toBeVisible();
};
