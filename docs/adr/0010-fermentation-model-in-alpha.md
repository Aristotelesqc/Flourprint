# ADR 0010: The first fermentation model is part of Dogfood Alpha

Status: Accepted (owner decision of 2026-10-09, #29, #30). Amends ADR 0008.

## Context

ADR 0008 kept Dogfood Alpha free of any numeric fermentation model (`Estimate` always
`unsupported`) and made the first N3 simulator (#29) the deliverable of the next milestone.
Using the app, the owner found it of little use without one: changing the yeast must show its
effect on the fermentation time, and the time must be computed, not only typed.

## Decision

- The **first N3 fermentation domain** moves into Dogfood Alpha: forward simulation (time from
  yeast dose, yeast type and temperatures) and inverse solving (dose from a schedule), sharing
  one `simulate()` as #29 requires.
- Everything else in #29 and #9 keeps its rules: a narrow, declared domain; sourced equations
  and parameters; validation data distinct from fitting data; `out_of_domain`,
  `insufficient_data` or `unsupported` outside it; no invented coefficient; estimates are never
  automatic step ends.
- Planned durations typed by the user stay distinct from computed suggestions; applying a
  suggestion is an explicit action.

## Consequences

- `docs/contracts/capability-levels.md` changes: fermentation is N3 in Alpha for its first
  domain. A dedicated contract describes the model before its code.
- Engine MVP keeps the extensions: more domains (sourdough, enriched doughs beyond the first
  domain), temperature and constrained-plan solvers, calibration from recorded bakes (#14).
- Development order: the formula editing the model needs (editable preparations, hydration
  lock) comes first, then the model, then the remaining Alpha journeys (#8).
