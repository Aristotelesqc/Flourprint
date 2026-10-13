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
  // `alongside` only (Steps alongside):
  target?: StepId; // the cooking step it heats for
  requiredWarmupS?: number; // minimum warm-up: a requirement, never a duration in the sequence
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
- `alongside` is valid only on a `preheat` step, with a `target` that is a cooking step depending
  on it (directly or through other steps), no `plannedDurationS`, no `durationMode` and no
  incorporations; `requiredWarmupS` ≥ 0 when present (Steps alongside). `target` and
  `requiredWarmupS` are refused on any other schedule.
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

**Proposal of 2026-10-13, revised after the audit, pending the owner's approval.** A baker
preheats the oven while the dough proofs. Four different facts are involved and none is
confused with another: the **trigger** (switching the heating on), the **heating window** (from
the trigger until the cooking step that needs the heat starts), the **requirement** (the warm-up
the baker wants) and the **record** (when heating started and, if observed, when the equipment
was ready). `schedule: 'alongside'` carries them without a hidden "as late as possible" rule and
without a duration that is zero in one place and 30 minutes in another.

- **Scope.** `alongside` exists for the operation `preheat` only, in this version. Any other
  operation with `alongside` is `InvalidProcess`. A general milestone or trigger primitive would
  need its own contract.
- **Sequence.** An `alongside` step starts when its dependencies end, like an `asap` step, and has
  **no duration in the sequence by construction**: it has no `plannedDurationS`. A step that
  depends on it is satisfied **once the `alongside` step has started** (in the plan, at its start;
  in a session, at `StepStarted`), so the default `dependsOn = [previous step]` keeps working for
  the step added after it.
- **Target.** `target` names the cooking step the heat is for; it is explicit, never chosen by
  list position. It must depend on the `alongside` step, directly or through other steps, so it is
  downstream of the trigger. Removing the target is refused (`TargetInUse`) until the preheat is
  removed or given another target; a move that leaves the target no longer downstream fails
  validation and is refused as a whole. When the preheat and its target both name an appliance
  and they differ, the check `preheat_target_mismatch` (`drafts.md`) says so.
- **Heating window.** `windowS` is the scheduled difference
  `start(target) − start(preheat)` read from the projection, not a sum of list positions. It is
  derived and never stored.
- **Requirement.** `requiredWarmupS` is a minimum for the window. It never moves another step and
  is never added to any total.
- **Status.** The projection gives each `alongside` step a structured `warmup`:
  `sufficient` or `insufficient` (with `availableS` and `requiredS`), `unknown` (with the
  scheduler's `unknownAfter` blockers, for example a phase without a duration, or a target whose
  end rests on an observation) and `notApplicable` (no requirement). An absent warning is never
  read as sufficient: `insufficient` raises `preheat_too_short` and `unknown` raises
  `preheat_window_unknown` (`drafts.md`), both nonblocking.
- **In a Preparation.** `StartStep` on the step records `StepStarted`: the baker switched the
  heating on. It is the only event needed to let the next steps start. `CompleteStep` on it is
  optional and means the baker observed the equipment ready (`StepCompleted` at `at`). Nothing
  completes when the required time elapses, readiness is never inferred, and a started
  `alongside` step that was never completed is not an open step: finishing the Preparation does
  not need it. If the target is started with no readiness recorded and less than `requiredWarmupS`
  elapsed since the trigger, the interface warns and asks for confirmation; no command is
  refused. History and notifications name the two events "heating started" and "ready", never
  "preheated" at the trigger.
- **Legacy `alap` preheats** keep their meaning: as late as possible, with `plannedDurationS` as
  the heating duration and the cooking step depending on both. Nothing is migrated or
  reinterpreted: a session keeps the process it started with. Turning an `alap` preheat into an
  `alongside` one is an explicit edit that shows the before and after; it is never silent. An
  `alap` step is moved by order only and is not duplicated (Step move and duplicate).
- **Dough steps** (`fermentation.md`): an `alongside` step is not one, and the dough steps on
  either side of it count as consecutive.
- **Compatibility.** An older app refuses a recipe holding the new schedule value or fields as a
  document with an unknown discriminant or field (`persistence.md`), never misreads it.
  `CONTRACT_VERSION` is bumped by one minor step, from the version current at merge, by the
  implementing pull request.

Examples (hand-checked):

1. **Owner scenario.** `preheat` (`alongside`, `requiredWarmupS` 1800, `target` `bake`), `bulk`
   (15 min), `bake`. The window is 900 s: `warmup` is `insufficient`, `availableS` 900,
   `requiredS` 1800; `preheat_too_short` is raised. The bulk is neither shortened nor extended.
2. **Long overlap.** The same requirement with a 2 h `proof` before the `bake`: `sufficient`,
   `availableS` 7200. The trigger is projected 2 h before the loading. Nothing claims the oven is
   ready.
3. **Actual execution.** The baker switches the oven on at 14:05 and sees it hot at 14:40:
   `StepStarted` 14:05 (the next steps may start at once), `StepCompleted` 14:40. History never
   says that the preheating was complete at 14:05.
4. **Two cooking branches.** An oven `bake` and, in parallel, a skillet `panCook`. The preheat has
   `target` `bake` and an oven appliance; the skillet stage is never its target. With
   `equipment` naming a different appliance than its target: `preheat_target_mismatch`.
5. **No target.** An `alongside` step without `target`, or whose target is not downstream:
   `InvalidProcess`. The interface proposes the cooking steps downstream and asks when there are
   several; it never picks by list position.
6. **Missing duration.** A phase between the trigger and the target has no duration: `warmup`
   is `unknown` with `unknownAfter` naming it, `preheat_window_unknown` is raised, and nothing
   shows "0 min" or "sufficient".
7. **Invalid application.** `alongside` on `bulk` or `shape`: `InvalidProcess`. A
   `plannedDurationS` on an `alongside` step: `InvalidProcess`.
8. **Legacy.** An `alap` `preheat` of 30 min beside the proof keeps its projection and its
   journal. It is converted only by an explicit edit.
9. **Move.** Moving an `alongside` preheat is a chain move (`process.md`, Step move and
   duplicate): its heating start changes, `changedEdges` are shown, the window is recomputed and
   its `target` stays. A move that puts it after its target is refused.
10. **Target removal.** Removing the `bake` that is a preheat's target: `TargetInUse`.
11. **Readiness not recorded.** The `bake` is started 10 min after the trigger with 30 min
    required and no `StepCompleted` on the preheat: the interface warns and asks to confirm;
    the command is accepted and the preheat stays "ready: not recorded".
12. **Recipe and Planning.** Both read the same projection: the same start and end for every
    step, and a distinct "30 min required · 2 h available" annotation for the preheat, which adds
    nothing to any group's span.

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
- `alongside`: as `asap`, with no duration in the sequence; its dependents start when it starts
  (Steps alongside).
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
