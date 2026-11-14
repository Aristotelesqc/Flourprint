import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { enterEditor, expectRecipeRevision, routed } from './ui-actions';

const bar = (page: Page) => routed(page).getByTestId('recipe-draft-bar');
const field = (page: Page, en: boolean) =>
  routed(page).getByLabel(en ? 'Water, Final mix (g)' : 'Eau, Mélange final (g)', { exact: true });
const action = (page: Page, name: string) => bar(page).getByRole('button', { name, exact: true });
const box = async (locator: Locator) => {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('Missing editing-bar geometry');
  return rect;
};
const tab = async (page: Page, name: string) => {
  const control = routed(page).getByRole('tab', { name, exact: true });
  await control.click();
  await expect(control).toHaveAttribute('aria-selected', 'true');
};
const open = async (page: Page) => {
  await page.goto('/recipes');
  await routed(page)
    .getByRole('heading', { name: 'Poolish + tangzhong', level: 2, exact: true })
    .click();
  await expectRecipeRevision(page, 1);
};

for (const en of [false, true]) {
  const suffix = en ? ' @en' : '';
  const names = en
    ? {
        recipe: 'Recipe',
        planning: 'Planning',
        history: 'History',
        save: 'Save',
        saved: 'Saved.',
        undo: 'Undo last change',
        redo: 'Redo',
        discard: 'Discard changes',
        cancel: 'Cancel',
      }
    : {
        recipe: 'Recette',
        planning: 'Planification',
        history: 'Historique',
        save: 'Enregistrer',
        saved: 'Recette enregistr\u00e9e.',
        undo: 'Annuler la dernière modification',
        redo: 'Rétablir',
        discard: 'Abandonner les modifications',
        cancel: 'Annuler',
      };

  for (const theme of ['light', 'dark', 'amoled'] as const) {
    for (const large of [false, true]) {
      test(`editing controls stay docked and clear of corners across tabs ${theme} ${large ? '360/130' : '393/100'}${suffix}`, async ({
        page,
      }, info) => {
        const width = large ? 360 : 393;
        await page.setViewportSize({ width, height: 900 });
        await page.goto('/advanced');
        await routed(page)
          .getByRole('button', {
            name:
              theme === 'amoled'
                ? 'AMOLED'
                : theme === 'dark'
                  ? /^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/
                  : /^(Clair|Light)$/,
            exact: true,
          })
          .click();
        await routed(page).locator('ion-back-button').click();
        await routed(page)
          .getByRole('heading', { name: 'Poolish + tangzhong', level: 2, exact: true })
          .click();
        await expect(
          routed(page)
            .locator('ion-header')
            .getByRole('heading', { level: 1, name: 'Poolish + tangzhong', exact: true }),
        ).toBeVisible();
        await expect(routed(page)).toHaveCount(1);
        if (large)
          await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await expect(bar(page)).toHaveCount(0);
        const content = routed(page).locator('ion-content');
        // A larger platform inset must win over the minimum physical-corner gutter.
        if (large && theme === 'amoled') {
          await page.locator('html').evaluate((node) => {
            node.style.setProperty('--ion-safe-area-left', '32px');
            node.style.setProperty('--ion-safe-area-right', '34px');
            node.style.setProperty('--ion-safe-area-bottom', '40px');
          });
        }
        const viewport = await box(content);
        await enterEditor(page);
        await expect(action(page, names.save)).toBeDisabled();
        const initial = await box(bar(page));
        const targets = await bar(page).getByRole('button').all();
        expect(targets).toHaveLength(4);
        const initialTargets = await Promise.all(targets.map(box));
        await field(page, en).fill('201');
        await field(page, en).blur();
        await expect(action(page, names.save)).toBeEnabled();
        for (const section of [names.recipe, names.planning, names.history]) {
          await tab(page, section);
          await expect(routed(page).locator('ion-footer')).toHaveCount(0);
          expect(await box(content)).toEqual(viewport);
          const current = await box(bar(page));
          expect(current).toEqual(initial);
          expect(current.x).toBe(0);
          expect(current.width).toBe(width);
          expect(current.y + current.height).toBeCloseTo(viewport.y + viewport.height, 0);
          const bounds = await Promise.all(targets.map(box));
          expect(bounds).toEqual(initialTargets);
          let right = 0;
          for (const target of bounds) {
            expect(target.width).toBeGreaterThanOrEqual(48);
            expect(target.height).toBeGreaterThanOrEqual(48);
            expect(target.x).toBeGreaterThanOrEqual(large && theme === 'amoled' ? 32 : 20);
            expect(target.x + target.width).toBeLessThanOrEqual(
              width - (large && theme === 'amoled' ? 34 : 20),
            );
            expect(current.y + current.height - target.y - target.height).toBeGreaterThanOrEqual(
              large && theme === 'amoled' ? 40 : 24,
            );
            expect(target.x).toBeGreaterThanOrEqual(right);
            right = target.x + target.width;
          }
          const paintedBottom = await bar(page).evaluate((host) => {
            const r = host.getBoundingClientRect();
            const node = document.elementFromPoint(r.x + r.width / 2, r.bottom - 1);
            if (!node) throw new Error('Missing bottom surface');
            return { inside: host.contains(node), color: getComputedStyle(node).backgroundColor };
          });
          expect(paintedBottom.inside).toBe(true);
          expect(paintedBottom.color).not.toBe('rgba(0, 0, 0, 0)');
          expect(
            await action(page, names.save).evaluate((node) => node.scrollWidth <= node.clientWidth),
          ).toBe(true);
          const labelBounds = await action(page, names.save).evaluate((node) => {
            const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
            const text = walker.nextNode();
            if (!text) throw new Error('Missing visible Save label');
            const range = document.createRange();
            range.selectNodeContents(text);
            const label = range.getBoundingClientRect();
            const target = node.getBoundingClientRect();
            return { left: label.left - target.left, right: target.right - label.right };
          });
          expect(labelBounds.left).toBeGreaterThanOrEqual(0);
          expect(labelBounds.right).toBeGreaterThanOrEqual(0);
          if (section === names.recipe) {
            await content.evaluate(async (host) => {
              const scroller = await (
                host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
              ).getScrollElement();
              scroller.scrollTop = scroller.scrollHeight;
            });
            const end = await box(routed(page).locator('[data-carousel-pane="formula"]'));
            expect(end.y + end.height).toBeLessThanOrEqual(current.y + 1);
          }
          await page.screenshot({ path: info.outputPath(`${section}.png`) });
        }
      });
    }
  }

  test(`one draft supports undo in Planning, redo and save in History${suffix}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await open(page);
    await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
    await enterEditor(page);
    await field(page, en).fill('201');
    await field(page, en).blur();
    await tab(page, names.planning);
    await action(page, names.undo).click();
    await expect(action(page, names.save)).toBeDisabled();
    await tab(page, names.history);
    await action(page, names.redo).click();
    await expect(action(page, names.save)).toBeEnabled();
    await action(page, names.save).click();
    await expect(bar(page)).toHaveCount(0);
    const toast = page.locator('ion-toast').getByRole('status').filter({ hasText: names.saved });
    await expect(toast.getByText(names.saved, { exact: true })).toBeVisible();
    await expect(toast).toHaveAttribute('aria-live', 'polite');
    const header = await box(routed(page).locator('ion-header'));
    await expect
      .poll(async () => (await box(toast)).y)
      .toBeGreaterThanOrEqual(header.y + header.height);
    await tab(page, names.recipe);
    await enterEditor(page);
    await expect(toast).toBeVisible();
    await expect(field(page, en)).toHaveValue('201');
    await page.screenshot({ path: info.outputPath('reopened-while-save-notice-visible.png') });
    await expectRecipeRevision(page, 2);
    await action(page, names.discard).click();
    await expect(bar(page)).toHaveCount(0);
    await routed(page)
      .getByRole('button', { name: en ? 'Back' : 'Retour', exact: true })
      .click();
    await routed(page)
      .getByRole('heading', { name: 'Poolish + tangzhong', level: 2, exact: true })
      .click();
    await enterEditor(page);
    await expect(field(page, en)).toHaveValue('201');
  });

  test(`closing a clean draft keeps the current Planning or History tab${suffix}`, async ({
    page,
  }) => {
    await open(page);
    for (const section of [names.planning, names.history]) {
      await enterEditor(page);
      await tab(page, section);
      await expect(action(page, names.save)).toBeDisabled();
      await action(page, names.discard).click();
      await expect(bar(page)).toHaveCount(0);
      await expect(routed(page).getByRole('tab', { name: section, exact: true })).toHaveAttribute(
        'aria-selected',
        'true',
      );
      await expect(page.locator('ion-alert:not(.overlay-hidden)')).toHaveCount(0);
      if (section === names.planning) {
        await expect(
          routed(page)
            .locator('ion-footer')
            .getByRole('button', {
              name: en ? 'Start preparation' : 'Démarrer la préparation',
              exact: true,
            }),
        ).toBeEnabled();
      } else {
        await expect(routed(page).locator('ion-footer')).toHaveCount(0);
      }
    }
    await expectRecipeRevision(page, 1);
  });

  test(`invalid raw input stays guarded and discard confirms outside Recipe${suffix}`, async ({
    page,
  }) => {
    await open(page);
    await enterEditor(page);
    await field(page, en).fill('abc');
    await field(page, en).blur();
    await tab(page, names.planning);
    await expect(action(page, names.save)).toBeDisabled();
    await expect(action(page, names.undo)).toBeDisabled();
    await action(page, names.discard).click();
    const alert = page.locator('ion-alert:not(.overlay-hidden)');
    await expect(alert).toBeVisible();
    await alert.getByRole('button', { name: names.cancel, exact: true }).click();
    await expect(alert).toHaveCount(0);
    await expect(action(page, names.discard)).toBeFocused();
    await tab(page, names.recipe);
    await expect(field(page, en)).toHaveValue('abc');
    await tab(page, names.history);
    await action(page, names.discard).click();
    await page
      .locator('ion-alert:not(.overlay-hidden)')
      .getByRole('button', { name: names.discard, exact: true })
      .click();
    await expect(bar(page)).toHaveCount(0);
    await tab(page, names.recipe);
    await enterEditor(page);
    await expect(field(page, en)).toHaveValue('200');
  });
}
