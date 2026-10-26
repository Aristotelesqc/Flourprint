import { domainError, type DomainError } from '../errors.js';
import {
  isTopologicalOrder,
  validateReferences,
  topologicalSort,
  type GraphError,
} from '../graph.js';
import { stepEquipmentProblem } from '../equipment/step.js';
import { isReservedId } from '../ids.js';
import { err, ok, type Result } from '../result.js';
import { isCookingStep, outcomeProblem } from './cooking.js';
import { thermalProblem } from './thermal.js';
import { ancestors as ancestorsOf, doughSteps } from './dough.js';
import type { Process, ProcessStep } from './types.js';

export type ProcessError =
  | GraphError
  | DomainError<'InvalidProcess', { path: string; reason: string }>
  | DomainError<'UnknownReference', { path: string; id: string }>
  | DomainError<'IncompleteIncorporation', { item: string; sharePct: number }>
  | DomainError<'IncompatibleConstraint', { reason: string; field?: string }>;

const invalid = (path: string, reason: string): ProcessError =>
  domainError('InvalidProcess', `${path}: ${reason}`, { path, reason });

const SPEEDS: readonly string[] = ['low', 'medium', 'high'];

/** Techniques (process.md): recorded data, checked only for values that cannot be meant. */
const validateTechnique = (
  technique: ProcessStep['technique'],
  path: string,
): ProcessError | undefined => {
  if (technique === undefined) return undefined;
  for (const [i, phase] of (technique.phases ?? []).entries()) {
    if (!SPEEDS.includes(phase.speed)) {
      return invalid(`${path}.phases[${i}].speed`, 'must be low, medium or high');
    }
    if (!(Number.isFinite(phase.durationS) && phase.durationS > 0)) {
      return invalid(`${path}.phases[${i}].durationS`, 'must be > 0');
    }
  }
  const folds = technique.folds;
  if (folds !== undefined) {
    if (!(Number.isInteger(folds.count) && folds.count >= 1)) {
      return invalid(`${path}.folds.count`, 'must be an integer ≥ 1');
    }
    if (!(Number.isFinite(folds.intervalS) && folds.intervalS > 0)) {
      return invalid(`${path}.folds.intervalS`, 'must be > 0');
    }
  }
  return undefined;
};

/**
 * Steps before a target (process.md): the fields exist only on a `beforeTarget` step, which is a
 * `preheat`, has no duration and no incorporations, and which nothing depends on.
 */
const validatePreheat = (
  process: Process,
  step: ProcessStep,
  path: string,
  hasSuccessor: ReadonlySet<string>,
): ProcessError | undefined => {
  if (step.schedule !== 'beforeTarget') {
    for (const key of ['target', 'requiredWarmupS', 'startRule'] as const) {
      if (step[key] !== undefined) return invalid(`${path}.${key}`, 'beforeTarget steps only');
    }
    return undefined;
  }
  if (step.operation !== 'preheat') return invalid(path, 'beforeTarget is for preheat steps only');
  if (step.plannedDurationS !== undefined) {
    return invalid(`${path}.plannedDurationS`, 'a beforeTarget step has no duration');
  }
  if (step.durationMode !== undefined || step.accepted !== undefined) {
    return invalid(`${path}.durationMode`, 'a beforeTarget step has no duration mode');
  }
  if ((step.incorporations ?? []).length > 0) {
    return invalid(`${path}.incorporations`, 'a beforeTarget step has no incorporations');
  }
  if (hasSuccessor.has(step.id)) return invalid(path, 'no step may depend on a beforeTarget step');
  if (
    step.startRule !== undefined &&
    !['fromTarget', 'afterDependencies'].includes(step.startRule)
  ) {
    return invalid(`${path}.startRule`, 'must be fromTarget or afterDependencies');
  }
  if (step.requiredWarmupS !== undefined) {
    if (!(Number.isFinite(step.requiredWarmupS) && step.requiredWarmupS >= 0)) {
      return invalid(`${path}.requiredWarmupS`, 'must be ≥ 0');
    }
  } else if ((step.startRule ?? 'fromTarget') === 'fromTarget') {
    return invalid(`${path}.requiredWarmupS`, 'required with fromTarget');
  }
  const target = process.steps.find((s) => s.id === step.target);
  if (step.target === undefined || target === undefined) {
    return invalid(`${path}.target`, 'must name an existing step');
  }
  if (!isCookingStep(target)) return invalid(`${path}.target`, 'must be a cooking step');
  if (ancestorsOf(process, step.id).has(target.id)) {
    return invalid(`${path}.target`, 'the target must not be upstream of the step');
  }
  return undefined;
};

/** Graph and timing rules of docs/contracts/process.md. */
export const validateProcess = (process: Process): Result<void, ProcessError> => {
  for (const [index, step] of process.steps.entries()) {
    if (typeof step.id !== 'string' || step.id.length === 0 || isReservedId(step.id)) {
      return err(invalid(`steps[${index}].id`, `invalid or reserved id ${String(step.id)}`));
    }
  }
  const graph = validateReferences(process.steps);
  if (!graph.ok) return graph;
  const sorted = topologicalSort(process.steps);
  if (!sorted.ok) return sorted;
  if (!isTopologicalOrder(process.steps)) {
    return err(invalid('steps', 'every step must come after the steps it depends on'));
  }

  const hasSuccessor = new Set(process.steps.flatMap((step) => step.dependsOn));
  const doughIds = new Set((doughSteps(process) ?? []).map((s) => s.id));
  for (const [index, step] of process.steps.entries()) {
    const path = `steps[${index}]`;
    if (step.schedule !== 'asap' && step.schedule !== 'alap' && step.schedule !== 'beforeTarget') {
      return err(invalid(`${path}.schedule`, 'must be asap, alap or beforeTarget'));
    }
    const preheat = validatePreheat(process, step, path, hasSuccessor);
    if (preheat !== undefined) return err(preheat);
    if (step.plannedDurationS !== undefined) {
      if (!(Number.isFinite(step.plannedDurationS) && step.plannedDurationS >= 0)) {
        return err(invalid(`${path}.plannedDurationS`, 'must be ≥ 0'));
      }
    }
    if (step.schedule === 'alap') {
      if (!hasSuccessor.has(step.id)) return err(invalid(path, 'an alap step needs a successor'));
      if (step.plannedDurationS === undefined) {
        return err(invalid(path, 'an alap step needs plannedDurationS'));
      }
    }
    const conditions = step.conditions ?? {};
    for (const key of ['temperatureC', 'doughTemperatureC', 'frictionC'] as const) {
      const value = conditions[key];
      if (value !== undefined && !Number.isFinite(value)) {
        return err(invalid(`${path}.conditions.${key}`, 'must be a finite temperature'));
      }
    }
    if (
      step.operation !== 'mix' &&
      (conditions.doughTemperatureC !== undefined || conditions.frictionC !== undefined)
    ) {
      return err(invalid(`${path}.conditions`, 'dough temperature and friction are mix-step only'));
    }
    for (const [i, incorporation] of (step.incorporations ?? []).entries()) {
      if (!(Number.isFinite(incorporation.sharePct) && incorporation.sharePct >= 0)) {
        return err(invalid(`${path}.incorporations[${i}].sharePct`, 'must be ≥ 0'));
      }
    }
    const technique = validateTechnique(step.technique, `${path}.technique`);
    if (technique !== undefined) return err(technique);
    if (step.thermal !== undefined) {
      // Thermal inputs (process.md): a dough step only, then the values that cannot be meant.
      if (!doughIds.has(step.id)) {
        return err(invalid(`${path}.thermal`, 'thermal inputs are for dough steps only'));
      }
      const bad = thermalProblem(step.thermal, `${path}.thermal`);
      if (bad) return err(invalid(bad.path, bad.reason));
    }
    if (
      step.durationMode !== undefined &&
      step.durationMode !== 'manual' &&
      step.durationMode !== 'model'
    ) {
      return err(invalid(`${path}.durationMode`, 'must be manual or model'));
    }
    if (step.equipment !== undefined) {
      const bad = stepEquipmentProblem(step.equipment, `${path}.equipment`);
      if (bad) return err(invalid(bad.path, bad.reason));
    }
  }
  if (process.intendedOutcome !== undefined) {
    const problem = outcomeProblem(process.intendedOutcome);
    if (problem) return err(invalid(`intendedOutcome.${problem.field}`, problem.reason));
  }
  // The model solves one unknown: at most one dough step follows it (fermentation.md).
  const driven = (doughSteps(process) ?? []).filter((s) => s.durationMode === 'model');
  if (driven.length > 1) {
    const index = process.steps.indexOf(driven[1] as ProcessStep);
    return err(invalid(`steps[${index}].durationMode`, 'at most one dough step follows the model'));
  }
  return ok(undefined);
};
