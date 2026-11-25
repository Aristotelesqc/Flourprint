# Built-in recipe corpus for release 0.3: criteria, recipe card and review

Status: **Proposal for the owner**, documentation only (issue #231). Written 2026-11-18 (UTC),
against `origin/dev` at commit 077a39e. Nothing here changes `packages/`, the app, a template or a
contract. Every criterion, field and recommendation below is a **Proposal** until the owner
approves it; a statement that is a judgement of the author, not a recorded fact, is marked
**Judgement**.

Sources of this document: the owner's direction of 2026-11-15 and 2026-11-18 (UTC), given in
conversation; [ADR 0025](../adr/0025-planning-engine-and-codified-baking-knowledge.md) (on `dev`
only once its pull request merges; read from the branch `docs/adr-0025-product-scope`);
[drafts.md](../contracts/drafts.md) (Templates);
[craft-knowledge.md](../science/craft-knowledge.md) (grid, levels A/B/C, copyright rule);
[readiness-criteria.md](../science/readiness-criteria.md);
[data/style-guides.md](../science/data/style-guides.md) and its `.json` (the record of how the 15
built-in recipes were chosen); the template files in `packages/core/src/application/templates/`
(read, not changed).

## 1. What the owner asked for

- A **solid base corpus** of built-in recipes for release 0.3, that can be extended.
- Every recipe has an **identity**: the style and tradition it represents, a short sourced
  history, the reason it was chosen, what was adapted for a home kitchen, and its sources.
- Example given by the owner: Montreal-style bagels, in the tradition of St-Viateur (Fairmount
  named too), adapted for a domestic electric oven; St-Viateur is an institution that contributed
  to the historic popularity and the survival of the style. The recipe must not be presented as
  St-Viateur's own, because it is not published: "in the tradition of", never "the recipe of".
- **Instant dry yeast** is the reference yeast of every built-in recipe. A source in fresh yeast is
  converted with the engine's own ratio and the conversion is recorded.
- A built-in recipe is **executable at home** (the template rule approved on 2026-11-18 (UTC), text
  in PR #302 and not on `dev` at 077a39e).
- The owner's own recipes may become built-in recipes, clearly attributed as "adapted and tested by
  the owner" (this conflicts with an existing rule; see question C in section 7).

## 2. Selection criteria (Proposal)

A built-in recipe is accepted when it meets criteria 1 to 7 and none of the disqualifiers of
criterion 8. Each criterion is a **Proposal**.

1. **Tradition and fidelity (Proposal).** The recipe represents one named style or tradition, and
   the card says how faithfully, with one of four labels: _specification_ (follows a published
   standard of a trade body), _published recipe_ (one author's recipe, adapted as the card lists),
   _in the tradition of_ (reproduces a style a named institution made known, without being that
   institution's recipe), or _owner-adapted_ (adapted and tested by the owner). A recipe is
   never presented as the own recipe of a bakery, school or person who has not published it.
2. **Quality of the source (Proposal).** Rate the source of the recipe with the grid of
   [craft-knowledge.md](../science/craft-knowledge.md): the source facts (type, recognition,
   longevity, reach, commercial interest, each recorded or `not recorded`), and the claim criteria
   (precision, observable criteria, justification, convergence) giving level A, B or C. The
   ceiling of use in that file applies: a recipe default needs **level B or better**; level C is a
   hypothesis and is not shipped as a recipe. A level reached on an incomplete record is accepted
   only after the missing fields have been looked up in the source (they can raise the level,
   never lower it). A source is read in full and its read status recorded; a source not read is
   not a source.
3. **Executable at home (Proposal, the owner's rule of 2026-11-18 (UTC)).** The five points of PR
   #302 apply: home-scale quantities (a professional batch is scaled by one stated factor kept in
   the record); every bake step has a home-oven temperature from sourced data; no
   professional-only equipment without a sourced home version or an explicit note; no literal
   temperature unit or formula quantity in a step text; yield recorded as pieces only where the
   source states it. The recipe also names what the baker needs beyond an oven (a stone, a Dutch
   oven, a particular pan) and a baker without it must have a stated alternative or the recipe
   says it cannot be made without it.
4. **Complete (Proposal).** Every quantity is weighed (grams), including what is outside the dough
   (pan oil, boiling bath, glaze, topping) or stated to be outside it; a quantity the source gives
   only by volume is converted once, with the conversion recorded and the alternative reading
   noted when the source leaves it open. Every step has its end criterion, or says explicitly that
   the criterion is a time only. The form of the criterion is specified separately (ADR 0025,
   decision 2); this document does not define it.
5. **Reference yeast (Proposal).** The recipe is written in instant dry yeast. A source in fresh
   yeast is converted with the engine's ratio (`docs/contracts/fermentation.md`: fresh equals
   instant divided by 0.33, fresh equals active dry divided by 0.40) and the source form, source
   quantity, ratio and result are recorded. A source that gives a yeast quantity with no form
   cannot ship until the owner chooses the form; the choice is recorded as an assumption, never
   as a source fact.
6. **Place in the corpus (Proposal).** The corpus as a whole covers the techniques and doughs a
   home baker meets: lean, enriched, preferment, cold retard, pan bread, flatbread, pizza styles
   and boiled bread (section 5 lists what is missing). A recipe that duplicates what another
   covers needs a stated reason (a different tradition, technique or equipment).
   A single publisher supplies no more than a stated share of the corpus (**Judgement**: no
   more than one third), so that the corpus does not depend on one site's choices.
7. **Identity complete (Proposal).** The card of section 3 is filled: every history sentence has a
   source, every adaptation has a reason, the reason this recipe was chosen is stated, and what
   is not known is stated.
8. **Disqualifiers (Proposal).** A recipe is not accepted if any of these holds: no source read in
   full; a source at level C that cannot be raised; a quantity or temperature that cannot be
   sourced or derived; a bake that needs equipment a home lacks with no sourced home version;
   a yeast form that is unknown; history or tradition that cannot be sourced (the card then
   states the tradition as `not recorded` and the recipe waits); text that copies a source
   beyond a short quotation (the copyright rule of craft-knowledge.md applies: paraphrase, give
   the URL, no long excerpts, no scans); a recipe presented as the own recipe of someone who has
   not published it.

## 3. The recipe card (Proposal)

The card is the record of a recipe's identity. Part of it is shown to the baker, part stays in the
record. The data model (whether it extends `RecipeTemplate` in drafts.md, which carries only an
English `basis` string) is a contract question and is **not decided here**.

| Field                     | Rule                                                                                                                                                                                                                                                           | Shown to the baker                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| Name and style            | The style the source actually represents, in the words of the source record, not the closest famous name. A stable style code links the recipe to its style guide.                                                                                             | Yes                                           |
| Tradition and origin      | Place and community of the style, and the fidelity label of criterion 1 (_specification_, _published recipe_, _in the tradition of_, _owner-adapted_). A named institution appears only with the wording "in the tradition of" unless it published the recipe. | Yes                                           |
| Short history             | Two to four sentences. Every sentence has a source in the record; a disputed date or claim is stated as disputed with both sources. Paraphrased, never copied.                                                                                                 | Yes                                           |
| Why this recipe           | One or two sentences: what makes this version the one to ship (tradition, source quality, home fit).                                                                                                                                                           | Yes                                           |
| Home adaptations          | A list of: what changed from the source, and why (scale, oven, equipment, yeast form, ingredient availability). A change with no reason is not listed.                                                                                                         | Yes                                           |
| Attribution               | Who published it, who adapted it, who tested it: "published by", "adapted and tested by the owner", "in the tradition of". The owner's name or alias is a decision for the owner (question C).                                                                 | Yes                                           |
| Yeast conversion note     | Source form, source quantity, ratio used, result in instant yeast. A recipe whose source is in instant yeast says "no conversion".                                                                                                                             | One line when a conversion was made           |
| Sources                   | Title, author, publisher, URL, date accessed (UTC, ISO), read status, snapshot hash where one exists. Each source has the source facts of the grid.                                                                                                            | Title, publisher and link; the rest on demand |
| What is not known         | The recipe's open points, as the records state them (a yeast given by volume, a conflicting yield, an unrecorded oven temperature).                                                                                                                            | On demand                                     |
| Evidence level and checks | Level A, B or C with its reason, who and when it was checked (a role, not a model name), the date of the owner's approval.                                                                                                                                     | No (record only)                              |
| Selection record          | Which criteria were checked and how, any exception granted by the owner, and the review date.                                                                                                                                                                  | No (record only)                              |

Rules for shown text:

- Every shown string is a message key with a French and an English entry (ADR 0009); no text is
  hard-coded in a component. This document writes no French UI text; the French entries follow
  the repository rule that UI text never addresses the user.
- A **trade term** is shown only if its definition is available at that place (ADR 0025,
  decision 3): poolish, biga, tangzhong, staglio and the like are either defined or replaced by a
  plain description.
- Shown text is plain and short; the history and the adaptations may be folded behind a control,
  as ADR 0025 decision 4 asks (detail on demand, no forced guidance).
- History and claims follow the copyright rule: paraphrase, URL, no long quotation.

## 4. Review of the 15 built-in recipes against the criteria

Basis: the record of [data/style-guides.json](../science/data/style-guides.json) (full source
snapshots read 2026-10-10), the template files, the register of
[craft-knowledge.md](../science/craft-knowledge.md) and the end-criterion counts of
[readiness-criteria.md](../science/readiness-criteria.md). The record does not say why each of
the 15 was chosen: its method text says only "selected complete source snapshots", "one coherent
published variant, not consensus". No selection criterion is recorded.

Facts of the record that frame the review:

- Seven of the 15 recipes come from one site, King Arthur Baking (baguette, ciabatta, bagels,
  focaccia, burger buns, shokupan, Sicilian pizza). A count of eight is not supported by the record, which lists seven
  (the Pullman loaf is from Modernist Cuisine). No source is a bakery that practises the style.
- Every source is a single recipe page; no recipe is cross-checked against a second source in the
  record ("single verified source baseline", baguette record).
- Nine of the 15 give only durations as end criteria (readiness-criteria.md count): baguette,
  boule, ciabatta, focaccia, brioche, Pullman, 72-hour pizza, Roman scrocchiarella, New York.
- Three are written in fresh yeast (brioche, Roman, teglia) and one has no yeast form (ciabatta).
  The other eleven are in instant yeast. Where the source gave teaspoons, the record converted them
  with a brand's weight chart.

**Levels.** The grid rates a claim, not a recipe. Here the recipe is taken as the claim and the
record's own incomplete fields count as `not recorded`, hence `weak` (the rule of craft-knowledge.md).
Where the register holds an entry for that recipe's claim, its level is quoted; otherwise the level is
a **Judgement** from the record: `C` when the record has durations only, `B` when it also holds a
cue or a measured end condition and the quantities are weighed. All are "on an incomplete record":
observable criteria, justification and convergence are not recorded in the style-guide data for
any of them, so a re-reading of the pages can raise a level but not lower it.

| #   | Built-in (id)                                 | Style the source actually represents                                                                                         | Source (kind)                                                                | Level | Recommendation (Proposal)                                                                         |
| --- | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----- | ------------------------------------------------------------------------------------------------- |
| 1   | Baguette (`baguette`)                         | A poolish baguette from a flour brand's home recipe; poolish at 94.2 % hydration, "not traditional 100 %" per the record     | King Arthur Baking, PJ Hamel (brand recipe page)                             | C     | Keep; the card must add tradition and history                                                     |
| 2   | Dutch-oven boule (`boule-dutch-oven`)         | No-knead covered-pot loaf, Lahey lineage, through a food site: a method, not a regional style                                | Leite's Culinaria, David Leite / Jim Lahey (food site; lineage, not primary) | C     | Keep and rename to its true style ("No-knead Dutch-oven bread"); settle the flour-per-cup reading |
| 3   | Brioche (`brioche`)                           | Brioche Nanterre (loaf), eggs and butter, fresh yeast                                                                        | Meilleur du Chef, Chef Philippe (recipe site)                                | C     | Keep and rename "Brioche Nanterre"; convert yeast; source a home proof                            |
| 4   | Burger buns (`burger-buns`)                   | Soft egg-and-butter burger rolls from a water dough, community origin                                                        | King Arthur Baking, "Moomie" (brand recipe page)                             | B     | Keep as is                                                                                        |
| 5   | Pullman loaf (`pullman`)                      | Pain de mie in a lidded 13x4x4 in pan, professional formula                                                                  | Modernist Cuisine, Myhrvold and Migoya (professional errata)                 | C     | Keep; add a variant for a smaller pan                                                             |
| 6   | Shokupan (`shokupan`)                         | Japanese milk bread, tangzhong variant; "does not represent yudane or direct" formulas (record)                              | King Arthur Baking, C. Rutledge (brand recipe page)                          | B     | Keep as is                                                                                        |
| 7   | Ciabatta (`ciabatta`)                         | Biga ciabatta, a professional 10 kg formula, yeast form unspecified                                                          | King Arthur Baking professional formulas (brand)                             | C     | Replace (or keep scaled once the owner chooses a yeast form)                                      |
| 8   | Bagels (`bagels`)                             | A same-day boiled water bagel with malt, from a brand page; no regional style named in the record                            | King Arthur Baking, A. Golfman (brand recipe page)                           | B     | Keep; add a variant (Montreal pilot, section 6)                                                   |
| 9   | Focaccia (`focaccia`)                         | High-hydration pan focaccia (folded, dimpled), a brand's test-kitchen variant                                                | King Arthur Baking, Test Kitchen / M. Philip (brand recipe page)             | C     | Keep; card adds the tradition                                                                     |
| 10  | Neo-Neapolitan pizza (`pizza-neo-neapolitan`) | A 72-hour, 70 % hydration dough for a home Baking Steel, Lahey lineage: not a Neapolitan pizza by the record's own reference | Baking Steel, A. Lagsdin (equipment maker's blog)                            | C     | Keep and rename to its true style ("72-hour pizza dough on a steel")                              |
| 11  | Roman pizza, tonda (`pizza-roman`)            | Roman "scrocchiarella" thin round pizza, direct method, professional oven at 350 °C or less                                  | Molino Vigevano, G. Valdes (flour miller's guide)                            | C     | Keep and rename "Roman scrocchiarella"; needs a sourced home bake and the yeast conversion        |
| 12  | New York pizza (`pizza-new-york`)             | One home author's New York-style dough, acknowledging a pizzamaking and Tom Lehmann influence, as the record words it        | Feeling Foodish, M. Pinto Bialek (food blog)                                 | C     | Keep (a stronger source can replace it)                                                           |
| 13  | Chicago deep-dish (`pizza-chicago`)           | Cornmeal deep-dish dough in a cast-iron skillet, a baking-school module                                                      | Bake from Scratch, baking school (magazine)                                  | B     | Keep as is; settle the pan size and the topping quantities                                        |
| 14  | Sicilian pizza (`pizza-sicilian`)             | A "Sicilian-style" thick pan pizza, two-stage bake, adaptation by a brand                                                    | King Arthur Baking, C. Rutledge (brand recipe page)                          | B     | Keep as is                                                                                        |
| 15  | Roman pan pizza, teglia (`pizza-teglia`)      | Pizza in teglia alla romana, from a trade body's production standard (the 48 h machine example)                              | La Confraternita della Pizza (trade-body standard)                           | B     | Keep, home-adapted as PR #302 proposes; convert the yeast                                         |

Notes behind the table (record and template facts; **Judgement** is marked):

1. **Baguette.** The register entry on its final proof is level C (2026-11-12 (UTC)): precision
   `partial` (yeast by volume, poolish temperature "room"), the rest `not recorded` or `weak`,
   convergence `weak`. Source form is instant by the brand's weight chart, 3 g per teaspoon; the
   source also allows active dry. The source divides the dough into three pieces; the template
   anchors on the flour mass (breads.ts) and records no pieces. Passes: weighed flour, water and
   salt; home oven with steam on a stone; instant yeast.
2. **Boule.** Register entry level C. The record's own gap: 302.667 g water on 360 g flour gives
   84.074 %, but 140 g of flour per cup instead of 120 g gives 72.063 %; the salt kind is not
   stated. A recipe whose hydration changes by twelve points with the reading of a cup fails
   criterion 4 until one reading is sourced or the owner picks one. Passes: home equipment (a
   covered pot).
   **Judgement:** "boule" is a shape; the source's style is the no-knead method.
3. **Brioche.** Level C. Source in fresh yeast: 20 g on 500 g flour, which at the engine's ratio is
   6.6 g instant (1.32 %), arithmetic only, to be recorded as the conversion. The source proofs
   in a "proofer at 28 °C" and gives the overnight alternative as "at least 1 hour, or
   overnight"; a home baker without a proofer needs a sourced alternative (criterion 3).
4. **Burger buns.** Level B: cues "to nearly double" and "puffy" are recorded. Core liquid is water,
   not milk (record). Passes criteria 2 to 5; history of the style is a modern home roll
   (the card will say the tradition is a modern home bake, `not recorded` otherwise).
5. **Pullman.** Level C on the record (durations), although the source has more cues than the
   summary kept: readiness-criteria.md notes that other Pullman recipes it read carry tin marks
   that the summary does not keep. The source gives an "instant osmotolerant yeast" (a specific product
   type; the instant default needs a note on this). The 13 in lidded pan is uncommon in a home
   (**Judgement**), hence the variant.
6. **Shokupan.** Level B (cue "to puffy"). One quantity is an assumption (a large egg at 50 g).
   The tangzhong is a variant; the card must say that the source is a tangzhong recipe and not a
   statement about all milk breads.
7. **Ciabatta.** The source formula is for 10 kg of flour with 120 g of yeast whose form is not
   stated (record: "preserved as inline dough ingredient with unknown composition, not converted to
   instant"), so the engine has no estimate for it. It fails criteria 3 (scale) and 5 (yeast form).
   PR #302 scales it by one tenth (not on `dev`), which fixes the scale but not the form.
   Recommendation to replace is a **Judgement**: a source that gives a home batch and a yeast form
   would meet criteria 3 and 5 without an assumption; the alternative is to keep the scaled
   formula with the owner's recorded choice of instant yeast.
8. **Bagels.** Level B (a bulk "to double" is recorded). The record says "no separate final proof"
   and the water-bath quantities (1 814 g water, 18 g malt, 14 g sugar) sit in the basis text
   rather than in a step. Yeast: 2 1/4 tsp on 690 g flour, converted by the brand's chart to 6.75 g
   (0.98 %); the baker's reading of the page may differ from the survey's 1.88 %
   (readiness-criteria.md: "not reconciled"). Not Montreal: see section 6.
9. **Focaccia.** Level C on the record (durations; a target dough temperature of 29 °C is
   editorial). The pan oil (26 g) and the flaky salt are outside the dough and sit in the basis;
   the finish with the oven switched off has no temperature (PR #302 lists it as an exception).
   The tradition (a Ligurian origin, if it is one) is not in the repository; it must be read.
10. **Neo-Neapolitan.** Level C. The record holds a normative reference, the AVPN 2024
    international regulations: hydration 55.6 to 62.5 %, salt 2.2 to 3.75 %, total fermentation 12
    to 24 h, a 60 to 90 s bake at a floor of 380 to 430 °C. This recipe is 70 % hydration,
    3.2 % salt, 72 h, 5 to 8 min at 260 to 288 °C on a steel: outside the reference on
    hydration, time and bake, so calling it Neapolitan misstates the style. The record's own trait
    text says "home-oven pizza on a preheated Baking Steel". The AVPN bake needs more than a home
    oven reaches, so a Neapolitan-tradition recipe needs a separate home source (section 5).
    The source is the blog of an equipment maker; whether the maker sells the steel is **Judgement**
    from the name and is to be recorded as a source fact.
11. **Roman tonda.** Level C. Fresh yeast, 2 g on 1 000 g flour: 0.66 g instant at the engine's
    ratio, which a kitchen scale cannot weigh (home-measurements.md: a scale does not weigh 0.1 g;
    a slurry is the stated workaround). The bake as recorded is 120 to 180 s at up to 350 °C
    in a professional oven, "not converted to domestic oven"; PR #302 adds a home bake from two
    other recipes of the survey, so the source of the home values is the survey, not the miller.
    The miller sells flour (a commercial interest to record).
12. **New York.** Level C. Quantities are the author's odd metric values (796 g flour); the record
    notes a 331.9 g ball against the author's 326 g and a qualitative dough temperature. Home
    executable (stone or steel at about 288 °C).
13. **Chicago.** Level B (rise "to double", water at 49 to 54 °C). The source heading says a
    9 in pizza, its step a 10 1/4 in skillet; toppings and sauce are outside the dough with no
    quantities in the template's steps. The yeast is a brand with dough strengtheners (record).
14. **Sicilian.** Level B (a handling rule: relax 10 to 15 min and repeat until the pan is filled;
    the register holds this at level B). Water is "up to 397 g" (the template uses the ceiling);
    the pan oil is in the topping section of the source, outside the dough.
15. **Teglia.** Level B on an incomplete record (weighed, measured core temperature of at least
    19 °C, a standard rather than a blog; justification not recorded, which could raise it
    to A). Fresh yeast: 4 g on 725 g flour, 1.32 g instant at the engine's ratio. The standard's
    bake is an electric deck oven at 300 to 320 °C on the floor and a 40x60 cm blue-steel
    pan: PR #302 re-bases the batch on two home trays and a home bake from the survey. The card
    must say that this is an adaptation of the standard, not the standard.

**What the review shows (Judgement).** Nine of 15 recipes would not pass criterion 2 as recorded
(level C), and the cause is mostly the record, not the sources: the style-guide data kept numbers
and durations and left out cues. Re-reading the nine pages for end criteria is cheaper than
replacing them. Three recipes fail criterion 5 until yeast is converted (brioche, Roman, teglia)
and one cannot be converted (ciabatta). Three fail criterion 3 on equipment or scale (Roman,
teglia, ciabatta) and are being addressed in PR #302. One recipe is named for a style it does not
follow (item 10). Criterion 6 (a single publisher no more than one third) fails: King Arthur
Baking supplies seven of 15.

## 5. Gaps in coverage

Techniques and doughs against the 15 recipes:

| Need           | Covered by                                                                |
| -------------- | ------------------------------------------------------------------------- |
| Lean bread     | baguette, boule, ciabatta                                                 |
| Enriched dough | brioche, burger buns, shokupan                                            |
| Preferment     | poolish (baguette), biga (ciabatta), a cooked scald, tangzhong (shokupan) |
| Cold retard    | brioche, neo-Neapolitan, Roman, New York, teglia                          |
| Pan bread      | Pullman, shokupan                                                         |
| Flatbread      | focaccia only (the only member of the category `flatbread`)               |
| Pizza          | six styles (neo-Neapolitan is not Neapolitan, item 10)                    |
| Boiled bread   | bagels only                                                               |

Gaps, none with a recipe chosen here (no new recipe is chosen by this document):

1. **Whole-grain and rye doughs.** Every built-in uses a white flour (all-purpose, bread, one
   generic flour, plus cornmeal in Chicago). The style-guide record lists whole grain as
   follow-on work. A solid corpus for home bakers is expected to include one (**Judgement**);
   the fermentation model was calibrated on a wholemeal dough
   (`docs/science/fermentation-model.md`), which makes the gap visible in the product.
2. **Sourdough and natural leaven.** Excluded from the recipe dataset and from the engine's scope
   (published-recipes governing rule 2; dough-behavior.md notes a hybrid leaven as unsupported).
   Whether the 0.3 corpus may omit it is a scope decision for the owner (question B), not a
   finding.
3. **A plain direct-dough lean loaf.** The three lean breads use a no-knead overnight method, a
   poolish and a biga; none is a kneaded same-day loaf. This is the first dough many home
   bakers make (**Judgement**).
4. **A plain sandwich loaf in a tin.** The pan breads are a lidded 13 in pain de mie and an
   enriched tangzhong loaf; neither is an everyday tin loaf (**Judgement**).
5. **A cold-retarded bread.** Cold retard appears only in enriched dough and pizza; no lean
   bread uses it, although cold retard is one of the techniques criterion 6 lists.
6. **More than one flatbread.** The contract has a `flatbread` category used once. A pita, naan
   or tortilla would show a different technique (a very hot or dry heat bake) and is common at
   home (**Judgement**).
7. **Boiled bread other than the water bagel.** Pretzel is "not covered: no source read"
   (readiness-criteria.md); regional bagel styles are the pilot of section 6.
8. **Laminated and viennoiserie doughs.** Croissant and similar are "not covered: no source
   read" (readiness-criteria.md). Their process differs greatly; whether they belong to 0.3
   is a scope question (question B).
9. **A Neapolitan-tradition recipe a home oven can bake.** The record's AVPN reference needs a
   floor of 380 to 430 °C; a home version needs its own source. Without it the corpus
   has no honest Neapolitan.
10. **An independent second source per recipe.** Criterion 2 asks for convergence where
    possible; none of the 15 records a second source, so every recipe stands on one page.

## 6. The Montreal bagel pilot

Purpose: test the whole path (criteria, card, sources, the owner's recipe) on one recipe before
it is applied to the corpus.

**What the repository knows.** Nothing about Montreal bagels. A case-insensitive search of the
repository for Montreal, St-Viateur and Fairmount finds only the French verb "montre" in two
interface files. The only bagel material is the King Arthur water bagel (same-day, malt in dough
and bath, 16 rings, 30 s a side in a simmering bath, 425 °F for about 20 min), the five
bagel recipes of the survey (`breads/bagel-1` to `-5`) and the bagel signs of readiness-criteria.md
(level B, thin coverage). The names, the history and the owner's description of the style come
from the owner's direction of 2026-11-18 (UTC) only; no value here is taken from memory.

**What the card needs, and its state.**

| Card field                        | State                                                                                                                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Name, style, tradition and origin | Wording agreed with the owner: Montreal-style bagel, in the tradition of St-Viateur, Fairmount named. Origin facts: to be read.                                                                  |
| Short history (2 to 4 sentences)  | Not written. To be read and paraphrased with sources; disputed dates stated as disputed. The owner's point (St-Viateur contributed to the style's popularity and survival) needs its own source. |
| Why this recipe                   | Owner's reason to be recorded; the source-based part to be written after the reading.                                                                                                            |
| Home adaptations                  | To be established: what the traditional bake uses and what a domestic electric oven changes; each change with its reason, from sources and from the owner's tests.                               |
| Attribution                       | "In the tradition of"; the recipe values "adapted and tested by the owner", if he confirms; never "the recipe of" St-Viateur or Fairmount.                                                       |
| Yeast                             | Instant by default; the owner's recipe states its form, and a conversion is recorded if it differs.                                                                                              |
| Sources                           | To be read (below).                                                                                                                                                                              |
| What is not known                 | To be listed after the reading.                                                                                                                                                                  |

**What must be read, by kind (no title is named from memory).**

1. **The bakeries' own pages:** the websites and any printed material of St-Viateur and of
   Fairmount (history, process descriptions, whether either publishes a recipe, the oven they
   use). If one publishes a recipe, attribution changes; if neither does, the "in the
   tradition of" wording stays. Their commercial interest is recorded as a source fact.
2. **Encyclopaedic and press histories:** a national or provincial encyclopaedia entry, feature
   articles in newspapers and magazines, and a book of the city's or the community's food
   history, read for the origin of the style, the dates, and the distinction between the
   style and the institutions. Independent voices are needed here to rate convergence; copies
   of one article count as one voice (the grid's rule).
3. **Published home adaptations for a domestic electric oven:** recipes from cookbook authors and
   food sites that adapt the style to a home oven, to compare with the owner's quantities and
   method, and to source each adaptation's reason. They are cross-checks, not the base.
4. **The owner's recipe and test record** (below).

**Rating.** The owner's own practice is recorded as the owner's practice, not as authority (ADR
0025); the published sources rate the claims that need a source (history, tradition, the effect
of an adaptation) with the grid; the quantities come from the owner's recipe with the
comparison recorded.

**Open question.** The owner will supply his own recipe as the base: the weights in grams, the
yeast form, the method and its end signs, the oven (make and mode), and what he found in testing.
Until he does, no recipe value is written, and the corpus pilot has no formula.

**An existing rule to settle first.** `AGENTS.md` says nothing in `packages/` or `apps/` may refer
to `dogfood/`, and that the owner's personal recipes are never hard-coded in the product;
drafts.md says templates never come from the dogfood recipes. The owner's direction of 2026-11-18
(UTC) allows the owner's recipes to become built-in, attributed. The rules must be amended by the
owner's decision, in a dedicated pull request, before such a recipe ships (question C).

## 7. Questions for the owner

A. **Approve the criteria of section 2**, or change them. Two choices matter most: the ceiling
(level B or better, so that nine of the 15 fail until their pages are re-read for end criteria),
and the share limit of one publisher (one third, a Judgement).

B. **Scope of 0.3.** Which of these belong: whole-grain or rye, sourdough, laminated dough, a
second flatbread, a plain direct-dough loaf, a plain tin loaf? Each is a gap of section 5.

C. **The dogfood rule.** May AGENTS.md and drafts.md be amended so that a recipe of the owner can be
built in, attributed "adapted and tested by the owner", with its data kept apart from `dogfood/`?
How should the attribution name the owner?

D. **The 15.** Approve or change the recommendations of section 4 on three points that need a
decision: rename the neo-Neapolitan pizza; replace the ciabatta, or keep it scaled with a yeast
form you choose; rename the boule and the brioche.

E. **Yeast conversion.** The engine states fresh equals instant divided by 0.33 and fresh equals active dry divided
by 0.40; active dry to instant would then be 0.825, derived from the two ratios and not stated
anywhere. Use these ratios for every conversion, or ask for a sourced ratio?

F. **Re-reading.** Allow a re-reading of the nine level C pages for end criteria and cues, before
deciding what to replace?

G. **The pilot.** Send your Montreal bagel recipe (grams, yeast form, method and signs, oven,
test results) and say which claims about the tradition you want the card to carry.

H. **Cards before 0.3.** Must every one of the 15 have a card, or only the recipes added or
changed for 0.3?
