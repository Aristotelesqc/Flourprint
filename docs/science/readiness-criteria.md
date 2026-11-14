# Readiness criteria: claims to verify, and a first catalogue of signs

**Status.** Research findings and questions for the design, written on 2026-11-14 (UTC) under
issues #231 and #287. Documentation only: nothing here is a decision, and no model, coefficient,
contract, engine or screen changes. Nothing is added to a "Decided" list.

**Where the claims come from.** The twelve claims below (C1 to C12) are the owner's practice as a
home baker. The owner submitted them for verification, said plainly that his word is not
authoritative, and asked that each be checked against craft knowledge (reference books, courses,
professional bodies, manufacturers, reputable recipe sources) as well as measured science. They are
recorded here as "owner's practice", never as a source.

**What this session could and could not read (read this first).** The session's network policy
allowed Europe PMC, PubMed Central and the Europe PMC REST service, and refused almost every craft
host. Refusals were of two kinds: a failed name resolution in the fetch tool (`getaddrinfo ENOTFOUND`)
and an HTTP 403 on CONNECT in the shell. They are recorded, not worked around.

| Host or page                                                                                                                                                          | Result, 2026-11-14 (UTC)                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| www.kingarthurbaking.com (three pages: two blog posts on proofing, one on bulk fermentation, and the recipe page of the water-bagel preset)                           | name not resolved (fetch tool); HTTP 403 on CONNECT |
| www.weekendbakery.com ("The myth of 'double in size'"), modernistcuisine.com ("Dough CPR"), www.baking-sense.com, www.chowhound.com, pizzatoday.com, en.wikibooks.org | name not resolved                                   |
| www.pizzanapoletana.org (AVPN disciplinare 2022), certifico.com (copy of the STG specification)                                                                       | name not resolved                                   |
| www.ncbi.nlm.nih.gov (bookshelf)                                                                                                                                      | name not resolved                                   |
| europepmc.org (site root), www.cerealsgrains.org                                                                                                                      | HTTP 403                                            |
| bakerpedia.com, www.lallemand.com, www.mdpi.com, hal.inrae.fr, en.wikipedia.org (site roots, by the shell)                                                            | no connection (HTTP status 000)                     |
| Lesaffre, Bread Bakers Guild of America, school course sites                                                                                                          | not attempted                                       |
| www.ebi.ac.uk (Europe PMC REST: search and full-text XML) and pmc.ncbi.nlm.nih.gov                                                                                    | reachable; all science sources below came from here |

A further probe of many hosts at once was refused by the session's permission layer and was not
repeated. Consequently:

- **No craft page was read in this session.** A web search returned summaries of King Arthur
  Baking, Weekend Bakery, Modernist Cuisine and others. A search summary is a lead, not a reading
  ([evidence-classification.md](evidence-classification.md#6-workarounds), route 4 or lower); every
  such lead is marked "lead, unread" below and none is entered in the register.
- **The craft evidence that is graded here is what the repository already holds**: the style-guide
  snapshots (15 preset sources and one normative record, full snapshot reads of 2026-10-10 (UTC)
  by earlier agents, with hashes) and the 89-recipe survey (page-reading agents, 2026-10-29 (UTC)).
  This session read their records in the repository, not the pages. Their records keep numbers
  and schedules and mostly omit cues, so they under-report criteria (see the count below).
- **Science**: five open-access papers were read in part through the Europe PMC full-text XML
  (list in [sources.md](sources.md#classification-of-evidence)), plus the repository's records of
  Verheyen, Covino, Izzreen, Birch and Rattin.

The result is therefore a **thin** verification of the claims, not an exhaustive one: the verdicts
say "no source read" where that is the truth, and the catalogue says what should be read next.

## How a verdict is worded

| Verdict                | Meaning                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| supported              | At least one source read in this session or recorded in the repository says it, conditions kept. |
| partly supported       | The claim's mechanism or one half is supported; the nuance is stated.                            |
| contradicted           | A source read says the opposite under comparable conditions.                                     |
| no source found / read | Nothing readable in this session bears on it. Not "false".                                       |

## Count of end criteria in the collected recipes

**Question.** In the 89 collected recipes, what end criterion does each step state: a volume ratio
since the last degassing ("until doubled"), a physical mark in the vessel, a handling test (poke,
windowpane, float), a measured quantity, or no criterion at all?

**What the data can answer.** `data/published-recipes-2026-10.json` has, per stage, a name, a
duration range and a temperature, and per recipe a list of flags. It has no field for an end
criterion: the transcription rules kept numbers, and cues were transcribed only when a transcriber
flagged them. A scan of every field of the 89 records for the words doubled, tripled, puffy, poke,
float, windowpane, until, rim, jiggle, dome and bubbles found:

| Kind of criterion recorded in the 89 recipes                            | Recipes | Which                                                                                              |
| ----------------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------- |
| A physical mark in the tin ("until dough nears or reaches the pan top") | 2       | `enriched/brioche-3` (final proof), `enriched/shokupan-3` (second rise)                            |
| A handling test ("kneading to windowpane", duration not given)          | 1       | `breads/baguette-4`                                                                                |
| A volume ratio ("until doubled", "tripled")                             | 0       | none is recorded in the survey's fields                                                            |
| A poke test, float test or jiggle                                       | 0       | none recorded                                                                                      |
| A target dough temperature after mixing                                 | 3       | `breads/bagel-3` (25 to 27 °C), `enriched/shokupan-6` (24 °C), `pizzas/neapolitan-1` (20 to 23 °C) |
| Durations only (every other recipe)                                     | 83      | the remainder; "no criterion stated" is not "no criterion on the page"                             |

**Reading of this count.** It measures what the survey recorded, not what the 89 pages say, and the
pages could not be re-read here (hosts refused). It is evidence only about the survey: the survey's
fields cannot support or contradict C1, C2 or C6 on their own. Other facts from the same file:
43 of the 89 have a stage in the fridge (by stage name or temperature), 19 have a fold stage, and
the five bagel recipes carry yeast doses of 0.46 to 1.88 % of flour, none at the owner's 2 %.

The same question on the 15 style-guide presets, whose "Published process" text is the transcriber's
summary of the page read in full on 2026-10-10 (UTC):

| Kind of end criterion recorded in the preset's process text          | Presets | Which                                                                                                                                                                                                           |
| -------------------------------------------------------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Volume ratio at the end of bulk ("to double", "to nearly double")    | 3       | water bagels, burger buns (both King Arthur Baking), Chicago deep-dish (Bake from Scratch)                                                                                                                      |
| Visual state without a ratio ("to puffy")                            | 2       | burger buns (proof), Japanese milk bread (bulk)                                                                                                                                                                 |
| Measured quantity ("until core temperature at least 19 °C")          | 1       | Roman pan pizza (appretto)                                                                                                                                                                                      |
| Handling rule ("relax 10 to 15 min, repeat until the pan is filled") | 1       | Sicilian pan pizza                                                                                                                                                                                              |
| A target temperature of the finished dough                           | 6       | ciabatta, focaccia (ingredient note), brioche (at most 26 °C), Pullman, Roman scrocchiarella, Roman pan pizza (a range)                                                                                         |
| Durations only, no cue and no measurement besides time               | 9 of 15 | baguette, no-knead boule, ciabatta, focaccia, brioche, Pullman, 72-hour pizza, Roman scrocchiarella, New York (the other six presets carry a criterion of the kinds above; a preset may appear in several rows) |

Every preset records a final-proof time; only one (burger buns, "puffy") records a final-proof cue,
and none records "doubled" for a final proof. The no-criterion count is again a lower bound on the
pages.

## The claims C1 to C12

Levels A, B or C are those of the [register](craft-knowledge.md#register-entries-from-the-readiness-research-2026-11-14-utc);
roles and scopes of the scientific sources are in [sources.md](sources.md#classification-of-evidence).

| Claim                                                                                                                             | Verdict                                                                      | Supporting (read)                                                                                                                                                                                                                     | Contradicting or qualifying (read)                                                                                                                                                                     | What remains unverified                                                             |
| --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| C1 "doubled once" is almost never the criterion for ready to bake                                                                 | partly supported                                                             | Style guides: no final-proof "doubled" among 15 presets; three presets use "to double" for bulk only (B)                                                                                                                              | The survey's fields record no cue at all, so a count of "doubled" in 89 recipes is impossible here; a search summary of King Arthur Baking's final-proof page (lead, unread) says its test is the poke | The wording of the 89 pages; bulk-degas-reproof recipes by name                     |
| C2 pizza dough asked to triple                                                                                                    | no source found as a recipe criterion                                        | Covino 2023 measured a free-standing ball tripling its volume at about 24 to 30 h at 22 °C (measured, not a baker's criterion)                                                                                                        | No pizza preset or collected pizza recipe records a tripling                                                                                                                                           | Any recipe that says "triple"                                                       |
| C3 with folds the volume change is practically unreadable                                                                         | partly supported (mechanism)                                                 | Verheyen: gas fraction right after kneading is already 23 to 26 %; handling resets it. Contract and ledger (L146) already state it                                                                                                    | No craft source read says it                                                                                                                                                                           | A craft statement; a measurement of volume after folds                              |
| C4 doughs held in the fridge after being ready; folds or degassing keep them in check                                             | partly supported                                                             | Five style or survey records prescribe a fridge hold with a ceiling of 24, 48 or 72 h; Birch and Izzreen show growth continuing at 5 to 8 °C                                                                                          | Hold ceilings differ by recipe (24, 48, 72 h); no source read says folds hold the expansion in check                                                                                                   | The "folds keep it in check" half                                                   |
| C5 over-expansion weakens or collapses the gluten network; the dough can practically always be reworked                           | first half supported; second half no source read                             | Rathnayake (via Zghal et al.): coalescence, thinner walls, harder crumb; Liu 2024: volume falls past an optimum proof, with collapse and shrinkage; Verheyen: a critical gas volume makes the matrix unstable                         | A 48 h pizza ball is weaker by Covino's compression work (7.65 J against 29.96 J at 4 h) and has little free glucose left (Di Stasio): possible costs of a late rework, not tested                     | Anything on re-balling; sugar, acidity, browning after a rework                     |
| C6 lean no-knead Pullman loaf: bulk done when smooth, less sticky, extensible; final proof 1 cm below the rim                     | partly supported (a mark exists; the figure and the bulk sign are unsourced) | Two enriched recipes record a pan-top mark (C); Modernist Cuisine's Pullman preset (via the repository) gives proof times, with the lid off                                                                                           | The mark is not universal: 87 of 89 records and none of the 15 presets record one                                                                                                                      | The 1 cm figure; the 24 to 48 h cold poolish no-knead procedure; the bulk feel sign |
| C7 high-dose bagels: no rise criterion; mix, ball, shape, boil, bake                                                              | partly supported                                                             | The King Arthur water-bagel preset gives no separately timed final proof                                                                                                                                                              | The same preset says bulk "to double" before shaping; four of five collected bagel recipes include a fridge retard (8 to 48 h where stated); none uses 2 % yeast                                       | Float test; any recipe at 2 % yeast without a rise                                  |
| C8 pizza "ready" = fermented enough and relaxed enough to stretch thin; over-proofed = too extensible, a short stay in the fridge | partly supported                                                             | Covino 2023: the pressed disc widens from 21.5 cm to 29 cm by 4 h; Sicilian preset: relax 10 to 15 min and repeat until the pan is filled (B)                                                                                         | No source read for "short stay in the fridge" as a remedy                                                                                                                                              | Extensibility over cold time; the remedy                                            |
| C9 several acceptable maturity levels for pizza dough, young to very old, with dark spots                                         | levels supported as prescribed; dark spots no source read                    | Style guides: 72-hour pizza 3 to 4 h of room proof after 48 h cold, Roman scrocchiarella 90 min then at most 48 h, New York 24 to 72 h, Roman pan pizza 44 h plus 3 to 4 h (B)                                                        | Covino 2023 and Di Stasio 2025 show the dough's chemistry still changing at 48 h, which says nothing about acceptability                                                                               | What the dark spots are (open-access search: no hit); mould versus browning         |
| C10 ready needs enough gluten development and active enough fermentation                                                          | supported                                                                    | Rathnayake: poorly kneaded dough gives a coarser, lower-volume crumb; Iwaki and Vidal: mixing has a peak and overmixing breaks aggregates; Verheyen: a low dose needed three times the time and gave 3.1 against 3.5 ml/g loaf volume | Verheyen 2014: gas retention is limited by the gas amount and the matrix, not the speed of production, so a slow yeast is not itself a retention problem                                               | A study that crosses undeveloped gluten with a fully fermented dough                |
| C11 the poke test: smooth dough, finger leaves a mark; used to decide when to bake; says nothing about earlier stages             | no source read                                                               | The contract and L145 already name the poke test as a cue after degassing                                                                                                                                                             | Open-access search: no hit on a poke test; a search summary (lead, unread) reports two readings of the result: an indent that stays, or one that springs halfway back                                  | Any graded source; the interpretation of the result                                 |
| C12 a poolish that has not collapsed can already smell strongly of alcohol: use soon or move to the fridge                        | partly supported (chemistry only)                                            | Di Stasio 2025: ethanol in a yeast-leavened dough rose with time, 8.87 g/kg at 48 h (22 °C, 0.04 % yeast of the dough)                                                                                                                | No source read links smell to collapse or to an action                                                                                                                                                 | Any preferment source; smell thresholds                                             |

### C1. "Doubled once" almost never the criterion for ready to bake

The repository's craft records give a split picture. The style guides name "to double" or "to
nearly double" for the end of **bulk** in three presets (a bagel and a burger bun from King Arthur
Baking, a deep-dish pizza from Bake from Scratch; level B: a cue without conditions, convergence
weak because two of the three share a site). None records "doubled" for a final proof. That fits
the claim in the narrow sense that the records show no final-proof doubling, but the survey did not
transcribe cues, so the absence is largely an artefact of the survey; the 89-recipe data cannot
settle the claim. A search summary of a King Arthur Baking page (lead, unread) says its test after
the second rise is the poke, and that shaped-dough height is a poor guide because the dough spreads
sideways; that must be read before it is used. Measured science does not address the criterion:
Izzreen and Birch end at a measured height before collapse, and Covino's volume ratio is a
photograph of a free ball.

### C2. Pizza dough asked to triple

No craft record says "triple". Covino 2023 (Neapolitan dough, 0.066 % fresh yeast of flour, 22 °C,
free-standing 250 g balls) reports the volume ratio reaching 1.3 at 8 h, doubling at 16 h and
tripling at about 24 to 30 h. That is a measurement of what happens, not a criterion a baker uses,
and the paper's own text and figure differ on the tripling time (repository record). Verdict: no
source found as a recipe criterion. A "triple" in some pizza recipes remains possible and unread.

### C3. Folds make the volume change unreadable

This is a mechanism claim, and the repository already holds it as an owner decision (L146;
[fermentation.md](../contracts/fermentation.md#live-recomputation-and-readiness-cues-owner-decisions-of-2026-10-25-ledger-l145-and-l146)).
What is measured: Verheyen's doughs hold 23 % (compressed yeast) to 26 % (instant yeast) gas by
volume right after kneading, against 6 to 9 % unyeasted, and reach 83 % later; mixing and handling
therefore set the starting gas fraction, so a ratio against the dough's volume before handling
means different things at different moments. No craft source read states the claim. Verdict:
partly supported by mechanism.

### C4. Cold holding after the dough is technically ready

Records of fridge holds are plentiful: New York pizza 24 to 72 h (Feeling Foodish), Roman
scrocchiarella "use within 48 h" at 4 °C (Molino Vigevano), Roman pan pizza 44 h at 4 °C within a
48 h total, a 72-hour dough (Baking Steel, 24 h at room temperature then 48 h cold), Sicilian pan
pizza optional up to 24 h (King Arthur Baking), brioche at least 1 h or overnight. The ceilings are
not the same, so what a dough "can be held" for is a property of the recipe's dose and temperature,
not a constant. That the dough keeps expanding in the cold is measured: Birch reached an 8 cm
height at 5 °C in 21 h with 20 g of yeast per kg, and three of the yeasts did not reach the height
at 5 °C. No source read says regular folds or degassing keep the expansion in check; that half
stays unverified.

### C5. Over-expansion weakens the network; reworking

The first half has the best support in this report. Four independent lines:

- Rathnayake et al. 2018 (a review, so a lead for the primary work it cites, Zghal, Scanlon and
  Sapirstein): over-proofing reduces cell-wall thickness, increases cell size and void fraction,
  makes the crumb harder, and increases coalescence, with loss of cell walls.
- Liu et al. 2024 (steamed bread from frozen dough, outside the domain): as proofed specific volume
  rose from 1.1 to 1.7 mL/g, the product's specific volume peaked at 1.3 mL/g and fell steeply at
  1.5 and 1.7, with a harder crumb and separation of crust and crumb; at 1.1 mL/g, side cracks
  (under-proofing). The authors write that proofing degree is "based on the experience of
  technicians" and not quantitatively controlled.
- Verheyen 2015 (repository record, page 42): a critical gas volume (about 1100 mL for
  compressed yeast above 1 g per 100 g flour, about 600 mL for instant yeast) made the matrix
  unstable; oven rise of instant-yeast loaves fell with a larger initial specific dough volume and
  became negative near 3 to 4 mL/g (figure only).
- Izzreen's end point is the height immediately before collapse (repository record).

The second half, that an over-expanded dough can practically always be reworked, has no source
read. Title searches of the open-access literature for degassing, punching, knock-back, folding or remixing of bread dough found no hit. What the measurements suggest a
rework may cost, without testing a rework: Covino's compression work falls from 29.96 J at 4 h to
7.65 J at 48 h with the relaxation parameter rising from 79.7 to 85.2 % (authors: a weaker
network); Di Stasio measured glucose in a 48 h pizza dough falling from 0.728 to 0.144 g per 100 g
and fructose to zero, with pH 5.44 and 0.37 g/kg acetic acid in the yeast-only dough. Whether less
fermentable sugar means poorer browning or a slower second rise is not measured by either paper.
Modernist Cuisine's "Dough CPR" (degas and reshape) was surfaced by a search and could not be
fetched: lead, unread.

### C6. The Pullman loaf and the tin mark

Two enriched recipes record a pan-top mark (a brioche loaf and a milk bread, transcription
confidence "low", volume units). Modernist Cuisine's Pullman formula (via the style-guide record)
gives times only: proof 1.5 to 2 h at 27 °C or 2.5 to 3 h at 21 °C, lid off during the proof and on
before baking. "1 cm below the rim", the 24 to 48 h cold lean no-knead procedure and the smooth,
less-sticky bulk sign have no source read. The non-universality half is supported: none of the 15
presets records a tin mark.

### C7. Bagels with a high dose and a continuous process

The King Arthur water-bagel preset has bulk "to double" before shaping, then no separately timed
final proof, simmer 30 s per side. That is no rise criterion after shaping, as the owner says, but
it has one before shaping. Four of five collected bagel recipes include a fridge retard (8 to 48 h where
a duration is stated) before boiling (`breads/bagel-2`, `-3`, `-4`, `-5`), the opposite of a
continuous process; their doses are 0.46 to 1.88 % of flour. No source read describes a float test
or a 2 % continuous bagel. Verdict: a continuous path exists in one preset; the high dose and the
absence of any rise criterion are not documented.

### C8. Pizza ready is fermented and relaxed

Covino's Table 1 (repository record, plate compression at 23 °C of samples from balls leavened at
22 °C): disc diameter after compression 21.5 ± 2.07 cm at 0 h and 29.25 ± 0.53 cm at 4 h, then
26.1 to 28.4 cm to 48 h; compression work peaks at 4 h (29.96 J), is 16.16 J at 8 h and 7.65 J at
48 h. Dough does become more extensible within hours, and later softer, on a different clock from
volume. The Sicilian preset's rule, relax 10 to 15 min and stretch again until the pan is filled,
is a handling criterion for relaxation (B). "Over-proofed means too extensible, remedied by a short
fridge stay" has no source read.

### C9. Several acceptable maturity levels

The prescriptions differ widely (see C4 and the style guides): the 72-hour dough 3 to 4 h of room proof after 24 h at room temperature and
48 h cold; Roman scrocchiarella 90 min then at most 48 h; New York 24 to 72 h; Roman pan pizza
a 3 to 4 h room appretto until the core reaches 19 °C. Each is one voice for one style, so the
register records them as styles, not as a consensus. Measured: the dough keeps changing to 48 h
(Covino, Di Stasio). Dark spots: no open-access hit; a search summary (lead, unread) says they are
blisters that char in a hot oven and that sugars left by long fermentation drive Maillard
browning. That is plausible and unread.

### C10. Gas, gluten and fermentation activity together

Supported on both halves, indirectly. Gluten: Rathnayake reports that poorly kneaded dough gave
lower crumb brightness, fewer and larger cells and thicker walls than optimally mixed dough, and
overkneading lower quality (a review; lead for the primary work). Iwaki 2020 (flours mixed to 20
min): as mixing passed peak consistency to breakdown and overmixing, larger aggregates broke
into smaller ones; Vidal 2022: a torque maximum at a development time (reference 150 s in a lab
kneader), a short stability phase, then breakdown. Fermentation activity: Verheyen 2015, the lowest
compressed-yeast dose needed three times the time of the highest to reach the same gas volume and
gave a loaf volume of 3.1 against 3.5 mL/g. Verheyen 2014 qualifies the claim: gas retention is
"exclusively limited by the amount of gas and the stability of the dough matrix", not by how fast
the gas is made, so a slow yeast does not itself weaken retention; the brick comes from ending the
dough before enough gas exists. No study read crosses the two failures in one dough.

### C11. The poke test

No source was read. The repository's contract and L145 list it among the cues; L145 puts it first
on the last fermentation step. The owner's observation that it says nothing about earlier stages is
a logical property of any end-state test: it reads the dough's state now. A search summary (lead,
unread) reports two different readings of the same test (an indent that stays, versus one that
springs back slowly about halfway), which is exactly the kind of disagreement a graded entry has to
keep. An open-access search for the poke or finger test found no relevant paper.

### C12. The poolish that smells of alcohol

Not testable against a preferment source (none read). What is measured is the ethanol in a long
pizza dough: traces at 0 h, 8.87 ± 0.11 g/kg after 48 h (yeast-only dough, 22 °C, 0.04 % leavening agent of the dough) with the yeast count constant at about 6 log CFU/g. So ethanol accumulates steadily in a
yeast dough, and a strong smell is a late and cumulative sign; whether it comes before or after the
dome falls is not measured. The action (use soon or chill) is the owner's and is not sourced.

## Part 2. A first catalogue of signs

**Scope.** The owner asked for every sign, by sense, with its meaning and the action to take, and for
negative signs recorded as carefully as "ready" signs. This session could read little craft text, so
the catalogue holds what is grounded and says "no source read yet" elsewhere. An entry has: an id,
the sense and how a home baker perceives it, the state it indicates, the action and consequence
sources give, where it is unreliable, the sources and register level, and measured evidence.
"Action: proceed" means the source says only to go on to the next step. Levels are those of the
[register](craft-knowledge.md#register-entries-from-the-readiness-research-2026-11-14-utc); a
`-` means a measured quantity, not a craft claim, so no level applies.

### Preferment (poolish, biga, sponge)

| Id                              | Sign                                                                         | Indicated state, action, consequence                                 | Unreliable when                                | Sources and level                                                                                  | Measured                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pref.time-at-room-temperature` | Time only: poolish 14 h, biga about 16 h, "room temperature" without degrees | Use after the stated time (action: proceed). No consequence recorded | Temperature not stated; dose of the preferment | King Arthur Baking (baguette poolish; ciabatta biga, professional), via the style-guide records; C | none                                                                                        |
| `pref.ripe-by-eye-or-smell`     | Dome, bubbles, collapse, smell of alcohol or acid                            | no source read yet (C12 is an owner's claim)                         |                                                |                                                                                                    | Ethanol accumulates in a yeast dough (Di Stasio, 8.87 g/kg at 48 h); no preferment measured |

### Mixing and kneading

| Id                      | Sign                                                              | Indicated state, action, consequence                                       | Unreliable when                                                     | Sources and level                                                                                                                                                                                                                 | Measured                                                                                                |
| ----------------------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `mix.smooth`            | Sight, touch: the dough "smooth" or "very soft"                   | Developed enough; proceed to bulk                                          | "Smooth" is not defined                                             | King Arthur Baking (water bagels, burger buns, Sicilian pan pizza), via records; C                                                                                                                                                | none                                                                                                    |
| `mix.windowpane`        | Sight: a thin film stretched without tearing                      | Gluten developed; proceed. Duration not given                              | Whole-grain or high-hydration dough, per the owner (no source read) | A forum recipe flag (`breads/baguette-4`); C. Critics: no source read                                                                                                                                                             | Torque peak at a development time, then breakdown (Vidal 2022); mixing curve to overmixing (Iwaki 2020) |
| `mix.dough-temperature` | A thermometer reading of the finished dough, 18 to 26 °C by style | Right temperature to start; adjust the water temperature next time         | Mixer friction, flour temperature                                   | Five voices: King Arthur Baking professional (ciabatta, 23.9 °C), Modernist Cuisine (Pullman, 24 to 26 °C), a Roman pan-pizza disciplinare (18 to 26 °C), a pizza maker (about 24 °C), a brioche school recipe (at most 26 °C); A | none                                                                                                    |
| `mix.under-developed`   | Warning: dough that is poorly kneaded                             | Lower volume, coarser crumb, thicker walls, larger cells; action not given |                                                                     | Rathnayake 2018 (review)                                                                                                                                                                                                          | none of its own                                                                                         |
| `mix.over-developed`    | Warning: dough mixed past the torque peak                         | Aggregates break down; the matrix ruptures; no action stated               | Lab mixers at 120 rpm for 20 min                                    | none in craft                                                                                                                                                                                                                     | Iwaki 2020; Vidal 2022                                                                                  |

### Autolyse

No source read yet. The survey records an autolyse stage in three recipes (time only) and the
focaccia preset a 15 min rest after mixing. No sign, no action.

### Bulk fermentation

| Id                                        | Sign                                                                                          | Indicated state, action, consequence                                               | Unreliable when                                                                              | Sources and level                                                                                                       | Measured                                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `bulk.doubled`                            | Sight: volume of the dough in a container against its start ("to double", "to nearly double") | Gas has been made; action: divide and shape. Consequence of ignoring: not recorded | After folds or degassing (contract, L146); in a sloped bowl; what "start" means after mixing | King Arthur Baking (bagels 1 to 1.5 h, burger buns 1 to 2 h), Bake from Scratch (Chicago, 30 to 45 min), via records; B | Gas fraction 23 to 26 % right after kneading (Verheyen); volume ratio of a free ball (Covino: 1.3 at 8 h, 2 at 16 h) |
| `bulk.puffy`                              | Sight: "puffy"                                                                                | Fermented enough; proceed                                                          | Undefined                                                                                    | King Arthur Baking (milk bread bulk 1 to 1.5 h; burger bun proof about 1 h), via records; C                             | none                                                                                                                 |
| `bulk.folds-schedule`                     | Process: folds at fixed times (45 min; 1 h; four sets 15 min apart; 4 bowl folds)             | Not a sign: a schedule; after it the volume cue is invalid                         |                                                                                              | King Arthur Baking, Modernist Cuisine, via records                                                                      | none                                                                                                                 |
| `bulk.feel-smooth-less-sticky-extensible` | Touch (owner's C6)                                                                            | no source read yet                                                                 |                                                                                              |                                                                                                                         |                                                                                                                      |
| `bulk.too-warm-or-too-old`                | Warning signs: dough that is slack, sour, collapsing                                          | no source read yet                                                                 |                                                                                              |                                                                                                                         | Over-proofing curve in the "Final proof" table                                                                       |

### After degassing: preshape and bench rest

| Id                      | Sign                                                           | Indicated state, action, consequence                                         | Unreliable when         | Sources and level                                      | Measured                                                                       |
| ----------------------- | -------------------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `rest.relax-and-repeat` | Touch: the dough pulls back when stretched                     | Not yet relaxed: wait 10 to 15 min and stretch again until the pan is filled | Cold dough, high gluten | King Arthur Baking (Sicilian pan pizza), via record; B | Disc diameter after pressing: 21.5 cm at 0 h, 29.25 cm at 4 h (Covino Table 1) |
| `rest.bench-time`       | Time: baguette 15 to 60 min; Roman balls 90 min at 22 to 25 °C | Proceed to shaping or to the fridge                                          | Dough temperature; dose | King Arthur Baking, Molino Vigevano; C                 | none                                                                           |

### Final proof

| Id                          | Sign                                                                                                              | Indicated state, action, consequence                                                                                                                             | Unreliable when                                                                | Sources and level                                                                  | Measured                                                                                                  |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `proof.poke`                | Touch: a floured finger pressed into the dough; the dent stays, or springs back                                   | Lead, unread: a dent that stays is ready, one that springs back wants more time (King Arthur Baking per a search summary); another reading: springs back halfway | Cold dough, high hydration, enriched dough (owner's questions; no source read) | no source read yet                                                                 | none; an open-access search found no paper                                                                |
| `proof.pan-top`             | Sight: the dough at or near the top of the tin                                                                    | Ready to bake; time not given                                                                                                                                    | The tin; dough that doubles in a rounded pan                                   | Two recipes of the survey (brioche, milk bread), "low" transcription confidence; C | none                                                                                                      |
| `proof.puffy`               | Sight: "puffy" after about 1 h                                                                                    | Ready to bake                                                                                                                                                    | Undefined                                                                      | King Arthur Baking (burger buns), via record; C                                    | none                                                                                                      |
| `proof.time-at-temperature` | Time with a temperature: Pullman 1.5 to 2 h at 27 °C or 2.5 to 3 h at 21 °C; baguette 45 to 60 min at about 20 °C | Proceed; consequence not given                                                                                                                                   | Dose, flour                                                                    | Modernist Cuisine; King Arthur Baking; C                                           | none                                                                                                      |
| `proof.lid-off`             | Process: proof with the lid off, lid on before baking (Pullman)                                                   | A step, not a sign                                                                                                                                               |                                                                                | Modernist Cuisine, via record                                                      | none                                                                                                      |
| `proof.over`                | Warning: over-proofed dough                                                                                       | Volume drops, harder crumb, separation of crust and crumb, collapse; no action in the sources read                                                               | Frozen dough steamed bread is outside the domain                               | Liu 2024; Rathnayake 2018                                                          | Product volume peaks at an intermediate proof (1.3 mL/g) and falls (Liu); critical gas volumes (Verheyen) |
| `proof.under`               | Warning: under-proofed dough                                                                                      | Side cracks, lower volume (steamed bread at 1.1 mL/g)                                                                                                            | Outside the domain                                                             | Liu 2024                                                                           | as in the previous row                                                                                    |

### Cold holding

| Id                         | Sign                                                                 | Indicated state, action, consequence         | Unreliable when          | Sources and level                                                                                                                                                                                                                                                                                       | Measured                                       |
| -------------------------- | -------------------------------------------------------------------- | -------------------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| `cold.hold-window`         | Time at 4 °C: at most 24 h, 48 h or 72 h by recipe                   | Use within the window; consequence not given | Dose, fridge temperature | Four independent recipes, three ceilings (Feeling Foodish, Molino Vigevano, Baking Steel, King Arthur Baking); B. The AVPN normative record in the repository gives 12 to 24 h in total (a search summary of the 2022 text, unread, says a minimum of 8 and a maximum of 24 h: a disagreement to check) | Growth at 5 to 8 °C continues (Birch, Izzreen) |
| `cold.return-to-room`      | Time: take out 20 to 60 min before baking                            | Dough warms and relaxes; action: wait        | Thick dough              | Feeling Foodish (New York), via record; C                                                                                                                                                                                                                                                               | none                                           |
| `cold.folds-keep-in-check` | Owner's C4: folds or degassing keep a held dough from over-expanding | no source read yet                           |                          |                                                                                                                                                                                                                                                                                                         |                                                |

### Pizza dough balls: maturity window

| Id                          | Sign                                                                                                                          | Indicated state, action, consequence                                         | Unreliable when             | Sources and level                                                                       | Measured                                                                                                               |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `pizza.core-temperature-19` | A thermometer: core of the dough at least 19 °C after 3 to 4 h of appretto                                                    | Ready to stretch; action: stretch                                            | A cold core, thick pan      | La Confraternita della Pizza, a normative disciplinare (Roman pan pizza), via record; B | none                                                                                                                   |
| `pizza.style-windows`       | Time: 72-hour dough 3 to 4 h of room proof after 24 h room and 48 h cold; Roman 90 min then at most 48 h; New York 24 to 72 h | Style-specific; no sign                                                      | Dose and temperature differ | One voice per style, none convergent; C                                                 | Compression work peaks at 4 h and is lowest at 48 h (Covino); ethanol 8.87 g/kg, glucose down 80 % at 48 h (Di Stasio) |
| `pizza.dark-spots`          | Sight: dark spots on a fermented ball (owner's C9)                                                                            | no source read yet (lead, unread: blisters that char; sugars drive browning) |                             |                                                                                         |                                                                                                                        |
| `pizza.too-extensible`      | Touch: dough too slack to hold shape                                                                                          | no source read yet (owner's C8: short fridge stay)                           |                             |                                                                                         |                                                                                                                        |
| `pizza.pH`                  | A pH meter or strip: 5.2 to 6.0 expected during fermentation                                                                  | A range quoted by a review; no source proposes pH paper for a home baker     |                             | Rathnayake 2018 (review citing earlier work); no register level                         | pH 6.13 to 5.44 over 48 h, yeast-only dough (Di Stasio)                                                                |

### Boiled breads (bagels)

| Id                     | Sign                                                                                                     | Indicated state, action, consequence | Unreliable when                                     | Sources and level                                                 | Measured |
| ---------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------ | --------------------------------------------------- | ----------------------------------------------------------------- | -------- |
| `bagel.no-final-proof` | Process: no separately timed final proof; a 30 min shaped rest; simmer 30 s per side or 2 min plus 1 min | Go from shaping to the water bath    | Fridge-retard recipes (four of five survey recipes) | King Arthur Baking, via record; C. Disagreement inside the survey | none     |
| `bagel.float-test`     | Whether a ring floats                                                                                    | no source read yet                   |                                                     |                                                                   |          |

### Enriched, scalded and laminated doughs; after the oven

No distinct readiness sign was read for butter incorporation (the brioche school recipe says to add
butter gradually and keep the dough at or under 26 °C, a condition), for a cooked scald or
tangzhong (milk bread: cook 3 to 5 min, cool to lukewarm: time only), for a soaker, for lamination
rests or for scoring. Bake doneness and cooling are outside the fermentation question and no source
about them was read.

### Count

31 signs or warnings have an id. Of them, 16 are a craft sign, time or temperature with a recorded
source and level (A: 1; B: 4; C: 11), 5 are a warning or measure backed by science only, 2 are
process steps, and 8 read "no source read yet" (one of them with an unread lead).
Actions beyond "proceed": 3 (`rest.relax-and-repeat`, `cold.return-to-room`, `pizza.core-temperature-19`).

## Synthesis

- **Readiness is a conjunction, and it differs by step.** The records show at least five kinds of
  condition: dough temperature at the start, gas made (a volume or a time), gluten developed
  (smooth, windowpane, a torque curve), relaxation (the pull back, a rest to repeat), and a state
  at the moment (a mark in the tin, a poke, a core temperature). No source read gives a single
  universal criterion, and the owner's observation (not one volume target) is consistent with them.
- **What a home baker can observe** in the records: time, a thermometer, a marked container, a
  mark in the tin, touch (smooth, pulling back), sight ("puffy"). Smell and sound are absent from
  everything read; gas, pH, ethanol and torque are laboratory measures.
- **Which model each needs.** The timing model reads dose and temperature history: a volume or
  time criterion at a step with no handling since it began, and a time at a stated temperature.
  The behavior model would read gluten, relaxation and the over-proofing curve. A physical mark, a
  dough temperature and a process step (lid off, folds) need neither: they are checks against the
  recipe, not predictions.
- **What the contract and code already model.** `volumeCueValid` (in
  `packages/core/src/domain/bake/thermal.ts`; `liveDoughForecast` is in `forecast.ts`) turns the
  "about doubled" cue off once a fold, degas, preshape or shape has been recorded since the step
  began, and the other cues the contract names are the dome, bubbles, jiggle, poke and feel (L146).
  L145 puts the baker's cues first and L21 bans a computed "doubled" target. Issues #243 (the
  cues, not yet on a screen), #246 (wording) and #287 (uncertainty, behavior) hold the open work.
  What this catalogue shows is missing from them: signs for the stages before the last proof
  (preferment, mixing end, relaxation), a core-temperature or dough-temperature kind of cue, a
  mark in the tin as a cue kind, negative signs and their remedies, and the smell and sound senses.

## What this implies, as questions for the design

These are questions, not decisions.

1. **Kinds of end criterion.** A step could have one of: a volume ratio since the last degassing
   (timing model; needs the volume cue rule); a physical mark in a vessel (neither model); a
   handling criterion such as relaxed enough or a poke result (behavior model, if predicted; a
   baker's observation, if not); a measured quantity such as a core or dough temperature (timing
   model's thermal sub-model); no rise criterion, only a process step (neither); a maturity
   window, with a start and an end (timing model for the age, behavior model for what the window
   means). Should a step carry several, as a conjunction?
2. **Where an over-proofed or under-proofed warning belongs**, given that the measured curve (Liu)
   comes from another product and the repository has no home measurement of it.
3. **Whether a "remedy" field is allowed at all**, since no remedy was read in a source. The
   owner's belief that most over-proofed doughs can be reworked is untested here.
4. **What to do with a lead.** A search summary found two readings of the poke test and a doubling
   criticism; should a lead be shown to nobody until read?
5. **Which reference works to read next** (below), and whether the owner can supply copies, since
   most craft hosts are refused here.

## Coverage and gaps

| Stage                                                                       | Coverage                                                                                  |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Mixing end, bulk, final proof                                               | thin: repository records of 15 presets and 89 recipes; five science papers; no craft page |
| Cold holding, pizza maturity                                                | thin to moderate: several independent recipes for the windows; one measurement series     |
| Preferment ripeness, autolyse, dark spots, float test, smell, sound, rework | not covered: no source read                                                               |
| Enriched, laminated, scalded, soaker, scoring, bake doneness                | not covered                                                                               |

**Reference works that should be read next, and why.** King Arthur Baking's pages on bulk
fermentation, the poke test and final proof (the baker's own criteria, with a professional line);
Modernist Cuisine's bread volumes (a measured treatment of proofing and the Pullman tin); the
Association's published guidance and the AVPN disciplinare 2022 (a normative maturity window,
resolving the 8 to 24 h versus 12 to 24 h difference); Hamelman's _Bread_ and Suas's _Advanced
Bread and Pastry_ (textbook criteria for each stage); Calvel's work (the French school's cues of
ripeness); Weekend Bakery's article criticising "double in size" (the strongest craft critique, now
a lead); BAKERpedia's pages on proofing and mixing; and the primary papers cited by Rathnayake:
Zghal, Scanlon and Sapirstein on proofing and cell structure.

**Search terms tried.** Europe PMC REST over open access: over-proofing and its spellings,
"poke test", "springs back", "windowpane test", "float test", "dark spots" with pizza,
"under-proofed", dough relaxation and extensibility with fermentation time, mixing and gluten
development, gas retention, gas cell coalescence, cold fermentation, ethanol aroma in dough,
bagel boiling, sheeting and resting, preferment pH. Web searches: bulk and final-proof criteria
at King Arthur Baking, over-proofed collapse (Modernist Cuisine), AVPN maturation, dark spots on
cold-fermented pizza. Only the open-access science results returned readable text.

## Proposal: the data shape for a catalogue of signs

A Proposal, not a contract. One record per sign, so that it can later be codified and shown at the
right step of a recipe:

```text
Sign: <language-neutral id, e.g. proof.poke>
- Stage: preferment | mix | autolyse | bulk | rest | proof | cold | bake-prep | boil | after
- Sense: sight | touch | smell | sound | taste | measurement (named instrument)
- Sign: what is perceived, and the gesture to perceive it (no wording for the interface)
- Indicated state: under | right | over | other, and the dough property: gas produced, gas retained,
  gluten development, relaxation, temperature, acidity
- Action: use now | wait | fold | degas | re-ball | chill | warm | shorten next step | bake at once |
  discard | none stated; each with the source that gives it
- Consequence of ignoring: as stated, or none stated
- Valid when / unreliable when: styles, hydration, temperature, handling since the step began
- Sources: register entry ids, with their levels; disagreeing entries listed, never averaged
- Measured backing: scientific source ids, if any, with their roles
- Checked: UTC date, and a role
```

**Relation to existing templates.** The record is a **specialisation** of the behavior statement of
[behavior-model-foundations.md](behavior-model-foundations.md#4c-the-form-of-a-behavior-statement):
its Property is a readiness state perceived by a sense, its Driver or Condition is the step and what
has happened to the dough, and it adds the sense, the action and the consequence that a statement
about direction and size does not carry. It is a **sibling** of the craft-register entry of
[craft-knowledge.md](craft-knowledge.md#entry-template): the register entry is the provenance (one
source's claim, graded), and a sign record cites several entries; neither template changes. A
sign's recorded `action` is craft knowledge and takes the register's ceilings of use: a level C
action is never shown to a baker as guidance.
