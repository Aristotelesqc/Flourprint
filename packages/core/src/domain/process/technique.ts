import type { Instant } from '../instant.js';
import type { ProcessStep, StepTechnique } from './types.js';

/**
 * Due instants of the fold sets 1 … `count` of a step started at `startedAt` (process.md,
 * Techniques): set `k` is due at the start + `k × intervalS`. Empty without folds. Time
 * arithmetic only; nothing about the dough is inferred from it.
 */
export const foldSchedule = (
  step: Pick<ProcessStep, 'technique'>,
  startedAt: Instant,
): Instant[] => {
  const folds = step.technique?.folds;
  if (!folds) return [];
  const start = Date.parse(startedAt);
  return Array.from(
    { length: folds.count },
    (_, i) =>
      new Date(start + Math.round((i + 1) * folds.intervalS * 1000)).toISOString() as Instant,
  );
};

/**
 * Sum of the mixing phases, in seconds; undefined without phases. The editor writes it as the
 * step's planned duration when the phases change (the baker's own numbers); the domain never
 * derives one from the other.
 */
export const phasesDurationS = (technique: StepTechnique | undefined): number | undefined => {
  const phases = technique?.phases;
  if (!phases || phases.length === 0) return undefined;
  return phases.reduce((sum, phase) => sum + phase.durationS, 0);
};
