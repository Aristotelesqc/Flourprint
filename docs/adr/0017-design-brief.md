# ADR 0017: A shared DESIGN.md brief for the interface

Status: Accepted for the design-document convention (2026-10-12). No component or routing
migration is accepted by this ADR.

## Context

The owner requests a persistent design file while continuing the Material 3 exploration on
#35. Multiple agents contribute UI analyses and implementations; colors, density and interaction
rules need a discoverable shared reference. Contracts and ADRs already govern semantics and
architecture. Neither should become a collection of per-component styling instructions.

## Decision

Use root `DESIGN.md`, following the
[Google Labs alpha format](https://github.com/google-labs-code/design.md), for visual identity,
audited design tokens, component roles and interaction guidance. AGENTS.md directs UI agents
to it. Keep current implemented tokens distinct from proposed Material 3/AMOLED extensions.

The initial tokens are a documented snapshot of `apps/mobile/src/theme/app.css`, with current
shared layout dimensions. The runtime CSS remains executable; no generator or new package is
introduced. Theme/component changes update the brief and runtime implementation together.
Contracts take precedence for data meaning; ADR 0002 remains the stack decision. Selection of
component primitives and replacement of Ionic require their own measured comparison and ADR.

An alternative was leaving the design scattered across issue comments and exploration reports.
Those remain historical evidence, but a concise root brief is easier for each implementation
agent to discover. Another alternative was immediately generating all CSS from new tokens;
the M3 mapping and theme variants are not yet validated, so generation would freeze premature
choices and overwrite established behavior.

## Consequences

- Preserve the warm palette and final owner-approved logo across implementations.
- Distinguish retained requirements, current source and prototype proposals in one design brief.
- Maintain the snapshot alongside source until a separately reviewed token-generation strategy
  exists; format validation alone does not detect runtime drift or prove accessibility.
- The generated GitHub backlog still owns work status. DESIGN.md contains no operational table.
- No domain semantics, dependency, route or UI behavior changes in this documentation slice.
