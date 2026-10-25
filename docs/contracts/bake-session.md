# Contract: bake session (D7)

Status: **approved** (issue #30); lifecycle and outcome amended for contract `0.11.0` (#21). The
scaled preparation (below) is a **proposal** of 2026-10-13, pending the owner's approval.
Related issues: #6, #21, #24, #28, #35.

## Preparation and persisted names

A bake session is what the app calls a **Preparation** (Préparation in French): the record of
actual work on a dough, from the start of a recipe's process to its end, whether or not the dough
is cooked. The persisted names stay as they are (`bakeId`, `BakeStarted`, `FinishBake`, the
`bakes` table…): a label change never renames a persisted event type or field. The rest of the
contracts keep "bake" for the session.

## Lifecycle

A session is `active` from `BakeStarted`, then ends, `finished` or `abandoned`:

- **finished** (`FinishBake`): the preparation reached a usable result, cooked or not. Its
  **outcome** says which (below).
- **abandoned** (`AbandonBake`): the preparation stopped without a usable result (a failed dough,
  a step gone wrong). A dough kept, frozen, given or sold is finished, never abandoned.

There is no suspended state (a single step's countdown can be held, below; the session never is). Closing the app, or the device being off, pauses nothing: the
fermentation goes on, recorded times stay where they are, and the state at any instant is derived
from the events and the injected clock. No step completes because its planned duration has
elapsed. Holding the dough (a cold retard, an extra rest) is a step, added with
`InsertStepAfter`, not a pause of the session.

Several sessions may be active at once, and steps without a dependency between them may run in
parallel (process.md). Ending a session keeps all its data.

**Reopening.** `ReopenBake` makes a finished or abandoned session active again (`BakeReopened`),
for instance to put underbaked bread back in the oven after declaring it done. The earlier end
stays in the log; the session then ends again with a new `FinishBake` or `AbandonBake`, and only
its latest end counts (status, outcome, end time). The reopened session takes commands as any
active one, reminders included. Reopening is never required: a baker who does not keep such a
detailed record simply finishes.

**Going back to a stage.** Doing a step again once it is done (bagels returned to the pot for
longer) is a new step, inserted with `InsertStepAfter` after the step last done, with the same
operation: the first time stays recorded as it happened, the second is recorded as its own step.
`RetractCompletion` is for a completion recorded by mistake (the step was not finished), not for
a step done twice.

## Cooking stages

A **cooking step** is a step whose operation is a cooking operation (process.md): `bake`,
`boil`, `steam`, `fry`, `panCook`, `grill`. A process may hold zero, one or several of them, in
sequence (boil then bake for bagels; panCook then bake under the broiler) or not. The heat
setting of a stage (oven mode, burner level…) belongs to #28 and does not change what a stage is.

- A completed cooking step records that this stage was done, nothing more. Completing one,
  even the last, never ends the session, never sets an outcome and never means the intended
  product is done.
- Cooking stages are read from the recorded operation codes of the snapshot's process and of
  inserted steps. Classifying a code is reading recorded data, not recomputing a value; a change
  of the list of cooking operations is a contract change that states its effect on history.

## Outcome

```ts
interface PreparationOutcome {
  result: 'cooked' | 'dough' | 'cookedAndDough';
  dough?: 'frozen' | 'refrigerated' | 'given' | 'sold' | 'other'; // what became of the raw dough
  pieces?: number; // raw dough pieces kept, for a later inventory
}
```

- `cooked`: the intended product was cooked (all of it). `dough`: the result is the raw dough
  itself (pizza balls frozen for later, a dough given away). `cookedAndDough`: part cooked, part
  kept as dough.
- `dough` and `pieces` are only accepted with `result` `dough` or `cookedAndDough`; elsewhere
  they are `InvalidCommand`. `pieces` is an integer ≥ 1. Both are optional: unknown stays unknown.
- **Intended outcome.** A recipe states the outcome it ends with (process.md,
  `intendedOutcome`): a dough that is always frozen says `{ result: 'dough', dough: 'frozen' }`
  once, in the recipe. Without one, the intended outcome is `cooked` when the session's effective
  process (inserted steps included) has a cooking step, else `dough` with no disposition.
- **Finishing.** `FinishBake` takes an optional `outcome`. A **cooking step** is a step of the
  session's effective process (inserted steps included) whose recorded operation code is in
  `COOKING_OPERATIONS` (`isCookingStep`, the list above and process.md), and it is **completed**
  when it has a recorded end (a started or planned one does not count):
  - with an outcome, the domain records it with `outcomeSource: 'baker'`, whatever the steps
    done (a dough kept, frozen, given or sold; part cooked, part kept);
  - without one and **at least one cooking step completed**, the domain records the intended
    outcome of the session's snapshot with `outcomeSource: 'recipe'`: finishing asks no question;
  - without one, **no cooking step completed**, and an intended outcome that includes a cooked result (`cooked` or `cookedAndDough`), nothing
    says the intended product was reached, so the command is refused with `OutcomeRequired { reason:
'no_cooking_step_completed' }` and nothing is recorded. The baker chooses an outcome, or
    uses `AbandonBake` for a failed preparation;
  - without one, no cooking step completed, and an intended outcome that is a dough only (a
    recipe that is always a frozen dough, or a process with no cooking step and no stated
    intent): the intended outcome is recorded with `outcomeSource: 'recipe'` as usual.

  The interface shows a Finish button with a choice beside it. The intended outcome is the
  default, except when `OutcomeRequired` would apply: then the Finish control asks for the
  outcome, with none preselected. Beyond
  this, the domain neither derives the outcome from completed cooking steps nor refuses an
  explicit one against them (a cooking step may have been done outside the process).

  Example (early finish). A bread session with steps `mix` and `bake`, `intendedOutcome` absent
  (so `cooked`). `mix` is completed, `bake` is not: `FinishBake` alone gives `OutcomeRequired`;
  `FinishBake { outcome: { result: 'dough', dough: 'frozen' } }` finishes with that outcome and
  `outcomeSource: 'baker'`. Once `bake` is completed, `FinishBake` alone finishes with `{ result:
'cooked' }`, `outcomeSource: 'recipe'`, as before. A session whose process has no cooking step
  at all and no stated intent intends a dough, so it finishes in one tap with `{ result: 'dough'
}`; so does a recipe whose `intendedOutcome` is `{ result: 'dough', dough: 'frozen' }`.

- **History.** The rule only restricts new commands. A stored `BakeFinished` (with `outcome`
  and `outcomeSource: 'recipe'` or `'baker'`, or without either, before `0.11.0`) keeps its
  meaning and replays unchanged, even when no cooking step was completed in that session. The
  persisted shape is the same, so `CONTRACT_VERSION` is not bumped for this rule.

- Events written before `0.11.0` have no outcome: the result is **unknown**, never read as
  cooked, whatever steps were completed.
- `CorrectOutcome { outcome }` changes only the outcome, without reopening: a typed
  `OutcomeCorrected` event (`outcomeSource: 'baker'`) replaces the outcome of a **finished**
  session; the original `BakeFinished` stays in the log. On an active or abandoned session it is
  refused with `NotFinished`. The latest `OutcomeCorrected` wins.
- Dough pieces kept are not yet an inventory: a later feature may track them and start a new
  session from them (#56). Their count is recorded now so that history can feed it.

## Commands and events

```ts
interface BakeCommand<P> {
  commandId: string; // stable across retries
  bakeId: string;
  expectedVersion: number; // last known seq
  issuedAt: Instant;
  payload: P;
}

interface BakeEvent<P> {
  eventId: string;
  bakeId: string;
  seq: number; // 1, 2, 3… per bake
  causationId: string; // commandId
  occurredAt: Instant; // business time, may be declared by the user
  recordedAt: Instant; // device clock at write time
  schemaVersion: number;
  type: string;
  payload: P;
}
```

## Pure domain

- `decide(state, command, now) → Result<EventPayload[], DomainError>` validates transitions (no
  double completion of a step, corrections target an existing correctable event).
- `evolve(state, event) → state` is **structural**: it never calls the calculation engine.
  Computed values live in the events (`history.md`).
- One command may produce several events, written atomically.
- Corrections are typed events (`StepTimeCorrected { targetEventId, newOccurredAt }`,
  `StepCompletionRetracted { targetEventId }`, …). The original is never modified.
- The actual record includes times, observations and optional physical measurements
  (`Observation`). Missing data stays missing.

## Alpha commands and events

| Command                      | Events                                                                       | Rules                                                                                                                                                               |
| ---------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StartBake`                  | `BakeStarted` (snapshot, `history.md`)                                       | only once; validates the formula, the process and their incorporations together, and projects the process; optional `origin` and `flours` (flours.md)               |
| `StartStep`                  | `StepStarted`                                                                | dependencies completed, and `at` not before their latest end; not already started                                                                                   |
| `CompleteStep`               | `StepStarted` if needed, `StepCompleted`                                     | not already completed; an implicit start is placed at the latest end of its dependencies (or the bake start); a completion before it is refused (`InvalidTime`)     |
| `AdjustStep`                 | `OverrideApplied` (step duration, temperature or `equipment`, equipment.md)  | step not completed                                                                                                                                                  |
| `AdjustFormula`              | `OverrideApplied` (formula edit, with the edited formula and its resolution) | edit valid for the current effective formula                                                                                                                        |
| `InsertStepAfter`            | `StepInserted`                                                               | the new step depends on `after`; steps not started that depended on `after` now depend on the new step                                                              |
| `AcceptProjection`           | `ProjectionAccepted`                                                         | stores the projection computed at `now`                                                                                                                             |
| `AddObservation`             | `ObservationAdded`                                                           | free text, category, rating, `Observation` measurement or a `kind` (below); also after the end                                                                      |
| `SetStepThermal`             | `StepThermalChanged`                                                         | running or not-yet-started dough step; a replacement of the step's whole `thermal` (process.md, Thermal inputs), effective from `at`; (below, 0.21.0 target)        |
| `CorrectStepTime`            | `StepTimeCorrected`                                                          | targets a `StepStarted`/`StepCompleted`; a start never ends up after its end, before a dependency's end, and an end never after a started successor's start         |
| `RetractCompletion`          | `StepCompletionRetracted`                                                    | targets the step's completion; no dependent step started                                                                                                            |
| `HoldStepCountdown`          | `StepCountdownHeld`                                                          | step running (started, not ended, with a planned duration, not `beforeTarget`); not already held (`StepAlreadyHeld`); `at` not before the start or the last release |
| `ReleaseStepCountdown`       | `StepCountdownReleased`                                                      | step held (`StepNotHeld`); `at` not before the hold                                                                                                                 |
| `FinishBake` / `AbandonBake` | `BakeFinished` / `BakeAbandoned`                                             | ends the session; data is kept; `FinishBake` takes an optional `outcome` (above, `OutcomeRequired` if none and no cooking step is completed), recorded in its event |
| `CorrectOutcome`             | `OutcomeCorrected`                                                           | finished session only (`NotFinished` otherwise); the outcome is valid                                                                                               |
| `ReopenBake`                 | `BakeReopened`                                                               | finished or abandoned session only (`BakeActive` otherwise); the session is active again until its next end                                                         |

**Step countdown hold (0.20.0).** The baker may freeze the countdown of one running step (a
phone call, a delayed oven), never the Preparation or the dough: the clock, the other steps and
the fermentation go on, and no rest step is created or classified.

- `HoldStepCountdown` / `ReleaseStepCountdown` take a `stepId` and an optional `at` (default now).
  Refusals: unknown step; not started (`StepNotRunning`); completed (`StepAlreadyCompleted`); no
  planned duration or `beforeTarget` (`InvalidCommand`); hold on a held step (`StepAlreadyHeld`, no
  nesting); release of a step not held (`StepNotHeld`); a time before the step's start, the
  previous release or the hold (`InvalidTime`). As for other commands, a time in the future is
  not refused.
- Durations stay distinct and derivable: **planned** = the snapshot; **projected** = planned with
  `AdjustStep` overrides **plus the holds**; **actual** = recorded start and end, never touched by
  a hold. A step's hold total is the sum of its closed holds plus the open one up to the instant
  asked.
- Projection (`liveProjection`): while held, the remaining time is frozen, so the projected end is
  `now + remaining at the hold` and moves with the clock; once released, the end stays where it
  was and dependents shift by the hold length. Parallel branches are unaffected; a `beforeTarget`
  step is re-anchored to its target as usual. A hold is recorded in events, so it survives closing
  the app.
- **Completion while held closes the hold**: `CompleteStep` on a held step emits
  `StepCountdownReleased` at the completion time, then `StepCompleted`, in one command. A
  completion before the hold began is refused. Retracting that completion leaves the hold closed.
- Reminders (ADR 0012) are derived from the projection: a held step has **no end reminder**, and
  neither has any step whose projected start rests on it (a dependent, or a `beforeTarget` step
  whose target is downstream, transitively); the release schedules them again from the new
  projection. Nothing is stored for reminders. **Fold reminders stay on the actual dough clock**,
  from the recorded start, unshifted: a hold extends the countdown, not the fermentation.
- `FinishBake` and `AbandonBake` close any open hold in the same command (`StepCountdownReleased`
  at the end time, before the end event). A hold counts only for the part inside the step's
  recorded start and end, so `CorrectStepTime` cannot inflate it.
- Backups: the two events are checked on restore (known running step, no nested hold, release only
  when held, times in order). An app that does not know them refuses the backup on its unknown
  event type, never misreading it. `CONTRACT_VERSION` is `0.20.0` (minor, additive vocabulary);
  the backup `schemaVersion`, the event envelope version and the SQL schema are unchanged (the
  log is JSON).

**Thermal change on a running step (0.21.0 target, #176).** The baker moved the dough: into a
bowl with a lid, out of the fridge, onto a tray. `SetStepThermal { stepId, at?, thermal? }` records
`StepThermalChanged { stepId, at, thermal }`; `thermal` absent means "no thermal inputs from now
on" (back to the fixed lag).

- **Refusals.** Unknown step; a step that is not a dough step (`InvalidCommand`); a completed step
  (`StepAlreadyCompleted`); an invalid `thermal` (`InvalidProcess`, process.md); `at` before the
  step's start or before the previous thermal change of that step (`InvalidTime`). A step not yet
  started accepts it, and then it only edits what will be in force at the start.
- **Effect.** Replaces the step's `thermal` from `at` on; the earlier part of the step keeps the
  inputs in force before. The effective thermal inputs of a step are therefore a list of
  `(from, thermal)` segments: the snapshot's `thermal` from the step's start, then the changes in
  order. `liveProjection` and the model's forecast recompute from the recorded facts: the dough
  temperature state at `at` is that of the segment before, then the new `τ_eff` applies. Planned
  steps downstream, reminders and the end times that depend on the model follow the new
  projection like those of any other change. Nothing is stored for the recomputed values.
- **Not an `AdjustStep`.** The step's duration, conditions and equipment are untouched; a change of
  the ambient temperature is `AdjustStep`, a change of container, cover, geometry or environment
  class is `SetStepThermal`. A move from the counter to the fridge is both, recorded at the same
  `at`, in one command batch.
- **Replay.** `evolve` is structural: it stores the segments and never calls the engine.
  A stored session replays with the values it committed (history.md); the forecast of the past is
  never recomputed with a new thermal model.

`AddObservation` accepts `kind: 'doughTemperature'` (0.21.0 target): a measured dough temperature
with the probe position.

- It needs a `stepId` that is running and is a dough step, and a numeric `Observation` in °C
  (finite, within 0 – 60 °C, as for the other temperatures); anything else is `InvalidCommand`,
  and on an ended bake `BakeNotActive`. Category `fermentation`, `position`: `core` (probe in the
  centre), `surface` or `unknown`, optional `note`.
- The reading is kept in the journal and exported. It replaces the model's **mean** state from its
  instant (fermentation.md, Dough temperature): `core` through `γ_core` when the step has thermal
  inputs and the reading is at least 0.5 `τ_eff` after the later of the step start and the last
  thermal change; otherwise (earlier, no thermal, `surface`, `unknown`) it is taken as the mean
  and the estimate says `probe_position_unmodelled` or `reading_in_transient`.
- Readings of one step after one thermal setting are the data of the personal factor
  (fermentation.md, Personal correction): they are kept with the active `thermal` segment, so a
  calibration reads the container and environment that were in force at each reading.
- It never completes the step nor changes the plan. A not-ready or ready judgement stays
  `doughReady`; the model's forecast is an estimate that never overrides it.

**Versioning and upcasting.** Two new event/observation vocabulary items, additive: `StepThermalChanged`
and `kind: 'doughTemperature'` with `position`. `CONTRACT_VERSION` goes from `0.20.0` to `0.21.0`
(minor, additive vocabulary) in the implementing pull request. Stored events are untouched: no
upcaster is needed, an old session has no thermal segment and replays with the fixed lag of its
snapshot. The backup `schemaVersion`, the event envelope version and the SQL schema are unchanged
(the log is JSON). As for the countdown hold, an app that does not know `StepThermalChanged`
refuses a backup holding it on its unknown event type (`persistence.md`), never misreading it;
old backups restore unchanged in a new app. Downgrades are not supported.

**Implicitly running steps (live projection).** The baker's first real action on a step records
its `StepStarted`; until then the step has no recorded start, but it must not be shown as waiting
or "starting now" (docs/ux/requirements.md L127). In `liveProjection(state, now)`, an `asap` step
that is not started or completed, that is not `alap` or `beforeTarget`, and whose dependencies are
all ended (or that has none), is projected as **implicitly running** from its **implicit start** =
the latest recorded end among its dependencies, or the bake start when it has none; its end is that
start plus its projected duration. It is **not clamped to `now`**, so the same step reads
12:00 to 12:04 before and after the first action records `StartStep` at 12:00 (a step planned at
240 s, bake started at 12:00, observed at 12:02).

- This is a read-model interpretation only: no event is recorded and the persisted facts are
  unchanged. Such a step is flagged `implicit: true` on its `ProjectedStep` (live projection only,
  absent from the snapshot's initial projection), and `implicitStartOf(state, stepId)` gives its
  implicit start (`undefined` otherwise). `CompleteStep` places its implicit `StepStarted` at the
  same instant through the same computation.
- **Several steps can be implicitly running in parallel** when their dependencies are all ended
  (parallel branches, or a step without dependency alongside the first).
- A step with a dependency not yet ended keeps its projection after that dependency; `alap` and
  `beforeTarget` steps keep their own rules.
- Holds and adjustments apply as for a running step, but a hold still requires a recorded start
  (`StepNotRunning` otherwise); the UI records `StartStep` at the implicit start on the first real
  action. A step the baker never starts is projected like a running one (`inProgress`, its end may
  be in the past) from its implicit start (owner-approved L127 semantics); only the preheat slot
  sets `overdue`.
- Reminders derived from the projection use the same interval: the end reminder of an implicitly
  running step is at implicit start plus duration; no start reminder is scheduled for it.
- `liveProjection` is not gated on the bake status: a finished or abandoned bake may show a
  never-started step as implicitly running in the projection (alerts are gated on the active status).
- `AcceptProjection` stores the live projection in `ProjectionAccepted`, but without the `implicit`
  flag: the persisted `ProjectedStep` shape is unchanged, and the accepted snapshot keeps the
  implicit interval and status as computed.
- `CONTRACT_VERSION` is unchanged: no persisted shape, event or backup field changes; `implicit` is
  a computed projection flag.

**AdjustStep floor.** `AdjustStep` takes an absolute `plannedDurationS` ≥ 0, also on a running
step. A "−15 min" control asks for a delta: `adjustedDurationS(current, deltaS)` =
`max(0, current + deltaS)`. A duration never goes below zero; a running step whose planned end has
passed shows as overdue. A negative absolute value is refused.

**Previous.** `previousAction(state, stepId)` gives the UI's three cases for a completed step, by
the `RetractCompletion` rule: `{ kind: 'retract', targetEventId }` when no dependent has a
recorded start; `{ kind: 'blocked', reason: 'dependentStarted', dependents }` otherwise (the UI
offers `CorrectStepTime` or `InsertStepAfter`); `reason: 'notCompleted'` when there is no
completion. A deliberate repetition is always `InsertStepAfter`. The UI passes the step of the
strand it shows, never a parallel branch.

**Retracted completions in the visible timeline.** A completion that was retracted, and its
`StepCompletionRetracted`, are hidden from the business timeline of a Preparation (journal) and
kept in the technical log and in exports. `visibleEvents(events)` applies the rule to an event
list; an implicit `StepStarted` recorded with that completion stays visible.

A `beforeTarget` step (process.md, Steps before a target) is never a dependency: no step waits
for it. `StartStep` on it records `StepStarted` (the baker switched the heating on); `CompleteStep`
on it is optional and means the baker observed the equipment ready. Nothing completes when the
required time elapses, readiness is never inferred, and a started `beforeTarget` step that was
never completed is not an open step: finishing the Preparation does not need it.

`AddObservation` accepts an optional stable `kind`. `kind: 'doughReady'` records that the baker
judges the dough ready for its next stage:

- It needs a `stepId` that is **running** (started, not ended) and is a **dough step** (the `asap`
  steps between the mix and the bake, `fermentation.md`). Anything else is refused
  (`InvalidCommand`), as is a `doughReady` on an ended bake (`BakeNotActive`).
- The domain records its `stage` in the event: `bake` when the step is the last dough step (ready
  to bake), `shape` otherwise (ready to shape, e.g. at the end of the bulk). Only `stage: 'bake'`
  observations are data for the readiness profile; `shape` ones are kept for later stage models.
  Events written before `0.6.0` have no `stage`: unknown, never pooled with `bake`.
- Category `fermentation`, an optional short `criterion` code (`poke`, `feel`, `time`, `other`)
  and free `text`, shown in the journal. Its time is its `occurredAt` (now).
- It never completes the step nor changes the plan. It is kept in the journal, shown in the bake
  history and exported (history.md).

`kind: 'fold'` records one set of folds done (process.md, techniques):

- It needs a running `stepId` whose technique has `folds`, and `set` (1 … `count`); anything else
  is `InvalidCommand`, and a fold on an ended bake is `BakeNotActive`, as for `doughReady`. Category `handling`, optional `text`. A set may be recorded early, late,
  twice or not at all: the record is what happened, the plan is unchanged.
- Reminders (ADR 0012) include each fold set not yet recorded, at its due time from the step's
  recorded start.

Ordinary notes (no `kind`) may target any step, in any state, during or after the bake.

`rating` is within [0, 5]. A backup holding a rating outside this range is refused.

Recorded times follow the finish-to-start edges of the process: a step never starts before every
dependency has ended. Commands that would record or correct a contradicting time are refused, not
adjusted. `AdjustFormula` and `InsertStepAfter` keep the formula and the process consistent,
incorporations included (`process.md`).

Every command except `StartBake`, `AddObservation`, `CorrectOutcome` and `ReopenBake` requires an
active bake. `AddObservation`
also applies to a finished or abandoned bake (the review after the bake: crumb, flavor, what went
wrong); `kind: 'doughReady'` still needs an active bake. It never reopens the bake. Business errors are typed codes
(`StepAlreadyCompleted`, `DependenciesNotCompleted`, `BakeNotActive`, …).

## Scaled preparation

A recipe has a quantity of its own and a Preparation may have another one:

- **The recipe's quantity** is the anchor of its revision (12 hamburger buns). It changes only by
  editing the recipe, which makes a new revision.
- **The Preparation's quantity** is chosen without entering the editor, without a draft and
  without saving anything into the recipe: the baker wants 600 g of flour today from a recipe
  written for 1000 g, or 24 buns from a recipe of 12.

The interface offers two inputs that end in the same anchor: a **multiplier** `m` (finite, > 0:
2 doubles, 0.5 halves, 1.5…) applied to the recipe's anchor, or a **new value for the anchor**
(24 in the quantity of pieces, 600 in the flour). `grams` × `m` for `flourTotal` and
`doughWeight`; `count` × `m` for `pieces`, with `gramsEach` unchanged. A multiplier that does not
give a whole `count` is never rounded: the interface asks for a whole count first. The anchor
**kind** is the recipe's: a one-off Preparation never switches from flour to pieces, which has
no defined meaning.

### Provenance

`StartBake` accepts an optional `scaledFrom: { anchor: Anchor; sourceFormula: Formula }`.
`sourceFormula` is a command-only copy of the revision's formula and is **not stored**; `anchor`
is stored in `BakeStarted`.

The domain verifies what it can see, and refuses with `InvalidCommand`, `field: 'scaledFrom'`
and a `reason`:

- `ScaleSourceMismatch`: `formula` differs from `sourceFormula` in anything but the anchor (a
  flour, an ingredient, a percentage, a component, an allocation, a pin or an override).
- `ScaleAnchorMismatch`: `scaledFrom.anchor` is not `sourceFormula.anchor`.
- `ScaleKindChanged`: `formula.anchor` and `sourceFormula.anchor` have different kinds.
- `ScaleIdentical`: both anchors have the same value (compared exactly, not within a rounding
  tolerance of the interface). The interface omits `scaledFrom` then.
- `ScaleOutOfRange`: a value that is not finite or not > 0, or a `count` that is not a safe
  integer ≥ 1.

The domain cannot know that `sourceFormula` is the revision named by `revisions.formula`. The
**application** loads that **saved** revision, checks that `sourceFormula` is its content and
refuses otherwise (`RevisionMismatch`), and preferably derives `formula` from the loaded revision
by `SetAnchor(anchor, 'rescale')` instead of accepting both. A draft with unsaved edits is never
the source: the interface saves or discards them first. The revision is neither modified nor
given a new version.

A start without `scaledFrom` claims no scale: it records no provenance either way (a bake started
before this contract, or one whose formula was edited, cannot be told apart).

### What changes with the quantity

1. **Derived and scaled by the formula**: the grams of every ingredient, the flour of each flour,
   the water, the components and the grams per incorporation. A component is a percentage of the
   total flour and scales **once**, however many steps prepare it.
2. **Settings left as the recipe says**: temperatures, appliance, mode, setpoint, level, cover,
   vessel and support references, step order, planned durations, end criteria, folds and the
   readiness profile. Durations do not scale by this contract's policy; that says nothing about
   the physical behaviour of a larger or smaller dough (friction, temperature evolution, thermal
   lag, loading).
3. **Review needed**: `equipment.load` (`pieces`, `massG`) and the machine-mixing `phases` of a
   technique. A larger quantity may mean two cooking batches, a partial load or another mixer
   setting; none is inferred, nothing is rescaled and no batch planning is implied. The snapshot
   lists them as `scaleReview: Array<{ stepId; field: 'equipment.load.pieces' |
'equipment.load.massG' | 'technique.phases' }>`, and the interface shows "Preparation: 24
   buns · recipe: 12" with the optional review.

The first fermentation model's inputs do not include the total mass, so its result stays
numerically unchanged, subject to the model's applicability and limits. This is not evidence that
doughs of every size behave alike: a model that reads the mass must recompute or report
unsupported. The accepted suggestions copied into the snapshot keep their `ModelRef` and their
original assumptions, and the history shows `scaledFrom` beside them.

### Before the start

Until the Preparation starts, the chosen quantity is interface state, like the planned start
time: it survives Recipe → Planning → Start for the open recipe and its saved revision, does not
leak into another recipe, and is lost when the recipe is left or the app restarts. It is never
saved into the recipe.

Examples (hand-computed; the revision has a flour total of 1000 g, water 72 %, salt 2 %, instant
yeast 0.3 %, so 1000 + 720 + 20 + 3 = 1743 g of dough):

1. **Scale by flour.** New anchor `flourTotal` 600 g: water 432 g, salt 12 g, yeast 1.8 g, dough
   1045.8 g. `scaledFrom.anchor` is `{ kind: 'flourTotal', grams: 1000 }`. The percentages are
   unchanged.
2. **Scale by dough weight.** New anchor `doughWeight` 1000 g: flour 1000 / 1.743 ≈ 573.7 g,
   water ≈ 413.1 g, salt ≈ 11.5 g, yeast ≈ 1.7 g.
3. **Same anchor.** 1000 g of flour again: the interface sends no `scaledFrom`. If it did:
   `ScaleIdentical`.
4. **The recipe is untouched.** Version 3 stays the head of the recipe after a scaled start; the
   history shows 600 g beside the recipe's 1000 g. No draft was opened.
5. **Durations do not scale.** A 6 h bulk stays 6 h at 600 g.
6. **Refused.** `scaledFrom.anchor` `{ kind: 'flourTotal', grams: 0 }`: `ScaleOutOfRange`.
7. **Twelve buns, doubled.** The recipe's anchor is `pieces` `{ count: 12, gramsEach: 90 }` (dough
   1080 g). A multiplier of 2, or 24 typed in the quantity of pieces, gives `pieces`
   `{ count: 24, gramsEach: 90 }` (2160 g) and `scaledFrom.anchor` is `{ count: 12, gramsEach:
90 }`. Every ingredient doubles, the percentages are unchanged, and the recipe still says 12
   buns at the same version.
8. **A multiplier that is not offered.** 5 pieces × 1.5 = 7.5: there is no whole count, so the
   interface asks for a whole count (7 or 8).
9. **Falsely attributed scale.** Same anchor, 4 % sugar instead of 3 %, and `scaledFrom` naming
   the unchanged revision: `ScaleSourceMismatch`. It is not recorded as a quantity-only scale.
10. **Anchor kind.** A recipe anchored on `pieces` started with a `flourTotal` anchor:
    `ScaleKindChanged`.
11. **Load to review.** A `bake` step with `equipment.load.pieces` 12 in the recipe of 12 buns,
    started at 24: `scaleReview` lists `{ stepId: 'bake', field: 'equipment.load.pieces' }`. The
    load is not changed, and nothing says that the oven takes 24 in one stage.
12. **Unsafe count.** A `count` of 2^53 after the multiplier: `ScaleOutOfRange`.
13. **A poolish once.** A poolish of 30 % of the flour, prepared by three steps, at 600 g of
    flour: 180 g of flour in the poolish in total, not 180 g per step.
14. **Restart.** The scaled Preparation is exported, restored and replayed: its snapshot keeps the
    scaled anchor, `scaledFrom` and `scaleReview`; the recipe's revision is unchanged; the digest
    is the same.

## Repository (SQLite adapter)

One transaction per command:

1. `commandId` already recorded with the same content → return the stored result; different
   content → `CommandIdReused`. Content is compared through its canonical JSON (sorted keys).
   **This check runs before the version check.**
2. Current version ≠ `expectedVersion` → `VersionConflict { currentVersion }`.
3. Append the events (`UNIQUE(bake_id, seq)`), update the index row, record the command, commit.

- **Strict** conflicts, no merging of compatible commands: the UI reloads and decides again.
- The UI confirms an action only after the durable write succeeded.
- `BEGIN IMMEDIATE` and `SQLITE_BUSY` handling (single connection on mobile, bounded retries) are
  to be proven in #24.

## Recipes

Recipes have no events: an edit creates a new revision, with an optimistic check on the expected
head revision.
