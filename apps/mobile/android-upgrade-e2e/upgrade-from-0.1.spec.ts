import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { enterEditor, routed } from '../e2e/ui-actions';
import { _android as android, expect, test, type AndroidDevice, type Page } from '@playwright/test';

/**
 * A real upgrade (issue #24, audit finding F43-1): the 0.1.0 APK is installed on a clean emulator,
 * real data is created through its own interface, then the candidate APK is installed over it
 * (`install -r`, no uninstall) and must migrate that data and keep working.
 *
 * FLOURPRINT_APK_FROM is the 0.1.0 APK, FLOURPRINT_APK the candidate. Both are `app.flourprint`,
 * signed with the shared debug key (ADR 0016); the workflow records their certificates.
 * The database is read directly (`run-as`, debuggable builds) before and after the upgrade: the
 * interface shows the data, the rows prove it is the same data.
 */
const PKG = 'app.flourprint';
const RECIPE = 'Poolish + tangzhong';
const fromApk = process.env.FLOURPRINT_APK_FROM;
const toApk = process.env.FLOURPRINT_APK;

let device: AndroidDevice;

/** In-app navigation: a WebView reload would reopen the native connection. */
const goTo = (page: Page, path: string) =>
  page.evaluate((to) => {
    window.history.pushState({}, '', to);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);

/** Ionic keeps hidden pages mounted: only what is shown counts. */
const shown = (page: Page, text: string | RegExp) =>
  page
    .getByText(text, typeof text === 'string' ? { exact: true } : undefined)
    .locator('visible=true');

/** L103 keeps revisions in storage; the Recipe header no longer exposes internal versions. */
const expectCandidateRevision = async (page: Page, version: number) => {
  await expect(
    routed(page)
      .locator('ion-header')
      .getByRole('heading', { name: RECIPE, level: 1, exact: true }),
  ).toBeVisible();
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
 * Starts the app and attaches to the WebView of this process (after a forced stop, the previous
 * process's WebView can still be listed for a moment). Nothing is imported: the recipe must come
 * from the database.
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
    await expect(page.getByText(RECIPE).first()).toBeVisible({ timeout: 90_000 });
  } catch (cause) {
    const body = await page
      .locator('body')
      .innerText({ timeout: 5_000 })
      .catch(() => '(no body)');
    throw new Error(`Recipe list not shown at ${page.url()}: ${body.slice(0, 600)}`, { cause });
  }
  return page;
};

const forceStop = async () => {
  await device.shell(`am force-stop ${PKG}`);
  await expect.poll(() => device.webViews().some((w) => w.pkg() === PKG)).toBe(false);
};

/** What Android says about the installed package. */
const packageInfo = async () => {
  const dump = (await device.shell(`dumpsys package ${PKG}`)).toString();
  const pick = (pattern: RegExp) => dump.match(pattern)?.[1]?.trim() ?? null;
  return {
    package: pick(/Package \[([^\]]+)\]/),
    versionCode: Number(pick(/versionCode=(\d+)/)),
    versionName: pick(/versionName=(\S+)/),
    signatures: pick(/signatures:\[([^\]]*)\]/),
    firstInstallTime: pick(/firstInstallTime=([^\n]+)/),
    lastUpdateTime: pick(/lastUpdateTime=([^\n]+)/),
  };
};

type Rows = Record<string, string>;
interface Snapshot {
  files: string[];
  schemaVersion: number;
  tables: string[];
  recipeColumns: string[];
  counts: Record<string, number>;
  recipes: { id: string; name: string; head_version: number; trashed_at?: string | null }[];
  revisions: Rows;
  drafts: Rows;
  bakes: Rows;
  bakeEvents: Rows;
  flours: Rows;
}

const DATA_TABLES = [
  'recipes',
  'revisions',
  'recipe_families',
  'drafts',
  'bakes',
  'bake_events',
  'bake_commands',
  'flours',
  'equipment',
  'ingredients',
];

/**
 * Copies the app's database out of its private storage (the app is stopped first) and reads it
 * with Node's SQLite. The copy and a JSON summary stay in the test output for the report.
 */
const readDatabase = async (label: string): Promise<Snapshot> => {
  await forceStop();
  const dir = test.info().outputPath(`database-${label}`);
  mkdirSync(dir, { recursive: true });
  const files = (await device.shell(`run-as ${PKG} ls databases`))
    .toString()
    .split(/\s+/)
    .filter(Boolean);
  const main = 'flourprintSQLite.db';
  if (!files.includes(main)) throw new Error(`No ${main} in databases/: ${files.join(', ')}`);
  // The shared-memory file is rebuilt from the WAL; the database and its WAL are the data.
  for (const file of files.filter((f) => f === main || f === `${main}-wal`)) {
    const encoded = (await device.shell(`run-as ${PKG} base64 -w 0 databases/${file}`))
      .toString()
      .replace(/\s+/g, '');
    writeFileSync(join(dir, file), Buffer.from(encoded, 'base64'));
  }
  const db = new DatabaseSync(join(dir, main));
  try {
    const all = <T>(sql: string) => db.prepare(sql).all() as T[];
    const tables = all<{ name: string }>(
      "SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name",
    ).map((t) => t.name);
    const keyed = (sql: string): Rows =>
      Object.fromEntries(all<{ k: string; v: string }>(sql).map((r) => [r.k, r.v]));
    const snapshot: Snapshot = {
      files,
      schemaVersion: Number(
        all<{ value: number }>("SELECT value FROM schema_meta WHERE key = 'schema_version'")[0]
          ?.value ?? 0,
      ),
      tables,
      recipeColumns: all<{ name: string }>('PRAGMA table_info(recipes)').map((c) => c.name),
      counts: Object.fromEntries(
        DATA_TABLES.filter((t) => tables.includes(t)).map((t) => [
          t,
          Number(all<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`)[0]?.n ?? 0),
        ]),
      ),
      recipes: all(`SELECT * FROM recipes ORDER BY id`) as Snapshot['recipes'],
      revisions: keyed(
        "SELECT recipe_id || ':' || version AS k, document AS v FROM revisions ORDER BY k",
      ),
      drafts: keyed('SELECT id AS k, name AS v FROM drafts ORDER BY id'),
      bakes: keyed('SELECT bake_id AS k, status AS v FROM bakes ORDER BY bake_id'),
      bakeEvents: keyed(
        "SELECT bake_id || ':' || seq AS k, document AS v FROM bake_events ORDER BY k",
      ),
      flours: keyed("SELECT id || ':' || version AS k, document AS v FROM flours ORDER BY k"),
    };
    writeFileSync(join(dir, 'summary.json'), JSON.stringify(snapshot, null, 2));
    return snapshot;
  } finally {
    db.close();
  }
};

/** The personal copy of the bread flour in the registry list (built-in entries show no version). */
const personalFlour = (page: Page) =>
  page.locator('ion-item', { hasText: 'Bread flour' }).filter({ hasText: 'Version 1' });

/** Runs an interaction; on failure, says what the WebView showed instead. */
const explain = async (page: Page, action: () => Promise<unknown>) => {
  try {
    await action();
  } catch (cause) {
    const body = await page
      .locator('body')
      .innerText({ timeout: 5_000 })
      .catch(() => '(no body)');
    throw new Error(`At ${page.url()}: ${body.slice(0, 800)}`, { cause });
  }
};

/**
 * Opens a flour of the 0.1.0 registry list. On the emulator its items have been reported not
 * visible while the page shows them: log why, then click the item through the DOM.
 */
const openFlour = async (page: Page, name: string) => {
  const item = page.locator('ion-item', { hasText: name }).first();
  const clicked = await item
    .click({ timeout: 10_000 })
    .then(() => true)
    .catch(() => false);
  if (clicked) return;
  const why = await item.evaluate((element) => {
    const chain = [];
    for (let e: Element | null = element; e; e = e.parentElement) {
      const style = getComputedStyle(e);
      const rect = e.getBoundingClientRect();
      chain.push(
        `${e.tagName.toLowerCase()}.${[...e.classList].join('.')} ${style.display}/${style.visibility}/${style.opacity} ${Math.round(rect.width)}x${Math.round(rect.height)}`,
      );
    }
    return chain.join(' < ');
  });
  console.log(`[upgrade-diagnostic] ${name} item not clickable: ${why}`);
  await item.evaluate((element) => (element as HTMLElement).click());
};

/**
 * Schema 9 (migrations 5 to 9 applied), and every 0.1.0 revision, bake event, flour, draft and
 * bake status still there, byte for byte. Revisions may only have been added.
 */
const expectMigrated = (old: Snapshot, now: Snapshot) => {
  expect(now.schemaVersion).toBe(9);
  expect(now.tables).toEqual(
    expect.arrayContaining(['equipment', 'ingredients', 'reference_versions', 'thermal_profiles']),
  );
  expect(now.recipeColumns).toContain('trashed_at');
  expect(now.recipes.every((r) => r.trashed_at == null)).toBe(true);
  for (const [key, document] of Object.entries(old.revisions)) {
    expect(now.revisions[key], `revision ${key}`).toBe(document);
  }
  expect(now.bakeEvents).toEqual(old.bakeEvents);
  expect(now.flours).toEqual(old.flours);
  expect(now.drafts).toEqual(old.drafts);
  expect(now.bakes).toEqual(old.bakes);
};

/** One line per piece of evidence in the job log, and the same as an attachment. */
const evidence = async (name: string, value: unknown) => {
  const text = JSON.stringify(value);
  console.log(`[upgrade-evidence] ${name} ${text}`);
  await test.info().attach(name, { body: text, contentType: 'application/json' });
};

const summary = (s: Snapshot) => ({
  schemaVersion: s.schemaVersion,
  tables: s.tables,
  recipeColumns: s.recipeColumns,
  counts: s.counts,
  recipes: s.recipes,
  bakes: s.bakes,
  drafts: s.drafts,
  databaseFiles: s.files,
});

test.beforeAll(async () => {
  if (!fromApk || !toApk) throw new Error('Set FLOURPRINT_APK_FROM (0.1.0) and FLOURPRINT_APK.');
  const [first] = await android.devices();
  if (!first) throw new Error('No Android device or emulator.');
  device = first;
  await device.shell('settings put global hide_error_dialogs 1').catch(() => undefined);
});

test.afterAll(async () => {
  await device?.close();
});

test('the candidate installs over 0.1.0 and keeps its recipes, drafts, bakes and flours', async () => {
  // ---- 0.1.0: a clean install, then real data through its own interface. ----
  const before = await test.step('install 0.1.0 on a clean device', async () => {
    await device.shell(`pm uninstall ${PKG}`).catch(() => undefined);
    await device.installApk(fromApk as string);
    const info = await packageInfo();
    await evidence('package-0.1.0', info);
    expect(info.package).toBe(PKG);
    return info;
  });

  let page = await open();

  await test.step('0.1.0: save a second version of the recipe', async () => {
    await page.getByText(RECIPE).first().click();
    await expect(shown(page, 'Version 1')).toHaveCount(1);
    const salt = page.getByLabel('Salt (g)', { exact: true });
    await salt.fill('25');
    await salt.press('Enter');
    // This phase runs the pinned 0.1.0 APK, whose button keeps its original label.
    await page.getByRole('button', { name: 'Save v2', exact: true }).click();
    await expect(shown(page, 'Version 2')).toHaveCount(1);
  });

  const startBake = async () => {
    await page
      .locator('ion-header:visible')
      .getByRole('button', { name: 'Bake', exact: true })
      .click();
    const alert = page.locator('ion-alert');
    await expect(alert).toContainText('Start the bake now?');
    await alert.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page).toHaveURL(/\/bakes\//);
  };
  const note = async (text: string) => {
    await page.getByRole('button', { name: 'Note', exact: true }).click();
    await page.locator('textarea:visible').fill(text);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(shown(page, new RegExp(text)).first()).toBeVisible();
  };

  await test.step('0.1.0: a bake with steps and a note, abandoned and reviewed', async () => {
    await startBake();
    await page.getByRole('button', { name: 'Start Preferment' }).first().click();
    await note('Fine bubbles');
    // Abandoned while the preferment runs: 0.1.0 offers the review note only when no step is next.
    await page.getByRole('button', { name: 'Abandon the bake' }).click();
    await page
      .locator('ion-alert')
      .getByRole('button', { name: /Abandon/ })
      .click();
    await page.getByRole('button', { name: 'Add a note' }).click();
    await page.getByRole('button', { name: '★★★★', exact: true }).click();
    await page.locator('textarea:visible').fill('Tight crumb');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(shown(page, /Tight crumb/).first()).toBeVisible();
  });

  await test.step('0.1.0: a second bake left running', async () => {
    await page.locator('ion-back-button:visible').last().click();
    await expect(page).toHaveURL(/\/recipes\/.+/);
    await startBake();
    await page.getByRole('button', { name: 'Start Preferment' }).first().click();
    await note('Second bake running');
    await page.getByRole('button', { name: 'Preferment done' }).first().click();
    await expect(shown(page, /Preferment done/).first()).toBeVisible();
  });

  await test.step('0.1.0: a draft from a blank recipe', async () => {
    await goTo(page, '/recipes');
    await page.getByLabel('New recipe', { exact: true }).locator('visible=true').first().click();
    await page.getByText('Blank recipe').locator('visible=true').first().click();
    await expect(page).toHaveURL(/\/drafts\//);
    await expect(shown(page, 'Recipe 1').first()).toBeVisible();
    // The draft is written as it is created; give the store a moment before the forced stop.
    await page.waitForTimeout(2_000);
  });

  await test.step('0.1.0: a personal flour in the registry', async () => {
    await explain(page, async () => {
      // Through the recipe list's Flours button, as a baker would (and as the 0.1.0 journey does).
      await goTo(page, '/recipes');
      await page.getByLabel('Flours', { exact: true }).locator('visible=true').first().click();
      await expect(page).toHaveURL(/\/flours$/);
      await openFlour(page, 'Bread flour');
      const sheet = page.locator('ion-modal:visible');
      await sheet.getByRole('button', { name: 'Customize' }).click();
      await sheet.getByLabel('Protein (%): value').fill('13.2');
      await sheet.getByLabel('Protein (%): basis').selectOption({ label: 'As sold' });
      await sheet
        .getByLabel('Protein (%): source', { exact: true })
        .selectOption({ label: 'Package label' });
      await sheet.getByRole('button', { name: 'Save' }).click();
      await expect(page.locator('ion-modal:visible')).toHaveCount(0);
      await expect(personalFlour(page)).toHaveCount(1);
    });
  });

  const old = await test.step('0.1.0: the database holds that data', async () => {
    const snapshot = await readDatabase('0.1.0');
    await evidence('database-0.1.0', summary(snapshot));
    expect(snapshot.schemaVersion).toBe(4);
    expect(snapshot.recipes.map((r) => r.name)).toContain(RECIPE);
    expect(snapshot.recipes.find((r) => r.name === RECIPE)?.head_version).toBe(2);
    expect(snapshot.counts.revisions).toBeGreaterThanOrEqual(2);
    expect(snapshot.counts.drafts).toBe(1);
    expect(Object.values(snapshot.bakes).sort()).toEqual(['abandoned', 'active']);
    expect(snapshot.counts.bake_events).toBeGreaterThanOrEqual(8);
    expect(snapshot.counts.flours).toBe(1);
    expect(snapshot.tables).not.toContain('equipment');
    return snapshot;
  });

  // ---- The candidate, installed over 0.1.0. ----
  await test.step('install the candidate over 0.1.0 (install -r, no uninstall)', async () => {
    // Playwright's default arguments replace the installed app (-r) and pass its size (-S).
    await device.installApk(toApk as string);
    const after = await packageInfo();
    await evidence('package-candidate', after);
    expect(after.package).toBe(PKG);
    expect(after.versionCode).toBeGreaterThan(before.versionCode);
    // An update, not a new installation: the first installation time is kept.
    expect(after.firstInstallTime).toBe(before.firstInstallTime);
    expect(after.lastUpdateTime).not.toBe(before.lastUpdateTime);
    expect(after.signatures).toBe(before.signatures);
  });

  const abandoned = Object.entries(old.bakes).find(([, s]) => s === 'abandoned')?.[0];
  const active = Object.entries(old.bakes).find(([, s]) => s === 'active')?.[0];
  // The list shows the running preparation under the recipe's name: open the recipe by its id.
  const recipeId = old.recipes.find((r) => r.name === RECIPE)?.id ?? '';

  page = await open();

  await test.step('candidate: the first launch migrated to 9 and kept every row', async () => {
    // The app has opened its database once: the migrations ran. Read it before any further use.
    await expect(shown(page, RECIPE).first()).toBeVisible();
    const migrated = await readDatabase('candidate-first-launch');
    await evidence('database-candidate-first-launch', summary(migrated));
    expectMigrated(old, migrated);
    expect(migrated.revisions).toEqual(old.revisions);
    expect(migrated.recipes.find((r) => r.name === RECIPE)?.head_version).toBe(2);
    page = await open();
  });

  await test.step('candidate: the recipe, its versions, its history and the draft are shown', async () => {
    await explain(page, async () => {
      // The candidate reopens on the running preparation: start from the recipe list.
      await goTo(page, '/recipes');
      await expect(page).toHaveURL(/\/recipes$/);
      await expect(shown(page, 'Recipe 1').first()).toBeVisible();
      await goTo(page, `/recipes/${recipeId}`);
      await expectCandidateRevision(page, 2);
      await page.getByRole('tab', { name: 'History', exact: true }).locator('visible=true').click();
      await expect(shown(page, /Abandoned/).first()).toBeVisible();
      await expect(shown(page, /In progress/).first()).toBeVisible();
    });
  });

  await test.step('candidate: both bakes replay their events and notes', async () => {
    await explain(page, async () => {
      await goTo(page, `/bakes/${abandoned}`);
      await expect(shown(page, /Fine bubbles/).first()).toBeVisible();
      await expect(shown(page, /Tight crumb/).first()).toBeVisible();
      // Ionic does not swap the page between two preparations of the same route: leave it first.
      await goTo(page, '/recipes');
      await expect(page).toHaveURL(/\/recipes$/);
      await goTo(page, `/bakes/${active}`);
      await expect(shown(page, /Second bake running/).first()).toBeVisible();
    });
  });

  await test.step('candidate: edit and save version 3', async () => {
    await explain(page, async () => {
      await goTo(page, '/recipes');
      await goTo(page, `/recipes/${recipeId}`);
      await expectCandidateRevision(page, 2);
      // A saved recipe opens in consultation (#70): editing is explicit (the browser suite's helper).
      await enterEditor(page);
      const salt = page.getByLabel('Salt, Final mix (g)', { exact: true }).locator('visible=true');
      await salt.fill('26');
      await salt.press('Enter');
      await page.getByRole('button', { name: 'Save', exact: true }).locator('visible=true').click();
      await expectCandidateRevision(page, 3);
    });
  });

  await test.step('candidate: forced stop and reopen keep version 3', async () => {
    await forceStop();
    page = await open();
    await explain(page, async () => {
      await goTo(page, '/recipes');
      await expect(page).toHaveURL(/\/recipes$/);
      await goTo(page, `/recipes/${recipeId}`);
      await expectCandidateRevision(page, 3);
    });
  });

  await test.step('candidate: the personal flour is in the registry', async () => {
    // A fresh launch, the recipe list, then its Flours link: a pushed route to the registry can
    // leave the previous page shown (seen on the emulator and in the browser build).
    await forceStop();
    page = await open();
    await explain(page, async () => {
      await goTo(page, '/recipes');
      await expect(page).toHaveURL(/\/recipes$/);
      await expect(
        page.getByRole('heading', { name: 'Recipes' }).locator('visible=true'),
      ).toHaveCount(1);
      await page
        .getByRole('link', { name: 'Flours', exact: true })
        .locator('visible=true')
        .first()
        .click();
      await expect(page).toHaveURL(/\/flours$/);
      await expect(personalFlour(page)).toHaveCount(1);
    });
  });

  await test.step('candidate: migrations 5 to 9 ran and no row was lost', async () => {
    const now = await readDatabase('candidate');
    await evidence('database-candidate', summary(now));
    expectMigrated(old, now);
    // The one new revision is version 3 of the edited recipe.
    expect(now.counts.revisions).toBe((old.counts.revisions ?? 0) + 1);
    expect(now.recipes.find((r) => r.name === RECIPE)?.head_version).toBe(3);
    await evidence('preserved', {
      revisions: Object.keys(old.revisions).length,
      bakeEvents: Object.keys(old.bakeEvents).length,
      flours: Object.keys(old.flours).length,
      drafts: Object.keys(old.drafts).length,
      bakes: old.bakes,
    });
  });
});
