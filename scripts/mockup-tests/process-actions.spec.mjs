import { editRecipe, editProcessStep, stepMenu } from './screen-actions.mjs';
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const rows = (page) => page.locator('.section-carousel-pane.is-active .step-row:visible');
const titles = (page) => page.locator('.section-carousel-pane.is-active .step-title:visible');
const step = (page, name) =>
  rows(page).filter({
    has: page.locator('.step-title').filter({ hasText: new RegExp(`${name}$`) }),
  });
const duplicate = async (page, name) => {
  const item = step(page, name);
  await item.locator('[data-testid^="step-menu-"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Dupliquer', exact: true }).click();
  return page.getByRole('dialog');
};
const open = async (page, extra = '') => {
  await page.goto(
    `/mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&capture=1&lang=fr${extra}`,
  );
  await expect(rows(page)).toHaveCount(10);
};
const historyAction = async (page, name) => {
  const control = page.getByRole('button', { name, exact: true });
  const inMenu = !(await control.isVisible());
  if (inMenu)
    await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  await control.click();
  if (inMenu) await page.keyboard.press('Escape');
};
const expectUndoDisabled = async (page) => {
  const control = page.getByRole('button', { name: 'Annuler la modification', exact: true });
  const inMenu = !(await control.isVisible());
  if (inMenu)
    await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  await expect(control).toBeDisabled();
  if (inMenu) await page.keyboard.press('Escape');
};
const capture = async (page, name) => {
  if (process.env.FLOURPRINT_REVIEW_EVIDENCE)
    await page.screenshot({
      path: path.join(process.env.FLOURPRINT_REVIEW_EVIDENCE, `${name}.png`),
    });
};

test.describe('core-backed process actions', () => {
  for (const theme of ['light', 'dark', 'amoled'])
    for (const [width, scale] of [
      [393, 100],
      [360, 130],
    ]) {
      test(`chain preview and confirmation ${theme} ${width}/${scale}`, async ({ page }) => {
        await page.setViewportSize({ width, height: 852 });
        await open(page, `&theme=${theme}&width=${width}&scale=${scale}&nav=A`);
        const original = await titles(page).allTextContents();
        await capture(page, `process-before-${theme}-${width}-${scale}`);
        await page.getByTestId('drag-handle-divide').filter({ visible: true }).press('ArrowUp');
        const dialog = page.getByRole('dialog');
        await expect(dialog).toContainText('Ce déplacement change les dépendances.');
        await dialog.getByRole('button', { name: 'Étapes touchées (3)', exact: true }).click();
        await expect(dialog.getByTestId('affected-step-divide')).toContainText(
          'Dépend de : Pointage',
        );
        await expect(dialog.getByTestId('affected-step-divide')).toContainText(
          'Dépend de : Pétrissage',
        );
        await expect(dialog.getByTestId('affected-step-divide')).toContainText('+2 h 34');
        await expect(dialog.getByTestId('affected-step-divide')).toContainText('+1 h 19');
        await expect(titles(page)).toHaveText(original);
        const horizontalOverflow = await dialog.evaluate(
          (el) =>
            el.scrollWidth > el.clientWidth + 1 ||
            [...el.querySelectorAll('.process-change-times > span')].some((child) => {
              const c = child.getBoundingClientRect(),
                p = el.getBoundingClientRect();
              return c.right > p.right + 1 || c.left < p.left - 1;
            }),
        );
        expect(horizontalOverflow).toBe(false);
        await capture(page, `process-chain-${theme}-${width}-${scale}`);
        await dialog.getByRole('button', { name: 'Appliquer', exact: true }).press('Enter');
        await expect(dialog).toHaveCount(0);
        await expect(titles(page).nth(3)).toHaveText('4. Division');
        await expect(titles(page).nth(4)).toHaveText('5. Pointage');
        await expect(page.getByTestId('recipe-steps').getByRole('status')).toHaveText(
          'Modification des étapes appliquée au brouillon.',
        );
        await historyAction(page, 'Annuler la modification');
        await expect(titles(page)).toHaveText(original);
        await historyAction(page, 'Rétablir');
        await expect(titles(page).nth(3)).toHaveText('4. Division');
        await capture(page, `process-after-${theme}-${width}-${scale}`);
      });
    }

  test('downward chain refusal preserves the draft and offers explicit editing', async ({
    page,
  }) => {
    await open(page);
    const original = await titles(page).allTextContents();
    await (
      await stepMenu(page, 'bulk')
    )
      .getByRole('button', { name: 'Descendre l’étape', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.locator('[data-process-refusal="MoveBreaksDependencies"]')).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Appliquer', exact: true })).toHaveCount(0);
    await capture(page, 'process-refusal');
    await expect(dialog.getByRole('checkbox')).toHaveCount(0);
    await dialog.getByRole('button', { name: 'Fermer et inspecter', exact: true }).click();
    await editProcessStep(page, 'bulk');
    await expect(page.getByRole('dialog', { name: 'Modifier l’étape', exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(titles(page)).toHaveText(original);
    await expectUndoDisabled(page);
  });

  test('independent display move applies without confirmation and preserves timing', async ({
    page,
  }) => {
    await open(page);
    // The grouped view keeps parallel preheat in its cooking lane. Inspect topological
    // display order in the unified timeline list instead of flattening separate lanes.
    await page.getByRole('tab', { name: 'Ligne de temps', exact: true }).click();
    const timing = await step(page, 'Préchauffage').locator('.step-details').textContent();
    await page.getByTestId('drag-handle-preheat').filter({ visible: true }).press('ArrowUp');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('recipe-steps').getByRole('status')).toHaveText(
      'Seul l’ordre d’affichage change.',
    );
    await expect(step(page, 'Préchauffage').locator('.step-details')).toHaveText(timing);
    await expect(titles(page).nth(6)).toHaveText('Préchauffage');
    await historyAction(page, 'Annuler la modification');
    await expect(titles(page).nth(7)).toHaveText('Préchauffage');
  });

  test('manual duplicate is reviewed and cancelled atomically', async ({ page }) => {
    await open(page);
    const dialog = await duplicate(page, 'Pointage');
    await expect(dialog).toHaveAccessibleName('Dupliquer : Pointage');
    await expect(dialog.getByRole('textbox', { name: 'Durée', exact: true })).toHaveValue('75');
    await expect(rows(page)).toHaveCount(10);
    await dialog.getByRole('button', { name: 'Étapes touchées (7)', exact: true }).click();
    await expect(dialog.getByTestId('affected-step-divide')).toContainText('+2 h 34');
    await expect(dialog.getByTestId('affected-step-divide')).toContainText('+3 h 49');
    await dialog.getByRole('button', { name: 'Fenêtres de préparation', exact: true }).click();
    const windows = dialog.getByTestId('process-change-windows');
    await expect(windows).toContainText('5 h 11 min 30 s');
    await expect(windows).toContainText('6 h 26 min 30 s');
    await capture(page, 'process-duplicate-cancel');
    await page.keyboard.press('Escape');
    await expect(rows(page)).toHaveCount(10);
    await expectUndoDisabled(page);
  });

  test('duplicate edits apply once and share undo redo save and reopen', async ({ page }) => {
    await open(page);
    const dialog = await duplicate(page, 'Pointage');
    await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Pointage supplémentaire');
    await dialog.getByRole('textbox', { name: 'Durée', exact: true }).fill('90');
    await dialog.getByRole('textbox', { name: 'Durée', exact: true }).press('Enter');
    await dialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
    await expect(rows(page)).toHaveCount(11);
    await expect(titles(page).nth(4)).toHaveText('5. Pointage supplémentaire');
    await expect(step(page, 'Pointage supplémentaire').locator('.step-details')).toContainText(
      '1 h 30',
    );
    await historyAction(page, 'Annuler la modification');
    await expect(rows(page)).toHaveCount(10);
    await historyAction(page, 'Rétablir');
    await expect(rows(page)).toHaveCount(11);
    await page.getByTestId('save-recipe').click();
    await expect(rows(page)).toHaveCount(11);
    await editRecipe(page);
    await expect(rows(page)).toHaveCount(11);
    await expect(titles(page).nth(4)).toHaveText('5. Pointage supplémentaire');
  });

  test('unknown duplicate duration stays unknown and blocks downstream timing', async ({
    page,
  }) => {
    await open(page);
    await editProcessStep(page, 'bulk');
    await page
      .getByRole('dialog')
      .getByRole('combobox', { name: 'Durée : mode', exact: true })
      .selectOption('unknown');
    await page.getByRole('dialog').getByRole('button', { name: 'Appliquer', exact: true }).click();
    const dialog = await duplicate(page, 'Pointage');
    await expect(dialog.getByRole('alert')).toHaveText('Durée à préciser');
    await dialog.getByRole('button', { name: /Étapes touchées/ }).click();
    const downstream = dialog.getByTestId('affected-step-divide');
    await expect(downstream).toContainText(/horaire inconnu/i);
    await expect(downstream.locator('.process-change-times')).toHaveCount(0);
    await expect(downstream).not.toContainText('0 min');
    await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Repos sans durée');
    await dialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
    await expect(step(page, 'Repos sans durée').locator('.step-details')).toContainText(
      'Durée inconnue',
    );
  });

  test('alap duplicate is refused without a new step', async ({ page }) => {
    await open(page);
    const dialog = await duplicate(page, 'Préchauffage');
    await expect(dialog.locator('[data-process-refusal="NotDuplicable"]')).toBeVisible();
    await expect(dialog).toContainText('ne peut pas être dupliquée');
    await page.keyboard.press('Escape');
    await expect(rows(page)).toHaveCount(10);
  });

  test('English narrow preview and cancellation retain focus and no console errors', async ({
    page,
  }) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.setViewportSize({ width: 360, height: 852 });
    await page.goto(
      '/mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&capture=1&lang=en&width=360&scale=130&nav=A&theme=amoled',
    );
    const trigger = page.getByTestId('drag-handle-divide').filter({ visible: true });
    await trigger.press('ArrowUp');
    await expect(page.getByRole('dialog')).toContainText('This move changes dependencies.');
    await page.keyboard.press('Escape');
    await expect(trigger).toBeFocused();
    await expect(rows(page)).toHaveCount(10);
    await (
      await stepMenu(page, 'bulk')
    )
      .getByRole('button', { name: 'Duplicate', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveAccessibleName('Duplicate : Bulk fermentation');
    await expect(
      page.getByRole('dialog').getByRole('textbox', { name: 'Duration', exact: true }),
    ).toHaveValue('75');
    await page.keyboard.press('Escape');
    await expect(rows(page)).toHaveCount(10);
    expect(errors).toEqual([]);
  });
});
