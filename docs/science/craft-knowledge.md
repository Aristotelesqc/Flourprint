# Craft knowledge: a register of practitioner claims

This register holds what bakers, books, courses, manufacturers and recipe sites say about dough,
kept apart from measurements so the two are never confused. It is not scientific data. It is
valuable because published science mostly measures gas in high-dose laboratory doughs and says
little about taste, texture and when a dough is ready, especially for long fermentations at a low
yeast dose.

**Authority.** Owner decision, 2026-11-12 (UTC), recorded by PR #276 (issue #231). The file name,
the level rules and everything marked **Proposal** go beyond that decision and wait for the
owner's confirmation. It is documentation only: no model, coefficient, equation, contract, engine
or screen changes. The separate scheme for scientific sources is in
[evidence-classification.md](evidence-classification.md); the two never mix.

## What the register may and may not do

| May                                                                    | May never                                                                                                                                     |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Check the plausibility of a model prediction.                          | Fit or validate a model coefficient. The [coefficient rule](evidence-classification.md#5-role-for-the-model) is the one place that states it. |
| Give a subjective readiness criterion ("the dough is ready when ..."). | Be given a scientific source role (`fit`, `independent validation`, or any other).                                                            |
| Suggest a hypothesis to test.                                          | Be presented as a measurement, or averaged with one (**Proposal**: the second half).                                                          |
| Supply a starting value for a recipe.                                  |                                                                                                                                               |

**Proposal (item 8).** Comparing a forecast with published schedules is a plausibility check of a
prediction; it is never a validation or a fit of a coefficient. The three uses in the "May" column
beyond the plausibility check (a readiness criterion, a hypothesis, a starting value) are likewise
agent-authored and wait for the owner's confirmation.

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

[data/published-recipes-2026-10.md](data/published-recipes-2026-10.md) (89 recipes, with `.json`)
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
