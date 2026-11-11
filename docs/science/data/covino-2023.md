# Covino et al. 2023: Neapolitan pizza dough, 0.04 % fresh yeast, 22 °C, 48 h

Data files: `covino-2023.csv` (17 rows: the stated values and three conversions marked as derived) and `covino-2023-table1.csv` (Table 1, mechanical measurements, added 2026-11-11). The volume curve (Fig. 1A) is **not** digitised: its precision cannot be stated here.

| Field                      | Value                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source                     | Covino C., Sorrentino A., Di Pierro P., Masi P. (2023). Study of Physico-Chemical Properties of Dough and Wood Oven-Baked Pizza Base: The Effect of Leavening Time. _Foods_ 12(7):1407.                                                                                                                                                                                                                                                       |
| Access                     | DOI 10.3390/foods12071407; full text PMC10093465 (open access).                                                                                                                                                                                                                                                                                                                                                                               |
| Provenance label           | MEASURED for the formula and the conditions; the time statements are read from the paper's prose (no table of volumes); three conversions are DERIVED (our division).                                                                                                                                                                                                                                                                         |
| Formula                    | Flour "00" (Caputo rossa, label: 13 % protein, 12 % moisture), water, salt and fresh brewer's yeast (Lievital) in the proportions 60.35 / 37.72 / 1.88 / 0.04 % **of the dough** (Neapolitan Pizza TSG, Regulation (EU) 97/2010). Of flour: yeast 0.0663 %, salt 3.12 %, water 62.5 % (DERIVED).                                                                                                                                              |
| Protocol                   | Kneaded (mixing time and dough temperature not stated), rested 20 min at room temperature, divided into 250 g balls, leavened at **22 °C and 80 % relative humidity** for 0, 4, 8, 16, 24 and 48 h. A camera took a photograph every hour; height and width were measured in ImageJ and the volume taken as that of an **oblate semi-spheroid**, expressed as `V_t / V_0`. The balls stand free (no container). One curve is shown (Fig. 1A). |
| Temperature meaning        | The climate chamber setting (22 °C, 80 % RH). The dough temperature is not reported.                                                                                                                                                                                                                                                                                                                                                          |
| Replication                | Section 2.10: "All experiments and analytical measurements were performed in triplicates". The volume curve of Fig. 1A shows no spread; how many balls were photographed is not stated.                                                                                                                                                                                                                                                       |
| Read status for Flourprint | Full text read (Europe PMC full-text XML, sections 2.1 to 2.3, 3.1 and the conclusions) by the research agent (Claude) on 2026-11-10, after the coordinating agent's reading through PubMed Central. The figure itself (Fig. 1) and the supplement (video) were not viewed.                                                                                                                                                                   |
| `source_verified`          | true for the stated rows; the three derived rows are our arithmetic.                                                                                                                                                                                                                                                                                                                                                                          |

## What the paper says about the volume

Section 3.1: "a typical sigmoid kinetic curve" in three phases: a first phase with "a very slight positive slope", in which `V_t/V_0` "just reaches 1.3 after 8 h"; a growing phase "in which the volume increases in a logarithmic way until about the 30th h, by tripling its initial value"; then a stationary phase. The same section says that in the early stage the ball flattens under gravity and widens at its base "but the overall volume remained constant (Figure 1B, images at 4 and 8 h)". The abstract says "in 30 h the volume tripled". The conclusions say: "the volume of the dough doubled after 16 h and tripled in 24 h, reaching a constant value around 30 h, which did not vary up to 48 h". **The paper is inconsistent on when the volume triples** (about the 30th hour in section 3.1 and the abstract, 24 h in the conclusions); both statements are recorded, neither is chosen. The flattening of the ball and the loss of CO2 by 48 h are also described.

## What it does and does not show

- It is the only low-dose dough dataset in the ledger: 0.066 % fresh yeast of flour, 22 °C, a long run. See `fermentation-model.md`, section 5, for the comparison with the shipped law (`../scripts/shipped_law_vs_covino.mjs`).
- Limits: one curve; salt at 3.12 % of flour, above the shipped 1.5 to 3 % range; free-standing ball, not a container; volume from photographs with a geometric assumption, not gas; no dough temperature, no mixing time; the paper's "volume tripled" is not a baker's readiness decision; the paper says both that `V/V_0` reaches 1.3 at 8 h and that the overall volume "remained constant" in the images at 4 and 8 h, and does not reconcile the two.

## Table 1: mechanical behaviour after stress-relaxation (added 2026-11-11)

Read from the Europe PMC full-text XML (PMC10093465, table 1) by the research agent (Claude) on
2026-11-11, and compared with the sentences of section 3.2 that quote the same numbers. Values are
**mean ± SD, n = 8** per leavening time, as printed (MEASURED; the paper's Tukey letters are not
reproduced). Test conditions (section 2): the dough was compressed between two plates (Ø 30 cm) of a
dynamometer to a final thickness of 2 mm, in air at 23 ± 2 °C, then held for the relaxation stage;
`W` is the work done to deform the dough, `a` the asymptotic relaxation percentage, `b` the force decay
rate. `covino-2023-table1.csv` holds all four columns.

| Leavening time (h) | Compression work `W` (J) | Relaxation `a` (%) | Decay rate `b` (N s⁻¹) | Disc diameter (cm) |
| ------------------ | ------------------------ | ------------------ | ---------------------- | ------------------ |
| 0                  | 6.59 ± 0.41              | 82.5 ± 0.7         | 0.387 ± 0.014          | 21.50 ± 2.07       |
| 4                  | 29.96 ± 2.52             | 79.7 ± 0.3         | 0.409 ± 0.007          | 29.25 ± 0.53       |
| 8                  | 16.16 ± 0.69             | 78.9 ± 0.4         | 0.342 ± 0.008          | 26.06 ± 1.05       |
| 16                 | 19.72 ± 1.10             | 80.8 ± 0.3         | 0.359 ± 0.015          | 27.50 ± 0.46       |
| 24                 | 15.97 ± 1.43             | 80.9 ± 1.0         | 0.347 ± 0.010          | 28.37 ± 0.44       |
| 48                 | 7.65 ± 0.40              | 85.2 ± 0.3         | 0.283 ± 0.013          | 28.06 ± 0.42       |

What it shows and does not show:

- The trajectory of `W` is **not monotonic**: a peak at 4 h, a fall at 8 h, a rebound at 16 h, then a
  fall to a value near the 0 h one at 48 h. The authors read the 4 h peak as the relaxation of mixing
  stresses and a strong gluten network, the 16 h rebound as CO2 resisting compression, and the later
  decline as a weaker, reorganised gluten network and bubble wall (interpretation of the authors, not
  tested here).
- Mechanical behaviour therefore evolves on a different clock from the photographed volume
  (`V/V₀` 1.3 at 8 h, doubling at 16 h, tripling at 24 to 30 h). It identifies **no** overproof,
  collapse or readiness threshold, and the test is a plate compression at 23 °C of a sample taken from
  a free-standing ball, not a baker's judgement.
- The same table is a different object from the volume curve: the sample count (n = 8) belongs to the
  mechanical test; the paper's statement that experiments were done in triplicate (section 2.10) is not
  reconciled with n = 8 here.
