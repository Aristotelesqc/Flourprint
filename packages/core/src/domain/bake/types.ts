import type { Formula, ResolvedFormula } from '../formula/types.js';
import type { FormulaEdit } from '../formula/edit.js';
import type { FlourRef } from '../flour/types.js';
import type { Instant } from '../instant.js';
import type { Process, ProcessStep, Projection, ProjectionMode, StepId } from '../process/types.js';
import type { Estimate, ModelRef, Observation } from '../values.js';

/** Bake session model (docs/contracts/bake-session.md, history.md). */

export interface RevisionRef {
  readonly id: string;
  readonly version: number;
}

export interface UsedProperty {
  readonly ingredient: string;
  readonly version: number;
  readonly key: string;
  readonly value: unknown;
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
}

export type BakeOrigin = 'physical' | 'simulation';

export type ObservationCategory =
  'crumb' | 'crust' | 'fermentation' | 'flavor' | 'handling' | 'volume' | 'other';

/**
 * Stable kind of an observation (bake-session.md). `doughReady`: the baker judges the dough ready
 * to bake; calibration data for the end point of the fermentation model.
 */
export type ObservationKind = 'doughReady';

export type StepAdjustment =
  | { readonly field: 'plannedDurationS'; readonly value: number }
  | { readonly field: 'temperatureC'; readonly value: number };

// Commands

export type BakeCommandPayload =
  | {
      readonly type: 'StartBake';
      readonly revisions: BakeSnapshot['revisions'];
      readonly formula: Formula;
      readonly process: Process;
      readonly mode: ProjectionMode;
      readonly usedProperties?: readonly UsedProperty[];
      /** A real bake or a simulation (history.md); absent = unknown. */
      readonly origin?: BakeOrigin;
      /** Current registry version of each formula flour that has an entry (flours.md). */
      readonly flours?: readonly FlourRef[];
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
    }
  | { readonly type: 'AdjustFormula'; readonly edit: FormulaEdit; readonly reason?: string }
  | {
      readonly type: 'InsertStepAfter';
      readonly after: StepId;
      readonly step: Omit<ProcessStep, 'dependsOn'>;
    }
  | { readonly type: 'AcceptProjection' }
  | {
      readonly type: 'AddObservation';
      readonly stepId?: StepId;
      readonly category: ObservationCategory;
      readonly kind?: ObservationKind;
      /** Stable code of what the baker went by (`poke`, `feel`, `time`, `other`). */
      readonly criterion?: string;
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
  | { readonly type: 'FinishBake'; readonly at?: Instant }
  | { readonly type: 'AbandonBake'; readonly reason?: string };

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
        readonly field: StepAdjustment['field'];
      };
      readonly baseline: number | null;
      readonly effective: number;
      readonly unit: 'degC' | 's';
      readonly reason?: string;
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
  | { readonly type: 'BakeFinished' }
  | { readonly type: 'BakeAbandoned'; readonly reason?: string };

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
  readonly endedAt?: Instant;
  readonly snapshot?: BakeSnapshot;
  /** Effective definitions after overrides and insertions (baseline stays in the snapshot). */
  readonly formula?: Formula;
  readonly resolvedFormula?: ResolvedFormula;
  readonly process?: Process;
  readonly steps: Readonly<Record<StepId, StepRecord>>;
  readonly overrides: readonly RecordedOverride[];
  readonly observations: readonly RecordedObservation[];
  readonly acceptedProjection?: Projection;
  /** Which step and which time each start/completion event set, for corrections. */
  readonly stepEvents: Readonly<
    Record<string, { readonly stepId: StepId; readonly kind: 'start' | 'end' }>
  >;
}
