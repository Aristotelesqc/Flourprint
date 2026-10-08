import type { Component, Formula } from './types.js';

/** Name of a component derived from its liquid ratio (formula.md, Component style). */
export type ComponentStyle =
  'tangzhong' | 'yudane' | 'scald' | 'poolish' | 'biga' | 'preferment' | 'soaker' | 'custom';

/**
 * Liquid ratio of a component in points: its water plus the water of its allocated ingredients,
 * over its flour. Undefined without flour or when an allocated ingredient's water is unknown.
 */
export const liquidRatioPct = (formula: Formula, component: Component): number | undefined => {
  if (!(component.flourPct > 0)) return undefined;
  let water = (component.flourPct * component.hydrationPct) / 100;
  for (const allocation of component.allocations ?? []) {
    const ingredient = formula.ingredients.find((i) => i.id === allocation.ingredient);
    const content = ingredient?.water ?? { status: 'unknown' };
    if (content.status === 'unknown') return undefined;
    water += (allocation.bakerPct * content.valuePct) / 100;
  }
  return (100 * water) / component.flourPct;
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
