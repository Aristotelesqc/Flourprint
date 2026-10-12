# Recipe authoring and generated Planning — 2026-10-12

Reviewed implementation slice for #71 / #35, with the separate motion exploration in #73.
The final integration baseline is `dev` `2be27f5f0fc63890c3a0d0ed2626c1824d61df7b`, including
Preparation outcomes, equipment persistence and recipe trash. This document records presentation
and verification; the existing contracts remain authoritative.

## Result and ownership

Recipe contains composition and the authored method. Its reading view shows plain quantities,
hydration lock state, intended outcome, steps and available conditions. Editing exposes the
existing precision fields and a reusable `RecipeMethod`, with techniques, dependencies,
ordering policy and duration controls. Existing fermentation settings remain the single duration
editor for the steps that they actually manage; their method rows link to that editor. Other
steps use the shared duration field. No second editor silently clears a fermentation Auto choice.

Planning consumes the same process through core's `projectProcess`. It owns start/target time
and projection controls, not recipe authoring. A contextual action opens the corresponding Recipe
step sheet; returning keeps planner inputs and independent scroll. Unknown durations and model
approximations remain distinguishable. A future plan does not start a Preparation. Start uses
the existing saved-revision operation, with existing draft/validation guards.

The global Edit / Read recipe actions select Recipe after the existing leave guard permits the
transition. Once opened, editing fields remain mounted while hidden, preserving pending raw input.
Temporary weighing state, accepted durable drafts and raw-only discard keep their existing scopes.
Internal `formula` / `process` identifiers and persisted documents are unchanged.

Hydration's reading summary exposes lock state and an explicit edit action. That action opens
the existing editor and focuses its named non-input region. It neither creates a formula edit
nor intentionally opens a keyboard. Read-only trashed recipes suppress contextual edit actions
until restored; the upstream restore/trash/start restrictions remain intact.

## Existing outcomes and equipment

`RecipeOutcome` preserves the integrated outcome API, including valid uncooked dough dispositions.
The automatic option derives its value from the process without an explicit outcome override.
Choosing another dough disposition retains existing piece information where applicable. Planning
shows a static summary, not another outcome selector.

`StepEquipmentDetails` presents actual persisted settings in both method and timeline. The compact
summary limits density; details retain setpoint and power level, fan, steam, support/vessel/cover,
preheating, rack and load when explicitly supplied. Missing data is not defaulted. Versioned
built-in and personal references resolve through existing APIs; unresolved, failed and loading
states remain distinct. Canonical mode descriptions follow the equipment contract, without
temperature conversions, timings or assumptions about a home oven. Profiles remain optional.

This is N1 presentation of already integrated data. Full equipment authoring/catalogue interaction
remains required #28 work; no replacement API is invented by this slice.

## Gemini work and independent review

Actual AGY `gemini-3.8-flash-high` sessions generated the implementation from scoped supplied
sources. Codex reviewed and applied the candidates, integrated successive `dev` changes and
ran verification independently. This is supplied-source generation, not a claim of successful
direct headless repository editing. Raw prompts/events and rejected candidates remain private.

The main implementation session was `9e194155-161f-48f7-a87c-c715dd40db3e`.
An independent review (`86ec2807-3558-42fd-8583-00898be39280`) identified fold-style loss during
interval editing, hydration focus targeting and stale targeting callbacks; the accepted fixes
were checked against actual source. Equipment corrections used a fresh bounded session
(`fee72125-0d26-476e-b220-760d16f5ad04`). An earlier equipment correction lost its context and
invented a source path; it was stopped and its output was not applied.

Verification also reproduced an overlapping confirmation/sheet-dismissal failure that left the
root accessibility tree hidden. Gemini's focused correction
(`3ba13676-846d-4aef-aabf-b10506caf7d2`) accepts removal at most once and closes the sheet after
the confirmation alert's actual dismissal. Cancellation leaves the sheet open. The last selected
step remains available through dismissal, then focus returns to its visible action or a safe
method fallback. No timer, manual ARIA reset or disabled focus trap is used.

The last integration correction (`d1187298-83dd-4849-8aa4-067ac8f877d6`) makes contextual
editing optional for trashed recipes. Visual inspection then found French segmented labels
crossing button bounds at larger text despite zero outer horizontal overflow. A new DOM text-range
regression reproduced that defect. Gemini's bounded correction
(`9d985eef-8da4-4af9-b6b9-0b9c5a80d7fc`) permits long labels to wrap inside their own buttons;
the complete visible/accessibility labels are retained without fixed-height clipping.
Its first candidate combined conflicting wrap utilities and still failed. Codex inspected the
computed CSS and text bounds, verified `overflow-wrap: anywhere` in a disposable context, and
removed the competing `break-words` utility before rerunning the suite.

## Verification and limits

Repository checks, production build and the full FR/EN browser suite are required before push.
Tests cover the reading/editing split, raw-input and weighing regressions, repeated same-step
entry, retained planner state, method editing/removal and confirmation cancellation/double action.
Synthetic equipment imports check full settings and unresolved profiles in both locales. The
integrated trash journeys retain their original assertions.

Production captures use disposable reference-fixture contexts, FR/EN, 360/393px phones, warm
light/dark, and an additional 360px layout with 20px root/body text. The private capture set
contains six states for each of six configurations. Measurements check first-edit anchor shift,
content overflow and runtime errors; representative captures are inspected separately. Local
Chrome 154.0.8037.98 substitutes for CI's pinned Playwright browser without changing committed
browser configuration. Final check counts and capture results are recorded on the PR and #71.

Browser focus and overlay evidence does not establish Android IME, hardware/gesture back,
TalkBack or WebView frame pacing. The targeted native cases are hydration shortcut entry with
the keyboard closed/open, opening/dismissing/reopening a method sheet, cancelling/confirming
removal, returning to Planning with pending text and time/scroll retained, and navigating away
with a guarded draft. These remain explicit native evidence gaps; this web-only slice does not
require reinstalling an APK for every text/layout adjustment.

## Remaining interface work

The warm identity and approved logo are preserved. This slice does not replace Ionic/router,
ship AMOLED, select a motion library or claim completion of #35. The three reviewed motion
reports and their bounded effects-first comparison are documented in
[the separate exploration](2026-10-12-motion-exploration.md). Production animation, equal-UX
Ionic versus Material 3 comparison and complete equipment authoring need their own measured
implementation slices. No architecture or persistence decision changes here, so no new ADR
selects a framework on the strength of this work.
