# Contract: formula analysis and ingredient interactions (#27)

Status: **proposed** (owner decisions requested at the end). Related issues: #26, #27, #9, #20,
#33. Capability level: **N1 + qualitative analyses** (`capability-levels.md`): sourced, tested,
never blocking. No quantitative interaction model ships with this contract.

#27 asks the engine to take the interactions between ingredients into account beyond the water
balance. It separates three kinds of result:

1. **Composition balances**: exact mass contributions (water, fat, sugar) relative to their
   inputs. They exist already (`formula.md`, Water quantities, Fat and sugar) and this contract
   only lists them per ingredient.
2. **Qualitative analysis**: the phenomenon concerned, the ingredients and conditions that trigger
   it, the data that are missing, and a source. This contract defines it.
3. **Quantitative predictions**: only under a versioned model validated within a declared domain
   (`fermentation.md` is the only one today). Out of scope here: an analysis never changes a
   duration, a dose, a timer or an estimate.

## Analysis

```ts
type Phenomenon =
  | 'composition' // what the dough contains
  | 'fermentation' // gas production by the leavening
  | 'gasRetention' // structure that keeps the gas
  | 'aeration' // air beaten into an ingredient, not fermentation gas
  | 'enzymeActivity'
  | 'browning';

type Direction = 'slows' | 'speeds' | 'depends' | 'none' | 'unknown';

interface Finding {
  code: string; // stable rule code, localized by the UI (rules below)
  phenomenon: Phenomenon;
  direction: Direction; // a qualitative direction, never a magnitude
  contributors: Array<{
    ingredient: string; // the formula ingredient id
    massG?: number; // its mass in the resolved formula
    contentG?: number; // the part of that mass the rule is about (water, sugar, fat), when known
  }>;
  values?: Record<string, number>; // the totals the rule read, e.g. { totalSugarPct: 11.5 }
  missing: string[]; // data the rule would need and does not have, e.g. ['ingredients.vinegar.ph']
  sources: string[]; // source ids of docs/science/interactions.md, shown with their citation
}

interface Analysis {
  ruleset: ModelRef; // { id: 'flourprint.interactions', version }
  findings: Finding[];
}

analyzeFormula(resolved: ResolvedFormula, formula: Formula, context: AnalysisContext): Analysis

interface AnalysisContext {
  // what the application resolved from the registry for each formula ingredient with an `entry`
  // (ingredients.md); the domain never reads the registry
  entries: Record<
    string,
    {
      family: IngredientFamily;
      ph: PropertyValue;
      diastaticPower: PropertyValue;
    }
  >;
}
```

- `analyzeFormula` is a pure function of `core/domain`: same resolved formula, context and ruleset
  version, same findings, in the same order (rule order, then ingredient order). No network, no
  model call, no clock.
- **Scope: the dough.** Only `dough`-role ingredients are analysed, as for the totals
  (`formula.md`). A `topping` or `glaze` never produces a finding and never changes another one.
- **Never blocking.** A finding is not a `RecipeIssue` (`drafts.md`): it does not block a save, a
  bake or an import, and the checks are unchanged.
- **Direction.** `slows` and `speeds` require a source that states that direction for the
  condition of the rule. Otherwise a rule says `depends` (the direction varies with dose, yeast or
  medium), `none` (no effect on that phenomenon) or `unknown`. A rule never states a magnitude.
- **Missing data.** A rule that needs a value the formula or the entry does not have lists it in
  `missing` with its path. A missing value is never replaced by a typical one, a family default or
  a name.
- **Family and preparation are conditions, not numbers.** A rule may use the family of a pinned
  entry or the `preparation` of an ingredient to decide **which** qualitative note applies. It
  never derives a number from them. This amends the Consumption section of `ingredients.md` for
  analyses only; calculations still read only the fields listed there.
- **Counted once.** A finding reads the existing balances: an ingredient in a component, a whipped
  egg white or a composite is counted once, as in the totals.

## Rules, version 1

Thresholds are the ones that already have provenance: the lean-dough domain of the fermentation
model (`fermentation.md`, Domain). A rule with any other threshold needs its source and its
provenance in `docs/science/interactions.md` before it ships (AGENTS.md).

| Code                        | When                                                                                | Phenomenon       | Direction | Missing                                        |
| --------------------------- | ----------------------------------------------------------------------------------- | ---------------- | --------- | ---------------------------------------------- |
| `water_from_ingredients`    | a non-water dough ingredient brings water (`water` known or estimated, > 0)         | `composition`    | `none`    | contributors whose water is unknown            |
| `sugar_beyond_lean_model`   | `totalSugarPct` > 5 (central value)                                                 | `fermentation`   | `depends` | —                                              |
| `fat_beyond_lean_model`     | `totalFatPct` > 3 (central value)                                                   | `gasRetention`   | `depends` | —                                              |
| `salt_beyond_lean_model`    | salt (id `salt` or a `salt` entry) outside 1.5–3 % of the flour                     | `fermentation`   | `depends` | —                                              |
| `enrichment_unknown`        | `totalSugar` or `totalFat` is `incomplete`                                          | `composition`    | `unknown` | the unknown contributors                       |
| `acid_present`              | a dough ingredient pins an entry of family `acid`                                   | `fermentation`   | `depends` | the entry's `ph` when unknown, and the acidity |
| `malt_activity_unknown`     | a dough ingredient pins an entry of family `malt` whose `diastaticPower` is unknown | `enzymeActivity` | `unknown` | the entry's `diastaticPower`                   |
| `malt_enzymatic`            | a `malt` entry with `diastaticPower` known or estimated > 0                         | `enzymeActivity` | `depends` | —                                              |
| `malt_non_enzymatic`        | a `malt` entry with `diastaticPower` known 0                                        | `browning`       | `none`    | —                                              |
| `aeration_not_fermentation` | a dough ingredient with `preparation.state` `whipped` or `beaten`                   | `aeration`       | `none`    | —                                              |

- `water_from_ingredients` lists every contributor with its mass and water mass, so a formula with
  milk, butter, egg and syrup shows what each brings without treating them as pure water.
- The three `*_beyond_lean_model` rules restate, for the recipe, the extrapolations the
  fermentation estimate already carries; they also apply when the recipe has no estimate (a
  sourdough, for example).
- `malt_enzymatic` says that a dose matters and that no universal dose is known; it gives none.
- `aeration_not_fermentation` has direction `none` on fermentation: air beaten into an ingredient
  is not counted as rise, and no estimate changes.
- A rule that does not apply produces nothing; there is no "all good" finding.

## Sources

`docs/science/interactions.md` lists each source id with a displayable citation and what it
supports (a distinction or a direction), and its limits of transposition (a study in a controlled
medium is not a dough duration). The sources named in #27 are the starting point. The science
document arrives with the implementing pull request, checked under the scientific-evidence
workflow (#34); a rule without a citation does not ship.

## History

- **Proposed (decision 1):** `BakeStartedPayload` gains an optional
  `analysis?: Analysis`, computed at bake start like `initialProjection`. A later ruleset version
  never changes a recorded analysis, and a snapshot without it (written before) shows no analysis,
  not an empty one.
- The analysis of a saved recipe is computed when it is shown; it is not stored in the revision.
- The feedback export (`history.md`) includes the recorded analysis of each bake.

## Interface and CLI

- The Recipe screen shows the findings next to the composition, separate from the checks, each
  with its phenomenon, contributors, missing data and source. Wording is localized by code
  (ADR 0009) and impersonal in French.
- The CLI prints the same `Analysis` structure as JSON.

## Acceptance examples

Quantities are for 500 g of flour; contents are personal values typed by the baker (they stand for
the package, not for a built-in). Expected values are computed by hand.

1. **Brioche.** Milk 30 % (150 g; water 87, fat 3.5, sugar 5, all known), butter 20 % (100 g; fat
   82 known, water 16 estimated ± 2, sugar 0 known), whole egg 20 % (100 g; water 76 estimated
   ± 2, fat 10 known, sugar 0 known), sugar 10 % (50 g; sugar 100 known, water 0, fat 0), salt 2 %,
   instant yeast 1 %. Findings, in rule order:
   - `water_from_ingredients`: milk 150 × 87 / 100 = 130.5 g, butter 100 × 16 / 100 = 16 g, egg
     100 × 76 / 100 = 76 g; together 222.5 g.
   - `sugar_beyond_lean_model`: sugar 50 + 150 × 5 / 100 = 57.5 g, `totalSugarPct` = 57.5 / 500 ×
     100 = 11.5 > 5; direction `depends`.
   - `fat_beyond_lean_model`: fat 150 × 3.5 / 100 + 100 × 82 / 100 + 100 × 10 / 100 = 5.25 + 82 +
     10 = 97.25 g, `totalFatPct` = 97.25 / 500 × 100 = 19.45 > 3.
   - No salt, acid, malt or aeration finding (salt 2 % is inside 1.5–3).
2. **Sugar is never a constant accelerator.** For sugar at 2 %, 5 % and 15 % (the other contents as
   in example 1 without milk, butter and egg), no finding has phenomenon `fermentation` and
   direction `speeds`: 2 % and 5 % give no sugar finding (5 is not > 5), 15 % gives
   `sugar_beyond_lean_model` with `depends`.
3. **Vinegar.** A lean dough with cider vinegar 1 % (5 g) pinning an entry of family `acid` whose
   `ph` is unknown: `acid_present`, direction `depends`, `missing` lists the entry's `ph` and the
   acidity. The fermentation estimate gets no coefficient from the finding: the vinegar counts only
   through its 5 g and its water in the existing balances.
4. **Malt.** The same dough with 0.5 % malt (2.5 g) pinning a `malt` entry: diastatic power
   unknown gives `malt_activity_unknown`; 60 °L known gives `malt_enzymatic` (`depends`, no dose);
   0 °L known gives `malt_non_enzymatic` (`browning`, `none`). Nothing is inferred from the entry's
   id or name.
5. **Whipped egg white.** Egg white 10 % (50 g) with `preparation: { state: 'whipped' }`:
   `aeration_not_fermentation`; the totals count its 50 g once (water 50 × 88 / 100 = 44 g with a
   typed water of 88), exactly as without the preparation.
6. **Egg wash.** A whole egg at 5 % with role `glaze`: no finding names it, and every finding and
   total is identical with or without it.
7. **History (with decision 1).** A bake of example 1 records ruleset version 1 and its findings. A
   later ruleset version 2 adds a rule: the bake still shows the three findings of version 1; a
   new bake of the same recipe records version 2.

## Impact

| Area             | Change                                                                                   |
| ---------------- | ---------------------------------------------------------------------------------------- |
| `ingredients.md` | Consumption: family and preparation may select a qualitative rule (analyses only)        |
| `history.md`     | optional `analysis` in `BakeStartedPayload` (decision 1); feedback export                |
| `persistence.md` | none (the snapshot is a JSON document)                                                   |
| Code             | `core/domain` `analyzeFormula` and rules; `application` context resolution; UI and CLI   |
| Versions         | `CONTRACT_VERSION` minor bump with decision 1; ruleset `flourprint.interactions` `1.0.0` |
| Science          | `docs/science/interactions.md`, sources and limits per rule                              |
| Fixtures         | independent cases for examples 1, 3 and 5                                                |

## Owner decisions requested

1. **Record the analysis in the bake snapshot** (recommended): what was shown at bake start stays
   readable after the rules change. Alternative: recompute on read, which can change an old bake's
   findings.
2. **The ten rules of version 1**, with directions limited to `depends`, `none` and `unknown`
   until a source states a direction for a condition.
3. **Family and preparation as conditions** for qualitative rules (never a number), amending
   `ingredients.md` for analyses only.
4. **No new threshold in version 1**: the lean-dough bounds of the fermentation model (sugar 5 %,
   fat 3 %, salt 1.5–3 %) are reused; any other threshold waits for its source.
5. **Display apart from the checks**, never blocking.
