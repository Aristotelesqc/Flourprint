# ADR 0001: engine first, layers and packages

Status: Accepted (2026-10-06, #1, #22, #30)

## Context

The domain engine is the product. The mobile UI, the CLI, agent tools and a future LLM are its
clients. Calculations must exist in exactly one place.

## Decision

```text
apps/mobile, apps/cli        composition and presentation
packages/ui                  Flourprint tokens and blocks (no baking math)
packages/adapters            port implementations (SQLite, files, native)
packages/core/contracts      boundary schemas (Zod), exchange formats
packages/core/application    use cases and ports (Clock, IdGenerator, repositories)
packages/core/domain         pure types, calculations and invariants
```

- `core/domain` imports neither Node, Zod, React/Ionic/Capacitor, nor `application`/`contracts`.
- `core/application` depends on the domain; clock, IDs and storage are injected.
- Public exports through subpaths (`@flourprint/core/domain`, …). Android and Node adapters have
  separate entry points; no global re-export.
- Boundaries are enforced by ESLint (`no-restricted-imports`) and by an architecture test.

## Consequences

An adapter moves to its own package if subpaths are not enough to isolate its installation or
build. The mobile build must prove it bundles no Node module.
