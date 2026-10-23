import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const address = (locale) =>
  `/mockup.html?screen=recipe&recipe=shokupan&mode=edit&nav=A&lang=${locale}&theme=dark&width=393&scale=100&motion=reduce&capture=1`;
const commit = async (field, value) => {
  await field.fill(value);
  await field.press('Enter');
};

for (const locale of ['fr', 'en']) {
  test(`L122 ${locale}: 43g tangzhong milk preserves 120g final milk and Save/Undo use the real stage edit`, async ({
    page,
  }) => {
    await page.goto(address(locale));
    const tangzhong = page.getByTestId('ingredient-grams-tangzhong-milk');
    const finalMilk = page.getByTestId('ingredient-grams-milk');
    await tangzhong.scrollIntoViewIfNeeded();
    // Build the contract's 36g component + 120g final fixture through actual stage edits.
    // The sourced template initially allocates 43g + 113g instead; its total is also156g.
    await commit(tangzhong, '36');
    await commit(finalMilk, '120');
    const original = await tangzhong.inputValue();
    await expect(finalMilk).toHaveValue('120');
    await commit(tangzhong, '43');
    await expect(tangzhong).toHaveValue('43');
    await expect(finalMilk).toHaveValue('120');
    await expect(page.getByTestId('formula-dough-weight')).toHaveText('706');
    await page
      .getByRole('button', {
        name: locale === 'fr' ? 'Annuler la modification' : 'Undo change',
        exact: true,
      })
      .click();
    await expect(tangzhong).toHaveValue(original);
    await expect(finalMilk).toHaveValue('120');
    await commit(tangzhong, '43');
    await page.getByTestId('save-recipe').click();
    await expect(page.getByTestId('formula-dough-weight')).toHaveText('706');
    await page
      .getByRole('button', { name: locale === 'fr' ? 'Modifier' : 'Edit', exact: true })
      .click();
    await expect(tangzhong).toHaveValue('43');
    await expect(finalMilk).toHaveValue('120');
  });

  test(`L102 ${locale}: allocated-liquid ratio and hydration are editable through the engine inverse`, async ({
    page,
  }) => {
    await page.goto(address(locale));
    const ratio = page.getByTestId('component-ratio-tangzhong');
    const hydration = page.getByTestId('component-hydration-tangzhong');
    await ratio.scrollIntoViewIfNeeded();
    await commit(ratio, '6');
    await expect(ratio).toHaveValue('6');
    // 1:6 is84g liquid:41g water +43g milk at89% water =>79.27g/14g =566.21%.
    // Liquid mass ratio and actual water hydration intentionally differ for milk.
    await expect(hydration).toHaveValue(locale === 'fr' ? '566,21' : '566.21');
    await commit(hydration, '500');
    // 500% actual water needs31.73g pure water +43g milk =>1:5.337857...
    await expect(ratio).toHaveValue(locale === 'fr' ? '5,34' : '5.34');
    await expect(hydration).toHaveValue('500');
    await expect(page.getByTestId('save-recipe')).toBeEnabled();
  });
}
