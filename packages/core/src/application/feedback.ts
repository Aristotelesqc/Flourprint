import {
  DOCUMENT_SCHEMA_VERSION,
  ok,
  replayBake,
  type BakeEvent,
  type Estimate,
  type FlourRef,
  type Instant,
  type ModelRef,
  type Observation,
  type ObservationCategory,
  type ObservationKind,
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

/** Read by whoever receives the export; data, not user interface text. */
export const FEEDBACK_ABOUT =
  'Flourprint feedback export. `bakes` is a digest of each bake read from its event log: ' +
  'planned vs recorded step times (seconds, UTC instants), the accepted model estimate per step, ' +
  'observations and notes with the step they were taken on and the time elapsed in that step, ' +
  'and adjustments made during the bake. Each bake says whether it was real or simulated ' +
  '(`origin`; "unknown" for bakes recorded before this was asked); a doughReady observation ' +
  'says the stage the dough was ready for (`stage`: shape or bake). `flours` lists the flour ' +
  'registry entries ({id, version}) the bake used; absent for bakes recorded before the registry ' +
  '(unknown). Built-in entries are code and carry no composition; personal entries, with every ' +
  'version, are in `backup.flours`. Their properties (protein, ash, falling number, alveograph, ' +
  'malted) are recorded for later calibration and used by no calculation; unknown is never zero. ' +
  '`backup` is the authoritative record (recipes with ' +
  'every revision, raw bake events). Units: grams, degrees Celsius, seconds, baker percentages ' +
  'in points. `device` describes the exporting device only. Contracts: ' +
  'docs/contracts/history.md (feedback export), bake-session.md, fermentation.md, flours.md.';

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
  return {
    bakeId,
    status: state.status,
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
    schemaVersion: DOCUMENT_SCHEMA_VERSION,
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
