import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { catalogs, type Locale } from '../src/i18n/messages';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const historyPanel = (page: Page) => routed(page).locator('[data-carousel-pane="history"]');

const historyTab = (page: Page, locale: Locale) =>
  routed(page).getByRole('tab', { name: catalogs[locale]['recipe.tab.history'], exact: true });

const recipeTab = (page: Page, locale: Locale) =>
  routed(page).getByRole('tab', { name: catalogs[locale]['recipe.tab.formula'], exact: true });

const referencesRegion = (page: Page, locale: Locale) =>
  historyPanel(page).getByRole('region', {
    name: catalogs[locale]['history.versions.referencesTitle'],
    exact: true,
  });

const savedHistoryRegion = (page: Page, locale: Locale) =>
  historyPanel(page).getByRole('region', {
    name: catalogs[locale]['history.versions.savedTitle'],
    exact: true,
  });

const preparationsRegion = (page: Page, locale: Locale) =>
  historyPanel(page).getByRole('region', {
    name: catalogs[locale]['history.preparationsTitle'],
    exact: true,
  });

const openHistory = async (page: Page, locale: Locale) => {
  const tab = historyTab(page, locale);
  await tab.tap();
  await expect(tab).toHaveAttribute('aria-selected', 'true');
  await expect(historyPanel(page)).toBeVisible();
};

const poolishWaterInput = (page: Page, locale: Locale): Locator => {
  const msg = catalogs[locale];
  return routed(page)
    .getByRole('group', { name: msg['name.poolish'] })
    .getByRole('textbox', { name: `${msg['name.water']}, ${msg['name.poolish']} (g)` });
};

const revText = (locale: Locale, version: number): string =>
  catalogs[locale]['history.revision'].replace('{version}', String(version));

const promoteButtonLabel = (locale: Locale, version: number): string =>
  catalogs[locale]['history.versions.promoteLabel'].replace('{version}', String(version));

const restoreButtonLabel = (locale: Locale, version: number): string =>
  catalogs[locale]['history.versions.restoreLabel'].replace('{version}', String(version));

const referenceNumberLabel = (locale: Locale, number: number): string =>
  catalogs[locale]['history.versions.referenceNumber'].replace('{number}', String(number));

const linkedReferenceNamedLabel = (locale: Locale, number: number, name: string): string =>
  catalogs[locale]['history.versions.linkedNamed']
    .replace('{number}', String(number))
    .replace('{name}', name);

const expectNoHorizontalOverflow = async (page: Page, region: Locator) => {
  const viewportWidth = page.viewportSize()?.width ?? 360;
  const overflow = await region.evaluate((el, maxWidth) => {
    const ionContent = el.closest('ion-content');
    const inner = ionContent?.shadowRoot?.querySelector<HTMLElement>('.inner-scroll');
    const contentOverflow = inner ? inner.scrollWidth > inner.clientWidth + 1 : false;
    const docOverflow =
      document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    const rect = el.getBoundingClientRect();
    return {
      contentOverflow,
      docOverflow,
      elOverflow: el.scrollWidth > el.clientWidth + 1,
      exceedsViewport: rect.right > maxWidth + 1,
    };
  }, viewportWidth);
  expect(overflow.docOverflow).toBe(false);
  expect(overflow.contentOverflow).toBe(false);
  expect(overflow.elOverflow).toBe(false);
  expect(overflow.exceedsViewport).toBe(false);
};

for (const english of [false, true]) {
  const locale: Locale = english ? 'en' : 'fr';
  const suffix = english ? ' @en' : '';
  const msg = catalogs[locale];

  test(`recipe version history promotes a saved revision and restores an earlier one${suffix}`, async ({
    page,
  }) => {
    await page.setViewportSize(english ? { width: 393, height: 851 } : { width: 360, height: 851 });
    await page.goto('/recipes');
    await routed(page).getByRole('heading', { name: 'Poolish + tangzhong', level: 2 }).tap();
    await expectRecipeRevision(page, 1);
    if (!english) {
      await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
    }

    // 1. Empty references and rev. 1 only in saved history above Preparations.
    await openHistory(page, locale);
    const refs = referencesRegion(page, locale);
    const saved = savedHistoryRegion(page, locale);
    const preps = preparationsRegion(page, locale);

    await expect(refs).toContainText(msg['history.versions.referencesEmpty']);
    await expect(refs.getByRole('listitem')).toHaveCount(0);

    const savedItemsInitial = saved.getByRole('listitem');
    await expect(savedItemsInitial).toHaveCount(1);
    await expect(savedItemsInitial.nth(0)).toContainText(msg['history.versions.current']);
    await expect(savedItemsInitial.nth(0)).toContainText(revText(locale, 1));
    await expect(
      saved.getByRole('button', { name: restoreButtonLabel(locale, 1), exact: true }),
    ).toHaveCount(0);
    await expect(
      saved.getByRole('button', { name: promoteButtonLabel(locale, 1), exact: true }),
    ).toBeVisible();
    await expect(preps).toBeVisible();

    const [refsBox, savedBox, prepsBox] = await Promise.all([
      refs.boundingBox(),
      saved.boundingBox(),
      preps.boundingBox(),
    ]);
    expect(refsBox).not.toBeNull();
    expect(savedBox).not.toBeNull();
    expect(prepsBox).not.toBeNull();
    if (refsBox && savedBox && prepsBox) {
      expect(refsBox.y).toBeLessThan(savedBox.y);
      expect(savedBox.y).toBeLessThan(prepsBox.y);
    }

    // 2. Real quantity save creating rev. 2 (poolish water 300 -> 310).
    await recipeTab(page, locale).tap();
    await enterEditor(page);
    const waterField = poolishWaterInput(page, locale);
    await expect(waterField).toHaveValue('300');
    await waterField.fill('310');
    await waterField.blur();

    const draftBar = routed(page).getByTestId('recipe-draft-bar');
    await draftBar.getByRole('button', { name: msg['bake.save'], exact: true }).tap();
    await expectRecipeRevision(page, 2);

    // 3. Create an open dirty draft (310 -> 325), then switch to History: persistent bar & draft notice stay.
    await enterEditor(page);
    await expect(waterField).toHaveValue('310');
    await waterField.fill('325');
    await waterField.blur();
    await expect(waterField).toHaveValue('325');

    await openHistory(page, locale);
    await expect(draftBar).toBeVisible();
    await expect(historyPanel(page)).toContainText(msg['history.versions.draftNotice']);

    const savedItemsRev2 = saved.getByRole('listitem');
    await expect(savedItemsRev2).toHaveCount(2);
    await expect(savedItemsRev2.nth(0)).toContainText(msg['history.versions.current']);
    await expect(savedItemsRev2.nth(0)).toContainText(revText(locale, 2));
    await expect(savedItemsRev2.nth(1)).toContainText(revText(locale, 1));
    await expect(
      saved.getByRole('button', { name: restoreButtonLabel(locale, 2), exact: true }),
    ).toHaveCount(0);
    await expect(
      saved.getByRole('button', { name: restoreButtonLabel(locale, 1), exact: true }),
    ).toBeVisible();

    // 4. Promote saved rev. 2 with a name while the dirty draft is open; head stays 2.
    const refName = english ? 'Winter loaf' : 'Pain d’hiver';
    await saved.getByRole('button', { name: promoteButtonLabel(locale, 2), exact: true }).tap();
    const promoteAlert = page.locator('ion-alert');
    await expect(promoteAlert).toBeVisible();
    await expect(page.locator('ion-toast:not(.overlay-hidden)')).toHaveCount(0);
    await expect(promoteAlert.locator('button').first()).toHaveText(msg['bake.cancel']);
    await promoteAlert
      .getByRole('textbox', { name: msg['history.versions.promoteNameLabel'], exact: true })
      .fill(refName);
    await promoteAlert
      .getByRole('button', { name: msg['history.versions.promoteConfirm'], exact: true })
      .tap();
    await expect(promoteAlert).toBeHidden();

    const refItems = refs.getByRole('listitem');
    await expect(refItems).toHaveCount(1);
    await expect(refItems.nth(0)).toContainText(referenceNumberLabel(locale, 1));
    await expect(refItems.nth(0)).toContainText(refName);
    await expect(refItems.nth(0)).toContainText(revText(locale, 2));
    await expectRecipeRevision(page, 2);

    // 5. Restore rev. 1 while the 325 g dirty draft is still open -> rev. 3 created, rev. 1/2 kept.
    await saved.getByRole('button', { name: restoreButtonLabel(locale, 1), exact: true }).tap();
    const restoreAlert = page.locator('ion-alert');
    await expect(restoreAlert).toBeVisible();
    await expect(restoreAlert.locator('button').first()).toHaveText(msg['bake.cancel']);
    await restoreAlert
      .getByRole('button', { name: msg['history.versions.restoreConfirm'], exact: true })
      .tap();
    await expect(restoreAlert).toBeHidden();

    await expectRecipeRevision(page, 3);
    const savedItemsRev3 = saved.getByRole('listitem');
    await expect(savedItemsRev3).toHaveCount(3);
    await expect(savedItemsRev3.nth(0)).toContainText(msg['history.versions.current']);
    await expect(savedItemsRev3.nth(0)).toContainText(revText(locale, 3));
    await expect(savedItemsRev3.nth(1)).toContainText(revText(locale, 2));
    await expect(savedItemsRev3.nth(2)).toContainText(revText(locale, 1));
    await expect(savedItemsRev3.nth(1)).toContainText(
      linkedReferenceNamedLabel(locale, 1, refName),
    );

    await expectNoHorizontalOverflow(page, refs);
    await expectNoHorizontalOverflow(page, saved);

    // 6. Switch to Recipe: dirty draft still shows 325; Save fails with HeadConflict and keeps draft.
    await recipeTab(page, locale).tap();
    await expect(waterField).toHaveValue('325');
    await draftBar.getByRole('button', { name: msg['bake.save'], exact: true }).tap();
    await expect(routed(page).locator('#recipe-formula-error')).toHaveText(
      msg['error.HeadConflict'],
    );
    await expect(draftBar).toBeVisible();
    await expect(waterField).toHaveValue('325');

    // 7. Discard dirty draft and verify restored saved formula (300 g poolish water, 1774 g dough).
    await draftBar.getByRole('button', { name: msg['editor.discard'], exact: true }).tap();
    const discardAlert = page.locator('ion-alert');
    await expect(discardAlert).toBeVisible();
    await discardAlert.getByRole('button', { name: msg['draft.discard'], exact: true }).tap();
    await expect(discardAlert).toBeHidden();
    await expect(draftBar).toHaveCount(0);

    await expect(routed(page).locator('[data-carousel-pane="formula"]')).toContainText(
      /1[\s\u00a0\u202f,]?774[\s\u00a0]g/,
    );
    await enterEditor(page);
    await expect(poolishWaterInput(page, locale)).toHaveValue('300');
  });
}
