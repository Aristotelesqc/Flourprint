import { domainError, type DomainError } from '../errors.js';
import { applyFormulaEdit } from '../formula/edit.js';
import type { FormulaError } from '../formula/errors.js';
import { resolveFormula } from '../formula/resolve.js';
import type { Instant } from '../instant.js';
import { projectProcess } from '../process/project.js';
import type { Process, Projection, StepFact } from '../process/types.js';
import { validateProcess, type ProcessError } from '../process/validate.js';
import { err, ok, type Result } from '../result.js';
import { CONTRACT_VERSION, ENGINE_VERSION } from '../version.js';
import type { Estimate } from '../values.js';
import type { BakeCommandPayload, BakeState, EventDraft } from './types.js';

export type BakeError =
  | FormulaError
  | ProcessError
  | DomainError<'BakeAlreadyStarted'>
  | DomainError<'BakeNotActive', { status: BakeState['status'] }>
  | DomainError<'UnknownStep', { stepId: string }>
  | DomainError<'DuplicateStepId', { stepId: string }>
  | DomainError<'StepAlreadyStarted', { stepId: string }>
  | DomainError<'StepAlreadyCompleted', { stepId: string }>
  | DomainError<'DependenciesNotCompleted', { stepId: string; pending: string[] }>
  | DomainError<'DependentStepStarted', { stepId: string; dependents: string[] }>
  | DomainError<'InvalidTime', { reason: string }>
  | DomainError<'InvalidCorrection', { targetEventId: string; reason: string }>
  | DomainError<'InvalidCommand', { field: string; reason: string }>;

const UNSUPPORTED_FERMENTATION: Estimate = {
  status: 'unsupported',
  reason: 'no_fermentation_model',
};

const seconds = (instant: Instant): number => Date.parse(instant) / 1000;
const latest = (instants: readonly Instant[]): Instant | undefined =>
  instants.reduce<Instant | undefined>(
    (max, i) => (max === undefined || seconds(i) > seconds(max) ? i : max),
    undefined,
  );

/** Recorded step times as projection facts. */
export const stepFacts = (state: BakeState): Record<string, StepFact> =>
  Object.fromEntries(
    Object.entries(state.steps).map(([id, record]) => [
      id,
      {
        ...(record.startedAt === undefined ? {} : { startedAt: record.startedAt }),
        ...(record.endedAt === undefined ? {} : { endedAt: record.endedAt }),
      },
    ]),
  );

/** Plan origin of a started bake: the earliest start of its initial projection. */
const planOrigin = (projection: Projection): Instant | undefined =>
  Object.values(projection.steps).reduce<Instant | undefined>((min, step) => {
    if (step.start === undefined) return min;
    return min === undefined || seconds(step.start) < seconds(min) ? step.start : min;
  }, undefined);

/** Live plan of an active bake at `now`; recomputed from facts, never stored (history.md). */
export const liveProjection = (
  state: BakeState,
  now: Instant,
): Result<Projection, ProcessError> | undefined => {
  if (!state.snapshot || !state.process) return undefined;
  const origin = planOrigin(state.snapshot.initialProjection) ?? state.startedAt ?? now;
  return projectProcess(state.process, {
    mode: { kind: 'startAt', at: origin },
    facts: stepFacts(state),
    now,
  });
};

const error = <C extends string, D>(code: C, message: string, details: D) =>
  err(domainError(code, message, details));

const requireStep = (state: BakeState, stepId: string): Result<void, BakeError> =>
  state.process?.steps.some((s) => s.id === stepId)
    ? ok(undefined)
    : error('UnknownStep', `Unknown step ${stepId}`, { stepId });

const pendingDependencies = (state: BakeState, process: Process, stepId: string): string[] =>
  (process.steps.find((s) => s.id === stepId)?.dependsOn ?? []).filter(
    (dep) => state.steps[dep]?.endedAt === undefined,
  );

/**
 * Validates a command against the current state and returns the events to record
 * (docs/contracts/bake-session.md). `now` is the injected clock.
 */
export const decide = (
  state: BakeState,
  command: BakeCommandPayload,
  now: Instant,
): Result<EventDraft[], BakeError> => {
  if (command.type === 'StartBake') {
    if (state.status !== 'notStarted')
      return error('BakeAlreadyStarted', 'The bake has already started', undefined);
    const resolved = resolveFormula(command.formula);
    if (!resolved.ok) return resolved;
    const projection = projectProcess(command.process, { mode: command.mode });
    if (!projection.ok) return projection;
    return ok([
      {
        occurredAt: now,
        payload: {
          type: 'BakeStarted',
          snapshot: {
            revisions: command.revisions,
            formula: command.formula,
            resolvedFormula: resolved.value,
            usedProperties: command.usedProperties ?? [],
            process: command.process,
            initialProjection: projection.value,
            estimates: Object.fromEntries(
              command.process.steps.map((s) => [s.id, UNSUPPORTED_FERMENTATION]),
            ),
            manifest: {
              engineVersion: ENGINE_VERSION,
              contractVersion: CONTRACT_VERSION,
              models: [],
            },
          },
        },
      },
    ]);
  }

  if (state.status !== 'active' || !state.process || !state.formula) {
    return error('BakeNotActive', `The bake is ${state.status}`, { status: state.status });
  }
  const process = state.process;

  switch (command.type) {
    case 'StartStep': {
      const known = requireStep(state, command.stepId);
      if (!known.ok) return known;
      if (state.steps[command.stepId]?.startedAt !== undefined) {
        return error('StepAlreadyStarted', `${command.stepId} has already started`, {
          stepId: command.stepId,
        });
      }
      const pending = pendingDependencies(state, process, command.stepId);
      if (pending.length > 0) {
        return error(
          'DependenciesNotCompleted',
          `${command.stepId} waits for ${pending.join(', ')}`,
          {
            stepId: command.stepId,
            pending,
          },
        );
      }
      return ok([
        { occurredAt: command.at ?? now, payload: { type: 'StepStarted', stepId: command.stepId } },
      ]);
    }

    case 'CompleteStep': {
      const known = requireStep(state, command.stepId);
      if (!known.ok) return known;
      const record = state.steps[command.stepId];
      if (record?.endedAt !== undefined) {
        return error('StepAlreadyCompleted', `${command.stepId} is already completed`, {
          stepId: command.stepId,
        });
      }
      const at = command.at ?? now;
      const completed: EventDraft = {
        occurredAt: at,
        payload: {
          type: 'StepCompleted',
          stepId: command.stepId,
          ...(command.measurements === undefined ? {} : { measurements: command.measurements }),
        },
      };
      if (record?.startedAt !== undefined) {
        if (seconds(at) < seconds(record.startedAt)) {
          return error('InvalidTime', 'A step cannot end before it started', {
            reason: 'end before start',
          });
        }
        return ok([completed]);
      }
      const pending = pendingDependencies(state, process, command.stepId);
      if (pending.length > 0) {
        return error(
          'DependenciesNotCompleted',
          `${command.stepId} waits for ${pending.join(', ')}`,
          {
            stepId: command.stepId,
            pending,
          },
        );
      }
      const dependencyEnds = (
        process.steps.find((s) => s.id === command.stepId)?.dependsOn ?? []
      ).map((dep) => state.steps[dep]?.endedAt as Instant);
      const ready = latest(dependencyEnds) ?? state.startedAt ?? at;
      const start = seconds(ready) <= seconds(at) ? ready : at;
      return ok([
        { occurredAt: start, payload: { type: 'StepStarted', stepId: command.stepId } },
        completed,
      ]);
    }

    case 'AdjustStep': {
      const known = requireStep(state, command.stepId);
      if (!known.ok) return known;
      if (state.steps[command.stepId]?.endedAt !== undefined) {
        return error('StepAlreadyCompleted', `${command.stepId} is already completed`, {
          stepId: command.stepId,
        });
      }
      const { field, value } = command.adjustment;
      if (!Number.isFinite(value) || (field === 'plannedDurationS' && value < 0)) {
        return error('InvalidCommand', `Invalid ${field}`, {
          field,
          reason: 'must be a finite value, durations ≥ 0',
        });
      }
      const step = process.steps.find((s) => s.id === command.stepId);
      const baseline =
        field === 'plannedDurationS' ? step?.plannedDurationS : step?.conditions?.temperatureC;
      return ok([
        {
          occurredAt: now,
          payload: {
            type: 'OverrideApplied',
            target: { kind: 'step', stepId: command.stepId, field },
            baseline: baseline ?? null,
            effective: value,
            unit: field === 'plannedDurationS' ? 's' : 'degC',
            ...(command.reason === undefined ? {} : { reason: command.reason }),
          },
        },
      ]);
    }

    case 'AdjustFormula': {
      const edited = applyFormulaEdit(state.formula, command.edit);
      if (!edited.ok) return edited;
      const resolved = resolveFormula(edited.value);
      if (!resolved.ok) return resolved;
      return ok([
        {
          occurredAt: now,
          payload: {
            type: 'OverrideApplied',
            target: { kind: 'formula' },
            edit: command.edit,
            derived: { formula: edited.value, resolvedFormula: resolved.value },
            ...(command.reason === undefined ? {} : { reason: command.reason }),
          },
        },
      ]);
    }

    case 'InsertStepAfter': {
      const known = requireStep(state, command.after);
      if (!known.ok) return known;
      if (process.steps.some((s) => s.id === command.step.id)) {
        return error('DuplicateStepId', `Step ${command.step.id} already exists`, {
          stepId: command.step.id,
        });
      }
      const step = { ...command.step, dependsOn: [command.after] };
      const rewired = process.steps
        .filter(
          (s) => s.dependsOn.includes(command.after) && state.steps[s.id]?.startedAt === undefined,
        )
        .map((s) => s.id);
      const steps = process.steps.map((s) =>
        rewired.includes(s.id)
          ? { ...s, dependsOn: s.dependsOn.map((d) => (d === command.after ? step.id : d)) }
          : s,
      );
      steps.splice(steps.findIndex((s) => s.id === command.after) + 1, 0, step);
      const valid = validateProcess({ steps });
      if (!valid.ok) return valid;
      return ok([
        { occurredAt: now, payload: { type: 'StepInserted', after: command.after, step, rewired } },
      ]);
    }

    case 'AcceptProjection': {
      const projection = liveProjection(state, now);
      if (!projection)
        return error('BakeNotActive', 'The bake has no plan', { status: state.status });
      if (!projection.ok) return projection;
      return ok([
        { occurredAt: now, payload: { type: 'ProjectionAccepted', projection: projection.value } },
      ]);
    }

    case 'AddObservation': {
      if (command.stepId !== undefined) {
        const known = requireStep(state, command.stepId);
        if (!known.ok) return known;
      }
      if (command.rating !== undefined && !(command.rating >= 0 && command.rating <= 5)) {
        return error('InvalidCommand', 'Rating must be within [0, 5]', {
          field: 'rating',
          reason: 'out of range',
        });
      }
      const { type, ...observation } = command;
      return ok([{ occurredAt: now, payload: { type: 'ObservationAdded', ...observation } }]);
    }

    case 'CorrectStepTime': {
      const target = state.stepEvents[command.targetEventId];
      if (!target) {
        return error('InvalidCorrection', 'Only step starts and completions can be corrected', {
          targetEventId: command.targetEventId,
          reason: 'not a step time event',
        });
      }
      const record = state.steps[target.stepId];
      const current = target.kind === 'start' ? record?.startEventId : record?.endEventId;
      if (current !== command.targetEventId) {
        return error('InvalidCorrection', 'The targeted time is no longer in effect', {
          targetEventId: command.targetEventId,
          reason: 'superseded or retracted',
        });
      }
      const next = seconds(command.newOccurredAt);
      const consistent =
        target.kind === 'start'
          ? record?.endedAt === undefined || next <= seconds(record.endedAt)
          : record?.startedAt === undefined || next >= seconds(record.startedAt);
      if (!consistent) {
        return error('InvalidCorrection', 'A step cannot end before it started', {
          targetEventId: command.targetEventId,
          reason: 'end before start',
        });
      }
      return ok([
        {
          occurredAt: now,
          payload: {
            type: 'StepTimeCorrected',
            targetEventId: command.targetEventId,
            newOccurredAt: command.newOccurredAt,
          },
        },
      ]);
    }

    case 'RetractCompletion': {
      const target = state.stepEvents[command.targetEventId];
      if (
        !target ||
        target.kind !== 'end' ||
        state.steps[target.stepId]?.endEventId !== command.targetEventId
      ) {
        return error(
          'InvalidCorrection',
          'Only the current completion of a step can be retracted',
          {
            targetEventId: command.targetEventId,
            reason: 'not the current completion',
          },
        );
      }
      const dependents = process.steps
        .filter(
          (s) => s.dependsOn.includes(target.stepId) && state.steps[s.id]?.startedAt !== undefined,
        )
        .map((s) => s.id);
      if (dependents.length > 0) {
        return error('DependentStepStarted', `Steps after ${target.stepId} have started`, {
          stepId: target.stepId,
          dependents,
        });
      }
      return ok([
        {
          occurredAt: now,
          payload: { type: 'StepCompletionRetracted', targetEventId: command.targetEventId },
        },
      ]);
    }

    case 'FinishBake':
      return ok([{ occurredAt: command.at ?? now, payload: { type: 'BakeFinished' } }]);

    case 'AbandonBake':
      return ok([
        {
          occurredAt: now,
          payload: {
            type: 'BakeAbandoned',
            ...(command.reason === undefined ? {} : { reason: command.reason }),
          },
        },
      ]);
  }
};
