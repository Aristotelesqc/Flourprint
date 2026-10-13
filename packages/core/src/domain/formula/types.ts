/**
 * Formula model (docs/contracts/formula.md). Percentages are in points (70 = 70 %), masses in
 * grams. Grams are never stored: they are derived from percentages and the anchor.
 */

import type { AcceptedSuggestion } from '../values.js';

export type Anchor =
  | { readonly kind: 'flourTotal'; readonly grams: number }
  | { readonly kind: 'doughWeight'; readonly grams: number }
  | { readonly kind: 'pieces'; readonly count: number; readonly gramsEach: number };

export type AnchorKind = Anchor['kind'];

export interface FlourShare {
  readonly id: string;
  readonly sharePct: number;
}

/**
 * Resolved content (water, fat or sugar) of a non-water ingredient, per 100 g of that
 * ingredient. `source` names where a known or estimated value comes from.
 */
export type ContentPct =
  | { readonly status: 'known'; readonly valuePct: number; readonly source?: string }
  | {
      readonly status: 'estimated';
      readonly valuePct: number;
      readonly rangePct?: readonly [number, number];
      readonly source?: string;
    }
  | { readonly status: 'unknown' };

export type WaterContent = ContentPct;

export type IngredientRole = 'dough' | 'topping' | 'glaze';

export interface Ingredient {
  readonly id: string;
  /** `water` ingredients form the pure-water pool; everything else is `other`. */
  readonly kind: 'water' | 'other';
  readonly bakerPct: number;
  readonly role: IngredientRole;
  /** Ignored for `water` ingredients; missing means unknown. */
  readonly water?: ContentPct;
  /** Fat per 100 g; ignored for `water` ingredients; missing means unknown. */
  readonly fat?: ContentPct;
  /** Sugar per 100 g; ignored for `water` ingredients; missing means unknown. */
  readonly sugar?: ContentPct;
  /** Marks commercial yeast for the fermentation model (fermentation.md). */
  readonly yeast?: YeastMarker;
  /** Set when `bakerPct` was taken from a model suggestion (fermentation.md). */
  readonly accepted?: AcceptedSuggestion;
  /**
   * The registry entry version the contents above were copied from (ingredients.md). Provenance
   * and display only: no calculation reads it.
   */
  readonly entry?: IngredientRef;
  /**
   * Contents set by hand on an ingredient with an `entry`: each field at most once, in the order
   * of `OVERRIDABLE_FIELDS`, absent when empty. No calculation reads it.
   */
  readonly overrides?: readonly OverridableField[];
  /** How the ingredient is when it is added; recorded and shown, never consumed. */
  readonly preparation?: IngredientPreparation;
}

/** A pinned ingredient registry entry version (ingredients.md). */
export interface IngredientRef {
  readonly id: string;
  readonly version: number;
  /** The version is a personal customization of the built-in with this id. */
  readonly customized?: true;
}

/** Contents of an ingredient that an entry gives and the baker may override (ingredients.md). */
export type OverridableField = 'kind' | 'water' | 'fat' | 'sugar' | 'yeast';

/** In the order `overrides` lists them. */
export const OVERRIDABLE_FIELDS: readonly OverridableField[] = [
  'kind',
  'water',
  'fat',
  'sugar',
  'yeast',
];

export type PreparationState =
  | 'cold'
  | 'roomTemperature'
  | 'softened'
  | 'melted'
  | 'meltedCooled'
  | 'cubed'
  | 'chopped'
  | 'grated'
  | 'ground'
  | 'toasted'
  | 'soaked'
  | 'whipped'
  | 'beaten'
  | 'pureed'
  | 'cooked'
  | 'other';

export const PREPARATION_STATES: readonly PreparationState[] = [
  'cold',
  'roomTemperature',
  'softened',
  'melted',
  'meltedCooled',
  'cubed',
  'chopped',
  'grated',
  'ground',
  'toasted',
  'soaked',
  'whipped',
  'beaten',
  'pureed',
  'cooked',
  'other',
];

/** How an ingredient is prepared (ingredients.md, Preparation): `other` requires a note. */
export interface IngredientPreparation {
  readonly state: PreparationState;
  readonly note?: string;
}

export type YeastForm = 'fresh' | 'active-dry' | 'instant';

export interface YeastMarker {
  readonly form: YeastForm;
}

export interface ComponentAllocation {
  readonly ingredient: string;
  readonly bakerPct: number;
  /** Set when `bakerPct` was taken from a model suggestion (fermentation.md). */
  readonly accepted?: AcceptedSuggestion;
}

export interface Component {
  readonly id: string;
  readonly kind: 'preferment' | 'scald' | 'soaker' | 'custom';
  /** Share of total flour drawn by the component. */
  readonly flourPct: number;
  readonly flourBlend: readonly { readonly flour: string; readonly sharePct: number }[];
  /** Water drawn from the pool, relative to the component's own flour. */
  readonly hydrationPct: number;
  /** Water lost while preparing the component, relative to its water. */
  readonly waterLossPct?: number;
  readonly allocations?: readonly ComponentAllocation[];
}

/** A locked total water (formula.md, Locked total water). */
export interface WaterTarget {
  /** Total water in points of total flour, everything that brings water included. */
  readonly totalWaterPct: number;
  /** The `water` ingredient whose percentage is derived from the target. */
  readonly absorbInto: string;
}

export interface Formula {
  readonly flours: readonly FlourShare[];
  readonly ingredients: readonly Ingredient[];
  readonly components: readonly Component[];
  readonly anchor: Anchor;
  readonly waterTarget?: WaterTarget;
}

export interface WaterContribution {
  readonly source: string;
  readonly kind: 'pureWater' | 'ingredient' | 'loss';
  readonly grams: number;
  readonly status: 'known' | 'estimated';
  readonly range?: readonly [number, number];
}

export interface WaterBalance {
  readonly value: number;
  readonly range?: readonly [number, number];
  readonly completeness: 'complete' | 'incomplete';
  readonly unknownContributors: readonly string[];
  /** Line items behind `value`, for `explain`. */
  readonly contributions: readonly WaterContribution[];
}

export interface ResolvedComponent {
  readonly flourByFlour: Readonly<Record<string, number>>;
  readonly flour: number;
  readonly water: number;
  readonly waterLoss: number;
  readonly allocations: Readonly<Record<string, number>>;
  readonly mass: number;
}

export interface FinalMix {
  readonly flourByFlour: Readonly<Record<string, number>>;
  readonly water: number;
  /** Non-water dough ingredients left for the final mix. */
  readonly grams: Readonly<Record<string, number>>;
  readonly componentMasses: Readonly<Record<string, number>>;
}

/** Everything the engine derives from a formula; this is what bake snapshots copy (D8). */
export interface ResolvedFormula {
  readonly anchor: Anchor;
  readonly bakerPct: Readonly<Record<string, number>>;
  readonly flourTotal: number;
  readonly flourByFlour: Readonly<Record<string, number>>;
  readonly grams: Readonly<Record<string, number>>;
  readonly components: Readonly<Record<string, ResolvedComponent>>;
  readonly finalMix: FinalMix;
  readonly losses: number;
  readonly doughWeight: number;
  readonly pureWaterTotal: number;
  readonly finalMixWater: number;
  readonly pureWaterPct: number;
  readonly totalWater: WaterBalance;
  readonly totalWaterPct: number;
  /** Added fat and sugar (formula.md); absent from snapshots taken before contract 0.2. */
  readonly totalFat?: WaterBalance;
  readonly totalFatPct?: number;
  readonly totalSugar?: WaterBalance;
  readonly totalSugarPct?: number;
}
