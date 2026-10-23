import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  decide,
  evolve,
  implicitStartOf,
  initialBakeState,
  liveProjection,
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

const M = 60;
const process_: Process = {
  steps: [
    { id: 'a', operation: 'preferment', dependsOn: [], schedule: 'asap', plannedDurationS: 4 * M },
    { id: 'b', operation: 'bulk', dependsOn: ['a'], schedule: 'asap', plannedDurationS: 10 * M },
    { id: 'c', operation: 'proof', dependsOn: ['a'], schedule: 'asap', plannedDurationS: 20 * M },
    // As late as possible: ends where d starts.
    { id: 'l', operation: 'rest', dependsOn: [], schedule: 'alap', plannedDurationS: 2 * M },
    {
      id: 'd',
      operation: 'rest',
      dependsOn: ['b', 'c', 'l'],
      schedule: 'asap',
      plannedDurationS: 5 * M,
    },
    // Parallel branch without dependency.
    { id: 'p', operation: 'rest', dependsOn: [], schedule: 'asap', plannedDurationS: 30 * M },
  ],
};
const t = (hhmm: string) => `2026-10-10T${hhmm}:00.000Z` as Instant;

class Log {
  state = initialBakeState('b');
  n = 0;
  now = t('12:00');
  ok(payload: BakeCommandPayload) {
    const result = decide(this.state, payload, this.now);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    for (const draft of result.value) {
      const seq = ++this.n;
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
      this.state = evolve(this.state, e);
    }
    return this;
  }
  at(time: string) {
    this.now = t(time);
    return this;
  }
  span(stepId: string, now: string) {
    const p = liveProjection(this.state, t(now));
    if (!p?.ok) throw new Error('no projection');
    const step = p.value.steps[stepId];
    return [step?.start, step?.end, step?.implicit] as const;
  }
}

const started = () =>
  new Log().ok({
    type: 'StartBake',
    revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
    formula,
    process: process_,
    mode: { kind: 'startAt', at: t('12:00') },
  });

describe('implicitly running steps in the live projection', () => {
  it('shows the first step from the bake start, before and after the first real action', () => {
    const log = started();
    // No action: not clamped to now.
    expect(log.span('a', '12:02')).toEqual([t('12:00'), t('12:04'), true]);
    expect(implicitStartOf(log.state, 'a')).toBe(t('12:00'));
    // The first real action records StartStep at the implicit start: same interval, nothing jumps.
    log.at('12:02').ok({ type: 'StartStep', stepId: 'a', at: t('12:00') });
    expect(log.span('a', '12:02')).toEqual([t('12:00'), t('12:04'), undefined]);
    expect(implicitStartOf(log.state, 'a')).toBeUndefined();
  });

  it('accepts the projection without the implicit flag, keeping the interval', () => {
    const log = started().at('12:02');
    const result = decide(log.state, { type: 'AcceptProjection' }, log.now);
    if (!result.ok) throw new Error(JSON.stringify(result.error));
    const payload = result.value[0]?.payload;
    if (payload?.type !== 'ProjectionAccepted') throw new Error('unexpected event');
    const a = payload.projection.steps.a;
    expect(a).toMatchObject({ start: t('12:00'), end: t('12:04'), status: 'inProgress' });
    expect(JSON.stringify(payload)).not.toContain('implicit');
  });

  it('records nothing: the persisted facts are unchanged', () => {
    const log = started();
    const before = JSON.stringify(log.state.steps);
    log.span('a', '12:02');
    expect(JSON.stringify(log.state.steps)).toBe(before);
    expect(log.state.steps.a?.startedAt).toBeUndefined();
  });

  it('shows a successor from the end of its completed dependency, not from now', () => {
    const log = started().at('12:04').ok({ type: 'CompleteStep', stepId: 'a' });
    expect(log.span('b', '12:20')).toEqual([t('12:04'), t('12:14'), true]);
    expect(implicitStartOf(log.state, 'b')).toBe(t('12:04'));
  });

  it('runs parallel branches implicitly at the same time', () => {
    const log = started().at('12:04').ok({ type: 'CompleteStep', stepId: 'a' });
    expect(log.span('b', '12:05')).toEqual([t('12:04'), t('12:14'), true]);
    expect(log.span('c', '12:05')).toEqual([t('12:04'), t('12:24'), true]);
    // p has no dependency: implicit from the bake start.
    expect(log.span('p', '12:05')).toEqual([t('12:00'), t('12:30'), true]);
  });

  it('keeps a step with an unfinished dependency projected after it', () => {
    const log = started().at('12:04').ok({ type: 'CompleteStep', stepId: 'a' });
    log.at('12:10').ok({ type: 'CompleteStep', stepId: 'b' });
    // c still running implicitly until 12:24, so d waits for it.
    expect(log.span('d', '12:11')).toEqual([t('12:24'), t('12:29'), undefined]);
    expect(implicitStartOf(log.state, 'd')).toBeUndefined();
  });

  it('leaves alap steps unchanged (placed by the backward pass)', () => {
    const log = started();
    const [start, end, implicit] = log.span('l', '12:02');
    expect(implicit).toBeUndefined();
    // d starts after c ends (12:04 + 20 min), so l ends there and starts 2 min before.
    expect(end).toBe(t('12:24'));
    expect(start).toBe(t('12:22'));
    expect(implicitStartOf(log.state, 'l')).toBeUndefined();
  });

  it('leaves beforeTarget steps unchanged', () => {
    const proc: Process = {
      steps: [
        { id: 'a', operation: 'bake', dependsOn: [], schedule: 'asap', plannedDurationS: 60 * M },
        {
          id: 'h',
          operation: 'preheat',
          dependsOn: [],
          schedule: 'beforeTarget',
          target: 'a',
          requiredWarmupS: 10 * M,
        },
      ],
    } as Process;
    const log = new Log().ok({
      type: 'StartBake',
      revisions: { formula: { id: 'f', version: 1 }, process: { id: 'p', version: 1 } },
      formula,
      process: proc,
      mode: { kind: 'startAt', at: t('12:00') },
    });
    const [, , implicit] = log.span('h', '12:30');
    expect(implicit).toBeUndefined();
    expect(implicitStartOf(log.state, 'h')).toBeUndefined();
  });

  it('applies a hold after the first real action, from the recorded implicit start', () => {
    const log = started();
    // A hold needs a recorded start (decider rule kept).
    expect(decide(log.state, { type: 'HoldStepCountdown', stepId: 'a' }, t('12:01')).ok).toBe(
      false,
    );
    log.at('12:01').ok({ type: 'StartStep', stepId: 'a', at: t('12:00') });
    log.at('12:02').ok({ type: 'HoldStepCountdown', stepId: 'a' });
    // 2 min remained at the hold; the end follows the clock.
    expect(log.span('a', '12:05')).toEqual([t('12:00'), t('12:07'), undefined]);
  });
});
