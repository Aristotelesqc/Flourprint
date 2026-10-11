import type { Process, ProcessStep, StepId } from './types.js';

/**
 * Dough steps (fermentation.md): the `asap` steps after the `mix` step and before the first heat
 * step, in process order. A heat step ends the fermentation: baking, or boiling bagels and
 * pretzels before they are baked.
 */
export const HEAT_OPERATIONS: readonly string[] = ['bake', 'boil'];

export const isHeatStep = (step: ProcessStep): boolean => HEAT_OPERATIONS.includes(step.operation);

/** Steps that depend on `from`, directly or not (the list is in topological order). */
export const descendants = (process: Process, from: StepId): Set<StepId> => {
  const found = new Set<StepId>();
  for (const step of process.steps) {
    if (step.dependsOn.some((d) => d === from || found.has(d))) found.add(step.id);
  }
  return found;
};

/** Steps `of` depends on, directly or not. */
export const ancestors = (process: Process, of: StepId): Set<StepId> => {
  const byId = new Map(process.steps.map((s) => [s.id, s]));
  const found = new Set<StepId>();
  const visit = (id: StepId) => {
    for (const d of byId.get(id)?.dependsOn ?? []) {
      if (!found.has(d)) {
        found.add(d);
        visit(d);
      }
    }
  };
  visit(of);
  return found;
};

/**
 * The first heat step after the mix, in process order; without one after the mix, the first heat
 * step of the process.
 */
export const firstHeatStep = (process: Process): ProcessStep | undefined => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  const after = mix ? descendants(process, mix.id) : undefined;
  return (
    process.steps.find((s) => isHeatStep(s) && (!after || after.has(s.id))) ??
    process.steps.find(isHeatStep)
  );
};

/**
 * The dough steps of a process, in process order, or undefined without a `mix` step. Without a
 * heat step, every `asap` step after the mix counts.
 */
export const doughSteps = (process: Process): ProcessStep[] | undefined => {
  const mix = process.steps.find((s) => s.operation === 'mix');
  if (!mix) return undefined;
  const heat = firstHeatStep(process);
  const after = descendants(process, mix.id);
  const before = heat ? ancestors(process, heat.id) : undefined;
  return process.steps.filter(
    (s) => s.schedule === 'asap' && after.has(s.id) && s !== heat && (!before || before.has(s.id)),
  );
};

/** The dough step whose duration follows the model (`durationMode: 'model'`), if any. */
export const modelDrivenStep = (process: Process): ProcessStep | undefined =>
  doughSteps(process)?.find((s) => s.durationMode === 'model');
