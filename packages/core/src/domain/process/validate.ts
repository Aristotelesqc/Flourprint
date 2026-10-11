import { domainError, type DomainError } from '../errors.js';
import {
  isTopologicalOrder,
  validateReferences,
  topologicalSort,
  type GraphError,
} from '../graph.js';
import { isReservedId } from '../ids.js';
import { err, ok, type Result } from '../result.js';
import { doughSteps } from './dough.js';
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
  for (const [index, step] of process.steps.entries()) {
    const path = `steps[${index}]`;
    if (step.schedule !== 'asap' && step.schedule !== 'alap') {
      return err(invalid(`${path}.schedule`, 'must be asap or alap'));
    }
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
    if (
      step.durationMode !== undefined &&
      step.durationMode !== 'manual' &&
      step.durationMode !== 'model'
    ) {
      return err(invalid(`${path}.durationMode`, 'must be manual or model'));
    }
  }
  // The model solves one unknown: at most one dough step follows it (fermentation.md).
  const driven = (doughSteps(process) ?? []).filter((s) => s.durationMode === 'model');
  if (driven.length > 1) {
    const index = process.steps.indexOf(driven[1] as ProcessStep);
    return err(invalid(`steps[${index}].durationMode`, 'at most one dough step follows the model'));
  }
  return ok(undefined);
};
