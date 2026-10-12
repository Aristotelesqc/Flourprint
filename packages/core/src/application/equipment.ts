import {
  BUILT_IN_EQUIPMENT,
  builtInEquipment,
  domainError,
  err,
  nextEquipmentVersion,
  processEquipmentRefs,
  validateEquipmentEntry,
  type EquipmentEntry,
  type EquipmentEntryError,
  type EquipmentRef,
  type Instant,
  type Process,
  type PropertyValue,
  type Result,
} from '../domain/index.js';
import { isCount, isId, isInstant, isObject, refuse, type Json } from './decode.js';
import type { EquipmentRegistry, EquipmentStoreError } from './ports.js';

const ENTRY_FIELDS = new Set([
  'id',
  'version',
  'kind',
  'builtIn',
  'name',
  'shape',
  'material',
  'coating',
  'lid',
  'interior',
  'volumeMl',
  'thicknessMm',
  'appliance',
  'modes',
  'basedOn',
  'notes',
  'archived',
  'createdAt',
]);
const VALUE_FIELDS = new Set(['status', 'value', 'unit', 'basis', 'source', 'uncertainty']);
const MODE_FIELDS = new Set([
  'native',
  'flourprint',
  'mapping',
  'source',
  'heaters',
  'fan',
  'steam',
  'control',
]);

const onlyFields = (value: Json, allowed: ReadonlySet<string>, where: string): void => {
  const extra = Object.keys(value).find((key) => !allowed.has(key));
  if (extra !== undefined) refuse(`${where} has an unknown field ${extra}`);
};

const decodeSource = (value: unknown, where: string): void => {
  if (!isObject(value) || typeof value.kind !== 'string') {
    return refuse(`${where} has no valid source`);
  }
  onlyFields(value, new Set(['kind', 'detail']), `${where} source`);
};

const decodeSize = (value: unknown, where: string): PropertyValue => {
  if (!isObject(value)) return refuse(`${where} is not a property value`);
  if (value.status === 'unknown') {
    onlyFields(value, new Set(['status']), where);
    return { status: 'unknown' };
  }
  onlyFields(value, VALUE_FIELDS, where);
  if (value.status !== 'known' && value.status !== 'estimated') {
    return refuse(`${where} has an invalid status`);
  }
  decodeSource(value.source, where);
  // Value type, unit and source kind are checked by the domain (validateEquipmentEntry).
  return value as unknown as PropertyValue;
};

/**
 * Decodes an equipment entry from untrusted JSON (backups, stored documents, snapshots): structure
 * first, then the domain's checks (equipment.md). Throws `Refused` on the first problem.
 */
export const decodeEquipmentEntry = (value: unknown, where = 'equipment entry'): EquipmentEntry => {
  if (!isObject(value) || !isId(value.id)) return refuse(`${where} has no valid id`);
  const at = `${where} ${value.id}`;
  onlyFields(value, ENTRY_FIELDS, at);
  if (!isCount(value.version)) return refuse(`${at} has no valid version`);
  if (!isInstant(value.createdAt)) return refuse(`${at} has no valid createdAt`);
  const { lid, interior, basedOn, modes } = value;
  if (lid !== undefined) {
    if (!isObject(lid)) return refuse(`${at} has an invalid lid`);
    onlyFields(lid, new Set(['material']), `${at} lid`);
  }
  if (interior !== undefined) {
    if (!isObject(interior)) return refuse(`${at} has an invalid interior`);
    onlyFields(
      interior,
      new Set(['lengthMm', 'widthMm', 'heightMm', 'diameterMm']),
      `${at} interior`,
    );
  }
  if (basedOn !== undefined) {
    if (!isObject(basedOn)) return refuse(`${at} has an invalid basedOn`);
    onlyFields(basedOn, new Set(['id', 'version']), `${at} basedOn`);
  }
  if (modes !== undefined) {
    if (!Array.isArray(modes)) return refuse(`${at} has invalid modes`);
    modes.forEach((mode: unknown, i) => {
      if (!isObject(mode)) return refuse(`${at} mode ${i + 1} is not an object`);
      onlyFields(mode, MODE_FIELDS, `${at} mode ${i + 1}`);
      if (mode.source !== undefined) decodeSource(mode.source, `${at} mode ${i + 1}`);
    });
  }
  const entry = {
    ...value,
    ...(value.volumeMl === undefined
      ? {}
      : { volumeMl: decodeSize(value.volumeMl, `${at} volumeMl`) }),
    ...(value.thicknessMm === undefined
      ? {}
      : { thicknessMm: decodeSize(value.thicknessMm, `${at} thicknessMm`) }),
  } as unknown as EquipmentEntry;
  const valid = validateEquipmentEntry(entry);
  if (!valid.ok) {
    return refuse(`${at} is not valid: ${valid.error.details?.field ?? ''}`);
  }
  return valid.value;
};

export type SaveEquipmentError = EquipmentStoreError | EquipmentEntryError;

/**
 * Writes a personal entry version after the domain checks; the registry refuses a version that is
 * not the next one for its id (HeadConflict). Built-in entries are never written.
 */
export const saveEquipmentEntry = async (
  registry: EquipmentRegistry,
  entry: EquipmentEntry,
): Promise<Result<EquipmentEntry, SaveEquipmentError>> => {
  if (entry.builtIn) {
    return err(
      domainError('InvalidEquipmentEntry', 'A built-in entry is never stored', {
        field: 'builtIn',
        reason: 'built-in entries are code',
      }),
    );
  }
  const valid = validateEquipmentEntry(entry);
  if (!valid.ok) return valid;
  return registry.saveEquipment(valid.value);
};

/** Archives (or brings back) an entry: a new version with `archived` set (equipment.md). */
export const archiveEquipment = async (
  registry: EquipmentRegistry,
  current: EquipmentEntry,
  createdAt: Instant,
  archived = true,
): Promise<Result<EquipmentEntry, SaveEquipmentError>> => {
  const next = nextEquipmentVersion(current, { archived }, createdAt);
  if (!next.ok) return next;
  return saveEquipmentEntry(registry, next.value);
};

/** Built-in entries and the latest version of each personal entry, archived ones included. */
export const equipmentCatalog = async (
  registry: EquipmentRegistry,
): Promise<readonly EquipmentEntry[]> => [
  ...BUILT_IN_EQUIPMENT,
  ...(await registry.listEquipment()),
];

/**
 * StartBake `equipment` (equipment.md): the entry version each reference names, built-in (code)
 * or personal (registry). A reference that does not resolve is left out, and StartBake then
 * refuses the process.
 */
export const resolveEquipmentRefs = async (
  registry: EquipmentRegistry,
  refs: readonly EquipmentRef[],
): Promise<EquipmentEntry[]> => {
  const entries: EquipmentEntry[] = [];
  for (const ref of refs) {
    const built = builtInEquipment(ref.id, ref.version);
    if (built) {
      entries.push(built);
      continue;
    }
    const stored = await registry.getEquipment(ref.id, ref.version);
    if (stored.ok && stored.value) entries.push(stored.value);
  }
  return entries;
};

/** `resolveEquipmentRefs` for every entry version a process references. */
export const processEquipmentEntries = (
  registry: EquipmentRegistry,
  process: Process,
): Promise<EquipmentEntry[]> => resolveEquipmentRefs(registry, processEquipmentRefs(process));
