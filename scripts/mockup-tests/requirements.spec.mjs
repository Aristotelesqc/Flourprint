import { openRecipeSteps } from './screen-actions.mjs';
import {
  editRecipe,
  recipeCard,
  summaryMetric,
  markMilkPowderWaterUnknown,
  openGlobalDestination,
} from './screen-actions.mjs';
import { createRequire } from 'node:module';
import { codeName } from '../build-names.mjs';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');

const copy = {
  fr: {
    actions: 'Actions sur la recette',
    edit: 'Modifier',
    totals: 'Totaux de la formule assemblée',
    undo: 'Annuler la modification',
    help: 'Détail de l’hydratation',
    copied: 'Copié',
    fallback: 'Copie indisponible : sélectionner ce texte.',
  },
  en: {
    actions: 'Recipe actions',
    edit: 'Edit',
    totals: 'Assembled formula totals',
    undo: 'Undo change',
    help: 'Hydration breakdown',
    copied: 'Copied',
    fallback: 'Copy unavailable: select this text.',
  },
};

const address = (params) =>
  `/mockup.html?${new URLSearchParams({ capture: '1', motion: 'reduce', ...params })}`;

async function openEdit(page, locale) {
  await editRecipe(page, locale);
  await expect(page.getByTestId('save-recipe')).toBeVisible();
}

async function totalsField(page, locale, ingredient = 'salt') {
  // L109 removes assembled totals. These ingredients are wholly in the final stage;
  // stage editing preserves the same invariant while testing the actual everyday input.
  const field = page.getByTestId(`ingredient-grams-${ingredient}`);
  await field.scrollIntoViewIfNeeded();
  await expect(field).toBeVisible();
  return field;
}

async function expectHitTarget(control) {
  await expect(control).toBeVisible();
  await control.scrollIntoViewIfNeeded();
  expect(
    await control.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return box.width > 0 && box.height > 0 && (hit === el || el.contains(hit));
    }),
  ).toBe(true);
}

async function expectUnclipped(locator) {
  expect(
    await locator.evaluate((el) => {
      const box = el.getBoundingClientRect();
      const phone = el.closest('.phone-frame')?.getBoundingClientRect();
      return (
        box.width > 0 &&
        box.height > 0 &&
        el.scrollWidth <= el.clientWidth + 1 &&
        (!phone || (box.left >= phone.left - 1 && box.right <= phone.right + 1))
      );
    }),
  ).toBe(true);
}

// Every case gets Playwright's fresh context. No previous screen can supply a missing label,
// saved draft, clipboard value or expanded disclosure.
const buildViews = [
  { name: 'library', screen: 'library' },
  { name: 'recipe', screen: 'recipe' },
  { name: 'edit', screen: 'recipe', mode: 'edit' },
  { name: 'steps', screen: 'recipe', section: 'steps' },
  { name: 'planning', screen: 'recipe', section: 'planning' },
  { name: 'history', screen: 'recipe', section: 'history' },
  { name: 'preparation', screen: 'preparation' },
  { name: 'registry', screen: 'registry' },
  { name: 'settings', screen: 'settings' },
];

for (const nav of ['A']) {
  for (const view of buildViews) {
    test(`visible, copyable exact build at 360/130: ${nav} ${view.name}`, async ({
      page,
      context,
    }) => {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.setViewportSize({ width: 360, height: 852 });
      const { name: _name, ...params } = view;
      await page.goto(address({ ...params, nav, lang: 'fr', width: '360', scale: '130' }));
      const response = await page.request.get('/review-build.json');
      expect(response.ok()).toBe(true);
      const build = await response.json();
      // Local builds separate the bakery name; CI already includes it in the short label.
      // Check the exact declared format without requiring CI to impersonate a local build.
      const expectedLabel =
        build.build.channel === 'local'
          ? `v${build.build.version} · ${codeName(build.revision)} · local`
          : `${build.build.label} · ${build.build.channel}`;
      expect(build.label).toBe(expectedLabel);
      const visible = page.getByTestId('visible-build');
      await expect(visible).toHaveText(build.label);
      await expectUnclipped(visible);
      await expectHitTarget(visible);
      await visible.click();
      const sheet = page.getByRole('dialog');
      await expect(sheet).toBeVisible();
      await expect(sheet.locator('.build-id')).toContainText(build.label);
      await expect(sheet.getByRole('status')).toHaveText(copy.fr.copied);
      await expect
        .poll(() =>
          page.evaluate(async () =>
            (await navigator.clipboard.readText()).replaceAll('\r\n', '\n'),
          ),
        )
        .toBe(`${build.label}\n${build.revision}\n${build.sourceSha256}`);
      await page.keyboard.press('Escape');
      await expect(sheet).toHaveCount(0);
      await expect(visible).toBeFocused();
    });
  }
}

test('denied clipboard keeps exact build selectable and reports failure', async ({ page }) => {
  const failures = [];
  page.on('pageerror', (failure) => failures.push(failure.message));
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException('Denied for this test', 'NotAllowedError');
        },
      },
    });
  });
  await page.goto(address({ screen: 'recipe', lang: 'en', nav: 'A' }));
  await page.getByTestId('visible-build').click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByRole('status')).toHaveText(copy.en.fallback);
  await expect(sheet.locator('.build-id')).toBeVisible();
  expect(
    await sheet.locator('.build-id').evaluate((el) => getComputedStyle(el).userSelect),
  ).not.toBe('none');
  expect(failures).toEqual([]);
});

for (const locale of ['fr', 'en']) {
  test(`library and template cards retain partial-hydration lower bounds: ${locale}`, async ({
    page,
  }) => {
    await page.goto(address({ screen: 'library', lang: locale }));
    await recipeCard(page, 'Shokupan').click();
    await markMilkPowderWaterUnknown(page, locale);
    await openGlobalDestination(page, locale === 'fr' ? 'Recettes' : 'Recipes', locale);
    const card = recipeCard(page, 'Shokupan');
    await expect(card).toContainText(/≥\s*73\s*%/);
    await expect(card).not.toContainText('≈');
    await page
      .getByRole('button', {
        name: locale === 'fr' ? 'Nouvelle recette' : 'New recipe',
        exact: true,
      })
      .click();
    // A personal override never mutates the built-in template's sourced profile.
    const template = recipeCard(page.getByRole('dialog'), 'Shokupan');
    await expect(template).toContainText(/73\s*%/);
    await expect(template).not.toContainText('≥');
    await expect(template).not.toContainText('≈');
    await expect(recipeCard(page.getByRole('dialog'), 'Brioche')).toContainText(/≥\s*54\s*%/);
  });

  test(`partial known quantities use a lower bound in summary and hydration sheet: ${locale}`, async ({
    page,
  }) => {
    await page.goto(address({ screen: 'recipe', lang: locale }));
    await markMilkPowderWaterUnknown(page, locale);
    const summary = page.locator('.recipe-summary-box');
    await expect(summaryMetric(page, copy[locale].help).locator('.metric-value')).toHaveText(
      /^≥\s*73\s*%$/,
    );
    const partialMetrics = summary.locator('.metric-value-sm');
    await expect(partialMetrics).toHaveCount(2);
    for (const metric of await partialMetrics.all()) {
      await expect(metric).toHaveText(/^≥\s*\d+[,.]?\d*\s*%$/);
      await expect(metric).not.toContainText('≈');
    }
    await page.getByRole('button', { name: copy[locale].help, exact: true }).click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.locator('.water-detail-summary').locator('strong').first()).toHaveText(
      /^≥\s*73\s*%$/,
    );
    await expect(sheet.locator('.water-detail-summary')).not.toContainText('≈');
    await expect(sheet).toContainText(/229[,.]4\s*g/);
  });

  for (const nav of ['A']) {
    test(`Save commits the last focused raw value without Enter: ${locale} ${nav}`, async ({
      page,
    }) => {
      await page.goto(address({ screen: 'recipe', lang: locale, nav }));
      await openEdit(page, locale);
      const field = await totalsField(page, locale);
      await field.fill(locale === 'fr' ? '8,125' : '8.125');
      // Deliberately do not press Enter or blur explicitly: Save must preserve the final input.
      await page.getByTestId('save-recipe').click();
      await expect(page.getByTestId('save-recipe')).toHaveCount(0);
      await expect(page.getByTestId('formula-dough-weight')).toHaveText('701.125');
      await openEdit(page, locale);
      const reopened = await totalsField(page, locale);
      await expect(reopened).toHaveValue(locale === 'fr' ? '8,13' : '8.13');
      // Untouched formatted 8.13 must not overwrite the stored 8.125.
      await reopened.focus();
      await reopened.blur();
      if (nav === 'B') {
        await page.getByRole('button', { name: copy[locale].actions, exact: true }).click();
      }
      await expect(
        page.getByRole('button', { name: copy[locale].undo, exact: true }),
      ).toBeDisabled();
      if (nav === 'B') await page.keyboard.press('Escape');
      await expect(page.getByTestId('formula-dough-weight')).toHaveText('701.125');
      await page.getByTestId('save-recipe').click();
      await expect(page.getByTestId('formula-dough-weight')).toHaveText('701.125');
    });
  }

  test(`incomplete number remains visible and blocks Save until repaired: ${locale}`, async ({
    page,
  }) => {
    await page.goto(address({ screen: 'recipe', lang: locale }));
    await openEdit(page, locale);
    const field = await totalsField(page, locale);
    for (const raw of ['-', locale === 'fr' ? '8,' : '8.']) {
      await field.fill(raw);
      await field.blur();
      await expect(field).toHaveValue(raw);
      await expect(field).toHaveAttribute('aria-invalid', 'true');
      await expect(page.getByTestId('save-recipe')).toBeDisabled();
      await expect(page.getByTestId('formula-dough-weight')).toHaveText('699');
    }
    await field.fill(locale === 'fr' ? '8,5' : '8.5');
    await page.getByTestId('save-recipe').click();
    await expect(page.getByTestId('save-recipe')).toHaveCount(0);
    await expect(page.getByTestId('formula-dough-weight')).toHaveText('701.5');
  });
}

const diagnosticStates = [
  ['valid', 'Dans le domaine du modèle'],
  ['out', 'Dose actuelle hors du domaine'],
  ['noResult', 'Aucun résultat exploitable'],
  ['recipe', 'Dose actuelle hors du domaine'],
  ['enriched', 'Estimation extrapolée · à interpréter avec prudence'],
];
for (const [scenario, status] of diagnosticStates) {
  test(`closed fermentation disclosure exposes actual status: ${scenario}`, async ({ page }) => {
    if (scenario === 'enriched') {
      // The sourced Shokupan's original high dose is out of domain. Change only its dose
      // through the real editor; enriched composition must remain an extrapolation warning.
      await page.goto(address({ screen: 'recipe', scenario: 'recipe', lang: 'fr' }));
      await openEdit(page, 'fr');
      const yeast = await totalsField(page, 'fr', 'instant-yeast');
      await yeast.fill('1');
      await yeast.press('Enter');
      await openRecipeSteps(page);
    } else {
      await page.goto(address({ screen: 'recipe', section: 'steps', scenario, lang: 'fr' }));
    }
    const disclosure = page.getByRole('button', { name: /^Fermentation/ }).first();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(disclosure).toContainText(status);
    // Steps and Planning retain independent mounted views. Follow this visible trigger's
    // actual aria-controls link rather than selecting a hidden sibling view's panel.
    const contentId = await disclosure.getAttribute('aria-controls');
    expect(contentId).toBeTruthy();
    const content = page.locator(`[id="${contentId}"]`);
    const panel = content.locator('.status-panel');
    await expect(content).toHaveAttribute('aria-hidden', 'true');
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
    // The status stays in the visible disclosure headline; the body explains it once.
    await expect(disclosure).toContainText(status);
    await expect(panel).not.toContainText(status);
    await expect(panel).toContainText(
      scenario === 'noResult'
        ? 'Aucun ingrédient n’est marqué comme levure.'
        : scenario === 'recipe' || scenario === 'out'
          ? 'La dose de levure sort du domaine du modèle'
          : 'Point final du modèle expérimental',
    );
    await expect(panel.locator('.status-panel-header')).toHaveCount(0);
    if (scenario === 'noResult') await expect(panel).not.toContainText(/Durée estimée\s*:/);
    await disclosure.click();
    await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
    await expect(disclosure).toContainText(status);
  });
}

for (const nav of ['A']) {
  test(`A toolbar remains operable at 360/130: ${nav}`, async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 852 });
    await page.goto(
      address({ screen: 'library', nav, lang: 'fr', width: '360', scale: '130', theme: 'amoled' }),
    );
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe(
      '20.8px',
    );
    const create = page.getByRole('button', { name: 'Nouvelle recette', exact: true });
    await expectHitTarget(create);
    expect(await create.evaluate((el) => Boolean(el.closest('header')))).toBe(nav === 'B');
    await create.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.getByRole('searchbox').fill('shoku');
    await page.locator('.phone-content .recipe-card').click();
    const start = page.getByRole('button', { name: 'Reprendre', exact: true });
    await expectHitTarget(start);
    expect(await start.evaluate((el) => Boolean(el.closest('header')))).toBe(nav === 'B');
    await expectUnclipped(page.locator('.header-heading'));
    const overflow = page.getByRole('button', { name: copy.fr.actions, exact: true });
    await expectHitTarget(overflow);
    await overflow.click();
    const menu = page.getByRole('dialog');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('button', { name: 'Modifier', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await openEdit(page, 'fr');
    await expectHitTarget(page.getByTestId('save-recipe'));
    await expectHitTarget(page.getByRole('button', { name: 'Annuler', exact: true }));
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    expect(await page.locator('.phone-content').evaluate((el) => el.clientHeight)).toBeGreaterThan(
      0,
    );
  });
}
