# Contract: history and snapshots (D8)

Status: **approved** (issue #30). Related issues: #7, #10, #20, #26, #28, #29.

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
}
```

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
  recipe: { id: string; name?: string; version: number };
  startedAt?: Instant;
  endedAt?: Instant;
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
  steps: Array<{
    id: StepId;
    operation: string;
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
- The PC shell and the phone keep separate databases: each export says where it comes from
  (`device.platform`). The simulation mode of #8 (not built yet) will add its mode to each
  digest, so simulated bakes are exported too but never mixed with real ones.
- The export is offered as one action that copies the document and, where the platform can,
  saves it as a file. Nothing is sent anywhere by the app.
