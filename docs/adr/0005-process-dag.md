# ADR 0005: minimal process graph

Status: Accepted (#5, #30)

## Context

The reference protocol (#5) has parallel branches (poolish and autolyse, preheating during the
final proof). Accepting `dependsOn` without executing it would produce wrong schedules.

## Decision

A small DAG with finish-to-start dependencies, topological sort, cycle detection, and `asap`/`alap`
scheduling. No workflow engine, no rule language. The editor stays a mobile list in topological
order, linear by default.

## Consequences

Start-to-start dependencies or lags between steps can be added later without migration. The
scheduler does not model biology.
