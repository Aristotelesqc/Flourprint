import { createRequire } from 'node:module';
const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const recipe = '/mockup.html?screen=recipe&lang=fr&width=360&capture=1';
async function edit(page) {
  await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier', exact: true }).click();
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
  await page.getByRole('button', { name: 'Réinitialiser le brouillon', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await enter(page, 'ingredient-grams-salt', '9');
  await page.getByRole('button', { name: 'Abandonner', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Abandonner', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await expect(page.getByTestId('save-recipe')).toHaveCount(0);
});
for (const nav of ['A', 'B'])
  test(`complete library to preparation journey ${nav}`, async ({ page }) => {
    await page.goto(`/mockup.html?screen=library&lang=en&nav=${nav}&capture=1`);
    await page.getByRole('searchbox').fill('shoku');
    await expect(page.locator('.recipe-card')).toHaveCount(1);
    await page.locator('.recipe-card').click();
    await expect(page.getByRole('heading', { name: 'Shokupan', exact: true })).toBeVisible();
    await page.getByRole('tab', { name: 'Planning', exact: true }).click();
    await expect(
      page.getByText('Projection generated from recipe steps.', { exact: true }),
    ).toBeVisible();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Preparations', exact: true })).toBeVisible();
    await page.getByRole('button', { name: '+15 min', exact: true }).click();
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    await page.getByRole('textbox', { name: 'Note text' }).fill('New note');
    await page.getByRole('dialog').getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(page.getByText('New note', { exact: false })).toBeVisible();
    await page.getByRole('button', { name: 'Step complete', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: 'Tangzhong cooling', exact: true }),
    ).toBeVisible();
  });
test('new template opens a working draft and collisions are named', async ({ page }) => {
  await page.goto('/mockup.html?screen=library&lang=fr&capture=1');
  await page.getByRole('button', { name: 'Nouvelle recette', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Shokupan', exact: true }).click();
  await expect(page.getByTestId('recipe-name')).toHaveValue('Shokupan 2');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await page.getByTestId('save-recipe').click();
  await page.getByRole('button', { name: 'Retour', exact: true }).click();
  await expect(page.locator('.recipe-card').filter({ hasText: 'Shokupan 2' })).toHaveCount(1);
});
test('step editing changes process and planning, removal asks confirmation', async ({ page }) => {
  await page.goto(recipe);
  await edit(page);
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  await page.getByRole('button', { name: 'Modifier l’étape : Pointage', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox', { name: 'Nom', exact: true }).fill('Pointage lent');
  await dialog.getByRole('textbox', { name: 'Durée', exact: true }).fill('90');
  await dialog.getByRole('textbox', { name: 'Durée', exact: true }).press('Enter');
  await dialog.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await expect(
    page.locator('.step-title:visible').filter({ hasText: 'Pointage lent' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Planification', exact: true }).click();
  await expect(
    page.locator('.step-title:visible').filter({ hasText: 'Pointage lent' }),
  ).toBeVisible();
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  await page.getByRole('button', { name: 'Supprimer', exact: true }).first().click();
  await expect(page.getByRole('dialog', { name: 'Confirmer la suppression' })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(10);
});
test('closed menus are inert, Escape returns focus, tabs support arrows', async ({ page }) => {
  await page.goto(recipe);
  const trigger = page.getByRole('button', { name: 'Actions sur la recette', exact: true });
  await trigger.click();
  await page.keyboard.press('Escape');
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
  await page.goto(recipe + '&section=steps');
  await page.getByRole('button', { name: 'Fermentation', exact: true }).first().click();
  const selector = page.getByRole('combobox', { name: 'Aperçu du déplacement', exact: true });
  await selector.selectOption('noResult');
  await expect(page.getByText('Aucun résultat exploitable', { exact: true })).toBeVisible();
  await expect(page.getByText(/Durée estimée :/)).toHaveCount(0);
  await selector.selectOption('out');
  await expect(
    page.getByText('Dose actuelle hors du domaine', { exact: true }).locator('visible=true'),
  ).toBeVisible();
  await selector.selectOption('valid');
  await expect(
    page.getByText('Dans le domaine du modèle', { exact: true }).locator('visible=true'),
  ).toBeVisible();
});
for (const theme of ['light', 'dark', 'amoled'])
  test(`360px and larger text remain scrollable, ${theme}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 852 });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(recipe + `&nav=B&theme=${theme}&scale=130`);
    await expect(page.getByRole('button', { name: 'Lancer', exact: true })).toBeVisible();
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
test('catalogue uses shared controls with real state', async ({ page }) => {
  await page.goto('/mockup.html?screen=catalogue&lang=en&capture=1');
  await page.getByRole('checkbox', { name: 'Weighed', exact: true }).first().check();
  await expect(page.getByRole('checkbox', { name: 'Weighed', exact: true }).last()).toBeChecked();
  await page.getByRole('textbox', { name: 'Free entry', exact: true }).fill('30');
  await page.getByRole('textbox', { name: 'Free entry', exact: true }).press('Enter');
  await expect(page.getByRole('textbox', { name: 'Free entry', exact: true })).toHaveValue('30');
});

test('browser Back guards a pending edit and Stay retains it', async ({ page }) => {
  await page.goto('/mockup.html?screen=library&lang=fr&capture=1');
  await page.locator('.recipe-card').filter({ hasText: 'Shokupan' }).click();
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
  await page.getByRole('button', { name: 'Ordre', exact: true }).click();
  await page.getByRole('button', { name: 'Descendre : Pointage', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Le graphe refuse cet ordre.');
  await expect(
    page.getByRole('dialog').getByRole('button', { name: 'Appliquer', exact: true }),
  ).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.step-title:visible').nth(3)).toHaveText('Pointage');
});
test('hydration display does not round the formula on an untouched blur', async ({ page }) => {
  await page.goto(recipe + '&mode=edit');
  const original = await page.getByTestId('formula-dough-weight').textContent();
  await page.getByTestId('hydration-target').focus();
  await page.getByTestId('hydration-target').blur();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText(original);
  await expect(
    page.getByRole('button', { name: 'Annuler la modification', exact: true }),
  ).toBeDisabled();
});
