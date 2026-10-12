import type { EquipmentRegistry, EquipmentStoreError } from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type EquipmentEntry,
  type Result,
} from '@flourprint/core/domain';
import type { SqlDriver, SqlExecutor } from './driver.js';

interface EquipmentRow {
  schema_version: number;
  document: string;
}

const toEntry = (row: EquipmentRow): EquipmentEntry => {
  const { schemaVersion: _version, ...entry } = JSON.parse(row.document) as EquipmentEntry & {
    schemaVersion: number;
  };
  return entry;
};

/** Writes one entry version; used by saves and restores (persistence.md, equipment.md). */
export const insertEquipment = async (tx: SqlExecutor, entry: EquipmentEntry): Promise<void> => {
  await tx.run(
    'INSERT INTO equipment (id, version, kind, archived, schema_version, document, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      entry.id,
      entry.version,
      entry.kind,
      entry.archived ? 1 : 0,
      DOCUMENT_SCHEMA_VERSION,
      JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, ...entry }),
      entry.createdAt,
    ],
  );
};

/** Personal equipment entries on any SQLite driver; a version is never rewritten. */
export class SqlEquipmentRegistry implements EquipmentRegistry {
  constructor(private readonly driver: SqlDriver) {}

  async listEquipment(): Promise<readonly EquipmentEntry[]> {
    const rows = await this.driver.query<EquipmentRow>(
      `SELECT e.schema_version, e.document FROM equipment e
       WHERE e.version = (SELECT MAX(version) FROM equipment WHERE id = e.id)
       ORDER BY e.id`,
    );
    return rows.map(toEntry);
  }

  async getEquipment(
    id: string,
    version: number,
  ): Promise<Result<EquipmentEntry | undefined, EquipmentStoreError>> {
    const [row] = await this.driver.query<EquipmentRow>(
      'SELECT schema_version, document FROM equipment WHERE id = ? AND version = ?',
      [id, version],
    );
    if (!row) return ok(undefined);
    if (Number(row.schema_version) > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Equipment schema ${row.schema_version} is not supported`,
          { schemaVersion: Number(row.schema_version) },
        ),
      );
    }
    return ok(toEntry(row));
  }

  async listEquipmentVersions(): Promise<readonly EquipmentEntry[]> {
    const rows = await this.driver.query<EquipmentRow>(
      'SELECT schema_version, document FROM equipment ORDER BY id, version',
    );
    return rows.map(toEntry);
  }

  saveEquipment(entry: EquipmentEntry): Promise<Result<EquipmentEntry, EquipmentStoreError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<{ head: number | null }>(
        'SELECT MAX(version) AS head FROM equipment WHERE id = ?',
        [entry.id],
      );
      const currentHead = Number(row?.head ?? 0);
      if (entry.version !== currentHead + 1) {
        return err(
          domainError('HeadConflict', `Equipment ${entry.id} is at version ${currentHead}`, {
            equipmentId: entry.id,
            currentHead,
          }),
        );
      }
      await insertEquipment(tx, entry);
      return ok(entry);
    });
  }
}
