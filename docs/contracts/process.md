# Contract: process (D3)

Status: **approved** (issue #30); step move and duplicate are a **proposal** of 2026-10-13,
revised after the audit, pending the owner's approval. Related issues: #5, #9, #21, #28, #35.

## Model

A process is an open list of repeatable **step instances** (one stable ID per instance), linked by
finish-to-start dependencies. The business content of a step (operation, target, dough state,
conditions, incorporations) follows #5; this contract fixes the graph and the timing.

```ts
interface ProcessStep {
  id: StepId;
  dependsOn: StepId[]; // finish-to-start
  schedule: 'asap' | 'alap';
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
   a preheat's display position).
4. **Chain move.** When order only is invalid because the step, or a step that depends on it,
   would come before one of its dependencies, the step is moved **along the chain** under the
   conditions below. The result lists `changedEdges` (`{ step, before, after }` for each
   rewritten `dependsOn`) so that the interface shows them.
5. Otherwise a refusal: `MoveBreaksDependencies` (with the `path` of the first violated
   dependency) or `AmbiguousMove` (with a `reason`). The baker then edits the dependencies
   explicitly; no guess is made.

The chain move applies only when all of these hold; any other case is `AmbiguousMove`:

- The step has at most one dependency `P` and at most one dependent `T`.
- The target `after` has at most one dependent `B`, counted after the step is taken out. The
  target is not a descendant of the step.
- The step is not an `alap` step (it can only be moved by order only; its dependencies and its
  "as late as possible" meaning are never rewritten by a drag), is not the step of a component
  (its `id` is a component id) and carries no `incorporations`: those wait for the contract of
  component phases (`reason: 'workpieceStep'`). An `alongside` step (the preheat of Steps
  alongside) is moved by chain move, since its position is its start.

The chain move then does exactly this, and nothing else:

- Out of the old place: `T`, if any, takes the step's dependency instead of the step
  (`T.dependsOn` with the step replaced by `P`, or without it when the step was first).
- Into the new place: the step depends on `after` (no dependency when first), and `B`, if any,
  takes the step instead of `after`. In first position, `B` is the step that was first in the
  list; other steps without a dependency keep none.
- Every other step keeps its dependencies, its fields, its `schedule`, its incorporations and its
  id. A branch that does not run through the step or the target is untouched.

### Duplicate

`duplicateStep(process, stepId, newId)` proposes a **new step** right after the original. It is
not an exact clone and the interface does not present it as one: it opens the copy for review and
lists what was not carried.

- Carried: `operation`, `label`, `endCriterion`, `conditions`, `technique` and `equipment` (the
  same item references, no new copy).
- `plannedDurationS` is carried only when the original's duration is the baker's (manual). A
  `durationMode: 'model'` original gives a copy **without a duration** (unknown): a model-driven
  duration belongs to one dough step (`fermentation.md`) and a literal copy of a prediction is
  not a repeat.
- Not carried: `incorporations` (the shares would exceed 100), `accepted`, `durationMode`.
- The copy is `asap` and depends on the original, whose dependents now depend on the copy, as
  `InsertStepAfter` does. `NotDuplicable` is returned, with a `reason`, for an `alap` or
  `alongside` step (a copy would be a new serial duration or a second heating target) and for the
  step of a component (`workpieceStep`).
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
   technique) `[bulk]`, `shape` → `[bulk-2]`; the copy carries no incorporation.
9. **Duplicate, model-driven.** The same with `durationMode: 'model'`, 6 h: `bulk-2` has no
   duration and is manual; the interface asks for one.
10. **Not duplicable.** An `alap` `preheat`, an `alongside` preheat, or the step whose id is a
    component's: `NotDuplicable`.
11. **Undo.** A formula edit then a step move, then undo twice: the draft shows the starting
    formula and process, each undo saved; a new edit then clears the redo.
12. **Reset.** A `revision` draft at revision 3 with edits: reset offers "back to revision 3" with
    a confirmation, and revision 3 itself is untouched.

## Projection

- Modes: start at a time (start now is start at `now`), or ready by a time for a designated
  target step. Ready-by plans the whole process as early as possible from an origin, then shifts
  the origin so the target ends at the requested time; it needs known durations up to the target
  and is only valid before the bake has started.
- A step's planned end is known only when its start is known and it has `plannedDurationS`.
  Started and finished steps use their recorded times.
- During a bake, steps not yet started cannot be planned before `now`.
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
