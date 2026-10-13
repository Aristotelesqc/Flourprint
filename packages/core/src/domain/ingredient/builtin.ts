import type { Instant } from '../instant.js';
import type { PropertyValue } from '../values.js';
import type {
  IngredientComposition,
  IngredientEntry,
  IngredientFamily,
  IngredientForm,
  IngredientProperties,
  Leavening,
} from './types.js';

const UNKNOWN: PropertyValue = { status: 'unknown' };

/** Every composition value unknown: never zero and never a default (ingredients.md). */
export const unknownComposition = (): IngredientComposition => ({
  waterPct: UNKNOWN,
  fatPct: UNKNOWN,
  sugarPct: UNKNOWN,
  carbohydratePct: UNKNOWN,
  proteinPct: UNKNOWN,
  fibrePct: UNKNOWN,
  saltPct: UNKNOWN,
});

/** Every other property unknown. */
export const unknownIngredientProperties = (): IngredientProperties => ({
  ph: UNKNOWN,
  diastaticPower: UNKNOWN,
});

/** When the built-in entries of version 1 were defined (ingredients.md, owner decisions). */
const BUILT_IN_AT = '2026-10-13T00:00:00.000Z' as Instant;

interface Definition {
  readonly id: string;
  readonly family: IngredientFamily;
  readonly kind?: 'water';
  readonly leavening?: Leavening;
  readonly form?: IngredientForm;
}

/**
 * The built-ins of the contract table (ingredients.md), in the order the registry lists them.
 * Identity only: the sourced typical values arrive with their citations in a separate change
 * (#34); until then every value is unknown.
 */
const DEFINITIONS: readonly Definition[] = [
  { id: 'water', family: 'water', kind: 'water' },
  { id: 'salt', family: 'salt' },
  {
    id: 'instant-yeast',
    family: 'leaven',
    leavening: { type: 'commercialYeast', form: 'instant' },
  },
  {
    id: 'active-dry-yeast',
    family: 'leaven',
    leavening: { type: 'commercialYeast', form: 'active-dry' },
  },
  { id: 'fresh-yeast', family: 'leaven', leavening: { type: 'commercialYeast', form: 'fresh' } },
  { id: 'sourdough-starter', family: 'leaven', leavening: { type: 'sourdough' } },
  { id: 'baking-powder', family: 'leaven', leavening: { type: 'chemical' } },
  { id: 'sugar', family: 'sugar' },
  { id: 'maple-syrup', family: 'sugar' },
  { id: 'honey', family: 'sugar' },
  { id: 'olive-oil', family: 'fat' },
  { id: 'butter', family: 'fat' },
  { id: 'milk', family: 'dairy' },
  { id: 'milk-powder', family: 'dairy', form: 'powder' },
  { id: 'cream', family: 'dairy' },
  { id: 'egg', family: 'egg' },
  { id: 'egg-white', family: 'egg' },
  { id: 'egg-yolk', family: 'egg' },
  { id: 'meringue', family: 'egg' },
  { id: 'dried-fruit', family: 'fruit', form: 'dried' },
  { id: 'fresh-fruit', family: 'fruit', form: 'fresh' },
  { id: 'nuts', family: 'nutSeed' },
  { id: 'seeds', family: 'nutSeed' },
  { id: 'diastatic-malt', family: 'malt' },
  { id: 'non-diastatic-malt', family: 'malt' },
  { id: 'cider-vinegar', family: 'acid' },
];

/** Current version of the built-ins: the picker offers it when no customization applies. */
export const BUILT_IN_INGREDIENT_VERSION = 1;

/**
 * Every version of the built-in entries (ingredients.md): code, never stored, never edited;
 * named by message key `ingredient.<id>.name` and described by `ingredient.<id>.description`.
 * An earlier version stays resolvable for the formulas and bakes that pin it.
 */
export const BUILT_IN_INGREDIENT_VERSIONS: readonly IngredientEntry[] = DEFINITIONS.map(
  (definition): IngredientEntry => ({
    id: definition.id,
    version: 1,
    builtIn: true,
    family: definition.family,
    kind: definition.kind ?? 'other',
    ...(definition.form === undefined ? {} : { form: definition.form }),
    ...(definition.leavening === undefined ? {} : { leavening: definition.leavening }),
    organic: UNKNOWN,
    composition: unknownComposition(),
    properties: unknownIngredientProperties(),
    archived: false,
    createdAt: BUILT_IN_AT,
  }),
);

/** The current version of each built-in entry. */
export const BUILT_IN_INGREDIENTS: readonly IngredientEntry[] = BUILT_IN_INGREDIENT_VERSIONS.filter(
  (entry) => entry.version === BUILT_IN_INGREDIENT_VERSION,
);

/** A built-in entry: its current version, or the given one; undefined if there is none. */
export const builtInIngredient = (id: string, version?: number): IngredientEntry | undefined =>
  BUILT_IN_INGREDIENT_VERSIONS.find(
    (entry) => entry.id === id && entry.version === (version ?? BUILT_IN_INGREDIENT_VERSION),
  );

/** Whether an id is the id of a built-in entry (of any version). */
export const isBuiltInIngredientId = (id: string): boolean =>
  BUILT_IN_INGREDIENT_VERSIONS.some((entry) => entry.id === id);
