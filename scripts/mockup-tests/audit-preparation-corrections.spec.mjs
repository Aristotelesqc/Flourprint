import { createRequire } from 'node:module';
import { recipeCard } from './screen-actions.mjs';

const requireMobile = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = requireMobile('@playwright/test');
const epoch = Date.parse('2026-10-23T12:00:00Z');
const preparation = (recipe = 'shokupan', locale = 'en') =>
  `/mockup.html?screen=preparation&recipe=${recipe}&prep=fresh&nav=A&lang=${locale}&theme=dark&motion=reduce&capture=1`;
const active = (page) => page.getByTestId('prep-current-step');

async function fresh(page, recipe = 'shokupan', locale = 'en') {
  await page.clock.setFixedTime(new Date(epoch));
  await page.goto(preparation(recipe, locale));
  await expect(page.getByTestId('prep-next-btn')).toBeVisible();
}

async function advanceToCooking(page) {
  for (let index = 0; index < 7; index++) {
    await page.clock.setFixedTime(new Date(epoch + (index + 1) * 60_000));
    await page.getByTestId('prep-next-btn').click();
  }
  await expect(active(page)).toHaveAttribute('data-step', 'bake');
}

test('major 2: blocked cooking Next explains the unfinished oven dependency and can recover', async ({
  page,
}) => {
  await fresh(page);
  await advanceToCooking(page);
  await page.getByTestId('prep-next-btn').click();
  await expect(active(page)).toHaveAttribute('data-step', 'bake');
  const refusal = page.getByTestId('prep-command-error');
  await expect(refusal).toHaveAttribute('role', 'alert');
  await expect(refusal).toContainText(/preheat|oven/i);
  await expect(refusal).not.toContainText(/DependenciesNotCompleted|preheat-/);
  await page.getByRole('button', { name: 'Start heating', exact: true }).click();
  await page.getByRole('button', { name: 'Mark oven ready', exact: true }).click();
  await page.clock.setFixedTime(new Date(epoch + 8 * 60_000));
  await page.getByTestId('prep-next-btn').click();
  await expect(active(page)).toHaveAttribute('data-step', 'cool');
  await expect(refusal).toHaveCount(0);
});

for (const locale of ['fr', 'en']) {
  test(`major 3 / L113: early finish has no cooked preselection on any path (${locale})`, async ({
    page,
  }) => {
    await fresh(page, 'shokupan', locale);
    const actions = locale === 'fr' ? 'Actions sur la préparation' : 'Preparation actions';
    const outcome = locale === 'fr' ? 'Choisir le résultat' : 'Choose outcome';
    const finished = locale === 'fr' ? 'Cuit' : 'Cooked';
    await page.getByRole('button', { name: actions, exact: true }).click();
    let menu = page.getByRole('dialog');
    await expect(menu.getByRole('button', { name: outcome, exact: true })).toBeVisible();
    await expect(menu).not.toContainText(finished);
    await menu.getByRole('button', { name: outcome, exact: true }).click();
    let picker = page.getByRole('dialog', { name: outcome, exact: true });
    await expect(picker.getByRole('combobox').first()).toHaveValue('');
    await expect(
      picker.getByRole('button', {
        name: locale === 'fr' ? 'Appliquer' : 'Apply',
        exact: true,
      }),
    ).toBeDisabled();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: actions, exact: true }).click();
    await page.getByTestId('finish-preparation-early').click();
    const confirmation = page.getByRole('dialog');
    await expect(confirmation).not.toContainText(finished);
    await confirmation
      .getByRole('button', {
        name: locale === 'fr' ? 'Terminer la préparation' : 'Finish preparation',
        exact: true,
      })
      .click();
    picker = page.getByRole('dialog', { name: outcome, exact: true });
    await expect(picker.getByRole('combobox').first()).toHaveValue('');
    await expect(page.getByTestId('recorded-outcome')).toHaveCount(0);
    await picker.getByRole('combobox').first().selectOption('dough');
    await picker
      .getByRole('button', {
        name: locale === 'fr' ? 'Appliquer' : 'Apply',
        exact: true,
      })
      .click();
    await expect(page.getByTestId('recorded-outcome')).toHaveText(
      locale === 'fr' ? 'Pâte préparée' : 'Prepared dough',
    );
  });
}

test('#165 / L127: an implicit ASAP step counts down before action, and Pause records its implicit start', async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date(epoch));
  await page.goto(preparation('baguette').replace('screen=preparation', 'screen=recipe'));
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(active(page)).toHaveAttribute('data-step', 'poolish');
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
  const times = page.getByTestId('prep-step-times');
  await expect(times).not.toContainText(/pending|waiting/i);
  const end = await times.locator('span').last().textContent();
  const start = await times.locator('span').first().textContent();
  await expect(times).toContainText(/implicit|projected|since/i);
  const progress = active(page).getByRole('progressbar');
  const beforeProgress = await progress.getAttribute('aria-valuenow');
  await page.getByTestId('prep-pause-btn').click();
  await expect(page.getByTestId('prep-pause-btn')).toHaveText('Resume');
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
  await expect(times.locator('span').last()).toHaveText(end);
  // A pause is the first real action, so its recorded start uses the same clock instant.
  await expect(times.locator('span').first()).not.toHaveText(start);
  await expect(times).not.toContainText(/pending|waiting/i);
  await page.clock.setFixedTime(new Date(epoch + 6 * 60_000));
  // A real navigation forces the held projection to be recomputed at the later clock.
  await page.getByRole('banner').getByRole('button', { name: 'Navigation', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Recipes', exact: true }).click();
  await recipeCard(page, 'Baguette').getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('13:59:00');
  await expect(active(page).getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    beforeProgress,
  );
});

test('L124: successful Next presents Undo and retraction restores the previous step', async ({
  page,
}) => {
  await fresh(page);
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await page.getByTestId('prep-next-btn').click();
  await expect(active(page)).toHaveAttribute('data-step', 'tangzhong-cool');
  const undo = page.getByTestId('prep-undo-next');
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(active(page)).toHaveAttribute('data-step', 'tangzhong');
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('L124: current temperature distinguishes oven from room', async ({ page }) => {
  await fresh(page);
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await page.getByTestId('prep-next-btn').click();
  await page.clock.setFixedTime(new Date(epoch + 2 * 60_000));
  await page.getByTestId('prep-next-btn').click();
  await page.clock.setFixedTime(new Date(epoch + 3 * 60_000));
  await page.getByTestId('prep-next-btn').click();
  await expect(active(page)).toHaveAttribute('data-step', 'bulk');
  await expect(page.getByText('Room temperature', { exact: true }).first()).toBeVisible();
  for (let index = 3; index < 7; index++) {
    await page.clock.setFixedTime(new Date(epoch + (index + 1) * 60_000));
    await page.getByTestId('prep-next-btn').click();
  }
  await expect(active(page)).toHaveAttribute('data-step', 'bake');
  await expect(page.getByText('Oven temperature', { exact: true })).toBeVisible();
});

test('L127: reducing a just-started step to zero disables subtraction without a false overrun', async ({
  page,
}) => {
  await fresh(page);
  await page.getByTestId('prep-adjust-minus').click();
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('00:00:00');
  await expect(page.getByTestId('prep-adjust-minus')).toBeDisabled();
  await expect(page.getByTestId('prep-overdue-badge')).toHaveCount(0);
});

test('L13: the technical journal uses readable localized events and step names', async ({
  page,
}) => {
  await fresh(page, 'shokupan', 'fr');
  await page.clock.setFixedTime(new Date(epoch + 60_000));
  await page.getByTestId('prep-next-btn').click();
  await page.getByRole('button', { name: /^Journal d’événements techniques/ }).click();
  const journal = page.getByTestId('prep-technical-journal');
  await expect(journal.locator('li')).toHaveCount(3);
  await expect(journal).toContainText('Cuisson du tangzhong');
  await expect(journal).not.toContainText(/BakeStarted|StepStarted|StepCompleted|tangzhong-cool/);
});

test('L124: Undo after completing the final step retracts that final completion, not its predecessor', async ({
  page,
}) => {
  await fresh(page);
  await advanceToCooking(page);
  await page.getByRole('button', { name: 'Start heating', exact: true }).click();
  await page.getByRole('button', { name: 'Mark oven ready', exact: true }).click();
  await page.clock.setFixedTime(new Date(epoch + 8 * 60_000));
  await page.getByTestId('prep-next-btn').click();
  await expect(active(page)).toHaveAttribute('data-step', 'cool');
  await page.clock.setFixedTime(new Date(epoch + 9 * 60_000));
  await page.getByTestId('prep-next-btn').click();
  await expect(page.getByTestId('finish-preparation')).toBeVisible();
  await expect(page.getByTestId('prep-countdown-digits')).toHaveText('00:00:00');
  await expect(active(page).getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  await page.getByTestId('prep-undo-next').click();
  await expect(active(page)).toHaveAttribute('data-step', 'cool');
  await expect(page.getByTestId('prep-next-btn')).toBeVisible();
  await expect(page.getByTestId('finish-preparation')).toHaveCount(0);
  await expect(page.getByRole('dialog')).toHaveCount(0);
});
