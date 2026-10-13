# Contract: process (D3)

Status: **approved** (issue #30); the mixing steps (`frasage`, below) are a **proposal** of
2026-10-13, pending the owner's approval. Related issues: #5, #9, #21, #28, #35.

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
  doughTemperatureC?: number; // mixing step only: target dough temperature (advanced mode)
  frictionC?: number; // mixing step only: mixer friction for the water temperature
}
```

- `temperatureC` is the ambient the dough sits in. `doughTemperatureC` and `frictionC` are only
  read on a mixing step (`frasage` or `mix`, Mixing steps below); elsewhere they are refused
  (`InvalidProcess`). Their use is defined in
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
  first low-speed phase. No gluten development is intended. It is how every dough starts.
- `mix`: kneading, which develops the gluten (by hand, slap and fold, stand mixer, spiral…). A
  no-knead or Dutch-oven recipe has none. The `noKnead` method stays accepted on a `mix` step
  written before this rule; the interface does not offer it for a new step, since such a recipe
  has a `frasage` and no `mix`.

Rules:

- The **mixing steps** are the steps whose operation is `frasage` or `mix`.
- A recipe the app creates (blank draft, template) starts with a `frasage` step. Weighing the
  ingredients is not a step. Autolyse, kneading and the dough steps follow as the recipe needs.
- A recipe whose first step is `mix` stays valid and is never rewritten: there is no migration,
  and its behaviour does not change.
- The **reference mixing step** of a process is its **last** mixing step in list order. Wherever
  `fermentation.md` and `drafts.md` say "the mix step", they mean this step: its end is the end of
  the mix, and its conditions give the ambient temperature, the target dough temperature and the
  friction.
- A process without a mixing step has no reference mixing step (`no_mix_step`, `drafts.md`;
  `insufficient_data`, `fermentation.md`).
- `doughTemperatureC` and `frictionC` are accepted on either mixing step and read only on the
  reference one. On the other, they are kept and ignored.
- **Kneading is only what the list says.** A process without a `mix` step has no kneading, and
  the engine adds none. The check `no_gluten_work` (`drafts.md`, a warning, never blocking) then
  suggests folds when nothing else builds gluten: no `mix`, no `fold` step and no `folds`
  technique anywhere. The baker may ignore it.
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

Examples (hand-checked against the rules above):

1. **No-knead Dutch-oven loaf**: `frasage` (2 min, 21 °C), `bulk`, `shape`, `proof`, an `alap`
   `preheat`, `bake`, `cool`. Valid, no `no_mix_step`. The reference mixing step is the
   `frasage`: the dough steps are `bulk`, `shape` and `proof`, and the ambient temperature at the
   start is 21 °C.
2. **Stand-mixer loaf**: `frasage` (hand, 3 min), `autolyse` (30 min), `mix` (`standMixer`,
   phases low 4 min then medium 6 min, `frictionC` 8), `bulk`… The reference mixing step is the
   `mix`: the dough steps are those after it, and the friction 8 °C is read.
3. **Friction on the `frasage` of example 2** in place of the `mix`: kept, ignored, and the
   result says that friction is not counted.
4. **Existing recipe**: `mix`, `bulk`, `shape`, `proof`, `bake`. Unchanged: the `mix` is the
   reference mixing step.
5. **`frictionC` on a `fold` step**: `InvalidProcess`, as before.
6. **No-knead loaf without folds**: `frasage`, `bulk`, `shape`, `proof`, `bake`. `no_gluten_work`
   is raised; adding `technique.folds` `{ count: 3, intervalS: 2700 }` on the 3 h `bulk` (folds at 45, 90
   and 135 min, within the step) clears it, as would a `fold` step or a `mix`.

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
