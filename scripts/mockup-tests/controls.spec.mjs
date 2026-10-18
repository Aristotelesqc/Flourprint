import { createRequire } from 'node:module';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const recipe = '/mockup.html?screen=recipe&nav=A&lang=fr&capture=1&motion=reduce';

async function edit(page) {
  await page.getByRole('button', { name: 'Actions sur la recette', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Modifier', exact: true }).click();
  await expect(page.getByTestId('save-recipe')).toBeVisible();
}

async function disclosure(scope, page, name) {
  const trigger = scope
    .getByRole('button', { name, exact: true })
    .and(scope.locator('button[aria-controls]'));
  if ((await trigger.getAttribute('aria-expanded')) !== 'true') await trigger.click();
  const id = await trigger.getAttribute('aria-controls');
  expect(id).toBeTruthy();
  return page.locator(`[id="${id}"]`);
}

async function number(scope, name, value) {
  const field = scope.getByRole('textbox', { name, exact: true });
  await field.fill(value);
  await field.press('Enter');
  return field;
}

test('recipe size information is reachable while reading without entering editing', async ({
  page,
}) => {
  await page.goto(recipe);
  const help = page.getByRole('button', {
    name: 'Informations · Taille de la recette',
    exact: true,
  });
  await expect(help).toBeVisible();
  await help.click();
  const sheet = page.getByRole('dialog', { name: 'Taille de la recette', exact: true });
  await expect(sheet).toContainText('Une seule ancre fixe la taille.');
  await expect(sheet).toContainText('changer sa valeur redimensionne les quantités');
  await expect(page.getByTestId('save-recipe')).toHaveCount(0);
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await page.keyboard.press('Escape');
  await expect(sheet).toHaveCount(0);
  await expect(help).toBeFocused();
  await edit(page);
  const size = await disclosure(page, page, 'Taille de la recette');
  await size.getByRole('button', { name: 'Mélange de farines', exact: true }).click();
  const blend = page.getByRole('dialog', { name: 'Mélange de farines', exact: true });
  await blend.getByRole('button', { name: 'Ajouter un ingrédient', exact: true }).click();
  const shares = blend.getByRole('textbox', { name: / · / });
  await expect(shares).toHaveCount(2);
  await shares.nth(0).fill('80');
  await shares.nth(0).press('Enter');
  await expect(page.getByTestId('formula-flour-total')).toHaveText('314');
  await shares.nth(1).fill('20');
  await shares.nth(1).press('Enter');
  await blend.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await expect(blend).toHaveCount(0);
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await size.getByRole('button', { name: 'Mélange de farines', exact: true }).click();
  await expect(blend.getByRole('textbox', { name: / · / }).nth(0)).toHaveValue('80');
  await expect(blend.getByRole('textbox', { name: / · / }).nth(1)).toHaveValue('20');
  await page.keyboard.press('Escape');
});

test('component removal cancels without mutation, removes allocation and can be undone', async ({
  page,
}) => {
  await page.goto(recipe);
  await edit(page);
  const remove = page.getByRole('button', { name: /^Supprimer · Tangzhong/ });
  const originalRatio = await page.getByTestId('component-ratio-tangzhong').inputValue();
  await remove.click();
  const confirmation = page
    .getByText('Confirmer la suppression : Tangzhong (roux d’eau)', { exact: true })
    .locator('..');
  await expect(confirmation).toBeVisible();
  await confirmation.getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(remove).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Annuler la modification', exact: true }),
  ).toBeDisabled();
  await remove.click();
  await confirmation.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(remove).toHaveCount(0);
  await expect(page.getByTestId('component-ratio-tangzhong')).toHaveCount(0);
  // Removing a preparation returns its allocations; it does not remove its ingredient mass.
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
  await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click();
  await expect(remove).toBeVisible();
  await expect(page.getByTestId('component-ratio-tangzhong')).toHaveValue(originalRatio);
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
});

test('adding an ingredient and editing its known or unknown composition changes real state', async ({
  page,
}) => {
  await page.goto(recipe);
  await edit(page);
  const add = await disclosure(page, page, 'Ajouter un ingrédient');
  await add.getByRole('textbox', { name: 'Nom de l’ingrédient', exact: true }).fill('Lait de test');
  await add.getByRole('combobox', { name: 'Type', exact: true }).selectOption('milk');
  await add.getByRole('button', { name: 'Ajouter un ingrédient', exact: true }).click();
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('702.14');
  await expect(page.getByText('Lait de test', { exact: true }).first()).toBeVisible();
  const composition = await disclosure(page, page, 'Composition');
  const card = composition
    .getByRole('heading', { name: 'Lait de test', exact: true })
    .locator('..');
  await card.getByRole('button', { name: 'Composition en eau inconnue', exact: true }).click();
  await expect(card.getByRole('textbox', { name: 'Teneur en eau', exact: true })).toHaveValue('');
  await expect(card.locator('p').first()).toHaveText('Teneur en eau · Inconnu');
  await number(card, 'Teneur en eau', '42,5');
  await expect(card.locator('p').first()).toHaveText('Teneur en eau · Part connue');
  await expect(card.getByRole('textbox', { name: 'Teneur en eau', exact: true })).toHaveValue(
    '42,5',
  );
  await page.getByTestId('save-recipe').click();
  await edit(page);
  const restored = await disclosure(page, page, 'Composition');
  const restoredCard = restored
    .getByRole('heading', { name: 'Lait de test', exact: true })
    .locator('..');
  await expect(
    restoredCard.getByRole('textbox', { name: 'Teneur en eau', exact: true }),
  ).toHaveValue('42,5');
});

test('adding and duplicating steps update the process and Undo restores the original graph', async ({
  page,
}) => {
  await page.goto(recipe);
  await edit(page);
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(10);
  await page.getByRole('button', { name: 'Ajouter une étape', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(11);
  await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(10);
  const row = page.locator('.step-row:visible').filter({
    has: page.getByRole('button', { name: 'Modifier l’étape : Pointage', exact: true }),
  });
  await row.locator('.step-more-trigger').click();
  await row.getByRole('button', { name: 'Dupliquer', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(11);
  await expect(
    page.getByRole('button', { name: 'Modifier l’étape : Pointage', exact: true }),
  ).toHaveCount(2);
  await page.getByRole('button', { name: 'Annuler la modification', exact: true }).click();
  await expect(page.locator('.step-title:visible')).toHaveCount(10);
  await expect(
    page.getByRole('button', { name: 'Modifier l’étape : Pointage', exact: true }),
  ).toHaveCount(1);
});

test('step editor cancels local changes and applies manual conditions, dependencies and equipment', async ({
  page,
}) => {
  await page.goto(recipe);
  await edit(page);
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  const open = page.getByRole('button', { name: 'Modifier l’étape : Pointage', exact: true });
  await open.click();
  let sheet = page.getByRole('dialog');
  const originalName = await sheet.getByRole('textbox', { name: 'Nom', exact: true }).inputValue();
  await sheet.getByRole('textbox', { name: 'Nom', exact: true }).fill('Brouillon annulé');
  await number(sheet, 'Durée', '90');
  await page.keyboard.press('Escape');
  await open.click();
  sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('textbox', { name: 'Nom', exact: true })).toHaveValue(originalName);
  await expect(sheet.getByRole('textbox', { name: 'Durée', exact: true })).toHaveValue('75');
  await sheet.getByRole('combobox', { name: 'Durée : mode', exact: true }).selectOption('unknown');
  await expect(sheet.getByRole('textbox', { name: 'Durée', exact: true })).toHaveCount(0);
  await sheet.getByRole('combobox', { name: 'Durée : mode', exact: true }).selectOption('manual');
  await number(sheet, 'Durée', '90');
  await number(sheet, 'Température', '20,5');
  await sheet.getByRole('textbox', { name: 'Nom', exact: true }).fill('Pointage doux');
  await sheet.getByRole('textbox', { name: 'Lieu', exact: true }).fill('Chambre de pousse');
  await sheet.getByRole('textbox', { name: 'Technique', exact: true }).fill('Rabat doux');
  await sheet
    .getByRole('combobox', { name: 'Placement de l’étape', exact: true })
    .selectOption('alap');
  await sheet
    .getByRole('group', { name: 'Après', exact: true })
    .getByRole('checkbox')
    .first()
    .check();
  const equipment = await disclosure(sheet, page, 'Équipement');
  await equipment
    .getByRole('combobox', { name: 'Mode de four', exact: true })
    .selectOption('proof');
  await equipment.getByRole('combobox', { name: 'Vapeur', exact: true }).selectOption('manual');
  await number(equipment, 'Température de consigne', '25');
  await sheet.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await page.getByRole('button', { name: 'Modifier l’étape : Pointage doux', exact: true }).click();
  sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('textbox', { name: 'Durée', exact: true })).toHaveValue('90');
  await expect(sheet.getByRole('textbox', { name: 'Lieu', exact: true })).toHaveValue(
    'Chambre de pousse',
  );
  await expect(sheet.getByRole('textbox', { name: 'Technique', exact: true })).toHaveValue(
    'Rabat doux',
  );
  await expect(
    sheet.getByRole('combobox', { name: 'Placement de l’étape', exact: true }),
  ).toHaveValue('alap');
  await expect(
    sheet.getByRole('group', { name: 'Après', exact: true }).getByRole('checkbox').first(),
  ).toBeChecked();
  const restoredEquipment = await disclosure(sheet, page, 'Équipement');
  await expect(
    restoredEquipment.getByRole('combobox', { name: 'Mode de four', exact: true }),
  ).toHaveValue('proof');
  await expect(
    restoredEquipment.getByRole('combobox', { name: 'Vapeur', exact: true }),
  ).toHaveValue('manual');
  await expect(
    restoredEquipment.getByRole('textbox', { name: 'Température de consigne', exact: true }),
  ).toHaveValue('25');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Planification', exact: true }).click();
  const plan = page
    .getByText('Projection générée à partir des étapes de la recette.', { exact: true })
    .locator('..');
  await plan
    .getByRole('combobox', { name: 'Fixer l’horaire', exact: true })
    .selectOption('readyBy');
  await plan.getByRole('combobox', { name: 'Étape cible', exact: true }).selectOption('bake');
  await plan.getByLabel('Fin prévue', { exact: true }).fill('2026-10-17T13:30');
  // Cooling lasts 60 minutes after the targeted bake, so the complete plan ends later.
  await expect(plan.locator('strong')).toContainText(/14\s*(?:h|:)\s*30/);
  await plan.getByRole('combobox', { name: 'Étape cible', exact: true }).selectOption('cool');
  await expect(plan.locator('strong')).toContainText(/13\s*(?:h|:)\s*30/);
  await plan
    .getByRole('combobox', { name: 'Fixer l’horaire', exact: true })
    .selectOption('startAt');
  await expect(plan.getByLabel('Départ prévu', { exact: true })).toBeVisible();
});

test('settings change actual theme and clear weighing checks without discarding recipe quantities', async ({
  page,
}) => {
  await page.goto(recipe.replace('nav=A', 'nav=B'));
  const salt = page.getByTestId('ingredient-row-final:salt').getByRole('checkbox');
  await salt.check();
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  for (const [label, value] of [
    ['Clair', 'light'],
    ['Sombre chaud', 'dark'],
    ['AMOLED', 'amoled'],
  ]) {
    await page.getByRole('button', { name: label, exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', value);
  }
  await expect(
    page.getByRole('checkbox', { name: 'Conserver pendant la visite', exact: true }),
  ).toBeChecked();
  await page.getByRole('button', { name: 'Effacer les coches', exact: true }).click();
  await page.getByRole('button', { name: 'Recettes', exact: true }).click();
  await page.getByRole('button', { name: 'Shokupan', exact: true }).click();
  await expect(salt).not.toBeChecked();
  await salt.check();
  await page.getByRole('button', { name: 'Réglages', exact: true }).click();
  await page.getByRole('checkbox', { name: 'Conserver pendant la visite', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Recettes', exact: true }).click();
  await page.getByRole('button', { name: 'Shokupan', exact: true }).click();
  await expect(salt).not.toBeChecked();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'amoled');
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
});

test('template details expose the actual sourced basis without creating a recipe', async ({
  page,
}) => {
  await page.goto('/mockup.html?screen=library&lang=fr&nav=B&capture=1&motion=reduce');
  await page.getByRole('button', { name: 'Nouvelle recette', exact: true }).click();
  const sheet = page.getByRole('dialog');
  const wrapper = sheet.getByRole('button', { name: 'Shokupan', exact: true }).locator('..');
  await expect(wrapper.locator('.recipe-card-description')).toContainText(
    'Un pain au lait japonais',
  );
  const details = wrapper.locator('.template-details');
  await details.locator('summary').click();
  await expect(details).toHaveAttribute('open', '');
  await expect(details.locator('p').first()).toContainText(
    'King Arthur Baking / Charlotte Rutledge',
  );
  await expect(details.locator('p').first()).toContainText('314 g bread flour');
  await expect(details.locator('p').first()).toContainText('9x5-inch');
  await expect(page.getByTestId('recipe-name')).toHaveCount(0);
  await details.locator('summary').click();
  await expect(details).not.toHaveAttribute('open', '');
});

test('Preparation duration is applied and Photo adds a clearly simulated journal marker', async ({
  page,
}) => {
  await page.goto('/mockup.html?screen=preparation&lang=fr&nav=B&capture=1&motion=reduce');
  await page.getByRole('button', { name: 'Durée', exact: true }).click();
  let sheet = page.getByRole('dialog');
  await number(sheet, 'Durée', '90');
  await sheet.getByRole('button', { name: 'Appliquer', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByText(/Durée ajustée.*1 h 30/)).toBeVisible();
  await page.getByRole('button', { name: 'Actions sur la préparation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Photo', exact: true }).click();
  sheet = page.getByRole('dialog', { name: 'Simulation de photo', exact: true });
  await expect(sheet).toContainText('sans accès à la caméra');
  await sheet.getByRole('button', { name: 'Ajouter le repère simulé', exact: true }).click();
  await expect(sheet).toHaveCount(0);
  await expect(page.getByText('Repère photo ajouté', { exact: false })).toBeVisible();
});

test('ready-by target falls back to the current final stage after the selected stage is removed', async ({
  page,
}) => {
  await page.goto(recipe + '&section=planning');
  const plan = page
    .getByText('Projection générée à partir des étapes de la recette.', { exact: true })
    .locator('..');
  await plan
    .getByRole('combobox', { name: 'Fixer l’horaire', exact: true })
    .selectOption('readyBy');
  await plan.getByRole('combobox', { name: 'Étape cible', exact: true }).selectOption('cool');
  await plan.getByLabel('Fin prévue', { exact: true }).fill('2026-10-17T13:30');
  await expect(plan.locator('strong')).toContainText(/13\s*(?:h|:)\s*30/);
  await edit(page);
  await page.getByRole('tab', { name: 'Étapes', exact: true }).click();
  const cooling = page.locator('.step-row:visible').filter({
    has: page.getByRole('button', { name: 'Modifier l’étape : Ressuage', exact: true }),
  });
  await cooling.locator('.step-more-trigger').click();
  await cooling.getByRole('button', { name: 'Supprimer', exact: true }).click();
  await page
    .getByRole('dialog', { name: 'Confirmer la suppression', exact: true })
    .getByRole('button', { name: 'Supprimer', exact: true })
    .click();
  await expect(page.locator('.step-title:visible')).toHaveCount(9);
  await page.getByRole('tab', { name: 'Planification', exact: true }).click();
  await expect(plan.getByRole('combobox', { name: 'Fixer l’horaire', exact: true })).toHaveValue(
    'readyBy',
  );
  const target = plan.getByRole('combobox', { name: 'Étape cible', exact: true });
  await expect(target.locator('option[value="cool"]')).toHaveCount(0);
  await expect(target).toHaveValue('bake');
  await expect(plan.locator('strong')).toContainText(/13\s*(?:h|:)\s*30/);
  await expect(plan.locator('strong')).not.toContainText('Inconnu');
  await expect(plan).not.toContainText('Durée inconnue');
});

test('flour-row removal clears only that row’s invalid input and preserves remaining validation', async ({
  page,
}) => {
  await page.goto(recipe);
  await edit(page);
  const size = await disclosure(page, page, 'Taille de la recette');
  const openBlend = size.getByRole('button', { name: 'Mélange de farines', exact: true });
  await openBlend.click();
  const blend = page.getByRole('dialog', { name: 'Mélange de farines', exact: true });
  const shares = blend.getByRole('textbox', { name: / · / });
  const apply = blend.getByRole('button', { name: 'Appliquer', exact: true });
  const rowOf = (field) => field.locator('xpath=ancestor::*[@data-fp-component="fp.surface"][1]');
  await blend.getByRole('button', { name: 'Ajouter un ingrédient', exact: true }).click();
  await shares.nth(1).fill('-');
  await shares.nth(1).blur();
  await expect(apply).toBeDisabled();
  await rowOf(shares.nth(1)).getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(shares).toHaveCount(1);
  await expect(shares.nth(0)).toHaveValue('100');
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(blend).toHaveCount(0);
  await openBlend.click();
  await blend.getByRole('button', { name: 'Ajouter un ingrédient', exact: true }).click();
  await blend.getByRole('textbox', { name: 'Nom de l’ingrédient', exact: true }).fill('rye-test');
  await blend.getByRole('button', { name: 'Ajouter un ingrédient', exact: true }).click();
  await expect(shares).toHaveCount(3);
  await shares.nth(1).fill('-');
  await shares.nth(1).blur();
  await shares.nth(2).fill('-');
  await shares.nth(2).blur();
  await expect(apply).toBeDisabled();
  await rowOf(shares.nth(1)).getByRole('button', { name: 'Supprimer', exact: true }).click();
  await expect(shares).toHaveCount(2);
  await expect(shares.nth(1)).toHaveValue('-');
  await expect(shares.nth(1)).toHaveAttribute('aria-invalid', 'true');
  await expect(apply).toBeDisabled();
  await shares.nth(0).fill('80');
  await shares.nth(0).press('Enter');
  await shares.nth(1).fill('20');
  await shares.nth(1).press('Enter');
  await expect(apply).toBeEnabled();
  await apply.click();
  await expect(blend).toHaveCount(0);
  await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
});
