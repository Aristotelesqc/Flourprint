# Contract: bake session (D7)

Status: **approved** (issue #30); lifecycle and outcome amended for contract `0.11.0` (#21).
Related issues: #6, #21, #24, #28.

## Preparation and persisted names

A bake session is what the app calls a **Preparation** (Préparation in French): the record of
actual work on a dough, from the start of a recipe's process to its end, whether or not the dough
is cooked. The persisted names stay as they are (`bakeId`, `BakeStarted`, `FinishBake`, the
`bakes` table…): a label change never renames a persisted event type or field. The rest of the
contracts keep "bake" for the session.

## Lifecycle

A session is `active` from `BakeStarted`, then ends once, `finished` or `abandoned`:

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
parallel (process.md). A finished or abandoned session is never reopened; its data are kept.

## Cooking stages

A **cooking step** is a step whose operation is a cooking operation (process.md): `bake`,
`boil`, `steam`, `fry`, `panCook`. A process may hold zero, one or several of them, in
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
}
```

- `cooked`: the intended product was cooked (all of it). `dough`: the result is the raw dough
  itself (pizza balls frozen for later, a dough given away). `cookedAndDough`: part cooked, part
  kept as dough.
- `dough` is only accepted with `result` `dough` or `cookedAndDough`; elsewhere it is
  `InvalidCommand`. It is optional: unknown stays unknown.
- The outcome is what the baker declares. The domain neither derives it from completed cooking
  steps nor refuses it against them (a process may not model a cooking step done outside it).
  The interface proposes `cooked` when a cooking step was completed and `dough` otherwise; the
  baker confirms or changes it.
- `FinishBake` takes an optional `outcome`. Without one, the event has no outcome and the result
  is **unknown**, exactly as for events written before `0.11.0`. An unknown result is never read
  as cooked, whatever steps were completed.
- `CorrectOutcome { outcome }` replaces the outcome of a **finished** session with a typed
  `OutcomeCorrected` event; the original `BakeFinished` stays in the log. On an active or
  abandoned session it is refused with `NotFinished`. The latest `OutcomeCorrected` wins.

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
| `AdjustStep`                 | `OverrideApplied` (step duration or temperature)                             | step not completed                                                                                                                                              |
| `AdjustFormula`              | `OverrideApplied` (formula edit, with the edited formula and its resolution) | edit valid for the current effective formula                                                                                                                    |
| `InsertStepAfter`            | `StepInserted`                                                               | the new step depends on `after`; steps not started that depended on `after` now depend on the new step                                                          |
| `AcceptProjection`           | `ProjectionAccepted`                                                         | stores the projection computed at `now`                                                                                                                         |
| `AddObservation`             | `ObservationAdded`                                                           | free text, category, rating, `Observation` measurement or a `kind` (below); also after the end                                                                  |
| `CorrectStepTime`            | `StepTimeCorrected`                                                          | targets a `StepStarted`/`StepCompleted`; a start never ends up after its end, before a dependency's end, and an end never after a started successor's start     |
| `RetractCompletion`          | `StepCompletionRetracted`                                                    | targets the step's completion; no dependent step started                                                                                                        |
| `FinishBake` / `AbandonBake` | `BakeFinished` / `BakeAbandoned`                                             | ends the session; data is kept; `FinishBake` takes an optional `outcome` (above), recorded in its event                                                         |
| `CorrectOutcome`             | `OutcomeCorrected`                                                           | finished session only (`NotFinished` otherwise); the outcome is valid                                                                                           |

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

Every command except `StartBake`, `AddObservation` and `CorrectOutcome` requires an active bake. `AddObservation`
also applies to a finished or abandoned bake (the review after the bake: crumb, flavor, what went
wrong); `kind: 'doughReady'` still needs an active bake. It never reopens the bake. Business errors are typed codes
(`StepAlreadyCompleted`, `DependenciesNotCompleted`, `BakeNotActive`, …).

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
