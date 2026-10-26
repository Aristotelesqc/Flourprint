import type { ThermalProfileStore, ThermalStoreError } from '@flourprint/core/application';
import {
  DOCUMENT_SCHEMA_VERSION,
  domainError,
  err,
  ok,
  type Result,
  type ThermalProfile,
} from '@flourprint/core/domain';
import type { SqlDriver, SqlExecutor } from './driver.js';

interface ProfileRow {
  schema_version: number;
  document: string;
}

const toProfile = (row: ProfileRow): ThermalProfile => {
  const { schemaVersion: _version, ...profile } = JSON.parse(row.document) as ThermalProfile & {
    schemaVersion: number;
  };
  return profile;
};

/** Writes one profile version; used by saves and restores (persistence.md). */
export const insertThermalProfile = async (
  tx: SqlExecutor,
  profile: ThermalProfile,
): Promise<void> => {
  await tx.run(
    'INSERT INTO thermal_profiles (id, version, schema_version, document, updated_at) VALUES (?, ?, ?, ?, ?)',
    [
      profile.id,
      profile.version,
      DOCUMENT_SCHEMA_VERSION,
      JSON.stringify({ schemaVersion: DOCUMENT_SCHEMA_VERSION, ...profile }),
      profile.updatedAt,
    ],
  );
};

/**
 * The personal thermal profile on any SQLite driver; a version is never rewritten
 * (persistence.md, Personal thermal profile).
 */
export class SqlThermalProfileStore implements ThermalProfileStore {
  constructor(private readonly driver: SqlDriver) {}

  async getThermalProfile(
    id: string,
    version: number,
  ): Promise<Result<ThermalProfile | undefined, ThermalStoreError>> {
    const [row] = await this.driver.query<ProfileRow>(
      'SELECT schema_version, document FROM thermal_profiles WHERE id = ? AND version = ?',
      [id, version],
    );
    if (!row) return ok(undefined);
    if (Number(row.schema_version) > DOCUMENT_SCHEMA_VERSION) {
      return err(
        domainError(
          'UnsupportedDocumentVersion',
          `Thermal profile schema ${row.schema_version} is not supported`,
          { schemaVersion: Number(row.schema_version) },
        ),
      );
    }
    return ok(toProfile(row));
  }

  async listThermalProfileVersions(): Promise<readonly ThermalProfile[]> {
    const rows = await this.driver.query<ProfileRow>(
      'SELECT schema_version, document FROM thermal_profiles ORDER BY id, version',
    );
    return rows.map(toProfile);
  }

  saveThermalProfile(profile: ThermalProfile): Promise<Result<ThermalProfile, ThermalStoreError>> {
    return this.driver.transaction(async (tx) => {
      const [row] = await tx.query<{ head: number | null }>(
        'SELECT MAX(version) AS head FROM thermal_profiles WHERE id = ?',
        [profile.id],
      );
      const currentHead = Number(row?.head ?? 0);
      if (profile.version !== currentHead + 1) {
        return err(
          domainError(
            'HeadConflict',
            `Thermal profile ${profile.id} is at version ${currentHead}`,
            {
              profileId: profile.id,
              currentHead,
            },
          ),
        );
      }
      await insertThermalProfile(tx, profile);
      return ok(profile);
    });
  }
}
