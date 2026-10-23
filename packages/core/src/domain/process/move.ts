import { domainError, type DomainError } from '../errors.js';
import { isTopologicalOrder } from '../graph.js';
import { err, ok, type Result } from '../result.js';
import { descendants } from './dough.js';
import { projectProcess } from './project.js';
import type {
  Process,
  ProcessStep,
  Projection,
  ProjectionInput,
  StepId,
  Subject,
} from './types.js';
import { validateProcess, type ProcessError } from './validate.js';

/**
 * Step move and duplicate (process.md). The list order is a topological presentation:
 * `dependsOn` alone defines timing, so an edit either keeps every dependency, rewires exactly the
 * edges of a single chain, or is refused. A refusal changes nothing.
 */

/**
 * The components a process names without its formula: the ids its steps incorporate and the
 * components of explicit subjects. Every formula component joins the dough exactly once
 * (Incorporations), so with incorporations these are the formula's components.
 */
export const componentIds = (process: Process): Set<string> =>
  new Set(
    process.steps.flatMap((s) => [
      ...(s.incorporations ?? []).flatMap((i) => (i.item === 'component' ? [i.id] : [])),
      ...(s.subject?.kind === 'component' ? [s.subject.id] : []),
    ]),
  );

/**
 * `subjectOf` (process.md): the step's explicit `subject`, else the component whose id is the
 * step's id, else the main dough. The components are the formula's when given, else the ids the
 * process incorporates.
 */
export const subjectOf = (
  process: Process,
  step: ProcessStep,
  components: ReadonlySet<string> = componentIds(process),
): Subject =>
  step.subject ??
  (components.has(step.id) ? { kind: 'component', id: step.id } : { kind: 'mainDough' });

/** The steps of component `id` (its phases), in process order. */
export const phasesOf = (
  process: Process,
  id: string,
  components: ReadonlySet<string> = componentIds(process),
): ProcessStep[] =>
  process.steps.filter((s) => {
    const subject = subjectOf(process, s, components);
    return subject.kind === 'component' && subject.id === id;
  });

/**
 * The step where component `id` joins the main dough (process.md, Subjects and component phases):
 * the step incorporating it, else, when the process declares no incorporations, the first step of
 * another subject that depends on one of its phases.
 */
export const joinOf = (
  process: Process,
  id: string,
  components: ReadonlySet<string> = componentIds(process),
): ProcessStep | undefined => {
  const incorporating = process.steps.find((s) =>
    (s.incorporations ?? []).some((i) => i.item === 'component' && i.id === id),
  );
  if (incorporating !== undefined) return incorporating;
  if (process.steps.some((s) => (s.incorporations ?? []).length > 0)) return undefined;
  const phases = new Set(phasesOf(process, id, components).map((s) => s.id));
  return process.steps.find((s) => !phases.has(s.id) && s.dependsOn.some((d) => phases.has(d)));
};

const sameSubject = (a: Subject, b: Subject): boolean =>
  a.kind === 'mainDough' ? b.kind === 'mainDough' : b.kind === 'component' && a.id === b.id;

export type AmbiguousMoveReason =
  | 'incorporationStep'
  | 'stepDependencies'
  | 'stepDependents'
  | 'targetDependents'
  | 'crossesWorkpiece'
  | 'scheduledFromTarget';

export interface ChangedEdge {
  readonly step: StepId;
  readonly before: readonly StepId[];
  readonly after: readonly StepId[];
}

export type MoveResult =
  | { readonly kind: 'unchanged'; readonly process: Process }
  | { readonly kind: 'orderOnly'; readonly process: Process }
  | {
      readonly kind: 'chain';
      readonly process: Process;
      readonly changedEdges: readonly ChangedEdge[];
    };

export type MoveError =
  | ProcessError
  | DomainError<'MoveBreaksDependencies', { path: string; step: StepId; dependsOn: StepId }>
  | DomainError<'AmbiguousMove', { reason: AmbiguousMoveReason }>;

const unknown = (path: string, id: string): MoveError =>
  domainError('UnknownReference', `${path} references unknown ${id}`, { path, id });

const ambiguous = (reason: AmbiguousMoveReason): MoveError =>
  domainError('AmbiguousMove', `The move needs explicit dependency edits (${reason})`, { reason });

/** The first dependency that comes after its dependent in `steps`. */
const firstViolation = (steps: readonly ProcessStep[]): MoveError => {
  const seen = new Set<StepId>();
  for (const [index, step] of steps.entries()) {
    const late = step.dependsOn.find((d) => !seen.has(d));
    if (late !== undefined) {
      const path = `steps[${index}].dependsOn`;
      return domainError('MoveBreaksDependencies', `${step.id} would come before ${late}`, {
        path,
        step: step.id,
        dependsOn: late,
      });
    }
    seen.add(step.id);
  }
  throw new Error('firstViolation called on a topological order');
};

const placed = (
  rest: readonly ProcessStep[],
  step: ProcessStep,
  after: StepId | null,
): ProcessStep[] => {
  const steps = [...rest];
  steps.splice(after === null ? 0 : steps.findIndex((s) => s.id === after) + 1, 0, step);
  return steps;
};

const validated = <T extends { process: Process }>(result: T): Result<T, MoveError> => {
  const valid = validateProcess(result.process);
  return valid.ok ? ok(result) : valid;
};

/**
 * Places `stepId` right after `after`, or first when `after` is `null` (process.md, Move).
 * Unchanged when it is already there; order only when the new list is still topological; a chain
 * move under the contract's conditions; otherwise a typed refusal.
 */
export const moveStep = (
  process: Process,
  stepId: StepId,
  after: StepId | null,
): Result<MoveResult, MoveError> => {
  const index = process.steps.findIndex((s) => s.id === stepId);
  if (index < 0) return err(unknown('stepId', stepId));
  if (after !== null && (after === stepId || !process.steps.some((s) => s.id === after))) {
    return err(unknown('after', after));
  }
  const step = process.steps[index] as ProcessStep;
  if ((index === 0 ? null : (process.steps[index - 1] as ProcessStep).id) === after) {
    return ok({ kind: 'unchanged', process });
  }

  const rest = process.steps.filter((s) => s.id !== stepId);
  const reordered = placed(rest, step, after);
  if (isTopologicalOrder(reordered)) {
    return validated({ kind: 'orderOnly' as const, process: { ...process, steps: reordered } });
  }

  // An alap step keeps its dependencies and its "as late as possible" meaning, and a step never
  // moves below a step that depends on it by a drag: both only move by order only (example 6).
  // A beforeTarget step is scheduled from its target, not from its place (Steps before a target).
  if (step.schedule === 'beforeTarget') return err(ambiguous('scheduledFromTarget'));
  if (step.schedule === 'alap' || (after !== null && descendants(process, stepId).has(after))) {
    return err(firstViolation(reordered));
  }
  if ((step.incorporations ?? []).length > 0) return err(ambiguous('incorporationStep'));
  if (step.dependsOn.length > 1) return err(ambiguous('stepDependencies'));
  const dependents = rest.filter((s) => s.dependsOn.includes(stepId));
  if (dependents.length > 1) return err(ambiguous('stepDependents'));

  const p = step.dependsOn[0];
  const t = dependents[0];
  // Out of the old place: T takes the step's dependency instead of the step.
  const out = rest.map((s) =>
    s === t
      ? {
          ...s,
          dependsOn: [...new Set(s.dependsOn.flatMap((d) => (d === stepId ? (p ?? []) : [d])))],
        }
      : s,
  );
  // B, counted after the step is taken out: the target's single dependent, or the first step.
  const targetDependents =
    after === null ? out.slice(0, 1) : out.filter((s) => s.dependsOn.includes(after));
  if (targetDependents.length > 1) return err(ambiguous('targetDependents'));
  const b = targetDependents[0];

  const subject = subjectOf(process, step);
  // T and B may also be the step where the step's component joins the dough: the step stays
  // among its component's phases, upstream of the join (process.md, Move, example 7).
  const join = subject.kind === 'component' ? joinOf(process, subject.id)?.id : undefined;
  const neighbours = [p, t?.id, after, b?.id].flatMap((id) =>
    id === undefined || id === null ? [] : [process.steps.find((s) => s.id === id) as ProcessStep],
  );
  if (
    neighbours.some(
      (n) =>
        !sameSubject(subjectOf(process, n), subject) &&
        !(n.id === join && (n === t || n.id === b?.id)),
    )
  ) {
    return err(ambiguous('crossesWorkpiece'));
  }

  // Into the new place: the step depends on the target, and B takes the step instead of it.
  const moved: ProcessStep = { ...step, dependsOn: after === null ? [] : [after] };
  const into = out.map((s) =>
    s.id === b?.id
      ? {
          ...s,
          dependsOn: after === null ? [stepId] : s.dependsOn.map((d) => (d === after ? stepId : d)),
        }
      : s,
  );
  const steps = placed(into, moved, after);
  if (!isTopologicalOrder(steps)) return err(firstViolation(steps));

  const before = new Map(process.steps.map((s) => [s.id, s.dependsOn]));
  const changedEdges = [t?.id, stepId, b?.id].flatMap((id) => {
    if (id === undefined) return [];
    const was = before.get(id) ?? [];
    const now = (steps.find((s) => s.id === id) as ProcessStep).dependsOn;
    return was.length === now.length && was.every((d, i) => d === now[i])
      ? []
      : [{ step: id, before: was, after: now }];
  });
  return validated({ kind: 'chain' as const, process: { ...process, steps }, changedEdges });
};

export type NotDuplicableReason = 'alap' | 'workpieceStep';

export type DuplicateError =
  ProcessError | DomainError<'NotDuplicable', { reason: NotDuplicableReason }>;

/** Fields of the original that the copy does not carry, for the interface to list. */
export type NotCarried = 'incorporations' | 'accepted' | 'durationMode' | 'plannedDurationS';

export interface DuplicateResult {
  readonly process: Process;
  readonly copy: ProcessStep;
  readonly notCarried: readonly NotCarried[];
  /** The reprojected plan, when a projection input is given. */
  readonly preview?: Projection;
}

/**
 * Proposes a new step `newId` right after `stepId` (process.md, Duplicate): a reviewed copy, not
 * an exact clone. The copy is `asap`, depends on the original, and takes over its dependents.
 */
export const duplicateStep = (
  process: Process,
  stepId: StepId,
  newId: StepId,
  preview?: ProjectionInput,
): Result<DuplicateResult, DuplicateError> => {
  const index = process.steps.findIndex((s) => s.id === stepId);
  if (index < 0) {
    return err(
      domainError('UnknownReference', `stepId references unknown ${stepId}`, {
        path: 'stepId',
        id: stepId,
      }),
    );
  }
  const original = process.steps[index] as ProcessStep;
  const refuse = (reason: NotDuplicableReason): DuplicateError =>
    domainError('NotDuplicable', `${stepId} cannot be duplicated (${reason})`, { reason });
  if (original.schedule === 'alap') return err(refuse('alap'));
  if (componentIds(process).has(original.id)) return err(refuse('workpieceStep'));

  const manualDuration = original.durationMode !== 'model';
  const copy: ProcessStep = {
    id: newId,
    operation: original.operation,
    ...(original.label === undefined ? {} : { label: original.label }),
    dependsOn: [stepId],
    schedule: 'asap',
    ...(manualDuration && original.plannedDurationS !== undefined
      ? { plannedDurationS: original.plannedDurationS }
      : {}),
    ...(original.endCriterion === undefined ? {} : { endCriterion: original.endCriterion }),
    ...(original.conditions === undefined ? {} : { conditions: original.conditions }),
    ...(original.technique === undefined ? {} : { technique: original.technique }),
    ...(original.equipment === undefined ? {} : { equipment: original.equipment }),
    ...(original.subject === undefined ? {} : { subject: original.subject }),
  };
  const notCarried: NotCarried[] = [
    ...((original.incorporations ?? []).length > 0 ? ['incorporations' as const] : []),
    ...(original.accepted === undefined ? [] : ['accepted' as const]),
    ...(original.durationMode === undefined ? [] : ['durationMode' as const]),
    ...(!manualDuration && original.plannedDurationS !== undefined
      ? ['plannedDurationS' as const]
      : []),
  ];

  const steps = process.steps.map((s) =>
    s.dependsOn.includes(stepId)
      ? { ...s, dependsOn: s.dependsOn.map((d) => (d === stepId ? newId : d)) }
      : s,
  );
  steps.splice(index + 1, 0, copy);
  const next: Process = { ...process, steps };
  const valid = validateProcess(next);
  if (!valid.ok) return valid;
  if (preview === undefined) return ok({ process: next, copy, notCarried });
  const projection = projectProcess(next, preview);
  if (!projection.ok) return projection;
  return ok({ process: next, copy, notCarried, preview: projection.value });
};
