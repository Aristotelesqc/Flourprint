# ADR 0020: Versioned component library called by the layout engine

Status: Proposed (owner request, 2026-10-17,
[#134](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228731936)).
Accepted when the owner merges it.

## Context

Each mockup round for the 0.3 interface (#120, #133) rewrote its screens and styles from scratch.
Round 3 kept working engine calls but lost most of round 2's visual language and motion; nothing
tied a component to the screens that used it, so the loss went unnoticed until the owner compared
renders. The production app has shared components in `apps/mobile/src/ui/`, but a screen
imports a component's code directly: changing a component's look means editing it in place for
every screen, and trying an alternative means editing the screens that call it.

The owner asked for a library of reusable interface elements built for fast iteration: the
layout engine calls elements from the library without supplying their code, a single component
can be targeted and updated quickly, and switching a component's version happens in the layout
engine without touching the library. Library and layout have distinct responsibilities and are
managed separately.

ADR 0001 already reserves `packages/ui` for "Flourprint tokens and blocks (no baking math)".
ADR 0019 chose shared Flourprint components over an external Material library and kept Ionic's
shell, navigation and overlays. ADR 0017 makes `DESIGN.md` the presentation brief. This ADR
defines how those shared components are organized, versioned and selected.

## Decision

### Two layers

| Layer             | Location                           | Owns                                                                                                   |
| ----------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Component library | `packages/ui` (`@flourprint/ui`)   | Components, their versions, design tokens, motion tokens, catalogue examples                           |
| Layout engine     | `apps/mobile` screens, and mockups | Which components appear where, layout between them, data from `@flourprint/core`, the version manifest |

- The library imports neither `@flourprint/core` nor `@flourprint/adapters`. Components receive
  display-ready values: localized text, formatted quantities, states and callbacks. Mapping
  domain results to props belongs to the layout engine, so the library cannot do baking math
  (AGENTS.md) and does not change when the engine does.
- The library holds no user-facing text of its own. Text arrives through props from the layout
  engine's message keys (ADR 0009). Catalogue examples may use fixed sample text.
- The layout engine does not style a component's inside. Layout-only rules stay with the
  screens: placement, gaps between components and page structure.
- Ionic navigation, overlays and the platform shell remain as in ADR 0019. A library component
  may wrap an Ionic element.

### Identity and versions

- Each component has a stable id, `fp.<name>` (for example `fp.recipe-card`,
  `fp.bottom-sheet`, `fp.ingredient-row`), and one or more versions `v1`, `v2`, … kept side by
  side in `packages/ui/src/components/<name>/`.
- All versions of an id implement the **same props type**. This is what makes a version switch
  a one-line change.
  - Adding an optional prop is allowed: older versions may ignore it.
  - An incompatible props change updates every version of the id in one reviewed change, or
    creates a new id.
- Each version exports its catalogue examples: variants, states (default, pressed, selected,
  disabled, error, loading as relevant) and short notes on what changed from the previous
  version.
- A version selected by the manifest on `main` is frozen. Further changes go into a new
  version, so a release can always return to what it shipped. A version not yet selected on
  `main` may be edited freely while it is iterated on.
- A version that no manifest on `main`, `dev` or `canary` selects can be deleted.

### Registry and manifest

- `@flourprint/ui` exports a typed registry that maps each id to its versions.
- The layout engine renders a component by id, through one typed entry point (for example
  `<Ui id="fp.recipe-card" … />`). TypeScript checks the props against the id's props type.
  There is no string-typed lookup and no runtime plugin or remote loading.
- Each consumer has a **version manifest**, a typed map from id to version: `apps/mobile` has
  one, and each mockup has its own. The type check fails if the manifest names a version that
  does not exist, or if an id used by a screen has no entry.
- Switching a component's version means changing its manifest entry. The screens and the
  library are not edited.
- Release builds contain only the versions their manifest selects. Builds for development,
  `dev`, `canary` and pull request previews may contain every version and accept a temporary
  override for comparison:
  - a `ui` URL parameter, for example `?ui=fp.recipe-card:v2`;
  - the desktop dev shell's Debug menu (ADR 0011, #113).

  An override is never persisted in user data or in a recipe or preparation snapshot.

### Catalogue

The catalogue is generated from the registry, not written separately. It shows every id and
every version side by side:

- with its examples;
- in Light, Dark and AMOLED;
- at 393 px and at 360 px with 130 % text;
- with its motion, and in reduced motion.

It is published with the web preview and with mockup galleries, so owner reviews compare
versions of one component rather than whole rewritten screens. `DESIGN.md` points to it for
current component guidance.

### Tokens, motion and DESIGN.md

Today `DESIGN.md`'s front matter and `apps/mobile/src/theme/app.css` both hold the token values,
synchronized by hand. Each piece of information now has one home:

| Information                                                                                                           | Home                                                                       | `DESIGN.md` role                                                                                                                              |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Token values: colour per theme, shape, spacing, type, motion durations and easing                                     | A token module in `packages/ui`, the only source the components read       | Its front matter is **generated** from that module by a script. `pnpm check` fails when they differ, so the brief never contradicts the code. |
| Identity, principles, screen composition, do's and don'ts, motion direction                                           | `DESIGN.md` body (ADR 0017)                                                | Unchanged: written by people, reviewed with presentation changes                                                                              |
| Behavioral rules of a component, such as keeping raw input, focus return, destructive separation or touch-target size | `DESIGN.md` "Components" section, one entry per component id (`fp.<name>`) | Rules every version must meet; the entry links the component in the catalogue                                                                 |
| What a given version looks like and what changed from the previous one                                                | The version's catalogue notes in `packages/ui`                             | Not repeated in `DESIGN.md`                                                                                                                   |

A new version therefore changes `DESIGN.md` only if it changes a rule or a token. A new token
value is changed once, in the token module, and the generated front matter follows.

Motion follows `DESIGN.md`'s motion direction and the reviewed exploration in
`docs/architecture/2026-10-12-motion-exploration.md`. Reduced motion is a required state of
every animated component, not an option of the screen.

### Responsibilities

- **Components, their versions and the screens** belong to the interface writers, as AGENTS.md
  assigns them (#35: Gemini under Codex), one writer at a time per file set.
- **The registry and manifest mechanism and the catalogue build** belong to Claude unless the
  owner assigns them otherwise:
  - the type checks;
  - the architecture test that keeps `packages/ui` free of `@flourprint/core` and
    `@flourprint/adapters`;
  - the release-bundle test;
  - the CI publication of the catalogue.
- A change to a component and a change to a screen are separate pull requests where practical.
  The catalogue diff reviews the first, before/after captures of the screen review the second.

### Alternatives considered

- **Shared components imported directly (current state).** Simple, but every alternative look
  means editing call sites, and nothing keeps mockups and app on the same components.
- **Runtime plugin or remote component loading.** Rejected: the app works offline, loses type
  checks, and would execute code that the release did not review.
- **Storybook or another catalogue tool.** Deferred by ADR 0002. A generated catalogue page
  needs no dependency; this can be revisited with a demonstrated need.
- **Feature flags per component in user settings.** Rejected: a version choice is a product
  decision made in review, not a user preference.

No new dependency is introduced.

## Consequences

- `packages/ui` is created as a workspace package. `apps/mobile/src/ui/` moves into it in
  reviewed slices, each component as its `v1`, with unchanged screens and passing browser
  suites at every step.
- The consolidated mockup rebuild (#133, #134) is structured this way, so its components become
  the library's first versions instead of another throwaway rewrite. Mockups and app then
  render the same components, and a mockup round becomes a set of new versions plus manifest
  changes.
- New checks:
  - a unit test that every manifest entry resolves and every id used by a screen has an entry;
  - an architecture test for the library's import boundary;
  - a test that the release bundle excludes unselected versions;
  - a catalogue render check in the browser suite;
  - a check that `DESIGN.md`'s front matter matches the generated token values.
- `DESIGN.md`'s "Components" section is reorganized by component id when the library lands,
  keeping today's behavioral rules; screen-specific CSS class names leave it.
- The indirection adds one lookup per component and a manifest to maintain. Reviews must check
  that layout code does not reach into a component's internals, or the separation erodes.
- Owner approval of a component version establishes a baseline. It does not forbid a later
  version. Older versions remain available for comparison until deleted under the rule above.
- This ADR does not select visual designs, ship a component or mark #35, #120 or #134 complete.
