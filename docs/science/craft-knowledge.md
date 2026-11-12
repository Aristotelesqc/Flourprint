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
| Suggest a hypothesis to test.                                          | Be presented as a measurement, or averaged with one.                                                                                          |
| Supply a starting value for a recipe.                                  |                                                                                                                                               |

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

| Criterion           | `strong`                                                                                                                       | `partial`                                                               | `weak`                                                                            |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Subject             | Always recorded: the domain of [dough-behavior.md](dough-behavior.md#domains) the claim attaches to, by its anchor. Not rated. |                                                                         |                                                                                   |
| Precision           | The quantities the claim depends on are weighed in grams, measured in degrees, timed.                                          | Some are, others are by volume or approximate.                          | "A pinch", "room temperature", "a warm place": record the vagueness as vagueness. |
| Observable criteria | Says how to recognise the result in checkable terms: a measured rise in a stated vessel, a described test, step photographs.   | Names a cue without conditions ("until doubled").                       | None given.                                                                       |
| Justification       | Explains why, with a mechanism or a trade-off the claim depends on.                                                            | A reason in passing.                                                    | Only asserts.                                                                     |
| Convergence         | Three or more independent voices agree within the stated conditions.                                                           | Two independent voices agree, or more agree only in order of magnitude. | One voice, copies, or independence not recorded.                                  |

A field the record does not hold is written `not recorded` and counts as `weak` for the level. The
level is then marked as resting on an incomplete record, and filling the field can raise it,
never lower it.

## Level A, B or C

One level per claim, with the reason written beside it. There is no score out of 100.

| Level | Rule                                                                                                                                 |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------ |
| A     | Precision `strong` and observable criteria `strong`, and justification or convergence at least `partial`.                            |
| B     | Precision at least `partial`, and at least one other criterion (observable criteria, justification, convergence) at least `partial`. |
| C     | Anything else, in particular precision `weak`, or numbers with nothing else behind them.                                             |

**Proposal.** The level may bound the use of a claim: A may serve as a readiness criterion; B as a
plausibility check, a recipe default or a hypothesis; C only as a hypothesis to test, never shown
to a baker as guidance.

### Rules that qualify the level

- **Popularity counts, but less than the rest.** It shows that a method works often enough for
  many people, not that it is exact, and popular errors get copied. It is recorded under reach,
  never lifts a level by itself, and is a tie-breaker at most.
- **The source's standing is a starting point, not a verdict.** An obscure blog that gives
  weights, temperatures and step photographs can yield a level A claim; a famous book that says
  "let rise until doubled" without conditions yields level C. The level comes from the claim.
- **Copies are not convergence.** Ten blogs copying one book are one voice. Where independence is
  not recorded, convergence is `weak`.

## Copyright

This repository is public. No long excerpts from books or courses. A short quotation, or better a
paraphrase, with the page or the URL. No PDFs, no scans, no photographs of pages. A claim is
recorded by what it says and where to find it, never by reproducing the source.

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
  (each strong, partial, weak or not recorded, with a reason)
- Level: A, B or C, with the reason
- Role: plausibility, readiness criterion, hypothesis or recipe default
- Checked: UTC date (ISO), and who
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
fermentation. The survey's read status is recorded two ways, which this register does not settle:
the data files record full snapshot reads, while [README.md](README.md) describes the style-guide
data as read through web-search excerpts.

## Register: first entries

Three worked examples, all taken from the survey's records; nothing was fetched and no quotation
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
  `not recorded`; justification `not recorded`; convergence `partial` (three other baguette pages
  of the survey, from two other independent sites, give 25 to 35 min of shaped proof at 0.36 to
  0.59 % instant yeast and 60 to 90 min at 0.36 %, temperatures "room" without degrees: they agree
  in order of magnitude only; the two Weekend Bakery pages count as one voice).
- Level: **B**, on an incomplete record. Precision is partial and convergence is partial; no cue
  or reason is recorded, so it cannot be A.
- Role: plausibility check of a proof time at about 20 °C; recipe default for that stage (the
  survey's preset uses the midpoint, 52.5 min). Not a readiness criterion: no cue is
  recorded.
- Checked: 2026-11-12, research agent (Claude).

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
  criteria `not recorded`; justification `not recorded`; convergence `weak` (five other no-knead
  pages of the survey give 14 h at 21 °C, 9 to 12 h, 8 to 18 h in a "warm place", 3 h, and 2 h
  plus a chill, at 0.17 to 0.21 % instant yeast for three of them and 0.8 % and 1.56 % for the
  other two, but the survey does not record whether they descend from this recipe, and copies are
  not convergence).
- Level: **C**, on an incomplete record. Only the precision reaches `partial`; nothing else stands
  behind the numbers. The standing of the attributed baker cannot lift it: it is a starting point.
- Role: hypothesis to test (a long ferment near 0.2 % yeast at 22 °C); not a plausibility check
  of the model, not a recipe default.
- Checked: 2026-11-12, research agent (Claude).

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
- Claim assessment: precision `weak` (flour not stated, yeast subtype unspecified, "room" without
  degrees, one temperature not stated); observable criteria `not recorded`; justification `not
recorded`; convergence `weak` (another aggregator page of the survey, RecipeLion, gives 0.05 %
  instant yeast over 18 to 20 h of bulk plus 4 to 6 h, but the survey records no original author
  for either page, so independence is not recorded and they may be one voice).
- Level: **C**. Precision is weak. A normative record in `data/style-guides.json` (the AVPN
  regulations: 0.1 to 3 g of fresh yeast per litre of water, that is about 0.006 to 0.19 % of
  flour, our division, and 12 to 24 h of total fermentation) puts the dose and the duration in
  the same range; it is a professional body's specification, a different kind of voice, and
  belongs in an entry of its own, not as a copy of this page.
- Role: hypothesis only; not a recipe default.
- Checked: 2026-11-12, research agent (Claude).

No example reaches A: the survey records no observable criteria, which A requires. That is a gap
in the survey's fields, not a verdict on the sources.

## Calibration

The grid is to be tried by an independent agent on the same three examples, working only from the
survey's records and this file, without the levels above, to see whether it reaches the same
levels. If it does not, the definitions are revised, not the agent, and the difference is recorded
here with its UTC date. Status as of 2026-11-12 (UTC): not run.

## Proposals beyond the owner's decision

Each waits for the owner's confirmation; none changes a model.

1. The file name and its place in `docs/science/`.
2. The three ratings per criterion and their definitions, and the rule that `not recorded` counts
   as `weak`.
3. The rules that map the ratings to level A, B or C.
4. The ceiling of use by level (A, B, C).
5. The three worked examples and their levels, as the first entries.
