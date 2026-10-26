import { describe, expect, it } from 'vitest';
import { Refused } from '../src/application/decode.js';
import { decodeProcess } from '../src/application/documents.js';
import {
  checkRecipe,
  moveStep,
  preheatIssues,
  projectProcess,
  removeStepChecked,
  updateStep,
  validateProcess,
  type Formula,
  type Instant,
  type Process,
  type ProcessStep,
  type Projection,
} from '../src/domain/index.js';

/** Steps before a target (process.md, #106 slice B). Times are `h:mm` on 2026-10-07. */
const H = 3600;
const M = 60;
const at = (time: string) => `2026-10-07T${time}:00.000Z` as Instant;

const asap = (id: string, dependsOn: string[], seconds?: number, extra = {}): ProcessStep =>
  ({
    id,
    operation: id,
    dependsOn,
    schedule: 'asap',
    ...(seconds === undefined ? {} : { plannedDurationS: seconds }),
    ...extra,
  }) as ProcessStep;

const preheat = (extra: Partial<ProcessStep> = {}): ProcessStep => ({
  id: 'preheat',
  operation: 'preheat',
  dependsOn: ['shape'],
  schedule: 'beforeTarget',
  target: 'bake',
  requiredWarmupS: 30 * M,
  ...extra,
});

// Example 1 of the contract: shape ends at 0:00 + 1:00 = 1:00 (compact copy of +27:45).
// shape 00:00 -> 01:00, proof 01:00 -> 03:00, bake 03:00 -> 03:40.
const base = (pre: Partial<ProcessStep> = {}): Process => ({
  steps: [
    asap('shape', [], H),
    asap('proof', ['shape'], 2 * H),
    asap('bake', ['proof'], 40 * M),
    preheat(pre),
  ],
});

const run = (process: Process, input: Parameters<typeof projectProcess>[1]): Projection => {
  const result = projectProcess(process, input);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};
const start = { kind: 'startAt', at: at('00:00') } as const;

describe('projection of a beforeTarget step', () => {
  it('example 1: fromTarget starts max(earliest, targetStart - required), proof untouched', () => {
    // earliest 01:00; targetStart 03:00; 03:00 - 0:30 = 02:30 > 01:00 -> start 02:30, window 30 min.
    const p = run(base(), { mode: start });
    expect(p.steps.preheat).toMatchObject({
      status: 'planned',
      start: at('02:30'),
      end: at('03:00'),
      warmup: { kind: 'sufficient', availableS: 30 * M, requiredS: 30 * M },
    });
    expect(p.steps.proof).toMatchObject({ start: at('01:00'), end: at('03:00') });
    expect(p.steps.bake).toMatchObject({ start: at('03:00'), end: at('03:40') });
  });

  it('example 2: afterDependencies starts at the end of its dependencies', () => {
    // start 01:00, window 03:00 - 01:00 = 2 h >= 0:30.
    const p = run(base({ startRule: 'afterDependencies' }), { mode: start });
    expect(p.steps.preheat).toMatchObject({
      start: at('01:00'),
      warmup: { kind: 'sufficient', availableS: 2 * H, requiredS: 30 * M },
    });
  });

  it('example 3: too short, nothing moves', () => {
    // shape 0:00-0:00 (0 s); bulk 0:00-0:15; bake 0:15-0:55. start max(0:00, 0:15-0:30)=0:00, window 15 min.
    const process: Process = {
      steps: [
        asap('shape', [], 0),
        asap('bulk', ['shape'], 15 * M),
        asap('bake', ['bulk'], 40 * M),
        preheat(),
      ],
    };
    const p = run(process, { mode: start });
    expect(p.steps.preheat).toMatchObject({
      start: at('00:00'),
      warmup: { kind: 'insufficient', availableS: 15 * M, requiredS: 30 * M },
    });
    expect(p.steps.bulk).toMatchObject({ start: at('00:00'), end: at('00:15') });
    expect(p.steps.bake).toMatchObject({ start: at('00:15') });
    const without = run(
      { steps: process.steps.filter((s) => s.id !== 'preheat') },
      { mode: start },
    );
    expect(p.steps.bake).toEqual(without.steps.bake);
  });

  it('example 13: the start equals the target start, window 0, insufficient', () => {
    // preheat depends on proof (ends 03:00 = bake start): start 03:00, window 0 < 1800.
    const p = run(base({ dependsOn: ['proof'] }), { mode: start });
    expect(p.steps.preheat?.warmup).toEqual({
      kind: 'insufficient',
      availableS: 0,
      requiredS: 30 * M,
    });
  });

  it('example 14: starts after the target, unavailable, no negative window, no span', () => {
    // soak 6 h after mix; bake after a 4 h proof: earliest 06:00 > targetStart 04:00.
    const process: Process = {
      steps: [
        asap('mix', [], 0),
        asap('soak', ['mix'], 6 * H),
        asap('proof', ['mix'], 4 * H),
        asap('bake', ['proof'], 40 * M),
        preheat({ dependsOn: ['soak'] }),
      ],
    };
    const p = run(process, { mode: start });
    expect(p.steps.preheat?.warmup).toEqual({ kind: 'unavailable', reason: 'startsAfterTarget' });
    expect(p.steps.preheat?.end).toBeUndefined();
  });

  it('example 15: unknown target start gives unknown with its blockers', () => {
    // proof has no duration: bake start unknown (blocked by proof).
    const process: Process = {
      steps: [
        asap('shape', [], H),
        asap('proof', ['shape']),
        asap('bake', ['proof'], 40 * M),
        preheat(),
      ],
    };
    const p = run(process, { mode: start });
    expect(p.steps.preheat).toMatchObject({
      warmup: { kind: 'unknown', unknownAfter: ['proof'] },
      unknownAfter: ['proof'],
    });
    expect(p.steps.preheat?.start).toBeUndefined();
    // afterDependencies: start known (01:00), window unknown.
    const q = run(
      { steps: [...process.steps.slice(0, 3), preheat({ startRule: 'afterDependencies' })] },
      { mode: start },
    );
    expect(q.steps.preheat).toMatchObject({
      start: at('01:00'),
      warmup: { kind: 'unknown', unknownAfter: ['proof'] },
    });
  });

  it('no requirement is notApplicable', () => {
    const { requiredWarmupS: _drop, ...rest } = preheat({ startRule: 'afterDependencies' });
    const p = run({ steps: [...base().steps.slice(0, 3), rest] }, { mode: start });
    expect(p.steps.preheat?.warmup).toEqual({ kind: 'notApplicable' });
  });

  it('example 5: reprojection moves the trigger, a recorded start stays', () => {
    // proof extended by 20 min: 01:00 -> 03:20, bake 03:20; planned trigger 02:50.
    const longer: Process = {
      steps: base().steps.map((s) =>
        s.id === 'proof' ? { ...s, plannedDurationS: 2 * H + 20 * M } : s,
      ),
    };
    expect(run(longer, { mode: start }).steps.preheat?.start).toBe(at('02:50'));
    // Oven recorded on at 02:30: start stays, window 03:20 - 02:30 = 50 min.
    const p = run(longer, {
      mode: start,
      facts: {
        shape: { startedAt: at('00:00'), endedAt: at('01:00') },
        proof: { startedAt: at('01:00') }, // running: ends 01:00 + 2:20 = 03:20
        preheat: { startedAt: at('02:30') },
      },
      now: at('02:40'),
    });
    expect(p.steps.preheat).toMatchObject({
      status: 'inProgress',
      start: at('02:30'),
      warmup: { kind: 'sufficient', availableS: 50 * M, requiredS: 30 * M },
    });
  });

  it('example 16: overdue trigger starts now, never backdated; recorded start then stays', () => {
    // now 14:20, bake planned 14:45 (proof ends 14:45), required 30 min: due 14:15 < now.
    const process: Process = {
      steps: [
        asap('proof', [], 45 * M),
        asap('bake', ['proof'], 40 * M),
        preheat({ dependsOn: [] }),
      ],
    };
    const origin = at('14:00');
    const proofRunning = { proof: { startedAt: at('14:00') } }; // ends 14:45
    const planned = run(process, {
      mode: { kind: 'startAt', at: origin },
      facts: proofRunning,
      now: at('14:20'),
    });
    // window 14:45 - 14:20 = 25 min < 30 min
    expect(planned.steps.preheat).toMatchObject({
      start: at('14:20'),
      overdue: { dueAt: at('14:15') },
      warmup: { kind: 'insufficient', availableS: 25 * M, requiredS: 30 * M },
    });
    const started = run(process, {
      mode: { kind: 'startAt', at: origin },
      facts: { ...proofRunning, preheat: { startedAt: at('14:22') } },
      now: at('14:23'),
    });
    // recorded 14:22 -> window 14:45 - 14:22 = 23 min; no overdue.
    expect(started.steps.preheat).toMatchObject({
      start: at('14:22'),
      warmup: { kind: 'insufficient', availableS: 23 * M, requiredS: 30 * M },
    });
    expect(started.steps.preheat?.overdue).toBeUndefined();
  });

  it('example 17: target started before the heating, both records stay', () => {
    const p = run(base(), {
      mode: start,
      facts: {
        shape: { startedAt: at('00:00'), endedAt: at('01:00') },
        proof: { startedAt: at('01:00'), endedAt: at('03:00') },
        bake: { startedAt: at('03:00') },
        preheat: { startedAt: at('03:05') },
      },
      now: at('03:10'),
    });
    expect(p.steps.bake?.start).toBe(at('03:00'));
    expect(p.steps.preheat).toMatchObject({
      start: at('03:05'),
      warmup: { kind: 'unavailable', reason: 'startsAfterTarget' },
    });
  });

  it('example 4: readiness recorded keeps the recorded end, not inferred', () => {
    const p = run(base(), {
      mode: start,
      facts: {
        shape: { startedAt: at('00:00'), endedAt: at('01:00') },
        preheat: { startedAt: at('02:35'), endedAt: at('03:05') },
      },
      now: at('03:10'),
    });
    expect(p.steps.preheat).toMatchObject({ status: 'done', start: at('02:35'), end: at('03:05') });
  });

  it('readyBy places the target and derives the trigger from it', () => {
    // bake relative start 03:00; ready-by target bake end 18:40 -> origin 15:00, bake 18:00, preheat 17:30.
    const p = run(base(), { mode: { kind: 'readyBy', at: at('18:40'), target: 'bake' } });
    expect(p.steps.preheat?.start).toBe(at('17:30'));
  });

  it('legacy alap preheat keeps its hard meaning (example 9)', () => {
    // bulk 0:00-0:15; alap preheat 30 min ends at the bake start; bake waits: 0:30.
    const process: Process = {
      steps: [
        asap('bulk', [], 15 * M),
        {
          id: 'preheat',
          operation: 'preheat',
          dependsOn: [],
          schedule: 'alap',
          plannedDurationS: 30 * M,
        },
        asap('bake', ['bulk', 'preheat'], 40 * M),
      ],
    };
    const p = run(process, { mode: start });
    expect(p.steps.bake?.start).toBe(at('00:30'));
    expect(p.steps.preheat).toMatchObject({ start: at('00:00'), end: at('00:30') });
    expect(p.steps.preheat?.warmup).toBeUndefined();
  });
});

describe('a preheat depending on an alap step', () => {
  it('constrains nothing: other steps equal the process without it', () => {
    // scald alap 600 s; mix (900 s) depends on scald; bake (1200 s) after mix.
    // mix 00:10 -> 00:25 after the alap scald 00:00 -> 00:10; bake 00:25 -> 00:45.
    // preheat: earliest = scald end 00:10; trigger 00:25 - 0:30 < 00:10 -> start 00:10, window 15 min.
    const steps: ProcessStep[] = [
      { id: 'scald', operation: 'scald', dependsOn: [], schedule: 'alap', plannedDurationS: 600 },
      asap('mix', ['scald'], 900),
      asap('bake', ['mix'], 1200),
    ];
    const pre = preheat({ dependsOn: ['scald'] });
    const p = run({ steps: [...steps, pre] }, { mode: start });
    const without = run({ steps }, { mode: start });
    expect(p.steps.mix).toMatchObject({ start: at('00:10'), end: at('00:25') });
    expect(p.steps.bake).toMatchObject({ start: at('00:25'), end: at('00:45') });
    for (const id of ['scald', 'mix', 'bake']) expect(p.steps[id]).toEqual(without.steps[id]);
    expect(p.steps.preheat).toMatchObject({
      start: at('00:10'),
      warmup: { kind: 'insufficient', availableS: 15 * M, requiredS: 30 * M },
    });
  });
});

describe('validation of a beforeTarget step (example 8)', () => {
  const refused = (process: Process) => {
    const result = validateProcess(process);
    expect(result.ok).toBe(false);
    return result.ok ? undefined : result.error;
  };
  const withPre = (pre: Partial<ProcessStep>) => base(pre);

  it('accepts the contract shapes', () => {
    expect(validateProcess(base()).ok).toBe(true);
    expect(validateProcess(withPre({ startRule: 'afterDependencies' })).ok).toBe(true);
  });

  it('refuses each invalid form with InvalidProcess', () => {
    expect(refused(withPre({ operation: 'bulk' }))?.code).toBe('InvalidProcess');
    expect(refused(withPre({ plannedDurationS: 600 }))?.code).toBe('InvalidProcess');
    expect(refused(withPre({ durationMode: 'manual' }))?.code).toBe('InvalidProcess');
    expect(refused(withPre({ requiredWarmupS: -1 }))?.code).toBe('InvalidProcess');
    const { requiredWarmupS: _x, ...noWarmup } = preheat();
    expect(refused({ steps: [...base().steps.slice(0, 3), noWarmup] })?.code).toBe(
      'InvalidProcess',
    );
    const { target: _t, ...noTarget } = preheat();
    expect(refused({ steps: [...base().steps.slice(0, 3), noTarget] })?.code).toBe(
      'InvalidProcess',
    );
    expect(refused(withPre({ target: 'ghost' }))?.code).toBe('InvalidProcess');
    expect(refused(withPre({ target: 'proof' }))?.code).toBe('InvalidProcess'); // not a cooking step
    expect(refused(withPre({ startRule: 'later' as never }))?.code).toBe('InvalidProcess');
    // upstream target: the preheat depends on the bake
    expect(refused(withPre({ dependsOn: ['bake'] }))?.code).toBe('InvalidProcess');
  });

  it('refuses a step that depends on a beforeTarget step', () => {
    const process = base();
    const steps = [...process.steps.slice(0, 3), preheat(), asap('cool', ['preheat'], H)];
    expect(refused({ steps })?.code).toBe('InvalidProcess');
  });

  it('refuses the fields on any other schedule', () => {
    expect(refused({ steps: [asap('bake', [], H, { requiredWarmupS: 10 })] })?.code).toBe(
      'InvalidProcess',
    );
  });
});

describe('document boundary', () => {
  it('decodeProcess round-trips the new timing', () => {
    const process = base({ startRule: 'afterDependencies' });
    const wire = JSON.parse(JSON.stringify(process)) as unknown;
    expect(decodeProcess(wire, 'p')).toEqual(process);
  });

  it('decodeProcess refuses unsupported values with a structured Refused', () => {
    const bad = (patch: Record<string, unknown>) =>
      JSON.parse(JSON.stringify({ steps: [{ ...preheat(), ...patch }] })) as unknown;
    for (const patch of [
      { schedule: 'whenever' },
      { startRule: 'sometime' },
      { requiredWarmupS: 'soon' },
      { target: 7 },
      { surprise: true },
    ]) {
      expect(() => decodeProcess(bad(patch), 'p')).toThrow(Refused);
    }
  });
});

describe('edits', () => {
  it('refuses removing a target in use (example 10), allows after retargeting', () => {
    const refusal = removeStepChecked(base(), 'bake');
    expect(refusal.ok).toBe(false);
    if (!refusal.ok) {
      expect(refusal.error.code).toBe('TargetInUse');
      expect(refusal.error.details?.preheats).toEqual(['preheat']);
    }
    expect(removeStepChecked(base(), 'proof').ok).toBe(true);
    const retargeted = updateStep(base(), 'preheat', { target: 'bake2' });
    expect(retargeted.steps.find((s) => s.id === 'preheat')?.target).toBe('bake2');
  });

  it('example 14 of Move: order-only drag is allowed, above shape is scheduledFromTarget', () => {
    const process = base();
    const after = moveStep(process, 'preheat', 'proof');
    expect(after.ok && after.value.kind).toBe('orderOnly');
    if (after.ok) {
      const kept = after.value.process.steps.find((s) => s.id === 'preheat');
      expect(kept).toEqual(preheat());
    }
    const above = moveStep(process, 'preheat', null);
    expect(above.ok).toBe(false);
    if (!above.ok)
      expect(above.error).toMatchObject({
        code: 'AmbiguousMove',
        details: { reason: 'scheduledFromTarget' },
      });
  });
});

describe('checks', () => {
  const formula = { flours: [], ingredients: [], components: [] } as unknown as Formula;
  it('preheatIssues maps warmups to nonblocking codes and never reads absence as sufficient', () => {
    const short: Process = {
      steps: [
        asap('shape', [], 0),
        asap('bulk', ['shape'], 15 * M),
        asap('bake', ['bulk'], 40 * M),
        preheat(),
      ],
    };
    const issues = preheatIssues(short, run(short, { mode: start }));
    expect(issues).toEqual([
      {
        severity: 'warning',
        code: 'preheat_too_short',
        path: 'steps.preheat',
        details: { step: 'preheat' },
      },
    ]);
    expect(preheatIssues(base(), run(base(), { mode: start }))).toEqual([]);
  });

  it('flags a preheat and target naming different appliances', () => {
    const process: Process = {
      steps: base().steps.map((s) =>
        s.id === 'bake'
          ? { ...s, equipment: { appliance: 'skillet' } }
          : s.id === 'preheat'
            ? { ...s, equipment: { appliance: 'oven' } }
            : s,
      ) as ProcessStep[],
    };
    const codes = checkRecipe(formula, process).map((i) => i.code);
    expect(codes).toContain('preheat_target_mismatch');
  });
});
