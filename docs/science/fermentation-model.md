# Fermentation model: scientific basis

Status: working document, created 2026-10-10. It states the evidence behind the shipped model
(`flourprint.commercial-yeast` 0.1.0, `docs/contracts/fermentation.md`), the candidates studied for
a successor, and the limits of both. It does not change the contract. See [README.md](README.md)
for the provenance labels and the rules.

Sources of this document are the owner's scope comment and three comments on issue #33, cited by
role: the **Gemini report** (deep research, with transcribed tables and fits M0 to M6), the **GPT
audit** of that report, and the **Codex synthesis** (verified Izzreen Table I, independent refits,
corrections). Where they disagree, the audit overrides the report and the synthesis overrides both.
Numbers marked "script" are produced by `scripts/fit_izzreen.py`; numbers marked "contract
equations" were computed from the equations of the contract.

## 1. Evidence hierarchy and provenance labels

Labels (defined in the README): MEASURED, DERIVED / FITTED, ASSUMED, EXTRAPOLATED, MODEL OUTPUT.
Each number below also has a read status.

| Rank | Kind of evidence                                                  | Typical label    | Use                                                 |
| ---- | ----------------------------------------------------------------- | ---------------- | --------------------------------------------------- |
| 1    | Primary dough data, full text read, raw table available           | MEASURED         | May calibrate a model inside its protocol           |
| 2    | Primary data read only through a secondary transcription          | MEASURED         | Informs; carries `source_verified=false`            |
| 3    | Abstract-only or liquid-culture studies                           | MEASURED         | Cross-check of direction or order of magnitude only |
| 4    | Our own or a reviewer's fit to rank 1 to 3                        | DERIVED / FITTED | A candidate, valid only in the fitted domain        |
| 5    | A model used outside its calibrated domain                        | EXTRAPOLATED     | Allowed with a visible reason; error is "unknown"   |
| 6    | Third-party model output (for example Craig's table)              | MODEL OUTPUT     | Shape prior; never evidence about dough             |
| 7    | Convenience values and engineering priors (for example `τ`, band) | ASSUMED          | Defaults, to be replaced by calibration             |

Read status values used here: **full text** (by whom), **abstract only**, **secondary**. No
Flourprint agent has read the Izzreen PDF directly (the session proxy blocks it): its table is
known through the Codex review reading the primary PDF, and the Gemini report agrees with it.

A fit is never an observation. The Gemini report mixed the three; the audit asked that they be
kept apart, and this document does so.

## 2. Shipped model 0.1.0

### Form and parameters

```text
dF/dt = (d / 1 %)^k / A × r(T(t))
r(T)  = exp( (Ea / R) × (1 / 294.25 K − 1 / T) )          r = 1 at 21.1 °C
```

| Parameter   | Value        | Label            | Origin                                                                                                                        |
| ----------- | ------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `A`         | 3.43 h       | DERIVED / FITTED | fitted by Flourprint (this project, not a third party) to Craig's table, 1 % fresh yeast at 21.1 °C                           |
| `k`         | 0.729        | DERIVED / FITTED | Same fit. Finney et al. 1976 (abstract only) gives 0.74, quoted by the contract                                               |
| `Ea`        | 98.3 kJ/mol  | DERIVED / FITTED | Same fit                                                                                                                      |
| bands       | see contract | ASSUMED          | `A` ×0.75 to ×1.25, `k` 0.6 to 0.9, `Ea` 50 to 100 kJ/mol. The band is the envelope of the corners, not a confidence interval |
| `τ`         | 0 to 3 h     | ASSUMED          | No source. The code's central value is 1.5 h                                                                                  |
| yeast forms | ÷0.33, ÷0.40 | ASSUMED          | Vendor ratios quoted in the contract (King Arthur, Red Star, Craig). Not re-checked here                                      |

The fit used Craig's pizzamaking.com "Baker's yeast quantity prediction model" table: 952 cells,
3.9 to 30 °C, 3 h or more; rms 5 %, maximum 32 %. Read status: **secondary**, through the
open-source transcription `tysonjf/weatherApp/src/engine/craigTable.ts`. The table is MODEL OUTPUT
of a hobbyist model, and its stated temperature function does not reproduce it (contract).

Independent check on the Calvel poolish table at 21 °C (secondary transcription): the same law fitted
there gives `A` = 3.845 and `k` = 0.705, within 12 % (DERIVED / FITTED, same session). This shows the
table's dose response is not peculiar to Craig's; it does not validate the temperature function.

### Why Arrhenius

Arrhenius was the one temperature form that fitted the Craig table closely (within ×1.13), where
Ratkowsky fitted it within ×1.65 only (contract). That is a statement about a model output, not
about dough. Against the primary dough data of Izzreen, a separable square-root form fits
as well as Arrhenius (training log RMSE 0.161958 against 0.169960; fitted `Tmin` −8.506 °C,
DERIVED / FITTED by the Codex review, not recomputed by our script; that `Tmin` is an empirical
parameter, not a biological cardinal temperature). The data therefore do not select Arrhenius, and
the contract already says the form is to be re-decided on primary dough data.

### Known failures

Against Izzreen Table I (contract equations; the shipped model predicts hours to `F = 1`):

| Incubator °C | Fresh % | Measured h | Model 0.1.0 h | Measured / model |
| ------------ | ------- | ---------- | ------------- | ---------------- |
| 8            | 2       | 20.250     | 13.455        | 1.50             |
| 8            | 4       | 8.750      | 8.118         | 1.08             |
| 8            | 6       | 4.833      | 6.041         | 0.80             |
| 16           | 2       | 7.500      | 4.204         | 1.78             |
| 16           | 4       | 4.000      | 2.536         | 1.58             |
| 16           | 6       | 3.000      | 1.887         | 1.59             |
| 32           | 2       | 2.000      | 0.493         | 4.06             |
| 32           | 4       | 1.667      | 0.297         | 5.61             |
| 32           | 6       | 1.167      | 0.221         | 5.28             |

- At 32 °C the model is about 4 to 5.6 times too fast; at 4 % and 32 °C, 5.6 times (0.297 h
  against 1.667 h). The 4 % cell lies above the shipped gate (3 %), and the endpoint, the matrix
  (wholemeal, tin) and the temperature coordinate (incubator) all differ from the model's. The
  figure shows that transfer to this dataset is not validated. It is not an in-domain defect of
  the shipped model, and being inside the gate is not proof of biological validity (Codex
  synthesis).
- Against the owner's 25 TOST recipes the model reads a median of about 180 to 200 % of its end
  point at the planned times, that is about 1.8 to 2 times too fast. The yeast percentages in those
  recipes were computed by the TOST app from planned times. The owner reports that TOST times were
  fairly accurate, with proofs sometimes longer, rarely shorter (ASSUMED: the owner's recollection,
  not a recorded observation). TOST's own law could not be recovered as a separable law: the best
  fit gives `k` about 0.6, `Ea` about 110 kJ/mol and ±50 % scatter (DERIVED / FITTED, session fit on
  TOST output, which is itself MODEL OUTPUT of a planning app). These recipes are examples, not
  calibration data.
- The exponent `k` is not constant in the primary data (section 6): 1.294 at 8 °C, 0.842 at 16 °C,
  0.466 at 32 °C (script).

### What 0.1.0 does not model

- Yeast growth in a preferment before the mix (the final dose counts all yeast over all flour).
  Preferment use is flagged EXTRAPOLATED.
- Effects of ingredients on the rate. Sugar, salt, fat and water only gate the domain.
- The separation of gas production from gas retention, volume and height.
- Substrate depletion, acidification, enzymatic sugar release, dough rheology.
- The dependence of the dose exponent on temperature.

## 3. End-point semantics

Four end points circulate in the sources. They are different observables and must not be
converted into one another with a constant.

| End point                      | Source                                             | What it is                                                                           | Label                                                      |
| ------------------------------ | -------------------------------------------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| "About doubled once"           | Craig's table                                      | The unit of `F` in model 0.1.0. A hobbyist model's notion of a working end point     | MODEL OUTPUT                                               |
| Optimal height before collapse | Izzreen 2016                                       | Preliminary optimal dough height in a wholemeal tin protocol, incubator temperature  | MEASURED                                                   |
| Gas produced or retained       | Rheofermentometer, Risograph (Boudrag, Timmermans) | Cumulative CO2 `Vt`, retained CO2 `Vr`, maximum height `Hm`; fixed protocol at 30 °C | MEASURED                                                   |
| The baker's readiness decision | The owner's practice                               | "Ready to bake" after folds, degassing and shaping. Volume is not observable         | an observation recorded by the baker; MEASURED once logged |

Consequences:

- Izzreen's `A` = 8.995 h belongs to the pre-collapse end point and means nothing else.
- `A` = 3.43 h is Craig's unit. The Gemini report relabelled it as a "working bulk endpoint of
  about 1.75 to 2.0 times volume". No measured data establish that equivalence (GPT audit); it is
  rejected. Kinetic shape (dose and temperature response) and end-point mapping are kept separate.
- Gas produced, gas retained, relative volume, height, pre-collapse height and a readiness decision
  are separate quantities (Codex synthesis). A shaping step can reset the visible-volume baseline
  without resetting biochemical age.
- Boudrag's white-flour data show why: at 2 % NaCl the total CO2 `Vt` falls (1897 mL against 2175 mL
  at 0 %) while the retention ratio `R` rises (88.5 % against 84.7 %) and `Hm` is lower than at
  1 % NaCl. Production, retention and height move differently (section 8; values not independently
  verified).
- If a future model lets height rise and then fall, it must define which crossing is the target.
- Because the owner does stretch-and-folds, volume is not observable in their practice. Their
  readiness judgement is the practical end point, and the product must not present volume or a
  "doubled" target.

## 4. The "ready" target is a readiness profile, not a constant

`readyProgress` is not a constant of nature. Since contract 0.6.0 it lives in a **readiness
profile** that each recipe selects explicitly (fermentation.md):

- `flourprint.model-end-point` 1, the default: `F* = 1`, the model's own end point (Craig's "about
  doubled once"). Uncalibrated (ASSUMED as the reference).
- `flourprint.experimental-ready` 1, selectable: `F* = 2.0`, band 1.5 to 2.5. Basis: the owner's
  TOST schedules, used as examples, on which model 0.1.0 reads a median of about 180 to 200 % of
  `F = 1` at the planned times. That makes `F* = 2.0` consistent with them by construction. It is
  not independent validation (DERIVED from examples, ASSUMED as a prior). The band is a
  sensitivity range, not a measured prediction error.

Contract 0.4.0 applied 2.0 to every recipe; the follow-up audit of PR #31 showed this silently
turned an owner-specific prior into a product default (at 1 % fresh and 21.1 °C it doubles the
planned time and raises the inverse dose for 3.43 h from 1.00 % to 2.59 % fresh). Planned
schedules cannot separate readiness from kinetic rate, temperature history and end-point
definition.

Recalibration uses recorded `doughReady` observations with `stage: 'bake'` (bake journal) and
produces a new profile version (section 11). `stage: 'shape'` marks (end of bulk) are a different
end point and are not pooled with it. Changing a profile never changes a kinetic constant. The GPT
audit's warning applies: TOST schedules span bulk, degassing, shaping and proof, so they do not
identify a new kinetic `A`.

## 5. Izzreen 2016: the primary dough dataset

Nor Qhairul Izzreen M. N., Petersen M. A., Hansen Å. S., _Cereal Chemistry_ 93(2):209-216,
DOI 10.1094/CCHEM-09-14-0196-R. Table I, in minutes (MEASURED; transcribed by the Codex review from
the primary PDF; file `data/izzreen-2016-table1.csv`, metadata `data/izzreen-2016-table1.md`):

| Incubator °C | 2 % fresh yeast | 4 % fresh yeast | 6 % fresh yeast |
| ------------ | --------------- | --------------- | --------------- |
| 8            | 1215 min        | 525 min         | 290 min         |
| 16           | 450 min         | 240 min         | 180 min         |
| 32           | 120 min         | 100 min         | 70 min          |

Conditions: wholemeal wheat dough in a baking tin, fresh compressed yeast as % of flour, endpoint
"preliminary optimal height immediately before collapse". Formula details (water 64 %, sucrose 1.4 %,
NaCl 1.4 %, no fat, 400 g) come from the Gemini report only.

Meaning of the temperatures: **incubator (chamber) temperatures**, not measured dough temperatures.
Timing replication and error are not reported; the paper's 54 analytical runs are volatile
analyses, not 54 independently timed loaves. The consequence is mathematical, not a disclaimer: an
endpoint time at a chamber temperature mixes equilibration, substrate dynamics, gas retention and
the chosen end point. Setting an instantaneous rate to `1 / endpoint time`, then integrating it over
changing dough temperatures and adding a thermal lag, does not isolate yeast kinetics and may
double-count thermal effects (Codex synthesis).

### Model comparison

Fits of `ln(hours)` on the nine cells, `z = ln(fresh %)`, `x = 1000 × (1/T − 1/294.25)` (script;
the Codex synthesis gives the same numbers).

| Model                                 | Terms        | Training log RMSE | Max multiplicative error | Leave one cell out | Leave temperature out | Leave dose out | AICc relative to M1 |
| ------------------------------------- | ------------ | ----------------- | ------------------------ | ------------------ | --------------------- | -------------- | ------------------- |
| M1 separable Arrhenius                | 1, z, x      | 0.169960          | 1.335                    | 0.295914           | 0.329973              | 0.262258       | 0                   |
| M2 separable Q10                      | 1, z, T      | 0.175450          | 1.356                    | 0.302026           | 0.386181              | 0.265409       | +0.5722             |
| M5 reciprocal-temperature interaction | 1, z, x, z×x | 0.080418          | 1.135                    | 0.141634           | 0.276027              | 0.162001       | −1.4699             |
| M6 linear-temperature interaction     | 1, z, T, z×T | 0.092637          | 1.165                    | 0.162897           | 0.349525              | 0.169843       | +1.0762             |

(DERIVED / FITTED, Codex review and script.) AIC and AICc count the estimated residual variance:
`q` = coefficients + 1, `AIC = n ln(SSE/n) + 2q`, `AICc = AIC + 2q(q+1)/(n−q−1)`. M5 against M1:
ΔAIC −11.4699 but **ΔAICc −1.4699**; the small-sample correction softens the preference the
Gemini report claimed. Nested F of M5 against M1 is 17.3336 with 1 and 5 degrees of freedom (script),
p about 0.0088 (GPT audit and Gemini report), conditional on regression error assumptions. Nine
timing summaries without reported error do not establish biological significance.

Parameters:

| Fit | Values (reference 1 % fresh, 21.1 °C)                                                                                     | Label            |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| M1  | `A` = 10.1288 h, `k` = 0.867320, `Ea` = 52.770 kJ/mol                                                                     | DERIVED / FITTED |
| M5  | `A` = 8.994739 h, `k0` = 0.775302, `Ea0` = 83.336216 kJ/mol, interaction `kT` = 23.687279 kJ/mol, `Ea(d) = Ea0 − kT ln d` | DERIVED / FITTED |

The reference dose of 1 % lies below the measured 2 to 6 % grid. Re-centering at 4 % is useful;
replacing the intercept with Craig's 3.43 h is not.

Evidence of non-separability in the measurements themselves (script): the apparent dose exponent
`k` is 1.2940 at 8 °C, 0.8419 at 16 °C and 0.4661 at 32 °C; the apparent activation energy is
67.79, 48.15 and 42.38 kJ/mol at 2, 4 and 6 %.

### Status of M5

- **Research-only.** Not adopted, not in the contract, no effect on the shipped model.
- **Calibrated domain:** 2 to 6 % fresh yeast, 8 to 32 °C incubator, wholemeal wheat, pre-collapse
  end point. Inside it the result is experimental interpolation.
- **Everything outside is EXTRAPOLATED** with error "unknown". No low-dose or cold error band is
  stated: the Gemini report's ±30 % below 1 % and ±13.5 % inside the grid, and its practical domain
  of 0.05 to 6 % and 4 to 35 °C, are rejected as unsupported by the data. The training maximum error
  (1.135) is not a prediction interval.
- M5 improves every split evaluated, but all splits reuse one study, one flour and one end-point
  protocol. They are internal validation, not independent experiments.
- An illustration of why extrapolation is unsafe: M5 gives `Ea(0.5 %)` of about 99.8 kJ/mol, close to
  the 98.3 shipped, but no data at that dose exist to confirm it (EXTRAPOLATED; the coincidence is
  not evidence).
- Rejected: inserting M5 into the rate integration of the engine, arbitrary clamps on `k` or `Ea`,
  and treating the pre-collapse `A` as a bulk target.

## 6. Sugar: Timmermans 2022

Timmermans E. et al., _Foods_ 11(10):1388, DOI 10.3390/foods11101388. Read status: methods and
results checked by the Codex review; numerical tables not re-read by us; title as given by the
Gemini report. File `data/timmermans-2022-sucrose.csv`, `source_verified=false`.

Raw 3-hour cumulative CO2 (MEASURED, as transcribed): unlaminated dough without margarine, 30 °C,
1.5 % NaCl, yeast labelled about 8 % on dry flour, gas measured with the Risograph over 180 min, mL
per 10 g flour of dough.

| Sucrose, paper label (% dry flour) | Sucrose, recipe masses (% as-is flour) | 3-h CO2, mL (±SD) | Ratio to 0 % sucrose |
| ---------------------------------- | -------------------------------------- | ----------------- | -------------------- |
| 0                                  | 0                                      | 107.9 ± 1.0       | 1                    |
| 7                                  | 6                                      | 203.7 ± 2.9       | 1.888                |
| 14                                 | 12                                     | 157.7 ± 0.4       | 1.462                |
| 21                                 | 18                                     | 94.3 ± 4.8        | 0.874                |

The recipe-mass column and "7 % fresh yeast as-is" are the Codex review's reading of the original
recipes (DERIVED). The ratios are our division. Robust result: in this experiment 3-h gas is ordered
7 % > 14 % > 0 % > 21 %, consistent with a substrate benefit at low sugar and an osmotic penalty at
high sugar. The paper also gives time courses (not transcribed here) and shows that endogenous
sugars deplete, so early and late fermentation do not see sugar alike. A static multiplier is
therefore a poor model; the time courses should be obtained, with extraction uncertainty recorded.

Candidate fit (DERIVED / FITTED by the Gemini report, audited):
`r(S) = (1 + α S/(Ks + S)) exp(−(S/Sosm)^p)`, with `Ks` = 2 % **fixed**, `α` = 1.4083,
`Sosm` = 21.412, `p` = 2.022. With the normalisation `r(0)` = 1, the three non-zero sucrose levels
constrain the three remaining parameters, so the fit is **saturated with zero residual degrees of
freedom**. Freeing `Ks` would make four parameters underidentified by three ratios. Shared baseline
noise also correlates the ratios.

The derived "optimum 5.60 %" and "crossover 19.44 %" come from this saturated fit. They are
model-derived, not measured thresholds, not universal, and tied to this flour, yeast, 30 °C and 3 h
protocol. The basis (dry-flour label or as-is) of the fitted `S` is not stated by the Codex review and
is unverified.

Do not multiply the Izzreen endpoint surface by this ratio: observable, matrix and protocol differ.

## 7. Other ingredient and process evidence (short)

No universal multipliers follow from any of the entries below.

**Fats.** Timmermans found no significant effect of in-dough or roll-in margarine on sugar release,
sugar consumption or CO2 in the pastry experiment (Gemini report; Codex notes the gas experiment had
no margarine). That is "no effect detected in that protocol", not a neutral factor of 1.0 (GPT
audit, Codex synthesis). Gao 2025 (100 g flour doughs with 0 or 3 % lipid; texture, DSC, FTIR; the audit says
it involves frozen-dough and lipid treatments and the report's title is inexact) measures dough
mechanics, not yeast kinetics. For now fat is a composition and rheology input, with no kinetic
modifier.

**Eggs.** No primary study of the yeast rate across egg fractions was found (Gemini report, audit
agrees). Treat egg through its water, fat, protein and emulsifier content and thermal coagulation.
No egg factor.

**Milk and lactose.** Standard baker's yeast does not ferment lactose, so lactose stays in the dough
as a reducing sugar and is relevant to browning, not to the rate (Gemini report, audit agrees; the
yeast biochemistry is general knowledge, not a cited measurement). No multiplier.

**Acids and vinegar.** Timmermans measured pH 5.75 falling to 5.23 over 75 min, with about 0.15 to
0.16 % succinic and 0.04 to 0.05 % acetic acid (dry-matter basis, MEASURED as transcribed).
Preferment acids and vinegar have no kinetic evidence in the sources; no blanket vinegar factor is
justified (Codex synthesis).

**Diastatic malt, scald, enzymes.** Scalding rye flour at 95 °C raised maltose from 1.02 to 6.26 g
per 100 g (Klupsaite 2023, 6.1 times); at 15 % scald the loaf height/width ratio fell from 2.38 to 1.89 and crust lightness `L*` from 50.7 to 40.1 (Klupsaite 2023, as transcribed).
Liu 2023 (wheat and oat-bran wheat) measured dough stickiness 44.62 g control, 58.43 g with
α-amylase, 66.72 g with xylanase. These support a future starch to enzyme to reducing-sugar state,
not a static malt factor. Much of this evidence is **rye**; it must not be parameterised as a wheat
constant. Dataset tags to carry: wheat, wholemeal wheat, rye, oat-bran wheat, pastry, frozen dough.

**Gluten degradation.** Alpers 2020 reports total gluten vessel length 7217 µm at the start, 5298 µm
after a 2 h unyeasted rest (−26.6 %) and 4503 µm after 2 h of yeasted fermentation (−37.6 %), and a
rise in endpoint rate of 37.5 %. This supports a time-varying network state. The proposed split into
relaxation and gas-stretch damage is **not identified** by endpoint microstructure data.

**Baking transitions.** Measured: minimum complex modulus near 45.3 to 46.4 °C, starch gelatinisation
onset/peak/end near 58.1/65.0/71.2 °C, gas-cell pore opening at 71 to 81 °C after about 10.8 min. The
Arrhenius gelatinisation parameters (138 kJ/mol, 2.8×10^18 s⁻¹) belong to a published simulation
(Zhang 2025), PUBLISHED MODEL parameters rather than MEASURED constants. Unresolved: the Gemini
table attributes the gelatinisation temperatures to Alpers and Zhang, but they equal the control
dough of Gao 2025's DSC table. Nothing here is adopted.

**Flavour.** Izzreen's GC-MS data are peak areas (×10^6), for example 2-phenylethanol 6.2 to 17.0 at
8 °C and 3.3 to 17.0 at 32 °C between 2 and 6 % yeast. Peak area is not perceived intensity. A first
flavour layer should state relative chemical tendencies only, not sensory scores.

## 8. Salt: Boudrag 2026

Boudrag S., Arendt E. K., Zannini E., _Foods_ 15(13):2343 (exact title unverified; the audit says the
report's wording differs). Read status: primary metadata checked by the Codex review; **numerical
tables not independently accessed**. The table below is MEASURED as transcribed by the Gemini report
and flagged `source_verified=false` (file `data/boudrag-2026-salt.csv`). Rheofermentometer, 3 h, 30 °C,
300 g. The denominator of the NaCl percentage and the original formula are to be verified; the report
gives both "% recipe" and a "% flour" conversion.

| Matrix    | NaCl, % flour (% recipe) | `Vt` mL   | `Vr` mL   | `R` %      | `Hm` mm    |
| --------- | ------------------------ | --------- | --------- | ---------- | ---------- |
| White     | 0 (0)                    | 2175 ± 16 | 1843 ± 27 | 84.7 ± 1.0 | 53.6 ± 2.9 |
| White     | 0.5 (0.3)                | 2246 ± 22 | 1855 ± 10 | 82.6 ± 1.2 | 56.0 ± 3.9 |
| White     | 1.0 (0.6)                | 2246 ± 28 | 1863 ± 23 | 82.9 ± 0.3 | 64.1 ± 2.2 |
| White     | 2.0 (1.2)                | 1897 ± 67 | 1680 ± 50 | 88.5 ± 0.5 | 56.7 ± 3.9 |
| Wholemeal | 0 (0)                    | 2447 ± 69 | 1965 ± 43 | 80.3 ± 0.5 | 36.1 ± 0.3 |
| Wholemeal | 0.5 (0.3)                | 2520 ± 22 | 2011 ± 13 | 79.8 ± 0.3 | 35.1 ± 1.2 |
| Wholemeal | 1.0 (0.6)                | 2483 ± 22 | 1996 ± 23 | 80.4 ± 0.3 | 35.2 ± 1.3 |
| Wholemeal | 2.0 (1.2)                | 2392 ± 72 | 1962 ± 39 | 82.1 ± 0.9 | 31.3 ± 1.8 |
| Fibre     | 0 (0)                    | 1908 ± 34 | 1731 ± 27 | 90.8 ± 0.3 | 31.9 ± 1.4 |
| Fibre     | 0.5 (0.3)                | 1986 ± 53 | 1786 ± 40 | 89.9 ± 0.4 | 34.4 ± 1.2 |
| Fibre     | 1.0 (0.6)                | 1989 ± 49 | 1800 ± 39 | 90.5 ± 0.3 | 34.4 ± 2.3 |
| Fibre     | 2.0 (1.2)                | 1791 ± 29 | 1670 ± 23 | 93.3 ± 0.2 | 28.0 ± 1.9 |

Internal consistency (our check): `Vr / Vt` reproduces `R` within 0.1 point on all 12 rows, which
tests the transcription's coherence, not its fidelity to the paper.

What it supports: salt acts on gas production and on dough mechanics separately, and the response
depends on the flour matrix. White flour shows a plateau of `Vt` between 0 and 1 % and a fall at 2 %;
wholemeal `Vt` varies little; `Hm` is lowest at 2 % in wholemeal and fibre-fortified doughs (31.3 and 28.0 mm), while white flour peaks at 1 % (64.1 mm).

The Gemini piecewise fit `r = 1 + 0.033 C` for `C` ≤ 1 % and `r = 1.033 exp(−0.169 (C − 1))` above
(DERIVED / FITTED on white flour only) is a convenient interpolation through sparse points. It is
matrix-specific, and its upper limit of 3 % lies beyond the 2 % maximum measured (EXTRAPOLATED). It
is not a universal salt factor and must not be applied without flour-matrix qualification. The Gemini fits of Farinograph water absorption against salt are not imported.

## 9. Rye against wheat, and matrix caveats

Several sources study rye (Klupsaite 2023, Murniece 2024), pastry (Timmermans), oat-bran wheat (Liu),
frozen dough or lipid-treated dough (Gao), or whole-meal tin bread (Izzreen). Each result is tagged
by matrix in its data file. A result moves across matrices only as an EXTRAPOLATED, flagged value.

## 10. Corrected bibliography

Read status: F = full text read by the named reviewer, A = abstract only, S = secondary. "Unverified"
means this document could not confirm the item beyond the cited review comment. No item was read
directly by a Flourprint agent.

| #   | Reference                                                                                                                                                                                                                                                                                                                                                         | Status                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Nor Qhairul Izzreen M. N., Petersen M. A., Hansen Å. S. 2016. Volatile Compounds in Crumb of Whole-Meal Wheat Bread Fermented with Different Yeast Levels and Fermentation Temperatures. _Cereal Chemistry_ 93(2):209-216. DOI 10.1094/CCHEM-09-14-0196-R                                                                                                         | F by Codex review (PDF from the UMS eprints server). Title agrees with that URL                                                                                                                                                                                                       |
| 2   | Nor Qhairul Izzreen M. N., Hansen Å. S., Petersen M. A. 2016. Volatile compounds in whole meal bread crust: The effects of yeast level and fermentation temperature. _Food Chemistry_ 210:566-576. DOI 10.1016/j.foodchem.2016.04.110                                                                                                                             | Unverified (Gemini report only)                                                                                                                                                                                                                                                       |
| 3   | Timmermans E., Bautil A., Brijs K., Scheirlinck I., Van der Meulen R., Courtin C. M. 2022. Sugar Levels Determine Fermentation Dynamics during Yeast Pastry Making and Its Impact on Dough and Product Characteristics. _Foods_ 11(10):1388. DOI 10.3390/foods11101388                                                                                            | F (methods and results) by Codex review; title from Gemini report, unverified                                                                                                                                                                                                         |
| 4   | Boudrag S., Arendt E. K., Zannini E. 2026. _Foods_ 15(13):2343. DOI 10.3390/foods15132343. PubMed 42450461                                                                                                                                                                                                                                                        | Metadata checked by Codex review, tables not accessed. Exact title unverified (the report's wording differs from the published title, GPT audit)                                                                                                                                      |
| 5   | Liu W. et al. 2023. _Scientific Reports_ 13:4534. DOI 10.1038/s41598-023-31591-y. Title given by the GPT audit: "Influence of α-amylase, xylanase and cellulase on the rheological properties of bread dough enriched with oat bran"                                                                                                                              | Journal, volume, article and DOI checked against the publisher by Codex review; title unconfirmed. The Gemini report's `Foods 12(6):1247` (DOI 10.3390/foods12061247) is wrong, and its CSV's 10.3390/foods12061249 is a different wrong DOI. Values match the real table (GPT audit) |
| 6   | Alpers T., Becker T., Jekle M. 2023. Strain-dependent assessment of dough's polymer structure and functionality during the baking process. _PLOS ONE_ 18(3):e0282670. DOI 10.1371/journal.pone.0282670                                                                                                                                                            | DOI and title checked against the publisher by Codex review. The report's title "Destabilization of the gas phase of wheat dough during the early phase of baking" is wrong. Volume and issue as given by the report, unverified                                                      |
| 7   | Alpers T., Tauscher V., Steglich T., Becker T., Jekle M. 2020. _Polymers_ 13(1):30. DOI 10.3390/polym13010030                                                                                                                                                                                                                                                     | Title unresolved: the Gemini report lists two different titles for it. Unverified                                                                                                                                                                                                     |
| 8   | Aslankoohi E., Rezaei M. N., Vervoort Y., Courtin C. M., Verstrepen K. J. 2015. Glycerol Production by Fermenting Yeast Cells Is Essential for Optimal Bread Dough Fermentation. _PLoS ONE_ 10(3):e0119364. DOI 10.1371/journal.pone.0119364                                                                                                                      | Not audited. Unverified                                                                                                                                                                                                                                                               |
| 9   | Gao R. et al. 2025. _Foods_ 14(23):4032. DOI 10.3390/foods14234032                                                                                                                                                                                                                                                                                                | DOI and article exist; the report's title is inexact (GPT audit). Exact title unverified; frozen-dough and lipid treatments                                                                                                                                                           |
| 10  | Zhang L. et al. 2025. _Foods_ 14(9):1649. DOI 10.3390/foods14091649                                                                                                                                                                                                                                                                                               | DOI real, bread heat and mass transfer model; the report's title is inexact (GPT audit). Exact title unverified                                                                                                                                                                       |
| 11  | Vandenbosch S. et al. 2026. _Food Chemistry: X_ 104362. DOI 10.1016/j.fochx.2026.104362                                                                                                                                                                                                                                                                           | Not audited. Unverified                                                                                                                                                                                                                                                               |
| 12  | Klupsaite D. et al. 2023. _Foods_ 12(5):937. DOI 10.3390/foods12050937. Murniece R. et al. 2024. _Foods_ 13(13):2077. DOI 10.3390/foods13132077                                                                                                                                                                                                                   | Not audited, rye. Unverified                                                                                                                                                                                                                                                          |
| 13  | Birch A. N., Petersen M. A., Hansen Å. S. 2013. _LWT - Food Science and Technology_ 50(2):480-488. DOI 10.1016/j.lwt.2012.08.019. Romano A. et al. 2007, _J. Food Eng._ 83(2):142-148. Stanke M. et al. 2014, _J. Food Eng._ 142:40-47. Cruz A. L. B. et al. 2012, _Biotechnol. Bioeng._ 109(7):1735-1744. Rezaei M. N. et al. 2014, _Food Microbiol._ 40:104-110 | A (abstract only, per the Gemini report). Titles not repeated; unverified                                                                                                                                                                                                             |
| 14  | Walker C. E., Quail K. J., McMaster G. J. 1996. _Cereal Foods World_ 41(3):127-133                                                                                                                                                                                                                                                                                | S (secondary summaries only, per the Gemini report)                                                                                                                                                                                                                                   |
| 15  | Finney et al. 1976 (dose exponent 0.74)                                                                                                                                                                                                                                                                                                                           | A, as quoted by the contract. Full citation not in the inputs; unverified                                                                                                                                                                                                             |
| 16  | TXCraig1, "Baker's yeast quantity prediction model", pizzamaking.com; transcription `tysonjf/weatherApp/src/engine/craigTable.ts`. Calvel poolish table (transcription)                                                                                                                                                                                           | S, MODEL OUTPUT                                                                                                                                                                                                                                                                       |
| 17  | King Arthur Baking, _Dough Temperature_ (professional reference), cited by the contract for friction                                                                                                                                                                                                                                                              | S, as cited by the contract                                                                                                                                                                                                                                                           |

## 11. Personal calibration against the universal model

Two layers, kept apart.

- **Universal model:** kinetic law, constants, domains and conversions, derived from the literature
  and broader data, versioned in the contract with provenance here. Changed only by a contract pull
  request that cites evidence.
- **Personal profile:** a versioned object learned from the owner's recorded bakes, for example the
  `readyProgress` of section 4, mixer friction, refrigerator lag, dough-temperature offsets,
  flour- and product-specific residual bias, handling scales. It has its own version and provenance.

N = 1 data are useful for the profile (directional bias, model-version comparison, missing
variables). They are not population-level evidence and must never rewrite a universal constant.

## 12. Open questions and promotion gates

Missing evidence: low yeast dose (0.05 to 1 % fresh-equivalent) combined with cold dough (2 to 8 °C).
The Gemini report found no primary factorial dataset there; the published grids it knew test 2 % or
more at 5 to 8 °C or above. That regime is that of many home retarded doughs, and the shipped model
is calibrated there only through Craig's table (MODEL OUTPUT).

How dogfood observations can fill it: record actual masses, flour product, yeast form and dose,
timestamps, ambient or fridge temperature, post-mix dough temperature when feasible, a rise ratio in a
straight-sided graduated container for some calibration bakes, and the "Dough ready" observation.
Every bake in that regime is a data point for the personal profile, and a possible contribution to a
future universal fit if the conditions are recorded well enough to be treated as data.

Gates before a candidate (M5 or another) enters the shipped model:

1. The observable is defined in the contract first (which end point, which basis, which crossing).
2. Primary data for the target domain exist, including temperature histories of the dough, not only
   incubator or chamber values; or the candidate is shipped with an explicit EXTRAPOLATED status for
   what is not covered.
3. At least one validation set independent of the fit study (another flour, protocol or lab), with
   the error measured on it. Internal splits of one study do not count.
4. The fit is reproducible from a script in `scripts/` on data in `data/` with `source_verified=true`
   for the rows it uses.
5. A measured error band replaces the corner envelope, or the envelope is kept and said not to be a
   confidence interval. No band is invented.
6. Transfer from endpoint times at chamber temperature to a rate over changing dough temperature is
   justified or tested (otherwise it can double count thermal lag).
7. The inverse (dose from schedule) uses the same forward implementation and reports "not reached
   within the horizon" as unresolved, never as an invented duration.
8. A dedicated contract pull request, then code.

Other open items: obtain the Timmermans time courses; verify the Boudrag tables and percentage
denominators; confirm the bibliography titles marked unverified; check whether the Izzreen formula
details match the paper; measure the dough temperature during the owner's cold retards.

## 13. Changelog by model version

| Version         | Date              | Change                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.1.0 (model)   | 2026-10-09        | First commercial-yeast model (owner decision of that date): `A` 3.43 h, `k` 0.729, `Ea` 98.3 kJ/mol fitted on Craig's table. Provisional (ADR 0010). Unchanged since.                                                                                                                                                                                                                                                                                                |
| contract 0.3.0  | date not recorded | Yeast on ingredients, dough temperature and friction on steps, extrapolations on estimates. No change of model parameters.                                                                                                                                                                                                                                                                                                                                           |
| contract 0.4.0  | date not recorded | Personal calibration of the dough end point (`readyProgress` 2.0), percentage of planned fermentation, portable range bounds, accepted-suggestion provenance, `doughReady` observation. Kinetic model still 0.1.0.                                                                                                                                                                                                                                                   |
| contract 0.6.0  | 2026-10-10        | Readiness profiles: default `F* = 1` (model end point), the 2.0 prior made selectable (`flourprint.experimental-ready`); `doughReady` stage; bake origin. Kinetic model still 0.1.0.                                                                                                                                                                                                                                                                                 |
| science doc     | 2026-10-10        | This document: provenance of 0.1.0, Izzreen Table I and fits M1/M2/M5/M6 (M5 research-only), sugar and salt datasets flagged unverified, bibliography corrected, promotion gates. No model change.                                                                                                                                                                                                                                                                   |
| contract 0.10.0 | 2026-10-11        | Dough steps end at the first heat step (`bake` or `boil`); one dough step may follow the model (`durationMode: 'model'`), its time solved on the same forward model given the other planned durations. Once the dough is within 0.01 °C of its ambient, the rest of a segment is integrated in closed form (rate linearized around the ambient, error about 1e-6): same equations, fixtures unchanged, long cold retards 2–5× faster. No change of model parameters. |

Any future model version adds a row here with the evidence it rests on.
