# Fermentation model: scientific basis

Status: working document, created 2026-10-10. It states the evidence behind the shipped model
(`flourprint.commercial-yeast` 0.1.0, `docs/contracts/fermentation.md`), the candidates studied for
a successor, and the limits of both. It does not change the contract. See [README.md](README.md)
for the provenance labels and the rules.

For the state of each domain in the code, the screens, the pull requests and the project's decisions, see
[dough-behavior.md](dough-behavior.md).

Sources of this document are the owner's scope comment and three comments on issue #33, cited by
role: the **Gemini report** (deep research, with transcribed tables and fits M0 to M6), the **GPT
audit** of that report, and the **Codex synthesis** (verified Izzreen Table I, independent refits,
corrections). Where they disagree, the audit overrides the report and the synthesis overrides both.
Numbers marked "script" are produced by `scripts/fit_izzreen.py`; numbers marked "contract
equations" were computed from the equations of the contract.

## Goal and acceptance criterion (owner decision, 2026-10-26)

The goal is a forecast **at least as good as an expert baker's**, not an exact simulation of the
physics and biology of dough. An expert does not solve the chemistry of sugar or gluten; they
recognise familiar situations, compare them and adjust. A model can learn the same regularities.

- **The criterion is predictive.** A model or sub-model is judged by its error on formulations and
  processes it has not seen: durations and doses against published schedules and recorded bakes,
  with whole sources held out, never variants of one recipe split between fit and test. "Is there a
  published equation for each effect?" is not the question.
- **Two measures, reported separately, never pooled.**
  - **Agreement with published practice**: does Flourprint propose durations comparable to an
    independent set of credible recipes? This measures conformity to what bakers do.
  - **Accuracy on observed bakes**: does the dough actually reach the intended stage (a recorded
    `doughReady`, a poke test, a measured rise) when the forecast says? This measures the truth
    of the forecast and is the stronger test.

  A model can match published practice and still miss observed bakes, or the reverse: each
  candidate reports both, and the second outranks the first when they disagree.

- **Three kinds of knowledge, complementary.**
  - **Collective practice**: the published recipe corpus. It encodes the judgement of its authors
    (dose for a formulation, time at a temperature, when to retard), and is the natural source for
    interactions whose mechanism is unknown or unquantified, such as enriched dough.
  - **Science**: constraints and generalisation where the corpus is silent. The thermal model
    (section 14) is the example: a recipe says "fridge, 24 h", never the bowl or the mass.
  - **Individual experience**: the baker's own bakes, which calibrate the personal profile
    (section 11).
- **Limits of the corpus.** A published schedule is a **recommended protocol**, not a measured
  fermentation: temperatures are often "room", ends are "until doubled", conventions are copied.
  It teaches what bakers do, not what the dough did, and its variables are confounded (enriched
  doughs also tend to carry more yeast and warmer proofs). Recorded Flourprint bakes are the
  stronger data.
- **What enters the model.** A mechanistic sub-model enters when it predicts better on held-out
  cases, or when it covers a situation the corpus cannot (the container, the mass). An empirical
  correction learned from comparable recipes is admissible on the same terms as a fitted
  equation: versioned, with its data, its domain and its measured error. Neither enters without
  that measurement.
- **The baseline.** The current model is measured first against the page-read schedules collected
  on #34; that error is the reference every candidate must beat. The kinetic law of section 2 is
  already empirical (fitted, not derived) and the readiness profile of section 4 already comes
  from schedules: the orientation extends what is there.

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

| Parameter   | Value        | Label            | Origin                                                                                                                                                                                                |
| ----------- | ------------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A`         | 3.43 h       | DERIVED / FITTED | fitted by Flourprint (this project, not a third party) to Craig's table, 1 % fresh yeast at 21.1 °C                                                                                                   |
| `k`         | 0.729        | DERIVED / FITTED | Same fit. Finney et al. 1976 (primary, read in full 2026-11-10) gives 0.68 to 0.83 by observable, in an enriched dough at 2–12 %: same order of magnitude, not a validation at home doses (section 5) |
| `Ea`        | 98.3 kJ/mol  | DERIVED / FITTED | Same fit                                                                                                                                                                                              |
| bands       | see contract | ASSUMED          | `A` ×0.75 to ×1.25, `k` 0.6 to 0.9, `Ea` 50 to 100 kJ/mol. The band is the envelope of the corners, not a confidence interval                                                                         |
| `τ`         | 0 to 3 h     | ASSUMED          | No source. The code's central value is 1.5 h                                                                                                                                                          |
| yeast forms | ÷0.33, ÷0.40 | ASSUMED          | Vendor ratios quoted in the contract (King Arthur, Red Star, Craig). Not re-checked here                                                                                                              |

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
- The apparent exponent read off the primary data differs between chambers: 1.294 at 8 °C, 0.842 at
  16 °C, 0.466 at 32 °C (OLS over 2, 4 and 6 %, script). That is an apparent exponent of endpoint times
  at chamber temperatures. A constant-`k` law with a dough lag reproduces its direction, which is a
  plausible mechanism of thermal confounding; it does not show that the lag suffices to explain the
  experiments quantitatively (section 5, "The apparent dose exponent and the dough lag"), so the data
  do not establish that the dose exponent depends on temperature.

### The table above ignores dough lag (2026-10-25)

The table above compares times at constant chamber temperature. The engine itself applies a first-order
dough lag (`τ` 0 to 3 h, contract), and Izzreen reports chamber, not dough, temperatures. With a mix
temperature `T0` of 25 °C and `τ` = 1.5 h (both ASSUMED: Izzreen reports neither), a plain separable
Arrhenius with constant `k` fits Table I at log RMSE 0.101 and worst cell ×1.19, against 0.170 and
×1.34 with no lag (DERIVED / FITTED; Sonnet research run, reproduced independently by the
coordinating agent with a separate integrator):

| Fit on Izzreen Table I             | `A` (h) | `k`   | `Ea` (kJ/mol) | log RMSE | worst cell |
| ---------------------------------- | ------- | ----- | ------------- | -------- | ---------- |
| Arrhenius, `τ` = 0                 | 10.13   | 0.867 | 52.8          | 0.170    | ×1.34      |
| Arrhenius, `τ` = 1.5 h, `T0` 25 °C | 8.78    | 0.728 | 79.8          | 0.101    | ×1.19      |

- The fitted `k` under lag equals the shipped `k`. The temperature-dose interaction of M5 shrinks
  from −0.284 ± 0.044 to −0.163 ± 0.064. Part of the apparent non-separability is lag.
- `Ea` depends on the assumed lag: 61 kJ/mol at `τ` = 0.5 h to 108 kJ/mol at 3 h. A refit on
  chamber temperatures with no lag (`Ea` about 53) would therefore double count lag once the engine
  applies its own (gate 6). Counting `τ` as a fitted parameter, the lag fit no longer beats M1 on
  AICc: the evidence for lag is real but not decisive.
- With lag credited, 0.1.0's warm over-speed against Izzreen falls from ×4–5.6 to about ×2.1–2.7,
  most of it the end-point unit (pre-collapse `A` about 8.8 h against Craig's 3.43 h, section 3),
  not the temperature shape.

### Options examined and rejected (2026-10-25)

Two research runs (Claude Sonnet and Gemini, reports on issue #9) examined saturating temperature
forms and a progressive blend between the shipped model and a warm-compatible one:

- **Cardinal-temperature forms (CTMI, extended Ratkowsky).** They fit Izzreen worse (CTMI with
  literature cardinals: log RMSE about 0.44). They predict 900 h or more at 4 °C at 1 % with the
  literature `Tmin` of about 2.8 °C, which also sits above the contract's 1.7 °C floor. They slow
  down above the 32.3 °C optimum. `Topt` cannot be identified from three chamber temperatures, all
  at or below 32 °C. Saturation stays a domain gate (35 °C), not a fitted shape. Between 32.3 and
  35 °C a cardinal shape would change times by about 5 %.
- **Progressive blend.** A smooth log-time blend can stay monotone, but its midpoint and width have
  no data or provenance and add parameters to three temperatures. A single smooth form is preferred.
- No contract change followed. Gates 1, 3, 6 and 8 below remain unmet, and the decisive missing
  evidence is dough-temperature histories at low dose in the cold.

### What 0.1.0 does not model

- Yeast growth in a preferment before the mix (the final dose counts all yeast over all flour).
  Preferment use is flagged EXTRAPOLATED.
- Effects of ingredients on the rate. Sugar, salt, fat and water only gate the domain.
- The separation of gas production from gas retention, volume and height.
- Substrate depletion, acidification, enzymatic sugar release, dough rheology.
- A dependence of the dose exponent on temperature: not established (a dough lag reproduces the
  direction of the apparent trend in Izzreen but not its durations, and the Birch matrix disagrees at
  the warm end; section 5).
- A slow start at very low dose (Covino 2023, section 5): the shipped progress grows linearly in time
  at constant dose and temperature, and a constant-rate law cannot produce a slow start. The cause of
  the slow start is not identified (biomass multiplication, dissolved-CO2 saturation and the evolution
  of gas retention are unseparated hypotheses). Known limitation, open question (section 12).

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
- Boudrag's white-flour data show part of why: at 1.2 % salt (whole recipe) the total CO2 `Vt` falls
  (1897 mL against 2175 mL without salt) and `Hm` falls (53.6 mm against 63.7 mm), while the retention
  coefficient stays at 99.6 %. Across flours, `Hm` depends on the matrix and salt level far more than
  `Vt` does (section 8).
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

Apparent exponents in the measurements themselves (script): the apparent dose exponent is 1.2940 at
8 °C, 0.8419 at 16 °C and 0.4661 at 32 °C (OLS over 2, 4 and 6 %); the apparent activation energy is
67.79, 48.15 and 42.38 kJ/mol at 2, 4 and 6 %. Read them with the next subsections: the exponent is
that of chamber endpoint times, and the lag of the dough alone moves it in this direction.

Estimators, defined (DERIVED, from the nine times; `scripts/apparent_dose_exponent.mjs`):

| Chamber | Pairwise 2 to 4 %, `ln(t₂/t₄)/ln 2` | Pairwise 4 to 6 %, `ln(t₄/t₆)/ln 1.5` | OLS over 2, 4 and 6 %, minus the slope of `ln t` on `ln dose` |
| ------- | ----------------------------------- | ------------------------------------- | ------------------------------------------------------------- |
| 8 °C    | 1.211                               | 1.464                                 | 1.294                                                         |
| 16 °C   | 0.907                               | 0.710                                 | 0.842                                                         |
| 32 °C   | 0.263                               | 0.880                                 | 0.466                                                         |

Provenance of the matrix: the same 8, 16 and 32 °C by 2, 4 and 6 % design is the subject of two 2016
publications of the same group, _Cereal Chem._ 93:209-216 (crumb volatiles, the source of the data
file) and _Food Chem._ 210:566-576 (crust volatiles; abstract read 2026-11-10, article not read).
They are treated as **one timing matrix**, not two datasets, unless independent fermentation
preparations are shown.

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

### The apparent dose exponent and the dough lag (2026-11-10)

A reviewer on #231 asked whether the change of the exponent with temperature is biology or an
artefact of reading chamber times. For the separable law of section 2 with a constant `k`, the dough
at the chamber temperature after a first-order lag from a starting temperature `T0`, the endpoint
`t*` satisfies `G(t*) = A d^(−k)` with `G(t) = ∫ r(T_d(s)) ds`. The dough temperature does not depend
on the dose, so differentiating in `ln d` gives `r(T_d(t*)) · dt*/d ln d = −k G(t*)`, that is

```text
k_app = −d ln t* / d ln d = k × mean( r(T_d) over [0, t*] ) / r( T_d(t*) )
```

(ANALYTICAL, exact and local.) A dough that warms toward the chamber ends faster than its mean rate
(ratio below 1) and reads a lower exponent; one that cools reads a higher one, with no change of `k`.

Simulation (`scripts/apparent_dose_exponent.mjs`). `T0` and `τ` are **ASSUMED**: Izzreen reports
neither. The script prints a sensitivity grid, `T0` 24, 26, 28, 30 °C by `τ` 0.5, 1.0, 2.0 h (12
scenarios), with for each the apparent OLS exponents at 8, 16, 32 °C **and** the predicted durations
next to the nine measured times, for two sets of constants, stated each time:

- (a) the **shipped law** at `F*` = 1: `A` 3.43 h, `k` 0.729, `Ea` 98.3 kJ/mol (fitted to Craig's
  table, not to Izzreen);
- (b) the **lag fit** of the table above: `A` 8.78 h, `k` 0.728, `Ea` 79.8 kJ/mol, fitted to these same
  nine cells.

| Result over the 12 scenarios (DERIVED) | Measured | (a) shipped law, `F*` = 1 | (b) lag fit        |
| -------------------------------------- | -------- | ------------------------- | ------------------ |
| OLS exponent at 8 °C                   | 1.294    | 1.00 to 2.02              | 0.81 to 1.70       |
| OLS exponent at 16 °C                  | 0.842    | 0.91 to 1.37              | 0.80 to 1.17       |
| OLS exponent at 32 °C                  | 0.466    | 0.56 to 0.71              | 0.58 to 0.70       |
| 2 % at 8 °C                            | 20 h 15  | 1 h 14 to 11 h 04         | 12 h 46 to 22 h 35 |
| 2 % at 32 °C                           | 2 h      | 34 to 65 min              | 105 to 156 min     |

With the base scenario `T0` 25 °C, `τ` 1.5 h and the lag fit, the simulated OLS exponents are 1.107,
0.980, 0.600 at 8, 16, 32 °C (identity at 4 %: 1.155, 1.004, 0.602, equal to a numerical derivative to
three decimals).

**Conclusion.** The simulation shows a **plausible mechanism of thermal confounding**: a dough that
starts warmer than a cold chamber, or colder than a warm one, reads a different exponent from a constant `k`,
in the direction of the measured trend (about 1 or more at 8 °C, at most about 0.71 at 32 °C in the
shipped-law scenarios). It does **not** show that thermal inertia suffices to explain the experiments
quantitatively. At `F*` = 1 the shipped law gives absolute durations systematically too short (for 2 %
at 8 °C, 1 h 14 min to 11 h 04 min against 20 h 15 min observed); that gap also reflects the
difference between the `F` = 1 criterion and Izzreen's pre-collapse peak (section 3). The lag fit
matches durations (12 h 46 min to 22 h 35 min at 2 %, 8 °C) because it was fitted to them. The data
therefore do not establish that the dose exponent depends on temperature, and they do not exclude it.
The dependence of the dose exponent on temperature is an open question, not a finding.

### Birch, Petersen and Hansen 2013: the second Copenhagen matrix (2026-11-10)

Read in full through the PhD thesis that reproduces it (data file `data/birch-2013-table.md`: protocol,
page references, replication). Paper II, _LWT_ 50:480-488, Table 1: time to **8 cm in total height**,
white wheat flour, 300 g flour, 190 mL water at 30 °C, 4 g sucrose, 4 g NaCl, pressed yeast
(Malteserkors), **19 min in a baking machine**, two 235 g portions per mix in 1 L beakers sealed with
foil, incubator at 5, 15 or 35 °C. One time per cell, from preliminary tests with a web camera, no
spread printed. MEASURED; the exponents are DERIVED (same estimators as above).

| Study and chamber | 2 %     | 4 %    | 6 %    | Pairwise 2→4 % | Pairwise 4→6 % | OLS   |
| ----------------- | ------- | ------ | ------ | -------------- | -------------- | ----- |
| Birch, 5 °C       | 21 h    | 3 h 30 | 3 h    | 2.585          | 0.380          | 1.859 |
| Birch, 15 °C      | 3 h     | 1 h    | 35 min | 1.585          | 1.329          | 1.501 |
| Birch, 35 °C      | 50 min  | 25 min | 15 min | 1.000          | 1.260          | 1.086 |
| Izzreen, 8 °C     | 20 h 15 | 8 h 45 | 4 h 50 | 1.211          | 1.464          | 1.294 |
| Izzreen, 16 °C    | 7 h 30  | 4 h    | 3 h    | 0.907          | 0.710          | 0.842 |
| Izzreen, 32 °C    | 2 h     | 1 h 40 | 1 h 10 | 0.263          | 0.880          | 0.466 |

The two matrices differ in flour (white, wholemeal), vessel (1 L beaker, baking tin), end point (8 cm
in total height, the peak just before collapse), chamber temperatures and, for the dose, in being 20,
40, 60 g per kg of flour against 2, 4, 6 % (the same numbers).

- **The dough starts hot or cold, and that is not reported.** The dough leaves a 19-min machine mix made
  with 30 °C water; its temperature is **not reported** (nothing is assumed here for it), and it then
  cools or warms in the incubator. The 5 °C row (21 h, 3.5 h, 3 h) is therefore not a cold-kinetics
  measurement of a dough at 5 °C: the first part of each run is spent cooling from the mix.
- **Same check as for Izzreen** (script; scenarios with `T0` 25 or 30 °C and `τ` 0.5 or 1.5 h, all
  ASSUMED, the lag-fit constants, `k` 0.728, which were fitted to Izzreen, not to Birch): at 35 °C a warming dough can only lower the exponent (simulated OLS
  0.56 to 0.65) while Birch reads 1.09 (pairwise 1.00 and 1.26): **lag does not reproduce Birch's warm
  exponent.** At 5 °C the scenarios give 0.82 to 1.50 against 1.86, and at 15 °C 0.82 to 1.26 against
  1.50; the 5 °C pattern of pairwise 2.59 then 0.38 (steep from 2 to 4 %, nearly flat from 4 to 6 %) is
  not reproduced by any scenario (pairwise 1.0 to 1.3 and 0.85 to 1.9).
- **The two Copenhagen matrices disagree on the warm exponent.** At about 35 °C Birch's exponents are
  1.0 and 1.26 (OLS 1.09); at 32 °C Izzreen's are 0.26 and 0.88 (OLS 0.47). Izzreen's low value is
  in the direction of the lag mechanism (0.58 to 0.71 simulated); Birch's high value is not. Neither matrix fixes the dose
  exponent of a dough at a controlled temperature.
- **Replication.** Paper I (_J. Cereal Sci._ 58:318-323; 84 conditions, 7 yeasts at 2.88, 5.76 and
  8.64·10¹¹ CFU/kg flour, 5/15/25/35 °C, height fitted by `h = b0 + b1(1 − e^(−kt))`) says its heights
  were monitored "as duplicates from the same dough that was divided in two samples of 235 g": portions
  of one mix, not independent mixes. Its rate constants are printed to one or two digits, with a mean
  coefficient of variation of 17.1 %; the rate constant is a height-fit parameter, not a CO2 constant.
  Paper II gives no spread for its times; its aroma samples are triplicates whose independence is not
  stated.
- **Product spread.** Thesis Table 5 (Paper III, _Food Res. Int._ 52:160-166): seven commercial
  pressed yeasts at the same 2.88·10¹¹ CFU/kg flour, 25 °C, to 10 cm, take 100 ± 7, 71 ± 5, 65 ± 3, 60 ± 8,
  46 ± 2, 40 ± 5 and 40 ± 6 min: **a factor 2.5 between products at equal cell count.** That is a
  measured source of uncertainty (which product, how fresh) that a personal calibration absorbs
  (section 11). The products need 20 to 40 g per kg of flour for those cells, so the spread a baker
  meets at equal mass is another number, not measured there.
- A printing discrepancy: Paper II and Paper III print cell counts a factor 1000 above Paper I and
  the thesis for the same product (10¹³ against 10¹⁰ cells per g); the mass doses are unaffected.
  Paper II also says, without data, that the yeast cell density was the same after mixing and at the
  end of the fermentation.

### Finney et al. 1976: an independent dose response, outside the lean domain (2026-11-10)

Read in full (data file `data/finney-1976.md`, all nine pages, from the publisher's scan).
**It is an experiment, not a prescribed schedule.** The authors established by baking the yeast
concentration and fermentation time that give optimum bread (loaf volume and loaf characteristics):
180 min at 2 %, 120 min at 3.5 %, 70 min at 7.2 %, 45 min at 12 % (text p. 128-130, Fig. 3), with
optimum proof times of 55, 36.5, 21.5 and 12 min (p. 132, Fig. 6). Gas production at 30 °C on 10 g of flour
(Fig. 5) is equal, about 350 units, at 188, 78 and 53 min for 2, 7.2 and 12 % (p. 130), and the total
fermentation times (with proof and 16 min) are 251, 107.5 and 73 min (Fig. 7, p. 133). Formula: 100 g flour,
6 g sucrose, 1.5 g NaCl, 3 g shortening, 4 g nonfat milk solids, 0.75 g malted wheat flour.

Apparent dose exponents (DERIVED: minus the OLS slope of `ln t` on `ln dose`; `scripts/finney_exponents.mjs`):

| Observable                       | Points                | Exponent |
| -------------------------------- | --------------------- | -------- |
| Optimum bulk time                | 4 (2, 3.5, 7.2, 12 %) | 0.770    |
| Optimum bulk time, 2 to 7.2 %    | 3                     | 0.738    |
| Optimum proof time               | 4                     | 0.832    |
| Time to equal gas                | 3 (2, 7.2, 12 %)      | 0.703    |
| Time to equal total fermentation | 3 (2, 7.2, 12 %)      | 0.684    |

The contract's 0.74 is the two-point value 180/70 min against 2/7.2 % (0.737).

- **The claim that Finney is a prescribed multi-punch schedule, not an observation, does not hold for
  the 1976 paper.** For traceability, the often-quoted six-row schedule (2.0 to 8.6 %) comes from the
  later codification by K. F. Finney (1984, _Cereal Chem._ 61:20-27) in AACC Method 10-10B / 10-10.03,
  **not read** here and not transcribed. Method 10-10.03 is a separate evidence object from the 1976
  paper (a later standardised baking method, not Finney's experiment). Its official listing
  (cerealsgrains.org, `10BakingQuality.aspx`) could not be read by this agent on 2026-11-11 (the site
  answered with a Cloudflare challenge, HTTP 403, and the host is outside the session's allowed network),
  so what the listing states is **not verified here**; an external review reports a six-row table
  (yeast 2 to 8.6 %, bulk 180 to 60 min, proof 60 to 24 min), **unverified and not transcribed into
  `data/`**, whose proof times must not replace the paper's optimum proof times; its proof times as quoted by the review
  differ from the paper's, so it is not a copy of these measurements.
- It is an independent measured dose response, with limits: loaf-quality optima, not a dough-ready or
  height end point; an enriched dough (6 % sucrose, 3 % shortening, milk); compressed or other yeast
  form not stated; 2 to 12 % of flour, so three of four doses (3.5, 7.2, 12 %) are above the shipped 3 %
  gate; 30 °C is stated for the gassing tests, and the temperature of the loaf fermentation is not stated
  in the paper. It supports the **order of magnitude** of the dose exponent, 0.68 to 0.83 by observable,
  not the shipped 0.729 at home doses.
- The 2 % gas curve starts slowly, with a convex early part (Fig. 5); recorded as an observation, no fit.

### Covino et al. 2023: the only low-dose dough dataset (2026-11-10)

Read in full (open access; data file `data/covino-2023.md`). Neapolitan pizza dough, 60.35 % flour,
37.72 % water, 1.88 % salt and 0.04 % fresh brewer's yeast **of the dough**, that is 0.0663 % of flour
(salt 3.12 %, water 62.5 % of flour, DERIVED), 250 g balls at 22 °C and 80 % RH, volume index `V/V₀` from
hourly photographs (oblate semi-spheroid). The text says `V/V₀` "just reaches 1.3 after 8 h", grows "until
about the 30th h, by tripling its initial value", then plateaus; the conclusions say the volume doubled
after 16 h, tripled in 24 h and was constant around 30 h. **The paper is inconsistent on when it
triples** (about 30 h, 24 h); both are recorded.

The shipped law (`A` 3.43 h, `k` 0.729, `Ea` 98.3 kJ/mol, isothermal 22 °C, no lag) gives `F` = 1 at
**21.94 h** (`scripts/shipped_law_vs_covino.mjs`), against doubling at 16 h and tripling at 24 to 30 h:

| Statement of the paper          | Hours | Model `F` = 1 time / hours (ratio, not an error) |
| ------------------------------- | ----- | ------------------------------------------------ |
| `V/V₀` 1.3                      | 8     | 2.74                                             |
| doubled                         | 16    | 1.37                                             |
| tripled (conclusions)           | 24    | 0.91                                             |
| tripled (section 3.1), constant | 30    | 0.73                                             |

This is an **order-of-magnitude plausibility check at a very low dose, not a predictive error.** `F` = 1
is not a physical volume (it is "about doubled once" in Craig's unit), and the paper defines no "ready
to bake" instant. It is not to be set beside the Izzreen gaps as an error of the same kind; the
direction also differs (the model time falls between the paper's doubling and tripling times, whereas
against Izzreen it is shorter than the observed times). Caveats: one curve, no spread; salt at 3.12 %
of flour is above the 3 % gate; a free-standing ball, not a container; volume from photographs with a
geometric assumption; no dough temperature or mixing time.

**The slow start, separated.**

- MEASURED (paper, one curve): a low initial volume growth, `V/V₀` 1.3 at 8 h; then an acceleration
  to about three times the initial volume around 24 to 30 h; then a plateau. The authors also report
  lateral spreading of the unmoulded ball: section 3.1, "in the early stage of leavening, a change in
  the shape of the dough ball was observed, which was more flattened by gravity and enlarged at the
  base, but the overall volume remained constant (Figure 1B, images at 4 and 8 h)". That sentence and
  the 1.3 at 8 h are not reconciled by the paper.
- NOT SEPARATED, explanatory hypotheses only: multiplication of the yeast biomass (no CFU was
  measured), dissolved-CO2 saturation dynamics before bubbles grow, and the evolution of gas retention.
  The curve does not show which, nor that yeast growth is the cause.
- Consequence: the shipped progress `F` grows linearly in time at constant dose and temperature, and
  the contract has no volume map, so a constant-rate law cannot produce a slow start. The cause is not
  identified. Recorded as a **known limitation and an open question** (section 12), with no model change.
  Paper II of Birch states, without data, an unchanged yeast cell density between mixing and the end of
  a run at 2 to 6 %.

**Mechanical behaviour runs on its own clock (2026-11-11).** Table 1 of the same paper reports compression
work `W` after a stress-relaxation test, mean ± SD, n = 8 (`data/covino-2023-table1.csv`): 6.59 ± 0.41 J
at 0 h, 29.96 ± 2.52 J at 4 h, 16.16 ± 0.69 J at 8 h, 19.72 ± 1.10 J at 16 h, 15.97 ± 1.43 J at 24 h and
7.65 ± 0.40 J at 48 h. The trajectory is not monotonic (8 to 16 h rebounds), peaks at 4 h, when the
photographed volume has barely changed, and is back near its initial level at 48 h, when the volume is on
its plateau. The mechanical state of the dough therefore does not follow the volume curve, which supports
keeping progress, volume and readiness as separate quantities (sections 3 and 4). It identifies no
overproof or collapse threshold and gives no readiness criterion; nothing in the shipped model, the
profiles or the contract follows from it.

## 6. Sugar: Timmermans 2022

Timmermans E. et al., _Foods_ 11(10):1388, DOI 10.3390/foods11101388. Read status: full text read
by the coordinating agent (2026-11-04); title confirmed. File `data/timmermans-2022-sucrose.csv`,
`source_verified=true`.

Raw 3-hour cumulative CO2 (MEASURED, printed in the paper): unlaminated dough without margarine,
30 °C, NaCl 2.0 % of as-is flour, yeast 7.0 % fresh on as-is flour (8.1 % on dry matter), gas
measured with the Risograph over 180 min, mL per dough made on a 10 g flour scale, triplicates.

| Sucrose, paper label (% dry flour) | Sucrose, recipe masses (% as-is flour) | 3-h CO2, mL (±SD) | Ratio to 0 % sucrose |
| ---------------------------------- | -------------------------------------- | ----------------- | -------------------- |
| 0                                  | 0                                      | 107.9 ± 1.0       | 1                    |
| 7                                  | 6                                      | 203.7 ± 2.9       | 1.888                |
| 14                                 | 12                                     | 157.7 ± 0.4       | 1.462                |
| 21                                 | 18                                     | 94.3 ± 4.8        | 0.874                |

The recipe-mass column and "7 % fresh yeast as-is" follow from the printed recipe masses (500 g
flour, 35 g yeast, 0/30/60/90 g sucrose), which confirms the Codex review's reading. The ratios are our division. Robust result: in this experiment 3-h gas is ordered
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

Boudrag S., Arendt E. K., Zannini E. 2026, _Foods_ 15(13):2343. Read status: full text, Table 5 extracted
by script (file `data/boudrag-2026-salt.csv`, `source_verified=true`). MEASURED. Rheofermentometer, 300 g,
3 h, 30 °C, 2 % instant yeast, 2 % sugar and 3.2 % oil on flour basis. Salt is w/w of the whole recipe; its
flour-basis equivalents are in the data file.

| Matrix    | Salt, % recipe | `Vt` mL   | `Vr` mL   | `R` %      | `Hm` mm    |
| --------- | -------------- | --------- | --------- | ---------- | ---------- |
| White     | 0              | 2175 ± 41 | 2166 ± 41 | 99.6 ± 0.0 | 63.7 ± 0.3 |
| White     | 0.3            | 2246 ± 77 | 2235 ± 78 | 99.5 ± 0.1 | 64.1 ± 0.9 |
| White     | 0.6            | 2158 ± 20 | 2152 ± 20 | 99.7 ± 0.1 | 62.8 ± 1.1 |
| White     | 1.2            | 1897 ± 45 | 1890 ± 44 | 99.6 ± 0.2 | 53.6 ± 1.5 |
| Fibre     | 0              | 2190 ± 82 | 2184 ± 84 | 99.7 ± 0.0 | 37.1 ± 2.4 |
| Fibre     | 0.3            | 2290 ± 18 | 2285 ± 17 | 99.8 ± 0.1 | 50.0 ± 1.8 |
| Fibre     | 0.6            | 2133 ± 51 | 2128 ± 51 | 99.8 ± 0.1 | 52.3 ± 1.5 |
| Fibre     | 1.2            | 1922 ± 48 | 1915 ± 46 | 99.7 ± 0.2 | 44.3 ± 3.5 |
| Wholemeal | 0              | 2392 ± 74 | 2388 ± 75 | 99.8 ± 0.1 | 31.3 ± 1.3 |
| Wholemeal | 0.3            | 2520 ± 33 | 2517 ± 31 | 99.8 ± 0.1 | 35.2 ± 2.0 |
| Wholemeal | 0.6            | 2396 ± 22 | 2392 ± 22 | 99.8 ± 0.1 | 36.1 ± 1.0 |
| Wholemeal | 1.2            | 2188 ± 26 | 2185 ± 26 | 99.9 ± 0.1 | 34.8 ± 0.1 |

What it supports: in all three matrices `Vt` is highest at 0.3 % and lowest at 1.2 %, where it stands at
0.87 to 0.91 of the salt-free value (our division). Retention barely moves. `Hm` responds differently per
matrix: white flour holds until 0.6 % and falls at 1.2 %; fibre-fortified dough gains about 40 % from 0 to
0.6 %; wholemeal gains about 15 %. One flour of each kind, one yeast, one temperature, one 3 h endpoint:
this is gas produced at a fixed time, not a rate law.

An earlier version of this section used a transcription that did not match the paper: retention of 80 to
93 %, `Vt` 2246 at 0.6 % for white flour, and values attached to the wrong flours and salt levels. It read a
white-flour `Hm` peak at 1 % and "wholemeal `Vt` varies little", neither of which the table shows. The
piecewise Gemini salt factor (`r = 1 + 0.033 C`, then an exponential fall) rested on those values and is
withdrawn. No contract or engine code used them.

**Second dataset: Belz 2017** (`data/belz-2017-salt.csv`, full text read 2026-11-07, MEASURED).
Same instrument class at 30 °C with 2 % yeast on flour, but no sugar or oil, and water lowered as salt
rises. At 1.72 % and 2.87 % of flour total gas is 0.71 and 0.44 of the salt-free value, while retained
gas is 0.93 and 0.66 (our division); the salt-free dough loses 36 % of its gas, Boudrag's under 1 %.
The fall of total gas is about 2.2 to 2.4 times larger than Boudrag's at a similar level (0.29 at
1.72 % of flour against 0.13 and 0.12 for white and fibre-fortified flour at 1.9 and 2.0 %). The paper gives
its duration as 90 min in the methods and 3 h in the Table 2 caption. Candidate reasons for the gap:
duration, sugar and oil in Boudrag, gas release, flour. Two consequences: no transferable salt
multiplier follows, and salt's effect on the gas that drives rise can be much smaller than its effect
on production. The second Opus report on #33 proposes a wide per-baker prior of about 0.45 to 0.9 on
production at 2 % of flour; it is a candidate (#231), not adopted.

## 9. Rye against wheat, and matrix caveats

Several sources study rye (Klupsaite 2023, Murniece 2024), pastry (Timmermans), oat-bran wheat (Liu),
frozen dough or lipid-treated dough (Gao), or whole-meal tin bread (Izzreen). Each result is tagged
by matrix in its data file. A result moves across matrices only as an EXTRAPOLATED, flagged value.

## 10. Corrected bibliography

The full source index, with legal access links, read status and use, is
[sources.md](sources.md). The table below keeps the arbitration record of the first reports.

Read status: F = full text read by the named reviewer, A = abstract only, S = secondary. "Unverified"
means this document could not confirm the item beyond the cited review comment. Items 3 and 4, and on
2026-11-10 items 13 (the Birch _LWT_ paper only), 15, 18 and 19, were read directly by a Flourprint agent.

| #   | Reference                                                                                                                                                                                                                                                                                                                                                         | Status                                                                                                                                                                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Nor Qhairul Izzreen M. N., Petersen M. A., Hansen Å. S. 2016. Volatile Compounds in Crumb of Whole-Meal Wheat Bread Fermented with Different Yeast Levels and Fermentation Temperatures. _Cereal Chemistry_ 93(2):209-216. DOI 10.1094/CCHEM-09-14-0196-R                                                                                                         | F by Codex review (PDF from the UMS eprints server). Title agrees with that URL                                                                                                                                                                                                       |
| 2   | Nor Qhairul Izzreen M. N., Hansen Å. S., Petersen M. A. 2016. Volatile compounds in whole meal bread crust: The effects of yeast level and fermentation temperature. _Food Chemistry_ 210:566-576. DOI 10.1016/j.foodchem.2016.04.110                                                                                                                             | Abstract read 2026-11-10 (same design as item 1; one timing matrix with it unless independent preparations are shown); article not read                                                                                                                                               |
| 3   | Timmermans E., Bautil A., Brijs K., Scheirlinck I., Van der Meulen R., Courtin C. M. 2022. Sugar Levels Determine Fermentation Dynamics during Yeast Pastry Making and Its Impact on Dough and Product Characteristics. _Foods_ 11(10):1388. DOI 10.3390/foods11101388                                                                                            | F, by the coordinating agent, 2026-11-04 (owner's PDF); title confirmed                                                                                                                                                                                                               |
| 4   | Boudrag S., Arendt E. K., Zannini E. 2026. Effect of NaCl Reduction on Dough Rheology and Bread Quality of Fibre-Enriched White Wheat Bread. _Foods_ 15(13):2343. DOI 10.3390/foods15132343. PubMed 42450461                                                                                                                                                      | F, by the coordinating agent, 2026-10-30 (Europe PMC XML): sections 2.1 to 2.4, Tables 1, 2, 5 and A1; title confirmed                                                                                                                                                                |
| 5   | Liu W. et al. 2023. _Scientific Reports_ 13:4534. DOI 10.1038/s41598-023-31591-y. Title given by the GPT audit: "Influence of α-amylase, xylanase and cellulase on the rheological properties of bread dough enriched with oat bran"                                                                                                                              | Journal, volume, article and DOI checked against the publisher by Codex review; title unconfirmed. The Gemini report's `Foods 12(6):1247` (DOI 10.3390/foods12061247) is wrong, and its CSV's 10.3390/foods12061249 is a different wrong DOI. Values match the real table (GPT audit) |
| 6   | Alpers T., Becker T., Jekle M. 2023. Strain-dependent assessment of dough's polymer structure and functionality during the baking process. _PLOS ONE_ 18(3):e0282670. DOI 10.1371/journal.pone.0282670                                                                                                                                                            | DOI and title checked against the publisher by Codex review. The report's title "Destabilization of the gas phase of wheat dough during the early phase of baking" is wrong. Volume and issue as given by the report, unverified                                                      |
| 7   | Alpers T., Tauscher V., Steglich T., Becker T., Jekle M. 2020. _Polymers_ 13(1):30. DOI 10.3390/polym13010030                                                                                                                                                                                                                                                     | Title unresolved: the Gemini report lists two different titles for it. Unverified                                                                                                                                                                                                     |
| 8   | Aslankoohi E., Rezaei M. N., Vervoort Y., Courtin C. M., Verstrepen K. J. 2015. Glycerol Production by Fermenting Yeast Cells Is Essential for Optimal Bread Dough Fermentation. _PLoS ONE_ 10(3):e0119364. DOI 10.1371/journal.pone.0119364                                                                                                                      | Not audited. Unverified                                                                                                                                                                                                                                                               |
| 9   | Gao R. et al. 2025. _Foods_ 14(23):4032. DOI 10.3390/foods14234032                                                                                                                                                                                                                                                                                                | DOI and article exist; the report's title is inexact (GPT audit). Exact title unverified; frozen-dough and lipid treatments                                                                                                                                                           |
| 10  | Zhang L. et al. 2025. _Foods_ 14(9):1649. DOI 10.3390/foods14091649                                                                                                                                                                                                                                                                                               | DOI real, bread heat and mass transfer model; the report's title is inexact (GPT audit). Exact title unverified                                                                                                                                                                       |
| 11  | Vandenbosch S. et al. 2026. _Food Chemistry: X_ 104362. DOI 10.1016/j.fochx.2026.104362                                                                                                                                                                                                                                                                           | Not audited. Unverified                                                                                                                                                                                                                                                               |
| 12  | Klupsaite D. et al. 2023. _Foods_ 12(5):937. DOI 10.3390/foods12050937. Murniece R. et al. 2024. _Foods_ 13(13):2077. DOI 10.3390/foods13132077                                                                                                                                                                                                                   | Not audited, rye. Unverified                                                                                                                                                                                                                                                          |
| 13  | Birch A. N., Petersen M. A., Hansen Å. S. 2013. _LWT - Food Science and Technology_ 50(2):480-488. DOI 10.1016/j.lwt.2012.08.019. Romano A. et al. 2007, _J. Food Eng._ 83(2):142-148. Stanke M. et al. 2014, _J. Food Eng._ 142:40-47. Cruz A. L. B. et al. 2012, _Biotechnol. Bioeng._ 109(7):1735-1744. Rezaei M. N. et al. 2014, _Food Microbiol._ 40:104-110 | Birch _LWT_: F, through the PhD thesis that reproduces it, 2026-11-10 (section 5). The others: A (abstract only, per the Gemini report), titles not repeated, unverified                                                                                                              |
| 14  | Walker C. E., Quail K. J., McMaster G. J. 1996. _Cereal Foods World_ 41(3):127-133                                                                                                                                                                                                                                                                                | S (secondary summaries only, per the Gemini report)                                                                                                                                                                                                                                   |
| 15  | Finney P. L., Magoffin C. D., Hoseney R. C., Finney K. F. 1976. Short-time baking systems. I. Interdependence of yeast concentration, fermentation time, proof time, and oxidation requirement. _Cereal Chemistry_ 53(1):126-134                                                                                                                                  | F, primary, by the research agent 2026-11-10 (nine pages): exponents 0.68 to 0.83 by observable (section 5)                                                                                                                                                                           |
| 16  | TXCraig1, "Baker's yeast quantity prediction model", pizzamaking.com; transcription `tysonjf/weatherApp/src/engine/craigTable.ts`. Calvel poolish table (transcription)                                                                                                                                                                                           | S, MODEL OUTPUT                                                                                                                                                                                                                                                                       |
| 17  | King Arthur Baking, _Dough Temperature_ (professional reference), cited by the contract for friction                                                                                                                                                                                                                                                              | S, as cited by the contract                                                                                                                                                                                                                                                           |
| 18  | Birch A. N., van den Berg F. W. J., Hansen Å. S. 2013. Expansion profiles of wheat doughs fermented by seven commercial baker's yeasts. _J. Cereal Sci._ 58:318-323. DOI 10.1016/j.jcs.2013.05.009                                                                                                                                                                | F, through the thesis, 2026-11-10; rate-constant cells not transcribed                                                                                                                                                                                                                |
| 19  | Covino C., Sorrentino A., Di Pierro P., Masi P. 2023. Study of Physico-Chemical Properties of Dough and Wood Oven-Baked Pizza Base: The Effect of Leavening Time. _Foods_ 12(7):1407. DOI 10.3390/foods12071407                                                                                                                                                   | F, open access, 2026-11-10; Fig. 1 not viewed                                                                                                                                                                                                                                         |
| 20  | Verheyen C. et al. 2015. _Food Res. Int._ 76:860-866. DOI 10.1016/j.foodres.2015.08.013. Gélinas P. 1997. _Food Microbiol._ 14:55-62. DOI 10.1006/fmic.1996.0063                                                                                                                                                                                                  | A (abstracts via Europe PMC, 2026-11-10); claims relayed by an external review, confirmed at abstract level only                                                                                                                                                                      |

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

**First dough evidence on the shape of the cold curve (2026-11-04).** Kyogoku and Ouchi 1995
(`data/kyogoku-1995-fig2.csv`) measured 2-h dough gas of an ordinary baker's yeast from 0 to 40 °C.
Its 5 °C gas is 3.0 % of its 20 °C gas, against 11.4 % for the shipped Arrhenius law and 31 % for
53 kJ/mol (DERIVED). The ratio at 4 °C to 24 °C is not measured; the second Opus report on #33
puts it at 0.2–3 % depending on the fit range, against 5.7 % for the shipped law. Between 10 and
30 °C a constant `Ea` near 85 kJ/mol fits as well as a square-root form; the cold bend rests on the
5 °C bar, which carries two opposite biases (warm start, CO2 dissolution) of about its own size.
The data point the same way as the warning about 53 kJ/mol in the #33 review (a warm-range slope
does not transfer to the fridge) and suggest the shipped law may run fast in the cold rather than
slow. It is not a gate-passing dataset: sweet dough (15 % sugar), 3 % wet yeast, one strain, no
replicates stated (see the data file). Its 7-day storage results also show substantial fermentation at 5 °C
over days. Candidate test once dough-temperature histories exist: compare Arrhenius, a
square-root form with `T_min` near 0–2 °C, and CTMI against this curve and Izzreen's 8 °C cells,
with dough lag credited (gate 6).

**Caution on the cold law (2026-11-10).** A Ratkowsky-type `T_min` is a fitted shape parameter, not a
zero-flux temperature: Kyogoku reports gas at 0 °C, so no hard cutoff below a `T_min` is supported by
the data. The 0.25.0 learning flags (`cold_stage_uncalibrated`, `cold_hold_over_72h`,
`dough_above_28c`) are communication flags, not physical thresholds.

**Open question: a slow start at very low dose (2026-11-10).** Covino 2023 (section 5) shows a
volume index of 1.3 after 8 h and about three times after 24 to 30 h at 0.066 % fresh yeast and 22 °C.
A constant-rate law cannot produce a slow start and the cause is not identified: biomass
multiplication, dissolved-CO2 saturation and the evolution of gas retention are unseparated
hypotheses. Test: viable counts (CFU) at intervals in a low-dose dough, with paired gas or height
readings and a measured dough temperature (home protocols: #260).

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
9. Its errors on the two measures of Goal and acceptance criterion (agreement with held-out
   published schedules; accuracy on observed bakes, once recorded bakes exist) are reported next to
   the shipped model's, separately, and are lower; or the candidate covers a situation the
   benchmark cannot test, and says so.

**Design notes from the external reports (2026-11-07; reasoning, not adopted).** The third Opus report
on #33 (round 3) keeps its candidate architecture and adds points that any future rise model must
respect:

- A progress state fitted to heights is a gas-equivalent convention, not a predicted volume of CO2:
  heights identify only a lumped rate, never the production scale and the expansion scale apart.
  Store it dimensionless.
- Early height readings identify only the initial slope `(R_max − 1)·k`; `k` and `R_max` separate
  only with readings near the plateau or an `R_max` prior. The height when the baker calls the dough
  ready gives the end point directly. Heights never separate production from retention; only an
  independent gas measurement does.
- When doughs, preferments or flour are combined, keep extensive quantities (flour mass, yeast mass,
  flour-weighted progress, heat content), add them, and derive intensive values afterwards, so that
  no operation creates or destroys progress. With a dose exponent other than 1, total activity then
  depends on flour mass, an artefact of the power law.
- Kyogoku's 7-day storage loss is a measured loss of activity whose cause was not measured. The
  report's comparison of added sucrose with extrapolated gas (about 21 %) is illustrative only and
  neither establishes nor excludes sugar exhaustion.

**Candidate hypotheses from the external review of 2026-11-10 (comments on #231; reasoning, not
adopted, nothing enters the contract).**

- **Height-ceiling penalty.** For a first-order height curve `h = b0 + b1(1 − e^(−kt))` the time to a
  fixed height is `t* = Δh*/(b1 k) · Φ(u)`, `Φ(u) = −ln(1 − u)/u`, `u = Δh*/b1`. If the ceiling `b1`
  falls with temperature toward `Δh*`, `t*` can rise with temperature while the initial rate still
  rises, which would give a time-to-height optimum without a change of metabolic rate (Birch Paper I
  reports the shortest times at 25 °C at its highest dose). Test: height trajectories recorded to the
  plateau at several temperatures, with an independent gas measurement (#260).
- **Constant gas-loss countermodel (2026-11-11; DERIVED, a toy observable).** Suppose a height-related
  observable accumulates as `dH/dt = a·Yᵏ − L` with `a` and a positive `L` constant during a segment. For
  a fixed increment `H*` and `a·Yᵏ > L`, `t* = H*/(a·Yᵏ − L)` and the apparent exponent is
  `k_app = −d ln t*/d ln Y = k / [1 − L/(a·Yᵏ)]`, which is above `k` and decreases as the dose rises. A
  dose-independent net loss could thus inflate the apparent exponent at low dose without changing the
  intrinsic one. **Stated limitation:** `k_app ≥ k` always, so it cannot give an exponent below `k`.
  Birch's 5 °C row (`data/birch-2013-table.csv`, 1260, 210, 180 min at 20, 40, 60 g/kg) has
  adjacent-pair exponents 2.585 (20 to 40) and 0.380 (40 to 60; our arithmetic), the second below the
  shipped `k` = 0.729, which the formula cannot produce; at 35 °C the pair ordering also runs the other
  way. It is not a Birch fit, not a measured leak rate, not an identified mechanism, and any
  retained-gas hypothesis would have to be tested jointly against gas evolution, retained height,
  structure and several conditions before a parameter is added. Candidate only; no parameter, no model change.
- **Spherical first-eigenmode thermal estimator.** For a sphere the core and the mean temperature decay
  with one time constant after the higher modes die out, with amplitudes `A₁ > 1 > B₁` that depend on the
  Biot number; for `Bi` about 0.44 (illustrative: `h` 8 W/m²K, `L_c` 0.02 m, `λ` 0.36 W/m K, none of them
  measured) `A₁` is about 1.35 (our check), so a core probe's decay reads about 30 % long against the mean.
  Candidate: fit `ln θ_core = ln A₁ − t/τ₁` on probe curves and compare it with a direct fit of the
  fixed-lag and one- and two-node models; Jensen's inequality makes the volume-averaged rate exceed the
  rate at the mean temperature. Test: probe-logged cooling of 300 g, 1 kg and 2 kg doughs (#260, #268).
- **Preferment carry-over factor `γ`.** The preferment's yeast would count `γ M_pref` in the dose of the
  final dough, with `γ → 1` as its age tends to 0; `γ` is not necessarily at or above 1 (an exhausted or
  acidified preferment may be below) and no functional form is identified. The contract keeps `γ` = 1.
  Test: paired fresh against mature preferment doughs with matched post-mix composition and measured
  internal temperature; the result is a net lumped effect, not yeast multiplication alone.
- **Extensive progress bookkeeping.** With a rate that does not depend on past progress, resetting the
  rise reference at the mix cancels any carried progress from the post-mix prediction, and with a dose
  exponent other than 1 the summed activity depends on the flour mass (an artefact). It is bookkeeping,
  not conserved biology. Test: the same paired preferment trials.

Follow-ups kept apart: #268 (recording and export of timestamped temperatures, contract 0.26.0), #243
(saying explicitly what the model predicts, and the baker's sensory readiness criteria and
observations), #260 (home measurement protocols, including heights and cooling curves) and #275
(personal calibration, friction first).

Other open items: transcribe the Timmermans time courses (Figure 4 of the paper); confirm the bibliography titles marked unverified; check whether the Izzreen formula
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
| contract 0.11.0 | 2026-10-12        | The heat steps are the cooking operations (process.md): `bake`, `boil`, `steam`, `fry`, `panCook`, `grill`. A fried or pan-cooked dough no longer counts its cooking step as a dough step. Same equations and parameters, fixtures unchanged.                                                                                                                                                                                                                        |
| science doc     | 2026-10-25        | Lag-aware comparison on Izzreen Table I, and cardinal-temperature forms and progressive blending examined and rejected (section 2; reports on issue #9). No model change.                                                                                                                                                                                                                                                                                            |
| science doc     | 2026-10-25        | Section 14: provenance of every constant of the dough thermal model proposed for contract 0.21.0 (#176). No change of the kinetic model; the thermal sub-model `flourprint.dough-thermal` 0.1.0 is a proposal until its contract merges.                                                                                                                                                                                                                             |
| science doc     | 2026-10-26        | Goal and acceptance criterion: a forecast at least as good as an expert baker's, judged by held-out predictive error against published schedules and recorded bakes; recipe corpus, science and personal bakes as complementary sources; gate 9. Owner decision. No model change.                                                                                                                                                                                    |
| science doc     | 2026-10-30        | Section 8 and its data file: Boudrag Table 5 re-extracted from the full text; the earlier transcription and the salt factor fitted on it withdrawn. No model change.                                                                                                                                                                                                                                                                                                 |
| science doc     | 2026-11-03        | Section 15: predictive uncertainty measured on published practice (calibrated, 80 % interval about ×5; the corner envelope covers 72 % of held-out recipes; first-contact dough clock of contract 0.24.0). No model change.                                                                                                                                                                                                                                          |
| science doc     | 2026-11-07        | Section 8: Belz 2017 salt series read in full text, with its data file; section 12: design notes from the third external report. No model change.                                                                                                                                                                                                                                                                                                                    |
| science doc     | 2026-11-10        | Ledger update after two external reviews of #231: Finney 1976 read in full (an experiment; 0.68 to 0.83 by observable), Birch 2013 papers read through the thesis (second Copenhagen matrix, product spread), Covino 2023 (only low-dose dataset), Izzreen provenance (one timing matrix, two estimators), the thermal-confounding identity and its simulation, cold-law caution, candidate hypotheses (section 12). No model change.                                |

Any future model version adds a row here with the evidence it rests on.

## 14. Dough thermal model: provenance of the constants (#176)

Basis: the five research reports and the final collation posted on #176 (2026-10-25). Read
status is **as recorded in those reports** and is not upgraded here: the coordinating agent
checked fixture arithmetic, not paywalled full texts, and the collation itself says that several
"full text" claims for paywalled papers are not verified. Labels as in the README. No Flourprint
agent read any of these sources directly. Nothing in this section is a measurement of the owner's
dough; the owner's readings (informal, home probe) will calibrate a personal factor, not validate
the constants.

Reports: [GPT-6](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402372354), [Gemini Flash](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402372550), [Copilot](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402372709),
[Grok](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402372900), [interim collation](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402373051), [Argon](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402393412),
[final collation](https://github.com/Aristotelesqc/Flourprint/issues/176#issuecomment-6402393579).

| Constant (contract value)                                                        | Label                         | Where it comes from; read status as reported                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `cp` 2800 J/(kg·K), band 2700–2930                                               | MEASURED, secondary           | GPT 2700 (Matuda et al., abstract only), Flash 2800 (Rask 1989, reported full text, unverified), Argon 2785–2930 Choi & Okos (ASHRAE, reported full text) and calorimetry 2700–3030, Copilot 2.7–3.0 (Matuda, Oladunmoye, reported full text)                                                                                                        |
| `ρ` unproofed 1100 kg/m³                                                         | MEASURED, secondary           | Argon 1050–1150, GPT about 1100, Flash 1180, Copilot 960–1035 on composite doughs, Grok 1050–1250; abstract or secondary for most                                                                                                                                                                                                                    |
| `ρ` proofed 400, mid-proof 750                                                   | MEASURED / ASSUMED            | proofed: Argon 270–610 (Chevallier et al. 2012, reported full text), Flash 400–600 (Campbell 1993, reported full text, unverified). The mid class is ASSUMED, the midpoint                                                                                                                                                                           |
| `k` 0.38 / 0.28 / 0.18 W/(m·K)                                                   | MEASURED, FITTED              | unproofed: Argon 0.36–0.46 (Rask via Lind, abstract and tables), GPT 0.40, Flash 0.40 (Zanoni 1994, reported full text). Proofed: GPT's λ(ε) = 0.421 − 0.134ε − 0.219√ε (fit on S2, abstract and preview excerpts only), Argon 0.12–0.20 (Zúñiga & Le-Bail 2009, abstract), Flash 0.18–0.22. Mid: ASSUMED midpoint (Flash used 0.28)                 |
| `h_ext` fridgeStatic 8 (4–10), non-metal                                         | DERIVED, ASSUMED              | Laguerre 2010 (HAL hal-00579333) and Lança et al. 2025: radiation about half the heat transfer in a domestic fridge; both reported **full text, by Argon only**. Convection-only 2.5–4 (GPT, Copilot) is the low end; Flash 8–10. Resolved as the final collation's central 8, band 4–10                                                             |
| `h_ext` bare metal fridge 5 (3–6)                                                | DERIVED                       | Argon: emissivity 0.15–0.25 cuts `h_rad` to about 1, external resistance about 0.20 m²K/W                                                                                                                                                                                                                                                            |
| `h_ext` fridgeVentilated 12 (8–18)                                               | ASSUMED                       | no report quantifies a no-frost fridge; prior from GPT's fan-assisted proofing box 5–20 plus radiation                                                                                                                                                                                                                                               |
| `h_ext` roomStill 9 (6–12)                                                       | DERIVED, ASSUMED              | Flash 10–12 (includes radiation), Argon 8–10 (still room), GPT 2–8 and Copilot 3–7 (convection only); the radiation share is scaled from the fridge value                                                                                                                                                                                            |
| `h_ext` provingBox 10 (5–15)                                                     | ASSUMED                       | Flash 8–10, GPT 2–8 still and 5–20 with a fan, Copilot 3–7 fan off and 6–15 low fan                                                                                                                                                                                                                                                                  |
| `R_wall` glass 0.004, plastic 0.008, ceramic 0.006, steel 6.9e-5, aluminium 1e-5 | ASSUMED, secondary            | spread across GPT, Flash, Copilot, Argon (glass 0.0036–0.005; plastic 0.006–0.0125; ceramic 0.0033–0.010; steel 5e-5–7e-5; aluminium 5e-6–1e-5); minor against the air side                                                                                                                                                                          |
| `R_cover` lid 0.14 (0.04–0.39)                                                   | ASSUMED, DERIVED              | Argon 0.14, Flash 0.12–0.16, Copilot 0.04–0.15, GPT 0.39 (10 mm gap, conduction only); the band spans the reports                                                                                                                                                                                                                                    |
| `R_cover` film 0.07 (0.01–0.14), cloth 0.04 (0.02–0.10)                          | ASSUMED                       | film: no report gives a film over an air gap (Copilot's film alone, 7.5e-5, ignores the gap), half the lid is a convenience value. Cloth: GPT 0.04, Copilot 0.02–0.10                                                                                                                                                                                |
| `R_wall` banneton 0.063, liner +0.02                                             | ASSUMED, secondary            | GPT 0.063, Flash 0.075–0.100, Argon about 0.10 with liner, Copilot cloth or banneton 0.02–0.10                                                                                                                                                                                                                                                       |
| `G_shelf` 0.025 W/K (0–0.25)                                                     | ASSUMED                       | GPT 0.025–0.5 W/K; Copilot shelf contact 0.03–0.20 m²K/W; Argon's 250 g box on a glass shelf against an insulated tray (1.34 against 2.20 h). Not measured by anyone                                                                                                                                                                                 |
| `C_container`: `f_c` 0.5, `c_cont` per material                                  | ASSUMED, heuristic            | Argon: a warm bowl adds 300–650 J/K (3.52 to 3.92 h for 2 kg); GPT and Copilot flag it as a heuristic. Specific heats of glass, ceramic, plastics, metals: textbook values, not from the reports                                                                                                                                                     |
| Geometry classes, sheet 6 mm, tin 2:1:1                                          | ASSUMED                       | collation: hemisphere for a bulk in a bowl (Argon), sphere for a ball (GPT, Copilot); the sheet thickness and tin aspect are conveniences                                                                                                                                                                                                            |
| `τ_eff = τ_lumped (1 + Bi_R/(p+2))`, `γ_core`                                    | DERIVED                       | Argon, with its Biot table (exact against `1 + Bi/5` within 1.5 % for `Bi_R` ≤ 1); the coordinating agent verified the table. This PR's fixtures also compare it with GPT's exact eigenvalue                                                                                                                                                         |
| `ΔT_ad` 0.85 K per unit F (0.6–1.2)                                              | DERIVED, ASSUMED              | `Y_CO₂ · (−ΔH_CO₂)/cp`: GPT 0.62, Flash 0.74, Argon 0.99 K per F. Central is the geometric mean of the band ends                                                                                                                                                                                                                                     |
| `−ΔH_CO₂` 34–49 kJ/mol                                                           | DERIVED / MEASURED, secondary | 34 (GPT, formation enthalpy, McMaster exercise, full text secondary), 37.2 (Copilot, Hess), 45 (Argon, Battley 1998 abstract; Boulton via Stroia & Lodin 2025), 50 (Flash, von Stockar & Birou 1989 reported full text, unverified); Grok 45–60 (abstracts). Hoogerheide 1975: 672 µcal per mm³ CO₂, about 2.8 J per mL (Grok's per-L unit is wrong) |
| `Y_CO₂` per unit F (about 1.0–1.5 L/(kg·F))                                      | ASSUMED                       | unidentified in every report: `F` is not cumulative CO₂. GPT 1.2 L/(kg·F), Flash 1.0; Argon 31.2 mmol/(kg·h) at 24 °C, 1 % yeast (Chiotellis & Campbell 2003, abstract) on a rate of 0.50 /h that is not the shipped 0.4315 /h                                                                                                                       |
| Semenov bound `ψ ≤ 1/e`                                                          | DERIVED                       | Argon's criterion, adopted by the final collation. Argon's claim that a "CTMI curve" guarantees stability is wrong for Flourprint (no cardinal form, rejected in section 2) and is not used; Argon's `Ea` 68 and rate 0.50 /h are not the shipped 98.3 and 0.4315                                                                                    |
| Estimators: two-point slope, Guggenheim three-point                              | DERIVED                       | Argon tiers 2–3; Flash (slope independent of the probe position)                                                                                                                                                                                                                                                                                     |
| Factor guard 0.25–4                                                              | ASSUMED                       | a guard, not data                                                                                                                                                                                                                                                                                                                                    |

Rejected or flagged values: Grok's 250 g `τ` of 0.4–0.7 h (its own inputs give 1.64 h) and
Hoogerheide unit; Flash's "unconditionally stable" claim (no equilibrium at 30 °C, 2 % yeast,
2 kg). Spread of `τ` across the reports for the same case: 2 kg covered glass bowl in a fridge
3.5 – 7.3 h; 900 g banneton 3.0 – 6.7 h; 250 g ball 1.3 – 3.4 h; 800 g aluminium tin in a room
1.7 – 2.1 h. The contract values sit at the fast end for the 2 kg bowl because `h_ext` includes
radiation; the band reaches the slow end (about 6.7 h).

Limits: no constant here was measured on the owner's dough, in the owner's containers or fridge.
The owner's measurements will be informal (home probe, not a lab protocol): they calibrate a
personal factor and say nothing universal. Not modelled, only flagged: enriched doughs (fat,
sugar, eggs, milk change `cp`, `k`, `ρ` and fermentation), sourdough heterofermentation (another
heat per CO₂), uncovered surfaces (evaporation 1–3 °C), fridge stratification and compressor
cycling. Evidence still expected (#176, N2): probe readings after a fridge transfer in two
containers and two masses, and one self-heating check on a large bulk at stable room temperature.

**Fridge convection, first read source (2026-11-04).** Williams, Clausing and Newell 1994 (ACRC
TR-54, University of Illinois, open access in IDEALS) measured natural convection on the warm
vertical walls of a closed refrigerator filled with ice containers. Convective-only `h` (radiation
subtracted) is 1.47–3.13 W/m²·K per wall, 2.27 on average for the enclosure, referred to the
**wall–contents** temperature difference, not wall–air. Fitted: `Nu = 0.188 Ra^0.275` (R² 0.939)
for `Ra` (on enclosure height) from 4.8·10⁶ to 6.1·10⁸; more contents raised `h` (2.61 against
1.60), and `h` was highest near the bottom of the walls. Read status: external reading relayed
by the owner (abstract, conclusions, Tables 5.2–5.6); not verified here. Consequence: the
convection-only low end of `h_ext` (2.5–4) is of the right order once its basis is accounted for,
and radiation, not convection, carries much of the contract's central 8, which nothing here
measures on a dough. Open question: the contract reads a crowded shelf as the low end, while
these data show more contents raising wall convection; the geometry differs (cold contents,
warm walls), so the contract is unchanged.

## 15. Predictive uncertainty (research, 2026-11-03, rerun 2026-11-06)

Status: research only. No contract, constant, band or estimate changes. Script:
`scripts/uncertainty_published.mjs`, on the published-recipe dataset and the dough clock of
`scripts/baseline_published.mjs` (#33).

### What it is for

A forecast should state how wrong it may be, and that statement must be testable. The model is
judged by the distribution it gives for held-out cases: its intervals must contain the observed
time as often as they claim (calibration), and be as narrow as possible (sharpness). Proper scores
(log score, CRPS) combine both. A candidate is better when its distribution scores better on
held-out sources, not only its central value. Gate 5 (section 12) asks for exactly this measured
band.

### Structure

In log time, `ln T_observed = ln T_model + b + ε`. The spread of `ε` has five sources:

- **parameters** (`A`, `k`, `Ea`, yeast conversions): today the corner envelope of the contract;
- **inputs**: unstated room temperature, yeast form and vitality, dough temperature, the thermal
  constants of section 14;
- **end point**: the readiness profile and its band (section 4);
- **structure**: what the law leaves out (ingredients, temperature shape, the dose exponent's
  dependence on temperature);
- **observation**: how a source or a baker reports the time.

Published recipes measure only the total. Separating the sources needs recorded bakes with their
conditions (section 12). The universal spread then serves as the prior, and each baker's bias `b`
and spread are updated from their own bakes (section 11), for example with a conjugate
normal-inverse-gamma update; N = 1 data never change the universal spread.

### First measurement: published practice (n = 50, 39 source groups)

For each held-out source, a predictor's distribution is a normal law in `ln T` whose bias and
spread come from the training sources only; an empirical-quantile interval uses the same training
residuals without assuming a normal law. It is conformal in form only: those residuals also fitted
the predictor and are not exchangeable with a new source, so it carries no coverage guarantee and
its held-out coverage is the check.

| Predictor                | RMS factor | CRPS  | Log score | 80 % interval, total width | Coverage 50/80/95 %, normal | Coverage, quantile |
| ------------------------ | ---------- | ----- | --------- | -------------------------- | --------------------------- | ------------------ |
| Global mean time         | ×3.14      | 0.665 | 1.562     | ×18.2                      | 48 / 72 / 98                | 50 / 78 / 96       |
| Style mean time          | ×2.49      | 0.508 | 1.513     | ×5.9                       | 54 / 72 / 80                | 42 / 70 / 80       |
| Fitted dose and Q10 rule | ×1.89      | 0.358 | 0.998     | ×4.9                       | 52 / 76 / 96                | 50 / 76 / 96       |
| Model, global end point  | ×1.89      | 0.350 | 1.017     | ×5.0                       | 56 / 80 / 94                | 50 / 80 / 96       |

Without low-confidence recipes (n = 42): model CRPS 0.313, 80 % width ×4.1; rule 0.318, ×4.0.

- On published practice the model's distribution is **calibrated but wide**: coverage is close to
  nominal and the PIT deciles are roughly flat, but the 80 % interval spans ×5 (about ×2.2 on each
  side of the central time). With 50 recipes an 80 % coverage is known to about ±6 points, and the
  spread is fitted on the training sources, so coverage near nominal is partly by construction.
- The proper scores do not separate the model from the two-parameter rule fitted on the recipes:
  the model's CRPS is lower and the rule's log score is lower, both within noise. The shipped law and
  the fitted dose-plus-Q10 rule tie (RMS ×1.89; CRPS 0.350 against 0.358). The benchmark measures
  agreement with published plans, not observed readiness; the decisive missing evidence is recorded
  bakes with dough temperature and height (`home-measurements.md`; contract 0.26.0 preparation
  temperatures, #268; personal calibration, #275).
- The **corner envelope** of the contract contains the held-out time for 36 of 50 recipes (72 %;
  76 % without low confidence), with a median progress band of ×5.2 (the ratio of engine progress at the high and low corners,
  not a time ratio). On this data it behaves like
  a 70–75 % interval of published practice. That is a coincidence of assumed ranges, not a property
  of the envelope, and it holds for published practice only: it is still not a confidence
  interval.
- The style mean has heavy tails: its normal 95 % interval contains only 80 %.

By regime (held-out model errors; small groups, indicative only):

- Schedules that are mostly cold (n = 27) are not worse (×1.69) than schedules with no cold stage
  (n = 22, ×2.12).
- Low doses (under 0.5 % fresh-equivalent, n = 7) are published shorter than predicted (bias
  ×0.71). That fits the fitted rule's dose exponent of about 0.55 against the shipped 0.729.
- Lean boules (n = 4) and neo-Neapolitan pizzas (n = 6) are published longer than predicted
  (×1.79 and ×1.36).
- Low-confidence recipes are worse (×2.58 against ×1.75).

Limits:

- These are published recipes, not recorded bakes: the result measures agreement with practice,
  the first measure of the Goal, not accuracy on bakes.
- The normal law omits the (1 + 1/n) parameter inflation and heavier tails; at n ≈ 45 to 49 this
  is negligible.
- Unstated rooms are assumed to be at 21 °C.
- The 29 recipes refused as `dose_outside_domain` are not scored.
- The model's end point is one parameter fitted on the training sources.
- The spread is assumed equal across regimes.
- The progress curve is read from a 49-point grid, checked against bisection to within 7.6e-4 in
  `ln` scale.

### Next steps (research)

1. Propagate input uncertainty (unstated room temperature, yeast form) through the engine. This
   shows how much of the ×1.9 the inputs alone explain, and needs no new data.
2. Let the spread depend on the regime only if held-out scores improve.
3. A contract proposal for gate 5 comes after these steps: replace the envelope with a measured
   predictive interval that names its basis ("published practice, n = 50"), plus the personal
   update from recorded bakes.
