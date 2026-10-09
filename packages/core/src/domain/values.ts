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

export type Estimate<T = number> =
  | {
      readonly status: 'ok';
      readonly value: T;
      readonly range?: readonly [T, T];
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
