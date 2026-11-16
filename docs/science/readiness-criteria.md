# Readiness criteria: claims to verify, and a first catalogue of signs

**Status.** Research findings and questions for the design, written on 2026-11-14 and 2026-11-15
(UTC) under issues #231 and #287. Documentation only: nothing here is a decision, and no model,
coefficient, contract, engine or screen changes. Nothing is added to a "Decided" list. A proposed
ADR (0025, pull request #296, status Proposed, not accepted) would make the fermentation engine a
planning tool that does not judge readiness, put the end criterion in the step of a recipe and in
the baker's judgement, and have the product carry a codified body of baking knowledge; it leaves the
form of a step's criterion and the record format of a knowledge entry open. This document is a
first, partial material for that body, and neither assumes the ADR nor decides what it leaves open.

**Where the claims come from.** The twelve claims below (C1 to C12) are the owner's practice as a
home baker. The owner submitted them for verification, said plainly that his word is not
authoritative, and asked that each be checked against craft knowledge (reference works, trade
references, professional bodies, manufacturers, recipe sources) and against measured science. They
are recorded as "owner's practice", never as a source.

## What was read, and what was not

The session first had access only to Europe PMC and PubMed Central; the owner then allowed
www.kingarthurbaking.com, www.weekendbakery.com, modernistcuisine.com, bakerpedia.com,
www.pizzanapoletana.org, www.lallemand.com, www.mdpi.com and www.ncbi.nlm.nih.gov. Pages were
fetched with an ordinary request (a generic client name and an `Accept: text/html` header, from the
shell: the fetch tool still failed to resolve the names). Results on 2026-11-15 (UTC):

| Host or page                                                                                                                              | Result                                                                          |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| www.kingarthurbaking.com: 15 blog and recipe pages and a professional reference page                                                       | read (HTTP 200)                                                                 |
| www.weekendbakery.com: 5 articles                                                                                                          | read                                                                            |
| bakerpedia.com: 8 process pages                                                                                                            | read                                                                            |
| www.pizzanapoletana.org: the international disciplinare (PDF, eight pages, Italian)                                                        | read                                                                            |
| modernistcuisine.com ("Dough CPR" and a mixing-problems page)                                                                              | not read: an empty reply and an HTTP/2 protocol error, twice; no bot page seen  |
| www.mdpi.com (two articles fetched directly)                                                                                               | HTTP 403 on a direct request; the same papers were read through Europe PMC      |
| www.lallemand.com                                                                                                                          | searched; no Baking Update page on proofing or fermentation tolerance was found |
| Lesaffre, Bread Bakers Guild of America, school course sites, reference books                                                              | not attempted or not available (see the gaps)                                   |

Pages that answered a search but whose text is not on an allowed host remain **leads, unread**
and are not entered in the register. In particular, Modernist Cuisine's rescue page is known here only
through search summaries (it is said to describe degassing and reshaping, a claim of up to ten
revivals of one dough, and a poke test in which a permanent dent means over-proofed). Nothing from it
is used as a finding below.

Each statement the document relies on from a craft page is recorded in the register with its URL,
page title, author or organisation, the date read, a paraphrase and a level:
[craft-knowledge.md](craft-knowledge.md#register-entries-from-craft-pages-read-on-2026-11-15-utc).
King Arthur Baking is one organisation and counts as **one voice** however many of its pages agree; it
sells flour and equipment. BAKERpedia's pages cite books that were not read; its biga statement cites
Hamelman and agrees in wording with King Arthur Baking's preferment page, so independence is not
recorded and they count as one voice there.

## How a verdict is worded

| Verdict            | Meaning                                                                                   |
| ------------------ | ----------------------------------------------------------------------------------------- |
| supported          | At least one source read says it, with its conditions, and none read contradicts it.       |
| partly supported   | One half, the mechanism or a limited case is supported; the nuance is stated.              |
| qualified          | Supported in a form narrower than the claim, or with a disagreement among sources.         |
| contradicted       | A source read says the opposite under comparable conditions.                               |
| no source read     | Nothing readable bears on it. This is not "false".                                          |

## Count of end criteria in the collected recipes

**Question.** In the 89 collected recipes, what end criterion does each step state: a volume ratio
since the last degassing, a physical mark in the vessel, a handling test (poke, windowpane, float), a
measured quantity, or no criterion?

**What the data can answer.** `data/published-recipes-2026-10.json` has, per stage, a name, a
duration range and a temperature, and per recipe a list of flags. It has no field for an end
criterion: the transcription rules kept numbers, and cues appear only where a transcriber flagged
one. A scan of every field of the 89 records for doubled, tripled, puffy, poke, float, windowpane,
until, rim, jiggle, dome and bubbles found:

| Kind of criterion recorded in the 89 recipes                                    | Recipes | Which                                                                  |
| ------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------- |
| A physical mark in the tin ("until dough nears or reaches the pan top")          | 2       | `enriched/brioche-3` (final proof), `enriched/shokupan-3` (second rise) |
| A handling test ("kneading to windowpane", duration not given)                   | 1       | `breads/baguette-4`                                                    |
| A volume ratio ("until doubled", "tripled")                                     | 0       | none is recorded in the survey's fields                                |
| A poke test, float test or jiggle                                               | 0       | none recorded                                                          |
| A target dough temperature after mixing                                         | 3       | `breads/bagel-3` (25 to 27 °C), `enriched/shokupan-6` (24 °C), `pizzas/neapolitan-1` (20 to 23 °C) |
| Durations only (every other recipe)                                             | 83      | "no criterion stated" is not "no criterion on the page"                |

**Reading of this count.** It measures what the survey recorded, not what the 89 pages say; the pages
were not re-read (89 fetches were out of reach in one session, and the survey's pages were taken by
page-reading agents on 2026-10-29). It is evidence about the survey's fields only and cannot support
or contradict C1, C2 or C6 on its own. Other facts of the file: 43 of the 89 have a fridge stage (by
stage name or temperature), 19 have a fold stage, and the five bagel recipes carry yeast doses of 0.46
to 1.88 % of flour. The live King Arthur water-bagel page read on 2026-11-15 (revised 2026-11-13)
gives 2 1/4 tsp yeast to 690 g of flour, about 1 % of flour at the survey's 3 g per teaspoon, against
the survey's 1.88 % for its bagel record: the page may have changed or the conversion differs; not
reconciled.

The same question on the 15 style-guide presets, whose "Published process" text is the transcriber's
summary of a page read in full on 2026-10-10 (UTC):

| Kind of end criterion recorded in the preset's process text                    | Presets | Which                                                                                          |
| ------------------------------------------------------------------------------ | ------- | ---------------------------------------------------------------------------------------------- |
| Volume ratio at the end of bulk ("to double", "to nearly double")               | 3       | water bagels, burger buns (both King Arthur Baking), Chicago deep-dish (Bake from Scratch)     |
| Visual state without a ratio ("to puffy")                                       | 2       | burger buns (proof), Japanese milk bread (bulk)                                                |
| Measured quantity ("until core temperature at least 19 °C")                     | 1       | Roman pan pizza (appretto)                                                                     |
| Handling rule ("relax 10 to 15 min, repeat until the pan is filled")            | 1       | Sicilian pan pizza                                                                             |
| A target temperature of the finished dough                                      | 6       | ciabatta, focaccia (ingredient note), brioche (at most 26 °C), Pullman, Roman scrocchiarella, Roman pan pizza (a range) |
| Durations only, no cue and no measurement besides time                          | 9 of 15 | baguette, no-knead boule, ciabatta, focaccia, brioche, Pullman, 72-hour pizza, Roman scrocchiarella, New York |

Every preset records a final-proof time; only one (burger buns, "puffy") records a final-proof cue,
and none records "doubled" for a final proof. The pages now read (below) show that the Pullman recipes
of the same site carry marks the preset's summary did not keep ("about 1 inch below the top of the
pan or lid", "just below the lip"), which confirms that the summaries under-report cues.

## The claims C1 to C12

Levels A, B or C are those of the register. A reading of a scientific source (reading, scope, role) is
in [sources.md](sources.md#classification-of-evidence).

| Claim | Verdict | Supporting (read) | Contradicting or qualifying (read) | What remains unverified |
| ----- | ------- | ----------------- | ---------------------------------- | ----------------------- |
| C1 "doubled once" is almost never the criterion for ready to bake | supported for the final proof; partly for bulk | King Arthur Baking: final proof by the 1 inch over the rim of a pan or by the poke test; Weekend Bakery: "doubled" is ambiguous, poke instead; BAKERpedia: the height or the spring (B) | King Arthur Baking and the style guides use "to double" for the end of bulk in three recipes; King Arthur Baking's own pan recipes say bulk need not double | "Rise again by half": no source read; wording of the 89 pages |
| C2 some pizza dough is asked to triple | partly supported as a description, no source as a pizza criterion | BAKERpedia: in a commercial final proof the dough expands by a factor of three or four; Covino 2023: a free ball triples at about 24 to 30 h at 22 °C | no pizza recipe read says "triple" | A recipe or reference that says it for pizza |
| C3 with folds the volume change is practically impossible to read | qualified | Verheyen: gas is already 23 to 26 % of the volume after kneading; King Arthur Baking judges the end of a folded bulk by strength, smoothness, bubbles and jiggle, not by a ratio | Weekend Bakery (2026, sourdough) still gives a 50 to 75 % volume gain with a dome, bubbles and jiggle; bakers read volume in a marked container, a sample jar or a shot glass (reader comments) | A source that says volume is unreadable after folds |
| C4 doughs held in the fridge keep expanding; folds or degassing keep them in check | partly supported | King Arthur Baking: pizza dough refrigerated 4 to 24 h "will rise slowly as it chills"; shaped bagels have "a wide window of readiness" because cold slows fermentation | Windows differ (18, 24, 48, 72 h); King Arthur Baking's pizza note degasses the dough once before the fridge but says nothing of regular folds | "Folds keep it in check" |
| C5 over-expansion weakens or collapses the gluten; such a dough can practically always be reworked | first half supported; second half supported with limits | King Arthur Baking: a loaf 4 inches over the rim was deflated, reshaped and rebaked, and rose as high as a correct one with no flavour difference the author could taste; Liu 2024, Rathnayake 2018, Alpers 2020, Verheyen: the collapse side | King Arthur Baking: not for rapid-rise yeast or generally sourdough; the 2014 page says the third rise is quick and lower because the yeast is tiring | What is lost (sugar, acidity, browning) in a rework: no source read; "practically always": not supported as stated |
| C6 lean no-knead Pullman loaf: bulk done when smooth, less sticky, extensible; final proof 1 cm below the rim | partly supported; the figure is contradicted | King Arthur Baking: Pullman proof until about 1 inch below the top of the pan or lid, or just below the lip; autolyse leaves the dough less sticky and very smooth (BAKERpedia) | 1 inch (about 2.5 cm) against the owner's 1 cm; King Arthur Baking's Pullman bulk is "puffy though not necessarily doubled" | The 24 to 48 h cold poolish no-knead procedure; the bulk feel sign |
| C7 high-dose bagels, continuous process, no rise criterion | qualified | King Arthur Baking: some recipes ferment in bulk then shape, boil and bake in quick succession; no timed rise after shaping | The water-bagel recipe rises to double in bulk before shaping; "do not let it get puffy, pull before doubling"; most good bagels get a long cold proof | A recipe at 2 % yeast; the float test is not recommended by the one source that tested it |
| C8 pizza ready is fermented enough and relaxed enough to stretch; over-proofed means too extensible, a short fridge stay | first half supported; second half no source read | The Association's disciplinare: maturation makes the dough "plastic", extensible and little elastic; King Arthur Baking: more time in the fridge gives a more extensible dough; a dough that snaps back needs a 15 min rest | No source read describes over-maturity as "too extensible" or a short fridge stay as a remedy | The over-extensible state and its remedy |
| C9 several acceptable maturity levels for pizza dough; dark spots as a sign of age | levels supported; dark spots no source read | Windows: 8 to 24 h at 23 °C (the Association), 4 to 24 h (King Arthur Baking), 3 to 4 h of room proof after 48 h cold (a 72-hour recipe), 24 to 72 h (a New York recipe) | The Association's 8 to 24 h differs from the 12 to 24 h of this repository's normative record (another version) | Dark spots: no page read mentions them |
| C10 gas is not enough: gluten development and an active enough fermentation are both needed | supported | BAKERpedia: undermixed dough has low volume from poor gas retention; "adequate proof time is needed, otherwise the dough pieces cannot relax enough and the result is poor volume and a dense texture"; King Arthur Baking: if fermentation slows too much, strength suffers | Verheyen 2014: gas retention depends on gas amount and matrix, not on production speed | A study that crosses both failures |
| C11 the poke test: a smooth dough, the finger leaves a mark; used to decide when to bake | contradicted in the reading of its result | King Arthur Baking: "if the indent stays, it's ready to bake" (the owner's reading) | Weekend Bakery: a dent that stays means over-proofed, half way back is right; BAKERpedia: springs back means ready | Cold, high-hydration and enriched dough: no source read |
| C12 a poolish not yet collapsed can smell strongly of alcohol: use soon or chill | no source read as a sign; chemistry plausible | Di Stasio 2025: ethanol rose steadily to 8.87 g/kg at 48 h in a yeast pizza dough; BAKERpedia: too long a poolish raises acidity and alcohol to unacceptable levels | King Arthur Baking names a "pleasing aroma with a perceptible tang" as the ripe smell and a dome just beginning to recede as the peak | A source that gives alcohol as the cue, and the action |

### C1. "Doubled once" almost never the criterion for ready to bake

For the final proof the pages read agree with the owner. King Arthur Baking: for a loaf pan, bake when the
dough is about 1 inch over the rim (measured with a ruler or the length of the thumb to its first
knuckle), and for free-form loaves use the poke test, because the shaped dough rises outward as well as
up and "doubled" is hard to judge; Weekend Bakery calls the phrase a myth and argues that for a
half-sphere the volume doubles when the height grows by about a quarter, whereas doubling the diameter
multiplies the volume by eight; BAKERpedia: the height or the spring. For bulk the picture is mixed: the
King Arthur Baking professional guidance and its bagel, burger-bun and sandwich recipes say "to double" or
"nearly", but its Honey-Oat and classic pain de mie recipes say the bulk need not double ("puffy
though not necessarily doubled"); a straight-sided marked container is advised to read it. Weekend
Bakery's sourdough table asks for a 50 to 75 % gain. The owner's two-stage pattern (double, degas, rise
by half or double) is not stated in these terms by any page read: King Arthur Baking says only that the
second rise gives the dough a chance to expand again after the shaping knocked the air out.

### C2. Pizza dough asked to triple

No pizza recipe read says it. BAKERpedia states that in a commercial final proof the dough expands by a
factor of three or four to reach its final volume (the page cites a reference, not read; it concerns
pan breads proofed from a degassed piece at 35 to 37 °C). Covino 2023 (repository record): a free 250 g
Neapolitan ball at 22 °C reaches 1.3 times its volume at 8 h, doubles at 16 h and triples at about 24
to 30 h, a measurement and not a criterion, with the paper's text and figure differing on the time.

### C3. Folds make the volume change unreadable

The mechanism is measured (Verheyen: the gas fraction after kneading is already 23 % with compressed
yeast and 26 % with instant yeast, against 6 to 9 % unyeasted, and rises to 83 %), and the repository's
contract and ledger (L146) already state it. The pages read do not say it is impossible: King Arthur
Baking (a contributor, Maurizio Leo) lists "volume gain" among the signs at the end of a folded bulk
(risen significantly, smoother, resistant and elastic when tugged, bubbly, jiggles) and gives no ratio;
Weekend Bakery's 2026 sourdough guide gives 50 to 75 %, and its readers describe a sample jar or a
shot glass kept beside the bowl (comments, not the author). Verdict: qualified. Volume is read in practice
with a marked container or a sample; it is one sign among several, not a ratio.

### C4. Cold holding after the dough is ready

King Arthur Baking: pizza dough "will rise slowly as it chills" in the fridge for 4 to 24 h (18 h for the
whole wheat recipe); an alternative is to let the dough rise once at room temperature, "gently deflate" it
and refrigerate it overnight; shaped bagels refrigerated overnight "will not need to warm up or rise any
further", and cold fermentation gives "a wide window of readiness" with no worry about over-proofing;
Weekend Bakery: 12 to 16 h at 2 to 4 °C as a standard retard and 16 to 24 h for a well-bulked dough, a
colder fridge allowing a longer one. The recipes in the repository add ceilings of 24, 48 and 72 h, so
how long a dough can be held is a property of its dose and temperature. That regular folds or degassing keep
a held dough in check has no source read; the degassing before the fridge is a different gesture.

### C5. Over-expansion weakens the network; reworking

First half: King Arthur Baking says a loaf that crests the rim and starts to overflow has a gluten structure that
is "compromised and weaker" and, baked as it is, shows a sunken centre, a curl of crust, a coarse crumb and
a sour smell like over-ripe fruit; its test loaf baked as it was "rose, fell and collapsed". Measured:
Liu 2024 (frozen dough steamed bread, outside the domain): product volume peaked at a proofed
specific volume of 1.3 mL/g and fell steeply at 1.5 and 1.7, with a harder crumb and separation of crust
and crumb; Rathnayake 2018 (a review, citing Zghal and others): over-proofing thins cell walls, enlarges cells,
raises coalescence and hardens the crumb; Alpers 2020: during fermentation the gluten microstructure is
degraded and the dough becomes more mobile, chiefly because of the gas cells; Verheyen 2015 (record): a
critical gas volume makes the matrix unstable and oven rise becomes negative at high initial specific dough volume.

Second half: King Arthur Baking (PJ Hamel, 2018): deflate, reshape, put back, bake when no more than an inch over
the rim after about 20 minutes; the rescued loaf "rose a bit higher" and had no flavour difference the
author could discern; a yeast not designed for one quick rise is needed, and the technique "generally
doesn't work with sourdough bread". The 2014 page of the same site says the third rise goes quickly and
"probably won't be as high" as the yeast is tiring. So the owner's belief is supported for a yeast
sandwich loaf, qualified for rapid-rise yeast and sourdough, and "practically always" is not supported
as stated. Modernist Cuisine reportedly says more (lead, unread). What is lost in a late rework is
not described by any page read: the only measurements near it are Covino's compression work (29.96 J at 4
h, 7.65 J at 48 h) and Di Stasio's glucose (0.728 to 0.144 g per 100 g at 48 h, fructose to zero), which show
that a 48 h dough has changed, not that a rework costs anything.

### C6. The Pullman loaf and the tin mark

King Arthur Baking's lidded-tin recipes read on 2026-11-15: Honey-Oat Pain de Mie, rise "until it's about
1 inch below the top of the pan/lid, 60 to 90 minutes", bulk "until it's risen noticeably. It won't
necessarily double"; classic Pain de Mie in a 13 inch pan, rise until "just below the lip of the pan, 45
minutes to 1 hour", bulk until "puffy though not necessarily doubled", baked to 190 °F. So a mark in the
tin is real and so is a bulk that need not double, but the gap is about 1 inch (2.5 cm) or "just below the
lip", not 1 cm. The two enriched recipes of the survey record "until the dough nears the pan top". No page
describes the owner's no-knead procedure after a poolish over 24 to 48 h or its smooth, less sticky bulk
sign; BAKERpedia's autolyse page gives a plausible mechanism (a long rest of flour and water leaves a
dough that "feels less sticky and very smooth", more extensible and less elastic). The mark is not
universal: the open pan recipes use a height over the rim and the free-form ones the poke test.

### C7. Bagels with a high dose and a continuous process

King Arthur Baking (Andrew Janjigian, 2021): some recipes ferment in bulk and then shape, boil and bake "in quick
succession"; others proof the shaped bagels for a long stretch, usually in the fridge, and most good bagels
get a long cold proof. Its water-bagel recipe rises the dough to double in bulk (1 to 1.5 h), shapes, and
boils 30 s per side; a bagel baker's advice on the same site is to pull the dough early, "definitely
before they double in size", since over-proofed bagels deflate in the water bath. So there is no rise target
after shaping, as the owner says, but there is a ceiling, and the continuous version has a bulk rise to
double before shaping. BAKERpedia: the retard is characteristic and the rings sink for about 30 s in
the kettle, then float, which marks the end of boiling. The float test as a readiness test for the dough
was tested by King Arthur Baking and rejected (see the catalogue). No source read gives a dose of 2 %.

### C8. Pizza ready is fermented and relaxed

The Association's disciplinare says maturation (an enzymatic breakdown of proteins and starch) with
good coordination of leavening gives a dough that is "plastic", extensible and little elastic, less
tenacious and more digestible, while the dough just out of the mixer is "little extensible and very
elastic". King Arthur Baking: more time in the fridge gives "a more extensible dough"; a dough that snaps
back needs a 15 minute rest, and an overnight rest of preshaped balls in the fridge relaxes the gluten.
Covino 2023 (record): the disc diameter after pressing rose from 21.5 cm at 0 h to 29.3 cm at 4 h and stayed
26 to 28 cm to 48 h. Nothing read calls an over-matured dough "too extensible" or sends it to the fridge.

### C9. Several acceptable maturity levels

The windows differ by style: the Association 8 to 24 h at 23 °C with a dose table (1.5 g of fresh yeast for 8 h
and 0.3 g for 24 h); King Arthur Baking 4 to 24 h (whole wheat 18 h, pan pizza up to 72 h in one recipe by the
search summary, unread); a 72-hour recipe 24 h at room temperature then 48 h cold then 3 to 4 h of
proof; Roman scrocchiarella at most 48 h. These are the owner's "several levels" as prescriptions. The
Association's 2022 text and this repository's record of the 2024 regulations (12 to 24 h) disagree on the
minimum. Dark spots: no page read mentions them, and an open-access search found nothing; a search summary
(lead, unread) describes blisters charring in a hot oven.

### C10. Gas, gluten and fermentation activity

Gluten: BAKERpedia, an undermixed (cold) dough "proofs slower, low volume (poor gas retention as final
development did not occur)", an overmixed one is slack, sticky and proofs faster; King Arthur Baking: gluten
is the web that traps the gas and "the stronger and more elastic that web is ... the better your bread
will rise". Activity: BAKERpedia, otherwise the pieces "are unable to relax sufficiently, which can
result in poor volume and a dense texture"; King Arthur Baking: if fermentation slows too much, high
hydration doughs "literally fall without good fermentation". Measured: Iwaki 2020 and Vidal 2022 (a peak and a
breakdown), Takata 2019 (abstract only: stress at the end of proofing correlates with gas retention and loaf
volume), Verheyen 2015 (the lowest dose needed three times the time and gave 3.1 against 3.5 mL/g).
Verheyen 2014 qualifies the activity side: gas retention is limited by the gas amount and the matrix, not
by the speed of production.

### C11. The poke test

The test is widely taught and its result is read three ways. King Arthur Baking (four pages, one voice,
2014 to 2023): the dent that stays means ready, the one that pops back needs more time; Weekend
Bakery: the dent that disappears completely means under-proofed, popping halfway back means just right,
staying entirely dented means over-proofed, and right after shaping the dent stays although the dough is
not over-proofed, which one tells by feel (light, bubbly, elastic); BAKERpedia: the dough that springs back
is ready. The owner's reading agrees with King Arthur Baking and disagrees with the other two. King Arthur
Baking says it works "with dough in many forms" and calls it the best test "after its second rise",
and Weekend Bakery's page leaves a reader's question about bulk unanswered. The search lead from
Modernist Cuisine (unread) reads a permanent dent as over-proofed, like Weekend Bakery. Nothing read
covers cold or enriched dough.

### C12. The poolish that smells of alcohol

King Arthur Baking (professional reference, author not stated): a ripe poolish has its surface covered in small
bubbles, carbon dioxide bubbles breaking through, "a pleasing aroma that has a perceptible tang" and a slight tang
when tasted; a stiff preferment is ripe when fully risen and just beginning to recede in the centre; one past
ripeness gives bread lacking luster, volume and flavour. BAKERpedia: at its peak a poolish's volume starts to
fall back and the surface wrinkles; fermenting too long breaks down the gluten and raises acidity and alcohol to
unacceptable levels; Weekend Bakery: over-ripe preferment weakens the final dough. No page names a
strong alcohol smell as the cue or "use soon or chill" as the action; Di Stasio 2025 shows ethanol
accumulating steadily in a long yeast dough (a pizza dough, not a poolish), which makes a stronger smell
with time plausible.

## The three most contested criteria

**1. The result of the poke test.** King Arthur Baking: a dent that stays = ready; a dent that pops back
= more time; a fragile dough that collapses when poked = over-risen (four pages, one voice). Weekend
Bakery: a dent that stays entirely = over-proofed; halfway back = right; fully back = under. BAKERpedia:
springs back = ready. (Modernist Cuisine, unread: permanent dent = over-proofed.) The sources disagree on the
same observation; no measurement was found that settles it (an open-access search for poke and
indentation tests found nothing). What is common: the dough should be elastic and light, not dense or
fragile, and the test is read on a dough at room temperature after shaping.

**2. "Doubled in size".** For: King Arthur Baking's advice for bulk in a marked straight-sided container
and its recipes "to double"; BAKERpedia's three-to-four-fold expansion of a degassed commercial piece
(a description). Against or qualifying: Weekend Bakery's ambiguity argument and its 50 to 75 % for a
sourdough bulk; King Arthur Baking's own pan recipes ("not necessarily doubled"), and "pull before
they double" for bagels. For the final proof the pages use a mark (1 inch over a pan rim, 1 inch below a
lid), the poke, or a spring test, not a ratio.

**3. How far a past-peak dough can be saved.** For: King Arthur Baking's deflate, reshape and re-rise
(yeast loaves, a third rise of about 20 minutes, no flavour difference tasted by the author). Limits: the
same site says the third rise is lower, not for rapid-rise yeast, generally not for sourdough; BAKERpedia
says an overmixed dough in breakdown "is not salvageable" (a different failure: gluten, not gas).
Modernist Cuisine's claim of repeated revivals is a lead, unread. The owner's "practically always" has
support only for the first case.

## Part 2. A first catalogue of signs

**Scope.** The owner asked for every sign, by every sense, with its meaning and the action to take, and for
negative signs recorded as carefully as "ready" signs. The catalogue holds what was read. An entry has an
id; the sense and how a home baker perceives it; the state it indicates; the action and consequence the
source gives; where it is unreliable; the sources and the register level; measured backing. "Proceed"
means the source says only to go on to the next step. A `-` in the level column is a measured quantity,
not a craft claim. Entries marked "no source read yet" are the owner's examples or gaps.

### Preferment (poolish, biga, sponge)

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `pref.bubbles-tang` | Sight, smell, taste: a poolish surface covered with small bubbles, CO2 bubbles breaking through, a pleasing aroma with a tang, a slight tang and sweetness on tasting | Ripe; mix the final dough. Past it: bread lacks luster, volume and flavour | A loose preferment hides the dome | King Arthur Baking professional reference; B | none |
| `pref.dome-receding` | Sight: a stiff preferment fully risen and just beginning to recede in the centre; a poolish at its peak starts to fall back with a wrinkled surface | At peak; use. Waiting makes a more sour result | Harder to see on a poolish | King Arthur Baking; BAKERpedia (cites Hamelman; one voice); B | none |
| `pref.not-risen` | Sight: a dense preferment that has not moved | Not ripe; check temperature, time or the viability of the yeast; wait | | King Arthur Baking; B | none |
| `pref.over-ripe` | Warning: ripened too long | Gluten breaks down, acidity and alcohol rise, weaker hard-to-handle dough, especially at up to 50 % preferment; use earlier next time | | BAKERpedia; Weekend Bakery; C | none |
| `pref.time-and-dose` | Time: 3 % compressed yeast 1 to 2 h, 0.8 % 7 to 8 h, 0.25 % 12 to 15 h at 26 to 29 °C (BAKERpedia); 0.03 to 0.08 % instant yeast for 16 h, 0.23 to 0.33 % for 8 h (Weekend Bakery) | Choose a dose for the time available | Cooler rooms need more yeast (King Arthur Baking: 65 against 75 °F) | three organisations; B | none |
| `pref.alcohol-smell` | Smell: a strong alcohol smell before any collapse (owner's C12) | no source read yet as a cue | | | Ethanol accumulates steadily in a long yeast dough (Di Stasio 2025) |

### Mixing and kneading

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `mix.smooth` | Sight, touch: the dough smooth, soft, elastic | Developed enough; proceed. Not defined further | "Smooth" is subjective (King Arthur Baking says so) | King Arthur Baking recipes; C | none |
| `mix.windowpane` | Sight: a ping-pong-ball sized piece, flattened, rested a couple of minutes, stretched until it tears or shows light | Says the stage, not pass or fail: nearly full for a dough that rises an hour before shaping, much less for a dough that rises for hours; if it tears early, keep kneading | Whole grain (bran cuts the strands; may only appear after an overnight rest); enriched doughs need an intensive mix; a long sourdough fails and is best made into flatbread | King Arthur Baking; BAKERpedia (gluten film); B | Torque peak at a development time, then breakdown (Vidal 2022); aggregates break down past the peak (Iwaki 2020) |
| `mix.stages` | Sight, touch: pick-up (sticky, cold, lumpy), initial development, clean-up (stiff, one mass, elastic and not extensible), final development (film visible, correct temperature), letdown (too warm, sticky), breakdown (liquefying) | Stop at final development; a dough in breakdown "is not salvageable" | Commercial mixers | BAKERpedia; B | A mixograph curve peaks and then falls (BAKERpedia; Vidal 2022) |
| `mix.dough-temperature` | A thermometer: the finished dough at 24 to 28 °C (23 °C fermentation for Neapolitan dough; 18 to 26 °C in other presets) | Adjust the water temperature next time so that times repeat; too cold: slow, stiff, low volume; too warm: slack, fast, excessive volume | Mixer friction, flour temperature | seven voices; A | Yeast activity peaks near 27 °C and halves near 21 °C (Weekend Bakery's rule of thumb: doubles per 5 °C) |
| `mix.single-mass` | Touch: one compact mass; not sticky, soft, plastic | Stop; further mixing and the heat it makes "incordatura": the gluten organises into fibres and the mechanical properties suffer | Pizza direct doughs | The Association's disciplinare; B | none |
| `mix.under-developed` | Warning: a poorly kneaded dough | Lower volume, coarser crumb, thicker walls, larger cells; keep kneading | | BAKERpedia; Rathnayake 2018 (review); B | none of its own |
| `mix.autolyse-effect` | Touch: after a 20 to 60 min rest of flour and water at 23 to 25 °C the dough feels less sticky and very smooth, more extensible, less elastic | Mix less afterwards; less tolerance to overmixing | A fermented autolyse is weaker and softer | BAKERpedia; B | none |

### Bulk fermentation

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `bulk.doubled` | Sight: the volume in a straight-sided marked container against its start ("to double", "to nearly double") | Gas made; divide and shape | After folds or degassing (contract, L146); what "start" is after mixing; a sloped bowl; "not necessarily doubled" in two pan recipes | King Arthur Baking, Bake from Scratch (the preset records); B | Gas is 23 to 26 % of the volume after kneading (Verheyen); a free ball: 1.3 at 8 h, 2 at 16 h (Covino) |
| `bulk.volume-gain` | Sight: a 50 to 75 % gain, a domed top, bubbles at the surface and sides, a jiggle when the bowl is shaken | Ready (a sourdough, 4 to 5 h at 24 °C); judge by the dough rather than the clock; over-fermentation risk at 28 °C and above | Sourdough, not yeast alone | Weekend Bakery 2026; C | none |
| `bulk.strength-and-bubbles` | Sight, touch: risen significantly, much smoother, resistance and elasticity when a wet hand tugs it, bubbly, jiggles when the bowl is shaken | Fermented enough and strong enough to divide; too early: under-proofed; too late: hard to handle and nearly over-proofed | Folded, sourdough | King Arthur Baking (Maurizio Leo); B | none |
| `bulk.tight-when-folding` | Touch: the dough too tight, hard to stretch or tearing | Wait 30 min before another set of folds; if the dough was hard to stretch, later sets may be omitted; slack and extensible: another set | A rye dough does not strengthen by folds; a stiff or fully kneaded dough needs none | King Arthur Baking; B | none |
| `bulk.puffy` | Sight: "puffy though not necessarily doubled" (pain de mie, about 1.5 h); "risen noticeably" (Honey-Oat) | Proceed to shaping | Undefined | King Arthur Baking; C | none |
| `bulk.feel-smooth-less-sticky-extensible` | Touch (owner's C6, no-knead Pullman) | no source read yet; autolyse mechanism in `mix.autolyse-effect` | | | |
| `bulk.too-warm-or-late` | Warning: a dough hard to handle, slack, sour | The edge of over-proofing; see the final proof table | | King Arthur Baking; C | Gas cells destabilise the matrix (Alpers 2020) |

### After degassing: preshape, bench rest and the stretch

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `rest.relax-and-repeat` | Touch: a dough that pulls back when stretched | Tight gluten: walk away 15 min covered, then stretch again; repeat until the pan is filled | Cold dough, high gluten | King Arthur Baking (pizza recipes, 2024 page); B | Pressed disc 21.5 cm at 0 h, 29.3 cm at 4 h (Covino Table 1) |
| `rest.bench-time` | Time: 10 to 15 min after preshape; baguette 15 to 60 min; Roman balls 90 min at 22 to 25 °C | Relaxed; proceed to shaping or to the fridge | Dough temperature; dose | King Arthur Baking; the presets; C | none |
| `rest.overnight-fridge-relaxes` | Touch the next day: preshaped balls rested overnight in the fridge stretch easily | The gluten is relaxed | | King Arthur Baking; B | none |

### Final proof

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `proof.poke-indent-stays` | Touch: a floured finger pressed about 1 inch; the dent stays | Ready to bake (King Arthur Baking); over-proofed (Weekend Bakery; a lead from Modernist Cuisine) | Immediately after shaping the dent also stays (Weekend Bakery); cold dough: no source read | King Arthur Baking B; Weekend Bakery C | none |
| `proof.poke-springs-back` | Touch: the dent springs back, partly or fully | More time (King Arthur Baking); just right if halfway (Weekend Bakery); ready (BAKERpedia) | as above | three sources, three readings; B and C | none |
| `proof.over-1-inch-rim` | Sight: the dome at 1 inch over the rim of an 8.5 by 4.5 or 9 by 5 inch pan (measured with the thumb to its first knuckle) | Ready to bake; higher: crest over the rim, wobble, nearly transparent: over-proofed | Lidded tins: a different gap | King Arthur Baking; B | none |
| `proof.lidded-mark` | Sight: about 1 inch below the top of the pan or lid (Honey-Oat, 60 to 90 min), just below the lip (classic pain de mie, 45 min to 1 h) | Ready to bake | Which pan and recipe; the owner's figure is 1 cm | King Arthur Baking; B | none |
| `proof.pan-top-enriched` | Sight: the dough nears or reaches the top of the pan (brioche, milk bread) | Ready to bake; no duration | Low transcription confidence | two survey recipes; C | none |
| `proof.puffy` | Sight: "puffy", "very puffy", "noticeably puffy" after about 1 h to 2.5 h | Ready to bake | Undefined | King Arthur Baking (burger buns, pizza); C | none |
| `proof.bagel-before-doubling` | Sight, touch: shaped bagels risen slightly, the surface bounces back when touched, before doubling | Boil now; later: they deflate in the bath and are delicate to handle | Hot summer kitchens ferment faster | King Arthur Baking (two pages); B | none |
| `proof.float-test` | Sight: a scoop of dough in water | A sinking dough is not ready; a floating one may still be under-proofed (false positive after 30 of 60 to 90 minutes) | Always: it is a necessary, not a sufficient test | King Arthur Baking; B | none |
| `proof.height-and-spring` | Sight, touch: the loaf height, or a gentle press that springs back (commercial: 60 to 65 min at 35 to 37 °C, 85 to 95 % humidity) | Ready; over: pale crust, coarse grain, acid overtones; under: small volume, shell tops, bursting at the sides | Commercial proofing | BAKERpedia; C | none |
| `proof.over-signs` | Warning: a nearly transparent wobbling dome, overflow, fragile and collapsing under the finger | Over-proofed: deflate, reshape, rise again 20 min until no more than 1 inch over the rim; or baked as it is: sunken centre, coarse crumb, sour smell | Rapid-rise yeast; sourdough; the third rise is lower | King Arthur Baking (2014, 2018); B and C | Product volume falls beyond an optimum proof (Liu 2024); critical gas volumes (Verheyen) |
| `proof.under-signs` | Warning: shell tops, bursting at the sides, low volume | Under-proofed; more time | | BAKERpedia; Liu 2024 (side cracks at the lowest proofing degree); C | |

### Cold holding

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `cold.window` | Time at the fridge temperature: 4 to 24 h (pizza), 18 h (whole wheat), 12 to 16 h at 2 to 4 °C (a standard retard), up to 48 or 72 h in other recipes | Use within the window; the dough rises slowly; take it out 2 to 3 h before serving | Dose, fridge temperature (a warmer fridge shortens the window) | King Arthur Baking, Weekend Bakery, other recipes of the register; B | Growth continues at 5 to 8 °C (Birch, Izzreen) |
| `cold.return-to-room` | Time and touch: out of the fridge 20 to 60 min, or 2 to 3 h for a proofed pan pizza, before baking or stretching | Warm and relaxed; proceed | Thick dough | Feeling Foodish (New York); King Arthur Baking; C and B | none |
| `cold.bagels-no-warm-up` | Process: shaped, refrigerated overnight bagels | Boil from the fridge: no warm-up or further rise | | King Arthur Baking; B | none |
| `cold.folds-keep-in-check` | The owner's C4: folds or degassing hold a held dough back | no source read yet | | | |
| `cold.poke-unreliable` | Touch: the poke test on a cold dough | no source read (a blog lead, unread, says the cold dough feels too tough) | | | |

### Pizza dough balls: maturity window

| Id | Sign | Indicated state, action, consequence | Unreliable when | Sources and level | Measured |
| -- | ---- | ------------------------------------ | --------------- | ----------------- | -------- |
| `pizza.maturity-extensible` | Touch: plastic, extensible, little elastic, easy to lift from the box | Mature; stretch by hand, no rolling pin (the Association) | | The Association's disciplinare; B | Compression work peaks at 4 h and falls to 7.65 J at 48 h (Covino) |
| `pizza.window-8-24` | Time at 23 °C: 8 to 24 h of fermentation plus up to 4 h of work; 1.5 g of fresh yeast for 8 h, 0.3 g for 24 h | Within the specification | Version differences (12 to 24 h in the repository's record) | The Association; B | none |
| `pizza.core-temperature-19` | A thermometer: the core at least 19 °C after 3 to 4 h of appretto | Ready to stretch | A cold core, thick pan | La Confraternita della Pizza (the presets); B | none |
| `pizza.snaps-back` | Touch: a dough that snaps back when stretched | Rest 15 min covered, longer if needed; or an overnight fridge rest | | King Arthur Baking; B | |
| `pizza.more-time-more-extensible` | Touch: after 18 h in the fridge a more extensible dough | Flavour and extensibility improve with time up to the recipe's limit | | King Arthur Baking; B | Sugars fall: glucose 0.728 to 0.144 g per 100 g at 48 h (Di Stasio) |
| `pizza.dark-spots` | Sight: dark spots on a matured ball (owner's C9) | no source read yet | | | |
| `pizza.too-extensible` | Touch: too slack to hold shape (owner's C8) | no source read yet | | | |
| `pizza.pH` | A pH meter: 5.2 to 6.0 expected during fermentation | A range quoted by a review | | Rathnayake 2018 (review); no level | pH 6.13 to 5.44 over 48 h in a yeast dough (Di Stasio) |

### Boiled breads (bagels) and pretzels

Covered above: `proof.bagel-before-doubling`, `proof.float-test`, `cold.bagels-no-warm-up`. Boiling:
a bath about 3 inches deep, about 30 s per side, or 1 to 2 min a side (King Arthur Baking); sink 30 s then
float (BAKERpedia: the end of boiling, not a readiness of the dough). Pretzels: no source read.

### Enriched, scalded and laminated doughs; after the oven

No distinct readiness sign was read for butter incorporation (a school recipe says add butter gradually and keep
the dough at or under 26 °C: a condition), for a cooked scald or tangzhong (milk bread: cook 3 to 5 min, cool
to lukewarm: time), for a soaker, for lamination rests (Yang 2025 on sheeting and resting was seen as an
abstract only and not used), or for scoring. King Arthur Baking's lidded recipes give a baked-bread
temperature of 190 °F; bake doneness and cooling are outside the fermentation question and were not
otherwise read.

### Count

78 rows carry an id of which the following were counted by the writer: signs or warnings with a craft
source and a level: 49; backed by measurement or a review only: 5; owner's examples with no source read: 8;
process notes: 6; others (references to other rows): 10. Rows with a recommended action beyond "proceed":
28. (The earlier count of 31 ids was for a catalogue built from the repository's records alone.)

## Synthesis

- **Readiness is a conjunction, and it differs by step.** The pages show at least six kinds of
  condition: dough temperature at the start, gas made (a volume or a time), gluten developed (smooth,
  windowpane, a film), relaxation (the pull back, a rest), a state at the moment (a mark in the tin, a
  poke, a core temperature), and a ceiling (do not over-proof a bagel). No page gives one universal criterion.
- **What a home baker can observe** in these sources: time, a thermometer, a marked straight-sided
  container, a ruler or thumb against a pan rim, touch (smooth, elastic, pulls back, a dent), sight
  (domed, bubbles, jiggle, wrinkled surface), smell and taste (a pleasing tang), and a float of a sample.
  Sound appears nowhere. Gas, pH, ethanol and torque are laboratory measures.
- **Which model each needs.** The timing model reads dose and temperature history: a volume or time
  criterion at a step where nothing has degassed the dough, and a time at a stated temperature. The
  behavior model would read gluten state, relaxation and the over-proofing curve. A physical mark, a
  dough temperature and a process step need neither: they are checks against the recipe.
- **What the contract and code already model.** `volumeCueValid` (in
  `packages/core/src/domain/bake/thermal.ts`; `liveDoughForecast` is in `forecast.ts`) turns the "about
  doubled" cue off once a fold, degas, preshape or shape has been recorded since the step began, and the other
  cues the contract names are the dome, bubbles, jiggle, poke and feel (L146). L145 puts the baker's cues first and
  L21 bans a computed "doubled" target. Issues #243 (the cues, not yet on a screen), #246 (wording) and #287 hold
  the open work. What this catalogue shows is missing from them: signs for the stages before the last proof
  (preferment ripeness, end of mixing, relaxation), a mark in the tin and a pan-rim gap as cue kinds, a core or
  dough temperature as a cue, a ceiling cue ("pull before doubling"), negative signs with their remedies, and
  the disagreement on what the poke test shows, which the interface cannot settle by a rule.
- **Proposed direction, not accepted.** The ADR described at the top (proposed, not accepted) puts the
  criterion in the step and the baker, and the knowledge in a codified body. It requires that a trade term
  never be shown without a definition; this catalogue uses terms (poolish, biga, appretto, staglio, dough
  development time, autolyse, windowpane, bulk, preshape, bench rest, proof, retard, poke test) that have no
  definition entry yet.

## What this implies, as questions for the design

These are questions, not decisions.

1. **Kinds of end criterion.** A step could have: a volume ratio since the last degassing (timing model,
   with the volume-cue rule); a physical mark or a gap to a rim (neither model); a handling criterion such as
   relaxed enough or a poke result (behavior model if predicted, a baker's observation if not); a measured
   quantity such as a dough or core temperature (the thermal sub-model); a ceiling ("pull before doubling");
   no rise criterion, only a process step (neither); a maturity window with a start and an end (timing
   model for the age, behavior model for what the window means). Should a step carry several, as a conjunction?
2. **How to hold a disagreement on the same sign.** The poke test has three readings in three sources.
   Should the product present the test with its observation described, and leave the reading to the
   recipe's author or the baker, rather than a rule?
3. **Whether a "remedy" field is allowed**, since the only remedy read (deflate, reshape, rise again) is
   one source with limits (yeast type, sourdough).
4. **Where an over- or under-proofed warning belongs**, given that the one measured curve (Liu 2024) is for
   another product and the repository has no home measurement of it.
5. **What to do with a lead** (a search summary of a page that could not be read).
6. **Which reference works to read next**, and whether the owner can supply the chapters listed below.

## Coverage and gaps

| Stage | Coverage |
| ----- | -------- |
| Final proof, poke test, doubling, over-proofing and rework (yeast breads) | moderate: three organisations read, one of them (King Arthur Baking) with many pages, which counts as one voice |
| Mixing end, windowpane, dough temperature, autolyse | moderate: three organisations, a science base of five papers |
| Preferment ripeness | moderate for yeast poolish and biga; the smell of alcohol is not sourced; sourdough starters not covered |
| Bagels | thin: two organisations; no float test for bagels |
| Cold holding, pizza maturity | thin to moderate: the Association's specification, one baking company, one blog |
| Pan loaves with a tin mark | thin: one organisation's lidded recipes |
| Dark spots, over-extensible pizza dough, enriched and laminated doughs, scald, tangzhong, soaker, scoring, bake doneness, pretzels | not covered: no source read |

**Reference works not read, and the chapters that would be wanted** (the owner is asked to supply passages):
Hamelman, _Bread_ (preferments, mixing and fermentation chapters, and the pages cited by BAKERpedia for biga, p. 105); Suas,
_Advanced Bread and Pastry_ (the chapter "Fermentation", pp. 86 to 88, which BAKERpedia cites for biga, and the
chapters on mixing and on proofing); Calvel, _Le goût du pain_ (the pages on autolyse and on the signs of
proofing); Modernist Bread (the proofing and "dough CPR" sections, now known only through search summaries);
the Association's current disciplinare and the EU specification text for Pizza Napoletana (to settle the 8 to
24 h and the 12 to 24 h); Lallemand's Baking Update issues on fermentation and proof tolerance (none found on the
host).

**Search terms tried.** Europe PMC (open access): over-proofing and its spellings, "poke test", "springs back",
"windowpane test", "float test", "dark spots" with pizza, "under-proofed", dough relaxation and extensibility with
fermentation time, mixing and gluten development, gas retention, gas cell coalescence, cold fermentation, ethanol
aroma in dough, bagel boiling, sheeting and resting, preferment pH, degassing, punching, knock-back,
folding or remixing of bread dough. Web searches restricted to King Arthur Baking, BAKERpedia, Weekend Bakery,
Lallemand, Modernist Cuisine, MDPI and PubMed Central: over-proofed rework, poolish ripeness, windowpane, float
test, bagel proof, Pullman rim, pizza refrigeration, over-fermented pizza dough signs, poke test on cold dough,
Baking Update on proof tolerance, gluten weakening with fermentation time.

## Proposal: the data shape for a catalogue of signs

A Proposal, not a contract. One record per sign, so that it can later be codified and shown at the right step
of a recipe:

```text
Sign: <language-neutral id, e.g. proof.poke-indent-stays>
- Stage: preferment | mix | autolyse | bulk | rest | proof | cold | boil | after
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
[behavior-model-foundations.md](behavior-model-foundations.md#4c-the-form-of-a-behavior-statement): its Property
is a readiness state perceived by a sense, its Driver or Condition is the step and what has happened to the
dough, and it adds the sense, the action and the consequence that a statement about direction and size does not
carry. It is a **sibling** of the craft-register entry of [craft-knowledge.md](craft-knowledge.md#entry-template):
the register entry is the provenance (one source's claim, graded), and a sign record cites several entries;
neither template changes. A sign's recorded `action` is craft knowledge and takes the register's ceilings of use:
a level C action is never shown to a baker as guidance. A disagreement (as on the poke test) is two sign
records on the same observation, each with its sources, and no merged record.
