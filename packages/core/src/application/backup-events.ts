import {
  equipmentCopiesProblem,
  equipmentUses,
  evolve,
  initialBakeState,
  outcomeProblem,
  stepEquipmentProblem,
  type BakeEvent,
  type BakeState,
  type EquipmentEntry,
  type EquipmentUse,
  type PreparationOutcome,
  type ProcessStep,
  type StepEquipment,
} from '../domain/index.js';
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
import { decodeFormula, decodeProcess, estimateRange, stepEquipment } from './documents.js';
import { decodeEquipmentEntry } from './equipment.js';

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
const FORMULA_EDITS = new Set([
  'SetBakerPct',
  'SetFlourBlend',
  'SetIngredientGrams',
  'SetAnchor',
  'AddIngredient',
  'UpdateIngredient',
  'ApplyIngredientEntry',
  'RefreshIngredientEntry',
  'DetachIngredientEntry',
  'RemoveIngredient',
  'AddComponent',
  'UpdateComponent',
  'RemoveComponent',
  'LockTotalWater',
  'UnlockTotalWater',
]);

const isRevisionRef = (value: unknown): boolean =>
  isObject(value) && isId(value.id) && isCount(value.version);

/** A structural decoder used as a predicate: true when it accepts the value. */
const accepts =
  (decode: (value: unknown, where: string) => unknown) =>
  (value: unknown): boolean => {
    try {
      decode(value, 'value');
      return true;
    } catch {
      return false;
    }
  };

const isFormulaShape = accepts(decodeFormula);

const isAnchor = (value: unknown): boolean =>
  isObject(value) &&
  (((value.kind === 'flourTotal' || value.kind === 'doughWeight') && isNumber(value.grams)) ||
    (value.kind === 'pieces' && isNumber(value.count) && isNumber(value.gramsEach)));

const isModelRef = (value: unknown): boolean =>
  isObject(value) && typeof value.id === 'string' && typeof value.version === 'string';

const isResolvedComponent = (value: unknown): boolean =>
  isObject(value) &&
  [value.flour, value.water, value.waterLoss, value.mass].every(isNumber) &&
  isAmounts(value.flourByFlour) &&
  isAmounts(value.allocations);

const isWaterBalance = (value: unknown): value is Json =>
  isObject(value) &&
  isNumber(value.value) &&
  (value.completeness === 'complete' || value.completeness === 'incomplete') &&
  Array.isArray(value.unknownContributors) &&
  value.unknownContributors.every(isId) &&
  Array.isArray(value.contributions) &&
  value.contributions.every(
    (c) =>
      isObject(c) &&
      isId(c.source) &&
      isNumber(c.grams) &&
      (c.status === 'known' || c.status === 'estimated') &&
      ['pureWater', 'ingredient', 'loss'].includes(c.kind as string),
  );

const isResolvedFormula = (value: unknown): boolean =>
  isObject(value) &&
  isAnchor(value.anchor) &&
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
  isWaterBalance(value.totalWater) &&
  isOptional(value.totalFat, isWaterBalance) &&
  isOptional(value.totalSugar, isWaterBalance) &&
  isOptional(value.totalFatPct, isNumber) &&
  isOptional(value.totalSugarPct, isNumber);

/** One process step, structurally (its references are checked by the caller). */
const isStepShape = (value: unknown): value is Json => accepts(decodeProcess)({ steps: [value] });

const isProcessShape = (value: unknown): boolean => {
  if (!accepts(decodeProcess)(value)) return false;
  const steps = (value as Json & { steps: { id: string; dependsOn: string[] }[] }).steps;
  const ids = new Set(steps.map((step) => step.id));
  return (
    ids.size === steps.length && steps.every((step) => step.dependsOn.every((d) => ids.has(d)))
  );
};

const isProjectionMode = (value: unknown): boolean =>
  isObject(value) &&
  ((value.kind === 'startAt' && isInstant(value.at)) ||
    (value.kind === 'readyBy' && isInstant(value.at) && isId(value.target)));

const isProjectedStep = (value: unknown): boolean =>
  isObject(value) &&
  ['done', 'inProgress', 'planned'].includes(value.status as string) &&
  isOptional(value.start, isInstant) &&
  isOptional(value.end, isInstant) &&
  Array.isArray(value.unknownAfter) &&
  value.unknownAfter.every(isId);

const isProjection = (value: unknown): boolean =>
  isObject(value) &&
  isProjectionMode(value.mode) &&
  isObject(value.steps) &&
  Object.entries(value.steps).every(([id, s]) => isId(id) && isProjectedStep(s));

const isMeasurement = (value: unknown): boolean =>
  isObject(value) &&
  isNumber(value.value) &&
  typeof value.unit === 'string' &&
  isInstant(value.observedAt);

const isEquipmentShape = accepts(stepEquipment);

/** Settings of a step: the structure, then the domain's rules (equipment.md). */
const isStepEquipment = (value: unknown): value is StepEquipment =>
  isEquipmentShape(value) && stepEquipmentProblem(value as StepEquipment) === undefined;

/** A list of entry copies, each structurally and semantically valid. */
const isEntryList = (value: unknown): value is EquipmentEntry[] =>
  Array.isArray(value) && value.every(accepts(decodeEquipmentEntry));

const stepUses = (steps: readonly Pick<ProcessStep, 'equipment'>[]): EquipmentUse[] =>
  steps.flatMap((step, i) =>
    step.equipment === undefined ? [] : equipmentUses(step.equipment, `steps[${i}].equipment`),
  );

/** Snapshot copies: valid, and every reference of the process resolves to the right kind. */
const snapshotEquipmentOk = (snapshot: Json): boolean => {
  const copies = snapshot.equipment === undefined ? [] : (snapshot.equipment as EquipmentEntry[]);
  const steps = (snapshot.process as { steps: ProcessStep[] }).steps;
  if (!steps.every((s) => s.equipment === undefined || isStepEquipment(s.equipment))) return false;
  return equipmentCopiesProblem(stepUses(steps), [], copies) === undefined;
};

const isSnapshot = (value: unknown): boolean =>
  isObject(value) &&
  isObject(value.revisions) &&
  isRevisionRef(value.revisions.formula) &&
  isRevisionRef(value.revisions.process) &&
  isFormulaShape(value.formula) &&
  isResolvedFormula(value.resolvedFormula) &&
  Array.isArray(value.usedProperties) &&
  value.usedProperties.every(
    (p) =>
      isObject(p) &&
      isId(p.ingredient) &&
      isCount(p.version) &&
      typeof p.key === 'string' &&
      'value' in p &&
      (p.customized === undefined || p.customized === true) &&
      (p.overridden === undefined || p.overridden === true) &&
      isOptional(p.formulaIngredient, isId),
  ) &&
  isProcessShape(value.process) &&
  isProjection(value.initialProjection) &&
  isObject(value.estimates) &&
  Object.entries(value.estimates).every(
    ([id, e]) =>
      isId(id) &&
      isObject(e) &&
      ['ok', 'unsupported', 'out_of_domain', 'insufficient_data'].includes(e.status as string) &&
      (e.status !== 'ok' ||
        (isNumber(e.value) &&
          isModelRef(e.model) &&
          isOptional(e.range, (r): r is unknown => accepts(estimateRange)(r)))),
  ) &&
  isOptional(value.origin, (v): v is string => v === 'physical' || v === 'simulation') &&
  isOptional(value.flours, (v): v is unknown[] => Array.isArray(v) && v.every(isRevisionRef)) &&
  isOptional(value.equipment, isEntryList) &&
  snapshotEquipmentOk(value) &&
  isObject(value.manifest) &&
  typeof value.manifest.engineVersion === 'string' &&
  typeof value.manifest.contractVersion === 'string' &&
  Array.isArray(value.manifest.models) &&
  value.manifest.models.every(isModelRef);

/** A fold set within 1 … count of the step's folds (bake-session.md). */
const isFoldSet = (state: BakeState, stepId: unknown, set: unknown): boolean => {
  const folds = state.process?.steps.find((s) => s.id === stepId)?.technique?.folds;
  return (
    folds !== undefined &&
    typeof set === 'number' &&
    Number.isInteger(set) &&
    set >= 1 &&
    set <= folds.count
  );
};

/** A preparation outcome (bake-session.md), checked by the domain's own rule. */
const isOutcome = (value: unknown): boolean => {
  if (!isObject(value)) return false;
  if (Object.keys(value).some((k) => k !== 'result' && k !== 'dough' && k !== 'pieces')) {
    return false;
  }
  return outcomeProblem(value as unknown as PreparationOutcome) === undefined;
};

/** Checks one payload against the state before it; throws `Refused` with the reason. */
const checkPayload = (state: BakeState, payload: Json, where: string): void => {
  const stepIds = new Set((state.process?.steps ?? []).map((s) => s.id));
  const knownStep = (id: unknown) => isId(id) && stepIds.has(id);
  const knownTimeEvent = (id: unknown) => typeof id === 'string' && id in state.stepEvents;

  if (state.status === 'notStarted') {
    expect(payload.type === 'BakeStarted', `${where}: a bake log starts with BakeStarted`);
  } else if (state.status !== 'active') {
    // After the end: notes of the review, an outcome correction or a reopening (bake-session.md).
    expect(
      (payload.type === 'ObservationAdded' && payload.kind === undefined) ||
        (payload.type === 'OutcomeCorrected' && state.status === 'finished') ||
        payload.type === 'BakeReopened',
      `${where}: the bake had already ended`,
    );
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
      if (isObject(target) && target.kind === 'step' && target.field === 'equipment') {
        expect(knownStep(target.stepId), `${where}: unknown step`);
        const copies = payload.equipment === undefined ? [] : payload.equipment;
        expect(
          isStepEquipment(payload.effective) &&
            (payload.baseline === null || isStepEquipment(payload.baseline)) &&
            payload.unit === undefined &&
            isOptional(payload.reason, (v): v is string => typeof v === 'string') &&
            isOptional(payload.equipment, isEntryList) &&
            equipmentCopiesProblem(
              equipmentUses(payload.effective as StepEquipment),
              state.equipment ?? [],
              copies as EquipmentEntry[],
            ) === undefined,
          `${where}: malformed equipment override`,
        );
        return;
      }
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
          payload.rewired.every(knownStep) &&
          isOptional(payload.equipment, isEntryList) &&
          ((payload.step as unknown as ProcessStep).equipment === undefined ||
            isStepEquipment((payload.step as unknown as ProcessStep).equipment)) &&
          equipmentCopiesProblem(
            stepUses([payload.step as unknown as ProcessStep]),
            state.equipment ?? [],
            (payload.equipment ?? []) as EquipmentEntry[],
          ) === undefined,
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
          isOptional(payload.kind, (v): v is string => v === 'doughReady' || v === 'fold') &&
          isOptional(payload.criterion, (v): v is string => typeof v === 'string') &&
          (payload.kind !== 'doughReady' ||
            (payload.stepId !== undefined && payload.category === 'fermentation')) &&
          (payload.kind === 'fold'
            ? payload.category === 'handling' && isFoldSet(state, payload.stepId, payload.set)
            : payload.set === undefined) &&
          isOptional(payload.text, (v): v is string => typeof v === 'string') &&
          isOptional(payload.rating, (v): v is number => isNumber(v) && v >= 0 && v <= 5) &&
          isOptional(payload.stage, (v): v is string => v === 'shape' || v === 'bake') &&
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
      // Before 0.11.0 a finish has neither: its result is unknown.
      expect(
        payload.outcome === undefined
          ? payload.outcomeSource === undefined
          : isOutcome(payload.outcome) &&
              (payload.outcomeSource === 'recipe' || payload.outcomeSource === 'baker'),
        `${where}: malformed outcome`,
      );
      return;
    case 'OutcomeCorrected':
      expect(
        isOutcome(payload.outcome) && payload.outcomeSource === 'baker',
        `${where}: malformed outcome`,
      );
      return;
    case 'BakeReopened':
      expect(state.status !== 'active', `${where}: the bake was not ended`);
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
