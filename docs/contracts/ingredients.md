# Contract: ingredient registry

Status: **approved** (owner decisions of 2026-10-13, listed at the end). Related issues: #26,
#27, #30. Capability level: **N1 + N2** (`capability-levels.md`).

This contract completes the manual ingredient registry of #26 for every ingredient that is not a
flour: water, salt, yeasts and leavens, sugars and syrups, fats, dairy, eggs, fruit, nuts and
seeds, inclusions, malt, acids and flavourings. Flours keep their own registry (`flours.md`); the
two registries are separate stores with separate id spaces, and they share `PropertyValue`
(`values-and-units.md`) and the rules below on versions, provenance and unknowns.

Out of scope: barcode scan and external lookup (later; they will only add fields and a proposal
flow, never replace a value silently). Prediction from these properties is out of scope too
(N3): **only three composition properties and one marker are read by calculations** (see
Consumption).

An entry says **what a product is** (identity and composition). **How it is prepared** (softened,
melted, whipped) is a note on the formula ingredient, not another entry (Preparation). **How much**
is always a mass in grams: the registry has no volume (Mass only).

## Entries

```ts
type IngredientFamily =
  | 'water'
  | 'salt'
  | 'leaven' // commercial yeast, sourdough culture, chemical leavener
  | 'sugar' // sugars and syrups
  | 'fat'
  | 'dairy'
  | 'egg'
  | 'fruit'
  | 'nutSeed'
  | 'inclusion' // chocolate, cheese, vegetables, anything added in pieces
  | 'malt'
  | 'acid' // vinegar, juice used for acidity
  | 'flavouring' // spices, extracts, herbs
  | 'liquid' // other liquids (beer, juice, tea)
  | 'other'
  | 'unknown';

// What the product is when bought, where that is part of its identity (dried fruit is not fresh
// fruit; milk powder is not milk). A preparation is never a form.
type IngredientForm = 'fresh' | 'dried' | 'powder' | 'other';

interface IngredientEntry {
  id: string; // the id used in IngredientRef; unrelated to the formula's own ingredient ids
  version: number; // 1, 2, …; a version is immutable once written
  name?: string; // display name of a personal entry; a built-in entry and its customization are named by message key
  aliases?: string[]; // extra names for search, personal entries only
  builtIn: boolean;
  customizes?: { id: string; version: number }; // personal customization of a built-in; id equals this entry's id
  family: IngredientFamily;
  kind: 'water' | 'other'; // the formula kind (formula.md); 'water' only for family 'water'
  form?: IngredientForm; // identity only; absent = unknown
  leavening?:
    | { type: 'commercialYeast'; form: 'fresh' | 'active-dry' | 'instant' }
    | { type: 'sourdough' }
    | { type: 'chemical' };
  brand?: string;
  product?: string;
  organic: PropertyValue; // boolean
  composition: {
    // points of the product mass as added, basis 'per100g'
    waterPct: PropertyValue;
    fatPct: PropertyValue;
    sugarPct: PropertyValue; // sugars, a part of carbohydratePct
    carbohydratePct: PropertyValue; // includes sugars and fibre
    proteinPct: PropertyValue;
    fibrePct: PropertyValue;
    saltPct: PropertyValue; // sodium chloride
  };
  properties: {
    ph: PropertyValue; // no unit
    diastaticPower: PropertyValue; // unit '°L' (Lintner); malt only in practice
  };
  basedOn?: { id: string; version: number }; // a personal entry copied from another entry
  notes?: string;
  archived: boolean;
  createdAt: Instant;
}

interface IngredientRef {
  id: string;
  version: number;
  customized?: true; // the version is a personal customization of the built-in with this id
}
```

- Every `PropertyValue` is the one of `values-and-units.md`. An unset property is
  `{ status: 'unknown' }`, never zero and never a default. A product that is truly free of a
  substance says so with a **known** `0` and its source (a label that lists fat as 0 g).
- `SourceRef` is the one of `flours.md`: `package`, `producer`, `lab`, `reference`, `personal`,
  with an optional `detail`.
- The list of families is **closed**, with `other` and `unknown` as the escape. A new family is a
  contract change, not data. `form` is closed the same way.
- All `composition` values are points of the mass of the product **as added**, with
  `basis: 'per100g'`. A label given per serving is converted with its serving mass when the entry
  is saved; the stored value is `per100g`, keeps the label's `source` (the serving mass goes in
  `source.detail`), and the conversion adds no significant digits. `dryMatter` and `moisture14`
  are not accepted for composition: a value on another basis is converted by its author or left
  `unknown`.
- A sodium value on a label may be entered as `saltPct` only with the stated conversion in
  `source.detail` (salt = sodium × 2.5); it is never converted silently.
- `uncertainty` of an `estimated` value is half its range, in points.
- An entry separates **identity and composition** from **preparation**. Softening or melting a
  butter, whipping a cream, beating an egg or pureeing a fruit does not change what the product is
  and creates no entry. A product whose composition really differs is a different entry: an egg
  white or yolk, a milk powder, a dried fruit, a bought meringue. A real loss or addition (water
  left in the pan) is a process fact, not an entry edit (`process.md`).
- Aliases and names are searched case- and accent-insensitively; the search is a UI matter.
- A `kind: 'water'` entry (tap, filtered, spring water) is pure water for the formula: its
  `composition` is ignored by calculations, like the contents of a `water` ingredient
  (`formula.md`). It may record `ph`.
- A **role** (`dough`, `topping`, `glaze`) is a property of a use, not of an entry: the same butter
  is dough in a brioche and a glaze on top. Entries carry no role.
- The registry has no `parts`: an entry never lists other entries. See Composite products.

### Mass only

The registry, the engine and the interface work in **grams**. No entry records a density or a
volume, no command converts a volume to a mass, and the interface offers no cups, spoons or
millilitres for an ingredient. A volume may exist only in **import provenance**: the conversion
record of an imported recipe (for example the report of the recipe importer) may say "2 cups
became 250 g" as a trace for the baker; the engine and the interface never read it as data, and
the grams it produced are the only quantity of the recipe. (An equipment capacity such as a pan's `volumeMl`, `equipment.md`, is not a quantity of an ingredient and is unaffected.)

### Validation

An entry that breaks a rule is refused with `InvalidIngredientEntry { field, reason }`; nothing is
written.

| Rule                                                                                   | Level   |
| -------------------------------------------------------------------------------------- | ------- |
| every composition value is within [0, 100] and an estimate's range is ordered          | refusal |
| `sugarPct` ≤ `carbohydratePct` and `fibrePct` ≤ `carbohydratePct`, when known          | refusal |
| `sugarPct` + `fibrePct` ≤ `carbohydratePct`, when all three are known                  | warning |
| `waterPct` + `fatPct` + `proteinPct` + `carbohydratePct` + `saltPct` ≤ 100             | warning |
| composition value on a basis other than `per100g`                                      | refusal |
| `leavening.type = 'commercialYeast'` on a family other than `leaven`                   | refusal |
| `kind = 'water'` on a family other than `water`                                        | refusal |
| `ph` outside [0, 14]                                                                   | refusal |
| `basedOn` cycles (an entry reaches itself)                                             | refusal |
| a personal `id` equal to a built-in id without `customizes`                            | refusal |
| `customizes.id` differs from the entry's `id`, or names no built-in                    | refusal |
| `customizes` together with `basedOn`, `name` or `aliases`                              | refusal |
| a customization whose `family`, `kind`, `form` or `leavening` differ from its built-in | refusal |

Warnings (`sum_exceeds_100`, `sugars_and_fibre_exceed_carbohydrate`) are shown, never block: label
rounding makes small excesses normal, and the sum stays below 100 when ash or other components are
not listed. Sugars are never added to carbohydrates, nor fibre: they overlap (#26).

## Consumption

Calculations read the registry only through the formula, and only these entry fields:

| Entry field                     | Read by                                | Through            |
| ------------------------------- | -------------------------------------- | ------------------ |
| `kind`                          | water pool (`formula.md`)              | `Ingredient.kind`  |
| `composition.waterPct`          | `totalWater` (`formula.md`)            | `Ingredient.water` |
| `composition.fatPct`            | `totalFat` (`formula.md`)              | `Ingredient.fat`   |
| `composition.sugarPct`          | `totalSugar` (`formula.md`)            | `Ingredient.sugar` |
| `leavening` (`commercialYeast`) | fermentation model (`fermentation.md`) | `Ingredient.yeast` |

Every other field (protein, carbohydrate, fibre, salt, pH, diastatic power, organic, brand,
product, family, form) is **recorded, not consumed**: it is kept in snapshots and exports for later
calibration (#14), interaction analyses (#27) and enzyme-aware domains (#30, step 8). The
preparation of a formula ingredient is recorded, not consumed, either. Nothing infers a behaviour
from a family, a name or an id.

### Entry to formula

The mapping from entry properties to formula contents is mechanical, in `core/domain`, and adds no
calculation beyond the clamp below. An entry property with `status: 'unknown'` gives a missing
content. The domain has no registry: a command that applies or refreshes an entry carries the entry
version itself, resolved by the application.

| Entry value                             | Formula content (`ContentPct`)                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------ |
| `known`, value `v`                      | `{ status: 'known', valuePct: v, source }`                                                 |
| `estimated`, value `v`, no uncertainty  | `{ status: 'estimated', valuePct: v, source }`                                             |
| `estimated`, value `v`, uncertainty `u` | `{ status: 'estimated', valuePct: v, rangePct: [max(0, v − u), min(100, v + u)], source }` |
| `unknown`                               | missing = unknown                                                                          |

`source` is the formula's free-text source: the `SourceRef` kind, followed by `: ` and its
`detail` when there is one (`package: label, 82 % fat`). A `leavening` of type `commercialYeast`
gives `yeast: { form }`; `sourdough` and `chemical` give no marker (a culture is not commercial
yeast, `formula.md`).

## Built-in entries

Built-in entries ship with the app, are versioned and immutable, and are named by message key
(`ingredient.<id>.name`) with a short description (`ingredient.<id>.description`). They give a
recipe a named ingredient without creating one.

**Version 1 ships typical, sourced values for single-product entries** (salt, sugars and syrups,
oils, butter, eggs, milk, cream and the like), at least water, fat and sugar, and the other
composition values when they are well sourced. Each value is `estimated` with an `uncertainty` (or
`known` where the value is a definition), and carries a `reference` source whose `detail` names the
publication or table. **The citation is displayable**: the application shows the source beside the
value, and a built-in value without a citation is not shipped. Entries that name a category rather
than a product (nuts, seeds, fresh and dried fruit, malts, the sourdough starter, baking powder,
the yeasts' composition) keep `unknown` for every value no source covers: generic names do not
justify a universal composition. No coefficient ships without provenance (AGENTS.md). Identity
ships for every entry: `kind: 'water'` for water, the `leavening` of each yeast, the family and
the form.

The numeric values and their sources are not part of this contract. They arrive with their sources
in the implementing pull request, checked under the scientific-evidence workflow (#34), as the
flours' version 2 did; the acceptance examples below use personal values or symbols only. A
personal entry with the package's own values replaces them for a given bag or tub.

| id                   | Family  | Kind  | `leavening`                | `form`   | Typical values |
| -------------------- | ------- | ----- | -------------------------- | -------- | -------------- |
| `water`              | water   | water | —                          | —        | not applicable |
| `salt`               | salt    | other | —                          | —        | yes            |
| `instant-yeast`      | leaven  | other | commercialYeast instant    | —        | if sourced     |
| `active-dry-yeast`   | leaven  | other | commercialYeast active-dry | —        | if sourced     |
| `fresh-yeast`        | leaven  | other | commercialYeast fresh      | —        | if sourced     |
| `sourdough-starter`  | leaven  | other | sourdough                  | —        | no (identity)  |
| `baking-powder`      | leaven  | other | chemical                   | —        | if sourced     |
| `sugar`              | sugar   | other | —                          | —        | yes            |
| `maple-syrup`        | sugar   | other | —                          | —        | yes            |
| `honey`              | sugar   | other | —                          | —        | yes            |
| `olive-oil`          | fat     | other | —                          | —        | yes            |
| `butter`             | fat     | other | —                          | —        | yes            |
| `milk`               | dairy   | other | —                          | —        | yes            |
| `milk-powder`        | dairy   | other | —                          | `powder` | yes            |
| `cream`              | dairy   | other | —                          | —        | yes            |
| `egg`                | egg     | other | —                          | —        | yes            |
| `egg-white`          | egg     | other | —                          | —        | yes            |
| `egg-yolk`           | egg     | other | —                          | —        | yes            |
| `meringue`           | egg     | other | —                          | —        | if sourced     |
| `dried-fruit`        | fruit   | other | —                          | `dried`  | if sourced     |
| `fresh-fruit`        | fruit   | other | —                          | `fresh`  | if sourced     |
| `nuts`               | nutSeed | other | —                          | —        | if sourced     |
| `seeds`              | nutSeed | other | —                          | —        | if sourced     |
| `diastatic-malt`     | malt    | other | —                          | —        | if sourced     |
| `non-diastatic-malt` | malt    | other | —                          | —        | if sourced     |
| `cider-vinegar`      | acid    | other | —                          | —        | yes            |

- The list is the owner's initial list of #26 (olive oil, milk, milk powder, butter, dried and
  fresh fruit, nuts, diastatic malt, sugar, salt, eggs, cider vinegar, cream, meringue, maple
  syrup) plus the explicit entries it asks for: water, yeasts, egg white and yolk, non-diastatic
  malt, and the additions the owner approved (honey, seeds, baking powder, the sourdough starter).
  The softened and melted butter, whipped cream, cooked fruit and fruit puree of the initial list
  are **preparations** of `butter`, `cream` and `fresh-fruit` (Preparation), not entries.
- `egg` is the whole egg as added; beating it is a preparation. `meringue` is a bought or declared
  product; a meringue made at home is a composite (Composite products).
- Flour entries are in `flours.md` and do not appear here.
- The ids are stable codes. A built-in entry is never edited. A new version of the built-ins never
  overwrites a personal entry or a customization, and never changes a formula (see Formulas).
- An entry with no name in the user's language falls back to its message key; the UI never
  hard-codes entry names (ADR 0009).

### Customizing a built-in

The baker may change the **default values** of a built-in without creating a new named entry.

- **Customize** writes a personal entry whose `id` is **the built-in's own id** and whose
  `customizes` is `{ id, version }` of the built-in version it was taken from. It copies the
  built-in's identity (`family`, `kind`, `form`, `leavening`, which cannot change) and its values,
  sources included; the baker edits composition, properties, `organic`, `brand`, `product` and
  `notes`. A value the baker types gets a `personal` source. It has no `name`: it is named by the
  built-in's message key.
- This is the one case where a personal id equals a built-in id. A customization is a personal
  entry in every other respect: versions `1, 2, …` are counted among the personal entries of that
  id (never among the built-in versions), an edit writes the next version, and a version that is
  not the next one is refused (`HeadConflict`).
- A reference to a customization is `{ id, version, customized: true }`; without `customized` it
  refers to the built-in version, so a built-in `butter` version 1 and a customization `butter`
  version 1 never collide.
- **Effective entry**: for a built-in id, the head customization when it exists and is not
  archived, else the newest built-in version. The picker offers the effective entry, and a new use
  (`ApplyIngredientEntry`, `AddIngredient` with an entry) takes its values, pinned with
  `customized` when it is a customization.
- **Reset to factory** writes the next version of the customization with `archived: true` and the
  other fields unchanged, as archiving does: the built-in applies again from then on. Customizing
  again later writes the next version, taken from the then-current built-in version.
- A customization or a reset **changes no recipe, revision or bake**: a formula holds a copy of the
  contents and a pinned reference (Formulas). A recipe follows a customization or a reset only when
  the baker updates the ingredient explicitly (`RefreshIngredientEntry`).
- A built-in cannot be archived or edited; only its customization can.

## Personal entries

- Creating an ingredient writes version 1 with a new id; editing writes the next version. Earlier
  versions stay readable (`history.md`: registry versions are immutable and never deleted).
- Archiving (and bringing back) writes the next version with `archived` toggled and the other
  fields unchanged, as flours do. An archived entry leaves the picker; formulas and bakes that
  pin it still resolve it.
- Duplicating an entry (a built-in included) writes a personal entry with a new id and `basedOn`.
- A partial entry is valid: only the family and the kind are required to be set (`family:
'unknown'` is allowed). A handmade product without a barcode is a normal entry.
- Writing a version that is not the next one for its id is refused (`HeadConflict`).
- A personal entry has a non-empty `name` and its id is never a built-in id, as for equipment
  (`equipment.md`), except a customization of that built-in (Customizing a built-in).
- Two entries may share a name: names are labels, not keys.

## Formulas

A formula ingredient keeps its own formula id (`formula.md`) and, optionally, points to a registry
entry **and carries a copy of what the entry says**. It may also carry a preparation:

```ts
interface Ingredient {
  // …formula.md
  entry?: IngredientRef; // the entry version the contents below were taken from
  overrides?: Array<'kind' | 'water' | 'fat' | 'sugar' | 'yeast'>; // contents set by hand, only with entry
  preparation?: { state: PreparationState; note?: string }; // recorded, never consumed
}

type PreparationState =
  | 'cold'
  | 'roomTemperature'
  | 'softened'
  | 'melted'
  | 'meltedCooled'
  | 'cubed'
  | 'chopped'
  | 'grated'
  | 'ground'
  | 'toasted'
  | 'soaked'
  | 'whipped'
  | 'beaten'
  | 'pureed'
  | 'cooked'
  | 'other';
```

- The engine is pure and reads only the formula (ADR 0001): `kind`, `water`, `fat`, `sugar` and
  `yeast` stay on the ingredient, as today, **whether or not they were overridden**. `entry`,
  `overrides` and `preparation` are provenance and display: **no calculation reads them**.
- The reference **pins a version** (a customization pins `customized: true`). A new version of an
  entry, a built-in update, a customization or a reset never changes a formula by itself; the baker
  updates the ingredient explicitly (`RefreshIngredientEntry`), which is an edit that becomes a
  revision when saved. This differs from flours, which are referenced by id only and recorded at
  bake start (`flours.md`): flour properties are not consumed by any calculation, the contents of
  an ingredient are.
- Two formula ingredients may point to the same entry, with different ids, roles and preparations
  (butter in the dough and butter in the glaze).
- A pin that does not resolve (a built-in version newer than the app, a personal entry absent
  from the device) **never blocks anything** (see Bakes and Persistence): the copied contents are
  the truth for every calculation. The interface shows "entry not found" for it and has no
  recorded properties.
- An ingredient **without an entry** is fully valid and works as before: its contents are typed
  on the ingredient (`AddIngredient`, `UpdateIngredient`), its name is its id or what the
  application labelled it. No recipe, draft, template or revision written before this contract
  needs a migration, and nothing links an old ingredient to an entry by its name or id.
- Templates (`drafts.md`) keep their ingredients without entries.

### Overrides

- An ingredient with an `entry` keeps it when the baker edits one of its contents (`kind`,
  `water`, `fat`, `sugar`, `yeast`). Each edited field is added to `overrides`; the ingredient
  holds the baker's value and calculations use it. The entry is not touched.
- `overrides` exists only with `entry`, lists each field at most once, in the order `kind`,
  `water`, `fat`, `sugar`, `yeast`, and is absent when empty. A document that breaks this is
  refused (`InvalidFormula`). Typing a value equal to the entry's still marks the field: the
  domain does not read the registry.
- Overriding a field to `unknown` (a missing content) is an override like any other.
- The interface shows the overridden fields and the entry's value each one replaces.
- **Detaching** (`DetachIngredientEntry`) stays available as an explicit action: it removes
  `entry` and `overrides`, and every content stays as it is, overridden or not. The baker may also
  create an entry from the ingredient (below).

### Preparation

- `preparation` says how the ingredient is when it is added: `softened`, `melted`, `cold`,
  `whipped`… It is recorded in the revision and the bake snapshot and shown, never consumed. The
  composition, the contents and the mass of the ingredient do not change with it.
- `state: 'other'` requires a non-empty `note`; any `note` is free text, trimmed, never empty when
  present. A document that breaks this is refused (`InvalidFormula`).
- Half of a butter softened and half cold are two formula ingredients with the same entry, each
  with its own mass share and preparation (acceptance example 11).
- Preparation applies to an ingredient with or without an entry. Changing it never touches `entry`
  or `overrides`.
- A water lost by melting or cooking is a process fact, not a preparation (`process.md`).

### Edit commands

| Command                                                | Effect                                                                                                                                                                   | Refused when…                                                                                                           |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `ApplyIngredientEntry(ingredient, entry)`              | sets `entry` (with `customized` for a customization), replaces `kind`, `water`, `fat`, `sugar` and `yeast` by the entry's, clears `overrides`; % kept                    | the change of kind breaks an allocation or the absorbing water                                                          |
| `RefreshIngredientEntry(ingredient, entry, overrides)` | **update from entry**: re-copies the contents of the same or another version of the pinned entry; `overrides` is `'keep'` or `'clear'`, with no default                  | the ingredient has no `entry`; the entry has another id; the change of kind breaks an allocation or the absorbing water |
| `DetachIngredientEntry(ingredient)`                    | removes `entry` and `overrides`; contents stay as they are                                                                                                               | —                                                                                                                       |
| `AddIngredient(ingredient)`                            | may carry an entry; then its contents are those of the entry (explicit contents are refused)                                                                             | contents given with an entry                                                                                            |
| `UpdateIngredient(id, changes)`                        | a change to `kind`, `water`, `fat`, `sugar` or `yeast` of an ingredient with an `entry` keeps `entry` and adds the field to `overrides`; `preparation` is set or cleared | as `formula.md`                                                                                                         |

- Apply and refresh carry the entry document (the domain has no registry, see Entry to formula).
  The application checks that the entry exists before it sends the command; the domain cannot
  tell that an entry is missing, so an unresolved pin is never a domain error.
- `ApplyIngredientEntry` replaces all five fields, an unknown property included: applying an entry
  whose water is unknown to an ingredient that had an estimated water leaves the water unknown, and
  the total becomes `incomplete`. The interface shows what changes before it applies. It is also
  how an ingredient moves to another entry; it clears `overrides`.
- **`RefreshIngredientEntry` ("update from entry") happens on the baker's request only**, never by
  itself, and always asks the choice about overrides, because it is the one command that can
  discard the baker's own values:
  - `keep`: every field **not** overridden takes the entry's value; every overridden field keeps
    the baker's value and stays in `overrides`; `entry` becomes the target version.
  - `clear`: all five fields take the entry's values and `overrides` is cleared. With the pinned
    version itself as the target, this is "reset the ingredient to its entry".
  - The interface lists, per field, the value now, the value after the update and whether it is
    overridden, before it applies. The choice offered first is `keep`; a command always states one.
  - The target is any existing version of the same entry id. The latest one offered is the
    effective entry (a customization or the built-in, see Customizing a built-in).
- `bakerPct`, `role` and `accepted` are never touched.
- Every edit is validated by a full resolution; a refused edit changes nothing (`formula.md`).
- **Create an entry from an ingredient**: the application writes a personal entry from the
  ingredient's contents (`source: { kind: 'personal', detail: <the content's source text> }`,
  `estimated` ranges become `uncertainty` = half the range) and applies it. A range that is not
  symmetric about the value is refused with its reason: the baker widens it by hand. The
  formula changes only when `ApplyIngredientEntry` is then saved; it clears `overrides` because
  the new entry holds the very values.
- The recipe check (`drafts.md`) recognizes salt and leavening by entry as well as by id and
  marker (see the amendments in `drafts.md`).

### Composite products

A prepared item (meringue, whipped sweet cream, sweetened puree, reconstituted milk) has **one
authoritative representation** in a formula, never both:

- as a **purchased or declared product**: one ingredient with an entry whose composition is
  declared (a bought meringue, a jar of sweetened puree); or
- as a **component** (`formula.md`) whose constituents are ingredients: milk powder allocated to
  a component with its water; meringue made of egg white and sugar.

A component adds no mass; it draws from the formula totals. A formula therefore cannot count a
product and its constituents twice unless the baker adds both as separate ingredients. The
registry never expands an entry into constituents, and the engine never infers that two
ingredients overlap. Whipping an unsweetened cream is a preparation of `cream`, not a composite.

## Bakes

- `StartBake` takes no new field. The snapshot's `formula` already holds, for each ingredient,
  the pinned `entry`, its `overrides`, its `preparation` and the copied contents (`history.md`).
- **An unresolved pin blocks nothing.** A bake starts whatever the state of the registry: the
  copied contents are used, and the application shows "entry not found" for a pin that resolves
  to no stored or built-in version. There is no `UnknownIngredientEntry` error. A bake never loses
  a number because a registry entry is missing.
- `usedProperties` of the payload (`history.md`) lists, for each pinned ingredient, the properties
  actually consumed: `waterPct`, `fatPct` and `sugarPct` when known or estimated, and
  `leavening` for a commercial yeast, each with the entry id and version (and `customized` for a
  customization), the formula ingredient it was consumed for (`formulaIngredient`) and the value
  **actually consumed**. For an overridden field the value is the baker's, and the row is marked
  `overridden`. Two ingredients pinning the same entry (butter in the dough and in the glaze)
  give separate rows. A pin that does not resolve gives its rows from the copied contents.
- Snapshots written before this contract have no pinned entries: unknown, not "no registry
  ingredient". Their formulas are valid and replay unchanged.
- Editing, archiving or customizing the registry changes no started bake: it keeps the versions it
  pinned and the contents it copied. The backup and the feedback export carry every referenced
  version that exists (`history.md`).

## Persistence

(Schema 5 is the `equipment` table of `equipment.md`, #62; schema 6 is the recipe trash.) SQLite
schema 7 adds `ingredients (id TEXT NOT NULL, version INTEGER NOT NULL, archived INTEGER
NOT NULL, schema_version INTEGER NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL,
PRIMARY KEY (id, version))`, the same shape as `flours`. Built-in entries are not stored: they are
code. A customization of a built-in is a personal entry stored in this table under the built-in's
id (built-in versions are never rows, so the key cannot collide). A full backup holds every
personal entry version, customizations included (optional `ingredients`, so older backups
restore); a restore validates them like any document (`persistence.md`).

- **A pin that is absent never blocks a backup, a restore or an import.** A backup whose revision
  or bake snapshot pins an entry version absent from it (a personal entry, or a built-in version
  newer than the app) restores in full: the formula holds the copied contents, replays unchanged
  and the interface shows "entry not found". Nothing is dropped and nothing is refused for it.
- The recipes file (`persistence.md`) gains an optional `ingredients` list: the personal entry
  versions that its revisions pin. An additive import writes the versions that are absent and
  skips those present, never comparing or overwriting. Without them, imported recipes keep
  working through their copied contents.
- Migration 6 → 7 creates the empty table. Existing databases, recipes, revisions and events are
  readable without change; there is no downgrade (a newer database or formula document is
  refused).
- The registry is available offline: it lives in the same database as everything else.
- `CONTRACT_VERSION` is bumped by one minor step, from `0.13.0` to `0.14.0` (the implementing pull
  request sets it). `Ingredient.entry`, `overrides` and `preparation` are optional: documents
  written before them need no upcaster. A formula carrying one of them read by an older app is
  refused as a document with an unknown field (`persistence.md`), not misread.

## Acceptance examples

Quantities are for 500 g of flour. Expected values are computed by hand, not by the engine.

1. **Personal butter, fat 82 % from the package.** The baker creates `Beurre 82 %` (family
   `fat`, kind `other`) with `fatPct` = `{ status: 'known', value: 82, unit: '%',
basis: 'per100g', source: { kind: 'package', detail: 'label, 82 % fat' } }`; everything else
   `unknown`. Version 1 is written with a new id. The baker adds a 10 % butter to the formula and
   applies the entry: the ingredient carries `entry: { id, version: 1 }` and `fat: { status:
'known', valuePct: 82, source: 'package: label, 82 % fat' }`; water and sugar are missing. The
   butter is 500 × 10 / 100 = 50 g; its fat is 50 × 82 / 100 = 41 g (`totalFatPct` gains
   41 / 500 × 100 = 8.2). `totalWater` is `incomplete` with the butter among its
   `unknownContributors` (not 0), and so is `totalFat` while another ingredient's fat is unknown.
   The recipe is valid.
2. **A yeast entry.** The baker creates `SAF Red` (family `leaven`, `leavening: { type:
'commercialYeast', form: 'instant' }`, brand `SAF`, all composition `unknown`) and applies it to
   the ingredient `yeast`. The ingredient gets `yeast: { form: 'instant' }`; the fermentation model
   reads that marker only. Renaming the entry (version 2) or changing its brand changes nothing of
   the estimate. Applying the built-in `sourdough-starter` to another ingredient gives no marker:
   the model does not treat it as commercial yeast.
3. **A recipe ingredient with no entry.** A recipe written before the registry has `honey` with
   `water: { status: 'estimated', valuePct: 17, rangePct: [14, 20], source: 'table' }` and no
   `entry`. It is valid, resolves exactly as before, starts a bake, and the snapshot has no pin.
   "Create an entry from this ingredient" writes `Miel` with `waterPct` `estimated` 17,
   `uncertainty` 3, `source: { kind: 'personal', detail: 'table' }`; the formula is unchanged until
   the entry is applied and the revision saved.
4. **An edit creates version 2, an old bake keeps version 1.** Continuing example 1, a bake of the
   brioche starts: its snapshot holds butter `entry` version 1 and fat 82 known. The baker then
   edits the entry, adding `waterPct` = `{ status: 'estimated', value: 16, uncertainty: 2,
basis: 'per100g', source: { kind: 'personal' } }`: version 2 is written, version 1 stays. The
   saved recipe still pins version 1 and its resolved water is unchanged. The baker updates the
   ingredient from the entry (`RefreshIngredientEntry` to version 2, `keep`; no field is
   overridden) and saves a revision: the butter now brings 50 × 16 / 100 = 8 g of water (range
   50 × 14 / 100 = 7 to 50 × 18 / 100 = 9 g) to `totalWater`. The bake started earlier replays with
   version 1: no water from the butter, fat 41 g. A bake started after the revision pins version 2.
5. **Override, update from entry, detach.** The butter of example 4 pins version 2 (fat 82 known,
   water 16 ± 2).
   1. The baker types a fat of 80 % (`known`, personal). `UpdateIngredient` keeps
      `entry: { id, version: 2 }` and sets `overrides: ['fat']`. Fat is 50 × 80 / 100 = 40 g
      (`totalFatPct` gains 40 / 500 × 100 = 8.0, not 8.2); water is still the entry's 8 g
      (7 to 9). The entry is untouched.
   2. The baker edits the entry: version 3 has `fatPct` known 83 and `waterPct` estimated 15 ± 2.
      The recipe is unchanged and still pins version 2.
   3. The baker updates the ingredient from the entry to version 3. With `keep`: `entry` is
      version 3, fat stays the baker's 80 (40 g, `overrides: ['fat']`) and water follows the
      entry, 50 × 15 / 100 = 7.5 g (range 50 × 13 / 100 = 6.5 to 50 × 17 / 100 = 8.5 g). With
      `clear` instead: fat is 83, 50 × 83 / 100 = 41.5 g (8.3 points), water 7.5 g, and
      `overrides` is absent.
   4. After the `keep` update, a bake pins version 3: its `usedProperties` has the row `fatPct` =
      80 marked `overridden` and the row `waterPct` = 15, both with entry version 3.
   5. The baker then detaches the ingredient: `entry` and `overrides` are removed; fat 80 and
      water 15 ± 2 stay as plain contents (the same 40 g and 7.5 g). Version 3 is untouched.
6. **A composite, once.** A brioche with 30 g of milk powder in a `scald` component with 270 g of
   water (reconstituted milk) draws both from the formula totals; the milk powder is counted once,
   as an ingredient, and the component adds no mass. Declaring `meringue` as an ingredient and also
   its egg white and sugar as ingredients is the baker's choice and counts all three, as typed.
7. **A built-in is customized, then reset.** The built-in `butter` version 1 gives a fat F (a
   sourced value shown with its citation). The baker customizes `butter`: a personal entry
   `butter` version 1 with `customizes: { id: 'butter', version: 1 }` is written, and the baker
   enters a `fatPct` of 84 (known, personal). The picker now offers the customization; a new 10 %
   butter ingredient gets `entry: { id: 'butter', version: 1, customized: true }` and fat 84:
   50 × 84 / 100 = 42 g (8.4 points). A recipe made before still pins
   `{ id: 'butter', version: 1 }` (the built-in) with fat F: unchanged. The baker resets to
   factory: customization version 2 is written with `archived: true`; the picker offers the
   built-in again. The ingredient added in between keeps fat 84 and its customized pin; updating
   it from the entry now (target: the built-in, `clear`) takes F, 50 × F / 100 g. A later app
   version ships built-in `butter` version 2 with another value: no recipe, customization or bake
   changes.
8. **A backup restore, with and without the pinned versions.** A backup holds recipe `brioche`
   (revision 2 pins `Beurre 82 %` version 2), a finished bake that pins version 1, and both entry
   versions. Restoring it into an empty database writes everything in one transaction; the bake
   replays with version 1 and its recorded fat. A backup that omits version 1 restores just the
   same: the bake replays with the fat it copied (82 known, 41 g) and the interface shows "entry
   not found" for the butter; the same holds for a backup without version 2 (revision 2 keeps its
   copied contents). Nothing is refused. A recipes file without `ingredients`, imported elsewhere,
   still resolves through the copied contents and shows the butter as "entry not found". Starting
   a bake from such a recipe is accepted.
9. **Unknown is not zero.** A personal `Pâte de noix` with every composition `unknown` is added at
   40 g. `totalWater`, `totalFat` and `totalSugar` are `incomplete` and list it. Typing 0 for its
   water (known, personal source) removes it from the unknown contributors of `totalWater` only.
10. **Archive.** Archiving `Beurre 82 %` after example 5 writes version 4 with `archived: true`;
    the picker no longer offers it; the recipes and bakes pinning versions 1, 2 and 3 still
    resolve them.
11. **Preparation, half softened and half cold.** The butter of example 1 is split into two
    formula ingredients pinning `Beurre 82 %` version 1: `butter-a` at 5 % with
    `preparation: { state: 'softened' }` and `butter-b` at 5 % with
    `preparation: { state: 'cold' }`. Each is 500 × 5 / 100 = 25 g with fat
    25 × 82 / 100 = 20.5 g; together 50 g and 41 g, exactly the single 10 % butter of example 1
    (`totalFatPct` 8.2). Removing both preparations changes no number. A preparation
    `{ state: 'other' }` without a note is refused (`InvalidFormula`).

## Impact

| Area                  | Change                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formula.md`          | `Ingredient.entry`, `overrides`, `preparation`, four commands (apply, refresh, detach, update), validation, identifier note                                                                  |
| `history.md`          | pins, `usedProperties` (`formulaIngredient`, `customized`, `overridden`), registry references, backup, feedback export                                                                       |
| `persistence.md`      | `ingredients` table, schema 7, backup and recipes file fields, shared tests                                                                                                                  |
| `values-and-units.md` | property unit `°L`; composition basis; no density unit                                                                                                                                       |
| `drafts.md`           | `salt_missing` and `no_leavening` recognize entries                                                                                                                                          |
| Code                  | `core/domain` entry type, validation, mapping and commands; `application` registry service and ports; `adapters` memory and SQL stores and migration; UI picker and editor with message keys |
| Fixtures              | independent cases for examples 1, 4, 5 and 11 in `fixtures/`, computed outside the engine                                                                                                    |

## Owner decisions

Decided on 2026-10-13, numbered as in the proposal.

1. **Pinned reference with copied contents**: approved. A formula holds the pin and a copy of the
   contents; an entry edit never changes a revision's numbers. The baker re-copies the latest
   contents on request with `RefreshIngredientEntry` ("update from entry").
2. **Editing a content of a linked ingredient does not detach it**: the ingredient keeps `entry`,
   the edited field is listed in `overrides`, and calculations use the overridden value. "Update
   from entry" asks `keep` or `clear` for the overrides each time (`keep` offered first).
   Detaching stays an explicit action.
3. **Built-ins ship typical sourced values** for single-product entries, with `reference` sources
   whose citation is displayed in the app. The baker customizes a built-in's defaults as a
   personal version that shadows it under the same id; "Reset to factory" archives it. Recipes are
   never changed by either.
4. **Preparation forms are not entries**: a `preparation` on the formula ingredient, recorded and
   shown, never consumed; `variantOf` and the variant entries are removed.
5. **A closed list of families** (with `other` and `unknown`): approved.
6. **Recipe checks recognize entries** (`entryFamilies` in `checkRecipe`): approved.
7. **Sourdough starter**: identity and recorded composition only: approved. Its flour and water
   are not added to the flour total; resolving a starter into flour and water belongs to #9, and a
   baker who wants that today models it as a preferment component.
8. **Grams only**: no density, no volume in the registry, the engine or the interface; a volume
   exists only in the import provenance trace of an imported recipe.
9. **The recipes file carries the personal entries it pins**: approved.
10. **Additions to the built-in list** (honey, seeds, baking powder, the sourdough starter):
    approved.
11. **Composition sums above 100 are warnings, not refusals** (label rounding), as are sugars
    plus fibre above carbohydrate: approved.
12. **An unresolved pin never blocks anything**: a revision saves, a bake starts, a backup and an
    import restore, with the copied contents; the interface shows "entry not found".

### Later (not part of this contract)

A settings menu where the baker chooses these behaviours: copy or live link for a new use of an
entry, and override or detach when a content of a linked ingredient is edited. Until it exists,
the behaviours above are the only ones. A live link would be a contract change of its own.
