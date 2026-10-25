# Contract: fermentation model, first domain (#9, #29, #33)

Status: **provisional** (owner decision of 2026-10-09, ADR 0010). Model
`flourprint.commercial-yeast` version `0.1.0`. Its parameters come from a secondary source and are
not validated on independent dough data; every estimate says so. They change only through a new
model version that passes the promotion gates of `docs/science/fermentation-model.md` (same
observable, protocol close to home baking, validation on independent data): reading a paper is
not enough. Recorded bakes calibrate the readiness profile (below, #14), not these constants.

**Role of every forecast (owner decision of 2026-10-25).** Every fermentation forecast this
contract produces (end time, progress, dough temperature, self-heating) is an **estimate that
guides the baker**. The baker's sensory readiness criteria (rise or volume against a reference,
poke test, bubbles at the surface and the sides, jiggle, feel) come first and decide. A recorded
"dough ready" observation (`doughReady`, bake-session.md), or a recorded "not ready", always
overrides the model for that step, and the model never presents a computed end as the dough being
ready.

## What it predicts

The time a dough or a commercial-yeast preferment takes to reach its end point, and the yeast
needed for a given schedule. One forward `simulate()` serves both directions (#29).

- **Dough end point**: from the end of the mix (the reference mixing step, process.md) to the start of the bake, the dough is "ready to
  bake" (the baker's readiness decision, see Readiness profiles below). Bulk, cold retard,
  shaping and proof are counted together: the state is never reset between steps (#9).
- **Dough steps**: the `asap` steps that come after the reference mixing step (`frasage` or `mix`, the last one) and before the first **heat
  step** (a cooking operation, process.md: boiling bagels, grilling or frying a dough ends the fermentation
  as baking does) in the graph, in process order. `alap` steps (preheating) never hold the dough. They must form
  one sequence, each after the previous one; dough steps in parallel (two rests side by side)
  are `insufficient_data` (`non_linear_dough_path`) until split masses are modelled. Without a
  mixing step, the estimate is `insufficient_data`, and so it is when yeast is already in the dough ahead of
  the reference mixing step with a non-mixing step between (`leaven_before_mixing`, process.md); without a heat step, every `asap` step after
  the mix counts.
- **Preferment end point**: a poolish or biga is "ripe" (#33 objection 5), at progress 1.
- A preferment is a `preferment`-kind component; its steps are the steps of the component
  (`process.md`, Subjects and component phases): the step with the component's id, and the steps
  naming it as `subject`. With more than one fermenting (`preferment`) phase its estimate is
  `insufficient_data` (`component_phases_unmodelled`).
  Its yeast is its allocations of yeast-marked ingredients; with none, its estimate is
  `insufficient_data`.
- The model predicts this observable end point directly. It does not separate gas production
  from gas retention or volume yet (#33 objection 4).

## State and equations

One state per fermenting mass, its progress `F` (0 at the start). The unit of `F` is Craig's:
`F = 1` is "about doubled once" in his table. It is internal to the model. With stretch-and-folds,
degassing and shaping the volume of a dough is not observable, so no interface presents a volume
or a "doubled" target. Each mass has an end-point target `F*` (below):

```text
dF/dt = (d / 1 %)^k / A × r(T(t))           [per hour]
r(T)  = exp( (Ea / R) × (1 / 294.25 K − 1 / T) )      (r = 1 at 21.1 °C)
```

- `d`: fresh-yeast-equivalent dose in percent of the flour of that mass. Dry yeast converts by
  mass: fresh = instant / 0.33, fresh = active dry / 0.40.
- At constant temperature, `t = F* × A × d^−k / r(T)`. Inverse: the dose that gives `F = F*` at the
  end of a schedule is found by bisection on `simulate()`, never by a separate formula.
- A preferment uses the same law with the yeast and flour allocated to it. The final dough's
  dose counts all the yeast of the dough (preferment and final mix) over all its flour; the
  preferment's yeast growth before the mix is not modelled (an extrapolation, below).

## Parameters (version 0.1.0)

| Parameter             | Value       | Range used for the band | Basis                                                                                                                                                           |
| --------------------- | ----------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A`                   | 3.43 h      | ×0.75 to ×1.25          | least-squares fit of Craig's table, 952 cells, 3.9–30 °C, ≥ 3 h (rms 5 %, max 32 % error); Craig's own anchor differs by 15 %, Calvel's poolish by 12 %         |
| `k`                   | 0.729       | 0.6 to 0.9              | same fit; Finney et al. 1976 (independent, abstract) gives 0.74                                                                                                 |
| `Ea`                  | 98.3 kJ/mol | 50 to 100 kJ/mol        | same fit; other sources are flatter (≈ 50–72) (#29 evidence review)                                                                                             |
| instant → fresh       | ÷ 0.33      | ÷ 0.32 to ÷ 0.42        | King Arthur 0.33, Red Star ≈ 0.42, Craig 0.32                                                                                                                   |
| active dry → fresh    | ÷ 0.40      | ÷ 0.40 to ÷ 0.50        | King Arthur 0.40, Red Star ≈ 0.42, others 0.5                                                                                                                   |
| dough thermal lag `τ` | 0 to 3 h    | the range itself        | assumption, no source: how long a dough takes to follow a new ambient (e.g. the fridge). **Default** for a step without thermal inputs; see Dough thermal model |

- Craig's table: pizzamaking.com "Baker's yeast quantity prediction model" (TXCraig1), read
  through the open-source transcription `tysonjf/weatherApp/src/engine/craigTable.ts`. It is a
  hobbyist model's output, not measured data, and its stated temperature function does not
  reproduce it (#33).
- The temperature function is Arrhenius because it fits Craig's table best (×1.13, against
  ×1.65 for Ratkowsky). That table is model output, not dough data. On measured dough data
  (Izzreen 2016) a separable square-root form fits as well as Arrhenius, and a dose × temperature
  interaction fits better. The form is to be re-decided on primary dough data; the evidence is in
  `docs/science/fermentation-model.md`.
- The **band** is the minimum and maximum over every combination of the parameter ranges; the
  value uses the central parameters. The band is not a confidence interval.

## Readiness profiles: when the dough is ready

The kinetic law and its constants (`A`, `k`, `Ea`, conversions, `τ`) say how fast `F` grows. They
do not say when a dough is ready to bake. That is the baker's decision, held in a **readiness
profile**, separate from the kinetic parameters, versioned and named in every estimate that uses
it:

```ts
interface ReadinessProfile {
  id: string;
  version: string;
  readyProgress: number; // F* of the dough
  band: [number, number]; // low and high F* used for the band
  basis: string; // where the values come from
}
type ReadinessRef = { id: string; version: string };
```

| Profile                             | `readyProgress` | Band      | Basis                                                                                                                                                                                                                          |
| ----------------------------------- | --------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `flourprint.model-end-point` `1`    | 1.0             | 1.0 – 1.0 | the model's own end point, Craig's "about doubled once"; **the default**, uncalibrated                                                                                                                                         |
| `flourprint.experimental-ready` `1` | 2.0             | 1.5 – 2.5 | an assumed prior, not measured: planned TOST schedules, read as examples, imply about twice Craig's time for "ready to bake" after degassing, shaping and proof (#33). The band is a sensitivity range, not a prediction error |

- A recipe selects its profile on its process (`readiness?: ReadinessRef`, process.md). Without
  one the default applies and the dough estimate adds the assumption `readiness_default`. Choosing
  another profile is an explicit edit of the recipe, never a silent default.
- An unknown profile makes the dough estimate `insufficient_data` (`readiness_profile_unknown`).
- A profile is valid when `readyProgress` and both ends of `band` are finite and positive and
  `band[0] ≤ readyProgress ≤ band[1]`. Otherwise the dough estimate is `unsupported`
  (`invalid_readiness_profile`), never clamped.
- An `ok` estimate never holds a non-finite value: a central result that is not finite makes the
  estimate `insufficient_data` (`non_finite_result`).
- The dough estimate names its profile in `calibration` (values-and-units.md) and lists its target
  as the assumption `ready_target_progress:<value>`. An accepted suggestion keeps its estimate,
  so bake snapshots and the feedback export (history.md) say which profile a plan used.
- The band of a dough estimate is the minimum and maximum over every combination of the parameter
  ranges **and** of the two ends of the profile's `band`.
- A preferment's end point stays 1 ("ripe"); it is not a profile.
- Recalibration from the bake journal's `doughReady` observations with `stage: 'bake'`
  (bake-session.md) produces a new profile or profile version; it never changes the kinetic
  constants. Automatic learning is deferred.
- "Ready to bake" is an observable decision of the baker, distinct from gas produced, volume and
  height. The Izzreen M5 fit is research only and changes none of this.

## Dough temperature

- **Basic mode** (default, nothing measured): the dough starts at the ambient temperature of the
  reference mixing step (its condition temperature, else the first fermentation step's).
- **Advanced mode**: the reference mixing step declares a target dough temperature
  (`conditions.doughTemperatureC`); the dough starts at it.
- Between steps, the dough follows each step's condition temperature with a first-order lag
  `dT/dt = (T_condition − T) / τ`, τ within its range (0 = it follows at once). A step without a
  condition temperature keeps the previous one; with none at all, the estimate is
  `insufficient_data`. For a step that carries thermal inputs, `τ` and its band come from the
  Dough thermal model below; for any other step `τ` is 1.5 h, band 0 to 3 h, exactly as before.
- A measured dough temperature (an observation during a bake) replaces the estimate from that
  instant (bake-session.md, `doughTemperature`); planning uses the plan. A core-probe reading
  replaces the **mean** state through `γ_core` (below).

## Dough thermal model (#176)

Status: **proposal of 2026-10-25**, basis: the final collation of #176 (five research reports,
Claude run deferred). Thermal sub-model `flourprint.dough-thermal` version `0.1.0`. The kinetic
law (`A`, `k`, `Ea`, conversions) is **unchanged**; the thermal model changes only the dough
temperature `T̄(t)` that law is evaluated on. Every constant has a provenance entry in
`docs/science/fermentation-model.md` (section 14). They are priors from reports, mostly ASSUMED
or secondary, not validated on dough: the model is a first-principles estimate whose personal
factor (below) is calibrated on the owner's own readings. Issue #176 stays open until those
readings exist.

### Scope and default

- A step **carries thermal inputs** when it has a `thermal` object (process.md, Thermal inputs).
  Only such a step uses the model below.
- **Default behaviour, guaranteed.** A step with no `thermal` object keeps today's lag: `τ` =
  1.5 h, band 0 to 3 h, no self-heating (`ΔT_ad` = 0), no new flag. A process with no `thermal`
  anywhere simulates exactly as in contract `0.20.0`: every case of `fixtures/fermentation/cases.json`
  stays valid unchanged. The thermal model is never switched on by a default, by an environment
  class derived from `conditions.location`, or by a stored personal factor alone.
- Steps mix freely: `T̄` is one state carried over every step (the state is never reset between
  steps); each step's lag is the one of the step whose ambient the dough approaches.
- Within a step the thermal constants are held fixed (`τ_eff` is computed once per step and per
  change of its thermal inputs, bake-session.md). The porosity class does not change inside a step.
  This is an approximation: a long step that proofs a dough ends with another `τ` than it began.

### Mass

The mass `m` is the fermenting mass in kilograms: the main dough's weight as the formula resolves
it (`doughWeight`, minus declared losses). With `pieces` = n > 1 (divided dough, process.md) every
piece is modelled separately and identically with `m / n`; the simulation carries one
representative piece. Steps before the division use the whole mass. The application layer passes
`m` to the domain; the process stores no mass (a step carries no masses, process.md).

### Properties by porosity class

`ρ` and `k` follow the porosity class of the step: `unproofed`, `mid` (mid-proof) or `proofed`.
`cp` and `α` do not change with proofing; `V = m / ρ`.

| Class       | `ρ` kg/m³ | `k` W/(m·K) | Range of `k` | Basis (science doc section 14)                        |
| ----------- | --------- | ----------- | ------------ | ----------------------------------------------------- |
| `unproofed` | 1100      | 0.38        | 0.36 – 0.46  | Argon central, GPT 1100 / 0.40, Flash 1180 / 0.40     |
| `mid`       | 750       | 0.28        | 0.22 – 0.34  | midpoint of the two others (Flash used 0.28), ASSUMED |
| `proofed`   | 400       | 0.18        | 0.12 – 0.22  | Argon 270–610 / 0.12–0.20, Flash 400–600 / 0.18–0.22  |

`cp` = 2800 J/(kg·K), range 2700 – 2930. When `thermal.porosity` is absent the class is chosen
from the progress `f = F / F*` at the start of the step: `f < 1/3` unproofed, `f < 2/3` mid,
otherwise proofed (`F*` the target of the mass).

### Geometry classes

`V = m / ρ`. Each class splits the dough surface into a **contact area** `A_w` (against the
container, base included) and a **top area** `A_t` (against the cover or the open air).
`A = A_w + A_t`. Characteristic length `R0 = p · V / A`.

| Class (`geometry`) | `p` | Shape                                     | `A_w`               | `A_t`               | `R0`      |
| ------------------ | --- | ----------------------------------------- | ------------------- | ------------------- | --------- |
| `sheet`            | 1   | slab of thickness `e` = 6 mm, two faces   | `V / e`             | `V / e`             | `e / 2`   |
| `tin`              | 2   | prism `2a × a × a`, `a = (V/2)^(1/3)`     | `8a²`               | `2a²`               | `p V / A` |
| `ball`             | 3   | sphere, `R = (3V/4π)^(1/3)`; ball, boule  | `2πR²` (lower half) | `2πR²` (upper half) | `R`       |
| `bulk`             | 3   | hemisphere in a bowl, `R = (3V/2π)^(1/3)` | `2πR²`              | `πR²`               | `2R/3`    |

A boule proofing in a banneton is a `ball`. The shapes (the 6 mm sheet, the 2:1:1 tin) are
ASSUMED convenience geometries: they are classes, not measurements, and the factor absorbs the
rest.

### Conductance

Three paths in parallel, `UA = U_w A_w + U_t A_t + G_shelf`:

```text
1/U_w = R_wall + 1/h_ext          (container contact; banneton: R_wall includes the cane, + liner if any)
1/U_t = R_cover + 1/h_ext         (covered or open top)
```

| Constant                    | Value (m²·K/W)                      | Range for the band |
| --------------------------- | ----------------------------------- | ------------------ |
| `R_wall` glass              | 0.004                               |                    |
| `R_wall` plastic            | 0.008                               |                    |
| `R_wall` ceramic            | 0.006                               |                    |
| `R_wall` steel              | 6.9e-5                              |                    |
| `R_wall` aluminium          | 1e-5                                |                    |
| `R_wall` banneton (cane)    | 0.063, plus 0.02 with a cloth liner |                    |
| `R_cover` `lid` (headspace) | 0.14                                | 0.04 – 0.39        |
| `R_cover` `film`            | 0.07                                | 0.01 – 0.14        |
| `R_cover` `cloth`           | 0.04                                | 0.02 – 0.10        |
| `R_cover` `none`            | 0                                   |                    |

Walls are minor (the air side dominates); they are kept because a banneton and a lid are not.

| Environment class (`environment`)  | `h_ext` W/(m²·K) | Range for the band | Note                                                                                                                                               |
| ---------------------------------- | ---------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fridgeStatic`                     | 8                | 4 – 10             | non-metal surface, radiation about half of it (Laguerre 2010, Lança 2025); the low end is the convection-only and crowded-shelf view               |
| `fridgeStatic`, bare metal surface | 5                | 3 – 6              | stainless steel or bare aluminium (emissivity about 0.15 – 0.25): radiation reduced; applies when the container material is `steel` or `aluminium` |
| `fridgeVentilated`                 | 12               | 8 – 18             | fan-forced (no-frost); ASSUMED, no source quantifies it                                                                                            |
| `roomStill`                        | 9                | 6 – 12             | still room air, radiation scaled from the fridge value                                                                                             |
| `provingBox`                       | 10               | 5 – 15             | proofing box, low fan; ASSUMED                                                                                                                     |

`G_shelf` (shelf contact, a container resting on a solid shelf) is 0.025 W/K, range 0 – 0.25, in
the two fridge classes only; 0 elsewhere. `C_container` = `f_c · m_cont · c_cont` with `f_c` = 0.5
(the share of the container that follows the dough, ASSUMED), `m_cont` the step's
`containerMassG`, and `c_cont` glass 840, ceramic 880, plastic 1700, steel 500, aluminium 900,
banneton 1400 J/(kg·K). Without `containerMassG`, `C_container` = 0: the container's heat
capacity is never guessed. A given `containerMassG` states that the container changes ambient with
the dough (a warm bowl put in the fridge with it).

### Lag

```text
τ_lumped = (m · cp + C_container) / UA
Bi_R     = U_eff · R0 / k            U_eff = UA / A
τ_eff    = τ_lumped · (1 + Bi_R / (p + 2))
```

`τ_eff` is within 1.5 % of the exact first eigenvalue for `Bi_R` ≤ 1 (Argon's table, verified by
the coordinating agent) and about 0.7 % at `Bi_R` ≤ 0.7 against the GPT fixtures
(`fixtures/thermal/cases.json`). Beyond `Bi_R` = 2 the closure is EXTRAPOLATED: the estimate
carries `thermal_biot_high`. The mean temperature follows one exponential,
`T̄(t) = T∞ + (T0 − T∞) e^(−t/τ_eff)` (first-order closure; the first-mode amplitude is taken as 1,
which is within 0.2 to 0.6 % of GPT's exact `τ₁` here). Examples with the constants above and an
unproofed dough:

| Case                                                           | `τ_eff` |
| -------------------------------------------------------------- | ------- |
| 250 g ball, lidded plastic box, static fridge                  | 1.75 h  |
| 500 g bulk, lidded glass bowl, static fridge                   | 1.84 h  |
| 2 kg bulk, lidded glass bowl, static fridge                    | 3.31 h  |
| 900 g boule, banneton with liner, static fridge                | 2.87 h  |
| 800 g tin, aluminium, still room                               | 1.59 h  |
| 250 g sheet, aluminium tray, static fridge (bare metal, `h` 5) | 0.49 h  |

They sit inside the ranges of the five reports (2 kg: 3.5 – 7.3 h; 250 g: 1.3 – 3.4 h) and differ
by the geometry and the fridge `h` chosen, which is why the band below is wide.

### Core temperature (probe comparison)

A probe in the centre reads further from the ambient than the mean:

```text
T_core − T∞ = γ_core (T̄ − T∞),    γ_core = (1 + Bi_R/2) / (1 + Bi_R/(p + 2))
```

The result is clamped between the temperature at the start of the transition and `T∞`: a core
never lies beyond where the dough started. The factor is a first-mode result: it is exact late
(after about 0.5 `τ_eff`) and optimistic early. Self-heating adds a source distributed over the
mass; its extra core excess is neglected (a flagged approximation). Fitting a mean model to core
readings biases `τ` upward (GPT: 15.2 h instead of 6.78 h for 2 kg), which is why the model
predicts the core.

### Self-heating

```text
dT̄/dt = (T_amb − T̄)/τ_eff + ΔT_ad · rate(T̄, d)          [K/h, rate = dF/dt in 1/h]
ΔT_ad = Y_CO₂ · (−ΔH_CO₂) / cp                           [K per unit F]
```

`rate(T̄, d)` is the kinetic law of this contract. `ΔT_ad` is a **band**: 0.6 to 1.2 K per unit
`F`, central 0.85. It rests on −ΔH_CO₂ = 34 – 49 kJ/mol (formation enthalpy at the low end,
calorimetry and microcalorimetry at the high end) and a CO₂ yield per unit `F`, **Y_CO₂ ASSUMED**
(about 1.0 – 1.5 L/(kg·F)) from gas-production data that the contract's `F` does not tie to:
`F` is not cumulative CO₂. A central `ΔT_ad` of 0.85 K per unit F gives, at 24 °C and 1 %
fresh yeast, 0.37 K/h of heating (`rate` = 0.4315 /h). In a covered 2 kg bulk, the mean rises
about 0.5 K in 2 h and reaches 1.2 to 1.4 K above ambient (fixture c).

- **Closed forms** for a fixed ambient, `S = ΔT_ad · rate(T_amb, d)`:
  uncoupled (rate frozen at the ambient): `x(t) = S τ_eff (1 − e^(−t/τ_eff))`;
  coupled-linearised: `β = Ea / (R T_amb²)`, `ψ = β S τ_eff`, `τ_c = τ_eff / (1 − ψ)`,
  `x(t) = S τ_c (1 − e^(−t/τ_c))`, with `x = T̄ − T_amb`. The simulation integrates the full
  equation; the closed forms are the reference cases.
- **Bound (Semenov).** At each step the engine evaluates `ψ = (Ea / (R T_amb²)) · τ_eff · ΔT_ad ·
rate(T_amb, d)` with the central `ΔT_ad` and central `τ_eff`. An equilibrium exists only if
  `ψ ≤ 1/e`. If `ψ > 1/e`, or if `T̄` exceeds 35 °C during the integration, the estimate is
  `out_of_domain` with `reason: 'self_heating_unbounded'` (Semenov) or the existing temperature
  gate (the 35 °C rule of the Domain table): the forecast **never integrates a runaway** and never
  clips one. The 0.1.0 kinetic law has no substrate depletion or optimum, so it cannot represent
  why real dough does not run away; this bound is the contract's replacement for it.
- If only a band corner fails the test (the central value passes), the central estimate stands,
  the corner is not integrated, and the estimate has no `range` and the assumption `band_unbounded`
  (as for an unbounded dose corner, Results).
- In the fridge the heating is small (0.1 to 0.2 K at steady state for 2 kg) but not zero in the
  first hours after a warm dough goes in; it is not neglected.

### The band and the envelope

- **Thermal band.** For a step with thermal inputs, the band of `τ_eff` is the minimum and
  maximum over every combination of the ranges in the tables above that apply to that step:
  `h_ext`, `R_cover`, `G_shelf` and `cp`; the band of the source is the `ΔT_ad` range. The band is
  not a confidence interval and is not narrowed by a personal factor (below).
- **It replaces the 0 – 3 h range for that step** and is alongside the existing parameter ranges
  (`A`, `k`, `Ea`, conversions, readiness band): the envelope of an estimate is the minimum and
  maximum over every combination of all of them. Steps without thermal inputs keep 0 – 3 h.
- **Propagation along the process.** The contract already simulates the whole dough path with the
  state carried from step to step and takes the corners of the ranges end to end (State and
  equations, Dough temperature, Results). Each step therefore starts from the earlier steps'
  envelope, not from a point, and the last fermentation step before the bake carries the widest
  band. This section adds only the thermal ranges to that corner set. Earlier transitional
  fermentation steps may be planned on fixed durations; the model-driven step
  (`durationMode: 'model'`) is normally the last one.
- **Per-step envelope exposed.** The dough result lists, for every dough step, `steps: Array<{
stepId; endProgressPct: Estimate; endTemperatureC: Estimate }>`, each with its `range` over the
  same corners, so the interface can show "likely time + range" at each step (ledger L145). These
  are computed outputs, never persisted as inputs.
- **Divergence on the final step.** On the last fermentation step before the bake, a recorded
  readiness observation (poke test, `doughReady`) prevails over the model when they diverge; the
  interface shows both, and the model's end is never shown as ready.

### Personal correction

A personal factor `f` multiplies `τ_eff` (and its band) for a **key** `(material, cover,
environment)` of the step: `τ_personal = f · τ_eff`. Default `f` = 1; a key without a factor uses

1. It is stored in a versioned personal thermal profile (persistence.md), not in the recipe, and
   changes no kinetic constant (section 11 of the science doc). A factor outside 0.25 – 4 is refused
   (`thermal_factor_implausible`; the bounds are an ASSUMED guard against a wrong probe position).
   The estimate names the factor used in its assumptions: `thermal_factor:<key>=<value>`.

**Informal measurements.** The owner's readings come from a home probe, not a laboratory protocol:
probe position, shelf temperature, container and fill vary between bakes. They calibrate **a
personal factor**; they are not a universal validation of the model, and must never rewrite a
constant of this contract or be presented as such.

Estimators from readings `(t_i, T_i)` taken after a step to a stable ambient `T_amb`:

- **Two points** after the initial transient: `τ_obs = (t₂ − t₁) / ln((T₁ − T_amb)/(T₂ − T_amb))`.
  The late-time slope is the same at the core and on average, so it does not depend on the probe
  position.
- **Three equally spaced points** (Guggenheim, `Δt` apart): `τ_obs = Δt / ln((T₁ − T₂)/(T₂ − T₃))`,
  `T∞ = (T₁T₃ − T₂²)/(T₁ − 2T₂ + T₃)`. It also gives `T∞`, which captures a shelf offset or
  self-heating without knowing the shelf temperature. A reading set with `(T₁ − T₂)/(T₂ − T₃) ≤ 1`
  or a non-finite result is rejected (`readings_invalid`).
- **Factor** `f = τ_obs · (1 − ψ) / τ_eff`, with `ψ` of the reading's ambient (so the coupled
  stretch of self-heating is removed); readings with `ψ > 0.1` are rejected
  (`self_heating_confounds`).
- Readings before 0.5 `τ_eff` after the step are kept in the journal but not used (core lag).

**Calibration order**: thermal first, on weakly fermenting dough (cold, low dose or a dummy
mass); only then the heat term. A constant heat offset cannot be identified from a single cooling
curve. Automatic learning (N2) is deferred; this contract fixes the estimators and the storage.
The fixtures give a worked case (`fixtures/thermal/cases.json`, case d).

### Flags and limits

These are flagged as extrapolations or assumptions; they are **not modelled**.

| Effect                                                                               | Treatment                                                                                                                                     |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Uncovered surface (`cover: 'none'`): evaporative cooling of 1 – 3 °C                 | extrapolation `thermal_uncovered_evaporation`, no correction applied                                                                          |
| Enriched dough (fat, sugar, eggs, milk): changes `cp`, `k`, `ρ` and the fermentation | extrapolation `thermal_enriched_dough` when the formula is outside the Domain table's fat and sugar limits; constants are the lean-dough ones |
| Sourdough heterofermentation: another heat per CO₂                                   | the dough is `unsupported` for sourdough already (Domain); stays so                                                                           |
| Fridge stratification (2 – 5 °C) and compressor cycling (±1.5 °C)                    | the step's ambient is the declared one; `thermal_fridge_cycling` assumption                                                                   |
| Bowl and shape approximations (hemisphere, sphere, 2:1:1 tin, 6 mm sheet)            | classes, absorbed by the band and the factor                                                                                                  |
| `Bi_R` > 2                                                                           | extrapolation `thermal_biot_high`                                                                                                             |
| Core self-heating excess, early-transient core lag                                   | neglected, stated above                                                                                                                       |
| Shelf type (solid, wire rack), crowding                                              | inside the `h_ext` and `G_shelf` ranges                                                                                                       |

The thermal model changes nothing in the Domain table except the self-heating rows above. It is
N1 (representable and computed) until a model version is validated within a declared domain
(capability-levels.md): the owner's dough-temperature readings in at least two containers and two
masses, one in the fridge, plus one self-heating check, are the evidence expected by #176.

## Live recomputation and readiness cues (owner decisions of 2026-10-25, ledger L145 and L146)

**Recomputation from the facts.** During a Preparation, the forecast of every step that has not
ended is computed from what was recorded, never from the original plan: the progress `F` already
accumulated (integrated over the recorded times of the steps and their recorded conditions), the
dough temperature (a `doughTemperature` observation replaces the mean state from its instant,
Dough temperature), the recorded temperature and `AdjustStep` of each step, and the thermal inputs
in force (a `StepThermalChanged` starts a new segment, bake-session.md). Completing a step fixes
its recorded end, and everything after it is projected from that end and from the state the dough
had then. This is the replanning rule that already holds for times (process.md, Projection:
freeze recorded facts, then forward pass) applied to the biology; `liveProjection` and the
model use the same recorded facts, and `evolve` stays structural (bake-session.md): the recomputed
values are derived, and committed estimates keep what they committed (history.md). The model
never uses the planned duration of a step that was recorded with other times.

**Readiness cues are derived, not stored.** Each dough step presents the cues that suit its
history. The domain derives, read-only and from recorded facts, `volumeCueValid(step)`:

- it is **false** when, since the step started, a degassing operation was recorded on the dough: a
  `fold` observation (`kind: 'fold'`, bake-session.md) on the step, or a step of operation `fold`,
  `degas`, `preshape` or `shape` started after the step's start, or when the step itself is one of
  those operations; in a plan with no facts it is false when the step's technique declares `folds`
  (process.md, Techniques);
- it is **true** otherwise: nothing disturbed the gas since the step began.

With `volumeCueValid` true, the interface may offer the volume cue ("about doubled" against a
reference). With it false, the cues are the surface dome, bubbles at the surface and the sides,
jiggle, poke and feel; a volume is never shown as a target after a degassing (the section State
and equations already refuses any "doubled" target). No cue field is persisted: the function reads
the recorded events and the recipe's operations. It selects which cues to **show**; it changes
neither the model nor `doughReady`, which stays the baker's decision.

## Water temperature (advanced mode)

Base-temperature method (French convention, also TOST's):

```text
T_base  = n × T_target                   (n = 3, or 4 with a preferment)
T_water = T_base − T_flour − T_room − T_preferment − friction
```

The preferment term is present only with a preferment. Friction is heat the mixer adds, so it
lowers the water temperature (King Arthur Baking, _Dough Temperature_, professional reference).
Version 0.1.0 of this contract added it instead; that was an error, corrected on 2026-10-09
(#33).

- `T_room` is the reference mixing step's condition temperature; `T_flour` defaults to `T_room`;
  `T_preferment` defaults to the preferment step's condition temperature.
- `friction` defaults to 0 °C and is the user's to set (`conditions.frictionC` on the reference mixing step):
  mixers differ, and a few measured doughs calibrate it (#32). With the default, the result says
  that friction is not counted.
- A result below 0 °C or above 60 °C is returned with that flag, never clipped.

## Domain

| Condition                                                                                                                                                                         | Result                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| no ingredient marked as commercial yeast, or a sourdough culture                                                                                                                  | `unsupported`                              |
| a step's temperature unknown, or the yeast form unknown                                                                                                                           | `insufficient_data` (named)                |
| fresh-equivalent dose outside 0.01–3 %, dough below 1.7 °C or above 35 °C (also reached by self-heating)                                                                          | `out_of_domain`                            |
| Semenov test of the dough thermal model `ψ > 1/e` (Dough thermal model)                                                                                                           | `out_of_domain` (`self_heating_unbounded`) |
| a preferment (on the dough and on the preferment's own estimate); added sugar > 5 %; added fat > 3 %; salt outside 1.5–3 %; total water outside 55–75 %; a needed content unknown | `ok` with `extrapolations` listing each    |
| otherwise                                                                                                                                                                         | `ok`                                       |

Sugar and fat are the formula's `totalSugarPct` and `totalFatPct`; water is `totalWaterPct`.
Salt is the ingredient with id `salt` until ingredients are typed (#26); a dough without one is
outside the salt range.

The domain is checked on the central value. The band of a yeast dose is the full envelope over
every corner: corners outside 0.01–3 % fresh-equivalent are shown as computed, never clipped, and
the estimate then carries the assumption `band_outside_domain`.

An extrapolated estimate is still given, with its reasons, because the owner's recipes need it
(#33 objection 5); its band does not widen automatically, so the reasons are always shown next
to it. Sugar, salt, fat and water only gate the domain: they do not change the rate (#33
objection 2).

## Results

- Per fermenting mass: the estimated duration of its last fermentation step (the proof for the
  dough, the preferment step for a preferment) given the planned durations of the others, as an
  `Estimate` in seconds with its band.
- The progress reached at the end of the planned schedule, when every duration is planned, as
  `progressPct = 100 × F / F*`: a percentage of the planned fermentation (of the end point of that
  mass). The interface shows it as such, labels the target "provisional" and never as a volume.
- The yeast for the planned schedule (inverse), in the yeast ingredient's own form, as a baker's
  percentage with its band.
- Estimates never end a step and never change the recipe by themselves: applying a suggested
  duration or dose is an explicit edit.
- Steps without a duration other than the estimated one count as 0 and are listed in the
  assumptions.
- A `range` bound is `{ kind: 'finite', value }` or, when a corner of the band never reaches the
  end point within the search horizon (21 days), `{ kind: 'beyondHorizon', horizonS }`: a bound is
  never a raw `Infinity`, which JSON cannot carry. The interface shows it as "not reached within
  21 days" (from `horizonS`), never as "no limit". A dose band with an unbounded corner has no
  `range` and the assumption `band_unbounded`.
- Results are `Estimate`s (values-and-units.md) carrying `ModelRef { id:
'flourprint.commercial-yeast', version: '0.1.0' }`, assumption codes and extrapolation codes.

## Accepted suggestions (provenance)

Applying a suggestion ("use this time", "use this dose") is an explicit edit. It also records
where the value came from, on the edited item itself:

```ts
interface AcceptedSuggestion {
  estimate: Estimate & { status: 'ok' }; // the estimate shown, as it was
  appliedValue: number; // the value actually written, after rounding
  model: ModelRef;
}
```

- `accepted` is optional on a process step (`plannedDurationS`, seconds), on a dough ingredient
  (`bakerPct`, points) and on a component allocation (`bakerPct`, points of total flour).
- Any other edit of that value (a typed duration or percentage, a grams edit of that item)
  removes `accepted`, and so does an `AdjustStep` of that step's duration during a bake (the
  effective step; the snapshot keeps the original). A consumer ignores an `accepted` whose
  `appliedValue` differs from the current value by more than the formula's settlement tolerance
  (1e-9 relative): settlement and consumption compare the same way.
- `StartBake` copies the accepted decisions of the started revision into the snapshot
  (history.md). Replay never recomputes them.
- Out of scope: staleness digests and exported parameter files.

### Model-driven duration

A dough step may be set to follow the model (`ProcessStep.durationMode: 'model'`, process.md):

- At most **one** dough step per dough is model-driven: the model solves one unknown, the time of
  that step given the planned durations of the others (as "use this time" does). A second one is
  `InvalidProcess`.
- While a recipe or draft is edited, the editor (application layer, not the domain) applies the
  current suggestion to that step after every edit, as an accepted suggestion: `plannedDurationS`
  is the suggestion rounded to 5 minutes, with its `accepted` provenance. The stored value is
  always explicit; when the estimate is not `ok`, the step keeps its last value and the editor
  says why.
- A bake never changes a duration by itself: the snapshot keeps the values of the started
  revision, and `AdjustStep` during a bake makes the step manual for that bake.

## Validation data (independent of the fit)

| Case                                            | Model (central) | Reference                           | Status                                                                |
| ----------------------------------------------- | --------------- | ----------------------------------- | --------------------------------------------------------------------- |
| poolish, Calvel table at 21 °C, 0.1–3.5 % fresh | within ×1.6     | Calvel/"Juju" table (transcription) | agrees within the band                                                |
| poolish 0.1 % yeast, 21 °C (BBGA)               | 19.5 h          | 12–14 h                             | outside unless the yeast is dry (0.1 % instant ≈ 0.3 % fresh → 9.6 h) |
| dose exponent                                   | k = 0.729       | Finney 1976: 0.74                   | agrees                                                                |

Reference cases for tests are computed outside the engine from the equations above.

## Versions

Version `0.3.0` of this contract added `yeast` on ingredients (formula.md), `doughTemperatureC` and
`frictionC` on step conditions (process.md) and `extrapolations` on estimates (values-and-units.md).

Version `0.4.0` adds the personal calibration of the dough end point (`readyProgress` 2.0), the
percentage of the planned fermentation, portable `range` bounds (values-and-units.md), the
optional `accepted` provenance (formula.md, process.md, history.md) and the `doughReady`
observation kind (bake-session.md). Documents of `0.3.0` stay readable unchanged: all additions
are optional. The kinetic model keeps its version `0.1.0`; its parameters did not change.

Version `0.6.0` replaces the single personal calibration by **readiness profiles**: the default
is the model's own end point (`readyProgress` 1), the former 2.0 target is the selectable
`flourprint.experimental-ready` profile, and dough estimates name their profile in `calibration`.
It also validates profiles, forbids non-finite `ok` values and discloses dose bands outside the
domain. Documents of `0.5.0` stay readable; a recipe without `readiness` now uses the default.

Version `0.21.0` (target) adds the **dough thermal model** (#176): the optional `thermal` object
on process steps (process.md), the `StepThermalChanged` event and the `doughTemperature`
observation (bake-session.md), the personal thermal profile (persistence.md) and the per-step
envelope in the dough result. All additions are optional; a step without `thermal` behaves as in
`0.20.0` and documents of `0.20.0` stay readable unchanged. The kinetic model keeps its version
`0.1.0`; the thermal sub-model is `flourprint.dough-thermal` `0.1.0`, named in the estimate's
assumptions as `thermal_model:0.1.0`. `CONTRACT_VERSION` and `ENGINE_VERSION` are bumped by the
implementing pull request, following the precedent of `0.18.0` (process.md, Steps before a target).
