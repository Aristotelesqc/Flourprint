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

There is no suspended state. Closing the app, or the device being off, pauses nothing: the
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
- **Finishing.** `FinishBake` takes an optional `outcome`:
  - without one, the domain records the intended outcome of the session's snapshot in the event,
    with `outcomeSource: 'recipe'`: finishing never asks a question;
  - with one, it records that outcome with `outcomeSource: 'baker'`, for a session that ended
    differently this time.

  The interface shows this as a Finish button with a choice beside it, the intended outcome being
  the default. The domain neither derives the outcome from completed cooking steps nor refuses it
  against them (a cooking step may have been done outside the process).

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

| Command                      | Events                                                                       | Rules                                                                                                                                                           |
| ---------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `StartBake`                  | `BakeStarted` (snapshot, `history.md`)                                       | only once; validates the formula, the process and their incorporations together, and projects the process; optional `origin` and `flours` (flours.md)           |
| `StartStep`                  | `StepStarted`                                                                | dependencies completed, and `at` not before their latest end; not already started                                                                               |
| `CompleteStep`               | `StepStarted` if needed, `StepCompleted`                                     | not already completed; an implicit start is placed at the latest end of its dependencies (or the bake start); a completion before it is refused (`InvalidTime`) |
| `AdjustStep`                 | `OverrideApplied` (step duration, temperature or `equipment`, equipment.md)  | step not completed                                                                                                                                              |
| `AdjustFormula`              | `OverrideApplied` (formula edit, with the edited formula and its resolution) | edit valid for the current effective formula                                                                                                                    |
| `InsertStepAfter`            | `StepInserted`                                                               | the new step depends on `after`; steps not started that depended on `after` now depend on the new step                                                          |
| `AcceptProjection`           | `ProjectionAccepted`                                                         | stores the projection computed at `now`                                                                                                                         |
| `AddObservation`             | `ObservationAdded`                                                           | free text, category, rating, `Observation` measurement or a `kind` (below); also after the end                                                                  |
| `CorrectStepTime`            | `StepTimeCorrected`                                                          | targets a `StepStarted`/`StepCompleted`; a start never ends up after its end, before a dependency's end, and an end never after a started successor's start     |
| `RetractCompletion`          | `StepCompletionRetracted`                                                    | targets the step's completion; no dependent step started                                                                                                        |
| `FinishBake` / `AbandonBake` | `BakeFinished` / `BakeAbandoned`                                             | ends the session; data is kept; `FinishBake` takes an optional `outcome` (above), recorded in its event                                                         |
| `CorrectOutcome`             | `OutcomeCorrected`                                                           | finished session only (`NotFinished` otherwise); the outcome is valid                                                                                           |
| `ReopenBake`                 | `BakeReopened`                                                               | finished or abandoned session only (`BakeActive` otherwise); the session is active again until its next end                                                     |

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

A Preparation may start at a different quantity than its recipe revision, without creating a
revision: the baker wants 600 g of flour today from a recipe written for 1000 g. The recipe is not
edited, and nothing about the quantity is saved as a new version.

`StartBake` accepts an optional `scaledFrom: { anchor: Anchor }`, the anchor of the revision the
snapshot was scaled from (`formula.md`, Anchor).

- The command's `formula` is the revision's formula **rescaled** (`SetAnchor(anchor, 'rescale')`,
  `formula.md`): the same percentages, flour blend, components and shares, with a new anchor. The
  application computes it; the domain validates the formula as it validates any other.
- The snapshot's `formula` and `resolvedFormula` are the scaled ones. `revisions.formula` still
  names the revision, which is neither modified nor given a new version.
- `scaledFrom.anchor` is a valid anchor: `grams` greater than 0, or `count` an integer of at least
  1 and `gramsEach` greater than 0. Otherwise `StartBake` is refused with `InvalidCommand`,
  `field: 'scaledFrom'`. The domain does not compare it with the revision, which it does not
  hold. An anchor equal to the formula's means no scaling; the interface then omits `scaledFrom`.
- What scales: every quantity derived from the formula (grams of each ingredient, flour per
  flour, components, water). What does not: step order, durations, temperatures, incorporation
  shares, equipment settings and readiness. The first fermentation model reads percentages and
  temperatures, never the quantity (`fermentation.md`), so its estimates and accepted
  suggestions stay valid; a model that reads the quantity must say so and estimate at the scaled
  quantity.
- Later formula overrides during the bake (`AdjustFormula`) apply to the scaled formula, as they
  do to any snapshot.

Examples (hand-computed; the revision has a flour total of 1000 g, water 72 %, salt 2 %, instant
yeast 0.3 %, so 1000 + 720 + 20 + 3 = 1743 g of dough):

1. **Scale by flour.** New anchor `flourTotal` 600 g: water 432 g, salt 12 g, yeast 1.8 g, dough
   1045.8 g. `scaledFrom.anchor` is `{ kind: 'flourTotal', grams: 1000 }`. The percentages are unchanged.
2. **Scale by dough weight.** New anchor `doughWeight` 1000 g: flour 1000 / 1.743 ≈ 573.7 g,
   water ≈ 413.1 g, salt ≈ 11.5 g, yeast ≈ 1.7 g.
3. **Same anchor.** 1000 g of flour again: no `scaledFrom`, the same as any other start.
4. **The recipe is untouched.** Version 3 stays the head of the recipe after a scaled start; the
   history of the Preparation shows 600 g beside the recipe's 1000 g.
5. **Durations do not scale.** A 6 h bulk stays 6 h at 600 g.
6. **Refused.** `scaledFrom: { anchor: { kind: 'flourTotal', grams: 0 } }`: `InvalidCommand`.

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
