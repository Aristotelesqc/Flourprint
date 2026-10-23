export async function editRecipe(page, locale = 'fr') {
  await page
    .getByRole('button', { name: locale === 'fr' ? 'Modifier' : 'Edit', exact: true })
    .click();
}

export async function openRecipeSteps(page, locale = 'fr') {
  await page
    .getByRole('tab', { name: locale === 'fr' ? 'Recette' : 'Recipe', exact: true })
    .click();
  await page.getByTestId('recipe-steps').scrollIntoViewIfNeeded();
}

export async function stepMenu(page, id) {
  await page.getByTestId(`step-menu-${id}`).filter({ visible: true }).click();
  return page.getByRole('dialog');
}

export async function editProcessStep(page, id, locale = 'fr') {
  const menu = await stepMenu(page, id);
  await menu
    .getByRole('button', { name: locale === 'fr' ? 'Modifier l’étape' : 'Edit step', exact: true })
    .click();
  return page.getByRole('dialog');
}

export async function openGlobalDestination(page, label, locale = 'fr') {
  const destination = page.getByRole('button', { name: label, exact: true });
  if (!(await destination.isVisible().catch(() => false))) {
    const navigation = page
      .getByRole('banner')
      .getByRole('button', { name: 'Navigation', exact: true });
    if (!(await navigation.isVisible().catch(() => false)))
      await page
        .getByRole('button', { name: locale === 'fr' ? 'Retour' : 'Back', exact: true })
        .click();
    await navigation.click();
  }
  await destination.click();
}

export function recipeCard(root, name) {
  return root
    .getByRole('button', { name, exact: true })
    .locator('xpath=ancestor::*[@data-fp-component="fp.recipe-card"][1]');
}

export function summaryMetric(page, helpLabel) {
  return page
    .locator('[data-fp-container="fp.hero-summary"] .metric-tile')
    .filter({ has: page.getByRole('button', { name: helpLabel, exact: true }) });
}

export async function markMilkPowderWaterUnknown(page, locale = 'fr') {
  await editRecipe(page, locale);
  const ingredient = locale === 'fr' ? 'Lait en poudre' : 'Milk powder';
  const help = locale === 'fr' ? 'Informations' : 'Information';
  await page.getByRole('button', { name: `${help} · ${ingredient}`, exact: true }).click();
  const dialog = page.getByRole('dialog', { name: ingredient, exact: true });
  await dialog
    .getByRole('button', {
      name: locale === 'fr' ? 'Composition en eau inconnue' : 'Unknown water composition',
      exact: true,
    })
    .click();
  await dialog
    .getByRole('button', { name: locale === 'fr' ? 'Fermer' : 'Close', exact: true })
    .click();
  await page.getByTestId('save-recipe').click();
}
