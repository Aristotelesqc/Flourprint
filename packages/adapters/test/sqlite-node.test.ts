import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, describe, expect, it } from 'vitest';
import {
  MIGRATIONS,
  openDatabase,
  SqliteNodeBakeEventStore,
  SqliteNodeRecipeRepository,
} from '../src/sqlite-node/index.js';
import {
  describeBakeEventStoreContract,
  describeRecipeRepositoryContract,
} from './contract/stores.js';

const memoryDb = () => {
  const db = openDatabase(':memory:');
  if (!db.ok) throw new Error(JSON.stringify(db.error));
  return db.value;
};

describeBakeEventStoreContract('sqlite-node', () => new SqliteNodeBakeEventStore(memoryDb()));
describeRecipeRepositoryContract('sqlite-node', () => new SqliteNodeRecipeRepository(memoryDb()));

describe('sqlite-node durability', () => {
  const dir = mkdtempSync(join(tmpdir(), 'flourprint-'));
  afterAll(() => rmSync(dir, { recursive: true, force: true }));
  const path = (name: string) => join(dir, name);

  it('keeps data after the database is closed and reopened', async () => {
    const file = path('reopen.sqlite');
    const first = openDatabase(file);
    if (!first.ok) throw new Error('open failed');
    await new SqliteNodeRecipeRepository(first.value).saveRevision({
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
      createdAt: '2026-10-07T08:00:00.000Z' as never,
    });
    first.value.close();

    const second = openDatabase(file);
    if (!second.ok) throw new Error('reopen failed');
    expect(await new SqliteNodeRecipeRepository(second.value).getRecipe('r')).toMatchObject({
      headVersion: 1,
    });
    second.value.close();
  });

  it('refuses a database written by a newer app', () => {
    const file = path('newer.sqlite');
    const raw = new DatabaseSync(file);
    raw.exec(`PRAGMA user_version = ${MIGRATIONS.length + 1}`);
    raw.close();
    expect(openDatabase(file)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDatabaseVersion' },
    });
  });

  it('rolls back a failed migration and keeps the previous version usable', () => {
    const file = path('failed.sqlite');
    const v1 = openDatabase(file);
    if (!v1.ok) throw new Error('open failed');
    v1.value.prepare("INSERT INTO recipes VALUES ('r', 'R', 1, '2026-10-07T08:00:00.000Z')").run();
    v1.value.close();

    const broken = [
      ...MIGRATIONS,
      { version: 2, sql: 'ALTER TABLE recipes ADD COLUMN tag TEXT; SELECT * FROM missing_table;' },
    ];
    expect(openDatabase(file, broken)).toMatchObject({
      ok: false,
      error: { code: 'MigrationFailed', details: { version: 2 } },
    });

    const again = openDatabase(file);
    if (!again.ok) throw new Error('reopen failed');
    const columns = again.value.prepare('PRAGMA table_info(recipes)').all() as { name: string }[];
    expect(columns.map((c) => c.name)).not.toContain('tag');
    expect(again.value.prepare('SELECT COUNT(*) AS n FROM recipes').get()).toEqual({ n: 1 });
    again.value.close();
  });

  it('refuses revisions written with a newer document schema', async () => {
    const db = memoryDb();
    db.prepare("INSERT INTO revisions VALUES ('r', 1, 99, '{}', '2026-10-07T08:00:00.000Z')").run();
    expect(await new SqliteNodeRecipeRepository(db).getRevision('r', 1)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });
});
