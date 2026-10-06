import { domainError } from '../errors.js';
import type { Instant } from '../instant.js';
import { err, ok, type Result } from '../result.js';
import type {
  Process,
  ProcessStep,
  ProjectedStep,
  Projection,
  ProjectionInput,
  StepId,
} from './types.js';
import { validateProcess, type ProcessError } from './validate.js';

/** A time in seconds since the epoch, or the steps whose unknown end blocks it. */
type Time =
  | { readonly known: true; readonly at: number }
  | { readonly known: false; readonly blockers: StepId[] };

const known = (at: number): Time => ({ known: true, at });
const blocked = (blockers: Iterable<StepId>): Time => ({
  known: false,
  blockers: [...new Set(blockers)].sort(),
});

const toSeconds = (instant: Instant): number => Date.parse(instant) / 1000;
const toInstant = (seconds: number): Instant =>
  new Date(Math.round(seconds * 1000)).toISOString() as Instant;

interface Slot {
  start: Time;
  end: Time;
  status: ProjectedStep['status'];
}

/**
 * Plans the process (docs/contracts/process.md): recorded facts are frozen, `asap` steps are
 * placed by a forward pass, then `alap` steps not started yet by a backward pass.
 */
export const projectProcess = (
  process: Process,
  input: ProjectionInput,
): Result<Projection, ProcessError> => {
  const valid = validateProcess(process);
  if (!valid.ok) return valid;
  const facts = input.facts ?? {};

  if (input.mode.kind === 'readyBy') {
    if (Object.keys(facts).length > 0) {
      return err(
        domainError('IncompatibleConstraint', 'Ready-by only applies before the bake has started', {
          reason: 'ready-by with recorded facts',
          field: 'mode',
        }),
      );
    }
    const target = input.mode.target;
    if (!process.steps.some((step) => step.id === target)) {
      return err(
        domainError('UnknownReference', `mode.target references unknown ${target}`, {
          path: 'mode.target',
          id: target,
        }),
      );
    }
    const relative = schedule(process, 0, {}, undefined);
    const targetEnd = relative.get(target)?.end;
    if (!targetEnd?.known) {
      return err(
        domainError(
          'IncompatibleConstraint',
          'The target end depends on steps without a duration',
          {
            reason: `unknown durations before ${target}`,
            field: 'mode.target',
          },
        ),
      );
    }
    return ok(
      build(input, schedule(process, toSeconds(input.mode.at) - targetEnd.at, {}, undefined)),
    );
  }

  const now = input.now === undefined ? undefined : toSeconds(input.now);
  return ok(build(input, schedule(process, toSeconds(input.mode.at), facts, now)));
};

const schedule = (
  process: Process,
  origin: number,
  facts: NonNullable<ProjectionInput['facts']>,
  now: number | undefined,
): Map<StepId, Slot> => {
  const slots = new Map<StepId, Slot>();
  const byId = new Map(process.steps.map((step) => [step.id, step]));
  const endOf = (step: ProcessStep, start: Time): Time =>
    !start.known
      ? start
      : step.plannedDurationS === undefined
        ? blocked([step.id])
        : known(start.at + step.plannedDurationS);

  // Forward pass in list order, which is a topological order.
  for (const step of process.steps) {
    const fact = facts[step.id];
    if (fact?.endedAt !== undefined) {
      const end = toSeconds(fact.endedAt);
      const start = fact.startedAt === undefined ? end : toSeconds(fact.startedAt);
      slots.set(step.id, { start: known(start), end: known(end), status: 'done' });
      continue;
    }
    if (fact?.startedAt !== undefined) {
      const start = known(toSeconds(fact.startedAt));
      slots.set(step.id, { start, end: endOf(step, start), status: 'inProgress' });
      continue;
    }
    const start = earliestStart(step, slots, Math.max(origin, now ?? -Infinity));
    slots.set(step.id, { start, end: endOf(step, start), status: 'planned' });
  }

  // Backward pass: alap steps not started end at the earliest start of their successors.
  const successors = new Map<StepId, StepId[]>();
  for (const step of process.steps) {
    for (const dep of step.dependsOn)
      successors.set(dep, [...(successors.get(dep) ?? []), step.id]);
  }
  for (const step of [...process.steps].reverse()) {
    const slot = slots.get(step.id) as Slot;
    if (step.schedule !== 'alap' || slot.status !== 'planned') continue;
    const starts = (successors.get(step.id) ?? []).map((id) => (slots.get(id) as Slot).start);
    const unknown = starts.filter((t): t is Extract<Time, { known: false }> => !t.known);
    if (unknown.length > 0) {
      const blockers = unknown.flatMap((t) => t.blockers);
      slots.set(step.id, { start: blocked(blockers), end: blocked(blockers), status: 'planned' });
      continue;
    }
    const latestEnd = Math.min(...starts.map((t) => (t as Extract<Time, { known: true }>).at));
    const duration = byId.get(step.id)?.plannedDurationS ?? 0;
    // The forward pass guarantees latestEnd - duration ≥ the earliest feasible start.
    slots.set(step.id, {
      start: known(latestEnd - duration),
      end: known(latestEnd),
      status: 'planned',
    });
  }
  return slots;
};

const earliestStart = (step: ProcessStep, slots: Map<StepId, Slot>, lowerBound: number): Time => {
  const ends = step.dependsOn.map((id) => (slots.get(id) as Slot).end);
  const unknown = ends.filter((t): t is Extract<Time, { known: false }> => !t.known);
  if (unknown.length > 0) return blocked(unknown.flatMap((t) => t.blockers));
  const latestDependency = Math.max(
    -Infinity,
    ...ends.map((t) => (t as Extract<Time, { known: true }>).at),
  );
  return known(Math.max(lowerBound, latestDependency));
};

const build = (input: ProjectionInput, slots: Map<StepId, Slot>): Projection => {
  const steps: Record<StepId, ProjectedStep> = {};
  for (const [id, slot] of slots) {
    const blockers = [
      ...(slot.start.known ? [] : slot.start.blockers),
      ...(slot.end.known ? [] : slot.end.blockers),
    ];
    steps[id] = {
      status: slot.status,
      ...(slot.start.known ? { start: toInstant(slot.start.at) } : {}),
      ...(slot.end.known ? { end: toInstant(slot.end.at) } : {}),
      unknownAfter: [...new Set(blockers)].sort(),
    };
  }
  return { mode: input.mode, steps };
};
