# Typical composition of the built-in ingredients

Research record for the version 1 values of the built-in ingredient entries
(`docs/contracts/ingredients.md`, Built-in entries). It proposes, for each entry, typical values per
100 g of the product **as added** (`basis: 'per100g'`), their status, their uncertainty and a
displayable citation (`source: { kind: 'reference', detail }`). It is evidence for the implementing
pull request, not a contract: the contract does not fix these numbers, and nothing here ships until
that pull request adopts it.

Prepared on 2026-10-13 under the scientific-evidence workflow (#34) for #26.

## Sources and read status

| Source                                                                                                                                                                                 | What it gives                                                                                     | Read status                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | Provenance label                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **USDA SR28**: US Department of Agriculture, Agricultural Research Service, Nutrient Data Laboratory, _National Nutrient Database for Standard Reference, Release 28_ (September 2015) | Water, protein, fat, carbohydrate (by difference), fibre, sugars, sodium per 100 g, by NDB number | Full machine read of the release's abbreviated file `ABBREV.txt` and `FOOD_DES.txt`, **as redistributed** in the npm package `fda-nutrient-database@1.0.2` (MIT; tarball sha1 `d5d37da30e05fcd176724b916cf86d6085bbc3d5`; `ABBREV.txt` sha256 `4c42235a…2cd2b85b`). Not fetched from USDA: the USDA hosts were not reachable from this session (below). `source_verified: false` until someone compares the rows with FoodData Central. Spot checks against third-party mirrors of FoodData Central SR Legacy (search excerpts only) agreed for maple syrup, 2 % milk, instant skim milk powder, heavy cream, whole egg and active dry yeast, and **disagreed for unsalted butter water** (see butter). | MEASURED (database values; protocol per food in the release documentation, not read) |
| **SR Legacy** (FoodData Central, 2018): SR28 with selected corrections                                                                                                                 | Same fields; FDC IDs                                                                              | Not reachable. FDC IDs and the few SR Legacy numbers quoted below come from **search excerpts of mirror sites** (getfoodfacts.com, recipal.com) and are secondary.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | MEASURED, secondary                                                                  |
| **Canadian Nutrient File** (Health Canada, CNF 2015)                                                                                                                                   | Preferred source (owner in Québec)                                                                | **Not reached.** `food-nutrition.canada.ca`, `www.canada.ca` and the FoodData Central hosts were refused by this session's egress policy (proxy 403 / no DNS); no mirror of the CNF data was found. No CNF value appears in this record. The CNF imports most of its values from the USDA SR, so the SR values are a reasonable stand-in, but Canadian-specific rows (Canadian fortification, 35 % cream) remain to be checked against it.                                                                                                                                                                                                                                                              | —                                                                                    |
| Canada, _Food and Drug Regulations_ (C.R.C., c. 870), B.08.056 butter                                                                                                                  | Butter: not less than 80 % milk fat                                                               | Search excerpts of the Justice Laws text (version 2006-03-22 to 2024-12-17); current wording not read.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | definition (a bound, not a value)                                                    |
| CFIA, _Canadian Grade Compendium_ Vol. 7, Maple syrup (incorporated by reference in the Safe Food for Canadians Regulations)                                                           | Graded maple syrup: 66 % to 68.9 % soluble solids at 20 °C                                        | Search excerpts only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | definition (a range)                                                                 |
| CFIA, _Canadian Grade Compendium_ Vol. 6, Honey; Codex Standard for Honey (CXS 12-1981)                                                                                                | Moisture: Canada No. 1 ≤ 17.8 % (≤ 18.6 % if pasteurized); Codex ≤ 20 %                           | Search excerpts only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | definition (a maximum)                                                               |
| Codex Standard for Food Grade Salt (CXS 150-1985)                                                                                                                                      | Not less than 97 % NaCl on a dry-matter basis, additives excluded                                 | Search excerpts only.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | definition (a minimum)                                                               |
| Canadian fluid milk sales by fat grade (Canadian Dairy Commission figures for 2007 and 2008-2009, via secondary summaries)                                                             | 2 % milk is the most sold grade (about 46 % of volume in 2007)                                    | Search excerpts of secondary summaries; dated.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | used only to choose a variant                                                        |

No value is labelled `known`. The regulatory standards give **bounds** (a minimum fat, a maximum
moisture, a solids range), not the value of a product, so they set or support the range of an
`estimated` value. A database zero (no fat in sugar, no fibre in an animal product) is likewise an
`estimated` 0; the implementing pull request may decide that a structurally absent constituent is a
`known` 0, which the contract allows for a product "truly free of a substance".

## Conventions

- Numbers are the SR28 values as published (two decimals where SR28 gives them). Rounding for
  display is a UI matter.
- `±` is the contract's `uncertainty`, half of a stated range. A value without `±` is a single
  database value with no justified range; it maps to `estimated` without uncertainty.
- `sugarPct` is a part of `carbohydratePct`, and SR28 carbohydrate is **by difference**, so it
  includes fibre. Where SR28's analysed sugars exceed its carbohydrate by difference, the row is
  flagged (contract: a warning, not a refusal).
- `saltPct` is sodium chloride. SR28 gives sodium only, so every `saltPct` below is
  **sodium × 2.5**, as the contract requires for a sodium value, and the conversion is in the
  citation. For products without added salt (milk, eggs, honey) this is the sodium expressed as
  salt, not added salt; it is what a label in salt terms would show.
- Citation strings (≤ 80 characters) are the proposed `source.detail`. "NDB" is the SR number,
  which FoodData Central keeps for SR Legacy foods.
- "Sum" is water + fat + carbohydrate + protein + salt. The remainder is ash other than salt, acids
  or alcohols (vinegar's acetic acid). Sums use the central values; the upper ends of independent
  ranges can together exceed 100.

## Single-product entries (values required)

### Summary

| id              | Variant chosen                  | water        | fat          | sugar      | carbohydrate | protein    | fibre | salt (Na × 2.5) | Sum      |
| --------------- | ------------------------------- | ------------ | ------------ | ---------- | ------------ | ---------- | ----- | --------------- | -------- |
| `salt`          | table salt                      | 0.20         | 0            | 0          | 0            | 0          | 0     | 98.5 ± 1.5 ¹    | 98.7     |
| `sugar`         | white granulated                | 0.02         | 0            | 99.80      | 99.98        | 0          | 0     | 0.00            | 100.00   |
| `maple-syrup`   | Canadian maple syrup            | 32.6 ± 1.5 ² | 0            | 59.92      | 67.38        | 0          | 0     | 0.02            | 100.00   |
| `honey`         | honey                           | 17.10        | 0            | 82.12      | 82.40        | 0.30       | 0.2   | 0.01            | 99.81    |
| `olive-oil`     | olive oil                       | 0            | 100.00       | 0          | 0            | 0          | 0     | 0.01            | 100.01 ³ |
| `butter`        | unsalted                        | 17.1 ± 0.9 ⁴ | 81.1 ± 1.1 ⁵ | 0.06       | 0.06         | 0.85       | 0     | 0.03            | 99.14    |
| `milk`          | 2 % M.F., vitamins A and D      | 89.21        | 1.98         | 5.06       | 4.80 ⁶       | 3.30       | 0     | 0.12            | 99.41    |
| `milk-powder`   | skim, instant, vitamins A and D | 3.6 ± 0.4 ⁷  | 0.75 ± 0.03  | 52.1 ± 0.1 | 52.1 ± 0.1   | 35.6 ± 0.5 | 0     | 1.36 ± 0.02     | 93.41    |
| `cream`         | whipping cream 35 % M.F.        | 57.81        | 35.5 ± 0.6 ⁸ | 2.92       | 2.74 ⁶       | 2.84       | 0     | 0.07            | 98.96    |
| `egg`           | whole egg, raw, without shell   | 76.15        | 9.51         | 0.37       | 0.72         | 12.56      | 0     | 0.36            | 99.30    |
| `egg-white`     | raw white                       | 87.57        | 0.17         | 0.71       | 0.73         | 10.90      | 0     | 0.42            | 99.79    |
| `egg-yolk`      | raw yolk                        | 52.31        | 26.54        | 0.56       | 3.59         | 15.86      | 0     | 0.12            | 98.42    |
| `cider-vinegar` | cider vinegar                   | 93.81        | 0            | 0.40       | 0.93         | 0          | 0     | 0.01            | 94.75 ⁹  |

Notes:

1. Salt. The contract's × 2.5 factor applied to SR28's 38 758 mg sodium gives 96.9, below the
   Codex minimum of 97 % NaCl, because 2.5 rounds down the stoichiometric ratio (58.44 / 22.99 =
   2.54; 38.758 × 2.542 = 98.5). The proposed value is the range from the Codex minimum (97) to pure
   NaCl (100): **98.5 ± 1.5**, which contains the stoichiometric SR28 figure. DERIVED. The implementing
   pull request decides whether this entry follows the contract's labelling factor (96.9) instead;
   either way the detail names the basis.
2. Maple syrup water. Graded Canadian syrup has 66.0 % to 68.9 % soluble solids, so 31.1 % to
   34.0 % water if soluble solids are taken as the whole dry matter (an approximation: refractometric
   Brix of a sucrose syrup). Midpoint 32.6 ± 1.5. SR28 NDB 19911 (32.15) lies inside. DERIVED.
3. Olive oil sums to 100.01 because the 0.01 of salt is added to SR28's fat of 100.00 (database
   rounding). A warning under the contract, not a refusal.
4. Butter water. SR28 gives 17.94 for NDB 01145; mirrors of the SR Legacy record (FDC 173430) give
   16.2 (getfoodfacts.com; recipal.com 36.7 g per 227 g). Range 16.2 to 17.9, so 17.1 ± 0.9.
   The SR Legacy number is secondary (search excerpts).
5. Butter fat. SR28 81.11; the Canadian minimum is 80 % (FDR B.08.056). 81.1 ± 1.1 puts the
   lower end of the band at the legal minimum; the upper end only mirrors it. DERIVED.
6. Sugars above carbohydrate (milk 5.06 > 4.80; cream 2.92 > 2.74). SR28 analyses sugars directly
   and computes carbohydrate by difference; the two disagree within analytical error. The implementing
   pull request may ship them as they are (the contract warns) or align sugar to carbohydrate; this
   record does not change source values.
7. Milk powder: half the difference between SR28 regular (NDB 01091/01154) and instant (NDB 01092)
   nonfat dry milk, centred between them: water 3.16 to 3.96, fat 0.72 to 0.77, sugar 51.98 to 52.19,
   protein 35.10 to 36.16, sodium 535 to 549 mg. Lactose is the whole carbohydrate in SR28 (sugar =
   carbohydrate).
8. Cream fat: from the Canadian grade's labelled 35 % M.F. to SR28 heavy whipping cream (NDB 01053,
   36.08 %): 35.5 ± 0.6. The other values are SR28's 36 % cream; at 35 % fat the water is expected
   to be about one point higher, which is not sourced and is not applied. The 35 % row needs a CNF or
   label check.
9. Cider vinegar sums to about 95: the rest is mainly acetic acid, which has no composition field.

### Citations (proposed `source.detail`)

| id              | Value(s)                               | Citation                                                               |
| --------------- | -------------------------------------- | ---------------------------------------------------------------------- |
| `salt`          | water, fat, sugar, carb., prot., fibre | `USDA SR28 (2015), NDB 02047, Salt, table`                             |
| `salt`          | salt                                   | `Codex CXS 150-1985: ≥ 97 % NaCl (dry); SR28 NDB 02047`                |
| `sugar`         | all                                    | `USDA SR28 (2015), NDB 19335, Sugars, granulated; salt Na × 2.5`       |
| `maple-syrup`   | water                                  | `CFIA Grade Compendium vol. 7: 66–68.9 % solids; SR28 NDB 19911`       |
| `maple-syrup`   | others                                 | `USDA SR28 (2015), NDB 19911, Syrup, maple, Canadian; Na × 2.5`        |
| `honey`         | all                                    | `USDA SR28 (2015), NDB 19296, Honey; salt = Na × 2.5`                  |
| `olive-oil`     | all                                    | `USDA SR28 (2015), NDB 04053, Oil, olive; salt = Na × 2.5`             |
| `butter`        | water                                  | `USDA SR28 NDB 01145 and SR Legacy FDC 173430, Butter, no salt`        |
| `butter`        | fat                                    | `USDA SR28 NDB 01145; FDR B.08.056: butter ≥ 80 % milk fat`            |
| `butter`        | others                                 | `USDA SR28 (2015), NDB 01145, Butter, without salt; Na × 2.5`          |
| `milk`          | all                                    | `USDA SR28 (2015), NDB 01079, Milk, 2 % milkfat, vit. A & D; Na × 2.5` |
| `milk-powder`   | all                                    | `USDA SR28 NDB 01091/01092, Milk, dry, nonfat; salt = Na × 2.5`        |
| `cream`         | fat                                    | `Cream 35 % M.F. (label grade); USDA SR28 NDB 01053, 36 %`             |
| `cream`         | others                                 | `USDA SR28 (2015), NDB 01053, Cream, heavy whipping; Na × 2.5`         |
| `egg`           | all                                    | `USDA SR28 (2015), NDB 01123, Egg, whole, raw, fresh; Na × 2.5`        |
| `egg-white`     | all                                    | `USDA SR28 (2015), NDB 01124, Egg, white, raw, fresh; Na × 2.5`        |
| `egg-yolk`      | all                                    | `USDA SR28 (2015), NDB 01125, Egg, yolk, raw, fresh; Na × 2.5`         |
| `cider-vinegar` | all                                    | `USDA SR28 (2015), NDB 02048, Vinegar, cider; salt = Na × 2.5`         |

FDC IDs seen in mirror excerpts (secondary, unverified): butter without salt 173430, butter salted
173410, maple syrup 169661, maple syrup Canadian 170276, 2 % milk 171267, instant nonfat dry milk
171272, heavy whipping cream 170859, whole egg 171287, active dry yeast 175043, compressed yeast 175042. The implementing pull request may add them once read on FoodData Central.

### Sodium behind each salt value

| id            | Na (mg/100 g, SR28) | × 2.5 (g)    |     | id                 | Na (mg/100 g, SR28) | × 2.5 (g) |
| ------------- | ------------------- | ------------ | --- | ------------------ | ------------------- | --------- |
| `salt`        | 38 758              | 96.9 ¹       |     | `cream`            | 27                  | 0.07      |
| `sugar`       | 1                   | 0.00         |     | `egg`              | 142                 | 0.36      |
| `maple-syrup` | 9                   | 0.02         |     | `egg-white`        | 166                 | 0.42      |
| `honey`       | 4                   | 0.01         |     | `egg-yolk`         | 48                  | 0.12      |
| `olive-oil`   | 2                   | 0.01         |     | `cider-vinegar`    | 5                   | 0.01      |
| `butter`      | 11                  | 0.03         |     | `fresh-yeast`      | 30                  | 0.08      |
| `milk`        | 47                  | 0.12         |     | `active-dry-yeast` | 51                  | 0.13      |
| `milk-powder` | 535 to 549          | 1.34 to 1.37 |     |                    |                     |           |

### Variant choices and alternatives

A built-in names a product, not a bag; the baker customizes it (contract, Customizing a built-in).
The variant below is the one a Québec home baker would most likely mean, for the owner to confirm.

| id              | Chosen                                                                    | Why                                                                                                        | Common alternatives (SR28, per 100 g)                                                                                                                  |
| --------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `milk`          | 2 % M.F. (partly skimmed), with vitamins A and D (Canadian fortification) | The most sold fluid milk grade in Canada (about 46 % of volume in 2007; dated, secondary)                  | 3.25 % (NDB 01077): water 88.13, fat 3.25, sugar 5.05. 1 % (NDB 01082): 89.92, 0.97, 5.20. Skim (NDB 01085): 90.84, 0.08, 5.09                         |
| `cream`         | Whipping cream 35 % M.F. (crème à fouetter)                               | The cream sold for whipping and baking in Québec; SR has no 35 % row, so its 36 % heavy cream is the proxy | 15 % cooking cream: no SR row. Light/table 18–20 % (NDB 01050): water 74.51, fat 19.10, sugar 3.67. Half and half 10 % (NDB 01049): 81.24, 10.39, 4.13 |
| `butter`        | Unsalted                                                                  | Baking recipes usually call for unsalted butter and add salt separately                                    | Salted (NDB 01001): water 15.87, fat 81.11, sugar 0.06, salt 1.61 (Na 643 × 2.5)                                                                       |
| `milk-powder`   | Skim milk powder (instant, as sold to consumers)                          | The milk powder sold in Canadian groceries for baking                                                      | Whole milk powder (NDB 01090): water 2.47, fat 26.71, sugar 38.42                                                                                      |
| `maple-syrup`   | Canadian maple syrup (NDB 19911)                                          | A Canadian-specific SR row exists                                                                          | Generic maple syrup (NDB 19353): water 32.39, fat 0.06, sugar 60.46                                                                                    |
| `egg`           | Raw, fresh, without shell                                                 | The contract's `egg` is the whole egg as added                                                             | Frozen pasteurized whole egg (NDB 01171): water 75.81, fat 9.95                                                                                        |
| `salt`          | Table salt                                                                | Canadian table salt is iodized; SR28's row has no additive detail                                          | Sea or kosher salt: no SR row                                                                                                                          |
| `sugar`         | White granulated sugar                                                    | The default "sucre"                                                                                        | Brown sugar (NDB 19334): water 1.34, sugar 97.02 (a different product, not this entry)                                                                 |
| `olive-oil`     | SR28 "Oil, olive, salad or cooking" (no grade)                            | The only olive oil row                                                                                     | Extra virgin vs refined: not distinguished by SR28                                                                                                     |
| `cider-vinegar` | SR28 "Vinegar, cider" (acidity not stated)                                | The only cider vinegar row                                                                                 | —                                                                                                                                                      |

## Entries with values "if sourced"

| id                   | Source                                                              | water     | fat     | sugar   | carbohydrate | protein     | fibre   | salt        | Status / reason                                                                                                                                                                                                                                                                                                                       |
| -------------------- | ------------------------------------------------------------------- | --------- | ------- | ------- | ------------ | ----------- | ------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fresh-yeast`        | `USDA SR28 (2015), NDB 18374, Yeast, baker's, compressed; Na × 2.5` | 69.0      | 1.9     | 0       | 18.1         | 8.4         | 8.1     | 0.08        | Sourced: SR28 has the product. Sum 97.5. Old analysis; strains and brands vary, no range available.                                                                                                                                                                                                                                   |
| `active-dry-yeast`   | `USDA SR28 (2015), NDB 18375, Yeast, baker's, active dry; Na × 2.5` | 5.08      | 7.61    | 0       | 41.22        | 40.44       | 26.9    | 0.13        | Sourced. Sum 94.5. Fibre is SR28's dietary fibre (yeast cell-wall glucans and mannans).                                                                                                                                                                                                                                               |
| `instant-yeast`      | —                                                                   | unknown   | unknown | unknown | unknown      | unknown     | unknown | unknown     | No SR28 row for instant yeast. Active dry values are not transferred: the contract keeps a value without a source unknown.                                                                                                                                                                                                            |
| `baking-powder`      | `USDA SR28 NDB 18369/18370, Baking powder, double-acting`           | 4.5 ± 0.5 | 0       | 0       | 25.9 ± 1.8   | 0.05 ± 0.05 | 0.2     | **unknown** | Range between SR28's two double-acting powders (sodium aluminium sulfate, NDB 18369; straight phosphate, NDB 18370); the Canadian retail formulation was not checked. Carbohydrate is the starch filler. **Salt stays unknown**: the sodium (7 893 to 10 600 mg) is in bicarbonate and acid salts, not NaCl, so × 2.5 would be false. |
| `meringue`           | —                                                                   | unknown   | unknown | unknown | unknown      | unknown     | unknown | unknown     | SR28 has meringue pies but no plain meringue product.                                                                                                                                                                                                                                                                                 |
| `diastatic-malt`     | —                                                                   | unknown   | unknown | unknown | unknown      | unknown     | unknown | unknown     | SR28 "Barley malt flour" (NDB 20131: water 8.21, fat 1.84, sugar 0.80) does not state enzymatic activity, so it is not attributed to a diastatic product. Diastatic power: no source; unknown.                                                                                                                                        |
| `non-diastatic-malt` | —                                                                   | unknown   | unknown | unknown | unknown      | unknown     | unknown | unknown     | The entry has no form (powder or syrup). SR28 "Syrups, malt" (NDB 19352: water 21.10, fat 0, sugar 71.30) covers the syrup only; a candidate if the owner restricts the entry to syrup.                                                                                                                                               |

pH: no entry has a well-sourced pH in the sources read; all stay unknown.

## Category entries (unknown by design)

`nuts`, `seeds`, `dried-fruit`, `fresh-fruit` and `sourdough-starter` name categories, not products.
Their composition ranges across members far beyond any useful uncertainty (fresh fruit water,
nut fat, a starter's hydration chosen by the baker), so every value stays `unknown`, as the contract
says. `water` is pure water for the formula (`kind: 'water'`); its composition is not applicable.

## Reproduction

The SR28 rows were extracted outside the application, without the engine:

```bash
curl -sSO https://registry.npmjs.org/fda-nutrient-database/-/fda-nutrient-database-1.0.2.tgz
sha1sum fda-nutrient-database-1.0.2.tgz   # d5d37da30e05fcd176724b916cf86d6085bbc3d5
tar xzf fda-nutrient-database-1.0.2.tgz
python3 - package/data <<'EOF'
import sys
d = sys.argv[1]
rows = lambda f: ([x.strip('~') for x in l.rstrip('\r\n').split('^')] for l in open(f, encoding='latin-1'))
names = {r[0]: r[2] for r in rows(d + '/FOOD_DES.txt')}
for r in rows(d + '/ABBREV.txt'):
    if r[0] in {'02047','19335','19911','19353','19296','04053','01145','01001','01079','01077',
                '01091','01092','01053','01123','01124','01125','02048','18374','18375',
                '18369','18370','20131','19352'}:
        # SR28 ABBREV columns: water, kcal, protein, fat, ash, carbohydrate, fibre, sugars, ..., sodium
        print(r[0], names[r[0]], 'water', r[2], 'prot', r[4], 'fat', r[5], 'carb', r[7],
              'fibre', r[8], 'sugar', r[9], 'Na mg', r[15])
EOF
```

The same files are published by USDA ARS as the SR28 ASCII release; checking that the redistributed
files match it, and reading each row on FoodData Central (SR Legacy) and in the CNF, is the open
verification step.

## Open items

- Read the CNF 2015 rows for the Canadian variants (2 % milk, 35 % cream, butter, skim milk powder,
  maple syrup) from a network that reaches `food-nutrition.canada.ca`, and replace or widen the
  ranges above with them.
- Confirm the SR28 rows against FoodData Central SR Legacy, in particular unsalted butter water
  (17.94 in SR28, 16.2 in mirrors of SR Legacy).
- The owner confirms the variant choices (milk 2 %, cream 35 %, unsalted butter, skim milk powder).
- Decide whether structurally absent constituents ship as `known` 0 and whether `salt` follows the
  × 2.5 factor or the stoichiometric one (note 1).
