import { isCookingStep } from '../process/cooking.js';
import type { Formula } from '../formula/types.js';
import type { Process } from '../process/types.js';
import { validateRecipe } from './validate.js';

/** One finding of `checkRecipe` (docs/contracts/drafts.md, Recipe checks). */
export interface RecipeIssue {
  readonly severity: 'blocking' | 'warning';
  /** Stable code, localized by the UI. */
  readonly code: string;
  /** The field concerned, e.g. `ingredients.salt.bakerPct` or `steps.bulk`. */
  readonly path?: string;
  readonly details?: Readonly<Record<string, string | number>>;
}

const SALT_PCT = [1, 3.5] as const;
const WATER_PCT = [45, 90] as const;

/**
 * Everything wrong with a recipe, blocking or not (drafts.md). Blocking issues are the errors of
 * `validateRecipe`; warnings are wide plausibility checks that never block.
 */
export const checkRecipe = (formula: Formula, process: Process): RecipeIssue[] => {
  const issues: RecipeIssue[] = [];
  if (process.steps.length === 0) {
    issues.push({ severity: 'blocking', code: 'no_steps', path: 'steps' });
  }
  const valid = validateRecipe(formula, process);
  if (!valid.ok) {
    const { code, message, details } = valid.error;
    // The error's own scalar details, so the interface can explain it like any engine error.
    const scalars = Object.fromEntries(
      Object.entries((details ?? {}) as Record<string, unknown>).filter(
        (entry): entry is [string, string | number] =>
          typeof entry[1] === 'string' || typeof entry[1] === 'number',
      ),
    );
    const path = typeof scalars.path === 'string' ? scalars.path : undefined;
    issues.push({
      severity: 'blocking',
      code,
      ...(path === undefined ? {} : { path }),
      details: { ...scalars, message },
    });
  }

  const salt = formula.ingredients.find((i) => i.id === 'salt' && i.role === 'dough');
  if (!salt) issues.push({ severity: 'warning', code: 'salt_missing', path: 'ingredients' });
  else if (salt.bakerPct < SALT_PCT[0] || salt.bakerPct > SALT_PCT[1]) {
    issues.push({
      severity: 'warning',
      code: 'salt_outside_1_to_3_5',
      path: 'ingredients.salt.bakerPct',
      details: { pct: salt.bakerPct },
    });
  }
  if (valid.ok && valid.value.resolved.totalWater.completeness === 'complete') {
    const pct = valid.value.resolved.totalWaterPct;
    if (pct < WATER_PCT[0] || pct > WATER_PCT[1]) {
      issues.push({
        severity: 'warning',
        code: 'water_outside_45_to_90',
        path: 'totalWater',
        details: { pct },
      });
    }
  }
  const leavened =
    formula.ingredients.some((i) => i.yeast !== undefined) ||
    formula.components.some((c) => c.kind === 'preferment');
  if (!leavened) issues.push({ severity: 'warning', code: 'no_leavening', path: 'ingredients' });
  if (process.steps.length > 0) {
    if (!process.steps.some((s) => s.operation === 'mix')) {
      issues.push({ severity: 'warning', code: 'no_mix_step', path: 'steps' });
    }
    if (!process.steps.some(isCookingStep)) {
      issues.push({ severity: 'warning', code: 'no_bake_step', path: 'steps' });
    }
  }
  for (const step of process.steps) {
    if (step.schedule === 'asap' && step.plannedDurationS === undefined) {
      issues.push({
        severity: 'warning',
        code: 'step_without_duration',
        path: `steps.${step.id}`,
        details: { step: step.id },
      });
    }
    // Recorded technique only: folds that outlast the step are likely a typo (process.md).
    const folds = step.technique?.folds;
    if (
      folds !== undefined &&
      step.plannedDurationS !== undefined &&
      folds.count * folds.intervalS > step.plannedDurationS
    ) {
      issues.push({
        severity: 'warning',
        code: 'folds_exceed_step',
        path: `steps.${step.id}.technique.folds`,
        details: { step: step.id },
      });
    }
  }
  return issues;
};

/** Whether a recipe can be saved as a revision or baked (no blocking issue). */
export const blockingIssues = (issues: readonly RecipeIssue[]): RecipeIssue[] =>
  issues.filter((i) => i.severity === 'blocking');
