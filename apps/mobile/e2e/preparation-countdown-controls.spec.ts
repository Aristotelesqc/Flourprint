import type { Page } from '@playwright/test';
import type { Backup } from '@flourprint/core/application';
import { expect, test } from './fixtures';
import {
  enterEditor,
  editorSection,
  expectRecipeRevision,
  menuAction,
  routed,
  showPlanning,
} from './ui-actions';

const openRecipe = async (page: Page) => {
  await page.goto('/recipes');
  await routed(page).getByRole('heading', { name: 'Poolish + tangzhong', level: 2 }).tap();
  await expect(routed(page)).toHaveCount(1);
};

const start = async (page: Page, english: boolean) => {
  await showPlanning(page);
  await routed(page)
    .getByRole('button', { name: english ? 'Start preparation' : 'Démarrer la préparation' })
    .tap();
  await page
    .locator('ion-alert')
    .getByRole('button', { name: english ? 'Start' : 'Démarrer', exact: true })
    .tap();
  await expect(page).toHaveURL(/\/bakes\//);
  await expect(routed(page)).toHaveCount(1);
};

for (const english of [false, true]) {
  const suffix = english ? ' @en' : '';
  const group = (page: Page) =>
    routed(page).getByRole('region', { name: english ? 'Countdown' : 'Compte à rebours' });

  test(`countdown commands preserve the implicit clock and pause survives reopening${suffix}`, async ({
    page,
  }) => {
    const initial = Date.parse('2026-03-02T08:00:00-05:00');
    const atMinute = (minutes: number) => page.clock.setFixedTime(initial + minutes * 60_000);
    await atMinute(0);
    await page.setViewportSize({ width: 360, height: 851 });
    await openRecipe(page);
    await page.addStyleTag({ content: 'html, body { font-size: 20.8px !important; }' });
    await start(page, english);
    const timer = routed(page).getByRole('timer');
    const pause = group(page).getByRole('button', { name: 'Pause', exact: true });
    const resume = group(page).getByRole('button', {
      name: english ? 'Resume' : 'Reprendre',
      exact: true,
    });
    await atMinute(5);
    await expect(timer).toHaveText('11:55:00');
    await pause.tap();
    await expect(resume).toBeVisible();
    const preparation = page.url();
    await routed(page).locator('ion-back-button').tap();
    await expect(page).not.toHaveURL(preparation);
    await expect(routed(page)).toHaveCount(1);
    // The browser preview saves its in-memory event stream asynchronously to IndexedDB.
    await expect
      .poll(() =>
        page.evaluate(async () => {
          const db = await new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open('flourprint-preview', 1);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          });
          try {
            const raw = await new Promise<string | undefined>((resolve, reject) => {
              const request = db.transaction('snapshots').objectStore('snapshots').get('backup');
              request.onsuccess = () => resolve(request.result as string | undefined);
              request.onerror = () => reject(request.error);
            });
            const backup = raw ? (JSON.parse(raw) as Backup) : undefined;
            return backup?.bakes.some((bake) =>
              bake.events.some((event) => event.payload.type === 'StepCountdownHeld'),
            );
          } finally {
            db.close();
          }
        }),
      )
      .toBe(true);
    await atMinute(25);
    await page.goto(preparation);
    await expect(resume).toBeVisible();
    await expect(timer).toHaveText('11:55:00');
    await resume.tap();
    await expect(pause).toBeVisible();
    await atMinute(26);
    await expect(timer).toHaveText('11:54:00');

    await group(page).getByRole('button', { name: '+15 min', exact: true }).tap();
    await expect(timer).toHaveText('12:09:00');
    await group(page).getByRole('button', { name: '−15 min', exact: true }).tap();
    await expect(timer).toHaveText('11:54:00');
    await menuAction(page, english ? /^Duration$/ : /^Durée$/);
    const durationDialog = page.getByRole('alertdialog');
    await durationDialog.getByRole('textbox').fill('5 min');
    await durationDialog
      .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
      .tap();
    await expect(timer).toHaveText('+00:01:00');
    await group(page).getByRole('button', { name: '−15 min', exact: true }).tap();
    await expect(timer).toHaveText('+00:06:00');
    await expect(routed(page).getByRole('heading', { level: 2, name: /^1 \/ 9 · / })).toBeVisible();
  });

  test(`countdown commands do not invent a missing duration${suffix}`, async ({ page }) => {
    await openRecipe(page);
    await enterEditor(page);
    await editorSection(page, 'steps');
    await routed(page)
      .getByRole('button', {
        name: english ? 'Edit step Preferment' : 'Modifier l’étape Préferment',
      })
      .tap();
    const sheet = page.locator('ion-modal:not(.overlay-hidden)');
    const duration = sheet.getByLabel(english ? 'Duration of Preferment' : 'Durée : Préferment', {
      exact: true,
    });
    await duration.fill('');
    await duration.press('Enter');
    await sheet.getByRole('button', { name: english ? 'Close' : 'Fermer', exact: true }).tap();
    await routed(page)
      .getByRole('button', { name: english ? 'Save' : 'Enregistrer', exact: true })
      .tap();
    await expectRecipeRevision(page, 2);
    await start(page, english);
    await expect(group(page).getByRole('button', { name: '−15 min', exact: true })).toBeDisabled();
    await expect(group(page).getByRole('button', { name: 'Pause', exact: true })).toBeDisabled();
    await expect(group(page).getByRole('button', { name: '+15 min', exact: true })).toBeDisabled();
  });
}
