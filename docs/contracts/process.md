# Contract: process (D3)

Status: **approved** (issue #30); step move and duplicate are a **proposal** of 2026-10-13,
pending the owner's approval. Related issues: #5, #9, #21, #28, #35.

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
does, bake-session.md). Like removal and insertion, they are pure edits that the caller validates
like any process; a result that fails validation is refused as a whole (`InvalidProcess`).

**Move** takes a step and the step it must follow, or the first position. It is a removal followed
by an insertion, with the dependency rewiring each already defines:

- Removal: the steps that depended on the moved step inherit its dependencies (Step removal).
- Insertion after `after`: the moved step depends on `after`, and the steps that depended on
  `after` now depend on the moved step (`InsertStepAfter`).
- Insertion in first position: the moved step has no dependency and the step that was first now
  depends on it. Other steps without a dependency (a parallel `preheat`) keep none.
- Ids, fields, incorporations and `schedule` are unchanged. Moving a step to its own position, or
  naming an unknown step, changes nothing.
- A parallel step (a `preheat` beside a proof) that is moved joins the chain at its new place:
  its dependencies become `after`. Keeping it parallel is an edit of its dependencies, not of this
  move.

**Duplicate** inserts a copy of a step right after the original, as `InsertStepAfter` does (the
copy depends on the original, whose successors now depend on the copy):

- The copy keeps the operation, label, `plannedDurationS`, `endCriterion`, `conditions`,
  `technique` and `equipment`.
- It does not keep `incorporations` (the shares would exceed 100), `accepted`, or
  `durationMode: 'model'` (a model-driven duration belongs to one dough step, fermentation.md):
  its duration is the baker's number. Its `schedule` is `asap`.
- Its id is new, unique and never reused (derived from the operation, as for an added step).

Interface-only conveniences, not persisted and never events: undo and redo of the edits made to a
draft since it was opened, and "reset" back to the draft's starting revision (a discard,
`drafts.md`).

Examples (the rewiring is worked by hand from the rules above):

1. **Reorder a chain.** `mix`, `bulk`, `shape`, `proof`, `bake`, each depending on the previous
   one. Move `shape` after `mix`. Removal: `proof` inherits `[bulk]`. Insertion: `shape` →
   `[mix]`, and `bulk`, which depended on `mix`, → `[shape]`. Result: `mix` `[]`, `shape`
   `[mix]`, `bulk` `[shape]`, `proof` `[bulk]`, `bake` `[proof]`.
2. **Swap beside a parallel step.** `mix`, `bulk` `[mix]`, `proof` `[bulk]`, `shape` `[proof]`,
   `preheat` (`alap`, `[]`), `bake` `[shape, preheat]`. Move `shape` after `bulk`. Removal: `bake`
   lists `shape`'s dependency instead: `[proof, preheat]`. Insertion after `bulk`: `shape` `[bulk]`, and `proof`, which depended on `bulk`, →
   `[shape]`. `preheat` is untouched and `bake` still waits for both. Valid.
3. **Move to the first position.** `mix` `[]`, `bulk` `[mix]`, `shape` `[bulk]`. Move `shape`
   first. Removal: nothing depended on it. Insertion: `shape` `[]`, `mix` → `[shape]`. Result
   order `shape`, `mix`, `bulk`: valid.
4. **A refused move.** On the process of example 2 before its move, move `preheat` after
   `bake`. Removal: `bake` → `[shape]`. Insertion: `preheat` → `[bake]`, an `alap` step with no successor: `InvalidProcess`, nothing
   changes.
5. **Duplicate.** `mix`, `bulk` (`durationMode: 'model'`, 6 h), `shape` `[bulk]`. Duplicate
   `bulk`: `bulk-2` `[bulk]`, 6 h, manual, no `accepted`; `shape` → `[bulk-2]`.
6. **Duplicate an `alap` step.** `preheat` (`alap`, 30 min) with `bake` `[proof, preheat]`.
   Duplicate `preheat`: `preheat-2` (`asap`, 30 min) `[preheat]`, `bake` → `[proof, preheat-2]`;
   `preheat` now has a successor, so it stays valid.

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
