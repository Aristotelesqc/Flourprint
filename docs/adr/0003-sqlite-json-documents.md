# ADR 0003: versioned JSON documents in SQLite

Status: Accepted (#10, #24, #30)

## Context

"Stable structure, flexible content": a new bread type or technique must not require a relational
migration. Export, import and a future sync must share a single format.

## Decision

- Few tables: recipes, revisions (JSON document), bakes, bake events, processed commands,
  metadata.
- Documents and events are the source of truth; index columns are rebuildable projections,
  updated in the same transaction.
- Two migration levels: SQL (structure, rare) and content (`schemaVersion`). Content migration:
  decode with the contract of the input version → migrate → validate the new format → apply
  durably. Unsupported future versions are rejected explicitly.
- The same JSON is used for export, import and backup.

## Consequences

#24 must prove atomicity, recovery after a forced stop, a failed migration without data loss, and
index rebuilding. SQLite generated columns are only an option to check on the embedded drivers.
