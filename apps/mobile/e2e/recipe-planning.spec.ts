import { expect, test } from './fixtures';
import type { Page } from '@playwright/test';

const routed = (page: Page) => page.locator('ion-router-outlet > .ion-page:not(.ion-page-hidden)');
const modal = (page: Page) => page.locator('ion-modal:not(.overlay-hidden)');
const footer = (page: Page) => routed(page).locator('ion-footer:visible');
const scrollTop = (page: Page) =>
  routed(page)
    .locator('ion-content')
    .evaluate(
      async (host) =>
        (
          await (
            host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
          ).getScrollElement()
        ).scrollTop,
    );
const setScroll = (page: Page, top: number) =>
  routed(page)
    .locator('ion-content')
    .evaluate(async (host, value) => {
      (
        await (
          host as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
        ).getScrollElement()
      ).scrollTop = value;
    }, top);

for (const english of [false, true]) {
  test(`Recipe tabs keep their complete labels inside separate buttons at larger text${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 851 });
    await page.goto('/recipes');
    await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
    await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
    await expect(routed(page)).toHaveCount(1);
    await page.addStyleTag({ content: 'html, body { font-size: 20px !important; }' });
    const tabs = routed(page)
      .getByRole('group')
      .filter({
        has: page.getByRole('button', { name: english ? 'Recipe' : 'Recette', exact: true }),
      });
    const bounds = await tabs.getByRole('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const range = document.createRange();
        range.selectNodeContents(button);
        const rect = button.getBoundingClientRect();
        return {
          label: button.textContent,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          text: [...range.getClientRects()].map((r) => ({
            left: r.left,
            right: r.right,
            top: r.top,
            bottom: r.bottom,
          })),
        };
      }),
    );
    expect(bounds.map((b) => b.label)).toEqual(
      english ? ['Recipe', 'Planning', 'History'] : ['Recette', 'Planification', 'Historique'],
    );
    for (const button of bounds)
      for (const text of button.text) {
        expect(text.left, button.label ?? '').toBeGreaterThanOrEqual(button.left - 1);
        expect(text.right, button.label ?? '').toBeLessThanOrEqual(button.right + 1);
        expect(text.top).toBeGreaterThanOrEqual(button.top - 1);
        expect(text.bottom).toBeLessThanOrEqual(button.bottom + 1);
      }
  });
  const suffix = english ? ' @en' : '';
  const openSaved = async (page: Page) => {
    await page.setViewportSize({ width: english ? 393 : 360, height: 851 });
    await page.emulateMedia({ colorScheme: english ? 'light' : 'dark' });
    await page.goto('/recipes');
    await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
    await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
    await expect(routed(page)).toHaveCount(1);
  };
  const recipe = (page: Page) =>
    routed(page).getByRole('button', { name: english ? 'Recipe' : 'Recette', exact: true });
  const planning = (page: Page) =>
    routed(page).getByRole('button', { name: english ? 'Planning' : 'Planification', exact: true });
  const shortcut = (page: Page) =>
    routed(page).getByRole('button', {
      name: english ? 'Edit Bulk fermentation in recipe' : 'Modifier Pointage dans la recette',
      exact: true,
    });
  const returnToPlanning = (page: Page) =>
    routed(page).getByRole('button', {
      name: english ? 'Return to planning' : 'Revenir à la planification',
      exact: true,
    });
  const close = async (page: Page) => {
    await modal(page)
      .getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true })
      .click();
    await expect(modal(page)).toHaveCount(0);
  };

  test(`Planning shortcuts retain the chosen time, target and scroll; repeated step entry works${suffix}`, async ({
    page,
  }) => {
    await openSaved(page);
    await planning(page).click();
    await routed(page)
      .getByRole('button', { name: english ? 'Ready by' : 'Prêt pour', exact: true })
      .click();
    const when = routed(page).locator('input[type="datetime-local"]:visible');
    const target = routed(page).getByRole('combobox', {
      name: english ? /^Ready at the end of/ : /^Prêt à la fin de/,
    });
    await when.fill('2026-11-05T14:00');
    await target.selectOption('proof');
    await setScroll(page, 260);
    await expect.poll(() => scrollTop(page)).toBe(260);
    await shortcut(page).evaluate((button: HTMLButtonElement) => button.click());
    await expect(modal(page)).toBeVisible();
    await expect(modal(page).locator('ion-title')).toHaveText(
      english ? 'Bulk fermentation' : 'Pointage',
    );
    await close(page);
    await expect(footer(page).getByRole('status')).toHaveText(english ? 'Up to date' : 'À jour');
    await returnToPlanning(page).evaluate((button: HTMLButtonElement) => button.click());
    await expect.poll(() => scrollTop(page)).toBe(260);
    await expect(when).toHaveValue('2026-11-05T14:00');
    await expect(target).toHaveValue('proof');
    await expect(routed(page).locator('input:not([type="datetime-local"]):visible')).toHaveCount(0);
    await shortcut(page).click();
    await expect(modal(page)).toBeVisible();
    await close(page);
    await expect(
      routed(page)
        .getByRole('button', {
          name: english ? 'Edit step Bulk fermentation' : 'Modifier l’étape Pointage',
          exact: true,
        })
        .filter({ visible: true }),
    ).toBeFocused();
    await returnToPlanning(page).click();
    await expect(when).toHaveValue('2026-11-05T14:00');
  });

  test(`Recipe owns authored durations; Planning preserves pending invalid composition${suffix}`, async ({
    page,
  }) => {
    await openSaved(page);
    await routed(page)
      .getByRole('button', { name: english ? 'Edit' : 'Modifier', exact: true })
      .click();
    const duration = routed(page).getByLabel(english ? 'Duration of Mix' : 'Durée : Pétrissage', {
      exact: true,
    });
    await duration.fill('12 min');
    await duration.press('Enter');
    const water = routed(page).getByLabel(english ? 'Water (g)' : 'Eau (g)', { exact: true });
    await water.fill('abc');
    await water.blur();
    await planning(page).click();
    await expect(routed(page).locator('input:visible')).toHaveCount(0);
    await expect(
      routed(page).getByText('12 min', { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await shortcut(page).click();
    await expect(modal(page)).toBeVisible();
    await close(page);
    await returnToPlanning(page).click();
    await recipe(page).click();
    await expect(water).toHaveValue('abc');
    await expect(water).toHaveAttribute('aria-invalid', 'true');
    await expect(duration).toHaveValue('12 min');
    await expect(
      footer(page).getByRole('button', {
        name: english ? 'Save v2' : 'Enregistrer v2',
        exact: true,
      }),
    ).toBeDisabled();
    await water.fill('750');
    await water.press('Enter');
    await footer(page)
      .getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true })
      .click();
    await expect(footer(page)).toHaveCount(0);
    await planning(page).click();
    await expect(
      routed(page).getByText('12 min', { exact: true }).filter({ visible: true }),
    ).toBeVisible();
    await expect(routed(page).locator('input:visible')).toHaveCount(0);
  });

  test(`Method uses the existing fermentation authoring path and preserves Auto${suffix}`, async ({
    page,
  }) => {
    await openSaved(page);
    await routed(page)
      .getByRole('button', { name: english ? 'Edit' : 'Modifier', exact: true })
      .click();
    const auto = routed(page).getByRole('button', {
      name: english
        ? 'Bulk fermentation: duration from the model'
        : 'Pointage : durée selon le modèle',
      exact: true,
    });
    await auto.click();
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
    await expect(
      routed(page).getByLabel(english ? 'Duration of Bulk fermentation' : 'Durée : Pointage', {
        exact: true,
      }),
    ).toHaveCount(0);
    await routed(page)
      .getByRole('button', {
        name: english
          ? 'Edit fermentation settings for Bulk fermentation'
          : 'Modifier les paramètres de fermentation pour Pointage',
        exact: true,
      })
      .click();
    await expect(routed(page).getByTestId('fermentation-card')).toBeFocused();
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
    await planning(page).click();
    await expect(routed(page).locator('input:visible')).toHaveCount(0);
    await expect(routed(page).getByText(/^≈ /).filter({ visible: true })).not.toHaveCount(0);
    await recipe(page).click();
    await expect(auto).toHaveAttribute('aria-pressed', 'true');
  });

  test(`A fold style survives clearing and retyping its interval; explicit removal resets it${suffix}`, async ({
    page,
  }) => {
    await openSaved(page);
    await routed(page)
      .getByRole('button', { name: english ? 'Edit' : 'Modifier', exact: true })
      .click();
    const bulk = routed(page).getByRole('button', {
      name: english ? 'Edit step Bulk fermentation' : 'Modifier l’étape Pointage',
      exact: true,
    });
    await bulk.click();
    const count = modal(page).getByLabel(english ? 'Number of sets' : 'Nombre de séries', {
      exact: true,
    });
    const interval = modal(page).getByLabel(
      english ? 'Interval between sets' : 'Intervalle entre les séries',
      { exact: true },
    );
    const style = modal(page).getByLabel('Style', { exact: true });
    await count.fill('3');
    await count.press('Enter');
    await interval.fill('20 min');
    await interval.press('Enter');
    await style.selectOption('coilFold');
    await interval.fill('');
    await interval.press('Enter');
    await interval.fill('40 min');
    await interval.press('Enter');
    await expect(style).toHaveValue('coilFold');
    await close(page);
    await footer(page)
      .getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true })
      .click();
    await routed(page)
      .getByRole('button', { name: english ? 'Edit' : 'Modifier', exact: true })
      .click();
    await bulk.click();
    await expect(style).toHaveValue('coilFold');
    await modal(page)
      .getByRole('button', {
        name: english ? 'Remove the folds' : 'Retirer les rabats',
        exact: true,
      })
      .click();
    await count.fill('2');
    await count.press('Enter');
    await interval.fill('20 min');
    await interval.press('Enter');
    await expect(style).toHaveValue('');
  });

  test(`Consultation exposes hydration lock state and a nonmutating edit shortcut${suffix}`, async ({
    page,
  }) => {
    await openSaved(page);
    const hydrationEdit = routed(page).getByRole('button', {
      name: english ? 'Edit hydration' : 'Modifier l’hydratation',
      exact: true,
    });
    await expect(
      routed(page).getByText(english ? 'Hydration unlocked' : 'Hydratation déverrouillée', {
        exact: true,
      }),
    ).toBeVisible();
    await hydrationEdit.click();
    await expect(
      routed(page).getByRole('region', {
        name: english ? 'Hydration' : 'Hydratation',
        exact: true,
      }),
    ).toBeFocused();
    await expect(footer(page).getByRole('status')).toHaveText(english ? 'Up to date' : 'À jour');
    await expect(
      footer(page).getByRole('button', {
        name: english ? 'Save v2' : 'Enregistrer v2',
        exact: true,
      }),
    ).toBeDisabled();
    const lock = routed(page).getByRole('button', {
      name: english ? /^Lock the hydration at/ : /^Verrouiller l’hydratation à/,
    });
    await expect(lock).toBeVisible();
    await lock.click();
    await footer(page)
      .getByRole('button', { name: english ? 'Save v2' : 'Enregistrer v2', exact: true })
      .click();
    await expect(
      routed(page)
        .getByText(english ? /^Hydration locked at/ : /^Hydratation verrouillée à/)
        .filter({ visible: true }),
    ).toBeVisible();
    await hydrationEdit.click();
    await routed(page)
      .getByRole('button', {
        name: english ? 'Unlock the hydration' : 'Déverrouiller l’hydratation',
        exact: true,
      })
      .click();
    await footer(page)
      .getByRole('button', { name: english ? 'Save v3' : 'Enregistrer v3', exact: true })
      .click();
    await expect(
      routed(page).getByText(english ? 'Hydration unlocked' : 'Hydratation déverrouillée', {
        exact: true,
      }),
    ).toBeVisible();
  });
}

test('removing a step from the Recipe sheet dismisses it and returns focus to a visible action', async ({
  page,
}) => {
  await page.goto('/recipes');
  await page.getByText('Poolish + tangzhong', { exact: true }).first().click();
  await expect(routed(page).getByText('Version 1', { exact: true })).toBeVisible();
  await expect(routed(page)).toHaveCount(1);
  await routed(page).getByRole('button', { name: 'Planification', exact: true }).click();
  await routed(page)
    .getByRole('button', { name: 'Modifier Façonnage dans la recette', exact: true })
    .click();
  await expect(modal(page)).toBeVisible();
  await modal(page).getByRole('button', { name: 'Retirer cette étape', exact: true }).click();
  await page.locator('ion-alert').getByRole('button', { name: 'Annuler', exact: true }).click();
  await expect(page.locator('ion-alert')).toHaveCount(0);
  await expect(modal(page)).toBeVisible();
  await expect(modal(page).locator('ion-title')).toHaveText('Façonnage');
  await modal(page).getByRole('button', { name: 'Retirer cette étape', exact: true }).click();
  await page
    .locator('ion-alert')
    .getByRole('button', { name: 'Retirer cette étape', exact: true })
    .dblclick();
  await expect(modal(page)).toHaveCount(0);
  const back = routed(page).getByRole('button', {
    name: 'Revenir à la planification',
    exact: true,
  });
  await expect(back).toBeFocused();
  await expect(
    routed(page).getByRole('button', { name: 'Modifier l’étape Façonnage', exact: true }),
  ).toHaveCount(0);
  await back.click();
  await expect(
    routed(page).getByRole('button', { name: 'Modifier Façonnage dans la recette', exact: true }),
  ).toHaveCount(0);
  await expect(routed(page).locator('input:visible')).toHaveCount(0);
});
