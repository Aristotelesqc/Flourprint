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
