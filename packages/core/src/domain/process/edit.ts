import type { Process, ProcessStep, StepId } from './types.js';

/**
 * Removes a step (process.md, Step removal): its successors inherit its dependencies, so the
 * order around it is kept, and its incorporations go with it. The caller validates the result.
 */
export const removeStep = (process: Process, stepId: StepId): Process => {
  const removed = process.steps.find((s) => s.id === stepId);
  if (!removed) return process;
  return {
    ...process,
    steps: process.steps
      .filter((s) => s.id !== stepId)
      .map((s) =>
        s.dependsOn.includes(stepId)
          ? {
              ...s,
              dependsOn: [
                ...new Set(s.dependsOn.flatMap((d) => (d === stepId ? removed.dependsOn : [d]))),
              ],
            }
          : s,
      ),
  };
};

/**
 * Inserts a step after `after`, like `InsertStepAfter` during a bake (bake-session.md): the new
 * step depends on `after`, and the steps that depended on `after` now depend on the new step.
 * Unchanged when `after` is unknown or the id is taken. The caller validates the result.
 */
export const insertStepAfter = (
  process: Process,
  after: StepId,
  step: Omit<ProcessStep, 'dependsOn'>,
): Process => {
  const index = process.steps.findIndex((s) => s.id === after);
  if (index < 0 || process.steps.some((s) => s.id === step.id)) return process;
  const inserted: ProcessStep = { ...step, dependsOn: [after] };
  const steps = process.steps.map((s) =>
    s.dependsOn.includes(after)
      ? { ...s, dependsOn: s.dependsOn.map((d) => (d === after ? step.id : d)) }
      : s,
  );
  steps.splice(index + 1, 0, inserted);
  return { ...process, steps };
};

/** What `updateStep` may change; `undefined` on an optional field removes it. */
export interface StepChanges {
  readonly operation?: string;
  readonly label?: string | undefined;
  readonly schedule?: ProcessStep['schedule'];
  readonly plannedDurationS?: number | undefined;
  readonly technique?: ProcessStep['technique'] | undefined;
  readonly durationMode?: ProcessStep['durationMode'] | undefined;
}

/**
 * Changes a step's operation, label, schedule, planned duration, technique or duration mode. A new
 * planned duration drops the applied-suggestion provenance and, unless the changes set a mode,
 * makes the step manual (fermentation.md): a typed time is the baker's. The caller validates.
 */
export const updateStep = (process: Process, stepId: StepId, changes: StepChanges): Process => ({
  ...process,
  steps: process.steps.map((s) => {
    if (s.id !== stepId) return s;
    const durationChanged =
      'plannedDurationS' in changes && changes.plannedDurationS !== s.plannedDurationS;
    const merged: Record<string, unknown> = { ...s, ...changes };
    const dropped = durationChanged
      ? ['accepted', ...('durationMode' in changes ? [] : ['durationMode'])]
      : [];
    const next = Object.fromEntries(
      Object.entries(merged).filter(
        ([key, value]) => value !== undefined && !dropped.includes(key),
      ),
    );
    return next as unknown as ProcessStep;
  }),
});
