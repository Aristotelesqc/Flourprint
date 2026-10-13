import type { Instant } from '../instant.js';
import type { PropertyValue } from '../values.js';
import type { EquipmentEntry, EquipmentShape, Material } from './types.js';

const UNKNOWN: PropertyValue = { status: 'unknown' };

/** When the built-in entries were defined (equipment.md, owner decisions). */
const BUILT_IN_AT = '2026-10-12T00:00:00.000Z' as Instant;

interface Definition {
  readonly id: string;
  readonly kind: 'support' | 'vessel';
  readonly shape: EquipmentShape;
  readonly material: Material;
  readonly lid?: Material;
}

/** The built-ins of the contract table (equipment.md), in the order the registry lists them. */
const DEFINITIONS: readonly Definition[] = [
  { id: 'baking-stone', kind: 'support', shape: 'stone', material: 'cordierite' },
  { id: 'baking-steel', kind: 'support', shape: 'steel', material: 'carbonSteel' },
  { id: 'aluminium-sheet', kind: 'support', shape: 'sheet', material: 'aluminium' },
  { id: 'oven-rack', kind: 'support', shape: 'rack', material: 'stainlessSteel' },
  {
    id: 'dutch-oven-cast-iron',
    kind: 'vessel',
    shape: 'dutchOven',
    material: 'castIron',
    lid: 'castIron',
  },
  {
    id: 'pullman-steel',
    kind: 'vessel',
    shape: 'pullman',
    material: 'aluminizedSteel',
    lid: 'aluminizedSteel',
  },
  {
    id: 'pullman-aluminium',
    kind: 'vessel',
    shape: 'pullman',
    material: 'aluminium',
    lid: 'aluminium',
  },
  { id: 'loaf-pan-steel', kind: 'vessel', shape: 'loafPan', material: 'carbonSteel' },
  { id: 'loaf-pan-silicone', kind: 'vessel', shape: 'loafPan', material: 'silicone' },
  { id: 'loaf-pan-ceramic', kind: 'vessel', shape: 'loafPan', material: 'ceramic' },
  { id: 'loaf-pan-glass', kind: 'vessel', shape: 'loafPan', material: 'glass' },
  { id: 'cast-iron-skillet', kind: 'vessel', shape: 'skillet', material: 'castIron' },
  { id: 'baguette-tray', kind: 'support', shape: 'baguetteTray', material: 'aluminium' },
  { id: 'pot', kind: 'vessel', shape: 'pot', material: 'stainlessSteel', lid: 'stainlessSteel' },
];

/** Current version of the built-ins: a bake started now records it. */
export const BUILT_IN_EQUIPMENT_VERSION = 1;

/**
 * Built-in entries (equipment.md): generic items, no brand, every property unknown except shape
 * and material. Code, never stored, never edited; named by message key `equipment.<id>.name`.
 * There is no built-in appliance: the Flourprint modes are the default.
 */
export const BUILT_IN_EQUIPMENT: readonly EquipmentEntry[] = DEFINITIONS.map(
  (definition): EquipmentEntry => ({
    id: definition.id,
    version: BUILT_IN_EQUIPMENT_VERSION,
    kind: definition.kind,
    builtIn: true,
    shape: definition.shape,
    material: definition.material,
    coating: 'unknown',
    ...(definition.lid === undefined ? {} : { lid: { material: definition.lid } }),
    volumeMl: UNKNOWN,
    thicknessMm: UNKNOWN,
    archived: false,
    createdAt: BUILT_IN_AT,
  }),
);

/** A built-in entry: its current version, or the given one; undefined if there is none. */
export const builtInEquipment = (id: string, version?: number): EquipmentEntry | undefined =>
  BUILT_IN_EQUIPMENT.find(
    (entry) => entry.id === id && entry.version === (version ?? BUILT_IN_EQUIPMENT_VERSION),
  );
