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

Read `AGENTS.md`, `docs/ux/requirements.md`, `DESIGN.md` and the current issue/PR acceptance.
The requirements file is the acceptance grid: report each affected L-item as PASS, PARTIAL, FAIL
or NOT-TESTABLE with rendered evidence, and show open O-items as options, never settled. Record the actual integrated
revision and candidate changes; an old report or screenshot is not the current baseline.
Distinguish shipped behavior, explored proposals and missing visual work. Passing journeys do
not demonstrate that an interface is attractive or understandable.

Read ADR 0020 for versioned-library work. For #133/#134, round 2 is the owner's visual starting
point **with every mandatory correction in #134 still applicable**. Preserve round 3's working
state, accessible primitives and real core results; Argon is a secondary visual reference.
Do not restore historical data contradictions, dead controls, false model claims, mixed emoji,
truncated identity or large-text failures in the name of fidelity. Map the current issue findings
to matched renders and operated journeys before calling the revision restored.

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

For current Flourprint mockups, compose the shared versioned components in `packages/ui`
through the mockup's typed id/version manifest (ADR 0020); keep the consumer separate from
`apps/mobile`. Component markup, scoped styles, examples and motion belong to the library.
Screens own composition, localized display-ready props, core bindings and disposable state.
The generated catalogue uses those same versions. Change a component version in its library,
compare it in the catalogue and consuming screens, then select it through the manifest; do not
rewrite screen-local copies or invent library versions for historical HTML. A standalone HTML
reference may inform comparison when explicitly supplied/requested, but does not replace this
shared implementation or establish reusable production components. Reuse the approved mark
unchanged and preserve the warm light, warm-dark and AMOLED identity.

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

Keep **visual** and **interactive** acceptance separate. Inspect matched actual renders for
reference fidelity, hierarchy, density, contrast, wrapping and visible states; a passing journey
or a component catalogue is not visual approval. Operate controls and complete journeys to
verify action-to-state transitions; screenshots cannot establish behavior. Keep A/B navigation,
weighing lifetime, reorder alternatives and 40/48 px targets as proposals until selected by the
owner. Tests do not select a product preference.

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

Every interactive mockup revision must also ship with a companion set of **actual rendered
screenshots**, published alongside the prototype. This is the owner's standing requirement:
some reviewers and LLM harnesses cannot operate the interactive view, and static images enable
quick visual/design review. Local-only captures, iframe previews and the HTML source do not
replace this deliverable. Link directly to the full-resolution PNG/JPEG files from the gallery
and issue/PR; opening an image must not require running the prototype.

Cover every proposed screen, its material states (such as reading versus editing and open
menus/sheets), and the navigation alternatives, themes, locales and text-size cases in the
review scope. Reuse the captures from verification instead of starting another reviewer round.
Identify each capture's prototype revision, screen/state, fixture, A/B option, theme, locale,
viewport and text scale in a manifest and gallery captions outside the phone. Capture the same
revision as the interactive deliverable; refresh affected images when it changes and distinguish
historical comparisons from current proposals. See [hosting.md](references/hosting.md) for packaging.

Screenshots complement live testing: use them to assess hierarchy, spacing, contrast and wrapping.
They cannot pass buttons, animation, navigation, focus or state transitions. Keep the interactive
journey evidence and its limitations explicit alongside the static coverage.

Use [hosting.md](references/hosting.md) when packaging or publishing. Prefer a stable HTTPS
review address over localhost for owner review: the Windows Codex browser surface may be
unsupported, and a phone cannot reach the caller's loopback address. Publishing is authorized
only by the user/session, not by invoking this skill; reuse established authorization for
the same scope. Publish reviewed assets, not prompts, account diagnostics or unrelated data.

Verify the deployed URL, relative links, images, themes and representative interactions in a
fresh browser context. A green deployment or HTTP 200 alone is insufficient. Give the owner
the gallery and direct interactive URL; do not rely on a queued in-app browser tab.

Do not publish a known regression as a completed restoration or delivery. Fix it before making
that claim, or, when an interim comparison was requested, label the artifact incomplete and
name the remaining failures. Record gate results only for the exact tested revision; earlier
passing tests or captures do not certify changed source. Keep unperformed checks unverified.

## Approval and implementation handoff

When the owner explicitly requires mockup approval before code, keep production UI work
pending until that approval arrives. Positive initial feedback, silence and a request to host
the gallery are not final visual approval. Identify the artifact version and screens approved;
reuse an existing approval within that scope rather than asking again. This is not a new
approval requirement for routine fixes or otherwise authorized implementation.

An approved mockup does not impose a recurring Gemini reviewer count. After production verification,
move to ordinary integration and the owner's dev-app feedback; later changes become focused work.
Use the [AGY review budget](../agy/SKILL.md#bound-review-and-recovery-costs), respecting current
delegation requests, stops and waivers rather than inheriting #87's withdrawn four-reviewer gate.

After acceptance, adopt the reviewed versioned components and tokens through the production
consumer manifest in focused slices; do not reconstruct the mockup's markup inside Ionic.
Update `DESIGN.md` and the relevant ADR alongside the first implementation, distinguishing
presentation choices from framework/router decisions. Use focused PRs with before/after
captures and the repository's checks. Keep the parent issue open while acceptance remains;
update individual issues, never #30's generated tables.

Publish a concise reviewed status and artifact link within existing authorization. Report
what is live, what is a mockup, what is approved, what has shipped and what is unverified.
