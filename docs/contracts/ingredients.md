# Contract: ingredient registry

Status: **proposal** (not yet approved; open choices are listed at the end). Related issues: #26,
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

type IngredientForm =
  | 'asSold'
  | 'softened'
  | 'melted'
  | 'whipped'
  | 'beaten'
  | 'separated' // white or yolk of an egg
  | 'puree'
  | 'cooked'
  | 'fresh'
  | 'dried'
  | 'reconstituted'
  | 'other';

interface IngredientEntry {
  id: string; // the id used in IngredientRef; unrelated to the formula's own ingredient ids
  version: number; // 1, 2, …; a version is immutable once written
  name?: string; // display name of a personal entry; a built-in entry is named by message key
  aliases?: string[]; // extra names for search, personal entries only
  builtIn: boolean;
  family: IngredientFamily;
  kind: 'water' | 'other'; // the formula kind (formula.md); 'water' only for family 'water'
  form?: IngredientForm; // how the product is when it is added; absent = unknown
  variantOf?: string; // id of the entry this one is a preparation shortcut of (built-in or personal)
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
    densityGPerMl: PropertyValue; // unit 'g/mL'; true for this form (a whipped form has its own)
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
}
```

- Every `PropertyValue` is the one of `values-and-units.md`. An unset property is
  `{ status: 'unknown' }`, never zero and never a default. A product that is truly free of a
  substance says so with a **known** `0` and its source (a label that lists fat as 0 g).
- `SourceRef` is the one of `flours.md`: `package`, `producer`, `lab`, `reference`, `personal`,
  with an optional `detail`.
- All `composition` values are points of the mass of the product **as added** (`form`), with
  `basis: 'per100g'`. A label given per serving is converted with its serving mass when the entry
  is saved; the stored value is `per100g`, keeps the label's `source` (the serving mass goes in
  `source.detail`), and the conversion adds no significant digits. `dryMatter` and `moisture14`
  are not accepted for composition: a value on another basis is converted by its author or left
  `unknown`.
- A sodium value on a label may be entered as `saltPct` only with the stated conversion in
  `source.detail` (salt = sodium × 2.5); it is never converted silently.
- `uncertainty` of an `estimated` value is half its range, in points.
- `form` and `variantOf` separate **identity and composition** from **preparation**: a softened or
  melted butter, a puree of fruit, a whipped cream or an egg white are entries of their own, linked
  to the identity entry by `variantOf`. A variant stores its own composition: melting a butter does
  not change its composition, but nothing is copied or inferred between two entries. A real loss
  or addition (water left in the pan) is a process fact, not an entry edit (`process.md`).
- Aliases and names are searched case- and accent-insensitively; the search is a UI matter.
- A `kind: 'water'` entry (tap, filtered, spring water) is pure water for the formula: its
  `composition` is ignored by calculations, like the contents of a `water` ingredient
  (`formula.md`). It may record `ph`.
- A **role** (`dough`, `topping`, `glaze`) is a property of a use, not of an entry: the same butter
  is dough in a brioche and a glaze on top. Entries carry no role.
- The registry has no `parts`: an entry never lists other entries. See Composite products.

### Validation

An entry that breaks a rule is refused with `InvalidIngredientEntry { field, reason }`; nothing is
written.

| Rule                                                                          | Level   |
| ----------------------------------------------------------------------------- | ------- |
| every composition value is within [0, 100] and an estimate's range is ordered | refusal |
| `sugarPct` ≤ `carbohydratePct` and `fibrePct` ≤ `carbohydratePct`, when known | refusal |
| `sugarPct` + `fibrePct` ≤ `carbohydratePct`, when all three are known         | warning |
| `waterPct` + `fatPct` + `proteinPct` + `carbohydratePct` + `saltPct` ≤ 100    | warning |
| composition value on a basis other than `per100g`                             | refusal |
| `leavening.type = 'commercialYeast'` on a family other than `leaven`          | refusal |
| `kind = 'water'` on a family other than `water`                               | refusal |
| `variantOf` names an entry that does not exist, or the entry itself           | refusal |
| `densityGPerMl` ≤ 0, or `ph` outside [0, 14]                                  | refusal |
| `basedOn` or `variantOf` cycles (an entry reaches itself)                     | refusal |

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

Every other field (protein, carbohydrate, fibre, salt, pH, density, diastatic power, organic,
brand, product, family, form) is **recorded, not consumed**: it is kept in snapshots and exports
for later calibration (#14), interaction analyses (#27) and enzyme-aware domains (#30, step 8).
Nothing infers a behaviour from a family, a name or an id.

### Entry to formula

The mapping from entry properties to formula contents is mechanical, in `core/domain`, and adds no
calculation beyond the clamp below. An entry property with `status: 'unknown'` gives a missing
content.

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

**Version 1 carries no composition**: every `composition` and `properties` value is `unknown`.
Generic names ("milk", "nuts", "fresh fruit") do not justify a universal composition, and no
coefficient ships without provenance (AGENTS.md). Two things are identity, not composition, and
ship in version 1: `kind: 'water'` for water, and the `leavening` of each yeast. Typical values,
with `estimated` status, a `reference` source and an `uncertainty`, may be added in a later
version after the sources are checked (#34), as flours did in their version 2. A personal entry
with the package's own values replaces them.

| id                   | Family  | Kind  | `leavening`                | `variantOf`   | `form`      |
| -------------------- | ------- | ----- | -------------------------- | ------------- | ----------- |
| `water`              | water   | water | —                          | —             | —           |
| `salt`               | salt    | other | —                          | —             | —           |
| `instant-yeast`      | leaven  | other | commercialYeast instant    | —             | —           |
| `active-dry-yeast`   | leaven  | other | commercialYeast active-dry | —             | —           |
| `fresh-yeast`        | leaven  | other | commercialYeast fresh      | —             | —           |
| `sourdough-starter`  | leaven  | other | sourdough                  | —             | —           |
| `baking-powder`      | leaven  | other | chemical                   | —             | —           |
| `sugar`              | sugar   | other | —                          | —             | —           |
| `maple-syrup`        | sugar   | other | —                          | —             | —           |
| `honey`              | sugar   | other | —                          | —             | —           |
| `olive-oil`          | fat     | other | —                          | —             | —           |
| `butter`             | fat     | other | —                          | —             | `asSold`    |
| `butter-softened`    | fat     | other | —                          | `butter`      | `softened`  |
| `butter-melted`      | fat     | other | —                          | `butter`      | `melted`    |
| `milk`               | dairy   | other | —                          | —             | —           |
| `milk-powder`        | dairy   | other | —                          | —             | `dried`     |
| `cream`              | dairy   | other | —                          | —             | —           |
| `whipped-cream`      | dairy   | other | —                          | `cream`       | `whipped`   |
| `egg`                | egg     | other | —                          | —             | `beaten`    |
| `egg-white`          | egg     | other | —                          | `egg`         | `separated` |
| `egg-yolk`           | egg     | other | —                          | `egg`         | `separated` |
| `meringue`           | egg     | other | —                          | —             | `whipped`   |
| `dried-fruit`        | fruit   | other | —                          | —             | `dried`     |
| `fresh-fruit`        | fruit   | other | —                          | —             | `fresh`     |
| `cooked-fruit`       | fruit   | other | —                          | `fresh-fruit` | `cooked`    |
| `fruit-puree`        | fruit   | other | —                          | `fresh-fruit` | `puree`     |
| `nuts`               | nutSeed | other | —                          | —             | —           |
| `seeds`              | nutSeed | other | —                          | —             | —           |
| `diastatic-malt`     | malt    | other | —                          | —             | —           |
| `non-diastatic-malt` | malt    | other | —                          | —             | —           |
| `cider-vinegar`      | acid    | other | —                          | —             | —           |

- The list is the user's initial list of #26 (olive oil, milk, milk powder, softened and melted
  butter, dried, fresh, cooked and pureed fruit, nuts, diastatic malt, sugar, salt, eggs, cider
  vinegar, cream, whipped cream, meringue, maple syrup) plus the explicit entries it asks for:
  water, yeasts, egg white and yolk, non-diastatic malt. Honey, seeds, baking powder and the
  sourdough starter are additions (to confirm).
- Flour entries are in `flours.md` and do not appear here.
- The ids are stable codes. A built-in entry is never edited. **Customizing** it writes a personal
  entry with a new id, `basedOn` the built-in version, and the same family, kind, `leavening`,
  `form` and `variantOf` until changed. A new version of the built-ins never overwrites a personal
  entry, and never changes a formula (see Formulas).
- An entry with no name in the user's language falls back to its message key; the UI never
  hard-codes entry names (ADR 0009).

## Personal entries

- Creating an ingredient writes version 1 with a new id; editing writes the next version. Earlier
  versions stay readable (`history.md`: registry versions are immutable and never deleted).
- Archiving (and bringing back) writes the next version with `archived` toggled and the other
  fields unchanged, as flours do. An archived entry leaves the picker; formulas and bakes that
  pin it still resolve it.
- Duplicating an entry writes a personal entry with a new id and `basedOn`.
- A partial entry is valid: only the family and the kind are required to be set (`family:
'unknown'` is allowed). A handmade product without a barcode is a normal entry.
- Writing a version that is not the next one for its id is refused (`HeadConflict`).
- A personal entry has a non-empty `name`, and its id is never a built-in id, as for equipment
  (`equipment.md`).
- Two entries may share a name: names are labels, not keys.

## Formulas

A formula ingredient keeps its own formula id (`formula.md`) and, optionally, points to a registry
entry **and carries a copy of what the entry says**:

```ts
interface Ingredient {
  // …formula.md
  entry?: IngredientRef; // the entry version the contents below were taken from
}
```

- The engine is pure and reads only the formula (ADR 0001): `kind`, `water`, `fat`, `sugar` and
  `yeast` stay on the ingredient, as today. `entry` is provenance and the key to the recorded
  properties; **no calculation reads it**.
- The reference **pins a version**. A new version of an entry, or of a built-in, never changes a
  formula by itself; the baker refreshes the reference explicitly (below), which is an edit that
  becomes a revision when saved. This differs from flours, which are referenced by id only and
  recorded at bake start (`flours.md`): flour properties are not consumed by any calculation, the
  contents of an ingredient are.
- Two formula ingredients may point to the same entry, with different ids and roles (butter in the
  dough and butter in the glaze).
- A pin that does not resolve (a built-in version newer than the app, a personal entry absent
  from the device) does not break the formula: the copied contents are the truth for every
  calculation. The ingredient is shown as "entry unavailable" and has no recorded properties.
- An ingredient **without an entry** is fully valid and works as before: its contents are typed
  on the ingredient (`AddIngredient`, `UpdateIngredient`), its name is its id or what the
  application labelled it. No recipe, draft, template or revision written before this contract
  needs a migration, and nothing links an old ingredient to an entry by its name or id.
- Templates (`drafts.md`) keep their ingredients without entries.

### Edit commands

| Command                                 | Effect                                                                                                                                                    | Refused when…                                                                            |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `ApplyIngredientEntry(ingredient, ref)` | sets `entry`; replaces `kind`, `water`, `fat`, `sugar` and `yeast` by the entry's; % kept                                                                 | the entry does not exist; the change of kind breaks an allocation or the absorbing water |
| `DetachIngredientEntry(ingredient)`     | removes `entry`; contents stay as they are                                                                                                                | —                                                                                        |
| `AddIngredient(ingredient)`             | may carry `entry`; then its contents are those of the entry (explicit contents are refused)                                                               | the entry does not exist; contents given with `entry`                                    |
| `UpdateIngredient(id, changes)`         | a change to `kind`, `water`, `fat`, `sugar` or `yeast` of an ingredient with an `entry` also **removes `entry`** (the contents no longer are the entry's) | as `formula.md`                                                                          |

- `ApplyIngredientEntry` replaces all five fields, an unknown property included: applying an entry
  whose water is unknown to an ingredient that had an estimated water leaves the water unknown, and
  the total becomes `incomplete`. The interface shows what changes before it applies. Refreshing to
  a newer version is `ApplyIngredientEntry` with that version.
- `bakerPct`, `role` and `accepted` are never touched.
- Every edit is validated by a full resolution; a refused edit changes nothing (`formula.md`).
- **Create an entry from an ingredient**: the application writes a personal entry from the
  ingredient's contents (`source: { kind: 'personal', detail: <the content's source text> }`,
  `estimated` ranges become `uncertainty` = half the range) and applies it. A range that is not
  symmetric about the value is refused with its reason: the baker widens it by hand. The
  formula changes only when `ApplyIngredientEntry` is then saved.
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
ingredients overlap.

### Volume

`densityGPerMl` is recorded, not consumed. Mass is never inferred from a volume (`formula.md`):
until a contract adds volume input, no command converts with it (open choice).

## Bakes

- `StartBake` takes no new field. The snapshot's `formula` already holds, for each ingredient,
  the pinned `entry` and the copied contents (`history.md`).
- Starting a bake validates that every pin resolves to a stored or built-in version. The
  application checks it against the registry before it sends `StartBake` (the domain has no
  registry); an ingredient with a pin that does not resolve is refused with
  `UnknownIngredientEntry { ingredient, entry }` and no command is sent, so that a bake always
  records properties it can show later. (A saved revision with such a pin is valid, see
  Formulas.)
- `usedProperties` of the payload (`history.md`) lists, for each pinned ingredient, the properties
  actually consumed: `waterPct`, `fatPct` and `sugarPct` when known or estimated, and
  `leavening` for a commercial yeast, each with the entry id and version, the formula
  ingredient it was consumed for (`formulaIngredient`) and its value. Two ingredients pinning the
  same entry (butter in the dough and in the glaze) give separate rows.
- Snapshots written before this contract have no pinned entries: unknown, not "no registry
  ingredient". Their formulas are valid and replay unchanged.
- Editing, archiving or deleting nothing of the registry changes a started bake: it keeps the
  versions it pinned. The backup and the feedback export carry every referenced version
  (`history.md`).

## Persistence

(Schema 5 is the `equipment` table of `equipment.md`, #62.) SQLite schema 6
adds `ingredients (id TEXT NOT NULL, version INTEGER NOT NULL, archived INTEGER
NOT NULL, schema_version INTEGER NOT NULL, document TEXT NOT NULL, created_at TEXT NOT NULL,
PRIMARY KEY (id, version))`, the same shape as `flours`. Built-in entries are not stored: they are
code. A full backup holds every personal entry version (optional `ingredients`, so older backups
restore); a restore validates them like any document (`persistence.md`).

- A backup in which a revision or a bake snapshot pins a **personal** entry version absent from
  the backup is refused (`InvalidBackup`, with the ingredient and the entry): nothing is written.
  A pin to a **built-in** version unknown to the app (the backup comes from a newer app) is
  accepted and shown as unavailable.
- The recipes file (`persistence.md`) gains an optional `ingredients` list: the personal entry
  versions that its revisions pin. An additive import writes the versions that are absent and
  skips those present, never comparing or overwriting. Without them, imported recipes keep
  working through their copied contents.
- Migration 5 → 6 creates the empty table. Existing databases, recipes, revisions and events are
  readable without change; there is no downgrade (a newer database or formula document is
  refused).
- The registry is available offline: it lives in the same database as everything else.
- `CONTRACT_VERSION` is bumped by one minor step (the implementing pull request sets it, after
  the current value in `history.md`). `Ingredient.entry` is optional: documents written before
  it need no upcaster. A formula with an `entry` read by an older app is refused as a document
  with an unknown field (`persistence.md`), not misread.

## Acceptance examples

Quantities are for 500 g of flour. Expected values are computed by hand, not by the engine.

1. **Personal butter, fat 82 % from the package.** The baker creates `Beurre 82 %` (family
   `fat`, kind `other`, form `asSold`) with `fatPct` = `{ status: 'known', value: 82, unit: '%',
basis: 'per100g', source: { kind: 'package', detail: 'label, 82 % fat' } }`; everything else
   `unknown`. Version 1 is written with a new id. The baker adds a 10 % butter to the formula and
   applies the entry: the ingredient carries `entry: { id, version: 1 }` and `fat: { status:
'known', valuePct: 82, source: 'package: label, 82 % fat' }`; water and sugar are missing. The
   butter is 50 g; its fat is 41 g (`totalFatPct` gains 8.2). `totalWater` is `incomplete` with the
   butter among its `unknownContributors` (not 0), and so is `totalFat` while another ingredient's
   fat is unknown. The recipe is valid.
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
   saved recipe still pins version 1 and its resolved water is unchanged. The baker applies
   version 2 and saves a revision: the butter now brings 8 g of water (range 7 to 9 g) to
   `totalWater`. The bake started earlier replays with version 1: no water from the butter, fat
   41 g. A bake started after the revision pins version 2.
5. **Detach by editing a content.** On the butter of example 4, the baker types a fat of 80 %.
   `UpdateIngredient` removes `entry`; the ingredient is a plain ingredient with fat 80. The entry
   is untouched.
6. **A composite, once.** A brioche with 30 g of milk powder in a `scald` component with 270 g of
   water (reconstituted milk) draws both from the formula totals; the milk powder is counted once,
   as an ingredient, and the component adds no mass. Declaring `meringue` as an ingredient and also
   its egg white and sugar as ingredients is the baker's choice and counts all three, as typed.
7. **A built-in is customized, then superseded.** The baker customizes `egg` into `Œufs de la
ferme` (`basedOn: { id: 'egg', version: 1 }`) and enters the water. A later app version ships
   `egg` version 2 with typical values: the personal entry and every formula stay unchanged; the
   application proposes the new version, which applies only through `ApplyIngredientEntry`.
8. **A backup restore.** A backup holds recipe `brioche` (revision 2 pins `Beurre 82 %` version 2),
   a finished bake that pins version 1, and both entry versions. Restoring it into an empty
   database writes everything in one transaction; the bake replays with version 1 and its recorded
   fat. A tampered backup that omits version 1 is refused (`InvalidBackup`) and writes nothing; the
   same backup minus version 2 but with revision 2 pinned to it is refused too. A recipes file
   without `ingredients`, imported elsewhere, still resolves through the copied contents and shows
   the butter as "entry unavailable".
9. **Unknown is not zero.** A personal `Pâte de noix` with every composition `unknown` is added at
   40 g. `totalWater`, `totalFat` and `totalSugar` are `incomplete` and list it. Typing 0 for its
   water (known, personal source) removes it from the unknown contributors of `totalWater` only.
10. **Archive.** Archiving `Beurre 82 %` writes version 3 with `archived: true`; the picker no
    longer offers it; the recipe from example 4 and the bake still resolve version 2 and 1.

## Impact

| Area                  | Change                                                                                                                                                                                       |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `formula.md`          | `Ingredient.entry`, three commands, identifier note                                                                                                                                          |
| `history.md`          | pins, `usedProperties`, registry references, backup, feedback export                                                                                                                         |
| `persistence.md`      | `ingredients` table, schema 6, backup and recipes file fields, shared tests                                                                                                                  |
| `values-and-units.md` | property units `g/mL` and `°L`; composition basis                                                                                                                                            |
| `drafts.md`           | `salt_missing` and `no_leavening` recognize entries                                                                                                                                          |
| Code                  | `core/domain` entry type, validation, mapping and commands; `application` registry service and ports; `adapters` memory and SQL stores and migration; UI picker and editor with message keys |
| Fixtures              | independent cases for examples 1, 4 and 6 in `fixtures/`, computed outside the engine                                                                                                        |

## Owner decisions to confirm

1. **Pinned reference with copied contents** (proposed) versus a floating reference by id like
   flours. Pinning keeps every calculation reproducible from the formula alone; floating would
   change a revision's numbers when an entry is edited.
2. **Editing a content of a linked ingredient detaches it** (proposed) versus keeping the link and
   marking the field as overridden.
3. **Built-in version 1 has no composition** (proposed, nothing invented). Alternative: ship typical
   estimated values for water, fat and sugar of single-product entries (salt, sugar, oils, butter,
   eggs) now, with `reference` sources, as flours did in their version 2. Until then a picked
   built-in makes totals `incomplete`.
4. **Preparation forms as separate entries** (`butter-softened`, `variantOf`) (proposed, no
   formula change) versus a `form` on the formula ingredient or its incorporation step.
5. **A closed list of families and forms** (proposed) versus open codes like
   `classification.system`.
6. **Recipe checks recognize entries** (`salt_missing`, `no_leavening` read the entry family and
   `leavening` as well as the id and the marker). This widens `drafts.md`; keeping them id-based
   is the alternative.
7. **Sourdough starter**: only an identity and a recorded composition for now. Its flour and
   water are not added to the flour total; resolving a starter into flour and water belongs to
   #9, and a baker who wants that today models it as a preferment component.
8. **Volume to mass**: `densityGPerMl` is only recorded. Whether volume input (cups, mL) belongs
   to Alpha, and with which density rule, is open.
9. **The recipes file carries the personal entries it pins** (proposed, as `history.md` asks for
   dependencies in recipe exports) versus relying on the copied contents only.
10. **Additions to the built-in list**: honey, seeds, baking powder and the sourdough starter.
11. **Composition sums above 100 are warnings, not refusals** (label rounding), as are sugars plus
    fibre above carbohydrate.
12. **Pins to entries that do not resolve**: valid in a saved revision, refused at bake start
    (`UnknownIngredientEntry`), accepted in a backup only for built-in versions newer than the
    app.
