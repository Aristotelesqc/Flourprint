import type { FormulaError } from '../formula/errors.js';
import { resolveFormula } from '../formula/resolve.js';
import type { Formula, ResolvedFormula } from '../formula/types.js';
import { planIncorporations, type IncorporatedAmount } from '../process/incorporations.js';
import { domainError } from '../errors.js';
import { ancestors } from '../process/dough.js';
import { joinOf, phasesOf } from '../process/move.js';
import type { Process, StepId } from '../process/types.js';
import { validateProcess, type ProcessError } from '../process/validate.js';
import { err, ok, type Result } from '../result.js';

export type RecipeError = FormulaError | ProcessError;

export interface ValidRecipe {
  readonly resolved: ResolvedFormula;
  /** Grams added at each step; empty when the process declares no incorporation. */
  readonly incorporations: Readonly<Record<StepId, readonly IncorporatedAmount[]>>;
}

const invalid = (path: string, reason: string): ProcessError =>
  domainError('InvalidProcess', `${path}: ${reason}`, { path, reason });

/**
 * Subjects and component phases (process.md): an explicit subject names a component of the
 * formula, `mainDough` is never the subject of a component's own step, and every phase of a
 * component that has an explicit-subject phase is upstream of the step where it joins the dough.
 * A component without explicit subjects keeps its legacy meaning (Compatibility).
 */
const validateSubjects = (formula: Formula, process: Process): Result<void, ProcessError> => {
  const components = new Set(formula.components.map((c) => c.id));
  for (const [index, step] of process.steps.entries()) {
    const path = `steps[${index}].subject`;
    if (step.subject?.kind === 'component' && !components.has(step.subject.id)) {
      return err(invalid(path, `${step.subject.id} is not a component of the formula`));
    }
    if (step.subject?.kind === 'mainDough' && components.has(step.id)) {
      return err(invalid(path, `${step.id} is a component's step, not the main dough's`));
    }
  }
  for (const component of components) {
    const phases = phasesOf(process, component, components);
    if (!phases.some((p) => p.subject !== undefined)) continue;
    const join = joinOf(process, component, components);
    if (join === undefined) continue;
    const joinIndex = process.steps.indexOf(join);
    if (phases.includes(join)) {
      return err(
        invalid(
          `steps[${joinIndex}].incorporations`,
          `${component} joins the dough at its own step`,
        ),
      );
    }
    const upstream = ancestors(process, join.id);
    const late = phases.find((p) => !upstream.has(p.id));
    if (late !== undefined) {
      return err(
        invalid(
          `steps[${process.steps.indexOf(late)}]`,
          `${late.id} must come before ${join.id}, where ${component} joins the dough`,
        ),
      );
    }
  }
  return ok(undefined);
};

/**
 * Validates a formula and its process together (process.md, persistence.md): each on its own,
 * then the declared incorporations against the formula's final mix. Every operation that saves,
 * starts or changes either side goes through this check.
 */
export const validateRecipe = (
  formula: Formula,
  process: Process,
): Result<ValidRecipe, RecipeError> => {
  const resolved = resolveFormula(formula);
  if (!resolved.ok) return resolved;
  const valid = validateProcess(process);
  if (!valid.ok) return valid;
  const subjects = validateSubjects(formula, process);
  if (!subjects.ok) return subjects;
  const incorporations = planIncorporations(process, resolved.value);
  if (!incorporations.ok) return incorporations;
  return ok({ resolved: resolved.value, incorporations: incorporations.value });
};
