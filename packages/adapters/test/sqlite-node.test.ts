import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, describe, expect, it } from 'vitest';
import type { Instant } from '@flourprint/core/domain';
import { MIGRATIONS, openNodeSqlite, SqlRecipeRepository } from '../src/sqlite-node/index.js';

const open = async (path: string, migrations = MIGRATIONS) => {
  const db = await openNodeSqlite(path, migrations);
  if (!db.ok) throw new Error(JSON.stringify(db.error));
  return db.value;
};

describe('sqlite-node durability', () => {
  const dir = mkdtempSync(join(tmpdir(), 'flourprint-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const path = (name: string) => join(dir, name);

  it('keeps data after the database is closed and reopened', async () => {
    const file = path('reopen.sqlite');
    const first = await open(file);
    await new SqlRecipeRepository(first.driver).saveRevision({
      recipeId: 'r',
      name: 'R',
      expectedHead: 0,
      formula: {
        flours: [{ id: 'f', sharePct: 100 }],
        ingredients: [],
        components: [],
        anchor: { kind: 'flourTotal', grams: 500 },
      },
      process: { steps: [] },
      createdAt: '2026-10-07T08:00:00.000Z' as Instant,
    });
    first.close();

    const second = await open(file);
    expect(await new SqlRecipeRepository(second.driver).getRecipe('r')).toMatchObject({
      headVersion: 1,
    });
    second.close();
  });

  it('refuses a database written by a newer app', async () => {
    const file = path('newer.sqlite');
    const raw = new DatabaseSync(file);
    raw.exec('CREATE TABLE schema_meta (key TEXT PRIMARY KEY, value INTEGER NOT NULL)');
    raw.exec(`INSERT INTO schema_meta VALUES ('schema_version', ${MIGRATIONS.length + 1})`);
    raw.close();
    expect(await openNodeSqlite(file)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDatabaseVersion' },
    });
  });

  it('rolls back a failed migration and keeps the previous version usable', async () => {
    const file = path('failed.sqlite');
    const current = await open(file);
    current.database
      .prepare(
        "INSERT INTO recipes (id, name, head_version, updated_at) VALUES ('r', 'R', 1, '2026-10-07T08:00:00.000Z')",
      )
      .run();
    current.close();

    const next = MIGRATIONS.length + 1;
    const broken = [
      ...MIGRATIONS,
      {
        version: next,
        sql: 'ALTER TABLE recipes ADD COLUMN tag TEXT; SELECT * FROM missing_table;',
      },
    ];
    expect(await openNodeSqlite(file, broken)).toMatchObject({
      ok: false,
      error: { code: 'MigrationFailed', details: { version: next } },
    });

    const again = await open(file);
    const columns = again.database.prepare('PRAGMA table_info(recipes)').all() as {
      name: string;
    }[];
    expect(columns.map((c) => c.name)).not.toContain('tag');
    expect(again.database.prepare('SELECT COUNT(*) AS n FROM recipes').get()).toEqual({ n: 1 });
    expect(
      again.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: MIGRATIONS.length });
    again.close();
  });

  it('upgrades a version 1 database to families without losing recipes', async () => {
    const file = path('upgrade.sqlite');
    const v1 = await open(file, MIGRATIONS.slice(0, 1));
    v1.database
      .prepare("INSERT INTO recipes VALUES ('r', 'R', 1, '2026-10-07T08:00:00.000Z')")
      .run();
    v1.close();

    const v2 = await open(file);
    const repository = new SqlRecipeRepository(v2.driver);
    expect(await repository.getRecipe('r')).toEqual({
      id: 'r',
      name: 'R',
      headVersion: 1,
      updatedAt: '2026-10-07T08:00:00.000Z',
    });
    expect(await repository.groupRecipes({ id: 'f', name: 'F' }, ['r'])).toEqual({
      ok: true,
      value: undefined,
    });
    expect((await repository.getRecipe('r'))?.familyId).toBe('f');
    v2.close();
  });

  it('refuses revisions written with a newer document schema', async () => {
    const db = await open(':memory:');
    db.database
      .prepare("INSERT INTO revisions VALUES ('r', 1, 99, '{}', '2026-10-07T08:00:00.000Z')")
      .run();
    expect(await new SqlRecipeRepository(db.driver).getRevision('r', 1)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });
});
