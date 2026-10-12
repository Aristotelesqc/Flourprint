---
version: alpha
name: Flourprint — Warm baking workspace
description: Audited light and warm-dark baseline, with guidance for the Material 3 exploration.
omitted:
  - section: typography
    reason: Ionic platform fonts and local text sizes remain; a unified role scale awaits the prototype.
colors:
  primary: '#a9490a'
  on-primary: '#ffffff'
  background: '#f8f7f4'
  surface: '#ffffff'
  on-surface: '#1c1b19'
  muted: '#69645c'
  outline: '#e4e0d8'
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
  dark-on-surface: '#e9e4dc'
  dark-muted: '#b1aa9f'
  dark-outline: '#3b3631'
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
  touch: 3rem
  card-padding: 1rem
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
[ADR 0017](docs/adr/0017-design-brief.md) and the
[current Gemini/Codex synthesis](docs/architecture/2026-10-12-ui-refresh.md).

**Status:** frontmatter records the current implementation at `dev` `399af6a`, not a generated
Material 3 palette or a claim of accessibility compliance. The prose below identifies retained
requirements and proposed component work. Material 3 is the exploration direction; replacement
of Ionic and a component library have not been selected. No runtime token generation exists.

## Colors

The current mappings in `apps/mobile/src/theme/app.css` are:

| Design role       | Runtime token | Light / dark frontmatter tokens                |
| ----------------- | ------------- | ---------------------------------------------- |
| Primary action    | `accent`      | `primary` / `dark-primary`                     |
| Action foreground | `on-accent`   | `on-primary` / `dark-on-primary`               |
| Page              | `bg`          | `background` / `dark-background`               |
| Content surface   | `surface`     | `surface` / `dark-surface`                     |
| Main text         | `ink`         | `on-surface` / `dark-on-surface`               |
| Secondary text    | `muted`       | `muted` / `dark-muted`                         |
| Divider           | `line`        | `outline` / `dark-outline`                     |
| Selector track    | `track`       | `track` / `dark-track`                         |
| Input outline     | `field`       | `field-outline` / `dark-field-outline`         |
| Input fill        | `field-bg`    | `field-background` / `dark-field-background`   |
| Text action       | `accent-text` | `action-text` / `dark-action-text`             |
| Soft accent       | `accent-soft` | `primary-container` / `dark-primary-container` |
| Error             | `alert`       | `error` / `dark-error`                         |

The `primary-container` names describe the existing translucent soft accents, not validated M3
tonal-container roles. Dark mode currently follows the system preference. Selectable AMOLED
is required work: use a black page foundation with warm accents and distinguishable surfaces;
exact values, selection/persistence and accessibility checks remain to be implemented.

For the M3 prototype, introduce semantic roles for selected state, container levels and status
only when they have concrete consumers. Evaluate actual foreground/background pairs, including
focus, outlines, disabled states and translucent blends. Do not silently replace warm accents
with a generic purple or blue palette. A palette snapshot alone does not prove contrast.

## Typography

The app currently inherits Ionic's platform font; text sizes vary by component. It uses tabular
numerals globally. A unified typography scale is intentionally absent from frontmatter rather
than pretending an unimplemented font or M3 type ramp is current.

The next component pass should name roles for page title, section title, body, value, label and
supporting text. Prioritize readable ingredient quantities, units and times. Use sentence case
for actions. Explanations can expand progressively; primary actions and essential labels must
remain visible. Keep FR/EN and larger text in the same layout evaluation. French instructions
use infinitives, as required by ADR 0009 and AGENTS.md.

## Layout

Use reusable sections and compact rows, with related values grouped together. Keep practical
recipe density without turning every line into a card. Existing `Card`/`Rows` use 1rem padding
and rounded corners; `--spacing-touch` is 3rem. These are current tokens, not proof every
existing control meets the target. Prototype touch actions with a 48px target wherever feasible;
compact glyphs may sit inside larger non-overlapping hit areas.

Recipe presents composition and authored method. Planning presents generated projections with
time controls and a shortcut to the single Recipe step editor. Preparation presents actual work.
Follow the contracts for semantics; do not build a second editable recipe inside Planning.

**Consultation/editing composition (#67):** saved recipes open for reading with explicit
Edit, Plan and Start actions. New or resumed drafts open for editing after hydration. Consultation
does not reserve an empty 88px draft footer. Once editing starts, first modification and validity
feedback keep the primary controls stable. A deliberate mode change may rearrange the screen;
retain understandable scroll/focus and preserve or guard all pending raw input.

The implementation uses `FormulaConsultation` and the precise formula editor, with one mounted
`ProcessSection` whose authoring controls depend on edit mode. Planner inputs survive mode changes.
`WeighingChecklist` shares temporary page state between views; changed quantities clear the affected
checks. The checklist survives panel/mode switches and raw-only discard, but is not saved to history
and resets when the page is recreated or the app reloads. Domain drafts persist accepted edits;
unparsed raw strings remain in mounted fields, not in the durable draft. A mode command blurs only
the focused field through its normal commit path, then checks synchronous draft/validation state.

Keep quantities and the temporary weighing checklist accessible. Clarify that checklist scope;
do not imply a recorded preparation or remove the aid while session persistence is unavailable.
No forced wizard is needed to start an existing recipe now. Planned time and actual start remain
distinct. Essential advanced features stay discoverable; complexity changes implementation slices.

## Elevation & Depth

Use warm tonal surfaces, separators and restrained elevation for hierarchy. Sheets sit above
the current workspace; selection and interactive state must remain clear without relying only
on color. Avoid decorating every value with a raised container. The eventual M3 elevation and
surface scale needs side-by-side evaluation in light, warm dark and AMOLED.

## Shapes

Current shared cards have a 1rem radius; segmented options use 0.75rem. Preserve coherent shapes
within each role. A proposed M3 shape scale should be introduced through shared components,
not independent radius choices on each page. Shapes alone do not establish an M3 implementation.

## Components

Extend the current `Field`, `Segmented`, `Card`, `Rows`, `InfoSheet` and `DraftActionBar` foundation.
The target is a reusable Flourprint component layer with consistent behavior and theme roles.

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
- **Timeline:** show dependencies, parallel work and uncertainty without making elapsed time
  a biological readiness score. Editing links return to the corresponding Recipe step.

Keep library and routing choices separate. The Ionic versus React/primitives prototype shares
the same composition, data, tokens and interaction cases; independently build the replacement
candidate when measuring shell cost. DESIGN.md does not select a dependency or migrate routes.

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
