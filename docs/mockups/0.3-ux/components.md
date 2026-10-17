# Shared prototype components

These exports are used by the interactive screens and the live catalogue (`screen=catalogue`).
This directory is an experimental mockup module, not a published production package.

| Component                    | Screen use                                                            | Interactive catalogue check            |
| ---------------------------- | --------------------------------------------------------------------- | -------------------------------------- |
| Button / IconButton          | All screens, quick actions, headers, footers                          | Open/close a real dialog               |
| NumberField                  | Recipe grams/percentages/anchors/ratios; step and duration sheets     | Free input, valid commit and refusal   |
| Checkbox                     | Recipe and independent preparation weighing                           | Two demonstrations share state         |
| Tabs                         | Recipe sections and library filters                                   | Selection and keyboard arrows/Home/End |
| Disclosure / Surface / Badge | Ingredient groups, steps, details, registry                           | Expand/collapse, common tokens         |
| RecipeSummary                | Core-resolved recipe metrics                                          | Same summary and help action           |
| IngredientRow                | Component allocations, final additions, frozen preparation quantities | Row and direct-checkbox toggles        |
| StepRow                      | Authored steps, projection, upcoming/completed preparation steps      | Edit affordance                        |
| RecipeCard                   | Filtered, openable library entries                                    | Open a dialog                          |
| StatusPanel                  | Model diagnostics with explicit unavailable/out-of-domain states      | Same warning block                     |
| PreparationTimer             | Running step countdown, start/end, progress                           | Same timer component                   |
| Modal / Menu                 | Help, edit, create, confirmations and navigation                      | Native dialog containment/dismissal    |

Screens own message lookup and domain-to-view mapping. Presentation components receive strings,
callbacks and view values; they do not solve formulas, fermentation or schedules. Units, partial
composition and percentage bases are named explicitly. `NumberField` keeps raw refused text and
never commits an untouched rounded display as a new value. The common checkbox exposes a real
native input hit area rather than a zero-sized off-screen control.

The catalogue is a development review surface. Its example values are labelled examples, not
independent evidence of domain calculations. Production adoption requires a reviewed extraction
into the app's component layer; this PR leaves Ionic and all production routes unchanged.
