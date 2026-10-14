# ADR 0019: Material 3 presentation through shared Flourprint components

Status: Accepted (owner-approved four-screen mockup, 2026-10-12).

Numbering correction (2026-10-13): this PR's provisional 0018 was reassigned to 0019 because
`canary` already allocates 0018 to its delivery channel. The presentation decision is unchanged.

## Context

The owner approved the warm visual style, then the revised Recipes, Recipe consultation,
Recipe editor and active Preparation layouts in the [v2 mockup](https://aristotelesqc.github.io/Flourprint/?review=v2).
The mockup corrected feature omissions and practical workflow regressions before implementation.
The application needs a coherent reusable presentation system, rather than independent screen
styles or further open-ended design exploration.

## Decision

Implement Material 3 presentation with shared Flourprint React components and semantic CSS
tokens. Retain Ionic's existing navigation, overlays and platform shell. Ionic `md` mode is not
itself Material 3; Flourprint's presentation layer is responsible for the approved hierarchy,
warm palette, surfaces, shapes, typography and control states.

Use a spacing scale of 4, 8, 12, 16, 24 and 32 px, 16 px page gutters and 48 px action targets.
Name text roles for page and section titles, body, values, labels and supporting text. Shared
components express filled primary, outlined secondary and quiet actions, surfaces, value rows,
menus and action bars. DESIGN.md records executable tokens and component guidance alongside
the implementation; it is not a CSS generator or a domain contract.

One action has visual priority on each screen. Occasional actions belong in the overflow menu,
with destructive actions separated. Frequently used Preparation controls (+15 min, Duration,
Note and readiness observations) stay visible. Action hierarchy must not erase practical
workflow. Recipe remains the single authoring workspace; Planning remains a generated view;
Preparation records actual work and supports the existing cooked/raw/mixed outcome contract.

Keep contextual information, explicit percentage bases, precise draft entry, water-composition
uncertainty, advanced details and the temporary weighing aid. Hydration and component ratios
use the accepted domain APIs; presentation never supplies baking calculations. Preserve the
owner-approved mark and warm orange/brown identity across Light, Dark and AMOLED. AMOLED is a
required concrete palette from the approved mockup, with a black page foundation and distinct
warm surfaces. Offer these three palettes alongside automatic System selection in Advanced;
persist the preference only on the device, never in a recipe or preparation snapshot. Apply the
stored choice before asynchronous service initialization, and keep Ionic's palette, document
color scheme and shared tokens synchronized with explicit choices and OS changes. Legacy or
invalid stored choices retain the existing System default.

The standalone mockup supplies visual reference only. Production controls use existing domain
commands, validation, persistence and lifecycle behavior. Fixed mock quantities, fake save or
completion actions and demonstration-only duration limits are not implementation logic.

No external Material library, new dependency, router migration or broad motion system is
selected here. These would need separate demonstrated needs and evidence; none is a
prerequisite for this presentation change. ADR 0002's stack and ADR 0017's design-document
convention remain in force. This decision supersedes the earlier provisional Material 3
exploration direction for the approved screens.

## Consequences

- Implement the approved screens in reviewed slices into dev, with shared components and
  before/after captures. Owner approval establishes a baseline, not a prohibition on later changes.
- Gemini writes the UI; Codex reviews the code and performs separate verification before
  integration. Independent Gemini running-app checks follow current owner instructions and a
  finite review budget, rather than a recurring reviewer-count requirement.
- Passing automated journeys does not establish visual quality. Inspect narrow French renders,
  light/dark/AMOLED variants, larger text, accessible controls and real workflow, preserving unknowns.
- Browser evidence does not establish Android keyboard/back behavior or native plugin behavior.
  Select native/emulator checks for affected interactions under the repository's device workflow.
- This decision does not mark #35 complete or claim all screens/platforms have shipped. Record
  actual implementation and remaining acceptance on the issue and pull request.

Acceptance update (owner, 2026-10-13): #87's exceptional four-Gemini runtime review gate was
withdrawn in [the direction on #88](https://github.com/Aristotelesqc/Flourprint/pull/88#issuecomment-6158701433).
Retain useful evidence, end further review/recovery rounds, and prepare the verified candidate for
ordinary integration and owner dev-app testing. This waiver does not claim the gate passed or
replace automated checks, required native evidence or resolution of demonstrated blocking defects.
