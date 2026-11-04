import { expect, test, type Locator, type Page } from '@playwright/test';
import { editorSection, routed } from './ui-actions';

const recipeName = 'Draft sorting fixture';
const original = ['Alpha', 'Beta', 'Gamma'];
const moved = ['Alpha', 'Gamma', 'Beta'];
const recipe = {
  id: 'draft-sorting-fixture',
  name: recipeName,
  revisions: [
    {
      recipeId: 'draft-sorting-fixture',
      version: 1,
      createdAt: '2026-10-29T12:00:00.000Z',
      formula: {
        flours: [{ id: 'bread-flour', sharePct: 100 }],
        ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
        components: [],
        anchor: { kind: 'flourTotal', grams: 500 },
      },
      process: {
        steps: original.map((label, index) => ({
          id: label.toLowerCase(),
          label,
          operation: 'rest',
          schedule: 'asap',
          dependsOn: index === 0 ? [] : [original[index - 1]?.toLowerCase()],
          plannedDurationS: 300,
        })),
      },
    },
  ],
};

const method = (page: Page) => routed(page).getByTestId('recipe-method').filter({ visible: true });
const handle = (page: Page, name: string) =>
  method(page).getByRole('button', { name: new RegExp(`^(Move|Drag|Déplacer|Glisser).*${name}$`) });
const order = async (page: Page) =>
  method(page)
    .locator('[data-sortable-id]')
    .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-sortable-id')));
const footer = (page: Page) => routed(page).locator('ion-footer, [data-testid="recipe-draft-bar"]');
const save = (page: Page) => footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/ });

async function open(page: Page, theme = 'light', large = false, imported = recipe) {
  await page.setViewportSize({ width: large ? 360 : 393, height: 900 });
  await page.goto('/advanced');
  const themeName =
    theme === 'amoled'
      ? /^AMOLED$/
      : theme === 'dark'
        ? /^(Sombre(?: chaud)?|(?:Warm )?[Dd]ark)$/
        : /^(Clair|Light)$/;
  await routed(page).getByRole('button', { name: themeName }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
  await routed(page)
    .locator('input[type=file]')
    .setInputFiles({
      name: 'sorting.json',
      mimeType: 'application/json',
      buffer: Buffer.from(
        JSON.stringify({
          kind: 'flourprint-recipes',
          schemaVersion: 1,
          exportedAt: '2026-10-29T12:00:00.000Z',
          recipes: [imported],
          families: [],
        }),
      ),
    });
  await expect(
    routed(page).getByText(/^(1 recipe imported\.|1 recette importée\.)$/),
  ).toBeVisible();
  await routed(page).locator('ion-back-button').click();
  await routed(page).getByRole('heading', { name: recipeName, level: 2, exact: true }).click();
  await expect(handle(page, 'Gamma')).toBeAttached();
  if (large) await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
  await handle(page, 'Gamma').scrollIntoViewIfNeeded();
}

async function selectSlot(page: Page, source: string, after: string) {
  await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
  await handle(page, source).focus();
  await page.keyboard.press('Space');
  await expect(page.locator('[popover]:popover-open')).toHaveCount(1);
  const slot = method(page).locator(`[data-slot-after="${after}"]`);
  for (let n = 0; n < 40 && (await slot.getAttribute('data-drop-target')) !== 'true'; n++)
    await page.keyboard.press('ArrowUp');
  await expect(slot).toHaveAttribute('data-drop-target', 'true');
}

async function box(locator: Locator) {
  const rect = await locator.boundingBox();
  if (!rect) throw new Error('Missing gesture target');
  return rect;
}

async function geometry(page: Page) {
  return routed(page).evaluate(async (root) => {
    const content = root.querySelector('ion-content');
    if (!content) throw new Error('Recipe content missing');
    const scroll = await (
      content as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
    ).getScrollElement();
    const header = root.querySelector('ion-header');
    if (!header) throw new Error('Recipe header missing');
    return {
      contentHeight: content.getBoundingClientRect().height,
      headerHeight: header.getBoundingClientRect().height,
      scrollTop: scroll.scrollTop,
      cards: Array.from(root.querySelectorAll('[data-sortable-id]')).map((card) => ({
        id: card.getAttribute('data-sortable-id'),
        height: card.getBoundingClientRect().height,
        width: card.getBoundingClientRect().width,
      })),
      visibleInputs: Array.from(
        root.querySelectorAll('input:not([type="checkbox"]), textarea'),
      ).filter((input) => input.checkVisibility()).length,
    };
  });
}

for (const english of [false, true]) {
  test(`long step names retain a right-hand touch handle at 360/130${english ? ' @en' : ''}`, async ({
    page,
  }, testInfo) => {
    const longRecipe = structuredClone(recipe);
    const first = longRecipe.revisions[0]?.process.steps[0];
    if (!first) throw new Error('Missing fixture step');
    first.label = 'Rest the mixed dough until the surface relaxes completely';
    await open(page, 'dark', true, longRecipe);
    const card = method(page).locator('[data-sortable-id="alpha"]');
    await card.scrollIntoViewIfNeeded();
    const bounds = await box(card);
    const grip = await box(handle(page, first.label));
    const edit = await box(card.getByRole('button', { name: /^(Edit step|Modifier l’étape)/ }));
    expect(edit.x + edit.width).toBeLessThanOrEqual(grip.x + 1);
    expect(grip.x + grip.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
    expect(grip.width).toBeGreaterThanOrEqual(48);
    expect(grip.height).toBeGreaterThanOrEqual(48);
    expect(await card.evaluate((node) => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
    const path = testInfo.outputPath('long-step-right-handle.png');
    await card.screenshot({ path });
    await testInfo.attach('long-step-right-handle', { path, contentType: 'image/png' });
  });
  test(`step hold opens one draft and keyboard drop is undoable until save${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    const grip = handle(page, 'Gamma');
    // A short touch/click alone is not a draft edit.
    await grip.click();
    await expect(save(page)).toHaveCount(0);
    await selectSlot(page, 'Gamma', 'alpha');
    await page.keyboard.press('Space');
    await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
    await expect(
      page.getByRole('status').filter({
        hasText: english ? 'Dropped step Gamma after Alpha.' : 'Étape Gamma déposée après Alpha.',
      }),
    ).toHaveCount(1);
    await expect(grip).toBeFocused();
    await expect(save(page)).toBeEnabled();
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(save(page)).toBeDisabled();
    await footer(page)
      .getByRole('button', { name: /^(Redo|Rétablir)$/ })
      .click();
    await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
    await save(page).click();
    await expect(save(page)).toHaveCount(0);
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('flourprint-preview', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            const snapshot = await new Promise<unknown>((resolve, reject) => {
              const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
              request.onsuccess = () => resolve(request.result);
              request.onerror = () => reject(request.error);
            });
            if (typeof snapshot !== 'string') return null;
            const data = JSON.parse(snapshot) as {
              recipes: {
                id: string;
                revisions: {
                  version: number;
                  process: { steps: { id: string; dependsOn: string[] }[] };
                }[];
              }[];
            };
            const latest = data.recipes
              .find((item) => item.id === 'draft-sorting-fixture')
              ?.revisions.at(-1);
            return latest?.version === 2
              ? latest.process.steps.map((step) => [step.id, step.dependsOn])
              : null;
          } finally {
            db.close();
          }
        }),
      )
      .toEqual([
        ['alpha', []],
        ['gamma', ['alpha']],
        ['beta', ['gamma']],
      ]);
    await routed(page)
      .getByRole('button', { name: /^(Back|Retour)$/ })
      .click();
    await expect(page).toHaveURL(/\/recipes$/);
    await expect(routed(page)).toHaveCount(1);
    await routed(page).getByRole('heading', { name: recipeName, level: 2, exact: true }).click();
    await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
  });

  test(`cancelled and refused drags preserve the saved order and clean draft${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    await selectSlot(page, 'Gamma', 'alpha');
    await page.keyboard.press('Escape');
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
    await expect(handle(page, 'Gamma')).toBeFocused();
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(save(page)).toBeDisabled();
    // A downward chain move is refused by core, never converted into an upward move.
    await handle(page, 'Alpha').scrollIntoViewIfNeeded();
    const start = await box(handle(page, 'Alpha'));
    await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await page.mouse.down();
    await expect(page.locator('[popover]:popover-open')).toHaveCount(1);
    const target = method(page).locator('[data-slot-after="gamma"]');
    await target.scrollIntoViewIfNeeded();
    const end = await box(target);
    await page.mouse.move(end.x + end.width / 2, end.y + end.height / 2, { steps: 8 });
    await expect(target).toHaveAttribute('data-drop-target', 'true');
    await expect.poll(async () => (await box(target)).height).toBeGreaterThan(1);
    const drawn = await box(target);
    await page.mouse.move(drawn.x + drawn.width / 2, drawn.y + drawn.height / 2);
    await page.mouse.up();
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(save(page)).toBeDisabled();
    const refusal = method(page).locator('[data-sortable-id="alpha"]').getByRole('alert');
    await expect(refusal).toHaveCount(1);
    await expect(refusal).not.toContainText(
      /AmbiguousMove|MoveBreaksDependencies|crossesWorkpiece/,
    );
    await expect(refusal).not.toBeEmpty();
    // An unchanged draft created by activation must not prevent starting the saved recipe.
    await routed(page)
      .getByRole('tab', { name: english ? 'Planning' : 'Planification', exact: true })
      .click();
    await routed(page)
      .getByRole('button', {
        name: english ? 'Start preparation' : 'Démarrer la préparation',
        exact: true,
      })
      .click();
    const startConfirmation = page.locator('ion-alert:not(.overlay-hidden)');
    await expect(startConfirmation).toContainText(
      english ? 'Start the preparation now?' : 'Démarrer la préparation maintenant ?',
    );
    await startConfirmation
      .getByRole('button', { name: english ? 'Cancel' : 'Annuler', exact: true })
      .click();
  });
  test(`undoing a move retains an earlier duration edit and hardware Back cancels only the gesture${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    await editorSection(page, 'steps');
    const editAlpha = () =>
      method(page)
        .getByRole('button', { name: /^(Edit step|Modifier l’étape) Alpha$/, exact: true })
        .click();
    const duration = () =>
      page.locator('ion-modal:visible').getByRole('textbox', {
        name: english ? 'Duration of Alpha' : 'Durée : Alpha',
        exact: true,
      });
    const closeStep = () =>
      page
        .locator('ion-modal:visible')
        .getByRole('button', { name: /^(Close|Fermer)$/, exact: true })
        .click();
    await editAlpha();
    await duration().fill('6 min');
    await duration().press('Tab');
    await closeStep();
    await expect(page.locator('ion-modal:visible')).toHaveCount(0);
    await selectSlot(page, 'Gamma', 'alpha');
    await page.keyboard.press('Space');
    await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
    await footer(page)
      .getByRole('button', { name: /^(Undo last change|Annuler la dernière modification)$/ })
      .click();
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(method(page).locator('[data-sortable-id="alpha"]')).toContainText('6 min');
    await expect(save(page)).toBeEnabled();
    await selectSlot(page, 'Gamma', 'alpha');
    const url = page.url();
    const registrationCount = await page.evaluate(() => {
      const registrations: { priority: number; callback: () => void }[] = [];
      document.dispatchEvent(
        new CustomEvent('ionBackButton', {
          detail: {
            register: (priority: number, callback: () => void) =>
              registrations.push({ priority, callback }),
          },
        }),
      );
      const first = registrations.sort((a, b) => b.priority - a.priority)[0];
      first?.callback();
      return registrations.length;
    });
    expect(registrationCount).toBeGreaterThan(0);
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
    expect(page.url()).toBe(url);
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(method(page).locator('[data-sortable-id="alpha"]')).toContainText('6 min');
    await expect(save(page)).toBeEnabled();
    await selectSlot(page, 'Gamma', 'alpha');
    await page.evaluate(() => window.history.back());
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
    await expect(page).toHaveURL(url);
    await expect(method(page).locator('[data-sortable-id="alpha"]')).toContainText('6 min');
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/\/recipes$/);
  });
  test(`a step sheet keeps invalid duration without activating ingredient editors${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    await method(page)
      .getByRole('button', { name: /^(Edit step|Modifier l’étape) Alpha$/, exact: true })
      .click();
    const sheet = page.locator('ion-modal:visible');
    const duration = sheet.getByRole('textbox', {
      name: english ? 'Duration of Alpha' : 'Durée : Alpha',
      exact: true,
    });
    const durationLabel = sheet
      .locator('label')
      .filter({ hasText: english ? 'Duration of Alpha' : 'Durée : Alpha' });
    expect((await box(durationLabel)).height).toBeGreaterThan(10);
    await duration.fill('-');
    await sheet.getByRole('button', { name: /^(Close|Fermer)$/, exact: true }).click();
    await expect(duration).toHaveValue('-');
    await page.keyboard.press('Escape');
    await expect(duration).toHaveValue('-');
    await duration.fill('6 min');
    await duration.press('Tab');
    await sheet.getByRole('button', { name: /^(Close|Fermer)$/, exact: true }).click();
    await expect(sheet).toBeHidden();
    await expect(
      method(page).getByRole('button', {
        name: /^(Edit step|Modifier l’étape) Alpha$/,
        exact: true,
      }),
    ).toBeFocused();
    expect(
      await method(page)
        .locator('[data-sortable-id="alpha"] > div')
        .evaluate((card) => getComputedStyle(card).boxShadow),
    ).toBe('none');
    expect((await geometry(page)).visibleInputs).toBe(0);
    await expect(save(page)).toBeEnabled();
    await expect(
      routed(page)
        .locator('ion-header')
        .getByRole('button', { name: /^(Edit recipe|Modifier la recette)$/, exact: true }),
    ).toBeVisible();
  });

  test(`drag draft Discard confirms changes and cancelling preserves its history${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    await selectSlot(page, 'Gamma', 'alpha');
    await page.keyboard.press('Space');
    const discard = footer(page).getByRole('button', {
      name: /^(Discard changes|Abandonner les modifications)$/,
      exact: true,
    });
    await discard.click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    await confirmation.getByRole('button', { name: /^(Cancel|Annuler)$/, exact: true }).click();
    await expect(confirmation).toBeHidden();
    await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
    await expect(save(page)).toBeEnabled();
    await discard.click();
    await confirmation
      .getByRole('button', {
        name: /^(Discard changes|Abandonner les modifications)$/,
        exact: true,
      })
      .click();
    await expect(confirmation).toBeHidden();
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(footer(page)).toHaveCount(0);
    expect((await geometry(page)).visibleInputs).toBe(0);
  });

  for (const theme of ['light', 'dark', 'amoled'])
    for (const large of [false, true]) {
      test(`compact step rows and actual pointer drop ${theme} ${large ? '360/130' : '393/100'}${english ? ' @en' : ''}`, async ({
        page,
      }, testInfo) => {
        await open(page, theme, large);
        const picture = testInfo.outputPath('recipe-steps-reading.png');
        await page.screenshot({ path: picture });
        await testInfo.attach('recipe-steps-reading', { path: picture, contentType: 'image/png' });
        const grip = handle(page, 'Gamma');
        const start = await box(grip);
        const source = method(page).locator('[data-sortable-id="gamma"]');
        const beforeActivation = await box(source);
        const cardText = await source.textContent();
        // The handle stays at the right edge, including narrow, enlarged text layouts.
        expect(start.x).toBeGreaterThan(beforeActivation.x + beforeActivation.width / 2);
        expect(start.x + start.width).toBeLessThanOrEqual(
          beforeActivation.x + beforeActivation.width + 1,
        );
        expect(start.width).toBeGreaterThanOrEqual(48);
        expect(start.height).toBeGreaterThanOrEqual(48);
        const readingGeometry = await geometry(page);
        expect(readingGeometry.scrollTop).toBeGreaterThan(0);
        expect(readingGeometry.visibleInputs).toBe(0);
        await expect(footer(page)).toHaveCount(0);
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await expect(page.locator('[popover]:popover-open')).toHaveCount(1);
        const overlay = page.locator('[popover]:popover-open');
        await expect(overlay).toHaveText(cardText ?? '');
        const floating = await box(overlay);
        expect(floating.width).toBeCloseTo(beforeActivation.width, 0);
        expect(floating.height).toBeCloseTo(beforeActivation.height, 0);
        await expect(page.locator('[data-sortable-scrim]')).toBeVisible();
        const heldSource = await box(source);
        const activatedGeometry = await geometry(page);
        expect(activatedGeometry.visibleInputs).toBe(0);
        expect(activatedGeometry.contentHeight).toBeCloseTo(readingGeometry.contentHeight, 0);
        expect(activatedGeometry.headerHeight).toBeCloseTo(readingGeometry.headerHeight, 0);
        expect(Math.abs(heldSource.y - beforeActivation.y)).toBeLessThanOrEqual(1);
        expect(Math.abs(heldSource.height - beforeActivation.height)).toBeLessThanOrEqual(1);
        const slot = method(page).locator('[data-slot-after="alpha"]');
        const boundary = await box(slot);
        await page.mouse.move(boundary.x + boundary.width / 2, boundary.y + boundary.height / 2, {
          steps: 8,
        });
        await expect(slot).toHaveAttribute('data-drop-target', 'true');
        await expect.poll(async () => (await box(slot)).height).toBeGreaterThan(1);
        const target = await box(slot);
        await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2);
        const held = testInfo.outputPath('recipe-step-held.png');
        await page.screenshot({ path: held });
        await testInfo.attach('recipe-step-held', { path: held, contentType: 'image/png' });
        await page.mouse.up();
        await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
        await expect(page.locator('[data-sortable-scrim]')).toHaveCount(0);
        await expect(grip).toBeFocused();
        await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
        await expect(save(page)).toBeEnabled();
        const actions = footer(page);
        const viewportWidth = page.viewportSize()?.width ?? 0;
        expect(
          await actions.evaluate((element) => element.scrollWidth <= element.clientWidth + 1),
        ).toBe(true);
        for (const button of await actions.getByRole('button').all()) {
          const control = await box(button);
          expect(control.x).toBeGreaterThanOrEqual(0);
          expect(control.x + control.width).toBeLessThanOrEqual(viewportWidth + 1);
          expect(control.height).toBeGreaterThanOrEqual(48);
          expect(control.width).toBeGreaterThanOrEqual(48);
        }
        const droppedGeometry = await geometry(page);
        expect(droppedGeometry.visibleInputs).toBe(0);
        expect(droppedGeometry.contentHeight).toBeCloseTo(readingGeometry.contentHeight, 0);
        expect(droppedGeometry.headerHeight).toBeCloseTo(readingGeometry.headerHeight, 0);
        expect(Math.abs(droppedGeometry.scrollTop - readingGeometry.scrollTop)).toBeLessThanOrEqual(
          1,
        );
        for (const previous of readingGeometry.cards) {
          const current = droppedGeometry.cards.find((card) => card.id === previous.id);
          expect(current).toBeDefined();
          expect(current?.height).toBeCloseTo(previous.height, 0);
          expect(current?.width).toBeCloseTo(previous.width, 0);
        }
        const contentBounds = await box(routed(page).locator('ion-content'));
        const droppedBounds = await box(source);
        expect(droppedBounds.y).toBeGreaterThanOrEqual(contentBounds.y - 1);
        expect(droppedBounds.y + droppedBounds.height).toBeLessThanOrEqual(
          contentBounds.y + contentBounds.height + 1,
        );
        const settled = testInfo.outputPath('recipe-step-dropped.png');
        await page.screenshot({ path: settled });
        await testInfo.attach('recipe-step-dropped', { path: settled, contentType: 'image/png' });
      });
    }
}
