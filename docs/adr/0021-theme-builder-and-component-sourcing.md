# ADR 0021: Theme builder, component sourcing, motion items and guides

Status: Proposed (owner request, 2026-10-17). Accepted when the owner merges it.

## Context

ADR 0019 chose shared Flourprint components over an external Material library and kept Ionic's
shell. ADR 0020 organized those components as a versioned library (`packages/ui`) that screens
call by id. The owner then set the direction for the library:

- an **in-house theme builder**;
- **existing ("stock") React components first**, custom ones only for what is not available;
- **Material 3 as the main design language**, with a **Flourprint identity layer** on top.

The owner also asked where Ionic fits, and asked for two more things:

- **animations as library items** in their own right, not CSS classes;
- **documentation built into the library** that tells agents what each item is and how to use
  it.

The [sourcing inventory](../architecture/2026-10-17-component-sourcing-inventory.md) checked
the options on 2026-10-17:

- no maintained React library implements Material 3. Material UI 9.5 still implements
  Material 2, and its Material 3 work is on hold;
- Material Web has been in maintenance mode since 2024;
- Ionic 9.0.6, already the app's shell, covers 19 of the 33 elements the 0.3 mockups need,
  nearly all the behaviour-heavy ones;
- the other elements are presentation over native HTML, apart from two open choices.

The owner also decided on 2026-10-17 that **Codex's current interface rebuild (#133) continues
on the ADR 0020 foundation**. The app migrates to this ADR's layering only once that rebuild has
landed. This ADR must not change what #133 builds now.

## Decision

### Four layers

| Layer                                        | Owns                                                                                                             | Source                                            |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| 1. Theme builder                             | Material 3 roles for colour, shape, type and motion; Flourprint identity overrides; Light, Dark and AMOLED       | In-house, in `packages/ui`                        |
| 2. Behaviour                                 | Navigation, back, transitions, overlays with gestures, pickers, keyboard and screen-reader behaviour of controls | Ionic first, then a headless library, then custom |
| 3. `fp.*` components and `fp.motion.*` items | Material 3 language plus Flourprint identity, applied over layer 2                                               | In-house, versioned (ADR 0020)                    |
| 4. Screens (layout engine)                   | Composition and data from `@flourprint/core`                                                                     | In-house                                          |

### Sourcing order for behaviour (layer 2)

1. **Ionic React**, already installed: navigation stack, page transitions, sheets
   (`IonModal` breakpoints), popovers, alerts, action sheets, toasts, accordions, checkboxes,
   toggles, radios, pickers, reorder, refresher and safe areas. Ionic is not the visual
   language: `fp.*` components style it through its CSS variables and parts, and screens never
   use Ionic elements directly.
2. **A headless (unstyled) React library**, only for a demonstrated case that Ionic does not
   meet, such as keyboard reordering across groups (#123). Each addition is its own pull request
   naming the case, under AGENTS.md's dependency rule. React Aria Components is the first
   candidate for its accessibility depth.
3. **Custom**, for presentation over native HTML: cards, pills, badges, summary, timeline, step
   rows and the Preparation hero.

No external styled component library (Material UI, Material Web or similar) is used. Material 3
enters as a language through layer 1 and layer 3. This confirms ADR 0019.

The library's import boundary from ADR 0020 widens accordingly. `packages/ui` may import React,
`@ionic/react` and `@ionic/core` (the app's versions), and any headless library accepted under
item 2. It still never imports `@flourprint/*`.

### Theme builder (layer 1)

- **Inputs**, in `packages/ui`, the only source of values as in ADR 0020:
  - Flourprint's source colours;
  - identity overrides that pin owner-approved values, for example Light primary `#a9490a`;
  - the AMOLED rules: black background and stepped warm surfaces;
  - shape, type scale and motion tokens.
- **Generation:** Google's **Material Color Utilities** (`@material/material-color-utilities`,
  pure TypeScript) derives the Material 3 tonal palettes and the full role set for Light and
  Dark: primary, secondary, tertiary, error, their `on-` and `container` roles, the surface
  container scale, outline and inverse roles. AMOLED is derived from Dark with the Flourprint
  overrides. This is the one new dependency this ADR accepts. Its need is shown by the
  inventory: three consistent themes whose role pairs keep their contrast, which hand-written
  values cannot guarantee.
- **Outputs**, generated and checked by `pnpm check`:
  - `--fp-*` variables named after Material 3 roles;
  - the Ionic bridge (`--ion-color-*`, `--ion-background-color` and the others), so Ionic
    elements follow the same theme;
  - the token sections of `DESIGN.md`.
- **Contrast:** a test checks every text and icon role pair against WCAG AA in all three themes
  (4.5:1 for text, 3:1 for large text and interface parts). A failing pair is fixed by an
  override, never by lowering the check.

Today's hand-written values (ADR 0020) stay in place until the builder reproduces them or the
owner approves a generated replacement in the catalogue.

### Motion items

- Each animation is a versioned library item, `fp.motion.<name>`, beside the components. Ids
  include `sheet-enter`, `sheet-exit`, `menu-enter`, `press`, `collapse`, `expand`, `check`,
  `step-done` and `tab-change`. Round 2's inventory becomes their `v1` (#134).
- An item gives its keyframes, its duration and easing by token name (`effect`, `spatial`,
  `sheet`; `standard`, `decelerate`) and a **required reduced-motion form**. An item without a
  reduced form does not type-check.
- Items are played through the Web Animations API, or handed to Ionic as custom enter and leave
  animations for sheets, popovers and page transitions. Components ask for a motion by id and
  never write transitions themselves.
- Reduced motion applies when the system asks for it or when `data-motion="reduced"` is set.
  DESIGN.md's limits hold: no rolling numbers, no fake progress, no action delayed behind an
  animation.
- The manifest selects motion versions as it selects component versions. The catalogue plays
  every motion in standard and reduced form.

### Guides built into the library

- Every component id and motion id carries a guide:
  - purpose;
  - when to use it and when not to;
  - its props;
  - its accessibility rules;
  - related ids;
  - the owner decisions that concern it, with links.
- The catalogue shows each guide beside the item's versions.
- An index for agents, `packages/ui/CATALOGUE.md`, is generated from the guides. A test fails
  when a guide is missing or empty, or when the index is out of date.
- `AGENTS.md` tells interface agents to read this index before using or adding an item.

### Migration

- Nothing here changes #133. Its components remain valid `v1` versions on the ADR 0020
  foundation.
- After #133 lands, the layering arrives as **new versions** in reviewed slices: Ionic-backed
  behaviour, generated roles, motion items and guides. The manifest switches each id when the
  owner approves the catalogue comparison.
- The app's screens then move onto the library in reviewed slices, as ADR 0020 planned.
- The owner sets the release for each slice.

### Alternatives considered

- **Material UI:** it implements Material 2; its Material 3 work is on hold, with no date.
- **Material Web:** in maintenance mode, and built as web components rather than React.
- **Replacing Ionic with a headless library and a router:** a large migration (stack,
  Android back, transitions, sheets) with no visible gain.
- **A headless library for every control:** more dependencies for behaviour that Ionic
  already provides.
- **Hand-written roles only (today):** workable for a few values, but the full Material 3 role
  set in three themes would drift and lose contrast without generation.

## Consequences

- `packages/ui` gains:
  - the theme builder and its contrast test;
  - the Ionic bridge;
  - motion items with a catalogue player;
  - guides with the generated agent index.

  Each comes in its own reviewed pull request, after this ADR is accepted.

- `@material/material-color-utilities` becomes a dependency of `packages/ui` only. A headless
  library is added only with a named case.
- The library may import Ionic. Its boundary test and lint rule change from "React only" to
  "React, Ionic and accepted headless libraries, never `@flourprint/*`".
- `DESIGN.md`'s token sections grow from today's names to the Material 3 role set when the
  builder lands. Its prose keeps the identity and composition rules (ADR 0017).
- Agents work from the guides and the index, not from screen code, to learn what a component
  is for. Reviews check that new items ship with their guide.
- This ADR selects no pictogram set (Ionicons or Material Symbols) and no segmented control
  source; both stay open in the inventory for the owner.
