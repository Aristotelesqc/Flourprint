import type { Instant } from '../instant.js';
import type { PropertyUnit, PropertyValue } from '../values.js';

/** Flour registry (docs/contracts/flours.md). */

export type Cereal = 'wheat' | 'spelt' | 'rye' | 'corn' | 'other' | 'unknown';
export type Refinement = 'white' | 'partial' | 'wholeGrain' | 'unknown';

export const CEREALS: readonly Cereal[] = ['wheat', 'spelt', 'rye', 'corn', 'other', 'unknown'];
export const REFINEMENTS: readonly Refinement[] = ['white', 'partial', 'wholeGrain', 'unknown'];

/** Kinds of source of a flour property: label, mill sheet, lab, published reference, baker. */
export const FLOUR_SOURCE_KINDS = ['package', 'producer', 'lab', 'reference', 'personal'] as const;
export type FlourSourceKind = (typeof FLOUR_SOURCE_KINDS)[number];

/** Bases a flour percentage may have (flours.md); a per-serving label value is converted. */
export const FLOUR_PCT_BASES = ['asIs', 'moisture14', 'dryMatter'] as const;
export type FlourPctBasis = (typeof FLOUR_PCT_BASES)[number];

export interface FlourProperties {
  /** Points of flour mass. */
  readonly proteinPct: PropertyValue;
  /** Points of flour mass. */
  readonly ashPct: PropertyValue;
  /** Hagberg falling number, seconds (amylase activity: lower = more active). */
  readonly fallingNumberS: PropertyValue;
  /** Alveograph strength W, unit '1e-4 J'. */
  readonly alveographW: PropertyValue;
  /** Alveograph P/L, no unit. */
  readonly alveographPL: PropertyValue;
  /** Boolean: malt or fungal amylase added by the mill. */
  readonly malted: PropertyValue;
}

export type FlourPropertyKey = keyof FlourProperties;

export const FLOUR_PROPERTY_KEYS: readonly FlourPropertyKey[] = [
  'proteinPct',
  'ashPct',
  'fallingNumberS',
  'alveographW',
  'alveographPL',
  'malted',
];

/** How each property is written: its value type and, for a number, its unit. */
export const FLOUR_PROPERTY_KINDS: Readonly<
  Record<
    FlourPropertyKey,
    { readonly type: 'pct' | 'number' | 'boolean'; readonly unit?: PropertyUnit }
  >
> = {
  proteinPct: { type: 'pct', unit: 'pct' },
  ashPct: { type: 'pct', unit: 'pct' },
  fallingNumberS: { type: 'number', unit: 's' },
  alveographW: { type: 'number', unit: '1e-4 J' },
  alveographPL: { type: 'number' },
  malted: { type: 'boolean' },
};

export interface FlourEntry {
  /** The id used in Formula.flours[].id. */
  readonly id: string;
  /** 1, 2, …; a version is immutable once written. */
  readonly version: number;
  /** Display name of a personal entry; a built-in entry is named by message key. */
  readonly name?: string;
  readonly builtIn: boolean;
  readonly cereal: Cereal;
  readonly refinement: Refinement;
  /** An open system code (`CA`, `FR`, `IT`, …), shown as given; nothing is inferred from it. */
  readonly classification?: { readonly system: string; readonly code: string };
  readonly brand?: string;
  readonly product?: string;
  /** Boolean property. */
  readonly organic: PropertyValue;
  readonly properties: FlourProperties;
  /** A personal entry copied from another entry. */
  readonly basedOn?: FlourRef;
  readonly notes?: string;
  readonly archived: boolean;
  readonly createdAt: Instant;
}

/** A registry entry version, as recorded by a bake (StartBake `flours`). */
export interface FlourRef {
  readonly id: string;
  readonly version: number;
}
