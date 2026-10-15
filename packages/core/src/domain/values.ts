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
      /** Readiness profile the estimate used (fermentation.md). */
      readonly calibration?: { readonly id: string; readonly version: string };
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

/** Where a property value comes from (values-and-units.md; kinds of flours.md). */
export interface SourceRef {
  readonly kind: 'package' | 'producer' | 'lab' | 'reference' | 'personal';
  readonly detail?: string;
}

/**
 * Unit of a property value: a canonical unit, or one a property defines (alveograph W,
 * flours.md; diastatic power in degrees Lintner, ingredients.md).
 */
export type PropertyUnit = Unit | '1e-4 J' | '°L';

/** Basis of a composition value (values-and-units.md, flours.md). */
export type PropertyBasis = 'per100g' | 'perServing' | 'dryMatter' | 'asIs' | 'moisture14';

/** A recorded property of an ingredient; unknown is never zero and never a default. */
export type PropertyValue =
  | {
      readonly status: 'known' | 'estimated';
      readonly value: number | boolean | string;
      readonly unit?: PropertyUnit;
      readonly basis?: PropertyBasis;
      readonly source: SourceRef;
      readonly uncertainty?: number;
    }
  | { readonly status: 'unknown' };
