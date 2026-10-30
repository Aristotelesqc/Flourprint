import { expect, test, type Page } from '@playwright/test';
import type { Process } from '@flourprint/core/domain';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const recipeName = 'Step duplication fixture';
const recipeId = 'step-duplication-fixture';
const method = (page: Page) => routed(page).getByTestId('recipe-method');
const footer = (page: Page) => routed(page).locator('ion-footer');
const save = (page: Page) => footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/ });
const sheet = (page: Page) => page.locator('ion-modal').filter({ visible: true });
const stepCount = (page: Page) => method(page).locator('[data-sortable-id]').count();

const fixtureProcess = (model = false): Process => ({
  steps: [
    {
      id: 'poolish',
      operation: 'preferment',
      label: 'Preferment',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 600,
    },
    {
      id: 'mix',
      operation: 'mix',
      label: 'Alpha',
      dependsOn: ['poolish'],
      schedule: 'asap',
      plannedDurationS: 300,
      incorporations: [
        { item: 'component', id: 'poolish', sharePct: 100 },
        { item: 'flour', id: 'bread-flour', sharePct: 100 },
        { item: 'water', sharePct: 100 },
      ],
    },
    {
      id: 'bulk',
      operation: 'bulk',
      label: 'Beta',
      dependsOn: ['mix'],
      schedule: 'asap',
      plannedDurationS: 10_800,
      ...(model ? { durationMode: 'model' as const } : {}),
    },
    {
      id: 'shape',
      operation: 'shape',
      label: 'Gamma',
      dependsOn: ['bulk'],
      schedule: 'asap',
      plannedDurationS: 600,
    },
    {
      id: 'preheat',
      operation: 'preheat',
      label: 'Timed heating',
      dependsOn: ['mix'],
      schedule: 'beforeTarget',
      target: 'bake',
      requiredWarmupS: 600,
    },
    {
      id: 'cool',
      operation: 'rest',
      label: 'Cooling',
      dependsOn: ['mix'],
      schedule: 'alap',
      plannedDurationS: 600,
    },
    {
      id: 'bake',
      operation: 'bake',
      label: 'Baking',
      dependsOn: ['shape', 'cool'],
      schedule: 'asap',
      plannedDurationS: 1200,
    },
  ],
});

async function open(page: Page, model = false, theme = 'light', large = false) {
  await page.setViewportSize({ width: large ? 360 : 393, height: 900 });
  await page.goto('/advanced');
  const themeName =
    theme === 'amoled'
      ? /^AMOLED$/
      : theme === 'dark'
        ? /^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/
        : /^(Clair|Light)$/;
  await routed(page).getByRole('button', { name: themeName }).click();
  await routed(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'step-duplication.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'flourprint-recipes',
          schemaVersion: 1,
          exportedAt: '2026-10-30T12:00:00.000Z',
          families: [],
          recipes: [
            {
              id: recipeId,
              name: recipeName,
              revisions: [
                {
                  recipeId,
                  version: 1,
                  createdAt: '2026-10-30T12:00:00.000Z',
                  formula: {
                    flours: [{ id: 'bread-flour', sharePct: 100 }],
                    ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
                    components: [
                      {
                        id: 'poolish',
                        kind: 'preferment',
                        flourPct: 30,
                        hydrationPct: 100,
                        flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
                      },
                    ],
                    anchor: { kind: 'flourTotal', grams: 500 },
                  },
                  process: fixtureProcess(model),
                },
              ],
            },
          ],
        }),
      ),
    });
  await expect(
    routed(page).getByText(/^(1 recipe imported\.|1 recette importée\.)$/),
  ).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await routed(page).getByRole('heading', { name: recipeName, level: 2 }).click();
  await expectRecipeRevision(page, 1);
  if (large) await page.addStyleTag({ content: 'html,body{font-size:20.8px!important}' });
  await enterEditor(page);
}

async function editStep(page: Page, label: string) {
  await method(page)
    .getByRole('button', { name: new RegExp(`^(Edit step|Modifier l’étape) ${label}$`) })
    .first()
    .click();
  await expect(sheet(page)).toHaveCount(1);
}

async function storedProcess(page: Page): Promise<Process | undefined> {
  return page.evaluate(async (id) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('flourprint-preview', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      const snapshot = await new Promise<unknown>((resolve, reject) => {
        const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      if (typeof snapshot !== 'string') return undefined;
      const backup = JSON.parse(snapshot) as {
        recipes: { id: string; revisions: { process: Process }[] }[];
      };
      return backup.recipes.find((recipe) => recipe.id === id)?.revisions.at(-1)?.process;
    } finally {
      db.close();
    }
  }, recipeId);
}

const duplicate = (page: Page) =>
  sheet(page).getByRole('button', { name: /^(Duplicate step|Dupliquer l'étape)$/ });
const review = (page: Page) =>
  page.locator('ion-modal:visible').filter({
    has: page.getByText(/^(Duplicate step proposal|Proposition de duplication d'étape)$/),
  });
const keep = (page: Page) =>
  review(page).getByRole('button', { name: /^(Keep copy|Conserver la copie)$/ });
const cancel = (page: Page) =>
  review(page)
    .getByRole('button', { name: /^(Cancel|Annuler)$/, exact: true })
    .last();
const closeStep = (page: Page) =>
  sheet(page).getByRole('button', { name: /^(Close|Fermer)$/, exact: true });

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';

  test(`Step duplication proposes before keeping and uses draft Undo Redo Save${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await editStep(page, 'Beta');
    await duplicate(page).click();
    await expect(review(page)).toHaveCount(1);
    await expect(
      review(page).getByText(english ? 'Planned duration: 3 h' : 'Durée prévue : 3 h', {
        exact: true,
      }),
    ).toBeVisible();
    // Seven source steps remain in storage while the proposal is reviewed.
    expect((await storedProcess(page))?.steps).toHaveLength(7);
    await expect.poll(() => stepCount(page)).toBe(7);
    await cancel(page).click();
    await expect(review(page)).toHaveCount(0);
    await expect(save(page)).toBeDisabled();
    await expect(
      method(page).getByRole('button', { name: /^(Edit step|Modifier l’étape) Beta$/ }),
    ).toBeFocused();

    await editStep(page, 'Beta');
    await duplicate(page).click();
    await keep(page).dblclick({ delay: 20 });
    await expect(review(page)).toHaveCount(0);
    await expect(closeStep(page)).toBeVisible();
    await closeStep(page).click();
    await expect.poll(() => stepCount(page)).toBe(8);
    await expect(save(page)).toBeEnabled();
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await expect.poll(() => stepCount(page)).toBe(7);
    await expect(save(page)).toBeDisabled();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/ })
      .click();
    await expect.poll(() => stepCount(page)).toBe(8);
    await save(page).click();
    await expectRecipeRevision(page, 2);
    const saved = await storedProcess(page);
    const copy = saved?.steps[3];
    expect(copy?.id).not.toBe('bulk');
    expect(copy).toMatchObject({
      operation: 'bulk',
      label: 'Beta',
      plannedDurationS: 10_800,
      dependsOn: ['bulk'],
    });
    expect(saved?.steps.find((step) => step.id === 'shape')?.dependsOn).toEqual([copy?.id]);
    await page.reload();
    await expectRecipeRevision(page, 2);
    await expect.poll(() => stepCount(page)).toBe(8);
  });

  test(`A model step copy requires a duration and propagates unknown timing${suffix}`, async ({
    page,
  }) => {
    await open(page, true);
    await editStep(page, 'Beta');
    await duplicate(page).click();
    await expect(
      review(page).getByText(english ? 'Duration required' : 'Durée requise', { exact: true }),
    ).toBeVisible();
    await expect(
      review(page).getByText(
        english ? 'Calculated fermentation duration' : 'Durée calculée de fermentation',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      review(page)
        .getByText(
          english ? /After: Timing unknown after Beta/ : /Après : Horaire indéterminé après Beta/,
        )
        .first(),
    ).toBeVisible();
    await keep(page).click();
    await closeStep(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    const saved = await storedProcess(page);
    const copy = saved?.steps[3];
    expect(copy).toMatchObject({ label: 'Beta', dependsOn: ['bulk'] });
    expect(copy).not.toHaveProperty('plannedDurationS');
    expect(copy).not.toHaveProperty('durationMode');
  });

  test(`Every core duplication refusal stays local and changes nothing${suffix}`, async ({
    page,
  }) => {
    await open(page);
    const cases = english
      ? [
          ['Preferment', 'Component preparation steps cannot be duplicated directly.'],
          ['Timed heating', 'Preheating and steps scheduled before a target cannot be duplicated.'],
          ['Cooling', 'Steps scheduled as late as possible cannot be duplicated.'],
        ]
      : [
          [
            'Preferment',
            'Les étapes de préparation de composant ne peuvent pas être dupliquées directement.',
          ],
          [
            'Timed heating',
            'Le préchauffage et les étapes planifiées avant une cible ne peuvent pas être dupliqués.',
          ],
          ['Cooling', 'Les étapes planifiées au plus tard ne peuvent pas être dupliquées.'],
        ];
    for (const [label, reason] of cases) {
      if (!label || !reason) throw new Error('Missing refusal fixture');
      await editStep(page, label);
      await duplicate(page).click();
      await expect(sheet(page).getByRole('alert')).toHaveText(reason);
      await expect(page.getByRole('alert')).toHaveCount(1);
      await expect(review(page)).toHaveCount(0);
      await closeStep(page).click();
    }
    await expect.poll(() => stepCount(page)).toBe(7);
    await expect(save(page)).toBeDisabled();
    expect((await storedProcess(page))?.steps).toHaveLength(7);
  });

  test(`Duplication preserves a pending label and refuses incomplete technique input${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await editStep(page, 'Alpha');
    await sheet(page)
      .getByRole('button', { name: english ? '+ Add a phase' : '+ Ajouter une phase', exact: true })
      .click();
    await duplicate(page).click();
    await expect(sheet(page).getByRole('alert')).toHaveText(
      english
        ? 'Resolve incomplete or invalid fields before duplicating this step.'
        : 'Corriger les champs incomplets ou non valides avant de dupliquer cette étape.',
    );
    const duration = sheet(page).getByRole('textbox', {
      name: english ? 'Phase 1 duration' : 'Durée de la phase 1',
      exact: true,
    });
    await duration.fill('-');
    await expect(duplicate(page)).toBeDisabled();
    await expect(duration).toHaveValue('-');
    await expect(review(page)).toHaveCount(0);
    await duration.fill('5 min');
    await duration.blur();
    const name = sheet(page).getByRole('textbox', {
      name: english ? 'Step name (optional)' : 'Nom de l’étape (facultatif)',
      exact: true,
    });
    await name.fill('Fresh name');
    await duplicate(page).click();
    await expect(
      review(page).getByText(
        english ? 'Proposed copy: Fresh name' : 'Copie proposée : Fresh name',
        { exact: true },
      ),
    ).toBeVisible();
    await expect(
      review(page).getByText(
        english
          ? 'Ingredient and component incorporations'
          : "Incorporations d'ingrédients et de composants",
        { exact: true },
      ),
    ).toBeVisible();
    await keep(page).click();
    await closeStep(page).click();
    await save(page).click();
    await expectRecipeRevision(page, 2);
    const saved = await storedProcess(page);
    expect(saved?.steps[1]?.label).toBe('Fresh name');
    expect(saved?.steps[2]?.label).toBe('Fresh name');
    expect(saved?.steps[2]).not.toHaveProperty('incorporations');
  });

  for (const theme of ['light', 'dark', 'amoled']) {
    for (const large of [false, true]) {
      test(`Duplication review fits and returns focus ${theme} ${large ? '360/130' : '393/100'}${suffix}`, async ({
        page,
      }, testInfo) => {
        await open(page, false, theme, large);
        await editStep(page, 'Beta');
        await duplicate(page).click();
        await expect(review(page)).toHaveCount(1);
        await expect(
          review(page)
            .getByRole('button', { name: /^(Cancel|Annuler)$/, exact: true })
            .first(),
        ).toBeFocused();
        for (const button of [keep(page), cancel(page)]) {
          const box = await button.boundingBox();
          if (!box) throw new Error('Review action has no bounds');
          expect(box.width).toBeGreaterThanOrEqual(48 * (large ? 1.3 : 1) - 1);
          expect(box.height).toBeGreaterThanOrEqual(48 * (large ? 1.3 : 1) - 1);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(large ? 360 : 393);
        }
        const capture = testInfo.outputPath('duplicate-review.png');
        await page.screenshot({ path: capture });
        await testInfo.attach('Duplication review', { path: capture, contentType: 'image/png' });
        await cancel(page).click();
        await expect(review(page)).toHaveCount(0);
        await expect(save(page)).toBeDisabled();
      });
    }
  }
}
