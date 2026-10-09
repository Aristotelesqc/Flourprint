import type { Component, Formula, Process } from '@flourprint/core/domain';

/**
 * Preparations added from the recipe page. The defaults are starting points the user edits
 * right away: a poolish at 100 % hydration and a tangzhong at 1:5 (owner decision, #18).
 */
export type PreparationKind = 'poolish' | 'tangzhong';

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
): Component => {
  const main = [...formula.flours].sort((a, b) => b.sharePct - a.sharePct)[0];
  return {
    id: uniqueId(formula, process, kind),
    kind: kind === 'poolish' ? 'preferment' : 'scald',
    flourPct: kind === 'poolish' ? 20 : 5,
    flourBlend: main ? [{ flour: main.id, sharePct: 100 }] : [],
    hydrationPct: kind === 'poolish' ? 100 : 500,
  };
};

/**
 * The step that makes a new preparation, before the first mix: no duration until the user
 * gives one (nothing is invented), ended by the baker.
 */
export const withPreparationStep = (process: Process, component: Component): Process => {
  if (process.steps.some((s) => s.id === component.id)) return process;
  const mix = process.steps.find((s) => s.operation === 'mix');
  return {
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
