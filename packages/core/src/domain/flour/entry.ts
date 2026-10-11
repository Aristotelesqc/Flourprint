import { domainError, type DomainError } from '../errors.js';
import { isReservedId } from '../ids.js';
import { parseInstant, type Instant } from '../instant.js';
import { err, ok, type Result } from '../result.js';
import type { PropertyValue } from '../values.js';
import { builtInFlour, unknownFlourProperties } from './builtin.js';
import {
  CEREALS,
  FLOUR_PCT_BASES,
  FLOUR_PROPERTY_KEYS,
  FLOUR_PROPERTY_KINDS,
  FLOUR_SOURCE_KINDS,
  REFINEMENTS,
  type FlourEntry,
  type FlourPropertyKey,
} from './types.js';

export type FlourEntryError = DomainError<'InvalidFlourEntry', { field: string; reason: string }>;

const invalid = (field: string, reason: string): FlourEntryError =>
  domainError('InvalidFlourEntry', `Invalid flour entry: ${field} ${reason}`, { field, reason });

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;
const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

type Kind = (typeof FLOUR_PROPERTY_KINDS)[FlourPropertyKey];

/** Checks one property against its kind; returns the reason it is invalid, if any. */
const propertyProblem = (property: PropertyValue, kind: Kind): string | undefined => {
  if (property.status === 'unknown') return undefined;
  if (property.status !== 'known' && property.status !== 'estimated') return 'has a bad status';
  const { value } = property;
  if (kind.type === 'boolean') {
    if (typeof value !== 'boolean') return 'must be true or false';
    if (property.unit !== undefined || property.basis !== undefined) return 'takes no unit';
    if (property.uncertainty !== undefined) return 'takes no uncertainty';
  } else {
    if (!isFinite(value) || value < 0) return 'must be a number ≥ 0';
    if (kind.type === 'pct' && value > 100) return 'must be at most 100 %';
    if (property.unit !== undefined && property.unit !== kind.unit) return 'has a wrong unit';
    if (property.basis !== undefined) {
      if (kind.type !== 'pct') return 'takes no basis';
      if (!(FLOUR_PCT_BASES as readonly string[]).includes(property.basis)) {
        return 'has an unsupported basis';
      }
    }
    if (
      property.uncertainty !== undefined &&
      (!isFinite(property.uncertainty) || property.uncertainty < 0)
    ) {
      return 'has an invalid uncertainty';
    }
  }
  const { source } = property;
  if (
    typeof source !== 'object' ||
    source === null ||
    !(FLOUR_SOURCE_KINDS as readonly string[]).includes(source.kind)
  ) {
    return 'has no valid source';
  }
  if (source.detail !== undefined && typeof source.detail !== 'string') {
    return 'has an invalid source detail';
  }
  return undefined;
};

/**
 * Checks a flour entry document (flours.md): identifiers, enumerations, and each property against
 * its kind (unit, basis of a percentage, source). Unknown stays unknown: nothing is defaulted.
 */
export const validateFlourEntry = (entry: FlourEntry): Result<FlourEntry, FlourEntryError> => {
  if (!isText(entry.id) || isReservedId(entry.id)) return err(invalid('id', 'is not valid'));
  if (!isCount(entry.version)) return err(invalid('version', 'must be an integer ≥ 1'));
  if (typeof entry.builtIn !== 'boolean') return err(invalid('builtIn', 'must be a boolean'));
  if (!entry.builtIn) {
    if (!isText(entry.name)) return err(invalid('name', 'is required for a personal entry'));
    if (builtInFlour(entry.id)) return err(invalid('id', 'is the id of a built-in entry'));
  } else if (entry.name !== undefined) {
    return err(invalid('name', 'is a message key for a built-in entry'));
  }
  if (!CEREALS.includes(entry.cereal)) return err(invalid('cereal', 'is not supported'));
  if (!REFINEMENTS.includes(entry.refinement)) {
    return err(invalid('refinement', 'is not supported'));
  }
  if (
    entry.classification !== undefined &&
    (!isText(entry.classification.system) || !isText(entry.classification.code))
  ) {
    return err(invalid('classification', 'needs a system and a code'));
  }
  for (const field of ['brand', 'product', 'notes'] as const) {
    const value = entry[field];
    if (value !== undefined && typeof value !== 'string') {
      return err(invalid(field, 'must be text'));
    }
  }
  const organic = propertyProblem(entry.organic, { type: 'boolean' });
  if (organic) return err(invalid('organic', organic));
  for (const key of FLOUR_PROPERTY_KEYS) {
    const property = entry.properties[key];
    if (property === undefined) return err(invalid(`properties.${key}`, 'is missing'));
    const problem = propertyProblem(property, FLOUR_PROPERTY_KINDS[key]);
    if (problem) return err(invalid(`properties.${key}`, problem));
  }
  if (entry.basedOn !== undefined) {
    if (!isText(entry.basedOn.id) || !isCount(entry.basedOn.version)) {
      return err(invalid('basedOn', 'is not a valid reference'));
    }
    if (entry.basedOn.id === entry.id) return err(invalid('basedOn', 'refers to the entry itself'));
  }
  if (typeof entry.archived !== 'boolean') return err(invalid('archived', 'must be a boolean'));
  if (typeof entry.createdAt !== 'string' || !parseInstant(entry.createdAt).ok) {
    return err(invalid('createdAt', 'is not a UTC instant'));
  }
  return ok(entry);
};

/** A new personal entry, version 1, with every property unknown. */
export const newFlourEntry = (input: {
  readonly id: string;
  readonly name: string;
  readonly createdAt: Instant;
}): FlourEntry => ({
  id: input.id,
  version: 1,
  name: input.name,
  builtIn: false,
  cereal: 'unknown',
  refinement: 'unknown',
  organic: { status: 'unknown' },
  properties: unknownFlourProperties(),
  archived: false,
  createdAt: input.createdAt,
});

/**
 * Customizing an entry (flours.md): a personal entry with a new id, `basedOn` the source version,
 * and the same fields until changed. A built-in is named by message key, so the caller gives the
 * name (the localized one, by default).
 */
export const customizeFlour = (
  source: FlourEntry,
  input: { readonly id: string; readonly name: string; readonly createdAt: Instant },
): FlourEntry => {
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
export type FlourChanges = {
  readonly [
    K in Exclude<keyof FlourEntry, 'id' | 'version' | 'builtIn' | 'basedOn' | 'createdAt'>
  ]?: FlourEntry[K] | undefined;
};

/** The entry with the changes applied; an optional field set to undefined is removed. */
export const withFlourChanges = (entry: FlourEntry, changes: FlourChanges): FlourEntry =>
  Object.fromEntries(
    Object.entries({ ...entry, ...changes }).filter(([, value]) => value !== undefined),
  ) as unknown as FlourEntry;

/**
 * The next version of a personal entry with the given changes; the id, the origin and the
 * built-in flag are kept. A built-in entry is never edited (customize it instead).
 */
export const nextFlourVersion = (
  current: FlourEntry,
  changes: FlourChanges,
  createdAt: Instant,
): Result<FlourEntry, FlourEntryError> => {
  if (current.builtIn) return err(invalid('builtIn', 'a built-in entry is never edited'));
  const next = withFlourChanges(current, changes);
  return validateFlourEntry({ ...next, version: current.version + 1, createdAt });
};
