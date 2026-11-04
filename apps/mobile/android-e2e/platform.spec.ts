import { _android as android, expect, test, type AndroidDevice, type Page } from '@playwright/test';
import { sampleRecipesFile } from '../test/fixtures/sample-recipe';

/** Platform checks on the emulator (English locale); the APK path comes from FLOURPRINT_APK. */
const PKG = 'app.flourprint';
const apk = process.env.FLOURPRINT_APK;

test.describe.configure({ mode: 'serial' });

let device: AndroidDevice;

/** L103: verify the actual native revision, never an internal version badge. */
const expectNativeRevision = async (page: Page, version: number) => {
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const id = decodeURIComponent(location.pathname.split('/').at(-1) ?? '');
        const capacitor = Reflect.get(window, 'Capacitor') as {
          Plugins: {
            CapacitorSQLite: {
              query(options: {
                database: string;
                statement: string;
                values: string[];
                readonly: boolean;
              }): Promise<{ values?: { head_version: number }[] }>;
            };
          };
        };
        const result = await capacitor.Plugins.CapacitorSQLite.query({
          database: 'flourprint',
          statement: 'SELECT head_version FROM recipes WHERE id = ?',
          values: [id],
          readonly: false,
        });
        return result.values?.[0]?.head_version;
      }),
    )
    .toBe(version);
};

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
  await expectNativeRevision(page, 1);
  // A saved recipe opens in consultation (#70): editing is explicit.
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  const salt = page.getByLabel('Salt, Final mix (g)', { exact: true });
  await salt.fill('25');
  await salt.press('Enter');
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectNativeRevision(page, 2);

  page = await test.step('forced stop, reopen', async () => {
    await forceStop();
    return open();
  });
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 2);

  // Reinstalling over the app (as an update does) keeps the database.
  page = await test.step('reinstall over the app, reopen', async () => {
    await forceStop();
    // Playwright's default arguments already replace the installed app (-r) and pass the size
    // (-S) that `pm install` needs to read the APK from its input.
    await device.installApk(apk as string);
    return open();
  });
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 2);
  await forceStop();
});

test('the Android back button returns to the recipe list', async () => {
  const page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expect(page).toHaveURL(/\/recipes\/.+/);
  // The URL changes when the page transition starts; a back press during it is dropped by Ionic.
  // Wait for the transition to end: the list page is hidden and the recipe page fully shown.
  // The earlier test saved a second version: any version number will do.
  await expectNativeRevision(page, 2);
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
  await expectNativeRevision(page, 2);
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

  const help = page.getByRole('button', { name: 'Hydration breakdown', exact: true });
  await help.click();
  const sheet = page.getByRole('dialog', { name: 'Hydration breakdown', exact: true });
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

test('step duplication reviews before saving and Android Back discards a proposal', async () => {
  let page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 2);
  await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
  const method = () => page.getByTestId('recipe-method').filter({ visible: true });
  const source = () => method().getByRole('button', { name: 'Edit step Mix', exact: true });
  const originalCount = await method().locator('[data-sortable-id]').count();
  const recipeUrl = page.url();
  await source().click();
  await page.getByRole('button', { name: 'Duplicate step', exact: true }).click();
  const review = () => page.getByRole('dialog', { name: 'Duplicate step proposal', exact: true });
  await expect(review()).toBeVisible();
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(review()).toBeHidden();
  await expect(page).toHaveURL(recipeUrl);
  await expect(source()).toBeFocused();
  await expect(method().locator('[data-sortable-id]')).toHaveCount(originalCount);
  await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();

  await source().click();
  await page.getByRole('button', { name: 'Duplicate step', exact: true }).click();
  await expect(review()).toBeVisible();
  await page.getByRole('button', { name: 'Keep copy', exact: true }).click();
  await expect(review()).toBeHidden();
  await page
    .locator('ion-modal:visible')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await expect(method().locator('[data-sortable-id]')).toHaveCount(originalCount + 1);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectNativeRevision(page, 3);
  await forceStop();
  page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 3);
  await expect(method().locator('[data-sortable-id]')).toHaveCount(originalCount + 1);
  await forceStop();
});

test('equipment setpoint keeps invalid raw input through Android Back and persists a correction', async () => {
  let page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 3);
  const editMix = async () => {
    await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
    await page
      .getByTestId('recipe-method')
      .filter({ visible: true })
      .getByRole('button', { name: 'Edit step Mix', exact: true })
      .first()
      .click();
  };
  await editMix();
  const panel = () => page.getByTestId('step-equipment-fields').filter({ visible: true });
  const setpoint = () => panel().getByRole('textbox', { name: 'Setpoint (°C)', exact: true });
  const close = () =>
    page.locator('ion-modal:visible').getByRole('button', { name: 'Close', exact: true });
  await expect(setpoint()).toHaveValue('');
  await setpoint().fill('-');
  await setpoint().blur();
  await expect(setpoint()).toHaveAttribute('aria-invalid', 'true');
  await close().click();
  await expect(panel()).toBeVisible();
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(panel()).toBeVisible();
  await expect(setpoint()).toHaveValue('-');
  const level = () => panel().getByRole('textbox', { name: 'Power level', exact: true });
  await level().fill('-');
  await level().blur();
  await setpoint().fill('35');
  await setpoint().press('Enter');
  await close().click();
  await expect(panel()).toBeVisible();
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(panel()).toBeVisible();
  await expect(level()).toHaveValue('-');
  await level().fill('3');
  await level().press('Enter');
  await close().click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectNativeRevision(page, 4);
  await forceStop();
  page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 4);
  await editMix();
  await expect(setpoint()).toHaveValue('35');
  await expect(level()).toHaveValue('3');
  await expect(
    page.locator('ion-modal:visible').getByRole('combobox', { name: 'Operation', exact: true }),
  ).toHaveValue('mix');
  await forceStop();
});

test('personal equipment creation guards Android Back and persists an explicitly selected vessel', async () => {
  let page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 4);
  const editMix = async () => {
    await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
    await page
      .getByTestId('recipe-method')
      .filter({ visible: true })
      .getByRole('button', { name: 'Edit step Mix', exact: true })
      .first()
      .click();
  };
  await editMix();
  const items = () => page.getByTestId('step-equipment-items').filter({ visible: true });
  const form = () => page.getByRole('region', { name: 'New personal baking vessel', exact: true });
  await items().getByRole('button', { name: 'Add personal vessel', exact: true }).click();
  await form().getByRole('textbox', { name: 'Name', exact: true }).fill('Native personal pot');
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(form().getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Native personal pot',
  );
  await form().getByRole('button', { name: 'Create equipment', exact: true }).click();
  await expect(form()).toBeHidden();
  const vessel = () => items().getByRole('button', { name: /^Baking vessel,/ });
  await expect(vessel()).not.toHaveAccessibleName(/Native personal pot/);
  await vessel().press('Space');
  await page.getByRole('radio', { name: 'Native personal pot', exact: true }).click();
  await expect(page.locator('ion-popover:visible')).toHaveCount(0);
  await page
    .locator('ion-modal:visible')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectNativeRevision(page, 5);
  await forceStop();
  page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 5);
  await editMix();
  await expect(vessel()).toHaveAccessibleName(/Native personal pot/);
  await expect(items().getByRole('button', { name: /^Vessel cover,/ })).toHaveAccessibleName(
    /Unknown/,
  );
  await forceStop();
});

test('optional appliance profile survives native Back and restart without changing step appliance', async () => {
  let page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 5);
  const editMix = async () => {
    await page.getByRole('button', { name: 'Edit recipe', exact: true }).click();
    await page
      .getByTestId('recipe-method')
      .filter({ visible: true })
      .getByRole('button', { name: 'Edit step Mix', exact: true })
      .first()
      .click();
  };
  await editMix();
  const panel = () => page.getByTestId('step-equipment-fields').filter({ visible: true });
  const picker = () => panel().getByRole('button', { name: /^Appliance profile,/ });
  await panel().getByRole('button', { name: 'Add appliance profile', exact: true }).click();
  const form = () => page.getByRole('region', { name: /^New (personal )?appliance profile$/ });
  await form().getByRole('textbox', { name: 'Name', exact: true }).fill('Native kitchen profile');
  await dismissSystemDialog();
  await device.shell('input keyevent KEYCODE_BACK');
  await device.shell('input keyevent KEYCODE_BACK');
  await expect(form().getByRole('textbox', { name: 'Name', exact: true })).toHaveValue(
    'Native kitchen profile',
  );
  await form()
    .getByRole('button', { name: /^(Appliance|Type)/ })
    .press('Space');
  await page.getByRole('radio', { name: 'Oven', exact: true }).click();
  await expect(page.locator('ion-popover:visible')).toHaveCount(0);
  await form()
    .getByRole('button', { name: /^Create (equipment|profile)$/ })
    .click();
  await expect(form()).toBeHidden();
  await expect(picker()).not.toHaveAccessibleName(/Native kitchen profile/);
  await picker().press('Space');
  await page.getByRole('radio', { name: 'Native kitchen profile', exact: true }).click();
  await expect(page.locator('ion-popover:visible')).toHaveCount(0);
  await expect(panel().getByRole('button', { name: /^Appliance,/ })).toHaveAccessibleName(
    /Not specified/,
  );
  await page
    .locator('ion-modal:visible')
    .getByRole('button', { name: 'Close', exact: true })
    .click();
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectNativeRevision(page, 6);
  await forceStop();
  page = await open();
  await page.getByText('Poolish + tangzhong').first().click();
  await expectNativeRevision(page, 6);
  await editMix();
  await expect(picker()).toHaveAccessibleName(/Native kitchen profile/);
  await expect(panel().getByRole('button', { name: /^Appliance,/ })).toHaveAccessibleName(
    /Not specified/,
  );
  await expect(panel().getByRole('textbox', { name: 'Setpoint (°C)', exact: true })).toHaveValue(
    '35',
  );
  await expect(panel().getByRole('textbox', { name: 'Power level', exact: true })).toHaveValue('3');
  await forceStop();
});

test('native touch drag keeps Recipe geometry and draft/editor states independent', async () => {
  let page = await open();
  const recipeName = 'Native foundation touch';
  await page.getByRole('link', { name: 'Advanced', exact: true }).click();
  await page.locator('input[type=file]').setInputFiles({
    name: 'foundation-touch.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        kind: 'flourprint-recipes',
        schemaVersion: 1,
        exportedAt: '2026-11-04T00:00:00.000Z',
        families: [],
        recipes: [
          {
            id: 'native-foundation-touch',
            name: recipeName,
            revisions: [
              {
                recipeId: 'native-foundation-touch',
                version: 1,
                createdAt: '2026-11-04T00:00:00.000Z',
                formula: {
                  flours: [{ id: 'bread-flour', sharePct: 100 }],
                  ingredients: [{ id: 'water', kind: 'water', bakerPct: 70, role: 'dough' }],
                  components: [],
                  anchor: { kind: 'flourTotal', grams: 500 },
                },
                process: {
                  steps: ['Alpha', 'Beta', 'Gamma'].map((label, index, names) => ({
                    id: label.toLowerCase(),
                    label,
                    operation: 'rest',
                    schedule: 'asap',
                    dependsOn: index === 0 ? [] : [(names[index - 1] ?? '').toLowerCase()],
                    plannedDurationS: 300,
                  })),
                },
              },
            ],
          },
        ],
      }),
    ),
  });
  await expect(page.getByText('1 recipe imported.', { exact: true })).toBeVisible();
  await page.locator('ion-back-button:visible').click();
  await page.getByRole('heading', { name: recipeName, level: 2, exact: true }).click();
  const method = () => page.getByTestId('recipe-method').filter({ visible: true });
  const handle = () => method().getByRole('button', { name: /^(Move|Drag).*Gamma$/ });
  const order = () =>
    method()
      .locator('[data-sortable-id]')
      .evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-sortable-id')));
  const layout = () =>
    page.locator('ion-content:visible').evaluate(async (content) => {
      const scroll = await (
        content as HTMLElement & { getScrollElement(): Promise<HTMLElement> }
      ).getScrollElement();
      return {
        height: content.getBoundingClientRect().height,
        scrollTop: scroll.scrollTop,
        cards: Array.from(content.querySelectorAll('[data-sortable-id]')).map((card) => ({
          id: card.getAttribute('data-sortable-id'),
          height: card.getBoundingClientRect().height,
        })),
      };
    });
  await expect(page.getByRole('button', { name: 'Edit recipe', exact: true })).toBeVisible();
  await expect(page.locator('ion-footer:visible')).toHaveCount(0);
  await handle().scrollIntoViewIfNeeded();
  const before = await layout();
  expect(before.scrollTop).toBeGreaterThan(0);
  await expect(page.getByRole('textbox').filter({ visible: true })).toHaveCount(0);
  const physical = (await device.shell('wm size')).toString();
  const match = /Physical size: (\d+)x(\d+)/.exec(physical);
  if (!match) throw new Error('Android display dimensions unavailable');
  const scale = Number(match[1]) / (await page.evaluate(() => window.innerWidth));
  const point = (rect: { x: number; y: number; width: number; height: number }) => ({
    x: Math.round((rect.x + rect.width / 2) * scale),
    y: Math.round((rect.y + rect.height / 2) * scale),
  });
  const source = await handle().boundingBox();
  if (!source) throw new Error('Native touch source missing');
  let finger = point(source);
  await dismissSystemDialog();
  await device.shell(`input touchscreen motionevent DOWN ${finger.x} ${finger.y}`);
  try {
    await expect(page.locator('[popover]:popover-open')).toHaveCount(1);
    await expect(page.getByRole('textbox').filter({ visible: true })).toHaveCount(0);
    expect((await layout()).height).toBeCloseTo(before.height, 0);
    const slot = method().locator('[data-slot-after="alpha"]');
    const initial = await slot.boundingBox();
    if (!initial) throw new Error('Native insertion slot missing');
    finger = point(initial);
    await device.shell(`input touchscreen motionevent MOVE ${finger.x} ${finger.y}`);
    await expect(slot).toHaveAttribute('data-drop-target', 'true');
    await expect.poll(async () => (await slot.boundingBox())?.height ?? 0).toBeGreaterThan(1);
    const expanded = await slot.boundingBox();
    if (!expanded) throw new Error('Expanded native insertion slot missing');
    finger = point(expanded);
    await device.shell(`input touchscreen motionevent MOVE ${finger.x} ${finger.y}`);
  } finally {
    await device.shell(`input touchscreen motionevent UP ${finger.x} ${finger.y}`);
  }
  await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
  await expect.poll(order).toEqual(['alpha', 'gamma', 'beta']);
  const after = await layout();
  expect(after.height).toBeCloseTo(before.height, 0);
  expect(Math.abs(after.scrollTop - before.scrollTop)).toBeLessThanOrEqual(1);
  for (const card of before.cards)
    expect(after.cards.find((item) => item.id === card.id)?.height).toBeCloseTo(card.height, 0);
  await expect(page.getByRole('textbox').filter({ visible: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Undo last change', exact: true }).click();
  await expect.poll(order).toEqual(['alpha', 'beta', 'gamma']);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(order).toEqual(['alpha', 'gamma', 'beta']);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await expectNativeRevision(page, 2);
  await forceStop();
  page = await open();
  await page.getByRole('heading', { name: recipeName, level: 2, exact: true }).click();
  await expectNativeRevision(page, 2);
  await handle().scrollIntoViewIfNeeded();
  await expect.poll(order).toEqual(['alpha', 'gamma', 'beta']);
  await expect(page.locator('ion-footer:visible')).toHaveCount(0);
  const restored = await handle().boundingBox();
  if (!restored) throw new Error('Restored native handle missing');
  finger = point(restored);
  await device.shell(
    `input touchscreen swipe ${finger.x} ${finger.y} ${finger.x} ${finger.y - 150} 120`,
  );
  await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
  await expect(page.locator('ion-footer:visible')).toHaveCount(0);
  await handle().scrollIntoViewIfNeeded();
  const cancelSource = await handle().boundingBox();
  if (!cancelSource) throw new Error('Native cancellation source missing');
  finger = point(cancelSource);
  await device.shell(`input touchscreen motionevent DOWN ${finger.x} ${finger.y}`);
  try {
    await expect(page.locator('[popover]:popover-open')).toHaveCount(1);
    await device.shell('input keyevent KEYCODE_BACK');
    await expect(page.locator('[popover]:popover-open')).toHaveCount(0);
  } finally {
    await device.shell(`input touchscreen motionevent UP ${finger.x} ${finger.y}`);
  }
  await expect.poll(order).toEqual(['alpha', 'gamma', 'beta']);
  await expect(page.getByRole('textbox').filter({ visible: true })).toHaveCount(0);
  await forceStop();
});
