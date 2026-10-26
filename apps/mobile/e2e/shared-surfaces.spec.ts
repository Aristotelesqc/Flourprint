import { expect, test } from './fixtures';
import { enterEditor, routed } from './ui-actions';

test('shared menus and help keep cancellation and focus in English @en', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).click();
  await expect(routed(page)).toHaveCount(1);

  const actions = routed(page).getByRole('button', { name: 'Recipe actions', exact: true });
  await actions.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem', { name: 'Edit recipe', exact: true })).toBeVisible();
  await expect(menu.getByRole('menuitem', { name: /trash/i })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(actions).toBeFocused();

  await enterEditor(page);
  const help = routed(page).getByRole('button', { name: 'Explanation: Recipe size', exact: true });
  await help.click();
  const sheet = page.locator('ion-modal:visible');
  await expect(
    sheet.getByRole('heading', { name: 'Recipe size: flour, dough or pieces' }),
  ).toBeVisible();
  const more = sheet.getByRole('button', { name: 'Learn more', exact: true });
  await more.click();
  await expect(sheet.getByRole('button', { name: 'Show less', exact: true })).toHaveAttribute(
    'aria-expanded',
    'true',
  );
  await sheet.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet).toBeHidden();
  await expect(help).toBeFocused();

  await help.click();
  await expect(more).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Escape');
  await expect(sheet).toBeHidden();
  await expect(help).toBeFocused();
});
