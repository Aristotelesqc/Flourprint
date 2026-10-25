# ADR 0022: Port the interface into the app, styled with Tailwind CSS v4

Status: Accepted (owner, 2026-10-25).

Relation to earlier ADRs:

- **Amends ADR 0021.** It replaces 0021's migration plan ("Migration") and applies the sourcing
  order to the port. The four layers, the theme builder's role set, the elevation rule, motion
  items and guides stand.
- **Applies ADR 0002.** Tailwind CSS v4 is already the chosen styling approach; this ADR makes
  it the way `packages/ui` and the screens are written.
- **References ADR 0019 and ADR 0020.** Material 3 presentation through shared components, and
  the versioned `fp.*` library, are unchanged in intent; only the styling mechanism changes.

## Context

The 0.3 interface was explored in mockups (`docs/mockups/0.3-ux`, PR #133) over several rounds and
audited independently at 0d63eb4, 0dac703 and e7aaad3 (reports on issue #167, for #133 at head `e7aaad3`).
The proof of concept is done: the mockup is the visual and behavioural reference, and the audits
list what remains to fix.

Keeping the work in a mockup now costs more than it returns. The e7aaad3 reviews found
that the mockup carries its own parallel session model, its own arithmetic and its own
string handling, so several defects are mockup plumbing rather than product behaviour, and each
fix there must be redone in the app.

ADR 0002 chose Tailwind CSS v4 "with a shared theme" for the mobile app. No ADR decided that the
component library should avoid Tailwind. `packages/ui` nevertheless grew as plain CSS: per-version
stylesheets keyed on data attributes, a generated `tokens.css`, and a hand-written `components.css`
with a second alias vocabulary. This was an implementation drift, not a decision. It left about
twenty variables referenced but undefined and two un-generated naming systems, and it makes
component names and class names harder to follow.

## Decision

### 1. Stop the mockups; port into `apps/mobile`

- Work on the 0.3 mockups stops. PR #133 is frozen as the visual and behavioural reference and is
  closed without merging. Its branch and the hosted review gallery
  (`https://aristotelesqc.github.io/Flourprint/review-2026-10-24-audit-corrections/`) remain the
  reference.
- The interface is ported into `apps/mobile` on `dev`, screen by screen. Remaining defects are
  fixed there, in production code (acceptance criteria L128 to L144 in
  [docs/ux/requirements.md](../ux/requirements.md)).

### 2. Tailwind CSS v4 is the styling approach

- Components in `packages/ui` and screens in `apps/mobile` are written with Tailwind utility
  classes. Component and screen CSS class systems are not hand-written. The current
  `packages/ui` `components.css` and the mockup's CSS are not carried over.
- Design tokens are declared in Tailwind's theme (`@theme`), so utilities such as `bg-surface`,
  `text-primary` and `rounded-card` exist, with light, dark and AMOLED themes. This is how
  Tailwind v4 defines the palette; it is not a compatibility layer over the old CSS.
  `tokens.ts` remains the source of values (ADR 0020, ADR 0021), and its generator emits the
  `@theme` block.
- Styling follows this order, and each step is used only when the previous one cannot express
  the need:
  1. Tailwind utility classes.
  2. An arbitrary value (for example `grid-cols-[1fr_auto]`) or a small custom utility declared
     with `@utility`.
  3. A React component with its variants: the component is the abstraction that groups its
     utilities (a `<Button variant="primary">`, not a `.btn-primary` class).
  4. A shared meta-class that composes Tailwind utilities, only for a cross-cutting pattern that
     belongs to no single component (for example `touch-target`, `focus-ring`), or for markup
     the code does not render itself (Ionic parts, rich text). Meta-classes live in one library
     file, are named after the pattern, and are never specific to one screen.
  5. Hand-written CSS, only when Tailwind does not offer exactly the property needed (for
     example certain keyframes, Ionic part or shadow overrides). Each such rule carries a
     comment naming the missing Tailwind capability and the Tailwind version checked.
- Hand-written CSS and meta-classes are temporary by design. Every later revision of the code
  that touches them, and every Tailwind upgrade, checks whether Tailwind now covers the need
  and, if so, replaces them with utilities.
- The library emits no global element selectors and redefines no `:root` variables outside the
  generated theme.
- An automated check in `pnpm check` refuses new component or screen CSS files outside an
  allowlist: the generated theme, the meta-class file and the file of justified exceptions.

### 3. Binding rules for the port

- **Text.** All UI text goes through `react-intl`, the app's existing i18n (ADR 0009), with ICU
  plurals and no string concatenation.
- **Overlays and controls.** Sheets, menus, popovers and selects use Ionic components, following
  the sourcing order of ADR 0021. A native `<dialog>` is not re-implemented.
- **Domain.** All domain math, projections and bake or formula commands go through
  `packages/core`: no local arithmetic, no parallel session state. Engine refusals are shown
  with the engine's reason.
- **Structure and tests.** Screens are split into small components. Tests assert behaviour
  through roles and labels; geometry thresholds come only from `DESIGN.md` values.
- **Lint.** ESLint gains `react-hooks` and `jsx-a11y`.

### 4. Migration order

| Step | Slice               | Content                                                                                                                                         |
| ---- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| a    | `packages/ui` base  | Tailwind v4 foundation: tokens in `@theme` (three themes), shared components rewritten with utilities, global CSS removed, CSS-file check added |
| b    | Recipe              | One document: summary, ingredients, per-stage weighing, steps (L108)                                                                            |
| c    | Planning            | The generated, time-focused view (L75)                                                                                                          |
| d    | Preparation         | The active-step screen and journal (L127)                                                                                                       |
| e    | History and Library | History, then Library with its cards and search                                                                                                 |

Each slice is a reviewed pull request into `dev`, tracked as a sub-issue of #35 with its own
acceptance, checked against the ledger in `docs/ux/requirements.md`. The owner sets the release
for each slice. The manifest and catalogue mechanisms of ADR 0020 and ADR 0021 keep working
throughout.

## Consequences

- `packages/ui` is rewritten in step (a) before any screen moves; until then no screen slice
  starts. `tailwindcss` is already a dependency (ADR 0002), so no dependency is added.
- The generator in `scripts/ui-tokens.mjs` gains an `@theme` output; `tokens.css` and the
  `--fp-*` variable names are replaced by theme variables, with the Ionic bridge (ADR 0021)
  following the same source.
- ADR 0021's drift scans are re-expressed for utilities: no raw colour, length or shadow value
  outside the theme, and motion still comes from `fp.motion.*` items.
- ADR 0021's "after migration, no Ionic import in screens outside `fp.*` components" holds once
  the slices have landed.
- The mockup tree stays in the repository as a reference until the owner decides otherwise; it is
  not maintained.
- Visual regressions are caught by behaviour tests and by comparison with the frozen reference,
  not by a mockup gallery.
- On acceptance, the ADR index marks 0021 "amended by 0022" (already shown here) and
  `docs/ux/requirements.md` L128 and L129 stand as owner decisions.

## Alternatives considered

- **Keep the plain-CSS library.** It works, but it is the drift described above, and it keeps a
  second naming system between components and utilities.
- **Continue in the mockup, then port.** It repeats each fix twice and keeps a parallel model of
  the engine in the mockup.
- **Compatibility layer mapping old CSS classes to utilities.** It would keep the old class
  vocabulary alive; the owner chose to define the palette directly in Tailwind's theme.
