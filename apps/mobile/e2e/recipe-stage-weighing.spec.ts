import { expect, test, type Page } from '@playwright/test';
import type { FeedbackExport } from '@flourprint/core/application';
import type { Formula, Process } from '@flourprint/core/domain';
import { routed, enterEditor, editorSection, showPlanning } from './ui-actions';

const stageRecipeId = 'stage-weighing-fixture';
const stageRecipeName = 'Independent stage weighing fixture';

/**
 * Authored independently of the engine: 500 g flour + 350 g water + 10 g salt + 0.35 g yeast.
 * Poolish: 50 g flour + 50 g water = 100 g. Tangzhong: 25 g flour + 125 g water = 150 g.
 * Final additions: 425 g flour + 175 g water + 10 g salt + 0.35 g yeast = 610.35 g.
 * Dough: 860.35 g. An optional 20 g egg glaze is outside the dough's mass.
 * The two component stages have manual durations; no fermentation forecast is needed.
 */
const stageRecipe = (withGlaze = false) => {
  const formula: Formula = {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
      {
        id: 'salt',
        kind: 'other',
        bakerPct: 2,
        role: 'dough',
        water: { status: 'known', valuePct: 0, source: 'Synthetic test profile' },
      },
      {
        id: 'instant-yeast',
        kind: 'other',
        bakerPct: 0.07,
        role: 'dough',
        water: { status: 'known', valuePct: 0, source: 'Synthetic test profile' },
        yeast: { form: 'instant' },
      },
      ...(withGlaze
        ? [
            {
              id: 'egg',
              kind: 'other' as const,
              bakerPct: 4,
              role: 'glaze' as const,
              water: { status: 'known' as const, valuePct: 76, source: 'Synthetic test profile' },
            },
          ]
        : []),
    ],
    components: [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: 10,
        flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
        hydrationPct: 100,
      },
      {
        id: 'tangzhong',
        kind: 'scald',
        flourPct: 5,
        flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
        hydrationPct: 500,
      },
    ],
    anchor: { kind: 'flourTotal', grams: 500 },
  };
  const process: Process = {
    steps: [
      {
        id: 'poolish',
        operation: 'preferment',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 60,
      },
      {
        id: 'tangzhong',
        operation: 'scald',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 60,
      },
      {
        id: 'mix',
        operation: 'mix',
        dependsOn: ['poolish', 'tangzhong'],
        schedule: 'asap',
        plannedDurationS: 300,
      },
      {
        id: 'rest',
        operation: 'rest',
        dependsOn: ['mix'],
        schedule: 'asap',
        plannedDurationS: 600,
      },
    ],
    intendedOutcome: { result: 'dough' },
  };
  return {
    id: stageRecipeId,
    name: stageRecipeName,
    revisions: [
      {
        recipeId: stageRecipeId,
        version: 1,
        createdAt: '2026-10-28T00:00:00.000Z',
        formula,
        process,
      },
    ],
  };
};

const openStageRecipe = async (page: Page) => {
  await expect(page).toHaveURL(/\/recipes$/);
  await routed(page).getByRole('heading', { level: 2, name: stageRecipeName, exact: true }).click();
  await expect(
    routed(page).getByRole('heading', { level: 1, name: stageRecipeName, exact: true }),
  ).toBeVisible();
};

const importStageRecipe = async (page: Page, english: boolean, withGlaze = false) => {
  await page.setViewportSize({ width: 360, height: 851 });
  await page.goto('/advanced');
  await routed(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'independent-stage-weighing.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'flourprint-recipes',
          schemaVersion: 1,
          exportedAt: '2026-10-28T00:00:00.000Z',
          recipes: [stageRecipe(withGlaze)],
          families: [],
        }),
      ),
    });
  await expect(
    routed(page).getByText(english ? '1 recipe imported.' : '1 recette importée.', { exact: true }),
  ).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await openStageRecipe(page);
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
};

/** Exports through the real Advanced action, then returns through app navigation. */
const exportFromStageRecipe = async (page: Page, english: boolean): Promise<FeedbackExport> => {
  await expect(page).toHaveURL(new RegExp(`/recipes/${stageRecipeId}$`));
  await expect(routed(page)).toHaveCount(1);
  await routed(page).locator('ion-header ion-back-button').click();
  await expect(page).toHaveURL(/\/recipes$/);
  await routed(page)
    .getByRole('link', { name: english ? 'Advanced' : 'Avancé', exact: true })
    .click();
  await expect(page).toHaveURL(/\/advanced$/);
  await expect(routed(page)).toHaveCount(1);
  const waitingForDownload = page.waitForEvent('download');
  await routed(page)
    .getByText(
      english ? 'Save all my data as a file' : 'Enregistrer toutes mes données dans un fichier',
      { exact: true },
    )
    .click();
  const download = await waitingForDownload;
  const stream = await download.createReadStream();
  if (!stream) throw new Error('Feedback export did not produce a readable download');
  stream.setEncoding('utf8');
  let text = '';
  for await (const chunk of stream) text += chunk;
  const feedback = JSON.parse(text) as FeedbackExport;
  expect(feedback.kind).toBe('flourprint-feedback');
  await routed(page).locator('ion-back-button').click();
  await expect(page).toHaveURL(/\/recipes$/);
  return feedback;
};

const footer = (page: Page) => routed(page).locator('ion-footer:visible');
const finalTitle = (english: boolean) => (english ? 'Final mix' : 'Mélange final');
const group = (page: Page, title: string) =>
  routed(page).getByRole('group', { name: title, exact: true });
const row = (page: Page, title: string, label: string) =>
  group(page, title).getByRole('checkbox', { name: new RegExp(`^${label} `) });
const progress = (english: boolean, done: number, total: number) =>
  english ? `${done} of ${total}` : `${done} sur ${total}`;
const checklist = (page: Page, english: boolean) =>
  routed(page)
    .locator('section')
    .filter({
      has: page.getByRole('group', { name: finalTitle(english), exact: true }),
    });
const counter = async (
  page: Page,
  english: boolean,
  title: string,
  done: number,
  total: number,
) => {
  await expect(group(page, title).getByRole('checkbox')).toHaveCount(total);
  await expect(
    group(page, title).getByText(progress(english, done, total), { exact: true }),
  ).toBeVisible();
};
const noSavedCheckState = (feedback: FeedbackExport) => {
  const recipe = feedback.backup.recipes.find((item) => item.id === stageRecipeId);
  expect(recipe?.revisions).toHaveLength(1);
  expect(feedback.backup.drafts ?? []).toHaveLength(0);
  expect(feedback.backup.bakes).toHaveLength(0);
  expect(JSON.stringify(recipe)).not.toContain('"weighed"');
};

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  const flour = english ? 'Bread flour' : 'Farine à pain';
  const waterName = english ? 'Water' : 'Eau';
  const yeast = english ? 'Instant yeast' : 'Levure instantanée';
  const final = finalTitle(english);
  const finishing = english ? 'Finishing' : 'Finitions';

  test(`stage weighing separates repeated ingredients and shares checks with Planning${suffix}`, async ({
    page,
  }) => {
    await importStageRecipe(page, english, true);
    for (const [title, ingredient, grams] of [
      ['poolish', flour, '50 g'],
      ['poolish', waterName, '50 g'],
      ['tangzhong', flour, '25 g'],
      ['tangzhong', waterName, '125 g'],
      [final, flour, '425 g'],
      [final, waterName, '175 g'],
    ] as const) {
      await expect(row(page, title, ingredient)).toHaveAccessibleName(new RegExp(`${grams} `));
    }
    await expect(row(page, final, yeast)).toBeVisible();
    await expect(row(page, final, yeast)).toHaveAccessibleName(
      english ? /0\.4 g 0\.07%$/ : /0,4 g 0,07\s%$/,
    );
    await expect(row(page, finishing, english ? 'Egg' : 'Œuf')).toHaveAccessibleName(/20 g 4\s?%$/);
    await counter(page, english, 'poolish', 0, 2);
    await counter(page, english, 'tangzhong', 0, 2);
    await counter(page, english, final, 0, 4);
    await counter(page, english, finishing, 0, 1);
    await expect(routed(page).getByRole('checkbox')).toHaveCount(9);
    await row(page, 'poolish', waterName).check();
    await expect(row(page, 'tangzhong', waterName)).not.toBeChecked();
    await expect(row(page, final, waterName)).not.toBeChecked();
    await row(page, final, flour).check();
    await expect(row(page, 'poolish', flour)).not.toBeChecked();
    await row(page, 'tangzhong', flour).check();
    await row(page, final, yeast).check();
    await counter(page, english, 'poolish', 1, 2);
    await counter(page, english, 'tangzhong', 1, 2);
    await counter(page, english, final, 2, 4);
    await expect(
      checklist(page, english).getByText(progress(english, 4, 9), { exact: true }),
    ).toBeVisible();
    await showPlanning(page);
    await expect(row(page, 'poolish', waterName)).toBeChecked();
    await expect(row(page, final, flour)).toBeChecked();
    await expect(row(page, final, yeast)).toBeChecked();
    await row(page, 'poolish', waterName).uncheck();
    await expect(
      checklist(page, english).getByText(progress(english, 3, 9), { exact: true }),
    ).toBeVisible();
    await routed(page)
      .getByRole('button', { name: english ? 'Recipe' : 'Recette', exact: true })
      .click();
    await expect(row(page, 'poolish', waterName)).not.toBeChecked();
    await expect(row(page, 'tangzhong', flour)).toBeChecked();
    await expect(row(page, final, flour)).toBeChecked();
    await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
    noSavedCheckState(await exportFromStageRecipe(page, english));
  });

  test(`stage weighing transfers only selected row identities after a successful start${suffix}`, async ({
    page,
  }) => {
    await importStageRecipe(page, english);
    await expect(group(page, finishing)).toHaveCount(0);
    await expect(routed(page).getByRole('checkbox')).toHaveCount(8);
    await row(page, 'poolish', flour).check();
    await row(page, 'tangzhong', waterName).check();
    await row(page, final, flour).check();
    await row(page, final, yeast).check();
    const start = footer(page).getByRole('button', {
      name: english ? 'Start preparation' : 'Démarrer la préparation',
      exact: true,
    });
    await start.click();
    const confirmation = page.locator('ion-alert:not(.overlay-hidden)');
    await confirmation
      .getByRole('button', { name: english ? 'Cancel' : 'Annuler', exact: true })
      .click();
    await expect(confirmation).toBeHidden();
    await expect(
      checklist(page, english).getByText(progress(english, 4, 8), { exact: true }),
    ).toBeVisible();
    await start.click();
    await confirmation
      .getByRole('button', { name: english ? 'Start' : 'Démarrer', exact: true })
      .click();
    await expect(page).toHaveURL(/\/bakes\/[^/]+$/);
    await expect(routed(page)).toHaveCount(1);
    await routed(page).locator('ion-header ion-back-button').click();
    await expect(page).toHaveURL(new RegExp(`/recipes/${stageRecipeId}$`));
    await expect(routed(page).getByRole('checkbox', { checked: true })).toHaveCount(0);
    await expect(
      checklist(page, english).getByText(progress(english, 0, 8), { exact: true }),
    ).toBeVisible();
    const feedback = await exportFromStageRecipe(page, english);
    const events = feedback.backup.bakes.flatMap((bake) => bake.events);
    const started = events.find((event) => event.payload.type === 'BakeStarted')?.payload;
    if (!started || started.type !== 'BakeStarted') throw new Error('Export has no BakeStarted');
    const expected = [
      {
        stage: { kind: 'component', id: 'poolish' },
        item: { kind: 'ingredient', id: 'bread-flour' },
      },
      { stage: { kind: 'component', id: 'tangzhong' }, item: { kind: 'water' } },
      { stage: { kind: 'final' }, item: { kind: 'ingredient', id: 'bread-flour' } },
      { stage: { kind: 'final' }, item: { kind: 'ingredient', id: 'instant-yeast' } },
    ];
    expect(started.weighed).toHaveLength(4);
    expect(started.weighed).toEqual(expect.arrayContaining(expected));
    for (const checked of started.weighed ?? [])
      expect(Object.keys(checked).sort()).toEqual(['item', 'stage']);
    expect(started.snapshot.resolvedFormula.flourTotal).toBe(500);
    expect(started.snapshot.resolvedFormula.doughWeight).toBeCloseTo(860.35, 9);
    expect(started.snapshot.resolvedFormula.finalMix.flourByFlour['bread-flour']).toBe(425);
    expect(started.snapshot.resolvedFormula.finalMix.water).toBe(175);
    expect(started.snapshot.resolvedFormula.finalMix.grams['instant-yeast']).toBeCloseTo(0.35, 10);
    expect(
      feedback.backup.recipes.find((recipe) => recipe.id === stageRecipeId)?.revisions,
    ).toHaveLength(1);
    expect(feedback.backup.drafts ?? []).toHaveLength(0);
  });

  test(`stage weighing prunes an absent row without clearing another stage and resets on saved revision${suffix}`, async ({
    page,
  }) => {
    await importStageRecipe(page, english);
    await row(page, 'poolish', waterName).check();
    await row(page, 'tangzhong', waterName).check();
    await row(page, final, waterName).check();
    await enterEditor(page);
    const hydration = () =>
      routed(page).getByRole('textbox', {
        name: english ? /^(poolish|biga), Hydration \(%\)$/ : /^(poolish|biga), Hydratation \(%\)$/,
      });
    await editorSection(page, 'components');
    await hydration().fill('0');
    await hydration().press('Enter');
    await editorSection(page, 'result');
    await expect(group(page, 'biga')).toBeVisible();
    await expect(group(page, 'biga').getByRole('checkbox')).toHaveCount(1);
    await expect(
      group(page, 'biga').getByRole('checkbox', {
        name: new RegExp(`^${waterName} `),
      }),
    ).toHaveCount(0);
    await expect(row(page, final, waterName)).toBeChecked();
    await expect(row(page, final, waterName)).toHaveAccessibleName(/225 g /);
    await expect(row(page, 'tangzhong', waterName)).toBeChecked();
    await expect(
      checklist(page, english).getByText(progress(english, 2, 7), { exact: true }),
    ).toBeVisible();
    await editorSection(page, 'components');
    await hydration().fill('100');
    await hydration().press('Enter');
    await editorSection(page, 'result');
    await expect(row(page, 'poolish', waterName)).not.toBeChecked();
    await expect(row(page, final, waterName)).toBeChecked();
    await expect(row(page, 'tangzhong', waterName)).toBeChecked();
    await editorSection(page, 'composition');
    const salt = routed(page).getByRole('textbox', {
      name: english ? 'Salt (g)' : 'Sel (g)',
      exact: true,
    });
    await salt.fill('11');
    await salt.press('Enter');
    await footer(page)
      .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
      .click();
    await expect(routed(page).getByText('Version 2', { exact: true })).toBeVisible();
    await expect(routed(page).getByRole('checkbox', { checked: true })).toHaveCount(0);
    await expect(
      checklist(page, english).getByText(progress(english, 0, 8), { exact: true }),
    ).toBeVisible();
  });
}
