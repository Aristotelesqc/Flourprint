import { domainError, type DomainError } from '../errors.js';
import { doughReadyStage } from '../fermentation/estimate.js';
import { applyFormulaEdit } from '../formula/edit.js';
import type { FormulaError } from '../formula/errors.js';
import type { Instant } from '../instant.js';
import { projectProcess } from '../process/project.js';
import type { Process, Projection, StepFact } from '../process/types.js';
import type { Formula } from '../formula/types.js';
import type { ProcessError } from '../process/validate.js';
import { approxEqual } from '../numeric.js';
import { err, ok, type Result } from '../result.js';
import { validateRecipe } from '../recipe/validate.js';
import { CONTRACT_VERSION, ENGINE_VERSION } from '../version.js';
import type { AcceptedSuggestion, Estimate, ModelRef } from '../values.js';
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

/**
 * Accepted suggestions still in effect in the started revision (fermentation.md): the value must
 * still be the one that was applied. Steps carry their estimate; every model is listed once.
 */
const acceptedDecisions = (
  formula: Formula,
  process: Process,
): { estimates: Record<string, Estimate>; models: ModelRef[] } => {
  const models: ModelRef[] = [];
  const list = (accepted: AcceptedSuggestion | undefined, current: number | undefined) => {
    // Same comparison as the formula's settlement (fermentation.md).
    if (!accepted || current === undefined || !approxEqual(accepted.appliedValue, current)) {
      return undefined;
    }
    if (!models.some((m) => m.id === accepted.model.id && m.version === accepted.model.version)) {
      models.push(accepted.model);
    }
    return accepted;
  };
  const estimates: Record<string, Estimate> = {};
  for (const step of process.steps) {
    const accepted = list(step.accepted, step.plannedDurationS);
    estimates[step.id] = accepted ? accepted.estimate : UNSUPPORTED_FERMENTATION;
  }
  for (const ingredient of formula.ingredients) list(ingredient.accepted, ingredient.bakerPct);
  for (const component of formula.components) {
    for (const a of component.allocations ?? []) list(a.accepted, a.bakerPct);
  }
  return { estimates, models };
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

/** Latest recorded end among a step's dependencies, if any. */
const dependencyEnd = (state: BakeState, process: Process, stepId: string): Instant | undefined =>
  latest(
    (process.steps.find((s) => s.id === stepId)?.dependsOn ?? []).flatMap((dep) => {
      const end = state.steps[dep]?.endedAt;
      return end === undefined ? [] : [end];
    }),
  );

const beforeDependencies = (stepId: string) =>
  error('InvalidTime', `${stepId} cannot start before its dependencies ended`, {
    reason: 'start before a dependency ended',
  });

const pendingDependencies = (state: BakeState, process: Process, stepId: string): string[] =>
  (process.steps.find((s) => s.id === stepId)?.dependsOn ?? []).filter(
    (dep) => state.steps[dep]?.endedAt === undefined,
  );

/** Notes and marks: during the bake, and after its end for the review (bake-session.md). */
const observe = (
  state: BakeState,
  command: Extract<BakeCommandPayload, { type: 'AddObservation' }>,
  now: Instant,
): Result<EventDraft[], BakeError> => {
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
  if (command.kind === 'doughReady') {
    if (command.stepId === undefined) {
      return error('InvalidCommand', 'A dough ready observation targets a step', {
        field: 'stepId',
        reason: 'required for doughReady',
      });
    }
    if (command.category !== 'fermentation') {
      return error('InvalidCommand', 'A dough ready observation is a fermentation one', {
        field: 'category',
        reason: 'must be fermentation for doughReady',
      });
    }
    // Only a running dough step can be judged ready now (bake-session.md).
    const record = state.steps[command.stepId];
    if (record?.startedAt === undefined || record.endedAt !== undefined) {
      return error('InvalidCommand', 'A dough ready observation targets a running step', {
        field: 'stepId',
        reason: 'step not running',
      });
    }
    const stage = state.process ? doughReadyStage(state.process, command.stepId) : undefined;
    if (stage === undefined) {
      return error('InvalidCommand', 'A dough ready observation targets a dough step', {
        field: 'stepId',
        reason: 'not a dough step',
      });
    }
    const { type, ...observation } = command;
    return ok([{ occurredAt: now, payload: { type: 'ObservationAdded', ...observation, stage } }]);
  }
  const { type, ...observation } = command;
  return ok([{ occurredAt: now, payload: { type: 'ObservationAdded', ...observation } }]);
};

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
    const recipe = validateRecipe(command.formula, command.process);
    if (!recipe.ok) return recipe;
    const resolved = ok(recipe.value.resolved);
    const projection = projectProcess(command.process, { mode: command.mode });
    if (!projection.ok) return projection;
    const accepted = acceptedDecisions(command.formula, command.process);
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
            estimates: accepted.estimates,
            manifest: {
              engineVersion: ENGINE_VERSION,
              contractVersion: CONTRACT_VERSION,
              models: accepted.models,
            },
            ...(command.origin === undefined ? {} : { origin: command.origin }),
          },
        },
      },
    ]);
  }

  if (
    command.type === 'AddObservation' &&
    (state.status === 'finished' || state.status === 'abandoned') &&
    command.kind !== 'doughReady'
  ) {
    return observe(state, command, now);
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
      const at = command.at ?? now;
      const ready = dependencyEnd(state, process, command.stepId);
      if (ready !== undefined && seconds(at) < seconds(ready)) {
        return beforeDependencies(command.stepId);
      }
      return ok([{ occurredAt: at, payload: { type: 'StepStarted', stepId: command.stepId } }]);
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
      // The implicit start sits at the latest dependency end, or the bake start (bake-session.md).
      const start = dependencyEnd(state, process, command.stepId) ?? state.startedAt ?? at;
      if (seconds(at) < seconds(start)) return beforeDependencies(command.stepId);
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
      const recipe = validateRecipe(edited.value, process);
      if (!recipe.ok) return recipe;
      const resolved = ok(recipe.value.resolved);
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
      const valid = validateRecipe(state.formula, { steps });
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

    case 'AddObservation':
      return observe(state, command, now);

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
      if (target.kind === 'start') {
        const ready = dependencyEnd(state, process, target.stepId);
        if (ready !== undefined && next < seconds(ready)) {
          return error('InvalidCorrection', 'A step cannot start before its dependencies ended', {
            targetEventId: command.targetEventId,
            reason: 'start before a dependency ended',
          });
        }
      } else {
        const successorStarts = process.steps
          .filter((s) => s.dependsOn.includes(target.stepId))
          .flatMap((s) => {
            const started = state.steps[s.id]?.startedAt;
            return started === undefined ? [] : [seconds(started)];
          });
        if (successorStarts.some((start) => next > start)) {
          return error('InvalidCorrection', 'A step cannot end after a following step started', {
            targetEventId: command.targetEventId,
            reason: 'end after a successor started',
          });
        }
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
