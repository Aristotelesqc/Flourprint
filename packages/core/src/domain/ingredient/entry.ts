import { domainError, type DomainError } from '../errors.js';
import type { ContentPct, Ingredient } from '../formula/types.js';
import { isReservedId } from '../ids.js';
import { parseInstant, type Instant } from '../instant.js';
import { approxEqual } from '../numeric.js';
import { err, ok, type Result } from '../result.js';
import type { PropertyValue } from '../values.js';
import {
  builtInIngredient,
  isBuiltInIngredientId,
  unknownComposition,
  unknownIngredientProperties,
} from './builtin.js';
import {
  COMPOSITION_KEYS,
  INGREDIENT_FAMILIES,
  INGREDIENT_FORMS,
  INGREDIENT_PROPERTY_KEYS,
  type IngredientEntry,
  type IngredientFamily,
  type Leavening,
} from './types.js';

export type IngredientEntryError = DomainError<
  'InvalidIngredientEntry',
  { field: string; reason: string }
>;

/** Shown, never blocking (ingredients.md, Validation). */
export interface IngredientEntryWarning {
  readonly code: 'sum_exceeds_100' | 'sugars_and_fibre_exceed_carbohydrate';
  readonly field: string;
}

const invalid = (field: string, reason: string): IngredientEntryError =>
  domainError('InvalidIngredientEntry', `Invalid ingredient entry: ${field} ${reason}`, {
    field,
    reason,
  });

const isText = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;
const isCount = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 1;
const isFinite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const SOURCE_KINDS: readonly string[] = ['package', 'producer', 'lab', 'reference', 'personal'];
const YEAST_FORMS: readonly string[] = ['fresh', 'active-dry', 'instant'];

type Kind = 'composition' | 'ph' | 'diastaticPower' | 'boolean';

/** The reason a property value is invalid for its kind, if any. */
const propertyProblem = (property: PropertyValue, kind: Kind): string | undefined => {
  if (!isObject(property)) return 'must be a property value';
  if (property.status === 'unknown') return undefined;
  if (property.status !== 'known' && property.status !== 'estimated') return 'has a bad status';
  const { value } = property;
  if (kind === 'boolean') {
    if (typeof value !== 'boolean') return 'must be true or false';
    if (property.unit !== undefined || property.basis !== undefined) return 'takes no unit';
    if (property.uncertainty !== undefined) return 'takes no uncertainty';
  } else {
    if (!isFinite(value) || value < 0) return 'must be a number ≥ 0';
    if (kind === 'composition') {
      if (value > 100) return 'must be within [0, 100]';
      if (property.unit !== undefined && property.unit !== 'pct') return 'has a wrong unit';
      if (property.basis !== 'per100g') return 'must be on the basis per100g';
    } else {
      if (kind === 'ph' && value > 14) return 'must be within [0, 14]';
      if (kind === 'ph' && property.unit !== undefined) return 'takes no unit';
      if (kind === 'diastaticPower' && property.unit !== undefined && property.unit !== '°L') {
        return 'has a wrong unit';
      }
      if (property.basis !== undefined) return 'takes no basis';
    }
    if (
      property.uncertainty !== undefined &&
      (!isFinite(property.uncertainty) || property.uncertainty < 0)
    ) {
      return 'has an invalid uncertainty';
    }
  }
  const { source } = property;
  if (!isObject(source) || !SOURCE_KINDS.includes(source.kind as string)) {
    return 'has no valid source';
  }
  if (source.detail !== undefined && typeof source.detail !== 'string') {
    return 'has an invalid source detail';
  }
  return undefined;
};

const leaveningProblem = (leavening: Leavening): string | undefined => {
  if (!isObject(leavening)) return 'must be an object';
  switch (leavening.type) {
    case 'commercialYeast':
      return YEAST_FORMS.includes(leavening.form) ? undefined : 'has an unknown yeast form';
    case 'sourdough':
    case 'chemical':
      return undefined;
    default:
      return 'has an unknown type';
  }
};

const sameLeavening = (a: Leavening | undefined, b: Leavening | undefined): boolean =>
  a?.type === b?.type &&
  (a?.type !== 'commercialYeast' || (b?.type === 'commercialYeast' && a.form === b.form));

/** The number of a value that is set (known or estimated), else undefined. */
const numberOf = (property: PropertyValue | undefined): number | undefined =>
  property !== undefined && property.status !== 'unknown' && typeof property.value === 'number'
    ? property.value
    : undefined;

/**
 * Checks an ingredient entry document (ingredients.md, Validation): identifiers, the closed
 * enumerations, each value against its kind, the identity of a customization. Unknown stays
 * unknown: nothing is defaulted. A `basedOn` that reaches the entry through other entries is
 * checked by the application, which can read them.
 */
export const validateIngredientEntry = (
  entry: IngredientEntry,
): Result<IngredientEntry, IngredientEntryError> => {
  if (!isText(entry.id) || isReservedId(entry.id)) return err(invalid('id', 'is not valid'));
  if (!isCount(entry.version)) return err(invalid('version', 'must be an integer ≥ 1'));
  if (typeof entry.builtIn !== 'boolean') return err(invalid('builtIn', 'must be a boolean'));
  if (entry.aliases !== undefined) {
    if (entry.builtIn || entry.customizes !== undefined) {
      return err(invalid('aliases', 'are for personal entries only'));
    }
    if (!Array.isArray(entry.aliases) || !entry.aliases.every(isText)) {
      return err(invalid('aliases', 'must be a list of names'));
    }
  }
  if (entry.builtIn) {
    if (entry.name !== undefined) return err(invalid('name', 'is a message key for a built-in'));
    if (entry.customizes !== undefined) {
      return err(invalid('customizes', 'is for a personal customization'));
    }
  } else if (entry.customizes !== undefined) {
    const { customizes } = entry;
    if (!isObject(customizes) || !isText(customizes.id) || !isCount(customizes.version)) {
      return err(invalid('customizes', 'is not a valid reference'));
    }
    if (customizes.id !== entry.id) return err(invalid('customizes', 'names another id'));
    if (!isBuiltInIngredientId(customizes.id))
      return err(invalid('customizes', 'names no built-in'));
    if (entry.basedOn !== undefined) {
      return err(invalid('basedOn', 'is not allowed on a customization'));
    }
    if (entry.name !== undefined) {
      return err(invalid('name', 'a customization is named by its built-in'));
    }
    // An unknown built-in version (newer than this app) is compared with the current one.
    const original =
      builtInIngredient(customizes.id, customizes.version) ?? builtInIngredient(customizes.id);
    if (
      original &&
      (original.family !== entry.family ||
        original.kind !== entry.kind ||
        original.form !== entry.form ||
        !sameLeavening(original.leavening, entry.leavening))
    ) {
      return err(invalid('customizes', 'a customization keeps the identity of its built-in'));
    }
  } else {
    if (!isText(entry.name)) return err(invalid('name', 'is required for a personal entry'));
    if (isBuiltInIngredientId(entry.id)) return err(invalid('id', 'is the id of a built-in entry'));
  }
  if (!INGREDIENT_FAMILIES.includes(entry.family))
    return err(invalid('family', 'is not supported'));
  if (entry.kind !== 'water' && entry.kind !== 'other') {
    return err(invalid('kind', 'must be water or other'));
  }
  if (entry.kind === 'water' && entry.family !== 'water') {
    return err(invalid('kind', 'water is for the family water only'));
  }
  if (entry.form !== undefined && !INGREDIENT_FORMS.includes(entry.form)) {
    return err(invalid('form', 'is not supported'));
  }
  if (entry.leavening !== undefined) {
    const problem = leaveningProblem(entry.leavening);
    if (problem) return err(invalid('leavening', problem));
    if (entry.leavening.type === 'commercialYeast' && entry.family !== 'leaven') {
      return err(invalid('leavening', 'commercial yeast is for the family leaven only'));
    }
  }
  for (const field of ['brand', 'product', 'notes'] as const) {
    const value = entry[field];
    if (value !== undefined && typeof value !== 'string')
      return err(invalid(field, 'must be text'));
  }
  const organic = propertyProblem(entry.organic, 'boolean');
  if (organic) return err(invalid('organic', organic));
  if (!isObject(entry.composition)) return err(invalid('composition', 'is missing'));
  for (const key of COMPOSITION_KEYS) {
    const property = entry.composition[key];
    if (property === undefined) return err(invalid(`composition.${key}`, 'is missing'));
    const problem = propertyProblem(property, 'composition');
    if (problem) return err(invalid(`composition.${key}`, problem));
  }
  if (!isObject(entry.properties)) return err(invalid('properties', 'is missing'));
  for (const key of INGREDIENT_PROPERTY_KEYS) {
    const property = entry.properties[key];
    if (property === undefined) return err(invalid(`properties.${key}`, 'is missing'));
    const problem = propertyProblem(property, key);
    if (problem) return err(invalid(`properties.${key}`, problem));
  }
  const { sugarPct, fibrePct, carbohydratePct } = entry.composition;
  const carbohydrate = numberOf(carbohydratePct);
  if (carbohydrate !== undefined) {
    const sugar = numberOf(sugarPct);
    if (sugar !== undefined && sugar > carbohydrate) {
      return err(invalid('composition.sugarPct', 'exceeds carbohydratePct'));
    }
    const fibre = numberOf(fibrePct);
    if (fibre !== undefined && fibre > carbohydrate) {
      return err(invalid('composition.fibrePct', 'exceeds carbohydratePct'));
    }
  }
  if (entry.basedOn !== undefined) {
    if (!isObject(entry.basedOn) || !isText(entry.basedOn.id) || !isCount(entry.basedOn.version)) {
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

/**
 * Warnings of a valid entry: label rounding makes small excesses normal, so they never block.
 * Sugars and fibre are parts of carbohydrates and are never added to them.
 */
export const ingredientEntryWarnings = (entry: IngredientEntry): IngredientEntryWarning[] => {
  const warnings: IngredientEntryWarning[] = [];
  const c = entry.composition;
  const sugar = numberOf(c.sugarPct);
  const fibre = numberOf(c.fibrePct);
  const carbohydrate = numberOf(c.carbohydratePct);
  if (
    sugar !== undefined &&
    fibre !== undefined &&
    carbohydrate !== undefined &&
    sugar + fibre > carbohydrate
  ) {
    warnings.push({ code: 'sugars_and_fibre_exceed_carbohydrate', field: 'composition' });
  }
  const parts = [c.waterPct, c.fatPct, c.proteinPct, c.carbohydratePct, c.saltPct]
    .map(numberOf)
    .filter((value): value is number => value !== undefined);
  if (parts.reduce((total, value) => total + value, 0) > 100) {
    warnings.push({ code: 'sum_exceeds_100', field: 'composition' });
  }
  return warnings;
};

/** A new personal entry, version 1, with every value unknown. */
export const newIngredientEntry = (input: {
  readonly id: string;
  readonly name: string;
  readonly family: IngredientFamily;
  readonly kind?: 'water' | 'other';
  readonly createdAt: Instant;
}): IngredientEntry => ({
  id: input.id,
  version: 1,
  name: input.name,
  builtIn: false,
  family: input.family,
  kind: input.kind ?? 'other',
  organic: { status: 'unknown' },
  composition: unknownComposition(),
  properties: unknownIngredientProperties(),
  archived: false,
  createdAt: input.createdAt,
});

/**
 * Duplicating an entry, a built-in included (ingredients.md, Personal entries): a personal entry
 * with a new id, `basedOn` the source version, and the same fields until changed. A built-in and
 * a customization are named by message key, so the caller gives the name.
 */
export const duplicateIngredient = (
  source: IngredientEntry,
  input: { readonly id: string; readonly name: string; readonly createdAt: Instant },
): IngredientEntry => {
  const { name: _name, basedOn: _basedOn, customizes: _customizes, ...fields } = source;
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

/**
 * Customizing a built-in (ingredients.md): a personal entry under the built-in's own id, version
 * `version` among the personal versions of that id, with the built-in's identity and values.
 */
export const customizeIngredient = (
  builtIn: IngredientEntry,
  input: { readonly version: number; readonly createdAt: Instant },
): Result<IngredientEntry, IngredientEntryError> => {
  if (!builtIn.builtIn) return err(invalid('customizes', 'only a built-in is customized'));
  const {
    name: _name,
    aliases: _aliases,
    basedOn: _basedOn,
    customizes: _customizes,
    ...fields
  } = builtIn;
  return validateIngredientEntry({
    ...fields,
    version: input.version,
    builtIn: false,
    customizes: { id: builtIn.id, version: builtIn.version },
    archived: false,
    createdAt: input.createdAt,
  });
};

/** Whether an entry version is a personal customization of a built-in. */
export const isCustomization = (entry: IngredientEntry): boolean =>
  !entry.builtIn && entry.customizes !== undefined;

/**
 * The entry a new use of a built-in id takes (ingredients.md, Customizing a built-in): the head
 * customization when it exists and is not archived, else the newest built-in version.
 */
export const effectiveIngredient = (
  builtIn: IngredientEntry,
  headCustomization: IngredientEntry | undefined,
): IngredientEntry =>
  headCustomization && isCustomization(headCustomization) && !headCustomization.archived
    ? headCustomization
    : builtIn;

/** Fields a new version may change; an optional field set to undefined is cleared. */
export type IngredientEntryChanges = {
  readonly [
    K in Exclude<
      keyof IngredientEntry,
      'id' | 'version' | 'builtIn' | 'customizes' | 'basedOn' | 'createdAt'
    >
  ]?: IngredientEntry[K] | undefined;
};

/** The entry with the changes applied; an optional field set to undefined is removed. */
export const withIngredientChanges = (
  entry: IngredientEntry,
  changes: IngredientEntryChanges,
): IngredientEntry =>
  Object.fromEntries(
    Object.entries({ ...entry, ...changes }).filter(([, value]) => value !== undefined),
  ) as unknown as IngredientEntry;

/**
 * The next version of a personal entry (a customization included) with the given changes; the
 * id, the origin and the built-in flag are kept. A built-in entry is never edited.
 */
export const nextIngredientVersion = (
  current: IngredientEntry,
  changes: IngredientEntryChanges,
  createdAt: Instant,
): Result<IngredientEntry, IngredientEntryError> => {
  if (current.builtIn) return err(invalid('builtIn', 'a built-in entry is never edited'));
  const next = withIngredientChanges(current, changes);
  return validateIngredientEntry({ ...next, version: current.version + 1, createdAt });
};

const sourceOf = (content: Exclude<ContentPct, { status: 'unknown' }>) =>
  content.source === undefined
    ? { kind: 'personal' as const }
    : { kind: 'personal' as const, detail: content.source };

/** A formula content as a personal composition value; an asymmetric range is refused. */
const valueOf = (
  content: ContentPct | undefined,
  field: string,
): Result<PropertyValue, IngredientEntryError> => {
  if (content === undefined || content.status === 'unknown') return ok({ status: 'unknown' });
  const base = {
    status: content.status,
    value: content.valuePct,
    unit: 'pct' as const,
    basis: 'per100g' as const,
    source: sourceOf(content),
  };
  if (content.status === 'known' || content.rangePct === undefined) return ok(base);
  const [low, high] = content.rangePct;
  if (!approxEqual(content.valuePct - low, high - content.valuePct)) {
    return err(invalid(field, 'the range is not symmetric about the value: widen it by hand'));
  }
  return ok({ ...base, uncertainty: (high - low) / 2 });
};

/**
 * "Create an entry from an ingredient" (ingredients.md, Edit commands): a personal entry with the
 * ingredient's contents, each with a personal source whose detail is the content's source text,
 * an estimate's range becoming its uncertainty. The family defaults to what the ingredient's kind
 * and yeast marker require (`water`, `leaven`), else `unknown`.
 */
export const ingredientEntryFrom = (
  ingredient: Ingredient,
  input: {
    readonly id: string;
    readonly name: string;
    readonly createdAt: Instant;
    readonly family?: IngredientFamily;
  },
): Result<IngredientEntry, IngredientEntryError> => {
  const water = valueOf(ingredient.water, 'composition.waterPct');
  if (!water.ok) return water;
  const fat = valueOf(ingredient.fat, 'composition.fatPct');
  if (!fat.ok) return fat;
  const sugar = valueOf(ingredient.sugar, 'composition.sugarPct');
  if (!sugar.ok) return sugar;
  const family =
    input.family ??
    (ingredient.kind === 'water' ? 'water' : ingredient.yeast ? 'leaven' : 'unknown');
  return validateIngredientEntry({
    ...newIngredientEntry({ ...input, family, kind: ingredient.kind }),
    ...(ingredient.yeast === undefined
      ? {}
      : { leavening: { type: 'commercialYeast', form: ingredient.yeast.form } }),
    composition: {
      ...unknownComposition(),
      waterPct: water.value,
      fatPct: fat.value,
      sugarPct: sugar.value,
    },
  });
};
