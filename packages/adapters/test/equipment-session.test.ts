import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { executeBakeCommand, loadBake, type BakeEventStore } from '@flourprint/core/application';
import {
  builtInEquipment,
  intendedOutcome,
  processEquipmentRefs,
  type BakeCommandPayload,
  type BakeState,
  type EquipmentEntry,
  type Formula,
  type Instant,
  type Process,
  type ProcessStep,
  type StepEquipment,
} from '@flourprint/core/domain';
import { MemoryBakeEventStore } from '../src/memory/index.js';
import { openNodeSqlite, SqlBakeEventStore } from '../src/sqlite-node/index.js';

/** Session tests of the equipment contract (equipment.md, acceptance examples). */
const formula = (
  JSON.parse(
    readFileSync(
      fileURLToPath(
        new URL('../../../docs/contracts/fixtures/poolish-tangzhong.json', import.meta.url),
      ),
      'utf8',
    ),
  ) as { input: Formula }
).input;

const H = 3600;
const t = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;

const makers: Array<[string, () => Promise<BakeEventStore>]> = [
  ['memory', async () => new MemoryBakeEventStore()],
  [
    'sqlite-node',
    async () => {
      const db = await openNodeSqlite(':memory:');
      if (!db.ok) throw new Error(JSON.stringify(db.error));
      return new SqlBakeEventStore(db.value.driver);
    },
  ],
];

class Session {
  #now = t('07:00');
  #id = 0;
  #version = 0;
  constructor(readonly store: BakeEventStore) {}

  at(time: Instant): this {
    this.#now = time;
    return this;
  }

  async run(payload: BakeCommandPayload) {
    const result = await executeBakeCommand(
      { store: this.store, clock: { now: () => this.#now }, ids: { next: () => `e${++this.#id}` } },
      {
        commandId: `c${++this.#id}`,
        bakeId: 'bake-1',
        expectedVersion: this.#version,
        issuedAt: this.#now,
        payload,
      },
    );
    if (result.ok) this.#version = result.value.state.version;
    return result;
  }

  async ok(payload: BakeCommandPayload) {
    const result = await this.run(payload);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.value;
  }

  start(process: Process, equipment?: readonly EquipmentEntry[]) {
    return this.ok({
      type: 'StartBake',
      revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
      formula,
      process,
      mode: { kind: 'startAt', at: t('08:00') },
      ...(equipment === undefined ? {} : { equipment }),
    });
  }

  /** What a restart sees: the state read again from the stored log alone. */
  async reloaded(): Promise<BakeState> {
    const loaded = await loadBake(this.store, 'bake-1');
    if (!loaded.ok) throw new Error('unreadable');
    return loaded.value;
  }
}

const stone = builtInEquipment('baking-stone') as EquipmentEntry;
const dutch = builtInEquipment('dutch-oven-cast-iron') as EquipmentEntry;
const skillet = builtInEquipment('cast-iron-skillet') as EquipmentEntry;
const sheet = builtInEquipment('aluminium-sheet') as EquipmentEntry;
const pot = builtInEquipment('pot') as EquipmentEntry;
const ref = (entry: EquipmentEntry) => ({ id: entry.id, version: entry.version });
const vessel = (entry: EquipmentEntry, cover: 'open' | 'covered') => ({
  item: ref(entry),
  cover,
});

const dough: ProcessStep[] = [
  { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 },
  { id: 'proof', operation: 'proof', dependsOn: ['mix'], schedule: 'asap', plannedDurationS: H },
];
const cooking = (...steps: ProcessStep[]): Process => ({ steps: [...dough, ...steps] });

describe.each(makers)('equipment in a bake session on %s', (_name, makeStore) => {
  const session = async () => new Session(await makeStore());

  const dutchStage = (
    id: string,
    dependsOn: string[],
    setpointC: number,
    cover: 'open' | 'covered',
  ): ProcessStep => ({
    id,
    operation: 'bake',
    dependsOn,
    schedule: 'asap',
    plannedDurationS: 1200,
    equipment: { appliance: 'oven', mode: 'still', setpointC, vessel: vessel(dutch, cover) },
  });

  it('runs a Dutch oven loaf: preheat beside the proof, two stages, one vessel reference', async () => {
    const process = cooking(
      {
        id: 'preheat',
        operation: 'preheat',
        dependsOn: [],
        schedule: 'alap',
        plannedDurationS: 45 * 60,
        equipment: {
          appliance: 'oven',
          mode: 'still',
          setpointC: 250,
          vessel: vessel(dutch, 'open'),
          preheated: { vessel: 'cold' },
        },
      },
      dutchStage('covered', ['proof', 'preheat'], 250, 'covered'),
      dutchStage('open', ['covered'], 230, 'open'),
    );
    const s = await session();
    const { state } = await s.start(process, [dutch]);
    expect(state.snapshot?.equipment).toEqual([dutch]);
    expect(processEquipmentRefs(process)).toEqual([ref(dutch)]);
    const again = await s.reloaded();
    expect(again.process?.steps.filter((x) => x.operation === 'bake')).toHaveLength(2);
    expect(again.equipment).toEqual([dutch]);
  });

  it('records a cold start as one step without a preheat step', async () => {
    const process = cooking({
      id: 'bake',
      operation: 'bake',
      dependsOn: ['proof'],
      schedule: 'asap',
      plannedDurationS: 50 * 60,
      equipment: {
        appliance: 'oven',
        mode: 'still',
        setpointC: 240,
        vessel: vessel(dutch, 'covered'),
        preheated: { appliance: 'cold', vessel: 'cold' },
      },
    });
    const s = await session();
    await s.start(process, [dutch]);
    const state = await s.reloaded();
    expect(state.process?.steps.some((x) => x.operation === 'preheat')).toBe(false);
    expect(state.process?.steps.at(-1)?.equipment?.preheated).toEqual({
      appliance: 'cold',
      vessel: 'cold',
    });
  });

  it('runs a skillet pizza: stovetop by level, then a broil by level only, same skillet ref', async () => {
    const process = cooking(
      {
        id: 'pan',
        operation: 'panCook',
        dependsOn: ['proof'],
        schedule: 'asap',
        plannedDurationS: 240,
        equipment: {
          appliance: 'stovetop',
          level: { value: 7, of: 10 },
          vessel: vessel(skillet, 'open'),
        },
      },
      {
        id: 'broil',
        operation: 'bake',
        dependsOn: ['pan'],
        schedule: 'asap',
        plannedDurationS: 180,
        equipment: {
          appliance: 'oven',
          mode: 'broil',
          level: { value: 3, of: 5 },
          vessel: vessel(skillet, 'open'),
        },
      },
    );
    const s = await session();
    await s.start(process, [skillet]);
    const state = await s.reloaded();
    const steps = state.process?.steps ?? [];
    const broil = steps.find((x) => x.id === 'broil')?.equipment;
    expect(broil?.setpointC).toBeUndefined();
    expect(broil?.vessel?.item).toEqual(steps.find((x) => x.id === 'pan')?.equipment?.vessel?.item);
    expect(state.equipment).toEqual([skillet]);
    expect(intendedOutcome(state.process as Process)).toEqual({ result: 'cooked' });
  });

  it('does not count an oven Proof as a cooking stage', async () => {
    const process = cooking({
      id: 'ovenproof',
      operation: 'proof',
      dependsOn: ['proof'],
      schedule: 'asap',
      plannedDurationS: H,
      equipment: { appliance: 'oven', mode: 'proof', setpointC: 35 },
    });
    const s = await session();
    const { state } = await s.start(process);
    expect(state.snapshot?.equipment).toBeUndefined();
    expect(intendedOutcome(state.process as Process)).toEqual({ result: 'dough' });
  });

  it('copies a boil in a pot and a fan bake on a sheet', async () => {
    const process = cooking(
      {
        id: 'boil',
        operation: 'boil',
        dependsOn: ['proof'],
        schedule: 'asap',
        plannedDurationS: 120,
        equipment: { appliance: 'stovetop', vessel: vessel(pot, 'open') },
      },
      {
        id: 'bake',
        operation: 'bake',
        dependsOn: ['boil'],
        schedule: 'asap',
        plannedDurationS: 1200,
        equipment: {
          appliance: 'oven',
          mode: 'fan',
          setpointC: 220,
          support: { item: ref(sheet) },
        },
      },
    );
    const s = await session();
    const { state } = await s.start(process, [pot, sheet]);
    expect(state.equipment?.map((e) => e.id)).toEqual(['pot', 'aluminium-sheet']);
  });

  it('refuses references that do not resolve, wrong kinds, unused or invalid copies', async () => {
    const bake = (equipment: StepEquipment): Process =>
      cooking({
        id: 'bake',
        operation: 'bake',
        dependsOn: ['proof'],
        schedule: 'asap',
        plannedDurationS: 600,
        equipment,
      });
    const code = async (process: Process, equipment?: readonly EquipmentEntry[]) => {
      const result = await (
        await session()
      ).run({
        type: 'StartBake',
        revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
        formula,
        process,
        mode: { kind: 'startAt', at: t('08:00') },
        ...(equipment === undefined ? {} : { equipment }),
      });
      return result.ok ? 'ok' : result.error.code;
    };
    const withVessel = bake({ vessel: vessel(dutch, 'open') });
    expect(await code(withVessel)).toBe('InvalidCommand');
    expect(await code(withVessel, [])).toBe('InvalidCommand');
    expect(await code(withVessel, [stone])).toBe('InvalidCommand');
    expect(await code(withVessel, [dutch, stone])).toBe('InvalidCommand');
    expect(await code(withVessel, [dutch, dutch])).toBe('InvalidCommand');
    expect(await code(withVessel, [{ ...dutch, version: 7 }])).toBe('InvalidCommand');
    expect(await code(withVessel, [{ ...dutch, name: 'Mine' }])).toBe('InvalidCommand');
    // A built-in copy claiming a code definition must equal it.
    expect(await code(withVessel, [{ ...dutch, material: 'glass' }])).toBe('InvalidCommand');
    expect(await code(withVessel, [dutch])).toBe('ok');
    // A support used as a vessel resolves to the wrong kind.
    expect(await code(bake({ vessel: vessel(stone, 'open') }), [stone])).toBe('InvalidCommand');
    // Settings that break the rules are refused with a path.
    expect(await code(bake({ mode: 'fan' }))).toBe('InvalidProcess');
  });

  it('records a deviation: the plan stays in the snapshot, the effective process shows 220', async () => {
    const process = cooking(
      dutchStage('covered', ['proof'], 250, 'covered'),
      dutchStage('open', ['covered'], 230, 'open'),
    );
    const s = await session();
    await s.start(process, [dutch]);
    const used: StepEquipment = {
      appliance: 'oven',
      mode: 'still',
      setpointC: 220,
      vessel: vessel(dutch, 'open'),
      support: { item: ref(stone) },
    };
    const adjust = (value: StepEquipment, equipment?: EquipmentEntry[], reason?: string) =>
      s.run({
        type: 'AdjustStep',
        stepId: 'open',
        adjustment: { field: 'equipment', value },
        ...(equipment === undefined ? {} : { equipment }),
        ...(reason === undefined ? {} : { reason }),
      });
    // The new support is referenced without its copy: refused, nothing recorded.
    expect(await adjust(used)).toMatchObject({ ok: false, error: { code: 'InvalidCommand' } });
    // Invalid settings and an unused copy are refused too.
    expect(await adjust({ mode: 'fan' }, [])).toMatchObject({
      ok: false,
      error: { code: 'InvalidCommand' },
    });
    expect(await adjust({ appliance: 'oven' }, [stone])).toMatchObject({
      ok: false,
      error: { code: 'InvalidCommand' },
    });
    // A built-in copy that differs from its code definition is refused.
    expect(await adjust(used, [{ ...stone, material: 'glass' }])).toMatchObject({
      ok: false,
      error: { code: 'InvalidCommand' },
    });
    const done = await adjust(used, [stone], 'oven runs hot');
    if (!done.ok) throw new Error(JSON.stringify(done.error));
    expect(done.value.events.map((e) => e.payload)).toEqual([
      {
        type: 'OverrideApplied',
        target: { kind: 'step', stepId: 'open', field: 'equipment' },
        baseline: process.steps.at(-1)?.equipment,
        effective: used,
        reason: 'oven runs hot',
        equipment: [stone],
      },
    ]);
    const state = await s.reloaded();
    expect(state.snapshot?.process.steps.at(-1)?.equipment?.setpointC).toBe(230);
    expect(state.process?.steps.at(-1)?.equipment).toEqual(used);
    expect(state.equipment?.map((e) => e.id)).toEqual(['dutch-oven-cast-iron', 'baking-stone']);
    // A copy already in the bake is not copied again.
    const second = await adjust({ ...used, setpointC: 215 }, [stone]);
    if (!second.ok) throw new Error(JSON.stringify(second.error));
    expect(second.value.events[0]?.payload).not.toHaveProperty('equipment');
    // A completed step is not adjustable.
    await s.at(t('08:30')).ok({ type: 'CompleteStep', stepId: 'mix' });
    await s.at(t('09:00')).ok({ type: 'CompleteStep', stepId: 'proof' });
    await s.at(t('09:30')).ok({ type: 'CompleteStep', stepId: 'covered' });
    await s.at(t('10:00')).ok({ type: 'CompleteStep', stepId: 'open' });
    expect(await adjust({})).toMatchObject({ ok: false, error: { code: 'StepAlreadyCompleted' } });
  });

  it('keeps the entry version a bake used when the entry is edited afterwards', async () => {
    const mine1: EquipmentEntry = {
      id: 'my-sheet',
      version: 1,
      kind: 'support',
      name: 'My sheet',
      builtIn: false,
      shape: 'sheet',
      material: 'aluminium',
      archived: false,
      createdAt: t('07:00'),
    };
    const process = cooking({
      id: 'bake',
      operation: 'bake',
      dependsOn: ['proof'],
      schedule: 'asap',
      plannedDurationS: 600,
      equipment: {
        appliance: 'oven',
        mode: 'still',
        setpointC: 240,
        support: { item: { id: 'my-sheet', version: 1 } },
      },
    });
    const s = await session();
    await s.start(process, [mine1]);
    // Edited after the bake started: version 2 is a new entry version, used by a later step.
    const mine2: EquipmentEntry = { ...mine1, version: 2, notes: 'warped', createdAt: t('09:00') };
    await s.at(t('09:00')).ok({
      type: 'InsertStepAfter',
      after: 'bake',
      step: {
        id: 'rest',
        operation: 'cool',
        schedule: 'asap',
        plannedDurationS: 600,
        equipment: { support: { item: { id: 'my-sheet', version: 2 } } },
      },
      equipment: [mine2],
    });
    const state = await s.reloaded();
    expect(state.snapshot?.equipment).toEqual([mine1]);
    expect(state.equipment).toEqual([mine1, mine2]);
    expect(
      state.process?.steps.find((x) => x.id === 'bake')?.equipment?.support?.item.version,
    ).toBe(1);
  });

  it('refuses an inserted step whose built-in copy differs from the code definition', async () => {
    const s = await session();
    await s.start(cooking());
    const insert = (equipment: EquipmentEntry[]) =>
      s.run({
        type: 'InsertStepAfter',
        after: 'proof',
        step: {
          id: 'rest',
          operation: 'cool',
          schedule: 'asap',
          plannedDurationS: 600,
          equipment: { support: { item: ref(stone) } },
        },
        equipment,
      });
    expect(await insert([{ ...stone, material: 'glass' }])).toMatchObject({
      ok: false,
      error: { code: 'InvalidCommand' },
    });
    expect((await insert([stone])).ok).toBe(true);
  });
});
