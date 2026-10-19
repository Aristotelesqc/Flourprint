import { editRecipe, editProcessStep, stepMenu } from './screen-actions.mjs';
import { createRequire } from 'node:module';
const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const recipe = '/mockup.html?screen=recipe&lang=fr&width=360&capture=1';
async function edit(page) {
  await editRecipe(page);
}
async function enter(page, id, value) {
  const field = page.getByTestId(id);
  await field.fill(value);
  await field.press('Enter');
}
test('recipe allocations are real core outputs and checkboxes toggle exactly once', async ({
  page,
}) => {
  await page.goto(recipe);
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await expect(page.getByTestId('formula-flour-total')).toHaveText('314');
  await expect(page.getByRole('button', { name: /Ajouts finaux 599 g/ })).toBeVisible();
  const check = page.getByTestId('ingredient-row-final:salt').getByRole('checkbox');
  await check.check();
  await expect(check).toBeChecked();
  await expect(page.getByTestId('weigh-count')).toHaveText('1 / 11');
  await check.uncheck();
  await expect(page.getByTestId('weigh-count')).toHaveText('0 / 11');
  await page.getByTestId('ingredient-row-final:salt').getByText('Sel', { exact: true }).click();
  await expect(check).toBeChecked();
});
test('grams recompute, save persists, name persists, revisions exist', async ({ page }) => {
  await page.goto(recipe);
  await edit(page);
  await enter(page, 'ingredient-grams-salt', '8');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('701');
  await page.getByTestId('recipe-name').fill('Pain du samedi');
  await page.getByTestId('save-recipe').click();
  await expect(page.getByRole('heading', { name: 'Pain du samedi', exact: true })).toBeVisible();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('701');
  await page.getByRole('tab', { name: 'Historique', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Version 1', exact: true })).toBeVisible();
});
test('invalid input remains repairable, undo redo reset and cancel work', async ({ page }) => {
  await page.goto(recipe);
  await edit(page);
  await enter(page, 'ingredient-grams-salt', '-');
  await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('-');
  await expect(page.getByTestId('save-recipe')).toBeDisabled();
  await enter(page, 'ingredient-grams-salt', '8,5');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('701.5');
  await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await page.getByRole('button', { name: 'Rétablir', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('701.5');
  await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Réinitialiser le brouillon', exact: true })
    .click();
  const reset = page.getByRole('dialog');
  await expect(reset).toContainText(/révision enregistrée.*v1/);
  await reset.getByRole('button', { name: 'Réinitialiser', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await enter(page, 'ingredient-grams-salt', '9');
  await page.getByRole('button', { name: 'Annuler', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await expect(page.getByTestId('save-recipe')).toHaveCount(0);
});
for (const nav of ['A'])
  test(`complete library to preparation journey ${nav}`, async ({ page }) => {
    await page.goto(`/mockup.html?screen=library&lang=en&nav=${nav}&capture=1&prep=fresh`);
    await page.getByRole('searchbox').fill('shoku');
    await expect(page.locator('.phone-content .recipe-card')).toHaveCount(1);
    await page.locator('.phone-content .recipe-card').click();
    await expect(page.getByRole('heading', { name: 'Shokupan', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Planning', exact: true }).click();
    await expect(
      page.getByText('Projection generated from recipe steps.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Resume', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Shokupan', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '+15 min', exact: true }).click();
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    await page.getByRole('textbox', { name: 'Note text' }).fill('New note');
    await page.getByRole('dialog').getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.getByText('New note', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Step complete', exact: true }).click();
    await expect(
      page.locator('.current-step-hero').getByText('2 / 9 · Tangzhong cooling', { exact: true }),
    ).toBeVisible();
  });
test('new template opens a working draft and collisions are named', async ({ page }) => {
  await page.goto('/mockup.html?screen=library&lang=fr&capture=1');
  await page.getByRole('button', { name: 'Nouvelle recette', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Shokupan', exact: true }).click();
  await expect(page.getByTestId('recipe-name')).toHaveCount(0);
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Créer « Shokupan »', exact: true })
    .click();
  await expect(page.getByTestId('recipe-name')).toHaveValue('Shokupan 2');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await page.getByTestId('save-recipe').click();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(
    page.locator('.phone-content .recipe-card').filter({ hasText: 'Shokupan 2' }),
  ).toHaveCount(1);
});
test('step editing changes process and planning, removal asks confirmation', async ({ page }) => {
  await page.goto(recipe);
  await edit(page);
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  await editProcessStep(page, 'bulk');
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Pointage lent');
  await dialog.getByRole('textbox', { name: 'Durée', exact: true }).fill('90');
  await dialog.getByRole('textbox', { name: 'Durée', exact: true }).press('Enter');
  const temperature = dialog.getByRole('textbox', { name: 'Température', exact: true });
  await temperature.fill('-');
  await temperature.press('Enter');
  await expect(temperature).toHaveValue('-');
  await expect(dialog.getByRole('button', { name: 'Appliquer', exact: true })).toBeDisabled();
  await temperature.fill('21,5');
  await temperature.press('Enter');
  await dialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await expect(
    page.locator('.step-title:visible').filter({ hasText: 'Pointage lent' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Planification', exact: true }).click();
  await expect(
    page.locator('.step-title:visible').filter({ hasText: 'Pointage lent' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  await (
    await stepMenu(page, 'tangzhong')
  )
    .getByRole('button', { name: 'Supprimer', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toContainText('Cuisson du tangzhong');
  await page.getByRole('dialog').getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(10);
});
test('closed menus are inert, Escape returns focus, tabs support arrows', async ({ page }) => {
  await page.goto(recipe);
  const trigger = page.getByRole('button', { name: 'Actions sur la recette', exact: true });
  await trigger.click();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.mouse.click(8, 100);
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await page.getByRole('tab', { name: 'Ingrédients', exact: true }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Étapes', exact: true })).toHaveAttribute(
    'aria-selected',
    'true',
  );
});
test('diagnostic states never invent a duration on failure', async ({ page }) => {
  await page.goto(recipe.replace('capture=1', 'capture=0') + '&section=steps');
  await page.getByRole('button', { name: 'Fermentation', exact: true }).first().click();
  const selector = page.getByRole('combobox', { name: 'Cas de référence du modèle', exact: true });
  await selector.selectOption('noResult');
  await expect(
    page.locator('.status-panel:visible').getByText('Aucun résultat exploitable', { exact: true }),
  ).toBeVisible();
  await expect(page.getByText(/Durée estimée :/)).toHaveCount(0);
  await selector.selectOption('out');
  await expect(
    page
      .locator('.status-panel:visible')
      .getByText('Dose actuelle hors du domaine', { exact: true }),
  ).toBeVisible();
  await selector.selectOption('valid');
  await expect(
    page.locator('.status-panel:visible').getByText('Dans le domaine du modèle', { exact: true }),
  ).toBeVisible();
});
for (const theme of ['light', 'dark', 'amoled'])
  test(`360px and larger text remain scrollable, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 852 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(recipe + `&nav=A&theme=${theme}&scale=130`);
    await expect(page.getByRole('button', { name: 'Reprendre', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await expect(page.locator('.phone-content')).toHaveJSProperty(
      'scrollHeight',
      await page.locator('.phone-content').evaluate((el) => el.scrollHeight),
    );
    await page.getByRole('button', { name: 'Détail de l’hydratation', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });
test('catalogue is generated from shared versions and retains editable raw input', async ({
  page,
}) => {
  await page.goto('/mockup.html?screen=catalogue&lang=en');
  await expect(page.getByTestId('catalogue-fp.recipe-card-v1')).toBeVisible();
  await expect(page.getByTestId('catalogue-fp.bottom-bar-v1')).toBeVisible();
  await expect(
    page.getByRole('checkbox', { name: 'Weighed', exact: true, checked: true }).first(),
  ).toBeChecked();
  const input = page.getByRole('textbox', { name: 'Quantity', exact: true }).first();
  await input.fill('30');
  await input.press('Enter');
  await expect(input).toHaveValue('30');
  await page.getByRole('button', { name: 'Open sheet', exact: true }).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('browser Back guards a pending edit and Stay retains it', async ({ page }) => {
  await page.goto('/mockup.html?screen=library&lang=fr&capture=1');
  await page.locator('.phone-content .recipe-card').filter({ hasText: 'Shokupan' }).click();
  await edit(page);
  await enter(page, 'ingredient-grams-salt', '8');
  await page.goBack();
  await expect(page.getByRole('dialog', { name: 'Quitter le brouillon ?' })).toBeVisible();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Rester ici', exact: true })
    .first()
    .click();
  await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('8');
  await expect(page).toHaveURL(/screen=recipe/);
});
test('a dependency-breaking move is previewed and refused without mutation', async ({ page }) => {
  await page.goto(recipe + '&mode=edit&section=steps');
  await (
    await stepMenu(page, 'bulk')
  )
    .getByRole('button', { name: 'Descendre l’étape', exact: true })
    .click();
  await expect(
    page.getByRole('dialog').locator('[data-process-refusal="MoveBreaksDependencies"]'),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Appliquer', exact: true }),
  ).toHaveCount(0);
  await page.keyboard.press('Escape');
  await expect(page.locator('.step-title:visible').nth(3)).toHaveText('4. Pointage');
});
test('hydration display does not round the formula on an untouched blur', async ({ page }) => {
  await page.goto(recipe + '&mode=edit&recipe=baguette');
  const original = await page.getByTestId('formula-dough-weight').textContent();
  await page.getByTestId('hydration-target').focus();
  await page.getByTestId('hydration-target').blur();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText(original);
  await expect(
    page.getByRole('button', { name: 'Annuler la modification', exact: true }),
  ).toBeDisabled();
});

test('320px at 200 percent text retains a usable content viewport', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 852 });
  await page.goto('/mockup.html?screen=recipe&lang=en&width=320&scale=200&capture=1');
  expect(
    await page.locator('.phone-header').evaluate((el) => el.getBoundingClientRect().height),
  ).toBeLessThan(280);
  expect(await page.locator('.phone-content').evaluate((el) => el.clientHeight)).toBeGreaterThan(
    200,
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeVisible();
});

test('component ratio edits survive save without adding formula mass', async ({ page }) => {
  await page.goto(recipe);
  await edit(page);
  await enter(page, 'component-ratio-tangzhong', '5');
  await expect(page.getByTestId('component-ratio-tangzhong')).toHaveValue('5');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await page.getByTestId('save-recipe').click();
  await edit(page);
  await expect(page.getByTestId('component-ratio-tangzhong')).toHaveValue('5');
});

test('piece anchor reinterpretation and rescaling use the core without changing the stored ratios', async ({
  page,
}) => {
  await page.goto(recipe);
  await edit(page);
  await page.getByRole('button', { name: 'Taille de la recette', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Taille de la recette', exact: true })
    .selectOption('pieces');
  await expect(page.getByTestId('anchor-count')).toHaveValue('2');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await enter(page, 'anchor-count', '3');
  await expect
    .poll(async () => Number(await page.getByTestId('formula-dough-weight').textContent()))
    .toBeCloseTo(1048.5, 8);
  await page.getByTestId('save-recipe').click();
  await expect
    .poll(async () => Number(await page.getByTestId('formula-dough-weight').textContent()))
    .toBeCloseTo(1048.5, 8);
});

test('recipe trash is confirmed with trash terminology and removes only the chosen card', async ({
  page,
}) => {
  await page.goto(recipe);
  await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Mettre à la corbeille', exact: true })
    .click();
  const confirmation = page.getByRole('dialog', {
    name: 'Déplacer dans la corbeille ?',
    exact: true,
  });
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Mettre à la corbeille', exact: true }).click();
  await expect(
    page.locator('.phone-content .recipe-card').filter({ hasText: 'Shokupan' }),
  ).toHaveCount(0);
  await expect(
    page.locator('.phone-content .recipe-card').filter({ hasText: 'Bagels' }),
  ).toBeVisible();
});
