# ADR 0021: Theme builder, component sourcing, motion items and guides

Status: Proposed (owner request, 2026-10-17). Accepted when the owner merges it.

Relation to earlier ADRs:

- **Extends ADR 0020.** It widens the library's tested import boundary and adds motion items
  and guides to the versioned library.
- **Amends ADR 0019.** ADR 0019 selected "no new dependency or broad motion system" for its
  tranche and asked for separate demonstrated needs; this ADR is that separate decision, for
  one build-time dependency and for motion items.
- **Rewrites neither.** On acceptance, the ADR index marks 0019 and 0020 "amended by 0021", as
  0008 is marked for 0010.

## Context

ADR 0019 chose shared Flourprint components over an external Material library and kept Ionic's
shell. ADR 0020 organized those components as a versioned library (`packages/ui`) that screens
call by id. The owner then set the direction for the library:

- an **in-house theme builder**;
- **existing ("stock") React components first**, custom ones only for what is not available;
- **Material 3 as the main design language**, with a **Flourprint identity layer** on top.

The owner also asked where Ionic fits, and asked for two more things:

- **animations as library items** in their own right, not CSS classes. The evidence is round 2's
  motion inventory, which the owner asked to keep (#134), and round 3's loss of most of it;
- **documentation built into the library** that tells agents what each item is and how to use
  it.

The [sourcing inventory](../architecture/2026-10-17-component-sourcing-inventory.md) checked
the options on 2026-10-17. It is a desk survey of documentation, packages and the app's code,
not a measured comparison at 360 px with 130 % text (ADR 0017):

- no maintained React library implements Material 3. Material UI 9.5 still implements
  Material 2, and its Material 3 work is on hold;
- Material Web has been in maintenance mode, with no new components planned, since June 2024;
- Ionic 9.0.6, already the app's shell, provides 19 of the 33 elements the 0.3 mockups need,
  nearly all the behaviour-heavy ones. Two of those 19 are partly custom: the ingredient row's
  layout, and keyboard reordering;
- the 12 custom elements are mostly presentation over native HTML. A few carry app-specific
  behaviour: the quantity field's raw input, the copyable build label and the timeline drawing;
- the segmented control and the pictogram set are open choices.

The owner also decided on 2026-10-17 that **Codex's current interface rebuild (#133) continues
on the ADR 0020 foundation**. The app migrates to this ADR's layering only once that rebuild has
landed. This ADR must not change what #133 builds now.

## Decision

### Four layers

| Layer                                        | Owns                                                                                                             | Source                                                |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| 1. Theme builder                             | Material 3 roles for colour, shape, type and motion; Flourprint identity overrides; Light, Dark and AMOLED       | In-house, in `packages/ui`                            |
| 2. Behaviour                                 | Navigation, back, transitions, overlays with gestures, pickers, keyboard and screen-reader behaviour of controls | Ionic first, then a headless library, then custom     |
| 3. `fp.*` components and `fp.motion.*` items | Material 3 language plus Flourprint identity, applied over layer 2                                               | In-house, versioned (ADR 0020)                        |
| 4. Screens (layout engine)                   | Composition, routing and data from `@flourprint/core`                                                            | In-house, in `apps/mobile` (routing stays in the app) |

### Sourcing order for behaviour (layer 2)

1. **Ionic React**, already installed: page transitions, sheets (`IonModal` breakpoints),
   popovers, alerts, action sheets, toasts, accordions, checkboxes, toggles, radios, pickers,
   drag reorder, refresher and safe areas. Routing (`IonRouterOutlet`, `@ionic/react-router`)
   stays in the app's layout layer, not in the library. Ionic is not the visual language:
   `fp.*` components style it through its CSS variables and parts. **After migration**, screens
   use Ionic elements only through `fp.*` components. Today's screens use them directly, and
   that stays valid until each screen migrates.
2. **A headless (unstyled) React library**, only for a demonstrated case that Ionic does not
   meet. Each addition is its own pull request naming the case and its evidence, under
   AGENTS.md's dependency rule. **Candidate, not yet demonstrated:** keyboard reordering across
   groups (#123); Ionic's reorder has no keyboard handling, unless up/down buttons alone meet
   #123. No library is named here: the choice comes with the demonstrated case and its own
   comparison (ADR 0017).
3. **Custom** for the rest: cards, pills, badges, summary, timeline, step rows, the Preparation
   hero, the quantity field (the app's raw-input `Field`) and the build label.

No external styled component library (Material UI, Material Web or similar) is used. Material 3
enters as a language through layer 1 and layer 3, which keeps ADR 0019's choice.

**Import boundary.** ADR 0020 already lets a library component wrap an Ionic element. The
"React only" rule lives in the library's README and in its boundary test, not in ADR 0020; the
ESLint rule only forbids `node:*` and `@flourprint/*`. When the first Ionic-backed version
lands:

- the boundary test and README allow `@ionic/react` and any headless library accepted under
  item 2;
- `@ionic/react` becomes a peer dependency of `packages/ui`, at the app's version. The library
  takes Ionic utilities such as `createAnimation` from `@ionic/react` and never imports
  `@ionic/core` directly;
- the catalogue page and the release-bundle test gain the Ionic setup (`setupIonicReact` and
  Ionic CSS) they currently lack.

The library still never imports `@flourprint/*`.

### Theme builder (layer 1)

- **Source of values.** `packages/ui/src/tokens.ts` remains the only source, as in ADR 0020.
  Its colour section changes from final values to **builder inputs**:
  - Flourprint's source colours;
  - **pinned roles**, which the builder never changes: owner-approved values such as Light
    primary `#a9490a` and Dark and AMOLED primary `#cf8a5e`; the AMOLED black background and
    stepped warm surfaces (ADR 0019); and today's translucent soft accents;
  - shape, type scale and motion tokens, unchanged.
- **Naming.** The translucent soft accents keep a Flourprint name such as `accent-soft`. Their
  current names (`primary-container` and the like) are not Material 3 roles, as DESIGN.md
  already notes. The Material 3 `primary-container` role is the opaque tonal container that the
  builder generates. This renaming happens in the builder's own pull request, together with the
  matching DESIGN.md change.
- **Generation.** At build and check time only, Google's **Material Color Utilities**
  (`@material/material-color-utilities`, pure TypeScript) derives every role that is not pinned,
  for Light and Dark:
  - secondary, tertiary and error, with their `on-` and `container` roles;
  - the surface container scale, `on-surface-variant`, `outline-variant` and the inverse roles.

  AMOLED is Dark with its pinned surfaces.

- **Why a dependency.** The full role set is about 30 roles in each of three themes, around 90
  values. They must stay tonally coherent with Flourprint's colours when a source colour
  changes. The contrast test below only detects a bad pair; it cannot produce a coherent
  replacement, and hand-picking 90 values would drift. The library is a **devDependency** of
  `packages/ui`. It ships in no bundle and is pinned in the builder's pull request (0.4.0 as of
  2026-10-17).
- **Outputs**, generated and checked by `pnpm check`, extending ADR 0020's generator:
  - `--fp-*` variables named after Material 3 roles plus the Flourprint names;
  - the Ionic bridge (`--ion-color-*`, `--ion-background-color` and the others), so Ionic
    elements follow the same theme;
  - the token sections of `DESIGN.md`. ADR 0020 already made `DESIGN.md`'s front matter
    generated, against ADR 0019's "not a CSS generator"; this keeps that.
- **Contrast.** A test checks every text and icon role pair against WCAG AA in all three themes
  (4.5:1 for text, 3:1 for large text and interface parts). A failing pair is fixed by pinning a
  value, never by lowering the check.

Today's values stay in place until the owner approves the generated roles in the catalogue.

### Motion items

- Each animation is a versioned library item, `fp.motion.<name>`. Motion ids form their own
  typed set, separate from component ids. Ids include `sheet-enter`, `sheet-exit`,
  `menu-enter`, `press`, `check`, `disclosure`, `step-done` and `tab-change`. Round 2's
  inventory becomes their `v1` (#134).
- **What a motion item is.** It is data, not a React component, so it has no props type.
  - It gives its keyframes or transitioned properties, its duration and easing by token name
    (`effect`, `spatial`, `sheet`; `standard`, `decelerate`), and a **required reduced-motion
    form**. An item without a reduced form does not type-check.
  - The same item plays through the Web Animations API, or becomes an Ionic enter or leave
    animation through a bridge that builds Ionic's animation object from it.
  - Components ask for a motion by id and never write transitions themselves.
- **Selection.** A **motion manifest**, separate from the component manifest and built the same
  way, selects one version per motion id.
  - A release build imports only the manifest's versions.
  - Comparison builds may load the motion catalogue behind the same flag as for components, and
    `?ui=fp.motion.<id>:v2` overrides a motion.
  - The catalogue plays every motion in standard and reduced form.
- **Reduced motion** applies when the system asks for it or when `data-motion="reduced"` is set.
  DESIGN.md's limits hold: no rolling numbers, no fake progress, no action delayed behind an
  animation.

### Guides built into the library

- Every component id and motion id carries a guide:
  - purpose;
  - when to use it and when not to;
  - every prop;
  - its accessibility rules;
  - related ids;
  - the owner decisions that concern it, with links.
- The catalogue shows each guide beside the item's versions.
- An index for agents, `packages/ui/CATALOGUE.md`, is generated from the guides. A test fails
  when a guide is missing or empty, or when the index is out of date.
- `AGENTS.md` tells interface agents to read this index before using or adding an item.

### Responsibilities

As in ADR 0020 and AGENTS.md (one writer per file set):

- **Claude** owns the mechanisms:
  - the theme builder and its contrast test;
  - the Ionic bridge;
  - the motion-item and guide mechanisms, with their generated index;
  - the boundary test, plus the catalogue and bundle checks.
- **The interface writers (Gemini under Codex)** own:
  - components and their versions, including Ionic-backed versions;
  - motion versions beyond round 2's `v1`;
  - the content of component guides.

Mechanism pull requests touch `packages/ui` outside `src/components/` and do not edit
components.

### Migration

- Nothing here changes #133. Its components remain valid `v1` versions on the ADR 0020
  foundation.
- **Mechanism pull requests** (motion items and guides, then the theme builder and the Ionic
  bridge) are prepared now. They merge only after #133 has landed and the owner starts the
  migration, so they never move the library under an active writer.
- The layering then arrives as **new versions** in reviewed slices. The manifest switches each
  id when the owner approves the catalogue comparison.
- The app's screens move onto the library in reviewed slices, as ADR 0020 planned.
- Each slice is tracked as a sub-issue of #35 with its own acceptance. The owner sets the
  release for each slice.

### Alternatives considered

- **Material UI:** it implements Material 2; its Material 3 work is on hold, with no date.
- **Material Web:** in maintenance mode, and built as web components rather than React.
- **Replacing Ionic with a headless library and a router:** a large migration (stack,
  Android back, transitions, sheets) with no visible gain.
- **A headless library for every control:** more dependencies for behaviour that Ionic
  already provides.
- **Hand-written roles only (today):** workable for a dozen values. The full Material 3 role set
  in three themes needs a generator to stay tonally coherent; the contrast test alone only
  reports failures.

## Consequences

- `packages/ui` gains the mechanisms listed under Responsibilities, each in its own reviewed
  pull request, merged only after this ADR is accepted and #133 has landed.
- `@material/material-color-utilities` becomes a build-time devDependency of `packages/ui`.
  `@ionic/react` becomes a peer dependency when the first Ionic-backed version lands. A headless
  library is added only with a demonstrated case.
- The boundary test and README change from "React only" to "React, `@ionic/react` and accepted
  headless libraries, never `@flourprint/*`".
- On acceptance, the ADR index marks 0019 and 0020 "amended by 0021".
- `DESIGN.md`'s token sections grow to the Material 3 role set plus the Flourprint names when
  the builder lands. Its prose keeps the identity and composition rules (ADR 0017).
- Agents work from the guides and the index, not from screen code, to learn what an item is
  for. Reviews check that new items ship with their guide.
- This ADR selects no pictogram set (Ionicons or Material Symbols) and no segmented control
  source; both stay open in the inventory for the owner.
