import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { executable, launch as launchShell, loadSample, quit, tap } from './launch.js';

/** L103: verify the actual native revision, never an internal version badge. */
const expectNativeRevision = async (page: Page, version: number) => {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const id = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
        const bridge = Reflect.get(window, 'flourprintDesktop') as {
          sql(op: string, statement: string, values: string[]): Promise<{ head_version: number }[]>;
        };
        const rows = await bridge.sql('query', 'SELECT head_version FROM recipes WHERE id = ?', [
          id,
        ]);
        return rows[0]?.head_version;
      }),
    )
    .toBe(version);
};

/** Smoke test of the packaged release shell (ADR 0011). */
let observedPage: Page | undefined;
const pageErrors: string[] = [];
const launch = async (userData: string) => {
  const app = await launchShell({
    executable: executable('release'),
    userData,
    appUrl: 'app://flourprint/',
  });
  observedPage = app.page;
  app.page.on('pageerror', (error) => pageErrors.push(error.message));
  await app.page.evaluate(() => {
    const events: unknown[] = [];
    Reflect.set(window, '__nativeInputProbe', events);
    for (const type of [
      'pointerdown',
      'pointerup',
      'pointercancel',
      'touchstart',
      'touchend',
      'touchcancel',
      'click',
      'ionNavWillChange',
      'ionNavDidChange',
    ]) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target instanceof Element ? event.target : undefined;
          events.push({
            type,
            at: performance.now(),
            path: location.pathname,
            target: target?.tagName,
            text: target?.textContent?.trim().slice(0, 80),
            href: target?.closest('ion-router-link')?.getAttribute('router-link'),
            focus: document.hasFocus(),
            visibility: document.visibilityState,
          });
          if (events.length > 40) events.shift();
        },
        true,
      );
    }
  });
  return app;
};

test.afterEach(async () => {
  const testInfo = test.info();
  if (testInfo.status === testInfo.expectedStatus || !observedPage || observedPage.isClosed())
    return;
  const state = await observedPage.evaluate(() => ({
    path: location.pathname,
    focus: document.hasFocus(),
    visibility: document.visibilityState,
    events: Reflect.get(window, '__nativeInputProbe'),
    pages: [...document.querySelectorAll('ion-router-outlet > .ion-page')].map((page) => ({
      classes: page.className,
      hidden: page.getAttribute('aria-hidden'),
      text: page.textContent?.trim().slice(0, 1500),
    })),
  }));
  // CI does not currently retain the desktop trace on a failed job. Keep the failure state
  // in its log without retrying a tap, changing the assertion, or losing the original error.
  console.error('NATIVE_RECIPE_FAILURE', JSON.stringify({ ...state, pageErrors }));
});

test('a phone-sized window, touch from the mouse, and data that survives a restart', async () => {
  const userData = mkdtempSync(join(tmpdir(), 'flourprint-desktop-'));
  let app = await launch(userData);
  await loadSample(app.page);
  await tap(app.page, app.page.getByText('Pain simple').first());
  await expectNativeRevision(app.page, 1);
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
  const salt = app.page.getByLabel('Sel, Mélange final (g)', { exact: true });
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
  await tap(
    app.page,
    actions.getByRole('menuitem', { name: 'Mettre à la corbeille', exact: true }),
  );
  await expect(actions).toBeHidden();
  const menuOrder = await app.page.evaluate(
    () => Reflect.get(window, '__flourprintNativeMenuOrder') as string[],
  );
  await test.info().attach('native-popover-touch-order', {
    body: JSON.stringify(menuOrder),
    contentType: 'application/json',
  });
  expect(menuOrder).toEqual(['presented', 'pressed']);
  const confirmation = app.page.locator('ion-alert:not(.overlay-hidden)');
  await tap(app.page, confirmation.getByRole('button', { name: 'Annuler', exact: true }));
  await expect(confirmation).toBeHidden();
  await tap(app.page, app.page.getByRole('button', { name: 'Modifier la recette', exact: true }));
  await expect(salt).toBeVisible();
  await salt.fill('25');
  await salt.press('Enter');
  await tap(app.page, app.page.getByRole('button', { name: 'Enregistrer', exact: true }));
  await expectNativeRevision(app.page, 2);
  await quit(app);

  app = await launch(userData);
  await loadSample(app.page);
  await tap(app.page, app.page.getByText('Pain simple').first());
  await expectNativeRevision(app.page, 2);
  await quit(app);
});
