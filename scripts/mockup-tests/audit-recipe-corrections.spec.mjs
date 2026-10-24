import { createRequire } from 'node:module';

const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');
const address = (locale, width = 393, scale = 100) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'shokupan', mode: 'edit', nav: 'A', lang: locale, theme: 'dark', width: String(width), scale: String(scale), motion: 'reduce', capture: '1' })}`;
const commit = async (field, value) => {
  await field.fill(value);
  await field.press('Enter');
};

for (const locale of ['fr', 'en']) {
  for (const [width, scale] of [
    [393, 100],
    [360, 130],
  ]) {
    test(`L122 ${locale} ${width}/${scale}: stage ingredient names stay readable beside accurate stage quantities`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 852 });
      await page.goto(address(locale, width, scale));
      const rows = page.locator('[data-fp-component="fp.ingredient-row"].is-editing');
      await expect(rows).not.toHaveCount(0);
      const dimensions = await rows.evaluateAll((items) =>
        items.map((row) => {
          const bounds = row.getBoundingClientRect();
          const name = row.querySelector('.ingredient-info').getBoundingClientRect();
          return {
            nameWidth: name.width,
            height: bounds.height,
            left: bounds.left,
            right: bounds.right,
          };
        }),
      );
      for (const row of dimensions) {
        expect(row.nameWidth).toBeGreaterThanOrEqual(120);
        expect(row.height).toBeLessThan(scale === 130 ? 240 : 200);
        expect(row.left).toBeGreaterThanOrEqual(0);
        expect(row.right).toBeLessThanOrEqual(width);
      }
      const milk = page.getByTestId('ingredient-row-final:milk');
      await expect(milk.getByTestId('ingredient-grams-milk')).toHaveValue('113');
      await expect(milk).toContainText(locale === 'fr' ? '36 %' : '36%');
      await expect(milk.getByTestId('ingredient-pct-milk')).toHaveCount(0);
      await expect(milk).not.toContainText(locale === 'fr' ? '49,7' : '49.7');
      await expect(milk).toContainText(locale === 'fr' ? 'cette étape' : 'this stage');
    });
  }

  test(`L18/L118 ${locale}: stage percentage and whole-recipe percentage name different quantities explicitly`, async ({
    page,
  }) => {
    await page.goto(address(locale));
    const row = page.getByTestId('ingredient-row-final:milk');
    await row
      .getByRole('button', {
        name: locale === 'fr' ? 'Informations · Lait' : 'Information · Milk',
        exact: true,
      })
      .click();
    const dialog = page.getByRole('dialog');
    const totalPct = dialog.getByTestId('ingredient-pct-milk');
    await expect(totalPct).toHaveValue(locale === 'fr' ? '49,7' : '49.7');
    await expect(dialog).toContainText(locale === 'fr' ? 'recette entière' : 'whole recipe');
    await totalPct.focus();
    await totalPct.blur();
    await page.keyboard.press('Escape');
    await expect(row.getByTestId('ingredient-grams-milk')).toHaveValue('113');
    await expect(page.getByTestId('component-share-tangzhong')).toHaveValue(
      locale === 'fr' ? '4,5' : '4.5',
    );
    await expect(row).toContainText(locale === 'fr' ? '36 %' : '36%');
  });

  test(`L121 ${locale}: valid flour-share refusal explains the domain constraint and clears stale errors`, async ({
    page,
  }) => {
    await page.goto(address(locale));
    const flour = page.getByTestId('flour-share-bread-flour');
    await commit(flour, '50');
    const alerts = page.getByRole('alert');
    await expect(alerts).toContainText([/100/]);
    await expect(page.locator('body')).not.toContainText(
      locale === 'fr' ? 'Saisir un nombre complet et valide.' : 'Enter a complete valid number.',
    );
    await expect(page.locator('body')).not.toContainText(
      locale === 'fr' ? 'Modification refusée par le moteur.' : 'Change refused by the engine.',
    );
    await flour.fill('100');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await flour.press('Enter');
    await expect(page.getByTestId('save-recipe')).toBeEnabled();
    await flour.fill('12.');
    await flour.press('Enter');
    await expect(page.getByRole('alert')).toContainText(
      locale === 'fr' ? 'Saisir un nombre complet et valide.' : 'Enter a complete valid number.',
    );
    await flour.fill('100');
    await flour.press('Enter');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('formula-flour-total')).toHaveText('314');
  });

  test(`L63 ${locale}: lock communicates its state and detail sheets restore their exact trigger focus`, async ({
    page,
  }) => {
    await page.goto(address(locale));
    const lock = page.getByRole('button', {
      name: locale === 'fr' ? 'Verrouiller l’hydratation' : 'Lock hydration',
      exact: true,
    });
    await expect(lock).toHaveAttribute('aria-pressed', 'false');
    await lock.click();
    const unlock = page.getByRole('button', {
      name: locale === 'fr' ? 'Déverrouiller l’hydratation' : 'Unlock hydration',
      exact: true,
    });
    await expect(unlock).toHaveAttribute('aria-pressed', 'true');
    await unlock.click();
    for (const name of locale === 'fr' ? ['Matières grasses', 'Sucres'] : ['Fat', 'Sugars']) {
      const trigger = page.getByRole('button', { name, exact: true });
      await trigger.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(trigger).toBeFocused();
    }
  });

  test(`L121 ${locale}: hydration refusal names the ingredient whose water composition is unknown`, async ({
    page,
  }) => {
    await page.goto(address(locale));
    const row = page.getByTestId('ingredient-row-final:milk-powder');
    await row
      .getByRole('button', {
        name: locale === 'fr' ? 'Informations · Lait en poudre' : 'Information · Milk powder',
        exact: true,
      })
      .click();
    await page
      .getByRole('dialog')
      .getByRole('button', {
        name: locale === 'fr' ? 'Composition en eau inconnue' : 'Unknown water composition',
        exact: true,
      })
      .click();
    await page.keyboard.press('Escape');
    await commit(page.getByTestId('hydration-target'), '80');
    await expect(page.getByRole('alert')).toContainText([
      locale === 'fr'
        ? /Teneur en eau non renseignée pour Lait en poudre/
        : /Unknown water content for Milk powder/,
    ]);
    await expect(page.locator('body')).not.toContainText(
      locale === 'fr' ? 'Modification refusée par le moteur.' : 'Change refused by the engine.',
    );
    await expect(page.locator('body')).not.toContainText(
      locale === 'fr' ? 'Saisir un nombre complet et valide.' : 'Enter a complete valid number.',
    );
  });

  test(`L12/L16 ${locale}: reading names the stage percentage base and preserves estimated hydration`, async ({
    page,
  }) => {
    await page.goto(address(locale).replace('mode=edit', 'mode=read'));
    await expect(
      page.getByRole('heading', {
        name:
          locale === 'fr'
            ? /Ingrédients.*% de la farine totale · cette étape/
            : /Ingredients.*% of total flour · this stage/,
      }),
    ).toBeVisible();
    const summary = page.locator('.recipe-summary-box');
    await expect(summary).toContainText(locale === 'fr' ? '(estimé)' : '(estimated)');
    await page
      .getByRole('button', {
        name: locale === 'fr' ? 'Détail de l’hydratation' : 'Hydration breakdown',
        exact: true,
      })
      .click();
    const sheet = page.getByRole('dialog');
    await expect(sheet).toContainText(locale === 'fr' ? 'Estimé' : 'Estimated');
    const swatches = await sheet.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => ({
        text: button.textContent.trim(),
        color: [...button.querySelectorAll('span')].find((span) => span.style.backgroundColor)
          ?.style.backgroundColor,
      })),
    );
    const water = swatches.find((item) => /^(Eau|Water)/.test(item.text));
    const yeast = swatches.find((item) => /(Levure|yeast)/i.test(item.text));
    expect(water?.color).toBeTruthy();
    expect(yeast?.color).toBeTruthy();
    expect(water.color).not.toBe(yeast.color);
  });
}
