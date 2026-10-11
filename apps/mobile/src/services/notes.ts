import type { BakeState, ObservationCategory, StepId } from '@flourprint/core/domain';

export const NOTE_CATEGORIES: readonly ObservationCategory[] = [
  'fermentation',
  'handling',
  'volume',
  'crust',
  'crumb',
  'flavor',
  'other',
];

const FERMENTATION = new Set(['preferment', 'levain', 'bulk', 'retard', 'proof']);
const HANDLING = new Set([
  'autolyse',
  'mix',
  'fold',
  'degas',
  'divide',
  'preshape',
  'shape',
  'laminate',
]);

/** A sensible first category for a note on this step; the baker can change it. */
export const defaultCategory = (
  state: BakeState,
  stepId: StepId | undefined,
): ObservationCategory => {
  const operation = state.process?.steps.find((s) => s.id === stepId)?.operation;
  if (operation === undefined) return state.status === 'active' ? 'other' : 'crumb';
  if (FERMENTATION.has(operation)) return 'fermentation';
  if (HANDLING.has(operation)) return 'handling';
  if (operation === 'bake') return 'crust';
  return 'other';
};

/**
 * Steps a note can be attached to, in the order the baker meets them: running steps first, then
 * those already done (latest first), then the rest in plan order.
 */
export const noteSteps = (state: BakeState): StepId[] => {
  const steps = state.process?.steps ?? [];
  const record = (id: StepId) => state.steps[id];
  const running = steps.filter((s) => record(s.id)?.startedAt && !record(s.id)?.endedAt);
  const done = steps
    .filter((s) => record(s.id)?.endedAt)
    .sort(
      (a, b) => Date.parse(record(b.id)?.endedAt ?? '') - Date.parse(record(a.id)?.endedAt ?? ''),
    );
  const rest = steps.filter((s) => !record(s.id)?.startedAt && !record(s.id)?.endedAt);
  return [...running, ...done, ...rest].map((s) => s.id);
};
