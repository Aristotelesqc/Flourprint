import { describe, expect, it } from 'vitest';
import {
  executeBakeCommand,
  exportBackup,
  exportFeedback,
  exportRecipes,
  importBackup,
  importRecipes,
  saveEquipmentEntry,
  saveFlourEntry,
  saveRevision,
  type BackupStores,
} from '@flourprint/core/application';
import {
  builtInEquipment,
  builtInFlour,
  customizeFlour,
  nextEquipmentVersion,
  nextFlourVersion,
  replayBake,
  type EquipmentEntry,
  type FlourEntry,
  type Formula,
  type Instant,
  type Process,
} from '@flourprint/core/domain';
import type { RestoreTarget } from '@flourprint/core/application';
import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryRecipeRepository,
  MemoryRestoreTarget,
} from '../src/memory/index.js';
import type { SqlDriver } from '../src/sql/index.js';
import {
  openNodeSqlite,
  SqlBakeEventStore,
  SqlEquipmentRegistry,
  SqlFlourRegistry,
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
    {
      id: 'mix',
      operation: 'mix',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 600,
      technique: {
        method: 'spiral',
        phases: [
          { speed: 'low', durationS: 240 },
          { speed: 'medium', durationS: 360 },
        ],
        endCheck: 'windowpane',
      },
    },
    {
      id: 'bulk',
      operation: 'bulk',
      dependsOn: ['mix'],
      schedule: 'asap',
      plannedDurationS: 10800,
      technique: { folds: { count: 3, intervalS: 1800, style: 'coilFold' } },
    },
  ],
};

/** The recipe as cooked: a Dutch oven stage on a stone, with a personal vessel (equipment.md). */
const cooked: Process = {
  steps: [
    ...process.steps,
    {
      id: 'bake',
      operation: 'bake',
      dependsOn: ['bulk'],
      schedule: 'asap',
      plannedDurationS: 2400,
      equipment: {
        appliance: 'oven',
        mode: 'still',
        setpointC: 250,
        vessel: { item: { id: 'my-dutch', version: 1 }, cover: 'covered' },
        support: { item: { id: 'baking-stone', version: 1 } },
        preheated: { appliance: 'hot', vessel: 'hot' },
      },
    },
  ],
};

const myDutch: EquipmentEntry = {
  id: 'my-dutch',
  version: 1,
  kind: 'vessel',
  name: 'My Dutch oven',
  builtIn: false,
  shape: 'dutchOven',
  material: 'castIron',
  lid: { material: 'castIron' },
  volumeMl: { status: 'known', value: 4000, source: { kind: 'personal', detail: 'measured' } },
  archived: false,
  createdAt: at('05:00'),
};
const myStone: EquipmentEntry = {
  id: 'my-stone',
  version: 1,
  kind: 'support',
  name: 'My pizza stone',
  builtIn: false,
  shape: 'stone',
  material: 'cordierite',
  archived: false,
  createdAt: at('05:10'),
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
    flours: new SqlFlourRegistry(driver),
    equipment: new SqlEquipmentRegistry(driver),
    restore: new SqlRestoreTarget(failOnWrite === undefined ? driver : failing),
    driver,
  };
};

const memoryStores = (): Target => {
  const recipes = new MemoryRecipeRepository();
  const bakes = new MemoryBakeEventStore();
  const flours = new MemoryFlourRegistry();
  const equipment = new MemoryEquipmentRegistry();
  return {
    recipes,
    bakes,
    flours,
    equipment,
    restore: new MemoryRestoreTarget(recipes, bakes, flours, equipment),
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
  // A draft that does not resolve is kept as recorded.
  await stores.recipes.saveDraft({
    id: 'draft-1',
    name: 'Baguette 1',
    origin: { kind: 'template', template: { id: 'baguette', version: '1' } },
    formula: { ...formula, flours: [{ id: 'flour', sharePct: 80 }] },
    process,
    createdAt: at('06:30'),
    updatedAt: at('06:45'),
  });
  // The formula's flour as a personal registry entry, edited once (flours.md).
  const bread = customizeFlour(builtInFlour('bread-flour') as FlourEntry, {
    id: 'bread',
    name: 'My bread flour',
    createdAt: at('05:00'),
  });
  await saveFlourEntry(stores.flours, bread);
  const edited = nextFlourVersion(
    bread,
    {
      properties: {
        ...bread.properties,
        proteinPct: {
          status: 'known',
          value: 13.2,
          unit: 'pct',
          basis: 'asIs',
          source: { kind: 'package' },
        },
      },
    },
    at('05:30'),
  );
  if (!edited.ok) throw new Error('edit failed');
  await saveFlourEntry(stores.flours, edited.value);
  // A personal Dutch oven, edited after the bake started; a personal stone for the deviation.
  await saveEquipmentEntry(stores.equipment, myDutch);
  const dutch2 = nextEquipmentVersion(myDutch, { notes: 'seasoned again' }, at('09:00'));
  if (!dutch2.ok) throw new Error('edit failed');
  await saveEquipmentEntry(stores.equipment, dutch2.value);
  await saveEquipmentEntry(stores.equipment, myStone);
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
      process: cooked,
      mode: { kind: 'startAt', at: at('08:00') },
      flours: [{ id: 'bread', version: 2 }],
      equipment: [myDutch, builtInEquipment('baking-stone') as EquipmentEntry],
    },
    at('08:00'),
  );
  await run(
    { type: 'AdjustFormula', edit: { type: 'SetBakerPct', ingredient: 'salt', pct: 2.2 } },
    at('08:01'),
  );
  await run(
    { type: 'AddObservation', stepId: 'mix', category: 'handling', text: 'sticky' },
    at('08:05'),
  );
  await run({ type: 'CompleteStep', stepId: 'mix' }, at('08:10'));
  await run({ type: 'StartStep', stepId: 'bulk' }, at('08:10'));
  await run(
    { type: 'AddObservation', stepId: 'bulk', category: 'handling', kind: 'fold', set: 1 },
    at('08:42'),
  );
  await run(
    {
      type: 'AdjustStep',
      stepId: 'bake',
      adjustment: {
        field: 'equipment',
        value: {
          appliance: 'oven',
          mode: 'still',
          setpointC: 230,
          vessel: { item: { id: 'my-dutch', version: 1 }, cover: 'open' },
          support: { item: { id: 'my-stone', version: 1 } },
        },
      },
      equipment: [myStone],
    },
    at('10:00'),
  );
  await run({ type: 'FinishBake' }, at('11:00'));
  await run({ type: 'AddObservation', category: 'crumb', text: 'tight' }, at('11:30'));
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
  (await stores.recipes.listTrash()).length === 0 &&
  (await stores.bakes.listBakes()).length === 0 &&
  (await stores.flours.listFlourVersions()).length === 0 &&
  (await stores.equipment.listEquipmentVersions()).length === 0;

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

  it('carries the trash: trashedAt is recorded and a restore keeps it', async () => {
    const source = memoryStores();
    await seed(source);
    await source.recipes.trashRecipe('lean-cold', at('09:30'));
    const exported = await exportBackup(source, at('12:00'));
    if (!exported.ok) throw new Error('export failed');
    const backup = JSON.parse(JSON.stringify(exported.value)) as Loose;
    expect(backup.recipes.find((r: Loose) => r.id === 'lean-cold').trashedAt).toBe(
      at('09:30'),
    );
    expect(backup.recipes.find((r: Loose) => r.id === 'lean').trashedAt).toBeUndefined();
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect((await target.recipes.listTrash()).map((r) => r.id)).toEqual(['lean-cold']);
    expect((await target.recipes.listRecipes()).map((r) => r.id)).toEqual(['lean']);
    const again = await exportBackup(target, at('12:00'));
    expect(JSON.parse(JSON.stringify(again))).toEqual({ ok: true, value: backup });
  });

  it('keeps a family whose members are all in the trash in the backup', async () => {
    const source = memoryStores();
    await seed(source);
    await source.recipes.trashRecipe('lean', at('09:30'));
    await source.recipes.trashRecipe('lean-cold', at('09:31'));
    expect(await source.recipes.listFamilies()).toEqual([]);
    const exported = await exportBackup(source, at('12:00'));
    if (!exported.ok) throw new Error('export failed');
    const backup = JSON.parse(JSON.stringify(exported.value)) as Loose;
    expect(backup.families).toHaveLength(1);
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect((await target.recipes.getRecipe('lean-cold'))?.familyId).toBe('lean-family');
  });

  it('restores a backup written after its recipe was deleted, bakes untouched', async () => {
    const source = memoryStores();
    await seed(source);
    const before = await source.bakes.loadEvents('bake-1');
    await source.recipes.trashRecipe('lean', at('09:30'));
    await source.recipes.deleteRecipe('lean');
    expect(await source.bakes.loadEvents('bake-1')).toEqual(before);
    const exported = await exportBackup(source, at('12:00'));
    if (!exported.ok) throw new Error('export failed');
    const backup = JSON.parse(JSON.stringify(exported.value)) as Loose;
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect(await target.recipes.getRecipe('lean')).toBeUndefined();
    expect(await target.bakes.loadEvents('bake-1')).toEqual(before);
  });

  it('restores a backup written before families', async () => {
    const backup = await backupOf();
    delete backup.families;
    for (const recipe of backup.recipes) delete recipe.familyId;
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect(await target.recipes.listFamilies()).toEqual([]);
  });

  it('restores a backup written before the flour registry', async () => {
    const backup = await backupOf();
    delete backup.flours;
    delete backup.bakes[0].events[0].payload.snapshot.flours;
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect(await target.flours.listFlours()).toEqual([]);
  });

  it('restores a backup written before equipment', async () => {
    const backup = await backupOf();
    delete backup.equipment;
    // Before 0.12.0 a bake has no equipment: its copies, steps and override are gone.
    const events = backup.bakes[0].events;
    delete events[0].payload.snapshot.equipment;
    for (const step of events[0].payload.snapshot.process.steps) delete step.equipment;
    backup.bakes[0].events = events
      .filter(
        (e: Loose) =>
          !(e.payload.type === 'OverrideApplied' && e.payload.target.field === 'equipment'),
      )
      .map((e: Loose, i: number) => ({ ...e, seq: i + 1 }));
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect(await target.equipment.listEquipment()).toEqual([]);
  });

  it('keeps the equipment versions a bake used, whatever was edited after', async () => {
    const backup = await backupOf();
    expect(backup.equipment.map((e: Loose) => `${e.id}@${e.version}`)).toEqual([
      'my-dutch@1',
      'my-dutch@2',
      'my-stone@1',
    ]);
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    const events = await target.bakes.loadEvents('bake-1');
    const started = events[0]?.payload;
    expect(started?.type === 'BakeStarted' && started.snapshot.equipment?.map((e) => e.id)).toEqual(
      ['my-dutch', 'baking-stone'],
    );
    const state = replayBake('bake-1', events);
    expect(state.equipment?.map((e) => `${e.id}@${e.version}`)).toEqual([
      'my-dutch@1',
      'baking-stone@1',
      'my-stone@1',
    ]);
    // The plan stays in the snapshot; the effective process shows what was used.
    expect(state.snapshot?.process.steps.at(-1)?.equipment?.setpointC).toBe(250);
    expect(state.process?.steps.at(-1)?.equipment?.setpointC).toBe(230);
  });

  it('refuses a built-in equipment copy that differs from its code definition', async () => {
    const backup = await backupOf();
    const copies = backup.bakes[0].events[0].payload.snapshot.equipment;
    copies.find((e: Loose) => e.id === 'baking-stone').material = 'glass';
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toMatchObject({
      ok: false,
      error: { code: 'InvalidBackup' },
    });
  });

  it('restores a finish written before outcomes as an unknown result', async () => {
    const backup = await backupOf();
    const finish = backup.bakes[0].events.find((e: Loose) => e.payload.type === 'BakeFinished');
    expect(finish.payload).toMatchObject({ outcomeSource: 'recipe' });
    finish.payload = { type: 'BakeFinished' };
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
  });

  it.each<[string, (payload: Loose) => void]>([
    ['an outcome without its source', (p) => delete p.outcomeSource],
    [
      'a raw dough disposition on a cooked result',
      (p) => (p.outcome = { result: 'cooked', dough: 'frozen' }),
    ],
    ['an unknown result', (p) => (p.outcome = { result: 'eaten' })],
    ['an unknown outcome field', (p) => (p.outcome = { result: 'dough', loaves: 2 })],
  ])('refuses a finish with %s', async (_label, corrupt) => {
    const backup = await backupOf();
    corrupt(backup.bakes[0].events.find((e: Loose) => e.payload.type === 'BakeFinished').payload);
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toMatchObject({
      ok: false,
      error: { code: 'InvalidBackup' },
    });
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
      'an ingredient with an unknown role',
      (b) => (b.recipes[0].revisions[0].formula.ingredients[1].role = 'doh'),
      'InvalidBackup',
    ],
    [
      'a step with an unknown schedule',
      (b) => (b.recipes[0].revisions[0].process.steps[1].schedule = 'later'),
      'InvalidBackup',
    ],
    [
      'a formula with an unknown field',
      (b) => (b.recipes[0].revisions[0].formula.extra = true),
      'InvalidBackup',
    ],
    [
      'a fat content above 100 %',
      (b) =>
        (b.recipes[0].revisions[0].formula.ingredients[1].fat = {
          status: 'known',
          valuePct: 250,
        }),
      'InvalidBackup',
    ],
    [
      'a reversed sugar range',
      (b) =>
        (b.recipes[0].revisions[0].formula.ingredients[1].sugar = {
          status: 'estimated',
          valuePct: 5,
          rangePct: [8, 2],
        }),
      'InvalidBackup',
    ],
    [
      'a snapshot with an empty anchor',
      (b) => (b.bakes[0].events[0].payload.snapshot.resolvedFormula.anchor = {}),
      'InvalidBackup',
    ],
    [
      'a snapshot with an empty projection',
      (b) => (b.bakes[0].events[0].payload.snapshot.initialProjection = { mode: {}, steps: {} }),
      'InvalidBackup',
    ],
    [
      'a snapshot formula with an unknown role',
      (b) => (b.bakes[0].events[0].payload.snapshot.formula.ingredients[1].role = 'doh'),
      'InvalidBackup',
    ],
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
          payload: { type: 'StepStarted', stepId: 'mix' },
        });
      },
      'InvalidBackup',
    ],
    [
      'a mixing phase at an unknown speed',
      (b) => (b.recipes[0].revisions[0].process.steps[0].technique.phases[0].speed = 'turbo'),
      'InvalidBackup',
    ],
    [
      'a fold count that is not an integer',
      (b) => (b.recipes[0].revisions[0].process.steps[1].technique.folds.count = 2.5),
      'InvalidBackup',
    ],
    [
      'a fold set beyond the step count',
      (b) => {
        const fold = b.bakes[0].events.find(
          (e: Loose) => e.payload.type === 'ObservationAdded' && e.payload.kind === 'fold',
        );
        fold.payload.set = 4;
      },
      'InvalidBackup',
    ],
    [
      'a set on an ordinary note',
      (b) => {
        const note = b.bakes[0].events.find(
          (e: Loose) => e.payload.type === 'ObservationAdded' && e.payload.text === 'sticky',
        );
        note.payload.set = 1;
      },
      'InvalidBackup',
    ],
    ['a reserved recipe id', (b) => (b.recipes[0].id = '__proto__'), 'InvalidBackup'],
    ['a gap in flour versions', (b) => b.flours.shift(), 'InvalidBackup'],
    [
      'a bake referring to a missing flour entry',
      (b) => (b.bakes[0].events[0].payload.snapshot.flours[0].version = 3),
      'InvalidBackup',
    ],
    [
      'a flour property without a source',
      (b) => (b.flours[1].properties.ashPct = { status: 'known', value: 'none' }),
      'InvalidBackup',
    ],
    [
      'a flour protein above 100 %',
      (b) => (b.flours[1].properties.proteinPct.value = 132),
      'InvalidBackup',
    ],
    ['a flour with an unknown field', (b) => (b.flours[0].extra = true), 'InvalidBackup'],
    ['a built-in flour entry', (b) => (b.flours[0].builtIn = true), 'InvalidBackup'],
    ['a gap in equipment versions', (b) => b.equipment.shift(), 'InvalidBackup'],
    ['equipment that is not a list', (b) => (b.equipment = {}), 'InvalidBackup'],
    [
      'an equipment entry with an unknown field',
      (b) => (b.equipment[0].extra = 1),
      'InvalidBackup',
    ],
    ['a built-in equipment entry', (b) => (b.equipment[0].builtIn = true), 'InvalidBackup'],
    ['an equipment entry without a name', (b) => delete b.equipment[0].name, 'InvalidBackup'],
    [
      'an equipment entry of an unknown kind',
      (b) => (b.equipment[0].kind = 'gadget'),
      'InvalidBackup',
    ],
    [
      'an equipment dimension that is not positive',
      (b) => (b.equipment[0].interior = { diameterMm: -3 }),
      'InvalidBackup',
    ],
    [
      'an equipment volume with a unit',
      (b) => (b.equipment[0].volumeMl.unit = 'ml'),
      'InvalidBackup',
    ],
    [
      'an appliance mode documented without a source',
      (b) =>
        (b.equipment[0].modes = [
          { native: 'Convection Bake', flourprint: 'fan', mapping: 'documented' },
        ]),
      'InvalidBackup',
    ],
    [
      'a bake whose copy differs from the registry entry',
      (b) => (b.bakes[0].events[0].payload.snapshot.equipment[0].notes = 'changed'),
      'InvalidBackup',
    ],
    [
      'a bake with a copy missing from the backup',
      (b) => b.equipment.splice(0, 2),
      'InvalidBackup',
    ],
    [
      'a snapshot whose reference does not resolve',
      (b) => b.bakes[0].events[0].payload.snapshot.equipment.shift(),
      'InvalidBackup',
    ],
    [
      'a snapshot step with a mode but no oven',
      (b) => delete b.bakes[0].events[0].payload.snapshot.process.steps[2].equipment.appliance,
      'InvalidBackup',
    ],
    [
      'a snapshot step with an unknown equipment field',
      (b) => (b.bakes[0].events[0].payload.snapshot.process.steps[2].equipment.cover = 'open'),
      'InvalidBackup',
    ],
    [
      'a vessel reference that resolves to a support',
      (b) =>
        (b.bakes[0].events[0].payload.snapshot.process.steps[2].equipment.vessel.item.id =
          'baking-stone'),
      'InvalidBackup',
    ],
    [
      'an equipment override of an unknown step',
      (b) =>
        (b.bakes[0].events.find(
          (e: Loose) => e.payload.target?.field === 'equipment',
        ).payload.target.stepId = 'nope'),
      'InvalidBackup',
    ],
    [
      'an equipment override with a setpoint that is not a number',
      (b) =>
        (b.bakes[0].events.find(
          (e: Loose) => e.payload.target?.field === 'equipment',
        ).payload.effective.setpointC = 'hot'),
      'InvalidBackup',
    ],
    [
      'an equipment override with a unit',
      (b) =>
        (b.bakes[0].events.find(
          (e: Loose) => e.payload.target?.field === 'equipment',
        ).payload.unit = 'degC'),
      'InvalidBackup',
    ],
    [
      'an equipment override whose copy is not referenced',
      (b) =>
        b.bakes[0].events
          .find((e: Loose) => e.payload.target?.field === 'equipment')
          .payload.equipment.push(b.equipment[1]),
      'InvalidBackup',
    ],
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

  it('restores a bake that recorded a built-in flour at version 1, refuses an unknown version', async () => {
    const backup = await backupOf();
    const withBuiltIn = (version: number): Loose => {
      const copy = JSON.parse(JSON.stringify(backup)) as Loose;
      const snapshot = copy.bakes[0].events[0].payload.snapshot;
      snapshot.formula.flours[0].id = 'bread-flour';
      snapshot.flours = [{ id: 'bread-flour', version }];
      return copy;
    };
    // Built-in entries are code: version 1 stays resolvable after version 2 (flours.md).
    for (const version of [1, 2]) {
      const target = await makeTarget();
      expect(await importBackup(target.restore, withBuiltIn(version))).toEqual({
        ok: true,
        value: undefined,
      });
    }
    const target = await makeTarget();
    expect(await importBackup(target.restore, withBuiltIn(3))).toMatchObject({
      ok: false,
      error: { code: 'InvalidBackup' },
    });
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

  it('never carries a recipe from the trash, nor a pin on one', async () => {
    const source = memoryStores();
    await seed(source);
    await source.recipes.trashRecipe('lean-cold', at('09:30'));
    const exported = await exportRecipes(source.recipes, at('12:00'));
    if (!exported.ok) throw new Error('export failed');
    const file = JSON.parse(JSON.stringify(exported.value)) as Loose;
    expect(file.recipes.map((r: Loose) => r.id)).toEqual(['lean']);
    expect(file.recipes[0].trashedAt).toBeUndefined();
    expect(file.families).toEqual([{ id: 'lean-family', name: 'Lean' }]);
    const target = await makeTarget();
    expect(await importRecipes(target.recipes, file)).toEqual({
      ok: true,
      value: { imported: ['lean'], skipped: [] },
    });
  });

  it('refuses a recipes file that carries a trashed recipe', async () => {
    const file = await recipeFile();
    file.recipes[0].trashedAt = at('09:30');
    const target = await makeTarget();
    expect(await importRecipes(target.recipes, file)).toMatchObject({
      ok: false,
      error: { code: 'InvalidRecipeFile' },
    });
    expect(await target.recipes.listTrash()).toEqual([]);
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
    ['an unknown role', (f) => (f.recipes[0].revisions[0].formula.ingredients[1].role = 'doh')],
    [
      'a fat content above 100 %',
      (f) =>
        (f.recipes[0].revisions[0].formula.ingredients[1].fat = { status: 'known', valuePct: 250 }),
    ],
  ])('refuses %s and writes nothing', async (_case, corrupt) => {
    const file = await recipeFile();
    corrupt(file);
    const target = await makeTarget();
    const result = await importRecipes(target.recipes, file);
    expect(result.ok).toBe(false);
    expect(await target.recipes.listRecipes()).toEqual([]);
  });
});

describe('feedback export (history.md)', () => {
  it('carries the full backup and a digest of each bake read from its events', async () => {
    const stores = memoryStores();
    await seed(stores);
    const device = {
      platform: 'desktop',
      storage: 'sqlite',
      build: 'test',
      locale: 'fr-CA',
      timeZone: 'America/Toronto',
      utcOffsetMinutes: -240,
    } as const;
    const result = await exportFeedback(stores, at('12:00'), device);
    if (!result.ok) throw new Error('export failed');
    const backup = await exportBackup(stores, at('12:00'));
    expect(result.value).toMatchObject({ kind: 'flourprint-feedback', device });
    expect(result.value.backup).toEqual(backup.ok ? backup.value : undefined);
    const [digest] = result.value.bakes;
    expect(digest).toMatchObject({
      bakeId: 'bake-1',
      status: 'finished',
      // Started without an origin: unknown, whatever the exporting device.
      origin: 'unknown',
      recipe: { id: 'lean', name: 'Lean', version: 2 },
      flours: [{ id: 'bread', version: 2 }],
      startedAt: at('08:00'),
      endedAt: at('11:00'),
      // Finished with one tap: the recipe's intended outcome (no cooking step: the raw dough),
      // recorded with its source.
      outcome: { result: 'cooked' },
      outcomeSource: 'recipe',
    });
    expect(result.value.schemaVersion).toBe(2);
    expect(digest?.steps.find((s) => s.id === 'mix')).toMatchObject({
      cooking: false,
      startedAt: at('08:00'),
      endedAt: at('08:10'),
      actualDurationS: 600,
    });
    expect(digest?.observations).toEqual([
      {
        at: at('08:05'),
        recordedAt: at('08:05'),
        stepId: 'mix',
        elapsedInStepS: 300,
        category: 'handling',
        text: 'sticky',
      },
      {
        at: at('08:42'),
        recordedAt: at('08:42'),
        stepId: 'bulk',
        elapsedInStepS: 1920,
        category: 'handling',
        kind: 'fold',
        set: 1,
      },
      { at: at('11:30'), recordedAt: at('11:30'), category: 'crumb', text: 'tight' },
    ]);
    expect(digest?.adjustments).toEqual([
      {
        at: at('08:01'),
        field: 'formula',
        value: { type: 'SetBakerPct', ingredient: 'salt', pct: 2.2 },
      },
      {
        at: at('10:00'),
        stepId: 'bake',
        field: 'equipment',
        value: {
          appliance: 'oven',
          mode: 'still',
          setpointC: 230,
          vessel: { item: { id: 'my-dutch', version: 1 }, cover: 'open' },
          support: { item: { id: 'my-stone', version: 1 } },
        },
      },
    ]);
  });
});
