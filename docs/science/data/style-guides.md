# Selected recipe reference values and provenance

Selected complete source snapshots verified on 2026-10-10, followed by an editorial preset pass on 2026-10-11 under the owner handoff in issue #34. Source records and reference values describe one coherent published variant, not consensus or model validation. Implemented preset data is a separate declaration of editable editorial choices, copied without running the prediction engine. Canonical percentages retain precision; only the UI rounds. Ingredient composition estimates remain separate from recipe quantities.

The JSON companion is the canonical source-data record. No prediction engine was used to choose any formula, duration or reference value. Preset revisions preserve stable IDs; previous saved recipes and bake snapshots keep their own copied values.

Source quantities are kept separately from the declared implementation. Unknown ingredient compositions remain unknown; existing composition presets are estimates, not measurements in the cited recipes. Bounds and conflicting yields are explicitly identified. Optional branches are documented, not automatically added to the selected schedule.

Recipe transformations (poolish, biga, tangzhong, yudane, cold retard, whole grain and enrichment) remain follow-on work.

## baguette — preset v2

[Classic Baguettes Recipe](https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe) — PJ Hamel. Primary published recipe; poolish branch.

Full source read: 2026-10-10T18:45:13.030395+00:00. Snapshot SHA-256: `4f7a5d8b4e7331dd0d5a7b031c3aca6ffbfc9d49f6af73619cb1eda8c8371469`. Corpus key: `9a883c4e2070f924`.

**Original measures.** Poolish: 120 g AP flour, 113 g cool water, 1/16 tsp yeast. Final dough: 420 g AP flour, 255 g lukewarm water, 12 g table salt, 1.5 tsp yeast, all of the poolish.

**Normalized source formula.** Total flour 540 g (120 g poolish + 420 g final). Water 368 g (68.148%). Salt 12 g (2.222%). Instant yeast conditional chart conversion 4.6875 g (0.8681%). Poolish: 22.222% of total flour, 94.167% hydration.

**Published process.** Poolish 14 h at room temperature; mix ~4 min; bulk 45 min, fold, 45 min; divide into 3 pieces, bench 15-60 min; shape; proof 45-60 min at ~20 °C (68 °F); bake 450 °F (232.2 °C) 24-28 min on stone with steam.

**Selected preset and editorial choices.** King Arthur Baking — Classic Baguettes (https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe). Selected primary published recipe; poolish branch with instant yeast. Original measures: 540 g total flour (120 g poolish + 420 g final dough), 368 g water (113 g poolish [94.167 % hydration] + 255 g final [68.148 % total hydration]), 12 g table salt (2.222 %). Instant yeast: 1/16 tsp poolish + 1.5 tsp final; converted using KAB weight chart (3 g/tsp) to 0.1875 g poolish (0.0347 % total flour) and 4.5 g final, totaling 4.6875 g (0.8681 %). Editorial planned values: poolish 14 h at 21 °C (room unspecified); mix 4 min; bulk 90 min at 21 °C with 1 fold at 45 min; divide 10 min (editorial default); bench rest 37.5 min (midpoint of 15–60 min); shape 10 min (editorial default); proof 52.5 min (midpoint of 45–60 min) at sourced 20 °C (68 °F); preheat 30 min (editorial default) to 450 °F (232 °C); bake 26 min (midpoint of 24–28 min) on stone or pan with steam; cool 60 min (editorial default). Optional ADY branch and 3 h low-yeast bulk alternative omitted.

**Evidence gaps and conflicts.** Poolish is 94.167% hydration, not traditional 100%. Instant yeast conversion is conditional; ADY is an alternative in source.

| Reference key     |      Low |     High | Basis / note                                                                                                                                  |
| ----------------- | -------: | -------: | --------------------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     |  68.1481 |  68.1481 | % total flour; source-derived. 368 g water / 540 g total flour = 68.148%                                                                      |
| salt_pct          |  2.22222 |  2.22222 | % total flour; source-derived. 12 g salt / 540 g total flour = 2.222%                                                                         |
| preferment_pct    |  22.2222 |  22.2222 | % total flour in poolish; source-derived. 120 g flour / 540 g total flour = 22.222%                                                           |
| yeast_instant_pct | 0.868056 | 0.868056 | % total flour; conditional KAB instant yeast chart conversion, 3 g/tsp. 4.6875 g instant yeast chart conversion / 540 g total flour = 0.8681% |
| poolish_h         |       14 |       14 | h at room temperature; source-derived. Source states about 14 h                                                                               |
| bulk_h            |      1.5 |      1.5 | h at room temperature; source-derived. 45 min + fold + 45 min = 90 min                                                                        |
| proof_h           |     0.75 |        1 | h at ~20 °C; source-derived. Source states 45 min to 1 h (68 °F)                                                                              |
| bake_c            |      232 |      232 | °C, stone with steam; source-derived. 450 °F = 232.2 °C                                                                                       |
| bake_min          |       24 |       28 | min; source-derived. Source states 24 to 28 min                                                                                               |

## boule-dutch-oven — preset v4

[Jim Lahey's No-Knead Bread](https://leitesculinaria.com/99521/recipes-jim-laheys-no-knead-bread.html) — David Leite / Jim Lahey. Attributed Lahey recipe; publication/adaptation lineage.

Full source read: 2026-10-10T18:45:13.196597+00:00. Snapshot SHA-256: `db746aede88c90b42b87b96d5175a6f213cdb01c8761d168c4f1be28ea3c388f`. Corpus key: `68e03e83a9cff046`.

**Original measures.** 3 cups AP or bread flour, 1 1/3 cups lukewarm water, 1/4 tsp instant yeast, 1 1/4 tsp salt.

**Normalized source formula.** Conditional KAB chart normalization: AP flour 360 g (120 g/cup), water 302.667 g (84.074%), instant yeast 0.75 g (0.2083%), table salt 7.5 g (2.083%).

**Published process.** Mix ~30 s; bulk at least 12 h, preferably 18 h at ~22.2 °C (72 °F); fold and round; rise ~2 h on towel; preheat 6-8 qt pot at 450 °F (232 °C) 30 min; bake covered 30 min + uncovered 15-30 min.

**Selected preset and editorial choices.** Leite’s Culinaria — Jim Lahey’s No-Knead Bread (https://leitesculinaria.com/99521/recipes-jim-laheys-no-knead-bread.html). Attributed Lahey recipe (Sullivan Street Bakery) via David Leite. Normalized measures using KAB weight chart: 3 cups AP flour (360 g), 1 1/3 cups lukewarm water (302.667 g, 84.074 % hydration), 1/4 tsp instant yeast (0.75 g, 0.2083 %), 1 1/4 tsp salt with explicit table-salt assumption (6 g/tsp = 7.5 g, 2.083 %). Direct dough, no preferment. Editorial planned values: mix 30 s (sourced); bulk planned at 15 h (editorial midpoint of 12–18 h range, noting source’s preferred 18 h recommendation) at sourced ideal 22.2 °C (72 °F); shape/fold 10 min (editorial default); proof 2 h (sourced) at 21 °C (room unspecified); preheat 30 min (sourced) with 6–8 qt lidded Dutch oven at 450 °F (232 °C); bake planned at 52.5 min (editorial midpoint of 45–60 min: 30 min covered + 22.5 min uncovered [15–30 min range]) at 450 °F (232 °C); cool 60 min (sourced: at least 1 h).

**Evidence gaps and conflicts.** Volume-to-weight assumptions materially affect hydration: 302.667 g water / 360 g flour gives 84.074%; using 140 g flour per cup instead would give 72.063%. Salt kind is unspecified; table salt is an explicit editorial conversion assumption.

| Reference key     |      Low |     High | Basis / note                                                                                                                           |
| ----------------- | -------: | -------: | -------------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     |  84.0741 |  84.0741 | % flour; conditional volume conversion; table salt assumption. 302.67 g water / 360 g AP flour = 84.074% via standard chart conversion |
| salt_pct          |  2.08333 |  2.08333 | % flour; conditional volume conversion; table salt assumption. 7.5 g table salt assumption / 360 g flour = 2.083%                      |
| yeast_instant_pct | 0.208333 | 0.208333 | % flour; conditional volume conversion; table salt assumption. 0.75 g instant yeast / 360 g flour = 0.2083%                            |
| bulk_h            |       12 |       18 | h at 22 °C (72 °F); source-derived. Source states at least 12 h, preferably about 18 h                                                 |
| proof_h           |        2 |        2 | h; source-derived. Source states about 2 h                                                                                             |
| bake_c            |      232 |      232 | °C, covered pot then uncovered; source-derived. 450 °F = 232.2 °C                                                                      |
| bake_min          |       45 |       60 | min; source-derived. 30 min covered + 15-30 min uncovered = 45-60 min                                                                  |

## ciabatta — preset v4

[Ciabatta (professional formula)](https://www.kingarthurbaking.com/pro/formulas/ciabatta) — King Arthur Baking. Professional published formula.

Full source read: 2026-10-10T18:45:13.310760+00:00. Snapshot SHA-256: `f06c0ef860c8af5597f24df2ae835135c13cf3d350435becd4e29bbdec682137`. Corpus key: `e22cac474bfe2c78`.

**Original measures.** 10 kg flour, 7.6 kg water, 0.2 kg salt, 0.12 kg yeast (unspecified form). Biga: 3 kg flour, 1.8 kg water, 0.003 kg yeast.

**Normalized source formula.** Total flour 10 kg (100%), water 7.6 kg (76%), salt 0.2 kg (2%), yeast 0.12 kg (1.2% unspecified form). Biga: 30% prefermented flour, 60% component hydration.

**Published process.** Biga ~16 h at room temperature; mix 3 min 1st speed + 4-5 min 2nd speed; DDT 75 °F (23.9 °C); bulk 2 h with fold at 1 h; divide 0.57 kg rectangles; proof ~1 h; bake 460 °F (237.8 °C) ~36 min with steam.

**Selected preset and editorial choices.** King Arthur Baking — Professional Ciabatta (https://www.kingarthurbaking.com/pro/formulas/ciabatta). Professional published formula. Original measures: 10 kg total flour (Sir Galahad flour), 7.6 kg water (76 %), 0.2 kg salt (2 %), 0.12 kg yeast (1.2 %). Biga: 3 kg flour (30 % preferment), 1.8 kg water (60 % component hydration), 3 g yeast (0.03 % total flour); ripened ~16 h at 21 °C (room unspecified). Final dough additions: 7 kg flour, 5.8 kg water, 200 g salt, 117 g yeast. Evidence gap: yeast form is unspecified in the professional source; preserved as an inline dough ingredient without yeast marker, with unknown composition, avoiding unsupported assumptions of fresh vs instant. Editorial planned values: mix 7.5 min (3 min low speed + 4.5 min medium speed [midpoint of 4–5 min range]) with DDT 23.9 °C (75 °F) at 21 °C room; bulk 2 h at 21 °C with 1 fold at 1 h; divide 10 min (editorial default) into 0.57 kg rectangles; proof 1 h at 21 °C (room unspecified); preheat 30 min (editorial default); bake 36 min at 460 °F (238 °C) with steam; cool 60 min (editorial default).

**Evidence gaps and conflicts.** Yeast form is unspecified in source (1.2% total). Preserved as inline dough ingredient with unknown composition, not converted to instant.

| Reference key      | Low | High | Basis / note                                                                        |
| ------------------ | --: | ---: | ----------------------------------------------------------------------------------- |
| hydration_pct      |  76 |   76 | % total flour; source-derived. 7.6 kg water / 10 kg flour = 76%                     |
| salt_pct           |   2 |    2 | % total flour; source-derived. 0.2 kg salt / 10 kg flour = 2%                       |
| preferment_pct     |  30 |   30 | % total flour in biga; source-derived. 3 kg flour in biga / 10 kg total flour = 30% |
| biga_hydration_pct |  60 |   60 | % biga flour; source-derived. 1.8 kg water / 3 kg biga flour = 60%                  |
| biga_h             |  16 |   16 | h at room temperature; source-derived. Source states about 16 hours                 |
| bulk_h             |   2 |    2 | h with fold at 1 h; source-derived. Source states 2 hours with a fold after 1 hour  |
| proof_h            |   1 |    1 | h; source-derived. Source states about 1 hour                                       |
| bake_c             | 238 |  238 | °C, with steam; source-derived. 460 °F = 237.8 °C -> 238 °C                         |
| bake_min           |  36 |   36 | min; source-derived. Source states approximately 36 minutes for 0.57 kg loaves      |

## bagels — preset v3

[Water Bagels](https://www.kingarthurbaking.com/recipes/water-bagels-recipe) — Arnold Golfman / King Arthur Baking. Primary published recipe; same-day water-bagel variant.

Full source read: 2026-10-10T18:47:27.948433+00:00. Snapshot SHA-256: `92086947f199b484a72a93cbf725509b6e8340a019333635c29a5723b8ac135f`. Corpus key: `61425846cc9ee199`.

**Original measures.** Dough: 690 g AP flour, 454 g lukewarm water, 35 g non-diastatic malt powder, 25 g sugar, 18 g table salt, 2 1/4 tsp yeast. Water bath: 1814 g water, 18 g malt powder, 14 g sugar.

**Normalized source formula.** Flour 690 g (100%), water 454 g (65.797%), malt powder 35 g (5.072%), sugar 25 g (3.623%), salt 18 g (2.609%), instant yeast conditional conversion 6.75 g (0.9783%). Bath excluded from dough totals.

**Published process.** Mix and knead to smoothness; bulk 1-1.5 h to double; divide into 16 rings; no separately timed final proof; simmer 30 s per side (60 s total); bake 425 °F (218.3 °C) ~20 min.

**Selected preset and editorial choices.** King Arthur Baking — Water Bagels (https://www.kingarthurbaking.com/recipes/water-bagels-recipe). Selected primary published recipe; same-day water bagel variant by Arnold Golfman. Original measures: 690 g AP flour, 454 g water (65.797 %), 35 g non-diastatic malt powder (5.072 %), 25 g granulated sugar (3.623 %), 18 g table salt (2.609 %), 6.75 g instant yeast (0.9783 %, converted from 2 1/4 tsp via KAB weight chart at 3 g/tsp). Malt represented as inline non-diastatic malt powder with unknown composition, avoiding substitution with barley malt syrup or diastatic malt. External water bath (1814 g water, 18 g malt powder, 14 g sugar) and optional toppings excluded from dough formula. Editorial planned values: mix 8 min (editorial default, source unstated); bulk 75 min (midpoint of 1–1.5 h range to double) at 21 °C (room unstated); divide 10 min (editorial default) into 16 pieces; shape 10 min (editorial default); no separate final proof prescribed (dough moves directly from shaping to simmering bath); preheat 30 min (editorial default) to 425 °F (218 °C); simmer planned at 10 min (editorial batch logistics for 16 bagels in batches of 3–4, simmered 30 s per side); bake 20 min on parchment-lined sheet at 425 °F (218 °C); cool 60 min (editorial default). Overnight refrigeration alternative omitted to retain same-day baseline.

**Evidence gaps and conflicts.** Selected same-day AP flour variant. No separate final proof or mandatory cold retard is given. ADY mass is unspecified; instant conversion is conditional.

| Reference key          |      Low |     High | Basis / note                                                                                                                    |
| ---------------------- | -------: | -------: | ------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct          |  65.7971 |  65.7971 | % flour; source-derived. 454 g water / 690 g flour = 65.797%                                                                    |
| salt_pct               |   2.6087 |   2.6087 | % flour; source-derived. 18 g salt / 690 g flour = 2.609%                                                                       |
| sugar_pct              |  3.62319 |  3.62319 | % flour; source-derived. 25 g sugar / 690 g flour = 3.623%                                                                      |
| non_diastatic_malt_pct |  5.07246 |  5.07246 | % flour non-diastatic malt powder; source-derived. 35 g malt powder / 690 g flour = 5.072%                                      |
| yeast_instant_pct      | 0.978261 | 0.978261 | % flour; conditional KAB instant yeast chart conversion, 3 g/tsp. 6.75 g instant yeast chart conversion / 690 g flour = 0.9783% |
| bulk_h                 |        1 |      1.5 | h at room temperature; source-derived. Source states 1 to 1 1/2 hours                                                           |
| simmer_per_side_s      |       30 |       30 | seconds per side, per bagel; batch schedule is editorial; source-derived. Source states simmer 30 seconds on each side          |
| bake_c                 |      218 |      218 | °C, sheet pan; source-derived. 425 °F = 218.3 °C -> 218 °C                                                                      |
| bake_min               |       20 |       20 | min; source-derived. Source states about 20 minutes                                                                             |

## focaccia — preset v4

[Big and Bubbly Focaccia Recipe](https://www.kingarthurbaking.com/recipes/big-and-bubbly-focaccia-recipe) — King Arthur Test Kitchen / Martin Philip. Primary published recipe; high-hydration pan variant.

Full source read: 2026-10-10T18:45:14.019637+00:00. Snapshot SHA-256: `1328fb702bc074fc707f42dac7b67e402a79006d425173f2d9d9e88537806e47`. Corpus key: `53d10cd489cc8a4b`.

**Original measures.** Dough: 360 g AP flour, 284 g warm water, 9 g table salt, 5 g sugar, 3 g instant yeast, 18 g EVOO. Pan & topping: 26 g EVOO, flaky salt.

**Normalized source formula.** Flour 360 g (100%), water 284 g (78.889%), salt 9 g (2.5%), sugar 5 g (1.389%), instant yeast 3 g (0.8333%), dough EVOO 18 g (5.0%). External pan/top EVOO 26 g excluded from dough.

**Published process.** Mix, rest 15 min; 4 bowl-fold sets separated by 15 min rests (45 min folding phase); bulk 1 h at 70-75 °F (21.1-23.9 °C); transfer to oiled 9-in square pan; pan rise 1-1.5 h; dimple and top; bake 475 °F (246.1 °C) 15-18 min; optional 1-2 min broil; finish 5-7 min on rack in switched-off oven. Ingredient note gives desired finished dough 82–86 F; target 29 C is editorial. Pan proof ambient is described qualitatively as warm room temperature.

**Selected preset and editorial choices.** King Arthur Baking — Big and Bubbly Focaccia (https://www.kingarthurbaking.com/recipes/big-and-bubbly-focaccia-recipe). High-hydration pan variant (one 9-inch square pan). Original measures: 360 g all-purpose flour, 284 g water (78.889 %), 18 g olive oil in dough (5.0 %), 9 g table salt (2.5 %), 5 g sugar (1.389 %), 3 g instant yeast (0.833 %). Non-dough exclusions: 26 g divided olive oil (pan coating and top drizzle) and flaky sea salt topping are excluded from dough. Sourced vs. editorial choices: mix duration is 8 min editorial default (unspecified in source); DDT 29 °C is editorial midpoint of sourced 82–86 °F (27.8–30.0 °C); bulk is 2 h (four bowl fold sets at 15 min intervals followed by 1 h rest) at 22.5 °C (midpoint of sourced 70–75 °F / 21.1–23.9 °C); pan transfer/stretch is 10 min editorial default; pan proof temperature 22.5 °C is an editorial reuse of the bulk setting; duration is 75 min (midpoint of sourced 1–1.5 h) at 22.5 °C; preheat is 30 min editorial default at 475 °F (246 °C); lower-rack bake is 16.5 min (midpoint of sourced 15–18 min) at 475 °F (246 °C), optional broil omitted; rack finish is 6 min (midpoint of sourced 5–7 min) directly on lower rack in a switched-off oven using residual heat (no active temperature setpoint); cooling is 60 min editorial default.

**Evidence gaps and conflicts.** Selected high-hydration KAB pan variant. Residual-heat finish must not be modeled as continuous 475 °F bake. The optional broil branch is not required by this preset.

| Reference key     |      Low |     High | Basis / note                                                                                      |
| ----------------- | -------: | -------: | ------------------------------------------------------------------------------------------------- |
| hydration_pct     |  78.8889 |  78.8889 | % flour; source-derived. 284 g water / 360 g flour = 78.889%                                      |
| oil_pct           |        5 |        5 | % flour dough EVOO; source-derived. 18 g EVOO / 360 g flour = 5.0% (external 26 g excluded)       |
| salt_pct          |      2.5 |      2.5 | % flour; source-derived. 9 g salt / 360 g flour = 2.5%                                            |
| sugar_pct         |  1.38889 |  1.38889 | % flour; source-derived. 5 g sugar / 360 g flour = 1.389%                                         |
| yeast_instant_pct | 0.833333 | 0.833333 | % flour; source-derived. 3 g instant yeast / 360 g flour = 0.8333%                                |
| proof_h           |        1 |      1.5 | h pan rise at warm room temp; source-derived. Source states 1 to 1 1/2 hours                      |
| bake_c            |      246 |      246 | °C, 9-in square pan; source-derived. 475 °F = 246.1 °C -> 246 °C                                  |
| bake_min          |       15 |       18 | min in pan; source-derived. Source states 15 to 18 min in pan (plus 5-7 min in switched-off oven) |

## brioche — preset v2

[Classic Brioche Loaf (Brioche Nanterre)](https://www.meilleurduchef.com/en/recipe/brioche-loaf.html) — Chef Philippe. Primary published Nanterre recipe.

Full source read: 2026-10-10T18:47:52.629536+00:00. Snapshot SHA-256: `51d20b5f97dcbbeb4ac31f8ab3ee17e396c3d5dac4a75899b22bd3afe94dffdb`. Corpus key: `8af767714a82b4c7`.

**Original measures.** 500 g flour T45, 300 g whole eggs, 250 g unsalted butter, 60 g castor sugar, 10 g salt, 20 g fresh baker's yeast. Egg wash separate.

**Normalized source formula.** Flour 500 g (100%), whole eggs 300 g (60%), butter 250 g (50% ingredient mass), sugar 60 g (12%), salt 10 g (2%), fresh yeast 20 g (4%). No water or milk in dough.

**Published process.** Knead 2 min low + 8 min medium speed; incorporate butter gradually; keep dough <= 26 °C; bulk 30 min at room temp; degas; chill at least 1 h or overnight; divide into 50 g balls (7 per tin); proof 2 h in proofer at 28 °C; fan bake 180 °C 25-30 min.

**Selected preset and editorial choices.** Meilleur du Chef / Chef Philippe — Classic Brioche Loaf (https://www.meilleurduchef.com/en/recipe/brioche-loaf.html; Nanterre loaf). Formula: 500 g T45 flour (100 %), 300 g whole eggs (60 %), 250 g butter (50 % ingredient mass), 60 g castor sugar (12 %), 10 g salt (2 %), 20 g fresh baker's yeast (4 %). Direct dough with no milk or pure water; egg wash (1 egg, pinch of salt) and optional pearl sugar excluded from dough. Process: mix 18 min (2 min low speed + 8 min medium speed, plus editorial 8 min for gradual butter incorporation; editorial DDT target 24 °C, below sourced <=26 °C ceiling); bulk 30 min at editorial 21 °C room; degas 1 min (editorial); retard 1 h cold at editorial 4 °C fridge (sourced minimum of >=1 h cold; overnight branch preserved in notes); divide 10 min into 50 g balls (editorial); shape 10 min into 7 balls per tin (editorial); proof 2 h in proofer at sourced 28 °C; preheat 30 min (editorial default); bake in fan oven at 180 °C for 27.5 min (editorial midpoint of sourced 25–30 min range); cool 60 min (editorial default). Fresh yeast composition unknown beyond form; T45 protein unstated.

**Evidence gaps and conflicts.** Formula contains no milk or pure water. Overnight duration is unspecified in source (states 'at least 1 hour, or overnight'); selected minimum 1 h cold.

| Reference key     | Low | High | Basis / note                                                                                                   |
| ----------------- | --: | ---: | -------------------------------------------------------------------------------------------------------------- |
| egg_pct           |  60 |   60 | % flour whole eggs; source-derived. 300 g eggs / 500 g flour = 60%                                             |
| butter_pct        |  50 |   50 | % flour butter ingredient mass; source-derived. 250 g butter / 500 g flour = 50% ingredient mass               |
| sugar_pct         |  12 |   12 | % flour; source-derived. 60 g sugar / 500 g flour = 12%                                                        |
| salt_pct          |   2 |    2 | % flour; source-derived. 10 g salt / 500 g flour = 2.0%                                                        |
| cold_retard_min_h |   1 |    1 | h minimum chilling; source-derived. At least one hour cold; no upper bound or numeric overnight time supplied. |
| proof_h           |   2 |    2 | h at 28 °C; source-derived. Source specifies 2 h in proofer at 28 °C                                           |
| bake_c            | 180 |  180 | °C fan oven; source-derived. Source specifies fan oven 180 °C                                                  |
| bake_min          |  25 |   30 | min; source-derived. Source specifies 25 to 30 min                                                             |

## burger-buns — preset v3

[Beautiful Burger Buns Recipe](https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe) — Ellen Dorsey ('Moomie') / King Arthur Baking. Published recipe attributed to community origin.

Full source read: 2026-10-10T18:45:14.502905+00:00. Snapshot SHA-256: `135818d8cc5f59e01dd7913bd335b5889fb704d274ce2fafab80447306316bd7`. Corpus key: `ce96cca57ce30bc8`.

**Original measures.** Dough: 420 g AP flour, 198 g lukewarm water, 28 g room-temp butter, 1 large egg, 50 g sugar, 1 1/4 tsp table salt, 1 tbsp (9 g) instant yeast. Glaze: 43 g melted butter, 1 egg white + 2 tbsp cold water, seeds.

**Normalized source formula.** Flour 420 g (100%), water 198 g (47.143%), butter 28 g (6.667% ingredient mass), sugar 50 g (11.905%), instant yeast 9 g (2.143%), egg assumed 50 g (11.905%), salt chart conversion 7.5 g (1.786%). Glaze butter 43 g separate.

**Published process.** Mix and knead to smooth dough; bulk 1-2 h to nearly double; divide into 8 buns (~100 g each), flatten to 3-in; proof ~1 h to puffy; brush with melted butter glaze; bake 375 °F (190.6 °C) 15-18 min.

**Selected preset and editorial choices.** King Arthur Baking / Ellen Dorsey ("Moomie") — Beautiful Burger Buns (https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe). Formula: 420 g AP flour (100 %), 198 g lukewarm water (47.143 %), 28 g room-temperature butter (6.667 % ingredient mass), 50 g granulated sugar (11.905 %), 9 g instant yeast (2.143 %), 1 large egg assumed 50 g (11.905 %), table salt 1 1/4 tsp normalized to 7.5 g via KAB chart (1.786 %). No milk or preferment in dough. Separate butter glaze (43 g melted butter) and optional seed topping (1 egg white + 2 tbsp cold water, sesame seeds) excluded from dough. Process: mix 8 min (editorial default for unsourced mix duration) at editorial 21 °C room; bulk 1.5 h (editorial midpoint of sourced 1–2 h range) at editorial 21 °C room; deflate and divide 10 min into 8 buns (~95 g each, sourced ~100 g claim; editorial duration); shape 10 min into balls and flatten to 3 inches (editorial duration); proof 60 min (sourced "about an hour") at editorial 21 °C room; preheat 30 min (editorial default); bake 16.5 min (990 s, editorial midpoint of sourced 15–18 min range) on baking sheet at 375 °F (191 °C converted); cool 60 min on rack (editorial default).

**Evidence gaps and conflicts.** Core liquid is pure water, not milk. Alternative home recipes with milk volumes lack weighed milk mass.

| Reference key     |     Low |    High | Basis / note                                                                                                   |
| ----------------- | ------: | ------: | -------------------------------------------------------------------------------------------------------------- |
| hydration_pct     | 47.1429 | 47.1429 | % flour water; source-derived. 198 g water / 420 g flour = 47.143%                                             |
| egg_pct           | 11.9048 | 11.9048 | % flour whole egg; source-derived. 1 large egg assumed 50 g / 420 g flour = 11.905%                            |
| butter_pct        | 6.66667 | 6.66667 | % flour butter ingredient mass; source-derived. 28 g dough butter / 420 g flour = 6.667% (43 g glaze excluded) |
| sugar_pct         | 11.9048 | 11.9048 | % flour; source-derived. 50 g sugar / 420 g flour = 11.905%                                                    |
| salt_pct          | 1.78571 | 1.78571 | % flour; source-derived. 7.5 g salt chart conversion / 420 g flour = 1.786%                                    |
| yeast_instant_pct | 2.14286 | 2.14286 | % flour; source-derived. 9 g instant yeast / 420 g flour = 2.143%                                              |
| bulk_h            |       1 |       2 | h at room temperature; source-derived. Source states 1 to 2 hours                                              |
| proof_h           |       1 |       1 | h at room temperature; source-derived. Source states about an hour                                             |
| bake_c            |     191 |     191 | °C, baking sheet; source-derived. 375 °F = 190.6 °C -> 191 °C                                                  |
| bake_min          |      15 |      18 | min; source-derived. Source states 15 to 18 min                                                                |

## pullman — preset v3

[Pain de Mie (Modernist Cuisine Vol 4 p.296 Errata)](https://modernistcuisine.com/wp-content/uploads/2018/12/BREAD_Vol4_296_Errata.pdf) — Nathan Myhrvold, Francisco Migoya / Modernist Cuisine. Primary professional errata/formula.

Full source read: 2026-10-10T18:49:13.451630+00:00. Snapshot SHA-256: `54b6d4214ab789658f3fa66fd079a5e6f98fe086b6499b4f9d3fdf995d4361e4`. Corpus key: `54b5b9aaeba0fe99`.

**Original measures.** 560 g bread flour, 360 g water, 5 g instant osmotolerant yeast, 35 g softened butter, 25 g sugar, 10 g fine salt, 2 g malt syrup. Total dough 997 g.

**Normalized source formula.** Flour 560 g (100%), water 360 g (64.286%), butter 35 g (6.25% ingredient mass), sugar 25 g (4.464%), salt 10 g (1.786%), malt syrup 2 g (0.357%), instant yeast 5 g (0.893%).

**Published process.** Mix 10-17 min; DDT 24-26 °C; bulk 1.5 h with 1 fold at 45 min; shape bâtard 1-2 min; proof in lidded 13x4x4-in pan either 1.5-2 h at 27 °C/65% RH or 2.5-3 h at 21 °C; bake home 200 °C (390 °F) 45-60 min + 10 min vented out of pan, or convection 185 °C 30-35 min + 10 min vented. Proof with the lid off; put the lid on before baking. Selected 21 C proof and 200 C home oven branches are coupled; convection settings remain alternatives.

**Selected preset and editorial choices.** Modernist Cuisine — Pain de Mie, volume 4 p.296 errata (https://modernistcuisine.com/wp-content/uploads/2018/12/BREAD_Vol4_296_Errata.pdf; home oven branch in 13x4x4-inch lidded Pullman pan). Formula: 560 g bread flour (100 %), 360 g water (64.286 % pure water), 35 g softened butter (6.25 % ingredient mass), 25 g sugar (4.464 %), 10 g fine salt (1.786 %), 5 g osmotolerant instant yeast (0.893 %), 2 g barley malt syrup (0.357 % ingredient mass). Total dough 997 g. No milk, egg, or preferment in formula. Net lipid/moisture table in errata reports net compositions rather than added baker percentages. Process: machine mix 13.5 min (810 s, editorial midpoint of sourced 10–17 min range; DDT setpoint 25 °C within sourced 24–26 °C range); bulk ferment 1.5 h at editorial 21 °C room with 1 fold after 45 min recorded in technique; shape oblong bâtard 1.5 min (90 s, editorial midpoint of sourced 1–2 min range); final proof in lidded 13x4x4-inch pan selects 21 °C room branch for 2.75 h (9900 s, editorial midpoint of sourced 2.5–3 h range at 21 °C; proofer branch 1.5–2 h at 27 °C/65 % RH preserved in science notes); preheat 30 min (editorial default); home bake phase 1 covered in lidded pan at 200 °C for 52.5 min (3150 s, editorial midpoint of sourced 45–60 min range); home bake phase 2 vented inverted on wire rack at 200 °C for 10 min (600 s); cool 60 min (editorial default). Convection alternative 185 °C for 30–35 min + 10 min vented preserved in notes.

**Evidence gaps and conflicts.** Formula contains no milk or egg. Pure water percentage differs from milk-based pain de mie variants.

| Reference key     |      Low |     High | Basis / note                                                                                                                                      |
| ----------------- | -------: | -------: | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     |  64.2857 |  64.2857 | % flour pure water; source-derived. 360 g water / 560 g flour = 64.286%                                                                           |
| butter_pct        |     6.25 |     6.25 | % flour butter ingredient mass; source-derived. 35 g butter / 560 g flour = 6.25%                                                                 |
| sugar_pct         |  4.46429 |  4.46429 | % flour; source-derived. 25 g sugar / 560 g flour = 4.464%                                                                                        |
| salt_pct          |  1.78571 |  1.78571 | % flour; source-derived. 10 g salt / 560 g flour = 1.786%                                                                                         |
| malt_syrup_pct    | 0.357143 | 0.357143 | % flour; source-derived. 2 g malt syrup / 560 g flour = 0.357%                                                                                    |
| yeast_instant_pct | 0.892857 | 0.892857 | % flour; source-derived. 5 g osmotolerant instant yeast / 560 g flour = 0.893%                                                                    |
| dough_g_13in      |      997 |      997 | g per 13x4x4-in pan; source-derived. Total recipe yield 997 g fills 13x4x4 pan                                                                    |
| bulk_h            |      1.5 |      1.5 | h at room temperature; source-derived. Source states 1 1/2 h total with fold at 45 min                                                            |
| proof_h           |      2.5 |        3 | h (1.5-2 h at 27 °C or 2.5-3 h at 21 °C); source-derived. Source gives 1.5-2 h at 27 °C or 2.5-3 h at 21 °C                                       |
| bake_c            |      200 |      200 | °C (185 °C convection / 200 °C home); source-derived. Source specifies 185 °C convection or 200 °C home                                           |
| bake_min          |       55 |       70 | min total including vented finish; source-derived. Convection: 30-35 min + 10 min vented (40-45 min); Home: 45-60 min + 10 min vented (55-70 min) |

## shokupan — preset v2

[Japanese Milk Bread Recipe](https://www.kingarthurbaking.com/recipes/japanese-milk-bread-recipe) — Charlotte Rutledge. Primary published tangzhong variant.

Full source read: 2026-10-10T18:45:15.504307+00:00. Snapshot SHA-256: `0cf4cd8ea63201b6733d4f89957a516b8c65369827caead865b7cb2891e37411`. Corpus key: `7cbcad31576e2dee`.

**Original measures.** Tangzhong: 14 g bread flour, 43 g water, 43 g milk. Dough: 300 g bread flour, 14 g dry milk, 50 g sugar, 6 g table salt, 1 tbsp instant yeast, 113 g milk, 1 large egg, 57 g melted butter.

**Normalized source formula.** Total bread flour 314 g (100%). Pure water 43 g (13.694%), total milk 156 g (49.682%), dry milk 14 g (4.459%), sugar 50 g (15.924%), salt 6 g (1.911%), butter 57 g (18.153% ingredient mass), egg assumed 50 g (15.924%), instant yeast chart conversion 9 g (2.866%). Scald flour 4.459%.

**Published process.** Cook scald 3-5 min, cool to lukewarm; mix dough ~15 min; bulk 1-1.5 h to puffy; divide 4 pieces, letter-fold and roll into logs; proof in 9x5-in pan 40-50 min; brush with milk; bake 350 °F (176.7 °C) 30-35 min.

**Selected preset and editorial choices.** King Arthur Baking / Charlotte Rutledge — Japanese Milk Bread (https://www.kingarthurbaking.com/recipes/japanese-milk-bread-recipe; tangzhong loaf in 9x5-inch pan). Formula: 314 g bread flour total (14 g tangzhong + 300 g final dough); 43 g pure water (13.694 % of total flour), allocated entirely to tangzhong (scald hydration 307.143 % relative to scald flour); 156 g whole milk (49.682 % of total flour), allocated 43 g to tangzhong (43/314*100 = 13.694 % of total flour) and 113 g to final dough; 14 g dry milk powder (4.459 %, inline ingredient with unknown composition); 50 g granulated sugar (15.924 %); 6 g table salt (1.911 %); 57 g unsalted butter (18.153 % ingredient mass); 1 large egg assumed 50 g (15.924 %); instant yeast 1 tbsp normalized via KAB chart to 9 g (2.866 %). Separate milk wash excluded from dough. Process: tangzhong cooked 4 min (editorial midpoint of sourced 3–5 min range) on low heat, then cooled to lukewarm (editorial cooling duration 60 min, separate from the 4 min cook step); machine mix/knead 15 min (sourced "almost 15 minutes") at editorial 21 °C room; bulk 75 min (editorial midpoint of sourced 1–1.5 h range) at editorial 21 °C room; deflate and divide 10 min into 4 equal pieces (~170–175 g each; editorial duration); shape 10 min into rolled logs and arrange in greased 9x5-inch loaf pan (editorial duration); proof 45 min (editorial midpoint of sourced 40–50 min range) at editorial 21 °C room; preheat 30 min (editorial default); bake 32.5 min (1950 s, editorial midpoint of sourced 30–35 min range) at 350 °F (177 °C converted) in 9x5-inch loaf pan; cool 60 min on rack (editorial default).

**Evidence gaps and conflicts.** Enriched tangzhong variant; does not represent yudane or direct shokupan formulas. Large egg mass assumed 50 g. Exact combined scald liquid/flour ratio is 86/14 = 6.142857, often rounded to about 6:1. Separate cook and cool steps are editorial schedule declarations; no evaporation is modeled.

| Reference key     |      Low |     High | Basis / note                                                                                                                |
| ----------------- | -------: | -------: | --------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     |  13.6943 |  13.6943 | % total flour pure water in tangzhong; source-derived. 43 g water / 314 g total flour = 13.694%                             |
| milk_pct          |  49.6815 |  49.6815 | % total flour whole milk; source-derived. 156 g milk (43 g tangzhong + 113 g dough) / 314 g flour = 49.682%                 |
| liquid_pct        |  63.3758 |  63.3758 | % total flour water + milk; source-derived. 199 g liquid / 314 g flour = 63.376%                                            |
| scald_flour_pct   |   4.4586 |   4.4586 | % total flour in tangzhong; source-derived. 14 g flour / 314 g total flour = 4.459%                                         |
| butter_pct        |  18.1529 |  18.1529 | % flour butter ingredient mass; source-derived. 57 g butter / 314 g flour = 18.153%                                         |
| sugar_pct         |  15.9236 |  15.9236 | % flour; source-derived. 50 g sugar / 314 g flour = 15.924%                                                                 |
| salt_pct          |  1.91083 |  1.91083 | % flour; source-derived. 6 g salt / 314 g flour = 1.911%                                                                    |
| egg_pct           |  15.9236 |  15.9236 | % flour whole egg; source-derived. 1 large egg assumed 50 g / 314 g flour = 15.924%                                         |
| yeast_instant_pct |  2.86624 |  2.86624 | % flour; conditional KAB instant yeast chart conversion, 3 g/tsp. 9 g instant yeast chart conversion / 314 g flour = 2.866% |
| bulk_h            |        1 |      1.5 | h at room temperature; source-derived. Source states 1 to 1 1/2 hours                                                       |
| proof_h           | 0.666667 | 0.833333 | h in 9x5-in pan; source-derived. Source states 40 to 50 minutes (0.67 to 0.83 h)                                            |
| bake_c            |      177 |      177 | °C, 9x5-in pan; source-derived. 350 °F = 176.7 °C -> 177 °C                                                                 |
| bake_min          |       30 |       35 | min; source-derived. Source states 30 to 35 minutes                                                                         |

## pizza-neo-neapolitan — preset v3

[72-Hour Pizza Dough](https://bakingsteel.com/blogs/recipes/72-hour-pizza-dough-recipe) — Andris Lagsdin. Author adaptation explicitly acknowledging Jim Lahey lineage; domestic-steel variant.

Full source read: 2026-10-10T18:47:28.994365+00:00. Snapshot SHA-256: `7b6907618506c0b051104fa63b5846f811f6b9cb165e3e19d588bb2162b2d65a`. Corpus key: `37dae8df7843875e`.

**Original measures.** 500 g bread flour, 350 g room-temp water, 16 g sea salt, 1 g instant yeast.

**Normalized source formula.** Bread flour 500 g (100%), water 350 g (70%), salt 16 g (3.2%), instant yeast 1 g (0.2%). Total dough 867 g; 3 balls = 289 g each derived.

**Published process.** Mix/knead 2-3 min in bowl; bulk 24 h at room temperature; refrigerate 48 h cold bulk; divide into 3 balls; proof covered 3-4 h at room temperature; preheat steel 60 min at 500-550 °F (260-287.8 °C); bake 5-8 min.

**Selected preset and editorial choices.** Baking Steel / Andris Lagsdin — 72-Hour Pizza Dough (https://bakingsteel.com/blogs/recipes/72-hour-pizza-dough). Domestic Baking Steel variant (adaptation of Jim Lahey no-knead lineage for home baking steel). Original measures: 500 g bread flour, 350 g water (70 %), 16 g sea salt (3.2 %), 1 g instant yeast (0.2 %). Total dough weight 867 g, yielding 3 balls of ~289 g each for 12–14 inch pizzas. Sourced vs. editorial choices: mix is 2.5 min (midpoint of sourced 2–3 min in-bowl knead); unstated room temperature is 21 °C editorial default for mix, initial bulk, divide, and final proof; cold retard is 48 h at editorial 4 °C fridge; "72-hour" name covers the 24 h room bulk + 48 h cold retard, excluding the subsequent divide and final room-temperature proof; divide/ball is 10 min editorial default; final proof is 3.5 h (midpoint of sourced 3–4 h); preheat is 60 min sourced preheat on Baking Steel at 274 °C (midpoint of sourced 500–550 °F / 260–288 °C); bake is 6.5 min (midpoint of sourced 5–8 min) at 274 °C on Baking Steel.

**Evidence gaps and conflicts.** Distinct from other Baking Steel pages (e.g. 72% water ADY version); this is the verified 70% instant yeast recipe.

| Reference key     | Low | High | Basis / note                                                                                    |
| ----------------- | --: | ---: | ----------------------------------------------------------------------------------------------- |
| hydration_pct     |  70 |   70 | % flour; source-derived. 350 g water / 500 g flour = 70%                                        |
| salt_pct          | 3.2 |  3.2 | % flour; source-derived. 16 g salt / 500 g flour = 3.2%                                         |
| yeast_instant_pct | 0.2 |  0.2 | % flour; source-derived. 1 g instant yeast / 500 g flour = 0.2%                                 |
| ball_g            | 289 |  289 | g per ball; source-derived. 867 g total dough / 3 balls = 289 g each                            |
| bulk_h            |  24 |   24 | h at room temperature; source-derived. Source specifies 24 hours at room temperature            |
| cold_retard_h     |  48 |   48 | h in refrigerator; source-derived. Source specifies refrigerate for 48 hours                    |
| proof_h           |   3 |    4 | h at room temperature after balling; source-derived. Source specifies 3 to 4 hours at room temp |
| bake_c            | 260 |  288 | °C, on preheated steel; source-derived. 500 to 550 °F = 260 to 287.8 °C -> 260-288 °C           |
| bake_min          |   5 |    8 | min; source-derived. Source states 5 to 8 minutes                                               |

## pizza-roman — preset v3

[Pizza Scrocchiarella Romana](https://molinovigevano.com/guide/pizza-scrocchiarella-romana/) — Gabriele Valdes. Primary professional guide with two distinct formulas.

Full source read: 2026-10-10T18:45:15.534330+00:00. Snapshot SHA-256: `b9d7ef3ba186ad9a956d6bff20ca9bc8e12db23fd1ded674a28bcf6cfc1f2f87`. Corpus key: `4baa45c2520e7aae`.

**Original measures.** Direct branch: 1 kg tipo 0 W 280-300, 600 g water, 26 g sea salt, 2 g fresh yeast. No oil/sugar.

**Normalized source formula.** Flour 1000 g (100%), water 600 g (60%), salt 26 g (2.6%), fresh yeast 2 g (0.2%). W 280-300. Ball mass 180 g.

**Published process.** Mix in 1st speed to development; DDT ~24 °C; bulk ~1 h covered; staglio 180 g balls; rest 90 min at 22-25 °C; fridge +4 °C, use within 48 h; roll thin with rolling pin; bake <= 350 °C 120-180 s.

**Selected preset and editorial choices.** Molino Vigevano / Gabriele Valdes — Pizza Scrocchiarella Romana (https://molinovigevano.com/pizza-scrocchiarella-romana/). Direct method with cold fermentation (not the 40 % poolish branch). Original formula: 1,000 g tipo 0 flour (W 280–300), 600 g water (60 %), 26 g fine sea salt (2.6 %), 2 g fresh yeast (0.2 %). Total dough weight 1,628 g, dividing into 180 g balls for thin, crispy tonda romana. No dough fat or sugar. Sourced vs. editorial choices: retains professional pizza oven (≤350 °C, 120–180 s; midpoint 2.5 min = 150 s), not converted to domestic oven; mix duration is 8 min editorial default; DDT 24 °C is sourced; bench bulk is 1 h at editorial room 21 °C; divide is 10 min editorial default into 180 g balls; ambient ball rest is 90 min at 23.5 °C (midpoint of sourced 22–25 °C); cold retard is 24 h editorial duration at sourced 4 °C (source prescribes "use within 48 h" without establishing a mandatory minimum duration); warm-up/temper before rolling is 2 h editorial default at 21 °C; stretch/roll is 10 min editorial default; preheat is 30 min editorial default at 350 °C. The source specifies tipo 0, represented by generic flour rather than incorrectly marking it tipo 00.

**Evidence gaps and conflicts.** Poolish branch exists in same source (40% poolish, 4 g yeast). Retard is flexible up to 48 h, not mandatory 48 h.

| Reference key     | Low | High | Basis / note                                                                                                                                                      |
| ----------------- | --: | ---: | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     |  60 |   60 | % flour; source-derived. 600 g water / 1000 g flour = 60%                                                                                                         |
| salt_pct          | 2.6 |  2.6 | % flour; source-derived. 26 g salt / 1000 g flour = 2.6%                                                                                                          |
| flour_w           | 280 |  300 | W; source-derived. Source specifies tipo 0 W 280-300                                                                                                              |
| ball_g            | 180 |  180 | g per ball; source-derived. Source specifies 180 g balls                                                                                                          |
| bulk_h            |   1 |    1 | h covered on bench; source-derived. Source specifies circa un'ora                                                                                                 |
| proof_h           | 1.5 |  1.5 | h at 22-25 °C; source-derived. Source specifies 90 min at 22-25 °C                                                                                                |
| cold_retard_max_h |  48 |   48 | h in fridge at +4 °C; source-derived. Use within 48 hours is a maximum availability window, not a minimum fermentation requirement.                               |
| bake_max_c        | 350 |  350 | °C pizza oven; source-derived. Upper oven limit from guide context, not a separately prescribed setpoint for the direct formula; 350 C is an editorial selection. |
| bake_min          |   2 |    3 | min; source-derived. Source specifies 120 to 180 seconds                                                                                                          |

## pizza-teglia — preset v3

[Disciplinare di produzione della Autentica Pizza in Teglia alla Romana](https://laconfraternitadellapizza.net/documenti/Disciplinare-Autentica-Pizza-In-Teglia-Alla-Romana.pdf) — La Confraternita della Pizza. Normative standard with explicit 48 h example.

Full source read: 2026-10-10T18:45:16.036924+00:00. Snapshot SHA-256: `33af459efd3479efb3e3d88a5f31bb47e3ed246498d42ad5f9b9de961363ed60`. Corpus key: `ca75ae7aec46f858`.

**Original measures.** Machine example for 40x60 cm pan: 725 g flour W 300-380, 580 g water at 4 °C, 18 g salt, 15 g EVOO, 4 g compressed fresh yeast. Total 1342 g.

**Normalized source formula.** Flour 725 g (100%), water 580 g (80%), salt 18 g (2.483%), oil 15 g (2.069%), compressed fresh yeast 4 g (0.552%). General standard yeast range: 2-6 g/kg flour (0.2-0.6%).

**Published process.** Machine mix 20-25 min with 4 °C water; DDT 18-26 °C (pref 21-23 °C); bench ~1 h (0.5-1.5 h depending on DDT); fridge ~44 h at 4 °C (total 48 h); staglio; appretto 3-4 h at room temp until core >= 19 °C; stretch in oiled blue-steel pan; electric deck bake: floor 300-320 °C, top 200 °C, 8-13 min.

**Selected preset and editorial choices.** La Confraternita della Pizza — Disciplinare Autentica Pizza in Teglia alla Romana (https://laconfraternitadellapizza.net/documenti/Disciplinare-Autentica-Pizza-In-Teglia-Alla-Romana.pdf). Normative disciplinare 48 h machine-mixed example for a 40×60 cm blue-steel pan (teglia in ferro blu). Original formula: 725 g flour (W 300–380), 580 g water at 4 °C (80 %), 18 g salt (2.483 %), 15 g olive oil (2.069 %), 4 g compressed fresh yeast (0.552 %). Total dough ~1,342 g. Sourced vs. editorial choices & equipment: retains professional electric deck oven; generic ambient temperature is left unset because floor (platea 300–320 °C) and top (cielo 200 °C) have independent controls; bake duration is 10.5 min (midpoint of sourced 8–13 min); water at 4 °C is an ingredient operating temperature, not an ambient proofing condition; machine mix duration is 22.5 min (midpoint of sourced 20–25 min); target DDT is 22 °C (midpoint of preferred 21–23 °C range); bench rest is 1 h (tied to finished dough temperature in source); room 21 °C is an editorial default, not a published ambient fact; cold retard is 44 h at sourced 4 °C; staglio (divide) is 10 min editorial default; appretto (proof) is 3.5 h (midpoint of sourced 3–4 h) at editorial room 21 °C; stesura (pan stretch) is 10 min editorial default; dough core must be ≥19 °C before stretching into lightly oiled blue-steel pan; cooling is 60 min editorial default on wire rack.

**Evidence gaps and conflicts.** Disciplinare allows 75-100% water and 24-72 h fermentation; the 80% / 48 h example is selected here.

| Reference key |     Low |    High | Basis / note                                                                                                                        |
| ------------- | ------: | ------: | ----------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct |      80 |      80 | % flour; source-derived. 580 g water / 725 g flour = 80% (standard allows 75-100%)                                                  |
| flour_w       |     300 |     380 | W; source-derived. Disciplinare Art. 3 specifies W 300-380                                                                          |
| salt_pct      | 2.48276 | 2.48276 | % flour; source-derived. 18 g salt / 725 g flour = 2.483% (25 g/kg)                                                                 |
| oil_pct       | 2.06897 | 2.06897 | % flour EVOO; source-derived. 15 g EVOO / 725 g flour = 2.069% (20 g/kg)                                                            |
| bulk_h        |       1 |       1 | h puntata depending on DDT; source-derived. Selected machine-mixed 48-hour example; other methods and general windows are separate. |
| cold_retard_h |      44 |      44 | h in fridge at 4 °C; source-derived. Selected machine-mixed 48-hour example; other methods and general windows are separate.        |
| proof_h       |       3 |       4 | h appretto at room temp; source-derived. Disciplinare specifies 3 to 4 hours appretto until core >= 19 °C                           |
| bake_min      |       8 |      13 | min electric deck oven; source-derived. Disciplinare specifies 8 to 13 min (floor 300-320 °C, top 200 °C)                           |

## pizza-new-york — preset v3

[The Best New York Style Pizza Dough](https://feelingfoodish.com/the-best-new-york-style-pizza-dough/) — Marie Pinto Bialek. Author recipe acknowledging pizzamaking/Tom Lehmann influence.

Full source read: 2026-10-10T18:53:17.542441+00:00. Snapshot SHA-256: `146da64268c435a9b67a94cc844322e900e2daf01acb811db010d309a6a12029`. Corpus key: `e79cd92b229bc97f`.

**Original measures.** Metric branch: 796 g flour, 493 g water, 3.5 g instant yeast, 15.6 g salt, 7.8 g sugar, 11.8 g olive oil. Total dough 1327.7 g.

**Normalized source formula.** Flour 796 g (100%), water 493 g (61.935%), instant yeast 3.5 g (0.4397%), salt 15.6 g (1.960%), sugar 7.8 g (0.980%), olive oil 11.8 g (1.482%). 4 balls = 331.9 g each.

**Published process.** Mix and knead 4-5 min (longer for next-day use); divide into 4 balls; refrigerate at least 24 h, up to 72 h; bring to room temp within 20-60 min before bake; preheat stone/steel at 550 °F (287.8 °C) >= 1 h; bake 4-6 min.

**Selected preset and editorial choices.** Feeling Foodish / Marie — The Best New York Style Pizza Dough (https://feelingfoodish.com/the-best-new-york-style-pizza-dough/). Metric branch for four 14-inch pizzas (distinct from US volume branch). Original formula: 796 g bread flour, 493 g water (61.935 %), 15.6 g salt (1.960 %), 7.8 g sugar (0.980 %), 11.8 g olive oil (1.482 %), 3.5 g instant dry yeast (0.4397 %). Yield conflict noted: Total formula dough weight is 1,327.7 g (4 × 331.9 g), which conflicts with the source text claim of four 11.5 oz (~326 g) dough balls (1,304 g total). Sourced vs. editorial choices: mix is 4.5 min (midpoint of sourced 4–5 min); DDT 27 °C is an editorial target informed by the qualitative high-70s to low-80s °F guidance; divide/ball is 10 min editorial default; cold retard is 48 h (midpoint of sourced 24–72 h range; author notes day 3 is optimal) at editorial 4 °C fridge; temper/relaxation is 40 min (midpoint of 20–60 min body guidance / within 1 h) at editorial 21 °C room; stretch and top is 10 min editorial default; preheat is 60 min sourced preheat at 550 °F (288 °C) on stone/steel; bake is 5 min (midpoint of sourced 4–6 min) at 550 °F (288 °C).

**Evidence gaps and conflicts.** Derived ball mass (331.9 g) conflicts with author's 326 g text note. Cup and metric amounts differ in source; metric branch used. DDT remains qualitative high-70s to low-80s F; 27 C is an editorial target, not an exact source interval.

| Reference key     |      Low |     High | Basis / note                                                                                                                                |
| ----------------- | -------: | -------: | ------------------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     |  61.9347 |  61.9347 | % flour; source-derived. 493 g water / 796 g flour = 61.935%                                                                                |
| oil_pct           |  1.48241 |  1.48241 | % flour olive oil; source-derived. 11.8 g olive oil / 796 g flour = 1.482%                                                                  |
| sugar_pct         | 0.979899 | 0.979899 | % flour; source-derived. 7.8 g sugar / 796 g flour = 0.980%                                                                                 |
| salt_pct          |   1.9598 |   1.9598 | % flour; source-derived. 15.6 g salt / 796 g flour = 1.960%                                                                                 |
| yeast_instant_pct | 0.439698 | 0.439698 | % flour; source-derived. 3.5 g instant yeast / 796 g flour = 0.4397%                                                                        |
| ball_g            |  331.925 |  331.925 | g per ball; source-derived. Derived 1327.7 / 4 = 331.925 g; source conflicting 326 g claim retained as a conflict, not merged into a range. |
| cold_retard_h     |       24 |       72 | h in refrigerator; source-derived. Source specifies overnight up to 72 hours (24 to 72 h)                                                   |
| proof_h           | 0.333333 |        1 | h tempering at room temp; source-derived. Source specifies 20 to 60 minutes before baking                                                   |
| bake_c            |      288 |      288 | °C, stone or steel; source-derived. 550 °F = 287.8 °C -> 288 °C                                                                             |
| bake_min          |        4 |        6 | min; source-derived. Source specifies 4 to 6 minutes                                                                                        |

## pizza-sicilian — preset v3

[Sicilian-Style Pizza Recipe](https://www.kingarthurbaking.com/recipes/sicilian-style-pizza-recipe) — Charlotte Rutledge / King Arthur Baking. Primary published pan-pizza adaptation.

Full source read: 2026-10-10T18:45:17.445836+00:00. Snapshot SHA-256: `d322a83324ad87482048ba6aa64a86c955976ba94aab95782de8a923297b3220`. Corpus key: `3764ddba1d10117b`.

**Original measures.** Crust: 540 g High-Gluten Flour, up to 397 g lukewarm water, 12 g table salt, 2 tsp instant yeast, optional 8 g pizza flavor. Topping: 14 g olive oil, 227 g sliced onion, 227 g sauce, 340 g mozzarella.

**Normalized source formula.** Flour 540 g (100%), water up to 397 g (73.519%), salt 12 g (2.222%), instant yeast chart conversion 6 g (1.111%). Dough fat is 0% (14 g olive oil belongs to onion topping). Total dough mass 955 g.

**Published process.** Knead to very soft dough; bulk 1 h at room temp (optional fridge up to 24 h); stretch into oiled 18x13-in pan with 10-15 min relaxations; pan proof 1-2 h; bake 450 °F (232.2 °C): bare crust 10-12 min, topped 15-20 min. During pan stretching, relax 10–15 min and repeat as needed until the pan is filled.

**Selected preset and editorial choices.** King Arthur Baking — Sicilian-Style Pizza (https://www.kingarthurbaking.com/recipes/sicilian-style-pizza-recipe). Same-day pan pizza adaptation for an 18×13-inch half-sheet pan (the optional up to 24 h refrigeration is documented as an alternative branch, not forced into the baseline). Original formula: 540 g high-gluten flour, up to 397 g water (up to 73.519 %), 12 g table salt (2.222 %), 2 tsp instant yeast (6 g via KAB weight chart, 1.111 %). Non-dough exclusions: the listed 14 g olive oil belongs exclusively to the sautéed onion topping, not the dough. Pan coating oil, 8 g optional pizza flavor, and toppings (onions, tomato sauce, anchovies, mozzarella, herbs) are excluded from dough. Sourced vs. editorial choices: mix is 8 min editorial default at editorial room 21 °C; bulk is 1 h at editorial room 21 °C (same-day branch); pan/stretch is 10 min editorial default in oiled half-sheet pan; pan proof is 1.5 h (midpoint of sourced 1–2 h) at editorial room 21 °C; preheat is 30 min editorial default at 450 °F (232 °C); two-stage bake: par-bake untopped crust for 11 min (midpoint of sourced 10–12 min) at 450 °F (232 °C); 10 min editorial default assembly; final bake 17.5 min (midpoint of sourced 15–20 min) at 450 °F (232 °C); rest is 10 min sourced rest before slicing.

**Evidence gaps and conflicts.** Source states 'using just enough water... up to 397 g'. 14 g olive oil is in the topping ingredient section, not dough.

| Reference key      |     Low |    High | Basis / note                                                                                                                |
| ------------------ | ------: | ------: | --------------------------------------------------------------------------------------------------------------------------- |
| hydration_max_pct  | 73.5185 | 73.5185 | % flour (up to); source-derived. Up to 397 g water / 540 g flour = 73.519%                                                  |
| salt_pct           | 2.22222 | 2.22222 | % flour; source-derived. 12 g salt / 540 g flour = 2.222%                                                                   |
| yeast_instant_pct  | 1.11111 | 1.11111 | % flour; conditional KAB instant yeast chart conversion, 3 g/tsp. 6 g instant yeast chart conversion / 540 g flour = 1.111% |
| oil_pct            |       0 |       0 | % flour in dough; source-derived. 0% in dough (14 g topping oil excluded)                                                   |
| dough_g_half_sheet |     955 |     955 | g per 18x13-in pan; source-derived. 540 g flour + 397 g water + 12 g salt + 6 g yeast = 955 g                               |
| bulk_h             |       1 |       1 | h at room temperature; source-derived. Source specifies 1 hour at room temp                                                 |
| proof_h            |       1 |       2 | h pan rise; source-derived. Source specifies 1 to 2 hours in pan                                                            |
| bake_c             |     232 |     232 | °C, half-sheet pan; source-derived. 450 °F = 232.2 °C -> 232 °C                                                             |
| bake_min           |      25 |      32 | min total (10-12 bare + 15-20 topped); source-derived. 10-12 min bare crust + 15-20 min topped = 25 to 32 min               |

## pizza-chicago — preset v3

[Chicago Deep-Dish Pizza (Baking School Module 4)](https://bakefromscratch.com/wp-content/uploads/2022/04/Module-4-Low-Res.pdf) — Bake from Scratch. Primary published recipe; cornmeal home variant.

Full source read: 2026-10-10T19:04:35.076477+00:00. Snapshot SHA-256: `55337e29cda49758d28c281297097f7decc75b8c4d409e9169baae8acee7c9a7`. Corpus key: `96b9a5c9b67b4cec`.

**Original measures.** Dough: 219 g AP flour, 38 g fine yellow cornmeal, 4.5 g kosher salt, 3 g instant yeast, 4 g sugar, 160 g hot water (49-54 °C), 14 g olive oil, 14 g melted butter. Pan butter: 10 g. Sauté oil: 14 g.

**Normalized source formula.** All-grain denominator 257 g (219 g wheat + 38 g cornmeal). Cornmeal 14.786% all-grain (17.352% wheat). Water 160 g (62.257% all-grain). Kosher salt 4.5 g (1.751%). Instant yeast 3 g (1.167%). Sugar 4 g (1.556%). Dough fat 28 g (10.895% combined added mass).

**Published process.** Mix with hot water (120-130 °F / 49-54 °C); knead ~12 min; bulk 30-45 min at 75 °F (24 °C) to double; roll into 13-in circle and press into buttered 10 1/4-in skillet; layer cheese, veggies, meat, sauce; no separate final proof; bake 450 °F (230 °C) 25-30 min, foil after 20 min.

**Selected preset and editorial choices.** Bake from Scratch — Baking School module 4, Chicago Deep-Dish Pizza (https://bakefromscratch.com/wp-content/uploads/2022/04/Module-4-Low-Res.pdf). Cornmeal deep-dish variant baked in a 10¼-inch Lodge cast-iron baker's skillet (noted skillet mismatch: header says "Makes 1 (9-inch) deep-dish pizza", body specifies 10¼-inch skillet; mismatch retained). Original formula: all-grain denominator 257 g total flour composed of 219 g all-purpose flour (85.214 %) and 38 g fine yellow cornmeal (14.786 %). Water 160 g (62.257 % all-grain hydration; 73.059 % wheat-only), kosher salt 4.5 g (1.751 %), instant yeast 3 g (1.167 %), sugar 4 g (1.556 %), dough olive oil 14 g (5.447 %), dough melted butter 14 g (5.447 %). Non-dough exclusions: vegetable oil for sautéing (14 g), skillet butter (10 g), and layered toppings (mushrooms, onion, green bell pepper, Italian sausage, pepperoni, mozzarella, provolone, pizza sauce, Parmesan) are excluded from dough. Sourced vs. editorial choices: hot water 120–130 °F (49–54 °C) is mixing liquid, not dough or ambient temperature; knead duration is 12 min (sourced); bulk rise is 37.5 min (midpoint of sourced 30–45 min) at sourced 75 °F (24 °C); pan/stretch is 10 min editorial default; assembly is 10 min editorial default; no separate final proof stage (dough is assembled and baked immediately); preheat is 30 min editorial default at 450 °F (230 °C); bake is 27.5 min (midpoint of sourced 25–30 min) at 450 °F (230 °C), tented with foil after 20 min; cool is 12.5 min (midpoint of sourced 10–15 min).

**Evidence gaps and conflicts.** Heading states 'Makes 1 (9-inch) deep-dish pizza' but step 5 directs into a 10 1/4-inch skillet; retained mismatch. Red Star Platinum yeast has dough strengtheners. Printed 450 F / 230 C pairing is approximate (450 F converts to 232.2 C); preset explicitly selects the printed 230 C value.

| Reference key     |     Low |    High | Basis / note                                                                                                                                          |
| ----------------- | ------: | ------: | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| hydration_pct     | 62.2568 | 62.2568 | % all-grain flour; source-derived. 160 g water / 257 g all-grain = 62.257% (73.059% wheat-only)                                                       |
| added_fats_pct    | 10.8949 | 10.8949 | % all-grain added fat mass; source-derived. 14 g olive oil + 14 g butter = 28 g fat / 257 g all-grain = 10.895%                                       |
| cornmeal_pct      |  14.786 |  14.786 | % all-grain cornmeal; source-derived. 38 g cornmeal / 257 g all-grain = 14.786% (17.352% wheat-only)                                                  |
| salt_pct          | 1.75097 | 1.75097 | % all-grain; source-derived. 4.5 g kosher salt / 257 g all-grain = 1.751%                                                                             |
| sugar_pct         | 1.55642 | 1.55642 | % all-grain; source-derived. 4 g sugar / 257 g all-grain = 1.556%                                                                                     |
| yeast_instant_pct | 1.16732 | 1.16732 | % all-grain; source-derived. 3 g instant yeast / 257 g all-grain = 1.167%                                                                             |
| bulk_h            |     0.5 |    0.75 | h at 24 °C (75 °F); source-derived. Source specifies 30 to 45 minutes                                                                                 |
| bake_c            |     230 |     230 | °C, cast-iron skillet; source-derived. Printed Celsius choice 230 C; paired 450 F would convert to 232.2 C, a source discrepancy retained explicitly. |
| bake_min          |      25 |      30 | min (cover with foil after 20 min); source-derived. Source specifies 25 to 30 minutes                                                                 |

## Normative reference, outside the shipped preset catalog

AVPN 2024 regulations are a separate traditional-Neapolitan reference, not a sixteenth template or independent confirmation of the home Baking Steel recipe. See the retained normative record in the JSON companion.
