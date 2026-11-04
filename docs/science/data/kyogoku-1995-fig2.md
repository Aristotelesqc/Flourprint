# Kyogoku and Ouchi 1995, Fig. 2: dough gas production from 0 to 40 °C

Data file: `kyogoku-1995-fig2.csv` (11 rows: 10 temperatures, 20 °C read on both panels).

| Field                      | Value                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                     | Kyogoku Y., Ouchi K. (1995). Isolation of a Cold-Sensitive Fermentation Mutant of a Baker's Yeast Strain and Its Use in a Refrigerated Dough Process. _Applied and Environmental Microbiology_ 61(2):639-642.                                                                                           |
| Access                     | ASM journal site (journals.asm.org/journal/aem). DOI not printed in the PDF and not checked here.                                                                                                                                                                                                       |
| Provenance label           | MEASURED, read from a bar chart (Fig. 2). Only the parent strain KY5649 (commercial baker's yeast, Dia-Yeast YST) is transcribed; the cold-sensitive mutant CSF3 is not usable for ordinary yeast.                                                                                                      |
| Observable                 | Gas volume released by 35.4 g of dough containing 0.6 g of wet yeast (67 % moisture), measured for 2 h at each temperature with a Fermograph, reported per 1 g of yeast and normalised to 30 °C and 101.29 kPa. The gas is chiefly CO2 with water and ethanol vapour; its composition was not measured. |
| Formula                    | Flour 100, sucrose 15, NaCl 1.2, water 58, wet yeast 3 (parts by weight). Mixed 2 min, held 45 min at 30 °C and 80 % RH, then divided into 35.4 g pieces.                                                                                                                                               |
| Temperature meaning        | The set temperature of the measurement. The pieces come from a 45-min hold at 30 °C, so the first minutes of each 2-h window are warmer than the label; no dough temperature is reported.                                                                                                               |
| Replicates                 | Not stated.                                                                                                                                                                                                                                                                                             |
| Extraction                 | Bar tops measured in pixels on a 300 dpi render of page 641, by the coordinating agent (2026-11-04). Left panel 0–120 mL at 8.3 px/mL, right panel 0–400 mL at 2.5 px/mL; `read_uncertainty_ml` is about one outline width. The 20 °C bar read on both panels agrees within 0.8 mL.                     |
| Read status for Flourprint | Full text read by the coordinating agent from the owner's PDF (2026-11-04).                                                                                                                                                                                                                             |
| `source_verified`          | true for every row (primary-source reading made for Flourprint). The values are read from a figure, not printed in the paper.                                                                                                                                                                           |

## Other numbers in the paper (text and Table 1)

- After 7 days at 0, 2.5 and 5 °C, the parent's gas production at 30 °C fell to 86, 74 and 10 % of
  unrefrigerated dough (243.0 mL/g yeast/2 h). The parent dough "expanded greatly" in storage: its
  volume after 3 days at 2.5 °C was several times that of the mutant's.
- Table 1, white bread dough (2 % yeast, 5 % sugar, 2 % salt) stored 7 days at 5 °C: gas at 30 °C
  343.8 before and 120.0 mL/g yeast/2 h after (ratio 0.349); bread specific volume 3.2 mL/g.

## What it does and does not show

- It is the first dough measurement in this directory below 15 °C. The parent's 5 °C gas is 3.2 %
  of its 20 °C gas (DERIVED, 3.5/110). The shipped Arrhenius law (`Ea` 98.3 kJ/mol) gives 11.4 %
  for the same pair, and 53 kJ/mol gives 31 %.
- The curve bends: local apparent `Ea` is above 100 kJ/mol below 20 °C and below 50 kJ/mol above
  30 °C (DERIVED, pairwise; noisy at the low end). `√rate` is roughly linear from 10 to 35 °C and
  extrapolates to zero near 1 °C (DERIVED).
- Limits: 3 % wet yeast and 15 % sugar (a sweet dough, outside the shipped domain); a 2-h window
  right after a warm hold, so the yeast had no time to adapt to the cold; released gas, not
  production (cold dough holds more dissolved CO2); one strain, one lab, no replicates stated.
  It can therefore overstate how much the cold slows a lean home dough over many hours, as well as
  understate it through the warm start. It does not, on its own, justify a contract change.
