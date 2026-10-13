import type { IngredientRegistry, IngredientStoreError } from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type IngredientEntry,
  type Result,
} from '@flourprint/core/domain';
import type { SqlDriver, SqlExecutor } from './driver.js';

interface IngredientRow {
  schema_version: number;
  document: string;
}

const toEntry = (row: IngredientRow): IngredientEntry => {
  const { schemaVersion: _version, ...entry } = JSON.parse(row.document) as IngredientEntry & {
    schemaVersion: number;
  };
  return entry;
};

/** Writes one entry version; used by saves, restores and imports (persistence.md). */
export const insertIngredient = async (tx: SqlExecutor, entry: IngredientEntry): Promise<void> => {
  await tx.run(
    'INSERT INTO ingredients (id, version, archived, schema_version, document, created_at) VALUES (?, ?, ?, ?, ?, ?)',
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

/** Writes an entry version unless it is stored already (imports: never compared or replaced). */
export const insertIngredientIfAbsent = async (
  tx: SqlExecutor,
  entry: IngredientEntry,
): Promise<boolean> => {
  const [row] = await tx.query<{ id: string }>(
    'SELECT id FROM ingredients WHERE id = ? AND version = ?',
    [entry.id, entry.version],
  );
  if (row) return false;
  await insertIngredient(tx, entry);
  return true;
};

/**
 * Personal ingredient entries, customizations of built-ins included, on any SQLite driver; a
 * version is never rewritten.
 */
export class SqlIngredientRegistry implements IngredientRegistry {
  constructor(private readonly driver: SqlDriver) {}

  async listIngredients(): Promise<readonly IngredientEntry[]> {
    const rows = await this.driver.query<IngredientRow>(
      `SELECT i.schema_version, i.document FROM ingredients i
       WHERE i.version = (SELECT MAX(version) FROM ingredients WHERE id = i.id)
       ORDER BY i.id`,
    );
    return rows.map(toEntry);
  }

  async getIngredient(
    id: string,
    version: number,
  ): Promise<Result<IngredientEntry | undefined, IngredientStoreError>> {
    const [row] = await this.driver.query<IngredientRow>(
      'SELECT schema_version, document FROM ingredients WHERE id = ? AND version = ?',
      [id, version],
    );
    if (!row) return ok(undefined);
    if (Number(row.schema_version) > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Ingredient schema ${row.schema_version} is not supported`,
          { schemaVersion: Number(row.schema_version) },
        ),
      );
    }
    return ok(toEntry(row));
  }

  async listIngredientVersions(): Promise<readonly IngredientEntry[]> {
    const rows = await this.driver.query<IngredientRow>(
      'SELECT schema_version, document FROM ingredients ORDER BY id, version',
    );
    return rows.map(toEntry);
  }

  saveIngredient(entry: IngredientEntry): Promise<Result<IngredientEntry, IngredientStoreError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<{ head: number | null }>(
        'SELECT MAX(version) AS head FROM ingredients WHERE id = ?',
        [entry.id],
      );
      const currentHead = Number(row?.head ?? 0);
      if (entry.version !== currentHead + 1) {
        return err(
          domainError('HeadConflict', `Ingredient ${entry.id} is at version ${currentHead}`, {
            ingredientId: entry.id,
            currentHead,
          }),
        );
      }
      await insertIngredient(tx, entry);
      return ok(entry);
    });
  }
}
