import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures';
import { editorSection, enterEditor, expectRecipeRevision, menuAction, routed } from './ui-actions';

type TimingEntry = {
  target: '.modal-wrapper' | 'ion-backdrop';
  duration: unknown;
  easing: unknown;
};

const sheetDuration = 260;
const sheetEasing = 'cubic-bezier(0.05, 0.7, 0.1, 1)';
const backdropEasing = 'cubic-bezier(0.2, 0, 0, 1)';

const installTimingCollector = (page: Page) =>
  page.addInitScript(() => {
    const play = Animation.prototype.play;
    const log: TimingEntry[] = [];
    (window as unknown as { __sheetMotionLog?: TimingEntry[] }).__sheetMotionLog = log;
    Animation.prototype.play = function () {
      const effect = this.effect;
      if (effect instanceof KeyframeEffect && effect.target instanceof Element) {
        const target = effect.target;
        const part = target.matches('.modal-wrapper')
          ? '.modal-wrapper'
          : target.matches('ion-backdrop')
            ? 'ion-backdrop'
            : null;
        const root = target.getRootNode();
        if (part && root instanceof ShadowRoot && root.host.matches('ion-modal')) {
          queueMicrotask(() => {
            const { duration, easing } = effect.getTiming();
            log.push({ target: part, duration, easing });
          });
        }
      }
      return play.call(this);
    };
  });

const drainLog = (page: Page) =>
  page.evaluate(() => {
    const host = window as unknown as { __sheetMotionLog?: TimingEntry[] };
    return host.__sheetMotionLog?.splice(0) ?? [];
  });

const expectTiming = async (page: Page, reduced: boolean) => {
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __sheetMotionLog?: TimingEntry[] }).__sheetMotionLog ?? [],
      ),
    )
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({ target: '.modal-wrapper' }),
        expect.objectContaining({ target: 'ion-backdrop' }),
      ]),
    );
  for (const entry of await drainLog(page)) {
    expect(entry.duration).toBe(reduced ? 0 : sheetDuration);
    if (!reduced) {
      expect(entry.easing).toBe(entry.target === '.modal-wrapper' ? sheetEasing : backdropEasing);
    }
  }
};

const verifySheetCycle = async (
  page: Page,
  sheet: Locator,
  close: Locator,
  opener: Locator,
  ready: Locator,
  open: () => Promise<void>,
  reduced: boolean,
  duringOpen?: () => Promise<void>,
) => {
  await drainLog(page);
  await open();
  await expect(ready).toBeVisible();
  await expectTiming(page, reduced);
  await expect
    .poll(() =>
      sheet.evaluate((modal) => {
        const wrapper = modal.shadowRoot?.querySelector('.modal-wrapper');
        return wrapper ? getComputedStyle(wrapper).opacity : undefined;
      }),
    )
    .toBe('1');
  if (duringOpen) await duringOpen();
  await drainLog(page);
  await close.click();
  await expect(sheet).toBeHidden();
  await expect(opener).toBeFocused();
  await expectTiming(page, reduced);
};

for (const english of [false, true]) {
  test(`step and review sheets motion and semantics${english ? ' @en' : ''}`, async ({ page }) => {
    await installTimingCollector(page);
    await page.goto('/recipes');
    await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
    await expectRecipeRevision(page, 1);
    await enterEditor(page);
    await editorSection(page, 'steps');

    const editStep = routed(page).getByRole('button', {
      name: english ? 'Edit step Mix' : 'Modifier l’étape Pétrissage',
      exact: true,
    });
    const editActions = routed(page).getByRole('button', {
      name: english ? 'Edit actions' : 'Menu édition',
      exact: true,
    });
    const sheet = page.locator('ion-modal:not(.overlay-hidden)');
    const close = sheet.getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true });
    const duration = sheet.getByRole('textbox', {
      name: english ? 'Duration of Mix' : 'Durée : Pétrissage',
      exact: true,
    });
    const reviewHeading = sheet.getByRole('heading', {
      name: english ? 'Draft changes' : 'Modifications du brouillon',
      exact: true,
    });
    const openStep = () => editStep.click();
    const openReview = () =>
      menuAction(page, english ? /^Review changes$/ : /^Examiner les modifications$/);

    await verifySheetCycle(page, sheet, close, editStep, duration, openStep, false, async () => {
      await duration.fill('-');
      await close.click();
      await expect(duration).toHaveValue('-');
      await duration.fill('12 min');
      await duration.press('Tab');
    });

    await verifySheetCycle(
      page,
      sheet,
      close,
      editActions,
      reviewHeading,
      openReview,
      false,
      async () => {
        await expect(sheet).toContainText(
          english ? 'Process parameters modified.' : 'Paramètres du processus modifiés.',
        );
        expect(
          await sheet.evaluate((el) => {
            const modal = el as HTMLElement & {
              breakpoints?: number[];
              initialBreakpoint?: number;
              handleBehavior?: string;
            };
            const rect = el.shadowRoot?.querySelector('[part="handle"]')?.getBoundingClientRect();
            return {
              breakpoints: modal.breakpoints,
              initialBreakpoint: modal.initialBreakpoint,
              handleBehavior: modal.handleBehavior,
              hasHandle: Boolean(rect && rect.width > 0 && rect.height > 0),
            };
          }),
        ).toEqual({
          breakpoints: [0, 0.7, 0.95],
          initialBreakpoint: 0.7,
          handleBehavior: 'cycle',
          hasHandle: true,
        });
      },
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await verifySheetCycle(page, sheet, close, editStep, duration, openStep, true);
    await verifySheetCycle(page, sheet, close, editActions, reviewHeading, openReview, true);

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('html').evaluate((html) => html.setAttribute('data-motion', 'reduced'));
    await verifySheetCycle(page, sheet, close, editStep, duration, openStep, true);
    await verifySheetCycle(page, sheet, close, editActions, reviewHeading, openReview, true);
  });

  test(`recipe checks sheet motion and semantics${english ? ' @en' : ''}`, async ({ page }) => {
    await installTimingCollector(page);
    await page.goto('/recipes');
    await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
    await expectRecipeRevision(page, 1);
    await enterEditor(page);

    const editActions = routed(page).getByRole('button', {
      name: english ? 'Edit actions' : 'Menu édition',
      exact: true,
    });
    const checksTitle = english ? 'Recipe check' : 'Vérification de la recette';
    const sheet = page.locator('ion-modal:not(.overlay-hidden)');
    const close = sheet.getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true });
    const checksDialog = page.getByRole('dialog', { name: checksTitle, exact: true });
    const checksStatus = sheet.getByRole('status');
    const openChecks = () =>
      menuAction(
        page,
        english ? /^Check recipe(?: \(\d+\))?$/ : /^Vérifier la recette(?: \(\d+\))?$/,
      );
    const expectChecksDialog = async () => {
      await expect(checksDialog).toBeVisible();
      await expect(close).toBeVisible();
    };

    await verifySheetCycle(
      page,
      sheet,
      close,
      editActions,
      checksStatus,
      openChecks,
      false,
      expectChecksDialog,
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await verifySheetCycle(
      page,
      sheet,
      close,
      editActions,
      checksStatus,
      openChecks,
      true,
      expectChecksDialog,
    );

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('html').evaluate((html) => html.setAttribute('data-motion', 'reduced'));
    await verifySheetCycle(
      page,
      sheet,
      close,
      editActions,
      checksStatus,
      openChecks,
      true,
      expectChecksDialog,
    );
  });
}
