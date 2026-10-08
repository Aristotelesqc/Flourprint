import { domainError, type DomainError } from '../errors.js';
import {
  isTopologicalOrder,
  validateReferences,
  topologicalSort,
  type GraphError,
} from '../graph.js';
import { isReservedId } from '../ids.js';
import { err, ok, type Result } from '../result.js';
import type { Process } from './types.js';

export type ProcessError =
  | GraphError
  | DomainError<'InvalidProcess', { path: string; reason: string }>
  | DomainError<'UnknownReference', { path: string; id: string }>
  | DomainError<'IncompleteIncorporation', { item: string; sharePct: number }>
  | DomainError<'IncompatibleConstraint', { reason: string; field?: string }>;

const invalid = (path: string, reason: string): ProcessError =>
  domainError('InvalidProcess', `${path}: ${reason}`, { path, reason });

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
    for (const [i, incorporation] of (step.incorporations ?? []).entries()) {
      if (!(Number.isFinite(incorporation.sharePct) && incorporation.sharePct >= 0)) {
        return err(invalid(`${path}.incorporations[${i}].sharePct`, 'must be ≥ 0'));
      }
    }
  }
  return ok(undefined);
};
