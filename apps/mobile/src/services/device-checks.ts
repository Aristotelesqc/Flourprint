import { Capacitor } from '@capacitor/core';
import type { BakeEventStore, RecipeRepository } from '@flourprint/core/application';
import { MemoryBakeEventStore, MemoryRecipeRepository } from '@flourprint/adapters/memory';
import {
  bakeEventStoreChecks,
  recipeRepositoryChecks,
  runChecks,
  type CheckResult,
} from '@flourprint/adapters/testing';

/**
 * Device checks for spikes #23 and #24. The store contract runs on a scratch database
 * (`flourprint-checks-*`, one per check), never on the user's data.
 */

const native = () => Capacitor.isNativePlatform();
const now = () => performance.now();

export const runStoreChecks = async (): Promise<CheckResult[]> => {
  if (!native()) {
    return [
      ...(await runChecks(bakeEventStoreChecks, async () => new MemoryBakeEventStore(), now)),
      ...(await runChecks(recipeRepositoryChecks, async () => new MemoryRecipeRepository(), now)),
    ];
  }
  const sqlite = await import('@flourprint/adapters/sqlite-capacitor');
  // One scratch database per check: a check never sees data left by another one, even if a
  // deletion fails. Each is deleted after use and failures are reported, not swallowed.
  const run = Date.now().toString(36);
  let count = 0;
  let open: { name: string; close(): Promise<void> } | undefined;
  const cleanup = async () => {
    if (!open) return;
    const { name, close } = open;
    open = undefined;
    await close();
    await sqlite.deleteCapacitorDatabase(name);
  };
  const freshDriver = async () => {
    await cleanup();
    const name = `flourprint-checks-${run}-${++count}`;
    const db = await sqlite.openCapacitorSqlite(name);
    if (!db.ok) throw new Error(`${db.error.code}: ${db.error.message}`);
    open = { name, close: db.value.close };
    await assertEmpty(db.value.driver, name);
    return db.value.driver;
  };
  try {
    return [
      ...(await runChecks<BakeEventStore>(
        bakeEventStoreChecks,
        async () => new sqlite.SqlBakeEventStore(await freshDriver()),
        now,
      )),
      ...(await runChecks<RecipeRepository>(
        recipeRepositoryChecks,
        async () => new sqlite.SqlRecipeRepository(await freshDriver()),
        now,
      )),
    ];
  } finally {
    await cleanup();
  }
};

const assertEmpty = async (
  driver: import('@flourprint/adapters/sqlite-capacitor').CapacitorSqlite['driver'],
  name: string,
) => {
  for (const table of ['recipes', 'revisions', 'bake_events', 'bake_commands', 'bakes']) {
    const [row] = await driver.query<{ n: number }>(`SELECT COUNT(*) AS n FROM ${table}`);
    if (row?.n !== 0) throw new Error(`Scratch database ${name} is not empty (${table})`);
  }
};

const MARKER_MIGRATIONS = [
  {
    version: 1,
    sql: 'CREATE TABLE marker (id INTEGER PRIMARY KEY CHECK (id = 1), written_at TEXT NOT NULL)',
  },
];

/** A timestamp written to its own database; it must survive a forced stop and a reinstall. */
const withMarkerDb = async <T>(
  work: (
    driver: import('@flourprint/adapters/sqlite-capacitor').CapacitorSqlite['driver'],
  ) => Promise<T>,
): Promise<T | undefined> => {
  if (!native()) return undefined;
  const sqlite = await import('@flourprint/adapters/sqlite-capacitor');
  const db = await sqlite.openCapacitorSqlite('flourprint-marker', MARKER_MIGRATIONS);
  if (!db.ok) throw new Error(`${db.error.code}: ${db.error.message}`);
  try {
    return await work(db.value.driver);
  } finally {
    await db.value.close();
  }
};

export const readMarker = (): Promise<string | undefined> =>
  withMarkerDb(async (driver) => {
    const [row] = await driver.query<{ written_at: string }>('SELECT written_at FROM marker');
    return row?.written_at;
  }).then((value) => value ?? undefined);

export const writeMarker = (at: string): Promise<void> =>
  withMarkerDb((driver) =>
    driver.run(
      'INSERT INTO marker (id, written_at) VALUES (1, ?) ON CONFLICT (id) DO UPDATE SET written_at = excluded.written_at',
      [at],
    ),
  ).then(() => undefined);

export const markerSupported = native;
