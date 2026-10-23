import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { executeBakeCommand, type BakeEventStore } from '@flourprint/core/application';
import {
  liveProjection,
  type BakeCommandPayload,
  type Formula,
  type Instant,
  type Process,
} from '@flourprint/core/domain';
import { MemoryBakeEventStore } from '../src/memory/index.js';

/** Session effects of a beforeTarget step (bake-session.md, process.md examples 4, 11). */
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

// mix 08:00-08:10, proof 08:10-09:10, bake 09:10-09:50; preheat after mix, 30 min wanted.
const process: Process = {
  steps: [
    { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 },
    { id: 'proof', operation: 'proof', dependsOn: ['mix'], schedule: 'asap', plannedDurationS: H },
    {
      id: 'bake',
      operation: 'bake',
      dependsOn: ['proof'],
      schedule: 'asap',
      plannedDurationS: 2400,
    },
    {
      id: 'preheat',
      operation: 'preheat',
      dependsOn: ['mix'],
      schedule: 'beforeTarget',
      target: 'bake',
      requiredWarmupS: 1800,
    },
  ],
};

class Session {
  #now = t('07:00');
  #n = 0;
  #version = 0;
  readonly store: BakeEventStore = new MemoryBakeEventStore();

  at(time: Instant): this {
    this.#now = time;
    return this;
  }

  async run(payload: BakeCommandPayload) {
    const result = await executeBakeCommand(
      { store: this.store, clock: { now: () => this.#now }, ids: { next: () => `e${++this.#n}` } },
      {
        commandId: `c${++this.#n}`,
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
}

const started = async () => {
  const s = new Session();
  await s.ok({
    type: 'StartBake',
    revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
    formula,
    process,
    mode: { kind: 'startAt', at: t('08:00') },
  });
  return s;
};

describe('beforeTarget in a bake session', () => {
  it('records heating started, ready and the target start as three distinct facts', async () => {
    const s = await started();
    await s.at(t('08:00')).ok({ type: 'StartStep', stepId: 'mix' });
    await s.at(t('08:10')).ok({ type: 'CompleteStep', stepId: 'mix' });
    await s.at(t('08:40')).ok({ type: 'StartStep', stepId: 'preheat' });
    await s.at(t('09:10')).ok({ type: 'CompleteStep', stepId: 'preheat' });
    const state = (await s.at(t('09:10')).ok({ type: 'StartStep', stepId: 'proof' })).state;
    expect(state.steps.preheat).toMatchObject({ startedAt: t('08:40'), endedAt: t('09:10') });
  });

  it('a proof is never held for the oven: the bake does not wait for the preheat', async () => {
    const s = await started();
    await s.at(t('08:00')).ok({ type: 'StartStep', stepId: 'mix' });
    await s.at(t('08:10')).ok({ type: 'CompleteStep', stepId: 'mix' });
    await s.at(t('08:10')).ok({ type: 'StartStep', stepId: 'proof' });
    await s.at(t('09:10')).ok({ type: 'CompleteStep', stepId: 'proof' });
    // the bake starts with no heating recorded: accepted (the interface warns, no command refused).
    const state = (await s.at(t('09:10')).ok({ type: 'StartStep', stepId: 'bake' })).state;
    expect(state.steps.bake?.startedAt).toBe(t('09:10'));
    expect(state.steps.preheat?.startedAt).toBeUndefined();
  });

  it('a started preheat never completed does not block finishing', async () => {
    const s = await started();
    await s.at(t('08:00')).ok({ type: 'StartStep', stepId: 'mix' });
    await s.at(t('08:10')).ok({ type: 'CompleteStep', stepId: 'mix' });
    await s.at(t('08:40')).ok({ type: 'StartStep', stepId: 'preheat' });
    const finished = await s
      .at(t('09:00'))
      .run({ type: 'FinishBake', outcome: { result: 'dough' } });
    expect(finished.ok).toBe(true);
  });

  it('live projection: recorded start stays, the window follows the target', async () => {
    const s = await started();
    await s.at(t('08:00')).ok({ type: 'StartStep', stepId: 'mix' });
    await s.at(t('08:10')).ok({ type: 'CompleteStep', stepId: 'mix' });
    await s.at(t('08:10')).ok({ type: 'StartStep', stepId: 'proof' });
    const state = (await s.at(t('08:50')).ok({ type: 'StartStep', stepId: 'preheat' })).state;
    // proof ends 09:10 = bake start; preheat recorded 08:50 -> window 20 min < 30 min.
    const live = liveProjection(state, t('08:55'));
    expect(live?.ok && live.value.steps.preheat).toMatchObject({
      start: t('08:50'),
      warmup: { kind: 'insufficient', availableS: 1200, requiredS: 1800 },
    });
    // the initial projection stored at the start is unchanged by later facts.
    expect(state.snapshot?.initialProjection.steps.preheat?.start).toBe(t('08:40'));
  });

  it('refuses a duration adjustment and a step inserted after a preheat', async () => {
    const s = await started();
    const adjust = await s.run({
      type: 'AdjustStep',
      stepId: 'preheat',
      adjustment: { field: 'plannedDurationS', value: 600 },
    });
    expect(adjust.ok).toBe(false);
    const inserted = await s.run({
      type: 'InsertStepAfter',
      after: 'preheat',
      step: { id: 'extra', operation: 'rest', schedule: 'asap', plannedDurationS: 60 },
    });
    expect(inserted.ok).toBe(false);
  });
});
