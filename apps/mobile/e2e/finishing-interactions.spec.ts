import { expect, test } from './fixtures';
import { expectRecipeRevision, editorSection, enterEditor, routed } from './ui-actions';
import type { Page } from '@playwright/test';
import type { Process } from '@flourprint/core/domain';
import milkFixture from '../../../docs/contracts/fixtures/enriched-milk-butter.json' with { type: 'json' };

const sheet = (page: Page) => page.locator('ion-modal:not(.overlay-hidden)');

for (const theme of ['light', 'dark', 'amoled'] as const) {
  test(`consultation result clears the footer without a dead gap at 360px: ${theme}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.goto('/advanced');
    await routed(page)
      .getByRole('button', {
        name: theme === 'light' ? /^Clair$/ : theme === 'dark' ? /^Sombre$/ : /^AMOLED$/,
      })
      .click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await routed(page).locator('ion-back-button').click();
    await routed(page).getByText('Poolish + tangzhong', { exact: true }).click();
    await expect(routed(page)).toHaveCount(1);
    const result = routed(page).getByTestId('recipe-method').getByTestId('recipe-outcome');
    await expect(result).toContainText('Résultat');
    // Scope to the recipe page itself: during the route transition the previous page can still
    // match the visible-page selector, so two ion-content elements may briefly coexist.
    const recipePage = page
      .locator('ion-router-outlet > .ion-page')
      .filter({ has: page.getByTestId('recipe-method') });
    const content = recipePage.locator('ion-content');
    const footer = recipePage.locator('ion-footer');
    for (const fontSize of [16, 20]) {
      await page.addStyleTag({ content: `html, body { font-size: ${fontSize}px !important; }` });
      const gap = async () => {
        await content.evaluate(async (host) => {
          const scroll = await (
            host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
          ).getScrollElement();
          scroll.scrollTop = scroll.scrollHeight;
        });
        const [end, bar] = await Promise.all([result.boundingBox(), footer.boundingBox()]);
        if (!end || !bar) throw new Error('Result and primary footer must have rendered bounds');
        return bar.y - (end.y + end.height);
      };
      // Re-scroll on every attempt: layout can still settle after the first scroll.
      await expect.poll(gap, { timeout: 10_000 }).toBeGreaterThanOrEqual(16);
      await expect.poll(gap).toBeLessThanOrEqual(96);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        360,
      );
    }
  });
}

const importRecipe = async (page: Page, process: Process) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'qa-step.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-10-13T00:00:00.000Z',
        families: [],
        recipes: [
          {
            id: 'qa-step',
            name: 'QA — étapes',
            revisions: [
              {
                recipeId: 'qa-step',
                version: 1,
                createdAt: '2026-10-13T00:00:00.000Z',
                formula: milkFixture.input,
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
  await routed(page).getByText('QA — étapes', { exact: true }).click();
  await expectRecipeRevision(page, 1);
};

for (const english of [false, true]) {
  test(`step name survives typing and closure; undo and redo restore the authored process${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await importRecipe(page, {
      steps: [
        { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 300 },
      ],
    });
    await enterEditor(page);
    await editorSection(page, 'steps');
    await routed(page)
      .getByRole('button', {
        name: english ? 'Edit step Mix' : 'Modifier l’étape Pétrissage',
        exact: true,
      })
      .click();
    const field = sheet(page).getByLabel(
      english ? 'Step name (optional)' : 'Nom de l’étape (facultatif)',
      { exact: true },
    );
    await field.fill('QA — mélange manuel');
    await expect(field).toHaveValue('QA — mélange manuel');
    await sheet(page)
      .getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true })
      .evaluate((button) => (button as HTMLElement).click());
    await expect(sheet(page)).toBeHidden();
    const changed = routed(page).getByRole('button', {
      name: english ? 'Edit step QA — mélange manuel' : 'Modifier l’étape QA — mélange manuel',
      exact: true,
    });
    await expect(changed).toBeVisible();
    await routed(page)
      .locator('ion-footer')
      .getByRole('button', {
        name: english ? 'Undo last change' : 'Annuler la dernière modification',
        exact: true,
      })
      .click();
    await expect(
      routed(page).getByRole('button', {
        name: english ? 'Edit step Mix' : 'Modifier l’étape Pétrissage',
        exact: true,
      }),
    ).toBeVisible();
    await routed(page)
      .locator('ion-footer')
      .getByRole('button', { name: english ? 'Redo' : 'Rétablir', exact: true })
      .click();
    await expect(changed).toBeVisible();
  });
}

test('operation refusal preserves mix-only conditions and existing phases without creating an accepted draft', async ({
  page,
}) => {
  await importRecipe(page, {
    steps: [
      {
        id: 'mix',
        operation: 'mix',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 300,
        conditions: { doughTemperatureC: 24, frictionC: 3 },
        technique: { phases: [{ durationS: 300, speed: 'low' }] },
      },
    ],
  });
  await enterEditor(page);
  await editorSection(page, 'steps');
  await routed(page)
    .getByRole('button', { name: 'Modifier l’étape Pétrissage', exact: true })
    .click();
  const operation = sheet(page).getByLabel('Opération', { exact: true });
  await operation.selectOption('fold');
  await expect(operation).toHaveValue('mix');
  await expect(sheet(page).getByRole('alert')).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(routed(page).getByTestId('recipe-method')).toContainText('5 min');
  await expect(
    routed(page)
      .locator('ion-footer')
      .getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeDisabled();
});

test('legacy template instructions localize with a short name without becoming an untouched label edit', async ({
  page,
}) => {
  await importRecipe(page, {
    steps: [
      {
        id: 'bake',
        operation: 'bake',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 3150,
        label:
          'Bake in preheated 6–8 qt Dutch oven at 450 °F (232 °C): 30 min covered, then 22.5 min uncovered',
      },
    ],
  });
  const method = routed(page).getByTestId('recipe-method');
  await expect(method.getByText('Cuisson en cocotte', { exact: true })).toBeVisible();
  await expect(method).toContainText('30 min avec couvercle, puis 22,5 min sans couvercle');
  await enterEditor(page);
  await editorSection(page, 'steps');
  await routed(page)
    .getByRole('button', { name: 'Modifier l’étape Cuisson en cocotte', exact: true })
    .click();
  const label = sheet(page).getByLabel('Nom de l’étape (facultatif)', { exact: true });
  await expect(label).toHaveValue('Cuisson en cocotte');
  await label.focus();
  await label.blur();
  await sheet(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(routed(page).locator('ion-footer').getByRole('status')).toHaveText('À jour');
  await expect(
    routed(page)
      .locator('ion-footer')
      .getByRole('button', { name: 'Annuler la dernière modification', exact: true }),
  ).toBeDisabled();
});

test('operation changes cannot silently discard an invalid uncommitted phase field', async ({
  page,
}) => {
  await importRecipe(page, {
    steps: [
      { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 300 },
    ],
  });
  await enterEditor(page);
  await editorSection(page, 'steps');
  await routed(page)
    .getByRole('button', { name: 'Modifier l’étape Pétrissage', exact: true })
    .click();
  await sheet(page).getByRole('button', { name: '+ Ajouter une phase', exact: true }).click();
  const duration = sheet(page).getByLabel('Durée de la phase 1', { exact: true });
  await duration.fill('abc');
  await sheet(page).getByLabel('Opération', { exact: true }).selectOption('fold');
  await expect(sheet(page).getByLabel('Opération', { exact: true })).toHaveValue('mix');
  await expect(duration).toHaveValue('abc');
});

test('naming a step preserves its incomplete fold setup until the interval is supplied', async ({
  page,
}) => {
  await importRecipe(page, {
    steps: [
      { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 300 },
    ],
  });
  await enterEditor(page);
  await editorSection(page, 'steps');
  await routed(page)
    .getByRole('button', { name: 'Modifier l’étape Pétrissage', exact: true })
    .click();
  const count = sheet(page).getByLabel('Nombre de séries', { exact: true });
  await count.fill('4');
  await count.press('Enter');
  const name = sheet(page).getByLabel('Nom de l’étape (facultatif)', { exact: true });
  await name.fill('QA — rabats');
  await name.blur();
  await expect(count).toHaveValue('4');
  const interval = sheet(page).getByLabel('Intervalle entre les séries', { exact: true });
  await interval.fill('1 min');
  await interval.press('Enter');
  await sheet(page).getByRole('button', { name: 'Fermer', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect(routed(page).getByTestId('recipe-method')).toContainText('4 séries');
});
