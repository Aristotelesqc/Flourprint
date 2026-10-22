---
name: flourprint-ui-check
description: Verify Flourprint UI changes with production-build browser journeys, visual and interaction evidence, and targeted native checks. Use for UI acceptance, regressions and choosing browser versus APK verification.
---

# Flourprint UI verification

Read repository `AGENTS.md`, `docs/ux/requirements.md` and the acceptance of the affected
issue/PR first. Check the L-items the change touches, in the rendered app, and name any it
breaks. This skill verifies
the requested change; it does not choose a new framework, redesign the logo or reduce feature
scope. UI implementation is assigned to Gemini under Codex review; use the `agy` skill when that
delegation is requested or required. The verifier owns the acceptance evidence.
Gemini implementation does not imply an additional independent reviewer cohort for every edit.
Use current owner instructions and the [AGY review budget](../agy/SKILL.md#bound-review-and-recovery-costs).
For requested Gemini running-app checks, verify actual browser capability; diagnose failures
before using [AGY's recovery reference](../agy/references/permissions-and-browser.md). A successful
URL-text read or static capture review does not prove independent app use.

For an independent critical review of the interface by an agent that did not build it, use
[flourprint-ui-audit](../flourprint-ui-audit/SKILL.md) instead.

## Choose the evidence surface

- Record the checkout/PR head, build, locale, viewport, theme and platform. A passing report from
  an older build does not verify the current change.
- Prefer the production web build and Playwright for routine layout, field, form and navigation
  changes. Read [verification.md](references/verification.md) for commands and Ionic test pitfalls.
- PR previews are isolated by PR number. The dev APK follows merged `dev`, not an unmerged PR;
  confirm the displayed build before attributing device evidence to the PR.
- Native plugin/configuration, SQLite, install/upgrade, reminders and Android system-back/keyboard
  claims need relevant emulator or physical-device evidence. Reuse the existing suites and
  `docs/device-testing.md`; browser emulation is not a native test. Ordinary CSS/text changes do
  not automatically require a new APK installation.
  A web-only diff can still affect Android focus/back/keyboard behavior; choose evidence by the
  claim and interaction, not solely by whether native files changed.
- Use disposable browser contexts and synthetic/importable fixtures. Preserve personal recipes
  and the existing device app/data; a reload, force-stop, uninstall and upgrade are distinct tests.
- The app seeds no recipe. On a preview, dev or local build, Advanced → "Charger les recettes
  d'exemple" / "Load the sample recipes" adds the reference "Poolish + tangzhong" (a recipe already
  there is kept); release builds do not offer it. Automated suites load the same sample from
  `apps/mobile/test/fixtures/sample-recipe.ts`.

## Verify the change and its adjacent workflow

Select meaningful cases from the requested acceptance, not an exhaustive checklist on every edit:

- First edit, save, discard/cancel and validation: preserve the active visual reference where
  the design promises stable geometry. Measure before/after bounds and the scroll container,
  not just screenshot similarity. Distinguish an intentional screen transition from accidental
  reflow. Confirm user-visible feedback remains discoverable.
- Quantity fields: untouched rounded values emit no edit; partial/invalid text remains visible;
  decimal separators and keyboard/blur commits follow the locale. Check persisted/domain results
  when relevant, without reimplementing baking math in the test or UI.
- Navigation/overlays: close and reopen sheets, verify focus restoration, independent panel
  scroll and draft/planner state. Test rapid transitions when they affect the change. Scope Ionic
  selectors to the active routed page, and separately to the active overlay.
- Presentation: exercise FR/EN, a narrow phone width (360 px is an existing useful case), and
  applicable light/dark/AMOLED settings. Inspect actual captures for wrapping, clipping, density,
  button affordance, reachable detail and contrast. Dark mode alone does not prove AMOLED.
- Recipe / Planning / Preparation: check one owner-relevant complete journey, including parallel
  steps or no/multi-method cooking when the accepted contract supports it. UI mocks cannot prove
  an unimplemented lifecycle, persistence or numerical model capability.

Use condition-based waits for active routes, overlay dismissal and layout completion; avoid
arbitrary sleeps that mask races. When a test fails, keep the trace/capture and establish whether
the defect is in the app, selector, environment or baseline before changing assertions. Never
replace a precise check with a weaker one just to make the suite green.

## Deliver evidence

Once the approved design is implemented and focused Codex/browser/native checks are satisfactory,
advance to ordinary PR integration and the owner's scoped dev-app test. Do not keep redesigning
or restart a reviewer cohort for cosmetic hypotheses; record bounded follow-on defects instead.
The owner withdrew #87's exceptional four-Gemini running-app gate on 2026-10-13. Preserve existing
reports and distinguish a waived gate from a passed one. Documentation-only changes need relevant
documentation checks, not regeneration of unchanged screenshots, journeys or reviewer reports.

Run the required repository checks before a code push. Report the exact build and commands,
observed behavior, measurements/captures actually inspected, and passed/failed/not-run cases.
Separate local browser, CI, emulator and real-device results. A screenshot alone does not prove
focus, system back, persistence, notification delivery or mathematical correctness.

Keep traces/screenshots in ignored scratch/test-output paths; publish a reviewed summary only
within the task's authorization. Apply the status/PR workflow from current `AGENTS.md` and #30;
merging a UI slice does not complete its parent issue. Request a targeted manual device pass from
the owner in the current task
only when needed evidence cannot be obtained with the available tooling, stating the build and
the precise interaction to verify. Record the remaining evidence gap in the linked issue/PR
within existing publishing authorization; do not message other people to obtain it.
