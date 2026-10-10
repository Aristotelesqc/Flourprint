import {
  INGREDIENT_PRESETS,
  type Ingredient,
  type ProcessStep,
  type StepConditions,
} from '../../domain/index.js';

/** Helpers to write recipe templates and the blank recipe as data (drafts.md). */

export const H = 3600;
export const MIN = 60;

/** A dough ingredient with the composition of its preset (`formula/presets.ts`). */
export const preset = (id: string, bakerPct: number): Ingredient => {
  const found = INGREDIENT_PRESETS.find((p) => p.id === id);
  if (!found) throw new Error(`unknown ingredient preset ${id}`);
  return { id, bakerPct, ...found.ingredient };
};

/** An `asap` step after `after` (none for the first), with its planned duration. */
export const step = (
  id: string,
  operation: string,
  after: readonly string[],
  durationS: number,
  options: { readonly conditions?: StepConditions; readonly label?: string } = {},
): ProcessStep => ({
  id,
  operation,
  dependsOn: after,
  schedule: 'asap',
  plannedDurationS: durationS,
  ...(options.conditions ? { conditions: options.conditions } : {}),
  ...(options.label ? { label: options.label } : {}),
});

/** An `alap` step (preheating): as late as possible before its successors. */
export const alapStep = (id: string, operation: string, durationS: number): ProcessStep => ({
  id,
  operation,
  dependsOn: [],
  schedule: 'alap',
  plannedDurationS: durationS,
});
