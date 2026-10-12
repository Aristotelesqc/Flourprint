# Contract: history and snapshots (D8)

Status: **approved** (issue #30); outcome, cooking stages and statistics amended for contract
`0.11.0` (#21). Related issues: #7, #10, #20, #21, #26, #28, #29.

## References and versions

- A `FormulaRevision` references `ingredientId@version` (and profiles as `id@version`) without
  copying their properties.
- Versions of registry entries, profiles and model parameters are **immutable and never deleted**
  (archived only).

## Start snapshot

The snapshot lives in the payload of the `BakeStarted` event, the single immutable source.
`bakes.snapshot` is only a cache.

```ts
interface BakeStartedPayload {
  revisions: { formula: RevisionRef; process: RevisionRef };
  formula: Formula; // the definition used, with its resolved ingredient properties
  resolvedFormula: ResolvedFormula; // anchor, %, grams, per-flour allocation, components, water
  usedProperties: Array<{ ingredient: string; version: number; key: string; value: PropertyValue }>;
  process: Process; // the definition used, equipment parameters copied
  initialProjection: Projection;
  estimates: Record<StepId, Estimate>; // accepted suggestion of the step, else unsupported
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
  origin?: 'physical' | 'simulation'; // from StartBake; absent = unknown (written before 0.6.0)
  flours?: Array<{ id: string; version: number }>; // registry entries used (flours.md); absent before 0.8.0
  equipment?: EquipmentEntry[]; // copies of the entry versions the process references (equipment.md); absent before 0.12.0
}
```

`origin` says whether the bake was a real one or a simulation. It is set when the bake starts and
never inferred later from the device that holds or exports it: restoring a backup on another
device keeps it. It follows the simulation mode in force when the bake starts (ADR 0014):
`simulation` while the mode is on, `physical` otherwise. History and statistics show the bakes of
the current mode only; a bake without `origin` counts as real.

`usedProperties` contains only the properties actually consumed by the calculation.

Accepted suggestions (`fermentation.md`):

- For each step of the started process whose `accepted.appliedValue` equals its
  `plannedDurationS`, `estimates[step.id]` is that `accepted.estimate`; the other steps keep the
  `unsupported` estimate with reason `no_fermentation_model`. Accepted doses stay with the
  ingredients and allocations of the snapshot's `formula`.
- `manifest.models` lists the `ModelRef` of every accepted suggestion still in effect (steps,
  ingredients and allocations), once each.
- Replay never recomputes them.
- Estimate `range` bounds follow `values-and-units.md`. Events written before `0.4.0` may hold
  numeric bounds; the upcaster rewrites each as `{ kind: 'finite', value }`. The event schema
  version stays `1`: the representation is read in both forms and always rewritten.

## During the bake

- An override whose effect depends on the engine stores the input **and** the affected
  recomputed values, with the `ModelRef`s used.
- A projection is stored when it is **accepted** (replanning, plan override). The live projection
  is recomputed from facts and is not logged.
- Rule: store **committed** values (decisions, accepted projections, recorded business results),
  not previews or transient displays.

## Reading history

- Reading a bake never calls the current engine.
- Event schemas are versioned; upcasters change representation without reinterpreting business
  values.
- "Recompute with the current engine" is an explicit comparison, never a replacement.

## Export

- Full backup: recipes, revisions, bakes, events and every registry, profile and model-parameter
  version they reference.
- Recipe export: the revisions and the versions they depend on.

## Feedback export

A **feedback export** gathers everything the app recorded, so the owner can hand it to a person
or an agent to check the model and the app against what happened. It is one JSON document:

```ts
interface FeedbackExport {
  kind: 'flourprint-feedback';
  schemaVersion: number;
  exportedAt: Instant;
  about: string; // a short English description of the structure, for the reader
  device: {
    platform: 'android' | 'desktop' | 'web'; // desktop: the PC shell (ADR 0011)
    storage: 'sqlite' | 'memory';
    build: string;
    locale: string;
    timeZone: string; // IANA zone of the device at export time
    utcOffsetMinutes: number; // at export time
  };
  backup: Backup; // the full backup, unchanged: restorable as is
  bakes: BakeDigest[]; // one per bake, read from its events
}

interface BakeDigest {
  bakeId: string;
  status: 'active' | 'finished' | 'abandoned';
  // finished only: the outcome in force (bake-session.md); 'unknown' when none was recorded
  outcome?: PreparationOutcome | 'unknown';
  outcomeSource?: 'recipe' | 'baker'; // with a known outcome
  origin: 'physical' | 'simulation' | 'unknown';
  recipe: { id: string; name?: string; version: number };
  startedAt?: Instant;
  endedAt?: Instant;
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
  steps: Array<{
    id: StepId;
    operation: string;
    cooking: boolean; // a cooking operation (process.md), read from the recorded code
    label?: string;
    plannedStartAt?: Instant; // initial projection at start
    plannedEndAt?: Instant;
    plannedDurationS?: number; // effective plan (after adjustments)
    baselineDurationS?: number; // plan at start
    estimate?: Estimate; // accepted suggestion at start, when the step had one
    startedAt?: Instant;
    endedAt?: Instant;
    actualDurationS?: number; // endedAt − startedAt
  }>;
  observations: Array<{
    at: Instant;
    recordedAt: Instant;
    stepId?: StepId;
    elapsedInStepS?: number; // at − step start, when the step had started
    category: ObservationCategory;
    kind?: ObservationKind;
    stage?: 'shape' | 'bake'; // doughReady only
    set?: number; // fold only: the set done (process.md, techniques)
    criterion?: string;
    text?: string;
    rating?: number;
    measurement?: Observation;
  }>;
  adjustments: Array<{
    at: Instant;
    stepId?: StepId;
    field: string;
    value: unknown;
    reason?: string;
  }>;
}
```

- The digest is derived from the events by the application, never by the current engine, and is
  never read back: the `backup` part is the record. Durations are differences of recorded instants.
- `status`, `endedAt` and `outcome` follow the session's latest end (a reopened session is
  `active` until it ends again). `outcome` is the latest `OutcomeCorrected` after that end, else
  that `BakeFinished`'s outcome, else `unknown`; it is absent on active and abandoned sessions. The feedback export's `schemaVersion` is bumped
  for `outcome` and `cooking`.
- `device` describes the exporting device only. Whether a bake was real is its own `origin`; an
  `unknown` origin never enters a calibration as a measured bake.
- The export is offered as one action that copies the document and, where the platform can,
  saves it as a file. Nothing is sent anywhere by the app.

## Statistics

Statistics (`bakeStats`) read the digests of one world only (ADR 0014), never the engine.

- `counts`: `total`, `active`, `finished`, `abandoned`, and the finished sessions by result:
  `cooked`, `dough`, `cookedAndDough`, `unknown`. The four results add up to `finished`.
- `cookingStages`: by cooking operation, the number of completed cooking steps, over every
  session whatever its status (a stage done is a fact even if the session was abandoned).
- Nothing counts a session as cooked from its status or from a completed cooking step: only a
  `cooked` or `cookedAndDough` result does. A session with an unknown result is counted as
  unknown, never as cooked nor as dough.
- The other statistics (durations, readiness, ratings, recent sessions) are unchanged.

### Acceptance examples

Each line is one session, in a world holding only it. `stages` lists the completed cooking steps.

| Session                                                                                 | Status    | Result           | Counts                       | `cookingStages`   |
| --------------------------------------------------------------------------------------- | --------- | ---------------- | ---------------------------- | ----------------- |
| Pizza dough (mix, bulk, divide), intended `dough`, frozen; Finish tapped                | finished  | `dough`, frozen  | finished 1, dough 1          | none              |
| Bagels (mix, bulk, shape, retard, boil, bake), both stages done                         | finished  | `cooked`         | finished 1, cooked 1         | boil 1, bake 1    |
| Flatbread: `panCook` done, then `bake` (broiler) done                                   | finished  | `cooked`         | finished 1, cooked 1         | panCook 1, bake 1 |
| Same flatbread after `panCook` only, `bake` not started                                 | active    | none             | active 1                     | panCook 1         |
| Loaf finished before `0.11.0` (no outcome), its `bake` step completed                   | finished  | `unknown`        | finished 1, unknown 1        | bake 1            |
| Loaf abandoned after its `bake` step (burnt)                                            | abandoned | none             | abandoned 1                  | bake 1            |
| Loaf proofed in the oven's Proof mode (`proof`), then `bake`; finished cooked           | finished  | `cooked`         | finished 1, cooked 1         | bake 1            |
| Bagels boiled, returned to the pot (inserted `boil`), then baked                        | finished  | `cooked`         | finished 1, cooked 1         | boil 2, bake 1    |
| Focaccia on a gas barbecue (`grill`)                                                    | finished  | `cooked`         | finished 1, cooked 1         | grill 1           |
| Finished `cooked`, reopened, an inserted `bake` done, finished `cooked` again           | finished  | `cooked`         | finished 1, cooked 1         | bake 2            |
| Finished `cooked`, then reopened and not yet ended                                      | active    | none             | active 1                     | as recorded       |
| Loaf recipe (intended outcome derived: `cooked`), dough frozen this time via the choice | finished  | `dough`, frozen  | finished 1, dough 1          | none              |
| Two loaves of one dough: one baked, one frozen                                          | finished  | `cookedAndDough` | finished 1, cookedAndDough 1 | bake 1            |
| Finished as `dough`, then corrected to `cooked` (`OutcomeCorrected`)                    | finished  | `cooked`         | finished 1, cooked 1         | as recorded       |

Replaying any of these sessions, after a restore or a restart, gives the same digest: outcomes
and stages are read from the events, never inferred.
