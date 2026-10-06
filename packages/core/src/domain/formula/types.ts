/**
 * Formula model (docs/contracts/formula.md). Percentages are in points (70 = 70 %), masses in
 * grams. Grams are never stored: they are derived from percentages and the anchor.
 */

export type Anchor =
  | { readonly kind: 'flourTotal'; readonly grams: number }
  | { readonly kind: 'doughWeight'; readonly grams: number }
  | { readonly kind: 'pieces'; readonly count: number; readonly gramsEach: number };

export type AnchorKind = Anchor['kind'];

export interface FlourShare {
  readonly id: string;
  readonly sharePct: number;
}

/** Resolved water content of a non-water ingredient, per 100 g of that ingredient. */
export type WaterContent =
  | { readonly status: 'known'; readonly valuePct: number }
  | {
      readonly status: 'estimated';
      readonly valuePct: number;
      readonly rangePct?: readonly [number, number];
    }
  | { readonly status: 'unknown' };

export type IngredientRole = 'dough' | 'topping' | 'glaze';

export interface Ingredient {
  readonly id: string;
  /** `water` ingredients form the pure-water pool; everything else is `other`. */
  readonly kind: 'water' | 'other';
  readonly bakerPct: number;
  readonly role: IngredientRole;
  /** Ignored for `water` ingredients; missing means unknown. */
  readonly water?: WaterContent;
}

export interface ComponentAllocation {
  readonly ingredient: string;
  readonly bakerPct: number;
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

export interface Formula {
  readonly flours: readonly FlourShare[];
  readonly ingredients: readonly Ingredient[];
  readonly components: readonly Component[];
  readonly anchor: Anchor;
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
}
