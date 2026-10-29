import { expect, test, type Locator, type Page } from '@playwright/test';
import { editorSection, enterEditor, routed } from './ui-actions';

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
const footer = (page: Page) => routed(page).locator('ion-footer');
const save = (page: Page) => footer(page).getByRole('button', { name: /^(Save|Enregistrer)$/ });

async function open(page: Page, theme = 'light', large = false) {
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
          recipes: [recipe],
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

for (const english of [false, true]) {
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
      .getByRole('button', { name: /^(Undo|Annuler)$/ })
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
    await routed(page).locator('ion-back-button').click();
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
    const refusal = routed(page).getByRole('alert');
    await expect(refusal).toHaveCount(1);
    await expect(refusal).not.toContainText(
      /AmbiguousMove|MoveBreaksDependencies|crossesWorkpiece/,
    );
    await expect(refusal).not.toBeEmpty();
  });
  test(`undoing a move retains an earlier duration edit and hardware Back cancels only the gesture${english ? ' @en' : ''}`, async ({
    page,
  }) => {
    await open(page);
    await enterEditor(page);
    await editorSection(page, 'steps');
    const duration = method(page).getByRole('textbox', {
      name: english ? 'Duration of Alpha' : 'Durée : Alpha',
      exact: true,
    });
    await duration.fill('6 min');
    await duration.press('Tab');
    await selectSlot(page, 'Gamma', 'alpha');
    await page.keyboard.press('Space');
    await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
    await footer(page)
      .getByRole('button', { name: /^(Undo|Annuler)$/ })
      .click();
    await expect.poll(() => order(page)).toEqual(original.map((value) => value.toLowerCase()));
    await expect(duration).toHaveValue('6 min');
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
    await expect(duration).toHaveValue('6 min');
    await expect(save(page)).toBeEnabled();
    await selectSlot(page, 'Gamma', 'alpha');
    await page.evaluate(() => window.history.back());
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
    await expect(page).toHaveURL(url);
    await expect(duration).toHaveValue('6 min');
    await page.evaluate(() => window.history.back());
    await expect(page).toHaveURL(/\/recipes$/);
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
        await page.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
        await page.mouse.down();
        await expect(page.locator('[popover]:popover-open')).toHaveCount(1);
        const heldSource = await box(source);
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
        await expect.poll(() => order(page)).toEqual(moved.map((value) => value.toLowerCase()));
        await expect(save(page)).toBeEnabled();
      });
    }
}
