import { DatabaseSync } from 'node:sqlite';
import { domainError, err, ok, type DomainError, type Result } from '@flourprint/core/domain';

/**
 * SQLite on Node through the built-in `node:sqlite` module (no native dependency). Provisional
 * driver: spike #24 confirms it for the CLI and tests (docs/contracts/persistence.md).
 */

export interface Migration {
  readonly version: number;
  readonly sql: string;
}

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
];

export type OpenError =
  | DomainError<'UnsupportedDatabaseVersion', { databaseVersion: number; supportedVersion: number }>
  | DomainError<'MigrationFailed', { version: number; reason: string }>;

/** Runs `work` in one `BEGIN IMMEDIATE` transaction, rolled back if it throws. */
export const immediate = <T>(db: DatabaseSync, work: () => T): T => {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const userVersion = (db: DatabaseSync): number =>
  Number((db.prepare('PRAGMA user_version').get() as { user_version: number }).user_version);

/** Applies pending migrations, each in its own transaction (persistence.md). */
export const migrate = (
  db: DatabaseSync,
  migrations: readonly Migration[] = MIGRATIONS,
): Result<number, OpenError> => {
  const supportedVersion = migrations.at(-1)?.version ?? 0;
  const databaseVersion = userVersion(db);
  if (databaseVersion > supportedVersion) {
    return err(
      domainError(
        'UnsupportedDatabaseVersion',
        `Database version ${databaseVersion} is newer than this app`,
        {
          databaseVersion,
          supportedVersion,
        },
      ),
    );
  }
  for (const migration of migrations.filter((m) => m.version > databaseVersion)) {
    try {
      immediate(db, () => {
        db.exec(migration.sql);
        db.exec(`PRAGMA user_version = ${migration.version}`);
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
  return ok(userVersion(db));
};

/** Opens (and migrates) a Flourprint database file; `:memory:` for tests. */
export const openDatabase = (
  path: string,
  migrations: readonly Migration[] = MIGRATIONS,
): Result<DatabaseSync, OpenError> => {
  const db = new DatabaseSync(path);
  if (path !== ':memory:') db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA busy_timeout = 5000');
  const migrated = migrate(db, migrations);
  if (!migrated.ok) {
    db.close();
    return migrated;
  }
  return ok(db);
};
