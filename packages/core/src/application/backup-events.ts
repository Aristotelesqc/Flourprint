import { evolve, initialBakeState, type BakeEvent, type BakeState } from '../domain/index.js';
import {
  expect,
  isAmounts,
  isCount,
  isId,
  isInstant,
  isNumber,
  isObject,
  isOptional,
  refuse,
  type Json,
} from './decode.js';

/**
 * Decodes one bake log from a backup (persistence.md): every payload is checked for its type's
 * shape and its references against the history replayed so far. Recorded engine outputs are
 * checked for shape only and kept as they are; no command decision is re-run (history.md).
 */

const OBSERVATION_CATEGORIES = new Set([
  'crumb',
  'crust',
  'fermentation',
  'flavor',
  'handling',
  'volume',
  'other',
]);
const FORMULA_EDITS = new Set(['SetBakerPct', 'SetFlourBlend', 'SetIngredientGrams', 'SetAnchor']);

const isRevisionRef = (value: unknown): boolean =>
  isObject(value) && isId(value.id) && isCount(value.version);

const isFormulaShape = (value: unknown): boolean =>
  isObject(value) &&
  isObject(value.anchor) &&
  [value.flours, value.ingredients, value.components].every(
    (list) => Array.isArray(list) && list.every((item) => isObject(item) && isId(item.id)),
  );

const isResolvedComponent = (value: unknown): boolean =>
  isObject(value) &&
  [value.flour, value.water, value.waterLoss, value.mass].every(isNumber) &&
  isAmounts(value.flourByFlour) &&
  isAmounts(value.allocations);

const isWaterBalance = (value: unknown): boolean =>
  isObject(value) &&
  isNumber(value.value) &&
  (value.completeness === 'complete' || value.completeness === 'incomplete') &&
  Array.isArray(value.unknownContributors) &&
  value.unknownContributors.every(isId) &&
  Array.isArray(value.contributions) &&
  value.contributions.every((c) => isObject(c) && isId(c.source) && isNumber(c.grams));

const isResolvedFormula = (value: unknown): boolean =>
  isObject(value) &&
  isObject(value.anchor) &&
  [
    value.flourTotal,
    value.doughWeight,
    value.losses,
    value.pureWaterTotal,
    value.finalMixWater,
    value.pureWaterPct,
    value.totalWaterPct,
  ].every(isNumber) &&
  [value.bakerPct, value.flourByFlour, value.grams].every(isAmounts) &&
  isObject(value.components) &&
  Object.entries(value.components).every(([id, c]) => isId(id) && isResolvedComponent(c)) &&
  isObject(value.finalMix) &&
  isNumber(value.finalMix.water) &&
  [value.finalMix.flourByFlour, value.finalMix.grams, value.finalMix.componentMasses].every(
    isAmounts,
  ) &&
  isWaterBalance(value.totalWater);

const isStepShape = (value: unknown): value is Json =>
  isObject(value) &&
  isId(value.id) &&
  typeof value.operation === 'string' &&
  Array.isArray(value.dependsOn) &&
  value.dependsOn.every(isId) &&
  (value.schedule === 'asap' || value.schedule === 'alap') &&
  isOptional(value.plannedDurationS, isNumber);

const isProcessShape = (value: unknown): boolean => {
  if (!isObject(value) || !Array.isArray(value.steps)) return false;
  const ids = new Set<string>();
  for (const step of value.steps) {
    if (!isStepShape(step) || ids.has(step.id as string)) return false;
    ids.add(step.id as string);
  }
  return value.steps.every((step) =>
    (step as Json & { dependsOn: string[] }).dependsOn.every((d) => ids.has(d)),
  );
};

const isProjection = (value: unknown): boolean =>
  isObject(value) &&
  isObject(value.mode) &&
  isObject(value.steps) &&
  Object.entries(value.steps).every(
    ([id, s]) =>
      isId(id) && isObject(s) && typeof s.status === 'string' && Array.isArray(s.unknownAfter),
  );

const isMeasurement = (value: unknown): boolean =>
  isObject(value) &&
  isNumber(value.value) &&
  typeof value.unit === 'string' &&
  isInstant(value.observedAt);

const isSnapshot = (value: unknown): boolean =>
  isObject(value) &&
  isObject(value.revisions) &&
  isRevisionRef(value.revisions.formula) &&
  isRevisionRef(value.revisions.process) &&
  isFormulaShape(value.formula) &&
  isResolvedFormula(value.resolvedFormula) &&
  Array.isArray(value.usedProperties) &&
  isProcessShape(value.process) &&
  isProjection(value.initialProjection) &&
  isObject(value.estimates) &&
  isObject(value.manifest) &&
  typeof value.manifest.engineVersion === 'string' &&
  typeof value.manifest.contractVersion === 'string' &&
  Array.isArray(value.manifest.models);

/** Checks one payload against the state before it; throws `Refused` with the reason. */
const checkPayload = (state: BakeState, payload: Json, where: string): void => {
  const stepIds = new Set((state.process?.steps ?? []).map((s) => s.id));
  const knownStep = (id: unknown) => isId(id) && stepIds.has(id);
  const knownTimeEvent = (id: unknown) => typeof id === 'string' && id in state.stepEvents;

  if (state.status === 'notStarted') {
    expect(payload.type === 'BakeStarted', `${where}: a bake log starts with BakeStarted`);
  } else {
    expect(state.status === 'active', `${where}: the bake had already ended`);
  }

  switch (payload.type) {
    case 'BakeStarted':
      expect(state.status === 'notStarted', `${where}: the bake had already started`);
      expect(isSnapshot(payload.snapshot), `${where}: malformed snapshot`);
      return;
    case 'StepStarted':
      expect(knownStep(payload.stepId), `${where}: unknown step`);
      return;
    case 'StepCompleted':
      expect(knownStep(payload.stepId), `${where}: unknown step`);
      expect(
        payload.measurements === undefined ||
          (Array.isArray(payload.measurements) && payload.measurements.every(isMeasurement)),
        `${where}: malformed measurements`,
      );
      return;
    case 'OverrideApplied': {
      const target = payload.target;
      expect(isObject(target), `${where}: malformed override`);
      if (isObject(target) && target.kind === 'step') {
        expect(knownStep(target.stepId), `${where}: unknown step`);
        const unit =
          target.field === 'plannedDurationS'
            ? 's'
            : target.field === 'temperatureC'
              ? 'degC'
              : undefined;
        expect(
          unit !== undefined &&
            payload.unit === unit &&
            isNumber(payload.effective) &&
            (payload.baseline === null || isNumber(payload.baseline)),
          `${where}: malformed override`,
        );
        return;
      }
      expect(
        isObject(target) &&
          target.kind === 'formula' &&
          isObject(payload.edit) &&
          FORMULA_EDITS.has(payload.edit.type as string) &&
          isObject(payload.derived) &&
          isFormulaShape(payload.derived.formula) &&
          isResolvedFormula(payload.derived.resolvedFormula),
        `${where}: malformed override`,
      );
      return;
    }
    case 'StepInserted':
      expect(
        knownStep(payload.after) &&
          isStepShape(payload.step) &&
          !stepIds.has(payload.step.id as string) &&
          Array.isArray(payload.rewired) &&
          payload.rewired.every(knownStep),
        `${where}: malformed step insertion`,
      );
      return;
    case 'ProjectionAccepted':
      expect(isProjection(payload.projection), `${where}: malformed projection`);
      return;
    case 'ObservationAdded':
      expect(
        (payload.stepId === undefined || knownStep(payload.stepId)) &&
          OBSERVATION_CATEGORIES.has(payload.category as string) &&
          isOptional(payload.text, (v): v is string => typeof v === 'string') &&
          isOptional(payload.rating, isNumber) &&
          (payload.measurement === undefined || isMeasurement(payload.measurement)),
        `${where}: malformed observation`,
      );
      return;
    case 'StepTimeCorrected':
      expect(
        knownTimeEvent(payload.targetEventId) && isInstant(payload.newOccurredAt),
        `${where}: malformed time correction`,
      );
      return;
    case 'StepCompletionRetracted':
      expect(
        knownTimeEvent(payload.targetEventId) &&
          state.stepEvents[payload.targetEventId as string]?.kind === 'end',
        `${where}: malformed retraction`,
      );
      return;
    case 'BakeFinished':
      return;
    case 'BakeAbandoned':
      expect(
        isOptional(payload.reason, (v): v is string => typeof v === 'string'),
        `${where}: malformed reason`,
      );
      return;
    default:
      refuse(`${where}: unknown event type`);
  }
};

/** Replays checked events; returns the final state. Envelopes must already be decoded. */
export const checkBakeLog = (bakeId: string, events: readonly BakeEvent[]): BakeState => {
  let state = initialBakeState(bakeId);
  for (const event of events) {
    checkPayload(state, event.payload as unknown as Json, `event ${event.seq} of ${bakeId}`);
    state = evolve(state, event);
  }
  return state;
};
