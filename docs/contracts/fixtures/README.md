# Reference fixtures

Expected values **computed outside the engine**, with exact rational arithmetic, from the equations
below (ADR 0006, issue #30). They are authoritative: if the engine disagrees, the engine is wrong,
unless the fixture is corrected explicitly and with a justification.

CLI output is never used to create or update a fixture.

## Format `flourprint-fixture/0`

| Field       | Role                                                                            |
| ----------- | ------------------------------------------------------------------------------- |
| `input`     | formula as the engine receives it, with resolved ingredient properties          |
| `expected`  | expected outputs (grams, and `Pct` values in points; see `values-and-units.md`) |
| `edits`     | edit commands applied to `input`, each with its own `expected`                  |
| `variants`  | targeted changes to `input` (`change`) with their result or error               |
| `exact`     | exact rational values where the decimal is rounded                              |
| `tolerance` | numeric comparison tolerance                                                    |

The format is version 0: `input` field names may follow the types defined in step 2 (formula).
**Values** do not change with the format.

## Equations

Notation: F total flour, `pct_i` baker's percentage of ingredient i, S = sum of `pct` (including
the 100 flour points), L declared losses in grams.

- Grams: `g_i = F × pct_i / 100`.
- Dough weight: `W = F × S / 100 − L`.
- `doughWeight` anchor: `F = 100 × (W + L) / S`.
- `SetIngredientGrams(i, g, hold: 'anchor')`, non-flour ingredient, S excluding i:
  `pct_i = g × S / (W + L − g)`.
- `SetIngredientGrams(i, g, hold: 'otherGrams')`: other grams are kept, `pct = 100 × g / F`, the
  anchor takes the new value.
- Component: flour `= F × flourPct / 100`, split by `flourBlend`; water
  `= component flour × hydrationPct / 100`; loss `= component water × waterLossPct / 100`.
- Final mix: formula totals − component allocations, flour by flour.
- `pureWaterPct = 100 × pureWaterTotal / F`; `totalWaterPct = 100 × totalWater / F`.
- `totalWater = pureWaterTotal + Σ g_i × waterPct_i / 100 − L`, over `dough`-role ingredients whose
  fraction is known or estimated. `range` only propagates the ranges of estimated contributions;
  unknown contributions make the total `incomplete`.

## Cases

### `lean-direct.json`

S = 100 + 70 + 2 + 0.5 = 172.5; W = 1725 → F = 1000. Water 700, salt 20, yeast 5.

- `otherGrams`, salt set to 22 g: F stays 1000, salt = 2.2 %, W = 1727.
- `anchor`, salt set to 22 g: S without salt = 170.5; `pct_salt = 22 × 170.5 / 1703 = 3751/1703 ≈
2.2025837`; F = 172500 / (170.5 + 3751/1703) = 340600/341 ≈ 998.82698. Water = 238420/341,
  yeast = 1703/341, total = 1725.

### `poolish-tangzhong.json`

F = 1000: bread flour 800, whole wheat 200. Water 750, salt 20, yeast 4.

- Poolish: 300 g bread flour, water 300, yeast 1 (0.1 % of F) → 601 g.
- Tangzhong: 50 g bread flour, water 250 (500 % hydration) → 300 g.
- Per-flour check: bread flour drawn 350 ≤ 800.
- Final mix: bread flour 450, whole wheat 200, water 750 − 300 − 250 = 200, salt 20, yeast 3.
  873 + 601 + 300 = 1774 = W.
- Variant, 8 % loss of the tangzhong water: L = 20 → tangzhong 280, W = 1754, `totalWater` 730
  (73 %), `pureWaterPct` unchanged at 75.
- Variant, whole-wheat poolish: 300 g required > 200 g available → `FlourAllocationExceeded`, even
  though 300 < F.

### `enriched-milk-butter.json`

F = 500: milk 300, butter 50, salt 10, yeast 5, W = 865. No pure water: `pureWaterPct` = 0. Milk
estimated at 87.5 % [86; 89] → 262.5 g [258; 267]. Butter and yeast unknown → `incomplete`.
`totalWaterPct` = 52.5.

### Ingredient entries (`ingredient-*.json`)

Acceptance examples 1, 4, 5 and 11 of `ingredients.md`. Each formula has F = 500 (one flour),
pure water 50 % (250 g) and salt 2 % (10 g, water known 0, fat unknown), so `pureWaterPct` = 50,
and a butter worth 10 % of the flour: 50 g, W = 500 + 250 + 10 + 50 = 810. Edits carry the entry
document they copy (`ApplyIngredientEntry`, `RefreshIngredientEntry`); an entry property
`estimated` v ± u becomes the range [v − u, v + u]. The salt's unknown fat keeps `totalFat`
`incomplete`.

- `ingredient-entry-apply.json` (example 1): before the entry, the butter has no contents:
  `totalWater` 250 with the butter unknown, `totalFat` 0 with salt and butter unknown. Applying
  `Beurre 82 %` version 1 (fat known 82): fat 50 × 82 / 100 = 41 g, `totalFatPct` =
  41 / 500 × 100 = 8.2; the water stays unknown (250 g, `incomplete`, butter listed).
- `ingredient-entry-refresh.json` (example 4): the butter pins version 1 (fat 41 g, water
  unknown). Updating from version 2 (water 16 ± 2) with `keep`: water 50 × 16 / 100 = 8 g, range
  50 × 14 / 100 = 7 to 50 × 18 / 100 = 9; `totalWater` 258 [257; 259], complete, 51.6 %.
- `ingredient-entry-overrides.json` (example 5): the butter pins version 2 with its fat
  overridden to 80: fat 50 × 80 / 100 = 40 g (8.0 points), water 8 g [7; 9], `totalWater` 258.
  From version 3 (fat 83, water 15 ± 2): water 50 × 15 / 100 = 7.5 g, range 6.5 to 8.5,
  `totalWater` 257.5 [256.5; 258.5], 51.5 %; with `keep` the fat stays 40 g, with `clear` it is
  50 × 83 / 100 = 41.5 g (8.3 points). Detaching changes no number.
- `ingredient-preparation.json` (example 11): two butters of 5 %, 500 × 5 / 100 = 25 g each,
  fat 25 × 82 / 100 = 20.5 g each: 41 g together (8.2 points), W = 810, both unknown in
  `totalWater`. Removing a preparation changes no number; `{ state: 'other' }` without a note is
  `InvalidFormula`.

## Fermentation (`fermentation/`)

`fermentation/cases.json` holds reference cases of the provisional fermentation model
(fermentation.md), produced by `fermentation/generate.py` from the contract's equations: closed
forms at constant temperature, an independent fine integration of the analytic dough temperature
for the thermal lag. Keys of `expected` are paths in the engine's result; `tolerance` is
absolute, in the unit of the value (seconds, percent, °C).
A `range` expected value lists the two finite bounds (seconds). The dough cases use the provisional
personal calibration `readyProgress` 2.0, band 1.5–2.5 (fermentation.md, recorded in the file's
`calibration` field); the preferment case keeps its end point at 1.

## Dough thermal model (`thermal/`)

`thermal/cases.json` holds the reference cases of the dough thermal model (fermentation.md, Dough
thermal model, #176), produced by `thermal/generate.py` from the contract's equations and
constants, with no import from `packages/`. Cases: (a) a 250 g ball and (b) a 2 kg bulk entering a
4 °C fridge from 24 °C (mean and core, with the band of `τ_eff`), (c) self-heating of a 2 kg bulk
at 24 °C (uncoupled and coupled-linearised, with the low, central and high `ΔT_ad`), (d)
calibration from three readings (Guggenheim, two points, a factor and `T∞`), (e) a step without
thermal inputs reproducing `τ` 1.5 h and its 0 to 3 h band, (f) `ψ > 1/e`: `out_of_domain`,
`self_heating_unbounded`, (g) the default 0 to 3 h band on a fridge-then-room path, (h) a 2 kg
bulk in the fridge, divided into balls, then at room, with thermal bands: both give the progress
envelope of the upper and lower thermal paths and, labelled `sharedCornersBandWrong`, the narrower
band that shared corners would give and that an engine must not return, (i) the personal factor
with none, one, two consistent and two inconsistent calibration sets, (j) a calibration with
self-heating (0.22.0): the factor `r / (1 + r ψ₁)` and, as values an engine must not return, the
two factors of the 0.21.0 rule that depended on the factor stored before. Two cross-check cases reproduce the verified values of the #176
collation (GPT A, B, D with their own inputs and the exact sphere eigenvalue; Argon F3, F4) so that
the arithmetic is checked against sources outside the repository; they are labelled and are not
contract inputs. `tolerance` is absolute in the unit of each key. The cases ship no engine
expectation of their own beyond these values, and `fermentation/cases.json` is unchanged: it has no
thermal input, and its one band case keeps a constant temperature, where the lag plays no part.
