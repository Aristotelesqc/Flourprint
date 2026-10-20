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
 * The `hydrationPct` that gives the component a hydration as read (`liquidRatioPct`) of
 * `targetPct` (formula.md, Hydration entry).
 */
export const hydrationForLiquidRatio = (
  formula: Formula,
  component: Component,
  targetPct: number,
): Result<number, FormulaError> => {
  const refuse = (reason: string) =>
    err(
      domainError('InvalidFormula', `Invalid hydration: ${reason}`, {
        path: 'hydration',
        reason,
      }),
    );
  if (!Number.isFinite(targetPct)) return refuse('the hydration must be a finite number');
  if (!(component.flourPct > 0)) return refuse('the component has no flour');
  const allocated = allocatedWaterPct(formula, component);
  if (allocated === undefined) {
    return refuse('an allocated ingredient has an unknown water content');
  }
  const hydrationPct = targetPct - (100 * allocated) / component.flourPct;
  if (hydrationPct < 0) return refuse('the allocated ingredients alone bring more water');
  return ok(hydrationPct);
};

/** Mass of the component's allocated ingredients, in points of total flour. */
const allocatedMassPct = (component: Component): number =>
  (component.allocations ?? []).reduce((sum, a) => sum + a.bakerPct, 0);

/**
 * The component's flour:liquid ratio by mass, as liquid parts per flour part (formula.md, Ratio
 * entry): its water plus the mass of its allocated ingredients (milk, not milk water), over its
 * flour. Undefined without flour.
 */
export const liquidMassRatio = (component: Component): number | undefined => {
  if (!(component.flourPct > 0)) return undefined;
  const liquid = (component.flourPct * component.hydrationPct) / 100 + allocatedMassPct(component);
  return liquid / component.flourPct;
};

/** The `hydrationPct` that gives the component a flour:liquid ratio of 1:`parts` by mass. */
export const hydrationForRatio = (
  component: Component,
  parts: number,
): Result<number, FormulaError> => {
  const refuse = (reason: string) =>
    err(domainError('InvalidFormula', `Invalid ratio: ${reason}`, { path: 'ratio', reason }));
  if (!Number.isFinite(parts) || parts <= 0) return refuse('the liquid parts must be > 0');
  if (!(component.flourPct > 0)) return refuse('the component has no flour');
  const hydrationPct =
    (100 * (parts * component.flourPct - allocatedMassPct(component))) / component.flourPct;
  if (hydrationPct < 0) return refuse('the allocated ingredients alone exceed the ratio');
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
