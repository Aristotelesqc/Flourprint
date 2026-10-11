import { describe, expect, it } from 'vitest';
import {
  applyModelDurations,
  applySchedule,
  FERMENTATION_SCHEDULES,
  RECIPE_TEMPLATES,
  roundedDurationS,
} from '../src/application/index.js';
import { decodeProcess } from '../src/application/documents.js';
import {
  checkRecipe,
  doughReadyStage,
  doughStepAmbients,
  doughSteps,
  estimateFermentation,
  lastDoughStepId,
  validateProcess,
  type Formula,
  type Process,
  type ProcessStep,
} from '../src/domain/index.js';

/** Dough steps end at the first heat step; model-driven durations; schedules (fermentation.md). */

const template = (id: string) => {
  const found = RECIPE_TEMPLATES.find((t) => t.id === id);
  if (!found) throw new Error(`no template ${id}`);
  return found;
};

const step = (
  id: string,
  operation: string,
  after: string[],
  durationS?: number,
  extra: Partial<ProcessStep> = {},
): ProcessStep => ({
  id,
  operation,
  dependsOn: after,
  schedule: 'asap',
  ...(durationS === undefined ? {} : { plannedDurationS: durationS }),
  ...extra,
});

const H = 3600;
const formula: Formula = template('boule-dutch-oven').formula;

const bagelLike: Process = {
  steps: [
    step('mix', 'mix', [], 600, { conditions: { temperatureC: 21 } }),
    step('bulk', 'bulk', ['mix'], H),
    step('shape', 'shape', ['bulk'], 600),
    step('proof', 'proof', ['shape'], H),
    step('boil', 'boil', ['proof'], 300),
    step('bake', 'bake', ['boil'], 1200),
  ],
};

const ids = (steps: readonly ProcessStep[] | undefined) => steps?.map((s) => s.id);
const ok = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

describe('dough steps', () => {
  it('end at the first heat step: a boil ends the dough like a bake', () => {
    expect(ids(doughSteps(bagelLike))).toEqual(['bulk', 'shape', 'proof']);
    expect(lastDoughStepId(bagelLike)).toBe('proof');
    expect(doughReadyStage(bagelLike, 'proof')).toBe('bake');
    expect(doughReadyStage(bagelLike, 'bulk')).toBe('shape');
    expect(doughReadyStage(bagelLike, 'boil')).toBeUndefined();
    expect(estimateFermentation(formula, bagelLike).dough.stepId).toBe('proof');
  });

  it('leave the boil out of the bagels template', () => {
    const steps = ids(doughSteps(template('bagels').process));
    expect(steps).not.toContain('boil');
    expect(steps?.at(-1)).toBe('shape');
  });
});

describe('dough step ambients', () => {
  it('follow each step, else the previous one, from the room temperature', () => {
    const process: Process = {
      steps: [
        step('mix', 'mix', [], 600, { conditions: { temperatureC: 21 } }),
        step('bulk', 'bulk', ['mix'], H),
        step('retard', 'retard', ['bulk'], 12 * H, {
          conditions: { location: 'fridge', temperatureC: 4 },
        }),
        step('shape', 'shape', ['retard'], 600),
        step('proof', 'proof', ['shape'], H, { conditions: { temperatureC: 24 } }),
        step('bake', 'bake', ['proof'], 1800),
      ],
    };
    expect(doughStepAmbients(process)).toEqual({ bulk: 21, retard: 4, shape: 4, proof: 24 });
    expect(doughStepAmbients({ steps: [step('bulk', 'bulk', [])] })).toEqual({});
  });
});

describe('model-driven duration', () => {
  const withMode = (process: Process, modes: Record<string, 'manual' | 'model'>): Process => ({
    ...process,
    steps: process.steps.map((s) => {
      const mode = modes[s.id];
      return mode === undefined ? s : { ...s, durationMode: mode };
    }),
  });

  it('allows one model-driven dough step and refuses a second', () => {
    expect(validateProcess(withMode(bagelLike, { proof: 'model', bulk: 'manual' })).ok).toBe(true);
    const two = validateProcess(withMode(bagelLike, { proof: 'model', bulk: 'model' }));
    expect(two.ok).toBe(false);
    expect(!two.ok && two.error.code).toBe('InvalidProcess');
    expect(
      validateProcess({
        steps: [{ ...step('mix', 'mix', []), durationMode: 'auto' as never }],
      }).ok,
    ).toBe(false);
  });

  it('is kept by the decoder', () => {
    const process = withMode(bagelLike, { proof: 'model' });
    const decoded = decodeProcess(JSON.parse(JSON.stringify(process)), 'process');
    expect(decoded.steps.find((s) => s.id === 'proof')?.durationMode).toBe('model');
    expect(() =>
      decodeProcess({ steps: [{ ...step('mix', 'mix', []), durationMode: 'auto' }] }, 'process'),
    ).toThrow();
  });

  it('solves the model-driven step, even before the last dough step', () => {
    const process = withMode(bagelLike, { bulk: 'model' });
    const estimate = estimateFermentation(formula, process).dough;
    expect(estimate.stepId).toBe('bulk');
    const duration = estimate.duration;
    if (duration.status !== 'ok') throw new Error(duration.status);
    // Planning the bulk at the solved time reaches the target at the end of the proof.
    const planned = {
      ...process,
      steps: process.steps.map((s) =>
        s.id === 'bulk' ? { ...s, plannedDurationS: duration.value } : s,
      ),
    };
    const progress = estimateFermentation(formula, planned).dough.progressPct;
    expect(progress.status === 'ok' && progress.value).toBeCloseTo(100, 1);
  });

  it('says when the steps before reach the end point already', () => {
    const process = withMode(
      {
        steps: bagelLike.steps.map((s) =>
          s.id === 'proof' ? { ...s, plannedDurationS: 20 * H } : s,
        ),
      },
      { bulk: 'model' },
    );
    const duration = estimateFermentation(formula, process).dough.duration;
    expect(duration).toMatchObject({ status: 'ok', value: 0 });
    expect(duration.status === 'ok' && duration.assumptions).toContain(
      'end_point_before_last_step',
    );
  });
});

describe('applyModelDurations', () => {
  const driven = {
    ...bagelLike,
    steps: bagelLike.steps.map((s) =>
      s.id === 'proof' ? { ...s, durationMode: 'model' as const } : s,
    ),
  };

  it('writes the suggestion rounded to 5 minutes, with its provenance', () => {
    const result = applyModelDurations(formula, driven);
    if (result.kind !== 'applied') throw new Error(result.kind);
    const estimate = estimateFermentation(formula, driven).dough.duration;
    if (estimate.status !== 'ok') throw new Error(estimate.status);
    const proof = result.process.steps.find((s) => s.id === 'proof');
    expect(result.stepId).toBe('proof');
    expect(proof?.plannedDurationS).toBe(roundedDurationS(estimate.value));
    expect((proof?.plannedDurationS ?? 1) % 300).toBe(0);
    expect(proof?.accepted).toEqual({
      estimate,
      appliedValue: proof?.plannedDurationS,
      model: estimate.model,
    });
    expect(proof?.durationMode).toBe('model');
    // The other steps are untouched; applying again changes nothing.
    expect(result.process.steps.filter((s) => s.id !== 'proof')).toEqual(
      driven.steps.filter((s) => s.id !== 'proof'),
    );
    const again = applyModelDurations(formula, result.process);
    expect(again.kind === 'applied' && again.process).toEqual(result.process);
  });

  it('follows the other steps: a longer bulk shortens the proof', () => {
    const first = applyModelDurations(formula, driven);
    const longer = applyModelDurations(formula, {
      ...driven,
      steps: driven.steps.map((s) => (s.id === 'bulk' ? { ...s, plannedDurationS: 2 * H } : s)),
    });
    const proof = (r: typeof first) =>
      r.process.steps.find((s) => s.id === 'proof')?.plannedDurationS;
    expect(proof(longer)).toBeLessThan(proof(first) ?? 0);
  });

  it('keeps the last value and says why when the estimate is not ok', () => {
    const noRoom: Process = {
      ...driven,
      steps: driven.steps.map((s) => (s.id === 'mix' ? { ...s, conditions: {} } : s)),
    };
    const result = applyModelDurations(formula, noRoom);
    expect(result).toMatchObject({
      kind: 'unchanged',
      stepId: 'proof',
      status: 'insufficient_data',
      reason: 'temperature_unknown',
    });
    expect(result.process).toBe(noRoom);
  });

  it('changes nothing without a model-driven step', () => {
    const result = applyModelDurations(formula, bagelLike);
    expect(result).toEqual({ kind: 'none', process: bagelLike });
  });
});

describe('fermentation schedules', () => {
  const boule = template('boule-dutch-oven');

  it('are the four of the contract, each ending on a model-driven step', () => {
    expect(FERMENTATION_SCHEDULES.map((s) => s.id)).toEqual([
      'bulk-proof',
      'cold-bulk',
      'cold-proof',
      'same-day-short',
    ]);
    for (const schedule of FERMENTATION_SCHEDULES) {
      const process = ok(applySchedule(boule.process, schedule.id));
      const dough = doughSteps(process) ?? [];
      expect(dough.map((s) => s.operation)).toEqual(schedule.steps.map((s) => s.operation));
      expect(dough.filter((s) => s.durationMode === 'model').map((s) => s.id)).toEqual([
        dough.at(-1)?.id,
      ]);
      // Every template keeps passing the checks without a blocking issue.
      expect(checkRecipe(boule.formula, process).filter((i) => i.severity === 'blocking')).toEqual(
        [],
      );
    }
  });

  it('replace the dough steps between the mix and the bake, keeping the folds', () => {
    const folds = { count: 4, intervalS: 1800, style: 'stretchAndFold' };
    const folded: Process = {
      ...boule.process,
      steps: boule.process.steps.map((s) => (s.id === 'bulk' ? { ...s, technique: { folds } } : s)),
    };
    const process = ok(applySchedule(folded, 'cold-bulk'));
    expect(process.steps.map((s) => s.id)).toEqual([
      'mix',
      'bulk',
      'cold-bulk',
      'shape',
      'proof',
      'preheat',
      'bake',
      'cool',
    ]);
    const byId = (id: string) => process.steps.find((s) => s.id === id);
    // Room steps take the room temperature of the replaced steps (the bulk's 22.2 °C).
    expect(byId('bulk')).toMatchObject({
      dependsOn: ['mix'],
      plannedDurationS: H,
      conditions: { temperatureC: 22.2 },
    });
    expect(byId('bulk')?.technique?.folds).toEqual(folds);
    expect(byId('cold-bulk')).toMatchObject({
      operation: 'retard',
      plannedDurationS: 18 * H,
      conditions: { location: 'fridge', temperatureC: 4 },
    });
    // The shape keeps the replaced shape's time; the proof after the fridge is at room temperature.
    expect(byId('shape')?.plannedDurationS).toBe(600);
    expect(byId('proof')).toMatchObject({
      plannedDurationS: 2 * H,
      conditions: { temperatureC: 22.2 },
      durationMode: 'model',
    });
    expect(byId('bake')?.dependsOn).toEqual(['proof', 'preheat']);
    expect(validateProcess(process).ok).toBe(true);
  });

  it('end the bagels before the boil, with the room temperature of the replaced steps', () => {
    const bagels = template('bagels').process;
    const process = ok(applySchedule(bagels, 'cold-proof'));
    const dough = doughSteps(process) ?? [];
    expect(dough.map((s) => s.id)).toEqual(['bulk', 'shape', 'cold-proof']);
    expect(process.steps.find((s) => s.id === 'boil')?.dependsOn).toEqual(['cold-proof']);
    // The replaced bulk was at 21 °C: room steps take it; the cold proof is in the fridge.
    expect(dough[0]?.conditions).toEqual({ temperatureC: 21 });
    expect(dough[2]?.conditions).toEqual({ location: 'fridge', temperatureC: 4 });
  });

  it('refuse a replaced step that adds ingredients or has a technique other than folds', () => {
    const withTechnique: Process = {
      steps: boule.process.steps.map((s) =>
        s.id === 'proof' ? { ...s, technique: { endCheck: 'feel' } } : s,
      ),
    };
    const refused = applySchedule(withTechnique, 'bulk-proof');
    expect(!refused.ok && refused.error.code).toBe('InvalidProcess');
    const withIncorporation: Process = {
      steps: boule.process.steps.map((s) =>
        s.id === 'bulk' ? { ...s, incorporations: [{ item: 'water', sharePct: 10 }] } : s,
      ),
    };
    expect(applySchedule(withIncorporation, 'bulk-proof').ok).toBe(false);
    expect(applySchedule(boule.process, 'nope')).toMatchObject({
      ok: false,
      error: { code: 'UnknownSchedule' },
    });
    expect(applySchedule({ steps: [] }, 'bulk-proof').ok).toBe(false);
  });

  it('take the mix temperature after a cold step when no replaced step has a room one', () => {
    const process = ok(
      applySchedule(
        {
          steps: [
            step('mix', 'mix', [], 600, { conditions: { temperatureC: 20 } }),
            step('bulk', 'bulk', ['mix'], H),
            step('bake', 'bake', ['bulk'], 1800),
          ],
        },
        'cold-bulk',
      ),
    );
    const byId = (id: string) => process.steps.find((s) => s.id === id);
    expect(byId('bulk')?.conditions).toBeUndefined();
    expect(byId('shape')?.conditions).toEqual({ temperatureC: 20 });
    expect(byId('proof')?.conditions).toEqual({ temperatureC: 20 });
  });

  it('insert after the mix when no dough step exists, before what followed the mix', () => {
    const process = ok(
      applySchedule(
        {
          steps: [
            step('mix', 'mix', [], 600, { conditions: { temperatureC: 22 } }),
            step('bake', 'bake', ['mix'], 1800),
          ],
        },
        'same-day-short',
      ),
    );
    expect(process.steps.map((s) => s.id)).toEqual(['mix', 'bulk', 'shape', 'proof', 'bake']);
    expect(process.steps.find((s) => s.id === 'bake')?.dependsOn).toEqual(['proof']);
  });

  it('then give the model-driven step its time when the editor applies the model', () => {
    const process = ok(applySchedule(boule.process, 'bulk-proof'));
    const result = applyModelDurations(boule.formula, process);
    expect(result.kind).toBe('applied');
  });
});
