# Published recipe dataset (2026-10)

Provenance and methodology record for the published-recipe dataset `published-recipes-2026-10.json`, collected on 2026-10-29 for Flourprint issue #33 (Chantier 3: Recipe dataset and baseline calibration).

## Provenance and collection

- **Collected**: 2026-10-29.
- **Transcribers**: Autonomous page-reading Claude subagents reading primary web pages, forum threads, brand archives, and culinary references.
- **Verification**: Spot-checked by the coordinator. Full report blocks recorded in issue #33 comments:
  - Breads (27 recipes): [Issue #33 comment 6488264552](https://github.com/Aristotelesqc/Flourprint/issues/33#issuecomment-6488264552)
  - Enriched (23 recipes): [Issue #33 comment 6488253239](https://github.com/Aristotelesqc/Flourprint/issues/33#issuecomment-6488253239)
  - Pizzas (39 recipes): [Issue #33 comment 6488278235](https://github.com/Aristotelesqc/Flourprint/issues/33#issuecomment-6488278235)
- **Primary data companion**: `docs/science/data/published-recipes-2026-10.json` (format: `flourprint-published-recipes/1`).

## Governing transcription rules

1. **Strict source fidelity**: Numbers originate exclusively from the subagent report blocks. No number is guessed, invented, or adjusted from memory or external intuition. If a quantity, duration, or temperature was not explicitly stated in the source, it is transcribed as `null` with `"not_stated"`.
2. **Commercial yeast scope**: Sourced formulas target commercial yeast (`instant`, `active_dry`, `fresh`, or `unspecified`). Sourdough and wild levain recipes are excluded from this baseline evaluation dataset, consistent with the scope of the current fermentation model (`docs/contracts/fermentation.md`).
3. **Strict separation of dough mass**: Baker's percentages are computed strictly relative to total flour in the dough (`flour.total_g`). Ingredients applied externally—such as pan greasing oil, boiling kettle baking soda/honey, brine washes, egg washes, and toppings—are isolated in `outside_dough` and never mixed into the dough baker's percentages.
4. **Independent preservation of dairy and liquid forms**: Fluid milk, eggs, cream, yogurt, and honey remain distinct entries in `dough.milk`, `dough.egg`, or `dough.other`. They are not converted to or collapsed into `dough.water`.
5. **Confidence grading and flag transparency**: Each recipe is classified as `"high"`, `"medium"`, or `"low"` confidence based on source explicitness. Any volume-only conversion, missing schedule duration, aggregator reprint, or page inconsistency is documented in `flags`.
6. **Explicit marking of derived values**: Where a numeric value is computed rather than directly read from the source text, it is explicitly annotated with `"derived": true` or equivalent:
   - For stages: `"duration": "derived"` when days are converted to hours, stage durations are calculated from clock differences, or distinct sub-phases are summed.
   - For temperatures: `"derived": true` inside `temperature` when temperatures are computed as range midpoints (e.g., 20–21 °C → 20.5 °C) or converted from Fahrenheit.
   - For bake: a `"derived": [...]` array inside `bake` naming the derived attributes (`"temp_c"`, `"minutes_min"`, `"minutes_max"`) when bake phases are summed (e.g. 45 min covered + 10 min uncovered) or temperatures are converted.
   - For flour: `"derived": true` inside the specific flour item when its mass is deduced by subtraction from a composite flour total.

## Baseline evaluation modeling rules

The baseline script (`docs/science/scripts/baseline_published.mjs`) adheres to the following domain modeling rules:

- **Commercial yeast with form `"unspecified"`**: Modeled as instant yeast (`water: 5%`, `fat: 4.5%`, `sugar: 0%`) so recipes that allow either active dry or instant (or state "commercial yeast" generically) can be evaluated. Each occurrence is recorded in the recipe's `assumptions` list (`yeast_form_unspecified_assumed_instant`) and counted in the aggregate summary.
- **Preferment-only commercial yeast**: Where yeast is introduced solely in a preferment (poolish, biga, sponge) and not repeated in the main dough list, the yeast is followed and allocated to the formula evaluation (`yeast_preferment_only_allocated_to_formula`).
- **Grams-only yeast dose**: When baker's percentage is missing, the script computes `yeast.pct = (yeast.g / flour.total_g) * 100` (`yeast_pct_computed_from_grams`).
- **Strict `no_commercial_yeast`**: The engine's `unsupported: no_commercial_yeast` classification is strictly reserved for recipes where neither the main dough nor any preferment contains commercial yeast.

## Nature of the evidence: published recipes vs. fermentation measurements

Published recipes are **culinary recommendations**, not physical fermentation measurements. Authors prescribe schedules tailored to kitchen convenience, visual cues ("double in size"), work schedules (overnight cold retardation), or commercial shop constraints. Consequently:

- A published recipe endpoint represents the author's recommended timing, not necessarily an objective physiological progress of 100%.
- Many home-baking recipes tolerate wide fermentation bands or employ deliberately prolonged cold storage where growth is dormant.
- The baseline script evaluates the implied fermentation progress (`progressPct`) under Flourprint's kinetic model to measure dispersion, style-level clustering, and predictive consistency, not to declare published recipes "right" or "wrong".

## Known gaps and exclusions

- **Pullman loaf (4 recipes)**: Limited to 4 distinct independent recipes meeting extraction standards; many online formulas are direct duplicates or adaptations of the King Arthur Classic Sandwich Bread.
- **Roman tonda (4 recipes)**: Round thin Roman pizza has sparse published home formulas with complete fermentation schedules and explicit yeast weights.
- **AVPN international regulation**: The official AVPN specification document was unreadable due to binary PDF rendering constraints during automated extraction; Neapolitan entries rely on accredited pizzeria masters and official technical articles instead.
- **Access-restricted / blocked websites**: Several candidate domains (e.g., Serious Eats, Sally's Baking Addiction, and certain aggregator paywalls) blocked automated HTTP requests or required interactive challenges, necessitating fallback to alternative published authors.
