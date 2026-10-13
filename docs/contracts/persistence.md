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

## Recipe trash

Owner decision of 2026-10-12: a recipe is put in a trash before it can be deleted, and the trash
is emptied by hand only.

- `trashRecipe(id, at)` sets the recipe's `trashedAt` (an instant); `restoreRecipe(id)` clears it.
  Both create no revision and keep every revision, the family membership and the name. Trashing a
  trashed recipe is refused (`AlreadyTrashed`), restoring one not in the trash too
  (`NotTrashed`); an unknown id is `NotFound`. The implementing pull request bumps
  `CONTRACT_VERSION` to `0.13.0`.
- A trashed recipe is out of the recipe list, the family default and every picker; it is listed in
  the trash, most recently trashed first. Saving a revision of it is refused (`RecipeTrashed`):
  restore it first.
- `deleteRecipe(id)` deletes a **trashed** recipe for good, with all its revisions, in one
  transaction; a recipe not in the trash is refused (`NotTrashed`). It leaves its family (a family
  left with no member is deleted, a pin on it is cleared). `emptyTrash()` deletes every trashed
  recipe in one transaction and returns their ids. Nothing is ever deleted without the baker's
  action: there is no automatic purge.
- Bakes are never touched: a Preparation keeps its snapshot of the formula and the process
  (`history.md`) and still replays, shows and exports after its recipe is trashed or deleted. The
  history names it from the recipe when it exists, else as a deleted recipe.
- A draft is not a recipe and has no trash; one whose origin recipe is deleted can still be saved
  as a new recipe, while saving it as a version of that recipe is refused (`NotFound`).
- A full backup carries trashed recipes with their `trashedAt` (optional, absent means not
  trashed); a restore keeps them in the trash. A recipes file never carries a trashed recipe, so
  sharing never sends the trash.
- A new installation starts with no recipe: nothing is seeded; the templates of `drafts.md` start
  a recipe. A recipe seeded by an earlier build stays an ordinary recipe that can be trashed.

## Recipe families

- A **family** groups variants of one recipe: `{ id, name, pinnedRecipeId? }`. A recipe belongs
  to at most one family (`familyId`). Each variant keeps its own revisions.
- The **default variant** is the pinned recipe when it belongs to the family and is not trashed,
  otherwise the most recently updated member not in the trash (ties: smallest id). A family whose
  members are all in the trash is not listed. The recipe list shows a family once, through its
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

## Drafts

- Drafts (`drafts.md`) are stored apart from recipes: `{ id, name, origin, formula, process,
createdAt, updatedAt }` as one JSON document. `saveDraft` writes or replaces it; `deleteDraft`
  removes it. Their documents are decoded structurally when read, like revisions, but not
  validated: a draft may fail the recipe checks.
- Saving a draft as a recipe or a version writes the revision and deletes the draft in **one
  transaction**.
- A full backup carries `drafts` (optional, so older backups still restore); a restore writes them
  as recorded.

## Erasing a history

`deleteBakes(origin)` deletes every bake of that origin (`physical` also takes bakes without
`origin`): their events, command records and summaries, in one transaction. It is the only way a
bake log is ever deleted, triggered by the baker (ADR 0014). Recipes, drafts, flours and ingredients are
untouched.

## Flour registry

Personal flour entries (`flours.md`) are stored by `(id, version)`; a version is never rewritten.
Writing an entry whose version is not the next one for its id is refused (`HeadConflict`).
Built-in entries are code and are not stored.

## Ingredient registry

Personal ingredient entries (`ingredients.md`) are stored by `(id, version)` like flours; a version
is never rewritten, and a version that is not the next one for its id is refused (`HeadConflict`).
Built-in entries are code and are not stored.

## SQLite schema (version 7)

```sql
recipes        (id TEXT PRIMARY KEY, name TEXT NOT NULL, head_version INTEGER NOT NULL,
                updated_at TEXT NOT NULL, family_id TEXT,                      -- family_id: v2
                trashed_at TEXT)                                               -- trashed_at: v6
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
drafts         (id TEXT PRIMARY KEY, name TEXT NOT NULL, document TEXT NOT NULL,
                updated_at TEXT NOT NULL)                                          -- v3
flours         (id TEXT NOT NULL, version INTEGER NOT NULL, archived INTEGER NOT NULL,
                schema_version INTEGER NOT NULL, document TEXT NOT NULL,
                created_at TEXT NOT NULL, PRIMARY KEY (id, version))               -- v4
equipment      (id TEXT NOT NULL, version INTEGER NOT NULL, kind TEXT NOT NULL,
                archived INTEGER NOT NULL, schema_version INTEGER NOT NULL,
                document TEXT NOT NULL, created_at TEXT NOT NULL,
                PRIMARY KEY (id, version))                                         -- v5
ingredients    (id TEXT NOT NULL, version INTEGER NOT NULL, archived INTEGER NOT NULL,
                schema_version INTEGER NOT NULL, document TEXT NOT NULL,
                created_at TEXT NOT NULL, PRIMARY KEY (id, version))               -- v7
```

The SQL lives once in `@flourprint/adapters` and runs on a small driver interface; Node
(`node:sqlite`), Android (`@capacitor-community/sqlite`) and the desktop shell (a bridge to
`node:sqlite` in Electron's main process, ADR 0011) only provide drivers. Every operation
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
  ingredients?: IngredientEntry[], // personal entry versions the revisions pin (ingredients.md)
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
- Entries of `ingredients` are written when absent and skipped when present, like recipes: never
  compared, merged or overwritten.
- A full backup may also carry `families` and `familyId`, `flours` (every personal flour entry
  version), `equipment` (every personal equipment entry version, equipment.md) and `ingredients`
  (every personal ingredient entry version, ingredients.md); all are optional, so older backups
  still restore. A pin to an entry version absent from the backup is kept: the formula holds its
  copied contents (ingredients.md).

## Shared contract tests

Every implementation (memory, SQLite Node, SQLite Capacitor, SQLite bridge) runs the same contract test suite:
idempotent retry, reused command id, version conflict, atomic rejection of an invalid batch,
head conflicts, immutability of revisions, families (grouping, pinning, default variant) and
additive import (skips present ids, idempotent, atomic) and drafts (save, replace, delete, and
the atomic promotion of a draft to a recipe or a version) and personal flours and ingredients
(versions, archive, next-version check) and the trash (trash, restore, refused revision, family
default, delete and empty in one transaction, bakes untouched). SQLite implementations add durability tests (reopen,
failed migration, newer database refused).
