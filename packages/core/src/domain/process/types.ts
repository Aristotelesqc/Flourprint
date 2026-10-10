import type { Instant } from '../instant.js';
import type { AcceptedSuggestion } from '../values.js';

/** Process model (docs/contracts/process.md). Durations are in seconds. */

export type StepId = string;

export type EndCriterion =
  | { readonly kind: 'duration' }
  | { readonly kind: 'observation'; readonly description?: string }
  | { readonly kind: 'userDecision' };

export type Incorporation =
  | {
      readonly item: 'flour' | 'ingredient' | 'component';
      readonly id: string;
      readonly sharePct: number;
    }
  | { readonly item: 'water'; readonly sharePct: number };

export interface StepConditions {
  /** Open code such as `counter`, `fridge`, `proofer`, `oven`. */
  readonly location?: string;
  readonly temperatureC?: number;
  /** Mix step only: target dough temperature, advanced mode (fermentation.md). */
  readonly doughTemperatureC?: number;
  /** Mix step only: mixer friction for the water temperature (fermentation.md). */
  readonly frictionC?: number;
}

export interface ProcessStep {
  readonly id: StepId;
  /** Open operation code (`autolyse`, `mix`, `fold`, `bulk`, `shape`, `bake`, …), see #5. */
  readonly operation: string;
  /** User label; the engine never interprets it. */
  readonly label?: string;
  readonly dependsOn: readonly StepId[];
  readonly schedule: 'asap' | 'alap';
  readonly plannedDurationS?: number;
  readonly endCriterion?: EndCriterion;
  readonly conditions?: StepConditions;
  readonly incorporations?: readonly Incorporation[];
  /** Set when `plannedDurationS` was taken from a model suggestion (fermentation.md). */
  readonly accepted?: AcceptedSuggestion;
}

export interface Process {
  readonly steps: readonly ProcessStep[];
}

/** Recorded facts of a bake, from the session log (bake-session.md). */
export interface StepFact {
  readonly startedAt?: Instant;
  readonly endedAt?: Instant;
}

export type ProjectionMode =
  | { readonly kind: 'startAt'; readonly at: Instant }
  | { readonly kind: 'readyBy'; readonly at: Instant; readonly target: StepId };

export interface ProjectionInput {
  readonly mode: ProjectionMode;
  readonly facts?: Readonly<Record<StepId, StepFact>>;
  /** Lower bound for steps not started yet, during a bake. */
  readonly now?: Instant;
}

export interface ProjectedStep {
  readonly status: 'done' | 'inProgress' | 'planned';
  readonly start?: Instant;
  readonly end?: Instant;
  /** Steps whose unknown end blocks this step's times; empty when both times are known. */
  readonly unknownAfter: readonly StepId[];
}

export interface Projection {
  readonly mode: ProjectionMode;
  readonly steps: Readonly<Record<StepId, ProjectedStep>>;
}
