---
version: alpha
name: Flourprint — Warm baking workspace
description: Owner-approved warm Material 3 presentation through shared Flourprint components, retaining the Ionic shell.
colors:
  surface-container-high: '#e7e3dc'
  warning-bg: 'rgb(196 118 12 / 0.12)'
  warning-border: 'rgb(196 118 12 / 0.38)'
  warning-ink: '#7a4500'
  danger-bg: 'rgb(179 38 30 / 0.1)'
  success: '#256b39'
  success-bg: 'rgb(37 107 57 / 0.12)'
  shadow: 'rgb(28 25 21 / 0.12)'
  backdrop: 'rgb(20 17 14 / 0.52)'
  dark-surface-container-high: '#3e3832'
  dark-warning-bg: 'rgb(235 168 64 / 0.13)'
  dark-warning-border: 'rgb(235 168 64 / 0.36)'
  dark-warning-ink: '#f6c97e'
  dark-danger-bg: 'rgb(242 139 130 / 0.14)'
  dark-success: '#7cc992'
  dark-success-bg: 'rgb(124 201 146 / 0.14)'
  dark-shadow: 'rgb(0 0 0 / 0.42)'
  dark-backdrop: 'rgb(8 7 6 / 0.68)'
  amoled-warning-bg: 'rgb(235 168 64 / 0.13)'
  amoled-warning-border: 'rgb(235 168 64 / 0.36)'
  amoled-warning-ink: '#f6c97e'
  amoled-danger-bg: 'rgb(242 139 130 / 0.14)'
  amoled-success: '#7cc992'
  amoled-success-bg: 'rgb(124 201 146 / 0.14)'
  amoled-shadow: 'rgb(0 0 0 / 0.84)'
  amoled-backdrop: 'rgb(0 0 0 / 0.78)'
  primary: '#a9490a'
  on-primary: '#ffffff'
  background: '#f8f7f4'
  surface: '#ffffff'
  surface-container: '#f2efe9'
  on-surface: '#1c1b19'
  muted: '#69645c'
  outline: '#e4e0d8'
  outline-subtle: '#eae5dc'
  track: '#ebe8e2'
  field-outline: '#b9b3a8'
  field-background: '#fbfaf8'
  action-text: '#9a4209'
  primary-container: 'rgb(169 73 10 / 0.1)'
  error: '#b3261e'
  dark-primary: '#cf8a5e'
  dark-on-primary: '#201d1a'
  dark-background: '#201d1a'
  dark-surface: '#2a2622'
  dark-surface-container: '#332e29'
  dark-on-surface: '#e9e4dc'
  dark-muted: '#b1aa9f'
  dark-outline: '#3b3631'
  dark-outline-subtle: '#3a342e'
  dark-track: '#322e29'
  dark-field-outline: '#625b52'
  dark-field-background: '#2e2a26'
  dark-action-text: '#dba27c'
  dark-primary-container: 'rgb(207 138 94 / 0.16)'
  dark-error: '#f2b8b5'
  amoled-primary: '#cf8a5e'
  amoled-on-primary: '#000000'
  amoled-background: '#000000'
  amoled-surface: '#121110'
  amoled-surface-container: '#1b1917'
  amoled-surface-container-high: '#24211e'
  amoled-on-surface: '#e9e4dc'
  amoled-muted: '#b1aa9f'
  amoled-outline: '#38322b'
  amoled-outline-subtle: '#29241f'
  amoled-track: '#1b1917'
  amoled-field-outline: '#38322b'
  amoled-field-background: '#121110'
  amoled-action-text: '#dba27c'
  amoled-primary-container: 'rgb(207 138 94 / 0.16)'
  amoled-error: '#f28b82'
rounded:
  sheet: 24px
  pill: 9999px
  card: 1rem
  segmented-option: 0.75rem
spacing:
  scale: [0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem]
  compact: 0.375rem
  control: 0.625rem
  section: 1.25rem
  page-gutter: 1rem
  touch: 3rem
  card-padding: 1rem
typography:
  font: { family: 'system-ui, sans-serif' }
  navigation: { size: 0.6875rem, line: 1.15 }
  heading: { size: 1.125rem, line: 1.5rem, weight: 700 }
  page: { size: 1.5rem, line: 2rem, weight: 700 }
  title: { size: 1.375rem, line: 1.75rem, weight: 700 }
  body: { size: 1rem, line: 1.5rem }
  supporting: { size: 0.875rem, line: 1.25rem }
  metadata: { size: 0.75rem, line: 1rem }
  timer: { size: 3.25rem, line: 1.1, weight: 800 }
motion:
  duration-effect: 150ms
  duration-spatial: 220ms
  duration-sheet: 260ms
  easing-standard: 'cubic-bezier(0.2, 0, 0, 1)'
  easing-decelerate: 'cubic-bezier(0.05, 0.7, 0.1, 1)'
components:
  section-surface:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.on-surface}'
    rounded: '{rounded.card}'
    padding: '{spacing.card-padding}'
  section-surface-dark:
    backgroundColor: '{colors.dark-surface}'
    textColor: '{colors.dark-on-surface}'
    rounded: '{rounded.card}'
    padding: '{spacing.card-padding}'
  section-surface-amoled:
    backgroundColor: '{colors.amoled-surface}'
    textColor: '{colors.amoled-on-surface}'
    rounded: '{rounded.card}'
    padding: '{spacing.card-padding}'
  precision-field:
    backgroundColor: '{colors.field-background}'
    textColor: '{colors.on-surface}'
  precision-field-dark:
    backgroundColor: '{colors.dark-field-background}'
    textColor: '{colors.dark-on-surface}'
  precision-field-amoled:
    backgroundColor: '{colors.amoled-field-background}'
    textColor: '{colors.amoled-on-surface}'
---

# Flourprint design brief

## Overview

Flourprint is a practical workspace for making dough. Its identity is warm orange, toasted
brown and quiet neutral surfaces. Preserve the owner's approved loaf mark in
`apps/mobile/resources/mark.svg`; do not redraw it. A focused, useful tool should feel clear
and approachable while keeping quantities and advanced baking choices readily available.

This is the shared visual and interaction brief for all UI agents, following the
[Google Labs DESIGN.md format](https://github.com/google-labs-code/design.md). Contracts define
domain meaning; ADRs define architecture. This file defines presentation. Read
[ADR 0017](docs/adr/0017-design-brief.md) and
[ADR 0019](docs/adr/0019-material3-presentation.md). Earlier exploration reports are historical
evidence, not a pending decision for the approved screens.

**Decision:** the owner approved the [revised four-screen mockup](https://aristotelesqc.github.io/Flourprint/?review=v2)
(Pages revision `0aea128`) and authorized implementation. Material 3 presentation uses reusable
Flourprint React components, shared semantic tokens and the existing Ionic navigation/overlay
shell. No external Material library or router replacement is selected. The mockup is a visual
reference, not production state or command logic. Later changes remain possible.

Token values have one source: `packages/ui/src/tokens.ts` (ADR 0020).
`scripts/ui-tokens.mjs` generates `packages/ui/src/tokens.css` and this file's token frontmatter;
run `pnpm tokens` after a token change and `pnpm tokens:check` to verify synchronization.
The production app's `apps/mobile/src/theme/app.css` remains migration context until its reviewed
consumer change. Evidence of actual screen and platform coverage belongs in the PR and #35,
not an implied compliance claim.

## Colors

The current mappings in `apps/mobile/src/theme/app.css` are:

| Design role           | Runtime token       | Light / dark / AMOLED frontmatter tokens                                    |
| --------------------- | ------------------- | --------------------------------------------------------------------------- |
| Primary action        | `accent`            | `primary` / `dark-primary` / `amoled-primary`                               |
| Action foreground     | `on-accent`         | `on-primary` / `dark-on-primary` / `amoled-on-primary`                      |
| Page                  | `bg`                | `background` / `dark-background` / `amoled-background`                      |
| Content surface       | `surface`           | `surface` / `dark-surface` / `amoled-surface`                               |
| Quiet grouped surface | `surface-container` | `surface-container` / `dark-surface-container` / `amoled-surface-container` |
| Main text             | `ink`               | `on-surface` / `dark-on-surface` / `amoled-on-surface`                      |
| Secondary text        | `muted`             | `muted` / `dark-muted` / `amoled-muted`                                     |
| Divider               | `line`              | `outline` / `dark-outline` / `amoled-outline`                               |
| Subtle divider        | `line-subtle`       | `outline-subtle` / `dark-outline-subtle` / `amoled-outline-subtle`          |
| Selector track        | `track`             | `track` / `dark-track` / `amoled-track`                                     |
| Input outline         | `field`             | `field-outline` / `dark-field-outline` / `amoled-field-outline`             |
| Input fill            | `field-bg`          | `field-background` / `dark-field-background` / `amoled-field-background`    |
| Text action           | `accent-text`       | `action-text` / `dark-action-text` / `amoled-action-text`                   |
| Soft accent           | `accent-soft`       | `primary-container` / `dark-primary-container` / `amoled-primary-container` |
| Error                 | `alert`             | `error` / `dark-error` / `amoled-error`                                     |

The `primary-container` names describe the existing translucent soft accents, not validated M3
tonal-container roles. Three concrete palettes (Light, Warm Dark, and AMOLED) are selectable in
Advanced settings alongside automatic System choice, persisted in device preferences. Initial load
synchronously applies the stored preference before async services initialize to avoid a light flash,
then subscribes to device preferences and OS changes. AMOLED uses a pure black page foundation
(`#000000`) with warm accents (`#cf8a5e` on black `#000000`), surface (`#121110`), container
(`#1b1917`), high container (`#24211e`), lines (`#38322b`/`#29241f`), ink (`#e9e4dc`), and muted
text (`#b1aa9f`). Explicit light and dark choices win over opposite OS preferences via Ionic's class
palette. Runtime contrast and device checks remain verified under the repository's test and device
workflows.

In the shared M3 layer, introduce semantic roles for selected state, container levels and status
only when they have concrete consumers. Evaluate actual foreground/background pairs, including
focus, outlines, disabled states and translucent blends. Do not silently replace warm accents
with a generic purple or blue palette. A palette snapshot alone does not prove contrast.

## Typography

Keep the system/platform sans-serif font and tabular numerals. Shared named roles cover page
titles, section titles, body, prominent values, labels and supporting text. Use rem-based sizes
and explicit line heights so larger text can reflow. The approved reference uses a 24/32 px page
headline, 22/28 px title, 16/24 px section/body and 14/20 px labels/supporting body; compact
metadata may use 12/16 px. Large remaining-time values have their own role rather than enlarging
every heading. Runtime classes and any exceptions must be documented with the implementation.

Prioritize readable ingredient quantities, units and times. Use sentence case for actions.
Explanations can expand progressively; primary actions and essential labels remain visible.
Verify FR/EN and larger text in the same layout. French instructions use infinitives, as required
by ADR 0009 and AGENTS.md.

## Layout

Use reusable sections and compact rows, with related values grouped together. Keep practical
recipe density without turning every line into a card. Existing `Card`/`Rows` use 1rem padding
and rounded corners; `--spacing-touch` is 3rem. These are current tokens, not proof every
existing control meets the target. Prototype touch actions with a 48px target wherever feasible;
compact glyphs may sit inside larger non-overlapping hit areas.

Use the shared 4/8/12/16/24/32 px spacing scale, 16 px page gutters and 48 px action targets.
Keep one visually dominant action per screen. Occasional actions belong in an overflow menu;
destructive actions are separated there and never placed beside Start/Resume. Frequent
Preparation shortcuts (+15 min, Duration, Note and readiness observations) remain visible.

Recipe presents composition and authored method. Planning presents generated projections with
time controls and a shortcut to the single Recipe step editor. Preparation presents actual work.
Follow the contracts for semantics; do not build a second editable recipe inside Planning.

**Consultation/editing composition (#67):** saved recipes open for reading with explicit
Edit in overflow and a contextual Start/Resume action. Planning is the generated tab, without a
duplicate Plan header button. New or resumed drafts open for editing after hydration. Consultation
does not reserve an empty 88px draft footer. Once editing starts, first modification and validity
feedback keep the primary controls stable. A deliberate mode change may rearrange the screen;
retain understandable scroll/focus and preserve or guard all pending raw input.

The implementation uses `FormulaConsultation`, `FormulaSection` and `RecipeMethod` for the Recipe tab,
and a read-only projection `ProcessSection` for the Planning tab with shortcuts to the step editor.
Hydration lock controls exist exclusively within the formula editor; consultation presents resolved hydration without an edit shortcut or lock glyph. Planner inputs survive mode changes.
Intended outcome is authored in Recipe and summarized in Planning (with an inference hint for automatic outcomes, and an authored label when explicit). Equipment attached to a step
uses one compact summary and progressive details in both views. Explicit settings and unknowns
remain visible; canonical mode help does not promise equivalence with a particular appliance.
Profiles are optional. This presentation does not supply the equipment catalogue/editor still
tracked by #28. Trashed recipes remain read-only until restored, including contextual shortcuts.
`WeighingChecklist` shares temporary page state between views; changed quantities clear the affected
checks. The checklist survives panel/mode switches and raw-only discard, but is not saved to history
and resets when the page is recreated or the app reloads. Domain drafts persist accepted edits;
unparsed raw strings remain in mounted fields, not in the durable draft. A mode command blurs only
the focused field through its normal commit path, then checks synchronous draft/validation state.

Keep quantities and the temporary weighing checklist accessible. Clarify that checklist scope;
do not imply a recorded preparation or remove the aid while session persistence is unavailable.
No forced wizard is needed to start an existing recipe now. Planned time and actual start remain
distinct. Essential advanced features stay discoverable; complexity changes implementation slices.

**Motion direction (#73, exploration):** prefer short surface/color feedback before introducing
spatial movement. Static labels and states remain understandable with motion disabled. Never roll
numeric values, simulate progress, delay actions behind decoration, or animate restored panel scroll.
Keep input anchors stable within editing and preserve pending/invalid text. Reduced-motion policy
must examine scoped CSS and the installed overlay/navigation runtime separately, including preference
changes during use and interrupted transitions. The versioned review library uses the owner-selected round 2 timings below, informed by the
[reviewed exploration](docs/architecture/2026-10-12-motion-exploration.md). Production overlay
adoption and native/performance conformance require their own verification.

## Elevation & Depth

Use warm tonal surfaces, separators and restrained elevation for hierarchy. Sheets sit above
the current workspace; selection and interactive state must remain clear without relying only
on color. Avoid decorating every value with a raised container. Evaluate new elevation and
surface consumers side by side across light, warm dark, and AMOLED.

## Shapes

Current shared cards have a 1rem radius; segmented options use 0.75rem. Preserve coherent shapes
within each role. A proposed M3 shape scale should be introduced through shared components,
not independent radius choices on each page. Shapes alone do not establish an M3 implementation.

## Approved screen composition

- **Recipes:** readable application/build header, quiet creation with explicit top and bottom close actions,
  compact active-preparation resume entry with remaining time, and recipe cards with version, dough, hydration,
  total planned duration and wrapping metadata where last cooking / "Jamais cuite" stays legible without squeezed
  slivers. Registry, history and settings remain reachable without competing with the recipe list.
- **Recipe consultation:** summary, clearly named percentage bases, shared `ConsultationRow` items with
  consistent vertical padding when titles wrap, components and authored method ("Étapes de préparation").
  Contextual information buttons stay beside hydration, size and other explained concepts.
  Hydration is `totalWaterPct`, shown to the whole percent with uncertainty/incompleteness retained; consultation
  omits any hydration-edit button or lock/unlock glyph. Method steps are automatically numbered (1-based)
  with cooling presented as "Ressuage". Known built-in template step instructions map to concise localized display names
  for row and timeline presentation alongside full localized instructions, leaving core template data read-only and unmutated.
  Linear step dependencies ("Après X") are omitted when depending strictly on the immediately preceding step in the authored list. Step rows provide a visible edit affordance.
  Intended outcome is integrated directly as the final row of the step list ("Résultat : {outcome}") with an inference
  hint for automatic outcomes ("Déduit des étapes de préparation.") and an authored indicator ("Défini pour cette recette.")
  when explicitly chosen. The fermentation card structures details into labelled groups
  with a recognizable warning icon (⚠️) and plain localized wording, never rendering out-of-domain or unsupported
  predictions as 0 min–0 min ranges. Bottom outer scroll content uses ordinary trailing spacing (`pb-6`)
  alongside the Ionic footer's reserved viewport, rather than duplicating the footer height. The final
  result remains fully visible above the primary action at 360 px and with enlarged text, without a dead gap.
- **Planning:** concise step-first summary wording (`{step} · fin {when}` / `{step} · end {when}`, with
  `début` / `start` for the reverse projection), single discoverable
  pencil edit affordance per step navigating to Recipe step editing, linear dependency omission matching Recipe,
  and clear preview explanations when raw fields are invalid.
- **Completed preparation steps:** show the actual end clock alongside an explicitly labelled planned
  recipe duration. Never present the planned duration as elapsed time; the journal retains actual facts.
- **Active preparation cards:** put the current step action on its own full-width row, with Note and
  Open beneath it. Wrap long authored step names, retain intrinsic button height and shared touch
  targets, and avoid an empty row when no primary action is available.
- **Editing:** Composition, Components, Steps and Result sections share the same draft. Preserve mounted raw
  fields or commit/guard them through the existing validation mechanism before navigation.
  Hydration target rate field is editable only when unlocked; lock/unlock controls exist exclusively within editing.
  A locked hydration field disables direct rate entry and explains how to unlock.
  Step sheet exposes operation selection (including custom operations), custom step names/labels, equipment,
  technique, and a visible delete action with confirmation (or explanation when preparation-owned steps cannot be
  directly removed). Editing a curated template step presents its localized short display name; closing or blurring
  without editing never overwrites the stored template instruction, and arbitrary user labels remain literal without
  translation guessing.
  Ephemeral Undo, Redo, and Reset controls in `DraftActionBar` accompany one full-width Save action.
  The temporary history retains up to 50 accepted states of the formula, process and name; it survives
  reading/planning previews and resets on save, discard or page reload. Reset confirms restoration to
  the start of this editing session, including a resumed draft, and explains loss of unconfirmed input.
  Undo/Redo guard invalid raw text and restore exact snapshots without recalculating model durations.
  Reaching the oldest retained state does not discard a modified draft. Existing draft autosave remains
  separate from the temporary history. A step-name edit preserves incomplete technique controls;
  changing an operation refuses unresolved raw input before conditional fields can disappear.
  Ratio entry uses `liquidMassRatio` and `hydrationForRatio` from the current contract: it counts weighed
  liquid mass (including the whole mass of milk); hydration and component style still count its water content.
  One Save bar has stable reserved feedback space; check/review/discard are occasional actions.
- **Preparation:** large remaining time, planned end, actual start and temporal progress; visible
  quick controls and readiness observations. Upcoming steps with clock times precede completed
  steps. Keep the full journal accessible (all existing notes, observations and step completions)
  and actual lifecycle/outcome actions. A readiness observation neither completes the stage nor
  establishes a cooked result. Unknown times remain unknown.

## Current runtime components (migration context)

Extend the current `Field`, `Segmented`, `Card`, `Rows`, `InfoSheet` and `DraftActionBar` foundation.
The target is a reusable Flourprint component layer with consistent behavior and theme roles.
The implementation shares `OverflowMenu`, the `Segmented` variants (reading tabs, editor
sections and quantity modes), tonal `Card` surfaces and semantic text roles from `app.css`.
Editor sections keep one mounted formula editor: changing sections does not duplicate the
validation registry or throw away raw input. Large-text layouts may wrap editor sections into
two rows; labels and touch targets stay intact. Native Ionic overlays remain platform-specific
and require their own checks.

- **Actions:** visible primary-action labels, distinct filled/outlined/quiet roles, clear busy,
  disabled and destructive states. Primary actions share the full-width pill role (`btn-pill-primary`,
  > = 3rem / 48px touch target) across consultation Start/Resume and editor Save, with accessible
  > neutral surface and legible muted ink tokens when disabled. Ephemeral Undo/Redo/Reset actions
  > in `DraftActionBar` maintain accessible touch targets (>= 48px) and distinct aria-labels.
- **Precision fields:** input frames identify actual editing; read-only quantities are text.
  Retain local raw input, parsing/refusal feedback and the page validation registry. Untouched
  formatted numbers never become edits. Disabled fields (e.g. locked hydration target) use distinct
  dimmed styling (`opacity-60 cursor-not-allowed`) and helper guidance.
- **Sections and value rows:** shared consultation/editor composition via `ConsultationRow` with
  adequate vertical padding (`py-2.5`, min-height 52px) maintaining consistent hierarchy and visual rhythm across both views
  for multi-line wrapped text; units and unknowns remain explicit. Do not recalculate baking quantities in presentation components.
- **Status and draft actions:** stable footprint within editing; save cannot claim invalid or
  refused text was saved. Unmount, Planning and back transitions retain input or guard its loss.
  Undo and redo restore working-state snapshots while clearing focused input buffer mismatches.
- **Sheets and help:** concise explanations with optional detail; accessible close action,
  containment, dismissal and focus return. Native keyboard/system-back behavior needs native
  evidence when affected; browser tests alone do not establish it.
  Complete the new-recipe chooser's dismissal before navigating to its saved draft. Pending
  creation prevents duplicate activation and user dismissal; ordinary cancellation stays on the list.
- **Timeline:** show dependencies, parallel work and uncertainty without making elapsed time
  a biological readiness score. Single pencil button affordance returns to the corresponding Recipe step.

This tranche selects the shared Flourprint presentation layer and retains Ionic's shell. A future
shell/library comparison is separate work, not a prerequisite for the approved visual redesign.
DESIGN.md does not select a new dependency or migrate routes.

## Do's and Don'ts

- Preserve the warm identity, approved logo and useful advanced paths.
- Distinguish observed, planned and estimated information through labels and progressive detail.
- Verify narrow FR/EN layouts, larger text, focus, contrast, reduced motion and long build labels.
- Preserve raw invalid, domain-refused and valid-but-pending input during view changes.
- Keep every visual change reflected here and in the runtime tokens in the same reviewed slice;
  document exceptions explicitly. Do not auto-export this snapshot over the live theme.
- Do not treat accepted lifecycle contracts as already implemented APIs, or invent outcomes in UI.
- Do not declare native behavior or accessibility verified from source alone.
- Track work on individual GitHub issues and labels; this brief is not a second backlog.

## Components (#133 / #134, ADR 0020)

The restored prototype composes the first versions from `packages/ui`, using stable `fp.*` ids
through `docs/mockups/0.3-ux/src/ui.manifest.ts`. Its screens map actual core results to
localized props; the library imports no core, adapters, recipes or domain solver. These v1
components are review candidates, not a claim that the production app has already migrated.
Ionic's production shell remains in place. Prototype session state remains in memory.

### Isolate, change, compare, reuse

1. Reproduce the problem in a screen. The review studio's **Inspect components** mode identifies
   the clicked component and its containing components, with ids and versions. It links their
   generated catalogue entries. Product actions are paused only while this explicit inspector
   is enabled; inspection metadata never appears in capture-mode product screens.
2. Work on the component version and its scoped stylesheet in `packages/ui/src/components/<name>/`, not a screen-local
   copy of its markup or internal styles. Tokens have one home in `packages/ui/src/tokens.ts`;
   regenerate their CSS and this file's front matter with `pnpm tokens`.
3. Check the version's examples in the generated catalogue in Light, Dark and AMOLED, at
   393px and 360px / 130%, with normal and reduced motion. Examples show labelled states;
   fixed sample quantities in the catalogue are illustrative, never engine predictions.
4. Use the consumer manifest to switch versions. Screens keep their ids and typed props. Nested components use typed `library.Slot` calls, so a manifest change also reaches cards, rows and other compositions. Version styles are scoped to both id and version; changing v2 cannot restyle v1.
   This round has v1 only; historical monolithic prototypes are references, not invented v2s.
5. Exercise affected screen journeys and inspect before/after captures before publishing.
   A component fix must not break another screen, first input, focus or unknown-value labels.
   Production adoption uses these same version modules in reviewed slices, not a rewrite.

### Rules by component id

| Id                                          | Rule shared by every version                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fp.button`, `fp.icon-button`               | One clear primary action; real disabled states; destructive actions separated; visible focus and bounded press feedback.                                                              |
| `fp.icon`                                   | Consistent SVG pictograms; accessible labels belong to the action or accompanying text.                                                                                               |
| `fp.surface`, `fp.badge`, `fp.metric-pill`  | Warm semantic surfaces; labelled statuses; tabular quantities and atomic number/unit pairs.                                                                                           |
| `fp.number-field`                           | Preserve raw invalid and pending text; untouched display rounding emits no edit; locale parsing and refusal remain explicit.                                                          |
| `fp.weighing-checkbox`, `fp.ingredient-row` | Real touch target; one toggle per gesture; no duplicate visible ingredient label; editing a field must not toggle weighing.                                                           |
| `fp.tabs`                                   | Selected state, keyboard navigation and readable labels; overflow remains reachable at large text sizes.                                                                              |
| `fp.group-card`                             | Accessible expanded state; inert collapsed content; grid accordion and rotating chevron with a zero-motion alternative.                                                               |
| `fp.bottom-sheet`, `fp.floating-menu`       | Viewport placement, Escape/outside dismissal and native focus containment while open. Close modality immediately; an inert visual exit must never swallow the first subsequent input. |
| `fp.hero-summary`                           | Distinguish flour, assembled dough and hydration; retain unknown contributors and hydration help. No substitute water metric or fake complete value.                                  |
| `fp.recipe-card`                            | Version, actual duration/weight and cooking history stay explicit; active Preparation exposes its real remaining time and Resume action.                                              |
| `fp.step-node`, `fp.timeline`               | Show actual operations and projection bounds, dependencies and uncertainty. Timeline geometry is display-only and must not become a second scheduler.                                 |
| `fp.warning-banner`                         | Separate model failure, extrapolation and known outputs; never replace an unavailable estimate with a zero duration.                                                                  |
| `fp.prep-hero`                              | Dominant remaining time; actual start, planned finish and instruction before quick controls; no rolling timer or decorative progress animation.                                       |
| `fp.bottom-bar`                             | A contextual toolbar below, or B actions in the header plus stable bottom destinations; no destructive action beside Start/Save.                                                      |

The owner's round 2 motion inventory is retained: 150ms effect, 220ms spatial, 260ms sheet,
M3 standard/decelerate curves, press/selection, menu, row/check, chevron/accordion, sheet/backdrop,
screen/tab changes and Preparation completion. Both system and manual reduced motion resolve to
0ms. Evidence samples actual CSS animations before/during/after; reduced states have no fabricated
intermediate frame. Native overlay/performance conformance remains separately testable.

### Round 2 fidelity corrections (#134)

The owner rejected the first restoration proposal as still regressive. Passing controls,
component coverage and motion evidence do not establish visual fidelity. In particular,
A and B must retain their different action placement; an active card must not gain a large
second Resume block; model creation needs informative selectable cards rather than a list
of unlabeled-shape buttons; and summary detail, partial-value markers, horizontal ingredient
quantities, operation pictograms and group time windows must not disappear during extraction.
Compare these roles against round 2 directly. Retain necessary accessibility and core-data
corrections, documenting their differences rather than calling every difference restored.

Round 2 is a **starting point with mandatory corrections**, not a pixel-perfect acceptance
target: #134's title, localization, pictogram, build identity, data, navigation and larger-text
findings still apply. Never copy its invented quantities, contradictory model claims, dead
controls, discarded edits or inaccessible overlays. Argon is a secondary visual reference;
round 3 supplies the working state and core calls. Unresolved A/B, weighing lifetime, reorder
mode and 40/48 px target choices remain visible proposals rather than silent defaults.

Review two separate gates. **Visual acceptance** requires inspecting matched actual renders
for hierarchy, density, contrast, wrapping, state visibility and fidelity to the selected
reference. **Interactive acceptance** requires operating the visible controls and complete
journeys, checking action-to-state transitions, raw input, focus and dismissal. A green test
suite cannot pass the visual gate; screenshots cannot pass the interactive gate. Motion also
needs real transition evidence and its reduced-motion state.

Do not publish a known regressive candidate as a completed restoration or delivery. Diagnose
and correct the regression before the delivery claim; if the owner requests an interim
comparison, label it as an incomplete comparison with the remaining failures. Preserve prior
artifacts for history without reusing their passing results for a changed revision. The
[restoration acceptance matrix](docs/mockups/0.3-ux/restoration-report.md) maps #120/#134 to the
required evidence; it is an evidence report, not another backlog or an owner approval.
