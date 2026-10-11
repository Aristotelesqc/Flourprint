import { _android as android, expect, test, type AndroidDevice, type Page } from '@playwright/test';

/** Platform checks on the emulator (English locale); the APK path comes from FLOURPRINT_APK. */
const PKG = 'app.flourprint';
const apk = process.env.FLOURPRINT_APK;

test.describe.configure({ mode: 'serial' });

let device: AndroidDevice;

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
  await expect(page.getByText('Poolish + tangzhong').first()).toBeVisible({ timeout: 60_000 });
  return page;
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
  const salt = page.getByLabel('Salt (g)', { exact: true });
  await salt.fill('25');
  await salt.press('Enter');
  await page.getByRole('button', { name: 'Save v2' }).click();
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
  // A press can still land while the emulator is busy; the user would press again, and so do we
  // (at most three presses, each given time to navigate).
  await expect(async () => {
    if (!/\/recipes$/.test(page.url())) await device.shell('input keyevent KEYCODE_BACK');
    await expect(page).toHaveURL(/\/recipes$/, { timeout: 5_000 });
  }).toPass({ timeout: 20_000, intervals: [1_000, 2_000] });
  await forceStop();
});
