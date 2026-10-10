# Style guides: consensus proportions for the shipped templates

Machine-readable version: `style-guides.json` (same content, same source numbers).

This document collects what popular baking references agree on for each style that Flourprint
ships as a template (`packages/core/src/application/templates/`), and compares the shipped values
with that consensus. It is a reference for writing template `basis` texts and for future template
versions. It is not a contract and does not change any template by itself.

All percentages are baker's percentages of total flour. Temperatures are in °C; Fahrenheit
values from the sources are converted and rounded.

## Method

- **Read status.** Direct page fetching (WebFetch, curl) was blocked by the environment's network
  policy on 2026-10-10 (every host tried was refused, including pizzanapoletana.org and
  kingarthurbaking.com). The sources were therefore read **only through web-search excerpts**:
  the search tool returned quoted passages attributed to each page. A figure is cited only when the
  excerpt tied it to a specific page. Figures that appeared in excerpts without a clear page were
  left out or marked "not tied to a source". None of the full pages, PDFs or books was opened. Treat
  every value as `source_verified: false` until someone reads the page itself.
- **Choice of sources.** Pages that state weights or baker's percentages: professional formulas
  (King Arthur Baking "pro"), recognised baking authors as published or transcribed online
  (Hamelman, Forkish, Lahey, The Perfect Loaf, Wordloaf), style bodies (AVPN, Confraternita della
  Pizza, APITER), well-known home-baking and pizza sites and forums. SEO calculator pages were used
  only when nothing better appeared. Italian sources were searched in Italian for Italian styles.
- **Computed values.** When a page gives grams, the percentage was computed here (for example
  327 g water / 462 g flour = 71 %). Conversions from volume (teaspoons, an egg taken as 50 g) are
  flagged. Such values are marked "computed" or "converted".
- **What "consensus" means here.** A range is the spread of the values stated by at least two
  independent sources. When only one source gives a number, the range is marked **single source**.
  Pages from the same publisher (several King Arthur pages) count as one source for agreement.
  Consensus strength per style: _strong_ (three or more sources within a few points), _moderate_
  (two sources, or wider spread), _weak_ (single source or unattributed).
- **Starting point.** One value per key inside the range, usually its centre or the most
  documented formula, chosen to fit the template's schedule.
- **Limits.** Few sources per style (2-7); home-baking recipes dominate; yeast forms (fresh,
  active dry, instant) are often not stated in excerpts, so yeast percentages are the weakest data.
  Bake times depend on the oven and piece size. Processes (bulk and proof times) are documented far
  less than proportions.

Citations are in square brackets and refer to the numbered list at the end.

## Lean breads

### Baguette (`baguette`)

**Traits.** Long thin lean loaf: flour, water, salt and yeast only (the French "tradition"
designation, decree 93-1074, allows only these plus levain and three minor flour adjuncts, no
additives and no freezing [14]). Thin crisp crust from a hot, steamed hearth bake; open crumb;
usually made with a poolish.

| Key                   | Range                           | Sources         |
| --------------------- | ------------------------------- | --------------- |
| Hydration             | 66-71 %                         | [9, 10, 11, 12] |
| Salt                  | 2.0-2.2 %                       | [9, 10, 11, 12] |
| Poolish               | 30-33 % of flour at 100 % water | [9, 11]         |
| Instant yeast overall | 0.36-0.47 %                     | [9, 10]         |
| Poolish time          | 12-15 h at room temperature     | [11, 13]        |
| Bake                  | 230-260 °C, stone, steam        | [11, 13]        |
| Bake time             | 25-30 min (demi-baguettes)      | [11] single     |

Hamelman's formula as transcribed: 66 % water, 2 % salt, 33 % of the flour in a 100 % poolish
[9, 10]; the book states fresh yeast, and the 0.36-0.47 % instant figures are conversions by the
page authors [10]. King Arthur's professional formula: 67 % water, 2 % salt [12]. King Arthur's
class handout: 138 g + 138 g poolish for 12-15 h, 324 g flour, 189 g water, 10 g salt in the final
dough (computed: 71 % water, 30 % prefermented flour, 2.2 % salt), 500 °F stone with steam,
25-30 min [11]. Bulk and proof times were not tied to a source.

**Starting point.** 68 % water, 2.0 % salt, 33 % poolish at 100 %, 0.35 % instant yeast,
12 h poolish, 245 °C for 25 min. _Why:_ centre of four agreeing formulas.

**Template.** All values lie inside the ranges (instant yeast 0.3 % is just under 0.36 %). No
change needed. Consensus: strong for proportions, weak for process times.

### Lean boule in a Dutch oven (`boule-dutch-oven`)

**Traits.** Round lean loaf baked in a preheated covered pot that traps steam, then uncovered to
brown; wetter than a baguette; either a slow low-yeast fermentation or a cold rest.

| Key           | Range                                    | Sources      |
| ------------- | ---------------------------------------- | ------------ |
| Hydration     | 72-80 %                                  | [15, 16, 17] |
| Salt          | 2.0-2.3 %                                | [15, 16, 17] |
| Instant yeast | 0.2-0.4 % (long room fermentation)       | [15, 16]     |
| Bulk          | about 5 h at room temperature with 0.4 % | [15] single  |
| Proof         | about 1.25 h                             | [15] single  |
| Bake          | 230 °C, pot preheated ≥ 30 min           | [16] single  |
| Bake time     | 45-60 min (30 covered, 15-30 uncovered)  | [16] single  |

Forkish's Saturday White Bread: 72 % water, 2.1 % salt, 0.4 % instant yeast, about 5 h bulk and
1.25 h proof [15]. Lahey's no-knead bread: 430 g bread flour, 345 g water, 10 g Diamond Crystal
salt, 1 g instant yeast (computed: 80 %, 2.3 %, 0.23 %), 12-18 h at about 21 °C, 450 °F pot,
30 min covered then 15-30 min uncovered [16]. King Arthur's no-knead crusty white bread:
907 g flour, 680 g water, 18 g salt, 14 g instant yeast (computed: 75 %, 2.0 %, 1.5 %), 2 h at
room temperature then at least 2 h and up to 7 days in the fridge [17].

**Starting point.** 75 % water, 2.0 % salt, 0.4 % instant yeast with a 5 h bulk, 1.25 h proof,
230 °C for about 50 min. _Why:_ between Forkish and Lahey; 0.4 % yeast needs the long bulk.

**Template deviations.**

- `bulk` 2.5 h with 0.4 % instant yeast at 21 °C: the source schedule for that yeast level is
  about 5 h. Lengthen the bulk to about 5 h, or raise the yeast to about 1 %.
- Water 72 % is the low end; 75 % suits the 10 % whole wheat. Optional.

Consensus: moderate.

### Ciabatta (`ciabatta`)

**Traits.** Flat, slipper-shaped loaf from a very wet dough, usually built on a stiff biga and
barely shaped; large irregular holes, thin crust.

| Key            | Range                      | Sources      |
| -------------- | -------------------------- | ------------ |
| Hydration      | 76 %                       | [18] single  |
| Salt           | 2.0 %                      | [18, 20]     |
| Biga share     | 20-40 % of flour           | [18, 19, 20] |
| Biga hydration | 50-60 %                    | [19, 20]     |
| Biga time      | 12-16 h at 16-21 °C        | [18, 20]     |
| Bulk           | 2-3 h with folds           | [18, 20]     |
| Proof          | 45-60 min                  | [20] single  |
| Bake           | 238 °C (460 °F) with steam | [18, 20]     |
| Bake time      | 25-36 min                  | [18, 20]     |

King Arthur's professional formula: 76 % water, 2 % salt, 30 % prefermented flour, biga about 16 h
at room temperature, 2 h bulk with a fold, 460 °F with steam, about 36 min for 570 g loaves [18].
BAKERpedia: biga at 50-60 % water, ciabatta with 40 % biga [19]. Jay Arr: 60 % biga for 12-16 h at
60-65 °F, bulk 2.5-3 h, proof 45-60 min, 460 °F for 25-30 min [20]. Other pages describe ciabatta
as 75-80 % hydration, but the excerpt did not tie that figure to a page.

**Starting point.** 77 % water, 2.0 % salt, 30 % biga at 55 %, 14 h biga, 2.5 h bulk,
45 min proof, 238 °C for 28 min. _Why:_ the best-documented formula (King Arthur) as anchor.

**Template deviations.**

- Biga 50 % of the flour: above the 20-40 % seen. Use 30-35 %.
- Salt 2.2 %: sources give 2.0 %.

Consensus: moderate.

### Bagels (`bagels`)

**Traits.** Rings of very stiff strong-flour dough sweetened with malt, retarded cold overnight,
boiled briefly, baked hot: dense chewy crumb, shiny crust.

| Key         | Range                            | Sources      |
| ----------- | -------------------------------- | ------------ |
| Hydration   | 55-60 %                          | [21, 22, 24] |
| Salt        | 1.9 %                            | [21] single  |
| Malt syrup  | 3 % (plus 0.75 % diastatic malt) | [21] single  |
| Cold retard | overnight                        | [21, 22]     |
| Boil        | about 1 min per side or less     | [22] single  |
| Bake        | 260 °C (500 °F)                  | [22, 23]     |
| Bake time   | 15-18 min                        | [22] single  |

The Perfect Loaf: 55 % water, 1.9 % salt, 3 % barley malt syrup, 3 % sugar, 0.75 % diastatic
malt [21]. Hamelman 58 % and DiMuzio 60 % as reported on The Fresh Loaf, with overnight retard,
about 1 min boil and 500 °F for 15-18 min [22]. King Arthur's Hamelman-derived recipe bakes at
500 °F [23]; several other King Arthur bagel recipes use 425 °F. Foodgeek: about 55 % is typical
[24].

**Starting point.** 57 % water, 2.0 % salt, 3 % malt syrup, overnight retard (12 h),
250 °C for 18 min. _Why:_ centre of three hydrations; malt from the only formula with a figure.

**Template deviations.**

- Malt syrup 4 %: the only sourced figure is 3 %.
- Bake 20 min: sources bake 15-18 min at 500 °F; 20 min fits a 425 °F oven.
- Instant yeast 0.7 % could not be checked against a source.

Consensus: strong for hydration, weak for the rest.

### Focaccia (`focaccia`)

**Traits.** Oily pan flatbread, dimpled before baking. Two families: the Genoese _fugassa_ at
moderate hydration with oil in the dough and a water-oil-salt brine poured on top, and the
high-hydration pan focaccia of US home baking.

| Key                    | Genoese              | High-hydration                         |
| ---------------------- | -------------------- | -------------------------------------- |
| Hydration              | 61-70 % [25, 26]     | 76-80 % [27, 28]                       |
| Olive oil in the dough | 6-6.5 % [25, 26]     | 2 % [28] single                        |
| Salt in the dough      | not stated as weight | 1.8-2.0 % [27, 28]                     |
| Yeast                  | 0.3 % fresh [25, 26] | 0.3 % instant [27] single              |
| Proof in the pan       | -                    | 1-1.5 h (2-3 h if chilled) [29] single |
| Bake                   | -                    | 232-246 °C, 15-30 min [28, 29]         |

Genoese blogs: 1 kg type 0 flour, 700 g water, 60 g oil, 3 g fresh yeast [25]; 1 kg 00 flour,
612 g water, 65 g oil, 9 g malt, 3 g fresh yeast [26]. Baking Steel: 80 % water, 2 % salt, 0.3 %
yeast [27]. The Perfect Loaf (sourdough): 76 % water, 1.8 % salt, 2 % oil, 450 °F for about 30 min
[28]. King Arthur: pan rise 1-1.5 h, 475 °F for 15-18 min [29].

**Starting point (high-hydration family, as the template).** 78 % water, 2.0 % salt, 3 % oil,
0.4 % instant yeast, 2 h bulk, 1.25 h in the pan, 240 °C for 22 min. For a real Genoese focaccia:
65 % water and 6 % oil.

**Template deviations.**

- Salt 2.5 % in the dough: sources use 1.8-2.0 %, with salt on top in addition.
- The `basis` says "Genoese-style" but 80 % water is outside the Genoese 61-70 %. Relabel as a
  high-hydration pan focaccia, or switch to 65 % water and 6 % oil.

Consensus: strong within each family.

## Enriched and pan breads

### Brioche (`brioche`)

**Traits.** French bread enriched with eggs and butter at about half the flour weight, plus some
sugar; the butter goes in after gluten development and the dough is chilled overnight.

| Key          | Range                                    | Sources      |
| ------------ | ---------------------------------------- | ------------ |
| Eggs         | 50 %                                     | [30, 31, 32] |
| Butter       | 50 %                                     | [30, 31, 32] |
| Sugar        | 12 %                                     | [30, 31, 32] |
| Salt         | 1.6-2.5 %                                | [30, 31, 32] |
| Extra liquid | 9 % water                                | [30] single  |
| Cold retard  | overnight                                | [30, 33]     |
| Proof        | 2-3 h (up to 5 h from a cold pan)        | [33, 74]     |
| Bake         | 175-200 °C                               | [33, 34]     |
| Bake time    | 30-35 min to about 88 °C (190 °F) inside | [33, 34]     |

King Arthur's professional formula: eggs 50, butter 50, sugar 12, salt 2.5, water 9, overnight
retard [30]. Jay Arr (after Hamelman): 50/50/12/2.5 [31]. Zeb Bakes (Hamelman): 680 g flour,
340 g eggs, 82 g sugar, 11 g salt (reduced), 340 g butter [32]. King Arthur loaf: 350 °F for
30-35 min to 190 °F [33]; RecipeTin Eats: 200 °C for 15 min then about 20 min covered [34].

**Starting point.** Eggs 50 %, butter 50 %, sugar 12 %, salt 2.0 %, milk 10 %, 12 h cold,
2.5 h proof, 180 °C for 32 min. _Why:_ the Hamelman / King Arthur structure.

**Template.** All values inside the ranges. The 0.9 % instant yeast could not be checked (the
King Arthur formula lists 7 % yeast without the form in the excerpt). Consensus: strong.

### Burger buns (`burger-buns`)

**Traits.** Soft, lightly enriched rolls (water or milk, a little egg, butter and sugar), proofed
warm and baked moderately to a thin soft crust.

| Key           | Range                                  | Sources      |
| ------------- | -------------------------------------- | ------------ |
| Liquid        | 41-83 % (water and/or milk, egg apart) | [35, 36, 37] |
| Egg           | 12-13 % (converted, egg = 50 g)        | [35, 36]     |
| Butter        | 7-12 %                                 | [35, 36]     |
| Sugar         | 5-12 %                                 | [35, 36, 37] |
| Salt          | 1.8 %                                  | [35, 36]     |
| Instant yeast | 1.6-2.2 %                              | [35, 36, 37] |
| Bulk          | 1-2 h                                  | [35] single  |
| Bake          | 190 °C (375 °F), 15-18 min             | [35] single  |

King Arthur: 418 g flour, 170-227 g water, 28 g butter, 50 g sugar, 1 egg, 1 1/4 tsp salt, 1 tbsp
instant yeast, rise 1-2 h, 375 °F for 15-18 min [35]. Cloudy Kitchen: 385 g flour (25 g in a
tangzhong), 320 g milk, 1 egg, 45 g butter, 20 g sugar, 7 g salt, 7 g instant yeast, 30 g milk
powder [36]. Pretty Simple Sweet: 450 g flour, 40 g sugar, 7 g instant yeast, 120 ml water,
120 ml milk, 1 egg [37].

**Starting point.** Water 25 %, milk 30 %, egg 12 %, butter 9 %, sugar 8 %, salt 1.8 %, instant
yeast 1.6 %, 1.5 h bulk, 1 h proof, 190 °C for 16 min. _Why:_ centre of three recipes.

**Template deviations.**

- Instant yeast 0.9 %: below the 1.6-2.2 % the sources use with the same 1-2 h rise times.
- Egg 10 %: slightly under one egg per 400 g flour (12 %).
- Salt 2.0 %: sources 1.8 %. Minor.

Consensus: moderate.

### Pullman / pain de mie (`pullman`)

**Traits.** Square sandwich loaf baked in a lidded Pullman pan: flat top, thin soft crust, fine
close crumb; milk-based dough with moderate butter and sugar.

| Key                | Range                            | Sources          |
| ------------------ | -------------------------------- | ---------------- |
| Milk               | 58-66 % (often all the liquid)   | [38, 39, 40]     |
| Butter             | 8-13 %                           | [38, 39, 40]     |
| Sugar              | 5-10 %                           | [38, 39]         |
| Salt               | 1.7-2.0 %                        | [38, 39, 40]     |
| Instant yeast      | 1.5 %                            | [38] single      |
| Dough, 13-inch pan | 1069-1300 g                      | [41, 42]         |
| Bake               | 175-193 °C, lidded               | [38, 43, 44]     |
| Bake time          | 35-50 min, to about 88 °C inside | [38, 41, 43, 44] |

Jay Arr: milk 58, butter 8, sugar 5, salt 2, instant yeast 1.5, about 1071 g of dough, 380 °F for
35-40 min [38]. Wordloaf: milk 66, butter 13, sugar 10, salt 1.7 [39]. Bread Experience
(sourdough): milk 63, butter 13, honey 4.6, salt 2 [40]. Veena Azmanov: 1069 g for 13 x 4 x 4 in,
45-50 min [41]; The Perfect Loaf: 1200 g for the 13-inch pan [42]. King Arthur: milk, water and dry
milk, 350 °F, about 25 min covered then 10-20 min uncovered, 190 °F [43]; 45 min lidded in a 13-inch
pan [44].

**Starting point.** Water 20 %, milk 42 %, butter 8 %, sugar 6 %, salt 2.0 %, instant yeast 1.2 %,
1100 g of dough, 180 °C for 42 min. _Why:_ milk-dominant liquid and a dough weight that fills the
pan.

**Template deviations.**

- Butter 6 %: below 8-13 %.
- Dough 1000 g: under the 1069-1300 g quoted for a 13-inch pan; use about 1100 g.
- Instant yeast 0.8 %: the single sourced value is 1.5 %; 0.8 % is slow for 1.5 h + 1 h.
- Liquid is mostly water (45 water + 20 milk); sources are milk-dominant. The total of 65 % is
  fine.

Consensus: moderate.

### Shokupan (`shokupan`)

**Traits.** Japanese milk bread loaf: a pre-gelatinised flour paste (tangzhong at about 1:5, or
yudane at about 1:1) lets a milk-enriched dough hold more water, for a very soft, fine, moist
crumb.

| Key             | Range                               | Sources          |
| --------------- | ----------------------------------- | ---------------- |
| Liquid          | 66-76 % (milk and water, egg apart) | [45, 46]         |
| Sugar           | 6-10 %                              | [39, 45, 46]     |
| Butter          | 4-16 %                              | [39, 45, 46]     |
| Salt            | 1.7-2.0 %                           | [39, 45, 46]     |
| Egg             | 0-16.5 % (optional)                 | [45]             |
| Tangzhong flour | 5-7 % at 1:5                        | [47] single      |
| Instant yeast   | 1.2 %                               | [46] single      |
| Bake            | 177-210 °C, 25-35 min               | [46, 47, 48, 49] |

The Perfect Loaf (sourdough): milk about 66, butter 16, sugar 7, salt 1.9, egg 16.5 [45].
Chopstick Chronicles (yudane): 250 g flour (50 g scalded with 40 g water), 150 ml milk, 15 g sugar,
3 g instant yeast, 10 g butter, 5 g salt, 365 °F for 25-30 min [46]. The Bread She Bakes: 7 % of the
flour in the tangzhong, 180 °C for about 30 min to at least 93 °C [47]. Just One Cookbook:
195-210 °C for 25-30 min [48]. King Arthur: 350 °F for 30-35 min to at least 190 °F [49].

**Starting point.** Water 38 %, milk 35 %, butter 8 %, sugar 8 %, salt 1.8 %, instant yeast 1.0 %,
6 % tangzhong, 180 °C for 30 min. _Why:_ centre of the ranges.

**Template.** All values inside the ranges (0.9 % yeast slightly under the single sourced 1.2 %).
No change needed. Consensus: moderate.

## Pizzas

### True Neapolitan: AVPN rules (reference)

The AVPN _Disciplinare_ defines "Verace Pizza Napoletana". Figures from the 2022 and 2024 editions
as quoted in excerpts:

- Water and flour: 1 litre of water per 1.6-1.8 kg of flour (computed: 55.6-62.5 % hydration)
  [3].
- Salt: 40-60 g per litre of water (computed: 2.2-3.75 % of flour) [3].
- Yeast: 0.1-3 g of fresh brewer's yeast per litre (computed: about 0.006-0.19 % of flour); dry
  yeast at one third of the fresh weight; sourdough 5-20 % of flour [3].
- Flour: soft wheat type 00, W 250-320 in 2024 [1] (W 250-310 in 2022 [3]); forum reports say
  later editions also allow types 0 and 1 [75].
- Fermentation: 12-24 h in total at 16-22 °C; controlled cells at 18-20 °C and 60-70 % humidity
  are allowed (2024) [2]. Earlier editions: about 2 h of bulk then 4-6 h in balls at 20-25 °C
  [2, 5].
- Balls: 200-280 g for a pizza of 22-35 cm [1].
- Bake: wood-fired dome about 485 °C, floor about 380-430 °C [1]; oven at 430-480 °C [4];
  60-90 s [1, 4].

### Neo-Neapolitan (`pizza-neo-neapolitan`)

**Traits.** Neapolitan-style round pizza (soft puffy rim, thin centre) adapted to home ovens:
usually wetter and fermented longer in the cold than the AVPN rules allow, baked on a steel or
stone at the oven's maximum.

| Key         | Range                        | Sources    |
| ----------- | ---------------------------- | ---------- |
| Hydration   | 60-72 %                      | [6, 7, 8]  |
| Salt        | 2.2-3.75 % (AVPN-derived)    | [3]        |
| Cold retard | 24-72 h                      | [6, 8]     |
| Bake        | 260-290 °C, steel at maximum | [6, 7]     |
| Bake time   | 5-8 min per pizza            | [7] single |
| Ball        | 200-280 g (AVPN)             | [1]        |

Fond: 60-62 % for home bakers [8]. Pizza Making Forum: 65 % at about 750 °F bakes in 4-5 min,
68 % at 550 °F in about 8 min [7]. Baking Steel: 70-72 % with high-gluten flour and 72 h cold for
a 500 °F steel [6].

**Starting point.** 65 % water, 2.8 % salt, 0.1 % instant yeast, 2 h bulk, 24 h cold, 3 h at room
temperature, 260 g balls, 280 °C for about 6 min. _Why:_ centre of the home-oven spread, above the
AVPN ceiling.

**Template deviations.**

- Water 62 % is the AVPN ceiling; home-oven adaptations sit at 65-72 %. Optional change to 65 %.

Consensus: moderate (hydration spread).

### Roman tonda (`pizza-roman`)

**Traits.** Roman _tonda_ (_scrocchiarella_): thin, crisp round pizza with almost no rim, from a
low-hydration dough with a little oil, rolled out with a pin from a small ball.

| Key         | Range                              | Sources              |
| ----------- | ---------------------------------- | -------------------- |
| Hydration   | 55-60 %                            | [50, 51, 52, 53]     |
| Olive oil   | 0-3 %                              | [50, 51, 52, 53, 54] |
| Salt        | 2.0-3.0 %                          | [50, 51, 52, 53, 54] |
| Flour       | type 0 or "pizza" flour, W 240-300 | [50, 51, 52]         |
| Ball        | 180 g for 28-32 cm                 | [50, 51, 54]         |
| Cold retard | 16-24 h                            | [52, 53, 55]         |
| Room proof  | 2-4 h before rolling               | [52, 53, 55]         |
| Bake        | 360-400 °C, 2-3 min (pizza oven)   | [55] single          |

Molino Vigevano: 180 g balls, 57-60 % water, type 0 W 280-300, 2.6 % salt, no oil [50]. Food &
Nature: 440 g type 0 W 270-290, 255 g water, 13 g salt, 13 g oil (computed: 58 %, 3 %, 3 %)
[51]. Confraternita recipe: W 240-260, 55 % water, 1.2 % oil, 2 % salt, about 20 h at 8 °C then
4 h at room temperature [52]. Everybodypizza: 55 % water, 2 % oil, 2 % salt [53]. Napo: about
1.1 % oil, 2 % salt, 180 g balls [54]. Delivita: about 2 h at room temperature, 360-400 °C on the
stone for 2-3 min [55]. No sourced home-oven bake figure.

**Starting point.** 57 % water, 1.5 % oil, 2.5 % salt, 0.2 % instant yeast, 24 h cold, 2 h at
room temperature, 180 g balls. _Why:_ centre of five formulas.

**Template deviations.**

- Oil 3 %: top of the 0-3 % spread; most sources use 1-2 %.
- Ball 200 g: sources agree on 180 g.
- Flour `tipo-00-flour`: Italian sources specify type 0 or pizza flour of W 240-300; 00 is
  acceptable when its W is similar.

Consensus: strong for hydration and ball weight.

### Pizza in teglia (`pizza-teglia`)

**Traits.** Roman pan pizza (_in teglia_, _al taglio_): very wet dough from strong flour, long
cold maturation, stretched gently into an oiled rectangular pan; airy crumb, crisp base.

| Key        | Range                                   | Sources      |
| ---------- | --------------------------------------- | ------------ |
| Hydration  | 75-90 % (80 % "optimal")                | [56, 57, 59] |
| Flour      | W 300-380                               | [57, 58]     |
| Salt       | 2.5 %                                   | [58] single  |
| Olive oil  | about 3.2 % (computed)                  | [58] single  |
| Maturation | 18-72 h, cold or controlled temperature | [57, 58, 59] |

Confraternita della Pizza disciplinare: 75-100 % hydration, 80 % optimal [56]. Pizza Italiana
Academy: 80-90 %, W 300-340, 18-48 h at controlled temperature [57]. APITER as reported: flour
00 or 0 of W 300-380, P/L 0.50-0.60, 2.5 % salt, 9 g oil per 280 g flour, 48 h [58]. Pizza Today:
one shop at 85 % and cold holds of 36-72 h [59]. Bake temperature and time were not tied to a
source.

**Starting point.** 80 % water, 2.5 % salt, 3 % oil, 0.3 % instant yeast, 48 h cold. _Why:_ the
disciplinare's optimum and the middle of 18-72 h.

**Template.** Water, salt and oil match the sources. Cold maturation 24 h is inside the range;
48 h is the more cited value (optional). Consensus: strong for hydration.

### New York (`pizza-new-york`)

**Traits.** Large, thin, foldable round pizza from high-gluten flour with a little oil and often
sugar, cold-fermented one to three days, baked in a deck oven (at home: steel or stone at maximum).

| Key           | Range                                      | Sources      |
| ------------- | ------------------------------------------ | ------------ |
| Hydration     | 59-65 %                                    | [60, 61, 62] |
| Oil           | 2-3 %                                      | [61] single  |
| Sugar         | 1-2 % (optional)                           | [61] single  |
| Instant yeast | 0.25-0.4 % for 24-48 h cold                | [61] single  |
| Cold retard   | 24-72 h                                    | [60, 61, 62] |
| Ball          | 280-300 g (12-14 in), 345-400 g (15-16 in) | [60, 61]     |
| Bake          | 260 °C (500 °F) on a steel                 | [62] single  |

Sip and Feast: 64 %, 345 g balls for 15-16 in [60]. Fond: 60-65 %, 2-3 % oil, 1-2 % sugar,
0.25-0.3 % instant yeast for 24-48 h, 48 h as the sweet spot [61]. Baking Steel: 65 %, 24 h,
500 °F steel [62]. Salt about 2 % is common but was not tied to a page.

**Starting point.** 63 % water, 2.0 % salt, 2 % oil, 1.5 % sugar, 0.3 % instant yeast, 48 h cold,
2 h at room temperature, 280 g balls.

**Template.** All values inside the ranges. No change needed. Consensus: strong for hydration and
fermentation.

### Sicilian (`pizza-sicilian`)

**Traits.** Thick, airy rectangular pan pizza (New York "Sicilian" or slab) baked in a
well-oiled sheet pan so that the base fries crisp. The Palermo _sfincione_ is a related soft,
oily style, often with semolina, not covered by the template.

| Key           | Range                            | Sources          |
| ------------- | -------------------------------- | ---------------- |
| Hydration     | 64-83 % (centre about 73 %)      | [63, 64, 65, 66] |
| Salt          | 2.0 %                            | [64, 65]         |
| Oil in dough  | 3 % (plus about 30 g in the pan) | [64] single      |
| Instant yeast | 0.33 % with 12-48 h cold         | [64] single      |
| Dough         | 1070-1200 g per 13 x 18 in pan   | [64, 66]         |
| Bake          | 245-260 °C, 13-24 min            | [64, 66]         |

King Arthur: 540 g high-gluten flour, 397 g water (computed 73.5 %), 1 h rise, oiled half-sheet
pan [63]. Hammy's: 600 g flour, 438 g water, 12 g salt, 2 g instant yeast, 18 g oil (73 %), 12-48 h
cold, 475 °F for 18-24 min [64]. Sip and Feast: 64 %, 2 % salt [65]. Wordloaf: about 83 %, 1200 g,
500 °F for 13-15 min [66].

**Starting point.** 72 % water, 2.0 % salt, 3 % oil, no sugar, 0.5 % instant yeast for a
same-day schedule (2 h bulk, 1.5 h in the pan), 1070 g, 250 °C for 20 min.

**Template deviations.**

- Oil 4 %: above the single sourced 3 %.
- Salt 2.2 %: sources 2.0 %. Minor.

Consensus: moderate.

### Chicago deep dish (`pizza-chicago`)

**Traits.** Low-hydration, fat-rich crust (corn oil, butter, sometimes cornmeal or semolina)
pressed up the sides of a deep round pan, filled with cheese then sauce, baked fairly long at
moderate heat.

| Key                  | Range                                   | Sources          |
| -------------------- | --------------------------------------- | ---------------- |
| Hydration            | 45-52 %                                 | [67, 68, 69, 70] |
| Fat                  | 10-23 % (oil and/or butter)             | [67, 68, 69, 70] |
| Cornmeal or semolina | about 7 % cornmeal, or 15-25 % semolina | [67, 68, 69, 73] |
| Active dry yeast     | 0.5-0.75 %                              | [69, 70]         |
| Salt                 | 1 %                                     | [69] single      |
| Bake                 | 218 °C (425 °F)                         | [67, 71]         |
| Bake time            | 25-28 min (9-inch pan)                  | [72] single      |

King Arthur: 482 g flour, 35 g cornmeal, 25 g olive oil, 25 g vegetable oil, melted butter
(computed: about 49 % water, about 10 % oil before butter) [67]. Real Deep Dish: 50 % water,
16.2 % corn oil, optional 15-20 % semolina [68]. Ryan's Pizza Blog: 52 % water, 22 % corn oil,
1 % salt, 0.5 % active dry yeast, 20 % semolina, later advising about 5 points less water [69].
Big Green Egg forum (Malnati-style): 45 % water, 19 % corn oil, 4 % olive oil, 0.75 % active dry
yeast [70]. Red Star: 425 °F in 9 x 2 in pans [71]. The Fresh Cooky: 25-28 min [72]. Pizza Making
Forum: up to about 25 % semolina [73].

**Starting point.** 50 % water, 18 % fat, 7 % cornmeal, 1.5 % salt, 0.5 % instant yeast,
218 °C for about 30 min (12-inch pan).

**Template deviations.**

- Water 52 %: top of the range; its author later advised less. Use 50 %.
- Bake 35 min: the single source bakes 25-28 min in a 9-inch pan; about 30 min for 12 inches.
- Fat 18 % and cornmeal 10 % are inside the spreads.

Consensus: moderate.

## Sources

All accessed 2026-10-10, through web-search excerpts only (see Method).

1. AVPN International Regulations (Disciplinare), 2024 edition, English. pizzanapoletana.org.
   https://www.pizzanapoletana.org/public/pdf/Disciplinare-2024-ENG.pdf
2. AVPN Disciplinare internazionale, 2024 edition, Italian. pizzanapoletana.org.
   https://www.pizzanapoletana.org/public/pdf/Disciplinare-2024-ITA.pdf
3. AVPN International Regulation, 2022 edition, English. pizzanapoletana.org.
   https://www.pizzanapoletana.org/public/pdf/Disciplinare_AVPN_2022_en.pdf
4. AVPN International Regulations (web page). pizzanapoletana.org.
   https://www.pizzanapoletana.org/en/ricetta_pizza_napoletana
5. Puntata, staglio e appretto: tutto sull'impasto. Sfida Pizza.
   https://sfidapizza.it/puntata-staglio-appretto/
6. Neapolitan Pizza Dough for Your Home Oven (Forget the 900F Rule). Baking Steel.
   https://bakingsteel.com/blogs/recipes/neapolitan-pizza-dough-for-your-home-oven-forget-the-900-f-rule
7. Post on hydration vs bake temperature (msg 775892). Pizza Making Forum.
   https://www.pizzamaking.com/forum/index.php?msg=775892
8. Neapolitan Pizza Dough Recipe: AVPN Guide for Home. Fond.
   https://fond.kitchen/guides/pizza-dough/neapolitan-pizza-dough/
9. Poolish Baguettes (Hamelman formula). The Fresh Loaf.
   https://www.thefreshloaf.com/handbook/poolish-baguettes
10. Jeffrey Hamelman's Poolish Baguette (Adapted). Dawghouse Bakery.
    https://dawghousebakery.com/2021/02/27/jeffrey-hamelmans-poolish-baguette-adapted/
11. Baguettes, class handout (May 2024). King Arthur Baking.
    https://shop.kingarthurbaking.com/content/class-pdfs/Baguettes_May_2024.pdf
12. French Bread with Poolish (professional formula). King Arthur Baking.
    https://www.kingarthurbaking.com/pro/formulas/french-bread-with-poolish
13. Classic Baguettes Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/classic-baguettes-recipe
14. Baguette tradition : ce que la mention garantit vraiment. Le Pain Français.
    https://lepainfrancais.fr/culture-pain/baguette-de-tradition-francaise/
15. Ken Forkish, _Flour Water Salt Yeast_ (Ten Speed Press, 2012), "Saturday White Bread". Book;
    its ingredient table and schedule were seen only as search excerpts, no licensed copy opened.
16. Jim Lahey's No-Knead Bread. Leite's Culinaria.
    https://leitesculinaria.com/99521/recipes-jim-laheys-no-knead-bread.html
17. No-Knead Crusty White Bread Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/no-knead-crusty-white-bread-recipe
18. Ciabatta (professional formula). King Arthur Baking.
    https://www.kingarthurbaking.com/pro/formulas/ciabatta
19. Biga. BAKERpedia. https://bakerpedia.com/processes/biga/
20. Ciabatta Guide: The High-Hydration Bread. Jay Arr Bread.
    https://jayarrbread.com/blog/ciabatta-guide
21. Sourdough Bagel (New York Style). The Perfect Loaf.
    https://www.theperfectloaf.com/sourdough-bagel/
22. Bagel Problems! The Fresh Loaf. https://www.thefreshloaf.com/node/14251/bagel-problems
23. Bagels with Pâte Fermentée Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/bagels-with-pate-fermentee-recipe
24. Sourdough Bagels Recipe. Foodgeek. https://foodgeek.io/en/sourdough-bagels-recipe/
25. Focaccia genovese (Annalisamamykitchen). GialloZafferano blogs.
    https://blog.giallozafferano.it/mamykitchen/ricetta-focaccia-genovese/
26. Focaccia Genovese: croccante e saporita (Gingernigella). GialloZafferano blogs.
    https://blog.giallozafferano.it/gingernigella/focaccia-genovese-croccante-saporita/
27. High Hydration Focaccia Recipe (80%). Baking Steel.
    https://bakingsteel.com/blogs/recipes/crispy-focaccia-bread-recipe-baked-on-a-steel
28. A Simple Sourdough Focaccia. The Perfect Loaf.
    https://www.theperfectloaf.com/a-simple-focaccia/
29. Big and Bubbly Focaccia Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/big-and-bubbly-focaccia-recipe
30. Brioche (professional formula). King Arthur Baking.
    https://www.kingarthurbaking.com/pro/formulas/brioche
31. Brioche Guide: The Science of Rich Dough. Jay Arr Bread.
    https://jayarrbread.com/blog/brioche-guide/
32. Jeffrey Hamelman's Brioche. Zeb Bakes.
    https://zebbakes.com/2010/11/30/jeffrey-hamelmans-brioche/
33. Brioche Recipe. King Arthur Baking. https://www.kingarthurbaking.com/recipes/brioche-recipe
34. Brioche. RecipeTin Eats. https://www.recipetineats.com/brioche/
35. Beautiful Burger Buns Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/beautiful-burger-buns-recipe
36. Homemade Burger Buns (Super Soft). Cloudy Kitchen.
    https://cloudykitchen.com/blog/super-soft-burger-buns/
37. Homemade Hamburger Buns. Pretty. Simple. Sweet. https://prettysimplesweet.com/hamburger-buns/
38. Pain de Mie Recipe: The Perfect-Crumb Pullman Loaf. Jay Arr Bread.
    https://jayarrbread.com/blog/pain-de-mie-pullman-loaf/
39. Recipe: shokupain de mie. Wordloaf (Andrew Janjigian).
    https://wordloaf.substack.com/p/recipe-shokupain-de-mie
40. Sourdough Pain de Mie with up to 30% Kamut or Spelt. Bread Experience.
    https://www.breadexperience.com/sourdough-pain-de-mie-spelt-kamut/
41. Easy Pullman Sandwich Bread - Pain de Mie. Veena Azmanov Kitchen.
    https://veenaazmanov.com/pullman-sandwich-bread-pain-de-mie/
42. Pain de Mie Sandwich Bread. The Perfect Loaf. https://www.theperfectloaf.com/pain-de-mie/
43. Pain de Mie Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/pain-de-mie-recipe
44. Pain de Mie with a Starter Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/pain-de-mie-with-a-starter-recipe
45. Sourdough Shokupan (Japanese Milk Bread). The Perfect Loaf.
    https://www.theperfectloaf.com/sourdough-shokupan-japanese-milk-bread/
46. Shokupan Recipe (Japanese Milk Bread Loaf). Chopstick Chronicles.
    https://www.chopstickchronicles.com/shokupan-japanese-fluffy-white-bread/
47. Fluffy Japanese milk bread loaf recipe (Shokupan). The Bread She Bakes.
    https://www.thebreadshebakes.com/2019/03/homemade-japanese-milk-bread-loaf-recipe-shokupan/
48. Shokupan (Japanese Milk Bread). Just One Cookbook.
    https://www.justonecookbook.com/japanese-milk-bread-shokupan/
49. Japanese Milk Bread Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/japanese-milk-bread-recipe
50. Pizza Scrocchiarella Romana. Molino Vigevano.
    https://molinovigevano.com/pizza-scrocchiarella-romana/
51. Pizza tonda "scrocchiarella romana" nel forno di casa. Food & Nature.
    https://www.foodandnature.it/pizza-tonda-scrocchiarella-romana-nel-forno-di-casa/
52. Pizza scrocchia, la tonda romana (quotes a Confraternita della Pizza recipe; attribution of the
    excerpt to this page is probable, not certain). Un condominio in cucina.
    https://uncondominioincucina.blogspot.com/2016/05/pizza-scrocchia-la-tonda-romana.html
53. Roman Thin (Tonda Romana) Pizza Dough Recipe & Calculator. Everybodypizza.
    https://everybodypizza.com/styles/bari/
54. Tonda Romana Pizza Dough Recipe. Napo. https://www.napo.pizza/en/recipes/en-tonda-romana
55. Classic Doughs - Romana Tonda. Delivita.
    https://delivita.com/blogs/recipes/classic-doughs-romana-tonda
56. Disciplinare di produzione della Autentica Pizza in Teglia alla Romana. La Confraternita della
    Pizza.
    https://laconfraternitadellapizza.net/documenti/Disciplinare-Autentica-Pizza-In-Teglia-Alla-Romana.pdf
57. Pizza in Teglia Romana. Pizza Italiana Academy.
    https://www.pizzaitalianacademy.it/detnews.asp?idnews=90
58. Pizza in teglia alla romana ad alta idratazione, disciplinare APITER. Trattoria da Martina.
    https://www.trattoriadamartina.com/2017/09/pizza-in-teglia-alla-romana-ad-alta-idratazione/
59. Roman Pizza, Long Attention Pan. Pizza Today.
    https://pizzatoday.com/news/roman-pizza-long-attention-pan-knead-to-know/617431/
60. Homemade Pizza Dough and New York Pizza (Cold Ferment). Sip and Feast.
    https://www.sipandfeast.com/homemade-pizza-dough-new-york-pizza/
61. New York Pizza Dough Recipe: 48-Hour Cold Ferment. Fond.
    https://fond.kitchen/guides/pizza-dough/ny-style-pizza-dough/
62. New York Style Pizza Dough (24 Hours), Baked on Steel. Baking Steel.
    https://bakingsteel.com/blogs/recipes/new-york-style-pizza-dough-24-hours
63. Sicilian-Style Pizza Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/sicilian-style-pizza-recipe
64. Sheet-Pan Pizza: A Reliable Half-Sheet Recipe. The Pan Has Opinions.
    https://hammyspizza.com/sheet-pan-pizza/
65. New York Sicilian Pizza. Sip and Feast. https://www.sipandfeast.com/new-york-sicilian-pizza/
66. Recipe: Sicilian Slab Pizza. Wordloaf (Andrew Janjigian).
    https://wordloaf.substack.com/p/recipe-sicilian-slab-pizza
67. Chicago-Style Deep Dish Pizza Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/chicago-style-deep-dish-pizza-recipe
68. Chicago Style Deep Dish Pizza (PDF). Real Deep Dish.
    https://www.realdeepdish.com/RealDeepDish-201211.pdf
69. Deep dish with semolina. Ryan's Pizza Blog.
    http://ryanspizzablog.blogspot.com/2012/10/deep-dish-with-semolina.html
70. MUST READ for chicago style pizza (Malnati-style formula; attribution between two threads of
    this forum is probable, not certain). Big Green Egg forum.
    https://eggheadforum.com/discussion/631875/must-read-for-chicago-style-pizza
71. Chicago Deep Dish Pizza. Red Star Yeast.
    https://redstaryeast.com/recipes/chicago-deep-dish-pizza/
72. Chicago Style Deep Dish Pizza. The Fresh Cooky.
    https://www.thefreshcooky.com/chicago-style-deep-dish-pizza-recipe/
73. Malnati Deep Dish with Semolina. Pizza Making Forum.
    https://www.pizzamaking.com/forum/index.php?topic=6480.0
74. Brioche French Toast Recipe. King Arthur Baking.
    https://www.kingarthurbaking.com/recipes/brioche-french-toast-recipe
75. AVPN discussion (one of several forum messages returned; which one carries the 2019
    flour-type remark is uncertain). Pizza Making Forum.
    https://www.pizzamaking.com/forum/index.php?msg=580345
