# Contract: formula (D1, D2)

Status: **approved** (issue #30). Related issues: #3, #4, #19, #26.

## Representation

- Each ingredient carries a **baker's percentage** (`bakerPct`, in points) relative to total
  flour. Grams are **always derived**.
- Flours form a blend (`flours[].sharePct`) whose shares sum to 100.
- A formula has **exactly one active anchor**:

```ts
type Anchor =
  | { kind: 'flourTotal'; grams: number }
  | { kind: 'doughWeight'; grams: number } // final dough, after declared losses
  | { kind: 'pieces'; count: number; gramsEach: number }; // doughWeight = count × gramsEach
```

- A pan-based anchor (#28) converts explicitly to `doughWeight`. Mass is never inferred from a
  volume.
- Every ingredient of `kind: 'water'` adds to the pure-water pool. Any other ingredient may carry
  a resolved composition: `water`, `fat` and `sugar` contents per 100 g of the ingredient, each
  `known`, `estimated` (with an optional range) or `unknown`. A known or estimated content may name
  its `source` (a table, a label, the owner). A missing content means `unknown`.
- Ingredients with role `topping` or `glaze` get grams from total flour but are excluded from the
  dough weight, the final mix and the water balance.
- Identifiers (flours, ingredients, components) are non-empty strings, unique across the formula.
  Names of built-in object members (`__proto__`, `constructor`, `toString`, …) are refused with
  `InvalidFormula`, so that every identifier is safe as a key in JSON and in code.

## Components (preferments, scalds)

- A component **draws from** the formula totals: flour (`flourPct` of total flour, split by an
  explicit `flourBlend`), water (`hydrationPct` of its own flour), other ingredients
  (`allocations`). It adds no mass.
- Allocation is checked **per flour**: the sum drawn from a flour must not exceed its amount in
  the formula, otherwise `FlourAllocationExceeded { flour, requiredGrams, availableGrams }`. The
  same check applies to water and to every allocated ingredient.
- Within one component, a flour appears at most once in `flourBlend` and an ingredient at most once
  in `allocations`; a repeated reference is refused with `InvalidFormula` (never merged
  silently). Only `dough`-role, non-water ingredients can be allocated: a component is part of the
  dough, so a `topping` or `glaze` allocation is refused with `InvalidFormula`.
- Invariant of every accepted formula: the final mix (flours, water, other dough ingredients and
  component masses) weighs exactly `doughWeight`.
- A loss (evaporation) **reduces** mass. It is declared on the component (`waterLossPct` of the
  component's water) with its provenance, and applies at the component's step. The only default
  is 0.

## Edit commands

| Command                                                      | Kept constant                  | Recomputed                                            | `IncompatibleConstraint` when…                                               |
| ------------------------------------------------------------ | ------------------------------ | ----------------------------------------------------- | ---------------------------------------------------------------------------- |
| `SetBakerPct(ing, pct)`                                      | anchor, other %                | grams                                                 | the ingredient is a flour (use `SetFlourBlend`)                              |
| `SetFlourBlend(parts)`                                       | anchor, non-flour %            | grams                                                 | shares do not sum to 100, or a component allocation is exceeded              |
| `SetIngredientGrams(ing, g, hold: 'otherGrams')` **default** | grams of the other ingredients | every %, total flour, anchor value (anchor kind kept) | total flour ≤ 0                                                              |
| `SetIngredientGrams(ing, g, hold: 'anchor')`                 | anchor, other %                | the ingredient's %, then grams                        | g ≥ W + L; a flour without a designated absorbing flour; absorbing flour < 0 |
| `SetAnchor(anchor, 'rescale')`                               | %                              | grams                                                 | value ≤ 0                                                                    |
| `SetAnchor(kind, 'reinterpret')`                             | grams and %                    | value of the new anchor                               | `pieces` without `count`                                                     |

- Under `pieces` with `otherGrams`, `count` is kept and `gramsEach` is recomputed.
- With `otherGrams`, component amounts are "other grams" too: their flour, water and allocations
  keep their grams, and their percentages are recomputed against the new total flour.
- Losses are proportional to total flour: `L = λ × F`, with
  `λ = Σ flourPct × hydrationPct × waterLossPct / 100³` over components. Hence
  `W = F × (S / 100 − λ)` and, under `doughWeight`, `F = W / (S / 100 − λ)`.
- `hold: 'anchor'` under `doughWeight` or `pieces` (non-flour ingredient): with S′ the sum of the
  other percentages including the 100 flour points, `F = (W − g) / (S′ / 100 − λ)` and
  `pct = 100 × g / F`. Without losses this is `pct = g × S′ / (W − g)`; in general it equals
  `g × S′ / (W + L − g)` with L evaluated at the new F.
- `hold: 'anchor'` on a flour: the other percentages and the anchor fix total flour, so another
  flour must be designated to absorb the difference (`absorbInto`), under any anchor kind.
- A real weighing during a bake is **not** a formula edit (see `bake-session.md`).

### Structure edits

| Command                                | Effect                                                                            | Refused when…                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `SetFlourBlend(parts)`                 | may also add or remove flours                                                     | a component still draws from a removed flour                   |
| `AddIngredient(ingredient)`            | adds an ingredient with its %, kind, role and composition                         | the id is taken or reserved                                    |
| `UpdateIngredient(id, changes)`        | changes kind, role or water/fat/sugar contents; the % is kept                     | the change breaks an allocation (e.g. a role other than dough) |
| `RemoveIngredient(id)`                 | removes the ingredient                                                            | a component allocates it, or it absorbs the locked total water |
| `AddComponent(component)`              | adds a preparation drawing from the formula totals                                | its draws exceed what the formula has                          |
| `UpdateComponent(id, changes)`         | changes flour share, flour blend, hydration, loss, allocations or kind            | the draws exceed what the formula has                          |
| `RemoveComponent(id)`                  | removes the preparation; its flour, water and ingredients return to the final mix | —                                                              |
| `LockTotalWater(totalWaterPct, water)` | locks total water (see below)                                                     | see below                                                      |
| `UnlockTotalWater`                     | removes the lock; every quantity keeps its current value                          | —                                                              |

Every edit is validated by a full resolution; a refused edit changes nothing. Removing a
component does not edit the process: the application removes or keeps the matching step
explicitly (`process.md`, Step removal).

### Locked total water

- A formula may lock its total water: `waterTarget: { totalWaterPct, absorbInto }`, where
  `absorbInto` is a `water`-kind, `dough`-role ingredient. Its percentage is then derived, never
  edited directly:
  `pct(absorbInto) = totalWaterPct − Σ pct(other water ingredients) − Σ pct(i) × water(i) / 100 + λw`,
  over the other `dough` ingredients, with `λw = Σ flourPct × hydrationPct × waterLossPct / 100²`
  the component losses in points of flour. Total water counts everything that brings water
  (milk, eggs, honey, butter…), as `totalWater` does.
- After every edit, the absorbing water is recomputed; with `hold: 'otherGrams'`, the absorbing
  water is the one quantity whose grams are not kept. Editing the absorbing water directly is
  refused (`IncompatibleConstraint`): change the target, or unlock.
- Estimated contents count at their value; the derived water is then an estimate too.
- Refused, with the reason and the ingredients concerned (`IncompatibleConstraint`):
  - an ingredient with mass and an unknown water content (the total cannot be known);
  - a target below the water the other ingredients already bring (negative added water).
- A stored formula whose absorbing water does not match its lock is invalid (`InvalidFormula`).
- An impossible constraint returns a structured error (code, fields, explanation), never a silent
  correction.

## Water quantities

| Name             | Definition                                                                        |
| ---------------- | --------------------------------------------------------------------------------- |
| `flourTotal`     | all flour (final mix and components), also per flour                              |
| `pureWaterTotal` | all water added as the "water" ingredient, components included                    |
| `finalMixWater`  | `pureWaterTotal` − water allocated to components; negative → error                |
| `pureWaterPct`   | `100 × pureWaterTotal / flourTotal`                                               |
| `totalWater`     | `pureWaterTotal` + Σ (mass × water fraction) of `dough`-role ingredients − losses |
| `totalWaterPct`  | `100 × totalWater / flourTotal`                                                   |

```ts
interface WaterBalance {
  value: number; // grams, known and estimated contributions
  range?: [number, number]; // propagated ranges of estimated contributions
  completeness: 'complete' | 'incomplete';
  unknownContributors: string[]; // ingredients whose water fraction is unknown
}
```

- An unknown fraction is **never** replaced by 0; it makes the total `incomplete`. An ingredient
  at 0 g contributes exactly nothing, so its unknown fraction leaves the total complete.
- Water, fat and sugar contents are checked by the engine itself, whatever the entry point
  (edit, save, start, import): values within [0, 100] and estimate ranges ordered around the value.
- `topping` and `glaze` roles are excluded from the dough balance.
- Components draw their water from the pure-water pool; drawing more than the pool is
  `WaterAllocationExceeded`.
- No quantity is called "conventional hydration". A consistency index is a model output (#27,
  N3) and is never called hydration.

## Fat and sugar

| Name            | Definition                                                                 |
| --------------- | -------------------------------------------------------------------------- |
| `totalFat`      | Σ (mass × fat fraction) of non-flour, non-water `dough`-role ingredients   |
| `totalFatPct`   | `100 × totalFat / flourTotal`                                              |
| `totalSugar`    | Σ (mass × sugar fraction) of non-flour, non-water `dough`-role ingredients |
| `totalSugarPct` | `100 × totalSugar / flourTotal`                                            |

- Both use the shape of `WaterBalance` (value, range, completeness, unknown contributors), with
  the same rule: an unknown content makes the total `incomplete`, never 0.
- Flours contribute nothing: their own lipids and sugars belong to the flour, not to the
  enrichment. `water` ingredients contribute 0.
- They describe what the dough contains. How fat or sugar changes the way a dough behaves (an
  "effective hydration") is a model output (#27, N3), never called hydration.

## Component style

The engine names a component from its liquid ratio
`r = 100 × (component water + water of its allocated ingredients) / component flour`:

| Kind         | Name                                                          |
| ------------ | ------------------------------------------------------------- |
| `scald`      | `tangzhong` when r ≥ 300, `yudane` when r ≤ 150, else `scald` |
| `preferment` | `poolish` when r ≥ 90, `biga` when r ≤ 65, else `preferment`  |
| others       | the kind itself                                               |

- The style is derived, never stored: changing the ratio renames the component.
- An allocated ingredient whose water content is unknown leaves the style undefined; the kind
  is shown instead.
- The thresholds are naming conventions, not physics. Sourdough cultures are not modelled yet
  (#9); until they are, every preferment is named by its ratio.

## Formula / Process boundary

The formula knows nothing about steps. Per-step incorporations in the Process (autolyse,
staged water additions, late additions) must add up exactly to the final-mix quantities, otherwise validation
fails (see `process.md`).

## Precision

Calculations use JS `number` with no intermediate rounding. Rounding happens only for display or
weighing. Fixture comparison tolerance: `1e-9` relative. See ADR 0006.

## References

Worked cases: `fixtures/` (lean-direct, poolish-tangzhong, enriched-milk-butter).
