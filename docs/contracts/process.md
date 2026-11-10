# Contract: process (D3)

Status: the baseline contract is **approved** (issue #30). The 0.3.0 extensions for mixing
(`frasage`), target-based preheating, subjects/component phases, move/duplicate and relative
timing are **specifications merged into `canary`** through #91, #92, #94, #96 and #97 after
owner-authorized independent technical reviews. The owner selected preheat option C on #97.
Merged specification status is distinct from implementation or release validation; it is not
a blanket request to repeat owner approval. Any remaining product arbitration must identify
the specific unresolved choice.

Existing `asap`/`alap` projection and basic step editing remain implemented. The new subject,
`beforeTarget` and grouped relative-projection behavior still needs implementation and evidence:
engine/application/compatibility work is tracked in #106, the grouped UI in #100, and the
remaining step-editor work separately in #104. Related workstreams: #5, #9, #21, #28, #35.

## Model

A process is an open list of repeatable **step instances** (one stable ID per instance), linked by
finish-to-start dependencies. The business content of a step (operation, target, dough state,
conditions, incorporations) follows #5; this contract fixes the graph and the timing.

```ts
interface ProcessStep {
  id: StepId;
  dependsOn: StepId[]; // finish-to-start
  schedule: 'asap' | 'alap' | 'beforeTarget'; // beforeTarget: Steps before a target, below
  plannedDurationS?: number; // absent = unknown
  endCriterion?: EndCriterion; // observation or user decision
  accepted?: AcceptedSuggestion; // set when plannedDurationS was taken from a model suggestion
  durationMode?: 'manual' | 'model'; // absent = manual; 'model' on one fermentation step, never a mixing step (fermentation.md)
  subject?: Subject; // the mass the step works on; absent = derived (Subjects and component phases)
  thermal?: StepThermal; // thermal inputs of a dough step (Thermal inputs); absent = fixed lag of fermentation.md
  // `beforeTarget` only (Steps before a target): target, requiredWarmupS, startRule
}
```

A process may also name the readiness profile of its dough (`fermentation.md`):

```ts
interface Process {
  steps: ProcessStep[];
  readiness?: { id: string; version: string }; // absent = the default profile
  intendedOutcome?: PreparationOutcome; // absent = derived (bake-session.md, Outcome)
}
```

A step may also say how it is cooked or held: appliance, mode, setting, support, vessel, cover,
preheating, steam, rack and load (`equipment`, equipment.md). It is recorded data; the scheduler and
the fermentation model ignore it.

`intendedOutcome` is how the recipe ends: cooked, or a raw dough frozen, refrigerated… It is the
default outcome when a session finishes (bake-session.md); an invalid one is `InvalidProcess`.

`AcceptedSuggestion` is defined in `fermentation.md`. For a step, `appliedValue` is
`plannedDurationS` in seconds. Any other edit of `plannedDurationS` removes `accepted`.

## Validation

- Step ids are non-empty and unique; names of built-in object members (`__proto__`,
  `constructor`, …) are refused, as in `formula.md`.
- References exist, no self-dependency, no cycle.
- The list order is a **valid topological order**: the mobile list reads top to bottom.
- A step added to the list gets `dependsOn = [previous step]` by default.
- `alap` without a successor, or without `plannedDurationS`, is an error.
- `durationMode: 'model'` is refused on a mixing step (`frasage`, `mix`): it is allowed only on a
  fermentation step, a dough step that is not a mixing step (`fermentation.md`, Model-driven
  duration). `InvalidProcess`, the step as `path`.
- `beforeTarget` is valid only on a `preheat` step, with a `target` that is a cooking step not
  upstream of it, no `plannedDurationS`, no `durationMode`, no incorporations and no step depending
  on it; `requiredWarmupS` ≥ 0, required unless `startRule` is `afterDependencies` (Steps before a
  target). `target`, `requiredWarmupS` and `startRule` are refused on any other schedule.
- `plannedDurationS` ≥ 0 when present.
- Per-step incorporations add up exactly to the formula's final-mix quantities (see below).
- `dependsOn` is never accepted and then ignored, nor dropped on import.

## Incorporations

A step may declare what it adds to the dough, as shares of final-mix items:

```ts
type Incorporation =
  | { item: 'flour' | 'ingredient' | 'component'; id: string; sharePct: number }
  | { item: 'water'; sharePct: number }; // the final-mix water pool
```

- `ingredient` refers to a non-water dough ingredient; `component` to a whole component.
- Incorporations are optional. When a process declares any, every final-mix item with a positive
  mass must be incorporated exactly once in total (shares summing to 100 across steps), and no
  item may exceed 100. Unknown references are errors.
- Grams per step are derived from the resolved formula, so they follow every rescaling.

## Step conditions

```ts
interface StepConditions {
  location?: string; // open code: counter, fridge, proofer, oven…
  temperatureC?: number; // ambient temperature of the step
  doughTemperatureC?: number; // mixing step only: target dough temperature (advanced mode)
  frictionC?: number; // mixing step only: mixer friction for the water temperature
}
```

- `temperatureC` is the ambient the dough sits in. `doughTemperatureC` and `frictionC` are only
  read on a mixing step (`frasage` or `mix`, Mixing steps below); elsewhere they are refused
  (`InvalidProcess`). Their use is defined in
  fermentation.md.
- All temperatures are in °C and finite; the scheduler ignores them.
- During a Preparation the baker may change a step's `temperatureC` (`AdjustStep`), note a room
  change that carries to the end for the steps on the counter (bake-session.md, The room line), and record
  measured temperatures of the dough, flour, liquid and preferment; the snapshot keeps the plan and
  the engine reads the effective and measured values with their sources (bake-session.md,
  Preparation temperatures; fermentation.md, Liquid target). `frictionC` stays the recipe's value;
  Preparations only produce samples for a later calibration of it (fermentation.md, Friction
  samples).

## Thermal inputs (#176)

**Accepted 2026-10-25 (#179), contract `0.21.0`, implemented in #184** (the model is `fermentation.md`, Dough thermal
model). A fermentation step may say in what the dough sits, so that the forecast computes its lag
from mass and container instead of the fixed 1.5 h:

```ts
interface StepThermal {
  geometry: 'sheet' | 'tin' | 'ball' | 'bulk'; // required: its presence turns the model on
  container?: {
    material: 'glass' | 'plastic' | 'ceramic' | 'steel' | 'aluminium' | 'banneton';
    cover: 'lid' | 'film' | 'cloth' | 'none';
    liner?: boolean; // banneton only: a cloth liner
  };
  environment?: 'fridgeStatic' | 'fridgeVentilated' | 'roomStill' | 'provingBox';
  porosity?: 'unproofed' | 'mid' | 'proofed';
  pieces?: number; // integer ≥ 1: equal pieces the dough is divided into (default 1)
  containerMassG?: number; // grams, > 0: the container that changes ambient with the dough
}
```

- **Presence.** A step with no `thermal` is unchanged: `τ` 1.5 h, band 0 to 3 h, no
  self-heating (fermentation.md). `geometry` is required: there is no `thermal` without it.
  No default is ever written into a stored recipe by a reader: absent stays absent.
- **Defaults inside a `thermal` object** (read-time, never stored):
  - `container`: `bulk` glass with `film`; `ball` plastic with `lid`; `tin` steel with `none`;
    `sheet` aluminium with `none`;
  - `environment`: from `conditions.location` of the step: `fridge` is `fridgeStatic`, `proofer` is
    `provingBox`, anything else or absent is `roomStill`. The ventilated fridge is always explicit;
  - `porosity`: derived from the progress at the start of the step (fermentation.md);
  - `pieces`: 1; `containerMassG`: absent, container heat capacity 0.
- **Where it applies.** On a **dough step** (fermentation.md): an `asap` step **after** the
  first-contact step (Mixing steps, First contact) up to the first heat step, so a kneading or a
  rest after the first contact may carry it. The **first-contact step itself is not a dough step**:
  the dough has no fermentation clock during it (the clock starts when it ends), so thermal inputs
  there would be accepted and then ignored; they are refused instead. On any other step (a
  preferment's, a `beforeTarget` step, a cooking step) `thermal` is refused (`InvalidProcess`,
  step as `path`): this model does not cover a preferment, whose phases are already
  `component_phases_unmodelled`.
- **Validation with and without the formula.** Which step is the first contact depends on what an
  incorporation is: a yeast ingredient or a `preferment` component holds yeast; salt, a scald or a
  topping does not. The exact rule therefore needs the formula, and the recipe validation applies
  it. A check made on a process alone (the step editor, the projection, a move or a duplication of
  steps) cannot tell them apart. It counts as possibly holding yeast **any** incorporation of an
  ingredient or of a component with a positive `sharePct` (the flour and the water never hold
  yeast), and a `fermentolyse`; the first main-dough step that does so is the earliest one that
  could be the first contact. Its rule: a step that is **certainly not a dough step** is refused
  as above, that is a main-dough step at or ahead of that earliest candidate (an `autolyse` of
  flour and water, or one that incorporates nothing, ahead of the step that brings the
  ingredients, is one; so is the candidate itself, which is either the first-contact step or
  ahead of it) or, when the process declares no incorporation at all, at or ahead of the first
  main-dough mixing step. A step after that candidate is **accepted** by such a check even when
  only the formula shows the candidate not to hold yeast (the salt, a scald), the step after it
  then being ahead of the real first contact; the recipe validation refuses it later. This is a
  stated limit, not a second rule: the process-only check never refuses thermal inputs that the
  exact rule accepts.
- **Divided pieces.** `pieces` states how many equal pieces the dough is cut into at or before this
  step: the model uses the per-piece mass `m / pieces` (a `divide` step carries no mass itself). A
  step after the division carries the same `pieces` as the step that follows the `divide`; the
  steps are independent records and the editor copies the value, the domain never infers it from a
  `divide` step. A different `pieces` between consecutive steps with no `divide` between them is
  allowed (the recipe says what it says) and produces the check `thermal_pieces_changed`
  (nonblocking, drafts.md).
- **Validation.** Unknown discriminants, `pieces` not an integer ≥ 1, `containerMassG` ≤ 0 or not
  finite, `liner` with a material other than `banneton`, a `banneton` with `geometry` other than
  `ball` or `bulk`, a `tin` or `sheet` with material `glass`, `ceramic` or `banneton`: each is
  `InvalidProcess`. A material whose resistance is metal (`steel`, `aluminium`) in a
  `fridgeStatic` takes the bare-metal `h` (fermentation.md).
- **Units.** Persisted units follow AGENTS.md: grams (`containerMassG`), a count (`pieces`), no
  length is stored: shapes and wall thicknesses are constants of the model.
- **Accepted suggestions.** Editing `thermal` removes no `accepted` provenance of a duration by
  itself, but an accepted suggestion computed on the previous thermal inputs is stale: a consumer
  that compares the estimate shown with the current one (fermentation.md) sees the difference as
  for any other input change.
- **Compatibility.** Existing recipes have no `thermal` and mean what they meant. An older app
  refuses a document holding `thermal` through the recipe export and backup `schemaVersion` 3
  (`UnsupportedDocumentVersion`, persistence.md, Personal thermal profile), never misreads it.
  Older documents are read as no `thermal`.
  `StartBake` copies `thermal` with the rest of the step into the snapshot (history.md); a change
  during a Preparation is an event (bake-session.md), never an edit of the snapshot.
- **Scheduler.** The scheduler ignores `thermal` (time arithmetic only); only the fermentation
  model reads it.

## Steps before a target (preheating)

**0.3.0 specification merged in #94; owner-selected option C on #97; scheduling, validation, document boundary and session effects implemented in #106 slice B (contract 0.18.0).** A baker preheats the oven
while the dough proofs, and switches it on **a set time before the cooking step it is for**, not at
the boundary of another step: a 2 h proof stays one step, and the oven does not heat for 2 h when
30 min are wanted. Four facts stay distinct: the **trigger** (switching the heating on), the
**heating window** (from the trigger until the cooking step that needs the heat starts), the
**requirement** (the warm-up the baker wants) and the **record** (when heating started and, if
observed, when the equipment was ready).

```ts
interface ProcessStep {
  // …
  schedule: 'asap' | 'alap' | 'beforeTarget';
  // `beforeTarget` only:
  target?: StepId; // the cooking step it heats for
  requiredWarmupS?: number; // the warm-up wanted before the target starts
  startRule?: 'fromTarget' | 'afterDependencies'; // absent = 'fromTarget'
}
```

- **Scope.** `beforeTarget` exists for the operation `preheat` only, in this version. Any other
  operation with it is `InvalidProcess`. A general trigger or milestone primitive would need its own
  contract.
- **Off the critical path.** A `beforeTarget` step has **no `plannedDurationS`**, no
  `durationMode` and no incorporations, and **no step may depend on it**: the target and every other
  step are scheduled exactly as if it did not exist. It never delays, shortens or extends another
  step. Its `dependsOn` only gives the **earliest allowed start** (for example "after shaping";
  empty means from the start of the recipe).
- **Target.** `target` names the cooking step the heat is for; it is explicit, never chosen by list
  position, and must not be upstream of the step (the target is not one of its dependencies,
  directly or through others). Removing the target is refused (`TargetInUse`) until the preheat is
  removed or given another target. When the preheat and its target both name an appliance and they
  differ, the check `preheat_target_mismatch` (`drafts.md`) says so.
- **Planned start.** With `earliest` the end of its dependencies and `targetStart` the planned
  start of the target:
  - `fromTarget` (default): `max(earliest, targetStart − requiredWarmupS)`: as late as the
    requirement allows, never before the earliest allowed start;
  - `afterDependencies`: `earliest`, an explicit choice to heat from the end of the previous
    step (for example a stone that needs long heating).

  `requiredWarmupS` (≥ 0) is required with `fromTarget`, optional with `afterDependencies`. During
  a Preparation, a trigger not yet started is never planned before `now`, like any step not yet
  started: the start is then `max(…, now)`.

- **Unknown times.** When `earliest` is unknown, the start is unknown. When `targetStart` is
  unknown, a `fromTarget` start is unknown; an `afterDependencies` start may still be known (its
  dependencies ended), but its window is unknown. An unknown time is never replaced by a number,
  and no window or readiness is derived from it.
- **Heating window.** The step's planned span is `[plannedStart, targetStart]`: heating continues
  until the target starts. `windowS = targetStart − plannedStart` is derived, never stored, and is
  never added to any total; the span counts in its group's window like any step (relative timeline
  and groups) but never extends the recipe beyond its target. **The window is never negative.**
  When the start falls after the target's start (its dependencies end after the target starts, or
  the target was started before the heating), there is no span: the status is `unavailable` with
  `reason: 'startsAfterTarget'`, no interval is drawn and nothing is called sufficient. When the
  start equals the target's start, the window is 0: `insufficient` whenever a warm-up is
  required.
- **Status.** The projection gives each `beforeTarget` step a structured `warmup`: `sufficient` or
  `insufficient` (with `availableS` and `requiredS`), `unavailable` (with its `reason`, raising
  the nonblocking check `preheat_window_unavailable`), `unknown` (with the scheduler's
  `unknownAfter` blockers) and `notApplicable` (no requirement). An absent warning is never read as
  sufficient: `insufficient` raises `preheat_too_short` and `unknown` raises
  `preheat_window_unknown` (`drafts.md`), both nonblocking. An insufficient window changes no other
  step: the dough is never held for the oven.
- **In a Preparation.** `StartStep` records `StepStarted`: the heating was switched on. Before
  that, the planned trigger follows the target when the plan is reprojected (a proof extended
  before the oven is on moves the trigger later); once started, the recorded start stays and only
  the window changes. **Overdue trigger:** when the trigger computed from the target
  (`targetStart − requiredWarmupS`) is already past and the heating has not started, the planned
  start is `now`, the step carries `overdue: { dueAt }` with that original instant, and the window
  is computed from `now` (often `insufficient`). It is never backdated and never shown as heating;
  the reminder fires once at `dueAt`, and the interface then shows the action as due since
  `dueAt`, not as done. `CompleteStep` is optional and means the baker observed the equipment ready
  (`StepCompleted` at `at`). Nothing completes when the required time elapses, readiness is never
  inferred, and a started step that was never completed is not an open step: finishing the
  Preparation does not need it. If the target is started with no readiness recorded and less than
  `requiredWarmupS` elapsed since the trigger, or before the trigger, the interface warns and asks
  for confirmation; no command is refused. History and notifications name the events "heating
  started" and "ready", never "preheated" at the trigger.
- **Legacy `alap` preheats** keep their meaning: a **hard** prerequisite, as late as possible, with
  `plannedDurationS` as the heating duration and the cooking step depending on both; when the
  window is too short, the cooking step waits. Nothing is migrated or reinterpreted: a session keeps
  the process it started with. Turning an `alap` preheat into a `beforeTarget` one is an explicit
  edit that shows the before and after; it is never silent.
- **Dough steps** (`fermentation.md`): a `beforeTarget` step is not one and holds no dough.
- **Compatibility.** An older app refuses a recipe holding the new schedule value or fields as a
  document with an unknown discriminant or field (`persistence.md`), never misreads it.
  `CONTRACT_VERSION` is bumped by one minor step, from `0.17.0` to `0.18.0`, by the implementing
  pull request. No event type changes: `StepStarted` and `StepCompleted` carry the record. The projection
  embedded in `BakeStarted.initialProjection` and `ProjectionAccepted` gains the optional `warmup`
  and `overdue` of a `beforeTarget` step (absent on every other step); events written before still
  decode, as `isProjectedStep` ignores unknown fields.
- **Implementation notes (#106 slice B).** `warmup.sufficient` carries `availableS` and `requiredS`
  like `insufficient`. A step with no requirement and a known non-negative window, or with unknown
  times, is `notApplicable`; `unavailable` is decided first when both times are known. A
  `beforeTarget` step's projected `end` is its target's start (the recorded readiness once
  completed), and is absent when `unavailable`. `target` must be a cooking
  step. The domain exposes `removeStepChecked` (`TargetInUse`) and `preheatIssues` (the nonblocking
  checks read from a projection).

Examples (hand-checked; `+h:mm` from the start of the recipe):

1. **Just in time, the mockup of #97.** Shaping ends at +27:45, the proof (2 h) runs +27:45 →
   +29:45, the `bake` starts at +29:45. The preheat (`dependsOn: [shape]`, `requiredWarmupS` 1800,
   `target` `bake`) starts at max(+27:45, +29:45 − 0:30) = **+29:15**; window 30 min, `sufficient`.
   The proof stays **one** step; nothing is split.
2. **Start after the previous step.** The same with `startRule: 'afterDependencies'`: the preheat
   starts at +27:45; window 2 h, `sufficient`. This is the baker's explicit choice, not the default.
3. **Too short, nothing moves.** Shaping ends at 0:00, a 15 min `bulk` runs 0:00 → 0:15, the `bake`
   starts at 0:15; preheat after shaping, 30 min required: start max(0:00, 0:15 − 0:30) = 0:00,
   window 15 min, `insufficient` (`availableS` 900, `requiredS` 1800), `preheat_too_short`. The bulk
   and the bake keep their times.
4. **Actual execution.** The oven is switched on at 14:05, seen hot at 14:40, and the bake starts
   at 14:50: `StepStarted` 14:05, `StepCompleted` 14:40, and the bake's own `StepStarted` 14:50:
   three distinct facts. History never says the preheating was complete at 14:05.
5. **Reprojection.** In example 1, the proof is extended by 20 min before the oven is on: the bake
   moves to +30:05 and the planned trigger to +29:35. If the oven was already switched on at
   +29:15 (recorded), its start stays +29:15 and the window becomes 50 min.
6. **Two cooking branches.** An oven `bake` and, in parallel, a skillet `panCook`: the preheat's
   `target` is the `bake`, never chosen by position. With `equipment` naming a different appliance
   than its target: `preheat_target_mismatch`.
7. **Unknown target start.** A step before the bake has no duration: the preheat's start and
   window are `unknown`, with `unknownAfter` naming that step, and `preheat_window_unknown` is
   raised; nothing shows "0 min" or "sufficient".
8. **Invalid.** `beforeTarget` on `bulk`, a `plannedDurationS` on a `beforeTarget` step, a step
   that depends on it, a `fromTarget` step without `requiredWarmupS`, a missing target or a target
   upstream of the preheat: each is `InvalidProcess`.
9. **Legacy.** An `alap` `preheat` of 30 min after a 15 min bulk keeps its hard meaning: the bake
   waits 15 min for it. Its projection and journal are unchanged; it is converted only by an
   explicit edit.
10. **Target removal.** Removing the `bake` that is a preheat's target: `TargetInUse`.
11. **Readiness not recorded.** The bake is started 10 min after the trigger with 30 min required
    and no `StepCompleted` on the preheat: the interface warns and asks to confirm; the command is
    accepted and the preheat stays "ready: not recorded".
12. **Recipe and Planning.** Both read the same projection: the same start and end for every step,
    and a distinct "30 min required · 30 min available" annotation for the preheat (example 1), or
    "30 min required · 2 h available" (example 2).
13. **Start equals the target.** The preheat depends on the `proof`, whose end is the `bake`'s
    start: the start is the target's start, the window 0, `insufficient` (`availableS` 0,
    `requiredS` 1800).
14. **Start after the target.** The preheat depends on a parallel branch, `soak` (6 h) after
    `mix`, while the `bake` starts 4 h after `mix`: its earliest start (+6:00) is after the
    bake's start (+4:00). `unavailable`, `startsAfterTarget`, no span drawn,
    `preheat_window_unavailable`; no negative window. (A target upstream of the preheat is refused
    by validation instead.)
15. **Unknown.** The proof has no duration: the `fromTarget` start, window and status are
    `unknown` with `unknownAfter: ['proof']`. With `afterDependencies` after a known shaping, the
    start is known and the window `unknown`.
16. **Overdue.** In a Preparation at 14:20, the bake is planned at 14:45 with 30 min required: the
    trigger was due at 14:15 and the oven is not on. The planned start is 14:20 with
    `overdue: { dueAt: 14:15 }`, the window 25 min, `insufficient`. Switched on at 14:22: the start
    is recorded at 14:22 and the window becomes 23 min; nothing is backdated.
17. **Target started first.** The bake was started at 14:35 and the oven recorded on at 14:40:
    `unavailable`, `startsAfterTarget`; both records stay as they are.

## Techniques (#32, first slice)

A step may describe **how** it is done. This is recorded data: no duration, end or dough state is
predicted from it until the mixing model of #32 exists.

```ts
interface ProcessStep {
  // …
  technique?: StepTechnique;
}

interface StepTechnique {
  method?: string; // open code, see below
  phases?: Array<{ speed: 'low' | 'medium' | 'high'; durationS: number }>; // machine mixing, in order
  folds?: { count: number; intervalS: number; style?: string }; // sets of folds during the step
  endCheck?: string; // open code: windowpane, doughTemperature, feel, time, other
}
```

- Operation codes stay open. Codes the app names: `autolyse` (flour and water rest), `fermentolyse`
  (flour, water and leavening, salt later), `frasage` (combining the ingredients), `mix`
  (kneading), `fold`, `bulk`, `rest`, `degas`, `divide`,
  `preshape`, `shape`, `proof`, `retard`, `preheat`, `bake`, `boil`, `steam`, `fry`, `panCook`, `grill`, `cool`, and the preparation steps.
- **Cooking operations**: `bake` (oven, whatever its mode), `boil` (water: bagels, pretzels,
  poached doughs), `steam`, `fry` (in oil), `panCook` (skillet, griddle, plancha) and `grill` (on a
  grate over flame or coals: barbecue, gas grill). They are the cooking stages of a session (bake-session.md) and the heat
  steps that end the fermentation (fermentation.md). `preheat` is not one (it heats equipment,
  not the dough), nor is `proof` done in an oven's Proof mode: the operation says what happens to
  the dough, the place or appliance mode does not (#28). `steam` is cooking in steam (steamed
  buns); an oven bake with steam stays `bake`, its steam being a setting (#28). Likewise the oven's
  broil mode (Gril in French) is a setting of `bake`, distinct from the `grill` operation; the
  interface names them so they cannot be confused.
- `method` codes the app names: on `mix`, `hand`, `slapAndFold`, `rubaud`, `standMixer`, `spiral`,
  `foodProcessor`, `noKnead`; on `fold` and in `folds.style`, `stretchAndFold`, `coilFold`,
  `lamination`. Any other code is kept and shown as given.
- `phases`: each `durationS` > 0. The editor writes the step's `plannedDurationS` as the sum of
  the phases when they change: the baker's own numbers, not a prediction. The domain never derives
  one from the other.
- `folds`: `count` is an integer ≥ 1 and `intervalS` > 0. Set `k` (1 … `count`) is due at the
  step's start + `k × intervalS`; due times follow the recorded start during a bake. Folds make
  sense on a step the dough ferments through (typically `bulk`); they do not split it, so the
  fermentation estimate still sees one step.
- `endCheck` names what ends the step for the baker; with `endCriterion` it is shown, never acted
  on.
- An invalid technique (a phase or interval ≤ 0, a non-integer count) is `InvalidProcess`.

## Mixing steps (frasage and kneading)

Two operations describe mixing, and a recipe holds the ones it needs:

- `frasage`: combining the ingredients until no dry flour remains, by hand, with a spoon or in a
  first low-speed phase. No gluten development is intended. It begins the **assembly of a dough**.
- `mix`: kneading, which develops the gluten (by hand, slap and fold, stand mixer, spiral…). A
  no-knead or Dutch-oven recipe has none. The `noKnead` method stays accepted on a `mix` step
  written before this rule; the interface does not offer it for a new step, since such a recipe
  has a `frasage` and no `mix`.

Rules:

- The **mixing steps** are the steps whose operation is `frasage` or `mix`.
- The `frasage` begins the assembly of the **main dough**; it is not necessarily the first step
  of the recipe. A poolish, levain, tangzhong, scald or soaker may be prepared hours before and
  appear as steps of the same recipe, in sequence or in parallel, ahead of it. The blank draft
  (the minimal main-dough recipe) starts with a `frasage`; a template with components starts with
  its component steps and has its `frasage` after them. Weighing the ingredients is not a step.
- A recipe whose first step is `mix` stays valid and is never rewritten: there is no migration,
  and its behaviour does not change.
- The **main-dough mixing steps** are the mixing steps from the **assembly** on. The assembly is
  the first mixing step that has incorporations of final-mix items (Incorporations above); a mixing
  step ahead of it, with none (the frasage of a poolish), is treated as belonging to its
  component. This is a **compatibility heuristic**, not an invariant: when a step states its
  subject explicitly (the component phases proposal, #96), the stated subject wins, and a main-dough
  frasage with incomplete incorporation declarations is never reclassified as a component by it. A
  process that declares no incorporations has every mixing step as a main-dough one, as before.
- The **reference mixing step** is the **last** main-dough mixing step in list order. Wherever
  `fermentation.md` and `drafts.md` say "the mix step" or "the reference mixing step", they mean this
  step: its conditions give the target dough temperature, the friction and the room temperature of
  the water method. It **does not start the dough clock**: that is the first-contact step (next
  rule). The fermentation schedules of `drafts.md` still replace the steps that come **after** it.
- **First contact: where the dough clock starts** (owner decisions of 2026-11-04, #231). The step
  where the yeast or leaven first meets the flour and water is the **first-contact step**
  (typically the `frasage`). The dough clock starts at its **end**, not at its start: the mixing of
  the ingredients is so short that it changes little, and the counter starts after it. When the
  baker taps Next on that step the time is frozen and fermentation begins, even if a last stroke of
  the spatula is still being given. The first-contact step's own duration **does not count**;
  everything after it does: a kneading after the frasage, a fermentolyse, the bulk and so on. A
  yeast-free autolyse ahead of the first contact does not count either. The first-contact step of
  the main dough is, in list order, the first main-dough step (Subjects and component phases: a
  step whose subject is the main dough) that
  - **holds yeast**: among its incorporations (with a positive `sharePct`), an ingredient marked as
    commercial yeast (`yeast`, formula.md) of role `dough` (a yeast in a topping or a glaze never
    starts the dough) or a component of kind `preferment` (a poolish, a biga, a levain); or whose operation is `fermentolyse` (flour, water and leavening, salt later, by
    definition, whatever the incorporations say);
  - or, **when the process declares no incorporations at all**, so that nothing says what a step
    holds, is a main-dough mixing step (`frasage` or `mix`). An `autolyse` is not a mixing step: a
    flour and water rest ahead of the first mixing step never starts the clock.

  **Which end.** In a plan (an estimate, a projection, a schedule) the clock starts at the
  **planned end** of the first-contact step: its start plus its planned duration, as the projection
  places it. During a bake it starts at the **actual completion** of that step, the instant the
  baker completes it (the recorded `StepCompleted`, fermentation.md, Live recomputation): a
  frasage planned for 5 min and completed after 9 starts the clock 9 min after its own start. A
  first-contact step that was never completed ends when the next step starts. A step with no
  planned duration contributes zero time.

  When incorporations are declared and no main-dough step holds yeast (and none is a
  `fermentolyse`), there is no first-contact step: the dough estimate is `insufficient_data` with
  the reason `no_first_contact_step` and `missing: ['incorporations']` (the incorporation of the
  yeast or leaven that no step declares). A formula without a commercial-yeast ingredient is still
  `unsupported` (`no_commercial_yeast`, fermentation.md) before any step is looked at, as before; the
  new reason is reachable only when the yeast is held by something that is not a step's
  incorporation of a yeast ingredient or of a `preferment` component. The clock needs a mixing
  step as before: a process with no main-dough mixing step stays `no_mix_step`.

- **Consequences for the dough steps** (`fermentation.md`). The **dough steps** are the `asap`
  steps **after** the first-contact step, up to the first heat step: the kneading after a
  frasage, a fermentolyse, the bulk and so on, each with its own duration. The first-contact step
  is **not** a dough step: it has no fermentation clock yet. That is the single rule behind every
  gate that asks for a dough step (thermal inputs, a model-driven duration, the `doughReady`
  observation, bake-session.md), so none of them accepts the first-contact step. One exception
  since 0.26.0: a dough-temperature reading is also accepted on it, as the temperature the clock
  starts from (bake-session.md, Preparation temperatures). What stays tied to it is its **conditions**: its temperature is the
  temperature the dough starts from when the clock starts (fermentation.md, Dough temperature).
  The reason `leaven_before_mixing`, introduced with the end-of-the-mix rule, is **retired**: no
  step can be "before" the dough any more, and the engine never produced it.
- A process without a mixing step has no reference mixing step (`no_mix_step`, `drafts.md`;
  `insufficient_data`, `fermentation.md`).
- `doughTemperatureC` and `frictionC` are accepted on either mixing step and read only on the
  reference one. On the other, they are kept and ignored, and the interface says that they do not
  drive the dough's estimate; the recipe stays valid.
- **Kneading is only what the list says.** A process without a `mix` step has no kneading, and
  the engine adds none. Time, autolyse, gentle handling, flour and hydration also build a dough,
  so a missing kneading is not a defect. The check `no_kneading_or_folds` (`drafts.md`, a note,
  never blocking) only asks the baker to confirm that this is the intended technique: no `mix`,
  no `fold` step and no `folds` technique anywhere. It never says that the gluten is
  undeveloped and never asks for folds.
- Folds are added in one of two ways, both already in this contract: **one `fold` step each**
  (manual), or **a repeating series on a step** (`technique.folds`: every `intervalS`, `count`
  times, during that step). The interface may compute `count` from the step's duration and the
  interval (for example every 45 min through a bulk of 3 h gives 3 folds, at 45, 90 and 135 min, none
  at the very end). A series that spans several
  steps is not expressible: use `fold` steps there.
- The labels are interface messages (ADR 0009): in French, **Frasage** and **Pétrissage**. A
  persisted `frasage` or `mix` keeps its meaning whatever the label.

Compatibility: operation codes are open, so no schema changes and no existing document needs an
upcaster. `CONTRACT_VERSION` is bumped by one minor step, from the version current at merge, by
the implementing pull request. An older app reads a `frasage` step as an unknown operation: it
shows the code and keeps the step, but its fermentation estimate and its recipe checks do not
treat it as a mixing step.

The **first-contact rule** changes what a dough estimate counts (owner decisions of 2026-11-04):
the clock starts at the end of the first-contact step, so a kneading, a fermentolyse or any step
between it and the end of the last mixing step is now fermentation time, where it used to be left
out (the end-of-the-mix rule). For the common recipe whose first-contact step is also its last
mixing step nothing moves. Documents are unchanged and stay readable (no field is added or
removed); only the estimates computed from them differ, so the engine version changes
(`fermentation.md`, Versions). The reason `leaven_before_mixing`, specified here but never
produced, is retired. An `Estimate` carries its `reason` as an open string and no reader checks it
against a list, so a document that held it would still be read, and the interface shows an unknown
reason with its generic text. No engine version ever wrote it, so no stored document is expected
to hold it.

Examples (hand-checked against the rules above):

1. **No-knead Dutch-oven loaf**: `frasage` (2 min, 21 °C), `bulk`, `shape`, `proof`, an `alap`
   `preheat`, `bake`, `cool`. Valid, no `no_mix_step`. No incorporations are declared, so the
   first-contact step is the `frasage`, which is also the reference mixing step: the clock starts
   at its end (the 2 min do not count), the dough steps are `bulk`, `shape` and `proof`, and the
   ambient temperature the dough starts from is 21 °C.
2. **Stand-mixer loaf**: `frasage` (hand, 3 min), `autolyse` (30 min), `mix` (`standMixer`,
   phases low 4 min then medium 6 min, `frictionC` 8), `bulk`… No incorporations are declared:
   the first-contact step is the `frasage` (the `autolyse` is not a mixing step), so the clock
   starts at its end: the 3 min of frasage do not count, the 30 min of autolyse and the 10 min of
   kneading do, then the bulk. The reference mixing step is the `mix`: the friction 8 °C is read
   there. Were the yeast declared as added only at the `mix`, the first contact would be the
   `mix`, the clock would start at its end, and the `frasage` and `autolyse` would not count.
3. **Friction on the `frasage` of example 2** in place of the `mix`: kept, ignored, and the
   result says that friction is not counted.
4. **Existing recipe**: `mix`, `bulk`, `shape`, `proof`, `bake`. The `mix` is the first-contact
   step and the reference mixing step: the clock starts at its end, as it always did for a lone
   `mix`. Unchanged.
5. **`frictionC` on a `fold` step**: `InvalidProcess`, as before.
6. **No-knead loaf without folds**: `frasage`, `bulk`, `shape`, `proof`, `bake`. Valid.
   `no_kneading_or_folds` is raised as a note to confirm the technique, and blocks nothing. A
   `technique.folds` `{ count: 3, intervalS: 2700 }` on the 3 h `bulk` (folds at 45, 90 and 135
   min, within the step), a `fold` step or a `mix` clears it.
7. **Poolish first.** `poolish` (the component's step, 12 h, no incorporations), `frasage`
   (incorporates `component` poolish, the flour, the water and the other ingredients), `bulk`,
   `shape`, `proof`, `bake`. The first step is not a `frasage`. The assembly is the `frasage`: it
   incorporates the poolish, a `preferment` component, so it holds leaven and is the first-contact
   step as well as the reference mixing step: the dough's clock starts at its end. The poolish
   keeps its own clock (its own step, 12 h; it has no mixing step of its own here, so its clock
   starts at the start of that step).
8. **Preliminary frasage.** `frasage` (of the poolish, no incorporations, 10 min), `proof`
   (12 h), `frasage` (assembly, incorporating the poolish, a `preferment` component), `mix`
   (kneading, 8 min), `bulk`. The first `frasage` belongs to the poolish: it is the poolish's
   first-contact step, so the poolish's clock starts at its end and the 10 min do not count
   (Subjects and component phases, Fermentation). The assembly `frasage` holds leaven: it is the
   dough's first-contact step and the dough's clock starts at its end; the 8 min of kneading
   count, then the bulk. The `mix` is the reference mixing step.
9. **Fermentolyse before the final kneading.** `fermentolyse` (incorporates flour, water and
   yeast, 45 min), `mix` (incorporates the salt, 8 min), `bulk`. The `fermentolyse` holds yeast:
   it is the first-contact step. The clock starts at its end: the 45 min do not count, the 8 min of
   kneading and the bulk do. The reference mixing step is the `mix`: its target dough
   temperature, if any, is read there. (This case used to be `insufficient_data`,
   `leaven_before_mixing`.)
10. **Frasage then kneading at once.** `frasage` (incorporates everything, yeast included, 5 min),
    `mix` (8 min), `bulk`. The `frasage` is the first-contact step: the clock starts at its end,
    so the 5 min do not count, the 8 min of kneading do, then the bulk.
11. **Autolyse without yeast.** `autolyse` (incorporates flour and water, 30 min), `mix`
    (incorporates the salt and the yeast, 8 min), `bulk`. The `autolyse` holds no yeast: it does
    not count. The `mix` is the first-contact step and the clock starts at its end: the 8 min do
    not count either.
12. **No incorporations declared.** `autolyse` (30 min), `frasage` (5 min), `mix` (10 min), `bulk`.
    Nothing says what a step holds, and the `autolyse` is not a mixing step: the first-contact
    step is the `frasage`. The 30 min and the 5 min do not count; the clock starts at the end of
    the `frasage`, and the 10 min of kneading count.
13. **Poolish and final dough.** `poolish` (a `preferment` component's step, 12 h), `mix`
    (incorporates the poolish, the flour, the water, the salt and the remaining yeast, 10 min),
    `bulk`. The poolish's clock starts at the start of its own step (it has no mixing step of its
    own); the dough's clock starts at the end of the `mix`, not at the start of the poolish.
14. **No step holds yeast.** Incorporations are declared, the `mix` incorporates flour, water and
    salt, a later step incorporates a `custom` component whose allocation carries the yeast, and
    there is no `fermentolyse`: no first-contact step, `insufficient_data`,
    `no_first_contact_step`.
15. **A frasage that overruns, in a bake.** `frasage` (incorporates everything, yeast included,
    planned 5 min), `mix` (8 min), `bulk`. The baker starts the `frasage` at 09:00 and completes it
    at 09:09. In the plan the clock started at 09:05; in the bake it starts at 09:09, the recorded
    completion, and the kneading and the bulk are projected from there. While the `frasage` runs,
    the dough has no progress, and a dough-temperature reading or thermal inputs on it are refused
    (it is not a dough step); on the `mix` they are accepted.

## Subjects and component phases

**0.3.0 specification merged in #96 (audit 91-R2); subjects, their validation, moves, copies,
documents and the fermentation rule implemented in #106 slice A (contract 0.16.0).** A recipe describes the
whole production protocol: a poolish prepared once, fermented 16 h at 21 °C and then 8 h at
4 °C, a tangzhong cooked while it rests, and only then the main dough. These phases concern the
**same component and the same mass**, not independent poolishes.

```ts
type Subject = { kind: 'mainDough' } | { kind: 'component'; id: string }; // id: a formula component
```

- A step works on one **subject**. When `subject` is absent it is derived: a step whose id is a
  component id works on that component (the existing rule, "the step with the component's id");
  any other step works on the main dough.
- A component may have **several steps**: preparing it (`frasage`, `mix`, `scald`), its
  fermenting phases (`preferment`, each with its own conditions, such as 21 °C then 4 °C), cooling
  it, in sequence or in parallel with other work. They share its subject, stay in the **one**
  process graph with stable ids, and no nested scheduler exists. Grouping steps by subject is a
  view, never a second scheduling authority.
- **Incorporation.** The component joins the main dough **once**: exactly one main-dough step
  declares `{ item: 'component', id, sharePct: 100 }` (Incorporations above: every final-mix item
  once, shares summing to 100). **Every step of the component is upstream of that step**, directly
  or through others; otherwise the process is `InvalidProcess` (a component cannot be
  incorporated before its phases end). A process that declares no incorporations joins the
  component at the first main-dough step that depends on one of its steps, as before, and the
  same rule holds for that join: every step of the component is upstream of it.
- **Adding a phase keeps the chronology.** The editor adds a component phase **before the join**:
  inserted after the component's last phase, it takes that phase's place in the join's
  `dependsOn` (as `InsertStepAfter` does), so the main dough waits for it. An edit that would leave
  a phase after or beside the join is refused as a whole (`InvalidProcess`); a component never
  keeps fermenting after it was incorporated.
- **A timeline is not a mass.** Steps carry no masses: the component's grams come from the
  formula's allocation and are counted once, however many steps prepare it. Its timeline is the
  window of its steps (derived); its incorporated mass is one allocation.
- **Mixing steps.** An explicit `subject` decides whether a mixing step belongs to the main dough
  (`mainDough`) or to a component. The incorporation rule of Mixing steps applies only to a step
  without a `subject`.
- **Validation.** `subject.id` must be a component of the formula (`InvalidProcess` otherwise,
  with the step as `path`). `subject: mainDough` on a step whose id is a component id is
  contradictory and refused.
- **A preferment's first contact** (owner decisions of 2026-11-04, #231). The same rule holds for
  a preferment: its clock starts at the **end** of its own first-contact step. That is the first
  mixing step (`frasage` or `mix`) whose subject is the component, ahead of its fermenting phase
  (the preparatory mix of the poolish). Its duration **does not count**, and fermentation starts
  when it ends: the estimate is the time of the fermenting phase, whatever the preparatory mix
  lasted. A component without a mixing step of its own (the fermenting phase alone, the legacy step
  with its id) has nothing to exclude and its clock starts at the start of that phase. Any other
  step of the component between its mixing step and its fermenting phase is not modelled, as for
  several fermenting phases (below): it is recorded, scheduled and shown, and not counted. The
  live recomputation of a bake covers the dough only; a preferment's estimate is a plan's.
- **Fermentation** (`fermentation.md`). A component with one fermenting phase (one step whose
  operation is `preferment`) is estimated as before. With **several** fermenting phases the
  estimate is `insufficient_data` with the reason `component_phases_unmodelled`: this model has no
  validated temperature path across them, no coefficient is added here, and it never silently
  counts one phase. The recorded phases, durations and temperatures remain, are scheduled and are
  shown. The water temperature (fermentation.md) uses the temperature of the component's last
  fermenting phase, the one it has when it joins the dough.
- **Moves and copies** (Step move and duplicate, #92). One predicate, `subjectOf(step)` (the
  explicit `subject`, else the component named by the step's id, else the main dough), is used by
  both. A chain move needs the step's neighbours and target to share its subject
  (`crossesWorkpiece` otherwise) and never moves a step carrying incorporations
  (`incorporationStep`); an order-only move keeps the subject. A step with an explicit component
  subject can be duplicated and the copy keeps the subject and adds no mass; the legacy step whose
  id is the component's is not duplicable.
- **Compatibility.** Existing recipes have no `subject` and mean what they meant: the rule that
  every step of a component is upstream of its join is checked only for a component with at least
  one step that names it as its `subject`, so a stored legacy recipe is never refused by it. Adding phases to
  one, as above, keeps it valid: the legacy step stays, the new steps name their subject, and the
  join is rewired to wait for them. An
  older app refuses a document holding `subject` as an unknown field (`persistence.md`), never
  misreads it. `CONTRACT_VERSION` is bumped by one minor step, from `0.15.0` to `0.16.0`, by the
  implementing pull request (#106 slice A).

Examples (hand-checked against the rules above):

1. **Poolish in three steps.** `poolish-prepare` (`frasage`, subject poolish, 10 min),
   `poolish-counter` (`preferment`, 16 h, 21 °C), `poolish-fridge` (`preferment`, 8 h, 4 °C), then
   the main-dough `frasage` incorporating `component` poolish once. Valid. The poolish estimate is
   `insufficient_data` (`component_phases_unmodelled`); every phase stays visible and scheduled.
2. **Tangzhong beside it.** `tangzhong-cook` (`scald`, 15 min) and `tangzhong-cool` (`cool`, 25
   min), subject tangzhong, run during the poolish's last hours; the main-dough `frasage` depends
   on `poolish-fridge` and `tangzhong-cool`. The graph places them in parallel: the durations are
   not added serially.
3. **Legacy.** A step `poolish` (`preferment`, no `subject`) beside a main `mix` depending on it:
   unchanged.
4. **Adding a phase to a legacy recipe.** `poolish` stays; `poolish-fridge` is added with subject
   poolish and `dependsOn: ['poolish']`; the main step depends on `poolish-fridge`. Valid, and
   the legacy estimate is replaced by `insufficient_data` only because two phases now ferment.
5. **Incorporated too early.** The main-dough `frasage` incorporates the poolish but depends on
   `poolish-counter` only, not on `poolish-fridge`: `InvalidProcess`.
6. **Mass once.** A poolish of 30 % of the flour, 600 g of flour: 180 g of flour in the poolish,
   counted once, not per step.
7. **Move within a subject.** `poolish-fridge` moved before `poolish-counter`: a chain move among
   the same subject's steps, valid and shown. Moved after the main-dough `frasage`:
   `AmbiguousMove`, `crossesWorkpiece`.
8. **Unknown component.** `subject` `{ kind: 'component', id: 'levain' }` with no such component:
   `InvalidProcess`.
9. **Adding a phase rewires the join.** In example 3, adding `poolish-fridge` (subject poolish,
   8 h) after `poolish`: the main `mix` → `[poolish-fridge]` and `poolish-fridge` → `[poolish]`.
   Leaving the `mix` on `[poolish]` would let the poolish ferment after the mix: refused,
   `InvalidProcess`.
10. **Explicit subject beats the heuristic.** `poolish-frasage` (`frasage`, subject poolish, no
    incorporations), `poolish-counter` (subject poolish), then a main-dough `frasage` with
    `subject: mainDough` that declares no incorporations either, and a `mix`. The mixing-steps
    heuristic of #91 would call the first mixing step without incorporations a component's and
    could misread the main `frasage`; with explicit subjects, `poolish-frasage` is the poolish's,
    the main `frasage` begins the main dough's assembly, and the reference mixing step is the
    `mix`. List order alone classifies nothing.

## Step removal

Removing a step rewires each of its successors to the removed step's own dependencies, so the
order around it is kept; incorporations it declared are removed with it and the result is
validated like any process (a recipe whose incorporations no longer match its formula is
refused).

## Step move and duplicate

The Recipe editor reorders and duplicates steps. Both are edits of a recipe's process, which
becomes a new revision when saved; neither exists during a Preparation (only `InsertStepAfter`
does, bake-session.md). The list order is a **topological presentation**: `dependsOn` alone
defines timing. A drag therefore never changes a dependency the baker did not see, and a result
that cannot be shown to be right is refused, not repaired.

Both edits return a result or a **typed refusal**; a refusal changes nothing (atomic). The caller
validates the result like any process, and a validation failure is also a refusal as a whole
(`InvalidProcess`).

### Move

`moveStep(process, stepId, after)` places the step right after `after`, or first when `after` is
`null`. Outcomes, checked in this order:

1. `UnknownReference` when `stepId` or `after` is not in the process, or `after` is the step
   itself. This is a bad request or a stale editor, never a no-op.
2. `unchanged` when the step is already in that position (`after` is already the step before it,
   or `null` and it is first). Nothing is transformed: steps and edges are identical, whatever
   the dependencies around it.
3. **Order only.** The step moves in the list and **no dependency changes** when the new list is
   still a valid topological order. This is the move of an independent step (a tangzhong branch,
   a preheat's display position). An order-only move keeps every field, the `subject` included.
4. **Chain move.** When order only is invalid because the step, or a step that depends on it,
   would come before one of its dependencies, the step is moved **along the chain** under the
   conditions below. The result lists `changedEdges` (`{ step, before, after }` for each
   rewritten `dependsOn`) so that the interface shows them.
5. Otherwise a refusal: `MoveBreaksDependencies` (with the `path` of the first violated
   dependency) or `AmbiguousMove` (with a `reason`). The baker then edits the dependencies
   explicitly; no guess is made.

**Subject of a step.** One predicate decides which work a step belongs to, here and in
duplication: `subjectOf(step)` is the step's explicit `subject` when it has one (component phases,
#96), else the component whose id is the step's id, else the main dough. A chain move never
changes a step's subject.

The chain move applies only when all of these hold; any other case is `AmbiguousMove`:

- The step has at most one dependency `P` and at most one dependent `T`.
- The target `after` has at most one dependent `B`, counted after the step is taken out. The
  target may lie before or after the step in the chain: a move down, below a step that depends on
  the moved step, is the same chain move as a move up, not a different operation (0.24.1, owner
  report of 2026-11-06). When the target is `T` itself or a later step, `B` is counted in the
  graph where `T` has already taken the step's dependency.
- **Same subject.** `P`, `T`, `after` and `B`, where present, have the step's subject; otherwise
  `reason: 'crossesWorkpiece'`. One exception: for a component's step, `T` or `B` may be the step
  where that component joins the main dough (the step incorporating it, else, without declared
  incorporations, the first step of another subject depending on one of its phases), so the last
  phase can be moved among the others (Subjects, example 7). A component's steps are rearranged
  among themselves; a step never crosses into another component or into the main dough by a
  drag.
- **No incorporation moved.** The step carries no `incorporations` (`reason: 'incorporationStep'`):
  moving the step where a component or ingredient joins the dough changes what the dough holds
  when. It is moved by order only, or its dependencies are edited explicitly.
- The step is not an `alap` step (it can only be moved by order only; its dependencies and its
  "as late as possible" meaning are never rewritten by a drag). A move down that order only cannot
  express is refused for an `alap` step with `MoveBreaksDependencies` (example 6).
- The step is not a `beforeTarget` step (Steps before a target). Nothing depends on it and its
  start comes from its target, not from its list position, so a drag only moves it by order only;
  when order only is invalid the move is refused (`reason: 'scheduledFromTarget'`). Its
  `dependsOn`, `target`, `startRule` and `requiredWarmupS` change only by explicit edits.
- The result passes validation, including "every step of a component is upstream of its
  incorporation" (#96): a move that would incorporate a component before one of its phases ends
  is refused as a whole.

The chain move then does exactly this, and nothing else:

- Out of the old place: `T`, if any, takes the step's dependency instead of the step
  (`T.dependsOn` with the step replaced by `P`, or without it when the step was first).
- Into the new place: the step depends on `after` (no dependency when first), and `B`, if any,
  takes the step instead of `after`. In first position, `B` is the step that was first in the
  list; other steps without a dependency keep none.
- Every other step keeps its dependencies, its fields, its `schedule`, its incorporations and its
  id. A branch that does not run through the step or the target is untouched.

The two rewrites are the same in both directions; only the list position of the step differs. A
branch that leaves the chain between the step and the target (a step with a second dependent that
is neither the target nor `T`) is untouched and keeps depending on the same steps.

### Duplicate

`duplicateStep(process, stepId, newId)` proposes a **new step** right after the original. It is
not an exact clone and the interface does not present it as one: it opens the copy for review and
lists what was not carried.

- Carried: `operation`, `label`, `endCriterion`, `conditions`, `technique`, `equipment` (the
  same item references, no new copy), `thermal` (the same container and environment: an input
  that describes the setting, not a prediction; 0.22.0) and an explicit `subject` (the copy works on the same
  component and adds no mass: the grams come from the formula's allocation, once).
- `plannedDurationS` is carried only when the original's duration is the baker's (manual). A
  `durationMode: 'model'` original gives a copy **without a duration** (unknown): a model-driven
  duration belongs to one dough step (`fermentation.md`) and a literal copy of a prediction is
  not a repeat.
- Not carried: `incorporations` (the shares would exceed 100), `accepted`, `durationMode`.
- The copy is `asap` and depends on the original, whose dependents now depend on the copy, as
  `InsertStepAfter` does. `NotDuplicable` is returned, with a `reason`, for an `alap` or
  `beforeTarget` step (a copy would be a new serial duration or a second heating target) and for
  the legacy step whose **id** is a component's (`workpieceStep`): a second step with that role
  would be ambiguous. A step with an explicit component `subject` is duplicable.
- **Preview.** The result carries the reprojected plan, so the interface shows what the copy does
  to the schedule before it is kept: a copied 3 h bulk moves every later step by 3 h. A copy
  without a duration is shown as "duration required", and the steps after it are `unknownAfter`
  that copy until the baker gives one: never 0.
- The id is new, unique and never reused (derived from the operation, as for an added step).

### Undo, redo and reset

These are interface features over the draft (`drafts.md`); they add no persisted data, event or
history.

- Undo and redo apply to **complete draft edits**, formula and process together. Each result is
  saved by the normal draft persistence, so the saved draft is always the one on screen.
- A new edit after an undo clears the redo. Moving between Recipe and Planning keeps the editing
  session and its undo stack while the draft stays open.
- The undo stack lives in memory: after the app restarts it is empty, and the saved draft is
  exact. A draft "has no history" (`drafts.md`) means exactly this.
- **Reset** names its baseline from the draft's `origin`: "back to revision N" (`revision`,
  `baseVersion`), "back to the template copy" (`template`), "back to the blank recipe" (`blank`).
  For a draft resumed after a restart the baseline is that same source, not the state at resume.
  It asks for confirmation when the draft has edits, and it never changes a saved revision.

Examples (the edges are worked by hand from the rules above):

1. **Identity.** `mix`, `proof` `[mix]`, `preheat` `[mix]` (parallel), `bake` `[proof, preheat]`.
   Move `proof` after `mix`: `unchanged`; every edge as before. (Removing then inserting would
   have rewired `preheat` to `[proof]`: a valid but wrong graph.)
2. **Order only.** In example 1, move `preheat` right after `mix`. The list is still
   topological, so no edge changes: `preheat` keeps `[mix]` and `bake` keeps `[proof, preheat]`.
3. **Chain move.** `mix`, `bulk` `[mix]`, `shape` `[bulk]`, `proof` `[shape]`, `bake` `[proof]`.
   Move `shape` after `mix`. Order only is invalid. The step has one dependency and one
   dependent; the target `mix` has one dependent `bulk`. Out of the old place: `proof` →
   `[bulk]`. Into the new one: `shape` `[mix]`, `bulk` `[shape]`. `changedEdges`: `proof`, `shape`,
   `bulk`. Result: `mix` `[]`, `shape` `[mix]`, `bulk` `[shape]`, `proof` `[bulk]`, `bake` `[proof]`.
4. **Join kept.** `mix`, `bulk` `[mix]`, `proof` `[bulk]`, `shape` `[proof]`, a legacy `alap`
   `preheat` `[]`, `bake` `[shape, preheat]`. Move `shape` after `bulk`. Out: `bake` → `[proof,
preheat]`. In: `shape` `[bulk]`, `proof` → `[shape]`. `preheat` untouched.
5. **Ambiguous.** `mix` with two dependents (`bulk` and a branch `tangzhong` `[mix]`): moving a
   chained step after `mix` is `AmbiguousMove`: the target has two dependents. Nothing changes.
6. **Refused by validation.** Moving a legacy `alap` `preheat` after `bake` is not a chain move
   (it is `alap`); order only is invalid because `bake` depends on it: `MoveBreaksDependencies`.
7. **Unknown.** `stepId: 'missing'`: `UnknownReference`, not `unchanged`.
8. **Duplicate, manual.** `bulk` (manual, 3 h) `[mix]`, `shape` `[bulk]`: `bulk-2` (3 h, same
   technique) `[bulk]`, `shape` → `[bulk-2]`; the copy carries no incorporation. The preview
   shows `shape` and every later step 3 h later.
9. **Duplicate, model-driven.** The same with `durationMode: 'model'`, 6 h: `bulk-2` has no
   duration and is manual; the interface shows "duration required" and the steps after it are
   `unknownAfter: ['bulk-2']`, never planned with 0.
10. **Not duplicable.** An `alap` `preheat`, a `beforeTarget` preheat, or the legacy step whose id
    is a component's: `NotDuplicable`.
11. **Duplicate a component phase.** `poolish-fridge` (`preferment`, 8 h, 4 °C, subject
    `{ kind: 'component', id: 'poolish' }`) `[poolish-counter]`, the main `frasage`
    `[poolish-fridge]`: `poolish-fridge-2` (8 h, 4 °C, same subject) `[poolish-fridge]`, the
    `frasage` → `[poolish-fridge-2]`. The poolish still joins once, with the same grams.
12. **Same-subject chain.** All with subject poolish: `poolish-prepare`, `poolish-counter`
    `[poolish-prepare]`, `poolish-fridge` `[poolish-counter]`, `poolish-rest` `[poolish-fridge]`;
    then the main `frasage` `[poolish-rest]`. Move `poolish-fridge` after `poolish-prepare`: `P` =
    `poolish-counter`, `T` = `poolish-rest`, target `poolish-prepare` with dependent `B` =
    `poolish-counter`, all poolish. Out: `poolish-rest` → `[poolish-counter]`. In:
    `poolish-fridge` `[poolish-prepare]`, `poolish-counter` → `[poolish-fridge]`. `changedEdges`:
    `poolish-rest`, `poolish-fridge`, `poolish-counter`; the `frasage` is untouched. Moving
    `poolish-rest` instead (its dependent `T` is the main-dough `frasage`): `AmbiguousMove`,
    `crossesWorkpiece`, nothing changes.
13. **Incorporation join.** The main `frasage` incorporating the poolish is dragged above
    `poolish-fridge`: order only is invalid, and the step carries incorporations:
    `AmbiguousMove`, `incorporationStep`.
14. **A preheat scheduled from its target.** A `beforeTarget` preheat `[shape]` dragged after
    `proof`: order only is valid (nothing depends on it), its `dependsOn`, `target` and warm-up are
    unchanged, and its planned start is still computed from the bake. Dragged above `shape`:
    order only is invalid; `AmbiguousMove`, `scheduledFromTarget`.
15. **Undo.** A formula edit then a step move, then undo twice: the draft shows the starting
    formula and process, each undo saved; a new edit then clears the redo.
16. **Reset.** A `revision` draft at revision 3 with edits: reset offers "back to revision 3" with
    a confirmation, and revision 3 itself is untouched.
17. **Chain move down, one step.** `mix`, `bulk` `[mix]`, `shape` `[bulk]`, `proof` `[shape]`,
    `bake` `[proof]` (example 3's chain). Move `bulk` after `shape`. Order only is invalid
    (`shape` would come before `bulk`, its dependency). `P` = `mix`, `T` = `shape`; the target
    `shape` has one dependent, `proof`, so `B` = `proof`. Out: `shape` → `[mix]`. In: `bulk`
    `[shape]`, `proof` → `[bulk]`. `changedEdges`: `shape`, `bulk`, `proof`. Result: `mix` `[]`,
    `shape` `[mix]`, `bulk` `[shape]`, `proof` `[bulk]`, `bake` `[proof]`. It is the result of
    moving `shape` after `mix`, as example 3 does: the two drags are the same operation.
18. **Chain move down, several steps.** The owner's chain, each step depending on the previous
    one: `preferment`, `kneading` `[preferment]`, `shaping` `[kneading]`, `rest` `[shaping]`,
    `bulk` `[rest]`, `division` `[bulk]`, `final-proof` `[division]`. Move `rest` after
    `division`. `P` = `shaping`, `T` = `bulk`; the target `division` has one dependent,
    `final-proof`, so `B` = `final-proof`. Out: `bulk` → `[shaping]`. In: `rest` `[division]`,
    `final-proof` → `[rest]`. `changedEdges`: `bulk`, `rest`, `final-proof`. Result:
    `preferment` `[]`, `kneading` `[preferment]`, `shaping` `[kneading]`, `bulk` `[shaping]`,
    `division` `[bulk]`, `rest` `[division]`, `final-proof` `[rest]`. In the interface: Détente
    dragged below Division gives Pointage `[Façonnage]`, Division `[Pointage]`, Détente
    `[Division]`, Apprêt `[Détente]`.
19. **Chain move down from the first position, or to the end.** In example 17's chain, move
    `mix` after `bulk`: `P` absent, `T` = `bulk`, `B` = `shape`. Out: `bulk` → `[]`. In: `mix`
    `[bulk]`, `shape` → `[mix]`. Result: `bulk` `[]`, `mix` `[bulk]`, `shape` `[mix]`, `proof`
    `[shape]`, `bake` `[proof]`. Move `bulk` after `bake` instead: `T` = `shape`, no `B`. Out:
    `shape` → `[mix]`. In: `bulk` `[bake]`. Result: `mix` `[]`, `shape` `[mix]`, `proof`
    `[shape]`, `bake` `[proof]`, `bulk` `[bake]`.
20. **Chain move down, still refused.** (a) A step that carries incorporations: in example 17's
    chain, `bulk` incorporating an ingredient and dragged after `shape`: `AmbiguousMove`,
    `incorporationStep`. (b) A target with two dependents: `mix`, `a` `[mix]`, `b` `[a]`, `c`
    `[b]`, `x` `[b]` (a branch). Move `a` after `b`: order only is invalid; `T` = `b`; out: `b`
    → `[mix]`; the target `b` still has two dependents, `c` and `x`: `AmbiguousMove`,
    `targetDependents`, nothing changes. Moved after `c` instead, the move is valid: `B` = none,
    `a` `[c]`, `b` `[mix]`, `x` `[b]` untouched (the branch is not rewired). (c) A step with two
    dependents: `mix`, `a` `[mix]`, `b` `[a]`, `x` `[a]`. Move `a` after `b`: order only is
    invalid, and `a` has two dependents, `b` and `x`: `AmbiguousMove`, `stepDependents`.

## Projection

- Modes: start at a time (start now is start at `now`), or ready by a time for a designated
  target step. Ready-by plans the whole process as early as possible from an origin, then shifts
  the origin so the target ends at the requested time; it needs known durations up to the target
  and is only valid before the bake has started.
- A step's planned end is known only when its start is known and it has `plannedDurationS`.
  Started and finished steps use their recorded times.
- During a bake, steps not yet started cannot be planned before `now`.
- `beforeTarget`: placed after the other steps, from its target's planned start (Steps before a
  target); it never moves another step.
- `asap`: as early as its dependencies allow. `alap`: as late as possible while still ending
  before the **earliest** planned start of its successors (preheating, tangzhong).
- Replanning during a bake: freeze recorded facts (actual starts and ends) → forward pass for
  `asap` steps → backward pass for `alap` steps not yet started. Replanning covers **the whole
  future plan**, not only successors of the changed step.
- An end conditioned on an observation, without an accepted estimate, makes downstream times
  `unknownAfter: StepId[]`.
- No step completes automatically because its planned duration has elapsed.
- The scheduler only does time arithmetic. Biological continuity (fermentation during handling)
  belongs to #9/#29.

## Relative timeline and groups

**0.3.0 specification merged in #97 (audit 91-R5); engine implementation #106, UI implementation #100.** The Recipe tab must be
usable without opening Planning: it shows the whole production protocol with, for each step, its
own duration and its position in time, and the steps grouped by the mass they work on. The
interface requirement is recorded in `docs/architecture/2026-10-13-recipe-groups-mockup.md`.

- **One projection.** Recipe and Planning read the same `Projection` (`projectProcess`). Planning
  anchors its origin to a chosen start or ready-by time; Recipe reads the **relative** timeline:
  the same projection with the origin at the earliest planned start of the process (time 0). No
  other time solver exists, and a list index is never a time: the list is a topological order,
  not a total temporal one.

```ts
type Timing =
  | { status: 'known'; startS: number; endS: number } // seconds from the origin
  | { status: 'unknown'; unknownAfter: StepId[] }; // never zero-filled

type Window =
  | { status: 'complete'; startS: number; endS: number; elapsedS: number }
  | { status: 'partial' | 'unknown'; reasons: StepId[] };

interface StepTiming {
  stepId: StepId;
  durationS?: number; // the step's own duration, where known
  timing: Timing;
}
interface GroupTiming {
  id: string; // 'component:<id>', 'mainDough' or 'cooking'
  stepIds: StepId[];
  window: Window;
}
interface RelativeTimeline {
  steps: StepTiming[];
  groups: GroupTiming[];
  total: Window;
}
```

- **Groups** are derived and not persisted: one per component (the steps whose subject is that
  component, Subjects and component phases), `cooking` (the cooking operations, `preheat` steps
  and every step downstream of a cooking step, such as the `cool`) and `mainDough` (the other
  main-dough steps). A step belongs to exactly one group. A group is a view, not a scheduling
  authority.
- **Window.** A group's window is `complete` only when every member's timing is known:
  `startS` is the earliest start, `endS` the latest end and `elapsedS = endS − startS`, **never**
  the sum of the members' durations (parallel steps overlap). With one unknown member the window
  is `partial` and claims **no envelope** from the known members; `reasons` names the blockers.
  With none known it is `unknown`. The `total` follows the same rule over all steps.
- **Overlap is normal.** Group windows overlap and the total is not their sum; a branch that runs
  concurrently never lengthens the total as though it were sequential.
- **Preheating.** A `beforeTarget` preheat (#94, option C chosen by the owner) is an overlapping
  branch placed from its target. Its timing in the timeline is the derived heating interval
  `[plannedStart, targetStart]` (it has no `plannedDurationS`), so the cooking group of the mockup
  reads `+29:15 → +30:25`, 1 h 10 min, while the total stays 30 h 25 min. Three readings stay
  separate: the required warm-up, the projected interval and, in a Preparation, the observed
  "ready" (never inferred from elapsed time). When its `warmup` is `unknown` the preheat's timing
  is unknown and its group is `partial`; when it is `unavailable` (a start after the target) no
  interval is drawn and the group is not given an envelope from it; an overdue trigger is shown as
  due since `dueAt`, never as an inverted or backdated bar. It never lengthens the total or any
  other step.
- **Nothing is stored twice.** The relative start and end are never persisted; they are derived
  from the durations and the dependencies, so a change of one duration changes every reading in
  Recipe and Planning together.

Information architecture for the Recipe tab (the interface, #35):

- Collapsible groups (Poolish, Tangzhong, Main dough, Cooking) containing their steps, the
  temperatures, the instructions and three distinct readings: the step's **own duration**, its
  **relative start** and its **relative end**; the header shows the group's **window** and its
  **elapsed span**, and the total span of the recipe.
- A partial or unknown window is shown as such, with its reasons, never as a number. A group with
  one unknown step is "provisional", not a definitive envelope.
- Open and closed groups are interface state, kept across Recipe and Planning navigation in the
  open recipe, and never change the recipe. The disclosure is accessible (a button with
  `aria-expanded`, focus and touch targets) and usable in French and English on a narrow phone.
- This asks for no accordion in the core and no replacement of Ionic.
- An optional **Steps | Timeline** switch (owner decision of 2026-10-13, review on #97): Steps is
  the default grouped list above; Timeline is a read-only lane view of the same projection, where
  overlapping branches (the tangzhong during the cold poolish, the preheat during the proof) sit on
  separate lanes. On a narrow phone it scrolls horizontally or zooms to a selected window rather
  than squeezing the whole recipe. It is a view, not an editor and not a calendar: Planning anchors
  the same projection to clock times.

Examples (hand-computed; times are `+hh:mm` from the start of the first step, and the values are
scheduled, not predictions of the biology). A poolish bread with a tangzhong:

- Poolish (`component:poolish`): prepare 10 min, counter 16 h, fridge 8 h: `+00:00 → +24:10`,
  elapsed 24 h 10 min.
- Tangzhong (`component:tangzhong`): cook 15 min, cool 25 min, run alongside the poolish's last
  hours: `+23:30 → +24:10`, elapsed 40 min.
- Main dough: frasage 10 min, kneading 10 min, bulk 3 h, shaping 15 min, proof 2 h:
  `+24:10 → +29:45`, elapsed 5 h 35 min.
- Cooking: preheat (30 min required), bake 40 min: `+29:15 → +30:25`, elapsed 1 h 10 min.

1. **The whole recipe.** The total is `+00:00 → +30:25`, elapsed 30 h 25 min. The sum of the four
   group windows is 24:10 + 0:40 + 5:35 + 1:10 = 31 h 35 min, which is not the total: the
   groups overlap.
2. **A shorter cold phase.** The fridge phase goes from 8 h to 6 h. Poolish `+00:00 → +22:10`;
   tangzhong `+21:30 → +22:10`; main dough `+22:10 → +27:45`; cooking `+27:15 → +28:25`; total
   28 h 25 min. Recipe and Planning show the same offsets from the same projection.
3. **An unknown duration.** The fridge phase has no duration: the poolish window and every
   window after it are `partial` with the blocker as `reasons` (`unknown` when no member of the
   window has a known timing), the total is `partial`, and
   nothing shows a "complete" envelope or a zero.
4. **Concurrent branch.** Removing the tangzhong from the process does not change the total, and
   adding it back does not lengthen it.
5. **Preheat.** A `beforeTarget` preheat after shaping with 30 min required starts at `+29:15`
   (30 min before the bake at `+29:45`); the proof stays one 2 h step. The cooking group's window
   starts at `+29:15` and overlaps the last 30 min of the proof; no span grows by the 30 min. A
   legacy `alap` preheat of 30 min gives the same times here (its hard dependency only shows when
   the window is too short).
6. **Planning anchoring.** Planning starts the same process on Saturday 06:00: each step's clock
   time is 06:00 plus its relative start, and the relative readings are unchanged.
7. **Not persisted.** Saving the recipe stores no group, no relative time and no open or closed
   state.

**Implementation notes (#106 slice C, no persisted shape changes: `CONTRACT_VERSION` stays `0.18.0`).**
API of `@flourprint/core/domain`, for Recipe (#100) and Planning (#133); nothing is computed in React.

- `relativeTimeline(process, { components? }): Result<RelativeTimeline, ProcessError>` runs
  `projectProcess` once from an internal origin and returns offsets in seconds from the earliest
  planned start. The result holds no date. `components` is the formula's component ids; absent, the
  ids the process names (`subjectOf`). Errors are those of `projectProcess` (`InvalidProcess`, ...),
  unchanged.
- `anchorTimeline(timeline, { kind: 'startAt', at } | { kind: 'readyBy', at, target }):
Result<AnchoredTimeline, ProcessError>` adds the anchor: every instant is `at` plus the offset
  (`readyBy` shifts the origin so `target` ends at `at`). Errors: `UnknownReference` (`mode.target`)
  and `IncompatibleConstraint` (target timing unknown), as in `projectProcess`. `windowOf(steps)`
  is the one window rule. Types: `Timing`, `Window`, `StepTiming`, `GroupTiming`,
  `RelativeTimeline`, `TimelineAnchor`, `AnchoredTimeline`, `AnchoredWindow`.
- `StepTiming` also carries the projection's `warmup` of a `beforeTarget` step. Its timing is
  `unknown` when the warm-up is `unknown` (`unknownAfter` = its blockers; its group is then
  `partial` as for any unknown member). When `unavailable`, its timing is `unknown` with empty
  `unknownAfter` and it is **not a window member**: it affects only itself, so its group and the
  total are computed from the other steps (no interval, no envelope, no blocker from it).
- Groups come in the order: components (first step order), `mainDough`, `cooking`; a step in the
  cooking set (cooking operations, `preheat`, and steps downstream of a cooking step) is in
  `cooking` whatever its subject. Empty groups are omitted.
- A window with no known member is `unknown`, with some known members `partial` (the Window rule;
  Example 3 above).
- Supported: a recipe plan (no facts, no `now`). Unsupported: a relative timeline of a Preparation
  in progress (recorded facts, `overdue`); read `projectProcess` for that. Not provided: open/closed
  group state (interface only).

Implementation (`@flourprint/core/domain`): `validateProcess`, `projectProcess`,
`planIncorporations`, and the graph utilities `topologicalSort`, `isTopologicalOrder`,
`validateReferences`.
