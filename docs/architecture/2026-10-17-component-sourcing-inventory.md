# Component sourcing inventory — 2026-10-17

Status: evidence for [ADR 0021](../adr/0021-theme-builder-and-component-sourcing.md). This is not
an implementation plan for #133. Codex's current interface rebuild continues on the ADR 0020
foundation; the app migrates to the layering below only after that rebuild lands (owner,
2026-10-17).

## Question

The owner asked for an in-house theme builder:

- use existing ("stock") React components first;
- build custom components only where nothing suitable exists;
- Material 3 is the main design language, with a Flourprint identity layer on top.

The owner also asked where Ionic fits. This document lists every interface element the 0.3
mockups need and the source each one should come from.

## Facts checked on 2026-10-17

| Source                                                          | Version                                     | Status                                                                                                                                                                                                                                                                    | How checked                       |
| --------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- |
| Ionic (`@ionic/core`, `@ionic/react`)                           | 9.0.6, installed                            | Already the app's shell; 31 source files import it. Its 95 components are listed below.                                                                                                                                                                                   | `node_modules`, `apps/mobile/src` |
| Material UI (`@mui/material`)                                   | 9.5.0                                       | Material Design 3 is still not implemented. The tracking issue [mui/material-ui#29345](https://github.com/mui/material-ui/issues/29345) is open and "on hold", and was removed from the v8 milestone on 2026-01-12. A May 2026 comment says it is not expected this year. | npm registry, GitHub issue        |
| Material Web (`@material/web`)                                  | 2.5.0                                       | Maintenance mode since June 2024, with no new features or components planned ([discussion #5642](https://github.com/material-components/material-web/discussions/5642), [roadmap](https://github.com/material-components/material-web/blob/main/docs/roadmap.md))         | project pages                     |
| Material Color Utilities (`@material/material-color-utilities`) | 0.4.0 (2026-01-21)                          | Google's library that generates Material 3 tonal palettes and colour schemes from source colours. Pure TypeScript, no DOM.                                                                                                                                                | npm registry                      |
| React Aria Components                                           | 1.22.1 (2026-10-09)                         | Adobe. Accessible behaviour without styling, about 50 components, including keyboard drag and drop. Peer: React ≤ 19.                                                                                                                                                     | npm registry                      |
| Base UI (`@base-ui/react`)                                      | 1.9.0 (2026-10-09)                          | MUI/WorkOS. Unstyled components. Peer: React ≤ 19.                                                                                                                                                                                                                        | npm registry                      |
| Radix Primitives                                                | `@radix-ui/react-dialog` 1.3.1 (2026-10-14) | Still published. Reports conflict on how actively it is developed.                                                                                                                                                                                                        | npm registry                      |

**Conclusion.** No maintained React library implements Material 3 today. Material 3 therefore
reaches Flourprint as a **language**: colour roles, shape, type and motion, defined by our theme
builder and applied by our `fp.*` components. It does not come from an external Material
component library. This confirms the audit of 2026-10-11 (`docs/audits/2026-10-11-independent-review.md`).

## Ionic in the stack

Ionic 9 is already the platform and behaviour layer of this Capacitor app:

- the navigation stack and Android back button (`IonRouterOutlet`, `IonPage`, `IonBackButton`);
- page transitions;
- sheets with breakpoints and swipe (`IonModal`);
- anchored popovers that close on Escape or a tap outside;
- alerts, action sheets and toasts;
- safe areas and keyboard handling.

Rebuilding these would be a large migration with no visible gain.

Its default `md` styling is not Material 3. That does not matter: `fp.*` components style
Ionic elements through Ionic's CSS variables and shadow parts, and the screens never see Ionic
directly. Ionic also accepts custom enter and leave animations, which is where `fp.motion.*`
items plug in (ADR 0021).

Ionic 9.0.6 components: `accordion`, `accordion-group`, `action-sheet`, `alert`, `app`,
`avatar`, `back-button`, `backdrop`, `badge`, `breadcrumb(s)`, `button(s)`, `card` (+ content,
header, subtitle, title), `checkbox`, `chip`, `col/grid/row`, `content`, `datetime`,
`datetime-button`, `fab` (+ button, list), `footer`, `header`, `icon`, `img`,
`infinite-scroll`, `input`, `input-otp`, `input-password-toggle`, `item` (+ divider, group,
option(s), sliding), `label`, `list`, `list-header`, `loading`, `menu` (+ button, toggle),
`modal`, `nav`, `nav-link`, `note`, `picker` (+ column, option), `popover`, `progress-bar`,
`radio`, `radio-group`, `range`, `refresher`, `reorder`, `reorder-group`, `ripple-effect`,
`router` (+ link, outlet, route, redirect), `searchbar`, `segment` (+ button, content, view),
`select` (+ modal, option, popover), `skeleton-text`, `spinner`, `split-pane`, `tab`,
`tab-bar`, `tab-button`, `tabs`, `text`, `textarea`, `thumbnail`, `title`, `toast`, `toggle`,
`toolbar`.

## Inventory

Sources follow the order proposed in ADR 0021:

- **I**: Ionic, already installed;
- **H**: a headless library, added only for a demonstrated case;
- **C**: custom.

"Presentation" means the element is styling and layout over native HTML, with no behaviour
worth importing.

| Element (proposed id)                                                        | Used by                            | Source    | Basis                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------- | ---------------------------------- | --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page shell, navigation stack, back (`fp.page`)                               | every screen                       | I         | `IonPage`, `IonRouterOutlet`, `IonBackButton`, Android back via Capacitor                                                                                                                                   |
| Top app bar (`fp.top-app-bar`)                                               | Recipe, Library                    | I         | `IonHeader`, `IonToolbar`, `IonButtons`, `IonTitle`. Titles wrap, never break mid-word (#134).                                                                                                              |
| Bottom action bar, option A (`fp.bottom-bar`)                                | #112 A                             | I         | `IonFooter`, `IonToolbar`                                                                                                                                                                                   |
| Navigation bar, option B (`fp.navigation-bar`)                               | #112 B                             | I         | `IonTabs`, `IonTabBar`, `IonTabButton`. Tabs mean separate stacks, which is a routing decision for #112.                                                                                                    |
| Buttons: filled, tonal, outlined, text, icon (`fp.button`, `fp.icon-button`) | everywhere                         | I         | `IonButton` (`solid`, `outline`, `clear`) with ripple. The tonal role is styled by us.                                                                                                                      |
| Section tabs and segmented control (`fp.segmented`)                          | Recipe, Steps / Timeline           | I or C    | `IonSegment`, `IonSegmentView`. The app's own `Segmented` reflows labels at large text; keep it unless `IonSegment` matches at 360 px / 130 %.                                                              |
| Search field (`fp.search-field`)                                             | Library                            | I         | `IonSearchbar`                                                                                                                                                                                              |
| Filter chips (`fp.filter-chip`)                                              | Library                            | C         | `IonChip` has no selected state. A native `<button aria-pressed>` group is enough.                                                                                                                          |
| Status badge (`fp.status-badge`)                                             | Library, Recipe                    | C         | presentation                                                                                                                                                                                                |
| Metric pill (`fp.metric-pill`)                                               | Library cards                      | C         | presentation                                                                                                                                                                                                |
| Recipe card (`fp.recipe-card`)                                               | Library                            | C         | presentation over a native button or link                                                                                                                                                                   |
| Summary card and metric tiles (`fp.summary-card`)                            | Recipe                             | C         | presentation                                                                                                                                                                                                |
| Notice banner (`fp.notice`)                                                  | Recipe, fermentation               | C         | presentation with `role="status"` where it updates                                                                                                                                                          |
| Disclosure group (`fp.disclosure`)                                           | ingredient groups, totals, steps   | I         | `IonAccordionGroup`, `IonAccordion`: keyboard support and animation built in                                                                                                                                |
| Ingredient row with weighing check (`fp.ingredient-row`)                     | Recipe                             | I + C     | `IonItem` + `IonCheckbox`, which are keyboard-operable (Argon's span checkbox was not, #134). The layout is ours.                                                                                           |
| Gram field (`fp.quantity-field`)                                             | edit mode                          | C         | Keep the app's `Field`: raw input, parsing and validation registry (DESIGN.md). `IonInput` does not carry those rules.                                                                                      |
| Step row and timing pills (`fp.step-row`)                                    | Steps                              | C         | presentation                                                                                                                                                                                                |
| Reorder (`fp.reorder`)                                                       | Steps (#123)                       | I, then H | `IonReorderGroup` for drag. Moving across groups and keyboard reordering are the first **demonstrated case** for a headless library (React Aria drag and drop), unless the up/down buttons alone meet #123. |
| Timeline lanes (`fp.timeline`)                                               | Timeline, Planning                 | C         | SVG or CSS lanes drawn from the core projection (#100, #106)                                                                                                                                                |
| Overflow menu (`fp.menu`)                                                    | Recipe, Library                    | I         | `IonPopover` anchored to its trigger, with Escape and outside dismissal and focus handling                                                                                                                  |
| Bottom sheet (`fp.sheet`)                                                    | hydration detail, template chooser | I         | `IonModal` with breakpoints. Sits at the bottom of the viewport, unlike Argon's (#134).                                                                                                                     |
| Confirmation dialog (`fp.confirm`)                                           | trash, discard                     | I         | `useIonAlert` (already used)                                                                                                                                                                                |
| Undo snackbar (`fp.snackbar`)                                                | trash undo (#75, #76)              | I         | `useIonToast` with an action button                                                                                                                                                                         |
| Action sheet (`fp.action-sheet`)                                             | finish split                       | I         | `useIonActionSheet` (already used)                                                                                                                                                                          |
| Date and time picker (`fp.datetime`)                                         | Planning target                    | I         | `IonDatetime`, `IonDatetimeButton`                                                                                                                                                                          |
| Toggle, radio group (`fp.toggle`, `fp.radio-group`)                          | Settings, theme choice             | I         | `IonToggle`, `IonRadioGroup`                                                                                                                                                                                |
| Preparation hero and timer (`fp.prep-step`)                                  | Preparation                        | C         | presentation with tabular figures; `IonProgressBar` for progress                                                                                                                                            |
| Progress (`fp.progress`)                                                     | Preparation                        | I         | `IonProgressBar`                                                                                                                                                                                            |
| Pull to refresh                                                              | lists                              | I         | `IonRefresher` (already used)                                                                                                                                                                               |
| Loading placeholder (`fp.skeleton`)                                          | lists                              | I         | `IonSkeletonText`                                                                                                                                                                                           |
| Build identity chip (`fp.build-label`)                                       | Library, Settings                  | C         | a native button that copies the label (#131)                                                                                                                                                                |
| Empty state (`fp.empty-state`)                                               | lists                              | C         | presentation                                                                                                                                                                                                |
| Pictograms (`fp.icon`)                                                       | everywhere                         | open      | Ionic ships Ionicons. The Material 3 language uses Material Symbols (Apache 2.0). Choosing the set is an owner decision; the `fp.icon` id stays stable either way.                                          |

## Summary

The inventory lists 33 elements.

- **Ionic: 19 elements**, nearly all the behaviour-heavy ones: navigation, overlays, pickers,
  accordions, checkboxes, reorder.
- **Custom: 12 elements**, all presentation over native HTML: cards, pills, badges, summary,
  timeline, step rows, preparation hero. This is where Material 3 and the Flourprint identity
  show.
- **Open:** the segmented control (Ionic or the app's own) and the pictogram set.
- **Headless library: none needed today.** One candidate case: keyboard reorder across groups
  for #123. It is added only if that case is confirmed, with its own pull request.
- **Theme builder:** generate the Material 3 colour roles from Flourprint source colours with
  Material Color Utilities, apply the Flourprint overrides, and emit our `--fp-*` variables and
  Ionic's `--ion-*` variables from the same source. This is the one new dependency proposed,
  and it needs owner acceptance in ADR 0021.
