import { DatabaseSync } from 'node:sqlite';
import { ok, type Result } from '@flourprint/core/domain';
import {
  MIGRATIONS,
  migrate,
  serializedDriver,
  type Migration,
  type OpenError,
  type SqlDriver,
  type SqlValue,
} from '../sql/index.js';

export {
  SqlBakeEventStore,
  SqlRecipeRepository,
  MIGRATIONS,
  type Migration,
} from '../sql/index.js';

/**
 * SQLite on Node through the built-in `node:sqlite` module (no native dependency). Provisional
 * driver: spike #24 confirms it for the CLI and tests (ADR 0002).
 */
export interface NodeSqlite {
  readonly driver: SqlDriver;
  readonly database: DatabaseSync;
  close(): void;
}

export const openNodeSqlite = async (
  path: string,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<Result<NodeSqlite, OpenError>> => {
  const database = new DatabaseSync(path);
  if (path !== ':memory:') database.exec('PRAGMA journal_mode = WAL');
  database.exec('PRAGMA busy_timeout = 5000');
  const params = (values: readonly SqlValue[] | undefined) => [...(values ?? [])];
  const driver = serializedDriver({
    execute: async (sql) => void database.exec(sql),
    run: async (sql, values) => void database.prepare(sql).run(...params(values)),
    query: async <T>(sql: string, values?: readonly SqlValue[]) =>
      database.prepare(sql).all(...params(values)) as T[],
    begin: async () => void database.exec('BEGIN IMMEDIATE'),
    commit: async () => void database.exec('COMMIT'),
    rollback: async () => void database.exec('ROLLBACK'),
  });
  const migrated = await migrate(driver, migrations);
  if (!migrated.ok) {
    database.close();
    return migrated;
  }
  return ok({ driver, database, close: () => database.close() });
};
