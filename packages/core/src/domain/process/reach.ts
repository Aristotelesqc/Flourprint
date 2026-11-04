import type { Process, StepId } from './types.js';

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
