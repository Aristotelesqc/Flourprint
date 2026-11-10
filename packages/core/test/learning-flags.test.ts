import { describe, expect, it } from 'vitest';
import {
  estimateFermentation,
  validateFormula,
  validateProcess,
  type Estimate,
  type Formula,
  type Process,
} from '../src/domain/index.js';
import { LEARNING_FLAGS, learningFlags } from '../src/domain/fermentation/estimate.js';

/**
 * Learning flags (docs/contracts/fermentation.md, Learning flags, 0.25.0). The worked examples of
 * the contract are the acceptance cases: lean dough, salt 2 %, water 65 %, a 10 min first-contact
 * mix at the room of the first fermentation step; the last step is the one whose duration the
 * estimate solves.
 */
const FLAGS = ['dough_above_28c', 'cold_stage_uncalibrated', 'cold_hold_over_72h'] as const;
const H = 3600;

const formula = (freshPct: number, components: Formula['components'] = []): Formula => ({
  flours: [{ id: 'flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 65, role: 'dough' },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: { status: 'known', valuePct: 0 },
      fat: { status: 'known', valuePct: 0 },
      sugar: { status: 'known', valuePct: 0 },
    },
    {
      id: 'yeast',
      kind: 'other',
      bakerPct: freshPct,
      role: 'dough',
      water: { status: 'known', valuePct: 0 },
      fat: { status: 'known', valuePct: 0 },
      sugar: { status: 'known', valuePct: 0 },
      yeast: { form: 'fresh' },
    },
  ],
  components,
  anchor: { kind: 'flourTotal', grams: 1000 },
});

interface Stage {
  readonly operation: string;
  readonly hours?: number; // undefined: the estimated (last) step
  readonly c: number;
}

/** mix 10 min at the first stage's room, the stages in order, then a bake. */
const process = (stages: readonly Stage[], before: Process['steps'] = []): Process => {
  const first = stages[0] as Stage;
  const ids = stages.map((s, i) => `${s.operation}${i}`);
  return {
    steps: [
      ...before,
      {
        id: 'mix',
        operation: 'mix',
        dependsOn: before.map((s) => s.id),
        schedule: 'asap',
        plannedDurationS: 600,
        conditions: { temperatureC: first.c },
      },
      ...stages.map((s, i) => ({
        id: ids[i] as string,
        operation: s.operation,
        dependsOn: [i === 0 ? 'mix' : (ids[i - 1] as string)],
        schedule: 'asap' as const,
        ...(s.hours === undefined ? {} : { plannedDurationS: s.hours * H }),
        conditions: { temperatureC: s.c },
      })),
      {
        id: 'bake',
        operation: 'bake',
        dependsOn: [ids.at(-1) as string],
        schedule: 'asap',
        plannedDurationS: 2400,
        conditions: { temperatureC: 250 },
      },
    ],
  };
};

const flagsOf = (e: Estimate): string[] =>
  e.status === 'ok'
    ? (e.extrapolations ?? []).filter((x) => (FLAGS as readonly string[]).includes(x))
    : [];

const dough = (f: Formula, p: Process) => {
  expect(validateFormula(f).ok).toBe(true);
  expect(validateProcess(p).ok).toBe(true);
  return estimateFermentation(f, p).dough;
};

const durationH = (e: Estimate) => (e.status === 'ok' ? e.value / H : NaN);

describe('learning flags: the contract worked examples', () => {
  it('1. 30 °C bulk and proof: dough_above_28c', () => {
    const d = dough(
      formula(1),
      process([
        { operation: 'bulk', hours: 2, c: 30 },
        { operation: 'proof', c: 30 },
      ]),
    );
    expect(d.duration.status).toBe('ok');
    expect(flagsOf(d.duration)).toEqual(['dough_above_28c']);
  });

  it('2. 28 °C is not above 28 °C: no learning flag', () => {
    const d = dough(
      formula(1),
      process([
        { operation: 'bulk', hours: 2, c: 28 },
        { operation: 'proof', c: 28 },
      ]),
    );
    expect(d.duration.status).toBe('ok');
    expect(flagsOf(d.duration)).toEqual([]);
  });

  const retard = (hours: number, c = 4) =>
    process([
      { operation: 'bulk', hours: 1, c: 22 },
      { operation: 'retard', hours, c },
      { operation: 'proof', c: 22 },
    ]);

  it('3. a 48 h retard at 4 °C: cold_stage_uncalibrated only', () => {
    const d = dough(formula(0.3), retard(48));
    expect(d.duration.status).toBe('ok');
    expect(flagsOf(d.duration)).toEqual(['cold_stage_uncalibrated']);
  });

  it('4. a 96 h retard: both cold codes', () => {
    expect(flagsOf(dough(formula(0.3), retard(96)).duration)).toEqual([
      'cold_stage_uncalibrated',
      'cold_hold_over_72h',
    ]);
  });

  it('5. exactly 72 h does not flag the hold; 40 h at 4 °C and 32 h 1 min at 10 °C does', () => {
    expect(flagsOf(dough(formula(0.3), retard(72)).duration)).toEqual(['cold_stage_uncalibrated']);
    const split = process([
      { operation: 'bulk', hours: 1, c: 22 },
      { operation: 'retard', hours: 40, c: 4 },
      { operation: 'retard', hours: 32 + 1 / 60, c: 10 },
      { operation: 'proof', c: 22 },
    ]);
    expect(flagsOf(dough(formula(0.3), split).duration)).toEqual([
      'cold_stage_uncalibrated',
      'cold_hold_over_72h',
    ]);
  });

  it('6. a retard at 10.5 °C: no learning flag', () => {
    expect(flagsOf(dough(formula(0.3), retard(48, 10.5)).duration)).toEqual([]);
  });

  it('7. a cold proof after 70 h: the hold flag follows the solved proof duration', () => {
    const d = dough(
      formula(0.3),
      process([
        { operation: 'bulk', hours: 1, c: 22 },
        { operation: 'retard', hours: 70, c: 4 },
        { operation: 'proof', c: 8 },
      ]),
    );
    expect(d.duration.status).toBe('ok');
    const proof = durationH(d.duration);
    // The engine's own central duration decides (the contract gives no reference value): here the
    // proof takes more than 2 h, so the cold steps add up to more than 72 h.
    expect(proof).toBeGreaterThan(2);
    expect(flagsOf(d.duration)).toEqual(['cold_stage_uncalibrated', 'cold_hold_over_72h']);
  });

  it('8. a cold poolish flags its own estimate, not the dough', () => {
    const f = formula(0.3, [
      {
        id: 'poolish',
        kind: 'preferment',
        flourPct: 20,
        flourBlend: [{ flour: 'flour', sharePct: 100 }],
        hydrationPct: 100,
        allocations: [{ ingredient: 'yeast', bakerPct: 0.1 }],
      },
    ]);
    const p = process(
      [
        { operation: 'bulk', hours: 2, c: 24 },
        { operation: 'proof', c: 24 },
      ],
      [
        {
          id: 'poolish',
          operation: 'preferment',
          dependsOn: [],
          schedule: 'asap',
          conditions: { temperatureC: 4 },
        },
      ],
    );
    expect(validateFormula(f).ok).toBe(true);
    expect(validateProcess(p).ok).toBe(true);
    const result = estimateFermentation(f, p);
    const poolish = result.preferments.poolish?.duration as Estimate;
    expect(poolish.status).toBe('ok');
    expect(poolish.status === 'ok' && poolish.extrapolations).toContain('preferment');
    const solved = durationH(poolish);
    // The solved poolish duration decides the hold: here it stays under 72 h.
    expect(solved).toBeLessThanOrEqual(72);
    expect(flagsOf(poolish)).toEqual(['cold_stage_uncalibrated']);
    expect(result.dough.duration.status === 'ok' && result.dough.duration.extrapolations).toContain(
      'preferment',
    );
    expect(flagsOf(result.dough.duration)).toEqual([]);
  });
});

describe('learning flags: rules', () => {
  it('uses the contract thresholds', () => {
    expect(LEARNING_FLAGS).toEqual({ warmAboveC: 28, coldAtOrBelowC: 10, coldHoldOverH: 72 });
  });

  it('carries the same flags on every ok estimate of the mass, with unchanged values', () => {
    const planned = process([
      { operation: 'bulk', hours: 1, c: 22 },
      { operation: 'retard', hours: 96, c: 4 },
      { operation: 'proof', hours: 1, c: 22 },
    ]);
    const d = dough(formula(0.3), planned);
    for (const e of [d.duration, d.progressPct, ...Object.values(d.yeastPct)]) {
      expect(e.status).toBe('ok');
      expect(flagsOf(e)).toEqual(['cold_stage_uncalibrated', 'cold_hold_over_72h']);
    }
    for (const step of d.steps ?? []) expect(flagsOf(step.endProgressPct)).toHaveLength(2);
    // Same numbers as the warm twin: flags change only the reasons.
    const warm = dough(
      formula(0.3),
      process([
        { operation: 'bulk', hours: 1, c: 22 },
        { operation: 'retard', hours: 96, c: 10.5 },
        { operation: 'proof', hours: 1, c: 22 },
      ]),
    );
    expect(flagsOf(warm.duration)).toEqual([]);
  });

  it('counts the effective (inherited) ambient and ignores zero-duration steps', () => {
    const mass = (
      segments: { hours?: number; ambientC: number; resetC?: number }[],
      openIndex: number,
    ) => ({ startC: 22, segments, openIndex }) as Parameters<typeof learningFlags>[0];
    // A zero-duration cold step counts for no cold code.
    expect(learningFlags(mass([{ hours: 0, ambientC: 4 }, { ambientC: 22 }], 1), 1)).toEqual([]);
    // The open step counts with the hours given; exactly 72 h is not over 72 h.
    expect(learningFlags(mass([{ hours: 70, ambientC: 4 }, { ambientC: 4 }], 1), 2)).toEqual([
      'cold_stage_uncalibrated',
    ]);
    expect(learningFlags(mass([{ hours: 70, ambientC: 4 }, { ambientC: 4 }], 1), 2.01)).toEqual([
      'cold_stage_uncalibrated',
      'cold_hold_over_72h',
    ]);
    // A measured dough temperature above 28 °C (a reset during a bake) flags warm.
    expect(
      learningFlags(mass([{ hours: 1, ambientC: 22, resetC: 29 }, { ambientC: 22 }], 1), 1),
    ).toEqual(['dough_above_28c']);
    // A warm start (the target dough temperature) flags warm.
    expect(learningFlags({ ...mass([{ ambientC: 22 }], 0), startC: 28.5 }, 1)).toEqual([
      'dough_above_28c',
    ]);
  });

  it('inherits the previous step ambient when a step has none', () => {
    const p = process([
      { operation: 'bulk', hours: 1, c: 22 },
      { operation: 'retard', hours: 80, c: 4 },
      { operation: 'proof', c: 22 },
    ]);
    // The retard's twin without its own temperature keeps the bulk's 22 °C: no cold code.
    const inherited: Process = {
      steps: p.steps.map((s) => (s.operation === 'retard' ? { ...s, conditions: {} } : s)),
    };
    expect(flagsOf(dough(formula(0.3), inherited).duration)).toEqual([]);
  });

  it('gives no flag where the estimate is out of domain', () => {
    const d = dough(
      formula(1),
      process([
        { operation: 'bulk', hours: 1, c: 36 },
        { operation: 'proof', c: 30 },
      ]),
    );
    expect(d.duration).toMatchObject({ status: 'out_of_domain' });
  });
});
