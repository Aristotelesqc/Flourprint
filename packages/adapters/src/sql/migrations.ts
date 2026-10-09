import { domainError, err, ok, type DomainError, type Result } from '@flourprint/core/domain';
import type { SqlDriver } from './driver.js';

export interface Migration {
  readonly version: number;
  readonly sql: string;
}

/** Schema of docs/contracts/persistence.md. Append new versions; never edit applied ones. */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    sql: `
      CREATE TABLE recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        head_version INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE TABLE revisions (
        recipe_id TEXT NOT NULL,
        version INTEGER NOT NULL,
        schema_version INTEGER NOT NULL,
        document TEXT NOT NULL,
        created_at TEXT NOT NULL,
        PRIMARY KEY (recipe_id, version)
      );
      CREATE TABLE bake_events (
        bake_id TEXT NOT NULL,
        seq INTEGER NOT NULL,
        event_id TEXT NOT NULL UNIQUE,
        schema_version INTEGER NOT NULL,
        document TEXT NOT NULL,
        PRIMARY KEY (bake_id, seq)
      );
      CREATE TABLE bake_commands (
        command_id TEXT PRIMARY KEY,
        bake_id TEXT NOT NULL,
        content TEXT NOT NULL,
        first_seq INTEGER NOT NULL,
        last_seq INTEGER NOT NULL
      );
      CREATE TABLE bakes (
        bake_id TEXT PRIMARY KEY,
        summary TEXT NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `,
  },
  {
    version: 2,
    sql: `
      ALTER TABLE recipes ADD COLUMN family_id TEXT;
      CREATE TABLE recipe_families (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        pinned_recipe_id TEXT
      );
    `,
  },
  {
    version: 3,
    sql: `ALTER TABLE recipes ADD COLUMN review TEXT;`,
  },
];

export type OpenError =
  | DomainError<'UnsupportedDatabaseVersion', { databaseVersion: number; supportedVersion: number }>
  | DomainError<'MigrationFailed', { version: number; reason: string }>;

export const schemaVersion = async (driver: SqlDriver): Promise<number> => {
  await driver.execute(
    'CREATE TABLE IF NOT EXISTS schema_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)',
  );
  const rows = await driver.query<{ value: number }>(
    "SELECT value FROM schema_meta WHERE key = 'schema_version'",
  );
  return Number(rows[0]?.value ?? 0);
};

/** Applies pending migrations, each in its own transaction; refuses newer databases. */
export const migrate = async (
  driver: SqlDriver,
  migrations: readonly Migration[] = MIGRATIONS,
): Promise<Result<number, OpenError>> => {
  const supportedVersion = migrations.at(-1)?.version ?? 0;
  const databaseVersion = await schemaVersion(driver);
  if (databaseVersion > supportedVersion) {
    return err(
      domainError(
        'UnsupportedDatabaseVersion',
        `Database version ${databaseVersion} is newer than this app`,
        { databaseVersion, supportedVersion },
      ),
    );
  }
  for (const migration of migrations.filter((m) => m.version > databaseVersion)) {
    try {
      await driver.transaction(async (tx) => {
        await tx.execute(migration.sql);
        await tx.run(
          `INSERT INTO schema_meta (key, value) VALUES ('schema_version', ?)
           ON CONFLICT (key) DO UPDATE SET value = excluded.value`,
          [migration.version],
        );
      });
    } catch (error) {
      return err(
        domainError('MigrationFailed', `Migration ${migration.version} failed`, {
          version: migration.version,
          reason: (error as Error).message,
        }),
      );
    }
  }
  return ok(await schemaVersion(driver));
};
