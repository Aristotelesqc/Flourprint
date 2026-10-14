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
  schedule: 'asap' | 'alap' | 'beforeTarget'; // beforeTarget: Steps before a target, below
  plannedDurationS?: number; // absent = unknown
  endCriterion?: EndCriterion; // observation or user decision
  accepted?: AcceptedSuggestion; // set when plannedDurationS was taken from a model suggestion
  durationMode?: 'manual' | 'model'; // absent = manual; 'model' on one dough step (fermentation.md)
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
  doughTemperatureC?: number; // mix step only: target dough temperature (advanced mode)
  frictionC?: number; // mix step only: mixer friction for the water temperature
}
```

- `temperatureC` is the ambient the dough sits in. `doughTemperatureC` and `frictionC` are only
  read on a `mix` step; elsewhere they are refused (`InvalidProcess`). Their use is defined in
  fermentation.md.
- All temperatures are in °C and finite; the scheduler ignores them.

## Steps before a target (preheating)

**Proposal of 2026-10-13, revision 3: the owner chose option C on #97.** A baker preheats the oven
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
  `CONTRACT_VERSION` is bumped by one minor step, from the version current at merge, by the
  implementing pull request.

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
14. **Start after the target.** A preheat `[cool]` targeting the `bake` that `cool` follows: its
    earliest start is after the bake's start. `unavailable`, `startsAfterTarget`, no span drawn,
    `preheat_window_unavailable`; no negative window.
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

Implementation (`@flourprint/core/domain`): `validateProcess`, `projectProcess`,
`planIncorporations`, and the graph utilities `topologicalSort`, `isTopologicalOrder`,
`validateReferences`.
