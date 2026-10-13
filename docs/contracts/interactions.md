# Contract: formula analysis and ingredient interactions (#27)

Status: **proposed**, revision 2 after the owner's audit of 2026-10-13 (#89). Target: **0.3.0**, on
`canary` (owner decision: not part of the 0.2.0 release; ADR 0018). Related issues: #26, #27, #9, #20, #33.
Capability level: **N1 + qualitative analyses** (`capability-levels.md`): sourced, tested, never
blocking. No quantitative interaction model ships with this contract.

#27 asks the engine to take the interactions between ingredients into account beyond the water
balance. It separates three kinds of result:

1. **Composition balances**: exact mass contributions (water, fat, sugar, salt) relative to their
   inputs, with their uncertainty and unknowns.
2. **Qualitative analysis**: which model applies or does not, which mechanism is plausible, which
   data are missing, and why. This contract defines it.
3. **Quantitative predictions**: only under a versioned model validated within a declared domain
   (`fermentation.md` is the only one today). Out of scope here: an analysis never changes a
   duration, a dose, a timer, a recipe or an estimate.

## Scope of version 1

Version 1 analyses **the formula**: what the dough contains and whether the existing models
apply to it. It is a **composition-level** analysis of potential and applicability, not an
analysis of execution:

- It does not read the process. It never says **when** an interaction happens: an ingredient
  incorporated after bulk fermentation is listed like any dough ingredient, with no claim about
  the fermentation phases it missed or joined. Stage-conditioned claims need a later extension of
  the context (process, incorporations, techniques) and their own contract.
- It reads only `dough`-role ingredients, as the balances do (`formula.md`). This is a scope of
  the **dough** analyses, not a claim about other phenomena: a `glaze` or `topping` may matter to
  crust browning or to the surface, and a future cooking analysis may read them. Version 1 makes
  no claim about them either way.

## Analysis

```ts
type FindingKind =
  | 'composition' // a factual balance: what the dough contains and who brings it
  | 'modelApplicability' // whether an existing model's reference conditions hold
  | 'mechanism'; // a sourced mechanism that may act; never a magnitude

type Phenomenon =
  | 'fermentation' // gas production by the leavening
  | 'gasRetention' // structure that keeps the gas
  | 'aeration' // air incorporated mechanically
  | 'enzymeActivity';

interface Finding {
  code: string; // stable rule code, localized by the UI (rules below)
  kind: FindingKind;
  phenomenon?: Phenomenon; // the phenomenon concerned, when there is one; a composition finding has none
  balance?: Balance; // the balance the rule read, lossless (composition and applicability findings)
  bound?: { model: ModelRef; condition: string; limits: [number | null, number | null] }; // applicability only
  position?: 'outside' | 'straddles' | 'indeterminate'; // applicability only; 'inside' produces no finding
  effect?: { direction: 'slows' | 'speeds' | 'variable'; source: SourceCitation }; // mechanism only, rate phenomena only
  ingredients: string[]; // the formula ingredient ids the rule is about
  missing: Missing[];
  sources: SourceCitation[];
}

interface Balance {
  // the shape of WaterBalance (formula.md), per substance
  substance: 'water' | 'fat' | 'sugar' | 'salt';
  valueG: number; // known and estimated contributions, central values
  rangeG?: [number, number]; // propagated ranges of estimated contributions
  pctOfFlour: number; // 100 × valueG / flourTotal
  rangePct?: [number, number];
  completeness: 'complete' | 'incomplete';
  contributions: Array<{
    ingredient: string; // formula ingredient id
    massG: number; // its mass in the resolved formula
    content: PropertyValue; // the fraction used, with its status, source and uncertainty
    contentG: number; // mass × central fraction
    rangeG?: [number, number];
  }>;
  unknownContributors: string[]; // never counted as 0
}

interface Missing {
  path: string; // e.g. 'ingredients.vinegar.entry.properties.ph'
  reason: 'unknown_value' | 'entry_not_found' | 'not_linked' | 'not_in_registry';
}

interface SourceCitation {
  id: string; // immutable id in docs/science/interactions.md
  version: number; // the version of that record
  citation: string; // the displayable citation, copied
}

interface Analysis {
  ruleset: ModelRef; // { id: 'flourprint.interactions', version }
  scope: 'formula'; // version 1 (see Scope)
  findings: Finding[];
  coverage: Array<{
    rule: string;
    status: 'evaluated' | 'partial' | 'unevaluable';
    reasons: Missing[]; // empty when evaluated
  }>;
}

analyzeFormula(resolved: ResolvedFormula, formula: Formula, context: AnalysisContext): Analysis
```

### Context

```ts
interface AnalysisContext {
  // keyed by FORMULA ingredient id (not by registry entry id); one record per formula ingredient
  // with an `entry`; a formula ingredient without `entry` has no record (not linked)
  ingredients: Record<
    string,
    | {
        entry: IngredientRef; // the pin, as in the formula
        resolved: true;
        family: IngredientFamily;
        saltPct: PropertyValue; // composition.saltPct of the pinned version
        ph: PropertyValue;
        diastaticPower: PropertyValue;
      }
    | { entry: IngredientRef; resolved: false } // the pinned version is not in the registry
  >;
}
```

- The application resolves the context from the registry for the **pinned version** of each
  formula ingredient; the domain never reads the registry. Two formula ingredients pinning the
  same entry have two records, each with its own mass, role and preparation; a mass is counted
  once, under its own formula ingredient.
- A formula `override` (`ingredients.md`) of water, fat or sugar is already in the formula's
  copied contents and is what the balances use. The context never overrides the formula.
- **Unresolved pin** (`resolved: false`): the copied contents still feed the water, fat and sugar
  balances; the salt content and the entry's family and properties are unknown, with reason
  `entry_not_found`.
- **Not linked** (no `entry`): water, fat and sugar come from the copied contents; salt, family
  and properties are unknown, with reason `not_linked`. **Nothing is inferred from an ingredient
  id or a name**: an unlinked ingredient with id `salt` is an unknown salt contributor, never
  100 % salt.

## Rules

- `analyzeFormula` is a pure function of `core/domain`: same resolved formula, context and ruleset
  version, same analysis, in the same order (rule order, then ingredient order). No network, no
  model call, no clock.
- **Never blocking.** A finding is not a `RecipeIssue` (`drafts.md`): it does not block a save, a
  bake or an import, and the checks are unchanged.
- **No silent zero, no silent default.** An unknown content is an unknown contributor, never 0.
  A missing value is never replaced by a typical one, a family default or a name.
- **Lossless balances.** A finding that reads a balance carries it whole: central value, range,
  completeness, each contribution with its `PropertyValue` and the unknown contributors.
- **Coverage.** Every rule of the ruleset appears once in `coverage`: `evaluated` (all its inputs
  were known), `partial` (it ran with unknown contributors or unresolved entries, listed in
  `reasons`) or `unevaluable` (it could not run). "No finding" means **evaluated and nothing
  triggered** only for rules whose coverage is `evaluated`.
- **Kinds.**
  - `composition` states a fact about the balances. It has no phenomenon, no direction and no
    position.
  - `modelApplicability` says whether the reference conditions of an existing model hold. It
    names the model, the condition and its limits, and is **not** a claim about the dough's
    physics: a bound of a model is where its fit data stop, not a threshold where an effect starts.
  - `mechanism` says that a sourced mechanism may act on a phenomenon, with its conditions and
    missing data. `effect` is optional; it is allowed only for a rate phenomenon (`fermentation`,
    `enzymeActivity`) and only with a source that states that direction for that condition.
    `variable` means the source states that the direction depends on the conditions it names.
- **Family and preparation select a qualitative rule, never a number.** A rule may use the family
  of a resolved entry or the `preparation` of an ingredient to decide which statement applies.
  This amends the Consumption section of `ingredients.md` for analyses only; calculations still
  read only the fields listed there.

### Position against a bound

For a bound `[lo, hi]` (either side may be open) and a balance:

| Balance                                                                  | Position            |
| ------------------------------------------------------------------------ | ------------------- |
| complete, whole range (or central value without range) inside `[lo, hi]` | inside (no finding) |
| complete, whole range outside                                            | `outside`           |
| complete, range crosses `lo` or `hi`                                     | `straddles`         |
| incomplete, known lower part already above `hi`                          | `outside`           |
| incomplete otherwise (the unknown contributors could move it either way) | `indeterminate`     |

The lower part of an incomplete balance is the lower end of its known range; its upper part is
unbounded. A boundary value (`5` against `> 5`) is inside.

### Salt balance

Salt has no balance in `formula.md` yet. The analysis computes it like the others:
`Σ mass × saltPct / 100` over `dough`-role, non-flour, non-water ingredients, `saltPct` read from
the context; flours and `water` ingredients contribute nothing (the salt of a flour belongs to the
flour). An unlinked or unresolved ingredient is an unknown contributor. The salt balance is
analysis-only in version 1; whether it becomes a formula balance read by `fermentation.md` (which
today reads the ingredient with id `salt`) is a separate contract change.

## Rules, version 1

The applicability bounds are the reference conditions of the fermentation model
(`fermentation.md`, Domain, `flourprint.commercial-yeast` 0.1.0). No new threshold is introduced.

| Code                       | Kind                 | Phenomenon       | When                                                                           | Missing / limits                                                              |
| -------------------------- | -------------------- | ---------------- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- |
| `water_from_ingredients`   | `composition`        | —                | a non-water dough ingredient brings water, or its water is unknown             | unknown contributors                                                          |
| `salt_balance`             | `composition`        | —                | the dough has a salt contributor or an unknown one                             | unknown contributors, with reason                                             |
| `fermentation_model_sugar` | `modelApplicability` | `fermentation`   | sugar balance against `[null, 5]` is `outside`, `straddles` or `indeterminate` | —                                                                             |
| `fermentation_model_fat`   | `modelApplicability` | `fermentation`   | fat balance against `[null, 3]`, same positions                                | —                                                                             |
| `fermentation_model_salt`  | `modelApplicability` | `fermentation`   | salt balance against `[1.5, 3]`, same positions                                | —                                                                             |
| `acid_present`             | `mechanism`          | `fermentation`   | a dough ingredient's resolved entry has family `acid`                          | the entry's `ph` when unknown; acidity (titratable acidity, buffering) always |
| `malt_enzyme_activity`     | `mechanism`          | `enzymeActivity` | a dough ingredient's resolved entry has family `malt`                          | the entry's `diastaticPower` when unknown                                     |
| `incorporated_air`         | `mechanism`          | `aeration`       | a dough ingredient with `preparation.state` `whipped` or `beaten`              | —                                                                             |

- `water_from_ingredients` lists every contributor with its mass, water mass and range, so milk,
  butter, egg and syrup show what each brings without being treated as pure water.
- The three `fermentation_model_*` findings say: **the lean-dough fermentation model is outside its
  reference conditions** for that substance (or may be, for `straddles` and `indeterminate`), and
  show the model's assumptions. They say nothing about how sugar, fat or salt act on the dough.
  They also apply when the recipe has no estimate (a sourdough, for example). The phenomenon is
  the model's, `fermentation`; `fat` is about the model's range, not about gas retention.
- `acid_present`: an acid may act on the leavening depending on its dose, the dough's acidity and
  the yeast. pH alone does not characterize the dose or the buffering, so acidity is always listed
  as missing. No `effect` in version 1.
- `malt_enzyme_activity` states the enzyme activity of the entry: present (`diastaticPower` known
  or estimated > 0), absent (known 0) or unknown. It says that a dose matters and gives none. **An
  absent enzyme activity says nothing about browning or flavour**: version 1 makes no browning
  statement.
- `incorporated_air`: whipping or beating incorporates air. It is aeration, **not gas produced by
  fermentation**; the fermentation estimate does not count it. It is not "no effect".
- Mechanism rules ship only with their evidence (Sources). Until a rule's sources are reviewed,
  its coverage is `unevaluable` with reason `not_in_registry`; the composition and applicability
  rules need no external source beyond `formula.md` and `fermentation.md`.

## Sources

`docs/science/interactions.md` holds one record per source: an **immutable id**, a version, a
displayable citation, what it supports (a distinction, a mechanism, or a direction under stated
conditions), its population, dose, medium and limits of transposition (a study in a controlled
medium is not a dough duration). A record is never deleted or reused: a correction writes its
next version and keeps the old one. The sources named in #27 are the starting point; each
mechanism rule is reviewed under the scientific-evidence workflow (#34) before it ships, and the
review may narrow or drop it.

A finding copies the citation it shows (`SourceCitation`), so a recorded analysis stays readable
whatever happens to the bibliography later.

## History

- `BakeStartedPayload` gains an optional `analysis?: Analysis`, computed at bake start like
  `initialProjection` (owner, approved in principle). A later ruleset or bibliography never
  changes a recorded analysis.
- A snapshot without `analysis` (written before, or restored from an older backup) shows
  **"analysis not recorded"**, never "nothing found".
- The analysis of a saved recipe is computed when it is shown; it is not stored in the revision.
- The feedback export (`history.md`) includes the recorded analysis of each bake.

## Interface and CLI

- The Recipe screen shows the findings next to the composition, apart from the checks, grouped by
  kind. Each shows its statement, the balance with its range and unknowns, the missing data, its
  coverage and its source. A partial or unevaluable coverage is visible: silence is never shown as
  "all good". Wording is localized by code (ADR 0009) and impersonal in French.
- The CLI prints the same `Analysis` structure as JSON.

## Acceptance examples

Quantities are for 500 g of flour. Contents are personal values typed by the baker in linked,
resolved personal entries unless stated; they stand for the package, not for a built-in. Expected
values are computed by hand.

1. **Brioche.** Milk 30 % (150 g; water 87, fat 3.5, sugar 5, salt 0.1, all known), butter 20 %
   (100 g; water 16 estimated ± 2, fat 82, sugar 0, salt 0 known), whole egg 20 % (100 g; water 76
   estimated ± 2, fat 10, sugar 0, salt 0.35 known), sugar 10 % (50 g; sugar 100, water 0, fat 0,
   salt 0 known), salt 2 % (10 g; salt 100 known, family `salt`), instant yeast 1 % (5 g; every
   content known 0 for the example). Findings:
   - `water_from_ingredients`: milk 150 × 87 / 100 = 130.5 g; butter 100 × 16 / 100 = 16 g
     (14 to 18); egg 100 × 76 / 100 = 76 g (74 to 78); total 222.5 g, range 218.5 to 226.5 g,
     complete.
   - `salt_balance`: milk 150 × 0.1 / 100 = 0.15 g, egg 100 × 0.35 / 100 = 0.35 g, salt 10 g; total
     10.5 g, 10.5 / 500 × 100 = 2.1 %, complete.
   - `fermentation_model_sugar`: 50 + 150 × 5 / 100 = 57.5 g, 57.5 / 500 × 100 = 11.5 %, complete,
     `outside` `[null, 5]`.
   - `fermentation_model_fat`: 150 × 3.5 / 100 + 100 × 82 / 100 + 100 × 10 / 100 = 5.25 + 82 + 10 =
     97.25 g, 97.25 / 500 × 100 = 19.45 %, `outside` `[null, 3]`.
   - No `fermentation_model_salt` (2.1 inside 1.5–3, complete). Coverage: the composition and
     applicability rules `evaluated`; the mechanism rules, once shipped, `evaluated` with nothing
     triggered.
2. **Sugar uncertainty across the bound.** A lean dough with honey 6 % (30 g; sugar 80 estimated
   ± 15, other contents known) and no other sugar: sugar 30 × 80 / 100 = 24 g, range 30 × 65 / 100
   = 19.5 to 30 × 95 / 100 = 28.5 g, that is 4.8 % (3.9 to 5.7 %). `fermentation_model_sugar` is
   `straddles`, not inside and not outside. With the honey's sugar unknown instead, the balance is
   incomplete with lower part 0: `indeterminate`.
3. **No sugar claim of speed.** For sugar 2 %, 5 % and 15 % (100 % sugar known, lean dough
   otherwise), no finding has an `effect`: 2 % and 5 % give no sugar finding (5 is inside), 15 % gives
   `fermentation_model_sugar` `outside`, a statement about the model only.
4. **Salt from several ingredients.**
   1. Salt 2 % (10 g; `saltPct` 100 known) and salted butter 20 % (100 g; `saltPct` 2 known):
      salt 10 + 100 × 2 / 100 = 12 g, 12 / 500 × 100 = 2.4 %, complete; inside 1.5–3, no
      applicability finding; `salt_balance` shows both contributors.
   2. The same butter **not linked**: salt 10 g identified, incomplete, unknown contributor the
      butter (`not_linked`); `salt_balance` says 10 g (2.0 %) **at least**, never "2.0 %";
      `fermentation_model_salt` is `indeterminate` (the butter could take it above 3).
   3. An old recipe whose `salt` ingredient (10 g) and butter are both unlinked: identified salt
      0 g, both unknown contributors; nothing is inferred from the id `salt`;
      `fermentation_model_salt` is `indeterminate`.
5. **Registry coverage.** Butter pins a personal entry version absent from the registry
   (`resolved: false`): its copied water, fat and sugar still count; its salt is unknown
   (`entry_not_found`), so `salt_balance` and `fermentation_model_salt` are `partial`. One milk
   entry pinned by two formula ingredients, `milk-a` (allocated to a scald component) and `milk-b`
   (final mix), has two context records and is counted as two masses, each once. An ingredient whose
   entry family is `unknown` triggers no family rule.
6. **Malt.** 0.5 % malt (2.5 g) in a resolved `malt` entry: diastatic power 60 °L known → enzyme
   activity **present**; 0 °L known → **absent**, and no statement about browning; unknown →
   **unknown**, `missing` lists `diastaticPower`. Nothing is inferred from the entry's id or name.
7. **Whipped egg white.** Egg white 10 % (50 g; water 88 known) with
   `preparation: { state: 'whipped' }`: `incorporated_air`, kind `mechanism`, phenomenon
   `aeration`, no effect on the fermentation estimate; the water balance counts 50 × 88 / 100 =
   44 g once, exactly as without the preparation.
8. **Egg in the dough and as a wash.** Whole egg 10 % in the dough (50 g; water 76 known) and the
   same entry at 2 % with role `glaze` (10 g): the dough water from the egg is 50 × 76 / 100 = 38 g,
   not (50 + 10) × 76 / 100 = 45.6 g; no dough finding names the wash; nothing is said about the
   wash and browning.
9. **Late incorporation.** Raisins 15 % (75 g; water 15 known) incorporated at the shaping step:
   `water_from_ingredients` lists 75 × 15 / 100 = 11.25 g like any dough ingredient; the analysis
   (`scope: 'formula'`) says nothing about the fermentation phases before the raisins went in.
10. **History.** A bake of example 1 records ruleset version 1 with its findings, coverage and
    copied citations. Ruleset version 2 adds a rule and a source record gets version 2: the bake
    shows exactly what version 1 recorded. A new bake records version 2. A bake restored from a
    backup written before this contract shows "analysis not recorded".

## Impact

| Area              | Change                                                                                 |
| ----------------- | -------------------------------------------------------------------------------------- |
| `ingredients.md`  | Consumption: family and preparation may select a qualitative rule (analyses only)      |
| `history.md`      | optional `analysis` in `BakeStartedPayload`; feedback export                           |
| `fermentation.md` | none; a later change may read the salt balance instead of the id `salt`                |
| `persistence.md`  | none (the snapshot is a JSON document)                                                 |
| Code              | `core/domain` `analyzeFormula`, salt balance, rules; `application` context; UI and CLI |
| Versions          | `CONTRACT_VERSION` minor bump (on canary); ruleset `flourprint.interactions` `1.0.0`   |
| Science           | `docs/science/interactions.md`: immutable, versioned source records per mechanism rule |
| Fixtures          | independent cases for examples 1, 2, 4 and 8                                           |

## Owner decisions

From the audit of 2026-10-13 (#89):

1. **Snapshot the analysis at bake start**: approved in principle, with durable, versioned
   sources (Sources, History).
2. **Version 1 rules**: revised (kinds, applicability positions, salt balance, coverage); the
   mechanism rules ship only after their evidence review. **Requested: approval of this revision.**
3. **Family and preparation as selectors of qualitative rules**: approved in principle, with the
   context keyed by formula ingredient and the version 1 scope (formula, not process).
4. **No new thresholds**: approved; the model bounds are applicability conditions, not physical
   thresholds.
5. **Display apart from the checks**, with reasons, data quality and source: approved.
6. **Delivery**: not in 0.2.0; this pull request targets `canary` (0.3.0, ADR 0018) and stays a
   draft until the owner approves the revised rules.
