import {
  isCookingStep,
  ok,
  replayBake,
  type BakeEvent,
  type Estimate,
  type FlourRef,
  type IngredientRef,
  type Instant,
  type ModelRef,
  type Observation,
  type ObservationCategory,
  type ObservationKind,
  type OutcomeSource,
  type PreparationOutcome,
  type Result,
  type StepId,
  upcastEvent,
} from '../domain/index.js';
import { exportBackup, type Backup, type BackupError, type BackupStores } from './backup.js';

/** Where the export was taken (docs/contracts/history.md, feedback export). */
export interface FeedbackDevice {
  readonly platform: 'android' | 'desktop' | 'web';
  readonly storage: 'sqlite' | 'memory';
  readonly build: string;
  readonly locale: string;
  readonly timeZone: string;
  readonly utcOffsetMinutes: number;
}

export interface StepDigest {
  readonly id: StepId;
  readonly operation: string;
  /** A cooking operation (process.md), read from the recorded code. */
  readonly cooking: boolean;
  readonly label?: string;
  readonly plannedStartAt?: Instant;
  readonly plannedEndAt?: Instant;
  readonly plannedDurationS?: number;
  readonly baselineDurationS?: number;
  readonly estimate?: Estimate;
  readonly startedAt?: Instant;
  readonly endedAt?: Instant;
  readonly actualDurationS?: number;
}

export interface ObservationDigest {
  readonly at: Instant;
  readonly recordedAt: Instant;
  readonly stepId?: StepId;
  readonly elapsedInStepS?: number;
  readonly category: ObservationCategory;
  readonly kind?: ObservationKind;
  readonly stage?: 'shape' | 'bake';
  readonly criterion?: string;
  /** fold observation: the set done, 1 … the step's fold count. */
  readonly set?: number;
  readonly text?: string;
  readonly rating?: number;
  readonly measurement?: Observation;
}

export interface AdjustmentDigest {
  readonly at: Instant;
  readonly stepId?: StepId;
  readonly field: string;
  readonly value: unknown;
  readonly reason?: string;
}

export interface BakeDigest {
  readonly bakeId: string;
  readonly status: 'active' | 'finished' | 'abandoned';
  /** Finished only: the outcome in force after the latest end, or unknown (before 0.11.0). */
  readonly outcome?: PreparationOutcome | 'unknown';
  readonly outcomeSource?: OutcomeSource;
  /** Set at the start of the bake, never inferred from the exporting device (history.md). */
  readonly origin: 'physical' | 'simulation' | 'unknown';
  readonly recipe: { readonly id: string; readonly name?: string; readonly version: number };
  readonly startedAt?: Instant;
  readonly endedAt?: Instant;
  readonly manifest: {
    readonly engineVersion: string;
    readonly contractVersion: string;
    readonly models: readonly ModelRef[];
  };
  /** Registry flour entries the bake used (flours.md); absent for bakes before 0.8.0. */
  readonly flours?: readonly FlourRef[];
  /** Ingredient entry pins of the snapshot formula (ingredients.md); absent when there are none. */
  readonly ingredients?: readonly {
    readonly ingredient: string;
    readonly entry: IngredientRef;
  }[];
  readonly steps: readonly StepDigest[];
  readonly observations: readonly ObservationDigest[];
  readonly adjustments: readonly AdjustmentDigest[];
}

export interface FeedbackExport {
  readonly kind: 'flourprint-feedback';
  readonly schemaVersion: number;
  readonly exportedAt: Instant;
  readonly about: string;
  readonly device: FeedbackDevice;
  readonly backup: Backup;
  readonly bakes: readonly BakeDigest[];
}

/**
 * 2: `outcome`, `outcomeSource` and step `cooking` (contract 0.11.0). 3: `ingredients`, the
 * ingredient entry pins (contract 0.15.0).
 */
export const FEEDBACK_SCHEMA_VERSION = 3;

/** Read by whoever receives the export; data, not user interface text. */
export const FEEDBACK_ABOUT =
  'Flourprint feedback export. `bakes` is a digest of each bake read from its event log: ' +
  'planned vs recorded step times (seconds, UTC instants), the accepted model estimate per step, ' +
  'observations and notes with the step they were taken on and the time elapsed in that step, ' +
  'and adjustments made during the bake. Each bake says whether it was real or simulated ' +
  '(`origin`; "unknown" for bakes recorded before this was asked); a doughReady observation ' +
  'says the stage the dough was ready for (`stage`: shape or bake); a fold observation says ' +
  "which set of folds was done (`set`, 1 … the count of the step technique's folds; a set may " +
  'be early, late, repeated or missing). Step techniques (method, mixing phases, folds, end ' +
  'check) are in the recipe revisions and bake snapshots of `backup`: recorded only, nothing ' +
  'is predicted from them. A finished bake (a Preparation) has an `outcome`: `result` cooked, ' +
  'dough (the raw dough is the result: frozen, refrigerated, given, sold) or cookedAndDough, ' +
  'with `outcomeSource` recipe (the default the recipe states, accepted at finish) or baker ' +
  '(chosen or corrected); "unknown" for bakes finished before outcomes were recorded, never ' +
  'read as cooked. Steps say whether they are a cooking stage (`cooking`); a completed cooking ' +
  'step never means the product is done. A session may be reopened and ended again; only its ' +
  'latest end counts. `flours` lists the flour ' +
  'registry entries ({id, version}) the bake used; absent for bakes recorded before the registry ' +
  '(unknown). Built-in entries are code and carry no composition; personal entries, with every ' +
  'version, are in `backup.flours`. Their properties (protein, ash, falling number, alveograph, ' +
  'malted) are recorded for later calibration and used by no calculation; unknown is never zero. ' +
  '`ingredients` lists the ingredient registry entries the snapshot formula pins ({ingredient: ' +
  'the formula ingredient id, entry: {id, version, customized?}}); absent when none. The formula ' +
  'holds a copy of the contents it consumed, possibly overridden by the baker (`overrides`), and ' +
  'a recorded `preparation`; personal entry versions are in `backup.ingredients`, built-in ones ' +
  'are code. A pin that does not resolve is "entry not found" and changes no number. ' +
  '`backup` is the authoritative record (recipes with ' +
  'every revision, raw bake events). Units: grams, degrees Celsius, seconds, baker percentages ' +
  'in points. `device` describes the exporting device only. Contracts: ' +
  'docs/contracts/history.md (feedback export), bake-session.md, process.md, fermentation.md, ' +
  'flours.md, ingredients.md.';

const seconds = (from: Instant | undefined, to: Instant | undefined): number | undefined =>
  from === undefined || to === undefined
    ? undefined
    : Math.round((Date.parse(to) - Date.parse(from)) / 1000);

/** Digest of one bake, read from its events only: never the current engine (history.md). */
export const bakeDigest = (
  bakeId: string,
  logged: readonly BakeEvent[],
  recipeName: (id: string) => string | undefined,
): BakeDigest | undefined => {
  const upcast: BakeEvent[] = [];
  for (const event of logged) {
    const current = upcastEvent(event);
    // A log this version cannot read stays in the backup, without a digest.
    if (!current.ok) return undefined;
    upcast.push(current.value);
  }
  const events = upcast;
  const state = replayBake(bakeId, events);
  const snapshot = state.snapshot;
  if (state.status === 'notStarted' || !snapshot) return undefined;
  const recordedAt = new Map(events.map((e) => [e.eventId, e.recordedAt]));
  const baseline = new Map(snapshot.process.steps.map((s) => [s.id, s]));
  const steps = (state.process ?? snapshot.process).steps.map((step): StepDigest => {
    const record = state.steps[step.id];
    const planned = snapshot.initialProjection.steps[step.id];
    const estimate = snapshot.estimates[step.id];
    const baselineDurationS = baseline.get(step.id)?.plannedDurationS;
    const actualDurationS = seconds(record?.startedAt, record?.endedAt);
    return {
      id: step.id,
      operation: step.operation,
      cooking: isCookingStep(step),
      ...(step.label === undefined ? {} : { label: step.label }),
      ...(planned?.start === undefined ? {} : { plannedStartAt: planned.start }),
      ...(planned?.end === undefined ? {} : { plannedEndAt: planned.end }),
      ...(step.plannedDurationS === undefined ? {} : { plannedDurationS: step.plannedDurationS }),
      ...(baselineDurationS === undefined ? {} : { baselineDurationS }),
      ...(estimate === undefined || estimate.status !== 'ok' ? {} : { estimate }),
      ...(record?.startedAt === undefined ? {} : { startedAt: record.startedAt }),
      ...(record?.endedAt === undefined ? {} : { endedAt: record.endedAt }),
      ...(actualDurationS === undefined ? {} : { actualDurationS }),
    };
  });
  const observations = state.observations.map((o): ObservationDigest => {
    const { type: _type, stepId, ...rest } = o.payload;
    const elapsedInStepS =
      stepId === undefined ? undefined : seconds(state.steps[stepId]?.startedAt, o.occurredAt);
    return {
      at: o.occurredAt,
      recordedAt: recordedAt.get(o.eventId) ?? o.occurredAt,
      ...(stepId === undefined ? {} : { stepId }),
      ...(elapsedInStepS === undefined ? {} : { elapsedInStepS }),
      ...rest,
    };
  });
  const adjustments: AdjustmentDigest[] = [];
  for (const event of events) {
    const { payload } = event;
    const reason = 'reason' in payload && payload.reason !== undefined ? payload.reason : undefined;
    const common = { at: event.occurredAt, ...(reason === undefined ? {} : { reason }) };
    if (payload.type === 'OverrideApplied' && 'effective' in payload) {
      adjustments.push({
        ...common,
        stepId: payload.target.stepId,
        field: payload.target.field,
        value: payload.effective,
      });
    } else if (payload.type === 'OverrideApplied' && 'edit' in payload) {
      adjustments.push({ ...common, field: 'formula', value: payload.edit });
    } else if (payload.type === 'StepInserted') {
      adjustments.push({ ...common, stepId: payload.step.id, field: 'insertStep', value: payload });
    }
  }
  const recipeId = snapshot.revisions.formula.id;
  const name = recipeName(recipeId);
  const pins = snapshot.formula.ingredients.flatMap((i) =>
    i.entry === undefined ? [] : [{ ingredient: i.id, entry: i.entry }],
  );
  return {
    bakeId,
    status: state.status,
    ...(state.status !== 'finished'
      ? {}
      : state.outcome === undefined
        ? { outcome: 'unknown' as const }
        : {
            outcome: state.outcome,
            ...(state.outcomeSource === undefined ? {} : { outcomeSource: state.outcomeSource }),
          }),
    origin: snapshot.origin ?? 'unknown',
    recipe: {
      id: recipeId,
      ...(name === undefined ? {} : { name }),
      version: snapshot.revisions.formula.version,
    },
    ...(state.startedAt === undefined ? {} : { startedAt: state.startedAt }),
    ...(state.endedAt === undefined ? {} : { endedAt: state.endedAt }),
    manifest: snapshot.manifest,
    ...(snapshot.flours === undefined ? {} : { flours: snapshot.flours }),
    ...(pins.length === 0 ? {} : { ingredients: pins }),
    steps,
    observations,
    adjustments,
  };
};

/** The full backup with a digest per bake, for review by a person or an agent. */
export const exportFeedback = async (
  stores: BackupStores,
  exportedAt: Instant,
  device: FeedbackDevice,
): Promise<Result<FeedbackExport, BackupError>> => {
  const backup = await exportBackup(stores, exportedAt);
  if (!backup.ok) return backup;
  const names = new Map(backup.value.recipes.map((r) => [r.id, r.name]));
  return ok({
    kind: 'flourprint-feedback',
    schemaVersion: FEEDBACK_SCHEMA_VERSION,
    exportedAt,
    about: FEEDBACK_ABOUT,
    device,
    backup: backup.value,
    bakes: backup.value.bakes.flatMap(({ bakeId, events }) => {
      const digest = bakeDigest(bakeId, events, (id) => names.get(id));
      return digest ? [digest] : [];
    }),
  });
};
