# Flourprint 0.3 interactive review

This is an isolated React/TypeScript prototype for #120, #133 and #134. It is not the mobile app,
not an approved production component registry, and not an implementation of future contracts.
The production UI, domain, persistence and contracts are unchanged.

## Pre-restoration comparison (#134)

The [comparison report](comparison-report.md) records the visual regressions and the owner's
intermediate approval gate. No visual restoration is implied by the evidence tooling.

`pnpm compare:mockups` captures 26 three-version comparisons and four additional editor details.
First build the core and mobile app. Supply `FLOURPRINT_COMPARISON_PAGES` as the path to the
existing `gh-pages` checkout containing the immutable October 15 and October 16 review directories.
The default is the sibling `flourprint-pr-133-pages` checkout. The app source must match the
pinned dev reference; the tool refuses a different mobile/core tree. It never repairs historical
controls, values or layouts. It waits for Ionic overlay presentation before capturing an overlay.

The tool owns localhost ports 4271–4273 and writes only to
`docs/mockups/0.3-ux/comparison/dist/` (ignored). Set `FLOURPRINT_COMPARISON_OUTPUT` to choose another
explicit output directory, and `FLOURPRINT_TEST_BROWSER` only when deliberately using a different
local browser. Its actual version is recorded. Text enlargement is measured, not inferred from a
query parameter. Current-app A/B repetition, unavailable Planning and limited timelines are captioned.

Publish only `index.html`, `report.html`, `report.md`, `manifest.json`, and the image paths in
`manifest.images`, `manifest.supplements` and `manifest.comparisons`, after validating their hashes.
Never copy the output directory wholesale: interrupted attempts may leave failure captures and
`progress.json`. The interactive links point to the preserved historical releases, not a newly
redesigned prototype. Review every comparison and verify the deployed gallery before posting it.

## Build and operate

```text
pnpm build
pnpm build:mobile
pnpm build:mockups
pnpm test:mockups
node scripts/mockup-review.mjs serve
node scripts/capture-mockups.mjs
```

The review server defaults to private localhost port 4263; tests use their own preview server.
Set `FLOURPRINT_MOCKUP_PORT` when a port is already occupied. Captures start their own two servers
and require the preview ports to be free (baseline default 4266). `FLOURPRINT_TEST_BROWSER` is an
optional explicit local browser executable; CI uses Playwright's installed, locked Chromium.
It is never an automatic fallback or a committed machine-specific path.

Screens use `mockup.html?screen=library|recipe|preparation|registry|settings|catalogue`.
Additional parameters: `section=ingredients|steps|planning|history`, `recipe=shokupan`, `mode=edit`,
`nav=A|B`, `theme=light|dark|amoled`, `lang=fr|en`, `width=320|360|393`, `scale=100|130|200`,
`targets=40|48`, `capture=1`, and `prep=cooking` for the seeded cooking preparation.
The studio controls stay outside captured phone views.

All state is disposable and in memory. Saving creates an in-memory recipe revision; reloading
resets the prototype. Seeded preparations are explicitly illustrative, with their past timestamps
positioned using the real process projection. Starting from a recipe creates a fresh independent
snapshot. The photo action records a simulated marker, not a camera image.

## Shared implementation

- `src/ui.tsx`: accessible primitives and native dialog overlays.
- `src/components.tsx`: recipe, ingredient, step, diagnostic and preparation presentation blocks.
- `src/theme.css`, `src/layout.css`: common warm theme, spacing, typography and responsive rules.
- `src/model.ts`: in-memory state, draft history and calls into the existing core.
- `src/RecipeView.tsx`, `src/ProcessView.tsx`, `src/PreparationView.tsx`: composed screens.
- `src/template-presentation.ts`: prototype-only bridge to existing curated production message
  catalogs. The short/full template-label mapping is copied from `use-messages.ts`; the production
  hook and services are not imported. It must be consolidated before production adoption.
- `src/messages.ts`: typed FR/EN prototype messages. Unknown user names are retained as entered.

`screen=catalogue` imports these same components; it is not a separate HTML illustration.
See [components.md](components.md) for the component-to-screen mapping and boundaries.

The existing `resolveFormula`, `applyFormulaEdit`, ratio conversion, `validateProcess`,
`projectProcess` and `estimateFermentation` are used directly. No replacement baking solver or
predictive coefficients are implemented here. Final-addition badges aggregate the domain-resolved
rows through the existing domain `sum`; components are shown as already counted incorporations.
Unknown composition remains explicit. An inverse candidate is distinct from the current dose;
only a successful current-recipe estimate can be applied to its draft. Failure states show no
fabricated duration.

Grouped steps are a visual proposal using component identifiers in the supplied templates.
They do not introduce the future subject model. Move preview preserves the existing dependency
graph and validates the proposed topological order. Duplication is an explicitly demonstrative
use of today's `insertStepAfter`; it does not claim the full future #123 command semantics.

## Screenshot bundle and publication

`capture-mockups.mjs` produces real browser PNGs and a hash manifest in `dist/`, and updates the
tracked `manifest.json`. It imports the actual core Shokupan template into the unchanged app
through its normal import UI for baseline screenshots. No personal browser/profile data is used.
The baseline and proposal use the same formula/process; a fresh-start pair is distinguished from
the proposal's illustrative fermentation-in-progress views.

The generated static gallery links directly to every PNG and to the corresponding interactive
route. Review meaningful open sheets and deeper scroll positions in addition to initial screens.
The source hash includes prototype sources, engine sources, reused catalogs, lockfile and build
configuration; it excludes generated images/manifest to avoid a self-referential hash.

Do not rebuild after capturing without regenerating the screenshots: `build:mockups` replaces
`dist/`. Publish an explicit reviewed allowlist (`index.html`, `mockup.html`, `mark.svg`,
`review-build.json`, `manifest.json`, referenced `assets/*`, `screenshots/*.png`) to a dated
GitHub Pages review subdirectory. Do not publish `dist/test-results` or private AGY transcripts.
Preserve existing reviews on `gh-pages` and record the actual published commit on #134.

## Acceptance boundaries

Navigation A/B, temporary recipe weighing lifetime, 40/48 px targets and richer move presentation
remain owner choices. Settings expose weighing alternatives; preparation weighing is independent.
Unknown material/oven settings are not guessed. Broader registry authoring, durable storage,
notifications, native Back/keyboard/camera and model calibration are not demonstrated by this
mockup. A successful browser journey or screenshot is not native or scientific acceptance.

Gemini supplied the reviewed shared component kit through tool-free source generation after
workspace trust was denied. Codex integrated the core, state, screens, tests and capture workflow.
Neither a successful generation response nor source review is claimed as Gemini operating the UI.
