# Contract: bake session (D7)

Status: **approved** (issue #30). Related issues: #6, #21, #24.

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
| `StartBake`                  | `BakeStarted` (snapshot, `history.md`)                                       | only once; validates the formula, the process and their incorporations together, and projects the process                                                       |
| `StartStep`                  | `StepStarted`                                                                | dependencies completed, and `at` not before their latest end; not already started                                                                               |
| `CompleteStep`               | `StepStarted` if needed, `StepCompleted`                                     | not already completed; an implicit start is placed at the latest end of its dependencies (or the bake start); a completion before it is refused (`InvalidTime`) |
| `AdjustStep`                 | `OverrideApplied` (step duration or temperature)                             | step not completed                                                                                                                                              |
| `AdjustFormula`              | `OverrideApplied` (formula edit, with the edited formula and its resolution) | edit valid for the current effective formula                                                                                                                    |
| `InsertStepAfter`            | `StepInserted`                                                               | the new step depends on `after`; steps not started that depended on `after` now depend on the new step                                                          |
| `AcceptProjection`           | `ProjectionAccepted`                                                         | stores the projection computed at `now`                                                                                                                         |
| `AddObservation`             | `ObservationAdded`                                                           | free text, category, rating, `Observation` measurement or a `kind` (below); also after the end                                                                  |
| `CorrectStepTime`            | `StepTimeCorrected`                                                          | targets a `StepStarted`/`StepCompleted`; a start never ends up after its end, before a dependency's end, and an end never after a started successor's start     |
| `RetractCompletion`          | `StepCompletionRetracted`                                                    | targets the step's completion; no dependent step started                                                                                                        |
| `FinishBake` / `AbandonBake` | `BakeFinished` / `BakeAbandoned`                                             | ends the session; data is kept                                                                                                                                  |

`AddObservation` accepts an optional stable `kind`. `kind: 'doughReady'` records that the baker
judges the dough ready to bake: it needs a `stepId` (the running fermentation step), has category
`fermentation`, and may carry a short `criterion` code (`poke`, `feel`, `time`, `other`) and free
`text`. The time of the observation is its `occurredAt` (now). It never completes the step nor
changes the plan. These are the calibration data of the "ready to bake" target
(`fermentation.md`): they are kept in the bake journal and shown in the bake history. Events
without `kind` are unchanged.

Recorded times follow the finish-to-start edges of the process: a step never starts before every
dependency has ended. Commands that would record or correct a contradicting time are refused, not
adjusted. `AdjustFormula` and `InsertStepAfter` keep the formula and the process consistent,
incorporations included (`process.md`).

Every command except `StartBake` and `AddObservation` requires an active bake. `AddObservation`
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
