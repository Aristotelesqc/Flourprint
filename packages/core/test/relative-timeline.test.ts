import { describe, expect, it } from 'vitest';
import {
  anchorTimeline,
  projectProcess,
  relativeTimeline,
  type Instant,
  type Process,
  type ProcessStep,
  type RelativeTimeline,
} from '../src/domain/index.js';

/*
 * Reference fixture of docs/contracts/process.md, "Relative timeline and groups", hand-computed
 * in seconds (h = 3600, min = 60); `+h:mm` from the first step. Assumptions, because the contract
 * gives durations and windows but not the graph: the tangzhong steps are `alap` (they must end
 * when the main dough starts: +23:30 is not an `asap` time), the preheat depends on `shape`, and
 * the bake on `proof`.
 *
 * Poolish: prepare 600 → +0:00..+0:10; counter 57600 → ..+16:10; fridge 28800 → ..+24:10
 *   (600 + 57600 + 28800 = 87000 s = 24:10). Window +0:00 → +24:10, elapsed 87000.
 * Main frasage starts at max(poolish end 87000, tangzhong end) = 87000.
 * Tangzhong alap: cool (1500) ends at 87000 → starts 85500 (+23:45); cook (900) ends at 85500
 *   → starts 84600 (+23:30). Window +23:30 → +24:10, elapsed 2400 (40 min).
 * Main dough: 87000 + frasage 600 + knead 600 + bulk 10800 + shape 900 + proof 7200 = 107100
 *   (+29:45). Shape ends 99900 (+27:45). Window +24:10 → +29:45, elapsed 20100 (5:35).
 * Preheat: max(shape end 99900, bake start 107100 − 1800 = 105300) = 105300 (+29:15).
 * Cooking: preheat 105300 → bake start 107100; bake 107100 + 2400 = 109500 (+30:25).
 *   Window +29:15 → +30:25, elapsed 4200 (1:10).
 * Total: 0 → 109500 (+30:25), elapsed 109500. Sum of group elapsed = 87000+2400+20100+4200
 *   = 113700 (31:35) ≠ 109500: groups overlap.
 * Cold phase 8 h → 6 h (28800 → 21600): everything after the fridge shifts by −7200 s.
 *   Poolish 600 + 57600 + 21600 = 79800 (+22:10); tangzhong 77400..79800 (+21:30 → +22:10);
 *   main dough 79800 → 99900 (+27:45); cooking 98100 (+27:15) → 102300 (+28:25);
 *   total 102300 = 28:25.
 */
const H = 3600;
const step = (
  id: string,
  operation: string,
  durationS: number | undefined,
  dependsOn: string[] = [],
  extra: Partial<ProcessStep> = {},
): ProcessStep => ({
  id,
  operation,
  dependsOn,
  schedule: 'asap',
  ...(durationS === undefined ? {} : { plannedDurationS: durationS }),
  ...extra,
});
const poolish = { subject: { kind: 'component', id: 'poolish' } } as const;
const tangz = { subject: { kind: 'component', id: 'tangzhong' } } as const;

const fixture = (
  opts: { fridgeS?: number | undefined; tangzhong?: boolean; fridgeKnown?: boolean } = {},
): Process => {
  const tz = opts.tangzhong ?? true;
  const fridge = 'fridgeS' in opts ? opts.fridgeS : 8 * H;
  return {
    steps: [
      step('poolish-prepare', 'frasage', 600, [], poolish),
      step('poolish-counter', 'preferment', 16 * H, ['poolish-prepare'], poolish),
      step('poolish-fridge', 'preferment', fridge, ['poolish-counter'], poolish),
      ...(tz
        ? [
            step('tangzhong-cook', 'scald', 900, [], { ...tangz, schedule: 'alap' }),
            step('tangzhong-cool', 'cool', 1500, ['tangzhong-cook'], {
              ...tangz,
              schedule: 'alap',
            }),
          ]
        : []),
      step('frasage', 'frasage', 600, ['poolish-fridge', ...(tz ? ['tangzhong-cool'] : [])], {
        incorporations: [
          { item: 'component', id: 'poolish', sharePct: 100 },
          ...(tz ? [{ item: 'component' as const, id: 'tangzhong', sharePct: 100 }] : []),
        ],
      }),
      step('knead', 'knead', 600, ['frasage']),
      step('bulk', 'bulk', 3 * H, ['knead']),
      step('shape', 'shape', 900, ['bulk']),
      step('proof', 'proof', 2 * H, ['shape']),
      step('preheat', 'preheat', undefined, ['shape'], {
        schedule: 'beforeTarget',
        target: 'bake',
        requiredWarmupS: 1800,
      }),
      step('bake', 'bake', 2400, ['proof']),
    ],
  };
};

const timeline = (p: Process): RelativeTimeline => {
  const r = relativeTimeline(p);
  if (!r.ok) throw new Error(JSON.stringify(r.error));
  return r.value;
};
const group = (t: RelativeTimeline, id: string) => t.groups.find((g) => g.id === id)?.window;

describe('relative timeline (process.md)', () => {
  it('reproduces the contract figures', () => {
    const t = timeline(fixture());
    expect(t.groups.map((g) => g.id)).toEqual([
      'component:poolish',
      'component:tangzhong',
      'mainDough',
      'cooking',
    ]);
    expect(group(t, 'component:poolish')).toEqual({
      status: 'complete',
      startS: 0,
      endS: 87000,
      elapsedS: 87000,
    });
    expect(group(t, 'component:tangzhong')).toEqual({
      status: 'complete',
      startS: 84600,
      endS: 87000,
      elapsedS: 2400,
    });
    expect(group(t, 'mainDough')).toEqual({
      status: 'complete',
      startS: 87000,
      endS: 107100,
      elapsedS: 20100,
    });
    expect(group(t, 'cooking')).toEqual({
      status: 'complete',
      startS: 105300,
      endS: 109500,
      elapsedS: 4200,
    });
    expect(t.total).toEqual({ status: 'complete', startS: 0, endS: 109500, elapsedS: 109500 });
    // Overlap is not summed.
    expect(87000 + 2400 + 20100 + 4200).toBeGreaterThan(109500);
    const pre = t.steps.find((s) => s.stepId === 'preheat');
    expect(pre?.durationS).toBeUndefined();
    expect(pre?.timing).toEqual({ status: 'known', startS: 105300, endS: 107100 });
    expect(pre?.warmup).toEqual({ kind: 'sufficient', availableS: 1800, requiredS: 1800 });
  });

  it('shrinks to 28:25 with a 6 h cold phase', () => {
    const t = timeline(fixture({ fridgeS: 6 * H }));
    expect(group(t, 'component:poolish')).toMatchObject({ startS: 0, endS: 79800 });
    expect(group(t, 'component:tangzhong')).toMatchObject({ startS: 77400, endS: 79800 });
    expect(group(t, 'mainDough')).toMatchObject({ startS: 79800, endS: 99900 });
    expect(group(t, 'cooking')).toMatchObject({ startS: 98100, endS: 102300 });
    expect(t.total).toMatchObject({ status: 'complete', endS: 102300, elapsedS: 102300 });
  });

  it('is unchanged by a concurrent branch (tangzhong removed)', () => {
    // Without the tangzhong the poolish still ends at 87000 and the rest is identical.
    expect(timeline(fixture({ tangzhong: false })).total).toEqual(timeline(fixture()).total);
  });

  it('never zero-fills an unknown duration: partial windows with reasons', () => {
    const t = timeline(fixture({ fridgeS: undefined }));
    expect(group(t, 'component:poolish')).toEqual({
      status: 'partial',
      reasons: ['poolish-fridge'],
    });
    // No member of these groups has a known timing: per the window rule they are `unknown`
    // (see the contract's implementation notes), never a number.
    for (const id of ['mainDough', 'cooking']) {
      expect(group(t, id)).toEqual({ status: 'unknown', reasons: ['poolish-fridge'] });
    }
    expect(t.total).toMatchObject({ status: 'partial', reasons: ['poolish-fridge'] });
    const fridge = t.steps.find((s) => s.stepId === 'poolish-fridge');
    expect(fridge?.durationS).toBeUndefined();
    expect(fridge?.timing).toEqual({ status: 'unknown', unknownAfter: ['poolish-fridge'] });
    expect(t.steps.find((s) => s.stepId === 'preheat')?.warmup?.kind).toBe('unknown');
  });

  it('reports a group with no known member as unknown', () => {
    const p: Process = { steps: [step('a', 'bulk', undefined), step('b', 'proof', 60, ['a'])] };
    expect(timeline(p).total).toEqual({ status: 'unknown', reasons: ['a'] });
  });

  it('draws no interval for an unavailable preheat and gives its group no envelope', () => {
    // soak (6 h) after mix; the bake starts 4 h after mix: the preheat starts after its target.
    const p: Process = {
      steps: [
        step('mix', 'mix', 0),
        step('soak', 'rest', 6 * H, ['mix']),
        step('proof', 'proof', 4 * H, ['mix']),
        step('preheat', 'preheat', undefined, ['soak'], {
          schedule: 'beforeTarget',
          target: 'bake',
          requiredWarmupS: 1800,
        }),
        step('bake', 'bake', 2400, ['proof']),
      ],
    };
    const t = timeline(p);
    const pre = t.steps.find((s) => s.stepId === 'preheat');
    expect(pre?.warmup).toEqual({ kind: 'unavailable', reason: 'startsAfterTarget' });
    expect(pre?.timing.status).toBe('unknown');
    // It affects only itself: no member of the cooking group nor of the total (bake 4 h → 4:40;
    // soak ends at 6 h = 21600 s, the latest end).
    expect(group(t, 'cooking')).toEqual({
      status: 'complete',
      startS: 14400,
      endS: 16800,
      elapsedS: 2400,
    });
    expect(t.total).toEqual({ status: 'complete', startS: 0, endS: 21600, elapsedS: 21600 });
  });

  it('puts steps downstream of a cooking step in the cooking group, once each', () => {
    const p: Process = {
      steps: [
        step('mix', 'mix', 60),
        step('bake', 'bake', 60, ['mix']),
        step('cool', 'cool', 60, ['bake']),
      ],
    };
    const t = timeline(p);
    expect(t.groups.map((g) => [g.id, g.stepIds])).toEqual([
      ['mainDough', ['mix']],
      ['cooking', ['bake', 'cool']],
    ]);
  });

  it('anchors the same model to a start or a ready-by time', () => {
    const p = fixture();
    const t = timeline(p);
    const start = '2026-01-03T06:00:00.000Z' as Instant; // any date: only the offset matters
    const a = anchorTimeline(t, { kind: 'startAt', at: start });
    if (!a.ok) throw new Error('anchor');
    // 06:00 + 30:25 = next day 12:25 + 1 day -> 2026-01-04T12:25
    expect(a.value.total).toEqual({
      status: 'complete',
      start,
      end: '2026-01-04T12:25:00.000Z',
      elapsedS: 109500,
    });
    // Same as projectProcess anchored at the same instant, step by step.
    const direct = projectProcess(p, { mode: { kind: 'startAt', at: start } });
    if (!direct.ok) throw new Error('project');
    for (const s of a.value.steps) {
      expect(s.start).toBe(direct.value.steps[s.stepId]?.start);
      expect(s.end).toBe(direct.value.steps[s.stepId]?.end);
    }
    // Ready by: the bake ends at the requested time.
    const ready = '2026-01-10T18:00:00.000Z' as Instant;
    const r = anchorTimeline(t, { kind: 'readyBy', at: ready, target: 'bake' });
    if (!r.ok) throw new Error('ready');
    expect(r.value.steps.find((s) => s.stepId === 'bake')?.end).toBe(ready);
    const directReady = projectProcess(p, { mode: { kind: 'readyBy', at: ready, target: 'bake' } });
    if (!directReady.ok) throw new Error('project');
    expect(r.value.steps.find((s) => s.stepId === 'poolish-prepare')?.start).toBe(
      directReady.value.steps['poolish-prepare']?.start,
    );
    // The relative model holds no date.
    expect(JSON.stringify(t)).not.toMatch(/\d{4}-\d{2}-\d{2}/);
  });

  it('refuses a ready-by with an unknown or unplannable target, structurally', () => {
    const t = timeline(fixture({ fridgeS: undefined }));
    const at = '2026-01-10T18:00:00.000Z' as Instant;
    const unknownTarget = anchorTimeline(t, { kind: 'readyBy', at, target: 'nope' });
    expect(!unknownTarget.ok && unknownTarget.error.code).toBe('UnknownReference');
    const blocked = anchorTimeline(t, { kind: 'readyBy', at, target: 'bake' });
    expect(!blocked.ok && blocked.error.code).toBe('IncompatibleConstraint');
  });

  it('returns the process validation error unchanged', () => {
    const r = relativeTimeline({ steps: [step('a', 'bulk', 1, ['ghost'])] });
    expect(r.ok).toBe(false);
  });
});
