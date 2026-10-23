import { describe, expect, it } from 'vitest';
import { parseFormula } from '../src/contracts/index.js';
import { decodeFormula } from '../src/application/documents.js';
import {
  BUILT_IN_INGREDIENT_VERSIONS,
  BUILT_IN_INGREDIENTS,
  CONTRACT_VERSION,
  applyFormulaEdit,
  builtInIngredient,
  checkRecipe,
  contentOf,
  customizeIngredient,
  duplicateIngredient,
  effectiveIngredient,
  entryContents,
  ingredientEntryFrom,
  ingredientEntryWarnings,
  ingredientUsedProperties,
  newIngredientEntry,
  nextIngredientVersion,
  resolveFormula,
  validateFormula,
  validateIngredientEntry,
  type Formula,
  type Ingredient,
  type IngredientEntry,
  type Instant,
  type Process,
  type PropertyValue,
} from '../src/domain/index.js';

/** Domain of the ingredient registry (docs/contracts/ingredients.md). */

const at = '2026-10-13T08:00:00.000Z' as Instant;
const U: PropertyValue = { status: 'unknown' };

const pct = (
  value: number,
  source: { kind: 'package' | 'personal' | 'reference'; detail?: string } = { kind: 'personal' },
  status: 'known' | 'estimated' = 'known',
  uncertainty?: number,
): PropertyValue => ({
  status,
  value,
  unit: 'pct',
  basis: 'per100g',
  source,
  ...(uncertainty === undefined ? {} : { uncertainty }),
});

const butter = (changes: Partial<IngredientEntry> = {}): IngredientEntry => {
  const base = newIngredientEntry({
    id: 'beurre-82',
    name: 'Beurre 82 %',
    family: 'fat',
    createdAt: at,
  });
  return {
    ...base,
    composition: {
      ...base.composition,
      fatPct: pct(82, { kind: 'package', detail: 'label, 82 % fat' }),
    },
    ...changes,
  };
};

const formulaWith = (...ingredients: Ingredient[]): Formula => ({
  flours: [{ id: 'bread-flour', sharePct: 100 }],
  ingredients: [
    { id: 'water', kind: 'water', bakerPct: 50, role: 'dough' },
    {
      id: 'salt',
      kind: 'other',
      bakerPct: 2,
      role: 'dough',
      water: { status: 'known', valuePct: 0 },
    },
    ...ingredients,
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 500 },
});

const plainButter: Ingredient = { id: 'butter', kind: 'other', bakerPct: 10, role: 'dough' };

const edited = (formula: Formula, edit: Parameters<typeof applyFormulaEdit>[1]): Formula => {
  const result = applyFormulaEdit(formula, edit);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const resolved = (formula: Formula) => {
  const result = resolveFormula(formula);
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const ingredientOf = (formula: Formula, id: string): Ingredient => {
  const found = formula.ingredients.find((i) => i.id === id);
  if (!found) throw new Error(`no ${id}`);
  return found;
};

const problem = (entry: IngredientEntry) => {
  const result = validateIngredientEntry(entry);
  return result.ok ? undefined : result.error.details;
};

describe('contract version', () => {
  it('is 0.20.0 with step countdown holds (bake-session.md)', () => {
    expect(CONTRACT_VERSION).toBe('0.20.0');
  });
});

describe('built-in entries (ingredients.md)', () => {
  const table: Array<[string, string, string, string | undefined, string | undefined]> = [
    ['water', 'water', 'water', undefined, undefined],
    ['salt', 'salt', 'other', undefined, undefined],
    ['instant-yeast', 'leaven', 'other', 'commercialYeast instant', undefined],
    ['active-dry-yeast', 'leaven', 'other', 'commercialYeast active-dry', undefined],
    ['fresh-yeast', 'leaven', 'other', 'commercialYeast fresh', undefined],
    ['sourdough-starter', 'leaven', 'other', 'sourdough', undefined],
    ['baking-powder', 'leaven', 'other', 'chemical', undefined],
    ['sugar', 'sugar', 'other', undefined, undefined],
    ['maple-syrup', 'sugar', 'other', undefined, undefined],
    ['honey', 'sugar', 'other', undefined, undefined],
    ['olive-oil', 'fat', 'other', undefined, undefined],
    ['butter', 'fat', 'other', undefined, undefined],
    ['milk', 'dairy', 'other', undefined, undefined],
    ['milk-powder', 'dairy', 'other', undefined, 'powder'],
    ['cream', 'dairy', 'other', undefined, undefined],
    ['egg', 'egg', 'other', undefined, undefined],
    ['egg-white', 'egg', 'other', undefined, undefined],
    ['egg-yolk', 'egg', 'other', undefined, undefined],
    ['meringue', 'egg', 'other', undefined, undefined],
    ['dried-fruit', 'fruit', 'other', undefined, 'dried'],
    ['fresh-fruit', 'fruit', 'other', undefined, 'fresh'],
    ['nuts', 'nutSeed', 'other', undefined, undefined],
    ['seeds', 'nutSeed', 'other', undefined, undefined],
    ['diastatic-malt', 'malt', 'other', undefined, undefined],
    ['non-diastatic-malt', 'malt', 'other', undefined, undefined],
    ['cider-vinegar', 'acid', 'other', undefined, undefined],
  ];

  it('lists exactly the contract table, in its order', () => {
    expect(BUILT_IN_INGREDIENTS.map((e) => e.id)).toEqual(table.map(([id]) => id));
    expect(BUILT_IN_INGREDIENT_VERSIONS).toHaveLength(table.length);
  });

  it.each(table)('%s has its identity', (id, family, kind, leavening, form) => {
    const entry = builtInIngredient(id);
    expect(entry).toBeDefined();
    if (!entry) return;
    expect([entry.family, entry.kind, entry.form]).toEqual([family, kind, form]);
    const shown =
      entry.leavening === undefined
        ? undefined
        : entry.leavening.type === 'commercialYeast'
          ? `commercialYeast ${entry.leavening.form}`
          : entry.leavening.type;
    expect(shown).toBe(leavening);
    expect(entry).toMatchObject({ version: 1, builtIn: true, archived: false });
    expect(entry.name).toBeUndefined();
    expect(validateIngredientEntry(entry).ok).toBe(true);
  });

  it('ships no number yet: every value is unknown, organic included', () => {
    for (const entry of BUILT_IN_INGREDIENTS) {
      expect(entry.organic).toEqual(U);
      expect(Object.values(entry.composition)).toEqual(Array(7).fill(U));
      expect(Object.values(entry.properties)).toEqual([U, U]);
    }
  });
});

describe('entry validation (ingredients.md, Validation)', () => {
  it('accepts a partial entry: only the family and the kind are set', () => {
    const entry = newIngredientEntry({
      id: 'x',
      name: 'Handmade',
      family: 'unknown',
      createdAt: at,
    });
    expect(validateIngredientEntry(entry).ok).toBe(true);
  });

  it('refuses a composition value outside [0, 100] or with a negative uncertainty', () => {
    const c = butter().composition;
    expect(problem(butter({ composition: { ...c, fatPct: pct(101) } }))).toEqual({
      field: 'composition.fatPct',
      reason: 'must be within [0, 100]',
    });
    expect(problem(butter({ composition: { ...c, fatPct: pct(-1) } }))?.field).toBe(
      'composition.fatPct',
    );
    expect(
      problem(butter({ composition: { ...c, waterPct: pct(16, undefined, 'estimated', -2) } })),
    ).toEqual({ field: 'composition.waterPct', reason: 'has an invalid uncertainty' });
  });

  it('refuses sugars or fibre above carbohydrates, when known', () => {
    const c = butter().composition;
    expect(
      problem(butter({ composition: { ...c, sugarPct: pct(20), carbohydratePct: pct(10) } })),
    ).toEqual({ field: 'composition.sugarPct', reason: 'exceeds carbohydratePct' });
    expect(
      problem(butter({ composition: { ...c, fibrePct: pct(20), carbohydratePct: pct(10) } }))
        ?.field,
    ).toBe('composition.fibrePct');
    // Unknown carbohydrates: nothing to compare.
    expect(problem(butter({ composition: { ...c, sugarPct: pct(20) } }))).toBeUndefined();
  });

  it('warns, never refuses, when sugars plus fibre exceed carbohydrates or the sum exceeds 100', () => {
    const c = butter().composition;
    const overlap = butter({
      composition: { ...c, sugarPct: pct(8), fibrePct: pct(4), carbohydratePct: pct(10) },
    });
    expect(validateIngredientEntry(overlap).ok).toBe(true);
    expect(ingredientEntryWarnings(overlap)).toEqual([
      { code: 'sugars_and_fibre_exceed_carbohydrate', field: 'composition' },
    ]);
    const rounded = butter({
      composition: { ...c, waterPct: pct(17), proteinPct: pct(1), saltPct: pct(1) },
    });
    expect(validateIngredientEntry(rounded).ok).toBe(true);
    expect(ingredientEntryWarnings(rounded)).toEqual([
      { code: 'sum_exceeds_100', field: 'composition' },
    ]);
    expect(ingredientEntryWarnings(butter())).toEqual([]);
  });

  it('refuses a composition value on another basis than per100g', () => {
    const c = butter().composition;
    for (const basis of ['perServing', 'dryMatter', 'asIs', 'moisture14'] as const) {
      const fatPct = { ...pct(82), basis };
      expect(problem(butter({ composition: { ...c, fatPct } }))).toEqual({
        field: 'composition.fatPct',
        reason: 'must be on the basis per100g',
      });
    }
  });

  it('refuses commercial yeast outside the leaven family and kind water outside water', () => {
    expect(
      problem(butter({ leavening: { type: 'commercialYeast', form: 'instant' } }))?.field,
    ).toBe('leavening');
    expect(problem(butter({ kind: 'water' }))?.field).toBe('kind');
    expect(
      problem(butter({ family: 'leaven', leavening: { type: 'commercialYeast', form: 'fresh' } })),
    ).toBeUndefined();
  });

  it('refuses a pH outside [0, 14] and accepts a diastatic power in degrees Lintner', () => {
    const p = butter().properties;
    const ph = (value: number): PropertyValue => ({
      status: 'known',
      value,
      source: { kind: 'lab' },
    });
    expect(problem(butter({ properties: { ...p, ph: ph(15) } }))).toEqual({
      field: 'properties.ph',
      reason: 'must be within [0, 14]',
    });
    expect(problem(butter({ properties: { ...p, ph: ph(3.2) } }))).toBeUndefined();
    const power: PropertyValue = {
      status: 'known',
      value: 60,
      unit: '°L',
      source: { kind: 'producer' },
    };
    expect(problem(butter({ family: 'malt', properties: { ...p, diastaticPower: power } }))).toBe(
      undefined,
    );
  });

  it('refuses a basedOn on the entry itself', () => {
    expect(problem(butter({ basedOn: { id: 'beurre-82', version: 1 } }))?.field).toBe('basedOn');
  });

  it('refuses a personal entry under a built-in id unless it customizes that built-in', () => {
    expect(problem(butter({ id: 'butter' }))).toEqual({
      field: 'id',
      reason: 'is the id of a built-in entry',
    });
  });

  it('checks a customization: same id, a built-in, no basedOn, name or aliases, same identity', () => {
    const builtIn = builtInIngredient('butter') as IngredientEntry;
    const customized = customizeIngredient(builtIn, { version: 1, createdAt: at });
    expect(customized.ok).toBe(true);
    if (!customized.ok) return;
    const c = customized.value;
    expect(c).toMatchObject({
      id: 'butter',
      version: 1,
      builtIn: false,
      customizes: { id: 'butter', version: 1 },
      family: 'fat',
      kind: 'other',
    });
    expect(c.name).toBeUndefined();
    expect(problem({ ...c, customizes: { id: 'milk', version: 1 } })?.field).toBe('customizes');
    expect(problem({ ...c, id: 'mine', customizes: { id: 'mine', version: 1 } })).toEqual({
      field: 'customizes',
      reason: 'names no built-in',
    });
    expect(problem({ ...c, basedOn: { id: 'milk', version: 1 } })?.field).toBe('basedOn');
    expect(problem({ ...c, name: 'Mon beurre' })?.field).toBe('name');
    expect(problem({ ...c, aliases: ['beurre'] })?.field).toBe('aliases');
    expect(problem({ ...c, family: 'dairy' })?.field).toBe('customizes');
    expect(problem({ ...c, form: 'powder' })?.field).toBe('customizes');
    const yeast = customizeIngredient(builtInIngredient('instant-yeast') as IngredientEntry, {
      version: 1,
      createdAt: at,
    });
    expect(yeast.ok).toBe(true);
    if (yeast.ok) {
      expect(
        problem({ ...yeast.value, leavening: { type: 'commercialYeast', form: 'fresh' } })?.field,
      ).toBe('customizes');
    }
  });

  it('never edits a built-in; a new version keeps id, origin and built-in flag', () => {
    const builtIn = builtInIngredient('salt') as IngredientEntry;
    expect(nextIngredientVersion(builtIn, { brand: 'X' }, at).ok).toBe(false);
    const next = nextIngredientVersion(butter(), { name: 'Beurre doux', brand: 'Laiterie' }, at);
    expect(next.ok && next.value).toMatchObject({
      id: 'beurre-82',
      version: 2,
      name: 'Beurre doux',
      brand: 'Laiterie',
    });
  });

  it('duplicates any entry under a new id with basedOn', () => {
    const copy = duplicateIngredient(builtInIngredient('milk') as IngredientEntry, {
      id: 'mon-lait',
      name: 'Mon lait',
      createdAt: at,
    });
    expect(copy).toMatchObject({
      id: 'mon-lait',
      version: 1,
      name: 'Mon lait',
      builtIn: false,
      basedOn: { id: 'milk', version: 1 },
      family: 'dairy',
    });
    expect(validateIngredientEntry(copy).ok).toBe(true);
  });

  it('takes the head customization in force as the effective entry, else the built-in', () => {
    const builtIn = builtInIngredient('butter') as IngredientEntry;
    const customized = customizeIngredient(builtIn, { version: 1, createdAt: at });
    if (!customized.ok) throw new Error('customize');
    expect(effectiveIngredient(builtIn, undefined)).toBe(builtIn);
    expect(effectiveIngredient(builtIn, customized.value)).toBe(customized.value);
    expect(effectiveIngredient(builtIn, { ...customized.value, version: 2, archived: true })).toBe(
      builtIn,
    );
  });
});

describe('entry to formula (ingredients.md, Entry to formula)', () => {
  it('maps known, estimated and unknown values mechanically', () => {
    expect(contentOf(pct(82, { kind: 'package', detail: 'label, 82 % fat' }))).toEqual({
      status: 'known',
      valuePct: 82,
      source: 'package: label, 82 % fat',
    });
    expect(contentOf(pct(16, { kind: 'personal' }, 'estimated'))).toEqual({
      status: 'estimated',
      valuePct: 16,
      source: 'personal',
    });
    expect(contentOf(pct(16, { kind: 'personal' }, 'estimated', 2))).toEqual({
      status: 'estimated',
      valuePct: 16,
      rangePct: [14, 18],
      source: 'personal',
    });
    // The clamp is the one calculation: [max(0, v − u), min(100, v + u)].
    expect(contentOf(pct(1, undefined, 'estimated', 2))).toMatchObject({ rangePct: [0, 3] });
    expect(contentOf(pct(99, undefined, 'estimated', 2))).toMatchObject({ rangePct: [97, 100] });
    expect(contentOf(U)).toBeUndefined();
  });

  it('gives a yeast marker for commercial yeast only', () => {
    expect(entryContents(builtInIngredient('instant-yeast') as IngredientEntry).yeast).toEqual({
      form: 'instant',
    });
    expect(entryContents(builtInIngredient('sourdough-starter') as IngredientEntry).yeast).toBe(
      undefined,
    );
    expect(entryContents(builtInIngredient('baking-powder') as IngredientEntry).yeast).toBe(
      undefined,
    );
    expect(entryContents(builtInIngredient('water') as IngredientEntry).kind).toBe('water');
  });
});

describe('formula pins, overrides and preparation (ingredients.md, Formulas)', () => {
  const pinned = (changes: Partial<Ingredient>): Formula =>
    formulaWith({ ...plainButter, entry: { id: 'beurre-82', version: 1 }, ...changes });
  const refusal = (formula: Formula) => {
    const result = validateFormula(formula);
    return result.ok ? undefined : result.error;
  };

  it('accepts an ingredient without entry exactly as before', () => {
    expect(refusal(formulaWith(plainButter))).toBeUndefined();
  });

  it('refuses overrides without an entry, out of order, repeated or empty', () => {
    const code = (formula: Formula) => refusal(formula)?.code;
    expect(code(formulaWith({ ...plainButter, overrides: ['fat'] }))).toBe('InvalidFormula');
    expect(code(pinned({ overrides: ['fat', 'water'] }))).toBe('InvalidFormula');
    expect(code(pinned({ overrides: ['fat', 'fat'] }))).toBe('InvalidFormula');
    expect(code(pinned({ overrides: [] }))).toBe('InvalidFormula');
    expect(code(pinned({ overrides: ['kind', 'water', 'fat', 'sugar', 'yeast'] }))).toBe(undefined);
  });

  it('refuses a preparation other without a note, or an empty note', () => {
    expect(refusal(pinned({ preparation: { state: 'other' } }))?.details).toEqual({
      path: 'ingredients[2].preparation.note',
      reason: 'is required for the state other',
    });
    expect(refusal(pinned({ preparation: { state: 'softened', note: '  ' } }))?.code).toBe(
      'InvalidFormula',
    );
    expect(refusal(pinned({ preparation: { state: 'other', note: 'brown butter' } }))).toBe(
      undefined,
    );
  });

  it('decodes and parses the new fields, and refuses unknown ones', () => {
    const formula = pinned({
      fat: { status: 'known', valuePct: 80 },
      overrides: ['fat'],
      preparation: { state: 'softened', note: 'at 18 °C' },
      entry: { id: 'butter', version: 1, customized: true },
    });
    expect(decodeFormula(JSON.parse(JSON.stringify(formula)), 'formula')).toEqual(formula);
    expect(parseFormula(JSON.parse(JSON.stringify(formula))).ok).toBe(true);
    const bad = JSON.parse(JSON.stringify(formula)) as { ingredients: Record<string, unknown>[] };
    (bad.ingredients[2] as { entry: Record<string, unknown> }).entry.customized = false;
    expect(() => decodeFormula(bad, 'formula')).toThrow();
    expect(parseFormula(bad).ok).toBe(false);
  });

  it('applies an entry: pin, five contents replaced, overrides cleared, % kept', () => {
    const before = formulaWith({
      ...plainButter,
      water: { status: 'estimated', valuePct: 15, rangePct: [13, 17] },
      fat: { status: 'known', valuePct: 80 },
      entry: { id: 'other', version: 3 },
      overrides: ['water'],
      preparation: { state: 'softened' },
    });
    const after = ingredientOf(
      edited(before, { type: 'ApplyIngredientEntry', ingredient: 'butter', entry: butter() }),
      'butter',
    );
    // An unknown property is applied too: the estimated water becomes missing.
    expect(after).toEqual({
      id: 'butter',
      kind: 'other',
      bakerPct: 10,
      role: 'dough',
      preparation: { state: 'softened' },
      entry: { id: 'beurre-82', version: 1 },
      fat: { status: 'known', valuePct: 82, source: 'package: label, 82 % fat' },
    });
  });

  it('refuses an apply whose change of kind breaks the absorbing water', () => {
    const water = builtInIngredient('salt') as IngredientEntry;
    const locked = edited(formulaWith(), {
      type: 'LockTotalWater',
      totalWaterPct: 50,
      water: 'water',
    });
    const result = applyFormulaEdit(locked, {
      type: 'ApplyIngredientEntry',
      ingredient: 'water',
      entry: water,
    });
    expect(result.ok).toBe(false);
  });

  it('adds an ingredient with an entry; explicit contents are refused', () => {
    const added = edited(formulaWith(), {
      type: 'AddIngredient',
      ingredient: plainButter,
      entry: butter(),
    });
    expect(ingredientOf(added, 'butter')).toMatchObject({
      entry: { id: 'beurre-82', version: 1 },
      fat: { status: 'known', valuePct: 82 },
    });
    const refused = applyFormulaEdit(formulaWith(), {
      type: 'AddIngredient',
      ingredient: { ...plainButter, fat: { status: 'known', valuePct: 80 } },
      entry: butter(),
    });
    expect(refused.ok).toBe(false);
  });

  it('refuses a refresh without an entry or from another entry id', () => {
    const none = applyFormulaEdit(formulaWith(plainButter), {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: butter(),
      overrides: 'keep',
    });
    expect(none.ok ? undefined : none.error.code).toBe('IncompatibleConstraint');
    const other = applyFormulaEdit(pinned({}), {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: { ...butter(), id: 'autre', name: 'Autre' },
      overrides: 'clear',
    });
    expect(other.ok ? undefined : other.error.code).toBe('IncompatibleConstraint');
  });

  it('marks every content typed on a linked ingredient, even a value equal to the entry', () => {
    const applied = edited(formulaWith(plainButter), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: butter(),
    });
    const same = edited(applied, {
      type: 'UpdateIngredient',
      ingredient: 'butter',
      changes: { fat: { status: 'known', valuePct: 82, source: 'package: label, 82 % fat' } },
    });
    expect(ingredientOf(same, 'butter').overrides).toEqual(['fat']);
    const more = edited(same, {
      type: 'UpdateIngredient',
      ingredient: 'butter',
      changes: { water: { status: 'unknown' }, kind: 'other', role: 'glaze' },
    });
    expect(ingredientOf(more, 'butter').overrides).toEqual(['kind', 'water', 'fat']);
    // A preparation or a role is not a content: no override.
    const prepared = edited(applied, {
      type: 'UpdateIngredient',
      ingredient: 'butter',
      changes: { preparation: { state: 'melted', note: ' browned ' } },
    });
    expect(ingredientOf(prepared, 'butter').overrides).toBeUndefined();
    expect(ingredientOf(prepared, 'butter').preparation).toEqual({
      state: 'melted',
      note: 'browned',
    });
    // Without an entry nothing is marked.
    const plain = edited(formulaWith(plainButter), {
      type: 'UpdateIngredient',
      ingredient: 'butter',
      changes: { fat: { status: 'known', valuePct: 82 } },
    });
    expect(ingredientOf(plain, 'butter').overrides).toBeUndefined();
  });
});

describe('recipe checks recognize entries (drafts.md)', () => {
  const process: Process = {
    steps: [
      { id: 'mix', operation: 'mix', dependsOn: [], schedule: 'asap', plannedDurationS: 600 },
      {
        id: 'bake',
        operation: 'bake',
        dependsOn: ['mix'],
        schedule: 'asap',
        plannedDurationS: 1800,
      },
    ],
  };
  const formula: Formula = {
    flours: [{ id: 'bread-flour', sharePct: 100 }],
    ingredients: [
      { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
      {
        id: 'sel-gris',
        kind: 'other',
        bakerPct: 2,
        role: 'dough',
        entry: { id: 'salt', version: 1 },
      },
      {
        id: 'levain',
        kind: 'other',
        bakerPct: 20,
        role: 'dough',
        entry: { id: 'mine', version: 1 },
      },
    ],
    components: [],
    anchor: { kind: 'flourTotal', grams: 500 },
  };
  const codes = (families?: Parameters<typeof checkRecipe>[2]) =>
    checkRecipe(formula, process, families).map((i) => i.code);

  it('without entryFamilies, only ids and yeast marks count', () => {
    expect(codes()).toEqual(expect.arrayContaining(['salt_missing', 'no_leavening']));
  });

  it('a dough ingredient with a salt entry is salt; a leaven entry is leavening', () => {
    const found = codes({ 'sel-gris': 'salt', levain: 'leaven' });
    expect(found).not.toContain('salt_missing');
    expect(found).not.toContain('no_leavening');
    expect(
      checkRecipe(
        {
          ...formula,
          ingredients: formula.ingredients.map((i) =>
            i.id === 'sel-gris' ? { ...i, bakerPct: 5 } : i,
          ),
        },
        process,
        { 'sel-gris': 'salt' },
      ),
    ).toContainEqual(
      expect.objectContaining({
        code: 'salt_outside_1_to_3_5',
        path: 'ingredients.sel-gris.bakerPct',
      }),
    );
  });
});

describe('used properties (ingredients.md, Bakes)', () => {
  it('lists water, fat and sugar when consumed, and the yeast marker, per formula ingredient', () => {
    const formula = formulaWith(
      {
        ...plainButter,
        water: { status: 'estimated', valuePct: 15, rangePct: [13, 17], source: 'personal' },
        fat: { status: 'known', valuePct: 80, source: 'personal' },
        entry: { id: 'beurre-82', version: 3 },
        overrides: ['fat'],
      },
      {
        id: 'glaze',
        kind: 'other',
        bakerPct: 2,
        role: 'glaze',
        fat: { status: 'known', valuePct: 82, source: 'package: label, 82 % fat' },
        entry: { id: 'beurre-82', version: 1 },
      },
      {
        id: 'yeast',
        kind: 'other',
        bakerPct: 1,
        role: 'dough',
        yeast: { form: 'instant' },
        entry: { id: 'instant-yeast', version: 1 },
      },
    );
    expect(ingredientUsedProperties(formula)).toEqual([
      {
        ingredient: 'beurre-82',
        version: 3,
        formulaIngredient: 'butter',
        key: 'waterPct',
        value: pct(15, { kind: 'personal' }, 'estimated', 2),
      },
      {
        ingredient: 'beurre-82',
        version: 3,
        formulaIngredient: 'butter',
        key: 'fatPct',
        value: pct(80),
        overridden: true,
      },
      {
        ingredient: 'beurre-82',
        version: 1,
        formulaIngredient: 'glaze',
        key: 'fatPct',
        value: pct(82, { kind: 'package', detail: 'label, 82 % fat' }),
      },
      {
        ingredient: 'instant-yeast',
        version: 1,
        formulaIngredient: 'yeast',
        key: 'leavening',
        value: { status: 'known', value: 'instant', source: { kind: 'personal' } },
      },
    ]);
    // With the pinned entries, a value that is not overridden is the entry's own.
    const rows = ingredientUsedProperties(formula, [
      builtInIngredient('instant-yeast') as IngredientEntry,
    ]);
    expect(rows.at(-1)?.value).toEqual({
      status: 'known',
      value: 'instant',
      source: { kind: 'reference' },
    });
  });

  it('a formula without pins has no rows', () => {
    expect(ingredientUsedProperties(formulaWith(plainButter))).toEqual([]);
  });
});

describe('create an entry from an ingredient (ingredients.md, example 3)', () => {
  const honey: Ingredient = {
    id: 'honey',
    kind: 'other',
    bakerPct: 5,
    role: 'dough',
    water: { status: 'estimated', valuePct: 17, rangePct: [14, 20], source: 'table' },
  };

  it('writes the contents as personal values; a range becomes its half-width', () => {
    const entry = ingredientEntryFrom(honey, { id: 'miel', name: 'Miel', createdAt: at });
    expect(entry.ok).toBe(true);
    if (!entry.ok) return;
    expect(entry.value.composition.waterPct).toEqual({
      status: 'estimated',
      value: 17,
      unit: 'pct',
      basis: 'per100g',
      source: { kind: 'personal', detail: 'table' },
      uncertainty: 3,
    });
    expect(entry.value.composition.fatPct).toEqual(U);
    expect(entry.value).toMatchObject({ name: 'Miel', family: 'unknown', kind: 'other' });
  });

  it('refuses a range that is not symmetric about the value', () => {
    const result = ingredientEntryFrom(
      { ...honey, water: { status: 'estimated', valuePct: 17, rangePct: [14, 21] } },
      { id: 'miel', name: 'Miel', createdAt: at },
    );
    expect(result.ok ? undefined : result.error.details?.field).toBe('composition.waterPct');
  });

  it('keeps a yeast marker as commercial yeast of the leaven family', () => {
    const result = ingredientEntryFrom(
      { id: 'y', kind: 'other', bakerPct: 1, role: 'dough', yeast: { form: 'fresh' } },
      { id: 'levure', name: 'Levure', createdAt: at },
    );
    expect(result.ok && result.value).toMatchObject({
      family: 'leaven',
      leavening: { type: 'commercialYeast', form: 'fresh' },
    });
  });
});

describe('acceptance examples (ingredients.md)', () => {
  it('1: a personal butter with a known fat brings 41 g of fat and an unknown water', () => {
    const entry = butter();
    expect(validateIngredientEntry(entry).ok).toBe(true);
    const formula = edited(formulaWith(plainButter), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry,
    });
    expect(ingredientOf(formula, 'butter')).toMatchObject({
      entry: { id: 'beurre-82', version: 1 },
      fat: { status: 'known', valuePct: 82, source: 'package: label, 82 % fat' },
    });
    expect(ingredientOf(formula, 'butter').water).toBeUndefined();
    const r = resolved(formula);
    expect(r.grams.butter).toBeCloseTo(50, 9);
    expect(r.totalFat?.value).toBeCloseTo(41, 9);
    expect(r.totalFatPct).toBeCloseTo(8.2, 9);
    expect(r.totalWater.completeness).toBe('incomplete');
    expect(r.totalWater.unknownContributors).toContain('butter');
    expect(r.totalFat?.completeness).toBe('incomplete');
  });

  it('2: a yeast entry gives the marker only; a sourdough starter gives none', () => {
    const base = newIngredientEntry({
      id: 'saf-red',
      name: 'SAF Red',
      family: 'leaven',
      createdAt: at,
    });
    const saf: IngredientEntry = {
      ...base,
      brand: 'SAF',
      leavening: { type: 'commercialYeast', form: 'instant' },
    };
    const yeast: Ingredient = { id: 'yeast', kind: 'other', bakerPct: 1, role: 'dough' };
    const once = edited(formulaWith(yeast), {
      type: 'ApplyIngredientEntry',
      ingredient: 'yeast',
      entry: saf,
    });
    expect(ingredientOf(once, 'yeast').yeast).toEqual({ form: 'instant' });
    const renamed = nextIngredientVersion(saf, { name: 'SAF rouge', brand: 'Lesaffre' }, at);
    if (!renamed.ok) throw new Error('rename');
    const twice = edited(once, {
      type: 'RefreshIngredientEntry',
      ingredient: 'yeast',
      entry: renamed.value,
      overrides: 'clear',
    });
    const { entry: _a, ...first } = ingredientOf(once, 'yeast');
    const { entry: _b, ...second } = ingredientOf(twice, 'yeast');
    expect(second).toEqual(first);
    const starter: Ingredient = { id: 'levain', kind: 'other', bakerPct: 20, role: 'dough' };
    const withStarter = edited(formulaWith(starter), {
      type: 'ApplyIngredientEntry',
      ingredient: 'levain',
      entry: builtInIngredient('sourdough-starter') as IngredientEntry,
    });
    expect(ingredientOf(withStarter, 'levain').yeast).toBeUndefined();
  });

  it('6: a composite counts once; a component adds no mass', () => {
    const formula: Formula = {
      flours: [{ id: 'bread-flour', sharePct: 100 }],
      ingredients: [
        { id: 'water', kind: 'water', bakerPct: 70, role: 'dough' },
        {
          id: 'milk-powder',
          kind: 'other',
          bakerPct: 6,
          role: 'dough',
          entry: { id: 'milk-powder', version: 1 },
        },
      ],
      components: [
        {
          id: 'scald',
          kind: 'scald',
          flourPct: 10,
          flourBlend: [{ flour: 'bread-flour', sharePct: 100 }],
          hydrationPct: 540,
          allocations: [{ ingredient: 'milk-powder', bakerPct: 6 }],
        },
      ],
      anchor: { kind: 'flourTotal', grams: 500 },
    };
    const r = resolved(formula);
    // 500 × 6 / 100 = 30 g of milk powder, 50 g of flour × 540 / 100 = 270 g of water.
    expect(r.grams['milk-powder']).toBeCloseTo(30, 9);
    expect(r.components.scald?.water).toBeCloseTo(270, 9);
    expect(r.doughWeight).toBeCloseTo(500 + 350 + 30, 9);
    const declared = formulaWith(
      {
        id: 'meringue',
        kind: 'other',
        bakerPct: 4,
        role: 'dough',
        entry: { id: 'meringue', version: 1 },
      },
      { id: 'egg-white', kind: 'other', bakerPct: 2, role: 'dough' },
      { id: 'sugar', kind: 'other', bakerPct: 2, role: 'dough' },
    );
    // Typed as three ingredients, counted as three: 20 + 10 + 10 g.
    expect(resolved(declared).doughWeight).toBeCloseTo(500 + 250 + 10 + 20 + 10 + 10, 9);
  });

  it('9: unknown is not zero; a typed 0 water leaves only the water total', () => {
    const paste = newIngredientEntry({
      id: 'pate',
      name: 'Pâte de noix',
      family: 'nutSeed',
      createdAt: at,
    });
    const formula = edited(formulaWith({ id: 'noix', kind: 'other', bakerPct: 8, role: 'dough' }), {
      type: 'ApplyIngredientEntry',
      ingredient: 'noix',
      entry: paste,
    });
    const r = resolved(formula);
    expect(r.grams.noix).toBeCloseTo(40, 9);
    for (const total of [r.totalWater, r.totalFat, r.totalSugar]) {
      expect(total?.completeness).toBe('incomplete');
      expect(total?.unknownContributors).toContain('noix');
    }
    const typed = edited(formula, {
      type: 'UpdateIngredient',
      ingredient: 'noix',
      changes: { water: { status: 'known', valuePct: 0, source: 'personal' } },
    });
    const after = resolved(typed);
    expect(after.totalWater.unknownContributors).not.toContain('noix');
    expect(after.totalFat?.unknownContributors).toContain('noix');
    expect(after.totalSugar?.unknownContributors).toContain('noix');
    expect(ingredientOf(typed, 'noix').overrides).toEqual(['water']);
  });

  it('11: a preparation changes no number; other without a note is refused', () => {
    const half = (id: string, state: 'softened' | 'cold'): Ingredient => ({
      id,
      kind: 'other',
      bakerPct: 5,
      role: 'dough',
      fat: { status: 'known', valuePct: 82, source: 'package: label, 82 % fat' },
      entry: { id: 'beurre-82', version: 1 },
      preparation: { state },
    });
    const split = formulaWith(half('butter-a', 'softened'), half('butter-b', 'cold'));
    const r = resolved(split);
    expect(r.grams['butter-a']).toBeCloseTo(25, 9);
    expect(r.totalFat?.value).toBeCloseTo(41, 9);
    expect(r.totalFatPct).toBeCloseTo(8.2, 9);
    const bare = edited(
      edited(split, {
        type: 'UpdateIngredient',
        ingredient: 'butter-a',
        changes: { preparation: null },
      }),
      { type: 'UpdateIngredient', ingredient: 'butter-b', changes: { preparation: null } },
    );
    expect(ingredientOf(bare, 'butter-a').preparation).toBeUndefined();
    expect(resolved(bare)).toEqual(r);
    const other = applyFormulaEdit(split, {
      type: 'UpdateIngredient',
      ingredient: 'butter-a',
      changes: { preparation: { state: 'other' } },
    });
    expect(other.ok ? undefined : other.error.code).toBe('InvalidFormula');
  });
});
