import type { Process, StepId } from './types.js';

/**
 * Removes a step (process.md, Step removal): its successors inherit its dependencies, so the
 * order around it is kept, and its incorporations go with it. The caller validates the result.
 */
export const removeStep = (process: Process, stepId: StepId): Process => {
  const removed = process.steps.find((s) => s.id === stepId);
  if (!removed) return process;
  return {
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
