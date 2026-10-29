# Flourprint library index

<!-- Generated from packages/ui guides and catalogues. Do not edit: run pnpm ui:index. -->

Read this before using or adding a library item (ADR 0020, ADR 0021). Screens render
components by id and never style their insides; components ask for motions by id and never
write transitions. Every item has a guide; a new item or version ships with its guide.

## Components

### `fp.bottom-bar`

The bottom area of a screen: navigation A selects the contextual toolbar as a contextual toolbar (L101).

**Use when**

- Once per screen, at the bottom.

**Avoid when**

- Actions inside a sheet or a menu: put them in that component's footer.

**Props**

| Prop              | Meaning                                                                             |
| ----------------- | ----------------------------------------------------------------------------------- |
| `variant`         | 'A' (contextual toolbar; navigation A is selected under L101).                      |
| `children`        | The screen's contextual actions.                                                    |
| `navigationLabel` | Accessible name of the toolbar/navigation landmark.                                 |
| `className`       | Optional classes applied to the toolbar container, without styling child internals. |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The toolbar/navigation landmark carries navigationLabel.
- Touch target at least 48 px width and height; visible control rhythm is compact without overlapping adjacent actions.
- At 360 px and 130% text scaling (L115), contextual toolbar actions fit without horizontal overflow; Edit, Start/Resume, and overflow actions remain reachable with full >=48 px targets without clipped labels or empty padded rows.
- Labels use single-row ellipsis rather than mid-word wrapping (L25), preserving baseline alignment.

**Related**

- `fp.button`
- `fp.tabs`

**Decisions**

- [Navigation A selected (L101 / #112)](https://github.com/Aristotelesqc/Flourprint/issues/112)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)

**Versions**

- `v1`: Tailwind 4 contextual bottom toolbar with flat surface, touch-target controls, and compact action rhythm (L101).

### `fp.bottom-sheet`

Floating sheet overlay docked to the viewport bottom for workflows, long forms, and secondary tasks.

**Use when**

- Presenting multi-step tasks, editors, or detailed selection interfaces on mobile or desktop.
- Displaying content requiring viewport height capabilities with native breakpoint gestures.

**Avoid when**

- Displaying brief binary confirmations or alerts (use fp.dialog instead).
- Showing short anchored action lists (use fp.floating-menu instead).

**Props**

| Prop            | Meaning                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `isOpen`        | Controlled boolean determining whether the bottom sheet is presented.       |
| `title`         | Localized title string displayed in the sheet header and linked to host.    |
| `closeLabel`    | Localized accessible label for the header close button.                     |
| `onDismiss`     | Callback invoked only after the sheet completes dismissal.                  |
| `children`      | Main body content rendered inside the scrollable sheet container.           |
| `footer`        | Optional bottom footer container for primary action buttons or summaries.   |
| `canDismiss`    | Optional boolean or promise-returning predicate guarding against dismissal. |
| `reducedMotion` | Optional explicit override for reduced motion animations.                   |

**Accessibility**

- Floating modal host sets accessible name via aria-labelledby and traps focus while presented.
- Preserves autofocus behavior on child inputs without prematurely stealing focus to close control.
- Provides a minimum 48px touch target for the close button.
- Supports keyboard Escape dismissal in browser environments; hardware back navigation is delegated to Ionic Layer 2 and requires native device evidence.
- Retains native Ionic sheet transition for breakpoint positioning and drag gesture tracking. The overlay motion bridge controls duration and easing via fp.motion.sheet-enter, fp.motion.sheet-exit, fp.motion.backdrop-enter, and fp.motion.backdrop-exit while native keyframes carry geometry. Native drag is a paused gesture animation; drag dismissal has no separate sheet-exit animation. Reduced motion sets duration to 0 via animated={false} or motion timing.

**Related**

- `fp.dialog`
- `fp.button`
- `fp.motion.sheet-enter`
- `fp.motion.sheet-exit`
- `fp.motion.backdrop-enter`
- `fp.motion.backdrop-exit`

**Decisions**

- [ADR 0021: Theme builder and component sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)
- [Issue #168: Ionic overlay foundation](https://github.com/Aristotelesqc/Flourprint/issues/168)

**Versions**

- `v1`: Production Ionic bottom sheet modal with breakpoints, dismissal guard routing, and opener focus return.

### `fp.button`

Triggers an immediate action, workflow step or state transition.

**Use when**

- Submitting forms, confirming operations or initiating workflow transitions.
- Navigation or tool operations where an explicit press action is required.

**Avoid when**

- Displaying purely informative content without an action; use Surface instead.
- Selecting between persistent mutually exclusive modes; use segmented controls or tabs.

**Props**

| Prop        | Meaning                                                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `ref`       | React reference to the native button; supports object and callback refs with cleanup.                                            |
| `children`  | Action label or inline content displayed inside the button.                                                                      |
| `variant`   | Visual priority: primary (call to action), secondary (standard action), quiet (borderless tool), or danger (destructive action). |
| `icon`      | Optional leading graphic element accompanying the text label.                                                                    |
| `fullWidth` | Whether the button expands horizontally to fill its parent container width.                                                      |

**Accessibility**

- Renders a minimum 48px touch target with a centered 40px visual pill.
- Emits standard focus outlines via fp-focus and respects reduced-motion preferences.
- Maintains legible text contrast across all variants, including neutral disabled states.

**Related**

- `fp.surface`
- `fp.motion.press`

**Decisions**

- [ADR 0020: Versioned component library mechanism](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0021: Theme builder and component sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)

**Versions**

- `v1`: Tailwind 4 pill button with 48px touch target and 40px visual pill via before:inset-y-1, press motion and semantic tokens.

### `fp.dialog`

Floating modal overlay centered in the viewport for critical prompts, alerts, and focused decisions.

**Use when**

- Confirming destructive actions, displaying urgent alerts, or asking for explicit user decisions.

**Avoid when**

- Presenting complex multi-step forms or long scrollable data entry (use fp.bottom-sheet instead).
- Providing small anchored action lists (use fp.floating-menu instead).

**Props**

| Prop            | Meaning                                                                     |
| --------------- | --------------------------------------------------------------------------- |
| `isOpen`        | Controlled boolean determining whether the dialog is presented.             |
| `title`         | Localized title string displayed in the dialog header and linked to host.   |
| `closeLabel`    | Localized accessible label for the dialog close button.                     |
| `onDismiss`     | Callback invoked only after the dialog finishes dismissal.                  |
| `children`      | Body content displayed within the dialog.                                   |
| `footer`        | Optional footer container for confirmation or cancellation actions.         |
| `canDismiss`    | Optional boolean or promise-returning predicate guarding against dismissal. |
| `reducedMotion` | Optional explicit override for reduced motion animations.                   |

**Accessibility**

- Floating modal host sets accessible name via aria-labelledby and traps focus while open.
- Preserves focused inputs and autofocus without stealing focus to close button.
- Supports keyboard Escape dismissal routing through canDismiss guards.
- Touch targets for controls adhere to min-h-touch (48px).

**Related**

- `fp.bottom-sheet`
- `fp.button`
- `fp.motion.sheet-enter`
- `fp.motion.sheet-exit`

**Decisions**

- [ADR 0021: Theme builder and component sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)
- [Issue #168: Ionic overlay foundation](https://github.com/Aristotelesqc/Flourprint/issues/168)

**Versions**

- `v1`: Production Ionic dialog modal with keyframe animations, focus trapping, and dismissal guard verification.

### `fp.disclosure`

Collapsible content section with an accessible trigger button, smooth grid-row animation, and preserved DOM state when closed.

**Use when**

- Organizing secondary or advanced settings that can be toggled open or closed.
- Preserving user form inputs or scroll position inside a collapsed section without remounting.
- Presenting progressive disclosure for detailed baking instructions, formula notes, or logs.

**Avoid when**

- Switching between mutually exclusive top-level views (use Tabs or navigation instead).
- Modal confirmation dialogues or transient popovers.

**Props**

| Prop               | Meaning                                                                                             |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| `expanded`         | Controlled boolean indicating whether the collapsible content is currently open.                    |
| `onExpandedChange` | Callback fired when the user toggles the disclosure button with the next expanded boolean.          |
| `label`            | Primary header content displayed on the toggle button.                                              |
| `summary`          | Optional supporting text or node displayed below the primary label.                                 |
| `children`         | Content rendered inside the collapsible section, kept mounted to preserve uncontrolled input state. |
| `id`               | Optional base HTML identifier used to link the trigger button and collapsible region.               |
| `disabled`         | Whether the toggle button is disabled and non-interactive.                                          |

**Accessibility**

- Trigger button exposes aria-expanded and aria-controls bound to the collapsible container ID.
- Rotates a purely decorative CSS border chevron from 45° to 225° driven by fp.motion.chevron without icons or emoji.
- Collapsed panel is marked inert and aria-hidden to prevent keyboard navigation and screen-reader access.
- Focus automatically returns to the trigger header without scrolling if collapsed while focus was inside the content.
- Minimum 48px touch target on the toggle trigger conforming to mobile accessibility standards.
- Respects prefers-reduced-motion media query and ancestor data-motion attributes to eliminate motion for reduced-motion users.

**Related**

- `fp.motion.disclosure`
- `fp.motion.chevron`

**Decisions**

- [ADR 0020: Versioned Component Library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0021: Theme Builder and Component Sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to App and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)
- [Issue #168: Disclosure and Tabs Foundation](https://github.com/Aristotelesqc/Flourprint/issues/168)

**Versions**

- `v1`: Initial v1 disclosure component with grid 0fr/1fr animation, preserved children mounting, chevron rotation, and reactive reduced-motion support.

### `fp.floating-menu`

Floating overlay anchored to an opener button providing a list of contextual actions.

**Use when**

- Presenting overflow actions or secondary contextual operations attached to an anchored trigger button.

**Avoid when**

- Presenting primary navigation hierarchies (use navigation bars or drawer items).
- Displaying complex data entry forms with multiple fields (use fp.bottom-sheet or fp.dialog).

**Props**

| Prop             | Meaning                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------- |
| `title`          | Accessible header title for the menu container and aria-labelledby reference.                                    |
| `closeLabel`     | Localized accessible label for the menu dismissal button.                                                        |
| `actions`        | Readonly array of action definitions with id, label, onSelect callback, and optional disabled/destructive flags. |
| `triggerLabel`   | Localized accessible label for the opener button.                                                                |
| `triggerContent` | Optional custom content or icon rendered inside the opener button; falls back to triggerLabel.                   |
| `scrollHint`     | Localized visible notice displayed when menu actions overflow the scrollable container.                          |

**Accessibility**

- Floating overlay maintains focus containment and restores focus to the opener element before executing action callbacks.
- Provides roving keyboard arrow navigation (Up/Down) with a single tabstop (tabindex 0), Home, and End support.
- Menu items use native semantic button elements with role="menuitem" and keep disabled actions visible.
- All touch targets adhere to minimum 48px touch guidelines without arbitrary sizing.
- Retains native Ionic popover animation to preserve dynamic anchor coordinate placement and viewport boundary clamping; timing (standard/reduced duration and easing) is bridged to fp.motion.menu-enter and fp.motion.menu-exit while native keyframes carry geometry.
- Under reduced motion, animated={false} eliminates animation; the pinned Ionic 9.0.6 patch also clears the native wrapper fade while preserving native placement. See patches/README.md.
- Escape dismissal and focus restoration are verified in browser environments; hardware back dismissal is delegated to Ionic Layer 2 and requires native device evidence.

**Related**

- `fp.button`
- `fp.motion.menu-enter`
- `fp.motion.menu-exit`

**Decisions**

- [ADR 0021: Theme builder and component sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)
- [Issue #168: Ionic overlay foundation](https://github.com/Aristotelesqc/Flourprint/issues/168)

**Versions**

- `v1`: Ionic-positioned popover with roving tabindex, native overlay motion, reduced-motion support and dismissal-before-action.

### `fp.number-field`

Controlled raw-string text input for localized, editable numeric measurements and parameters.

**Use when**

- Entering or editing recipe weights, baker percentages, temperatures, durations or counts.
- Accepting locale-specific numeric strings (including comma decimals) without premature parsing.

**Avoid when**

- Editing freeform narrative text or prose; use a text field or textarea.
- Selecting among predefined discrete options; use segmented controls or pickers.

**Props**

| Prop            | Meaning                                                                                   |
| --------------- | ----------------------------------------------------------------------------------------- |
| `label`         | Descriptive ReactNode label associated with the input element.                            |
| `value`         | Raw string representation of the numeric value in current locale.                         |
| `onValueChange` | Callback invoked with uncommitted raw string whenever input text changes.                 |
| `unit`          | Optional trailing unit indicator such as g, %, °C, or min.                                |
| `help`          | Optional assistive guidance rendered below the input field.                               |
| `error`         | Optional validation error message rendered below the input field in error styling.        |
| `invalid`       | Whether the field is in an invalid error state; automatically true when error is present. |
| `disabled`      | Whether the input is disabled and non-interactive.                                        |
| `readOnly`      | Whether the input text is selectable but non-editable.                                    |
| `required`      | Whether completion of this numeric field is mandatory.                                    |
| `inputMode`     | Virtual keyboard layout hint: decimal (default for measurements) or numeric (integers).   |
| `id`            | Optional HTML id attribute for the input; falls back to an internal useId identifier.     |
| `name`          | Optional form field name for submission or form identification.                           |
| `placeholder`   | Optional hint text displayed when the input value is empty.                               |
| `onBlur`        | Optional focus loss event handler.                                                        |
| `onKeyDown`     | Optional keyboard interaction event handler.                                              |
| `className`     | Optional CSS class overrides applied to the outer field container.                        |

**Accessibility**

- Associates visible label with input via explicit htmlFor and id.
- Links help text and validation messages via aria-describedby and marks invalid states with aria-invalid.
- Announces validation errors politely using role="status" and aria-live="polite".
- Ensures minimum 48px touch target and wraps labels/units to prevent overflow on 360px screens.

**Related**

- `fp.surface`
- `fp.button`

**Decisions**

- [ADR 0020: Versioned component library mechanism](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)

**Versions**

- `v1`: Controlled raw-string text input for locale-specific numbers with 48px touch target, accessible labeling and live error announcements.

### `fp.select`

Anchored popover overlay attached to the form field frame for choosing a single value from options, committing immediately upon selection.

**Use when**

- Selecting a single item from a discrete set of 3 to 15 choices.

**Avoid when**

- Choosing between 2 mutually exclusive binary options (use a switch or radio pair).
- Selecting from very large datasets requiring search filtering (use a search or combobox component).

**Props**

| Prop            | Meaning                                                                                                                          |
| --------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `value`         | Selected option identifier or undefined when no selection has been made.                                                         |
| `options`       | Readonly array of selectable options with id, localized label, and optional disabled state.                                      |
| `label`         | Localized label describing the select field.                                                                                     |
| `placeholder`   | Optional localized placeholder text shown when no option is selected.                                                            |
| `cancelText`    | Forwarded compatibility prop unused by the popover interface (options commit immediately without explicit cancel buttons).       |
| `okText`        | Forwarded compatibility prop unused by the popover interface (options commit immediately without explicit confirmation buttons). |
| `disabled`      | Whether the select input field is interactive or disabled.                                                                       |
| `onValueChange` | Callback fired when the user selects a valid enabled option.                                                                     |
| `description`   | Optional descriptive help text displayed beneath the field.                                                                      |
| `error`         | Optional validation error message displayed with alert styling below the field.                                                  |

**Accessibility**

- Stacked label associated with the control with full aria-describedby support for descriptions and errors.
- Disabled options remain visible but cannot be selected (Ionic popover interface does not support navigating to disabled options).
- Accessible min-h-touch touch target and aria-invalid on the underlying select control.
- Visible outer field frame displays canonical 2px outline focus ring via focus-within:fp-focus-ring across shadow DOM when the internal button receives focus.
- Ionic popover interface commits selection immediately on option tap or keyboard selection, without explicit confirmation buttons.

**Related**

- `fp.floating-menu`
- `fp.button`

**Decisions**

- [ADR 0021: Theme builder and component sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)
- [Issue #168: Ionic overlay foundation](https://github.com/Aristotelesqc/Flourprint/issues/168)

**Versions**

- `v1`: Production Ionic popover select with stacked label, descriptions, error states, and type-guarded option matching.

### `fp.surface`

Provides an opaque, flat container for grouping sections, cards and content areas.

**Use when**

- Grouping related fields, instructions or summaries into distinct visual sections.
- Providing a structured, non-interactive background card for content presentation.

**Avoid when**

- Creating interactive buttons or list items; use Button or interactive card components.
- Layering arbitrary translucent blur or shadow effects outside the design tokens.

**Props**

| Prop       | Meaning                                                                                                            |
| ---------- | ------------------------------------------------------------------------------------------------------------------ |
| `children` | Content and nested elements rendered inside the surface container.                                                 |
| `variant`  | Visual hierarchy level: surface (flat default), container (tonal flat section fill), or outlined (defined border). |
| `padding`  | Internal spacing scale: compact (12px), normal (16px), or none.                                                    |

**Accessibility**

- Maintains high contrast between on-surface content and container backgrounds.
- Provides semantic grouping without imposing arbitrary heading levels on callers.

**Related**

- `fp.button`
- `fp.number-field`

**Decisions**

- [ADR 0020: Versioned component library mechanism](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0022: Port to app and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)

**Versions**

- `v1`: Tailwind 4 flat opaque semantic surface container for cards and sections with rounded-card.

### `fp.tabs`

Accessible tabbed navigation strip that switches between alternate views while keeping all tab panels mounted.

**Use when**

- Partitioning related content into parallel views such as Ingredients, Timeline, and Baker Percentages.
- Retaining uncontrolled form input or scroll position across tab switches without remounting.
- Switching views within a single screen without changing routes or page URL.

**Avoid when**

- Step-by-step sequential wizards where previous steps must be completed before advancing.
- Top-level application navigation across distinct screen routes.

**Props**

| Prop               | Meaning                                                                                                    |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| `selected`         | Identifier of the currently active tab item.                                                               |
| `onSelectedChange` | Callback fired when a tab is selected with the selected tab identifier.                                    |
| `label`            | Required localized accessible label describing the purpose of the tab list (applied as aria-label).        |
| `items`            | Readonly list of tab items defining id, label, panel content, and optional disabled state.                 |
| `renderPanels`     | Whether to render panels internally (defaults to true). Set to false when caller mounts panels externally. |

**Accessibility**

- Full WAI-ARIA tablist, tab, and tabpanel roles with roving tabIndex on tabs.
- Left and Right arrow keys wrap through enabled tabs with automatic selection and focus management.
- Home and End keys jump immediately to the first and last enabled tab.
- Inactive tab panels are marked hidden and inert to prevent focus and screen-reader access.
- Minimum 48px touch targets for each tab button with high-contrast active indicator border.

**Related**

- `fp.motion.press`

**Decisions**

- [ADR 0020: Versioned Component Library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0021: Theme Builder and Component Sourcing](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0022: Port to App and Tailwind](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0022-port-to-app-and-tailwind.md)
- [Issue #168: Disclosure and Tabs Foundation](https://github.com/Aristotelesqc/Flourprint/issues/168)

**Versions**

- `v1`: Initial v1 tabs component with horizontal roving tabindex, automatic arrow navigation, preserved panel DOM state, and responsive overflow.

## Motions

### `fp.motion.backdrop-enter`

Dims the screen behind a sheet or dialog as it opens.

**Use when**

- The backdrop of the planned fp.sheet and of dialogs, alongside their enter motion.

**Avoid when**

- Using the backdrop alone as the only sign that something opened.

**Accessibility**

- Content behind is inert while the sheet is open.
- Reduced motion: no animation; the end state applies at once.

**Related**

- `fp.motion.backdrop-exit`
- `fp.motion.sheet-enter`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 (`22db386`) sheet backdrop: fades in with the sheet.

### `fp.motion.backdrop-exit`

Removes the dimming as a sheet or dialog closes.

**Use when**

- The backdrop of the planned fp.sheet and of dialogs, alongside their exit motion.

**Avoid when**

- Keeping input blocked after the sheet has closed.

**Accessibility**

- Content behind becomes interactive again when the exit starts.
- Reduced motion: no animation; the end state applies at once.

**Related**

- `fp.motion.backdrop-enter`
- `fp.motion.sheet-exit`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 (`22db386`) sheet backdrop: fades out with the sheet.

### `fp.motion.check`

Confirms that an ingredient was ticked as weighed.

**Use when**

- Weighing checkboxes in ingredient rows.

**Avoid when**

- Settings toggles: Ionic's toggle has its own motion.

**Accessibility**

- The checked state is also shown by the check mark and the row style, not only by motion.
- Reduced motion: no transition; the end state applies at once.

**Related**

- `fp.motion.highlight`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (transition), default selection: Round 2 (`22db386`) weighing checkbox: fills with the primary colour and grows to 1.05 when checked.

### `fp.motion.chevron`

Shows that a group opens or closes by turning its chevron.

**Use when**

- Disclosure and accordion headers, together with fp.motion.disclosure.

**Avoid when**

- Chevrons that navigate to another screen: they do not rotate.

**Accessibility**

- The header exposes aria-expanded; the rotation is decoration.
- Reduced motion: no transition; the end state applies at once.

**Related**

- `fp.motion.disclosure`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (transition), default selection: Round 2 (`22db386`) disclosure chevron: turns 180° as its group opens.

### `fp.motion.disclosure`

Opens and closes a group's content smoothly without measuring heights.

**Use when**

- Ingredient groups, totals, step groups and other disclosures.

**Avoid when**

- Content whose position others rely on while it moves; collapse it before measuring.

**Accessibility**

- Collapsed content is hidden from assistive technology (inert or hidden), not only clipped.
- Reduced motion: no transition; the end state applies at once.

**Related**

- `fp.motion.chevron`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (transition), default selection: Round 2 (`22db386`) accordion groups: height opens through grid-template-rows 0fr → 1fr.

### `fp.motion.highlight`

Changes a row's background when its state changes (weighed, selected, active step).

**Use when**

- Ingredient rows, step rows, list rows whose state changes in place.

**Avoid when**

- Drawing attention to rows whose state did not change.

**Accessibility**

- Background colours keep text contrast at AA in all three themes.
- Reduced motion: no transition; the end state applies at once.

**Related**

- `fp.motion.check`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (transition), default selection: Round 2 (`22db386`) ingredient rows: background colour change when weighed or selected.

### `fp.motion.menu-enter`

Opens the anchored overflow menu from the button that triggered it.

**Use when**

- An overflow menu anchored at the bottom and opening upward, such as from a bottom toolbar. Set transform-origin to the bottom corner of the anchor.

**Avoid when**

- Sheets and dialogs: use fp.motion.sheet-enter.
- Menus anchored at the top: they need a top-anchored version.
- Menus that open without a visible anchor.

**Accessibility**

- Focus moves into the menu when it opens, whatever the motion.
- Reduced motion: no animation; the end state applies at once.

**Related**

- `fp.motion.menu-exit`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 (`22db386`) anchored menu opening upward from a bottom anchor: fades in and grows from 0.92, rising 4 px. A top-anchored menu needs its own version (round 2 used -4 px and a top-right origin).

### `fp.motion.menu-exit`

Closes the anchored overflow menu back toward its trigger.

**Use when**

- The overflow menu when it closes, by selection, Escape or a tap outside.

**Avoid when**

- Delaying the chosen action until the animation ends.

**Accessibility**

- Focus returns to the trigger.
- Reduced motion: no animation; the end state applies at once.

**Related**

- `fp.motion.menu-enter`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 (`22db386`) bottom-anchored menu: the reverse of menu-enter.

### `fp.motion.press`

Feedback while a text or toolbar button is held down: the button shrinks slightly. In round 2 the background changed on hover only.

**Use when**

- Filled, tonal, outlined and toolbar buttons, applied to their pressed state.

**Avoid when**

- Icon-only buttons: use fp.motion.press-icon.
- Anything that is not pressable.

**Accessibility**

- The pressed state must also be visible without motion (background or ripple).
- Reduced motion: no transition; the end state applies at once.

**Related**

- `fp.motion.press-icon`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (transition), default selection: Round 2 (`22db386`) toolbar and pill buttons: scale to 0.97 while pressed.

### `fp.motion.press-icon`

Feedback while an icon-only button is held down: a slightly stronger shrink than text buttons.

**Use when**

- Icon buttons in app bars, rows and sheets.

**Avoid when**

- Text buttons: use fp.motion.press.

**Accessibility**

- The touch target stays 48 px; only the drawn icon shrinks.
- Reduced motion: no transition; the end state applies at once.

**Related**

- `fp.motion.press`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (transition), default selection: Round 2 (`22db386`) icon buttons: scale to 0.95 while pressed.

### `fp.motion.sheet-enter`

Opens a bottom sheet from the bottom edge of the viewport.

**Use when**

- A bottom sheet that is an IonModal without breakpoints (the planned fp.sheet component): pass it as enterAnimation through ionicAnimation(motion, createAnimation, '.modal-wrapper').

**Avoid when**

- Sheet modals with breakpoints: Ionic positions them through its own enter animation, which this would replace. Keep Ionic's default there.
- Sheets anchored to the bottom of the page content instead of the viewport (a defect found in an earlier mockup, #134).

**Accessibility**

- Focus moves into the sheet; Escape and the back button close it.
- Reduced motion: no animation; the end state applies at once.

**Related**

- `fp.motion.sheet-exit`
- `fp.motion.backdrop-enter`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 (`22db386`) bottom sheet: slides up from the bottom of the screen.

### `fp.motion.sheet-exit`

Closes a bottom sheet toward the bottom edge.

**Use when**

- A bottom sheet without breakpoints (the planned fp.sheet) when it closes: pass it as leaveAnimation through ionicAnimation.

**Avoid when**

- Delaying the result of the sheet's action until the slide ends.

**Accessibility**

- Focus returns to the element that opened the sheet.
- Reduced motion: no animation; the end state applies at once.

**Related**

- `fp.motion.sheet-enter`
- `fp.motion.backdrop-exit`

**Decisions**

- [Owner: keep round 2's motion (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134#issuecomment-6228670659)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 (`22db386`) bottom sheet: slides back down.
