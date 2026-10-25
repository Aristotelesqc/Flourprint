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

## Recipe history: saved revisions, reference versions, variants

Owner decision of 2026-10-20 (#7). Three things are kept apart; none is inferred from another.

- A **saved revision** is the immutable record above. Every effective Save writes one,
  automatically; it exists to be recovered. Its `version` is an **internal counter**: the interface
  never presents it as a version the baker chose or counts (it may show "saved 2026-10-20 14:03",
  and "revision N" only where a precise reference is needed, such as Reset or a Preparation's
  baseline).
- A **reference version** is the explicit promotion of **one precise saved revision**:
  `ReferenceVersion { recipeId, number, version, name?, createdAt }`. `number` is its own sequence
  per recipe (1, 2, 3, ...), unrelated to `version`; `version` points to the promoted revision;
  `name` is optional free text. A reference version is immutable (renaming it is out of scope until
  decided). Ordinary Save never promotes. The same revision may be promoted once.
- A **variant** is a new recipe identity (families, below), optionally recording its origin
  `{ recipeId, version }`. Saving and promoting never create one.

Rules, all in one transaction (`BEGIN IMMEDIATE`) and all stating `expectedHead`:

- **Save** (the former "Save version") appends revision `expectedHead + 1`. If the checked formula
  and process are semantically identical to the head's, nothing is appended, nothing is written and
  the current head is returned (a no-op; `note` and timestamps do not count). A no-op Save still applies a changed recipe name (no revision is appended). A no-op Save from a draft still deletes that draft, in the same transaction. A different current head
  returns `HeadConflict { currentHead }`; nothing is written.
- **Restore** `restoreRevision(recipeId, version, expectedHead)` appends revision `expectedHead + 1`
  whose formula, process and note copy revision `version`, together. Nothing is rewritten or
  deleted: the revisions between stay recoverable, and a Preparation keeps its exact
  `{ id, version }` reference and snapshot (#20). Restoring content identical to the head is a
  no-op like Save. A different head returns `HeadConflict`.
- **Promote** `promoteReferenceVersion(recipeId, version, name?, expectedHead)` writes the next
  `number`. It adds no revision and changes no head; `expectedHead` guards that the baker saw the
  current history, so a different head returns `HeadConflict` and nothing is written. An unknown
  `version` is refused; a revision already promoted is refused (`AlreadyReferenced`, returning
  its `number`).
- **Draft.** Restore and promote act on **saved revisions only** and never read, change or delete
  the recipe's open draft. The draft keeps its `baseVersion`; after a Restore or Save from another
  device the draft's next Save is refused with `HeadConflict` as usual.
- A trashed recipe refuses all three (`RecipeTrashed`). Deleting a recipe deletes its reference
  versions with its revisions.

Compatibility:

- Existing revisions load as saved revisions. **No reference version is inferred**: old data does
  not establish that the baker chose any milestone. Revision numbers, Preparation references and
  snapshots are unchanged.
- Backups and recipe exports carry `referenceVersions` per recipe (optional, so older backups and
  exports restore with none). Import follows the existing additive rule: a present recipe is skipped
  whole, reference versions included.
- **Version bump.** The persisted shape grows by a new `reference_versions` table
  (`recipe_id`, `number`, `version`, `name`, `created_at`; primary key `(recipe_id, number)`,
  unique `(recipe_id, version)`, foreign key to `revisions`) and the new optional field above. This
  requires one database migration step, and one `schemaVersion` increment for the full backup and
  the recipe export (older readers would silently drop the field, so they must refuse). The
  revision record itself is unchanged. Implemented as `CONTRACT_VERSION` `0.17.0`, backup and recipe export `schemaVersion` 2
  (`EXPORT_SCHEMA_VERSION`; revision documents stay at 1) and SQL migration 8.

Worked examples:

1. Ten Saves of different content on a new recipe: revisions 1 to 10, zero reference versions,
   one recipe.
2. Save with unchanged content at head 10: nothing written, head stays 10, the same head returned.
3. Head is 7; Restore from 3 with `expectedHead = 7`: revision 8 copies revision 3; revisions 1 to
   7 are untouched; a Preparation started on revision 5 still points to 5.
4. Promote revision 5 (head 8) with `expectedHead = 8`, name "Winter loaf": reference version 1 points
   to revision 5. The baker keeps editing and saves: revisions 9, 10; reference version 1 still
   points to revision 5. Promote revision 5 again: `AlreadyReferenced`.
5. Two devices open head 8. Device A saves (head 9). Device B's Save, Restore or Promote with
   `expectedHead = 8` returns `HeadConflict { currentHead: 9 }`; nothing is written.
6. A draft with edits is open at base 8; the baker restores revision 3 (head 9): the draft is
   unchanged and its Save is refused with `HeadConflict` until the baker reconciles it.
7. An older backup (no `referenceVersions`) restores: all revisions load, zero reference versions.

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
Built-in entries are code and are not stored; a customization of a built-in is a personal entry
stored under the built-in's id (`ingredients.md`).

## Personal thermal profile (#176, 0.21.0 target)

The personal correction of the dough thermal model (`fermentation.md`, Personal correction) is a
versioned personal object, like the readiness profile and personal entries, never part of a recipe:

```ts
interface ThermalProfile {
  id: string; // 'personal'
  version: number; // 1, 2, 3...: a version is never rewritten
  factors: Array<{
    material: ContainerMaterial; // process.md, Thermal inputs
    cover: 'lid' | 'film' | 'cloth' | 'none';
    environment: 'fridgeStatic' | 'fridgeVentilated' | 'roomStill' | 'provingBox';
    factor: number; // multiplies tau_eff, in 0.25 – 4; absent key = 1
    readings: number; // count of readings behind it
    basis: { bakeId: string; stepId: string; eventIds: string[] }[]; // the doughTemperature observations used
  }>;
  updatedAt: Instant;
}
```

- Stored by `(id, version)`; writing a version that is not the next one is refused (`HeadConflict`).
  Absent profile = every factor 1. A factor belongs to the owner's device and probe: it is not a
  property of the recipe and never travels in a recipes file.
- A full backup may carry `thermalProfiles` (every version), optional, so older backups restore.
  An older app refuses a backup holding it as an unknown field, never misreading it.
- A bake snapshot does not store the profile. The factor used by a committed estimate appears in
  that estimate's assumptions (`thermal_factor:<key>=<value>`, history.md), so
  replay never recomputes it with a later factor.
- Storage is an additional table in the SQLite adapter (a database migration step) in the
  implementing pull request; this contract fixes the document, not the SQL.

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
  // per recipe: referenceVersions?: ReferenceVersion[] (absent = none; see Recipe history)
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
