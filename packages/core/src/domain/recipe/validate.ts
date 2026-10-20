import type { FormulaError } from '../formula/errors.js';
import { resolveFormula } from '../formula/resolve.js';
import type { Formula, ResolvedFormula } from '../formula/types.js';
import { planIncorporations, type IncorporatedAmount } from '../process/incorporations.js';
import { domainError } from '../errors.js';
import { ancestors } from '../process/dough.js';
import { subjectOf } from '../process/move.js';
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
 * formula and never contradicts the step's id, and every step of a component is upstream of the
 * step where the component joins the main dough.
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
  const declares = process.steps.some((s) => (s.incorporations ?? []).length > 0);
  for (const component of components) {
    const isPhase = (id: StepId) => {
      const step = process.steps.find((s) => s.id === id);
      const subject = step && subjectOf(process, step, components);
      return subject?.kind === 'component' && subject.id === component;
    };
    const phases = process.steps.filter((s) => isPhase(s.id));
    if (phases.length === 0) continue;
    const join = declares
      ? process.steps.find((s) =>
          (s.incorporations ?? []).some((i) => i.item === 'component' && i.id === component),
        )
      : process.steps.find((s) => !isPhase(s.id) && s.dependsOn.some(isPhase));
    if (join === undefined) continue;
    const joinIndex = process.steps.indexOf(join);
    if (isPhase(join.id)) {
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
