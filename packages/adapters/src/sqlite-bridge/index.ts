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
  SqlEquipmentRegistry,
  SqlFlourRegistry,
  SqlRecipeRepository,
  SqlRestoreTarget,
} from '../sql/index.js';

/**
 * SQLite behind a message bridge (ADR 0011): the desktop shell runs `node:sqlite` in Electron's
 * main process and the renderer sends it the raw driver calls. Serialization, transactions,
 * migrations and every SQL statement stay here, as for the other drivers.
 */
export type BridgeOp = 'execute' | 'run' | 'query' | 'begin' | 'commit' | 'rollback';

export const BRIDGE_OPS: readonly BridgeOp[] = [
  'execute',
  'run',
  'query',
  'begin',
  'commit',
  'rollback',
];

export interface SqlBridge {
  call(op: BridgeOp, sql?: string, params?: readonly SqlValue[]): Promise<unknown>;
}

export interface BridgeSqlite {
  readonly driver: SqlDriver;
}

export const openBridgeSqlite = async (
  bridge: SqlBridge,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<Result<BridgeSqlite, OpenError>> => {
  const driver = serializedDriver({
    execute: async (sql) => void (await bridge.call('execute', sql)),
    run: async (sql, params) => void (await bridge.call('run', sql, [...(params ?? [])])),
    query: async <T>(sql: string, params?: readonly SqlValue[]) =>
      (await bridge.call('query', sql, [...(params ?? [])])) as T[],
    begin: async () => void (await bridge.call('begin')),
    commit: async () => void (await bridge.call('commit')),
    rollback: async () => void (await bridge.call('rollback')),
  });
  const migrated = await migrate(driver, migrations);
  if (!migrated.ok) return migrated;
  return ok({ driver });
};
