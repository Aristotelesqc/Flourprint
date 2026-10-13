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
  subject?: Subject; // the mass the step works on; absent = derived (Subjects and component phases)
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
  `fermentation.md` and `drafts.md` say "the mix step", they mean this step: its end is the end of
  the mix, and its conditions give the ambient temperature, the target dough temperature and the
  friction.
- **Leaven before the reference.** A step ahead of the reference mixing step may already hold
  yeast: a step with a yeast-marked ingredient or a leaven component among its incorporations,
  or the operation `fermentolyse`. When a non-mixing step with a planned duration lies between
  such a step and the reference mixing step (a 45 min fermentolyse before the final kneading),
  the dough estimate is `insufficient_data` with the reason `leaven_before_mixing`, naming the
  step. It is never silently started at the reference mixing step. Mixing steps in between (a
  frasage followed at once by a kneading) do not trigger it. Nothing is inferred when no
  incorporation is declared and no step is a `fermentolyse`. No biological coefficient is added
  here: a model that integrates the earlier period replaces this rule only by a contract change.
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
treat it as a mixing step. The `leaven_before_mixing` rule changes one existing silent behaviour:
a recipe with a `fermentolyse` ahead of its `mix` used to be estimated from the end of the
`mix`, and now says `insufficient_data`; this is stated in the engine version notes.

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
6. **No-knead loaf without folds**: `frasage`, `bulk`, `shape`, `proof`, `bake`. Valid.
   `no_kneading_or_folds` is raised as a note to confirm the technique, and blocks nothing. A
   `technique.folds` `{ count: 3, intervalS: 2700 }` on the 3 h `bulk` (folds at 45, 90 and 135
   min, within the step), a `fold` step or a `mix` clears it.
7. **Poolish first.** `poolish` (the component's step, 12 h, no incorporations), `frasage`
   (incorporates `component` poolish, the flour, the water and the other ingredients), `bulk`,
   `shape`, `proof`, `bake`. The first step is not a `frasage`. The assembly is the `frasage`: it
   is the reference mixing step, and the dough steps follow it.
8. **Preliminary frasage.** `frasage` (of the poolish, no incorporations, 10 min), `proof`
   (12 h), `frasage` (assembly, with incorporations), `mix` (kneading, 8 min), `bulk`. The first
   `frasage` belongs to the poolish. The reference mixing step is the `mix`.
9. **Fermentolyse before the final kneading.** `fermentolyse` (incorporates flour, water and
   yeast, 45 min), `mix` (incorporates the salt, 8 min), `bulk`. The `fermentolyse` holds yeast
   and a non-mixing step with a duration separates it from the reference `mix`: the estimate is
   `insufficient_data`, reason `leaven_before_mixing`, not an estimate counted from the end of
   the `mix`.
10. **Frasage then kneading at once.** `frasage` (incorporates everything, yeast included, 5 min),
    `mix` (8 min), `bulk`. Only mixing steps lie between: no `leaven_before_mixing`, and the
    estimate runs from the end of the `mix`, as it always did for a lone `mix`.

## Subjects and component phases

**Proposal of 2026-10-13 (audit 91-R2), pending the owner's approval.** A recipe describes the
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
  component at the first main-dough step that depends on one of its steps, as before.
- **A timeline is not a mass.** Steps carry no masses: the component's grams come from the
  formula's allocation and are counted once, however many steps prepare it. Its timeline is the
  window of its steps (derived); its incorporated mass is one allocation.
- **Mixing steps.** An explicit `subject` decides whether a mixing step belongs to the main dough
  (`mainDough`) or to a component. The incorporation rule of Mixing steps applies only to a step
  without a `subject`.
- **Validation.** `subject.id` must be a component of the formula (`InvalidProcess` otherwise,
  with the step as `path`). `subject: mainDough` on a step whose id is a component id is
  contradictory and refused.
- **Fermentation** (`fermentation.md`). A component with one fermenting phase (one step whose
  operation is `preferment`) is estimated as before. With **several** fermenting phases the
  estimate is `insufficient_data` with the reason `component_phases_unmodelled`: this model has no
  validated temperature path across them, no coefficient is added here, and it never silently
  counts one phase. The recorded phases, durations and temperatures remain, are scheduled and are
  shown.
- **Moves and copies** (Step move and duplicate). A step with a component subject is chain-moved
  only among the steps of the **same** subject; a move to another subject, or to the main dough,
  is refused (`AmbiguousMove`, `reason: 'crossesWorkpiece'`) and so is the move of the main-dough
  assembly past a component's step. A step with an explicit component subject can be duplicated
  and the copy keeps the subject; the legacy step whose id is the component's is not duplicable.
- **Compatibility.** Existing recipes have no `subject` and mean what they meant. Adding phases to
  one never makes it invalid: the legacy step stays and the new steps name their subject. An
  older app refuses a document holding `subject` as an unknown field (`persistence.md`), never
  misreads it. `CONTRACT_VERSION` is bumped by one minor step, from the version current at merge,
  by the implementing pull request.

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
