import type { Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { catalogs, type Locale } from '../src/i18n/messages';
import { expectRecipeRevision, menuAction, routed, showPlanning } from './ui-actions';

const EXPORTED_AT = '2026-10-08T18:00:00.000Z';
const FIXED_START = new Date('2026-10-02T10:00:00.000Z');

interface SyntheticStep {
  readonly id: string;
  readonly operation: string;
  readonly dependsOn: readonly string[];
  readonly schedule: 'asap' | 'alap';
  readonly plannedDurationS?: number;
}

interface SyntheticComponent {
  readonly id: string;
  readonly kind: 'preferment' | 'scald' | 'soaker' | 'custom';
  readonly flourPct: number;
  readonly flourBlend: readonly { readonly flour: string; readonly sharePct: number }[];
  readonly hydrationPct: number;
  readonly allocations?: readonly { readonly ingredient: string; readonly bakerPct: number }[];
}

const makeRecipe = ({
  id,
  name,
  steps,
  components = [],
  createdAt = '2026-03-01T12:00:00.000Z',
}: {
  id: string;
  name: string;
  steps: readonly SyntheticStep[];
  components?: readonly SyntheticComponent[];
  createdAt?: string;
}) => ({
  id,
  name,
  revisions: [
    {
      recipeId: id,
      version: 1,
      createdAt,
      formula: {
        flours: [{ id: 'bread-flour', sharePct: 100 }],
        ingredients: [
          { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
          {
            id: 'salt',
            kind: 'other',
            bakerPct: 2,
            role: 'dough',
            water: { status: 'known', valuePct: 0 },
          },
          {
            id: 'instant-yeast',
            kind: 'other',
            bakerPct: 0.4,
            role: 'dough',
            water: { status: 'estimated', valuePct: 5, rangePct: [4, 6] },
            yeast: { form: 'instant' },
          },
        ],
        components,
        anchor: { kind: 'flourTotal', grams: 500 },
      },
      process: { steps },
    },
  ],
});

const importSyntheticRecipes = async (
  page: Page,
  recipes: readonly ReturnType<typeof makeRecipe>[],
  locale: Locale,
) => {
  await page.goto('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'recipes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: EXPORTED_AT,
        recipes,
        families: [],
      }),
    ),
  });
  const importedText =
    recipes.length === 1
      ? locale === 'en'
        ? '1 recipe imported.'
        : '1 recette importée.'
      : locale === 'en'
        ? `${recipes.length} recipes imported.`
        : `${recipes.length} recettes importées.`;
  await expect(page.getByText(importedText)).toBeVisible();
};

const goBack = async (page: Page) => {
  await expect(routed(page)).toHaveCount(1);
  const before = page.url();
  await routed(page)
    .locator(
      'ion-header ion-back-button, ion-header button[aria-label="Back"], ion-header button[aria-label="Retour"]',
    )
    .click();
  await expect(page).not.toHaveURL(before);
  await expect(routed(page)).toHaveCount(1);
};

const backToRecipes = async (page: Page, locale: Locale) => {
  while (new URL(page.url()).pathname !== '/recipes') {
    await goBack(page);
  }
  await expect(
    routed(page).getByRole('heading', { name: catalogs[locale]['recipes.title'], level: 1 }),
  ).toBeVisible();
};

const openRecipeCard = async (page: Page, name: string) => {
  await routed(page).getByRole('link', { name, exact: true }).tap();
  await expectRecipeRevision(page, 1);
};

const startPreparationFromOpenRecipe = async (page: Page, locale: Locale) => {
  const msg = catalogs[locale];
  await showPlanning(page);
  await routed(page)
    .locator('ion-footer:visible')
    .getByRole('button', { name: msg['recipe.startAction'], exact: true })
    .tap();
  const alert = page.locator('ion-alert');
  await expect(alert).toContainText(msg['recipe.startConfirm']);
  await alert.getByRole('button', { name: msg['recipe.startNow'], exact: true }).tap();
  await expect(page).toHaveURL(/\/bakes\//);
  await expect(routed(page)).toHaveCount(1);
};

const recipeCardContainer = (page: Page, name: string) =>
  routed(page)
    .getByRole('article')
    .filter({ has: page.getByRole('heading', { name, exact: true }) });

const activeCardContainer = (page: Page, name: string, locale: Locale) => {
  const statusRegex =
    locale === 'en' ? /Preparation in progress|In progress/i : /Préparation en cours|En cours/i;
  return recipeCardContainer(page, name).filter({ hasText: statusRegex });
};

for (const english of [false, true]) {
  const locale: Locale = english ? 'en' : 'fr';
  const suffix = english ? ' @en' : '';
  const msg = catalogs[locale];

  test(`searches saved recipe names and displayed pre-dough names, preserving the query on return${suffix}`, async ({
    page,
  }) => {
    const speltWithBiga = makeRecipe({
      id: 'spelt-biga',
      name: 'Épeautre rustique',
      components: [
        {
          id: 'biga',
          kind: 'preferment',
          flourPct: 25,
          flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
          hydrationPct: 50,
          allocations: [{ ingredient: 'instant-yeast', bakerPct: 0.1 }],
        },
      ],
      steps: [
        {
          id: 'biga-step',
          operation: 'preferment',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: 12 * 3600,
        },
        {
          id: 'mix',
          operation: 'mix',
          dependsOn: ['biga-step'],
          schedule: 'asap',
          plannedDurationS: 10 * 60,
        },
        {
          id: 'bake',
          operation: 'bake',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 30 * 60,
        },
        {
          id: 'cool',
          operation: 'cool',
          dependsOn: ['bake'],
          schedule: 'asap',
          plannedDurationS: 3600,
        },
      ],
    });
    const micheWithoutCool = makeRecipe({
      id: 'country-miche',
      name: 'Miche de campagne',
      steps: [
        {
          id: 'mix',
          operation: 'mix',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: 15 * 60,
        },
        {
          id: 'bulk',
          operation: 'bulk',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 2 * 3600,
        },
        {
          id: 'bake',
          operation: 'bake',
          dependsOn: ['bulk'],
          schedule: 'asap',
          plannedDurationS: 45 * 60,
        },
      ],
    });

    await importSyntheticRecipes(page, [speltWithBiga, micheWithoutCool], locale);
    await backToRecipes(page, locale);

    const header = routed(page).getByRole('heading', { name: msg['recipes.title'], level: 1 });
    await expect(header).toBeVisible();

    const speltCard = recipeCardContainer(page, 'Épeautre rustique');
    const micheCard = recipeCardContainer(page, 'Miche de campagne');
    const poolishCard = recipeCardContainer(page, 'Poolish + tangzhong');

    await expect(speltCard).toBeVisible();
    await expect(micheCard).toBeVisible();
    await expect(poolishCard).toBeVisible();

    // L44 / L120: no blanket "Never baked"; initial cards say "Never prepared" / "Jamais préparée".
    for (const card of [speltCard, micheCard, poolishCard]) {
      await expect(card).toContainText(msg['recipes.card.neverPrepared']);
      await expect(card).not.toContainText(english ? /Never baked/i : /Jamais cuite/i);
    }

    // L43 / L120: endpoint comes from actual last authored step (cooling vs no cooling).
    await expect(speltCard).toContainText(english ? /cool/i : /ressuage/i);
    await expect(speltCard).toContainText('13 h 40 min');
    await expect(micheCard).toContainText(english ? /3 h · Bake/ : /3 h · Cuisson/);

    const search = routed(page).getByRole('searchbox', {
      name: english ? 'Search recipes' : 'Rechercher une recette',
    });
    const clear = routed(page).getByRole('button', {
      name: english ? 'Clear search' : 'Effacer la recherche',
    });
    const noMatchText = english ? 'No matching recipes' : 'Aucune recette correspondante';

    await expect(search).toBeVisible();

    // 1. Pre-dough match on a recipe whose name lacks the pre-dough string ("biga").
    await search.fill('biga');
    await expect(speltCard).toBeVisible();
    await expect(speltCard).toContainText(/biga/i);
    await expect(micheCard).toHaveCount(0);
    await expect(poolishCard).toHaveCount(0);
    await expect(clear).toBeVisible();

    // 2. Visible Clear search restores all saved recipes.
    await clear.tap();
    await expect(search).toHaveValue('');
    await expect(speltCard).toBeVisible();
    await expect(micheCard).toBeVisible();
    await expect(poolishCard).toBeVisible();

    // 3. Accent-insensitive match, Enter keeps route, tap card from results, Back keeps query.
    await search.fill('epeautre');
    await expect(speltCard).toBeVisible();
    await expect(micheCard).toHaveCount(0);
    await expect(poolishCard).toHaveCount(0);

    await search.press('Enter');
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(header).toBeVisible();
    await expect(speltCard).toBeVisible();

    await openRecipeCard(page, 'Épeautre rustique');
    await expect(
      routed(page).getByRole('heading', { name: 'Épeautre rustique', level: 1 }),
    ).toBeVisible();

    await backToRecipes(page, locale);
    await expect(search).toHaveValue('epeautre');
    await expect(speltCard).toBeVisible();
    await expect(micheCard).toHaveCount(0);
    await expect(poolishCard).toHaveCount(0);

    // 4. Empty / no-matching state keeps the Recipes header and Clear search restores cards.
    await search.fill('zzzz-aucune-recette');
    await expect(header).toBeVisible();
    await expect(routed(page).getByText(noMatchText)).toBeVisible();
    await expect(speltCard).toHaveCount(0);
    await expect(clear).toBeVisible();
    await clear.tap();
    await expect(micheCard).toBeVisible();
  });

  test(`projects active preparation remaining time with last-step endpoint, keeps 360px/130% readable, and handles open future duration${suffix}`, async ({
    page,
  }) => {
    const longTitle = 'Brioche feuilletée au levain de seigle et miel de sarrasin';
    const openDurationTitle = 'Pain à durée ouverte';

    await page.clock.setFixedTime(FIXED_START);

    const activeFixture = makeRecipe({
      id: 'long-title-cool',
      name: longTitle,
      steps: [
        { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 5 * 60 },
        {
          id: 'cool',
          operation: 'cool',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 2 * 3600,
        },
      ],
    });
    const openFutureFixture = makeRecipe({
      id: 'open-duration',
      name: openDurationTitle,
      steps: [
        { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 5 * 60 },
        { id: 'bulk', operation: 'bulk', dependsOn: ['mix'], schedule: 'asap' },
      ],
    });

    await importSyntheticRecipes(page, [activeFixture, openFutureFixture], locale);
    await backToRecipes(page, locale);

    // Start the 5 min + 2 h preparation and explicitly start the 5 min mix step.
    await openRecipeCard(page, longTitle);
    await startPreparationFromOpenRecipe(page, locale);
    await menuAction(page, english ? /^Start Mix$/ : /^Commencer : Pétrissage$/);
    await backToRecipes(page, locale);

    // L131: verify 360 px / 130 % text scale readability and non-overlap on the active card.
    await page.setViewportSize({ width: 360, height: 851 });
    await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });

    const activeCard = activeCardContainer(page, longTitle, locale);
    await expect(activeCard).toBeVisible();

    // L132 & L43: Remaining reflects the whole projected preparation (~2 h / 2 h 5 min),
    // not the 5 min step countdown, and names the last-step cooling endpoint.
    await expect(activeCard).toContainText(
      english ? 'Remaining: 2 h 5 min' : 'Temps restant : 2 h 5 min',
    );
    await expect(activeCard).toContainText(english ? /cool/i : /ressuage/i);

    const heading = activeCard.getByRole('heading', { name: longTitle });
    const statusPill = activeCard
      .getByText(
        english ? /Preparation in progress|In progress/i : /Préparation en cours|En cours/i,
      )
      .last();
    await expect(heading).toBeVisible();
    await expect(statusPill).toBeVisible();

    const [cardBox, headingBox, statusBox] = await Promise.all([
      activeCard.boundingBox(),
      heading.boundingBox(),
      statusPill.boundingBox(),
    ]);
    expect(cardBox).not.toBeNull();
    expect(headingBox).not.toBeNull();
    expect(statusBox).not.toBeNull();
    if (cardBox && headingBox && statusBox) {
      expect(cardBox.x).toBeGreaterThanOrEqual(0);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(361);
      expect(headingBox.x + headingBox.width).toBeLessThanOrEqual(361);
      const overlaps =
        headingBox.x < statusBox.x + statusBox.width - 1 &&
        headingBox.x + headingBox.width > statusBox.x + 1 &&
        headingBox.y < statusBox.y + statusBox.height - 1 &&
        headingBox.y + headingBox.height > statusBox.y + 1;
      expect(overlaps).toBe(false);
    }

    const overflow = await activeCard.evaluate((el) => {
      const ionContent = el.closest('ion-content');
      const inner = ionContent?.shadowRoot?.querySelector<HTMLElement>('.inner-scroll');
      return {
        docOverflow:
          document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        contentOverflow: inner ? inner.scrollWidth > inner.clientWidth + 1 : false,
      };
    });
    expect(overflow.docOverflow).toBe(false);
    expect(overflow.contentOverflow).toBe(false);

    // Resume link opens the active preparation and Back returns to /recipes.
    const resumeLink = routed(page)
      .getByRole('link', { name: english ? /Resume/i : /Reprendre/i })
      .first();
    await expect(resumeLink).toBeVisible();
    await resumeLink.tap();
    await expect(page).toHaveURL(/\/bakes\//);
    await backToRecipes(page, locale);

    // Unspecified future duration: starting 5 min mix before an undated bulk gives honest
    // unavailable text rather than claiming 5 min total remaining.
    await openRecipeCard(page, openDurationTitle);
    await startPreparationFromOpenRecipe(page, locale);
    await menuAction(page, english ? /^Start Mix$/ : /^Commencer : Pétrissage$/);
    await backToRecipes(page, locale);

    const openActiveCard = activeCardContainer(page, openDurationTitle, locale);
    await expect(openActiveCard).toBeVisible();
    await expect(openActiveCard).toContainText(
      english ? 'Remaining time unknown' : 'Temps restant inconnu',
    );
  });

  test(`distinguishes never prepared, raw dough, and cooked outcomes on library cards${suffix}`, async ({
    page,
  }) => {
    await page.clock.setFixedTime(FIXED_START);

    const cookedRecipe = makeRecipe({
      id: 'cooked-miche',
      name: 'Miche cuite au four',
      steps: [
        { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 5 * 60 },
        {
          id: 'bake',
          operation: 'bake',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 20 * 60,
        },
      ],
    });
    const idleRecipe = makeRecipe({
      id: 'idle-loaf',
      name: 'Pain témoin',
      steps: [
        {
          id: 'mix',
          operation: 'mix',
          dependsOn: [],
          schedule: 'asap',
          plannedDurationS: 10 * 60,
        },
        {
          id: 'bake',
          operation: 'bake',
          dependsOn: ['mix'],
          schedule: 'asap',
          plannedDurationS: 30 * 60,
        },
      ],
    });

    await importSyntheticRecipes(page, [cookedRecipe, idleRecipe], locale);
    await backToRecipes(page, locale);

    // 1. Finish Poolish + tangzhong early as raw dough (existing journey.spec.ts path).
    await openRecipeCard(page, 'Poolish + tangzhong');
    await startPreparationFromOpenRecipe(page, locale);
    await menuAction(page, english ? /^Start Preferment$/ : /^Commencer : Préferment$/);
    await routed(page).getByRole('button', { name: msg['bake.nextAction'], exact: true }).tap();
    await menuAction(page, english ? /^Finish now/ : /^Terminer maintenant/);
    const earlyAlert = page.locator('ion-alert');
    await expect(earlyAlert).toBeVisible();
    await earlyAlert
      .getByRole('radio', {
        name: english ? 'Raw dough, frozen' : 'Pâte crue, congelée',
        exact: true,
      })
      .tap();
    await earlyAlert.getByRole('button', { name: msg['bake.save'], exact: true }).tap();
    await expect(earlyAlert).toBeHidden();
    await expect(page.getByTestId('bake-outcome')).toContainText(
      english ? 'Raw dough, frozen' : 'Pâte crue, congelée',
    );
    await backToRecipes(page, locale);

    // 2. Finish Miche cuite au four as cooked.
    await openRecipeCard(page, 'Miche cuite au four');
    await startPreparationFromOpenRecipe(page, locale);
    const nextButton = routed(page).getByRole('button', {
      name: msg['bake.nextAction'],
      exact: true,
    });
    await nextButton.tap();
    await expect(page.getByTestId('preparation-journal')).toContainText(
      english ? 'Mix done' : 'Pétrissage terminé',
    );
    await nextButton.tap();
    await expect(page.getByText(msg['bake.allDone'])).toBeVisible();

    await page.clock.setFixedTime(new Date(FIXED_START.getTime() + 25 * 60_000));
    const finishCookedLabel = msg['bake.finishAs'].replace('{outcome}', msg['outcome.cooked']);
    await routed(page).getByRole('button', { name: finishCookedLabel, exact: true }).tap();
    await expect(page.getByTestId('bake-outcome')).toHaveText(
      msg['bake.outcome'].replace('{outcome}', msg['outcome.cooked']),
    );
    await backToRecipes(page, locale);

    // 3. Verify all three distinct library card states (L44, L120).
    const idleCard = recipeCardContainer(page, 'Pain témoin');
    const rawCard = recipeCardContainer(page, 'Poolish + tangzhong');
    const cookedCard = recipeCardContainer(page, 'Miche cuite au four');

    const rawPrefix = msg['recipes.card.lastDough'].replace('{when}', '').trim();
    const cookedPrefix = msg['recipes.card.lastBaked'].replace('{when}', '').trim();

    await expect(idleCard).toContainText(msg['recipes.card.neverPrepared']);
    await expect(idleCard).not.toContainText(english ? /Never baked/i : /Jamais cuite/i);

    await expect(rawCard).toContainText(rawPrefix);
    await expect(rawCard).not.toContainText(msg['recipes.card.neverPrepared']);
    await expect(rawCard).not.toContainText(cookedPrefix);

    await expect(cookedCard).toContainText(cookedPrefix);
    await expect(cookedCard).not.toContainText(msg['recipes.card.neverPrepared']);
    await expect(cookedCard).not.toContainText(rawPrefix);
  });
}
