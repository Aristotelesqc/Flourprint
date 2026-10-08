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
- Formula and process are validated by the engine before saving, together: incorporations
  declared by the process must match the formula's final mix (`process.md`). Persisted documents carry
  `schemaVersion`; unsupported versions are refused when read.

## Recipe families

- A **family** groups variants of one recipe: `{ id, name, pinnedRecipeId? }`. A recipe belongs
  to at most one family (`familyId`). Each variant keeps its own revisions.
- The **default variant** is the pinned recipe when it belongs to the family, otherwise the most
  recently updated member (ties: smallest id). The recipe list shows a family once, through its
  default variant.
- Families are organisation, not recipe content: grouping, leaving and pinning create no
  revision. Grouping (`groupRecipes(family, recipeIds)`) is one transaction. A family left with
  no member is deleted. Pinning a recipe outside the family is refused (`NotInFamily`).
- No recipe is grouped automatically: grouping is a user (or import) decision.

## Bakes

- The event log follows `bake-session.md`. `append` also writes the bake summary row in the same
  transaction.
- The summary is computed by the application from the replayed state, never by SQL:
  `{ bakeId, status, recipeId?, recipeVersion?, startedAt?, endedAt?, version, updatedAt }`.
- Summaries are rebuildable from the events at any time.

## SQLite schema (version 2)

```sql
recipes        (id TEXT PRIMARY KEY, name TEXT NOT NULL, head_version INTEGER NOT NULL,
                updated_at TEXT NOT NULL, family_id TEXT)                      -- family_id: v2
recipe_families (id TEXT PRIMARY KEY, name TEXT NOT NULL, pinned_recipe_id TEXT)  -- v2
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
schema_meta    (key TEXT PRIMARY KEY, value INTEGER NOT NULL)
```

The SQL lives once in `@flourprint/adapters` and runs on a small driver interface; Node
(`node:sqlite`) and Android (`@capacitor-community/sqlite`) only provide drivers. Every operation
on a connection is serialized, so a transaction never interleaves with another operation.

- Documents are JSON. Columns other than keys, versions and `document` are index projections.
- The schema version is stored in `schema_meta (key TEXT PRIMARY KEY, value INTEGER)` under the
  key `schema_version`, not in `PRAGMA user_version`, which some drivers (Capacitor) manage
  themselves. Migrations run in one transaction each, in order; a failure rolls back and leaves the previous version usable. A database newer than the
  app is refused (`UnsupportedDatabaseVersion`).
- Every write that spans several rows is one transaction (`BEGIN IMMEDIATE`).

## Restore

- A backup is decoded from untrusted JSON and fully checked before anything is written: kind and
  schema versions, identifiers, revision numbering, formula/process consistency, event envelopes,
  sequence and upcasting.
- The restore is atomic: it writes everything in one transaction, into an empty database, or
  nothing. A failed restore leaves the target unchanged and can be retried.

## Recipe files and additive import

- A **recipes file** holds recipes only, never bakes, and is named distinctly from a full backup:

```ts
{
  kind: 'flourprint-recipes', schemaVersion, exportedAt,
  recipes: [{ id, name, familyId?, revisions }],
  families: [{ id, name, pinnedRecipeId? }],
}
```

- It is decoded and checked like a backup (same recipe and revision rules) before anything is
  written. Formula and process documents are decoded structurally first: every field's type and
  every discriminant (roles, kinds, schedules, anchors, contents) is checked and unknown fields
  are refused; business validation runs only on a well-formed document. Operation codes stay open.
- Importing it is **additive** and one transaction:
  - a recipe whose id is absent is written with all its revisions, versions, dates and notes as
    recorded;
  - a recipe whose id is present is skipped, never compared, merged or overwritten, even if it
    was edited since;
  - an absent family is created; a present family is left unchanged; a newly written recipe joins
    its family.
- The result lists the imported and the skipped recipe ids. Importing the same file again
  imports nothing.
- A full backup may also carry `families` and `familyId`; both are optional, so older backups
  still restore.

## Shared contract tests

Every implementation (memory, SQLite Node, SQLite Capacitor) runs the same contract test suite:
idempotent retry, reused command id, version conflict, atomic rejection of an invalid batch,
head conflicts, immutability of revisions, families (grouping, pinning, default variant) and
additive import (skips present ids, idempotent, atomic). SQLite implementations add durability tests (reopen,
failed migration, newer database refused).
