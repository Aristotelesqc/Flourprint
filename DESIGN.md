---
version: alpha
name: Flourprint — Warm baking workspace
description: Owner-approved warm Material 3 presentation through shared Flourprint components, retaining the Ionic shell.
colors:
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
rounded:
  card: 1rem
  segmented-option: 0.75rem
spacing:
  scale: [0.25rem, 0.5rem, 0.75rem, 1rem, 1.5rem, 2rem]
  page-gutter: 1rem
  touch: 3rem
  card-padding: 1rem
typography:
  page: { size: 1.5rem, line: 2rem, weight: 700 }
  title: { size: 1.375rem, line: 1.75rem, weight: 700 }
  body: { size: 1rem, line: 1.5rem }
  supporting: { size: 0.875rem, line: 1.25rem }
  metadata: { size: 0.75rem, line: 1rem }
  timer: { size: 3.25rem, line: 1.1, weight: 800 }
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
  precision-field:
    backgroundColor: '{colors.field-background}'
    textColor: '{colors.on-surface}'
  precision-field-dark:
    backgroundColor: '{colors.dark-field-background}'
    textColor: '{colors.dark-on-surface}'
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
[ADR 0018](docs/adr/0018-material3-presentation.md). Earlier exploration reports are historical
evidence, not a pending decision for the approved screens.

**Decision:** the owner approved the [revised four-screen mockup](https://aristotelesqc.github.io/Flourprint/?review=v2)
(Pages revision `0aea128`) and authorized implementation. Material 3 presentation uses reusable
Flourprint React components, shared semantic tokens and the existing Ionic navigation/overlay
shell. No external Material library or router replacement is selected. The mockup is a visual
reference, not production state or command logic. Later changes remain possible.

The frontmatter retains the executable warm palette and records the accepted spacing scale;
keep it synchronized with `apps/mobile/src/theme/app.css` in the implementation slice. Evidence
of actual screen and platform coverage belongs in the PR and #35, not an implied compliance claim.
No runtime token generator exists.

## Colors

The current mappings in `apps/mobile/src/theme/app.css` are:

| Design role           | Runtime token       | Light / dark frontmatter tokens                |
| --------------------- | ------------------- | ---------------------------------------------- |
| Primary action        | `accent`            | `primary` / `dark-primary`                     |
| Action foreground     | `on-accent`         | `on-primary` / `dark-on-primary`               |
| Page                  | `bg`                | `background` / `dark-background`               |
| Content surface       | `surface`           | `surface` / `dark-surface`                     |
| Quiet grouped surface | `surface-container` | `surface-container` / `dark-surface-container` |
| Main text             | `ink`               | `on-surface` / `dark-on-surface`               |
| Secondary text        | `muted`             | `muted` / `dark-muted`                         |
| Divider               | `line`              | `outline` / `dark-outline`                     |
| Subtle divider        | `line-subtle`       | `outline-subtle` / `dark-outline-subtle`       |
| Selector track        | `track`             | `track` / `dark-track`                         |
| Input outline         | `field`             | `field-outline` / `dark-field-outline`         |
| Input fill            | `field-bg`          | `field-background` / `dark-field-background`   |
| Text action           | `accent-text`       | `action-text` / `dark-action-text`             |
| Soft accent           | `accent-soft`       | `primary-container` / `dark-primary-container` |
| Error                 | `alert`             | `error` / `dark-error`                         |

The `primary-container` names describe the existing translucent soft accents, not validated M3
tonal-container roles. Dark mode currently follows the system preference. Selectable AMOLED
is required work: use a black page foundation with warm accents and distinguishable surfaces;
exact values, selection/persistence and accessibility checks remain to be implemented.

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
Hydration consultation clearly displays lock state with an explicit edit shortcut. Planner inputs survive mode changes.
Intended outcome is authored in Recipe and summarized in Planning. Equipment attached to a step
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
changes during use and interrupted transitions. Exact tokens, timings, library and runtime choices
remain pending the [reviewed prototype comparison](docs/architecture/2026-10-12-motion-exploration.md);
these principles do not ship animations or establish native/performance conformance.

## Elevation & Depth

Use warm tonal surfaces, separators and restrained elevation for hierarchy. Sheets sit above
the current workspace; selection and interactive state must remain clear without relying only
on color. Avoid decorating every value with a raised container. Evaluate new elevation and
surface consumers side by side in light and warm dark; an AMOLED prototype does not establish
a selectable production theme.

## Shapes

Current shared cards have a 1rem radius; segmented options use 0.75rem. Preserve coherent shapes
within each role. A proposed M3 shape scale should be introduced through shared components,
not independent radius choices on each page. Shapes alone do not establish an M3 implementation.

## Approved screen composition

- **Recipes:** readable application/build header, quiet creation, compact active-preparation
  resume entry with remaining time, and recipe cards with version, dough, hydration, total
  planned duration and last cooking/never-cooked information. Registry, history and settings
  remain reachable without competing with the recipe list.
- **Recipe consultation:** summary, clearly named percentage bases, ordinary ingredient rows,
  components and authored method. Contextual information buttons stay beside hydration, size
  and other existing explained concepts. Hydration is `totalWaterPct`, shown to the whole
  percent with uncertainty/incompleteness retained. No extra added/poured-water summary line.
  Unlock is neutral; lock has an explicit useful state. Milk-only recipes do not acquire water
  or a lock merely to match a layout.
  Without a water absorber, the shortcut names ingredient editing rather than promising
  a direct hydration edit; it leads to the same Composition workspace.
- **Editing:** Composition, Components, Steps and Result sections share the same draft. Preserve
  mounted raw fields or commit/guard them through the existing validation mechanism before
  navigation. Show percent/gram entries, anchor modes, hydration lock, component allocations
  and ratios, authored steps/equipment and the actual outcome contract. Ratio entry uses
  `liquidMassRatio` and `hydrationForRatio` from the current contract: ratio entry counts weighed
  liquid mass (including the whole mass of milk); hydration and component style still count
  its water content. One Save bar has stable reserved feedback space; check/review/discard are occasional
  actions. Quantities retain full internal precision.
- **Preparation:** large remaining time, planned end, actual start and temporal progress; visible
  quick controls and readiness observations. Upcoming steps with clock times precede completed
  steps. Keep the journal and actual lifecycle/outcome actions. A readiness observation neither
  completes the stage nor establishes a cooked result. Unknown times remain unknown.

## Components

Extend the current `Field`, `Segmented`, `Card`, `Rows`, `InfoSheet` and `DraftActionBar` foundation.
The target is a reusable Flourprint component layer with consistent behavior and theme roles.
The implementation shares `OverflowMenu`, the `Segmented` variants (reading tabs, editor
sections and quantity modes), tonal `Card` surfaces and semantic text roles from `app.css`.
Editor sections keep one mounted formula editor: changing sections does not duplicate the
validation registry or throw away raw input. Large-text layouts may wrap editor sections into
two rows; labels and touch targets stay intact. Native Ionic overlays remain platform-specific
and require their own checks.

- **Actions:** visible primary-action labels, distinct filled/outlined/quiet roles, clear busy,
  disabled and destructive states. Do not substitute icon-only controls for essential actions.
- **Precision fields:** input frames identify actual editing; read-only quantities are text.
  Retain local raw input, parsing/refusal feedback and the page validation registry. Untouched
  formatted numbers never become edits. No global commit of all formatted fields.
- **Sections and value rows:** shared consultation/editor composition; units and unknowns remain
  explicit. Do not recalculate baking quantities in presentation components.
- **Status and draft actions:** stable footprint within editing; save cannot claim invalid or
  refused text was saved. Unmount, Planning and back transitions retain input or guard its loss.
- **Sheets and help:** concise explanations with optional detail; accessible close action,
  containment, dismissal and focus return. Native keyboard/system-back behavior needs native
  evidence when affected; browser tests alone do not establish it.
  Complete the new-recipe chooser's dismissal before navigating to its saved draft. Pending
  creation prevents duplicate activation and user dismissal; ordinary cancellation stays on the list.
- **Timeline:** show dependencies, parallel work and uncertainty without making elapsed time
  a biological readiness score. Editing links return to the corresponding Recipe step.

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
- Do not declare native behavior, AMOLED support or accessibility verified from source alone.
- Track work on individual GitHub issues and labels; this brief is not a second backlog.
