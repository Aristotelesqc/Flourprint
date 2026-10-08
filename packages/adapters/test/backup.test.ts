import { describe, expect, it } from 'vitest';
import {
  executeBakeCommand,
  exportBackup,
  exportRecipes,
  importBackup,
  importRecipes,
  saveRevision,
  type BackupStores,
} from '@flourprint/core/application';
import type { Formula, Instant, Process } from '@flourprint/core/domain';
import type { RestoreTarget } from '@flourprint/core/application';
import {
  MemoryBakeEventStore,
  MemoryRecipeRepository,
  MemoryRestoreTarget,
} from '../src/memory/index.js';
import type { SqlDriver } from '../src/sql/index.js';
import {
  openNodeSqlite,
  SqlBakeEventStore,
  SqlRecipeRepository,
  SqlRestoreTarget,
} from '../src/sqlite-node/index.js';

const at = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;
const formula: Formula = {
  flours: [{ id: 'bread', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: { status: 'known', valuePct: 0 },
    },
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 1000 },
};
const process: Process = {
  steps: [
    { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 },
    {
      id: 'bulk',
      operation: 'bulk',
      dependsOn: ['mix'],
      schedule: 'asap',
      plannedDurationS: 10800,
    },
  ],
};

type Target = BackupStores & { readonly restore: RestoreTarget; readonly driver?: SqlDriver };

/** SQLite stores; `failOnWrite` makes the n-th write of a restore throw, like a full disk. */
const sqliteStores = async (failOnWrite?: number): Promise<Target> => {
  const db = await openNodeSqlite(':memory:');
  if (!db.ok) throw new Error('open failed');
  const driver = db.value.driver;
  let writes = 0;
  const failing: SqlDriver = {
    ...driver,
    transaction: (work) =>
      driver.transaction((tx) =>
        work({
          ...tx,
          run: async (sql, values) => {
            if (++writes === failOnWrite) throw new Error('disk full');
            return tx.run(sql, values);
          },
        }),
      ),
  };
  return {
    recipes: new SqlRecipeRepository(driver),
    bakes: new SqlBakeEventStore(driver),
    restore: new SqlRestoreTarget(failOnWrite === undefined ? driver : failing),
    driver,
  };
};

const memoryStores = (): Target => {
  const recipes = new MemoryRecipeRepository();
  const bakes = new MemoryBakeEventStore();
  return { recipes, bakes, restore: new MemoryRestoreTarget(recipes, bakes) };
};

/** Two revisions and a finished bake with an override, written through the use cases. */
const seed = async (stores: BackupStores) => {
  await saveRevision(stores.recipes, {
    recipeId: 'lean',
    name: 'Lean',
    expectedHead: 0,
    formula,
    process,
    createdAt: at('07:00'),
  });
  const tweaked = {
    ...formula,
    ingredients: formula.ingredients.map((i) => (i.id === 'water' ? { ...i, bakerPct: 72 } : i)),
  };
  await saveRevision(stores.recipes, {
    recipeId: 'lean',
    name: 'Lean',
    expectedHead: 1,
    formula: tweaked,
    process,
    createdAt: at('07:30'),
    note: 'more water',
  });
  await saveRevision(stores.recipes, {
    recipeId: 'lean-cold',
    name: 'Lean, cold',
    expectedHead: 0,
    formula,
    process,
    createdAt: at('06:00'),
  });
  await stores.recipes.groupRecipes({ id: 'lean-family', name: 'Lean' }, ['lean', 'lean-cold']);
  await stores.recipes.pinVariant('lean-family', 'lean-cold');
  let n = 0;
  let version = 0;
  const run = async (
    payload: Parameters<typeof executeBakeCommand>[1]['payload'],
    now: Instant,
  ) => {
    const result = await executeBakeCommand(
      { store: stores.bakes, clock: { now: () => now }, ids: { next: () => `e${++n}` } },
      {
        commandId: `c${n}-${now}`,
        bakeId: 'bake-1',
        expectedVersion: version,
        issuedAt: now,
        payload,
      },
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    version = result.value.state.version;
  };
  await run(
    {
      type: 'StartBake',
      revisions: { formula: { id: 'lean', version: 2 }, process: { id: 'lean', version: 2 } },
      formula: tweaked,
      process,
      mode: { kind: 'startAt', at: at('08:00') },
    },
    at('08:00'),
  );
  await run(
    { type: 'AdjustFormula', edit: { type: 'SetBakerPct', ingredient: 'salt', pct: 2.2 } },
    at('08:01'),
  );
  await run({ type: 'CompleteStep', stepId: 'mix' }, at('08:10'));
  await run({ type: 'FinishBake' }, at('11:00'));
};

/** A backup as untrusted JSON: the tests corrupt it on purpose. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

const backupOf = async () => {
  const source = memoryStores();
  await seed(source);
  const backup = await exportBackup(source, at('12:00'));
  if (!backup.ok) throw new Error('export failed');
  return JSON.parse(JSON.stringify(backup.value)) as Loose;
};

const isEmpty = async (stores: BackupStores) =>
  (await stores.recipes.listRecipes()).length === 0 &&
  (await stores.bakes.listBakes()).length === 0;

describe.each([
  ['memory', async () => memoryStores()],
  ['sqlite-node', () => sqliteStores()],
])('backup into %s', (_name, makeTarget) => {
  it('round-trips recipes, revisions and bake logs', async () => {
    const backup = await backupOf();
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    const again = await exportBackup(target, at('12:00'));
    expect(JSON.parse(JSON.stringify(again))).toEqual({ ok: true, value: backup });
  });

  it('restores a backup written before families', async () => {
    const backup = await backupOf();
    delete backup.families;
    for (const recipe of backup.recipes) delete recipe.familyId;
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect(await target.recipes.listFamilies()).toEqual([]);
  });

  it('refuses to import into a database that already has data', async () => {
    const target = await makeTarget();
    await seed(target);
    expect(await importBackup(target.restore, await backupOf())).toMatchObject({
      ok: false,
      error: { code: 'TargetNotEmpty' },
    });
  });

  it.each<[string, (backup: Loose) => void, string]>([
    ['a newer document schema', (b) => (b.schemaVersion = 99), 'UnsupportedDocumentVersion'],
    ['a recipe in a missing family', (b) => (b.families = []), 'InvalidBackup'],
    [
      'a pin on a recipe outside its family',
      (b) => delete b.recipes.find((r: Loose) => r.id === 'lean-cold').familyId,
      'InvalidBackup',
    ],
    ['a missing schema version', (b) => delete b.schemaVersion, 'InvalidBackup'],
    [
      'a misnumbered last revision',
      (b) => (b.recipes[0].revisions[1].version = 3),
      'InvalidBackup',
    ],
    [
      'an invalid last revision',
      (b) => (b.recipes[0].revisions[1].formula.flours = []),
      'InvalidBackup',
    ],
    [
      'an impossible date',
      (b) => (b.recipes[0].revisions[0].createdAt = '2026-02-30T07:00:00.000Z'),
      'InvalidBackup',
    ],
    [
      'a newer event schema',
      (b) => (b.bakes[0].events.at(-1).schemaVersion = 2),
      'UnsupportedEventVersion',
    ],
    ['a misnumbered event', (b) => (b.bakes[0].events[1].seq = 7), 'InvalidBackup'],
    ['a duplicated bake', (b) => b.bakes.push(b.bakes[0]), 'InvalidBackup'],
    [
      'a bake referring to a missing revision',
      (b) => b.recipes[0].revisions.pop(),
      'InvalidBackup',
    ],
    [
      'a snapshot without its resolved formula',
      (b) => delete b.bakes[0].events[0].payload.snapshot.resolvedFormula,
      'InvalidBackup',
    ],
    [
      'a malformed resolved snapshot',
      (b) => (b.bakes[0].events[0].payload.snapshot.resolvedFormula.doughWeight = 'heavy'),
      'InvalidBackup',
    ],
    [
      'a malformed formula override',
      (b) => (b.bakes[0].events[1].payload.derived.resolvedFormula = {}),
      'InvalidBackup',
    ],
    [
      'an unknown step reference',
      (b) => (b.bakes[0].events[2].payload.stepId = 'ghost'),
      'InvalidBackup',
    ],
    [
      'a missing process revision',
      (b) => (b.bakes[0].events[0].payload.snapshot.revisions.process.version = 9),
      'InvalidBackup',
    ],
    [
      'a log that does not start the bake',
      (b) => (b.bakes[0].events[0].payload = { type: 'StepStarted', stepId: 'mix' }),
      'InvalidBackup',
    ],
    [
      'an unknown event type',
      (b) => (b.bakes[0].events.at(-1).payload.type = 'Teleported'),
      'InvalidBackup',
    ],
    [
      'an event after the bake ended',
      (b) => {
        const events = b.bakes[0].events;
        const last = events.at(-1);
        events.push({
          ...last,
          eventId: 'late',
          seq: last.seq + 1,
          payload: { type: 'ObservationAdded', category: 'other', text: 'late' },
        });
      },
      'InvalidBackup',
    ],
    ['a reserved recipe id', (b) => (b.recipes[0].id = '__proto__'), 'InvalidBackup'],
    ['malformed content', (b) => (b.recipes[0].revisions[0].process = 'nope'), 'InvalidBackup'],
  ])('refuses %s, writes nothing and allows a clean retry', async (_case, corrupt, code) => {
    const backup = await backupOf();
    const broken = JSON.parse(JSON.stringify(backup)) as Loose;
    corrupt(broken);
    const target = await makeTarget();
    expect(await importBackup(target.restore, broken)).toMatchObject({
      ok: false,
      error: { code },
    });
    expect(await isEmpty(target)).toBe(true);
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
  });
});

describe('restore on SQLite', () => {
  it('rolls back everything when a late write fails, then retries cleanly', async () => {
    const backup = await backupOf();
    const target = await sqliteStores(5);
    await expect(importBackup(target.restore, backup)).rejects.toThrow('disk full');
    expect(await isEmpty(target)).toBe(true);
    const retry = new SqlRestoreTarget(target.driver as SqlDriver);
    expect(await importBackup(retry, backup)).toEqual({ ok: true, value: undefined });
    expect((await exportBackup(target, at('12:00'))).ok).toBe(true);
  });
});

describe.each([
  ['memory', async () => memoryStores()],
  ['sqlite-node', () => sqliteStores()],
])('recipe file into %s', (_name, makeTarget) => {
  const recipeFile = async () => {
    const source = memoryStores();
    await seed(source);
    const file = await exportRecipes(source.recipes, at('12:00'));
    if (!file.ok) throw new Error('export failed');
    return JSON.parse(JSON.stringify(file.value)) as Loose;
  };

  it('holds recipes and families, never bakes', async () => {
    const file = await recipeFile();
    expect(file.kind).toBe('flourprint-recipes');
    expect(file.bakes).toBeUndefined();
    expect(file.families).toEqual([
      { id: 'lean-family', name: 'Lean', pinnedRecipeId: 'lean-cold' },
    ]);
  });

  it('adds absent recipes next to existing data, never overwrites, and is idempotent', async () => {
    const target = await makeTarget();
    await saveRevision(target.recipes, {
      recipeId: 'lean',
      name: 'My own lean',
      expectedHead: 0,
      formula,
      process,
      createdAt: at('05:00'),
    });
    const file = await recipeFile();
    expect(await importRecipes(target.recipes, file)).toEqual({
      ok: true,
      value: { imported: ['lean-cold'], skipped: ['lean'] },
    });
    expect((await target.recipes.getRecipe('lean'))?.name).toBe('My own lean');
    expect((await target.recipes.getRecipe('lean'))?.familyId).toBeUndefined();
    expect((await target.recipes.getRecipe('lean-cold'))?.familyId).toBe('lean-family');
    expect(await importRecipes(target.recipes, file)).toEqual({
      ok: true,
      value: { imported: [], skipped: ['lean', 'lean-cold'] },
    });
  });

  it.each<[string, (file: Loose) => void]>([
    ['a full backup', (f) => (f.kind = 'flourprint-backup')],
    ['an invalid revision', (f) => (f.recipes[0].revisions[0].formula.flours = [])],
    ['a misnumbered revision', (f) => (f.recipes[0].revisions[0].version = 2)],
    ['a duplicate recipe', (f) => f.recipes.push(f.recipes[0])],
  ])('refuses %s and writes nothing', async (_case, corrupt) => {
    const file = await recipeFile();
    corrupt(file);
    const target = await makeTarget();
    const result = await importRecipes(target.recipes, file);
    expect(result.ok).toBe(false);
    expect(await target.recipes.listRecipes()).toEqual([]);
  });
});
