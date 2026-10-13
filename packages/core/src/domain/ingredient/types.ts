import type { YeastForm } from '../formula/types.js';
import type { Instant } from '../instant.js';
import type { PropertyValue } from '../values.js';

/** Ingredient registry (docs/contracts/ingredients.md). */

/** A closed list, with `other` and `unknown` as the escape; a new family is a contract change. */
export type IngredientFamily =
  | 'water'
  | 'salt'
  | 'leaven'
  | 'sugar'
  | 'fat'
  | 'dairy'
  | 'egg'
  | 'fruit'
  | 'nutSeed'
  | 'inclusion'
  | 'malt'
  | 'acid'
  | 'flavouring'
  | 'liquid'
  | 'other'
  | 'unknown';

export const INGREDIENT_FAMILIES: readonly IngredientFamily[] = [
  'water',
  'salt',
  'leaven',
  'sugar',
  'fat',
  'dairy',
  'egg',
  'fruit',
  'nutSeed',
  'inclusion',
  'malt',
  'acid',
  'flavouring',
  'liquid',
  'other',
  'unknown',
];

/** What the product is when bought, where that is part of its identity; never a preparation. */
export type IngredientForm = 'fresh' | 'dried' | 'powder' | 'other';

export const INGREDIENT_FORMS: readonly IngredientForm[] = ['fresh', 'dried', 'powder', 'other'];

export type Leavening =
  | { readonly type: 'commercialYeast'; readonly form: YeastForm }
  | { readonly type: 'sourdough' }
  | { readonly type: 'chemical' };

/** Points of the product mass as added, basis `per100g`. */
export interface IngredientComposition {
  readonly waterPct: PropertyValue;
  readonly fatPct: PropertyValue;
  /** Sugars, a part of `carbohydratePct`. */
  readonly sugarPct: PropertyValue;
  /** Includes sugars and fibre. */
  readonly carbohydratePct: PropertyValue;
  readonly proteinPct: PropertyValue;
  readonly fibrePct: PropertyValue;
  /** Sodium chloride. */
  readonly saltPct: PropertyValue;
}

export type CompositionKey = keyof IngredientComposition;

export const COMPOSITION_KEYS: readonly CompositionKey[] = [
  'waterPct',
  'fatPct',
  'sugarPct',
  'carbohydratePct',
  'proteinPct',
  'fibrePct',
  'saltPct',
];

export interface IngredientProperties {
  /** No unit. */
  readonly ph: PropertyValue;
  /** Unit '°L' (Lintner). */
  readonly diastaticPower: PropertyValue;
}

export type IngredientPropertyKey = keyof IngredientProperties;

export const INGREDIENT_PROPERTY_KEYS: readonly IngredientPropertyKey[] = ['ph', 'diastaticPower'];

/** An entry version as written: its built-in identity, or what customizes / copies it. */
export interface IngredientVersionRef {
  readonly id: string;
  readonly version: number;
}

export interface IngredientEntry {
  /** The id used in IngredientRef; unrelated to the formula's own ingredient ids. */
  readonly id: string;
  /** 1, 2, …; a version is immutable once written. */
  readonly version: number;
  /** Display name of a personal entry; a built-in and its customization use the message key. */
  readonly name?: string;
  /** Extra names for search, personal entries only. */
  readonly aliases?: readonly string[];
  readonly builtIn: boolean;
  /** Personal customization of a built-in; its id equals this entry's id. */
  readonly customizes?: IngredientVersionRef;
  readonly family: IngredientFamily;
  /** The formula kind; 'water' only for family 'water'. */
  readonly kind: 'water' | 'other';
  /** Identity only; absent = unknown. */
  readonly form?: IngredientForm;
  readonly leavening?: Leavening;
  readonly brand?: string;
  readonly product?: string;
  /** Boolean property. */
  readonly organic: PropertyValue;
  readonly composition: IngredientComposition;
  readonly properties: IngredientProperties;
  /** A personal entry copied from another entry. */
  readonly basedOn?: IngredientVersionRef;
  readonly notes?: string;
  readonly archived: boolean;
  readonly createdAt: Instant;
}
