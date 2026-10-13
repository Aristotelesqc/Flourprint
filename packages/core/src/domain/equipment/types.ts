import type { Instant } from '../instant.js';
import type { PropertyValue, SourceRef } from '../values.js';

/** Equipment and cooking settings (docs/contracts/equipment.md). Recorded data, never predicted. */

export type ApplianceKind =
  'oven' | 'stovetop' | 'grill' | 'steamer' | 'fryer' | 'proofer' | 'other';
export const APPLIANCE_KINDS: readonly ApplianceKind[] = [
  'oven',
  'stovetop',
  'grill',
  'steamer',
  'fryer',
  'proofer',
  'other',
];

export type Preheat = 'hot' | 'cold' | 'unknown';
export const PREHEATS: readonly Preheat[] = ['hot', 'cold', 'unknown'];

/** The Flourprint oven modes (equipment.md): defined by heat sources, named by message keys. */
export type OvenMode =
  | 'bottom'
  | 'topBottom'
  | 'convection'
  | 'trueConvection'
  | 'convectionRoast'
  | 'broil'
  | 'convectionBroil'
  | 'steam'
  | 'proof'
  | 'custom';
export const OVEN_MODES: readonly OvenMode[] = [
  'bottom',
  'topBottom',
  'convection',
  'trueConvection',
  'convectionRoast',
  'broil',
  'convectionBroil',
  'steam',
  'proof',
  'custom',
];

/** An oven heat source: an element or the fan (equipment.md). */
export type HeatSource = 'top' | 'bottom' | 'rear' | 'fan';
export const HEAT_SOURCES: readonly HeatSource[] = ['top', 'bottom', 'rear', 'fan'];

/**
 * The canonical heat sources of each mode (equipment.md). `steam` and `proof` run a function or
 * a program, not elements: they have none. `custom` has none either; a step may state its own.
 */
export const OVEN_MODE_HEAT: Readonly<Record<Exclude<OvenMode, 'custom'>, readonly HeatSource[]>> =
  {
    bottom: ['bottom'],
    topBottom: ['top', 'bottom'],
    convection: ['bottom', 'fan'],
    trueConvection: ['rear', 'fan'],
    convectionRoast: ['top', 'bottom', 'fan'],
    broil: ['top'],
    convectionBroil: ['top', 'fan'],
    steam: [],
    proof: [],
  };

export type Cover = 'open' | 'covered' | 'closed' | 'unknown';
export const COVERS: readonly Cover[] = ['open', 'covered', 'closed', 'unknown'];

export type SteamSource = 'function' | 'manual' | 'none';
export const STEAM_SOURCES: readonly SteamSource[] = ['function', 'manual', 'none'];

/** A registry entry version, referenced by a step and recorded by a bake. */
export interface EquipmentRef {
  readonly id: string;
  readonly version: number;
}

/** How a step is cooked or held. Every field is optional: absent = unknown, never a default. */
export interface StepEquipment {
  readonly appliance?: ApplianceKind;
  /** An appliance profile, optional. */
  readonly profile?: EquipmentRef;
  /** Oven only: a Flourprint mode. */
  readonly mode?: OvenMode;
  /** Mode `custom` only: the heat sources the step states. Absent = unknown. */
  readonly heat?: readonly HeatSource[];
  /** The appliance's own label for this step, as read on it. */
  readonly nativeMode?: string;
  /** Temperature setpoint: oven, fryer oil, proofer. */
  readonly setpointC?: number;
  /** Power level where there is no setpoint: broil 3 of 5, burner 7 of 10. */
  readonly level?: { readonly value: number; readonly of?: number };
  readonly fan?: 'on' | 'off' | 'unknown';
  readonly steam?: { readonly source: SteamSource; readonly detail?: string };
  readonly support?: { readonly item: EquipmentRef };
  readonly vessel?: { readonly item: EquipmentRef; readonly cover: Cover };
  readonly preheated?: {
    readonly appliance?: Preheat;
    readonly support?: Preheat;
    readonly vessel?: Preheat;
  };
  /** Open code: `bottom`, `middle`, `top`, `2/5`. */
  readonly rack?: string;
  /** What goes in at the start of the step. */
  readonly load?: { readonly pieces?: number; readonly massG?: number };
}

export type EquipmentKind = 'support' | 'vessel' | 'appliance';
export const EQUIPMENT_KINDS: readonly EquipmentKind[] = ['support', 'vessel', 'appliance'];

export type EquipmentShape =
  | 'pullman'
  | 'loafPan'
  | 'dutchOven'
  | 'cloche'
  | 'skillet'
  | 'pot'
  | 'roundPan'
  | 'sheet'
  | 'stone'
  | 'steel'
  | 'baguetteTray'
  | 'rack'
  | 'other';
export const EQUIPMENT_SHAPES: readonly EquipmentShape[] = [
  'pullman',
  'loafPan',
  'dutchOven',
  'cloche',
  'skillet',
  'pot',
  'roundPan',
  'sheet',
  'stone',
  'steel',
  'baguetteTray',
  'rack',
  'other',
];

export type Material =
  | 'castIron'
  | 'enamelledCastIron'
  | 'carbonSteel'
  | 'stainlessSteel'
  | 'aluminizedSteel'
  | 'aluminium'
  | 'ceramic'
  | 'stoneware'
  | 'cordierite'
  | 'glass'
  | 'silicone'
  | 'other'
  | 'unknown';
export const MATERIALS: readonly Material[] = [
  'castIron',
  'enamelledCastIron',
  'carbonSteel',
  'stainlessSteel',
  'aluminizedSteel',
  'aluminium',
  'ceramic',
  'stoneware',
  'cordierite',
  'glass',
  'silicone',
  'other',
  'unknown',
];

export type Coating =
  'none' | 'nonStick' | 'silicone' | 'enamel' | 'seasoning' | 'other' | 'unknown';
export const COATINGS: readonly Coating[] = [
  'none',
  'nonStick',
  'silicone',
  'enamel',
  'seasoning',
  'other',
  'unknown',
];

export type Heater = 'top' | 'bottom' | 'rear' | 'other';
export const HEATERS: readonly Heater[] = ['top', 'bottom', 'rear', 'other'];
export const MODE_MAPPINGS = ['documented', 'approximate', 'unknown'] as const;
export const MODE_FANS = ['on', 'off', 'cycling', 'unknown'] as const;
export const MODE_CONTROLS = ['setpoint', 'level', 'both'] as const;

/** One native mode of an appliance profile and its closest Flourprint mode. */
export interface ApplianceMode {
  /** The label on the appliance. */
  readonly native: string;
  readonly flourprint?: OvenMode;
  readonly mapping: (typeof MODE_MAPPINGS)[number];
  /** The manual, or the baker. */
  readonly source?: SourceRef;
  readonly heaters?: readonly Heater[];
  readonly fan?: (typeof MODE_FANS)[number];
  readonly steam?: boolean;
  readonly control?: (typeof MODE_CONTROLS)[number];
}

export interface EquipmentEntry {
  readonly id: string;
  /** 1, 2, …; a version is immutable once written. */
  readonly version: number;
  readonly kind: EquipmentKind;
  readonly builtIn: boolean;
  /** A personal entry's name; a built-in one is named by message key. */
  readonly name?: string;
  // support and vessel
  readonly shape?: EquipmentShape;
  /** The body. */
  readonly material?: Material;
  readonly coating?: Coating;
  /** A vessel that has one. */
  readonly lid?: { readonly material: Material };
  /** Interior dimensions, millimetres. */
  readonly interior?: {
    readonly lengthMm?: number;
    readonly widthMm?: number;
    readonly heightMm?: number;
    readonly diameterMm?: number;
  };
  /** Useful volume in millilitres, measured or computed, with its source. */
  readonly volumeMl?: PropertyValue;
  readonly thicknessMm?: PropertyValue;
  // appliance
  readonly appliance?: ApplianceKind;
  readonly modes?: readonly ApplianceMode[];
  readonly basedOn?: EquipmentRef;
  readonly notes?: string;
  readonly archived: boolean;
  readonly createdAt: Instant;
}
