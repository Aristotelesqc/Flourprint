import { expect, test } from './fixtures';
import { editorSection, enterEditor, routed } from './ui-actions';
import type { Page } from '@playwright/test';
import type { Process } from '@flourprint/core/domain';
import fermentation from '../../../docs/contracts/fixtures/fermentation/cases.json' with { type: 'json' };

/**
 * The dough starts from the first-contact step (its clock at the end of it) and the water temperature reads the reference mixing
 * step (fermentation.md, Dough temperature, Water temperature). When the two steps differ, the
 * Fermentation card edits the room on each, where it is read; with one step it keeps one field.
 */
const formula = fermentation.cases[0]?.formula;

const process: Process = {
  steps: [
    {
      id: 'frasage',
      operation: 'frasage',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 300,
      incorporations: [
        { item: 'flour', id: 'flour', sharePct: 100 },
        { item: 'water', sharePct: 100 },
        { item: 'ingredient', id: 'salt', sharePct: 100 },
        { item: 'ingredient', id: 'yeast', sharePct: 100 },
      ],
      conditions: { temperatureC: 24 },
    },
    {
      id: 'mix',
      operation: 'mix',
      dependsOn: ['frasage'],
      schedule: 'asap',
      plannedDurationS: 480,
    },
    { id: 'bulk', operation: 'bulk', dependsOn: ['mix'], schedule: 'asap', plannedDurationS: 3600 },
    {
      id: 'bake',
      operation: 'bake',
      dependsOn: ['bulk'],
      schedule: 'asap',
      plannedDurationS: 2400,
    },
  ],
};

const importRecipe = async (page: Page) => {
  await page.goto('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'qa-two-rooms.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-11-04T00:00:00.000Z',
        families: [],
        recipes: [
          {
            id: 'qa-two-rooms',
            name: 'QA — deux pièces',
            revisions: [
              {
                recipeId: 'qa-two-rooms',
                version: 1,
                createdAt: '2026-11-04T00:00:00.000Z',
                formula,
                process,
              },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByText(/1 (recette importée|recipe imported)/)).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await routed(page).getByText('QA — deux pièces', { exact: true }).click();
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  await enterEditor(page);
  await editorSection(page, 'result');
};

test('fermentation: a frasage then a mix edits the room at the first contact and for the water', async ({
  page,
}) => {
  await importRecipe(page);
  const card = routed(page);
  // The frasage brings the yeast and carries 24 °C: the dough starts there.
  const start = card.getByLabel('Température ambiante au premier contact (°C)');
  await expect(start).toHaveValue('24');
  // The room of the water is only asked in advanced mode.
  await expect(card.getByLabel('Température ambiante pour l’eau (°C)')).toHaveCount(0);
  await card.getByText('Avancé', { exact: true }).click();
  const target = card.getByLabel('Température de pâte visée (°C)');
  await target.fill('26');
  await target.press('Enter');
  // The mix has no room yet: the water cannot be calculated, and the field to fill is there.
  const water = card.getByLabel('Température ambiante pour l’eau (°C)');
  await expect(water).toHaveValue('');
  await expect(card.getByText(/^Eau à /)).toHaveCount(0);
  await water.fill('24');
  await water.press('Enter');
  // 3 × 26 − 24 (room) − 24 (flour) = 30
  await expect(card.getByText('Eau à 30 °C')).toBeVisible();
  // The first-contact room is untouched.
  await expect(start).toHaveValue('24');
});

test('fermentation: one room field when the first contact is the reference mixing step @en', async ({
  page,
}) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  await enterEditor(page);
  await editorSection(page, 'result');
  await routed(page).getByText('Advanced', { exact: true }).click();
  await expect(routed(page).getByLabel(/^Room temperature \(/)).toHaveCount(1);
  await expect(routed(page).getByLabel(/Room temperature for the water/)).toHaveCount(0);
  await expect(routed(page).getByLabel(/Room temperature at first contact/)).toHaveCount(0);
});
