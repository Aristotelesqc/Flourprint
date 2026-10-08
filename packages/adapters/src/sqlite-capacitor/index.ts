import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';
import { ok, type Result } from '@flourprint/core/domain';
import {
  MIGRATIONS,
  migrate,
  serializedDriver,
  type Migration,
  type OpenError,
  type SqlDriver,
} from '../sql/index.js';

export { SqlBakeEventStore, SqlRecipeRepository, SqlRestoreTarget } from '../sql/index.js';

/**
 * SQLite on Android through `@capacitor-community/sqlite`: the candidate driver of spike #24.
 * Statements run with the plugin's implicit transactions disabled; ours are explicit.
 */
export interface CapacitorSqlite {
  readonly driver: SqlDriver;
  close(): Promise<void>;
}

const connections = new SQLiteConnection(CapacitorSQLite);

export const openCapacitorSqlite = async (
  name = 'flourprint',
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<Result<CapacitorSqlite, OpenError>> => {
  await connections.checkConnectionsConsistency().catch(() => undefined);
  const existing = (await connections.isConnection(name, false)).result;
  const db = existing
    ? await connections.retrieveConnection(name, false)
    : await connections.createConnection(name, false, 'no-encryption', 1, false);
  await db.open();
  const driver = serializedDriver({
    execute: async (sql) => void (await db.execute(sql, false)),
    run: async (sql, values) => void (await db.run(sql, [...(values ?? [])], false)),
    query: async <T>(sql: string, values?: readonly (string | number | null)[]) =>
      ((await db.query(sql, [...(values ?? [])])).values ?? []) as T[],
    begin: async () => void (await db.beginTransaction()),
    commit: async () => void (await db.commitTransaction()),
    rollback: async () => void (await db.rollbackTransaction()),
  });
  const migrated = await migrate(driver, migrations);
  const close = async () => {
    await db.close();
    await connections.closeConnection(name, false);
  };
  if (!migrated.ok) {
    await close();
    return migrated;
  }
  return ok({ driver, close });
};

/**
 * Deletes a database file; used by the device checks on their own scratch database. The plugin
 * deletes only through a live connection (it throws "No available connection" otherwise), so one
 * is created when needed. Errors propagate: a silent failure would leave stale data behind.
 */
export const deleteCapacitorDatabase = async (name: string): Promise<void> => {
  const existing = (await connections.isConnection(name, false)).result;
  const db = existing
    ? await connections.retrieveConnection(name, false)
    : await connections.createConnection(name, false, 'no-encryption', 1, false);
  try {
    await db.delete();
  } finally {
    await connections.closeConnection(name, false);
  }
};
