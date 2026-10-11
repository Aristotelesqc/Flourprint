import type { Process, ProcessStep } from '../process/types.js';
import type { BakeEvent, BakeState, StepRecord } from './types.js';

export const initialBakeState = (bakeId: string): BakeState => ({
  bakeId,
  version: 0,
  status: 'notStarted',
  steps: {},
  overrides: [],
  observations: [],
  stepEvents: {},
});

const updateStep = (state: BakeState, stepId: string, change: Partial<StepRecord>): BakeState => ({
  ...state,
  steps: {
    ...state.steps,
    [stepId]: { ...(state.steps[stepId] ?? { measurements: [] }), ...change },
  },
});

const mapSteps = (
  process: Process | undefined,
  map: (step: ProcessStep) => ProcessStep,
): Process => ({ ...process, steps: (process?.steps ?? []).map(map) });

/**
 * Applies one recorded event. Purely structural: it never calls the calculation engine, so an
 * old bake reads the same after any engine change (docs/contracts/history.md).
 */
export const evolve = (state: BakeState, event: BakeEvent): BakeState => {
  const next = { ...state, version: event.seq };
  const payload = event.payload;
  switch (payload.type) {
    case 'BakeStarted': {
      const { snapshot } = payload;
      return {
        ...next,
        status: 'active',
        startedAt: event.occurredAt,
        snapshot,
        formula: snapshot.formula,
        resolvedFormula: snapshot.resolvedFormula,
        process: snapshot.process,
        steps: Object.fromEntries(snapshot.process.steps.map((s) => [s.id, { measurements: [] }])),
      };
    }
    case 'StepStarted':
      return {
        ...updateStep(next, payload.stepId, {
          startedAt: event.occurredAt,
          startEventId: event.eventId,
        }),
        stepEvents: {
          ...next.stepEvents,
          [event.eventId]: { stepId: payload.stepId, kind: 'start' },
        },
      };
    case 'StepCompleted':
      return {
        ...updateStep(next, payload.stepId, {
          endedAt: event.occurredAt,
          endEventId: event.eventId,
          measurements: [
            ...(next.steps[payload.stepId]?.measurements ?? []),
            ...(payload.measurements ?? []),
          ],
        }),
        stepEvents: {
          ...next.stepEvents,
          [event.eventId]: { stepId: payload.stepId, kind: 'end' },
        },
      };
    case 'OverrideApplied': {
      const recorded = [
        ...next.overrides,
        { eventId: event.eventId, occurredAt: event.occurredAt, payload },
      ];
      if ('derived' in payload) {
        return {
          ...next,
          overrides: recorded,
          formula: payload.derived.formula,
          resolvedFormula: payload.derived.resolvedFormula,
        };
      }
      const { target, effective } = payload;
      return {
        ...next,
        overrides: recorded,
        process: mapSteps(next.process, (s) => {
          if (s.id !== target.stepId) return s;
          if (target.field === 'plannedDurationS') {
            // A manual duration is no longer the accepted suggestion, nor model-driven, for this
            // bake (fermentation.md); the snapshot keeps the original.
            const { accepted: _accepted, durationMode: _mode, ...manual } = s;
            return { ...manual, plannedDurationS: effective };
          }
          return { ...s, conditions: { ...s.conditions, temperatureC: effective } };
        }),
      };
    }
    case 'StepInserted': {
      const steps = (next.process?.steps ?? []).map((s) =>
        payload.rewired.includes(s.id)
          ? { ...s, dependsOn: s.dependsOn.map((d) => (d === payload.after ? payload.step.id : d)) }
          : s,
      );
      const index = steps.findIndex((s) => s.id === payload.after);
      steps.splice(index + 1, 0, payload.step);
      return {
        ...next,
        process: { steps },
        steps: { ...next.steps, [payload.step.id]: { measurements: [] } },
      };
    }
    case 'ProjectionAccepted':
      return { ...next, acceptedProjection: payload.projection };
    case 'ObservationAdded':
      return {
        ...next,
        observations: [
          ...next.observations,
          { eventId: event.eventId, occurredAt: event.occurredAt, payload },
        ],
      };
    case 'StepTimeCorrected': {
      const target = next.stepEvents[payload.targetEventId];
      if (!target) return next;
      return updateStep(
        next,
        target.stepId,
        target.kind === 'start'
          ? { startedAt: payload.newOccurredAt }
          : { endedAt: payload.newOccurredAt },
      );
    }
    case 'StepCompletionRetracted': {
      const target = next.stepEvents[payload.targetEventId];
      if (!target) return next;
      const { endedAt, endEventId, ...record } = next.steps[target.stepId] ?? {
        measurements: [],
      };
      return { ...next, steps: { ...next.steps, [target.stepId]: record } };
    }
    case 'BakeFinished':
      return { ...next, status: 'finished', endedAt: event.occurredAt };
    case 'BakeAbandoned':
      return { ...next, status: 'abandoned', endedAt: event.occurredAt };
  }
};

export const replayBake = (bakeId: string, events: readonly BakeEvent[]): BakeState =>
  events.reduce(evolve, initialBakeState(bakeId));
