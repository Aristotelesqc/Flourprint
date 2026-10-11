# ADR 0006: numeric representation and reference fixtures

Status: Accepted (#16, #19, #30)

## Decision

- Calculations use JS `number` (double precision) with no intermediate rounding; rounding happens
  only for display or weighing. No decimal library, no integer milligrams.
- Persisted canonical units: grams, °C, seconds, UTC instants, percentages in points
  (`docs/contracts/values-and-units.md`).
- Reference fixtures are computed outside the engine (exact rational arithmetic, documented
  equations). CLI output is only used for regression tests after validation.
- Comparisons use a relative tolerance declared per fixture (`1e-9` by default); exact equality
  for IDs, sequences and discrete values.

## Consequences

If a real case shows drift incompatible with the tolerance, this ADR is superseded with a worked
example.
