import {
  FLOUR_PCT_BASES,
  FLOUR_PROPERTY_KEYS,
  FLOUR_PROPERTY_KINDS,
  type Cereal,
  type FlourChanges,
  type FlourEntry,
  type FlourPctBasis,
  type FlourPropertyKey,
  type FlourSourceKind,
  type PropertyValue,
  type Refinement,
} from '@flourprint/core/domain';
import { editableNumber, parseDecimal } from '../i18n/numbers';

/** What the flour form edits (flours.md): text as typed, an empty value meaning unknown. */
export interface PropertyForm {
  /** Empty = unknown; `true`/`false` for a boolean property. */
  readonly value: string;
  readonly basis: FlourPctBasis;
  readonly source: FlourSourceKind;
  readonly detail: string;
}

export interface FlourForm {
  readonly name: string;
  readonly cereal: Cereal;
  readonly refinement: Refinement;
  readonly system: string;
  readonly code: string;
  readonly brand: string;
  readonly product: string;
  readonly notes: string;
  readonly organic: PropertyForm;
  readonly properties: Readonly<Record<FlourPropertyKey, PropertyForm>>;
}

type Kind = (typeof FLOUR_PROPERTY_KINDS)[FlourPropertyKey];
const BOOLEAN: Kind = { type: 'boolean' };

const propertyForm = (property: PropertyValue, locale: string): PropertyForm => {
  if (property.status === 'unknown') {
    return { value: '', basis: 'asIs', source: 'package', detail: '' };
  }
  const { value } = property;
  return {
    value: typeof value === 'number' ? editableNumber(value, locale) : String(value),
    basis: (FLOUR_PCT_BASES as readonly string[]).includes(property.basis ?? '')
      ? (property.basis as FlourPctBasis)
      : 'asIs',
    source: property.source.kind,
    detail: property.source.detail ?? '',
  };
};

export const flourForm = (entry: FlourEntry, name: string, locale: string): FlourForm => ({
  name,
  cereal: entry.cereal,
  refinement: entry.refinement,
  system: entry.classification?.system ?? '',
  code: entry.classification?.code ?? '',
  brand: entry.brand ?? '',
  product: entry.product ?? '',
  notes: entry.notes ?? '',
  organic: propertyForm(entry.organic, locale),
  properties: Object.fromEntries(
    FLOUR_PROPERTY_KEYS.map((key) => [key, propertyForm(entry.properties[key], locale)]),
  ) as Record<FlourPropertyKey, PropertyForm>,
});

/** Whether the typed value can be read; an empty value is unknown and always valid. */
export const propertyValid = (form: PropertyForm, kind: Kind): boolean =>
  form.value.trim() === '' || kind.type === 'boolean' || parseDecimal(form.value) !== undefined;

const sameForm = (a: PropertyForm, b: PropertyForm) =>
  a.value.trim() === b.value.trim() &&
  a.basis === b.basis &&
  a.source === b.source &&
  a.detail.trim() === b.detail.trim();

/**
 * The property the form describes. An untouched property keeps its recorded value as is (its
 * status, uncertainty and exact number), so opening and saving never rounds it.
 */
const propertyValue = (
  form: PropertyForm,
  kind: Kind,
  original: PropertyValue,
  locale: string,
): PropertyValue | undefined => {
  if (sameForm(form, propertyForm(original, locale))) return original;
  if (form.value.trim() === '') return { status: 'unknown' };
  const detail = form.detail.trim();
  const source = { kind: form.source, ...(detail === '' ? {} : { detail }) };
  if (kind.type === 'boolean') {
    return { status: 'known', value: form.value === 'true', source };
  }
  const value = parseDecimal(form.value);
  if (value === undefined) return undefined;
  return {
    status: 'known',
    value,
    ...(kind.unit === undefined ? {} : { unit: kind.unit }),
    ...(kind.type === 'pct' ? { basis: form.basis } : {}),
    source,
  };
};

const optional = (text: string) => (text.trim() === '' ? undefined : text.trim());

/**
 * The entry fields the form sets, or the fields it cannot read. Personal entries carry the name;
 * an optional field left empty is cleared.
 */
export const formChanges = (
  form: FlourForm,
  entry: FlourEntry,
  locale: string,
):
  | { readonly ok: true; readonly changes: FlourChanges }
  | { readonly ok: false; readonly invalid: readonly string[] } => {
  const invalid: string[] = [];
  const organic = propertyValue(form.organic, BOOLEAN, entry.organic, locale);
  const properties = Object.fromEntries(
    FLOUR_PROPERTY_KEYS.map((key) => {
      const value = propertyValue(
        form.properties[key],
        FLOUR_PROPERTY_KINDS[key],
        entry.properties[key],
        locale,
      );
      if (value === undefined) invalid.push(key);
      return [key, value];
    }),
  ) as unknown as FlourEntry['properties'];
  if (organic === undefined) invalid.push('organic');
  if (form.name.trim() === '') invalid.push('name');
  const system = optional(form.system);
  const code = optional(form.code);
  if ((system === undefined) !== (code === undefined)) invalid.push('classification');
  if (invalid.length > 0 || organic === undefined) return { ok: false, invalid };
  return {
    ok: true,
    changes: {
      name: form.name.trim(),
      cereal: form.cereal,
      refinement: form.refinement,
      classification: system && code ? { system, code } : undefined,
      brand: optional(form.brand),
      product: optional(form.product),
      notes: optional(form.notes),
      organic,
      properties,
    },
  };
};

/** Number of properties with a value (unknown ones excluded). */
export const knownCount = (entry: FlourEntry): number =>
  [entry.organic, ...FLOUR_PROPERTY_KEYS.map((key) => entry.properties[key])].filter(
    (p) => p.status !== 'unknown',
  ).length;
