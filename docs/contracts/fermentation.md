# Contract: fermentation model, first domain (#9, #29, #33)

Status: **provisional** (owner decision of 2026-10-09, ADR 0010). Model
`flourprint.commercial-yeast` version `0.1.0`. Its parameters come from a secondary source and are
not validated on independent dough data; every estimate says so. They are replaced as soon as
primary data is read (#33) or the owner's recorded bakes calibrate them (#14).

## What it predicts

The time a dough or a commercial-yeast preferment takes to reach its end point, and the yeast
needed for a given schedule. One forward `simulate()` serves both directions (#29).

- **Dough end point**: from the end of the mix to the start of the bake, the dough is "ready to
  bake" (the owner's readiness decision, see Personal calibration below). Bulk, cold retard,
  shaping and proof are counted together: the state is never reset between steps (#9).
- **Dough steps**: the `asap` steps that come after the `mix` step and before the `bake` step
  in the graph, in process order. `alap` steps (preheating) never hold the dough. They must form
  one sequence, each after the previous one; dough steps in parallel (two rests side by side)
  are `insufficient_data` (`non_linear_dough_path`) until split masses are modelled. Without a
  `mix` step, the estimate is `insufficient_data`; without a `bake` step, every `asap` step after
  the mix counts.
- **Preferment end point**: a poolish or biga is "ripe" (#33 objection 5), at progress 1.
- A preferment is a `preferment`-kind component; its step is the step with the component's id.
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

| Parameter             | Value       | Range used for the band | Basis                                                                                                                                                   |
| --------------------- | ----------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `A`                   | 3.43 h      | ×0.75 to ×1.25          | least-squares fit of Craig's table, 952 cells, 3.9–30 °C, ≥ 3 h (rms 5 %, max 32 % error); Craig's own anchor differs by 15 %, Calvel's poolish by 12 % |
| `k`                   | 0.729       | 0.6 to 0.9              | same fit; Finney et al. 1976 (independent, abstract) gives 0.74                                                                                         |
| `Ea`                  | 98.3 kJ/mol | 50 to 100 kJ/mol        | same fit; other sources are flatter (≈ 50–72) (#29 evidence review)                                                                                     |
| instant → fresh       | ÷ 0.33      | ÷ 0.32 to ÷ 0.42        | King Arthur 0.33, Red Star ≈ 0.42, Craig 0.32                                                                                                           |
| active dry → fresh    | ÷ 0.40      | ÷ 0.40 to ÷ 0.50        | King Arthur 0.40, Red Star ≈ 0.42, others 0.5                                                                                                           |
| dough thermal lag `τ` | 0 to 3 h    | the range itself        | assumption, no source: how long a dough takes to follow a new ambient (e.g. the fridge)                                                                 |

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

## Personal calibration: "ready to bake"

The kinetic law and its constants (`A`, `k`, `Ea`, conversions, `τ`) say how fast `F` grows. They
do not say when a dough is ready. That is a decision of the baker, separate from the kinetic
parameters, kept in its own object and passed to the dough estimate:

```ts
interface PersonalCalibration {
  readyProgress: number; // F* of the dough
  band: [number, number]; // low and high F* used for the band
}
```

| Item                       | Value (provisional) | Band      | Basis                                                                                                                                                                                                |
| -------------------------- | ------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `readyProgress` of a dough | 2.0                 | 1.5 – 2.5 | the owner's TOST schedules, used as examples (not as calibration data): they imply about twice Craig's time to "doubled once" for "ready to bake" after degassing, shaping and proof (review on #33) |
| preferment end point       | 1                   | 1 – 1     | "ripe" (above), unchanged                                                                                                                                                                            |

- "Ready to bake" is an observable decision of the baker. It is distinct from gas produced, from
  volume and from height. It is not a universal constant of the model.
- The value is **provisional**. It is to be recalibrated from the bake journal's "dough ready"
  observations (bake-session.md) and then kept as a versioned personal profile, not as a change of
  the kinetic constants.
- The dough's duration estimate and its inverse yeast dose target `F* = readyProgress` (the
  reference case at 1 % fresh yeast and 21.1 °C therefore takes `2 × A` hours). The preferment's
  target stays 1.
- The band of a dough estimate is the minimum and maximum over every combination of the parameter
  ranges **and** of the two ends of `band`. The dough's estimate lists the target it used as the
  assumption code `ready_target_progress:<value>`.
- The Izzreen M5 fit is research only: it is not adopted and changes none of this.

## Dough temperature

- **Basic mode** (default, nothing measured): the dough starts at the ambient temperature of the
  mix step (its condition temperature, else the first fermentation step's).
- **Advanced mode**: the mix step declares a target dough temperature
  (`conditions.doughTemperatureC`); the dough starts at it.
- Between steps, the dough follows each step's condition temperature with a first-order lag
  `dT/dt = (T_condition − T) / τ`, τ within its range (0 = it follows at once). A step without a
  condition temperature keeps the previous one; with none at all, the estimate is
  `insufficient_data`.
- A measured dough temperature (an observation during a bake) replaces the estimate from that
  instant (bake-session.md); planning uses the plan.

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

- `T_room` is the mix step's condition temperature; `T_flour` defaults to `T_room`;
  `T_preferment` defaults to the preferment step's condition temperature.
- `friction` defaults to 0 °C and is the user's to set (`conditions.frictionC` on the mix step):
  mixers differ, and a few measured doughs calibrate it (#32). With the default, the result says
  that friction is not counted.
- A result below 0 °C or above 60 °C is returned with that flag, never clipped.

## Domain

| Condition                                                                                                                                                                         | Result                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| no ingredient marked as commercial yeast, or a sourdough culture                                                                                                                  | `unsupported`                           |
| a step's temperature unknown, or the yeast form unknown                                                                                                                           | `insufficient_data` (named)             |
| fresh-equivalent dose outside 0.01–3 %, dough below 1.7 °C or above 35 °C                                                                                                         | `out_of_domain`                         |
| a preferment (on the dough and on the preferment's own estimate); added sugar > 5 %; added fat > 3 %; salt outside 1.5–3 %; total water outside 55–75 %; a needed content unknown | `ok` with `extrapolations` listing each |
| otherwise                                                                                                                                                                         | `ok`                                    |

Sugar and fat are the formula's `totalSugarPct` and `totalFatPct`; water is `totalWaterPct`.
Salt is the ingredient with id `salt` until ingredients are typed (#26); a dough without one is
outside the salt range.

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
  never a raw `Infinity`, which JSON cannot carry. A dose band with an unbounded corner has no
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
- Any other edit of that value (a typed duration or percentage, a grams edit) removes `accepted`.
  A consumer also ignores an `accepted` whose `appliedValue` differs from the current value.
- `StartBake` copies the accepted decisions of the started revision into the snapshot
  (history.md). Replay never recomputes them.
- Out of scope: staleness digests and exported parameter files.

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
