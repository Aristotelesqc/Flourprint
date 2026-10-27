import { describe, expect, it } from 'vitest';
import {
  decodeRecipeFile,
  executeBakeCommand,
  exportBackup,
  exportRecipes,
  importBackup,
  importRecipes,
  loadBake,
  recordThermalCalibration,
  saveRevision,
  currentThermalProfile,
  type BackupStores,
  type RestoreTarget,
  type ThermalProfileStore,
} from '@flourprint/core/application';
import {
  EXPORT_SCHEMA_VERSION,
  estimateFermentation,
  MODEL_END_POINT,
  type BakeCommandPayload,
  type Formula,
  type Instant,
  type Process,
  type StepThermal,
  type ThermalProfile,
} from '@flourprint/core/domain';
import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryIngredientRegistry,
  MemoryRecipeRepository,
  MemoryRestoreTarget,
  MemoryThermalProfileStore,
} from '../src/memory/index.js';
import {
  openNodeSqlite,
  SqlBakeEventStore,
  SqlEquipmentRegistry,
  SqlFlourRegistry,
  SqlIngredientRegistry,
  SqlRecipeRepository,
  SqlRestoreTarget,
  SqlThermalProfileStore,
} from '../src/sqlite-node/index.js';

/** Persistence of the dough thermal model (persistence.md, Personal thermal profile, #176). */

const at = (time: string) => `2026-10-25T${time}:00.000Z` as Instant;
const known = { status: 'known', valuePct: 0 } as const;
const formula: Formula = {
  flours: [{ id: 'flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 65, role: 'dough' },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: known,
      fat: known,
      sugar: known,
    },
    {
      id: 'yeast',
      kind: 'other',
      bakerPct: 0.05,
      role: 'dough',
      water: known,
      fat: known,
      sugar: known,
      yeast: { form: 'fresh' },
    },
  ],
  components: [],
  anchor: { kind: 'doughWeight', grams: 500 },
};
const bowl: StepThermal = {
  geometry: 'bulk',
  container: { material: 'glass', cover: 'lid' },
  environment: 'fridgeStatic',
  porosity: 'unproofed',
};
const withThermal: Process = {
  steps: [
    {
      id: 'mix',
      operation: 'mix',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 600,
      conditions: { temperatureC: 24 },
    },
    {
      id: 'retard',
      operation: 'bulk',
      dependsOn: ['mix'],
      schedule: 'asap',
      plannedDurationS: 6 * 3600,
      conditions: { temperatureC: 4, location: 'fridge' },
      thermal: bowl,
    },
    {
      id: 'bake',
      operation: 'bake',
      dependsOn: ['retard'],
      schedule: 'asap',
      plannedDurationS: 2400,
    },
  ],
};
const withoutThermal: Process = {
  steps: withThermal.steps.map((s) => {
    const { thermal: _thermal, ...rest } = s;
    return rest;
  }),
};

type Target = BackupStores & {
  readonly thermalProfiles: ThermalProfileStore;
  readonly restore: RestoreTarget;
};

const memoryTarget = (): Target => {
  const ingredients = new MemoryIngredientRegistry();
  const recipes = new MemoryRecipeRepository(ingredients);
  const bakes = new MemoryBakeEventStore();
  const flours = new MemoryFlourRegistry();
  const equipment = new MemoryEquipmentRegistry();
  const thermalProfiles = new MemoryThermalProfileStore();
  return {
    recipes,
    bakes,
    flours,
    equipment,
    ingredients,
    thermalProfiles,
    restore: new MemoryRestoreTarget(
      recipes,
      bakes,
      flours,
      equipment,
      ingredients,
      thermalProfiles,
    ),
  };
};

const sqliteTarget = async (): Promise<Target> => {
  const db = await openNodeSqlite(':memory:');
  if (!db.ok) throw new Error('open failed');
  const driver = db.value.driver;
  return {
    recipes: new SqlRecipeRepository(driver),
    bakes: new SqlBakeEventStore(driver),
    flours: new SqlFlourRegistry(driver),
    equipment: new SqlEquipmentRegistry(driver),
    ingredients: new SqlIngredientRegistry(driver),
    thermalProfiles: new SqlThermalProfileStore(driver),
    restore: new SqlRestoreTarget(driver),
  };
};

const profile = (version: number, factor: number): ThermalProfile => ({
  id: 'personal',
  version,
  factors: [
    {
      material: 'glass',
      cover: 'lid',
      environment: 'fridgeStatic',
      sets: [
        {
          factor,
          massG: 500,
          geometry: 'bulk',
          readings: 3,
          basis: { bakeId: 'bake-1', stepId: 'retard', eventIds: ['e5', 'e6', 'e7'] },
        },
      ],
    },
  ],
  updatedAt: at(`1${version}:00`),
});

/** A recipe with thermal inputs, two versions of the profile, and a bake with readings. */
const seed = async (stores: Target, process: Process = withThermal) => {
  const saved = await saveRevision(stores.recipes, {
    recipeId: 'retard',
    name: 'Retard',
    expectedHead: 0,
    formula,
    process,
    createdAt: at('07:00'),
  });
  if (!saved.ok) throw new Error(JSON.stringify(saved.error));
  let n = 0;
  let version = 0;
  const run = async (payload: BakeCommandPayload, now: Instant) => {
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
      revisions: { formula: { id: 'retard', version: 1 }, process: { id: 'retard', version: 1 } },
      formula,
      process,
      mode: { kind: 'startAt', at: at('08:00') },
    },
    at('08:00'),
  );
  await run({ type: 'CompleteStep', stepId: 'mix' }, at('08:00'));
  await run({ type: 'StartStep', stepId: 'retard' }, at('08:00'));
  if (process === withThermal) {
    await run(
      {
        type: 'SetStepThermal',
        stepId: 'retard',
        at: at('08:05'),
        thermal: { ...bowl, pieces: 1 },
      },
      at('08:10'),
    );
    for (const minutes of [70, 160, 250]) {
      const observedAt = new Date(
        Date.parse(at('08:00')) + minutes * 60_000,
      ).toISOString() as Instant;
      await run(
        {
          type: 'AddObservation',
          stepId: 'retard',
          category: 'fermentation',
          kind: 'doughTemperature',
          position: 'core',
          measurement: {
            value: Math.round((4 + 20 * Math.exp(-minutes / 60 / 2.5)) * 1e4) / 1e4,
            unit: 'degC',
            observedAt,
          },
        },
        observedAt,
      );
    }
  }
  await stores.thermalProfiles.saveThermalProfile(profile(1, 1.2));
  await stores.thermalProfiles.saveThermalProfile(profile(2, 1.3));
};

type Loose = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const backupOf = async (stores: Target): Promise<Loose> => {
  const exported = await exportBackup(stores, at('12:00'));
  if (!exported.ok) throw new Error('export failed');
  return JSON.parse(JSON.stringify(exported.value)) as Loose;
};

const isEmpty = async (stores: Target) =>
  (await stores.recipes.listRecipes()).length === 0 &&
  (await stores.bakes.listBakes()).length === 0 &&
  (await stores.thermalProfiles.listThermalProfileVersions()).length === 0;

describe.each([
  ['memory', async () => memoryTarget()],
  ['sqlite-node', () => sqliteTarget()],
])('thermal data in backups into %s', (_name, makeTarget) => {
  it('the export is schema 3 and carries thermal inputs, the thermal events and every profile version', async () => {
    const source = await makeTarget();
    await seed(source);
    const backup = await backupOf(source);
    expect(EXPORT_SCHEMA_VERSION).toBe(3);
    expect(backup.schemaVersion).toBe(3);
    expect(backup.recipes[0].revisions[0].process.steps[1].thermal).toEqual(bowl);
    expect(backup.thermalProfiles.map((p: ThermalProfile) => p.version)).toEqual([1, 2]);
    const types = backup.bakes[0].events.map((e: Loose) => e.payload.type);
    expect(types).toContain('StepThermalChanged');
    expect(
      backup.bakes[0].events.filter((e: Loose) => e.payload.kind === 'doughTemperature'),
    ).toHaveLength(3);
  });

  it('round-trips into an empty target and exports the same document again', async () => {
    const source = await makeTarget();
    await seed(source);
    const backup = await backupOf(source);
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
    expect(await target.thermalProfiles.listThermalProfileVersions()).toEqual([
      profile(1, 1.2),
      profile(2, 1.3),
    ]);
    const again = await backupOf(target);
    expect({ ...again, exportedAt: undefined }).toEqual({ ...backup, exportedAt: undefined });
    const loaded = await loadBake(target.bakes, 'bake-1');
    if (!loaded.ok) throw new Error('load failed');
    expect(loaded.value.steps.retard?.thermalChanges).toHaveLength(1);
    expect(loaded.value.process?.steps.find((s) => s.id === 'retard')?.thermal).toEqual({
      ...bowl,
      pieces: 1,
    });
  });

  it('reads documents of version 1 and 2 unchanged, as no thermal data', async () => {
    const source = await makeTarget();
    await seed(source, withoutThermal);
    for (const schemaVersion of [1, 2]) {
      const backup = await backupOf(source);
      delete backup.thermalProfiles;
      backup.schemaVersion = schemaVersion;
      const target = await makeTarget();
      expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
      expect(await target.thermalProfiles.listThermalProfileVersions()).toEqual([]);
      const restored = await target.recipes.getRevision('retard', 1);
      expect(
        restored.ok && restored.value?.process.steps.some((s) => s.thermal !== undefined),
      ).toBe(false);
      // No thermal inputs: the fixed lag of the estimate, with the current engine.
      if (restored.ok && restored.value) {
        const dough = estimateFermentation(
          restored.value.formula,
          restored.value.process,
          MODEL_END_POINT,
        ).dough;
        expect(
          dough.progressPct.status === 'ok' &&
            dough.progressPct.assumptions.some((a) => a.startsWith('thermal_')),
        ).toBe(false);
      }
    }
  });

  it('reads a document of version 1 or 2 that carries thermal data as is (persistence.md, 0.22.0)', async () => {
    const source = await makeTarget();
    await seed(source);
    for (const schemaVersion of [1, 2]) {
      const backup = await backupOf(source);
      backup.schemaVersion = schemaVersion;
      const target = await makeTarget();
      expect(await importBackup(target.restore, backup)).toEqual({ ok: true, value: undefined });
      const restored = await target.recipes.getRevision('retard', 1);
      expect(restored.ok && restored.value?.process.steps[1]?.thermal).toEqual(bowl);
      expect((await target.thermalProfiles.listThermalProfileVersions()).length).toBeGreaterThan(0);
      const exported = await exportRecipes(source.recipes, at('12:00'));
      if (!exported.ok) throw new Error('export failed');
      const file = JSON.parse(JSON.stringify(exported.value)) as Loose;
      expect(decodeRecipeFile({ ...file, schemaVersion }).ok).toBe(true);
    }
  });

  it('refuses a document of a newer schema, which an older reader would have misread', async () => {
    const source = await makeTarget();
    await seed(source);
    const backup = await backupOf(source);
    backup.schemaVersion = 4;
    const target = await makeTarget();
    expect(await importBackup(target.restore, backup)).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion', details: { schemaVersion: 4 } },
    });
    expect(await isEmpty(target)).toBe(true);
  });

  it.each<[string, (backup: Loose) => void]>([
    ['a factor outside 0.25 to 4', (b) => (b.thermalProfiles[0].factors[0].sets[0].factor = 5)],
    ['an unknown key', (b) => (b.thermalProfiles[0].factors[0].material = 'wood')],
    ['a set without basis', (b) => delete b.thermalProfiles[0].factors[0].sets[0].basis],
    [
      'two sets for the same bake and step',
      (b) => {
        const sets = b.thermalProfiles[0].factors[0].sets;
        sets.push(JSON.parse(JSON.stringify(sets[0])));
      },
    ],
    ['a version gap', (b) => (b.thermalProfiles[1].version = 3)],
    ['an unknown field', (b) => (b.thermalProfiles[0].note = 'x')],
    ['a key with no set', (b) => (b.thermalProfiles[0].factors[0].sets = [])],
    [
      'a thermal object with an unknown field',
      (b) => (b.recipes[0].revisions[0].process.steps[1].thermal.shape = 'x'),
    ],
    [
      'thermal inputs that cannot be meant',
      (b) => (b.recipes[0].revisions[0].process.steps[1].thermal.pieces = 0),
    ],
    [
      'thermal inputs on a step that is not a dough step',
      (b) => (b.recipes[0].revisions[0].process.steps[0].thermal = bowl),
    ],
  ])('refuses %s and writes nothing', async (_case, corrupt) => {
    const source = await makeTarget();
    await seed(source);
    const backup = await backupOf(source);
    corrupt(backup);
    const target = await makeTarget();
    expect((await importBackup(target.restore, backup)).ok).toBe(false);
    expect(await isEmpty(target)).toBe(true);
  });

  it('refuses a thermal change recorded on a step that already ended', async () => {
    const source = await makeTarget();
    await seed(source);
    const backup = await backupOf(source);
    const events: Loose[] = backup.bakes[0].events;
    const changed = events.findIndex((e) => e.payload.type === 'StepThermalChanged');
    events.splice(changed, 0, {
      ...events[changed],
      payload: { type: 'StepCompleted', stepId: 'retard' },
    });
    events.forEach((e, i) => (e.seq = i + 1));
    const target = await makeTarget();
    expect((await importBackup(target.restore, backup)).ok).toBe(false);
    expect(await isEmpty(target)).toBe(true);
  });

  it('is not restored into a target that already holds a profile', async () => {
    const source = await makeTarget();
    await seed(source);
    const backup = await backupOf(source);
    const target = await makeTarget();
    await target.thermalProfiles.saveThermalProfile(profile(1, 1.1));
    expect(await importBackup(target.restore, backup)).toMatchObject({
      ok: false,
      error: { code: 'TargetNotEmpty' },
    });
    expect((await target.thermalProfiles.listThermalProfileVersions()).length).toBe(1);
    expect((await target.recipes.listRecipes()).length).toBe(0);
  });

  it('a recipes file carries the thermal inputs and never the personal profile', async () => {
    const source = await makeTarget();
    await seed(source);
    const exported = await exportRecipes(source.recipes, at('12:00'));
    if (!exported.ok) throw new Error('export failed');
    const file = JSON.parse(JSON.stringify(exported.value)) as Loose;
    expect(file.schemaVersion).toBe(3);
    expect(file.thermalProfiles).toBeUndefined();
    expect(file.recipes[0].revisions[0].process.steps[1].thermal).toEqual(bowl);
    const target = await makeTarget();
    expect((await importRecipes(target.recipes, file)).ok).toBe(true);
    expect(await target.thermalProfiles.listThermalProfileVersions()).toEqual([]);
    const restored = await target.recipes.getRevision('retard', 1);
    expect(restored.ok && restored.value?.process.steps[1]?.thermal).toEqual(bowl);
    // An older file reads as no thermal data; a newer one is refused.
    const older = { ...file, schemaVersion: 2 };
    for (const recipe of older.recipes) {
      for (const revision of recipe.revisions) {
        for (const step of revision.process.steps) delete step.thermal;
      }
    }
    expect(decodeRecipeFile(older).ok).toBe(true);
    expect(decodeRecipeFile({ ...file, schemaVersion: 4 })).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedDocumentVersion' },
    });
  });
});

describe.each([
  ['memory', async () => memoryTarget()],
  ['sqlite-node', () => sqliteTarget()],
])('calibrating the personal factor into %s', (_name, makeTarget) => {
  it('stores the factor as the next version of the profile, one set per bake and step', async () => {
    const stores = await makeTarget();
    await seed(stores);
    // Start from an empty store: the seed wrote two versions, drop them by using a fresh one.
    const fresh = (await makeTarget()).thermalProfiles;
    const events = await stores.bakes.loadEvents('bake-1');
    const first = await recordThermalCalibration(
      fresh,
      events,
      'retard',
      { method: 'twoPoint' },
      at('13:00'),
    );
    if (!first.ok) throw new Error(JSON.stringify(first.error));
    expect(first.value.profile.version).toBe(1);
    expect(first.value.profile.factors).toHaveLength(1);
    expect(first.value.profile.factors[0]).toMatchObject({
      material: 'glass',
      cover: 'lid',
      environment: 'fridgeStatic',
    });
    const factor = first.value.profile.factors[0]?.sets[0]?.factor ?? 0;
    expect(factor).toBeGreaterThan(1.3);
    expect(factor).toBeLessThan(1.4);
    // Calibrating the same step again replaces its set: a new version, still one set.
    const again = await recordThermalCalibration(
      fresh,
      events,
      'retard',
      { method: 'guggenheim' },
      at('14:00'),
    );
    if (!again.ok) throw new Error(JSON.stringify(again.error));
    expect(again.value.profile.version).toBe(2);
    expect(again.value.profile.factors[0]?.sets).toHaveLength(1);
    expect((await fresh.listThermalProfileVersions()).map((p) => p.version)).toEqual([1, 2]);
    // The estimate names the factor in force.
    const current = await currentThermalProfile(fresh);
    const dough = estimateFermentation(formula, withThermal, MODEL_END_POINT, {
      ...(current === undefined ? {} : { thermalProfile: current }),
    }).dough;
    expect(
      dough.progressPct.status === 'ok' &&
        dough.progressPct.assumptions.some((a) =>
          a.startsWith('thermal_factor:glass.lid.fridgeStatic='),
        ),
    ).toBe(true);
  });

  it('calibrates after the bake: from a finished session', async () => {
    const stores = await makeTarget();
    await seed(stores);
    const loaded = await loadBake(stores.bakes, 'bake-1');
    if (!loaded.ok) throw new Error('load failed');
    let version = loaded.value.version;
    const run = async (payload: BakeCommandPayload, now: Instant) => {
      const result = await executeBakeCommand(
        { store: stores.bakes, clock: { now: () => now }, ids: { next: () => `f${++version}` } },
        {
          commandId: `after-${now}-${payload.type}`,
          bakeId: 'bake-1',
          expectedVersion: version,
          issuedAt: now,
          payload,
        },
      );
      if (!result.ok) throw new Error(JSON.stringify(result.error));
      version = result.value.state.version;
    };
    await run({ type: 'CompleteStep', stepId: 'retard' }, at('13:00'));
    await run(
      { type: 'FinishBake', outcome: { result: 'dough', dough: 'refrigerated' } },
      at('13:00'),
    );
    const fresh = (await makeTarget()).thermalProfiles;
    const events = await stores.bakes.loadEvents('bake-1');
    const result = await recordThermalCalibration(
      fresh,
      events,
      'retard',
      { method: 'twoPoint' },
      at('13:30'),
    );
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    expect(result.value.profile.version).toBe(1);
    expect(result.value.calibration.tauObsH).toBeCloseTo(2.5, 2);
  });

  it('stores nothing when the estimators refuse the readings', async () => {
    const stores = await makeTarget();
    await seed(stores);
    const fresh = (await makeTarget()).thermalProfiles;
    const events = await stores.bakes.loadEvents('bake-1');
    // The first reading only: not enough after the transient.
    const few = events
      .filter((e) => e.payload.type !== 'ObservationAdded')
      .concat(events.filter((e) => e.payload.type === 'ObservationAdded').slice(0, 1));
    const result = await recordThermalCalibration(
      fresh,
      few,
      'retard',
      { method: 'twoPoint' },
      at('13:00'),
    );
    expect(result).toMatchObject({ ok: false, error: { code: 'readings_invalid' } });
    expect(await fresh.listThermalProfileVersions()).toEqual([]);
  });
});
