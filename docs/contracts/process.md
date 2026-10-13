# Contract: process (D3)

Status: **approved** (issue #30). Related issues: #5, #9, #21, #28.

## Model

A process is an open list of repeatable **step instances** (one stable ID per instance), linked by
finish-to-start dependencies. The business content of a step (operation, target, dough state,
conditions, incorporations) follows #5; this contract fixes the graph and the timing.

```ts
interface ProcessStep {
  id: StepId;
  dependsOn: StepId[]; // finish-to-start
  schedule: 'asap' | 'alap' | 'alongside'; // alongside: Steps alongside, below
  plannedDurationS?: number; // absent = unknown
  endCriterion?: EndCriterion; // observation or user decision
  accepted?: AcceptedSuggestion; // set when plannedDurationS was taken from a model suggestion
  durationMode?: 'manual' | 'model'; // absent = manual; 'model' on one dough step (fermentation.md)
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
- `alongside` without a cooking step after it in list order is an error; it carries no
  `durationMode: 'model'` and no incorporations (Steps alongside).
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
  doughTemperatureC?: number; // mix step only: target dough temperature (advanced mode)
  frictionC?: number; // mix step only: mixer friction for the water temperature
}
```

- `temperatureC` is the ambient the dough sits in. `doughTemperatureC` and `frictionC` are only
  read on a `mix` step; elsewhere they are refused (`InvalidProcess`). Their use is defined in
  fermentation.md.
- All temperatures are in °C and finite; the scheduler ignores them.

## Steps alongside (preheating)

**Proposal of 2026-10-13, pending the owner's approval.** A baker preheats the oven while the
dough proofs, but the heating is not time spent waiting. `schedule: 'alongside'` models it
without a hidden "as late as possible" rule: **the baker puts the step where heating starts, and
the plan runs on without it.**

- An `alongside` step starts when its dependencies end, like an `asap` step, and **takes no time
  in the sequence**: a step that depends on it starts at that same instant, so the default
  `dependsOn = [previous step]` keeps working for the step added after it.
- Its **heating window** runs from its start to the planned start of the first cooking step after
  it in list order (cooking operations, Techniques below). The window is derived, never stored:
  it is what the remaining steps leave.
- `plannedDurationS` is the **required time** (30 min for an oven), a minimum for the window. It is
  never added to the sequence and never moves another step. Absent means no requirement.
- Validation: a cooking step must follow it in list order (`InvalidProcess` otherwise). That
  cooking step need not depend on it. An `alongside` step has no `durationMode: 'model'` and no
  incorporations.
- Check `preheat_too_short` (`drafts.md`, a warning): the window is known and shorter than the
  required time, with `availableS` and `requiredS`. The window is known when the planned
  durations between the step and the cooking step are known; otherwise there is no warning, and an
  unknown duration is never taken as zero.
- **Dough steps** (`fermentation.md`): an `alongside` step is not one, and the dough steps on
  either side of it count as consecutive.
- **In a Preparation**: `StartStep` on an `alongside` step writes `StepStarted` and
  `StepCompleted` at the same instant (`at`), so it never blocks its successors; the start is
  when the baker began heating. "The oven is ready" is an optional `ObservationAdded`. Nothing
  completes when the required time elapses (bake-session.md).
- **Compatibility**: an `alap` `preheat` step written before this rule keeps its meaning and its
  projection (Projection below); new recipes and the templates use `alongside`. An older app
  refuses a recipe holding the new schedule value as a document with an unknown discriminant
  (`persistence.md`), never misreads it. `CONTRACT_VERSION` is bumped by one minor step, from the
  version current at merge, by the implementing pull request.

Examples (hand-checked):

1. **Dutch-oven loaf.** `frasage`, `bulk` (3 h), `shape` (10 min), `preheat` (`alongside`, 30
   min), `proof` (2 h), `bake`. The window is the proof: 2 h, above the 30 min required. No
   warning. The plan lasts exactly as it would without the `preheat`.
2. **Too short.** `preheat` (`alongside`, 30 min), `bulk` (15 min), `bake`. The window is 15
   min: `preheat_too_short` with `availableS` 900 and `requiredS` 1800. The plan is unchanged.
3. **No time in the sequence.** Removing the `preheat` of example 1 changes no start or end time
   of any other step.
4. **Nothing to heat for.** An `alongside` `preheat` after the last cooking step, or a process with
   none: `InvalidProcess`.
5. **Older recipe.** An `alap` `preheat` beside the proof, with the `bake` depending on both,
   projects as before (Projection).
6. **In a Preparation.** The baker starts the preheat at 14:05: `StepStarted` and `StepCompleted`
   at 14:05, the next step can start at once, and an observation at 14:40 says the oven is ready.

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
  (flour, water and leavening, salt later), `mix`, `fold`, `bulk`, `rest`, `degas`, `divide`,
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

## Step removal

Removing a step rewires each of its successors to the removed step's own dependencies, so the
order around it is kept; incorporations it declared are removed with it and the result is
validated like any process (a recipe whose incorporations no longer match its formula is
refused).

## Projection

- Modes: start at a time (start now is start at `now`), or ready by a time for a designated
  target step. Ready-by plans the whole process as early as possible from an origin, then shifts
  the origin so the target ends at the requested time; it needs known durations up to the target
  and is only valid before the bake has started.
- A step's planned end is known only when its start is known and it has `plannedDurationS`.
  Started and finished steps use their recorded times.
- During a bake, steps not yet started cannot be planned before `now`.
- `alongside`: as `asap`, with no duration in the sequence (Steps alongside).
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

Implementation (`@flourprint/core/domain`): `validateProcess`, `projectProcess`,
`planIncorporations`, and the graph utilities `topologicalSort`, `isTopologicalOrder`,
`validateReferences`.
