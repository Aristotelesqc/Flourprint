import type { Process } from '@flourprint/core/domain';

/**
 * Codes the process editor offers (process.md, Techniques). Codes stay open: a step or a
 * technique holding any other code keeps it and shows it as given.
 */
export const STEP_OPERATIONS = [
  'autolyse',
  'fermentolyse',
  'mix',
  'fold',
  'bulk',
  'rest',
  'degas',
  'divide',
  'preshape',
  'shape',
  'proof',
  'retard',
  'preheat',
  'bake',
  'cool',
] as const;

export const MIX_METHODS = [
  'hand',
  'slapAndFold',
  'rubaud',
  'standMixer',
  'spiral',
  'foodProcessor',
  'noKnead',
] as const;

export const FOLD_STYLES = ['stretchAndFold', 'coilFold', 'lamination'] as const;

export const END_CHECKS = ['windowpane', 'doughTemperature', 'feel', 'time', 'other'] as const;

export const SPEEDS = ['low', 'medium', 'high'] as const;

/** Method codes offered on a step: mixing methods on a mix, fold styles on a fold. */
export const methodsFor = (operation: string): readonly string[] =>
  operation === 'mix' ? MIX_METHODS : operation === 'fold' ? FOLD_STYLES : [];

/** A step id taken neither by a step nor by `others`: the operation, then `-2`, `-3`… */
export const newStepId = (
  process: Process,
  operation: string,
  others: readonly string[] = [],
): string => {
  const taken = new Set([...process.steps.map((s) => s.id), ...others]);
  if (!taken.has(operation)) return operation;
  let n = 2;
  while (taken.has(`${operation}-${n}`)) n++;
  return `${operation}-${n}`;
};
