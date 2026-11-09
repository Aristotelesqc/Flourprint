# Contract: history and snapshots (D8)

Status: **approved** (issue #30); outcome, cooking stages and statistics amended for contract
`0.11.0` (#21). Related issues: #7, #10, #20, #21, #26, #28, #29.

## References and versions

- A `FormulaRevision` references `ingredientId@version` (and profiles as `id@version`) without
  copying their properties. Flours are referenced by id and recorded at bake start (`flours.md`).
  An ingredient with a registry entry carries the pinned `entry: { id, version }` in the formula
  together with the contents consumed by calculations (`ingredients.md`); this is the one place
  where a formula copies registry values, so that its numbers never depend on a later edit.
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
  usedProperties: Array<{
    ingredient: string; // the registry entry id
    version: number; // the registry entry version
    customized?: true; // the version is a personal customization of a built-in
    formulaIngredient?: string; // the formula ingredient consumed; set for pinned entries
    key: string;
    value: PropertyValue; // the value actually consumed, the baker's when overridden
    overridden?: true; // the formula ingredient overrides this property of its entry
  }>;
  process: Process; // the definition used, equipment parameters copied
  initialProjection: Projection;
  estimates: Record<StepId, Estimate>; // accepted suggestion of the step, else unsupported
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
  origin?: 'physical' | 'simulation'; // from StartBake; absent = unknown (written before 0.6.0)
  flours?: Array<{ id: string; version: number }>; // registry entries used (flours.md); absent before 0.8.0
  scaledFrom?: { anchor: Anchor }; // the revision's anchor when the preparation was scaled (bake-session.md); absent = no scale recorded
  scaleReview?: Array<{
    stepId: StepId;
    field: 'equipment.load.pieces' | 'equipment.load.massG' | 'technique.phases';
  }>; // absolute fields to review after a scale
  equipment?: EquipmentEntry[]; // copies of the entry versions the process references (equipment.md); absent before 0.12.0
}
```

`origin` says whether the bake was a real one or a simulation. It is set when the bake starts and
never inferred later from the device that holds or exports it: restoring a backup on another
device keeps it. It follows the simulation mode in force when the bake starts (ADR 0014):
`simulation` while the mode is on, `physical` otherwise. History and statistics show the bakes of
the current mode only; a bake without `origin` counts as real.

`scaledFrom` is set only when the bake started at another quantity than its revision (bake-session.md,
Scaled preparation) and the domain verified the claim. In the snapshot, `formula.anchor` is the
Preparation's quantity and `scaledFrom.anchor` the recipe's, tied to `revisions.formula`; History
shows the scaled quantity first and the recipe's beside it. An event written before it records
**no scale**, not "not scaled": its provenance was never attested. `scaleReview` lists the steps
whose absolute loads or machine phases the baker should check; nothing in it is rescaled.
A backup holding it is refused by an app that does not know the field, as for other additive
fields (`persistence.md`), never misread. `CONTRACT_VERSION` is bumped by one minor step, from
the version current at merge, by the implementing pull request.

`usedProperties` contains only the properties actually consumed by the calculation. For an
ingredient with an `entry`, `ingredient` and `version` name the entry, `formulaIngredient` the
formula's ingredient, and the keys are `waterPct`, `fatPct`,
`sugarPct` and `leavening` as far as they were consumed (`ingredients.md`, Bakes). The pinned
entries, their `overrides` and the `preparation` are read from `formula`; `BakeStartedPayload`
gains no field for them. A pin that does not resolve in the registry blocks nothing: the copied
contents are used. A snapshot written before the ingredient registry has no pin (unknown, not "no
registry ingredient").

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

- Full backup: recipes, revisions, bakes, events and every registry (flour and ingredient),
  profile and model-parameter version they reference that exists. A pinned ingredient entry
  version that does not exist is not an error: the formula keeps its copied contents.
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
  scaledFrom?: { anchor: Anchor }; // the preparation was scaled from this anchor (bake-session.md)
  startedAt?: Instant;
  endedAt?: Instant;
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
  ingredients?: Array<{
    ingredient: string;
    entry: { id: string; version: number; customized?: true };
  }>; // pins of the snapshot formula
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
    position?: ProbePosition; // doughTemperature only (bake-session.md)
    componentId?: string; // prefermentTemperature only (bake-session.md, Preparation temperatures)
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
  // Absent unless the Preparation recorded a temperature fact (a reading or a room adjustment).
  temperatures?: {
    outcome: TemperatureOutcome; // fermentation.md, Temperature outcome
    frictionSample?: FrictionSample; // fermentation.md, Friction samples
  };
}
```

- The digest is derived from the events by the application, never by the current engine, and is
  never read back: the `backup` part is the record. Durations are differences of recorded instants.
- `status`, `endedAt` and `outcome` follow the session's latest end (a reopened session is
  `active` until it ends again). `outcome` is the latest `OutcomeCorrected` after that end, else
  that `BakeFinished`'s outcome, else `unknown`; it is absent on active and abandoned sessions. The feedback export's `schemaVersion` is 2
  for `outcome` and `cooking`, 3 with `ingredients`, and 4 (contract 0.26.0) with the observation
  `position` and `componentId` and the per-bake `temperatures`. `ingredients` is read from the snapshot formula's
  pins and absent when there are none.
- **Every measurement is in it.** The `backup` part holds every event of every bake, so every
  recorded measurement is there; the digest lists every observation with its `measurement`, so that
  a reader does not have to replay the log. A kind of measurement the backup or the digest leaves
  out is not finished (persistence.md, Measurements in the backup).
- `device` describes the exporting device only. Whether a bake was real is its own `origin`; an
  `unknown` origin never enters a calibration as a measured bake.
- The export is offered as one action that copies the document and, where the platform can,
  saves it as a file. Nothing is sent anywhere by the app.

## Preparation analysis export (0.26.0, owner decisions of 2026-11-09)

The feedback export gathers everything the app recorded. The **analysis export** is its small
sibling: one Preparation, compact and readable by a person or by an LLM, to debug the app or the
model or to fine-tune with an LLM. It is offered as a second copy action beside the feedback export
("Copy all my data"), named **"Copy this preparation for analysis"**; the interface is a later
slice. It is JSON, because one structure cannot drift from itself; any text or Markdown rendering is
a presentation of this document, never a second format with its own rules.

```ts
interface PreparationAnalysis {
  kind: 'flourprint-analysis';
  schemaVersion: 1;
  exportedAt: Instant;
  about: string; // English legend of the structure, for the reader (units, sources, what is recomputed)
  versions: {
    recorded: { engineVersion: string; contractVersion: string; models: ModelRef[] }; // the snapshot's manifest
    exporting: { engineVersion: string; contractVersion: string; models: ModelRef[] }; // the app that exports
  };
  preparation: {
    status: 'active' | 'finished' | 'abandoned';
    origin: 'physical' | 'simulation' | 'unknown';
    startedAt?: Instant;
    endedAt?: Instant;
    outcome?: PreparationOutcome | 'unknown';
    outcomeSource?: 'recipe' | 'baker';
    scaledFrom?: { anchor: Anchor };
  };
  recipe: {
    name?: string;
    version: number;
    formula: Formula; // the snapshot's, with its pinned entry contents
    resolved: ResolvedFormula; // grams, percentages, total water
    process: Process; // the snapshot's: steps, conditions, thermal inputs, techniques, equipment, readiness
    equipment?: EquipmentEntry[]; // the copies the process references (equipment.md)
    flours?: FlourRef[];
  };
  plan: {
    initialProjection: Projection; // planned start and end of each step at the start
    estimates: Record<StepId, Estimate>; // the accepted suggestions at the start, verbatim
  };
  steps: Array<{
    id: StepId;
    operation: string;
    plannedStartAt?: Instant;
    plannedEndAt?: Instant; // the initial projection
    baselineDurationS?: number;
    plannedDurationS?: number; // the snapshot's and the effective plan
    startedAt?: Instant;
    endedAt?: Instant;
    actualDurationS?: number;
    gap: { startS?: number; endS?: number; durationS?: number }; // actual − planned, signed seconds
  }>;
  temperatures: {
    planned: {
      rooms: Array<{ stepId: StepId; c: number }>;
      doughTargetC?: number;
      frictionC?: number;
    };
    records: Array<{
      quantity: 'room' | 'flour' | 'liquid' | 'preferment' | 'dough';
      valueC: number;
      source: 'adjusted' | 'measured'; // planned values are in `planned`; assumed ones are not records
      at: Instant; // observedAt, or the adjustment's instant
      seq: number; // the event that carries it
      stepId?: StepId;
      componentId?: string;
      position?: ProbePosition;
    }>;
    outcome: TemperatureOutcome;
    frictionSample?: FrictionSample;
  };
  events: Array<{
    seq: number;
    type: string;
    occurredAt: Instant;
    recordedAt: Instant;
    payload: unknown;
  }>;
  forecasts: {
    recorded: {
      acceptedProjections: Array<{ seq: number; projection: Projection }>; // ProjectionAccepted, verbatim
    };
    recomputed: {
      engineVersion: string; // the exporting app's: NOT what the app showed at the time
      asOf: Array<{
        seq: number; // the last event taken into account
        at: Instant; // its occurredAt
        dough?: {
          // the live dough forecast read from the events up to seq (fermentation.md, Live recomputation)
          progressNowPct: Estimate;
          remaining: Estimate;
          stepEnds: Record<StepId, Estimate>;
          doughStart?: TemperatureInput & { basis: 'reading' | 'target' | 'ambient' };
        };
        targets?: TemperatureTargets; // fermentation.md, Liquid target; only before the first contact is completed
      }>;
      thinned?: true; // more events than the cap: the as-of points are an even subset, first and last kept
    };
  };
}
```

**Content.** The recipe and plan as the Preparation started them; every recorded fact in order
(`events`: every event in `seq` order with its payload verbatim, except `BakeStarted`, whose content
is `recipe`, `plan` and `preparation`; the `derived` formula of a formula `OverrideApplied`; and
`ProjectionAccepted`, moved to `forecasts.recorded`); the actual times and the **plan against actual
gaps** per step; **every temperature measurement** with its time, step and source
(`temperatures.records`; a `planned` value is in `temperatures.planned`, an `assumed` one is a
default and not a record); and the engine's forecasts over time.

**Forecasts: recorded and recomputed, never confused.** What the engine _showed_ is recorded only
where the log recorded it: the accepted estimates of the start and the accepted projections
(`forecasts.recorded`, verbatim, with the models and manifest of their time). The forecast _as of_
any later instant is not in the log (a live forecast is never logged, Reading history); the analysis
therefore **recomputes** it with the exporting app's engine from the events up to each instant
(`forecasts.recomputed.asOf`), says so (`recomputed`, its `engineVersion`, `versions.exporting`), and
that is the explicit comparison of Reading history, never a replacement of the record. One as-of
point follows every event that can change a forecast (a step start or end, a time correction, a
completion retraction, an `AdjustStep`, a temperature or `doughReady` observation, a thermal change,
a hold or release, an inserted step), at most 200: past that, the points are an even subset with the
first and the last kept (`thinned`). The temperature targets are included while the first-contact
step is not completed.

**Stability.**

- `kind` and `schemaVersion` identify the document. A new optional field, or a new stable code in an
  existing field, keeps the version; a removed or renamed field, or a changed meaning, raises it.
  An older reader that ignores unknown fields still reads a newer document of the same version.
- Deterministic: the same events, snapshot and engine give the same document apart from
  `exportedAt`. Keys are sorted, arrays are in time order (ties by `seq`), instants are UTC
  (`Z`), numbers are in the persisted units (grams, °C, seconds, points) and are written as
  recorded, never rounded by the export.
- It is derived from the log by the application and never read back: it is not a backup, cannot be
  restored and is not an input to anything.

**Privacy: only what the baker recorded.** The document holds the Preparation's recipe and the
facts recorded in it, and the versions of the software. It holds **no device information** (no
platform, storage kind, build name, locale, time zone or UTC offset, no device or install
identifier), no other Preparation or recipe, no recipe family, no personal profile (the thermal
factor a forecast used appears only as its `thermal_factor:<key>=<value>` assumption, as in every
estimate), and **none of the opaque identifiers of the log**: `bakeId`, `eventId`, `commandId` and
`causationId` are left out and events are referred to by `seq`, so two exports of two
Preparations cannot be linked by an identifier. The recipe's own `id` is also omitted; its `name`
and `version` are what the baker wrote. The baker's free text (notes, ratings, criteria) is
included, as it was recorded. A reader may still recognise the baker from what they wrote; the interface
slice shows the document before it is copied.

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
