import { domainError } from '../errors.js';
import { err, ok, type Result } from '../result.js';
import type { FormulaError } from './errors.js';
import type { Component, Formula } from './types.js';

/** Name of a component derived from its liquid ratio (formula.md, Component style). */
export type ComponentStyle =
  'tangzhong' | 'yudane' | 'scald' | 'poolish' | 'biga' | 'preferment' | 'soaker' | 'custom';

/** Water the component's allocated ingredients bring, in points of total flour; undefined if unknown. */
const allocatedWaterPct = (formula: Formula, component: Component): number | undefined => {
  let water = 0;
  for (const allocation of component.allocations ?? []) {
    const ingredient = formula.ingredients.find((i) => i.id === allocation.ingredient);
    const content = ingredient?.water ?? { status: 'unknown' };
    if (content.status === 'unknown') return undefined;
    water += (allocation.bakerPct * content.valuePct) / 100;
  }
  return water;
};

/**
 * Liquid ratio of a component in points: its water plus the water of its allocated ingredients,
 * over its flour. Undefined without flour or when an allocated ingredient's water is unknown.
 */
export const liquidRatioPct = (formula: Formula, component: Component): number | undefined => {
  if (!(component.flourPct > 0)) return undefined;
  const allocated = allocatedWaterPct(formula, component);
  if (allocated === undefined) return undefined;
  return component.hydrationPct + (100 * allocated) / component.flourPct;
};

/**
 * The `hydrationPct` that gives the component a flour:liquid ratio of 1:`parts` (formula.md,
 * Ratio entry): the liquid ratio counts the water of allocated ingredients, so it is subtracted.
 */
export const hydrationForRatio = (
  formula: Formula,
  component: Component,
  parts: number,
): Result<number, FormulaError> => {
  const refuse = (reason: string) =>
    err(domainError('InvalidFormula', `Invalid ratio: ${reason}`, { path: 'ratio', reason }));
  if (!Number.isFinite(parts) || parts <= 0) return refuse('the liquid parts must be > 0');
  if (!(component.flourPct > 0)) return refuse('the component has no flour');
  const allocated = allocatedWaterPct(formula, component);
  if (allocated === undefined)
    return refuse('an allocated ingredient has an unknown water content');
  const hydrationPct = 100 * parts - (100 * allocated) / component.flourPct;
  if (hydrationPct < 0) return refuse('the allocated ingredients already bring more water');
  return ok(hydrationPct);
};

/** The component's style, or undefined when its ratio cannot be known. */
export const componentStyle = (
  formula: Formula,
  component: Component,
): ComponentStyle | undefined => {
  if (component.kind === 'soaker' || component.kind === 'custom') return component.kind;
  const ratio = liquidRatioPct(formula, component);
  if (ratio === undefined) return undefined;
  if (component.kind === 'scald') {
    if (ratio >= 300) return 'tangzhong';
    return ratio <= 150 ? 'yudane' : 'scald';
  }
  if (ratio >= 90) return 'poolish';
  return ratio <= 65 ? 'biga' : 'preferment';
};
