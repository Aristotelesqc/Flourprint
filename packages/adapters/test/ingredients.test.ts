import { describe, expect, it } from 'vitest';
import {
  archiveIngredient,
  bakeUsedProperties,
  bakeDigest,
  customizeBuiltInIngredient,
  duplicateIngredientEntry,
  editIngredient,
  entryFamiliesOf,
  executeBakeCommand,
  exportBackup,
  exportRecipes,
  importBackup,
  importRecipes,
  ingredientCatalog,
  ingredientPicker,
  loadBake,
  resetIngredientToFactory,
  resolveIngredientRef,
  saveIngredientEntry,
  saveRevision,
  type BackupStores,
  type RestoreTarget,
} from '@flourprint/core/application';
import {
  BUILT_IN_INGREDIENTS,
  applyFormulaEdit,
  builtInIngredient,
  checkRecipe,
  entryContents,
  ingredientEntryFrom,
  newIngredientEntry,
  resolveFormula,
  type BakeCommandPayload,
  type Formula,
  type FormulaEdit,
  type Ingredient,
  type IngredientEntry,
  type Instant,
  type Process,
  type PropertyValue,
} from '@flourprint/core/domain';
import {
  MemoryBakeEventStore,
  MemoryEquipmentRegistry,
  MemoryFlourRegistry,
  MemoryIngredientRegistry,
  MemoryRecipeRepository,
  MemoryRestoreTarget,
} from '../src/memory/index.js';
import {
  openNodeSqlite,
  SqlBakeEventStore,
  SqlEquipmentRegistry,
  SqlFlourRegistry,
  SqlIngredientRegistry,
  SqlRecipeRepository,
  SqlRestoreTarget,
} from '../src/sqlite-node/index.js';

/** Application and stores of the ingredient registry (ingredients.md, acceptance examples). */

const at = (time: string) => `2026-10-13T${time}:00.000Z` as Instant;

type Stores = BackupStores & { readonly restore: RestoreTarget };

const makers: Array<[string, () => Promise<Stores>]> = [
  [
    'memory',
    async () => {
      const ingredients = new MemoryIngredientRegistry();
      const recipes = new MemoryRecipeRepository(ingredients);
      const bakes = new MemoryBakeEventStore();
      const flours = new MemoryFlourRegistry();
      const equipment = new MemoryEquipmentRegistry();
      return {
        recipes,
        bakes,
        flours,
        equipment,
        ingredients,
        restore: new MemoryRestoreTarget(recipes, bakes, flours, equipment, ingredients),
      };
    },
  ],
  [
    'sqlite-node',
    async () => {
      const db = await openNodeSqlite(':memory:');
      if (!db.ok) throw new Error(JSON.stringify(db.error));
      const driver = db.value.driver;
      return {
        recipes: new SqlRecipeRepository(driver),
        bakes: new SqlBakeEventStore(driver),
        flours: new SqlFlourRegistry(driver),
        equipment: new SqlEquipmentRegistry(driver),
        ingredients: new SqlIngredientRegistry(driver),
        restore: new SqlRestoreTarget(driver),
      };
    },
  ],
];

const pct = (
  value: number,
  source: { kind: 'package' | 'personal'; detail?: string } = { kind: 'personal' },
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

const FAT_82 = pct(82, { kind: 'package', detail: 'label, 82 % fat' });

/** `Beurre 82 %` version 1 (example 1). */
const beurre = (): IngredientEntry => {
  const base = newIngredientEntry({
    id: 'beurre-82',
    name: 'Beurre 82 %',
    family: 'fat',
    createdAt: at('08:00'),
  });
  return { ...base, composition: { ...base.composition, fatPct: FAT_82 } };
};

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

/** The brioche of the examples: 500 g of flour, a 10 % butter. */
const brioche = (butter: Partial<Ingredient> = {}): Formula => ({
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
    { id: 'butter', kind: 'other', bakerPct: 10, role: 'dough', ...butter },
  ],
  components: [],
  anchor: { kind: 'flourTotal', grams: 500 },
});

const must = <T>(result: { ok: true; value: T } | { ok: false; error: unknown }): T => {
  if (!result.ok) throw new Error(JSON.stringify(result.error));
  return result.value;
};

const edit = (formula: Formula, command: FormulaEdit): Formula =>
  must(applyFormulaEdit(formula, command));

const butterOf = (formula: Formula): Ingredient =>
  formula.ingredients.find((i) => i.id === 'butter') as Ingredient;

const save = async (stores: Stores, formula: Formula, expectedHead: number, time: string) =>
  must(
    await saveRevision(stores.recipes, {
      recipeId: 'brioche',
      name: 'Brioche',
      expectedHead,
      formula,
      process,
      createdAt: at(time),
    }),
  );

let commandCount = 0;
const startBake = async (stores: Stores, bakeId: string, version: number, formula: Formula) => {
  const ref = { id: 'brioche', version };
  const payload: BakeCommandPayload = {
    type: 'StartBake',
    revisions: { formula: ref, process: ref },
    formula,
    process,
    mode: { kind: 'startAt', at: at('12:00') },
  };
  const result = await executeBakeCommand(
    {
      store: stores.bakes,
      clock: { now: () => at('12:00') },
      ids: { next: () => `event-${++commandCount}` },
    },
    {
      commandId: `command-${++commandCount}`,
      bakeId,
      expectedVersion: 0,
      issuedAt: at('12:00'),
      payload,
    },
  );
  return must(result).state;
};

describe.each(makers)('ingredient registry on %s', (_name, make) => {
  it('example 1: creates version 1 of a personal entry with a new id', async () => {
    const stores = await make();
    expect(must(await saveIngredientEntry(stores.ingredients, beurre()))).toEqual(beurre());
    expect(await stores.ingredients.listIngredients()).toEqual([beurre()]);
    // A personal entry is never written under a built-in id without customizing it.
    const squat = await saveIngredientEntry(stores.ingredients, { ...beurre(), id: 'butter' });
    expect(squat.ok ? undefined : squat.error.code).toBe('InvalidIngredientEntry');
    const builtIn = await saveIngredientEntry(
      stores.ingredients,
      BUILT_IN_INGREDIENTS[0] as IngredientEntry,
    );
    expect(builtIn.ok).toBe(false);
  });

  it('refuses a basedOn chain that reaches the entry itself', async () => {
    const stores = await make();
    const a = must(await saveIngredientEntry(stores.ingredients, beurre()));
    const b = must(
      await duplicateIngredientEntry(stores.ingredients, a, {
        id: 'copie',
        name: 'Copie',
        createdAt: at('08:10'),
      }),
    );
    expect(b.basedOn).toEqual({ id: 'beurre-82', version: 1 });
    // A version 2 of the first entry copied from its own copy would close the loop.
    const loop = await saveIngredientEntry(stores.ingredients, {
      ...a,
      version: 2,
      basedOn: { id: 'copie', version: 1 },
    });
    expect(loop.ok ? undefined : loop.error).toMatchObject({
      code: 'InvalidIngredientEntry',
      details: { field: 'basedOn' },
    });
  });

  it('examples 3 and 4: an old bake keeps version 1, a refreshed revision pins version 2', async () => {
    const stores = await make();
    // Example 3: an ingredient without an entry starts a bake with no pin.
    const honey = brioche({
      water: { status: 'estimated', valuePct: 17, rangePct: [14, 20], source: 'table' },
    });
    const plain = await startBake(
      stores,
      'bake-0',
      (await save(stores, honey, 0, '08:30')).version,
      honey,
    );
    expect(plain.snapshot?.usedProperties).toEqual([]);
    expect(plain.snapshot?.formula.ingredients.some((i) => i.entry)).toBe(false);
    const miel = must(
      ingredientEntryFrom(butterOf(honey), { id: 'miel', name: 'Miel', createdAt: at('08:40') }),
    );
    expect(miel.composition.waterPct).toMatchObject({
      status: 'estimated',
      value: 17,
      uncertainty: 3,
    });

    const v1 = must(await saveIngredientEntry(stores.ingredients, beurre()));
    const pinned = edit(brioche(), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: v1,
    });
    await save(stores, pinned, 1, '09:00');
    const early = await startBake(stores, 'bake-1', 2, pinned);
    expect(butterOf(early.snapshot?.formula as Formula)).toMatchObject({
      entry: { id: 'beurre-82', version: 1 },
      fat: { status: 'known', valuePct: 82 },
    });
    expect(early.snapshot?.usedProperties).toEqual([
      {
        ingredient: 'beurre-82',
        version: 1,
        formulaIngredient: 'butter',
        key: 'fatPct',
        value: FAT_82,
      },
    ]);

    const v2 = must(
      await editIngredient(
        stores.ingredients,
        v1,
        { composition: { ...v1.composition, waterPct: pct(16, undefined, 'estimated', 2) } },
        at('10:00'),
      ),
    );
    expect(v2.version).toBe(2);
    expect(must(await stores.ingredients.getIngredient('beurre-82', 1))).toEqual(v1);
    // The saved recipe still pins version 1, its water unchanged.
    const saved = must(await stores.recipes.getRevision('brioche', 2)) as { formula: Formula };
    expect(butterOf(saved.formula).entry).toEqual({ id: 'beurre-82', version: 1 });
    expect(must(resolveFormula(saved.formula)).totalWater.unknownContributors).toContain('butter');

    const refreshed = edit(saved.formula, {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: v2,
      overrides: 'keep',
    });
    await save(stores, refreshed, 2, '10:30');
    const water = must(resolveFormula(refreshed)).totalWater.contributions.find(
      (c) => c.source === 'butter',
    );
    expect(water?.grams).toBeCloseTo(8, 9);
    expect(water?.range?.[0]).toBeCloseTo(7, 9);
    expect(water?.range?.[1]).toBeCloseTo(9, 9);

    // The bake started earlier replays with version 1: no water from the butter, fat 41 g.
    const replayed = must(await loadBake(stores.bakes, 'bake-1'));
    expect(replayed.snapshot?.resolvedFormula.totalFat?.value).toBeCloseTo(41, 9);
    expect(replayed.snapshot?.resolvedFormula.totalWater.unknownContributors).toContain('butter');
    const later = await startBake(stores, 'bake-2', 3, refreshed);
    expect(butterOf(later.snapshot?.formula as Formula).entry).toEqual({
      id: 'beurre-82',
      version: 2,
    });
  });

  it('example 5: override, update from entry, used properties, detach', async () => {
    const stores = await make();
    const v1 = must(await saveIngredientEntry(stores.ingredients, beurre()));
    const v2 = must(
      await editIngredient(
        stores.ingredients,
        v1,
        { composition: { ...v1.composition, waterPct: pct(16, undefined, 'estimated', 2) } },
        at('10:00'),
      ),
    );
    const linked = edit(brioche(), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: v2,
    });
    // 5.1: a typed fat of 80 % keeps the pin and marks the field.
    const typed = edit(linked, {
      type: 'UpdateIngredient',
      ingredient: 'butter',
      changes: { fat: { status: 'known', valuePct: 80, source: 'personal' } },
    });
    expect(butterOf(typed)).toMatchObject({
      entry: { id: 'beurre-82', version: 2 },
      overrides: ['fat'],
    });
    expect(must(resolveFormula(typed)).totalFatPct).toBeCloseTo(8, 9);
    expect(must(await stores.ingredients.getIngredient('beurre-82', 2))).toEqual(v2);
    // 5.2: version 3 changes no recipe.
    const v3 = must(
      await editIngredient(
        stores.ingredients,
        v2,
        {
          composition: {
            ...v2.composition,
            fatPct: pct(83),
            waterPct: pct(15, undefined, 'estimated', 2),
          },
        },
        at('11:00'),
      ),
    );
    expect(butterOf(typed).entry?.version).toBe(2);
    // 5.3: keep and clear.
    const kept = edit(typed, {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: v3,
      overrides: 'keep',
    });
    expect(butterOf(kept)).toMatchObject({
      entry: { id: 'beurre-82', version: 3 },
      fat: { status: 'known', valuePct: 80 },
      water: { status: 'estimated', valuePct: 15, rangePct: [13, 17] },
      overrides: ['fat'],
    });
    const cleared = edit(typed, {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: v3,
      overrides: 'clear',
    });
    expect(butterOf(cleared).overrides).toBeUndefined();
    expect(must(resolveFormula(cleared)).totalFat?.value).toBeCloseTo(41.5, 9);
    // 5.4: a bake pins version 3; the overridden fat is the baker's.
    await save(stores, kept, 0, '11:30');
    const used = await bakeUsedProperties(stores.ingredients, kept);
    expect(used).toEqual([
      {
        ingredient: 'beurre-82',
        version: 3,
        formulaIngredient: 'butter',
        key: 'waterPct',
        value: pct(15, undefined, 'estimated', 2),
      },
      {
        ingredient: 'beurre-82',
        version: 3,
        formulaIngredient: 'butter',
        key: 'fatPct',
        value: pct(80),
        overridden: true,
      },
    ]);
    const bake = await startBake(stores, 'bake-5', 1, kept);
    expect(bake.snapshot?.usedProperties).toEqual(used);
    // 5.5: detaching keeps the contents as they are.
    const detached = edit(kept, { type: 'DetachIngredientEntry', ingredient: 'butter' });
    const { entry: _entry, overrides: _overrides, ...contents } = butterOf(kept);
    expect(butterOf(detached)).toEqual(contents);
    expect(must(resolveFormula(detached))).toEqual(must(resolveFormula(kept)));
    expect(must(await stores.ingredients.getIngredient('beurre-82', 3))).toEqual(v3);

    // Example 10: archiving writes version 4; the picker drops it; every pin still resolves.
    const v4 = must(await archiveIngredient(stores.ingredients, v3, at('12:30')));
    expect(v4).toMatchObject({ version: 4, archived: true });
    expect((await ingredientPicker(stores.ingredients)).some((e) => e.id === 'beurre-82')).toBe(
      false,
    );
    for (const version of [1, 2, 3]) {
      expect(
        await resolveIngredientRef(stores.ingredients, { id: 'beurre-82', version }),
      ).toMatchObject({
        version,
        archived: false,
      });
    }
    const back = must(await archiveIngredient(stores.ingredients, v4, at('12:40'), false));
    expect(back.version).toBe(5);
    expect((await ingredientPicker(stores.ingredients)).some((e) => e.id === 'beurre-82')).toBe(
      true,
    );
  });

  it('example 7: a built-in is customized, then reset to factory', async () => {
    const stores = await make();
    const builtIn = builtInIngredient('butter') as IngredientEntry;
    const before = edit(brioche(), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: builtIn,
    });
    expect(butterOf(before).entry).toEqual({ id: 'butter', version: 1 });

    const custom1 = must(
      await customizeBuiltInIngredient(stores.ingredients, 'butter', at('09:00')),
    );
    expect(custom1).toMatchObject({
      id: 'butter',
      version: 1,
      builtIn: false,
      customizes: { id: 'butter', version: 1 },
    });
    const again = await customizeBuiltInIngredient(stores.ingredients, 'butter', at('09:05'));
    expect(again.ok).toBe(false);
    const custom2 = must(
      await editIngredient(
        stores.ingredients,
        custom1,
        { composition: { ...custom1.composition, fatPct: pct(84) } },
        at('09:10'),
      ),
    );
    expect(custom2.version).toBe(2);
    // A customization changes no name and no identity.
    const renamed = await editIngredient(
      stores.ingredients,
      custom2,
      { name: 'Mon beurre' },
      at('09:15'),
    );
    expect(renamed.ok).toBe(false);

    const offered = (await ingredientPicker(stores.ingredients)).find((e) => e.id === 'butter');
    expect(offered).toEqual(custom2);
    const added = edit(
      { ...brioche(), ingredients: brioche().ingredients.filter((i) => i.id !== 'butter') },
      {
        type: 'AddIngredient',
        ingredient: { id: 'butter', kind: 'other', bakerPct: 10, role: 'dough' },
        entry: offered as IngredientEntry,
      },
    );
    expect(butterOf(added)).toMatchObject({
      entry: { id: 'butter', version: 2, customized: true },
      fat: { status: 'known', valuePct: 84 },
    });
    expect(must(resolveFormula(added)).totalFat?.value).toBeCloseTo(42, 9);
    expect(must(resolveFormula(added)).totalFatPct).toBeCloseTo(8.4, 9);
    // The recipe made before keeps the built-in pin and its contents.
    expect(butterOf(before).entry).toEqual({ id: 'butter', version: 1 });
    // A built-in pin and a customization pin of the same id and version never collide.
    expect(await resolveIngredientRef(stores.ingredients, { id: 'butter', version: 1 })).toEqual(
      builtIn,
    );
    expect(
      await resolveIngredientRef(stores.ingredients, {
        id: 'butter',
        version: 1,
        customized: true,
      }),
    ).toEqual(custom1);

    const reset = must(await resetIngredientToFactory(stores.ingredients, 'butter', at('10:00')));
    expect(reset).toMatchObject({
      version: 3,
      archived: true,
      customizes: { id: 'butter', version: 1 },
    });
    expect((await ingredientPicker(stores.ingredients)).find((e) => e.id === 'butter')).toEqual(
      builtIn,
    );
    expect(butterOf(added).fat).toEqual({ status: 'known', valuePct: 84, source: 'personal' });
    const back = edit(added, {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: builtIn,
      overrides: 'clear',
    });
    // The built-in's own fat F (unknown until its sourced values ship).
    expect(butterOf(back).entry).toEqual({ id: 'butter', version: 1 });
    expect(butterOf(back).fat).toEqual(entryContents(builtIn).fat);
    // Customizing again later writes the next version from the current built-in.
    const custom4 = must(
      await customizeBuiltInIngredient(stores.ingredients, 'butter', at('11:00')),
    );
    expect(custom4).toMatchObject({
      version: 4,
      archived: false,
      composition: builtIn.composition,
    });
    // The catalog lists built-ins and the latest personal versions.
    const catalog = await ingredientCatalog(stores.ingredients);
    expect(catalog.filter((e) => e.id === 'butter').map((e) => e.builtIn)).toEqual([true, false]);
  });

  it('example 8: a backup restores with or without the pinned versions', async () => {
    const stores = await make();
    const v1 = must(await saveIngredientEntry(stores.ingredients, beurre()));
    const pinned1 = edit(brioche(), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: v1,
    });
    await save(stores, pinned1, 0, '09:00');
    await startBake(stores, 'bake-1', 1, pinned1);
    const v2 = must(
      await editIngredient(stores.ingredients, v1, { brand: 'Laiterie' }, at('09:30')),
    );
    const pinned2 = edit(pinned1, {
      type: 'RefreshIngredientEntry',
      ingredient: 'butter',
      entry: v2,
      overrides: 'keep',
    });
    await save(stores, pinned2, 1, '10:00');
    const backup = must(await exportBackup(stores, at('11:00')));
    expect(backup.ingredients?.map((e) => e.version)).toEqual([1, 2]);

    const full = await make();
    expect(must(await importBackup(full.restore, JSON.parse(JSON.stringify(backup))))).toBe(
      undefined,
    );
    expect(await full.ingredients.listIngredientVersions()).toEqual([v1, v2]);
    const replay = must(await loadBake(full.bakes, 'bake-1'));
    expect(replay.snapshot?.resolvedFormula.totalFat?.value).toBeCloseTo(41, 9);

    for (const missing of [1, 2]) {
      const partial = {
        ...backup,
        ingredients: backup.ingredients?.filter((e) => e.version !== missing),
      };
      const target = await make();
      expect((await importBackup(target.restore, JSON.parse(JSON.stringify(partial)))).ok).toBe(
        true,
      );
      const bake = must(await loadBake(target.bakes, 'bake-1'));
      expect(bake.snapshot?.resolvedFormula.totalFat?.value).toBeCloseTo(41, 9);
      const pin = butterOf(bake.snapshot?.formula as Formula).entry;
      const found = await resolveIngredientRef(
        target.ingredients,
        pin as { id: string; version: number },
      );
      // "Entry not found" for the absent version, nothing refused, nothing dropped.
      expect(found === undefined).toBe(missing === 1);
      expect((await target.recipes.listRecipes()).map((r) => r.id)).toEqual(['brioche']);
    }
    // A backup without `ingredients` (written before the registry) restores too.
    const { ingredients: _ingredients, ...older } = backup;
    expect((await importBackup((await make()).restore, JSON.parse(JSON.stringify(older)))).ok).toBe(
      true,
    );
    // A built-in entry or a duplicated version is refused.
    const bad = await importBackup((await make()).restore, {
      ...JSON.parse(JSON.stringify(backup)),
      ingredients: [v1, v1],
    });
    expect(bad.ok).toBe(false);
  });

  it('example 8: a recipes file carries its pinned entries; an import writes the absent ones', async () => {
    const stores = await make();
    const v1 = must(await saveIngredientEntry(stores.ingredients, beurre()));
    const v2 = must(
      await editIngredient(stores.ingredients, v1, { brand: 'Laiterie' }, at('09:30')),
    );
    const unused = must(
      await saveIngredientEntry(stores.ingredients, {
        ...newIngredientEntry({
          id: 'other',
          name: 'Other',
          family: 'sugar',
          createdAt: at('09:40'),
        }),
      }),
    );
    const pinned = edit(brioche(), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: v2,
    });
    await save(stores, pinned, 0, '10:00');
    const file = must(await exportRecipes(stores.recipes, at('11:00'), stores.ingredients));
    expect(file.ingredients).toEqual([v2]);
    expect(file.ingredients).not.toContainEqual(unused);
    // Without the registry the file is as before.
    expect(must(await exportRecipes(stores.recipes, at('11:00'))).ingredients).toBeUndefined();

    const target = await make();
    const outcome = must(await importRecipes(target.recipes, JSON.parse(JSON.stringify(file))));
    expect(outcome.imported).toEqual(['brioche']);
    expect(await target.ingredients.listIngredientVersions()).toEqual([v2]);
    // Present versions are skipped, never compared or overwritten.
    const changed = { ...file, ingredients: [{ ...v2, brand: 'Changed' }] };
    must(await importRecipes(target.recipes, JSON.parse(JSON.stringify(changed))));
    expect(await target.ingredients.listIngredientVersions()).toEqual([v2]);
    // The device that holds only version 2 writes version 3 next.
    const v3 = must(await editIngredient(target.ingredients, v2, { brand: 'Next' }, at('12:00')));
    expect(v3.version).toBe(3);

    // A file without `ingredients` still resolves through the copied contents; a bake starts.
    const bare = await make();
    const { ingredients: _ingredients, ...withoutEntries } = file;
    must(await importRecipes(bare.recipes, JSON.parse(JSON.stringify(withoutEntries))));
    expect(await resolveIngredientRef(bare.ingredients, { id: 'beurre-82', version: 2 })).toBe(
      undefined,
    );
    const revision = must(await bare.recipes.getRevision('brioche', 1)) as { formula: Formula };
    const bake = await startBake(bare, 'bake-x', 1, revision.formula);
    expect(bake.snapshot?.resolvedFormula.totalFat?.value).toBeCloseTo(41, 9);
  });

  it('recipe checks recognize salt and leavening by entry', async () => {
    const stores = await make();
    const formula: Formula = {
      ...brioche(),
      ingredients: [
        { id: 'water', kind: 'water', bakerPct: 60, role: 'dough' },
        {
          id: 'fleur-de-sel',
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
          entry: { id: 'sourdough-starter', version: 1 },
        },
        {
          id: 'mystery',
          kind: 'other',
          bakerPct: 1,
          role: 'dough',
          entry: { id: 'absent', version: 4 },
        },
      ],
    };
    const families = await entryFamiliesOf(stores.ingredients, formula);
    expect(families).toEqual({ 'fleur-de-sel': 'salt', levain: 'leaven' });
    const codes = checkRecipe(formula, process, families).map((i) => i.code);
    expect(codes).not.toContain('salt_missing');
    expect(codes).not.toContain('no_leavening');
  });

  it('the feedback digest lists the pins of the snapshot formula', async () => {
    const stores = await make();
    const v1 = must(await saveIngredientEntry(stores.ingredients, beurre()));
    const pinned = edit(brioche(), {
      type: 'ApplyIngredientEntry',
      ingredient: 'butter',
      entry: v1,
    });
    await save(stores, pinned, 0, '09:00');
    await startBake(stores, 'bake-d', 1, pinned);
    const digest = bakeDigest('bake-d', await stores.bakes.loadEvents('bake-d'), () => 'Brioche');
    expect(digest?.ingredients).toEqual([
      { ingredient: 'butter', entry: { id: 'beurre-82', version: 1 } },
    ]);
    await startBake(stores, 'bake-e', 1, brioche());
    const none = bakeDigest('bake-e', await stores.bakes.loadEvents('bake-e'), () => 'Brioche');
    expect(none?.ingredients).toBeUndefined();
  });
});
