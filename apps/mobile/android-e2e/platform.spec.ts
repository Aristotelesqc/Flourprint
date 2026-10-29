import { _android as android, expect, test, type AndroidDevice, type Page } from '@playwright/test';
import { sampleRecipesFile } from '../test/fixtures/sample-recipe';

/** Platform checks on the emulator (English locale); the APK path comes from FLOURPRINT_APK. */
const PKG = 'app.flourprint';
const apk = process.env.FLOURPRINT_APK;

test.describe.configure({ mode: 'serial' });

let device: AndroidDevice;

/**
 * The app seeds no recipe (persistence.md, Recipe trash): the suite imports the reference recipe
 * through Advanced, the way a baker would, unless the database already holds it. In-app
 * navigation only: a WebView reload would reopen the native connection.
 */
const loadSample = async (page: Page): Promise<void> => {
  const goTo = (path: string) =>
    page.evaluate((to) => {
      window.history.pushState({}, '', to);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);
  // The list loads after the heading: wait a moment for the recipe before deciding to import it.
  const present = await page
    .getByText('Poolish + tangzhong')
    .first()
    .waitFor({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (present) return;
  await goTo('/advanced');
  await page.locator('input[type=file]').setInputFiles({
    name: 'recipes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(sampleRecipesFile())),
  });
  // Imported now, or already there if the list was only slow to show it.
  await expect(
    page.getByText(/^(1 recipe imported|No new recipe, 1 already here)\.$/),
  ).toBeVisible();
  await goTo('/recipes');
};

/**
 * Starts the app and attaches to the WebView of this process: after a forced stop, the WebView of
 * the previous process can still be listed for a moment, and attaching to it hangs.
 */
const open = async (): Promise<Page> => {
  await device.shell(`am start -W -n ${PKG}/.MainActivity`);
  let pid = 0;
  await expect
    .poll(
      async () => {
        pid = Number((await device.shell(`pidof ${PKG}`)).toString().trim().split(/\s+/)[0]);
        return device.webViews().some((w) => w.pkg() === PKG && w.pid() === pid);
      },
      { timeout: 120_000 },
    )
    .toBe(true);
  const webView = device.webViews().find((w) => w.pkg() === PKG && w.pid() === pid);
  if (!webView) throw new Error('WebView vanished');
  const page = await webView.page();
  try {
    await expect(page.getByRole('heading', { name: 'Recipes' })).toBeVisible({ timeout: 60_000 });
    await loadSample(page);
    await expect(page.getByText('Poolish + tangzhong').first()).toBeVisible({ timeout: 60_000 });
  } catch (cause) {
    // Say what the WebView showed instead: a blank page, an error state, another route.
    const url = page.url();
    const body = await page
      .locator('body')
      .innerText({ timeout: 5_000 })
      .catch(() => '(no body)');
    throw new Error(`Recipe list not shown at ${url}: ${body.slice(0, 400)}`, { cause });
  }
  return page;
};

/**
 * A system dialog (another app "not responding") holding the focus gets the key presses meant for
 * the app (seen on CI: backEvents 0, focus on the launcher's ANR window). Close it first.
 */
const dismissSystemDialog = async () => {
  const focus = (await device.shell('dumpsys window | grep mCurrentFocus')).toString();
  if (focus.includes(PKG)) return;
  await device
    .shell('am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS')
    .catch(() => undefined);
  if (/Not Responding/i.test(focus)) {
    // The dialog's default button is "Wait": it closes the dialog and leaves the app alone.
    await device.shell('input keyevent KEYCODE_ENTER').catch(() => undefined);
  }
  await device.shell(`am start -n ${PKG}/.MainActivity`).catch(() => undefined);
};

const forceStop = async () => {
  await device.shell(`am force-stop ${PKG}`);
  await expect.poll(() => device.webViews().some((w) => w.pkg() === PKG)).toBe(false);
};

test.beforeAll(async () => {
  if (!apk) throw new Error('Set FLOURPRINT_APK to the debug APK.');
  const [first] = await android.devices();
  if (!first) throw new Error('No Android device or emulator.');
  device = first;
  // The emulator's own launcher sometimes stops answering on a loaded CI runner; its "not
  // responding" dialog then takes the focus and every key press (back included). Do not show it.
  await device.shell('settings put global hide_error_dialogs 1').catch(() => undefined);
  await device.shell(`pm uninstall ${PKG}`).catch(() => undefined);
  await device.installApk(apk);
});

test.afterAll(async () => {
  await device?.close();
});

test('the shared storage contract passes on Capacitor SQLite', async () => {
  const page = await open();
  // Navigate inside the app (no WebView reload, which reopens the native connection).
  await page.evaluate(() => {
    window.history.pushState({}, '', '/device-checks');
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
  const run = page.getByText('Run the storage checks');
  try {
    await expect(run).toBeVisible({ timeout: 60_000 });
  } catch (error) {
    // Print what the app shows instead, so the job log explains the failure.
    console.log(`URL ${page.url()}\n${await page.locator('body').innerText()}`);
    throw error;
  }
  await run.click();
  const summary = page.getByText(/\d+ of \d+ checks passed/);
  await expect(summary).toBeVisible({ timeout: 120_000 });
  const [passed, total] = ((await summary.textContent()) ?? '').match(/\d+/g) ?? [];
  expect(Number(total)).toBeGreaterThan(0);
  expect(passed).toBe(total);
  await forceStop();
});

test('a saved revision survives a forced stop and a reinstall', async () => {
  let page = await test.step('open and save v2', async () => open());
  // Native SQLite: no browser-preview notice.
  await expect(page.getByText(/Browser preview/)).toHaveCount(0);
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText('Version 1', { exact: true })).toBeVisible();
  // A saved recipe opens in consultation (#70): editing is explicit.
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  const salt = page.getByLabel('Salt (g)', { exact: true });
  await salt.fill('25');
  await salt.press('Enter');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();

  page = await test.step('forced stop, reopen', async () => {
    await forceStop();
    return open();
  });
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();

  // Reinstalling over the app (as an update does) keeps the database.
  page = await test.step('reinstall over the app, reopen', async () => {
    await forceStop();
    // Playwright's default arguments already replace the installed app (-r) and pass the size
    // (-S) that `pm install` needs to read the APK from its input.
    await device.installApk(apk as string);
    return open();
  });
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText('Version 2', { exact: true })).toBeVisible();
  await forceStop();
});

test('the Android back button returns to the recipe list', async () => {
  const page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page).toHaveURL(/\/recipes\/.+/);
  // The URL changes when the page transition starts; a back press during it is dropped by Ionic.
  // Wait for the transition to end: the list page is hidden and the recipe page fully shown.
  // The earlier test saved a second version: any version number will do.
  await expect(page.getByText(/^Version \d+$/).first()).toBeVisible();
  await expect(page.locator('.ion-page.ion-page-hidden').first()).toBeAttached();
  await expect(page.locator('.ion-page.ion-page-invisible')).toHaveCount(0);
  // Count the back events Ionic receives, to tell a press that never reached the WebView from
  // one the app received and did not act on.
  await page.evaluate(() => {
    const w = window as unknown as { fpBackEvents: number };
    w.fpBackEvents = 0;
    document.addEventListener('ionBackButton', () => (w.fpBackEvents += 1));
  });
  // A press can still land while the emulator is busy; the user would press again, and so do we
  // (at most three presses, each given time to navigate).
  try {
    await expect(async () => {
      if (!/\/recipes$/.test(page.url())) {
        await dismissSystemDialog();
        await device.shell('input keyevent KEYCODE_BACK');
      }
      await expect(page).toHaveURL(/\/recipes$/, { timeout: 5_000 });
    }).toPass({ timeout: 20_000, intervals: [1_000, 2_000] });
  } catch (cause) {
    const state = await page
      .evaluate(() => ({
        backEvents: (window as unknown as { fpBackEvents: number }).fpBackEvents,
        visibility: document.visibilityState,
        focused: document.hasFocus(),
        overlays: [
          ...document.querySelectorAll('ion-modal, ion-alert, ion-popover, ion-action-sheet'),
        ]
          .filter((o) => !o.classList.contains('overlay-hidden'))
          .map((o) => o.tagName.toLowerCase()),
        pages: [...document.querySelectorAll('.ion-page')].map((p) => p.className),
      }))
      .catch((error: unknown) => String(error));
    const focus = (await device.shell('dumpsys window | grep -E "mCurrentFocus|mFocusedApp"'))
      .toString()
      .trim();
    throw new Error(`Back press did not navigate: ${JSON.stringify(state)} · ${focus}`, {
      cause,
    });
  }
  await forceStop();
});

test('Android Back dismisses shared overlays before leaving the recipe', async () => {
  const page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page.getByText(/^Version \d+$/).first()).toBeVisible();
  const recipeUrl = page.url();
  const opener = page.getByRole('button', { name: 'Recipe actions', exact: true });
  await opener.click();
  const menu = page.getByRole('menu');
  await expect(menu.getByRole('menuitem').first()).toBeFocused();
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(menu).toBeHidden();
  await expect(page).toHaveURL(recipeUrl);
  await expect(opener).toBeFocused();

  const help = page.getByRole('button', { name: 'Explanation: Hydration', exact: true });
  await help.click();
  const sheet = page.getByRole('dialog', { name: 'Hydration and added water', exact: true });
  await expect(
    page.locator('ion-modal:visible').getByRole('button', { name: 'Close', exact: true }),
  ).toBeFocused();
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(sheet).toBeHidden();
  await expect(page).toHaveURL(recipeUrl);
  await expect(help).toBeFocused();
  await forceStop();
});
