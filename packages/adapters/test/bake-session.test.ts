import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  executeBakeCommand,
  loadBake,
  type BakeDependencies,
  type BakeEventStore,
} from '@flourprint/core/application';
import {
  replayBake,
  type BakeCommand,
  type BakeCommandPayload,
  type BakeEvent,
  type Formula,
  type Instant,
  type Process,
} from '@flourprint/core/domain';
import { MemoryBakeEventStore } from '../src/memory/index.js';
import { openNodeSqlite, SqlBakeEventStore } from '../src/sqlite-node/index.js';

const stores: Array<[string, () => BakeEventStore]> = [
  ['memory', () => new MemoryBakeEventStore()],
  [
    'sqlite-node',
    () => {
      // A lazily opened SQLite store: the Session class builds its store synchronously.
      const opening = openNodeSqlite(':memory:').then((db) => {
        if (!db.ok) throw new Error(JSON.stringify(db.error));
        return new SqlBakeEventStore(db.value.driver);
      });
      return {
        findCommand: async (id) => (await opening).findCommand(id),
        loadEvents: async (id) => (await opening).loadEvents(id),
        append: async (input) => (await opening).append(input),
        listBakes: async () => (await opening).listBakes(),
      } satisfies BakeEventStore;
    },
  ],
];
let makeStore: () => BakeEventStore = () => new MemoryBakeEventStore();

/** End-to-end session tests through the application use case and the memory store. */
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
const process_: Process = {
  steps: [
    {
      id: 'poolish',
      operation: 'preferment',
      dependsOn: [],
      schedule: 'asap',
      plannedDurationS: 12 * H,
    },
    { id: 'tangzhong', operation: 'scald', dependsOn: [], schedule: 'alap', plannedDurationS: H },
    {
      id: 'mix',
      operation: 'mix',
      dependsOn: ['poolish', 'tangzhong'],
      schedule: 'asap',
      plannedDurationS: 0.25 * H,
    },
    {
      id: 'bulk',
      operation: 'bulk',
      dependsOn: ['mix'],
      schedule: 'asap',
      plannedDurationS: 3 * H,
    },
    {
      id: 'shape',
      operation: 'shape',
      dependsOn: ['bulk'],
      schedule: 'asap',
      plannedDurationS: 0.25 * H,
    },
    {
      id: 'proof',
      operation: 'proof',
      dependsOn: ['shape'],
      schedule: 'asap',
      plannedDurationS: 2 * H,
    },
  ],
};

const t = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;

class Session {
  readonly store = makeStore();
  #now = `2026-10-06T20:00:00.000Z` as Instant;
  #id = 0;
  #version = 0;
  readonly deps: BakeDependencies = {
    store: this.store,
    clock: { now: () => this.#now },
    ids: { next: () => `e${++this.#id}` },
  };

  at(time: Instant): this {
    this.#now = time;
    return this;
  }

  command(
    payload: BakeCommandPayload,
    commandId = `c${this.#id + 1000}`,
    expectedVersion = this.#version,
  ): BakeCommand {
    return { commandId, bakeId: 'bake-1', expectedVersion, issuedAt: this.#now, payload };
  }

  async run(payload: BakeCommandPayload) {
    const result = await executeBakeCommand(this.deps, this.command(payload, `c${++this.#id}`));
    if (result.ok) this.#version = result.value.state.version;
    return result;
  }

  async ok(payload: BakeCommandPayload) {
    const result = await this.run(payload);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    return result.value;
  }

  async start() {
    return this.ok({
      type: 'StartBake',
      revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
      formula,
      process: process_,
      mode: { kind: 'startAt', at: `2026-10-06T20:00:00.000Z` as Instant },
    });
  }
}

describe.each(stores)('bake session on %s', (_name, factory) => {
  beforeEach(() => {
    makeStore = factory;
  });

  it('starts with a snapshot of the resolved formula and plan', async () => {
    const session = new Session();
    const { state, events } = await session.start();
    expect(events.map((e) => e.payload.type)).toEqual(['BakeStarted']);
    expect(state.status).toBe('active');
    expect(state.snapshot?.resolvedFormula.doughWeight).toBeCloseTo(1774, 9);
    expect(state.snapshot?.initialProjection.steps.mix?.start).toBe(t('08:00'));
    expect(state.snapshot?.estimates.bulk).toMatchObject({ status: 'unsupported' });
  });

  it('completes a step with an implicit start at the end of its dependencies', async () => {
    const session = new Session();
    await session.start();
    await session.at(t('08:00')).ok({ type: 'CompleteStep', stepId: 'poolish' });
    await session.at(t('08:05')).ok({ type: 'CompleteStep', stepId: 'tangzhong' });
    const { state, events } = await session.at(t('08:30')).ok({
      type: 'CompleteStep',
      stepId: 'mix',
      measurements: [{ value: 24.5, unit: 'degC', observedAt: t('08:30'), method: 'measured' }],
    });
    expect(events.map((e) => [e.payload.type, e.occurredAt])).toEqual([
      ['StepStarted', t('08:05')],
      ['StepCompleted', t('08:30')],
    ]);
    expect(state.steps.mix?.measurements[0]?.value).toBe(24.5);
  });

  it('refuses a double completion and steps whose dependencies are pending', async () => {
    const session = new Session();
    await session.start();
    expect(await session.run({ type: 'StartStep', stepId: 'mix' })).toMatchObject({
      ok: false,
      error: { code: 'DependenciesNotCompleted', details: { pending: ['poolish', 'tangzhong'] } },
    });
    await session.at(t('08:00')).ok({ type: 'CompleteStep', stepId: 'poolish' });
    expect(await session.run({ type: 'CompleteStep', stepId: 'poolish' })).toMatchObject({
      ok: false,
      error: { code: 'StepAlreadyCompleted' },
    });
  });

  it('replays a lost-response retry without a second action, and rejects a reused id', async () => {
    const session = new Session();
    await session.start();
    const command = session
      .at(t('08:00'))
      .command({ type: 'CompleteStep', stepId: 'poolish' }, 'tap-1', 1);
    const first = await executeBakeCommand(session.deps, command);
    const retry = await executeBakeCommand(session.deps, command);
    expect(retry).toEqual(first);
    expect((await session.store.loadEvents('bake-1')).length).toBe(3);
    const reused = await executeBakeCommand(session.deps, {
      ...command,
      payload: { type: 'CompleteStep', stepId: 'tangzhong' },
    });
    expect(reused).toMatchObject({ ok: false, error: { code: 'CommandIdReused' } });
  });

  it('rejects a command based on a stale version', async () => {
    const session = new Session();
    await session.start();
    await session.at(t('08:00')).ok({ type: 'CompleteStep', stepId: 'poolish' });
    const stale = session.command({ type: 'AbandonBake' }, 'stale', 1);
    expect(await executeBakeCommand(session.deps, stale)).toMatchObject({
      ok: false,
      error: { code: 'VersionConflict', details: { currentVersion: 3 } },
    });
  });

  it('records overrides against the baseline and replans the live projection', async () => {
    const session = new Session();
    await session.start();
    await session.ok({ type: 'StartStep', stepId: 'poolish' });
    const { state } = await session.at(t('07:00')).ok({
      type: 'AdjustStep',
      stepId: 'bulk',
      adjustment: { field: 'plannedDurationS', value: 4 * H },
      reason: 'cold kitchen',
    });
    expect(state.overrides[0]?.payload).toMatchObject({
      baseline: 3 * H,
      effective: 4 * H,
      unit: 's',
    });
    expect(state.snapshot?.process.steps.find((s) => s.id === 'bulk')?.plannedDurationS).toBe(
      3 * H,
    );
    const { state: accepted } = await session.ok({ type: 'AcceptProjection' });
    expect(accepted.acceptedProjection?.steps.proof?.end).toBe(t('14:30'));
  });

  it('stores the engine result of a formula override so replay never recomputes it', async () => {
    const session = new Session();
    await session.start();
    const { state } = await session.ok({
      type: 'AdjustFormula',
      edit: { type: 'SetIngredientGrams', ingredient: 'water', grams: 780 },
    });
    const override = state.overrides[0]?.payload;
    expect(
      override && 'derived' in override ? override.derived.resolvedFormula.pureWaterPct : NaN,
    ).toBeCloseTo(78, 9);
    expect(state.resolvedFormula?.pureWaterPct).toBeCloseTo(78, 9);
    expect(state.snapshot?.resolvedFormula.pureWaterPct).toBeCloseTo(75, 9);

    // A tampered derived value shows that replay reads stored results instead of recomputing.
    const events = (await session.store.loadEvents('bake-1')).map((event): BakeEvent => {
      const payload = event.payload;
      if (payload.type !== 'OverrideApplied' || !('derived' in payload)) return event;
      return {
        ...event,
        payload: {
          ...payload,
          derived: {
            ...payload.derived,
            resolvedFormula: { ...payload.derived.resolvedFormula, pureWaterPct: 99 },
          },
        },
      };
    });
    expect(replayBake('bake-1', events).resolvedFormula?.pureWaterPct).toBe(99);
  });

  it('inserts a step mid-bake and rewires only steps not started', async () => {
    const session = new Session();
    await session.start();
    const { state } = await session.ok({
      type: 'InsertStepAfter',
      after: 'bulk',
      step: {
        id: 'retard',
        operation: 'retard',
        schedule: 'asap',
        plannedDurationS: 10 * H,
        conditions: { location: 'fridge', temperatureC: 4 },
      },
    });
    const steps = state.process?.steps ?? [];
    expect(steps.map((s) => s.id)).toEqual([
      'poolish',
      'tangzhong',
      'mix',
      'bulk',
      'retard',
      'shape',
      'proof',
    ]);
    expect(steps.find((s) => s.id === 'shape')?.dependsOn).toEqual(['retard']);
    expect(state.snapshot?.process.steps.length).toBe(6);
  });

  it('corrects and retracts recorded times while keeping the original events', async () => {
    const session = new Session();
    await session.start();
    const { events } = await session.at(t('08:10')).ok({ type: 'CompleteStep', stepId: 'poolish' });
    const completion = events.find((e) => e.payload.type === 'StepCompleted') as BakeEvent;
    const { state } = await session.ok({
      type: 'CorrectStepTime',
      targetEventId: completion.eventId,
      newOccurredAt: t('08:00'),
    });
    expect(state.steps.poolish?.endedAt).toBe(t('08:00'));
    const { state: retracted } = await session.ok({
      type: 'RetractCompletion',
      targetEventId: completion.eventId,
    });
    expect(retracted.steps.poolish?.endedAt).toBeUndefined();
    expect((await session.store.loadEvents('bake-1')).map((e) => e.payload.type)).toEqual([
      'BakeStarted',
      'StepStarted',
      'StepCompleted',
      'StepTimeCorrected',
      'StepCompletionRetracted',
    ]);
    expect(
      await session.run({
        type: 'CorrectStepTime',
        targetEventId: completion.eventId,
        newOccurredAt: t('08:20'),
      }),
    ).toMatchObject({
      ok: false,
      error: { code: 'InvalidCorrection' },
    });
  });

  it('resumes from the log after the app is closed, and ends without losing data', async () => {
    const session = new Session();
    await session.start();
    await session.at(t('08:00')).ok({ type: 'CompleteStep', stepId: 'poolish' });
    await session.ok({
      type: 'AddObservation',
      category: 'fermentation',
      text: 'domed, bubbly',
      rating: 4,
    });
    await session.at(t('16:00')).ok({ type: 'FinishBake' });

    const reopened = await loadBake(session.store, 'bake-1');
    expect(reopened.ok).toBe(true);
    if (!reopened.ok) return;
    expect(reopened.value.status).toBe('finished');
    expect(reopened.value.steps.poolish?.endedAt).toBe(t('08:00'));
    expect(reopened.value.observations[0]?.payload.text).toBe('domed, bubbly');
    expect(await session.run({ type: 'StartStep', stepId: 'mix' })).toMatchObject({
      ok: false,
      error: { code: 'BakeNotActive' },
    });
  });

  it('refuses events written by a newer schema', async () => {
    const session = new Session();
    await session.start();
    const store = new MemoryBakeEventStore();
    const [started] = await session.store.loadEvents('bake-1');
    await store.append({
      command: { commandId: 'x', bakeId: 'bake-1', content: '{}' },
      expectedVersion: 0,
      events: [{ ...(started as BakeEvent), schemaVersion: 2 }],
      summary: { bakeId: 'bake-1', status: 'active', version: 1, updatedAt: t('08:00') },
    });
    expect(await loadBake(store, 'bake-1')).toMatchObject({
      ok: false,
      error: { code: 'UnsupportedEventVersion' },
    });
  });
});
