# TOST dogfood import

The owner's recipes from TOST ("HOME Bread Recipe"), converted into Flourprint documents for
dogfooding (#18). This is personal data, not product code: nothing in `packages/` or `apps/`
refers to it, and deleting `dogfood/` leaves Flourprint building and working.

| Folder              | Content                                                                 | Edited by |
| ------------------- | ----------------------------------------------------------------------- | --------- |
| `source/`           | the TOST export, verbatim, with its `SHA256SUMS`                        | never     |
| `decisions.json`    | owner decisions: flour names, poolish yeast, families, compositions     | hand      |
| `importer/`         | legacy parser → intermediate representation → migration → engine checks | hand      |
| `importer/test/`    | golden migrations on six single-recipe fixtures, not the full dataset   | hand      |
| `converted/`        | `flourprint-recipes.json`, a recipes file the app imports               | generated |
| `migration-report/` | per-recipe status, numbers compared with TOST, assumptions, losses      | generated |

## Regenerate

```bash
pnpm build
npx tsc -p dogfood/tost/importer
node dogfood/tost/importer/dist/main.js          # writes converted/ and migration-report/
node dogfood/tost/importer/dist/main.js --check  # verifies they are up to date
```

The importer never writes to `source/`, and it validates every recipe with the real engine
(`parseFormula`, `validateRecipe`, `resolveFormula`, `projectProcess`) and the whole file with
`decodeRecipeFile`, the same check the app runs before importing.

## Put the recipes on the phone

Copy `converted/flourprint-recipes.json` to the phone, then in the app: Advanced → Import
recipes. The import is additive: recipes already on the phone are skipped, never overwritten,
and importing the file again adds nothing.

## Remove

Once recipes are created and backed up in the app itself, delete `dogfood/` and the three lines
that mention it in `.prettierignore`, `vitest.config.ts` and `tsconfig.tests.json`. Nothing else
refers to it.
