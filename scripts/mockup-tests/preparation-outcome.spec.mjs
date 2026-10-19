import { recipeCard } from './screen-actions.mjs';
import { createRequire } from 'node:module';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');

const startTime = Date.parse('2026-10-17T12:00:00.000Z');

const stages = [
  'tangzhong',
  'tangzhong-cool',
  'mix',
  'bulk',
  'divide',
  'shape',
  'proof',
  'bake',
  'cool',
];

async function freshPreparation(page, nav) {
  // Fix Date independently of animation/timer scheduling: assertions distinguish recorded
  // elapsed time from the recipe's much longer planned duration without freezing dialog focus.
  await page.clock.setFixedTime(new Date(startTime));
  await page.goto(
    `/mockup.html?screen=preparation&recipe=shokupan&prep=fresh&lang=fr&nav=${nav}&capture=1&motion=reduce`,
  );
  await expect(page.getByTestId('prep-complete-btn')).toBeVisible();
  await expect(page.locator('.current-step-hero')).toHaveAttribute('data-step', 'tangzhong');
}

async function openLibrary(page, nav) {
  if (nav === 'A') {
    await page.getByRole('button', { name: 'Navigation', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Recettes', exact: true }).click();
  } else {
    await page
      .locator('nav[data-fp-component="fp.bottom-bar"]')
      .getByRole('button', { name: 'Recettes', exact: true })
      .click();
  }
  await expect(page.getByRole('searchbox')).toBeVisible();
}

async function openRecordedHistory(page, nav, result) {
  await openLibrary(page, nav);
  const card = recipeCard(page, 'Shokupan');
  await expect(card.getByText(result, { exact: true })).toBeVisible();
  await expect(card.getByRole('button', { name: 'Reprendre', exact: true })).toHaveCount(0);
  await expect(card).not.toContainText('En cours');
  await expect.soft(page.getByRole('tab', { name: 'En cours (0)', exact: true })).toBeVisible();
  await card.click();
  await page.getByRole('tab', { name: 'Historique', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Préparations', exact: true })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: `Version 1 · ${result}`, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Versions de la recette', exact: true }),
  ).toBeVisible();
  // No rating has been recorded; a completed preparation must not acquire a fabricated score.
  await expect(page.getByText('Non évaluée', { exact: true })).toBeVisible();
}

for (const nav of ['A']) {
  test(`the last stage stays active until explicit default Finish, with recorded history ${nav}`, async ({
    page,
  }) => {
    await freshPreparation(page, nav);
    for (const [index, stage] of stages.entries()) {
      await expect(page.locator('.current-step-hero')).toHaveAttribute('data-step', stage);
      await page.clock.setFixedTime(new Date(startTime + (index + 1) * 60_000));
      await page.getByTestId('prep-complete-btn').click();
      // Completing baking is just another recorded stage; cooling and explicit Finish remain.
      await expect(page.getByTestId('recorded-outcome')).toHaveCount(0);
      await expect(
        page.getByRole('heading', { name: 'Préparation terminée', exact: true }),
      ).toHaveCount(0);
    }

    await expect(
      page.getByRole('heading', {
        name: 'Étapes terminées · préparation à terminer',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('.current-step-hero')).toHaveCount(0);
    await expect(page.getByTestId('prep-complete-btn')).toHaveCount(0);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByTestId('finish-preparation').click();

    await expect(
      page.getByRole('heading', { name: 'Préparation terminée', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('recorded-outcome')).toHaveText('Cuit');
    // Default Finish records the recipe's intended result without a compulsory result dialog.
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await openRecordedHistory(page, nav, 'Cuit');
    await expect(page.getByText('Durée réelle : 9 min', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Lancer', exact: true }).click();
    await expect(page.locator('.current-step-hero')).toHaveAttribute('data-step', 'tangzhong');
    await expect(page.getByTestId('recorded-outcome')).toHaveCount(0);
  });

  test(`choosing frozen dough does not finish; explicit early Finish records the override ${nav}`, async ({
    page,
  }) => {
    await freshPreparation(page, nav);
    await page.clock.setFixedTime(new Date(startTime + 7 * 60_000));
    await page.getByRole('button', { name: 'Actions sur la préparation', exact: true }).click();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Cuit · Choisir le résultat', exact: true })
      .click();
    const picker = page.getByRole('dialog', { name: 'Choisir le résultat', exact: true });
    await expect(picker).toBeVisible();
    await picker.getByRole('combobox', { name: 'Résultat', exact: true }).selectOption('dough');
    await picker
      .getByRole('combobox', { name: 'Destination de la pâte', exact: true })
      .selectOption('frozen');
    const pieces = picker.getByRole('textbox', { name: 'Nombre', exact: true });
    await pieces.fill('-');
    await pieces.press('Enter');
    await expect(pieces).toHaveValue('-');
    await expect(picker.getByRole('button', { name: 'Appliquer', exact: true })).toBeDisabled();
    await pieces.fill('4');
    await pieces.press('Enter');
    await picker.getByRole('button', { name: 'Appliquer', exact: true }).click();

    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.getByTestId('prep-complete-btn')).toBeVisible();
    await expect(page.locator('.current-step-hero')).toHaveAttribute('data-step', 'tangzhong');
    await expect(page.getByTestId('recorded-outcome')).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Préparation terminée', exact: true }),
    ).toHaveCount(0);

    await page.getByRole('button', { name: 'Actions sur la préparation', exact: true }).click();
    await expect(
      page
        .getByRole('dialog')
        .getByRole('button', { name: 'Pâte préparée · Choisir le résultat', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('dialog')
      .getByRole('button', { name: 'Pâte préparée · Choisir le résultat', exact: true })
      .click();
    await expect(picker.getByRole('combobox', { name: 'Résultat', exact: true })).toHaveValue(
      'dough',
    );
    await expect(
      picker.getByRole('combobox', { name: 'Destination de la pâte', exact: true }),
    ).toHaveValue('frozen');
    await expect(picker.getByRole('textbox', { name: 'Nombre', exact: true })).toHaveValue('4');
    await picker.getByRole('button', { name: 'Fermer', exact: true }).click();
    await page.getByRole('button', { name: 'Actions sur la préparation', exact: true }).click();
    await page.getByTestId('finish-preparation-early').click();

    await expect(
      page.getByRole('heading', { name: 'Préparation terminée', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('recorded-outcome')).toHaveText('Pâte préparée · Congelée');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await openRecordedHistory(page, nav, 'Pâte préparée');
    await expect(page.getByText('Congelée', { exact: true })).toBeVisible();
    await expect(page.getByText('Durée réelle : 7 min', { exact: true })).toBeVisible();
  });
}
