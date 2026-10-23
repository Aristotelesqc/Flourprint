import type { EquipmentEntry, StepEquipment } from '../equipment/types.js';
import type { Process, ProcessStep } from '../process/types.js';
import type { BakeEvent, BakeState, EquipmentOverride, StepRecord } from './types.js';

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

const withCopies = (state: BakeState, copies: readonly EquipmentEntry[] | undefined): BakeState =>
  copies === undefined || copies.length === 0
    ? state
    : { ...state, equipment: [...(state.equipment ?? []), ...copies] };

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
        ...(snapshot.equipment === undefined ? {} : { equipment: snapshot.equipment }),
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
      if (payload.target.field === 'equipment') {
        const override = payload as EquipmentOverride;
        const { stepId } = override.target;
        const settings: StepEquipment = override.effective;
        return {
          ...withCopies(next, override.equipment),
          overrides: recorded,
          process: mapSteps(next.process, (s) =>
            s.id === stepId ? { ...s, equipment: settings } : s,
          ),
        };
      }
      const { target } = payload;
      const effective = payload.effective as number;
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
        ...withCopies(next, payload.equipment),
        process: { ...next.process, steps },
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
    case 'StepCountdownHeld': {
      const holds = next.steps[payload.stepId]?.holds ?? [];
      return updateStep(next, payload.stepId, {
        holds: [...holds, { from: event.occurredAt }],
      });
    }
    case 'StepCountdownReleased': {
      const holds = [...(next.steps[payload.stepId]?.holds ?? [])];
      const last = holds[holds.length - 1];
      if (last === undefined || last.to !== undefined) return next;
      holds[holds.length - 1] = { from: last.from, to: event.occurredAt };
      return updateStep(next, payload.stepId, { holds });
    }
    case 'BakeFinished': {
      const { outcome: _outcome, outcomeSource: _source, ...rest } = next;
      return {
        ...rest,
        status: 'finished',
        endedAt: event.occurredAt,
        ...(payload.outcome === undefined ? {} : { outcome: payload.outcome }),
        ...(payload.outcomeSource === undefined ? {} : { outcomeSource: payload.outcomeSource }),
      };
    }
    case 'BakeAbandoned': {
      const { outcome: _outcome, outcomeSource: _source, ...rest } = next;
      return { ...rest, status: 'abandoned', endedAt: event.occurredAt };
    }
    case 'OutcomeCorrected':
      return { ...next, outcome: payload.outcome, outcomeSource: payload.outcomeSource };
    case 'BakeReopened': {
      // Only the latest end counts (bake-session.md, Reopening).
      const { endedAt: _end, outcome: _outcome, outcomeSource: _source, ...rest } = next;
      return { ...rest, status: 'active' };
    }
  }
};

export const replayBake = (bakeId: string, events: readonly BakeEvent[]): BakeState =>
  events.reduce(evolve, initialBakeState(bakeId));
