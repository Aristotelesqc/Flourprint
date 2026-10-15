import type {
  ContentPct,
  Formula,
  Ingredient,
  IngredientRef,
  YeastMarker,
} from '../formula/types.js';
import type { PropertyValue, SourceRef } from '../values.js';
import type { IngredientEntry } from './types.js';

/**
 * Entry to formula (ingredients.md): a mechanical copy, with no calculation beyond the clamp of
 * an estimate's range to [0, 100]. An unknown property gives a missing content.
 */

const SOURCE_KINDS: readonly SourceRef['kind'][] = [
  'package',
  'producer',
  'lab',
  'reference',
  'personal',
];

/** The formula's free-text source: the kind, then `: ` and the detail when there is one. */
export const sourceText = (source: SourceRef): string =>
  source.detail === undefined ? source.kind : `${source.kind}: ${source.detail}`;

/** The content an entry property gives, or undefined (missing = unknown). */
export const contentOf = (property: PropertyValue): ContentPct | undefined => {
  if (property.status === 'unknown' || typeof property.value !== 'number') return undefined;
  const { value, source, uncertainty } = property;
  if (property.status === 'known')
    return { status: 'known', valuePct: value, source: sourceText(source) };
  return {
    status: 'estimated',
    valuePct: value,
    ...(uncertainty === undefined
      ? {}
      : {
          rangePct: [Math.max(0, value - uncertainty), Math.min(100, value + uncertainty)] as const,
        }),
    source: sourceText(source),
  };
};

/** The reference that pins this entry version; `customized` for a customization. */
export const ingredientRefOf = (entry: IngredientEntry): IngredientRef => ({
  id: entry.id,
  version: entry.version,
  ...(!entry.builtIn && entry.customizes !== undefined ? { customized: true as const } : {}),
});

/** Whether a reference names this entry version. */
export const refersTo = (ref: IngredientRef, entry: IngredientEntry): boolean =>
  ref.id === entry.id &&
  ref.version === entry.version &&
  (ref.customized === true) === (!entry.builtIn && entry.customizes !== undefined);

/** The five contents an entry gives a formula ingredient; a missing one is unknown. */
export interface EntryContents {
  readonly kind: 'water' | 'other';
  readonly water?: ContentPct;
  readonly fat?: ContentPct;
  readonly sugar?: ContentPct;
  readonly yeast?: YeastMarker;
}

export const entryContents = (entry: IngredientEntry): EntryContents => {
  const water = contentOf(entry.composition.waterPct);
  const fat = contentOf(entry.composition.fatPct);
  const sugar = contentOf(entry.composition.sugarPct);
  return {
    kind: entry.kind,
    ...(water === undefined ? {} : { water }),
    ...(fat === undefined ? {} : { fat }),
    ...(sugar === undefined ? {} : { sugar }),
    ...(entry.leavening?.type === 'commercialYeast'
      ? { yeast: { form: entry.leavening.form } }
      : {}),
  };
};

/** A row of `usedProperties` for a pinned entry (history.md, ingredients.md Bakes). */
export interface IngredientUsedProperty {
  readonly ingredient: string;
  readonly version: number;
  readonly customized?: true;
  readonly formulaIngredient: string;
  readonly key: 'waterPct' | 'fatPct' | 'sugarPct' | 'leavening';
  readonly value: PropertyValue;
  readonly overridden?: true;
}

/** The SourceRef behind a copied source text (the inverse of `sourceText`), else personal. */
const sourceFrom = (text: string | undefined): SourceRef => {
  if (text === undefined) return { kind: 'personal' };
  const match = /^([a-z]+)(?:: ([\s\S]*))?$/.exec(text);
  const kind = SOURCE_KINDS.find((k) => k === match?.[1]);
  if (!match || !kind) return { kind: 'personal', detail: text };
  return match[2] === undefined ? { kind } : { kind, detail: match[2] };
};

/** A consumed content as a property value: an estimate's range becomes its half-width. */
const propertyFrom = (content: Exclude<ContentPct, { status: 'unknown' }>): PropertyValue => {
  const base = {
    status: content.status,
    value: content.valuePct,
    unit: 'pct' as const,
    basis: 'per100g' as const,
    source: sourceFrom(content.source),
  };
  if (content.status === 'known' || content.rangePct === undefined) return base;
  const [low, high] = content.rangePct;
  // The larger side: a range clamped at 0 or 100 keeps the uncertainty it was copied from.
  return { ...base, uncertainty: Math.max(content.valuePct - low, high - content.valuePct) };
};

const CONTENT_KEYS = [
  ['water', 'waterPct'],
  ['fat', 'fatPct'],
  ['sugar', 'sugarPct'],
] as const;

/**
 * The entry properties a formula actually consumes (ingredients.md, Bakes): for each ingredient
 * with an `entry`, its water, fat and sugar when known or estimated (a `water` ingredient's
 * composition is ignored) and its commercial-yeast marker, with the value consumed. A field that
 * is not overridden takes the pinned entry's own value when `entries` holds that version; an
 * overridden field, or a pin that does not resolve, gives its row from the copied contents.
 */
export const ingredientUsedProperties = (
  formula: Formula,
  entries: readonly IngredientEntry[] = [],
): IngredientUsedProperty[] =>
  formula.ingredients.flatMap((ingredient: Ingredient): IngredientUsedProperty[] => {
    const ref = ingredient.entry;
    if (ref === undefined) return [];
    const entry = entries.find((e) => refersTo(ref, e));
    const overridden = new Set(ingredient.overrides ?? []);
    const row = (
      key: IngredientUsedProperty['key'],
      value: PropertyValue,
      isOverridden: boolean,
    ): IngredientUsedProperty => ({
      ingredient: ref.id,
      version: ref.version,
      ...(ref.customized ? { customized: true as const } : {}),
      formulaIngredient: ingredient.id,
      key,
      value,
      ...(isOverridden ? { overridden: true as const } : {}),
    });
    const rows: IngredientUsedProperty[] = [];
    if (ingredient.kind !== 'water') {
      for (const [field, key] of CONTENT_KEYS) {
        const content = ingredient[field];
        if (content === undefined || content.status === 'unknown') continue;
        const isOverridden = overridden.has(field);
        const own = entry?.composition[key];
        rows.push(
          row(
            key,
            !isOverridden && own !== undefined && own.status !== 'unknown'
              ? own
              : propertyFrom(content),
            isOverridden,
          ),
        );
      }
    }
    if (ingredient.yeast !== undefined) {
      const isOverridden = overridden.has('yeast');
      const fromEntry = !isOverridden && entry !== undefined && entry.builtIn;
      rows.push(
        row(
          'leavening',
          {
            status: 'known',
            value: ingredient.yeast.form,
            source: { kind: fromEntry ? 'reference' : 'personal' },
          },
          isOverridden,
        ),
      );
    }
    return rows;
  });
