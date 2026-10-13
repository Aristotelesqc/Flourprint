---
name: flourprint-ui-mockups
description: Prepare, review and host interactive Flourprint UI mockups with Gemini for owner visual acceptance before a redesign. Use for mockup requests and visual redesign proposals, not routine UI fixes or engine validation.
---

# Flourprint UI mockups

Produce a concrete visual proposal the owner can inspect in an ordinary browser, then carry
the accepted design into production components. This skill coordinates
[AGY](../agy/SKILL.md) and [UI verification](../flourprint-ui-check/SKILL.md); it does not replace
their procedures, the domain contracts or the repository's delivery rules.

## Establish the review scope

Read `AGENTS.md`, `DESIGN.md` and the current issue/PR acceptance. Record the actual integrated
revision and candidate changes; an old report or screenshot is not the current baseline.
Distinguish shipped behavior, explored proposals and missing visual work. Passing journeys do
not demonstrate that an interface is attractive or understandable.

For the current #35 redesign, the owner's approved review set is **Recipes list, Recipe consultation,
Recipe editing and an active Preparation, in French at 360 px**, in light, dark and AMOLED. The revised
four-screen v2 mockup was approved before implementation. Use the
screen set, locale, viewport and approval scope requested for subsequent assignments rather
than imposing this example on every UI change. Preserve any explicit feature freeze and
coordinate the single UI writer with other contributors.

Capture the actual baseline in disposable browser contexts using repository sample fixtures.
Keep personal recipes out of the prototype. Match recipe, state, locale and viewport across
before/after views; label additional illustrative data and unavoidable state differences.

## Generate with Gemini, integrate with Codex

Use the actual AGY CLI through the sibling skill. Provide current source excerpts, relevant
contracts, the approved mark, exact fixture values and a bounded screen brief. Keep one writer
for overlapping output. A supplied-source HTML result is generated code, not a production
patch or proof of direct filesystem access; inspect the final result and raw tool events.

Request a standalone interactive HTML/CSS/JS prototype in ignored or private scratch space,
separate from `apps/mobile`. Reuse the approved mark unchanged. Keep warm orange/brown identity
in light, warm-dark and AMOLED where relevant. Establish reusable visual roles, spacing and
action hierarchy instead of independent styles for every screen.

For #35, use one principal gesture per screen, occasional secondary actions in an overflow menu,
and destructive actions separated from the primary gesture. Keep frequently used Preparation
controls (+15 min, Duration, Note and readiness observations) visible, as required by the owner.
Avoid duplicate navigation actions,
layout-shifting feedback and false editing affordances in consultation. Preserve detailed
information and advanced paths through discoverable progressive disclosure.

Use fixed fixture outputs to illustrate quantities; do not add baking calculations to the
mockup or disguise invented predictions as engine results. Preserve unknowns, estimation
markers, hydration-lock state and the distinction between planned duration and observed
readiness. Simulated Save/Trash/Complete actions must not claim that real data was changed.

## Verify the proposal independently

Codex reviews and corrects generated output before presenting it. Inspect actual renders,
not only the model's report. Reject technical field names, untranslated product text,
invented ingredient classifications, inconsistent units and contradictory actions.

Use browser automation to render the requested screens and themes at the requested viewport.
Check the visible content's width as well as the document: a clipped scroll container can hide
overflow. Wait for fonts, active views and settled layout rather than adding arbitrary sleeps.
Check reachable details, button affordance, action hierarchy and longer text. Exercise menus,
Escape/focus restoration, tabs and editing transitions; inspect larger-text and reduced-motion
states where applicable. Record only checks actually performed.

Keep captures, a file/hash manifest and concise evidence with the reviewed artifact. A mockup
does not validate persistence, precision-entry semantics, native keyboard/back behavior or
the biological model. Production acceptance still uses the sibling UI-check skill.

## Package and host the review

Deliver a gallery with the three requested views (or the assignment's screen set), theme
controls, an interactive-prototype link and before/after comparisons. Put revision, fixture
and mockup-only explanations outside the simulated product screens. Make the gallery usable
on a narrow phone and desktop; individual screens should remain directly linkable.

Use [hosting.md](references/hosting.md) when packaging or publishing. Prefer a stable HTTPS
review address over localhost for owner review: the Windows Codex browser surface may be
unsupported, and a phone cannot reach the caller's loopback address. Publishing is authorized
only by the user/session, not by invoking this skill; reuse established authorization for
the same scope. Publish reviewed assets, not prompts, account diagnostics or unrelated data.

Verify the deployed URL, relative links, images, themes and representative interactions in a
fresh browser context. A green deployment or HTTP 200 alone is insufficient. Give the owner
the gallery and direct interactive URL; do not rely on a queued in-app browser tab.

## Approval and implementation handoff

When the owner explicitly requires mockup approval before code, keep production UI work
pending until that approval arrives. Positive initial feedback, silence and a request to host
the gallery are not final visual approval. Identify the artifact version and screens approved;
reuse an existing approval within that scope rather than asking again. This is not a new
approval requirement for routine fixes or otherwise authorized implementation.

After acceptance, implement the design with shared production components and runtime tokens;
the standalone HTML is a visual reference, not an app replacement to paste into Ionic.
Update `DESIGN.md` and the relevant ADR alongside the first implementation, distinguishing
presentation choices from framework/router decisions. Use focused PRs with before/after
captures and the repository's checks. Keep the parent issue open while acceptance remains;
update individual issues, never #30's generated tables.

Publish a concise reviewed status and artifact link within existing authorization. Report
what is live, what is a mockup, what is approved, what has shipped and what is unverified.
