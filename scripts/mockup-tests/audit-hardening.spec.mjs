import { openRecipeSteps, editProcessStep } from './screen-actions.mjs';
import { createRequire } from 'node:module';
const require = createRequire(new URL('../../apps/mobile/package.json', import.meta.url));
const { test, expect } = require('@playwright/test');

const address = (extra = {}) =>
  `/mockup.html?${new URLSearchParams({ screen: 'recipe', recipe: 'baguette', section: 'ingredients', nav: 'A', lang: 'en', theme: 'dark', width: '393', scale: '100', motion: 'reduce', capture: '1', ...extra })}`;
const modal = (page) => page.locator('dialog:modal:not([data-fp-ghost])');

test.describe('external audit hardening', () => {
  test('an untouched rounded display creates no extra undo entry', async ({ page }) => {
    await page.goto(address({ mode: 'edit' }));
    const salt = page.getByTestId('ingredient-grams-salt');
    const original = await salt.inputValue();
    await salt.fill('8.125');
    await salt.press('Enter');
    await salt.blur();
    await expect(salt).toHaveValue('8.13');
    await salt.focus();
    await salt.blur();
    await page.getByRole('button', { name: /Undo/ }).first().click();
    await expect(salt).toHaveValue(original);
  });

  test('intermediate numeric input blocks saving but announces errors only on commit', async ({
    page,
  }) => {
    await page.goto(address({ mode: 'edit' }));
    const salt = page.getByTestId('ingredient-grams-salt');
    await salt.fill('12.');
    await expect(page.getByTestId('save-recipe')).toBeDisabled();
    await expect(page.getByRole('alert')).toHaveCount(0);
    await salt.press('Enter');
    await expect(page.getByRole('alert')).toContainText('Enter a complete valid number');
    await salt.fill('12.5');
    await salt.press('Enter');
    await expect(page.getByRole('alert')).toHaveCount(0);
    await expect(page.getByTestId('save-recipe')).toBeEnabled();
  });

  test('cancel preserves invalid raw input until discard is confirmed', async ({ page }) => {
    await page.goto(address());
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const salt = page.getByTestId('ingredient-grams-salt');
    await salt.fill('-');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal(page)).toHaveCount(1);
    await expect(modal(page).locator('[data-overlay-presentation="compact"]')).toHaveCount(1);
    await modal(page)
      .locator('[data-fp-component="fp.button"]')
      .filter({ hasText: 'Stay here' })
      .click();
    await expect(modal(page)).toHaveCount(0);
    await expect(salt).toHaveValue('-');
    await expect(page.getByTestId('save-recipe')).toBeDisabled();
  });

  test('leaving a changed draft closes its menu before confirming', async ({ page }) => {
    await page.goto(address({ mode: 'edit' }));
    await page.getByTestId('ingredient-grams-salt').fill('13');
    await page.getByTestId('ingredient-grams-salt').press('Enter');
    await page.getByRole('banner').getByRole('button', { name: 'Navigation', exact: true }).click();
    await modal(page).getByRole('button', { name: 'Recipes', exact: true }).click();
    await expect(modal(page)).toHaveCount(1);
    await expect(modal(page)).not.toHaveAttribute('data-fp-component', 'fp.floating-menu');
    await modal(page)
      .locator('[data-fp-component="fp.button"]')
      .filter({ hasText: 'Stay here' })
      .click();
    await expect(page.getByTestId('ingredient-grams-salt')).toHaveValue('13');
  });

  test('Planning remains a generated projection while a recipe draft exists', async ({ page }) => {
    await page.goto(address({ recipe: 'shokupan', section: 'planning', mode: 'edit' }));
    const planning = page.locator('.section-carousel-pane.is-active');
    await expect(planning.locator('[data-testid^="step-menu-"]')).toHaveCount(0);
    await expect(planning.locator('[data-testid^="drag-handle-"]')).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Add step', exact: true })).toHaveCount(0);
    // L108: the draft remains open, but Planning has no per-step authoring shortcut.
    await expect(page.getByTestId('save-recipe')).toBeVisible();
  });

  test('an untouched existing draft cancels without a discard prompt', async ({ page }) => {
    await page.goto(address());
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
  });

  test('browser Back protects valid raw text that has not been committed', async ({ page }) => {
    await page.goto(address({ screen: 'library' }));
    await page.getByRole('button', { name: 'Baguette', exact: true }).click();
    await page.getByRole('button', { name: 'Edit', exact: true }).click();
    const salt = page.getByTestId('ingredient-grams-salt');
    const original = await salt.inputValue();
    await salt.fill('13.376');
    await expect(salt).toHaveValue('13.376');
    await page.goBack();
    await expect(modal(page)).toHaveCount(1);
    await modal(page)
      .locator('[data-fp-component="fp.button"]')
      .filter({ hasText: 'Stay here' })
      .click();
    // Native dialog focus blurs the field and accepts the valid edit; it must remain undoable.
    await expect(salt).toHaveValue('13.38');
    await page.getByRole('button', { name: 'Undo change', exact: true }).click();
    await expect(salt).toHaveValue(original);
    await expect(page.getByTestId('save-recipe')).toBeVisible();
  });

  test('Recipe groups retain their collapsed state across the timing-only Planning tab', async ({
    page,
  }) => {
    await page.goto(address({ recipe: 'shokupan', section: 'steps' }));
    const active = page.locator('.section-carousel-pane.is-active');
    const group = () =>
      active
        .locator('[data-fp-component="fp.group-card"] > button')
        .filter({ hasText: 'Tangzhong' });
    await expect(group()).toHaveAttribute('aria-expanded', 'true');
    await group().click();
    await expect(group()).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('tab', { name: 'Planning', exact: true }).click();
    // L108: Planning presents strand windows, not a duplicate collapsible step list.
    const timing = active.locator('[data-process-root="planning"]');
    await expect(timing.locator('[data-fp-component="fp.sortable-list"]')).toHaveCount(0);
    await expect(timing.locator('[data-fp-component="fp.step-node"]')).toHaveCount(0);
    await expect(timing).toContainText('Tangzhong');
    await openRecipeSteps(page, 'en');
    await expect(group()).toHaveAttribute('aria-expanded', 'false');
    await group().click();
    await expect(group()).toHaveAttribute('aria-expanded', 'true');
  });

  test('L108 Planning offers timing controls without per-step authoring or draft mutation', async ({
    page,
  }) => {
    await page.goto(address({ recipe: 'shokupan', section: 'ingredients', mode: 'edit' }));
    const name = page.getByTestId('recipe-name');
    await name.fill('Preserved planning draft');
    await page.getByRole('tab', { name: 'Planning', exact: true }).click();
    const planning = page.locator('.section-carousel-pane.is-active');
    await expect(
      planning.getByRole('button', { name: /Edit.*step|Apply to draft|Add step/i }),
    ).toHaveCount(0);
    await expect(
      planning.locator('[data-testid^="step-menu-"],[data-testid^="drag-handle-"]'),
    ).toHaveCount(0);
    await expect(modal(page)).toHaveCount(0);
    await page.getByRole('tab', { name: 'Recipe', exact: true }).click();
    await expect(name).toHaveValue('Preserved planning draft');
    await expect(page.getByTestId('save-recipe')).toBeVisible();
  });

  test('optional step temperature can be cleared and stays empty after reopening', async ({
    page,
  }) => {
    await page.goto(address({ recipe: 'shokupan', section: 'ingredients', mode: 'edit' }));
    await openRecipeSteps(page, 'en');
    await editProcessStep(page, 'mix', 'en');
    const temperature = modal(page).getByRole('textbox', { name: 'Temperature', exact: true });
    await expect(temperature).not.toHaveValue('');
    await temperature.fill('');
    await temperature.press('Enter');
    await expect(modal(page).getByRole('button', { name: 'Apply', exact: true })).toBeEnabled();
    await modal(page).getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(modal(page)).toHaveCount(0);
    await editProcessStep(page, 'mix', 'en');
    await expect(
      modal(page).getByRole('textbox', { name: 'Temperature', exact: true }),
    ).toHaveValue('');
  });

  for (const theme of ['light', 'dark', 'amoled']) {
    test(`settings text has readable contrast in ${theme}`, async ({ page }) => {
      await page.goto(address({ screen: 'settings', theme }));
      const ratios = await page
        .locator('.fp-device-settings-heading,.fp-device-settings-label')
        .evaluateAll((nodes) => {
          const luminance = (rgb) => {
            const channels = rgb.slice(0, 3).map((v) => {
              const c = v / 255;
              return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
            });
            return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
          };
          const rgb = (colour) => colour.match(/[\d.]+/g).map(Number);
          return nodes.map((node) => {
            let ancestor = node;
            let background;
            while (ancestor) {
              const colour = getComputedStyle(ancestor).backgroundColor;
              if (colour !== 'rgba(0, 0, 0, 0)' && colour !== 'transparent') {
                background = colour;
                break;
              }
              ancestor = ancestor.parentElement;
            }
            const fg = luminance(rgb(getComputedStyle(node).color));
            const bg = luminance(rgb(background || 'rgb(255, 255, 255)'));
            return {
              text: node.textContent,
              ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
            };
          });
        });
      expect(ratios.length).toBeGreaterThan(0);
      for (const item of ratios) expect(item.ratio, item.text).toBeGreaterThanOrEqual(4.5);
    });
  }

  test('early completion requires explicit confirmation and cancel leaves the preparation active', async ({
    page,
  }) => {
    await page.goto(address({ screen: 'preparation', recipe: 'shokupan' }));
    await page.getByRole('button', { name: 'Preparation actions', exact: true }).click();
    await page.getByTestId('finish-preparation-early').click();
    await expect(modal(page)).toHaveCount(1);
    await expect(modal(page).locator('[data-overlay-presentation="compact"]')).toHaveCount(1);
    await modal(page)
      .locator('[data-fp-component="fp.button"]')
      .filter({ hasText: 'Cancel' })
      .click();
    await expect(modal(page)).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Preparation actions', exact: true }),
    ).toBeVisible();
    await expect(page.getByText('Preparation complete', { exact: true })).toHaveCount(0);
  });

  test('early completion dismisses safely through Escape and backdrop, then confirms explicitly', async ({
    page,
  }) => {
    await page.goto(address({ screen: 'preparation', recipe: 'shokupan' }));
    const actions = page.getByRole('button', { name: 'Preparation actions', exact: true });
    const open = async () => {
      await actions.click();
      await page.getByTestId('finish-preparation-early').click();
      await expect(modal(page)).toHaveCount(1);
    };
    await open();
    await page.keyboard.press('Escape');
    await expect(modal(page)).toHaveCount(0);
    await expect(actions).toBeVisible();
    await open();
    await modal(page).click({ position: { x: 2, y: 2 } });
    await expect(modal(page)).toHaveCount(0);
    await expect(actions).toBeVisible();
    await open();
    await modal(page).getByRole('button', { name: 'Finish preparation', exact: true }).click();
    const outcome = page.getByRole('dialog', { name: 'Choose outcome', exact: true });
    await expect(outcome.getByRole('combobox', { name: 'Outcome', exact: true })).toHaveValue('');
    await expect(outcome.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
    await expect(page.getByTestId('recorded-outcome')).toHaveCount(0);
    await outcome.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('dough');
    const pieces = outcome.getByRole('textbox', { name: 'Count', exact: true });
    await pieces.fill('-');
    await pieces.press('Enter');
    await expect(outcome.getByRole('button', { name: 'Apply', exact: true })).toBeDisabled();
    await page.keyboard.press('Escape');
    await expect(actions).toBeVisible();
    await open();
    await modal(page).getByRole('button', { name: 'Finish preparation', exact: true }).click();
    await expect(outcome.getByRole('combobox', { name: 'Outcome', exact: true })).toBeEnabled();
    await expect(outcome.getByRole('combobox', { name: 'Outcome', exact: true })).toHaveValue('');
    await outcome.getByRole('combobox', { name: 'Outcome', exact: true }).selectOption('dough');
    await outcome
      .getByRole('combobox', { name: 'Dough disposition', exact: true })
      .selectOption('frozen');
    await outcome.getByRole('button', { name: 'Apply', exact: true }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Preparation complete', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('recorded-outcome')).toHaveText('Prepared dough · Frozen');
  });

  test('abandonment is explicit, retains the journal and records no cooked outcome', async ({
    page,
  }) => {
    await page.goto(address({ screen: 'preparation', recipe: 'shokupan' }));
    const actions = page.getByRole('button', { name: 'Preparation actions', exact: true });
    await actions.click();
    await page.getByTestId('abandon-preparation-btn').click();
    await expect(modal(page)).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(actions).toBeVisible();
    await actions.click();
    await page.getByTestId('abandon-preparation-btn').click();
    await modal(page).getByRole('button', { name: 'Abandon preparation', exact: true }).click();
    await expect(modal(page)).toHaveCount(0);
    await expect(
      page.getByRole('heading', { name: 'Preparation abandoned', exact: true }),
    ).toBeVisible();
    await expect(page.getByTestId('recorded-outcome')).toHaveText('No usable outcome recorded');
    await expect(page.getByText('Preparation complete', { exact: true })).toHaveCount(0);
    const businessJournal = page.getByTestId('prep-business-journal');
    await expect(businessJournal.locator('li').first()).toContainText('Preparation abandoned');
    await expect(businessJournal).toContainText('Preparation started');
  });
});
