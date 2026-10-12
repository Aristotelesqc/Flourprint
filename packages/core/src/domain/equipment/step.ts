import { isReservedId } from '../ids.js';
import type { Process } from '../process/types.js';
import { builtInEquipment } from './builtin.js';
import { validateEquipmentEntry } from './entry.js';
import {
  APPLIANCE_KINDS,
  COVERS,
  OVEN_MODES,
  PREHEATS,
  STEAM_SOURCES,
  type EquipmentEntry,
  type EquipmentKind,
  type EquipmentRef,
  type StepEquipment,
} from './types.js';

/** A problem found in a step's equipment: the path below the step, and why. */
export interface EquipmentProblem {
  readonly path: string;
  readonly reason: string;
}

const problem = (path: string, reason: string): EquipmentProblem => ({ path, reason });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);
const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const STEP_FIELDS = new Set([
  'appliance',
  'profile',
  'mode',
  'nativeMode',
  'setpointC',
  'level',
  'fan',
  'steam',
  'support',
  'vessel',
  'preheated',
  'rack',
  'load',
]);

const onlyKeys = (
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  path: string,
): EquipmentProblem | undefined => {
  const extra = Object.keys(value).find((key) => !allowed.has(key));
  return extra === undefined ? undefined : problem(`${path}.${extra}`, 'is not a known field');
};

const refProblem = (value: unknown, path: string): EquipmentProblem | undefined => {
  if (!isObject(value)) return problem(path, 'must be a reference');
  const extra = onlyKeys(value, new Set(['id', 'version']), path);
  if (extra) return extra;
  if (!isText(value.id) || isReservedId(value.id)) return problem(`${path}.id`, 'is not valid');
  if (!(Number.isInteger(value.version) && (value.version as number) >= 1)) {
    return problem(`${path}.version`, 'must be an integer ≥ 1');
  }
  return undefined;
};

/**
 * The rules of the settings of a step (equipment.md), structurally: absent fields are unknown and
 * nothing is defaulted. Whether a reference resolves to an entry of the right kind needs the
 * entries, see `equipmentRefProblem`. Returns the first problem, if any.
 */
export const stepEquipmentProblem = (
  equipment: StepEquipment,
  path = 'equipment',
): EquipmentProblem | undefined => {
  if (!isObject(equipment)) return problem(path, 'must be an object');
  const extra = onlyKeys(equipment, STEP_FIELDS, path);
  if (extra) return extra;
  const e = equipment as Record<string, unknown>;
  if (e.appliance !== undefined && !APPLIANCE_KINDS.includes(e.appliance as never)) {
    return problem(`${path}.appliance`, 'is not a known appliance');
  }
  if (e.profile !== undefined) {
    const bad = refProblem(e.profile, `${path}.profile`);
    if (bad) return bad;
  }
  if (e.mode !== undefined) {
    if (!OVEN_MODES.includes(e.mode as never)) return problem(`${path}.mode`, 'is not a known mode');
    if (e.appliance !== 'oven') return problem(`${path}.mode`, 'needs the appliance oven');
  }
  if (e.nativeMode !== undefined && !isText(e.nativeMode)) {
    return problem(`${path}.nativeMode`, 'must be text');
  }
  if (e.setpointC !== undefined && !isFinite(e.setpointC)) {
    return problem(`${path}.setpointC`, 'must be a finite temperature');
  }
  if (e.level !== undefined) {
    const level = e.level;
    if (!isObject(level)) return problem(`${path}.level`, 'must be an object');
    const bad = onlyKeys(level, new Set(['value', 'of']), `${path}.level`);
    if (bad) return bad;
    if (!(isFinite(level.value) && level.value >= 0)) {
      return problem(`${path}.level.value`, 'must be ≥ 0');
    }
    if (level.of !== undefined) {
      if (!(isFinite(level.of) && level.of > 0)) return problem(`${path}.level.of`, 'must be > 0');
      if (level.value > level.of) return problem(`${path}.level.value`, 'must be at most of');
    }
  }
  if (e.fan !== undefined && e.fan !== 'on' && e.fan !== 'off' && e.fan !== 'unknown') {
    return problem(`${path}.fan`, 'must be on, off or unknown');
  }
  if (e.steam !== undefined) {
    const steam = e.steam;
    if (!isObject(steam)) return problem(`${path}.steam`, 'must be an object');
    const bad = onlyKeys(steam, new Set(['source', 'detail']), `${path}.steam`);
    if (bad) return bad;
    if (!STEAM_SOURCES.includes(steam.source as never)) {
      return problem(`${path}.steam.source`, 'must be function, manual or none');
    }
    if (steam.detail !== undefined && typeof steam.detail !== 'string') {
      return problem(`${path}.steam.detail`, 'must be text');
    }
  }
  if (e.support !== undefined) {
    const support = e.support;
    if (!isObject(support)) return problem(`${path}.support`, 'must be an object');
    const bad = onlyKeys(support, new Set(['item']), `${path}.support`);
    if (bad) return bad;
    const ref = refProblem(support.item, `${path}.support.item`);
    if (ref) return ref;
  }
  if (e.vessel !== undefined) {
    const vessel = e.vessel;
    if (!isObject(vessel)) return problem(`${path}.vessel`, 'must be an object');
    const bad = onlyKeys(vessel, new Set(['item', 'cover']), `${path}.vessel`);
    if (bad) return bad;
    const ref = refProblem(vessel.item, `${path}.vessel.item`);
    if (ref) return ref;
    if (!COVERS.includes(vessel.cover as never)) {
      return problem(`${path}.vessel.cover`, 'must be open, covered, closed or unknown');
    }
  }
  if (e.preheated !== undefined) {
    const preheated = e.preheated;
    if (!isObject(preheated)) return problem(`${path}.preheated`, 'must be an object');
    const bad = onlyKeys(preheated, new Set(['appliance', 'support', 'vessel']), `${path}.preheated`);
    if (bad) return bad;
    for (const key of ['appliance', 'support', 'vessel']) {
      const value = preheated[key];
      if (value !== undefined && !PREHEATS.includes(value as never)) {
        return problem(`${path}.preheated.${key}`, 'must be hot, cold or unknown');
      }
    }
  }
  if (e.rack !== undefined && !isText(e.rack)) return problem(`${path}.rack`, 'must be text');
  if (e.load !== undefined) {
    const load = e.load;
    if (!isObject(load)) return problem(`${path}.load`, 'must be an object');
    const bad = onlyKeys(load, new Set(['pieces', 'massG']), `${path}.load`);
    if (bad) return bad;
    if (load.pieces !== undefined && !(Number.isInteger(load.pieces) && (load.pieces as number) >= 1)) {
      return problem(`${path}.load.pieces`, 'must be an integer ≥ 1');
    }
    if (load.massG !== undefined && !(isFinite(load.massG) && load.massG > 0)) {
      return problem(`${path}.load.massG`, 'must be > 0');
    }
  }
  return undefined;
};

/** A reference of a step's settings and the kind of entry it must resolve to. */
export interface EquipmentUse {
  readonly ref: EquipmentRef;
  readonly kind: EquipmentKind;
  /** Where it sits below the step, for error paths. */
  readonly path: string;
}

/** Every entry reference of some settings, with the kind each must resolve to. */
export const equipmentUses = (equipment: StepEquipment, path = 'equipment'): EquipmentUse[] => [
  ...(equipment.support === undefined
    ? []
    : [{ ref: equipment.support.item, kind: 'support' as const, path: `${path}.support.item` }]),
  ...(equipment.vessel === undefined
    ? []
    : [{ ref: equipment.vessel.item, kind: 'vessel' as const, path: `${path}.vessel.item` }]),
  ...(equipment.profile === undefined
    ? []
    : [{ ref: equipment.profile, kind: 'appliance' as const, path: `${path}.profile` }]),
];

/** The distinct entry versions referenced by the steps of a process. */
export const processEquipmentRefs = (process: Process): EquipmentRef[] => {
  const seen = new Map<string, EquipmentRef>();
  for (const step of process.steps) {
    if (step.equipment === undefined) continue;
    for (const { ref } of equipmentUses(step.equipment)) {
      seen.set(`${ref.id}@${ref.version}`, { id: ref.id, version: ref.version });
    }
  }
  return [...seen.values()];
};

/** Looks an entry version up among the given copies. */
export const findEquipment = (
  entries: readonly EquipmentEntry[],
  ref: EquipmentRef,
): EquipmentEntry | undefined =>
  entries.find((entry) => entry.id === ref.id && entry.version === ref.version);

/**
 * Whether a use resolves to an entry of the matching kind among `entries` (equipment.md): an item
 * reference must resolve to an entry of the matching kind. Returns the reason, or undefined.
 */
export const equipmentRefProblem = (
  use: EquipmentUse,
  entries: readonly EquipmentEntry[],
): string | undefined => {
  const entry = findEquipment(entries, use.ref);
  if (entry === undefined) return `${use.ref.id}@${use.ref.version} does not resolve to an entry`;
  if (entry.kind !== use.kind) return `${use.ref.id} is a ${entry.kind}, not a ${use.kind}`;
  return undefined;
};

/** True when the built-in code defines this entry version. */
export const isBuiltInEquipmentRef = (ref: EquipmentRef): boolean =>
  builtInEquipment(ref.id, ref.version) !== undefined;

/**
 * The rules of the entry copies a command or an event carries (equipment.md): every use resolves,
 * among the copies already in the bake (`known`) and the `supplied` ones, to an entry of the
 * matching kind; supplied entries are valid, distinct, built-ins exist in code, and each is used.
 * Returns the first problem, if any.
 */
export const equipmentCopiesProblem = (
  uses: readonly EquipmentUse[],
  known: readonly EquipmentEntry[],
  supplied: readonly EquipmentEntry[],
): EquipmentProblem | undefined => {
  const seen = new Set<string>();
  for (const entry of supplied) {
    const key = `${entry?.id}@${entry?.version}`;
    const valid = validateEquipmentEntry(entry);
    if (!valid.ok) {
      return problem(
        'equipment',
        `${key}: ${valid.error.details?.field} ${valid.error.details?.reason}`,
      );
    }
    if (seen.has(key)) return problem('equipment', `${key} is listed twice`);
    seen.add(key);
    if (entry.builtIn && builtInEquipment(entry.id, entry.version) === undefined) {
      return problem('equipment', `${key} is not a built-in entry`);
    }
  }
  const pool = [...known, ...supplied];
  for (const use of uses) {
    const reason = equipmentRefProblem(use, pool);
    if (reason !== undefined) return problem(use.path, reason);
  }
  for (const entry of supplied) {
    if (!uses.some((u) => u.ref.id === entry.id && u.ref.version === entry.version)) {
      return problem('equipment', `${entry.id}@${entry.version} is not referenced`);
    }
  }
  return undefined;
};
