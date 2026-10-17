# Round 2 restoration on the shared UI library

Refs #120, #133 and #134. This is the 0.3 review delivery following the owner's
2026-10-17 decision: round 2 (`22db386`) supplies the visual baseline; round 3
supplies the working state and calls to `@flourprint/core`. Argon remains a
supplemental reference. Historical quantities and predictions are not imported.

## Delivered surface and evidence

[Hosted review gallery](https://aristotelesqc.github.io/Flourprint/review-2026-10-17-0.3-restored/)
contains the interactive A/B proposals, screenshots, component catalogue and motion evidence.
Its `manifest.json`, `review-build.json` and `publication.json` identify the exact source
revision, source digest, viewport, locale, fixture and image hashes. The gallery is a review
artifact; this PR does not migrate `apps/mobile`, replace Ionic, or ship a new dev APK.
Owner visual acceptance is pending. Nothing is merged or closed by this delivery.

- The same 26 historical states have round 2 / round 3 / restored comparisons: FR, Dark,
  393 px, and the requested 360 px / 130% cases. Historical images are copied with their
  hashes checked; their failures and fixture differences are retained.
- There are 69 new phone renders, including Light and AMOLED, active fermentation and
  cooking, actual fermentation-model outcomes, history, registry and settings.
- The generated catalogue has 20 real v1 ids and 40 companion screenshots, at
  393 px / 100% and 360 px / 130%, with Light, Dark and AMOLED examples.
- Motion evidence covers 13 interactions in standard, system-reduced and manually reduced
  modes: 39 cases and 91 actual before/during/after frames. Standard intermediate frames
  pause the browser's real animations at half duration; reduced cases have no invented
  intermediate state.

Use the individual original PNG links for static review and the interactive links for
buttons, input, focus, transitions and save behavior. Screenshots alone do not pass those
interactions. Historical Planning was unreachable in round 2, and Preparation fixtures
differ; neither is silently repaired to manufacture equivalence.

## Component workflow

`packages/ui` now supplies the first presentation versions under ADR 0020:

| Role                              | Stable ids                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Basic interaction                 | `fp.icon`, `fp.button`, `fp.icon-button`, `fp.number-field`, `fp.weighing-checkbox`, `fp.tabs`            |
| Containers and feedback           | `fp.surface`, `fp.badge`, `fp.group-card`, `fp.warning-banner`, `fp.bottom-sheet`, `fp.floating-menu`     |
| Recipe and process                | `fp.hero-summary`, `fp.ingredient-row`, `fp.step-node`, `fp.recipe-card`, `fp.metric-pill`, `fp.timeline` |
| Active preparation and navigation | `fp.prep-hero`, `fp.bottom-bar`                                                                           |

The prototype's typed facades call ids. `ui.manifest.ts` alone selects versions. Each version
owns its markup, examples, motion and scoped CSS; selectors and keyframes identify both the
id and version. Shared CSS contains structural roles and aliases. Components consume
display-ready props and callbacks, with no core/platform imports or baking calculations.

Nested presentation uses the selected renderer through `library.Slot`: a card does not
import a particular metric-pill or button version. The catalogue supplies the same renderer,
so a one-line nested-version change works in screens and catalogue examples. Tests cover
this distinction, registry consistency, typed props, style boundaries and release pruning.
No new external dependency is introduced.

The studio's component inspector reports the actual id/version under a clicked element
and links its catalogue entry. Inspection is explicit and pauses product actions until
disabled. Review tools and fixture selection stay outside the phone.

The intended iteration is **identify the id → edit/add its version → verify its catalogue
states → verify consuming screens → switch the manifest**. Frozen versions selected on
`main` follow ADR 0020's versioning rules. There is only v1 today: the side-by-side catalogue
does not pretend historical static mockups are reusable library versions.

## Restored behavior and presentation

- Cards, semantic badges, pictogram pills, summary hierarchy, grouped steps, anchored menus
  and the dominant remaining-time Preparation card follow round 2. SVG pictograms replace
  mixed emoji; the full option-B title wraps at 360 px / 130%.
- Build labels use the real source-derived bakery code name and channel (ADR 0016). Local
  evidence says `local`, not a fabricated CI build. Reviewer explanations remain outside
  product screens.
- Consultation and editing remain distinct. Hydration is rounded for display, details are
  accessible, and the lock exists only in editing. Unchanged precision is not rounded back
  into state. Size, ratios, percentage edits, anchors and allocation still call the core.
- The reference fixture retains actual core totals (314 g total water, 699 g dough), with
  component allocations distinguished from the final mix. Unknown contributions stay unknown.
  No domain or prototype-model calculation is changed in this restoration.
- Process views use the core projection, including actual parallel lanes. Model failure,
  insufficient-data and out-of-domain states do not become zero-duration estimates.
  Extrapolated results remain labelled. The diagnostics fixture picker is a studio tool.
- Editing, save, undo/redo/reset/discard, naming a revision, history, search, creation and
  trash remain functional in disposable in-memory state. Trash marks the recipe; it does not
  delete it. These behaviors do not establish production persistence conformance.
- Preparation retains start/end, progress, remaining time, instructions, conditions, visible
  +15 min / Duration / Note / readiness controls, upcoming steps, completed steps and journal.
  The primary completion action and photo access occupy reserved footer space. A browser
  hit-test at 360 px / 130% checks that the footer cannot cover the readiness control.
- Native dialogs release focus and modality immediately when dismissed. An inert,
  aria-hidden visual copy finishes the exit animation; the next input is not swallowed by
  an invisible closing overlay. Escape, outside dismissal and focus restoration are exercised.
- Motion restores 150 / 220 / 260 ms effect / spatial / sheet durations and the round 2 M3
  curves: press feedback, menu, weighing row/check, chevron, grid accordion, sheet/backdrop.
  Tab/screen and completed-step feedback are included. Both reduced-motion controls set all
  durations to zero. Values and progress are not rolled or animated into false evidence.

## Verification and limits

The delivery is verified in Chrome on Windows, using disposable browser contexts and a
private preview port. Repository checks cover formatting, lint, TypeScript, token generation,
1,029 unit tests and 11 backlog tests. Build, mobile build and catalogue build are checked.
The prototype suite covers 29 tests, including actual input and control activation, A/B
journeys, ratio edits and mass conservation, anchor resizing, history, trash, dialog focus,
all three themes, larger text, style coverage and the component inspector. The full existing
production-app browser suite passes 115 tests; its app/core source trees are unchanged.
Exact final run results and commit are recorded in the PR and issue comment.

Gemini contributed through two bounded AGY supplied-source implementation turns. Codex
reviewed and integrated the output, inspected rendered screens, operated controls and fixed
runtime defects. One bounded attempt to have AGY operate the browser established that this
CLI session has no interactive browser capability. It is **unsupported**, not a passed
Gemini runtime review. No permission changes or repeated reviewer cohort were used. The
capability finding is recorded in the AGY permissions/browser reference.

This is not native keyboard/back-button, Android, Electron, storage-migration, reminder,
predictive-model or real-bake validation. Production adoption remains a reviewed consumer
change using these exact library modules, rather than a second handwritten reconstruction.
A/B navigation and target-size preferences remain owner decisions; this report does not
choose them by a test result.
