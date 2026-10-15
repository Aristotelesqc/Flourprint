# Recipe consultation/editing slice — 2026-10-12

Issue #67, part of #35. Base: integrated `dev` `6eaf132`. Actual AGY
`gemini-3.8-flash-high` generated five source files from a scoped supplied corpus, then returned
corrections after Codex review. Codex applied the reviewed source and integrated explicit
corrections; a fresh AGY session reviewed the result and rechecked its findings. Delegates did
not edit the checkout or run tests. Raw prompts/events/reports remain in ignored scratch.

## Result

Saved revisions open in consultation, with non-editable quantities, composition, component
allocations, water explanations and model details. Edit alone creates no draft. New/resumed
drafts open editing. Save or confirmed discard returns to consultation; unresolved input or a
stored draft prevents a clean-mode exit. Commands blur only the focused field through its
normal commit path, without committing all rounded displays. Synchronous draft references
preserve adjacent edits and the existing save/validation guards.

One mounted ProcessSection retains projection mode, dates and target through mode changes.
Consultation hides step-authoring controls; editing keeps them. Full Planning extraction remains
#35. The shared temporary weighing map survives panel/mode switches, and a changed quantity
clears its check even if the quantity later returns. Its scope is documented in DESIGN.md: no
session/history persistence, and page recreation/reload resets it.

No domain, persistence, model, dependency or routing change. Open #63 outcome controls and #64
updater work are separate; this base does not claim them integrated. General raw-input guards
for route replacement/variant navigation remain a #35 migration consideration, not a new
guarantee in this slice.

## Verification by Codex

- `pnpm check`: formatting, lint, types, 636 Vitest tests and 11 backlog tests passed.
- `pnpm build` and mobile production build passed.
- Full Playwright: 48 FR/EN journeys passed with installed Chrome `154.0.8037.98`; committed
  CI still uses its pinned browser. New cases cover consultation/edit defaults, shared weighing,
  valid text with focus retained during a command, invalid-only mode/start guards, planner state,
  persisted draft resumption and a synthetic long build label on the recipe list.
- Sixteen production captures cover consultation, editing, first mutation and Process at
  FR/light/393px, FR/warm-dark/360px, EN/light/393px and FR/360px with a 20px browser text override.
  Consultation, editing and Process captures were inspected.
- No observed horizontal overflow or page errors. First mutation shifts the anchor controls
  0px. Footer is 88px normally and 104.5px under the larger-text override; its footprint remains
  stable within each configuration. Enlarged hydration wraps and primary Save text stays visible.

The browser text override is not Android system-font evidence. Native IME/back/gesture and real
screen-reader behavior were not tested. The programmatic focus-retaining command is a browser
regression case, not an assistive-technology certification. Ionic/router/native handlers are
retained; no APK reinstall was requested for this web slice.

## Review arbitration

Codex corrected duplicate planner instances, unsafe clean-mode exit, raw Celsius presentation,
zero-duration display, clipped larger-text layout, and shared weighing state in the first output.
The independent reviewer identified stale draft mutation, pending-valid command activation,
stale weighing checks and the heading name. These were addressed and meaningful browser cases
added. Its invented `dough`/`water` temperature contexts were withdrawn: the actual contract uses
`ambient`, `cold`, `oven`, with target/water/friction under `ambient`. Its final source review found
no remaining correctness regression; Codex's execution evidence above is separate from that report.

Material 3, selectable AMOLED and replacement of Ionic remain open. This is a reviewed production
interaction slice, not an accepted component-library migration or completion of #35.
