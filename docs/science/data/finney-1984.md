# Finney 1984: the optimized straight-dough method, prescribed schedule and figure points

Data file: `finney-1984.csv` (31 rows, `source_verified` true for each). Exponents recomputed by
`../scripts/finney_exponents.mjs` (second section of its output).

| Field                      | Value                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                     | Finney K. F. (1984). "An Optimized, Straight-Dough, Bread-Making Method After 44 Years." _Cereal Chemistry_ 61(1):20-27 (received 1983-03-24, accepted 1983-08-11).                                                                                                                                                                                                                                                                                                                            |
| Access                     | Publisher back-issue PDF, https://www.cerealsgrains.org/publications/cc/backissues/1984/Documents/chem61_20.pdf. The paper states "This article is in the public domain and not copyrightable" (p. 20). The PDF is not stored in this repository.                                                                                                                                                                                                                                              |
| Provenance label           | A **prescribed test schedule** of a later method paper (Table V), plus figure and text values that restate the 1976 experiment. It is **not** a new experiment and **not** a replicate of Finney et al. 1976: the paper cites that experiment (see below) and applies it. Its Table V is a method specification, so its rows are not independent measurements and must not be pooled with the 1976 optimum pairs.                                                                              |
| What it is                 | A review and method paper by the sole author after 44 years of the straight-dough test (1939 onwards): early formula studies (salt, shortening, NFDM, malt, bromate, mixing, p. 20-22), modifications (no added sucrose, ascorbic acid in place of bromate and NFDM, p. 22-23), the 70-min fermentation with added sucrose (p. 23-24), the sugar-free high-protein 70-min bread (p. 24-25), the recommended method (p. 25-26), equipment, solutions and "Important Considerations" (p. 26-27). |
| Formula                    | "100 g of flour (14% mb), optimum water, and 50 ppm of ascorbic acid ... 3.5 or 5.3 g of compressed yeast for 120 or 90 min of fermentation, respectively, 6 g of sugar, 1.5 g of salt, 3 g of shortening or equivalent surfactant, and 0.25 g of barley malt (about 50 DU/g, 20 degrees C)" (p. 25). Mixed to minimum mobility at about 100 rpm. 4 g NFDM and 10 ppm bromate are part of the older formula (Table I, p. 22; Table III footnotes, p. 24).                                      |
| Basis of the yeast dose    | Percent of flour mass; "compressed yeast" with "about 70% moisture" (p. 26, 27). Yeast potency is checked weekly by gas production and the dose is adjusted (p. 27).                                                                                                                                                                                                                                                                                                                           |
| Procedure                  | Each 100 g of flour mixed in a pin mixer; dough temperature recorded after mixing (the value is not printed); fermented in a covered stainless-steel bowl; punched twice and panned at intervals set by Table V; proof in the cabinet; bake 24 min at 215 C; loaf volume by rapeseed displacement (p. 25-26).                                                                                                                                                                                  |
| Temperature meaning        | **Proof: 30 C, stated** ("proof 47 +/- 1 min at 30 C", p. 25). **Laboratory: 25 +/- 0.5 C** (p. 26). The **fermentation cabinet temperature is not stated** in the eight pages; the mixed dough temperature is not printed ("Doughs mixed to optimum come from the mixer at about the same temperature for given ambient conditions", p. 26). 30 C also appears in the malt-activity caption of Fig. 7 (120 SKB/g, 30 C), which is an enzyme assay unit, not a fermentation temperature.       |
| Endpoint                   | Optimum bread (loaf volume, crumb grain), with proof "to 7.8 cm" height for controls of about 12.5 % protein, plus 4 mm for higher-protein flours (p. 25).                                                                                                                                                                                                                                                                                                                                     |
| Replication                | Not reported: the paper gives one value per condition.                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Read status for Flourprint | Full text read, all eight pages (20-27), text, tables and figures, by the research agent on 2026-11-11, from the scanned publisher PDF fetched by the coordinator and read as page images (no text layer). Fig. 7 and Fig. 9 enlarged and read point by point.                                                                                                                                                                                                                                 |
| `source_verified`          | true for every row (each value checked against the printed paper, with page and table or figure).                                                                                                                                                                                                                                                                                                                                                                                              |

## How it cites the 1976 experiment

- "P. L. Finney et al (1976) materially reduced production costs by making optimum bread with a
  fermentation time of only 70 min, instead of 180 min, by increasing the yeast level from 2.0 to
  7.2% in a straight-dough formula containing sugar (Fig. 7)" (p. 23).
- "Optimal proof times (Fig. 9) for 180-, 120-, 70-, and 45-min fermentation times were 55, 36.5,
  21.5, and 12 min, respectively, when the corresponding yeast concentrations in Fig. 7 and bromate
  requirements in Fig. 8 were employed" (p. 23).
- "Data for different fermentation times are comparable, providing yeast concentration, oxidation
  level, and proof time are appropriate (Finney et al 1976, Magoffin et al 1977)" (p. 27).
- Applications of 70-, 90- and 120-min fermentations are credited to Magoffin et al (1977), Bruinsma
  and Finney (1981) and Finney et al (1982) (p. 27).

Fig. 7 (yeast concentration against fermentation time, with the four points 2.0 / 180, 3.5 / 120,
7.2 / 70 and about 12 / 45) and the Fig. 9 proof times (55, 36.5, 21.5, 12 min) are the same pairs as
`finney-1976.csv`. They are the 1976 experiment restated, not new data.

## Table V (p. 26): prescribed schedule

"Time intervals (during breadmaking) between mixing, first punching, second punching, and panning for
various fermentation times and the corresponding yeast concentrations." Minutes.

| Fermentation (min) | Yeast (%) | First punch | Second punch | Panning |
| ------------------ | --------- | ----------- | ------------ | ------- |
| 180                | 2.0       | 105         | 50           | 25      |
| 150                | 2.5       | 87          | 42           | 21      |
| 120                | 3.5       | 69          | 34           | 17      |
| 90                 | 5.3       | 52          | 25           | 13      |
| 70                 | 7.2       | 40          | 20           | 10      |
| 60                 | 8.6       | 35          | 17           | 8       |

Footnote: "Times to first and second punchings and panning of straight doughs are about 58, 28, and 14%
of each fermentation time, respectively." The three intervals sum to the fermentation time in each
row. **Table V has no proof column.**

## Proof times printed in the paper

| Fermentation (min) | Yeast (%)         | Proof (min), 1984 text, p. 25 | Optimum proof (min), 1976 and Fig. 9 (p. 23) |
| ------------------ | ----------------- | ----------------------------- | -------------------------------------------- |
| 180                | 2.0               | not stated                    | 55                                           |
| 150                | 2.5               | not stated                    | not stated                                   |
| 120                | 3.5               | 47 +/- 1 at 30 C              | 36.5                                         |
| 90                 | 5.3               | 32 +/- 1                      | not stated                                   |
| 70                 | 7.2               | not stated                    | 21.5                                         |
| 60                 | 8.6               | not stated                    | not stated                                   |
| 45                 | about 12 (Fig. 7) | not stated                    | 12                                           |

So the paper does **not** give a proof time for every row of the six-row schedule: only 120 and 90
min (p. 25). The 1984 recommended-method proof times (47, 32) differ from the Fig. 9 optimum proof
times at the same fermentation time (36.5 at 120 min). The paper says "Since employing short-time
doughs, proof heights that are about 4 mm higher than the values in Fig. 13 have been used" (p. 27),
and that the 47 and 32 min are "the time required to proof the controls containing about 12.5%
protein to 7.8 cm" (p. 25); the two sets are different protocols and are shown side by side, never
substituted for each other. The proof times attributed by an external review to a six-row table
(for example 27 min at 7.2 %) are **not printed** in this paper.

## Apparent dose exponents (DERIVED, ours)

Same estimator as for 1976: minus the slope of `ln t` on `ln dose`, ordinary least squares.

| Observable                                          | Points                | Exponent |
| --------------------------------------------------- | --------------------- | -------- |
| Table V prescribed fermentation schedule            | 6 (2.0 to 8.6 %)      | 0.739    |
| Table V, 2 to 7.2 %                                 | 5                     | 0.723    |
| Table V, two points 180 / 70 min                    | 2 (2.0, 7.2 %)        | 0.737    |
| Fig. 9 optimum proof time (the 1976 pairs restated) | 4 (2, 3.5, 7.2, 12 %) | 0.832    |
| 1984 recommended-method proof, 120 and 90 min       | 2 (3.5, 5.3 %)        | 0.926    |

The Table V exponent is a property of a **prescribed** schedule built from the 1976 pairs and
interpolated rows (2.5, 5.3, 8.6 %). It is not an independent measurement and not a confirmation of
the shipped 0.729: it shows the schedule follows the same curve as the 1976 optimum pairs, which it
cites. The two-point proof exponent (0.926) mixes two protocols' proof heights and carries no
uncertainty; do not use it as a dose response.

## What remains attributable only to AACC Method 10-10.03

This paper is a method paper, not the approved AACC text. It does not settle what the codified
method states (its own Table I, tolerances, the wording of procedure steps, and whether a proof
schedule per row is specified). The method text was **not read**; the six-row table of the AACC
document is **not verified and not transcribed**. Table V above is the **1984 paper's** table.
