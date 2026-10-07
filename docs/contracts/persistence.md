# Contract: persistence (step 5)

Status: **draft for Alpha**. Related issues: #10, #20, #21, #24. Architecture: ADR 0003, ADR 0004.
Driver choices stay provisional until spike #24 reports.

## Recipes and revisions

- A **recipe** has a stable `id`, a `name` and a `headVersion`.
- A **revision** is immutable once written: `{ recipeId, version, formula, process, createdAt,
note? }`. Versions start at 1 and increase by one.
- In Alpha a revision holds the formula and the process together. A bake's `revisions.formula`
  and `revisions.process` therefore point to the same `{ id: recipeId, version }`.
- Saving a revision states the head it was based on (`expectedHead`, 0 for a new recipe). A
  different current head returns `HeadConflict { currentHead }`; nothing is written.
- Formula and process are validated by the engine before saving. Persisted documents carry
  `schemaVersion`; unsupported versions are refused when read.

## Bakes

- The event log follows `bake-session.md`. `append` also writes the bake summary row in the same
  transaction.
- The summary is computed by the application from the replayed state, never by SQL:
  `{ bakeId, status, recipeId?, recipeVersion?, startedAt?, endedAt?, version, updatedAt }`.
- Summaries are rebuildable from the events at any time.

## SQLite schema (version 1)

```sql
recipes        (id TEXT PRIMARY KEY, name TEXT NOT NULL, head_version INTEGER NOT NULL,
                updated_at TEXT NOT NULL)
revisions      (recipe_id TEXT NOT NULL, version INTEGER NOT NULL, schema_version INTEGER NOT NULL,
                document TEXT NOT NULL, created_at TEXT NOT NULL,
                PRIMARY KEY (recipe_id, version))
bake_events    (bake_id TEXT NOT NULL, seq INTEGER NOT NULL, event_id TEXT NOT NULL UNIQUE,
                schema_version INTEGER NOT NULL, document TEXT NOT NULL,
                PRIMARY KEY (bake_id, seq))
bake_commands  (command_id TEXT PRIMARY KEY, bake_id TEXT NOT NULL, content TEXT NOT NULL,
                first_seq INTEGER NOT NULL, last_seq INTEGER NOT NULL)
bakes          (bake_id TEXT PRIMARY KEY, summary TEXT NOT NULL, status TEXT NOT NULL,
                updated_at TEXT NOT NULL)
```

- Documents are JSON. Columns other than keys, versions and `document` are index projections.
- The schema version is SQLite's `user_version`. Migrations run in one transaction each, in
  order; a failure rolls back and leaves the previous version usable. A database newer than the
  app is refused (`UnsupportedDatabaseVersion`).
- Every write that spans several rows is one transaction (`BEGIN IMMEDIATE`).

## Shared contract tests

Every implementation (memory, SQLite Node, SQLite Capacitor) runs the same contract test suite:
idempotent retry, reused command id, version conflict, atomic rejection of an invalid batch,
head conflicts, immutability of revisions. SQLite implementations add durability tests (reopen,
failed migration, newer database refused).
