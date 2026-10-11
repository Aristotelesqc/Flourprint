# ADR 0004: events for bakes only

Status: Accepted (#6, #21, #30)

## Decision

Only bake sessions are represented as an append-only event log
(`docs/contracts/bake-session.md`). Recipes remain documents versioned through revisions. No
global event sourcing.

Commands and events are distinct; idempotency by `commandId` is checked before `expectedVersion`;
conflicts are strict; corrections are typed; `evolve` is structural.

## Consequences

Resuming after the app is closed is a replay of the log. Computed values must be present in the
events so that replay never calls the engine (ADR 0007).
