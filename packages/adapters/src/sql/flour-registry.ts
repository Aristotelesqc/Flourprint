import type { FlourRegistry, FlourStoreError } from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type FlourEntry,
  type Result,
} from '@flourprint/core/domain';
import type { SqlDriver, SqlExecutor } from './driver.js';

interface FlourRow {
  schema_version: number;
  document: string;
}

const toEntry = (row: FlourRow): FlourEntry => {
  const { schemaVersion: _version, ...entry } = JSON.parse(row.document) as FlourEntry & {
    schemaVersion: number;
  };
  return entry;
};

/** Writes one entry version; used by saves and restores (persistence.md, Flour registry). */
export const insertFlour = async (tx: SqlExecutor, entry: FlourEntry): Promise<void> => {
  await tx.run(
    'INSERT INTO flours (id, version, archived, schema_version, document, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [
      entry.id,
      entry.version,
      entry.archived ? 1 : 0,
      DOCUMENT_SCHEMA_VERSION,
      JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, ...entry }),
      entry.createdAt,
    ],
  );
};

/** Personal flour entries on any SQLite driver; a version is never rewritten. */
export class SqlFlourRegistry implements FlourRegistry {
  constructor(private readonly driver: SqlDriver) {}

  async listFlours(): Promise<readonly FlourEntry[]> {
    const rows = await this.driver.query<FlourRow>(
      `SELECT f.schema_version, f.document FROM flours f
       WHERE f.version = (SELECT MAX(version) FROM flours WHERE id = f.id)
       ORDER BY f.id`,
    );
    return rows.map(toEntry);
  }

  async getFlour(
    id: string,
    version: number,
  ): Promise<Result<FlourEntry | undefined, FlourStoreError>> {
    const [row] = await this.driver.query<FlourRow>(
      'SELECT schema_version, document FROM flours WHERE id = ? AND version = ?',
      [id, version],
    );
    if (!row) return ok(undefined);
    if (Number(row.schema_version) > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Flour schema ${row.schema_version} is not supported`,
          { schemaVersion: Number(row.schema_version) },
        ),
      );
    }
    return ok(toEntry(row));
  }

  async listFlourVersions(): Promise<readonly FlourEntry[]> {
    const rows = await this.driver.query<FlourRow>(
      'SELECT schema_version, document FROM flours ORDER BY id, version',
    );
    return rows.map(toEntry);
  }

  saveFlour(entry: FlourEntry): Promise<Result<FlourEntry, FlourStoreError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<{ head: number | null }>(
        'SELECT MAX(version) AS head FROM flours WHERE id = ?',
        [entry.id],
      );
      const currentHead = Number(row?.head ?? 0);
      if (entry.version !== currentHead + 1) {
        return err(
          domainError('HeadConflict', `Flour ${entry.id} is at version ${currentHead}`, {
            flourId: entry.id,
            currentHead,
          }),
        );
      }
      await insertFlour(tx, entry);
      return ok(entry);
    });
  }
}
