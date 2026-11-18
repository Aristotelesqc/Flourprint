# Craft knowledge: a register of practitioner claims

This register holds what bakers, books, courses, manufacturers and recipe sites say about dough,
kept apart from measurements so the two are never confused. It is not scientific data. It is
valuable because published science mostly measures gas in high-dose laboratory doughs and says
little about taste, texture and when a dough is ready, especially for long fermentations at a low
yeast dose.

**Authority.** Owner decision, 2026-11-12 (UTC), recorded by PR #276 (issue #231), amended by
owner decision, 2026-11-13 (UTC) (uncertainty ranges, below). The file name,
the level rules and everything marked **Proposal** go beyond those decisions and wait for the
owner's confirmation. It is documentation only: no model, coefficient, equation, contract, engine
or screen changes. The separate scheme for scientific sources is in
[evidence-classification.md](evidence-classification.md); the two never mix.

## What the register may and may not do

| May                                                                                                                                                            | May never                                                                                                                                     |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Check the plausibility of a model prediction.                                                                                                                  | Fit or validate a model coefficient. The [coefficient rule](evidence-classification.md#5-role-for-the-model) is the one place that states it. |
| Give a subjective readiness criterion ("the dough is ready when ...").                                                                                         | Be given a scientific source role (`fit`, `independent validation`, or any other).                                                            |
| Suggest a hypothesis to test.                                                                                                                                  | Be presented as a measurement, or averaged with one (**Proposal**: the second half).                                                          |
| Supply a starting value for a recipe.                                                                                                                          |                                                                                                                                               |
| Set the direction and the width of an uncertainty range, as a hypothesis (owner decision, 2026-11-13 (UTC); [below](#craft-knowledge-and-uncertainty-ranges)). |                                                                                                                                               |

**Proposal (item 8).** Comparing a forecast with published schedules is a plausibility check of a
prediction; it is never a validation or a fit of a coefficient. The three uses in the "May" column
beyond the plausibility check (a readiness criterion, a hypothesis, a starting value) are likewise
agent-authored and wait for the owner's confirmation.

## Craft knowledge and uncertainty ranges

Owner decision, 2026-11-13 (UTC). Craft knowledge still never fits or validates a coefficient. It
**may set the direction and the width of an uncertainty range** for an effect that the model does
not otherwise represent, for example in enriched doughs (fat, milk, eggs, acids). Such a range is
labelled as a hypothesis; it is not a measurement and is never averaged with one. The level (A, B
or C) of each claim used is recorded with it. The owner's reason: a broad forecast that owns its
uncertainty is preferred to a model that is silent about the ingredients it ignores.

**Measurements take precedence.** Where the index holds measurements of the effect, they set the
range instead, within the conditions they cover:

- **Sugar:** Timmermans et al. 2022 (sucrose 0 to 18 % in a pastry dough at 30 °C) and Gélinas and
  McKinnon 2018 (sucrose and water, abstract only);
- **Salt:** Belz et al. 2017 and Boudrag et al. 2026 (NaCl in rheofermentometer doughs at 30 °C).

Their rows in [sources.md](sources.md#classification-of-evidence) say what each covers. How the
computed uncertainty is built and labelled is in
[evidence-classification.md](evidence-classification.md#8-computed-uncertainty).

## Beyond timing: the behavior model

Craft knowledge about how a dough handles (firmness, stickiness, gas retention, crumb, crust) is
the main expected source for the behavior model, whose foundations are proposals in
[behavior-model-foundations.md](behavior-model-foundations.md). It follows every rule of this
register: the grid below, the ceilings of use, the copyright rule, and the ban on fitting or
validating a coefficient. That file proposes how a craft claim and a measurement are combined
without being mixed, and which fields a behavior entry may need beyond the template. The register
holds a few handling-adjacent entries (stretching and relaxation, extensibility, pizza maturity; see the sections of 2026-11-14, 2026-11-15 and 2026-11-16 below), none about gas retention or crumb.

## Two separate assessments

The standing of the source and the quality of the claim do not always go together, so each is
recorded on its own.

### The source: who speaks

Observable facts, not impressions. Each is written with where it was observed, or `not recorded`.

| Fact                     | What to record                                                                                            |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Type                     | Book, school course, professional body, manufacturer, specialist site, blog, video, aggregator.           |
| Recognition in the trade | A practising baker or instructor; awards; use as a school textbook; citation by other recognised authors. |
| Longevity and revisions  | Number of editions, years in print or online.                                                             |
| Reach                    | Popularity, translations.                                                                                 |
| Commercial interest      | A yeast or flour maker also speaks to sell; say what the speaker sells.                                   |

### The claim: what is said

**Proposal (item 2).** The three ratings per criterion and their definitions in the table below,
and the rule that `not recorded` counts as `weak`, are agent-authored and wait for the owner's
confirmation; so does the factor of 1.5 in the convergence row.

| Criterion                                                          | `strong`                                                                                                                                                             | `partial`                                                                                                               | `weak`                                                                                 |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Subject                                                            | Always recorded: the domain of [dough-behavior.md](dough-behavior.md#domains) the claim attaches to, by its anchor. Not rated.                                       |                                                                                                                         |                                                                                        |
| Precision                                                          | The quantities the claim depends on are weighed in grams, measured in degrees, timed. (**Proposal:** baker's percentages with a stated flour mass count as weighed.) | Some are, others are by volume or approximate.                                                                          | "A pinch", "room temperature", "a warm place": record the vagueness as vagueness.      |
| Observable criteria                                                | Says how to recognise the result in checkable terms: a measured rise in a stated vessel, a described test, step photographs.                                         | Names a cue without conditions ("until doubled").                                                                       | None given.                                                                            |
| Justification                                                      | Explains why, with a mechanism or a trade-off the claim depends on.                                                                                                  | A reason in passing.                                                                                                    | Only asserts.                                                                          |
| Convergence (**Proposal**: the `partial` and `weak` cells, item 6) | Three or more independent voices agree within the stated conditions.                                                                                                 | At least two independent sources lie within a factor of 1.5 of the claimed value under comparable dose and temperature. | One voice, copies, independence not recorded, or agreement in order of magnitude only. |

**Proposal.** The `partial` and `weak` cells of the convergence row (the factor of 1.5, comparable
dose and temperature, and the listing of the other entries used, which the entry template asks
for) are a Proposal (item 6); they were added after the calibration run below.

**Proposal (item 2).** A field the record does not hold is written `not recorded` and counts as `weak` for the level. The
level is then marked as resting on an incomplete record, and filling the field can raise it,
never lower it.

## Level A, B or C

One level per claim, with the reason written beside it. There is no score out of 100.
**Proposal (item 3):** the rules of the table below that map the ratings to level A, B or C are
agent-authored and wait for the owner's confirmation.

| Level | Rule                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A     | Precision `strong` and observable criteria `strong`, and justification or convergence at least `partial`.                            |
| B     | Precision at least `partial`, and at least one other criterion (observable criteria, justification, convergence) at least `partial`. |
| C     | Anything else, in particular precision `weak`, or numbers with nothing else behind them.                                             |

**Proposal.** The level may bound the use of a claim: A may serve as a readiness criterion; B as a
plausibility check, a recipe default or a hypothesis; C only as a hypothesis to test, never shown
to a baker as guidance.

### Rules that qualify the level

**Proposal (items 2 and 8).** The three rules below are agent-authored and wait for the owner's
confirmation.

- **Popularity counts, but less than the rest.** It shows that a method works often enough for
  many people, not that it is exact, and popular errors get copied. It is recorded under reach,
  never lifts a level by itself, and is a tie-breaker at most (**Proposal**: the tie-breaker wording).
- **The source's standing is a starting point, not a verdict.** An obscure blog that gives
  weights, temperatures and step photographs can yield a level A claim; a famous book that says
  "let rise until doubled" without conditions yields level C. The level comes from the claim.
- **Copies are not convergence.** Ten blogs copying one book are one voice. Where independence is
  not recorded, convergence is `weak`.

## Copyright

This repository is public. No long excerpts from books or courses. A short quotation, or better a
paraphrase, with the page or the URL. No PDFs, no scans, no photographs of pages (**Proposal**:
the last restriction). A claim is recorded by what it says and where to find it, never by reproducing the source.

## Entry template

```text
### <short title of the claim>

- Source: type; recognition; longevity and revisions; reach; commercial interest
  (each a fact with where it was observed, or `not recorded`)
- Where to find it: URL, or book and page (no excerpt)
- Claim: one sentence, paraphrased, or a short quotation with its page or URL
- Subject: link to the domain anchor in dough-behavior.md
- Conditions as stated: dose; flour; temperature; duration (as printed, vagueness kept)
- Claim assessment: precision; observable criteria; justification; convergence
  (each strong, partial, weak or not recorded, with a reason; for convergence, the other entries
  used are listed)
- Level: A, B or C, with the reason
- Role: plausibility, readiness criterion, hypothesis or recipe default
- Checked: UTC date (ISO), and who (an agent is named by its role, not by a model family)
```

## The existing recipe and style-guide survey

[data/published-recipes-2026-10.md](data/published-recipes-2026-10.md) (89 recipes collected, 50 of them scored in 39 source groups by the uncertainty study, with `.json`)
and [data/style-guides.md](data/style-guides.md) (15 preset sources and one normative record, with
`.json`) are the first craft-knowledge dataset of this repository. They are not rewritten here.
They record formulas, schedules, source kind and a transcription confidence (`high`, `medium`,
`low`); that confidence grades how explicitly the page states its numbers, which is a different
thing from the level of a claim. They do not record observable criteria, justifications,
recognition, editions or reach, so an entry built from them writes those fields `not recorded`.
Their own rule applies unchanged: a published schedule is a recommended protocol, not a measured
fermentation. The survey's read status is recorded in its data files: full snapshot reads of the
style-guide sources (2026-10-10 UTC, with hashes), and a recipe survey transcribed by page-reading
agents and spot-checked (2026-10-29 UTC). The earlier wording of [README.md](README.md) that the
style guides were read through web-search excerpts was corrected on 2026-11-12 (UTC).

## Register: first entries

**Proposal (item 5):** the three entries and their levels are agent-authored ratings and wait for
the owner's confirmation. Three worked examples, all taken from the survey's records; nothing was fetched and no quotation
is added from memory. They are classified with the grid above, and they are examples of the
method, not endorsements of the sources.

### Final proof of a poolish baguette, 45 to 60 minutes at about 20 °C

- Source: type: a recipe page of a baking-ingredients brand (survey kind `brand`; King Arthur
  Baking, author PJ Hamel); recognition: not recorded; longevity and revisions: not recorded;
  reach: not recorded; commercial interest: the publisher sells baking ingredients and the
  contract cites it for vendor yeast ratios, whether the page promotes products is not recorded.
- Where to find it: https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe (full
  snapshot read 2026-10-10, recorded in `data/style-guides.json`, hash 9a883c4e2070f924).
- Claim: after shaping, the loaves proof for 45 to 60 minutes at about 20 °C (68 °F) (paraphrase
  of the survey's record).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: dose, 1.5 tsp of yeast in the final dough and 1/16 tsp in the poolish,
  active dry or instant (the survey converts to 4.6875 g, 0.868 % of flour, with the brand's
  3 g per tsp); flour, all-purpose, 540 g in total (120 g in the poolish), protein not stated,
  water 368 g, salt 12 g; temperature, proof at about 20 °C, the 14 h poolish "at room temperature"
  without degrees; duration, 45 to 60 min.
- Claim assessment: precision `partial` (flour, water and salt weighed and the proof temperature
  in degrees, but yeast by volume and the poolish temperature "room"); observable criteria
  `not recorded`; justification `not recorded`; convergence `weak` (other baguette pages of the
  survey: `breads/baguette-2` and `-3` of Weekend Bakery, one site, 35 and 25 min of shaped proof
  at 0.36 and 0.59 % instant yeast; `breads/baguette-4` of The Fresh Loaf, 60 to 90 min at 0.36 %;
  `breads/baguette-5` of Breadtopia gives no duration; all four give "room" without degrees, and
  their doses are 0.4 to 0.7 times this recipe's 0.87 %. None meets "comparable dose and temperature"
  within a factor of 1.5 of 45 to 60 min, so they agree in order of magnitude only).
- Level: **C**, on an incomplete record (first rated B before the calibration run recorded below).
  Precision is partial; observable criteria, justification and convergence are not recorded or
  `weak`.
- Role: hypothesis to test (a final proof of 45 to 60 min at about 20 °C). At level C the ceiling
  of use does not allow a plausibility check or a recipe default (level B would). The
  survey's preset uses the midpoint, 52.5 min: that is the survey's editorial choice, not a use
  this register grants. Not a readiness criterion: no cue is recorded.
- Checked: 2026-11-12 (UTC), research agent. Re-rated 2026-11-12 (UTC) under the convergence wording above.

### Twelve to eighteen hours of room-temperature fermentation at about 0.2 % yeast (no-knead)

- Source: type: a recipe on a food website (Leite's Culinaria), attributed to Jim Lahey (Sullivan
  Street Bakery) through David Leite, recorded as a publication lineage, not the primary
  publication; recognition: only the attribution to a named baker is recorded; longevity and
  revisions: not recorded; reach: not recorded; commercial interest: not recorded.
- Where to find it:
  https://leitesculinaria.com/99521/recipes-jim-laheys-no-knead-bread.html (full snapshot read
  2026-10-10, recorded in `data/style-guides.json`, hash 68e03e83a9cff046).
- Claim: let the mixed dough ferment at least 12 hours, preferably about 18, at about 72 °F
  (22 °C) before folding and rounding (paraphrase of the survey's record).
- Subject: [yeast dose and form](dough-behavior.md#d01a-yeast-dose-and-form).
- Conditions as stated: dose, 1/4 tsp instant yeast (the survey's conversion: 0.75 g, 0.208 % of
  flour); flour, 3 cups all-purpose or bread flour (360 g at the survey's 120 g per cup); water,
  1 1/3 cups lukewarm (302.667 g, 84.074 %); salt, 1 1/4 tsp, kind unspecified; temperature, about
  72 °F; duration, 12 to 18 h.
- Claim assessment: precision `partial` (everything by volume: the survey records that 140 g per
  cup instead of 120 would give 72.063 % hydration instead of 84.074 %, and the same yeast over
  420 g of flour would be 0.179 %, our division; the temperature is in degrees); observable
  criteria `not recorded`; justification `not recorded`; convergence `weak` (other no-knead pages
  of the survey: `breads/boule-4`, 14 h at 21 °C and 0.19 % instant yeast, is within a factor
  of 1.5 of the claim under a comparable dose and temperature, but the survey does not record
  whether it descends from this recipe, and copies are not convergence; `breads/boule-5`, 9 to
  12 h at 0.17 % with "room" and no degrees, is not comparable; `-3`, 3 h, and `-2`, 8 to 18 h in
  a "warm place" at 0.8 %, and `-1`, 1.56 %, are not either).
- Level: **C**, on an incomplete record. Only the precision reaches `partial`; nothing else stands
  behind the numbers. The standing of the attributed baker cannot lift it: it is a starting point.
- Role: hypothesis to test (a long ferment near 0.2 % yeast at 22 °C); not a plausibility check
  of the model, not a recipe default.
- Checked: 2026-11-12 (UTC), research agent. Re-rated 2026-11-12 (UTC) under the convergence wording above.

### Twenty-four hours at 0.05 % dry yeast for a Neapolitan dough (aggregator page)

- Source: type: an aggregator page (survey kind `aggregator`), original author not stated;
  recognition, longevity and revisions, reach, commercial interest: not recorded.
- Where to find it: https://www.umami.recipes/recipe/uBd0yyxjcvmqgJE54rjc (page read for the
  survey 2026-10-29; survey id `pizzas/neapolitan-5`, confidence `low`).
- Claim: about 24 hours of fermentation in total with 0.05 % dry yeast (or 0.15 % fresh) gives a
  Neapolitan dough (paraphrase of the survey's record).
- Subject: [yeast dose and form](dough-behavior.md#d01a-yeast-dose-and-form).
- Conditions as stated: dose, 0.05 % dry or 0.15 % fresh, subtype unspecified; flour, not stated
  (percentages only: water 60 %, salt 2 %); temperature, "room" for three stages and not stated
  for the 10.5 h stage; duration, 12 + 0.5 + 10.5 + 1 h as derived by the survey; bake time not
  stated.
- Claim assessment: precision `weak` (flour not stated, so the percentages do not count as weighed
  under the baker's-percentage proposal, which needs a stated flour mass; yeast subtype
  unspecified, "room" without degrees, one temperature not stated); observable criteria
  `not recorded`; justification `not recorded`; convergence `weak` (another aggregator page of the
  survey, `pizzas/neapolitan-1` of RecipeLion, gives 0.05 % instant yeast over 18 to 20 h of
  bulk plus 4 to 6 h, but "room" without degrees is not a comparable temperature, and the survey
  records no original author for either page, so independence is not recorded and they may be one
  voice).
- Level: **C**. Precision is weak. A normative record in `data/style-guides.json` (the AVPN
  regulations: 0.1 to 3 g of fresh yeast per litre of water, that is about 0.006 to 0.19 % of
  flour, our division, and 12 to 24 h of total fermentation) puts the dose and the duration in
  the same range; it is a professional body's specification, a different kind of voice, and
  belongs in an entry of its own, not as a copy of this page.
- Role: hypothesis only; not a recipe default.
- Checked: 2026-11-12 (UTC), research agent. Re-rated 2026-11-12 (UTC) under the convergence wording above.

No example reaches A or B: the survey records no observable criteria and no justification, which
A and B need beyond precision. That is a gap in the survey's fields, not a verdict on the
sources. Levels as re-rated: baguette C (was B), no-knead C, Neapolitan C.

## Register entries from the readiness research (2026-11-14 UTC)

Ten entries grounded in the repository's own records of the style-guide snapshots (full snapshot
reads of 2026-10-10 (UTC) by other agents, with hashes) and of the recipe survey. **No page was
re-read in that pass**: the craft hosts were refused by the session's network policy at the time
(see [readiness-criteria.md](readiness-criteria.md); the hosts were allowed afterwards and the sections of
2026-11-15 and 2026-11-16 record the pages read then). Every field the records do not hold is `not recorded` and counts as `weak`, so
each level rests on an incomplete record; filling a field can raise it, never lower it. Source type
and standing, for all ten: type as named per entry; recognition in the trade, longevity and
revisions, reach: `not recorded`; commercial interest: `not recorded`, except that King Arthur
Baking and the flour and yeast makers named sell baking ingredients. Entries in this section are
**Proposals** to be rated like the first three (items 2 and 5 below); nothing in them changes a
model. Statements the owner made that no source read supports are not entered; they are in
[readiness-criteria.md](readiness-criteria.md).

### A finished-dough temperature is prescribed before bulk, 18 to 26 °C by style

- Source: five voices of the style-guide records: a professional formula of King Arthur Baking
  (ciabatta, 75 °F, 23.9 °C); Modernist Cuisine (Pullman, 24 to 26 °C); La Confraternita della Pizza,
  a normative disciplinare (Roman pan pizza, 18 to 26 °C, preferment 21 to 23 °C); Molino Vigevano
  (Roman scrocchiarella, about 24 °C); Meilleur du Chef (brioche, at most 26 °C). Other fields as above.
- Where to find it: the `Published process` lines of `data/style-guides.md` for ciabatta, Pullman,
  teglia, Roman and brioche, with the URLs recorded there (snapshots read 2026-10-10 UTC).
- Claim: each of these recipes states a target temperature for the dough at the end of mixing, between
  18 and 26 °C, and none of them states a sign of gluten development as the end of mixing (paraphrase).
- Subject: [mixing, autolyse, folds, degassing, shaping](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping).
- Conditions as stated: styles differ (a lean bread, a pan pizza, a milk-and-egg dough); the
  value is a target to reach by choosing the water temperature, not a rule for all doughs.
- Claim assessment: precision `strong` (degrees); observable criteria `strong` (a thermometer
  reading); justification `not recorded`; convergence `partial` (five independent voices say a
  target exists and the values lie within a factor of 1.5 of one another, 18 to 26 °C; they do not
  compare like with like).
- Level: **A**, on an incomplete record (justification not recorded).
- Role: readiness criterion for the end of mixing, as a measure of the dough's temperature; it is
  not a criterion of gluten development.
- Checked: 2026-11-14 (UTC), research agent.

### Bulk fermentation ends when the dough has doubled, in three recipes (1 to 2 h)

- Source: recipe pages of King Arthur Baking (water bagels; burger buns) and Bake from Scratch
  (Chicago deep-dish, a baking-school module); the first two share a site, so they count as one voice.
- Where to find it: the `Published process` lines for bagels, burger buns and Chicago in
  `data/style-guides.md`.
- Claim: bulk lasts 1 to 1.5 h "to double" (bagels), 1 to 2 h "to nearly double" (burger buns), and
  30 to 45 min at 75 °F (24 °C) "to double" (deep-dish) (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: doses and flours as in the records (the survey's bagel record: 1.88 % yeast of flour);
  no vessel, no mark, and no statement of what the volume is measured against.
- Claim assessment: precision `partial` (times and one temperature); observable criteria `partial`
  (a cue without conditions); justification `not recorded`; convergence `weak` (one independent
  voice besides the shared site, times not within a factor of 1.5).
- Level: **B**, on an incomplete record.
- Role: plausibility check or hypothesis. It does not hold after a fold or degassing (the contract's
  volume-cue rule).
- Checked: 2026-11-14 (UTC), research agent.

### Stretch the pan dough in rounds, relaxing 10 to 15 min between rounds, until the pan is filled

- Source: a recipe page of King Arthur Baking (Sicilian-style pizza).
- Where to find it: the `Published process` line for Sicilian in `data/style-guides.md`.
- Claim: while stretching the dough into an oiled 18 by 13 in pan, let it relax 10 to 15 min and
  repeat as needed until the pan is filled (paraphrase).
- Subject: [rheology and structure over time](dough-behavior.md#d14-rheology-and-structure-over-time).
- Conditions as stated: a very soft dough after 1 h of room bulk (optionally fridge up to 24 h).
- Claim assessment: precision `partial` (minutes, a pan size); observable criteria `partial` (the
  pan filled; how the dough "relaxes" is not described); justification `not recorded`; convergence `weak` (one voice).
- Level: **B**.
- Role: hypothesis, and a first handling criterion for relaxation (measured on a different clock:
  Covino's disc diameter after pressing).
- Checked: 2026-11-14 (UTC), research agent.

### Roman pan-pizza dough is stretched when its core reaches 19 °C (3 to 4 h of room-temperature proof)

- Source: La Confraternita della Pizza, a normative disciplinare of an association (Roman pan pizza).
- Where to find it: the `Published process` line for teglia in `data/style-guides.md` (URL recorded there).
- Claim: after about 44 h at 4 °C, the dough proofs 3 to 4 h at room temperature until the core is at least 19 °C
  before stretching (paraphrase).
- Subject: [temperature history and recording](dough-behavior.md#d02c-dough-temperature-history-and-recording).
- Conditions as stated: machine mix 20 to 25 min with 4 °C water, dough 18 to 26 °C, bench about 1 h.
- Claim assessment: precision `strong`; observable criteria `strong` (a probe reading); justification `not recorded`; convergence `weak` (one voice).
- Level: **B**.
- Role: plausibility check and hypothesis; a criterion that is a temperature, not a gas or volume.
- Checked: 2026-11-14 (UTC), research agent.

### A refrigerated pizza dough keeps for 24, 48 or 72 h, by recipe

- Source: recipes of Feeling Foodish (New York, at least 24 h up to 72 h), Molino Vigevano (Roman, at 4 °C and use within 48 h), Baking Steel (72-hour: 24 h at room temperature, then 48 h cold) and King Arthur Baking (Sicilian, optional fridge up to 24 h).
- Where to find it: the `Published process` lines of the four presets in `data/style-guides.md`.
- Claim: a fridge hold of at least 24 h and up to 48 to 72 h is prescribed, with a ceiling that differs by recipe (paraphrase).
- Subject: [cold end and long refrigeration](dough-behavior.md#d02b-cold-end-and-long-refrigeration).
- Conditions as stated: doses 0.44 % instant yeast (New York) and others in the records; 4 °C.
- Claim assessment: precision `strong` (hours, 4 °C); observable criteria `weak` (no sign of the end of the window); justification `not recorded`; convergence `partial` (four independent voices agree on a hold of at least 24 h; ceilings differ by a factor of 3).
- Level: **B**, on an incomplete record.
- Role: plausibility check; it does not say what degrades at the end of the window.
- Checked: 2026-11-14 (UTC), research agent.

### Final proof ends when the dough reaches the top of the tin, in two enriched recipes

- Source: two recipe pages of the survey (`enriched/brioche-3`, `enriched/shokupan-3`), transcription confidence `low`, volume units only.
- Where to find it: `data/published-recipes-2026-10.json`, flags of the two records.
- Claim: the proof lasts until the dough nears or reaches the top of the pan; no duration is given (paraphrase of the survey's flag).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: enriched doughs (brioche, milk bread); pan sizes not recorded.
- Claim assessment: precision `weak`; observable criteria `partial` (a physical mark in the tin); justification `not recorded`; convergence `weak` (two voices, independence not recorded).
- Level: **C**.
- Role: hypothesis. It is not shown for a lean loaf, and not for 87 of the 89 surveyed recipes, whose records hold no mark.
- Checked: 2026-11-14 (UTC), research agent.

### Four short craft statements at level C

- **"Puffy" as a stage end.** King Arthur Baking's burger-bun proof (about 1 h, to puffy) and milk-bread bulk (1 to 1.5 h, to puffy), from the style-guide records; one site, one voice; precision `partial`, observable criteria `partial`, justification and convergence `weak`; level **C**, role hypothesis.
- **Kneading to windowpane.** One flag of the survey (`breads/baguette-4`, The Fresh Loaf, a forum), duration not given; precision `weak`; observable criteria `partial`; level **C**, role hypothesis; criticism of the test: no source read.
- **Pullman proof at two temperatures.** Modernist Cuisine (volume 4, page 296 errata, via the record): 1.5 to 2 h at 27 °C and 65 % humidity, or 2.5 to 3 h at 21 °C, with the lid off during the proof and on before baking; precision `strong` (degrees, hours); observable criteria `not recorded`; convergence `weak`; level **C**, role hypothesis. The two times, 6 °C apart, differ by about 1.5 times.
- **Out of the fridge before baking.** Feeling Foodish (New York): bring the balls to room temperature within 20 to 60 min before baking; precision `strong` (minutes); observable criteria `not recorded`; level **C**, role hypothesis.

Each of the four was checked 2026-11-14 (UTC) by the research agent; their subjects are
[readiness profiles](dough-behavior.md#d04a-readiness-profiles-and-end-point),
[mixing and folds](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping) and
[temperature history](dough-behavior.md#d02c-dough-temperature-history-and-recording).

**Levels as given:** A 1, B 4, C 5 (the four short statements count as four entries in the list above,
the pan-top mark as one). These ratings were not calibrated and wait for the owner like the first three.

## Register entries from craft pages read on 2026-11-15 (UTC)

After the owner allowed the craft hosts, pages were fetched with an ordinary request and read in
this session: King Arthur Baking (a flour and equipment seller; every page below counts as **one
voice** for convergence, whatever its author), Weekend Bakery (an independent home and micro-bakery
blog, authored "Weekend Bakers"; commercial interest `not recorded`), BAKERpedia (a trade reference
site run by an industry publisher; authors David Wallace and Joanna Evoniuk, with references to
Suas, Hamelman, the Culinary Institute of America and cereal-science texts, which the pages cite
but which were not read) and the Verace Pizza Napoletana Association's international
disciplinare (a certification body's specification). The host `modernistcuisine.com` answered with
an empty reply and an HTTP/2 protocol error on 2026-11-15, so no Modernist Cuisine page was read.
Where sources agree in wording, independence is `not recorded` and they count as one voice (the
King Arthur preferment page and BAKERpedia's biga page share the "domed, just beginning to
recede" sign, and BAKERpedia cites Hamelman for it). A short quotation is at most a few words.
Common fields: recognition in the trade, longevity and revisions, reach: as stated per entry or
`not recorded`. All entries: Checked 2026-11-15 (UTC), research agent. They are **Proposals** like
the first entries (items 2 and 5 below).

### The poke test, King Arthur reading: the dent that stays means ready to bake

- Source: King Arthur Baking, brand pages by employees of a baker's hotline team: "How to avoid
  over-risen bread" (MaryJane Robbins, 2014-06-20, revised 2020-09-25), "The float test for yeast
  dough and sourdough starter" (PJ Hamel, 2019-01-02), "How to tell if bread dough has risen
  enough" (Annabelle Shippee, 2022-08-22) and "What is proofing bread?" (Rossi Anastopoulo,
  2023-08-31). One organisation, so one voice. Commercial interest: sells flour, buckets and proofers.
- Where to find it: https://www.kingarthurbaking.com/blog/2022/08/22/how-to-tell-if-bread-dough-has-risen-enough,
  https://www.kingarthurbaking.com/blog/2014/06/20/the-bread-also-rises (2014; re-read 2026-11-16 (UTC), published
  2014-06-20, revised 2020-09-25), https://www.kingarthurbaking.com/blog/2019/01/02/the-float-test-for-yeast-dough-and-sourdough-starter
  and https://www.kingarthurbaking.com/blog/2023/08/31/proofing-bread (re-read 2026-11-16 (UTC), published 2023-08-31,
  revised 2024-11-01), all read 2026-11-15 (UTC) and the two re-reads confirmed on 2026-11-16 (UTC). The 2014 page
  says to press to about the bed of the fingernail, the 2022 and 2023 pages about 1 inch.
- Claim: lightly flour a finger and poke the dough down about 1 inch; if the indent stays, bake; if it
  pops back out, give it more time; dough that has risen too long feels fragile and may collapse as it
  is poked (paraphrase). The 2014 page adds that the "belly button" will bake out.
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: after the second rise, for pan loaves, free-form loaves, rolls and pizza; test
  early in the rise window; warm humid kitchens run fast. Not stated: cold dough, hydration, enriched doughs.
- Claim assessment: precision `partial` (a depth of 1 inch, no temperature); observable criteria
  `strong` (a described test, with photographs, and its result read three ways); justification
  `partial` (gluten weakening past the peak); convergence `weak` (one voice; two other sources read
  the same test differently, see the next entries).
- Level: **B**. Role: hypothesis, plausibility. Not a readiness criterion while another source reads
  the same result the opposite way.

### The poke test, Weekend Bakery reading: a dent that pops halfway back means just right

- Source: Weekend Bakery, "The myth of double in size +tips!", authored "Weekend Bakers", published
  2012-02-12, modified 2019-05-18 (a micro-bakery blog; 105 reader comments).
- Where to find it: https://www.weekendbakery.com/posts/the-myth-of-double-in-size/, read 2026-11-15 (UTC).
- Claim: poke gently; the hole disappearing completely means under-proofed, popping halfway back
  means just right, staying entirely dented means over-proofed; right after shaping the hole can stay
  although the dough is not over-proofed, and the difference is felt by the dough being light and
  elastic (paraphrase).
- Subject: as above.
- Conditions as stated: final proof; a floured finger for high-hydration dough; temperature kept
  stable by the author's method (about 24 °C dough).
- Claim assessment: precision `weak` (no depth, no time); observable criteria `strong` (three
  outcomes described); justification `partial` (the gluten balloons "explode" past the limit);
  convergence `weak` (one voice, opposed by King Arthur Baking on the middle and last outcome).
- Level: **C** (precision `weak`, which the grid caps at C whatever the other ratings).
- Role: hypothesis. **Disagreement with the King Arthur entry, recorded and not averaged.**

### The poke test, BAKERpedia reading: if it springs back, it is ready

- Source: BAKERpedia, "Final Proof", David Wallace, published 2015-06-07, modified 2024-02-19, a trade
  reference page citing two sources by number (not read).
- Where to find it: https://bakerpedia.com/processes/final-proof/, read 2026-11-15 (UTC).
- Claim: another way to know the final proof is complete is to test the dough for spring: press it
  gently and, if it springs back, it is ready to bake (paraphrase).
- Subject: as above.
- Conditions as stated: commercial proofing at 35 to 37 °C, 85 to 95 % humidity, 60 to 65 min.
- Claim assessment: precision `weak`; observable criteria `partial`; justification `weak`;
  convergence `weak`.
- Level: **C**. Role: hypothesis. **Opposite of the King Arthur reading**; three of the sources read
  agree that a poke test exists and disagree on what the result means.

### "Double in size" is ambiguous, and bulk end signs are a conjunction

- Source: Weekend Bakery ("The myth of double in size", above); King Arthur Baking, "Bulk
  fermentation, explained" (Maurizio Leo, a contributor, 2019-07-22, revised 2025-03-05); Weekend
  Bakery, "The Temperature Equation" (2026-04-27, sourdough); King Arthur Baking recipes (Honey-Oat
  and classic Pain de Mie, 2011 and 2007, revised 2026-11-13).
- Where to find it: https://www.weekendbakery.com/posts/the-myth-of-double-in-size/;
  https://www.kingarthurbaking.com/blog/2019/07/22/bulk-fermentation;
  https://www.weekendbakery.com/posts/the-temperature-equation-timing-your-fermentation/;
  https://www.kingarthurbaking.com/recipes/pain-de-mie-recipe; all read 2026-11-15 (UTC).
- Claim: (1) "double in size" has no defined meaning for a boule: for a half-sphere dough the volume
  doubles when the height grows by about 26 %, whereas doubling the diameter multiplies the volume
  by eight (Weekend Bakery's arithmetic). (2) In a straight-sided marked container the doubling of
  volume is easy to read (King Arthur Baking). (3) The end of bulk is a set of signs: risen
  significantly, smooth, resistance and elasticity when tugged, bubbly, and the bowl jiggles (King
  Arthur Baking, 2019); a 50 to 75 % increase in volume with a domed top, bubbles at the surface and
  sides and a jiggle (Weekend Bakery 2026, sourdough). (4) Two King Arthur sandwich-loaf recipes
  say the bulk is done "puffy though not necessarily doubled" or "risen noticeably; it won't
  necessarily double". (5) On folds (King Arthur Baking 2019, re-read 2026-11-16 (UTC)): sets are spaced about 30 min apart, the
  first 30 min after the start of bulk, because another set too soon finds the dough too tight and hard to stretch, and it may tear;
  if the dough was hard to stretch after a set, later sets can be omitted; a 100 % rye dough, a stiff low-hydration dough or one
  kneaded to full development needs none; cutting bulk short leaves the dough under-proofed, pushing it too far makes it hard to handle
  and on the verge of over-proofing (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: lean and enriched sandwich doughs, sourdough (Weekend Bakery 2026), 3 to 5 h
  bulk at room temperature (King Arthur Baking, sourdough).
- Claim assessment: precision `partial` (percentages for the Weekend Bakery 2026 range; arithmetic
  is exact); observable criteria `strong` (several described signs); justification `partial`
  (a geometric argument; sign list unexplained); convergence `partial` (three sources agree that
  volume alone is not enough; they do not give the same ratio: doubled, +50 to 75 %, "not
  necessarily doubled").
- Level: **B**. Role: plausibility, hypothesis. **Qualifies C1:** a recipe-writing convention that
  most sources treat as a rough cue, not as a measured criterion.

### Final proof of a pan loaf: about 1 inch over the rim, and the lidded-tin variant

- Source: King Arthur Baking, "How to avoid over-risen bread" (2014) and "How to tell if bread dough has
  risen enough" (2022), for open pans; Honey-Oat Pain de Mie (PJ Hamel, 2011, revised 2026-11-13) and
  Pain de Mie (PJ Hamel, 2007, revised 2026-11-13), for lidded pans. One voice.
- Where to find it: https://www.kingarthurbaking.com/recipes/honey-oat-pain-de-mie-recipe and
  https://www.kingarthurbaking.com/recipes/pain-de-mie-recipe, read 2026-11-15 (UTC).
- Claim: open loaf pan, bake when the top of the dome is about 1 inch over the rim, judged with a
  ruler or the length of a thumb to its first knuckle. Lidded pain de mie pan: let the dough rise until about 1 inch
  below the top of the pan or lid, 60 to 90 min (Honey-Oat); in the classic recipe, until just below the lip,
  45 min to 1 h, in a 13 inch pan, bake covered 25 min then uncovered, done at 190 °F (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: a yeast sandwich dough, 8.5 by 4.5 or 9 by 5 inch pans, a 68 °F room for the
  open-pan photographs; the lidded recipes' kneaded doughs.
- Claim assessment: precision `partial` (inches, minutes, 190 °F; room temperature loosely); observable criteria
  `strong` (a mark with photographs, over and under examples); justification `partial` (energy left
  for oven spring); convergence `weak` (one voice; the three lidded versions give three different gaps).
- Level: **B**. Role: hypothesis; a mark in the tin is real but the figure depends on the pan and the recipe.
  **Qualifies C6:** no King Arthur page gives "1 cm below the rim"; the lidded recipes give about 1 inch
  below, or "just below the lip".

### An over-proofed loaf can be deflated, reshaped and proofed again

- Source: King Arthur Baking, "Over-proofed bread dough: How to save your loaf" (PJ Hamel, 2018-02-21,
  revised 2025-05-06), quoting a food editor of the company's magazine; "How to avoid over-risen
  bread" (2014). One voice. Modernist Cuisine's "Dough CPR" page is a lead only (unread).
- Where to find it: https://www.kingarthurbaking.com/blog/2018/02/21/over-proofed-bread and
  https://www.kingarthurbaking.com/blog/2014/06/20/the-bread-also-rises, read 2026-11-15 (UTC); the 2014 page re-read 2026-11-16 (UTC).
- Claim: a loaf towering 4 inches over the rim was deflated, reshaped, put back in the pan and baked
  when it was no more than an inch over the rim after about 20 min; it rose a little higher than the
  correctly timed loaf and had no discernible flavour difference; baked as it was, the first loaf
  rose, fell and collapsed. It works with active dry or instant yeast, not rapid-rise, and generally
  not with sourdough. The 2014 page says the third rise goes quickly and will not be as high because the yeast is tiring (paraphrase).
- Subject: [rheology and structure over time](dough-behavior.md#d14-rheology-and-structure-over-time).
- Conditions as stated: Classic Sandwich Bread, two loaves, one rescued; yeast type as above.
- Claim assessment: precision `partial`; observable criteria `strong` (side-by-side photographs of
  baked loaves); justification `partial`; convergence `weak` (one voice; the other page of the same
  organisation says the rescued loaf is not as high).
- Level: **B**. Role: hypothesis, and the first source read for the owner's belief that an
  over-proofed dough can be reworked. **Supports C5's second half for a yeast sandwich loaf, with limits**:
  rapid-rise yeast and sourdough excluded; the flavour claim is the author's own tasting.

### Signs of an over-risen loaf, and the cost of baking it as it is

- Source: King Arthur Baking, "How to avoid over-risen bread" (2014); BAKERpedia, "Final Proof" (2015,
  modified 2024).
- Where to find it: https://www.kingarthurbaking.com/blog/2014/06/20/the-bread-also-rises and
  https://bakerpedia.com/processes/final-proof/, read 2026-11-15 (UTC).
- Claim: a loaf at the limit has a nearly transparent dome that wobbles, crests over the rim and
  starts to overflow, the gluten structure is "compromised and weaker"; baked, it shows a sunken centre,
  a curl of crust over the edge, a coarse crumb and a sour "over-ripe fruit" smell (King Arthur
  Baking). An over-proofed loaf has pale crust colour, coarse grain, poor texture and acid overtones;
  under-proofed, small volume, shell tops and bursting at the sides (BAKERpedia, quoting a reference).
- Subject: as above.
- Conditions as stated: white pan bread in a 68 °F room; a commercial proof for BAKERpedia.
- Claim assessment: precision `weak`; observable criteria `strong` (described signs, photographs);
  justification `partial`; convergence `partial` (two independent organisations agree on a coarse crumb
  and an acid or sour note).
- Level: **C** (precision `weak`).
- Role: hypothesis; warning signs before and after baking.

### The windowpane test, and its limits

- Source: King Arthur Baking, "What is the windowpane test for bread dough?" (PJ Hamel, 2022-10-14,
  revised 2023-05-25); BAKERpedia, "Dough Mixing" (Joanna Evoniuk, 2018-04-11, modified 2024-07-28).
- Where to find it: https://www.kingarthurbaking.com/blog/2022/10/14/what-is-the-windowpane-test-for-bread-dough
  and https://bakerpedia.com/processes/dough-mixing/, read 2026-11-15 (UTC).
- Claim: pinch a ping-pong-ball sized piece, flatten, rest a couple of minutes, pull gently; it thins
  until it tears or shows light ("achieving the windowpane"); the test says what stage the dough is at,
  not pass or fail. Dough that rises only about an hour before shaping wants nearly full development;
  dough that rises for hours (in the bowl or fridge) wants much less, because it keeps gaining
  strength; enriched doughs need an intensive mix and the test is "especially important"; whole grain
  dough will not behave the same way because bran cuts the strands, and may only show a windowpane after resting overnight;
  a sourdough fermented for days that fails the test just before shaping is best made into flatbread
  (King Arthur Baking). BAKERpedia: final development is the stage of a visible gluten film at the correct
  temperature; letdown and breakdown follow; the film test is a thin translucent stretched piece.
- Subject: [mixing, autolyse, folds, degassing, shaping](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping).
- Conditions as stated: stand-mixer and hand kneading; bakery mixers for BAKERpedia.
- Claim assessment: precision `partial`; observable criteria `strong`; justification `strong` (gluten
  as a web that traps gas; the time-versus-kneading trade); convergence `partial` (two organisations
  agree on the film; only King Arthur Baking gives the limits).
- Level: **B**. Role: plausibility, hypothesis. **Qualifies the owner's example at end of mixing (C11
  family): the windowpane is a stage test with limits, not universal.** Critics of the test outside these
  pages: no source read.

### Mixing stages and the effect of under- and overmixing

- Source: BAKERpedia, "Dough Mixing" (above) and "Mixograph" (Joanna Evoniuk, 2019-01-21, modified 2024-02-23),
  citing MacRitchie 2010 and Hamer and others 2009 (not read).
- Where to find it: https://bakerpedia.com/processes/dough-mixing/ and https://bakerpedia.com/processes/mixograph/,
  read 2026-11-15 (UTC).
- Claim: stages: pick-up (sticky, cold, lumpy), initial development (warmer, smoother, drier), clean-up
  (maximum stiffness, one mass; elastic and poorly extensible), final development (gluten film
  visible, correct temperature), letdown (gluten weakens, too warm and sticky), breakdown (dough
  liquefies, not salvageable). Undermixed (cold): stiff, slow proof, low volume, dense crumb;
  overmixed (warm): slack, fast proof, excessive volume, open crumb. A final dough temperature of
  76 to 82 °F (25 to 28 °C) for makeup. A mixograph curve peaks and then falls as the dough is overmixed (paraphrase).
- Subject: as above.
- Conditions as stated: commercial mixers.
- Claim assessment: precision `partial`; observable criteria `partial` (visual and handling descriptions);
  justification `strong` (disulphide bonds, depolymerisation); convergence `partial` (Iwaki 2020 and
  Vidal 2022 measure a peak and a breakdown in the laboratory).
- Level: **B**. Role: plausibility, hypothesis; the warning signs of overmixing are recorded.

### A finished-dough temperature near 24 to 28 °C appears in three further independent voices

- Source: King Arthur Baking, "5 tips for working with high-hydration doughs" (Martin Philip, 2021-08-30):
  most doughs do well at 75 to 80 °F at the end of mixing; Weekend Bakery, "Tips on dough temperature" (2011-02-16, modified
  2024-12-21): about 24 °C (75 °F) for consistent bulk and proof times, and "Temperature equation" (2026): 24 to 27 °C for most
  sourdough, 26 °C most of the time, and a doubling of fermentation speed for each 5 °C; BAKERpedia
  ("Dough Mixing"): 25 to 28 °C.
- Where to find it: https://www.kingarthurbaking.com/blog/2021/08/30/5-tips-for-working-with-high-hydration-doughs,
  https://www.weekendbakery.com/posts/a-few-tips-on-dough-temperature/, https://bakerpedia.com/processes/dough-mixing/;
  read 2026-11-15 (UTC).
- Claim: bakers set the water temperature to reach a finished-dough target, so that bulk and proof
  times repeat; the target lies between about 24 and 28 °C (paraphrase). The AVPN disciplinare gives 23 °C as the fermentation temperature for Neapolitan dough.
- Subject: [temperature history and recording](dough-behavior.md#d02c-dough-temperature-history-and-recording).
- Conditions as stated: lean and high-hydration breads, sourdough, commercial breads; Neapolitan pizza.
- Claim assessment: precision `strong` (degrees); observable criteria `strong` (a thermometer);
  justification `partial` (repeatable timing; yeast activity peaks near 27 °C, doubling per 5 °C);
  convergence `strong` (four independent voices here, plus the five of the earlier entry).
- Level: **A**. Role: readiness criterion for the end of mixing as a dough-temperature check;
  plausibility check of the timing model's temperature response.

### Preferment ripeness: bubbles, tang, and a dome beginning to recede

- Source: King Arthur Baking, "Preferment" (professional reference, author not stated, undated); BAKERpedia,
  "Poolish" and "Biga" (David Wallace, 2015-06-10, modified 2024-02-19, citing Hamelman 2004 p. 105 and Suas 2009); Weekend Bakery,
  "Artisan bread baking tips: Poolish & biga" (2010-07-29, modified 2023-12-04). The King Arthur Baking and BAKERpedia
  biga statements may share a lineage and count as one voice.
- Where to find it: https://www.kingarthurbaking.com/pro/reference/preferment,
  https://bakerpedia.com/processes/poolish/, https://bakerpedia.com/processes/biga/,
  https://www.weekendbakery.com/posts/more-artisan-bread-baking-tips-poolish-biga/; read 2026-11-15 (UTC).
- Claim: a ripe stiff preferment is fully risen and just beginning to recede in the centre. A ripe poolish has
  its surface covered with small bubbles, carbon dioxide bubbles breaking through, a pleasing aroma
  with a perceptible tang and a slight tang when tasted; one beyond ripeness or sluggish yields bread
  lacking luster and volume (King Arthur Baking). At its peak a poolish's volume starts to fall
  back and the surface wrinkles; fermenting it too long breaks down gluten and raises acidity and alcohol to unacceptable levels
  (BAKERpedia). Over-ripe preferment weakens the dough, especially at 50 % of the final dough (Weekend Bakery). Yeast
  doses by time: 3 % compressed yeast in 1 to 2 h down to 0.25 % in 12 to 15 h at 26 to 29 °C dough, 100 % hydration (BAKERpedia); 0.23 to 0.33 %
  instant yeast for 8 h, 0.1 to 0.2 % for 12 h, 0.03 to 0.08 % for 16 h (Weekend Bakery) (paraphrase).
- Subject: [preferments, levain, scald, soaker](dough-behavior.md#d11-preferments-levain-scald-soaker).
- Conditions as stated: yeast preferments at room temperature, 8 to 16 h.
- Claim assessment: precision `partial` (doses and times, temperatures loosely); observable criteria
  `strong` (bubbles, dome, recession, aroma, taste); justification `partial` (acidity strengthens
  gluten; over-ripe breaks it); convergence `partial` (three organisations agree that a peak exists and
  that past it, quality drops; the sign names differ: recede, wrinkled surface, tang).
- Level: **B**. Role: hypothesis, plausibility check of the yeast dose against time (the two tables
  differ in unit: compressed yeast against instant yeast).
- **Qualifies C12:** no page read says that an alcohol smell is the sign of use-soon; the pages name a pleasant tang
  as the ripe aroma and "alcohol content rises to unacceptable levels" as the cost of waiting too long.

### Pizza maturity: extensible and little elastic, a temperature, and a window

- Source: Verace Pizza Napoletana Association, "Il Disciplinare" (the international specification
  for the collective mark, file named 2022 on the Association's site, date not printed on the pages
  read); King Arthur Baking, "Pizza Crust Recipe" (PJ Hamel, 2009-12-31, revised 2026-11-14), "Whole
  Wheat Pizza Crust Recipe" (2011, revised 2026-09-27) and "Help! My pizza dough keeps shrinking back
  when I shape it" (Annabelle Shippee, 2024-02-14).
- Where to find it: https://www.pizzanapoletana.org/public/pdf/Disciplinare_AVPN_2022.pdf (Italian, eight pages),
  https://www.kingarthurbaking.com/recipes/pizza-crust-recipe,
  https://www.kingarthurbaking.com/recipes/whole-wheat-pizza-crust-recipe,
  https://www.kingarthurbaking.com/blog/2024/02/14/how-to-stretch-pizza-dough; read 2026-11-15 (UTC).
- Claim: Association: the second fermentation and maturation in boxes lasts a variable time; total
  fermentation at least 8 and at most 24 h at 23 °C (plus up to 4 h of working), with a table pairing 1.5 g
  of fresh yeast for 8 h and 0.3 g for 24 h; maturation is the enzymatic breakdown of proteins and starch,
  and good coordination of leavening and maturation gives a dough that is "plastic", extensible and little
  elastic, less tenacious and more digestible; just after mixing the dough is "little extensible and very elastic";
  the mix should be stopped at a single compact mass because overworking (and the heat) makes the gluten
  "incordatura", a fibrous organisation that harms the mechanical properties; the final dough is not sticky, soft and
  plastic, and leaves the box easily; no rolling pin. King Arthur Baking: a pizza dough can be refrigerated 4 to 24 h
  (whole wheat up to 18 h: "more time means more flavor and a more extensible dough"); a dough that snaps back
  needs a 15 min rest, and an overnight fridge rest after preshaping relaxes the gluten so it stretches
  easily; stretch and rest repeatedly until the pan is filled (paraphrase).
- Subject: [rheology and structure over time](dough-behavior.md#d14-rheology-and-structure-over-time).
- Conditions as stated: Neapolitan direct dough, 23 °C, 200 to 280 g balls; home pan and round pizza doughs.
- Claim assessment: precision `strong` (grams per litre of water, hours, °C, tolerance of 10 %);
  observable criteria `partial` (extensible, little elastic, not sticky; no test); justification
  `strong` (an enzymatic mechanism); convergence `partial` (a normative body and a baking company agree that a
  longer rest makes the dough more extensible; they use different windows).
- Level: **B**. Role: plausibility, hypothesis. **Supports C8** (ready = fermented and relaxed) and the idea that
  maturity is a window; the AVPN window (8 to 24 h) differs from the 12 to 24 h in this repository's normative record
  (`data/style-guides.json`, the 2024 regulations): a disagreement between versions, not averaged.

### Bagels: pull early, no rise target after shaping, and a cold window

- Source: King Arthur Baking, "The 5 elements of great bagels" (Andrew Janjigian, 2021-06-29, revised
  2024-08-19), "How to make your best bagels" (Rossi Anastopoulo, 2022-02-23, quoting a staff baker), Water
  Bagels Recipe (revised 2026-11-13); BAKERpedia, "Bagel" (Joanna Evoniuk, 2018-10-25).
- Where to find it: https://www.kingarthurbaking.com/blog/2021/06/29/the-5-elements-of-great-bagels,
  https://www.kingarthurbaking.com/blog/2022/02/23/how-to-make-your-best-bagels-tips,
  https://www.kingarthurbaking.com/recipes/water-bagels-recipe, https://bakerpedia.com/processes/bagel/;
  read 2026-11-15 (UTC).
- Claim: some recipes ferment in bulk and then shape, boil and bake in quick succession; others proof
  the shaped bagels for a long time, usually in the fridge, which gives a "wide window of readiness" and, because the
  cold slows fermentation, no worry of overproofing. Bagels should not get too puffy: pull the dough a
  little early, "definitely before they double in size", because over-proofed bagels deflate in the water bath and are
  delicate to handle; a very high hydration (about 65 %) limits the long proof. The Water Bagels recipe lets
  the dough rise until doubled in bulk (1 to 1.5 h) before shaping, then boils 30 s per side; shaped and refrigerated overnight bagels
  "will not need to warm up or rise any further". BAKERpedia: proof 60 min at 38 to 43 °C, cold retardation is characteristic;
  in the kettle the rings sink for about 30 s, then float (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: bagels of about 60 to 65 % hydration, high-protein flour, a boiling bath; commercial
  proof for BAKERpedia.
- Claim assessment: precision `partial`; observable criteria `partial` ("not too puffy", before doubling);
  justification `strong` (tension relaxes; overproofed pieces deflate); convergence `partial` (two organisations,
  plus the survey's recipes with a retard).
- Level: **B**. Role: hypothesis. **Qualifies C7:** no rise criterion after shaping exists, but "do not over-proof"
  is a ceiling; bulk "to double" before shaping is in the King Arthur water-bagel recipe; a rise to double is
  not the target of the shaped bagel.

### The float test does not show that dough has risen enough

- Source: King Arthur Baking, "The float test for yeast dough and sourdough starter" (PJ Hamel, 2019-01-02,
  revised 2024-11-13). One voice.
- Where to find it: https://www.kingarthurbaking.com/blog/2019/01/02/the-float-test-for-yeast-dough-and-sourdough-starter,
  read 2026-11-15 (UTC).
- Claim: a scoop of fully risen dough floats in water; but dough risen for only 30 minutes of a 60 to 90
  minute rise also floats ("false positive"), and a fed starter that is not ready floats; if the dough
  sinks it is certainly not ready, but floating does not show that it is; the poke test is advised
  instead, and a ripe starter doubles reliably in 6 to 8 h after feeding (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: pain de mie dough; a sourdough starter.
- Claim assessment: precision `partial`; observable criteria `strong` (a test with photographs and a
  false-positive demonstration); justification `strong` (gas trapped makes it lighter than water);
  convergence `weak` (one voice).
- Level: **B**. Role: hypothesis. **A necessary, not a sufficient test**: "sinks" means not ready.

### A fridge window of 18 to 24 hours in the King Arthur pizza recipes

- Source: King Arthur Baking, Pizza Crust Recipe and Whole Wheat Pizza Crust Recipe (above); Weekend Bakery,
  "The Temperature Equation" (2026): fridge retard 12 to 16 h at 2 to 4 °C, 16 to 24 h for well-bulked dough, with a table of
  bulk times against room temperature (18 °C: 7 to 9 h, 24 °C: 4 to 5 h, 30 °C: 2 to 3 h).
- Where to find it: https://www.kingarthurbaking.com/recipes/pizza-crust-recipe,
  https://www.kingarthurbaking.com/recipes/whole-wheat-pizza-crust-recipe and
  https://www.weekendbakery.com/posts/the-temperature-equation-timing-your-fermentation/, read 2026-11-15 (UTC).
- Claim: the pizza dough rises 45 min at room temperature, then keeps in the fridge 4 to 24 h while
  rising slowly, and is taken out 2 to 3 h before serving; whole wheat up to 18 h (King Arthur Baking). A colder
  fridge allows a longer retard (Weekend Bakery).
- Subject: [cold end and long refrigeration](dough-behavior.md#d02b-cold-end-and-long-refrigeration).
- Conditions as stated: sandwich and pizza doughs, an assumed healthy 20 % sourdough inoculation for the table.
- Claim assessment: precision `strong`; observable criteria `weak`; justification `partial`; convergence
  `partial` (consistent with the earlier entry on hold windows).
- Level: **B**. Role: plausibility check. No page read says what degrades at the end of a window.

### Autolyse: 20 to 60 minutes at 23 to 25 °C, and a dough that feels less sticky and very smooth

- Source: BAKERpedia, "Autolyse" (David Wallace, 2015-06-07, modified 2024-02-19), citing Calvel's 1974
  discovery (reference not read).
- Where to find it: https://bakerpedia.com/processes/autolyse/, read 2026-11-15 (UTC).
- Claim: flour and water are pre-blended and rested; protein bonds continue to form without
  mechanical work, protease activity acts on the gluten (higher at low pH, so autolysed doughs with
  yeast or a preferment are more extensible, weaker and softer), and afterwards the dough feels less
  sticky and very smooth; the longer the autolyse, the shorter the mixing, the more extensible and less elastic
  the dough and the lower its tolerance to overmixing; 2 to 3 min of blending, 20 to 60 min of rest at 73 to
  77 °F (23 to 25 °C), covered (paraphrase).
- Subject: [mixing, autolyse, folds, degassing, shaping](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping).
- Conditions as stated: commercial and artisan bread, croissant and brioche doughs.
- Claim assessment: precision `strong` (minutes, degrees); observable criteria `partial` (feel: less
  sticky, very smooth); justification `strong` (hydration, proteases); convergence `weak` (one voice here).
- Level: **B** (observable criteria `partial` keeps it below A).
- Role: hypothesis. **Relevant to C6:** a smooth, less sticky, more extensible dough is what a long rest of
  flour and water is said to produce, which is a plausible mechanism for the owner's no-knead sign; no
  source read describes the 24 to 48 h no-knead procedure itself.

Levels recorded in this section (16 entries): A 1, B 12, C 3.

## Register entries from craft pages read on 2026-11-16 (UTC)

A third reading pass, to fill the stages the first two left thin. Pages were fetched from the shell
with a generic client name and an `Accept: text/html` header. `modernistcuisine.com` was tried again and
refused again: the shell got an HTTP/2 protocol error and the fetch tool could not resolve the name, so it
stays unread. Two pages of the 2026-11-15 pass (the 2014 over-risen page, the 2023 proofing page) were
re-read because the entries of the 2026-11-15 pass gave no URL for them; the URLs are given in those entries. Reader comments on a blog
are recorded as comments, never as the author's statement, and are level C. Common fields: recognition,
longevity, reach: `not recorded` unless stated; King Arthur Baking sells flour and equipment and is one
voice; BAKERpedia is a trade publisher's reference site; Weekend Bakery is a micro-bakery blog. All
entries: Checked 2026-11-16 (UTC), research agent; **Proposals** like the others.

### The poke test judged by the tightness of the dough, and a starter used as it just turns ripe

- Source: King Arthur Baking, "How to produce an open crumb in sourdough bread" (Maurizio Leo, a
  contributor who bakes sourdough at home and blogs on it; published 2020-11-05, revised 2024-08-19). One voice.
- Where to find it: https://www.kingarthurbaking.com/blog/2020/11/05/how-to-produce-an-open-crumb-in-sourdough-bread,
  read 2026-11-16 (UTC).
- Claim: for the final proof the dough should be risen, puffy, light and soft; a gentle poke should not feel
  dense and tight; if the inside still feels tight give it another 30 min at room temperature and check
  again; if it feels very soft and weak, or large bubbles show beneath the surface, bake. The starter is used
  as it just turns ripe (risen perceptibly in its jar, scattered bubbles on top and sides, a sour but not too
  sour aroma, a loosened consistency); one that is overly sour and broken down passes too much acidity to the
  dough and in the author's experience gives a tighter crumb (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: a sourdough boule, a starter fed about every 12 h at 74 to 78 °F, room or overnight fridge proof.
- Claim assessment: precision `partial` (30 min steps, feeding temperature; no poke depth); observable criteria
  `strong` (feel, bubbles, aroma, consistency); justification `partial` (acidity and crumb); convergence `weak` (one voice).
- Level: **B**. Role: hypothesis. A third way to read the poke: by the feel of the interior, not by whether the
  dent stays. The starter signs are for a sourdough starter, not for a yeast poolish.

### Pan focaccia is proofed until very bubbly, because the pan limits the cost of over-proofing

- Source: King Arthur Baking, "How can I get a more bubbly, open crumb in my focaccia?" (page by Rossi Anastopoulo,
  2026-04-09), an edited excerpt of the company's podcast "Things Bakers Know" with its two hosts speaking.
  One voice; a spoken opinion, not a recipe.
- Where to find it: https://www.kingarthurbaking.com/blog/2026/04/09/open-crumb-focaccia, read 2026-11-16 (UTC).
- Claim: the dough in the pan should wait in a warm place until it looks visibly very bubbly and jiggles like a
  marshmallow when the pan is shaken; over-proofing a free-standing loaf makes it spread and lose its shape,
  whereas a pan holds it, so a pan bread can be pushed further, which is not a licence to over-proof every pan
  loaf (paraphrase). A hydration of about 80 % or more is said to give a reasonably open crumb.
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: a high-hydration focaccia in an oiled pan.
- Claim assessment: precision `weak` (no times, no temperature); observable criteria `partial` (bubbly, jiggle); justification
  `partial` (the pan holds the shape); convergence `weak` (one voice).
- Level: **C**. Role: hypothesis. Qualifies the idea that "over-proofed" is one state for every dough: the cost depends on whether the dough can spread.

### The poke test on chilled dough, and a small sample to read the volume: reader comments

- Source: reader comments under Weekend Bakery, "The myth of double in size +tips!" (page published 2012-02-12, modified
  2019-05-18): a reader "Jacob" (2018-12-15 21:12) and the blog's reply "Weekend Bakers" (2018-12-18 21:48); readers
  "Eric S" (2021-08-06 16:01), "Steph" (2025-02-08 21:33) and others on the jar. 105 comments in all; commenters are not
  identified as bakers. Level C by the register's rule on comments.
- Where to find it: https://www.weekendbakery.com/posts/the-myth-of-double-in-size/, read 2026-11-15 and again 2026-11-16 (UTC).
- Claim: (1) the poke test does not help once the dough has been chilled, because it always feels too tough or
  pliable (Jacob); the reply gives no test, only advice to be patient with a cold dough and let it reach its size.
  (2) To read volume, put a small piece of dough in a straight-sided jar or a shot glass beside the bowl, mark its
  level (a pen mark or an elastic band) and compare (several readers); Eric S calls the technique an "aliquot jar"
  and says it has caught on among serious home bakers and has a tradition in panettone making (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: sourdough and yeast doughs; the shot-glass reader squashes the ball to half fill the glass.
- Claim assessment: precision `weak`; observable criteria `partial` (a marked sample); justification `weak`;
  convergence `weak` (several readers on the jar; independence not recorded).
- Level: **C**. Role: hypothesis. The sample-jar method has no author's statement and no other page read mentions it.

### Marks in the lidded tin: one half to one inch below the lip, in five more recipes

- Source: King Arthur Baking recipes, one voice: 100% Whole Wheat Pain de Mie (PJ Hamel, 2007, revised 2026-11-14),
  A Smaller 100% Whole Wheat Pain de Mie (2010, revised 2026-07-30), A Smaller Pain de Mie (2010, revised 2026-11-14),
  Bee Keeper's Pain de Mie (2016, revised 2026-10-08), Golden Spiced Pullman Loaf (2017, revised 2026-11-14), and the
  blog post "Honey-Oat Pain de Mie" (2011, revised 2024-07-22).
- Where to find it: https://www.kingarthurbaking.com/recipes/100-whole-wheat-pain-de-mie-recipe,
  https://www.kingarthurbaking.com/recipes/a-smaller-100-whole-wheat-pain-de-mie-recipe,
  https://www.kingarthurbaking.com/recipes/a-smaller-pain-de-mie-recipe,
  https://www.kingarthurbaking.com/recipes/bee-keepers-pain-de-mie-recipe,
  https://www.kingarthurbaking.com/recipes/golden-spiced-pullman-loaf-recipe,
  https://www.kingarthurbaking.com/blog/2011/10/18/honey-oat-pain-de-mie-comfort-bread; read 2026-11-16 (UTC).
- Claim: 13 inch lidded pan, whole wheat: rise until about 1/2 inch below the lip, about 45 min; 9 inch pan,
  whole wheat: until the domed centre is about 3/4 inch below the lip, 60 to 90 min; 9 inch pan, white: within about
  1/2 inch of the top edge, about 60 min; Bee Keeper's: just below the lip, 60 to 90 min, with the lid left open about an inch to
  watch; Golden Spiced: after 30 min push the lid back, and when the dough is within 1/2 inch of the top close it and bake;
  Honey-Oat post: about 1 inch from the lid, and if it is not risen enough it will not fill the pan whereas too much risks
  popping the lid off. Bulk in the same recipes: "puffy though not necessarily doubled", about 1.5 h (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: yeast sandwich doughs in 9 or 13 inch lidded pans; oven 350 °F in the small recipe.
- Claim assessment: precision `partial` (inches, minutes; no room temperature); observable criteria `strong` (a
  mark against a rim, with the lid as a guard); justification `partial` (fill the pan without lifting the lid);
  convergence `weak` (one voice, whose own figures differ by a factor of two).
- Level: **B**. Role: hypothesis. **Qualifies C6:** about 1/2 inch (1.3 cm) to 1 inch (2.5 cm) below the lip; the owner's 1 cm is
  close to the smaller figures and not outside the range of one site's own recipes.

### Refrigerating dough: one rise cold, 8 to 12 hours, and what to do on the way out

- Source: King Arthur Baking, "Can you refrigerate bread dough and bake it later?" (Annabelle Shippee, with a member of the
  company's Baker's Hotline, 2021-09-28, revised 2025-04-01). One voice.
- Where to find it: https://www.kingarthurbaking.com/blog/2021/09/28/how-to-refrigerate-bread-dough-to-bake-later, read 2026-11-16 (UTC).
- Claim: replace a 1 to 3 h room rise by an 8 to 12 h rise in the fridge (up to about 16 h, depending on the recipe, without
  over-proofing); chill during only one of the two rises; let the dough rise 20 to 30 min on the counter first (less in a warm
  kitchen or with a high dose); start the dough at 75 to 80 °F because above 80 °F the fridge may not cool it before it
  over-proofs; fill the container to about one third; keep it covered. After a cold bulk, let the dough warm 40 to 60 min until
  slightly puffy before shaping, helped by a stretch and fold; rolls can be shaped straight from the fridge. A shaped loaf that
  has not puffed in the fridge may need an hour on the counter: "a judgment call" (paraphrase).
- Subject: [cold end and long refrigeration](dough-behavior.md#d02b-cold-end-and-long-refrigeration).
- Conditions as stated: yeast doughs, sandwich and artisan loaves, rolls, focaccia.
- Claim assessment: precision `strong` (hours, degrees, a fill ratio); observable criteria `partial` (slightly puffy; no sign for the end of the window); justification `partial` (cold slows
  fermentation; dryness limits the rise); convergence `partial` (agrees with the pizza and bagel windows of other entries).
- Level: **B**. Role: plausibility check, hypothesis. **Bears on C4:** the folds here warm and strengthen a dough coming out of the fridge; no
  page read says that folds or degassing keep a held dough in check.

### A preferment past its peak: its look, a way to buy time, and a rescue (replies in comments)

- Source: replies by "Weekend Bakers" (the blog's authors) to readers under "Artisan bread baking tips: Poolish & biga"
  (page published 2010-07-29, modified 2023-12-04): 2012-04-03 09:57 (to a reader whose poolish tripled, then fell to double, with a
  stronger alcohol smell) and 2018-09-15 19:54 (to a reader asking how to tell). Replies in comments: level C by the rule on comments.
- Where to find it: https://www.weekendbakery.com/posts/more-artisan-bread-baking-tips-poolish-biga/comment-page-1/ and
  https://www.weekendbakery.com/posts/more-artisan-bread-baking-tips-poolish-biga/comment-page-4/, read 2026-11-16 (UTC).
- Claim: an over-ripe poolish becomes thinner and eventually soupy, and leaves a rim in the bowl where it rose and fell; one
  that is foamy and collapsed has a weaker gluten structure, and as a rescue the final dough can be made with less water (not a
  habit, it will not be the best loaf); one that is not yet fully active can be compensated with a little more yeast in the final
  dough; to gain time, use less yeast in the poolish or use the fridge to slow it. The reply does not address the alcohol smell the reader
  reported. To another reader (2018-03-21 19:24) whose neglected rye starter smelled of alcohol with a hint of acetone, the reply
  (2018-03-23 20:25) says the acetone hint is unwanted and to refresh the starter sooner or stir more, since the "nail polish" bacteria dislike oxygen. A reader quotes a video: a poolish that has risen and collapsed is over-ripe, one just starting to collapse is ready (paraphrase).
- Subject: [preferments, levain, scald, soaker](dough-behavior.md#d11-preferments-levain-scald-soaker).
- Conditions as stated: yeast poolish at 8 to 16 h; no temperature, no flour.
- Claim assessment: precision `weak`; observable criteria `partial` (consistency, rim); justification `partial` (gluten broken down);
  convergence `partial` (agrees with the main article and BAKERpedia on weakening; no other page gives the fridge or the water action).
- Level: **C** (precision `weak`). Role: hypothesis. **Bears on C12:** the "use soon or chill" action is stated here, for a collapsed or
  soupy poolish and not for the alcohol smell; the smell itself is only a reader's observation.

### Bagel dough in two more King Arthur recipes: a retard of 8 to 12 hours, or a rise to double and a short chill

- Source: King Arthur Baking, Martin's Bagels (Martin Philip, published 2019-04-21, revised 2026-11-13) and Bagels with Pâte
  Fermentée (a recipe by Jeffrey Hamelman, published 2020-05-07, revised 2026-11-14). One voice for convergence.
- Where to find it: https://www.kingarthurbaking.com/recipes/martins-bagels-recipe and
  https://www.kingarthurbaking.com/recipes/bagels-with-pate-fermentee-recipe, read 2026-11-16 (UTC).
- Claim: Martin's: a poolish of 2 to 8 h at room temperature, a dough rested 2 h with three or four folds after the first hour, then 8 to 12
  h in the fridge, 1 to 2 h on the counter, divide, shape, rest 20 to 30 min, boil 30 s then 60 to 90 s on the other side; shaped bagels can
  also be refrigerated overnight and boiled straight from the fridge. Hamelman's: the dough rests 2 h at 75 to 78 °F "to double in bulk,
  or at least expand considerably", shaped bagels are refrigerated 2 h, boiled 1 min per side; or rise 1 h then refrigerate overnight
  and deflate next day. Neither recipe uses a float test or a rise target after shaping (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: bread flour bagels; dose by volume (1/4 to 3/4 tsp in the poolish and dough; 1 3/4 tsp instant yeast in the pâte fermentée version).
- Claim assessment: precision `partial` (times, degrees, yeast by volume); observable criteria `partial`; justification `partial` (the
  chill relaxes and flavours); convergence `partial` (agrees with the 2026-11-15 bagel entry from the same site).
- Level: **B**. Role: hypothesis. **Bears on C7:** two further recipes with no rise target after shaping and, in one, a rise to "double or at least
  considerably" in bulk; no source read gives a dose near 2 % of flour.

### A pizza dough kept 24 hours at 6 °C is taken out an hour before use

- Source: Weekend Bakery, "A pizza adventure part II + new 24h dough recipe" ("Weekend Bakers", published 2018-08-12, modified
  2025-06-01); the authors tested short, medium and long fermentation and prefer the long fridge-retarded one.
- Where to find it: https://www.weekendbakery.com/posts/a-pizza-adventure-part-ii-new-24h-dough-recipe/, read 2026-11-16 (UTC).
- Claim: the shaped balls ferment about 24 h in a fridge at about 6 °C with the yeast dose set for that time and temperature
  (a table of yeast against time and temperature is given); the dough is taken out about 1 h before use because it is easier
  to handle; the long dough is better in depth of flavour and structure than a 2 h dough (paraphrase).
- Subject: [cold end and long refrigeration](dough-behavior.md#d02b-cold-end-and-long-refrigeration).
- Conditions as stated: a 13 % protein Italian 00 flour (W above 300); the fridge temperature is the one of the authors' fridge.
- Claim assessment: precision `strong` (hours, 6 °C, yeast by weight); observable criteria `weak` (no sign of ripeness); justification `weak`;
  convergence `partial` (a fourth window next to the Association's 8 to 24 h at 23 °C and King Arthur Baking's 4 to 24 h).
- Level: **B**. Role: plausibility check. Nothing on the end of the window or on an over-matured ball.

### Dark spots in the proofer come from humidity, not from the age of the dough

- Source: BAKERpedia, "The Importance of Proofing" (Ray Pearce, published 2020-07-08, modified 2024-02-20), a trade reference
  blog on commercial pan bread and rolls.
- Where to find it: https://bakerpedia.com/the-importance-of-proofing/, read 2026-11-16 (UTC).
- Claim: a proof box saturated with water vapour causes blisters and a tough crust and can cause dark spots from sugars leaching to
  the surface; too high a humidity also weakens the crust and sticks the dough; a dough leaving the proofer above about 33 to 36 °C is more
  fluid and extensible and more exposed to rupture, and enzyme activity doubles for every 18 °F (10 °C); in the worst case the dough breaks
  down and is discarded or baked below volume (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point).
- Conditions as stated: commercial proofing of pan bread, buns and rolls.
- Claim assessment: precision `weak` (no figures for the spots); observable criteria `partial`; justification `partial`; convergence `weak` (one voice).
- Level: **C**. Role: hypothesis, and a negative finding: the only page read that names dark spots on dough ties them to proofer humidity.
  **Bears on C9:** it does not support dark spots as a sign of a matured pizza ball, and it does not contradict it either (another dough, another cause).

### Over- and under-proofed bread: causes and remedies for the next batch, and the temperature rule of thumb

- Source: BAKERpedia, "BAKERguide: Baking Bread" (a 20-page PDF from the site's downloads, file created 2026-03-04) and
  "Final Proofing: A Key Thermal Step" (Ray Pearce, published 2019-07-24, modified 2024-02-20), "A Proof Tolerant Yeast to Control Your Dough"
  (Lin Carson, published 2019-07-09, modified 2024-02-20; a product page for a maltose-negative yeast).
- Where to find it: https://bakerpedia.com/wp-content/uploads/simple-file-list/BAKERguides/BAKERguide-Baking-Bread.pdf,
  https://bakerpedia.com/final-proofing-a-key-thermal-step/, https://bakerpedia.com/proof-tolerant-yeast-to-control-dough/; read 2026-11-16 (UTC).
- Claim: over-proofed bread is caused by too much yeast, too much fermentable sugar, a warm proofing environment or a long rise, and
  the remedies are less yeast, less sugar, cooler water or room, and a cooler proof; under-proofed bread is the reverse, with colder dough and too
  short a rise; none of the three pages says how to rescue a dough already over-proofed. The final proof makes the gluten extensible again
  after moulding, and yeast activity doubles for every 18 °F (10 °C). A proof-tolerant yeast is sold so that a dough can wait at ambient temperature for up to 24 h
  (a product claim) (paraphrase).
- Subject: [readiness profiles and end point](dough-behavior.md#d04a-readiness-profiles-and-end-point) and
  [temperature history and recording](dough-behavior.md#d02c-dough-temperature-history-and-recording).
- Conditions as stated: commercial proofing at 90 to 100 °F, 50 to 70 min, 80 to 90 % humidity.
- Claim assessment: precision `weak` (qualitative table); observable criteria `weak`; justification `partial`; convergence `weak`.
- Level: **C**. Role: hypothesis; plausibility check of the temperature response. **A disagreement, recorded and not averaged:**
  BAKERpedia says activity doubles per 10 °C; Weekend Bakery's 2026 page says it doubles per 5 °C, yet says a dough at 30 °C ferments "nearly twice as fast" as one at
  21 °C (a 9 °C gap).

### A too-extensible dough is a slack, over-mixed or over-watered dough, in the trade reference

- Source: BAKERpedia, "Dough Handling Properties" (Joanna Evoniuk, published 2019-02-25, modified 2024-07-28), citing Cauvain and Steffe (not read).
- Where to find it: https://bakerpedia.com/processes/dough-handling-properties/, read 2026-11-16 (UTC).
- Claim: extensibility is the ability to be stretched, elasticity the ability to spring back; a dough that is too extensible, with very low
  elasticity and poor resistance, is slack, may be overmixed (warm and sticky) or over-hydrated, and gives too much pan flow, sharp
  corners, and excessive volume or collapse from excessive oven spring; a dough that is too elastic may be undermixed, stiff and tough, and
  gives poor volume and a poor shape (paraphrase).
- Subject: [rheology and structure over time](dough-behavior.md#d14-rheology-and-structure-over-time).
- Conditions as stated: commercial bread and pizza crust processing.
- Claim assessment: precision `weak`; observable criteria `partial` (slack, sticky); justification `partial`; convergence `weak`.
- Level: **C**. Role: hypothesis. **Bears on C8:** the page names "too extensible" as a defect of mixing and water, not of long maturation; no source read
  connects it to a short fridge stay.

### A laboratory bread test sets the exit temperature of the dough and checks the gluten film

- Source: BAKERpedia, "Bread Baking Test" (Joanna Evoniuk, published 2019-05-16, modified 2024-02-19), a method summary after an
  AACC International method.
- Where to find it: https://bakerpedia.com/processes/bread-baking-test/, read 2026-11-16 (UTC).
- Claim: the mixing time depends on flour strength and mixing speed, and the end point is checked with a gluten film test; the water is
  adjusted so that the dough leaves the mixer at 84 ± 1 °F (29 ± 0.5 °C); fermentation and proof run at 86 ± 2 °F (30 ± 1 °C) and 85 % humidity (paraphrase).
- Subject: [mixing, autolyse, folds, degassing, shaping](dough-behavior.md#d12b-mixing-autolyse-folds-degassing-shaping).
- Conditions as stated: micro-mixer test bakes of 10 to 100 g flour; not a home process.
- Claim assessment: precision `strong`; observable criteria `strong` (a thermometer and a film); justification `partial`; convergence `partial`
  (the two readiness checks of the mixing end appear together here, as in the other pages).
- Level: **B**. Role: plausibility; it shows that the temperature check and the film check are used together.

Levels recorded in this section (12 entries): A 0, B 6, C 6. Across the three sections of
2026-11-14 (10 entries, the four short statements counted individually), 2026-11-15 (16) and 2026-11-16 (12) together:
38 entries, A 2, B 22, C 14.

## Calibration

**Proposal (item 8):** the calibration procedure below is agent-authored. The grid is tried by an independent agent on the same three examples, working only from the
survey's records and this file, without the levels above, to see whether it reaches the same
levels. If it does not, the definitions are revised, not the agent, and the difference is recorded
here with its UTC date.

**Run of 2026-11-12 (UTC).** An independent agent rated the three examples from the file's grid
and the survey's records, before reading the entries; it had been told the author's three levels
in its brief, so the rating was not blind. Agreement on 2 of 3. The divergence was the baguette:
the author's level was B, the independent rating C. It traces to the wording of the `partial`
cell of convergence ("more agree only in order of magnitude"), which let other baguette pages
with proof times 25 to 90 min, a factor of about 3 apart, count as support; the grid also did not
say whether convergence is judged from the entry's own record or from the whole survey. The rule
changed, not the agent: the convergence cell was changed (Proposal, item 6) and the entry
template asks for the other entries used. The baguette was re-rated C under it; the no-knead and
Neapolitan entries stay C. The run also showed that the grid did not say whether baker's
percentages count as weighed: with a stated flour mass they do (Proposal, item 7); the precision
of the Neapolitan entry stays `weak` here because no flour mass is stated, while the independent
agent rated it `partial` or `weak`, with the same level.

**Second re-rating, 2026-11-12 (UTC).** A second agent re-rated the three examples under the
tightened grid and reached C, C, C. It had read the author's entries and the first agent's
report, so this rating is not blind either; it only re-checks the arithmetic against the
survey's data. **A blind calibration has not been run.** It needs an agent that has seen neither
the entries nor any level (an open question for the owner in
[evidence-classification.md](evidence-classification.md#open-questions-for-the-owner)).

## Proposals beyond the owner's decision

Each waits for the owner's confirmation; none changes a model.

1. The file name and its place in `docs/science/`.
2. The three ratings per criterion and their definitions, and the rule that `not recorded` counts
   as `weak`.
3. The rules that map the ratings to level A, B or C.
4. The ceiling of use by level (A, B, C).
5. The three worked examples and their levels, as the first entries (as re-rated after the
   calibration run).
6. The convergence row of the grid (its `partial` and `weak` cells) and the listing of the other
   entries used in the entry template.
7. The line that baker's percentages with a stated flour mass count as weighed.
8. The tie-breaker wording for popularity; the row of the table that a craft claim is never
   averaged with a measurement; the restriction "no scans or photographs of pages"; the sentence that
   a comparison of a forecast with published schedules is a plausibility check, never a validation
   or fit of a coefficient (stated to resolve a tension with the model's acceptance criterion); the
   three uses of the "May" column beyond the plausibility check (a readiness criterion, a
   hypothesis, a starting value); the three rules under "Rules that qualify the level" (the standing
   of a source is a starting point, copies are not convergence); the calibration procedure.
