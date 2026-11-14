import type { Locator, Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { routed } from './ui-actions';

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function requireBox(locator: Locator, label: string): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error(`Expected bounding box for ${label}`);
  }
  return box;
}

function expectBoxMatches(actual: Box, expected: Box) {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
  expect(actual.width).toBeCloseTo(expected.width, 1);
  expect(actual.height).toBeCloseTo(expected.height, 1);
}

async function nextAnimationFrames(page: Page) {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );
}

async function pressInfoAndVerifySheet(options: {
  page: Page;
  button: Locator;
  svg: Locator;
  buttonBefore: Box;
  svgBefore: Box;
  sheetTitle: string;
  closeLabel: string;
  reduced: boolean;
}) {
  const { page, button, svg, buttonBefore, svgBefore, sheetTitle, closeLabel, reduced } = options;
  const currentButtonBox = await requireBox(button, 'hydration info button');
  expectBoxMatches(currentButtonBox, buttonBefore);

  const centerX = currentButtonBox.x + currentButtonBox.width / 2;
  const centerY = currentButtonBox.y + currentButtonBox.height / 2;

  await page.mouse.move(centerX, centerY);
  await page.mouse.down();

  if (reduced) {
    await expect.poll(() => button.evaluate((el) => el.matches(':active'))).toBe(true);
    await expect(svg).toHaveCSS('transition-property', 'none');
    await expect(svg).toHaveCSS('transform', 'none');
    await nextAnimationFrames(page);
    const svgHeld = await requireBox(svg, 'hydration info icon while reduced press is held');
    expect(svgHeld.width).toBeCloseTo(svgBefore.width, 1);
    expect(svgHeld.height).toBeCloseTo(svgBefore.height, 1);
    expectBoxMatches(await requireBox(button, 'button while reduced press is held'), buttonBefore);
  } else {
    await expect
      .poll(async () => (await requireBox(svg, 'hydration info icon')).width / svgBefore.width)
      .toBeCloseTo(0.95, 2);
    await expect
      .poll(async () => (await requireBox(svg, 'hydration info icon')).height / svgBefore.height)
      .toBeCloseTo(0.95, 2);
    expectBoxMatches(await requireBox(button, 'button while press is held'), buttonBefore);
  }

  await page.mouse.up();

  const modal = page.locator('ion-modal:not(.overlay-hidden)');
  await expect(modal).toBeVisible();
  await expect(modal.getByRole('heading', { name: sheetTitle })).toBeVisible();

  await modal.getByRole('button', { name: closeLabel }).click();
  await expect(modal).toHaveCount(0);
  await expect(button).toBeFocused();
}

for (const en of [false, true]) {
  const suffix = en ? ' @en' : '';
  const summaryName = en ? 'Dough summary' : 'Aperçu de la pâte';
  const hydrationLabel = en ? 'Hydration breakdown' : 'Détail de l’hydratation';
  const closeLabel = en ? 'Close' : 'Fermer';

  test(`hydration info press feedback and reduced motion${suffix}`, async ({ page }) => {
    await page.goto('/recipes');
    const view = routed(page);
    await view.getByRole('heading', { level: 2, name: 'Poolish + tangzhong', exact: true }).click();
    const titleHeading = view.getByRole('heading', { level: 1, name: 'Poolish + tangzhong' });
    await expect(titleHeading).toBeVisible();

    const summary = view.getByRole('group', { name: summaryName });
    const button = summary.getByRole('button', { name: hydrationLabel });
    await button.scrollIntoViewIfNeeded();
    const svg = button.locator('svg');

    const buttonBefore = await requireBox(button, 'hydration info button baseline');
    expect(buttonBefore.width).toBeCloseTo(48, 0);
    expect(buttonBefore.height).toBeCloseTo(48, 0);
    const svgBefore = await requireBox(svg, 'hydration info icon baseline');

    await pressInfoAndVerifySheet({
      page,
      button,
      svg,
      buttonBefore,
      svgBefore,
      sheetTitle: hydrationLabel,
      closeLabel,
      reduced: false,
    });

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await pressInfoAndVerifySheet({
      page,
      button,
      svg,
      buttonBefore,
      svgBefore,
      sheetTitle: hydrationLabel,
      closeLabel,
      reduced: true,
    });

    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-motion', 'reduced');
    });
    await pressInfoAndVerifySheet({
      page,
      button,
      svg,
      buttonBefore,
      svgBefore,
      sheetTitle: hydrationLabel,
      closeLabel,
      reduced: true,
    });

    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-motion');
    });
    await pressInfoAndVerifySheet({
      page,
      button,
      svg,
      buttonBefore,
      svgBefore,
      sheetTitle: hydrationLabel,
      closeLabel,
      reduced: false,
    });
  });
}
