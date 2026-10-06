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
  estimates: Record<StepId, Estimate>;
  manifest: { engineVersion: string; contractVersion: string; models: ModelRef[] };
}
```

`usedProperties` contains only the properties actually consumed by the calculation.

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
