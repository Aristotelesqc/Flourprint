import type { Instant } from '../instant.js';
import type { Process, StepId, StepThermal } from '../process/types.js';
import type { BakeState } from './types.js';

/**
 * Thermal inputs of a step over a Preparation (bake-session.md, Thermal change on a running
 * step): the inputs in force are a list of `(from, thermal)` segments, derived from the recorded
 * facts and never stored. `evolve` keeps the changes; nothing here calls the model.
 */
export interface ThermalSegment {
  readonly from: Instant;
  /** Absent = no thermal inputs: the fixed lag of fermentation.md. */
  readonly thermal?: StepThermal;
}

/** The inputs a step has before any change made once it ran: the plan, then changes recorded before the start. */
const initialThermal = (state: BakeState, stepId: StepId): StepThermal | undefined => {
  const record = state.steps[stepId];
  let thermal = record?.baseThermal;
  for (const change of record?.thermalChanges ?? []) {
    if (change.fromStart === true) thermal = change.thermal;
  }
  return thermal;
};

/**
 * The thermal inputs of a step in force now: the snapshot's, then every recorded change in order
 * (a change recorded before the step started applies from its start).
 */
export const effectiveThermal = (state: BakeState, stepId: StepId): StepThermal | undefined => {
  const changes = (state.steps[stepId]?.thermalChanges ?? []).filter((c) => c.fromStart !== true);
  return changes.length > 0 ? changes[changes.length - 1]?.thermal : initialThermal(state, stepId);
};

/**
 * The segments of a step that has started, from its start to now: the first one holds the inputs
 * it started with, each recorded change opens the next. A step not started has none.
 */
export const thermalSegments = (state: BakeState, stepId: StepId): readonly ThermalSegment[] => {
  const record = state.steps[stepId];
  if (record?.startedAt === undefined) return [];
  const started = record.startedAt;
  const initial = initialThermal(state, stepId);
  const first: ThermalSegment = {
    from: started,
    ...(initial === undefined ? {} : { thermal: initial }),
  };
  const later = (record.thermalChanges ?? [])
    .filter((c) => c.fromStart !== true)
    .map((c): ThermalSegment => ({
      from: Date.parse(c.at) < Date.parse(started) ? started : c.at,
      ...(c.thermal === undefined ? {} : { thermal: c.thermal }),
    }));
  return [first, ...later];
};

const DEGASSING = ['fold', 'degas', 'preshape', 'shape'];

/**
 * Whether the volume cue ("about doubled" against a reference) may be offered for a dough step
 * of a plan with no facts (fermentation.md, Readiness cues): false when the step is itself a
 * degassing operation or its technique declares folds.
 */
export const volumeCueValidInPlan = (process: Process, stepId: StepId): boolean => {
  const step = process.steps.find((s) => s.id === stepId);
  if (!step) return true;
  return !(DEGASSING.includes(step.operation) || step.technique?.folds !== undefined);
};

/**
 * Whether the volume cue may be offered for a dough step, derived read-only from the recorded
 * facts (fermentation.md, Readiness cues are derived, not stored). False when, since the step
 * started, a degassing operation was recorded on the dough: a `fold` observation on the step, or
 * a step of operation `fold`, `degas`, `preshape` or `shape` started after the step's start; or
 * when the step itself is one of those operations. Before the step starts the plan decides.
 */
export const volumeCueValid = (state: BakeState, stepId: StepId): boolean => {
  const process = state.process;
  if (!process) return true;
  const step = process.steps.find((s) => s.id === stepId);
  if (!step) return true;
  if (DEGASSING.includes(step.operation)) return false;
  const started = state.steps[stepId]?.startedAt;
  if (started === undefined) return volumeCueValidInPlan(process, stepId);
  const folded = state.observations.some(
    (o) => o.payload.kind === 'fold' && o.payload.stepId === stepId,
  );
  if (folded) return false;
  return !process.steps.some((s) => {
    const at = state.steps[s.id]?.startedAt;
    return (
      s.id !== stepId &&
      DEGASSING.includes(s.operation) &&
      at !== undefined &&
      Date.parse(at) > Date.parse(started)
    );
  });
};
