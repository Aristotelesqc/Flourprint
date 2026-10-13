import { DatabaseSync } from 'node:sqlite';
import { ok, type Result } from '@flourprint/core/domain';
import type { BridgeOp, SqlBridge } from '../sqlite-bridge/index.js';
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
  SqlEquipmentRegistry,
  SqlFlourRegistry,
  SqlRecipeRepository,
  SqlRestoreTarget,
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
  const database = openNodeDatabase(path);
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

const isSqlValue = (value: unknown): value is SqlValue =>
  value === null || typeof value === 'string' || typeof value === 'number';

/**
 * The main-process side of the desktop bridge (ADR 0011): answers raw driver calls on one
 * `node:sqlite` connection. Calls arrive one at a time (the renderer serializes them); each is
 * checked, since it crosses a process boundary.
 */
export const nodeSqliteBridge = (database: DatabaseSync): SqlBridge => ({
  call: async (op: BridgeOp, sql?: unknown, params?: unknown) => {
    const statement = () => {
      if (typeof sql !== 'string') throw new TypeError(`${op}: sql must be a string`);
      return sql;
    };
    const values = () => {
      if (params === undefined) return [];
      if (!Array.isArray(params) || !params.every(isSqlValue)) {
        throw new TypeError(`${op}: params must be strings, numbers or null`);
      }
      return params;
    };
    switch (op) {
      case 'execute':
        database.exec(statement());
        return undefined;
      case 'run':
        database.prepare(statement()).run(...values());
        return undefined;
      case 'query':
        return database.prepare(statement()).all(...values());
      case 'begin':
        database.exec('BEGIN IMMEDIATE');
        return undefined;
      case 'commit':
        database.exec('COMMIT');
        return undefined;
      case 'rollback':
        database.exec('ROLLBACK');
        return undefined;
      default:
        throw new TypeError(`unknown bridge operation ${String(op)}`);
    }
  },
});

/** Opens the desktop database file the way the Node driver does (WAL, busy timeout). */
export const openNodeDatabase = (path: string): DatabaseSync => {
  const database = new DatabaseSync(path);
  if (path !== ':memory:') database.exec('PRAGMA journal_mode = WAL');
  database.exec('PRAGMA busy_timeout = 5000');
  return database;
};
