import { describe, expect, it } from 'vitest';
import { checkBakeLog } from '../src/application/backup-events.js';
import {
  decide,
  evolve,
  initialBakeState,
  replayBake,
  sameWeighingRow,
  type BakeCommandPayload,
  type BakeEvent,
  type Formula,
  type Instant,
  type Process,
} from '../src/domain/index.js';

describe('weighing checks (bake-session.md, Weighing checks)', () => {
  const now = '2026-10-27T10:00:00.000Z' as Instant;

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
    components: [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: 20,
        hydrationPct: 100,
        flourBlend: [{ flour: 'bread', sharePct: 100 }],
      },
    ],
    anchor: { kind: 'flourTotal', grams: 500 },
  };

  const process: Process = {
    steps: [
      {
        id: 'mix',
        operation: 'mix',
        dependsOn: [],
        schedule: 'asap',
        plannedDurationS: 600,
      },
      {
        id: 'bake',
        operation: 'bake',
        dependsOn: ['mix'],
        schedule: 'asap',
        plannedDurationS: 1800,
      },
    ],
  };

  it('sameWeighingRow compares stage and item identities correctly', () => {
    const r1 = {
      stage: { kind: 'component' as const, id: 'poolish' },
      item: { kind: 'water' as const },
    };
    const r2 = {
      stage: { kind: 'component' as const, id: 'poolish' },
      item: { kind: 'water' as const },
    };
    const r3 = { stage: { kind: 'final' as const }, item: { kind: 'water' as const } };
    const r4 = {
      stage: { kind: 'component' as const, id: 'poolish' },
      item: { kind: 'ingredient' as const, id: 'bread' },
    };
    const r5 = {
      stage: { kind: 'component' as const, id: 'biga' },
      item: { kind: 'water' as const },
    };

    expect(sameWeighingRow(r1, r2)).toBe(true);
    expect(sameWeighingRow(r1, r3)).toBe(false);
    expect(sameWeighingRow(r1, r4)).toBe(false);
    expect(sameWeighingRow(r1, r5)).toBe(false);
  });

  it('records weighed in StartBake, evolves state, and replays', () => {
    const startCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
      weighed: [{ stage: { kind: 'component', id: 'poolish' }, item: { kind: 'water' } }],
    };

    const decided = decide(initialBakeState('b1'), startCmd, now);
    expect(decided.ok).toBe(true);
    if (!decided.ok) return;

    expect(decided.value).toHaveLength(1);
    const firstEvt = decided.value[0];
    if (!firstEvt) throw new Error('Expected at least one event');
    const startPayload = firstEvt.payload;
    expect(startPayload.type).toBe('BakeStarted');
    if (startPayload.type !== 'BakeStarted') return;
    expect(startPayload.weighed).toEqual([
      { stage: { kind: 'component', id: 'poolish' }, item: { kind: 'water' } },
    ]);

    const event1: BakeEvent = {
      eventId: 'e1',
      bakeId: 'b1',
      seq: 1,
      causationId: 'c1',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: startPayload,
    };

    const state = evolve(initialBakeState('b1'), event1);
    expect(state.weighed).toEqual([
      { stage: { kind: 'component', id: 'poolish' }, item: { kind: 'water' } },
    ]);

    const replayed = replayBake('b1', [event1]);
    expect(replayed.weighed).toEqual(state.weighed);
  });

  it('refuses an unknown row and a repeated row in StartBake', () => {
    const unknownRowCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
      weighed: [
        {
          stage: { kind: 'component', id: 'poolish' },
          item: { kind: 'ingredient', id: 'chocolate' },
        },
      ],
    };
    const resUnknown = decide(initialBakeState('b1'), unknownRowCmd, now);
    expect(resUnknown.ok).toBe(false);
    if (!resUnknown.ok) {
      expect(resUnknown.error.code).toBe('InvalidCommand');
    }

    const repeatRowCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
      weighed: [
        { stage: { kind: 'final' }, item: { kind: 'ingredient', id: 'salt' } },
        { stage: { kind: 'final' }, item: { kind: 'ingredient', id: 'salt' } },
      ],
    };
    const resRepeat = decide(initialBakeState('b1'), repeatRowCmd, now);
    expect(resRepeat.ok).toBe(false);
    if (!resRepeat.ok) {
      expect(resRepeat.error.code).toBe('InvalidCommand');
    }
  });

  it('refuses an unknown row in SetWeighingCheck', () => {
    const startCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
    };
    const startRes = decide(initialBakeState('b1'), startCmd, now);
    if (!startRes.ok) throw new Error('Start failed');
    const startEvt = startRes.value[0];
    if (!startEvt) throw new Error('Expected at least one event');
    const state = evolve(initialBakeState('b1'), {
      eventId: 'e1',
      bakeId: 'b1',
      seq: 1,
      causationId: 'c1',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: startEvt.payload,
    });

    const unknownCmd: BakeCommandPayload = {
      type: 'SetWeighingCheck',
      stage: { kind: 'final' },
      item: { kind: 'ingredient', id: 'chocolate' },
      checked: true,
    };
    const res = decide(state, unknownCmd, now);
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error.code).toBe('InvalidCommand');
    }
  });

  it('ticks and unticks with SetWeighingCheck, and ignores no-ops', () => {
    const startCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
      weighed: [{ stage: { kind: 'component', id: 'poolish' }, item: { kind: 'water' } }],
    };
    const startRes = decide(initialBakeState('b1'), startCmd, now);
    if (!startRes.ok) throw new Error('Start failed');
    const startEvt = startRes.value[0];
    if (!startEvt) throw new Error('Expected at least one event');
    let state = evolve(initialBakeState('b1'), {
      eventId: 'e1',
      bakeId: 'b1',
      seq: 1,
      causationId: 'c1',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: startEvt.payload,
    });

    // 1. Tick an unticked row (final salt)
    const tickCmd: BakeCommandPayload = {
      type: 'SetWeighingCheck',
      stage: { kind: 'final' },
      item: { kind: 'ingredient', id: 'salt' },
      checked: true,
    };
    const tickRes = decide(state, tickCmd, now);
    expect(tickRes.ok).toBe(true);
    if (!tickRes.ok) return;
    expect(tickRes.value).toHaveLength(1);
    expect(tickRes.value[0]?.payload).toEqual({
      type: 'WeighingCheckChanged',
      stage: { kind: 'final' },
      item: { kind: 'ingredient', id: 'salt' },
      checked: true,
    });

    const tickEvt = tickRes.value[0];
    if (!tickEvt) throw new Error('Expected at least one event');
    state = evolve(state, {
      eventId: 'e2',
      bakeId: 'b1',
      seq: 2,
      causationId: 'c2',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: tickEvt.payload,
    });
    expect(state.weighed).toHaveLength(2);

    // 2. No-op: tick already ticked row
    const noopTick = decide(state, tickCmd, now);
    expect(noopTick).toEqual({ ok: true, value: [] });

    // 3. Untick a ticked row (poolish water)
    const untickCmd: BakeCommandPayload = {
      type: 'SetWeighingCheck',
      stage: { kind: 'component', id: 'poolish' },
      item: { kind: 'water' },
      checked: false,
    };
    const untickRes = decide(state, untickCmd, now);
    expect(untickRes.ok).toBe(true);
    if (!untickRes.ok) return;
    expect(untickRes.value).toHaveLength(1);
    expect(untickRes.value[0]?.payload).toEqual({
      type: 'WeighingCheckChanged',
      stage: { kind: 'component', id: 'poolish' },
      item: { kind: 'water' },
      checked: false,
    });

    const untickEvt = untickRes.value[0];
    if (!untickEvt) throw new Error('Expected at least one event');
    state = evolve(state, {
      eventId: 'e3',
      bakeId: 'b1',
      seq: 3,
      causationId: 'c3',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: untickEvt.payload,
    });
    expect(state.weighed).toHaveLength(1);
    expect(state.weighed?.[0]?.item).toEqual({ kind: 'ingredient', id: 'salt' });

    // 4. No-op: untick already unticked row
    const noopUntick = decide(state, untickCmd, now);
    expect(noopUntick).toEqual({ ok: true, value: [] });
  });

  it('refuses SetWeighingCheck after FinishBake', () => {
    const startCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
    };
    const startRes = decide(initialBakeState('b1'), startCmd, now);
    if (!startRes.ok) throw new Error('Start failed');
    const startEvt = startRes.value[0];
    if (!startEvt) throw new Error('Expected at least one event');
    let state = evolve(initialBakeState('b1'), {
      eventId: 'e1',
      bakeId: 'b1',
      seq: 1,
      causationId: 'c1',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: startEvt.payload,
    });

    const finishCmd: BakeCommandPayload = {
      type: 'FinishBake',
      outcome: { result: 'cooked' },
    };
    const finishRes = decide(state, finishCmd, now);
    if (!finishRes.ok) throw new Error('Finish failed');
    const finishEvt = finishRes.value[0];
    if (!finishEvt) throw new Error('Expected at least one event');
    state = evolve(state, {
      eventId: 'e2',
      bakeId: 'b1',
      seq: 2,
      causationId: 'c2',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: finishEvt.payload,
    });
    expect(state.status).toBe('finished');

    const checkCmd: BakeCommandPayload = {
      type: 'SetWeighingCheck',
      stage: { kind: 'final' },
      item: { kind: 'water' },
      checked: true,
    };
    const checkRes = decide(state, checkCmd, now);
    expect(checkRes.ok).toBe(false);
    if (!checkRes.ok) {
      expect(checkRes.error.code).toBe('BakeNotActive');
    }
  });

  it('round trips through backup decoding and replay', () => {
    const startCmd: BakeCommandPayload = {
      type: 'StartBake',
      revisions: {
        formula: { id: 'f1', version: 1 },
        process: { id: 'p1', version: 1 },
      },
      formula,
      process,
      mode: { kind: 'startAt', at: now },
      weighed: [{ stage: { kind: 'component', id: 'poolish' }, item: { kind: 'water' } }],
    };
    const startRes = decide(initialBakeState('b1'), startCmd, now);
    if (!startRes.ok) throw new Error('Start failed');
    const startEvt = startRes.value[0];
    if (!startEvt) throw new Error('Expected at least one event');

    const event1: BakeEvent = {
      eventId: 'e1',
      bakeId: 'b1',
      seq: 1,
      causationId: 'c1',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: startEvt.payload,
    };

    const event2: BakeEvent = {
      eventId: 'e2',
      bakeId: 'b1',
      seq: 2,
      causationId: 'c2',
      occurredAt: now,
      recordedAt: now,
      schemaVersion: 1,
      payload: {
        type: 'WeighingCheckChanged',
        stage: { kind: 'final' },
        item: { kind: 'ingredient', id: 'salt' },
        checked: true,
      },
    };

    const events = [event1, event2];
    const restoredState = checkBakeLog('b1', events);
    const replayedState = replayBake('b1', events);

    expect(restoredState.weighed).toEqual(replayedState.weighed);
    expect(restoredState.weighed).toHaveLength(2);
    expect(restoredState.weighed).toEqual([
      { stage: { kind: 'component', id: 'poolish' }, item: { kind: 'water' } },
      { stage: { kind: 'final' }, item: { kind: 'ingredient', id: 'salt' } },
    ]);
  });
});
