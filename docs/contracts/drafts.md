# Contract: drafts, recipe checks and templates

Status: **draft for Alpha** (owner decision of 2026-10-10). Related issues: #8, #19, #23.

A recipe is built by trial: some intermediate states are not computable (a flour blend that does
not add up to 100 %, a preparation larger than the dough). Edits are therefore free in a
**draft**, and the whole recipe is **checked** on demand and before anything is saved as a
revision or baked.

## Drafts

```ts
interface Draft {
  id: string;
  name: string;
  origin:
    | { kind: 'blank' }
    | { kind: 'template'; template: { id: string; version: string } }
    | { kind: 'revision'; recipeId: string; baseVersion: number };
  formula: Formula; // may fail the checks below
  process: Process; // may fail the checks below
  createdAt: Instant;
  updatedAt: Instant;
}
```

- A draft is **persisted** (persistence.md) as soon as it is created and after every edit, so it
  survives closing the app. Last write wins; a draft has no history.
- Formula edits in a draft (`formula.md`) are applied without the final resolution: an edit is
  refused only when it cannot be applied at all (an unknown reference, a grams edit on a formula
  that cannot be resolved). Process edits are applied as typed. The check list (below) says what
  is wrong.
- A draft never starts a bake.
- **Save as recipe** (`blank`, `template`): runs the checks; with no blocking issue it creates a
  recipe with a new id, its name and revision 1, then deletes the draft. **Save version**
  (`revision`): the same, as a new revision of the recipe with `expectedHead = baseVersion`
  (`HeadConflict` as for any save). **Delete** removes the draft and nothing else.
- At most one `revision` draft per recipe: opening a recipe with a draft resumes it.
- **Generated names**: a draft from a template is named after the template, a blank one after a
  generic label, followed by the smallest number ≥ 1 that no recipe or draft name with that
  prefix uses ("Baguette 1", "Baguette 2"). The label is localized (ADR 0009); the user can
  rename the draft.

## Recipe checks

```ts
interface RecipeIssue {
  severity: 'blocking' | 'warning';
  code: string; // stable code, localized by the UI
  path?: string; // the field concerned, e.g. "ingredients.salt.bakerPct", "steps.bulk"
  details?: Record<string, string | number>;
}
checkRecipe(formula, process, entryFamilies?: Record<string, IngredientFamily>): RecipeIssue[]
```

- `entryFamilies` maps a formula ingredient id to the family of the registry entry it pins
  (`ingredients.md`). The application resolves it; the domain never reads the registry or `entry`,
  and without it only the ingredient ids and the yeast marks count.
- **Blocking**: every error of `validateRecipe` (formula, process and incorporations, with its own
  code), a recipe without a step.
- **Warning** (never blocks):

| Code                      | When                                                                              |
| ------------------------- | --------------------------------------------------------------------------------- |
| `salt_missing`            | no dough ingredient with id `salt` or with an `entry` of family `salt`            |
| `salt_outside_1_to_3_5`   | salt below 1 % or above 3.5 % of the flour                                        |
| `water_outside_45_to_90`  | total water below 45 % or above 90 % of the flour, when it is complete            |
| `no_leavening`            | no ingredient marked as yeast, none with a `leaven` entry, and no preferment      |
| `no_mix_step`             | no step with operation `mix`                                                      |
| `no_bake_step`            | no cooking step (process.md); a dough-only recipe stays valid                     |
| `step_without_duration`   | an `asap` step without a planned duration (one issue per step, `path` its id)     |
| `folds_exceed_step`       | `folds.count × folds.intervalS` exceeds the step's planned duration               |
| `preheat_too_short`       | a `beforeTarget` step's `warmup` is `insufficient` (window under the requirement) |
| `preheat_window_unknown`  | a `beforeTarget` step's `warmup` is `unknown`: its window cannot be computed      |
| `preheat_target_mismatch` | a preheat and its target name different appliances                                |

- The ranges are deliberately wide (bagels near 55 %, focaccia near 85 % total water); they flag
  likely typos, not style choices.
- Checks are computed by `@flourprint/core/domain` only. The UI shows them on demand ("Check the
  recipe") and as a count while editing, and runs them before saving or baking.

## Fermentation schedules

A **fermentation schedule** is a preset for the dough steps between the mix and the first heat
step (fermentation.md). Applying one to a draft replaces those steps with the schedule's steps,
each with its operation, duration, location and temperature, linked in order after the mix and
before the steps that followed the replaced ones. It refuses (`InvalidProcess`) when a replaced
step carries incorporations or a technique other than folds. Folds of a replaced bulk are kept on
the schedule's bulk.

| id               | Steps (defaults)                                                           |
| ---------------- | -------------------------------------------------------------------------- |
| `bulk-proof`     | bulk 2 h at room · shape · proof 1 h at room                               |
| `cold-bulk`      | bulk 1 h at room · cold bulk 18 h at 4 °C · shape · proof 2 h at room      |
| `cold-proof`     | bulk 2 h at room · shape · cold proof 14 h at 4 °C (baked from the fridge) |
| `same-day-short` | bulk 1 h at room · shape · proof 45 min at room                            |

Schedules are versioned data in the application layer, like templates; the last dough step of each
is `durationMode: 'model'`. A schedule is a starting point: every value stays editable.

## Templates

```ts
interface RecipeTemplate {
  id: string;
  version: string; // a change of the data is a new version
  category: 'bread' | 'enriched' | 'pan' | 'pizza' | 'flatbread';
  formula: Formula;
  process: Process;
  basis: string; // where the proportions come from (English)
  guide?: {
    ranges: { key: string; low: number; high: number }[]; // typical ranges of the style
    reference: string; // the document the ranges come from
    verified: boolean; // false until the sources were read in full
  };
}
```

- Templates are shipped with the app, read only. "Start from a template" creates a draft with a
  copy of the template's formula and process (`origin.kind = 'template'`); the template never
  changes afterwards.
- Every template passes `checkRecipe` without a blocking issue (a test). Warnings are allowed only
  when they describe the style (for example `water_outside_45_to_90` never applies to a template).
- Proportions are typical values of the style from general baking references, stated in `basis`;
  they are starting points, not tested recipes. They never come from the owner's dogfood recipes.
- A template may carry a **style guide**: the style's typical ranges (as data, keyed by stable
  codes such as `hydration_pct`, `salt_pct`, `bulk_h`, `bake_c`; the unit follows the suffix) and
  the document they come from. The interface shows it with the style's traits (localized text)
  and says when the ranges are not verified. A guide describes the style; it never changes a
  recipe or a check.
- The blank recipe is not a template: flour 100 %, water 65 %, salt 2 %, instant yeast 0.5 %, and
  the steps mix, bulk, shape, proof, bake, with durations.
