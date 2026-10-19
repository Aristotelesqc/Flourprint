export async function editRecipe(page, locale = 'fr') {
  await page
    .getByRole('button', { name: locale === 'fr' ? 'Modifier' : 'Edit', exact: true })
    .click();
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
