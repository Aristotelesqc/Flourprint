import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { checkBakeLog } from '../src/application/backup-events.js';
import {
  adjustedDurationS,
  decide,
  evolve,
  initialBakeState,
  liveProjection,
  previousAction,
  visibleEvents,
  type BakeCommandPayload,
  type BakeEvent,
  type Formula,
  type Instant,
  type Process,
} from '../src/domain/index.js';

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
    { id: 'a', operation: 'preferment', dependsOn: [], schedule: 'asap', plannedDurationS: H },
    { id: 'b', operation: 'bulk', dependsOn: ['a'], schedule: 'asap', plannedDurationS: 2 * H },
    { id: 'c', operation: 'proof', dependsOn: ['b'], schedule: 'asap', plannedDurationS: H },
    { id: 'p', operation: 'rest', dependsOn: [], schedule: 'asap', plannedDurationS: 5 * H },
  ],
};
const t = (hhmm: string) => `2026-10-10T${hhmm}:00.000Z` as Instant;

/** A bake log built through decide/evolve with a controlled clock. */
class Log {
  events: BakeEvent[] = [];
  state = initialBakeState('b');
  now = t('08:00');
  run(payload: BakeCommandPayload) {
    const result = decide(this.state, payload, this.now);
    if (!result.ok) return result;
    for (const draft of result.value) {
      const seq = this.events.length + 1;
      const e: BakeEvent = {
        eventId: `e${seq}`,
        bakeId: 'b',
        seq,
        causationId: `c${seq}`,
        occurredAt: draft.occurredAt,
        recordedAt: this.now,
        schemaVersion: 1,
        payload: draft.payload,
      };
      this.events.push(e);
      this.state = evolve(this.state, e);
    }
    return result;
  }
  ok(payload: BakeCommandPayload) {
    const r = this.run(payload);
    if (!r.ok) throw new Error(JSON.stringify(r.error));
  }
  at(time: string) {
    this.now = t(time);
    return this;
  }
  end(stepId: string, now: string) {
    const p = liveProjection(this.state, t(now));
    if (!p?.ok) throw new Error('no projection');
    return p.value.steps[stepId]?.end;
  }
}

const started = () => {
  const log = new Log();
  log.ok({
    type: 'StartBake',
    revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
    formula,
    process: process_,
    mode: { kind: 'startAt', at: t('08:00') },
  });
  return log;
};

describe('step countdown hold', () => {
  it('freezes the remaining time while held and shifts dependents on release', () => {
    const log = started();
    log.at('08:00').ok({ type: 'StartStep', stepId: 'a' });
    log.ok({ type: 'StartStep', stepId: 'p' });
    log.at('08:20').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    // 40 min remained at the hold: the end moves with the clock.
    expect(log.end('a', '08:30')).toBe(t('09:10'));
    expect(log.end('a', '09:00')).toBe(t('09:40'));
    log.at('09:00').ok({ type: 'ReleaseStepCountdown', stepId: 'a' });
    expect(log.end('a', '09:30')).toBe(t('09:40'));
    expect(log.state.process?.steps[0]?.plannedDurationS).toBe(H); // planned is untouched
    expect(log.state.snapshot?.initialProjection.steps.a?.end).toBe(t('09:00'));
    const p = liveProjection(log.state, t('09:30'));
    if (!p?.ok) throw new Error('no projection');
    expect(p.value.steps.b?.start).toBe(t('09:40'));
    expect(p.value.steps.p?.end).toBe(t('13:00')); // a parallel branch is unaffected
  });

  it('composes with AdjustStep and holds repeated', () => {
    const log = started();
    log.at('08:00').ok({ type: 'StartStep', stepId: 'a' });
    log.at('08:10').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    log.at('08:20').ok({ type: 'ReleaseStepCountdown', stepId: 'a' });
    log.at('08:30').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    log.at('08:35').ok({ type: 'ReleaseStepCountdown', stepId: 'a' });
    log.ok({
      type: 'AdjustStep',
      stepId: 'a',
      adjustment: { field: 'plannedDurationS', value: H + 900 },
    });
    expect(log.end('a', '08:40')).toBe(t('09:30'));
  });

  it('refuses invalid holds', () => {
    const log = started();
    const code = (r: ReturnType<Log['run']>) => (r.ok ? 'ok' : r.error.code);
    expect(code(log.run({ type: 'HoldStepCountdown', stepId: 'a' }))).toBe('StepNotRunning');
    expect(code(log.run({ type: 'HoldStepCountdown', stepId: 'zz' }))).toBe('UnknownStep');
    log.at('08:00').ok({ type: 'StartStep', stepId: 'a' });
    expect(code(log.run({ type: 'ReleaseStepCountdown', stepId: 'a' }))).toBe('StepNotHeld');
    expect(code(log.at('07:59').run({ type: 'HoldStepCountdown', stepId: 'a' }))).toBe(
      'InvalidTime',
    );
    log.at('08:10').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    expect(code(log.run({ type: 'HoldStepCountdown', stepId: 'a' }))).toBe('StepAlreadyHeld');
    expect(code(log.at('08:05').run({ type: 'ReleaseStepCountdown', stepId: 'a' }))).toBe(
      'InvalidTime',
    );
    expect(code(log.at('08:05').run({ type: 'CompleteStep', stepId: 'a' }))).toBe('InvalidTime');
    log.at('08:30').ok({ type: 'CompleteStep', stepId: 'a' });
    expect(code(log.run({ type: 'HoldStepCountdown', stepId: 'a' }))).toBe('StepAlreadyCompleted');
  });

  it('closes the hold when the step is completed, actual times untouched', () => {
    const log = started();
    log.at('08:00').ok({ type: 'StartStep', stepId: 'a' });
    log.at('08:20').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    log.at('08:50').ok({ type: 'CompleteStep', stepId: 'a' });
    expect(log.events.slice(-2).map((e) => e.payload.type)).toEqual([
      'StepCountdownReleased',
      'StepCompleted',
    ]);
    expect(log.state.steps.a).toMatchObject({
      startedAt: t('08:00'),
      endedAt: t('08:50'),
      holds: [{ from: t('08:20'), to: t('08:50') }],
    });
    expect(() => checkBakeLog('b', log.events)).not.toThrow();
  });

  it('is validated in backups', () => {
    const log = started();
    log.at('08:00').ok({ type: 'StartStep', stepId: 'a' });
    log.at('08:20').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    log.at('08:30').ok({ type: 'ReleaseStepCountdown', stepId: 'a' });
    expect(() => checkBakeLog('b', log.events)).not.toThrow();
    const [first, start, hold, release] = log.events as [
      BakeEvent,
      BakeEvent,
      BakeEvent,
      BakeEvent,
    ];
    const bad = (events: BakeEvent[]) => () => checkBakeLog('b', events);
    expect(bad([first, hold])).toThrow(); // not running
    expect(bad([first, start, release])).toThrow(); // not held
    expect(bad([first, start, hold, hold])).toThrow(); // nested
    expect(bad([first, start, hold, { ...release, occurredAt: t('08:10') }])).toThrow();
    expect(bad([first, start, { ...hold, occurredAt: t('07:00') }])).toThrow();
    expect(
      bad([first, start, { ...hold, payload: { type: 'StepCountdownHeld', stepId: 'zz' } }]),
    ).toThrow();
  });
});

describe('adjustedDurationS', () => {
  it('never goes below zero, and AdjustStep accepts zero on a running step', () => {
    expect(adjustedDurationS(600, -900)).toBe(0);
    expect(adjustedDurationS(3600, -900)).toBe(2700);
    expect(adjustedDurationS(3600, 900)).toBe(4500);
    const log = started();
    log.at('08:00').ok({ type: 'StartStep', stepId: 'a' });
    log.ok({
      type: 'AdjustStep',
      stepId: 'a',
      adjustment: { field: 'plannedDurationS', value: 0 },
    });
    expect(
      log.run({
        type: 'AdjustStep',
        stepId: 'a',
        adjustment: { field: 'plannedDurationS', value: -1 },
      }).ok,
    ).toBe(false);
    expect(log.end('a', '08:30')).toBe(t('08:00'));
  });
});

describe('previous action and visible timeline', () => {
  it('retracts when nothing followed, is blocked once a dependent started', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'a' });
    const action = previousAction(log.state, 'a');
    expect(action).toEqual({ kind: 'retract', targetEventId: log.state.steps.a?.endEventId });
    expect(previousAction(log.state, 'b')).toMatchObject({
      kind: 'blocked',
      reason: 'notCompleted',
    });
    log.at('08:10').ok({ type: 'StartStep', stepId: 'b' });
    expect(previousAction(log.state, 'a')).toEqual({
      kind: 'blocked',
      reason: 'dependentStarted',
      dependents: ['b'],
    });
    expect(
      log.run({ type: 'RetractCompletion', targetEventId: log.state.steps.a?.endEventId as string })
        .ok,
    ).toBe(false);
  });

  it('hides a retracted completion and its retraction, keeps them in the log', () => {
    const log = started();
    log.at('08:00').ok({ type: 'CompleteStep', stepId: 'a' });
    const completion = log.state.steps.a?.endEventId as string;
    log.at('08:05').ok({ type: 'RetractCompletion', targetEventId: completion });
    log.at('08:30').ok({ type: 'CompleteStep', stepId: 'a' });
    const types = visibleEvents(log.events).map((e) => `${e.seq}:${e.payload.type}`);
    expect(types).toEqual(['1:BakeStarted', '2:StepStarted', '5:StepCompleted']);
    expect(log.events.map((e) => e.payload.type)).toContain('StepCompletionRetracted');
  });
});
