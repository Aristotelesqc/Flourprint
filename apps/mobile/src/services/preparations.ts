import {
  newComponent,
  type Component,
  type ComponentDefaults,
  type ComponentPreset,
  type Formula,
  type FormulaError,
  type Process,
  type Result,
} from '@flourprint/core/domain';

/**
 * Preparations added from the recipe page. They start from the engine's component defaults,
 * which the user may change for new recipes (formula.md, Component defaults).
 */
export type PreparationKind = ComponentPreset;

const uniqueId = (formula: Formula, process: Process, base: string): string => {
  const taken = new Set([
    ...formula.flours.map((f) => f.id),
    ...formula.ingredients.map((i) => i.id),
    ...formula.components.map((c) => c.id),
    ...process.steps.map((s) => s.id),
  ]);
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
};

export const newPreparation = (
  formula: Formula,
  process: Process,
  kind: PreparationKind,
  defaults?: ComponentDefaults,
): Result<Component, FormulaError> =>
  newComponent(formula, kind, uniqueId(formula, process, kind), defaults);

/**
 * The step that makes a new preparation, before the first mix: no duration until the user
 * gives one (nothing is invented), ended by the baker.
 */
export const withPreparationStep = (process: Process, component: Component): Process => {
  if (process.steps.some((s) => s.id === component.id)) return process;
  const mix = process.steps.find((s) => s.operation === 'mix');
  return {
    ...process,
    steps: [
      {
        id: component.id,
        operation: component.kind === 'scald' ? 'scald' : 'preferment',
        dependsOn: [],
        schedule: 'asap',
        endCriterion: { kind: 'userDecision' },
      },
      ...process.steps.map((s) =>
        s === mix ? { ...s, dependsOn: [...s.dependsOn, component.id] } : s,
      ),
    ],
  };
};
