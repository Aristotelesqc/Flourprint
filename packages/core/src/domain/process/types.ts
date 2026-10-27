import type { PreparationOutcome } from './cooking.js';
import type { StepEquipment } from '../equipment/types.js';
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

/** Machine mixing phase (process.md, Techniques). */
export interface MixPhase {
  readonly speed: 'low' | 'medium' | 'high';
  readonly durationS: number;
}

/** Sets of folds during a step: set `k` is due at the step's start + `k × intervalS`. */
export interface StepFolds {
  readonly count: number;
  readonly intervalS: number;
  /** Open code: `stretchAndFold`, `coilFold`, `lamination`, … */
  readonly style?: string;
}

/**
 * How a step is done (process.md, Techniques, #32 first slice). Recorded data only: no duration,
 * end or dough state is predicted from it.
 */
export interface StepTechnique {
  /** Open code: `hand`, `slapAndFold`, `rubaud`, `standMixer`, `spiral`, … */
  readonly method?: string;
  /** Machine mixing phases, in order. */
  readonly phases?: readonly MixPhase[];
  readonly folds?: StepFolds;
  /** Open code of what ends the step for the baker: `windowpane`, `doughTemperature`, … */
  readonly endCheck?: string;
}

/** Which work a step belongs to (process.md, Subjects and component phases). */
export type Subject =
  { readonly kind: 'mainDough' } | { readonly kind: 'component'; readonly id: string };

/** Shape class of the dough in its container (process.md, Thermal inputs). */
export type ThermalGeometry = 'sheet' | 'tin' | 'ball' | 'bulk';
export type ContainerMaterial =
  'glass' | 'plastic' | 'ceramic' | 'steel' | 'aluminium' | 'banneton';
export type ContainerCover = 'lid' | 'film' | 'cloth' | 'none';
export type ThermalEnvironment = 'fridgeStatic' | 'fridgeVentilated' | 'roomStill' | 'provingBox';
export type DoughPorosity = 'unproofed' | 'mid' | 'proofed';

/**
 * Thermal inputs of a dough step (process.md, Thermal inputs, #176): the presence of the object
 * turns the dough thermal model on for the step (fermentation.md, Dough thermal model).
 */
export interface StepThermal {
  readonly geometry: ThermalGeometry;
  readonly container?: {
    readonly material: ContainerMaterial;
    readonly cover: ContainerCover;
    /** Banneton only: a cloth liner. */
    readonly liner?: boolean;
  };
  readonly environment?: ThermalEnvironment;
  readonly porosity?: DoughPorosity;
  /** Integer ≥ 1: equal pieces the dough is divided into (default 1). */
  readonly pieces?: number;
  /** Grams, > 0: the container that changes ambient with the dough. */
  readonly containerMassG?: number;
}

export interface ProcessStep {
  readonly id: StepId;
  /** Open operation code (`autolyse`, `mix`, `fold`, `bulk`, `shape`, `bake`, …), see #5. */
  readonly operation: string;
  /** User label; the engine never interprets it. */
  readonly label?: string;
  readonly dependsOn: readonly StepId[];
  readonly schedule: 'asap' | 'alap' | 'beforeTarget';
  readonly plannedDurationS?: number;
  readonly endCriterion?: EndCriterion;
  readonly conditions?: StepConditions;
  readonly incorporations?: readonly Incorporation[];
  /** Set when `plannedDurationS` was taken from a model suggestion (fermentation.md). */
  readonly accepted?: AcceptedSuggestion;
  readonly technique?: StepTechnique;
  /**
   * `model`: the duration follows the fermentation model, applied by the editor as an accepted
   * suggestion (fermentation.md, Model-driven duration). Absent = `manual`.
   */
  readonly durationMode?: 'manual' | 'model';
  /** How the step is cooked or held (equipment.md); recorded, never read by the scheduler. */
  readonly equipment?: StepEquipment;
  /** The mass the step works on; absent = derived (process.md, Subjects and component phases). */
  readonly subject?: Subject;
  /** Thermal inputs of a dough step; absent = the fixed lag of fermentation.md. */
  readonly thermal?: StepThermal;
  /** `beforeTarget` only: the cooking step the heat is for (process.md, Steps before a target). */
  readonly target?: StepId;
  /** `beforeTarget` only: the warm-up wanted before the target starts, in seconds (≥ 0). */
  readonly requiredWarmupS?: number;
  /** `beforeTarget` only: absent = `fromTarget`. */
  readonly startRule?: 'fromTarget' | 'afterDependencies';
}

export interface Process {
  readonly steps: readonly ProcessStep[];
  /** Readiness profile of the dough (fermentation.md); absent = the default profile. */
  readonly readiness?: { readonly id: string; readonly version: string };
  /** How the recipe ends (bake-session.md, Outcome); absent = derived from its steps. */
  readonly intendedOutcome?: PreparationOutcome;
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

/**
 * The warm-up of a `beforeTarget` step (process.md, Steps before a target). `availableS` is the
 * heating window, never negative; an unknown time is never replaced by a number.
 */
export type Warmup =
  | { readonly kind: 'sufficient'; readonly availableS: number; readonly requiredS: number }
  | { readonly kind: 'insufficient'; readonly availableS: number; readonly requiredS: number }
  | { readonly kind: 'unavailable'; readonly reason: 'startsAfterTarget' }
  | { readonly kind: 'unknown'; readonly unknownAfter: readonly StepId[] }
  | { readonly kind: 'notApplicable' };

export interface ProjectedStep {
  readonly status: 'done' | 'inProgress' | 'planned';
  readonly start?: Instant;
  readonly end?: Instant;
  /** Steps whose unknown end blocks this step's times; empty when both times are known. */
  readonly unknownAfter: readonly StepId[];
  /**
   * Live projection only: an `asap` step the baker has not started whose dependencies all ended,
   * shown as running from its implicit start (bake-session.md). Nothing is recorded.
   */
  readonly implicit?: true;
  /** `beforeTarget` steps only. */
  readonly warmup?: Warmup;
  /** `beforeTarget` step not started whose trigger is past: the instant it was due. */
  readonly overdue?: { readonly dueAt: Instant };
}

export interface Projection {
  readonly mode: ProjectionMode;
  readonly steps: Readonly<Record<StepId, ProjectedStep>>;
}
