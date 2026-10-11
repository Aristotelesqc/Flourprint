# ADR 0007: revisions reference, bakes copy

Status: Accepted (#7, #20, #30)

## Decision

- Formula revisions reference immutable versions (`id@version`) of registry entries and profiles;
  they do not copy their properties.
- A bake copies into `BakeStarted` everything needed to read it later: resolved formula, consumed
  properties, resolved process, initial projection, estimates, model manifest.
- Values committed during the bake (computed overrides, accepted projections) are stored in the
  events. Previews are not.

## Consequences

Registry, profile and model-parameter versions are never deleted. Full backups include them.
Details: `docs/contracts/history.md`.
