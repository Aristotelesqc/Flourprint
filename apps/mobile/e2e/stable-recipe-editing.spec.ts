import { expect, test, type Locator, type Page } from '@playwright/test';

const rectangle = async (locator: Locator) => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Expected a visible control');
  return box;
};

const openRecipe = async (page: Page) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  await expect(content(page)).toHaveCount(1);
};

const content = (page: Page) =>
  page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden) > ion-content');
const scrollTop = (page: Page) =>
  content(page).evaluate(
    async (host) =>
      (
        await (
          host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
        ).getScrollElement()
      ).scrollTop,
  );
const scrollTo = (page: Page, top: number) =>
  content(page).evaluate(async (host, target) => {
    const scroll = await (
      host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
    ).getScrollElement();
    scroll.scrollTop = target;
  }, top);
const settled = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      ),
  );

for (const english of [false, true]) {
  test(`first edit keeps quantity controls and action bar in place at 360px${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await page.emulateMedia({ colorScheme: english ? 'light' : 'dark' });
    await openRecipe(page);
    const dough = page.getByRole('button', { name: english ? 'Dough' : 'Pâte', exact: true });
    const group = page.getByRole('group').filter({ has: dough });
    const footer = page.locator('ion-footer:visible');
    await settled(page);
    const before = {
      group: await rectangle(group),
      footer: await rectangle(footer),
      content: await rectangle(content(page)),
    };
    await dough.click();
    await expect(footer.getByRole('status')).toHaveText(
      english ? 'Unsaved changes' : 'Modifications non enregistrées',
    );
    await settled(page);
    const after = {
      group: await rectangle(group),
      footer: await rectangle(footer),
      content: await rectangle(content(page)),
    };
    expect(after.group.y).toBeCloseTo(before.group.y, 0);
    expect(after.footer.height).toBeCloseTo(before.footer.height, 0);
    expect(after.content.height).toBeCloseTo(before.content.height, 0);
    for (const button of await footer.getByRole('button').all()) {
      const box = await rectangle(button);
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(360);
    }
    const review = footer.getByRole('button', {
      name: english ? 'Review changes' : 'Examiner les modifications',
    });
    await review.click();
    const sheet = page.locator('ion-modal:not(.overlay-hidden)');
    await expect(
      sheet.getByRole('heading', {
        name: english ? 'Draft changes' : 'Modifications du brouillon',
        exact: true,
      }),
    ).toBeVisible();
    await sheet.getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(review).toBeFocused();
    await expect(
      page.getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true }),
    ).toBeEnabled();
  });
}

test('panels retain independent positions, incomplete fields and planner controls', async ({
  page,
}) => {
  await openRecipe(page);
  const water = page.getByLabel('Eau (g)', { exact: true });
  await water.fill('abc');
  await water.blur();
  await scrollTo(page, 650);
  await expect.poll(() => scrollTop(page)).toBe(650);
  await page.getByRole('button', { name: 'Processus', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(0);
  await page.getByRole('button', { name: 'À une heure', exact: true }).click();
  const time = page.locator('input[type="datetime-local"]:visible');
  await time.fill('2026-11-05T14:00');
  await scrollTo(page, 400);
  await expect.poll(() => scrollTop(page)).toBe(400);
  await page.getByRole('button', { name: 'Historique', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(0);
  await page.getByRole('button', { name: 'Formule', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(650);
  await expect(water).toHaveValue('abc');
  await expect(water).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('button', { name: 'Processus', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(400);
  await expect(time).toHaveValue('2026-11-05T14:00');
  await page.getByRole('button', { name: 'Formule', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(650);
  // Switch again during the restoration frames, including a short history panel.
  await page.evaluate(async () => {
    const header = document.querySelector(
      'ion-router-outlet > .ion-page:not(.ion-page-hidden) ion-header',
    );
    if (!header) throw new Error('Recipe header missing');
    const click = (label: string) => {
      const button = [...header.querySelectorAll('button')].find(
        (button) => button.textContent === label,
      );
      if (!button) throw new Error(`Missing tab: ${label}`);
      button.click();
    };
    click('Processus');
    await new Promise(requestAnimationFrame);
    click('Historique');
    await new Promise(requestAnimationFrame);
    click('Formule');
  });
  await expect.poll(() => scrollTop(page)).toBe(650);
  await page.getByRole('button', { name: 'Processus', exact: true }).click();
  await expect.poll(() => scrollTop(page)).toBe(400);
});

test('review distinguishes process-only changes from formula changes', async ({ page }) => {
  await openRecipe(page);
  await page.getByRole('button', { name: 'Processus', exact: true }).click();
  const duration = page.getByLabel('Durée : Pétrissage', { exact: true });
  await duration.fill('12 min');
  await duration.press('Enter');
  await page.getByRole('button', { name: 'Examiner les modifications' }).click();
  const sheet = page.locator('ion-modal:not(.overlay-hidden)');
  await expect(sheet).toContainText('Aucune modification de la formule.');
  await expect(sheet).toContainText('Paramètres du processus modifiés.');
  await expect(sheet).not.toContainText('Aucune modification du processus.');
});

test('review of a new recipe does not claim it matches a saved revision', async ({ page }) => {
  await page.goto('/recipes');
  await page.getByLabel('Nouvelle recette', { exact: true }).first().click();
  await page.getByText('Recette vierge').first().click();
  await page.getByRole('button', { name: 'Examiner les modifications' }).click();
  const sheet = page.locator('ion-modal:not(.overlay-hidden)');
  await expect(sheet).toContainText('Nouvelle recette : aucune version enregistrée à comparer.');
  await expect(sheet).not.toContainText('Aucune modification du processus.');
});
