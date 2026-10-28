import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test } from '@playwright/test';
import { executable, launch as launchShell, loadSample, quit, tap } from './launch.js';

/** Smoke test of the packaged release shell (ADR 0011). */
const launch = (userData: string) =>
  launchShell({ executable: executable('release'), userData, appUrl: 'app://flourprint/' });

test('a phone-sized window, touch from the mouse, and data that survives a restart', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'flourprint-desktop-'));
  let app = await launch(userData);
  await loadSample(app.page);
  await tap(app.page, app.page.getByText('Pain simple').first());
  await expect(app.page.getByText('Version 1', { exact: true })).toBeVisible();
  // SQLite, not the browser's memory stores.
  await expect(app.page.getByText(/Aperçu navigateur/)).toHaveCount(0);
  expect(
    await app.page.evaluate(() => ({
      width: window.innerWidth,
      touch: navigator.maxTouchPoints > 0 && 'ontouchstart' in window,
      mobile: /Android/.test(navigator.userAgent),
    })),
  ).toEqual({ width: 448, touch: true, mobile: true });

  // A saved recipe opens in consultation (#70): editing is explicit.
  const salt = app.page.getByLabel('Sel (g)', { exact: true });
  await app.page.evaluate(() => {
    const order: string[] = [];
    Reflect.set(window, '__flourprintNativeMenuOrder', order);
    document.addEventListener('ionPopoverDidPresent', () => order.push('presented'), {
      once: true,
    });
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) {
          order.push('pressed');
        }
      },
      true,
    );
  });
  await tap(
    app.page,
    app.page.getByRole('button', { name: 'Actions sur la recette', exact: true }),
  );
  const actions = app.page.getByRole('menu');
  await tap(app.page, actions.getByRole('menuitem', { name: 'Modifier la recette', exact: true }));
  await expect(actions).toBeHidden();
  const menuOrder = await app.page.evaluate(
    () => Reflect.get(window, '__flourprintNativeMenuOrder') as string[],
  );
  await test.info().attach('native-popover-touch-order', {
    body: JSON.stringify(menuOrder),
    contentType: 'application/json',
  });
  expect(menuOrder).toEqual(['presented', 'pressed']);
  await expect(salt).toBeVisible();
  await salt.fill('25');
  await salt.press('Enter');
  await tap(app.page, app.page.getByRole('button', { name: 'Enregistrer', exact: true }));
  await expect(app.page.getByText('Version 2', { exact: true })).toBeVisible();
  await quit(app);

  app = await launch(userData);
  await loadSample(app.page);
  await tap(app.page, app.page.getByText('Pain simple').first());
  await expect(app.page.getByText('Version 2', { exact: true })).toBeVisible();
  await quit(app);
});
