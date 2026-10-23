[Interactive gallery — Navigation A](https://aristotelesqc.github.io/Flourprint/review-2026-10-23-finalisation/) · [Recipe](https://aristotelesqc.github.io/Flourprint/review-2026-10-23-finalisation/mockup.html?screen=recipe&recipe=shokupan&nav=A&lang=fr&theme=dark&width=393&scale=100&stepDesign=compact&dragActivation=hold) · [Edit / drag](https://aristotelesqc.github.io/Flourprint/review-2026-10-23-finalisation/mockup.html?screen=recipe&recipe=shokupan&mode=edit&section=steps&nav=A&lang=fr&theme=dark&width=360&scale=130&stepDesign=compact&dragActivation=hold) · [Preparation](https://aristotelesqc.github.io/Flourprint/review-2026-10-23-finalisation/mockup.html?screen=preparation&recipe=shokupan&nav=A&lang=fr&theme=amoled&width=360&scale=130) · [Actual PNGs](https://aristotelesqc.github.io/Flourprint/review-2026-10-23-finalisation/#companion-screenshots) · [Motion clips](https://aristotelesqc.github.io/Flourprint/review-2026-10-23-finalisation/#motion-evidence)

## Delivered for review, not merged

Source **[0dac703](https://github.com/Aristotelesqc/Flourprint/commit/0dac7038fb5bea2892fa09f822c0932b861de9db)**, normal merges of `dev` through #165. Release **0.3**. Scope: **the #133 mockup and shared `packages/ui`**, its tests, component guides, `DESIGN.md`, and the requested AGY operational note. **No authored `apps/mobile` or `packages/core` changes.** No issue closure or merge. The old gallery remains historical; the links above use this revision. Compact and the 350 ms hold are selected by L112; Rail/Outline and the old movement threshold are historical compatibility options, not renewed owner choices. Cross-group/downward-chain/reorder-mode questions remain open.

This integrates the unpublished finalisation work and completes targeted corrections found during actual use. It does **not** certify every requirement, production persistence or final visual approval.

## What changed

- Recipe is one document with its ingredients, stage weighing and steps. There are three top tabs: Recipe, Planning, History. The summary leads with dough yield/pieces, hydration, fat and sugar, with individual information buttons. Narrow containers stack metrics to keep large text and complete help targets separate. That is a deliberate readability tradeoff; it is taller than the two-column summary.
- Component ratios and hydration call the current engine APIs. Stage gram edits call `SetStageIngredientGrams`; the 43 g component milk + 120 g final milk fixture gives 163 g total and remains undoable/saveable. The ingredient information sheet again edits known/estimated/unknown water content. The incomplete-profile notice now names only genuinely missing properties: estimated milk-powder water is not described as missing.
- Preparation uses actual engine commands/events in disposable prototype state: Next, Previous/retraction or refusal/correction/repetition, ±15 min, native countdown hold/release, separate parallel preheat actions, explicit final Finish and required outcome selection. No eager successor `StartStep` is added on Next. Duration and Note remain visible below the five main controls. The visible journal hides retracted pairs, keeps notes/photos and presents readable event labels; the complete technical journal remains available. The seeded start is shown once at its recorded time.
- Add Step opens an editor before mutation; Cancel adds nothing and Apply is one draft operation. The copied component phase stays with its native subject. Relative step/group windows replace unchosen fixture dates. The carousel follows pointer movement and has intermediate rendered frames after release; the indicator moves with it. Its commit, interruption and reduced-motion cases are tested.
- Final verification also repaired the real Linux title/metadata collisions, restored visible tonal feedback on step changes, and wired the carousel to live system reduced motion as well as its manual setting. The normal step-change feedback and both reduced paths have rendered regressions; a conditional-hook draft was rejected before application.
- Shared summary, fields, bottom bar, tabs, sheets, drag adapter and preparation hero contain the changes, with guides regenerated through `pnpm ui:index`. Library SVGs reuse Ionicons, with its MIT license retained; no new icon dependency or pictogram set was selected.

## Requirement grid

PASS below means the stated **mockup/browser** behavior was checked at this source. PARTIAL is not checked off as complete. First words are taken from the real `docs/ux/requirements.md` IDs.

| Requirement + first words | Status | Evidence / limit |
|---|---|---|
| L3 — “One locale per screen” | PARTIAL | FR/EN screen and numeric journeys pass; Temperature is localized. Some existing short overlay punctuation still needs a complete locale pass. |
| L7 — “The intended outcome is authored” | PASS | Planned outcome stays separate from actual finish; early finish follows L113 instead of preselecting cooked. |
| L15 — “Unknown is never shown as 0” | PASS | Unknown duplicate duration and downstream timing stay unknown. A legitimate relative `+0 min` in an unaffected group is retained. |
| L16 — “A partial known sum” | PASS | Real unknown-composition edits produce ≥ in summary, library and hydration details; known/estimated profiles are not silently zero-filled. |
| L18 — “Numbers reconcile across every screen” | PARTIAL | Native formula/stage results reconcile. Remaining legacy card-time/display arithmetic is listed below. |
| L19 — “Rounding and precision” | PASS | Summary whole percent, staged percentage presentation, exact untouched values and locale raw-input/Save cases retained. |
| L22 — “Keep the warm orange/brown identity” | PASS | Actual Light, Warm Dark and AMOLED captures; System/browser preferences tested separately. |
| L25 — “Required coverage” | PARTIAL | Both sizes/scales, both locales and all three explicit themes captured. Target/label collisions are tested; broad visual/density approval remains the owner's. |
| L27 — “Accessibility” | PARTIAL | Browser focus, Escape, keyboard moves, announcements and legend `aria-pressed` checked. Physical Android Back and screen-reader use not certified. |
| L28 — “Motion is required” | PASS | Browser slow drag/flick, live step drag, reduced motion and motion evidence. Native-device feel remains unverified. |
| L62 — “Raw-input safety” | PASS | Invalid/partial input, last-focused Save, Undo/Redo, Cancel and draft continuity tests pass. |
| L63 — “Hydration lock” | PASS | A typed target locks; locked entry is disabled with an explanation; unlock restores entry. No absorber means no Lock affordance. |
| L69 — “A just-in-time preheat” | PASS | Parallel, unnumbered preheat keeps its own heating/ready facts and is not completed by sequential Next. |
| L72 — “Move and duplicate belong at the step” | PASS | Operated Duplicate on Tangzhong cooling: the third row stays in the Tangzhong group; Undo restores its original two rows. Native subjects from #159 replace prefix grouping. |
| L82 — “Several preparations” | PARTIAL | Same/different recipe preparations keep independent state and are individually selectable. Prototype reload persistence is not implied. |
| L90 — “Round 2” | PARTIAL | Historical reference images retained with their original fixtures. Current design uses real engine results; it is not labelled pixel-identical or owner-approved. |
| L96 — “Steps can be reordered” | PASS | Actual touch lift, both axes, neighbour reflow, full travelling gap, autoscroll and refused/outside/cancelled return. |
| L101 — “Navigation is A” | PASS | Primary links and three top tabs use A. B is not presented as a current choice. |
| L102 — “New components start” | PASS | Native defaults and allocated-liquid inverse work in both directions; rejected defaults never save. The old engine dependency is merged. |
| L103 — “Saving and versions” | PARTIAL | Save creates recovery states; no-op Save adds nothing. Promote/Restore and stale draft conflict remain separate tested actions. Durable persistence is outside this mockup. |
| L104 — “An actual drag” | PASS | Actual drag enters/resumes one shared draft; cancelled/rejected moves are clean; accepted move is one Undo entry and still needs Save. |
| L106 — “Tab carousel motion” | PASS | Real finger-follow geometry and intermediate post-release frames, slow drag and quick flick. Six focused repetitions each passed. |
| L108 — “The recipe is one document” | PARTIAL | Ingredients and steps are one Recipe pane; Planning has no authoring controls. Planning still repeats the grouped step list and needs further time-focused simplification. |
| L109 — “The Recipe page is organised” | PASS | Yield-first summary, Flour(s), contextual ingredient/pre-dough additions, no assembled-total/composition accordions. |
| L110 — “Per-stage weighing stays” | PASS | Stage rows and per-group/overall check counts remain in Recipe. |
| L111 — “Weighing checks” | PARTIAL | Nominal Recipe/Planning sharing and transfer on Start are tested. A legacy review setting still offers clear-on-recipe-change; it must be removed or aligned with the settled lifetime. State remains disposable. |
| L112 — “Drag activation is a 350 ms hold” | PASS | Selected Compact/hold links, actual touch activation and gallery copy. |
| L113 — “Early-finish outcome” | PASS | No completed cooking → no preselected outcome; explicit choice required, invalid values and Escape/Cancel preserve the active session. |
| L115 — “Blocker: at 360 px / 130 %” | PASS | Every bottom action is fully inside the viewport and hittable in read/edit FR/EN. Additional header target regression fixes the 393 px Resume clipping found visually. |
| L116 — “Step drop” | PASS | Native drop-slot, chain preview, refusal reason and gap regressions pass without changing acceptance tolerances. |
| L117 — “A tab-carousel commit animates” | PASS | Intermediate rendered-frame assertions retained; native CDP input timestamps express the intended gesture independently of host transport delays. |
| L118 — “Numbers agree everywhere” | PARTIAL | One displayed baker percentage per editable final row and core stage/ratio values; remaining display/card-time arithmetic is open. |
| L119 — “Steps show relative times” | PASS | Unanchored recipe and change previews use native relative windows. |
| L120 — “Library: search matches” | PASS | Traits, pre-dough names, readiness filters, actual last operation and rounded duration checked. |
| L121 — “An engine refusal shows” | PASS | Native reason formatter used, including unknown composition and component allocation refusals. |
| L122 — “Edit-mode stage rows edit” | PASS | FR/EN 43 + 120 = 163 g fixture, formula weight, Undo/Redo, Save/reopen checked. |
| L123 — “Shared-component consistency” | PARTIAL | Shared fields, tabs, summary and action geometry repaired; remaining broad CSS cleanup/owner visual review not declared finished. |
| L124 — “Preparation” | PASS | End label names the step; Previous provides undo under native rules; sequential count excludes explained parallel preheat. |
| L125 — “Argon's round 2 Recipe mockup” | PASS | Three tabs, pieces presentation, actual missing-profile wording, ≥ retained; wider L108 simplification remains partial as above. |
| L126 — “Summary figures stay as plain numbers” | PASS | Small information triggers; source bar and operable legend in hydration sheet, unknown hatching/lower bound, accessible toggle state. |
| L127 — “The active step of a Preparation” | PASS | Largest HH:MM:SS countdown, adjustment, two labelled control groups, native Next/Previous/Adjust/Hold/Release, explicit Finish. No durable prototype storage or notification delivery claim. |
| L29 — “Short contextual menus” | PASS | Row/recipe menus are anchored; compact confirmations and Escape/focus journeys pass. |
| L30 — “Deleting a recipe uses the trash flow” | PASS | Named trash confirmation and restore flow operated in the mockup; durable app storage remains separate. |
| L41 — “A card consistently answers” | PARTIAL | Identity, native quantity/duration and current preparation are visible. Reference-version/rating hierarchy is not fully certified. |
| L42 — “Round 2 card hierarchy” | PARTIAL | Current matched view is supplied; badge/title/density acceptance remains open, not inferred from green journeys. |
| L44 — “Never use a blanket” | PASS | Blanket Never baked is gone; preparation/outcome-specific labels and active state use the native session model. |
| L60 — “The edit toolbar” | PASS | Visible Cancel, Undo/Redo/Save and reachable overflow survive both locales and both text scales. |
| L65 — “Undo, redo and reset” | PASS | Changes undo as one draft operation; Reset names its baseline and asks once before applying. |
| L78 — “The active step shows” | PASS | Large remaining time and visible Note/Duration/readiness controls; phase times and journal stay reachable. |
| L86 — “Theme choice offers” | PARTIAL | Light, Warm Dark, AMOLED and System preview paths are available; production device-preference persistence/flash behavior is not certified by the mockup. |
| L87 — “Temperature units are” | PARTIAL | Per-context selectors and native conversion are retained; durable device settings remain outside this prototype. |
| L97 — “The step list is dense” | PARTIAL | Unchanged Division<=96px normal-size gate passes; narrow complete-word/target separation adds an action row. Large-text density remains an explicit visual tradeoff for owner review. |
| L98 — “A bottom sheet is not a menu” | PASS | Short actions use anchored menus and compact named confirmations, not bottom action sheets. |
| L99 — “A step is not moved through a checklist of dependencies” | PASS | Drag and move preview remain separate from dependency editing; a refused move does not launch the full checkbox list. |
| L100 — “No `⋯` menu button floating” | PASS | One cluster stays at the row edge with real48px controls; it is not a mid-row disclosure. |
| L107 — “Summary and status icons come first” | PARTIAL | Existing Ionicons-derived SVGs and license are retained; custom pictogram/style approval is not implied. |

## Verification and evidence

- `pnpm install --frozen-lockfile` succeeded without a lock change; `pnpm check`: **1,303 tests + 11 backlog tests**, format/lint/types/tokens/boundaries green. `pnpm build`, `pnpm build:mobile` and the exact-head mockup build passed.
- Full production app Playwright: **115 passed**, private port4291. Full mockup Playwright: **212 passed**, private port4287. Slow/fast rendered-frame gestures: **12 additional repeated cases passed**. No skipped tests or relaxed geometry/density assertions.
- Earlier failures are retained locally: 33 initial failures reduced through source fixes and test migrations. Changed expectations follow real contracts, not appearance: relative offsets replace invented dates; native unknown composition is explicitly set through UI because #157 made the default water profile available; a legitimate unaffected `+0 min` is not an unknown-duration zero-fill; the flat Timeline list is used to assert topological order across separate parallel lanes. The input-timestamp repair adds actual received cadence assertions while retaining the same final-tab and intermediate-frame checks.
- Independent caller operation included hydration entry → automatic lock → Save, details/legend, Planning, Pause/Resume, Next and Previous/retraction, and component Duplicate/Undo. Actual captures were inspected for hierarchy, wrapping, targets and contrast. This is **Codex browser use**, not a Gemini browser audit or physical-device pass.
- The first Linux run at `92bafa1` failed on a 393 px edit title. The follow-up at eee0fd9 fixed that case but exposed a 360 px / 130 % temperature-metadata collision. Both actual CI traces were inspected. The first broader breakpoint proposal was rejected because Division grew to 114 px against the unchanged 96 px limit. The final narrow layout gives complete words full metadata width; no geometry/density/target assertion was weakened.
- **Linux CI:** [successful exact-head run](https://github.com/Aristotelesqc/Flourprint/actions/runs/39984027364), for exact head `0dac703`, green **before publication**.
- Component/version catalogue: **74 actual captures** at both sizes, with three theme specimens per article. Motion inventory: **39 operated cases / 91 actual before/during/after PNGs**, covering normal, OS-reduced and manual-reduced settings. Video capture uses the real input clock; the screenshot matrix uses its labelled fixed fixture clock.
- Artifact source hash **`cfc94de94091642badcf66adaec67cd471307d0de7df37b0b9b1d488ee7ed675`**. **250 actual PNGs**, including all surviving Navigation A reference states and both locales/themes/scales, plus **4 fresh motion clips**. Historical images keep their source/fixture labels; their different numbers are not presented as controlled same-fixture design comparisons. Manifest hashes cover the published files.

## AGY provenance

Gemini wrote the substantive interface, CSS and runtime work. The ledger includes **39 retained earlier finalisation invocations and 29 invocations in this resumed tranche**. Summed wall times overlap for parallel runs and do not measure account quota. Failure/empty turns are included; an active process or a successful envelope is not counted as accepted code.

The owner-entered authorization was verified by a separate **28 s native canary write/read**. Four larger native-edit assignments then timed out without edits; supplied-source patches produced useful corrections. Small mechanical patches used Flash3.8 Medium after the earlier High attempts, as disclosed during execution. No global Gemini settings or technical permission checks were weakened. The repository skill records the measured distinction; the marker and raw logs are not published.

“Generated patch” means Gemini returned source and Codex applied it after review; it is **not** a native file-write claim. Historical native-written paths are provenance, not a promise that temporary generator files remain in the commit. The Icon generation helper was inspected; the retained SVGs/license are in the library. Gemini did not complete an independent running-browser acceptance pass in this tranche.

| AGY run / bounded brief | Model | Wall time | Gemini native-written or generated paths | Disposition |
|---|---|---:|---|---|
| Earlier finalisation: 01-shell/authorized-run | 3.8-flash-high | 347.5 s | `packages/ui/src/components/bottom-bar/guide.ts`<br>`packages/ui/src/components/bottom-bar/v1.css`<br>`packages/ui/src/components/bottom-sheet/guide.ts`<br>`packages/ui/src/components/bottom-sheet/v1.css`<br>`packages/ui/src/components/ingredient-row/guide.ts`<br>`packages/ui/src/components/ingredient-row/v1.css`<br>`packages/ui/src/components/number-field/guide.ts`<br>`packages/ui/src/components/number-field/v1.css`<br>`packages/ui/src/components/tabs/guide.ts`<br>`packages/ui/src/components/tabs/v1.css`<br>`packages/ui/src/components/tabs/v1.tsx` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 01-shell/bar-run | 3.8-flash-high | 92.2 s | None | No accepted source edit (success) |
| Earlier finalisation: 01-shell/execute-run | 3.8-flash-high | 19.6 s | None | No accepted source edit (success) |
| Earlier finalisation: 01-shell/feedback-run | 3.8-flash-high | 62.7 s | `packages/ui/src/components/bottom-bar/guide.ts`<br>`packages/ui/src/components/bottom-bar/v1.css` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 01-shell/run | 3.8-flash-high | 142.8 s | None | No accepted source edit (success) |
| Earlier finalisation: 02-drag/authorized-run | 3.8-flash-high | 602.8 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 02-drag/edge-run | 3.8-flash-high | 85.3 s | `docs/mockups/0.3-ux/src/StepDrag.tsx`<br>`packages/ui/src/components/sortable-list/v1.tsx` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 02-drag/gutter-run | 3.8-flash-high | 165.1 s | `packages/ui/src/components/sortable-list/guide.ts`<br>`packages/ui/src/components/sortable-list/v1.tsx` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 02-drag/run | 3.8-flash-high | 105.5 s | None | No accepted source edit (success) |
| Earlier finalisation: 02-drag-focused/argon-run | 4-argon-medium | 182.7 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 02-drag-focused/native-run | 4-argon-medium | 302.9 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 02-drag-focused/run | 3.8-flash-high | 182.7 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 03-carousel/authorized-run | 3.8-flash-high | 438.5 s | `packages/ui/src/components/section-carousel/guide.ts`<br>`packages/ui/src/components/section-carousel/v1.tsx`<br>`packages/ui/src/motions/tab-carousel/guide.ts`<br>`packages/ui/src/motions/tab-carousel/index.ts` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 03-carousel/run | 3.8-flash-high | 147.3 s | None | No accepted source edit (success) |
| Earlier finalisation: 03-carousel/settle-recovery-run | 3.8-flash-medium | 61.9 s | None | No accepted source edit (agent_failed) |
| Earlier finalisation: 03-carousel/settle-run | 3.8-flash-high | 242.7 s | `packages/ui/src/components/section-carousel/v1.tsx`<br>`packages/ui/src/motions/tab-carousel/index.ts` | Native edits retained, then integrated and checked (agent_failed) |
| Earlier finalisation: 04-process/add-run | 3.8-flash-medium | 182.8 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 04-process/compiler-run | 3.8-flash-high | 144.2 s | `docs/mockups/0.3-ux/src/ProcessChangePreview.tsx`<br>`docs/mockups/0.3-ux/src/ProcessView.tsx`<br>`docs/mockups/0.3-ux/src/steps-copy.ts` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 04-process/finish-run | 3.8-flash-high | 210.1 s | `docs/mockups/0.3-ux/src/ProcessChangePreview.tsx`<br>`docs/mockups/0.3-ux/src/ProcessView.tsx` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 04-process/temporal-run | 3.8-flash-high | 302.9 s | `docs/mockups/0.3-ux/src/ProcessChangePreview.tsx`<br>`docs/mockups/0.3-ux/src/ProcessView.tsx`<br>`docs/mockups/0.3-ux/src/steps-copy.ts` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 04-recipe/compiler-run | 3.8-flash-medium | 64.4 s | `docs/mockups/0.3-ux/src/RecipeView.tsx` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 04-recipe/finish-run | 3.8-flash-high | 422.8 s | `docs/mockups/0.3-ux/src/RecipeView.tsx`<br>`docs/mockups/0.3-ux/src/recipe-copy.ts`<br>`packages/ui/src/components/hero-summary/guide.ts`<br>`packages/ui/src/components/hero-summary/v1.tsx` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 04-recipe/ia-run | 3.8-flash-high | 422.9 s | `docs/mockups/0.3-ux/src/RecipeView.tsx`<br>`docs/mockups/0.3-ux/src/recipe-copy.ts`<br>`packages/ui/src/components/hero-summary/v1.css`<br>`packages/ui/src/components/hero-summary/v1.tsx`<br>`packages/ui/src/props.ts` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 04-recipe/navigation-run | 3.8-flash-high | 139.9 s | `docs/mockups/0.3-ux/src/App.tsx`<br>`docs/mockups/0.3-ux/src/messages.ts` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 04-recipe/run | 3.8-flash-high | 602.9 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 04-recipe/small-run | 3.8-flash-medium | 243.1 s | `docs/mockups/0.3-ux/src/RecipeView.tsx`<br>`packages/ui/src/components/hero-summary/v1.tsx` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 04-recipe/stage-run | 3.8-flash-high | 243.3 s | `docs/mockups/0.3-ux/src/RecipeView.tsx`<br>`docs/mockups/0.3-ux/src/defaults-copy.ts`<br>`docs/mockups/0.3-ux/src/recipe-copy.ts` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 05-preparation/errors-run | 3.8-flash-medium | 183.2 s | `docs/mockups/0.3-ux/src/PreparationView.tsx` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 05-preparation/hold-run | 3.8-flash-high | 362.8 s | `docs/mockups/0.3-ux/src/model.ts`<br>`docs/mockups/0.3-ux/src/preparation-copy.ts`<br>`docs/mockups/0.3-ux/src/preparation-runtime.ts`<br>`packages/ui/src/components/prep-hero/guide.ts` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 05-preparation/pause-run | 3.8-flash-high | 242.8 s | `docs/mockups/0.3-ux/src/PreparationView.tsx`<br>`docs/mockups/0.3-ux/src/preparation-copy.ts` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 05-preparation/run | 3.8-flash-high | 603.1 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 05-preparation/runtime-run | 3.8-flash-high | 303.1 s | `docs/mockups/0.3-ux/src/model.ts` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 05-preparation/shared-run | 3.8-flash-medium | 242.7 s | `docs/mockups/0.3-ux/src/PreparationView.tsx`<br>`docs/mockups/0.3-ux/src/preparation-copy.ts`<br>`packages/ui/src/components/prep-hero/guide.ts`<br>`packages/ui/src/components/prep-hero/v1.tsx`<br>`packages/ui/src/props.ts` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 05-preparation/view-run | 3.8-flash-high | 280.8 s | `docs/mockups/0.3-ux/src/PreparationView.tsx`<br>`docs/mockups/0.3-ux/src/model.ts`<br>`docs/mockups/0.3-ux/src/preparation-runtime.ts` | Native edits retained, then integrated and checked (success) |
| Earlier finalisation: 06-summary-icons/execute-run | 3.8-flash-high | 48.6 s | None | No accepted source edit (success) |
| Earlier finalisation: 06-summary-icons/icons-run | 3.8-flash-high | 89.0 s | None | No accepted source edit (success) |
| Earlier finalisation: 06-summary-icons/native-run | 3.8-flash-high | 242.8 s | None | No accepted source edit (empty_response) |
| Earlier finalisation: 06-summary-icons/write-run | 3.8-flash-medium | 182.9 s | `packages/ui/src/components/icon/make-v1.mjs` | Native edits retained, then integrated and checked (empty_response) |
| Earlier finalisation: 07-library/app-run | 3.8-flash-high | 242.8 s | `docs/mockups/0.3-ux/src/App.tsx` | Native edits retained, then integrated and checked (empty_response) |
| carousel-system-motion/hook-run | 3.8-flash-medium | 16.1 s | `packages/ui/src/components/section-carousel/v1.tsx` | Gemini-generated patch, reviewed/applied by Codex (success) |
| carousel-system-motion/run | 3.8-flash-medium | 23.6 s | `packages/ui/src/components/section-carousel/v1.tsx` | Returned patch rejected before application: conditional React hook; corrected in hook-run (success) |
| gallery-copy/run | 3.8-flash-medium | 56.7 s | `docs/mockups/0.3-ux/index.html` | Gemini-generated patch, reviewed/applied by Codex (success) |
| header-fit/run | 3.8-flash-medium | 22.1 s | `docs/mockups/0.3-ux/src/layout.css` | Gemini-generated patch, reviewed/applied by Codex (success) |
| linux-title-fit/density-run | 3.8-flash-medium | 37.8 s | `packages/ui/src/components/step-node/v1.css` | Gemini-generated patch, reviewed/applied by Codex (success) |
| linux-title-fit/legacy-gap-run | 3.8-flash-medium | 19.6 s | `packages/ui/src/components/step-node/v1.css` | Gemini-generated patch, reviewed/applied by Codex (success) |
| linux-title-fit/narrow-recovery-run | 3.8-flash-medium | 108.6 s | `packages/ui/src/components/step-node/v1.css` | Generated patch applied with one no-actions selector binding correction by Codex (success) |
| linux-title-fit/narrow-run | 3.8-flash-medium | 123.2 s | None | No usable final patch; retained failure/empty result (empty_response) |
| linux-title-fit/run | 3.8-flash-medium | 116.8 s | `packages/ui/src/components/step-node/v1.css` | Returned patch rejected: row grew to 114 px against unchanged 96 px density gate; superseded (success) |
| preparation-controls/patch-recovery | 3.8-flash-high | 46.5 s | `docs/mockups/0.3-ux/src/PreparationView.tsx` | Gemini-generated patch, reviewed/applied by Codex (success) |
| preparation-controls/run | 3.8-flash-high | 242.7 s | None | No usable final patch; retained failure/empty result (empty_response) |
| preparation-controls/secondary-run | 3.8-flash-high | 71.4 s | `docs/mockups/0.3-ux/src/PreparationView.tsx` | Gemini-generated patch, reviewed/applied by Codex (success) |
| preparation-step-motion/recovery-run | 3.8-flash-medium | 65.4 s | `packages/ui/src/components/prep-hero/guide.ts`<br>`packages/ui/src/components/prep-hero/v1.tsx` | Generated patch applied with small DOM-property and TypeScript narrowing fixes by Codex (success) |
| preparation-step-motion/run | 3.8-flash-medium | 154.2 s | None | No usable final patch; retained failure/empty result (empty_response) |
| profile-notice/followup-run | 3.8-flash-medium | 45.3 s | `docs/mockups/0.3-ux/src/RecipeView.tsx`<br>`docs/mockups/0.3-ux/src/recipe-copy.ts` | Gemini-generated patch, reviewed/applied by Codex (success) |
| profile-notice/run | 3.8-flash-medium | 123.5 s | None | No usable final patch; retained failure/empty result (empty_response) |
| recipe-controls/patch-recovery | 3.8-flash-high | 182.8 s | None | No usable final patch; retained failure/empty result (empty_response) |
| recipe-controls/run | 3.8-flash-high | 242.7 s | None | No usable final patch; retained failure/empty result (empty_response) |
| recipe-controls/source-only | 3.8-flash-high | 183.0 s | None | No usable final patch; retained failure/empty result (empty_response) |
| recipe-controls/water-editor-correction | 3.8-flash-medium | 53.5 s | `docs/mockups/0.3-ux/src/RecipeView.tsx` | Returned output; no accepted source edit (success) |
| recipe-controls/water-editor-run | 3.8-flash-medium | 89.7 s | `docs/mockups/0.3-ux/src/RecipeView.tsx` | Returned patch rejected; corrected in following run (success) |
| review-surface/patch-recovery | 3.8-flash-high | 117.9 s | `docs/mockups/0.3-ux/index.html`<br>`docs/mockups/0.3-ux/src/App.tsx`<br>`docs/mockups/0.3-ux/src/app-copy.ts` | Gemini-generated patch, reviewed/applied by Codex (success) |
| review-surface/run | 3.8-flash-high | 242.8 s | None | No usable final patch; retained failure/empty result (empty_response) |
| step-add/patch-recovery | 3.8-flash-high | 67.7 s | `docs/mockups/0.3-ux/src/ProcessView.tsx` | Gemini-generated patch, reviewed/applied by Codex (success) |
| step-add/run | 3.8-flash-high | 243.0 s | None | No usable final patch; retained failure/empty result (empty_response) |
| summary-fit/focused-run | 3.8-flash-medium | 100.8 s | `packages/ui/src/components/hero-summary/v1.css`<br>`packages/ui/src/components/hero-summary/v1.tsx` | Gemini-generated patch, reviewed/applied by Codex (success) |
| summary-fit/remove-gap-run | 3.8-flash-medium | 15.8 s | `packages/ui/src/components/hero-summary/v1.css` | Gemini-generated patch, reviewed/applied by Codex (success) |
| summary-fit/run | 3.8-flash-medium | 153.5 s | None | No usable final patch; retained failure/empty result (empty_response) |
| unused-markers/run | 3.8-flash-medium | 53.6 s | `docs/mockups/0.3-ux/src/App.tsx`<br>`docs/mockups/0.3-ux/src/PreparationView.tsx`<br>`docs/mockups/0.3-ux/src/RecipeView.tsx` | Gemini-generated patch, reviewed/applied by Codex (success) |


## Codex-authored integration changes

Codex authored briefs, source/diff recovery, the native-runtime and browser tests, fixtures used through the UI, capture/publication tooling, the report/PR body, `DESIGN.md` and guide wording, generated index updates, and the repository skill note. The earlier imported checkpoint also records a test-only Vitest alias matching the Vite alias, missing-import/unsafe-type cleanups, one duplicate closing brace, and two measured bottom-bar spacing values.

Direct UI-source corrections in this resumed tranche were limited to:

- import/use the existing locale `colon()` helper in Preparation and the generated incomplete-profile sentence;
- preserve exact duration seconds by removing the generated rounding before duration editing;
- use the existing `known` message key, and accept the engine's readonly contributor list in the small generated formatter type;
- remove the missing-snippet unused `prep-pause-btn` class token (the data-testid remains);
- retain native button semantics on the actionable summary notice by removing `role="status"`;
- bind the hydration target's existing `disabled` parameter to `isLocked` (one line);
- map the generated tonal highlight's three `background-color` entries to Web Animations' `backgroundColor` property (three value bindings, preserving the selected motion values/timing), and narrow its transition kind before the generic `formOf` call (one TypeScript guard);
- correct the generated no-actions CSS selector to match an absent action node rather than an empty node (one selector);
- timestamp the seed's legacy start entry with the already-resolved engine `startedAt` (one line), avoiding a false second start.

All other substantive UI changes above came from Gemini. Generated-diff hunk counts/context were repaired where necessary, with unique-context checks and `git apply --check`; formatting and regeneration are not separate design authorship.

## Still open / #147

- **Owner visual and physical-phone acceptance**, especially the large-text summary's taller one-column composition, row density and drag/carousel feel. Green tests do not approve the look.
- **L108 Planning** still presents grouped step details; it should become more focused on time/constraints rather than repeating the Recipe list.
- **L111** the legacy clear-on-recipe-change review setting remains to align with the settled weighing-check lifetime.
- **L3** complete overlay punctuation/locale cleanup and broader **L123** contradictory CSS/style ownership cleanup remain open; this report does not label the interface universally polished.
- **Remaining arithmetic:** legacy per-card remaining time, elapsed/countdown display, `priorEnd` presentation, lane percentage coordinates and resolved final-addition display sums. Where native relative windows, subjects, projections, holds or stage inverses exist they are now used; no new baking solver or coefficient was introduced. Native countdown state is not a claim that all legacy card helpers use it.
- The broader O-items (cross-group, downward-chain semantics and reorder-mode choice), native screen-reader/Back behavior, durable storage, reminders and **production mobile adoption** are not settled by this mockup.

#147's **L72 copied-component subject** and **L102 allocated-liquid inverse** blockers now have specific engine/UI evidence and can be checked with0dac703. The obsolete review-tooling activation/variant wording is corrected. Existing checked defects stay checked; broad density, styling, arithmetic and owner-acceptance boxes remain open. No priorities, generated #30 tables, issue closure or merge were changed.

Generated by Codex; implementation delegated to Gemini through the repository AGY skill.

The earlier host approval interruption was an automatic approval-review usage-limit error on the video command. That command did not execute then; normal approved execution later resumed. No approval or security mechanism was bypassed.
