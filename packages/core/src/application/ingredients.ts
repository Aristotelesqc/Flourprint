import {
  BUILT_IN_INGREDIENTS,
  COMPOSITION_KEYS,
  INGREDIENT_PROPERTY_KEYS,
  builtInIngredient,
  customizeIngredient,
  domainError,
  duplicateIngredient,
  effectiveIngredient,
  err,
  ingredientUsedProperties,
  isBuiltInIngredientId,
  isCustomization,
  nextIngredientVersion,
  validateIngredientEntry,
  type Formula,
  type IngredientEntry,
  type IngredientEntryChanges,
  type IngredientEntryError,
  type IngredientFamily,
  type IngredientRef,
  type IngredientUsedProperty,
  type Instant,
  type PropertyValue,
  type Result,
} from '../domain/index.js';
import { isCount, isId, isInstant, isObject, refuse, type Json } from './decode.js';
import type { IngredientRegistry, IngredientStoreError } from './ports.js';

/** Ingredient registry service (docs/contracts/ingredients.md), built like the flour registry. */

const ENTRY_FIELDS = new Set([
  'id',
  'version',
  'name',
  'aliases',
  'builtIn',
  'customizes',
  'family',
  'kind',
  'form',
  'leavening',
  'brand',
  'product',
  'organic',
  'composition',
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
  // Value types, units, bases and source kinds are checked by the domain.
  return value as unknown as PropertyValue;
};

const decodeGroup = (
  value: unknown,
  keys: readonly string[],
  where: string,
): Record<string, PropertyValue> => {
  if (!isObject(value)) return refuse(`${where} is missing`);
  onlyFields(value, new Set(keys), where);
  return Object.fromEntries(
    keys.map((key) => [key, decodeProperty(value[key], `${where} ${key}`)]),
  );
};

const decodeRef = (value: unknown, where: string): void => {
  if (value === undefined) return;
  if (!isObject(value)) return refuse(`${where} is not a reference`);
  onlyFields(value, new Set(['id', 'version']), where);
};

/**
 * Decodes an ingredient entry from untrusted JSON (backups, recipe files, stored documents):
 * structure first, then the domain's checks (ingredients.md). Throws `Refused` on the first
 * problem.
 */
export const decodeIngredientEntry = (
  value: unknown,
  where = 'ingredient entry',
): IngredientEntry => {
  if (!isObject(value) || !isId(value.id)) return refuse(`${where} has no valid id`);
  const at = `${where} ${value.id}`;
  onlyFields(value, ENTRY_FIELDS, at);
  if (!isCount(value.version)) return refuse(`${at} has no valid version`);
  if (!isInstant(value.createdAt)) return refuse(`${at} has no valid createdAt`);
  decodeRef(value.customizes, `${at} customizes`);
  decodeRef(value.basedOn, `${at} basedOn`);
  const { leavening } = value;
  if (leavening !== undefined) {
    if (!isObject(leavening)) return refuse(`${at} has an invalid leavening`);
    onlyFields(
      leavening,
      new Set(leavening.type === 'commercialYeast' ? ['type', 'form'] : ['type']),
      `${at} leavening`,
    );
  }
  const entry = {
    ...value,
    organic: decodeProperty(value.organic, `${at} organic`),
    composition: decodeGroup(value.composition, COMPOSITION_KEYS, `${at} composition`),
    properties: decodeGroup(value.properties, INGREDIENT_PROPERTY_KEYS, `${at} properties`),
  } as unknown as IngredientEntry;
  const valid = validateIngredientEntry(entry);
  if (!valid.ok) return refuse(`${at} is not valid: ${valid.error.details?.field ?? ''}`);
  return valid.value;
};

export type SaveIngredientError = IngredientStoreError | IngredientEntryError;

const refusal = (field: string, reason: string): IngredientEntryError =>
  domainError('InvalidIngredientEntry', `Invalid ingredient entry: ${field} ${reason}`, {
    field,
    reason,
  });

/** An entry version, built-in (code) or personal (registry); undefined if it is not there. */
const anyVersion = async (
  registry: IngredientRegistry,
  id: string,
  version: number,
): Promise<IngredientEntry | undefined> => {
  const built = builtInIngredient(id, version);
  if (built) return built;
  const stored = await registry.getIngredient(id, version);
  return stored.ok ? stored.value : undefined;
};

/**
 * Whether the `basedOn` chain of an entry reaches its own id (ingredients.md, Validation). A link
 * that does not resolve ends the chain.
 */
const basedOnCycle = async (
  registry: IngredientRegistry,
  entry: IngredientEntry,
): Promise<boolean> => {
  const seen = new Set<string>([entry.id]);
  let link = entry.basedOn;
  while (link) {
    if (seen.has(link.id)) return true;
    seen.add(link.id);
    link = (await anyVersion(registry, link.id, link.version))?.basedOn;
  }
  return false;
};

/**
 * Writes a personal entry version, a customization included, after the domain checks; the
 * registry refuses a version that is not the next one for its id (HeadConflict). Built-in
 * entries are never written.
 */
export const saveIngredientEntry = async (
  registry: IngredientRegistry,
  entry: IngredientEntry,
): Promise<Result<IngredientEntry, SaveIngredientError>> => {
  if (entry.builtIn) return err(refusal('builtIn', 'built-in entries are code'));
  const valid = validateIngredientEntry(entry);
  if (!valid.ok) return valid;
  if (await basedOnCycle(registry, entry))
    return err(refusal('basedOn', 'reaches the entry itself'));
  return registry.saveIngredient(valid.value);
};

/** Edits a personal entry or a customization: the next version with the changes. */
export const editIngredient = async (
  registry: IngredientRegistry,
  current: IngredientEntry,
  changes: IngredientEntryChanges,
  createdAt: Instant,
): Promise<Result<IngredientEntry, SaveIngredientError>> => {
  const next = nextIngredientVersion(current, changes, createdAt);
  if (!next.ok) return next;
  return saveIngredientEntry(registry, next.value);
};

/** Archives (or brings back) an entry: a new version with `archived` set (ingredients.md). */
export const archiveIngredient = async (
  registry: IngredientRegistry,
  current: IngredientEntry,
  createdAt: Instant,
  archived = true,
): Promise<Result<IngredientEntry, SaveIngredientError>> =>
  editIngredient(registry, current, { archived }, createdAt);

/** Duplicates an entry, a built-in included: version 1 of a new id, `basedOn` the source. */
export const duplicateIngredientEntry = async (
  registry: IngredientRegistry,
  source: IngredientEntry,
  input: { readonly id: string; readonly name: string; readonly createdAt: Instant },
): Promise<Result<IngredientEntry, SaveIngredientError>> =>
  saveIngredientEntry(registry, duplicateIngredient(source, input));

/** The latest personal version stored under an id (a customization for a built-in id). */
const headOf = async (
  registry: IngredientRegistry,
  id: string,
): Promise<IngredientEntry | undefined> =>
  (await registry.listIngredients()).find((entry) => entry.id === id);

/**
 * Customizes a built-in (ingredients.md): the next personal version under its id, taken from the
 * current built-in version. Refused while a customization of that id is in force.
 */
export const customizeBuiltInIngredient = async (
  registry: IngredientRegistry,
  id: string,
  createdAt: Instant,
): Promise<Result<IngredientEntry, SaveIngredientError>> => {
  const builtIn = builtInIngredient(id);
  if (!builtIn) return err(refusal('customizes', 'names no built-in'));
  const head = await headOf(registry, id);
  if (head && !head.archived)
    return err(refusal('customizes', 'the built-in is already customized'));
  const entry = customizeIngredient(builtIn, { version: (head?.version ?? 0) + 1, createdAt });
  if (!entry.ok) return entry;
  return saveIngredientEntry(registry, entry.value);
};

/**
 * "Reset to factory": the next version of the customization with `archived: true`; the built-in
 * applies again. No recipe, revision or bake changes.
 */
export const resetIngredientToFactory = async (
  registry: IngredientRegistry,
  id: string,
  createdAt: Instant,
): Promise<Result<IngredientEntry, SaveIngredientError>> => {
  const head = await headOf(registry, id);
  if (!head || !isCustomization(head) || head.archived) {
    return err(refusal('customizes', 'the built-in has no customization in force'));
  }
  return archiveIngredient(registry, head, createdAt);
};

/** Built-in entries and the latest version of each personal entry, archived ones included. */
export const ingredientCatalog = async (
  registry: IngredientRegistry,
): Promise<readonly IngredientEntry[]> => [
  ...BUILT_IN_INGREDIENTS,
  ...(await registry.listIngredients()),
];

/**
 * What the picker offers (ingredients.md): the effective entry of each built-in (its
 * customization in force, else the built-in) and every personal entry that is not archived.
 */
export const ingredientPicker = async (
  registry: IngredientRegistry,
): Promise<readonly IngredientEntry[]> => {
  const personal = await registry.listIngredients();
  const heads = new Map(personal.map((entry) => [entry.id, entry]));
  return [
    ...BUILT_IN_INGREDIENTS.map((builtIn) => effectiveIngredient(builtIn, heads.get(builtIn.id))),
    ...personal.filter((entry) => !isCustomization(entry) && !entry.archived),
  ];
};

/**
 * The entry version a pin names, built-in (code) or personal (registry); undefined when it does
 * not resolve, which never blocks anything: the formula keeps its copied contents.
 */
export const resolveIngredientRef = async (
  registry: IngredientRegistry,
  ref: IngredientRef,
): Promise<IngredientEntry | undefined> => {
  if (!ref.customized && isBuiltInIngredientId(ref.id))
    return builtInIngredient(ref.id, ref.version);
  const stored = await registry.getIngredient(ref.id, ref.version);
  const entry = stored.ok ? stored.value : undefined;
  return entry && isCustomization(entry) === (ref.customized === true) ? entry : undefined;
};

/** Every entry version the formula pins that resolves, once each. */
export const pinnedIngredientEntries = async (
  registry: IngredientRegistry,
  formulas: readonly Formula[],
): Promise<IngredientEntry[]> => {
  const found = new Map<string, IngredientEntry>();
  for (const formula of formulas) {
    for (const { entry: ref } of formula.ingredients) {
      if (ref === undefined) continue;
      const key = `${ref.id}@${ref.version}${ref.customized ? '+' : ''}`;
      if (found.has(key)) continue;
      const entry = await resolveIngredientRef(registry, ref);
      if (entry) found.set(key, entry);
    }
  }
  return [...found.values()];
};

/**
 * `entryFamilies` of `checkRecipe` (drafts.md): the family of the entry each formula ingredient
 * pins, for the pins that resolve.
 */
export const entryFamiliesOf = async (
  registry: IngredientRegistry,
  formula: Formula,
): Promise<Record<string, IngredientFamily>> => {
  const families: Record<string, IngredientFamily> = {};
  for (const ingredient of formula.ingredients) {
    if (ingredient.entry === undefined) continue;
    const entry = await resolveIngredientRef(registry, ingredient.entry);
    if (entry) families[ingredient.id] = entry.family;
  }
  return families;
};

/**
 * StartBake `usedProperties` (history.md, ingredients.md Bakes): the properties the formula
 * consumes from its pinned entries, with the entries' own values where the pins resolve.
 */
export const bakeUsedProperties = async (
  registry: IngredientRegistry,
  formula: Formula,
): Promise<IngredientUsedProperty[]> =>
  ingredientUsedProperties(formula, await pinnedIngredientEntries(registry, [formula]));
