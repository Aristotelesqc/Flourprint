import { expect, test, type Locator, type Page } from '@playwright/test';
import { expectRecipeRevision, editorSection, enterEditor, routed } from './ui-actions';

const recipeName = 'Shared recipe surface fixture';
const mixName = 'Mixing fixture';
const restName = 'Rest fixture';
const bakeName = 'Cooking fixture';
const preheatName = 'Oven warmup fixture';

/**
 * Deliberately authored outside core: 500 g flour, 350 g water, 100 g milk at 90% water,
 * and 50 g egg at 76% water [75–77] give 478 g water, or 95.6% hydration (96% displayed).
 * A further 50 g of butter with unknown composition cannot contribute an invented zero.
 */
const syntheticRecipe = (unknownWater: boolean, estimatedPartial = false, loss = false) => ({
  id: 'shared-recipe-surface-fixture',
  name: recipeName,
  revisions: [
    {
      recipeId: 'shared-recipe-surface-fixture',
      version: 1,
      createdAt: '2026-10-27T12:00:00.000Z',
      formula: {
        flours: [{ id: 'bread-flour', sharePct: 100 }],
        ingredients: [
          { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
          {
            id: 'milk',
            kind: 'other',
            bakerPct: 20,
            role: 'dough',
            water: { status: 'known', valuePct: 90, source: 'Synthetic test profile' },
          },
          {
            id: 'egg',
            kind: 'other',
            bakerPct: 10,
            role: 'dough',
            water:
              unknownWater && !estimatedPartial
                ? { status: 'known', valuePct: 76, source: 'Synthetic test profile' }
                : {
                    status: 'estimated',
                    valuePct: 76,
                    rangePct: [75, 77],
                    source: 'Synthetic test profile',
                  },
          },
          ...(unknownWater
            ? [
                {
                  id: 'butter',
                  kind: 'other',
                  bakerPct: 10,
                  role: 'dough',
                  water: { status: 'unknown' },
                },
              ]
            : []),
        ],
        components: loss
          ? [
              {
                id: 'scald',
                kind: 'scald',
                flourPct: 10,
                hydrationPct: 100,
                flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
                waterLossPct: 20,
              },
            ]
          : [],
        anchor: { kind: 'flourTotal', grams: 500 },
      },
      process: {
        steps: [
          ...(loss
            ? [
                {
                  id: 'scald',
                  operation: 'scald',
                  dependsOn: [],
                  schedule: 'asap',
                  plannedDurationS: 300,
                },
              ]
            : []),
          {
            id: 'mix-fixture',
            label: mixName,
            operation: 'mix',
            dependsOn: loss ? ['scald'] : [],
            schedule: 'asap',
            plannedDurationS: 300,
            technique: {
              method: 'standMixer',
              phases: [
                { speed: 'low', durationS: 120 },
                { speed: 'medium', durationS: 180 },
              ],
              folds: { count: 2, intervalS: 60, style: 'coilFold' },
              endCheck: 'windowpane',
            },
          },
          {
            id: 'rest-fixture',
            label: restName,
            operation: 'rest',
            dependsOn: ['mix-fixture'],
            schedule: 'asap',
            plannedDurationS: 600,
          },
          {
            id: 'preheat-fixture',
            label: preheatName,
            operation: 'preheat',
            dependsOn: ['mix-fixture'],
            schedule: 'beforeTarget',
            target: 'bake-fixture',
            requiredWarmupS: 600,
          },
          {
            id: 'bake-fixture',
            label: bakeName,
            operation: 'bake',
            dependsOn: ['rest-fixture'],
            schedule: 'asap',
            plannedDurationS: 1200,
          },
        ],
      },
    },
  ],
});

const importRecipe = async (
  page: Page,
  unknownWater: boolean,
  english: boolean,
  estimatedPartial = false,
  theme = 'light',
  large = false,
  loss = false,
) => {
  await page.setViewportSize({ width: large ? 360 : 393, height: 900 });
  await page.goto('/advanced');
  await routed(page)
    .getByRole('button', {
      name:
        theme === 'amoled'
          ? /^AMOLED$/
          : theme === 'dark'
            ? /^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/
            : /^(Clair|Light)$/,
    })
    .click();
  await routed(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'synthetic-shared-recipe.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'flourprint-recipes',
          schemaVersion: 1,
          exportedAt: '2026-10-27T12:00:00.000Z',
          recipes: [syntheticRecipe(unknownWater, estimatedPartial, loss)],
          families: [],
        }),
      ),
    });
  await expect(
    routed(page).getByText(english ? '1 recipe imported.' : '1 recette importée.', { exact: true }),
  ).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/recipes$/);
  await routed(page).getByText(recipeName, { exact: true }).click();
  await expectRecipeRevision(page, 1);
  if (large) await page.addStyleTag({ content: 'html,body{font-size:20.8px!important}' });
};

const stepTrigger = (page: Page, english: boolean, name: string) =>
  routed(page).getByRole('button', {
    name: english ? `Edit step ${name}` : `Modifier l’étape ${name}`,
    exact: true,
  });

// Ionic's dialog role is inside its shadow root; the slotted content belongs to the host.
const overlayWithHeading = (page: Page, title: string) =>
  page.locator('ion-modal:not(.overlay-hidden)').filter({
    has: page.getByRole('heading', { name: title, exact: true }),
  });

const stepSheet = (page: Page) =>
  page.locator('ion-modal:not(.overlay-hidden)').filter({
    has: page.getByRole('combobox', { name: /^(Operation|Opération)$/, exact: true }),
  });

const settledOverlay = async (overlay: Locator) =>
  overlay.evaluate(async (host) => {
    await Promise.all(
      host.getAnimations({ subtree: true }).map((animation) => animation.finished.catch(() => {})),
    );
  });

const expectMixControls = async (sheet: Locator, english: boolean) => {
  await expect(
    sheet.getByRole('combobox', { name: english ? 'Operation' : 'Opération', exact: true }),
  ).toHaveValue('mix');
  await expect(
    sheet.getByRole('textbox', {
      name: english ? 'Step name (optional)' : 'Nom de l’étape (facultatif)',
      exact: true,
    }),
  ).toHaveValue(mixName);
  await expect(
    sheet.getByRole('combobox', { name: english ? 'Method' : 'Méthode', exact: true }),
  ).toHaveValue('standMixer');
  await expect(
    sheet.getByRole('combobox', {
      name: english ? 'Phase 1 speed' : 'Vitesse de la phase 1',
      exact: true,
    }),
  ).toHaveValue('low');
  await expect(
    sheet.getByRole('combobox', {
      name: english ? 'Phase 2 speed' : 'Vitesse de la phase 2',
      exact: true,
    }),
  ).toHaveValue('medium');
  await expect(
    sheet.getByRole('textbox', {
      name: english ? 'Phase 1 duration' : 'Durée de la phase 1',
      exact: true,
    }),
  ).toHaveValue('2 min');
  await expect(
    sheet.getByRole('textbox', {
      name: english ? 'Phase 2 duration' : 'Durée de la phase 2',
      exact: true,
    }),
  ).toHaveValue('3 min');
  await expect(
    sheet.getByRole('textbox', {
      name: english ? 'Number of sets' : 'Nombre de séries',
      exact: true,
    }),
  ).toHaveValue('2');
  await expect(
    sheet.getByRole('textbox', {
      name: english ? 'Interval between sets' : 'Intervalle entre les séries',
      exact: true,
    }),
  ).toHaveValue('1 min');
  await expect(sheet.getByRole('combobox', { name: 'Style', exact: true })).toHaveValue('coilFold');
  await expect(
    sheet.getByRole('combobox', {
      name: english ? 'End of the step' : 'Fin de l’étape',
      exact: true,
    }),
  ).toHaveValue('windowpane');
  await expect(
    sheet.getByRole('button', {
      name: english ? '+ Add a phase' : '+ Ajouter une phase',
      exact: true,
    }),
  ).toBeVisible();
};

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  const title = english ? 'Hydration breakdown' : 'Détail de l’hydratation';
  const close = english ? 'Close' : 'Fermer';
  const deleteStep = english ? 'Delete step' : 'Supprimer l’étape';

  test(`shared hydration sheet preserves source details, range and whole-percent total${suffix}`, async ({
    page,
  }) => {
    await importRecipe(page, false, english);
    const trigger = routed(page).getByRole('button', { name: title, exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
    const sheet = overlayWithHeading(page, title);
    await expect(sheet.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(sheet.getByRole('button', { name: close, exact: true })).toHaveCount(1);
    await expect(sheet.getByText(english ? /^478 g · ≈ 96%$/ : /^478 g · ≈ 96\s%$/)).toBeVisible();
    await expect(sheet.getByText(english ? /^478 g · ≈ 96%$/ : /^478 g · ≈ 96\s%$/)).toBeInViewport(
      { ratio: 1 },
    );
    await expect(sheet).not.toContainText(/95[.,]6\s*%/);

    const water = sheet.getByRole('button', { name: english ? /^Water 350 g / : /^Eau 350 g / });
    await expect(water).toHaveAttribute('aria-expanded', 'false');
    await water.click();
    await expect(water).toHaveAttribute('aria-expanded', 'true');
    await expect(
      sheet.getByText(
        english
          ? 'Water added directly to the dough or component.'
          : 'Eau ajoutée directement à la pâte ou à la préparation.',
        { exact: true },
      ),
    ).toBeVisible();

    await sheet.getByRole('button', { name: english ? /^Milk 90 g / : /^Lait 90 g / }).click();
    await expect(
      sheet.getByText(
        english
          ? 'Known water content from ingredient composition.'
          : 'Teneur en eau connue selon la composition de l’ingrédient.',
        { exact: true },
      ),
    ).toBeVisible();

    const egg = sheet.getByRole('button', {
      name: english ? /^Egg 38 g \[38 g – 39 g\] / : /^Œuf 38 g \[38 g – 39 g\] /,
    });
    await egg.click();
    await expect(
      sheet.getByText(
        english
          ? 'Estimated water content between 38 g and 39 g.'
          : 'Teneur en eau estimée entre 38 g et 39 g.',
        { exact: true },
      ),
    ).toBeVisible();
    await settledOverlay(sheet);
    await page.screenshot({ path: test.info().outputPath('hydration-sheet.png') });
    await sheet.getByRole('button', { name: close, exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test(`shared hydration sheet keeps an unknown ingredient incomplete and lower-bounded${suffix}`, async ({
    page,
  }) => {
    await importRecipe(page, true, english);
    const trigger = routed(page).getByRole('button', { name: title, exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
    const sheet = overlayWithHeading(page, title);
    await expect(
      sheet.getByText(english ? /^≥ 478 g · ≥ 96%$/ : /^≥ 478 g · ≥ 96\s%$/),
    ).toBeVisible();
    await expect(
      sheet.getByText(english ? /^≥ 478 g · ≥ 96%$/ : /^≥ 478 g · ≥ 96\s%$/),
    ).toBeInViewport({ ratio: 1 });
    await expect(
      sheet.getByText(
        english
          ? 'Hydration is incomplete: water content not specified for Butter.'
          : 'Hydratation incomplète : teneur en eau non renseignée pour Beurre.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(sheet.getByText(english ? 'unknown' : 'inconnue', { exact: true })).toBeVisible();
    await expect(sheet.getByText(english ? 'Butter' : 'Beurre', { exact: true })).toBeVisible();
    await expect(
      sheet.getByRole('button', { name: english ? /^Butter / : /^Beurre / }),
    ).toHaveCount(0);
    await expect(sheet.getByText(/^0 g$/)).toHaveCount(0);
    await expect(sheet).not.toContainText('≈');
    await settledOverlay(sheet);
    await page.screenshot({ path: test.info().outputPath('hydration-sheet.png') });
    await sheet.getByRole('button', { name: close, exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test(`shared hydration sheet labels an estimated specified part without claiming a bound${suffix}`, async ({
    page,
  }) => {
    await importRecipe(page, true, english, true);
    const trigger = routed(page).getByRole('button', { name: title, exact: true });
    await trigger.click();
    await expect(page.getByRole('dialog', { name: title, exact: true })).toBeVisible();
    const sheet = overlayWithHeading(page, title);
    const summary = sheet.getByText(
      english
        ? /^Specified part \(estimated\): 478 g · 96%$/
        : /^Partie renseignée \(estimée\) : 478 g · 96\s%$/,
    );
    await expect(summary).toBeVisible();
    await expect(summary).toBeInViewport({ ratio: 1 });
    await expect(sheet).not.toContainText('≥');
    await expect(sheet).not.toContainText('≈');
    await expect(sheet.getByText(english ? 'unknown' : 'inconnue', { exact: true })).toBeVisible();
    await expect(
      sheet.getByRole('button', {
        name: english ? /^Egg 38 g \[38 g – 39 g\] / : /^Œuf 38 g \[38 g – 39 g\] /,
      }),
    ).toBeVisible();
    await settledOverlay(sheet);
    await page.screenshot({ path: test.info().outputPath('hydration-sheet.png') });
    await sheet.getByRole('button', { name: close, exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(trigger).toBeFocused();
  });
  for (const theme of ['light', 'dark', 'amoled']) {
    for (const large of [false, true]) {
      test(`water source legend fits ${theme} ${large ? '360/130' : '393/100'}${suffix}`, async ({
        page,
      }, testInfo) => {
        await importRecipe(page, true, english, true, theme, large);
        const trigger = routed(page).getByRole('button', { name: title, exact: true });
        await trigger.click();
        const sheet = overlayWithHeading(page, title);
        await expect(sheet.getByRole('button', { name: close, exact: true })).toBeFocused();
        const bar = sheet.getByTestId('water-source-bar');
        await expect(bar).toBeVisible();
        await expect(bar).toHaveAttribute('aria-hidden', 'true');
        await expect(bar.getByRole('button')).toHaveCount(0);
        const segments = sheet.getByTestId('water-source-segment');
        await expect(segments).toHaveCount(3);
        // Independent fixture: 350/478, 90/478 and 38/478, before any evaporation.
        const shares = [73.22, 18.83, 7.95];
        for (const [index, share] of shares.entries()) {
          const basis = await segments
            .nth(index)
            .evaluate((element) => parseFloat(getComputedStyle(element).flexBasis));
          expect(basis).toBeCloseTo(share, 2);
        }
        await expect(
          sheet.locator('[data-testid="water-source-segment"][data-source="butter"]'),
        ).toHaveCount(0);
        await expect(sheet.getByTestId('water-source-unknown')).toHaveCount(1);
        const legend = sheet.getByTestId('water-source-legend');
        await expect(legend).toContainText(english ? '73.22%' : /73,22\s%/);
        await expect(legend).toContainText(english ? '18.83%' : /18,83\s%/);
        await expect(legend).toContainText(english ? '7.95%' : /7,95\s%/);
        const milk = legend.getByRole('button', { name: english ? /^Milk / : /^Lait / });
        await milk.click();
        await expect(milk).toHaveAttribute('aria-expanded', 'true');
        await expect(
          legend.getByText(
            english
              ? 'Known water content from ingredient composition.'
              : 'Teneur en eau connue selon la composition de l’ingrédient.',
            { exact: true },
          ),
        ).toBeVisible();
        await milk.click();
        await settledOverlay(sheet);
        const bounds = await bar.boundingBox();
        if (!bounds) throw new Error('Water source bar has no bounds');
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(large ? 360 : 393);
        expect(await sheet.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(
          true,
        );
        const capture = testInfo.outputPath('hydration-source-legend.png');
        await page.screenshot({ path: capture });
        await testInfo.attach('Hydration source legend', {
          path: capture,
          contentType: 'image/png',
        });
        await sheet.getByRole('button', { name: close, exact: true }).click();
        await expect(trigger).toBeFocused();
      });
    }
  }

  test(`water source chart excludes evaporation losses from its denominator${suffix}`, async ({
    page,
  }) => {
    await importRecipe(page, false, english, false, 'light', false, true);
    await routed(page).getByRole('button', { name: title, exact: true }).click();
    const sheet = overlayWithHeading(page, title);
    await expect(sheet.getByText(english ? /^468 g · ≈ 94%$/ : /^468 g · ≈ 94\s%$/)).toBeVisible();
    await expect(sheet.getByTestId('water-source-segment')).toHaveCount(3);
    const lossRow = sheet.getByRole('button', { name: /scald/i });
    await expect(lossRow).toContainText('-10 g');
    await expect(lossRow).not.toContainText('%');
    await lossRow.click();
    await expect(
      sheet.getByText(
        english
          ? 'Declared evaporation loss for scald.'
          : 'Perte par évaporation déclarée pour scald.',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(sheet.getByTestId('water-source-legend')).toContainText(
      english ? '73.22%' : /73,22\s%/,
    );
  });

  test(`checked step removal explains a preheat target refusal and accepts repeated confirmation once${suffix}`, async ({
    page,
  }) => {
    await importRecipe(page, false, english);
    await enterEditor(page);
    await editorSection(page, 'steps');
    await stepTrigger(page, english, mixName).click();
    await expectMixControls(stepSheet(page), english);
    await stepSheet(page).getByRole('button', { name: close, exact: true }).click();
    await expect(stepSheet(page)).toBeHidden();

    await stepTrigger(page, english, bakeName).click();
    const cookingSheet = stepSheet(page);
    await cookingSheet.getByRole('button', { name: deleteStep, exact: true }).click();
    const refusalConfirmation = overlayWithHeading(page, bakeName);
    await refusalConfirmation.getByRole('button', { name: deleteStep, exact: true }).click();
    await expect(refusalConfirmation).toBeHidden();
    await expect(cookingSheet.getByRole('alert')).toHaveText(
      english
        ? `Cannot delete ${bakeName}: it is the target of ${preheatName}. Retarget or remove ${preheatName} first.`
        : `Impossible de supprimer ${bakeName} : cette étape est la cible de ${preheatName}. Réassigner la cible ou retirer ${preheatName} d'abord.`,
    );
    await cookingSheet.getByRole('button', { name: close, exact: true }).click();
    await expect(cookingSheet).toBeHidden();
    await expect(stepTrigger(page, english, bakeName)).toBeVisible();
    await expect(stepTrigger(page, english, preheatName)).toBeVisible();

    await stepTrigger(page, english, restName).click();
    await stepSheet(page).getByRole('button', { name: deleteStep, exact: true }).click();
    const acceptedConfirmation = overlayWithHeading(page, restName);
    // Two activations in the same task model a repeated confirmation before React can dismiss it.
    await acceptedConfirmation
      .getByRole('button', { name: deleteStep, exact: true })
      .evaluate((button) => {
        (button as HTMLElement).click();
        (button as HTMLElement).click();
      });
    await expect(acceptedConfirmation).toBeHidden();
    await expect(page.locator('ion-modal:not(.overlay-hidden)')).toHaveCount(0);
    await expect(page.locator('ion-router-outlet')).not.toHaveAttribute('aria-hidden', 'true');
    await expect(stepTrigger(page, english, restName)).toHaveCount(0);
    await expect(stepTrigger(page, english, bakeName)).toBeVisible();
    await expect(stepTrigger(page, english, preheatName)).toBeVisible();

    // A single accepted edit creates one undo entry; the refused delete creates none.
    const undo = routed(page)
      .locator('ion-footer')
      .getByRole('button', {
        name: english ? 'Undo last change' : 'Annuler la dernière modification',
        exact: true,
      });
    await undo.click();
    await expect(stepTrigger(page, english, restName)).toBeVisible();
    await expect(undo).toBeDisabled();
    await stepTrigger(page, english, mixName).click();
    await expectMixControls(stepSheet(page), english);
  });
}
