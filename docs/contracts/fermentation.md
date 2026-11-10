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

- **Dough clock** (owner decisions of 2026-11-04, #231). Fermentation starts when the yeast or
  leaven first meets the flour and water, and the clock is read at the **end of the first-contact
  step** (process.md, Mixing steps, First contact): the progress `F` of the dough is 0 there. The
  mixing of the ingredients is so short that it changes little, so the counter starts after it;
  when the baker taps Next on that step the time is frozen and fermentation begins, even if a last
  stroke of the spatula is still being given. The first-contact step's own duration does not
  count; everything after it does (a kneading after the frasage, a fermentolyse, the bulk). In a
  plan the clock starts at the **planned end** of the first-contact step; in a bake, at its
  **actual completion** (Live recomputation). The contract used to start the clock at the end of
  the reference mixing step (the last main-dough mixing step) and to refuse a dough whose yeast
  was in earlier (`leaven_before_mixing`); both rules are retired. When the first-contact step is
  also the last mixing step, as in a lone `mix` or a lone `frasage`, nothing changes from the
  older rule.
- **Dough end point**: from the end of the first-contact step to the start of the bake, the dough
  is "ready to bake" (the baker's readiness decision, see Readiness profiles below). Kneading
  after the first contact, bulk, cold retard, shaping and proof are counted together: the state is
  never reset between steps (#9).
- **Dough steps**: the `asap` steps **after** the first-contact step and before the first **heat
  step** (a cooking operation, process.md: boiling bagels, grilling or frying a dough ends the
  fermentation as baking does) in the graph, in process order; kneading steps among them, each
  with its own duration. The **first-contact step is not a dough step**: it has no fermentation
  clock, so it is not listed in the per-step results and no gate that asks for a dough step
  accepts it (bake-session.md), with one exception since 0.26.0: a `doughTemperature` reading is
  accepted on it as the start of the clock (Dough temperature); its conditions give the dough's starting temperature (Dough
  temperature). `alap` steps (preheating) never hold the dough, and a step before the first
  contact (an `autolyse` without yeast, the weighing) is not a dough step either. They must form
  one sequence, each after the previous one; dough steps in parallel (two rests side by side) are
  `insufficient_data` (`non_linear_dough_path`) until split masses are modelled. A step with no
  planned duration contributes zero time (listed in the assumptions, Results). Without a main-dough
  mixing step the estimate is `insufficient_data` (`no_mix_step`), without a first-contact step it
  is `insufficient_data` (`no_first_contact_step`, `missing: ['incorporations']`, process.md), and
  when every dough step is a mixing step, or there is none after the first contact, there is no
  fermentation step to estimate (`no_fermentation_step`); without a heat step, every `asap` step
  after the first contact counts. A **fermentation step** is a dough step that is not a mixing step
  (a rest, bulk, proof, retard…): only a fermentation step can be model-driven (Model-driven
  duration) or judged ready (`doughReady`, bake-session.md); a mixing step always has a planned
  duration.
- **Preferment end point**: a poolish or biga is "ripe" (#33 objection 5), at progress 1.
- **A preferment keeps its own clock**, from the **end of its own first-contact step** (owner
  decisions of 2026-11-04, #231; process.md, Subjects and component phases): the preparatory
  `frasage` or `mix` of the poolish ahead of its fermenting phase does not count, and fermentation
  starts when it ends. The estimate is the time of the fermenting phase (the step with operation
  `preferment`, or the legacy step with the component's id), whatever the dough does, and the
  dough's clock does not wait for it. A component with no mixing step of its own has its clock
  start at the start of its fermenting phase. Nothing else about a preferment changes. A preferment
  step with no condition temperature of its own takes the room temperature of the recipe: the
  first-contact step's, else the reference mixing step's; with neither, its estimate is
  `insufficient_data` (`temperature_unknown`).
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

The dough is modelled from the end of the first-contact step, when its clock starts; the
temperature it starts from is set by the conditions of the first-contact step.

- **Basic mode** (default, nothing measured): the dough starts, at the end of the first-contact
  step, at that step's own ambient temperature (its condition temperature, else the first dough
  step's that has one). With none, the estimate is `insufficient_data` (`temperature_unknown`,
  `missing` the first-contact step's `temperatureC`).
- **Two room temperatures.** The room the dough **starts** in is the first-contact step's; the room
  of the **water** calculation (Water temperature, below) is the reference mixing step's. Two steps
  of a recipe are often one (a single `mix` that brings the yeast): then one value serves both. When
  they differ (a `frasage` that brings the yeast, then a `mix`), each is read where it is stated, so
  both steps need a temperature. During a Preparation a room change follows the room line to every room step, up or down (bake-session.md, The room line); an interface that edits a recipe shows each room on its own step.
  The dough's start in advanced mode is the target dough temperature (below), not the room.
- **Advanced mode**: the reference mixing step (process.md) declares a target dough temperature
  (`conditions.doughTemperatureC`); the dough starts at it, **at the end of the first-contact
  step**, whichever mixing step carries the target. ASSUMED: the target is the temperature the
  dough has when its clock starts; the model applies it from the end of the first-contact step
  and lets the lag below carry the dough from there, so a target far from the ambient is followed
  by a drift during the kneading steps that remain. With a first-contact step that is also the
  reference mixing step (the common case) this is the temperature of the dough at the end of its
  mixing. A measurement of the dough at that instant replaces this assumption (next bullet).
- **Measured start** (0.26.0, owner decisions of 2026-11-09 and 2026-11-10). A `doughTemperature`
  observation whose effective instant lies within the first-contact step (bake-session.md,
  Preparation temperatures; a reading has no step gate and is placed by its instant) is the
  temperature of the dough
  when its clock starts, whatever the mode. Where the dough starts, in order: the measured reading
  in force, else the target dough temperature (advanced mode), else the first-contact step's
  effective ambient (basic mode). The forecast names which one it used as the assumption
  `dough_start:reading`, `dough_start:target` or `dough_start:ambient`, and names each step whose
  effective ambient comes from the baker (an `AdjustStep` or a room change) as `ambient_adjusted:<stepId>`. A **suggested**
  dough target (Suggested dough target, below) is never a start: it guides the baker and feeds the
  liquid target, and only a target the recipe declares, or a reading, starts the dough.
- Between steps, and inside each dough step, the dough follows the step's condition temperature
  with a first-order lag `dT/dt = (T_condition − T) / τ`, τ within its range (0 = it follows at
  once). A step without a condition temperature keeps the previous one; with none at all, the
  estimate is `insufficient_data`. For a step that carries thermal inputs, `τ` and its band come
  from the Dough thermal model below; for any other step `τ` is 1.5 h, band 0 to 3 h. The band of
  `τ` enters the envelope instant by instant and step by step, never as one value shared by the
  whole path (The band and the envelope).
- A measured dough temperature (an observation during a bake) replaces the estimate from that
  instant (bake-session.md, `doughTemperature`); planning uses the plan. A reading on the
  first-contact step is the dough's start (Measured start, above). A core-probe reading
  replaces the **mean** state through `γ_core` (below).
- The mixing machine's friction is not a heat source of the model: it enters only the water
  temperature below and, through the target, the starting temperature.

## Dough thermal model (#176)

Status: **proposal of 2026-10-25**, basis: the final collation of #176 (five research reports,
Claude run deferred). Thermal sub-model `flourprint.dough-thermal` version `0.1.0`. The kinetic
law (`A`, `k`, `Ea`, conversions) is **unchanged**; the thermal model changes only the dough
temperature `T̄(t)` that law is evaluated on. Every constant has a provenance entry in
`docs/science/fermentation-model.md` (section 14). They are priors from reports, mostly ASSUMED
or secondary, not validated on dough: the model is a first-principles estimate whose personal
factor (below) is calibrated on the owner's own readings. Issue #176 stays open until those
readings exist.

### Units

`R` = 8.314462618 J/(mol·K); `Ea` in J/mol (98 300); temperatures in the formulas of this section are
in K where they enter `Ea/(R T²)` and in °C elsewhere (differences are the same). The formulas of
this section are written in SI: `τ`, `t` in **seconds**, `rate` in 1/s (the per-hour `dF/dt` of the
kinetic law divided by 3600), `ΔT_ad` in K per unit `F`, so `ΔT_ad · rate` is in K/s. Hours and
K/h appear only in prose and tables, for reading; the dimensionless `ψ`, `Bi_R` and `γ_core` do not
depend on the unit. The persisted values are unchanged (grams, °C, seconds, process.md).

### Scope and default

- A step **carries thermal inputs** when it has a `thermal` object (process.md, Thermal inputs).
  Only such a step uses the model below.
- **Default behaviour, guaranteed.** A step with no `thermal` object keeps today's lag: `τ` =
  1.5 h, band 0 to 3 h, no self-heating (`ΔT_ad` = 0), no new flag. A process with no `thermal`
  anywhere has the same **central** values as in contract `0.20.0`, and every value of every case
  of `fixtures/fermentation/cases.json` stays valid unchanged: the dough clock of `0.24.0`
  (Versions) starts at the end of the first-contact step, which in those cases is their only
  mixing step, so none of their values moved, and the thermal model itself is untouched. One correction applies to every
  process: `0.20.0` took the band corners `τ` = 0 and `τ` = 3 h for the whole path at once, which
  understates the envelope when the dough both cools and warms (and can leave the central value
  outside its own band, fixture `thermal/cases.json` case g). From `0.21.0` the band follows the
  envelope rule below. Only the `range` of a path with such a reversal changes, and only by
  widening. The only addition to the dough result
  is the optional per-step list `steps` (The band and the envelope): it is present for every dough
  estimate, thermal or not, as a purely additive, non-breaking output; the existing keys and their
  values are unchanged and a consumer may ignore it. The thermal model is never switched on by a default, by an environment
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
otherwise proofed. `F*` is the end-point target of the step's mass under the recipe's readiness
profile (Readiness profiles: `readyProgress`), not the preferment's 1.

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

| Case                                                           | Cover assumed | `τ_eff` |
| -------------------------------------------------------------- | ------------- | ------- |
| 250 g ball, plastic box, static fridge                         | `lid`         | 1.75 h  |
| 500 g bulk, glass bowl, static fridge                          | `lid`         | 1.84 h  |
| 2 kg bulk, glass bowl, static fridge                           | `lid`         | 3.31 h  |
| 900 g boule, banneton with liner, static fridge                | `none` (open) | 2.87 h  |
| 800 g tin, aluminium, still room                               | `none` (open) | 1.59 h  |
| 250 g sheet, aluminium tray, static fridge (bare metal, `h` 5) | `none` (open) | 0.49 h  |

They sit at the **fast end** of the reports' spread (2 kg bulk: 3.31 h against 3.5 – 7.3 h; 900 g
boule: 2.87 h against 3.0 – 6.7 h; 800 g tin: 1.59 h against 1.7 – 2.1 h; the 250 g ball, 1.75 h,
is inside 1.3 – 3.4 h). Three choices push them there: `h_ext` 8 includes radiation (the
convection-only reports use 2.5 – 4 and give the slow end), the hemisphere and sphere expose more
surface than a compact shape, and the cover resistances are central values (the lid band reaches
0.39). The thermal band below reaches the slow end (2 kg: 6.67 h), and the personal factor is what
corrects the central value on the owner's own containers; neither is a claim that the central
value is the most likely one.

### Core temperature (probe comparison)

A probe in the centre reads further from the ambient than the mean:

```text
T_core − T∞ = γ_core (T̄ − T∞),    γ_core = (1 + Bi_R/2) / (1 + Bi_R/(p + 2))
```

With self-heating (`ΔT_ad` > 0) the reference is the moving equilibrium instead of the bare
ambient: `T∞` in the formula is `T_eq = T_amb + ΔT_ad · rate(T̄, d) · τ_eff`, so the core is the
mean's deviation from where the dough is heading, amplified by `γ_core`. The result is clamped
between the temperature at the start of the transition and `T∞` (`T_eq` with self-heating): a core
never lies beyond where the dough started or is heading, and when `T̄` itself lies beyond both ends
(heating above a warmer start) the core is the mean. The fixtures a and b are the isolated
cooling case, `ΔT_ad` = 0. The factor is a first-mode result: it is exact late
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
rate(T_amb, d)` with the central `ΔT_ad` and the **effective** lag, `τ_eff` after the personal factor
  (`f · τ_eff`, Personal correction; `f` = 1 without one), since a slower dough is the riskier one.
  A step of zero duration integrates nothing and is not tested. The calibration estimator uses
  the same `ψ` with the factor it is fitting (Personal correction). An equilibrium exists only if
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
  not a confidence interval. A personal factor scales it, and narrows it only under the rule of
  Personal correction (below).
- **It replaces the 0 – 3 h range for that step**. Steps without thermal inputs keep 0 – 3 h.
- **The lag enters the envelope per instant, not as a shared corner.** A slow dough (high `τ`)
  ferments more while it cools (it stays warm) and less while it warms (it stays cold). On a path
  that both cools and warms (room, fridge, room; a container change), the extremes of the progress
  therefore need the slow end of the band on some steps and the fast end on others: taking the low
  or the high end of every band at once understates the envelope (fixtures g and h). The contract
  bounds the dough temperature by two paths instead:
  - the **upper path** takes, at every instant, `τ` at the top of the step's band while
    `T̄ > T_amb` and at the bottom while `T̄ < T_amb`, and `ΔT_ad` at the top of its range;
  - the **lower path** takes the opposite ends, and `ΔT_ad` at the bottom.

  For a scalar first-order equation this is the comparison principle: every path whose `τ` and
  `ΔT_ad` stay inside their bands, varying freely from step to step and within a step, stays
  between the two. The rate rises with the temperature for every kinetic corner, so the upper path
  gives the most progress at every instant (the earliest end), and the lower path the least (the
  latest). Without self-heating the dough never crosses the ambient within a step, so each path
  holds one `τ` per step. The bands of different steps are treated as **independent**, although
  the same fridge or the same bowl correlates them: the envelope is therefore conservative. It
  never leaves out a path the bands allow, and may be wider than any single physical path. It is
  not a confidence interval.

- **The envelope of an estimate** is the minimum and maximum over every combination of the
  kinetic ranges (`A`, `k`, `Ea`, conversions), the two ends of the readiness band, and the two
  thermal paths. The two paths replace the two shared corners of `τ` of `0.20.0`, so the count is unchanged (64 per dose) and does not grow with the number of steps.
  Every combination is computed: none is sampled or dropped. A combination that fails (Semenov
  bound, temperature gate, horizon) follows the existing rule: the central estimate stands and the
  estimate has no `range` and the assumption `band_unbounded`. The Semenov test of the upper path
  uses its `τ` and its `ΔT_ad`.
- **Propagation along the process.** The contract already simulates the whole dough path with the
  state carried from step to step and takes the combinations end to end (State and equations,
  Dough temperature, Results). Each step therefore starts from the earlier steps' envelope, not
  from a point, and the last fermentation step before the bake carries the widest band. Earlier transitional
  fermentation steps may be planned on fixed durations; the model-driven step
  (`durationMode: 'model'`) is normally the last one. Thermal inputs on a **fixed-duration** step
  still determine the dough temperature, and therefore the progress `F`, during that step, and
  through them the estimate and the band of the final model-driven step. The fixed step keeps its
  duration (the model never changes it), its own readiness cues and ranges are optional for
  display (ledger L146), and only the model-driven step absorbs the variation.
- **Per-step envelope exposed.** The dough result lists, for every dough step, `steps: Array<{
stepId; endProgressPct: Estimate; endTemperatureC: Estimate }>`, each with its `range` over the
  same corners, so the interface can show "likely time + range" at each step (ledger L145). These
  are computed outputs, never persisted as inputs.
- **Divergence on the final step.** On the last fermentation step before the bake, a recorded
  readiness observation (poke test, `doughReady`) prevails over the model when they diverge; the
  interface shows both, and the model's end is never shown as ready.

### Personal correction

A personal factor `f` multiplies `τ_eff` for a **key** `(material, cover,
environment)` of the step: `τ_personal = f · τ_eff`. Each calibration **set** (the readings of one
step of one bake, below) gives its own factor `f_i`, stored with the mass and the geometry of
that step. The key's factor is the geometric mean of its sets. Default `f` = 1; a key with no stored factor (an unmatched key) uses `f` = 1, silently, with no
warning and no assumption code. The factor is stored in a versioned personal thermal profile
(persistence.md), not in the recipe, and changes no kinetic constant (section 11 of the science doc). A factor outside 0.25 – 4 is refused
(`thermal_factor_implausible`; the bounds are an ASSUMED guard against a wrong probe position).
An estimate that used a stored factor names it in its assumptions: `thermal_factor:<key>=<value>`.

The key is `(material, cover, environment)` and nothing else, to stay simple: the liner (a 0.02
m²K/W term inside the banneton's) and the geometry class are not in it. The factor is therefore
assumed to transfer between masses and geometries of the same key; whether it does is not known
(GPT) and the owner's readings in two masses are the test. Divergence between masses is a reason
to refine the key later, not a licence to widen it now.

The model already computes mass and geometry; the factor corrects mostly the air side and the
cover (69 – 77 % of the resistance of a covered glass bowl in a fridge, Argon report on #176), which
scale alike across masses. That is why the key leaves geometry out. Whether this holds is tested,
not assumed:

| Sets stored for the key                | Factor             | Band of `τ` for the step                                                                                | Assumption                              |
| -------------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| none                                   | 1                  | the thermal band                                                                                        | none                                    |
| one                                    | `f_1`              | the thermal band times `f_1`: one set shows no reproducibility, so it moves the estimate, not the width | `thermal_factor:<key>=<f>`              |
| two or more, `max f_i / min f_i` ≤ 1.5 | geometric mean `f` | `[min f_i, max f_i] · τ_eff` (central `τ_eff`), widened to at least `f · τ_eff · [0.85, 1.15]`          | `thermal_band_calibrated:<key>:<count>` |
| two or more, `max f_i / min f_i` > 1.5 | geometric mean `f` | no narrowing: the union of the thermal band times `f` and `[min f_i, max f_i] · τ_eff`                  | `thermal_factor_inconsistent:<key>`     |

The ±15 % floor and the ×1.5 threshold are ASSUMED (an informal home probe, fill and shelf that
vary). A narrowed band says the owner's readings agree with each other; it is **not** a
statistically validated interval and is never presented as one (ledger L145: narrower once the
baker's readings have calibrated the factor). Only the thermal band narrows: the kinetic and
readiness ranges stay as they are, so the whole envelope narrows in part. An inconsistent key is
the signal that the key is too coarse: the sets' masses and geometries show where it breaks.
Worked cases: `fixtures/thermal/cases.json`, case i.

**Informal measurements.** The owner's readings come from a home probe, not a laboratory protocol:
probe position, shelf temperature, container and fill vary between bakes. They calibrate **a
personal factor**; they are not a universal validation of the model, and must never rewrite a
constant of this contract or be presented as such.

Estimators from readings `(t_i, T_i)` taken after a step to a stable ambient `T_amb`:

- **Two points**, the **first and the last** reading taken after the initial transient (at least
  0.5 `τ_eff` after the step), with `T_amb` known: `τ_obs = (t₂ − t₁) / ln((T₁ − T_amb)/(T₂ − T_amb))`.
  The late-time slope is the same at the core and on average, so it does not depend on the probe
  position.
- **Three equally spaced points** (Guggenheim, `Δt` apart): `τ_obs = Δt / ln((T₁ − T₂)/(T₂ − T₃))`,
  `T∞ = (T₁T₃ − T₂²)/(T₁ − 2T₂ + T₃)`. It also gives `T∞`, which captures a shelf offset or
  self-heating without knowing the shelf temperature. A reading set with `(T₁ − T₂)/(T₂ − T₃) ≤ 1`
  or a non-finite result is rejected (`readings_invalid`). Among the usable readings the
  estimator considers every equally spaced triple, two gaps `g₁` and `g₂` being equal when
  `|g₁ − g₂| ≤ 0.10 · (g₁ + g₂) / 2` (10 % of their mean), keeps those that give a valid result
  (ratio above 1, finite `τ_obs` and `T∞`) and takes the one that spans the longest time; on a
  tie, the earliest. A triple that fails does not hide a narrower valid one (a probe moved at the
  last reading still calibrates from the earlier ones). With no equally spaced triple, or none
  valid, the set is `readings_invalid`. The set records only the three readings it used.
  Worked case: `fixtures/thermal/cases.json`, case k.
- **Factor of the set.** The observed lag is the coupled one, `τ_obs = f · τ_eff / (1 − ψ)`, and
  `ψ` grows with the lag being fitted: `ψ = f · ψ₁`, where `ψ₁` is the Semenov number above
  computed at the reading's ambient with `f` = 1. With `r = τ_obs / τ_eff`, solving
  `f = r · (1 − f · ψ₁)` gives `f_i = r / (1 + r · ψ₁)`. The result depends on the readings and
  the model only, never on factors stored earlier, so calibrating in any order gives the same
  sets. A set with `f_i · ψ₁ > 0.1` is rejected (`self_heating_confounds`). With no self-heating
  (`ψ₁` = 0, fixture d) `f_i = r`.
- Readings before 0.5 `τ_eff` after the later of the step start and the last thermal change are
  kept in the journal but not used (core lag). The ambient must be the same over the readings
  used; otherwise the set is refused.

**Calibration order**: thermal first, on weakly fermenting dough (cold, low dose or a dummy
mass); only then the heat term. A constant heat offset cannot be identified from a single cooling
curve. Automatic learning (N2) is deferred; this contract fixes the estimators and the storage.
The fixtures give worked cases (`fixtures/thermal/cases.json`, case d; with self-heating, case j).

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
in force (a `StepThermalChanged` starts a new segment, bake-session.md). **The dough clock starts
at the recorded completion of the first-contact step** (owner decisions of 2026-11-04, #231): the
instant the baker completes it, whatever its planned duration was, so a frasage planned for 5 min
and completed after 9 starts the clock 9 min after its own start. A first-contact step that was
never completed ends when the next step starts. Until it is completed the dough has no progress
(`progressNowPct` is 0), and the time the dough needs is counted from the end the first-contact
step is projected to have: its planned remainder, or now when it has already run past its plan.
The dough then starts from the measured first-contact reading, else the target dough temperature,
else the first-contact step's effective temperature (Dough temperature, Measured start), and it stays in the first-contact step's conditions if the step after it is
recorded as starting later than it ended, as between any two steps (the dough does not wait
for a late tap). Completing a step fixes its recorded end, and
everything after it is projected from that end and from the state the dough had then. This is the replanning rule that already holds for times (process.md, Projection:
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

- `T_room` is the reference mixing step's condition temperature (not the first-contact step's when
  the two differ: Dough temperature, Two room temperatures); without it the water temperature is
  `insufficient_data` (`temperature_unknown`, `missing` the reference mixing step's `temperatureC`); `T_flour` defaults to `T_room`;
  `T_preferment` defaults to the preferment step's condition temperature.
- `friction` defaults to 0 °C and is the user's to set (`conditions.frictionC` on the reference mixing step):
  mixers differ, and a few measured doughs calibrate it (#32). With the default, the result says
  that friction is not counted.
- A result below 0 °C or above 60 °C is returned with that flag, never clipped.

The formula is the base-temperature method for the **liquid** the dough receives: water, or another
liquid (milk, beer) taken as the water. The planned result above (`waterTemperatureC`, from the
recipe's own values) is unchanged. A Preparation reads the formula with the values it knows instead
(Liquid target, next).

### Liquid target (0.26.0, owner decisions of 2026-11-09)

In planning and during a Preparation the engine gives the **target temperature of the liquid** for a
**target dough temperature**, with every input named by its source (values-and-units.md,
`TemperatureSource`). All of it is optional for the baker: a measurement improves the target and a
missing one never blocks anything.

```ts
interface TemperatureTargets {
  asOf: Instant; // the instant whose facts were read (the plan alone in planning)
  doughTarget: {
    valueC: number;
    source: 'recipe' | 'suggested'; // conditions.doughTemperatureC, else the suggestion below
    suggestion?: Estimate; // the full suggestion with its range, when source is 'suggested'
  };
  liquid: Estimate; // the target liquid temperature, °C, with its assumptions
  inputs: {
    n: 3 | 4; // 4 with a preferment
    room: TemperatureInput; // the reference mixing step's effective ambient
    flour: TemperatureInput; // measured, else assumed at the room
    preferment?: TemperatureInput; // present with a preferment: measured, else its step's, else the room
    friction: TemperatureInput; // planned (conditions.frictionC), else assumed 0
  };
  liquidMeasured?: TemperatureInput & { deviationC: number }; // measured − target, same instant
  doughStart: TemperatureInput & { basis: 'reading' | 'target' | 'ambient' }; // Dough temperature
}
```

- **Formula.** `T_liquid = n × T_dough_target − T_flour − T_room − T_preferment − friction`, exactly
  the base-temperature method above, with the values in force:
  - `T_room` is the **effective** room of the reference mixing step at the instant read (the room
    line, up or down, and its own `AdjustStep`, whichever is later: bake-session.md, The room
    line): `adjusted` if either applies, else the plan (`planned`). Without either, the
    liquid target is `insufficient_data` (`temperature_unknown`) as before.
  - Readings are placed by their effective instant: only those at or before the end of the
    first-contact step count here (later ones are `reading_after_mixing`, bake-session.md).
  - `T_flour` is the `flourTemperature` reading in force (`measured`), else `T_room`
    (`assumed`, assumption `flour_at_room_temperature` as before): it follows the effective room.
  - `T_preferment` is the mean of the preferments' temperatures, each the `prefermentTemperature`
    reading in force for its component (`measured`), else the temperature of its last fermenting
    phase (effective ambient, `planned` or `adjusted`), else `T_room` (`assumed`,
    `preferment_at_room_temperature`). Absent without a preferment.
  - `friction` is the reference mixing step's `conditions.frictionC` (`planned`), else 0
    (`assumed`, `friction_not_counted`). No measurement changes it in this version (bake-session.md,
    Calibration data).
- **Dough target in force.** The recipe's `conditions.doughTemperatureC` (`recipe`, advanced mode),
  else the suggested dough target (`suggested`) when it is `ok`, else no target and no liquid
  target. A recipe with no declared target therefore gets both suggestions in basic mode: the dough
  target the plan implies and the liquid that reaches it. The planned `waterTemperatureC`
  stays absent without a declared target, as before.
- **Deviation.** When a `liquidTemperature` reading is in force, `liquidMeasured` carries it and
  `deviationC = measured − liquid target`. Live, the target is the one just computed; afterwards it
  is the one **recorded** with the reading (`TemperatureTargetsRecorded`, trigger `liquidMeasured`,
  bake-session.md, Recorded targets), never recomputed; without a recorded one there is no
  deviation. The deviation is information, not a correction: nothing is refused because of it.
- **Lifetime.** The targets are offered from the start of the Preparation until the first-contact
  step is completed, and in planning. After that the liquid is in the dough: the result is no
  longer computed live, and what remains is the recorded facts, the friction sample and the
  temperature outcome (below).
- **Sources are always reported.** Each input says `planned`, `adjusted`, `measured` or `assumed`.
  A result built only from planned values carries no `measured` input, so the interface can say
  that the target rests on the plan.
- **Out of range.** A target below 0 °C or above 60 °C is returned with `water_below_0C` or
  `water_above_60C` as above, never clipped.

Worked cases: `fixtures/temperatures/cases.json`, W1 to W6, and the examples below.

**Examples (hand-worked, units °C).** Target dough 24, no preferment, no friction.

1. **Plan alone.** Room 22 (`planned`), flour at the room: `3 × 24 − 22 − 22 = 28`.
2. **The room is warmer today.** The baker notes the room at 26 (`adjusted`); the flour, assumed
   at the room, follows: `72 − 26 − 26 = 20`. The target falls by 8 because both the room and the
   assumed flour rose by 4.
3. **The flour was measured.** Same room 26, flour measured at 18 (cold from the garage):
   `72 − 18 − 26 = 28`. The flour is 8 below what case 2 assumed, so the liquid must be 8 warmer.
4. **With a friction.** Case 3 with `frictionC` 6 declared on the mixing step: `72 − 18 − 26 − 6 = 22`.
5. **With a poolish.** Target 24, room 22, flour at the room, poolish measured at 20, friction 5,
   `n = 4`: `96 − 22 − 22 − 20 − 5 = 27`.
6. **A measured liquid.** In case 3 the baker measures the water at 31: `deviationC = 31 − 28 = +3`.
   The dough should then come out about `3 / 3 = 1` °C above its target if every other input
   holds, which the baker confirms or not with the dough reading.
7. **The room cools.** Planned room 22; the baker notes 19 (`adjusted`), the flour, assumed at the
   room, follows: `72 − 19 − 19 = 34`. A colder room asks for a warmer liquid, as a warmer one asks
   for a cooler liquid (case 2).

### Suggested dough target (0.26.0, proposal: owner confirmation requested)

Status: **proposal of 2026-11-09**, requested by the owner (item 3 of the decisions of that date);
every ASSUMED value below is an owner choice to confirm. When the recipe declares no
`conditions.doughTemperatureC`, the engine **suggests** the temperature the dough should have when
its clock starts so that the model reaches the planned fermentation in the planned durations. The
suggestion is shown with its range. It is advice: it never starts the forecast (Dough temperature),
is never written into the recipe, and is applied to the recipe only by an explicit edit of
`doughTemperatureC`.

**Definition.** Let the _dough steps_ be those of What it predicts (after the first-contact step, up
to the first heat step, in order), `d_i` the planned duration of each and `T_i` its ambient, and
`F*` the central end point of the recipe's readiness profile (`readyProgress`). Let `F(T₀)` be the
progress at the **end of the last dough step** when the dough starts at `T₀` at the end of the
first-contact step and follows the model: the kinetic law, the lag and any thermal inputs and
self-heating of the steps (central values), the yeast dose of the dough. The suggestion is the `T₀`
with `F(T₀) = F*`.

**Rule.**

1. **Scope.** The dough only. A preferment keeps its own temperature, the one of its steps.
2. **Steps and durations.** All the dough steps, mixing steps among them, each at its planned
   duration as stored. A model-driven step (Model-driven duration) counts at its stored value, the
   editor's last suggestion: the suggestion is never recomputed from itself. In a Preparation the
   _effective_ plan is read: a duration or ambient the baker adjusted (`AdjustStep`) counts, a
   completed step cannot occur (the targets end when the first-contact step is completed). A step
   with no planned duration contributes zero time, as in Results. The ambient `T_i` is the step's
   effective ambient; a step without one keeps the previous, the first dough step taking the
   first-contact step's. The first-contact step's own ambient is not needed.
3. **Solving.** Bisection on the forward simulation over `[1.7, 35] °C`, the gate of the Domain
   table, to 0.001 °C: the same method as the inverse dose, never a separate formula. `F(T₀)` does
   not decrease when `T₀` rises (the rate rises with temperature; the comparison principle of the
   thermal model), so the bisection is valid. A candidate whose path fails the Semenov bound or
   leaves the temperature gate counts as above `F*`.
4. **Preconditions.** A dough estimate that cannot be made for a reason independent of `T₀`
   gives the same status and reason, with no suggestion: `unsupported` (no commercial yeast…),
   `insufficient_data` (yeast form, a step temperature unknown: `temperature_unknown`), a dose
   outside 0.01–3 % (`out_of_domain`). No dough step with a planned duration:
   `insufficient_data`, `no_planned_fermentation`.
5. **No solution.** If `F(35 °C) < F*`, the status is `out_of_domain` with reason
   `plan_unreachable_too_slow`: even the warmest dough in the model's domain is too slow for the
   plan. If `F(1.7 °C) > F*`: `out_of_domain`, `plan_unreachable_too_fast`. In both the plan, not the
   temperature, has to change; the interface says so.
6. **Usual window.** A solution outside **15 – 32 °C** (ASSUMED: the range of doughs that can be
   mixed with ordinary water) is still `ok`, never clipped, and carries the extrapolation
   `dough_target_below_15c` or `dough_target_above_32c`.
7. **Range.** Two more solutions of the same plan, with every dough-step duration **multiplied** by
   the predictive factor for the lower end (a slower plan needs a colder dough) and **divided** by it
   for the upper end. The factor is **1.9**, the root-mean-square error factor of the model on
   published practice (docs/science/fermentation-model.md, section 15: ×1.89), ASSUMED to apply
   to the planned durations. It is a statement about the model's error on other people's recipes,
   not a confidence interval and not the corner envelope of the estimates. An end with no solution
   in `[1.7, 35]` leaves the estimate without `range` and with the assumption
   `band_unbounded:below`, `band_unbounded:above` or `band_unbounded:below+above`.
8. **Result.** An `Estimate` in °C: `value`, `range?`, `model` the kinetic model, assumptions
   `dough_target_solver:bisection`, `ready_target_progress:<F*>` and `predictive_factor:1.9`, plus
   the thermal assumptions of the dough estimate. The interface rounds for display to 0.5 °C.
   It is recomputed from the current plan after every edit and is not stored.
9. **When it applies.** Only when the recipe declares no target dough temperature. With a declared
   target the recipe's own value is used and nothing is suggested.

**Reading the range.** The lag is 1.5 h by default, so a long step at a steady ambient pulls the
dough toward it and the starting temperature matters less: the more of the plan is spent at a steady
ambient, the wider or the more open the range. Cases E2 and E3 show it; this is a property of the
model, not a defect, and the interface presents the suggestion as a guide.

**Examples** (fixtures `temperatures/cases.json`, E1 to E5, computed outside the engine). Direct
dough, default readiness profile (`F*` = 1), a 10 min `mix` at 24 °C as the first-contact step, then:

1. **E1.** 0.25 % instant yeast (0.758 % fresh-equivalent); bulk 1 h at 24, fridge 10 h at 4, proof 1 h
   at 24. Suggestion **27.07 °C**, range **12.82 – 32.13 °C** (the plan stretched ×1.9 needs a 12.8 °C
   dough, shortened ÷1.9 a 32.1 °C one). Both ends exist.
2. **E2.** 0.2 % instant, bulk 2 h at 24, fridge 12 h at 4, proof 1 h at 24. Suggestion **23.11 °C**.
   The plan stretched ×1.9 is too fast even at 1.7 °C: no `range`, `band_unbounded:below`.
3. **E3.** 0.4 % instant, same schedule as E2. Suggestion **10.14 °C**: `ok`, extrapolation
   `dough_target_below_15c`, `band_unbounded:below`. In a 22 °C room the liquid target for it is
   `3 × 10.14 − 22 − 22 ≈ −13.6 °C`, flagged `water_below_0C`: the plan has too much yeast.
4. **E4.** 0.01 % fresh yeast, bulk 3 h at 22: even a 35 °C dough does not finish in time:
   `out_of_domain`, `plan_unreachable_too_slow`.
5. **E5.** 0.9 % instant, 4 h and 1.5 h at 22: even a 1.7 °C dough is ready too early:
   `out_of_domain`, `plan_unreachable_too_fast`.

### Friction samples (0.26.0, data only)

A **friction sample** is the friction a Preparation implies, derived from its recorded temperatures
by inverting the base-temperature method. It is the data for a later calibration of
`conditions.frictionC` (owner decisions of 2026-11-09, #32); **how** a calibration uses samples
(estimator, per-mixer or per-recipe grouping, storage as a personal profile, when it replaces the
default of 0) is a later contract and is not decided here.

```ts
interface FrictionSample {
  recipe: { id: string; version: number }; // the Preparation's recipe revision (analysis export: version only)
  stepId: StepId; // the reference mixing step whose frictionC it informs
  firstContactStepId: StepId;
  equipment?: EquipmentRef; // the appliance of the reference mixing step, when it names one (equipment.md)
  n: 3 | 4;
  frictionC: number; // n × T_dough − T_flour − T_room − T_liquid − T_preferment
  inputs: {
    dough: TemperatureInput & { position: ProbePosition };
    liquid: TemperatureInput;
    flour: TemperatureInput;
    room: TemperatureInput;
    preferment?: TemperatureInput;
  };
  plannedFrictionC?: number; // conditions.frictionC at the time; absent = the default 0, not counted
}
```

- **Eligibility.** A sample exists when all hold: a `liquidTemperature` reading is in force whose
  effective instant precedes the dough reading's; a `doughTemperature` reading has its effective
  instant between the start of the **reference mixing step** and **10 minutes** (ASSUMED) after that
  step's recorded end (or now, while it runs); when several readings qualify, the **latest in
  force** (latest effective instant, ties by `seq`) is the one used; late entries count, since
  only instants matter; the room is known
  (the effective ambient of the reference mixing step, as the liquid target reads it); neither the
  liquid nor the dough reading has `method: 'reported'`. The inputs are those **in force at the dough
  reading's instant**, with the flour and the preferment `measured` or `assumed`, exactly as the
  liquid target reads them. A Preparation without both readings has no sample.
- **Meaning of the measured dough.** The water method's friction term stands for all the heat the
  mixing adds before the dough is at its target, so the dough is read at the end of the **reference
  mixing step** (Water temperature). When that step is the first-contact step (a lone `mix`, the
  common case) this is also where the model starts the dough. When the first-contact step comes
  earlier (a `frasage`, then a `mix`), a reading at the end of the first contact would miss the
  later mixing and understate the friction, so such a reading is **not** a sample; the reading on
  the reference step is, and the sample carries the assumption `friction_after_first_contact` (the
  dough clock had started, and the drift toward the room during the mixing is not corrected).
- **Quality is the sources.** Flour `assumed` at the room, or a preferment `assumed`, make the
  sample a coarser estimate: with an assumed flour the error of a sample is that flour's departure
  from the room. The sample carries the sources so that a calibration can weigh or leave out its
  samples. Nothing here fixes a threshold.
- **Derived, not stored, and deterministic.** The sample is arithmetic on recorded facts, with no
  engine call. The inputs "in force" are a pure function of the log (latest by `observedAt`, ties by
  `seq`; the planned friction and rooms from the snapshot), so every reader that replays the same log
  gets the same sample, whatever the engine or the app version. It is available after the end of the
  Preparation. Unlike the targets, it needs no frozen copy, because nothing in it depends on the
  engine.

**Examples.** `n = 3`, room 22 (`planned`), liquid measured at 27, dough measured at 25.

1. **F1.** Flour measured at 20: `3 × 25 − 20 − 22 − 27 = 6 °C`. The liquid had been aimed at a
   dough of 23 °C with no friction (`3 × 23 − 20 − 22 = 27`); the dough came out at 25, so the
   mixing added `3 × 2 = 6 °C` that the default of 0 ignored.
2. **F2.** The same readings without a flour measurement (assumed at the room, 22): `75 − 22 − 22 −
27 = 4 °C`. The 2 °C difference is the flour's departure from the room, which is why the sources
   travel with the sample.
3. **F3.** A poolish measured at 20 (`n = 4`), flour assumed at 22, room 22, liquid 27, dough 24.5:
   `98 − 22 − 22 − 27 − 20 = 7 °C`.

### Temperature outcome (0.26.0, data only)

For recipe-level calibration and for the baker's own review, a Preparation derives, from its
recorded facts, how its temperatures went against the plan. The targets in it are the **recorded**
ones (bake-session.md, Recorded targets), read from the `TemperatureTargetsRecorded` events and never
recomputed; without one the field is absent:

```ts
interface TemperatureOutcome {
  doughTarget?: { valueC: number; source: 'recipe' | 'suggested' }; // the recorded one, latest by seq
  doughStart?: TemperatureInput & { basis: 'reading' | 'target' | 'ambient' }; // what started the clock
  doughStartErrorC?: number; // measured start − target, when both exist
  liquid?: { targetC: number; measuredC: number; deviationC: number }; // when a liquid was measured
  adjustedRooms: Array<{ stepId: StepId; plannedC?: number; effectiveC: number }>;
}
```

It is derived data like the friction sample: carried by the exports, never stored itself (its
targets are stored in the events they come from), and not an input to anything until a calibration
contract says so.

## Domain

| Condition                                                                                                                                                                         | Result                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| no ingredient marked as commercial yeast, or a sourdough culture                                                                                                                  | `unsupported`                              |
| a step's temperature unknown, or the yeast form unknown                                                                                                                           | `insufficient_data` (named)                |
| fresh-equivalent dose outside 0.01–3 %, dough below 1.7 °C or above 35 °C (also reached by self-heating)                                                                          | `out_of_domain`                            |
| Semenov test of the dough thermal model `ψ > 1/e` (Dough thermal model)                                                                                                           | `out_of_domain` (`self_heating_unbounded`) |
| a preferment (on the dough and on the preferment's own estimate); added sugar > 5 %; added fat > 3 %; salt outside 1.5–3 %; total water outside 55–75 %; a needed content unknown | `ok` with `extrapolations` listing each    |
| evidence-limited: above 28 °C up to 35 °C; a cold step; cold steps totalling more than 72 h (Learning flags, below)                                                               | `ok` with `extrapolations` listing each    |
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

### Learning flags (0.25.0)

Three extrapolation codes mark the regimes where the evidence says the forecast is least reliable
(owner approval of 2026-11-07 to the proposal of #231, section 6; evidence in
`docs/science/fermentation-model.md`, sections 12 and 15, and #231, section 3). They are not an
exit from the fitted domain: the kinetic fit spans 3.9–30 °C, so most cold steps and a dough at
28–30 °C are inside it. They are **evidence-limited** flags, carried in `extrapolations` with the
others of the Domain table (values-and-units.md). The estimate is still given, `ok`, with the same
value and band; only the reasons change. The interface shows them next to the estimate, as it
shows every extrapolation, with the meaning "learning": the forecast is outside what the model has
been checked against. Reconciling that meaning with the existing message prefix of extrapolations
("Outside the model's data") is the interface's task; the new keys follow the French voice rules
(infinitive or impersonal, never addressing the baker).

| Code                      | Condition (per fermenting mass, central value)                                                                                                                                |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `dough_above_28c`         | its start temperature, the effective ambient of one of its steps, or a measured dough temperature it resets to is above 28 °C (and not above 35 °C, which is `out_of_domain`) |
| `cold_stage_uncalibrated` | one of its steps of non-zero duration has an effective ambient at or below 10 °C                                                                                              |
| `cold_hold_over_72h`      | the durations of its steps at or below 10 °C effective ambient add up to more than 72 h                                                                                       |

- **Which steps.** The same set for all three codes: the steps the mass's estimate models, that is
  the dough steps from the end of the first-contact step (Dough clock) for the dough, and the
  preferment's own steps for a preferment. Kneading steps after the first contact count like any
  other. A step of zero duration (planned or estimated) counts for no cold code. A cold preferment
  does not flag the dough, nor the reverse: growth before the mix is not modelled on the dough
  (State and equations), and the dough's estimate already carries `preferment`.
- **Which temperatures.** A step's **effective** ambient: its own condition temperature, or the
  one it keeps from the previous step when it has none (Dough temperature). For 28 °C, the inputs
  of the `out_of_domain` temperature gate: the temperature the dough starts from, each step's
  effective ambient, and any measured dough temperature that replaces the estimate during a bake
  (bake-session.md, `doughTemperature`). In basic mode the dough starts at the ambient. The
  thermal model's computed trajectory is not re-tested.
- **Which durations.** Each step counts with its planned duration, except the mass's last
  fermentation step, whose duration the estimate solves (Results): it counts with the **central
  estimated** duration, also when it has a planned one. When the end point is reached before that
  step (`end_point_before_last_step`), its estimated duration is 0 h. When the duration estimate
  is not `ok` there is no duration estimate to flag; the mass's other estimates (Results) count
  that step with its planned duration when it has one, else as 0 h.
- **Boundaries.** The 28 °C test is strict (28 °C does not flag); the 10 °C boundary is inclusive
  (a step at 10 °C is cold); the 72 h test is strict (exactly 72 h does not flag).
- **`cold_stage_uncalibrated` has no exit yet.** It means the cold end of the curve is a wide prior
  that the baker's own cold bakes with heights have not narrowed (#231). No contract yet defines
  a personal cold calibration, so every cold step carries it; the contract that defines one says
  when it stops.
- **Why these thresholds.** Above 28 °C: dough rise peaked at 25 °C in Birch 2013 (abstract only,
  `docs/science/sources.md`) while gas production keeps rising to 35–40 °C, and the shipped law is
  4 to 5.6 times too fast at 32 °C on Izzreen 2016, about 2.1 to 2.7 times once the thermal lag is
  credited (science document, section 2), so above 28 °C the model has no temperature-dependent
  retention. Cold: the 4 °C to 24 °C ratio is not measured and the published estimates range from
  0.2 to 3 % against 5.7 % shipped (section 12). Long holds: after 7 days at 5 °C the 2-h gas
  activity fell to 10 % of control in a sweet dough (15 % sugar, 3 % yeast) and to 35 % in a white
  bread dough (5 % sugar, 2 % yeast) (Kyogoku 1995), and a lean dough's rise at 4 °C peaked by
  day 4, then fell (Liu 2025, figure only, skimmed); no cited data point sits at 3 days. The
  28 °C and 72 h values come from the external report on #231; the 10 °C boundary is this
  contract's choice, the temperature below which the science document has only one dataset. All
  three are owner choices and change only by a contract pull request.

Worked examples. Lean dough, salt 2 %, water 65 %; a 10 min first-contact mix at the room
temperature of the first fermentation step; "proof estimated" means the last step, whose duration
the estimate solves. The codes of examples 1 to 6 do not depend on the solved duration; examples 7
and 8 state the dependence.

1. Fresh yeast 1 %. Bulk 2 h at 30 °C, proof estimated at 30 °C: `dough_above_28c`.
2. Fresh yeast 1 %. Bulk 2 h at 28 °C, proof estimated at 28 °C: no learning flag.
3. Fresh yeast 0.3 %. Bulk 1 h at 22 °C, retard 48 h at 4 °C, proof estimated at 22 °C:
   `cold_stage_uncalibrated` only.
4. The same with a 96 h retard: `cold_stage_uncalibrated` and `cold_hold_over_72h`.
5. The same with a 72 h retard: `cold_stage_uncalibrated` only (72 h is not more than 72 h). With
   a retard of 40 h at 4 °C followed by 32 h 1 min at 10 °C instead: both cold codes (10 °C is
   cold, and the cold steps add up to more than 72 h).
6. The same as 3 with the retard at 10.5 °C: no learning flag.
7. Fresh yeast 0.3 %. Bulk 1 h at 22 °C, retard 70 h at 4 °C, proof estimated at 8 °C:
   `cold_stage_uncalibrated`, and `cold_hold_over_72h` exactly when the proof's central estimated
   duration is more than 2 h (0 h if the end point is reached during the retard).
8. A poolish at 4 °C (its only step, whose duration its estimate solves), then a dough with a 2 h
   bulk and a proof estimated at 24 °C: the poolish's estimate carries `cold_stage_uncalibrated`
   and `preferment`, and `cold_hold_over_72h` too when its solved duration is more than 72 h; the
   dough's carries `preferment` only.

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
  duration or dose is an explicit edit. The same holds for the suggested dough target and the
  liquid target (Liquid target, Suggested dough target).
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

- Only a **fermentation step** (a dough step that is not a mixing step, Dough steps) can be
  model-driven. `durationMode: 'model'` on a mixing step (`frasage`, `mix`, a kneading) is
  `InvalidProcess` (the step as `path`): the model solves the time of a fermentation, never of a
  mixing, which always keeps its planned duration. Without a model-driven step, the model solves
  the last fermentation step.
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

Version `0.21.0` adds the **dough thermal model** (#176): the optional `thermal` object
on process steps (process.md), the `StepThermalChanged` event and the `doughTemperature`
observation (bake-session.md), the personal thermal profile (persistence.md) and the per-step
envelope in the dough result. All additions are optional; a step without `thermal` behaves as in
`0.20.0` and documents of `0.20.0` stay readable unchanged (read as no `thermal`, so the fixed
lag). The recipe export and the full backup `schemaVersion` go from 2 to 3, so that an older
reader refuses a document holding `thermal` or `thermalProfiles` with `UnsupportedDocumentVersion`
(persistence.md). The kinetic model keeps its version
`0.1.0`; the thermal sub-model is `flourprint.dough-thermal` `0.1.0`, named in the estimate's
assumptions as `thermal_model:0.1.0`. Implemented in #184: `CONTRACT_VERSION` `0.21.0`,
`ENGINE_VERSION` `0.8.0`.

Version `0.22.0` makes the personal thermal factor of a calibration set independent of
the factors stored before it (`f_i = r / (1 + r · ψ₁)`, Personal correction; in `0.21.0` `ψ`
used the stored factor, so the order of calibrations changed the sets), and carries `thermal` when
a step is duplicated (process.md, Duplicate). It also writes down what `0.21.0` left implicit and
the engine implemented: calibration on an ended session, a reading replacing the temperature but
not the progress, a reading at a step's end, the Guggenheim triple, no Semenov test on a step of
zero duration. No persisted shape changes; stored sets keep their factor (a set is never
rewritten, persistence.md), and a recalibration of the same step replaces it as before. The
thermal sub-model becomes `flourprint.dough-thermal` `0.2.0`. Implemented in #186: `CONTRACT_VERSION`
`0.22.0`, `ENGINE_VERSION` `0.9.0`.

Version `0.22.1` (target) states the Guggenheim spacing tolerance (10 % of the mean of the two gaps,
as implemented) and takes the widest **valid** equally spaced triple, so a failed wider triple no
longer refuses a set that a narrower one calibrates (Personal correction, case k). Sets accepted
before give the same factor; only sets refused before can now be accepted. No persisted shape
changes. The implementing pull request bumps `CONTRACT_VERSION` to `0.22.1`, `ENGINE_VERSION` to
`0.9.1` and `flourprint.dough-thermal` to `0.2.1`.

Version `0.24.0` (implemented in #233) moves the **dough clock to the end of the first contact** (owner
decisions of 2026-11-04, #231; What it predicts, Dough temperature; process.md, Mixing steps, First
contact). The progress `F` of the dough starts at the **end** of the step where the yeast or leaven
first meets the flour and water; that step's own duration does not count, and the kneading, the
fermentolyse and the other steps after it are dough steps with their own duration. In a plan the
clock starts at the planned end of that step, in a bake at its actual completion. A preferment's
clock likewise starts at the end of its own first-contact (mixing) step. It retires the
end-of-the-mix rule and the reason `leaven_before_mixing` (never produced by the engine), and adds
the reason `no_first_contact_step`. What does not change: the kinetic law and every constant, the
readiness profiles, the thermal model, the band and its envelope, the reference mixing step's other
roles (target dough temperature, friction, water temperature). No persisted shape changes; every
document stays readable, and only the estimates computed from them differ. Compatibility:

- **Frasage-only recipes.** A process whose only mixing step is a `frasage` had no estimate before
  (`no_mix_step`, because the engine looked for an operation `mix`); a `frasage` is a mixing step
  (process.md), so it is now the reference mixing step and, when it brings the yeast, the
  first-contact step: such a recipe gets a dough estimate instead of `no_mix_step`. This follows the
  older clause (process.md, example 1; drafts.md, `no_mix_step`) and changes the estimate of stored
  documents of that shape.
- **Engine version.** `ENGINE_VERSION` goes from `0.9.1` to `0.10.0` (changed calculation
  behaviour: every dough in which a kneading, a fermentolyse or another step lies between the end of
  the first-contact step and the end of the last mixing step now estimates a different time and
  progress; a recipe whose first-contact step is also its last mixing step keeps its values, and so
  do the reference cases of `fixtures/fermentation/cases.json` that existed before). Bake snapshots
  record the engine version that computed their committed values and keep them; replay never
  recomputes them (history.md).
- **Model versions.** The kinetic model `flourprint.commercial-yeast` stays `0.1.0`: its law and
  constants are unchanged, and the model version names those, not the process semantics that tell
  it when to start integrating. The thermal sub-model `flourprint.dough-thermal` stays `0.2.1`
  for the same reason. The readiness profiles are untouched.
- **Contract version.** `CONTRACT_VERSION` is `0.24.0`, one minor step from `0.23.0`.
- **Stored estimates.** An accepted suggestion keeps its `Estimate` as it was, with the model and
  assumptions of the time (Accepted suggestions); it is not recomputed. A recipe edited after the
  change gets new suggestions from the new clock.
- **Dough steps and recorded events.** The dough steps now start after the first-contact step
  instead of after the reference mixing step. A command that needs a dough step (a
  dough-temperature observation, `SetStepThermal`) is checked against the dough steps in force
  when it is issued, so a baker can now read the dough temperature at the end of a kneading that
  follows the first contact; `doughReady` needs a fermentation step, never a mixing step
  (bake-session.md). `durationMode: 'model'` is likewise refused on a mixing step (Model-driven
  duration). **The first-contact step is not a dough step** (Dough steps): the dough has no clock
  during it, so those commands are refused on it, as they were on the lone `mix` of a recipe
  before; the baker completes it first and reads the dough on the next step (**superseded in 0.26.0
  for `doughTemperature` only**: a reading is now also accepted on the first-contact step as the
  start of the clock, Dough temperature, Measured start; `SetStepThermal` and `doughReady` stay
  refused there). This is the minimal
  consistent rule, one definition behind every gate, and it costs nothing a recipe could record
  before: no event can already sit on a step that was never a dough step. The only steps that stop
  being dough steps are those between the end of the reference mixing step and a later first
  contact, i.e. a recipe whose yeast enters only in a step after its last kneading, which is not
  expected. Restoring a backup re-checks the gate on its stored dough-temperature observations and
  thermal changes, so such an event recorded on such a step would be refused at restore.
- **Fermentation schedules** (drafts.md) replace the dough steps **after the reference mixing
  step**, not the mixing steps: their scope is unchanged.

Reference cases: `fixtures/fermentation/cases.json` is produced by `generate.py` with the new
clock (new cases `first contact: …`, pending for an engine older than `0.10.0`). The four existing
cases that have a 10 min mixing step as their only mixing step (reference point, constant 4 °C,
inverse dose, thermal lag) have the same values as before: the mixing is the first-contact step and
nothing lies between its end and the end of the last mixing step. Nothing in it comes from the
engine.

Version `0.25.0` (proposed) adds the **learning flags** (Learning flags; owner approval of 2026-11-07
to the proposal of #231, section 6): three extrapolation codes, `dough_above_28c`,
`cold_stage_uncalibrated` and `cold_hold_over_72h`, under the Domain table. What does not change:
every value and band, the `out_of_domain` gates (1.7 and 35 °C, dose, self-heating), the kinetic
law and its constants, the readiness profiles, the thermal model. Compatibility:

- **Persisted shape.** None changes. `extrapolations` is already a list of stable codes
  (values-and-units.md, whose definition widens to evidence-limited regimes); the three codes are
  new members. An accepted suggestion stored before
  keeps its `Estimate` and its codes as they were (Accepted suggestions); it is not recomputed.
  A reader that meets an unknown code shows it as an extrapolation without a message, never drops
  it.
- **Engine version.** The implementing pull request bumps `ENGINE_VERSION` from `0.10.0` to
  `0.11.0`: estimates of a recipe with a warm or cold step gain codes, with unchanged numbers. The
  models stay `flourprint.commercial-yeast` `0.1.0` and `flourprint.dough-thermal` `0.2.1`.
- **Contract version.** `CONTRACT_VERSION` goes to `0.25.0`, one minor step from `0.24.3`.
- **Interface.** Each code needs a message key `fermentation.extra.<code>` in French and English
  before or with the engine change, so that no raw code reaches the baker (ADR 0009). The wording
  says "learning" or "outside what the model has been checked against", never that the dough is
  ready or not.

Reference cases: the codes depend only on step temperatures and durations, so the worked examples
of Learning flags are the acceptance cases; `fixtures/fermentation/cases.json` carries numbers
only and is unchanged. The implementing pull request tests each example and the boundaries
(28 °C, 10 °C, 72 h) directly; for examples 7 and 8 the test reads the engine's own central
duration and checks the code against it, since that duration is not a reference value.

Version `0.26.0` (proposal; the next minor after `0.25.0`, the learning flags of #259, now merged) adds the **Preparation temperatures**
(owner decisions of 2026-11-09 and 2026-11-10, #171, #242): the observation kinds `flourTemperature`,
`liquidTemperature` and `prefermentTemperature`, `doughTemperature` with no step gate (the start of
the clock when it falls in the first-contact step), temperature readings placed by their real
instant, editable and accepted after the end, the room line (`RoomTemperatureChanged`, a room
change carried to the end, up or down; bake-session.md, Preparation temperatures), the **liquid target**
that reads the effective room and the measured temperatures, the **suggested dough target**, the
**friction sample** and the **temperature outcome** (data only), and `TemperatureSource`
(values-and-units.md). What does not change: the kinetic law and every constant, the readiness
profiles, the thermal model and its envelope, the planned `waterTemperatureC`, the dose inverse. Derived
values do change for existing sessions: the dough start now follows the order reading, else target,
else ambient, and the forecast carries the `dough_start:*` and `ambient_adjusted:*` assumption codes,
so a live forecast of an earlier session whose recipe declares a target gains the code but keeps its
numbers (the target was already the start), and one that holds a first-contact reading cannot
exist. Stored data and replay do not change: every earlier session and backup replays and restores
unchanged, and committed estimates keep what they committed. The suggested target
is advice and starts no forecast. The implementing pull request bumps `CONTRACT_VERSION` to
`0.26.0` and `ENGINE_VERSION` by one minor step from the version current at its merge (new outputs,
and a different start temperature when a reading exists); the models stay
`flourprint.commercial-yeast` `0.1.0` and `flourprint.dough-thermal` `0.2.1`. As for #259, this
contract pull request does not touch `packages/core/src/domain/version.ts`. Reference cases:
`fixtures/temperatures/cases.json` (W, F, E and C cases), computed outside the engine by `generate.py`.

The number `0.26.0` is written in `bake-session.md`, `fermentation.md`, `history.md`,
`persistence.md`, `process.md`, `fixtures/README.md` and `fixtures/temperatures/cases.json`. #259 is merged, so `0.25.0` is taken;
if a different number is needed, rename it in those files.
