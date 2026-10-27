import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { afterAll, describe, expect, it } from 'vitest';
import type { Instant } from '@flourprint/core/domain';
import {
  MIGRATIONS,
  openNodeSqlite,
  SqlEquipmentRegistry,
  SqlFlourRegistry,
  SqlIngredientRegistry,
  SqlRecipeRepository,
  SqlThermalProfileStore,
} from '../src/sqlite-node/index.js';

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
  it('appends a Save over a head written with a newer document schema', async () => {
    const db = await open(':memory:');
    const repository = new SqlRecipeRepository(db.driver);
    const input = {
      recipeId: 'r',
      name: 'R',
      expectedHead: 0,
      formula: {
        flours: [{ id: 'f', sharePct: 100 }],
        ingredients: [],
        components: [],
        anchor: { kind: 'flourTotal' as const, grams: 500 },
      },
      process: { steps: [] },
      createdAt: '2026-10-07T08:00:00.000Z' as Instant,
    };
    await repository.saveRevision(input);
    db.database.prepare("UPDATE revisions SET schema_version = 99 WHERE recipe_id = 'r'").run();
    expect(await repository.saveRevision({ ...input, expectedHead: 1 })).toMatchObject({
      ok: true,
      value: { version: 2 },
    });
  });
  it('upgrades a version 3 database to the flour registry, keeping its drafts', async () => {
    const file = path('upgrade-flours.sqlite');
    const v3 = await open(file, MIGRATIONS.slice(0, 3));
    v3.database
      .prepare("INSERT INTO drafts VALUES ('d', 'D', '{}', '2026-10-07T08:00:00.000Z')")
      .run();
    v3.close();

    const v4 = await open(file);
    expect(v4.database.prepare('SELECT COUNT(*) AS n FROM drafts').get()).toEqual({ n: 1 });
    const registry = new SqlFlourRegistry(v4.driver);
    expect(await registry.listFlours()).toEqual([]);
    expect(
      v4.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: 9 });
    v4.close();
  });

  it('upgrades a version 4 database to the equipment registry, keeping its flours', async () => {
    const file = path('upgrade-equipment.sqlite');
    const v4 = await open(file, MIGRATIONS.slice(0, 4));
    v4.database
      .prepare("INSERT INTO flours VALUES ('f', 1, 0, 1, '{}', '2026-10-07T08:00:00.000Z')")
      .run();
    v4.close();

    const v5 = await open(file);
    expect(v5.database.prepare('SELECT COUNT(*) AS n FROM flours').get()).toEqual({ n: 1 });
    expect(await new SqlEquipmentRegistry(v5.driver).listEquipment()).toEqual([]);
    expect(
      v5.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: 9 });
    v5.close();
  });

  it('upgrades a version 5 database to the recipe trash, keeping its recipes out of it', async () => {
    const file = path('upgrade-trash.sqlite');
    const v5 = await open(file, MIGRATIONS.slice(0, 5));
    v5.database
      .prepare(
        "INSERT INTO recipes (id, name, head_version, updated_at) VALUES ('r', 'R', 1, '2026-10-07T08:00:00.000Z')",
      )
      .run();
    v5.close();

    const v6 = await open(file);
    const repository = new SqlRecipeRepository(v6.driver);
    expect(await repository.getRecipe('r')).toEqual({
      id: 'r',
      name: 'R',
      headVersion: 1,
      updatedAt: '2026-10-07T08:00:00.000Z',
    });
    expect((await repository.listRecipes()).map((r) => r.id)).toEqual(['r']);
    expect(await repository.listTrash()).toEqual([]);
    expect(await repository.trashRecipe('r', '2026-10-08T08:00:00.000Z' as Instant)).toEqual({
      ok: true,
      value: undefined,
    });
    expect((await repository.listTrash()).map((r) => r.id)).toEqual(['r']);
    expect(
      v6.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: 9 });
    v6.close();
  });

  it('upgrades a version 6 database to the ingredient registry, keeping its recipes', async () => {
    const file = path('upgrade-ingredients.sqlite');
    const v6 = await open(file, MIGRATIONS.slice(0, 6));
    v6.database
      .prepare(
        "INSERT INTO recipes (id, name, head_version, updated_at) VALUES ('r', 'R', 1, '2026-10-07T08:00:00.000Z')",
      )
      .run();
    v6.close();

    const v7 = await open(file);
    expect((await new SqlRecipeRepository(v7.driver).listRecipes()).map((r) => r.id)).toEqual([
      'r',
    ]);
    expect(await new SqlIngredientRegistry(v7.driver).listIngredients()).toEqual([]);
    expect(
      v7.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: 9 });
    v7.close();
  });

  it('upgrades a version 7 database to recipe history, with no reference version inferred', async () => {
    const file = path('upgrade-history.sqlite');
    const v7 = await open(file, MIGRATIONS.slice(0, 7));
    v7.database
      .prepare(
        "INSERT INTO recipes (id, name, head_version, updated_at) VALUES ('r', 'R', 1, '2026-10-07T08:00:00.000Z')",
      )
      .run();
    v7.close();

    const v8 = await open(file);
    const repository = new SqlRecipeRepository(v8.driver);
    expect(await repository.listReferenceVersions('r')).toEqual([]);
    expect(
      v8.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: 9 });
    v8.close();
  });

  it('upgrades a version 8 database to the thermal profile, keeping its recipes as written', async () => {
    const file = path('upgrade-thermal.sqlite');
    const v8 = await open(file, MIGRATIONS.slice(0, 8));
    const step = {
      id: 'bulk',
      operation: 'bulk',
      dependsOn: [],
      schedule: 'asap' as const,
      plannedDurationS: 3600,
    };
    await new SqlRecipeRepository(v8.driver).saveRevision({
      recipeId: 'r',
      name: 'R',
      expectedHead: 0,
      formula: {
        flours: [{ id: 'f', sharePct: 100 }],
        ingredients: [],
        components: [],
        anchor: { kind: 'flourTotal', grams: 500 },
      },
      process: { steps: [step] },
      createdAt: '2026-10-07T08:00:00.000Z' as Instant,
    });
    const before = v8.database.prepare('SELECT document FROM revisions').all();
    expect(() => v8.database.prepare('SELECT COUNT(*) FROM thermal_profiles').get()).toThrow();
    v8.close();

    const v9 = await open(file);
    // The new table is there and empty; nothing stored was rewritten, and a revision without
    // thermal inputs still reads as one (no thermal inputs, the fixed lag).
    expect(v9.database.prepare('SELECT COUNT(*) AS n FROM thermal_profiles').get()).toEqual({
      n: 0,
    });
    expect(v9.database.prepare('SELECT document FROM revisions').all()).toEqual(before);
    const revision = await new SqlRecipeRepository(v9.driver).getRevision('r', 1);
    expect(revision.ok && revision.value?.process.steps[0]?.thermal).toBeUndefined();
    const store = new SqlThermalProfileStore(v9.driver);
    expect(await store.listThermalProfileVersions()).toEqual([]);
    const profile = {
      id: 'personal',
      version: 1,
      factors: [],
      updatedAt: '2026-10-25T08:00:00.000Z' as Instant,
    };
    expect(await store.saveThermalProfile(profile)).toMatchObject({ ok: true });
    expect(await store.getThermalProfile('personal', 1)).toEqual({ ok: true, value: profile });
    expect(
      v9.database.prepare("SELECT value FROM schema_meta WHERE key = 'schema_version'").get(),
    ).toEqual({ value: MIGRATIONS.length });
    v9.close();
  });

  it('refuses thermal profiles written with a newer document schema', async () => {
    const db = await open(':memory:');
    db.database
      .prepare(
        "INSERT INTO thermal_profiles VALUES ('personal', 1, 99, '{}', '2026-10-25T08:00:00.000Z')",
      )
      .run();
    expect(
      await new SqlThermalProfileStore(db.driver).getThermalProfile('personal', 1),
    ).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });

  it('refuses ingredient entries written with a newer document schema', async () => {
    const db = await open(':memory:');
    db.database
      .prepare("INSERT INTO ingredients VALUES ('i', 1, 0, 99, '{}', '2026-10-07T08:00:00.000Z')")
      .run();
    expect(await new SqlIngredientRegistry(db.driver).getIngredient('i', 1)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });

  it('refuses equipment entries written with a newer document schema', async () => {
    const db = await open(':memory:');
    db.database
      .prepare(
        "INSERT INTO equipment VALUES ('e', 1, 'vessel', 0, 99, '{}', '2026-10-07T08:00:00.000Z')",
      )
      .run();
    expect(await new SqlEquipmentRegistry(db.driver).getEquipment('e', 1)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });

  it('refuses flour entries written with a newer document schema', async () => {
    const db = await open(':memory:');
    db.database
      .prepare("INSERT INTO flours VALUES ('f', 1, 0, 99, '{}', '2026-10-07T08:00:00.000Z')")
      .run();
    expect(await new SqlFlourRegistry(db.driver).getFlour('f', 1)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });
});
