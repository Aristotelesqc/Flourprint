# Contract: fermentation model, first domain (#9, #29, #33)

Status: **provisional** (owner decision of 2026-10-09, ADR 0010). Model
`flourprint.commercial-yeast` version `0.1.0`. Its parameters come from a secondary source and are
not validated on independent dough data; every estimate says so. They change only through a new
model version that passes the promotion gates of `docs/science/fermentation-model.md` (same
observable, protocol close to home baking, validation on independent data): reading a paper is
not enough. Recorded bakes calibrate the readiness profile (below, #14), not these constants.

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

- `T_room` is the reference mixing step's condition temperature; `T_flour` defaults to `T_room`;
  `T_preferment` defaults to the preferment step's condition temperature.
- `friction` defaults to 0 °C and is the user's to set (`conditions.frictionC` on the reference mixing step):
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
