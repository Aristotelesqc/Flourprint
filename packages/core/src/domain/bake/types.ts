import type { EquipmentEntry, StepEquipment } from '../equipment/types.js';
import type { Formula, ResolvedFormula } from '../formula/types.js';
import type { FormulaEdit } from '../formula/edit.js';
import type { FlourRef } from '../flour/types.js';
import type { Instant } from '../instant.js';
import type { PreparationOutcome } from '../process/cooking.js';
import type { Process, ProcessStep, Projection, ProjectionMode, StepId } from '../process/types.js';
import type { Estimate, ModelRef, Observation } from '../values.js';

/** Bake session model (docs/contracts/bake-session.md, history.md). */

export interface RevisionRef {
  readonly id: string;
  readonly version: number;
}

/** A registry property actually consumed by the calculation (history.md). */
export interface UsedProperty {
  /** The registry entry id. */
  readonly ingredient: string;
  /** The registry entry version. */
  readonly version: number;
  /** The version is a personal customization of a built-in (ingredients.md). */
  readonly customized?: true;
  /** The formula ingredient the property was consumed for; set for pinned entries. */
  readonly formulaIngredient?: string;
  readonly key: string;
  /** The value actually consumed, the baker's when overridden. */
  readonly value: unknown;
  /** The formula ingredient overrides this property of its entry. */
  readonly overridden?: true;
}

export interface BakeSnapshot {
  readonly revisions: { readonly formula: RevisionRef; readonly process: RevisionRef };
  readonly formula: Formula;
  readonly resolvedFormula: ResolvedFormula;
  readonly usedProperties: readonly UsedProperty[];
  readonly process: Process;
  readonly initialProjection: Projection;
  readonly estimates: Readonly<Record<StepId, Estimate>>;
  readonly manifest: {
    readonly engineVersion: string;
    readonly contractVersion: string;
    readonly models: readonly ModelRef[];
  };
  /** A real bake or a simulation, from StartBake; absent = unknown (history.md). */
  readonly origin?: BakeOrigin;
  /** Registry entries of the formula's flours (flours.md); absent before 0.8.0 = unknown. */
  readonly flours?: readonly FlourRef[];
  /**
   * Copies of the equipment entry versions the process references, built-in or personal
   * (equipment.md); absent before 0.12.0.
   */
  readonly equipment?: readonly EquipmentEntry[];
}

export type BakeOrigin = 'physical' | 'simulation';

/** Where a recorded outcome comes from: the recipe's intended outcome, or the baker's choice. */
export type OutcomeSource = 'recipe' | 'baker';

export type ObservationCategory =
  'crumb' | 'crust' | 'fermentation' | 'flavor' | 'handling' | 'volume' | 'other';

/**
 * Stable kind of an observation (bake-session.md). `doughReady`: the baker judges the dough ready
 * for its next stage; calibration data for the end point of the fermentation model. `fold`: one
 * set of folds done on a running step whose technique has folds.
 */
export type ObservationKind = 'doughReady' | 'fold';

export type NumericStepAdjustment =
  | { readonly field: 'plannedDurationS'; readonly value: number }
  | { readonly field: 'temperatureC'; readonly value: number };

/** What AdjustStep may change: a duration, a temperature, or the equipment used (equipment.md). */
export type StepAdjustment =
  NumericStepAdjustment | { readonly field: 'equipment'; readonly value: StepEquipment };

// Commands

export type BakeCommandPayload =
  | {
      readonly type: 'StartBake';
      readonly revisions: BakeSnapshot['revisions'];
      readonly formula: Formula;
      readonly process: Process;
      readonly mode: ProjectionMode;
      /**
       * Properties consumed, resolved by the caller (history.md); absent, the pinned ingredient
       * entries give their rows from the formula's copied contents (ingredients.md, Bakes).
       */
      readonly usedProperties?: readonly UsedProperty[];
      /** A real bake or a simulation (history.md); absent = unknown. */
      readonly origin?: BakeOrigin;
      /** Current registry version of each formula flour that has an entry (flours.md). */
      readonly flours?: readonly FlourRef[];
      /** Every entry version the process references, resolved by the caller (equipment.md). */
      readonly equipment?: readonly EquipmentEntry[];
    }
  | { readonly type: 'StartStep'; readonly stepId: StepId; readonly at?: Instant }
  | {
      readonly type: 'CompleteStep';
      readonly stepId: StepId;
      readonly at?: Instant;
      readonly measurements?: readonly Observation[];
    }
  | {
      readonly type: 'AdjustStep';
      readonly stepId: StepId;
      readonly adjustment: StepAdjustment;
      readonly reason?: string;
      /** `equipment` adjustments only: the entry versions the value newly references. */
      readonly equipment?: readonly EquipmentEntry[];
    }
  | { readonly type: 'AdjustFormula'; readonly edit: FormulaEdit; readonly reason?: string }
  | {
      readonly type: 'InsertStepAfter';
      readonly after: StepId;
      readonly step: Omit<ProcessStep, 'dependsOn'>;
      /** The entry versions the new step newly references (equipment.md). */
      readonly equipment?: readonly EquipmentEntry[];
    }
  | { readonly type: 'AcceptProjection' }
  | {
      readonly type: 'AddObservation';
      readonly stepId?: StepId;
      readonly category: ObservationCategory;
      readonly kind?: ObservationKind;
      /** Stable code of what the baker went by (`poke`, `feel`, `time`, `other`). */
      readonly criterion?: string;
      /** fold only: the set done, 1 … `folds.count`. */
      readonly set?: number;
      readonly text?: string;
      readonly rating?: number;
      readonly measurement?: Observation;
    }
  | {
      readonly type: 'CorrectStepTime';
      readonly targetEventId: string;
      readonly newOccurredAt: Instant;
    }
  | { readonly type: 'RetractCompletion'; readonly targetEventId: string }
  | {
      readonly type: 'FinishBake';
      readonly at?: Instant;
      /** Absent = the intended outcome of the recipe (bake-session.md, Outcome). */
      readonly outcome?: PreparationOutcome;
    }
  | { readonly type: 'AbandonBake'; readonly reason?: string }
  | { readonly type: 'CorrectOutcome'; readonly outcome: PreparationOutcome }
  | { readonly type: 'ReopenBake' };

export interface BakeCommand<P extends BakeCommandPayload = BakeCommandPayload> {
  readonly commandId: string;
  readonly bakeId: string;
  /** Last known event sequence number; 0 before the first event. */
  readonly expectedVersion: number;
  readonly issuedAt: Instant;
  readonly payload: P;
}

// Events

export type BakeEventPayload =
  | { readonly type: 'BakeStarted'; readonly snapshot: BakeSnapshot }
  | { readonly type: 'StepStarted'; readonly stepId: StepId }
  | {
      readonly type: 'StepCompleted';
      readonly stepId: StepId;
      readonly measurements?: readonly Observation[];
    }
  | {
      readonly type: 'OverrideApplied';
      readonly target: {
        readonly kind: 'step';
        readonly stepId: StepId;
        readonly field: NumericStepAdjustment['field'];
      };
      readonly baseline: number | null;
      readonly effective: number;
      readonly unit: 'degC' | 's';
      readonly reason?: string;
    }
  | {
      /** The settings actually used on a step; the snapshot keeps the plan (equipment.md). */
      readonly type: 'OverrideApplied';
      readonly target: {
        readonly kind: 'step';
        readonly stepId: StepId;
        readonly field: 'equipment';
      };
      /** The planned settings; null when the step had none. */
      readonly baseline: StepEquipment | null;
      readonly effective: StepEquipment;
      readonly reason?: string;
      /** Copies of the entry versions the override newly references. */
      readonly equipment?: readonly EquipmentEntry[];
    }
  | {
      readonly type: 'OverrideApplied';
      readonly target: { readonly kind: 'formula' };
      readonly edit: FormulaEdit;
      /** Engine results stored so that replay never calls the engine (D8). */
      readonly derived: { readonly formula: Formula; readonly resolvedFormula: ResolvedFormula };
      readonly reason?: string;
    }
  | {
      readonly type: 'StepInserted';
      readonly after: StepId;
      readonly step: ProcessStep;
      /** Steps whose dependency on `after` was replaced by the new step. */
      readonly rewired: readonly StepId[];
      /** Copies of the entry versions the new step newly references (equipment.md). */
      readonly equipment?: readonly EquipmentEntry[];
    }
  | { readonly type: 'ProjectionAccepted'; readonly projection: Projection }
  | {
      readonly type: 'ObservationAdded';
      readonly stepId?: StepId;
      readonly category: ObservationCategory;
      readonly kind?: ObservationKind;
      /** doughReady only: the stage the dough is ready for, set by the domain. */
      readonly stage?: 'shape' | 'bake';
      readonly criterion?: string;
      /** fold only: the set done, 1 … `folds.count`. */
      readonly set?: number;
      readonly text?: string;
      readonly rating?: number;
      readonly measurement?: Observation;
    }
  | {
      readonly type: 'StepTimeCorrected';
      readonly targetEventId: string;
      readonly newOccurredAt: Instant;
    }
  | { readonly type: 'StepCompletionRetracted'; readonly targetEventId: string }
  | {
      readonly type: 'BakeFinished';
      /** Absent on events written before 0.11.0: the result is unknown. */
      readonly outcome?: PreparationOutcome;
      readonly outcomeSource?: OutcomeSource;
    }
  | { readonly type: 'BakeAbandoned'; readonly reason?: string }
  | {
      readonly type: 'OutcomeCorrected';
      readonly outcome: PreparationOutcome;
      readonly outcomeSource: 'baker';
    }
  | { readonly type: 'BakeReopened' };

/** An override of the equipment used on a step (equipment.md). */
export type EquipmentOverride = Extract<
  BakeEventPayload,
  { readonly type: 'OverrideApplied'; readonly target: { readonly field: 'equipment' } }
>;

/** An event decided by the domain, before the store assigns its envelope. */
export interface EventDraft {
  readonly occurredAt: Instant;
  readonly payload: BakeEventPayload;
}

export interface BakeEvent {
  readonly eventId: string;
  readonly bakeId: string;
  readonly seq: number;
  readonly causationId: string;
  readonly occurredAt: Instant;
  readonly recordedAt: Instant;
  readonly schemaVersion: number;
  readonly payload: BakeEventPayload;
}

// State

export interface StepRecord {
  readonly startedAt?: Instant;
  readonly startEventId?: string;
  readonly endedAt?: Instant;
  readonly endEventId?: string;
  readonly measurements: readonly Observation[];
}

export interface RecordedOverride {
  readonly eventId: string;
  readonly occurredAt: Instant;
  readonly payload: Extract<BakeEventPayload, { type: 'OverrideApplied' }>;
}

export interface RecordedObservation {
  readonly eventId: string;
  readonly occurredAt: Instant;
  readonly payload: Extract<BakeEventPayload, { type: 'ObservationAdded' }>;
}

export interface BakeState {
  readonly bakeId: string;
  readonly version: number;
  readonly status: 'notStarted' | 'active' | 'finished' | 'abandoned';
  readonly startedAt?: Instant;
  /** The latest end; a reopened session has none until it ends again. */
  readonly endedAt?: Instant;
  /** Finished sessions only: the outcome in force, absent when unknown (before 0.11.0). */
  readonly outcome?: PreparationOutcome;
  readonly outcomeSource?: OutcomeSource;
  readonly snapshot?: BakeSnapshot;
  /** Effective definitions after overrides and insertions (baseline stays in the snapshot). */
  readonly formula?: Formula;
  readonly resolvedFormula?: ResolvedFormula;
  readonly process?: Process;
  readonly steps: Readonly<Record<StepId, StepRecord>>;
  /**
   * Every equipment entry version copied into the log so far: the snapshot's, then those newly
   * referenced by overrides and inserted steps (equipment.md). Absent before any copy.
   */
  readonly equipment?: readonly EquipmentEntry[];
  readonly overrides: readonly RecordedOverride[];
  readonly observations: readonly RecordedObservation[];
  readonly acceptedProjection?: Projection;
  /** Which step and which time each start/completion event set, for corrections. */
  readonly stepEvents: Readonly<
    Record<string, { readonly stepId: StepId; readonly kind: 'start' | 'end' }>
  >;
}
