import type { Instant } from './instant.js';

/** Value types of docs/contracts/values-and-units.md (D6). */

/** Canonical units: grams, degrees Celsius, seconds, percentage points. */
export type Unit = 'g' | 'degC' | 's' | 'pct';

export interface Observation<T = number> {
  readonly value: T;
  readonly unit: Unit;
  readonly observedAt: Instant;
  readonly method?: 'measured' | 'reported';
  /** Instrument precision, in the same unit. */
  readonly uncertainty?: number;
  readonly note?: string;
}

export interface ModelRef {
  readonly id: string;
  readonly version: string;
}

/**
 * One end of an estimate's range: a value, or a corner of the band that never reaches the end
 * point within the search horizon (never a raw Infinity, which JSON cannot carry).
 */
export type RangeBound<T = number> =
  | { readonly kind: 'finite'; readonly value: T }
  | { readonly kind: 'beyondHorizon'; readonly horizonS: number };

export type Estimate<T = number> =
  | {
      readonly status: 'ok';
      readonly value: T;
      readonly range?: readonly [RangeBound<T>, RangeBound<T>];
      readonly model: ModelRef;
      readonly assumptions: readonly string[];
      /** Stable codes: why the estimate lies outside the model's fitted domain. */
      readonly extrapolations?: readonly string[];
    }
  | {
      readonly status: 'unsupported' | 'out_of_domain' | 'insufficient_data';
      readonly model?: ModelRef;
      readonly missing?: readonly string[];
      /** Stable code, localized by clients (ADR 0009). */
      readonly reason: string;
    };

/** An estimate that has a value. */
export type OkEstimate<T = number> = Extract<Estimate<T>, { readonly status: 'ok' }>;

/**
 * A model suggestion the user applied (docs/contracts/fermentation.md, Accepted suggestions):
 * the estimate as shown, the value actually written (after rounding) and the model.
 */
export interface AcceptedSuggestion {
  readonly estimate: OkEstimate;
  readonly appliedValue: number;
  readonly model: ModelRef;
}
