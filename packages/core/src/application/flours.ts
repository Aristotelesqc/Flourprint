import {
  BUILT_IN_FLOURS,
  builtInFlour,
  domainError,
  err,
  FLOUR_PROPERTY_KEYS,
  nextFlourVersion,
  validateFlourEntry,
  type FlourEntry,
  type FlourEntryError,
  type FlourRef,
  type Instant,
  type PropertyValue,
  type Result,
} from '../domain/index.js';
import { isCount, isId, isInstant, isObject, refuse, type Json } from './decode.js';
import type { FlourRegistry, FlourStoreError } from './ports.js';

const ENTRY_FIELDS = new Set([
  'id',
  'version',
  'name',
  'builtIn',
  'cereal',
  'refinement',
  'classification',
  'brand',
  'product',
  'organic',
  'properties',
  'basedOn',
  'notes',
  'archived',
  'createdAt',
]);
const VALUE_FIELDS = new Set(['status', 'value', 'unit', 'basis', 'source', 'uncertainty']);

const onlyFields = (value: Json, allowed: ReadonlySet<string>, where: string): void => {
  const extra = Object.keys(value).find((key) => !allowed.has(key));
  if (extra !== undefined) refuse(`${where} has an unknown field ${extra}`);
};

const decodeProperty = (value: unknown, where: string): PropertyValue => {
  if (!isObject(value)) return refuse(`${where} is not a property value`);
  if (value.status === 'unknown') {
    onlyFields(value, new Set(['status']), where);
    return { status: 'unknown' };
  }
  onlyFields(value, VALUE_FIELDS, where);
  if (value.status !== 'known' && value.status !== 'estimated') {
    return refuse(`${where} has an invalid status`);
  }
  const { source } = value;
  if (!isObject(source) || typeof source.kind !== 'string') {
    return refuse(`${where} has no valid source`);
  }
  onlyFields(source, new Set(['kind', 'detail']), `${where} source`);
  // Value types, units, bases and source kinds are checked by the domain (validateFlourEntry).
  return value as unknown as PropertyValue;
};

/**
 * Decodes a flour entry from untrusted JSON (backups, stored documents): structure first, then
 * the domain's checks (flours.md). Throws `Refused` on the first problem.
 */
export const decodeFlourEntry = (value: unknown, where = 'flour entry'): FlourEntry => {
  if (!isObject(value) || !isId(value.id)) return refuse(`${where} has no valid id`);
  const at = `${where} ${value.id}`;
  onlyFields(value, ENTRY_FIELDS, at);
  if (!isCount(value.version)) return refuse(`${at} has no valid version`);
  if (!isInstant(value.createdAt)) return refuse(`${at} has no valid createdAt`);
  const input = value.properties;
  if (!isObject(input)) return refuse(`${at} has no properties`);
  onlyFields(input, new Set(FLOUR_PROPERTY_KEYS), `${at} properties`);
  const properties = Object.fromEntries(
    FLOUR_PROPERTY_KEYS.map((key) => [key, decodeProperty(input[key], `${at} ${key}`)]),
  );
  const { classification, basedOn } = value;
  if (classification !== undefined) {
    if (!isObject(classification)) return refuse(`${at} has an invalid classification`);
    onlyFields(classification, new Set(['system', 'code']), `${at} classification`);
  }
  if (basedOn !== undefined) {
    if (!isObject(basedOn)) return refuse(`${at} has an invalid basedOn`);
    onlyFields(basedOn, new Set(['id', 'version']), `${at} basedOn`);
  }
  const entry = {
    ...value,
    organic: decodeProperty(value.organic, `${at} organic`),
    properties,
  } as unknown as FlourEntry;
  const valid = validateFlourEntry(entry);
  if (!valid.ok) return refuse(`${at} is not valid: ${valid.error.details?.field ?? ''}`);
  return valid.value;
};

export type SaveFlourError = FlourStoreError | FlourEntryError;

/**
 * Writes a personal entry version after the domain checks; the registry refuses a version that is
 * not the next one for its id (HeadConflict). Built-in entries are never written.
 */
export const saveFlourEntry = async (
  registry: FlourRegistry,
  entry: FlourEntry,
): Promise<Result<FlourEntry, SaveFlourError>> => {
  if (entry.builtIn) {
    return err(
      domainError('InvalidFlourEntry', 'A built-in entry is never stored', {
        field: 'builtIn',
        reason: 'built-in entries are code',
      }),
    );
  }
  const valid = validateFlourEntry(entry);
  if (!valid.ok) return valid;
  return registry.saveFlour(valid.value);
};

/** Archives (or brings back) an entry: a new version with `archived` set (flours.md). */
export const archiveFlour = async (
  registry: FlourRegistry,
  current: FlourEntry,
  createdAt: Instant,
  archived = true,
): Promise<Result<FlourEntry, SaveFlourError>> => {
  const next = nextFlourVersion(current, { archived }, createdAt);
  if (!next.ok) return next;
  return saveFlourEntry(registry, next.value);
};

/** Built-in entries and the latest version of each personal entry, archived ones included. */
export const flourCatalog = async (registry: FlourRegistry): Promise<readonly FlourEntry[]> => [
  ...BUILT_IN_FLOURS,
  ...(await registry.listFlours()),
];

/**
 * StartBake `flours` (flours.md): for each flour id that has a registry entry, its current
 * version (`personal`: the latest version of each personal entry). An id without an entry (typed
 * or imported before the registry) is left out.
 */
export const flourRefsOf = (
  flourIds: readonly string[],
  personal: readonly FlourEntry[],
): FlourRef[] => {
  const latest = new Map(personal.map((entry) => [entry.id, entry]));
  return [...new Set(flourIds)].flatMap((id) => {
    const entry = latest.get(id) ?? builtInFlour(id);
    return entry ? [{ id, version: entry.version }] : [];
  });
};

/** `flourRefsOf` with the registry's current entries. */
export const currentFlourRefs = async (
  registry: FlourRegistry,
  flourIds: readonly string[],
): Promise<FlourRef[]> => flourRefsOf(flourIds, await registry.listFlours());
