import { domainError, type DomainError } from '../errors.js';
import { isReservedId } from '../ids.js';
import { parseInstant, type Instant } from '../instant.js';
import { err, ok, type Result } from '../result.js';
import type { PropertyValue } from '../values.js';
import { builtInEquipment } from './builtin.js';
import {
  APPLIANCE_KINDS,
  COATINGS,
  EQUIPMENT_KINDS,
  EQUIPMENT_SHAPES,
  HEATERS,
  MATERIALS,
  MODE_CONTROLS,
  MODE_FANS,
  MODE_MAPPINGS,
  OVEN_MODES,
  type EquipmentEntry,
  type EquipmentKind,
} from './types.js';

export type EquipmentEntryError = DomainError<
  'InvalidEquipmentEntry',
  { field: string; reason: string }
>;

const invalid = (field: string, reason: string): EquipmentEntryError =>
  domainError('InvalidEquipmentEntry', `Invalid equipment entry: ${field} ${reason}`, {
    field,
    reason,
  });

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;
const isPositive = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0;
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SOURCE_KINDS: readonly string[] = ['package', 'producer', 'lab', 'reference', 'personal'];

const sourceProblem = (source: unknown): string | undefined => {
  if (!isObject(source) || !SOURCE_KINDS.includes(source.kind as string)) {
    return 'has no valid source';
  }
  if (source.detail !== undefined && typeof source.detail !== 'string') {
    return 'has an invalid source detail';
  }
  return undefined;
};

/** A measured or computed size (volume in ml, thickness in mm): unit is in the field name. */
const sizeProblem = (property: PropertyValue): string | undefined => {
  if (!isObject(property)) return 'must be a property value';
  if (property.status === 'unknown') return undefined;
  if (property.status !== 'known' && property.status !== 'estimated') return 'has a bad status';
  if (!isPositive(property.value)) return 'must be a number > 0';
  if (property.unit !== undefined || property.basis !== undefined) {
    return 'takes no unit (it is in the field name)';
  }
  if (
    property.uncertainty !== undefined &&
    !(
      typeof property.uncertainty === 'number' &&
      Number.isFinite(property.uncertainty) &&
      property.uncertainty >= 0
    )
  ) {
    return 'has an invalid uncertainty';
  }
  return sourceProblem(property.source);
};

const modeProblem = (mode: unknown, path: string): EquipmentEntryError | undefined => {
  if (!isObject(mode)) return invalid(path, 'must be an object');
  if (!isText(mode.native)) return invalid(`${path}.native`, 'is required');
  if (!MODE_MAPPINGS.includes(mode.mapping as never)) {
    return invalid(`${path}.mapping`, 'must be documented, approximate or unknown');
  }
  if (mode.flourprint !== undefined && !OVEN_MODES.includes(mode.flourprint as never)) {
    return invalid(`${path}.flourprint`, 'is not a known mode');
  }
  if (mode.mapping === 'unknown' && mode.flourprint !== undefined) {
    return invalid(`${path}.flourprint`, 'is not allowed when the mapping is unknown');
  }
  if (mode.mapping !== 'unknown' && mode.flourprint === undefined) {
    return invalid(`${path}.flourprint`, 'is required for a documented or approximate mapping');
  }
  if (mode.mapping === 'documented' && mode.source === undefined) {
    return invalid(`${path}.source`, 'is required for a documented mapping');
  }
  if (mode.source !== undefined) {
    const bad = sourceProblem(mode.source);
    if (bad) return invalid(`${path}.source`, bad);
  }
  if (
    mode.heaters !== undefined &&
    !(Array.isArray(mode.heaters) && mode.heaters.every((h) => HEATERS.includes(h)))
  ) {
    return invalid(`${path}.heaters`, 'must list top, bottom, rear or other');
  }
  if (mode.fan !== undefined && !MODE_FANS.includes(mode.fan as never)) {
    return invalid(`${path}.fan`, 'must be on, off, cycling or unknown');
  }
  if (mode.steam !== undefined && typeof mode.steam !== 'boolean') {
    return invalid(`${path}.steam`, 'must be true or false');
  }
  if (mode.control !== undefined && !MODE_CONTROLS.includes(mode.control as never)) {
    return invalid(`${path}.control`, 'must be setpoint, level or both');
  }
  return undefined;
};

/**
 * Checks an equipment entry document (equipment.md): identifiers, enumerations, dimensions,
 * sizes and appliance modes. Unknown stays unknown: nothing is defaulted.
 */
export const validateEquipmentEntry = (
  entry: EquipmentEntry,
): Result<EquipmentEntry, EquipmentEntryError> => {
  if (!isText(entry.id) || isReservedId(entry.id)) return err(invalid('id', 'is not valid'));
  if (!isCount(entry.version)) return err(invalid('version', 'must be an integer ≥ 1'));
  if (!EQUIPMENT_KINDS.includes(entry.kind)) {
    return err(invalid('kind', 'must be support, vessel or appliance'));
  }
  if (typeof entry.builtIn !== 'boolean') return err(invalid('builtIn', 'must be a boolean'));
  if (!entry.builtIn) {
    if (!isText(entry.name)) return err(invalid('name', 'is required for a personal entry'));
    if (builtInEquipment(entry.id)) return err(invalid('id', 'is the id of a built-in entry'));
  } else if (entry.name !== undefined) {
    return err(invalid('name', 'is a message key for a built-in entry'));
  }
  if (entry.shape !== undefined && !EQUIPMENT_SHAPES.includes(entry.shape)) {
    return err(invalid('shape', 'is not supported'));
  }
  if (entry.material !== undefined && !MATERIALS.includes(entry.material)) {
    return err(invalid('material', 'is not supported'));
  }
  if (entry.coating !== undefined && !COATINGS.includes(entry.coating)) {
    return err(invalid('coating', 'is not supported'));
  }
  if (entry.lid !== undefined) {
    if (!isObject(entry.lid) || !MATERIALS.includes(entry.lid.material)) {
      return err(invalid('lid', 'needs a material'));
    }
  }
  if (entry.interior !== undefined) {
    if (!isObject(entry.interior)) return err(invalid('interior', 'must be an object'));
    for (const [key, value] of Object.entries(entry.interior)) {
      if (!['lengthMm', 'widthMm', 'heightMm', 'diameterMm'].includes(key)) {
        return err(invalid(`interior.${key}`, 'is not a known dimension'));
      }
      if (!isPositive(value)) return err(invalid(`interior.${key}`, 'must be a number > 0'));
    }
  }
  for (const key of ['volumeMl', 'thicknessMm'] as const) {
    const property = entry[key];
    if (property === undefined) continue;
    const bad = sizeProblem(property);
    if (bad) return err(invalid(key, bad));
  }
  if (entry.appliance !== undefined && !APPLIANCE_KINDS.includes(entry.appliance)) {
    return err(invalid('appliance', 'is not supported'));
  }
  if (entry.modes !== undefined) {
    if (!Array.isArray(entry.modes)) return err(invalid('modes', 'must be a list'));
    for (const [i, mode] of entry.modes.entries()) {
      const bad = modeProblem(mode, `modes[${i}]`);
      if (bad) return err(bad);
    }
  }
  if (entry.basedOn !== undefined) {
    if (!isObject(entry.basedOn)) return err(invalid('basedOn', 'must be an object'));
    if (!isText(entry.basedOn.id) || !isCount(entry.basedOn.version)) {
      return err(invalid('basedOn', 'is not a valid reference'));
    }
    if (entry.basedOn.id === entry.id) return err(invalid('basedOn', 'refers to the entry itself'));
  }
  if (entry.notes !== undefined && typeof entry.notes !== 'string') {
    return err(invalid('notes', 'must be text'));
  }
  if (typeof entry.archived !== 'boolean') return err(invalid('archived', 'must be a boolean'));
  if (typeof entry.createdAt !== 'string' || !parseInstant(entry.createdAt).ok) {
    return err(invalid('createdAt', 'is not a UTC instant'));
  }
  return ok(entry);
};

/** A new personal entry, version 1, with every property unknown (absent). */
export const newEquipmentEntry = (input: {
  readonly id: string;
  readonly kind: EquipmentKind;
  readonly name: string;
  readonly createdAt: Instant;
}): EquipmentEntry => ({
  id: input.id,
  version: 1,
  kind: input.kind,
  name: input.name,
  builtIn: false,
  archived: false,
  createdAt: input.createdAt,
});

/**
 * Customizing an entry (equipment.md, flours.md): a personal entry with a new id, `basedOn` the
 * source version, and the same fields until changed. A built-in is named by message key, so the
 * caller gives the name (the localized one, by default).
 */
export const customizeEquipment = (
  source: EquipmentEntry,
  input: { readonly id: string; readonly name: string; readonly createdAt: Instant },
): EquipmentEntry => {
  const { name: _name, basedOn: _basedOn, ...fields } = source;
  return {
    ...fields,
    id: input.id,
    version: 1,
    name: input.name,
    builtIn: false,
    basedOn: { id: source.id, version: source.version },
    archived: false,
    createdAt: input.createdAt,
  };
};

/** Fields a new version may change; an optional field set to undefined is cleared. */
export type EquipmentChanges = {
  readonly [
    K in Exclude<
      keyof EquipmentEntry,
      'id' | 'version' | 'kind' | 'builtIn' | 'basedOn' | 'createdAt'
    >
  ]?: EquipmentEntry[K] | undefined;
};

/** The entry with the changes applied; an optional field set to undefined is removed. */
export const withEquipmentChanges = (
  entry: EquipmentEntry,
  changes: EquipmentChanges,
): EquipmentEntry =>
  Object.fromEntries(
    Object.entries({ ...entry, ...changes }).filter(([, value]) => value !== undefined),
  ) as unknown as EquipmentEntry;

/**
 * The next version of a personal entry with the given changes; the id, the kind, the origin and
 * the built-in flag are kept. A built-in entry is never edited (customize it instead).
 */
export const nextEquipmentVersion = (
  current: EquipmentEntry,
  changes: EquipmentChanges,
  createdAt: Instant,
): Result<EquipmentEntry, EquipmentEntryError> => {
  if (current.builtIn) return err(invalid('builtIn', 'a built-in entry is never edited'));
  const next = withEquipmentChanges(current, changes);
  return validateEquipmentEntry({ ...next, version: current.version + 1, createdAt });
};
