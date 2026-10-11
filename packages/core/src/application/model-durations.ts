import {
  estimateFermentation,
  modelDrivenStep,
  type Estimate,
  type Formula,
  type Process,
  type ReadinessProfile,
  type StepId,
} from '../domain/index.js';

/** Applied durations are rounded to five minutes: nobody times a dough to the second. */
export const DURATION_ROUNDING_S = 300;

/** A suggested duration as it is written: rounded to 5 minutes, at least 5 minutes. */
export const roundedDurationS = (seconds: number): number =>
  Math.max(DURATION_ROUNDING_S, Math.round(seconds / DURATION_ROUNDING_S) * DURATION_ROUNDING_S);

export type ModelDurationResult =
  /** No dough step follows the model: the process is returned as it was. */
  | { readonly kind: 'none'; readonly process: Process }
  /** The model-driven step took the current suggestion, with its provenance. */
  | {
      readonly kind: 'applied';
      readonly process: Process;
      readonly stepId: StepId;
      readonly durationS: number;
    }
  /** The estimate is not ok: the step keeps its last value; `reason` says why. */
  | {
      readonly kind: 'unchanged';
      readonly process: Process;
      readonly stepId: StepId;
      readonly status: Exclude<Estimate['status'], 'ok'>;
      readonly reason: string;
    };

/**
 * Applies the current suggestion to the model-driven dough step (fermentation.md, Model-driven
 * duration), as "use this time" does: `plannedDurationS` is the suggestion rounded to 5 minutes,
 * with its `accepted` provenance. The editor calls it after every edit of a recipe or draft; a bake
 * never does. `profile` overrides the process's readiness profile (tests, comparisons).
 */
export const applyModelDurations = (
  formula: Formula,
  process: Process,
  profile?: ReadinessProfile,
): ModelDurationResult => {
  const step = modelDrivenStep(process);
  if (!step) return { kind: 'none', process };
  const { dough } = estimateFermentation(formula, process, profile);
  const estimate = dough.duration;
  if (estimate.status !== 'ok' || dough.stepId !== step.id) {
    return {
      kind: 'unchanged',
      process,
      stepId: step.id,
      status: estimate.status === 'ok' ? 'insufficient_data' : estimate.status,
      reason: estimate.status === 'ok' ? 'model_step_not_estimated' : estimate.reason,
    };
  }
  const appliedValue = roundedDurationS(estimate.value);
  return {
    kind: 'applied',
    stepId: step.id,
    durationS: appliedValue,
    process: {
      ...process,
      steps: process.steps.map((s) =>
        s.id === step.id
          ? {
              ...s,
              plannedDurationS: appliedValue,
              accepted: { estimate, appliedValue, model: estimate.model },
            }
          : s,
      ),
    },
  };
};
