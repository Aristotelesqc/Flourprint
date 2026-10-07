import { describe, expect, it } from 'vitest';
import {
  executeBakeCommand,
  exportBackup,
  importBackup,
  saveRevision,
  type BackupStores,
} from '@flourprint/core/application';
import type { Formula, Instant, Process } from '@flourprint/core/domain';
import { MemoryBakeEventStore, MemoryRecipeRepository } from '../src/memory/index.js';
import {
  openDatabase,
  SqliteNodeBakeEventStore,
  SqliteNodeRecipeRepository,
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

const sqliteStores = (): BackupStores => {
  const db = openDatabase(':memory:');
  if (!db.ok) throw new Error('open failed');
  return {
    recipes: new SqliteNodeRecipeRepository(db.value),
    bakes: new SqliteNodeBakeEventStore(db.value),
  };
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

describe('backup', () => {
  it('round-trips recipes, revisions and bake logs from memory to SQLite', async () => {
    const source: BackupStores = {
      recipes: new MemoryRecipeRepository(),
      bakes: new MemoryBakeEventStore(),
    };
    await seed(source);
    const backup = await exportBackup(source, at('12:00'));
    expect(backup.ok).toBe(true);
    if (!backup.ok) return;

    const target = sqliteStores();
    expect(await importBackup(target, JSON.parse(JSON.stringify(backup.value)))).toEqual({
      ok: true,
      value: undefined,
    });
    const again = await exportBackup(target, at('12:00'));
    expect(again).toEqual(backup);
    expect(await target.bakes.listBakes()).toEqual(await source.bakes.listBakes());
  });

  it('refuses to import into a database that already has data', async () => {
    const source: BackupStores = {
      recipes: new MemoryRecipeRepository(),
      bakes: new MemoryBakeEventStore(),
    };
    await seed(source);
    const backup = await exportBackup(source, at('12:00'));
    if (!backup.ok) throw new Error('export failed');
    expect(await importBackup(source, backup.value)).toMatchObject({
      ok: false,
      error: { code: 'TargetNotEmpty' },
    });
  });

  it('refuses newer and malformed backups', async () => {
    const empty = sqliteStores();
    const base = {
      kind: 'flourprint-backup',
      exportedAt: at('12:00'),
      recipes: [],
      bakes: [],
    } as const;
    expect(await importBackup(empty, { ...base, schemaVersion: 99 })).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
    expect(
      await importBackup(empty, {
        ...base,
        schemaVersion: 1,
        recipes: [
          {
            id: 'x',
            name: 'X',
            revisions: [{ recipeId: 'x', version: 2, formula, process, createdAt: at('07:00') }],
          },
        ],
      }),
    ).toMatchObject({ ok: false, error: { code: 'InvalidBackup' } });
  });
});
