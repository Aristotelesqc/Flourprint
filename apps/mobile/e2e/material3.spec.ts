import { expect, test } from './fixtures';
import { editorSection, enterEditor, menuAction, routed } from './ui-actions';
import type { Page } from '@playwright/test';
import milkFixture from '../../../docs/contracts/fixtures/enriched-milk-butter.json' with { type: 'json' };

const open = async (page: Page) => {
  await page.setViewportSize({ width: 360, height: 851 });
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/poolish-tangzhong$/);
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  await expect(routed(page)).toHaveCount(1);
};

test('milk-only incomplete hydration offers ingredient editing without inventing water or a lock', async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 851 });
  await page.goto('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'milk-only.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-10-13T00:00:00.000Z',
        families: [],
        recipes: [
          {
            id: 'qa-milk-only',
            name: 'QA — pâte au lait',
            revisions: [
              {
                recipeId: 'qa-milk-only',
                version: 1,
                createdAt: '2026-10-13T00:00:00.000Z',
                formula: milkFixture.input,
                process: {
                  steps: [
                    {
                      id: 'mix',
                      operation: 'mix',
                      dependsOn: [],
                      schedule: 'asap',
                      plannedDurationS: 600,
                    },
                  ],
                },
              },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByText('1 recette importée.', { exact: true })).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/recipes$/);
  await expect(routed(page)).toHaveCount(1);
  await routed(page).getByText('QA — pâte au lait', { exact: true }).click();
  await expect(page).toHaveURL(/\/recipes\/qa-milk-only$/);
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  await expect(routed(page)).toHaveCount(1);
  await expect(routed(page).getByText('≈ 53 %', { exact: true })).toBeVisible();
  await expect(
    routed(page)
      .getByText(/Inconnu pour :/)
      .first(),
  ).toBeVisible();
  await expect(
    routed(page).getByRole('button', { name: 'Modifier l’hydratation', exact: true }),
  ).toHaveCount(0);
  await routed(page).getByRole('button', { name: 'Modifier les ingrédients', exact: true }).click();
  await expect(
    routed(page).getByRole('region', { name: 'Hydratation', exact: true }),
  ).toContainText('53 %');
  await expect(routed(page).getByLabel('Eau (g)', { exact: true })).toHaveCount(0);
  await expect(
    routed(page).getByRole('button', { name: /Verrouiller l’hydratation à/ }),
  ).toHaveCount(0);
  await expect(routed(page).getByText('Eau ajoutée', { exact: true })).toHaveCount(0);
  await expect(routed(page).getByText('Eau versée', { exact: true })).toHaveCount(0);
  await expect(routed(page).locator('ion-footer').getByRole('status')).toHaveText('À jour');
});

test('whole-percent hydration presentation never becomes a rounded recipe edit', async ({
  page,
}) => {
  await open(page);
  await expect(routed(page).getByText('≈ 75 %', { exact: true })).toBeVisible();
  await enterEditor(page);
  const hydration = routed(page).getByLabel('Hydratation (%)', { exact: true });
  await expect(hydration).toHaveValue('75');
  await hydration.focus();
  await hydration.blur();
  await expect(routed(page).locator('ion-footer').getByRole('status')).toHaveText('À jour');
  await expect(routed(page).getByLabel('Eau (g)', { exact: true })).toHaveValue('750');
  // Lock the actual resolved value, including 0.2 g of water from the yeast estimate.
  await routed(page)
    .getByRole('button', { name: /Verrouiller l’hydratation à/ })
    .click();
  await menuAction(page, /^Examiner les modifications$/);
  await expect(page.locator('ion-modal:not(.overlay-hidden)')).toContainText(
    'Hydratation verrouillée à 75,02 %',
  );
});

test('component ratio commits through the domain; refusal retains text and blocks save', async ({
  page,
}) => {
  await open(page);
  await enterEditor(page);
  await editorSection(page, 'components');
  const ratio = routed(page).getByLabel('tangzhong, Ratio farine:liquide', { exact: true });
  await expect(ratio).toHaveValue('5');
  await ratio.fill('6');
  await ratio.press('Enter');
  await expect(routed(page).getByLabel('tangzhong, Hydratation (%)')).toHaveValue('600');
  await ratio.fill('0');
  await ratio.press('Enter');
  await expect(ratio).toHaveValue('0');
  await expect(ratio).toHaveAttribute('aria-invalid', 'true');
  await expect(routed(page).getByLabel('tangzhong, Hydratation (%)')).toHaveValue('600');
  await expect(routed(page).getByRole('button', { name: 'Enregistrer v2' })).toBeDisabled();
  await expect(routed(page).getByText(/^Ce ratio ne peut pas être appliqué/)).toBeVisible();
  await ratio.fill('6');
  await ratio.press('Enter');
  await expect(ratio).toHaveAttribute('aria-invalid', 'false');
  await expect(routed(page).getByText(/^Ce ratio ne peut pas être appliqué/)).toHaveCount(0);
  await expect(routed(page).getByRole('button', { name: 'Enregistrer v2' })).toBeEnabled();
});

for (const english of [false, true]) {
  test(`planning retains invalid text and explains the blocked start; accepted edits remain drafts${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    await enterEditor(page);
    const water = routed(page).getByLabel(english ? 'Water (g)' : 'Eau (g)', { exact: true });
    const save = () =>
      routed(page)
        .locator('ion-footer')
        .getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true });
    await water.fill('abc');
    await menuAction(page, /^(Planification|Planning)$/);
    const alert = page.locator('ion-alert');
    await expect(alert).toHaveCount(0);
    await expect(
      routed(page).getByRole('button', { name: english ? 'Start at' : 'Commencer à', exact: true }),
    ).toBeVisible();
    await expect(
      routed(page)
        .locator('ion-footer')
        .getByRole('button', {
          name: english ? 'Start preparation' : 'Démarrer la préparation',
          exact: true,
        }),
    ).toBeDisabled();
    await expect(
      routed(page).getByText(
        english
          ? 'Displayed values are the last accepted values. Correct invalid fields before starting.'
          : 'Les valeurs affichées sont celles déjà acceptées. Corriger les champs invalides avant de démarrer.',
        { exact: true },
      ),
    ).toBeVisible();
    await routed(page)
      .getByRole('button', { name: english ? 'Edit' : 'Modifier', exact: true })
      .click();
    await expect(water).toHaveValue('abc');
    await expect(save()).toBeDisabled();
    await water.fill('720');
    await menuAction(page, /^(Planification|Planning)$/);
    await expect(alert).toHaveCount(0);
    await expect(
      routed(page).getByText(english ? 'Unsaved changes' : 'Modifications non enregistrées', {
        exact: true,
      }),
    ).toBeVisible();
    await enterEditor(page);
    await expect(water).toHaveValue('720');
    await save().click();
    await expect(routed(page).getByText('Version 2', { exact: true })).toBeVisible();
  });

  test(`recipe cards name flour percentages once and disabled Save remains a full-size action${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 851 });
    await page.emulateMedia({ colorScheme: english ? 'dark' : 'light' });
    await page.goto('/recipes');
    await expect(
      routed(page).getByText(
        english
          ? 'poolish 30 % of the flour · tangzhong 5 % of the flour'
          : 'poolish 30 % de la farine · tangzhong 5 % de la farine',
        { exact: true },
      ),
    ).toBeVisible();
    await page.getByText('Poolish + tangzhong', { exact: true }).click();
    await enterEditor(page);
    const save = routed(page)
      .locator('ion-footer')
      .getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true });
    await expect(save).toBeDisabled();
    const bounds = await save.boundingBox();
    expect(bounds?.height).toBeGreaterThanOrEqual(48);
    const rendering = await save.evaluate((button) => {
      const style = getComputedStyle(button);
      const root = button.getRootNode();
      const host = root instanceof ShadowRoot ? root.host : button;
      const luminance = (color: string) => {
        const channels = color
          .match(/[\d.]+/g)
          ?.slice(0, 3)
          .map(Number);
        if (!channels || channels.length !== 3) throw new Error(`Unresolved color: ${color}`);
        const linear = channels.map((channel) => {
          const value = channel / 255;
          return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
        });
        return (linear[0] ?? 0) * 0.2126 + (linear[1] ?? 0) * 0.7152 + (linear[2] ?? 0) * 0.0722;
      };
      const ink = luminance(style.color);
      const background = luminance(style.backgroundColor);
      return {
        contrast: (Math.max(ink, background) + 0.05) / (Math.min(ink, background) + 0.05),
        opacity: Number(getComputedStyle(host).opacity),
      };
    });
    expect(rendering.opacity).toBe(1);
    expect(rendering.contrast).toBeGreaterThanOrEqual(4.5);
  });
}

test('active preparation journal keeps more than three notes accessible', async ({ page }) => {
  await open(page);
  await routed(page)
    .locator('ion-footer')
    .getByRole('button', { name: 'Démarrer la préparation', exact: true })
    .click();
  await page.locator('ion-alert').getByRole('button', { name: 'Démarrer', exact: true }).click();
  await expect(page).toHaveURL(/\/bakes\//);
  await expect(routed(page)).toHaveCount(1);
  await routed(page).getByRole('button', { name: 'Commencer : Préferment', exact: true }).click();
  for (const text of ['QA note one', 'QA note two', 'QA note three', 'QA note four']) {
    await routed(page).getByRole('button', { name: 'Note', exact: true }).click();
    const modal = page.locator('ion-modal:not(.overlay-hidden)');
    await modal.locator('textarea').fill(text);
    await modal.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(modal).toBeHidden();
  }
  const journal = routed(page).getByTestId('preparation-journal');
  await expect(journal).toContainText('QA note one');
  await expect(journal).toContainText('QA note four');
});

test('editor sections preserve one raw field and a page-wide invalid state', async ({ page }) => {
  await open(page);
  await enterEditor(page);
  const water = routed(page).getByLabel('Eau (g)', { exact: true });
  await expect(water).toHaveCount(1);
  await water.fill('abc');
  await editorSection(page, 'components');
  await expect(water).toBeHidden();
  await expect(water).toHaveValue('abc');
  await expect(routed(page).getByRole('button', { name: 'Enregistrer v2' })).toBeDisabled();
  await editorSection(page, 'composition');
  await expect(water).toBeVisible();
  await expect(water).toHaveValue('abc');
  await expect(water).toHaveAttribute('aria-invalid', 'true');
});
