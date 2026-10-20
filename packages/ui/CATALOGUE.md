# Flourprint library index

<!-- Generated from packages/ui guides and catalogues. Do not edit: run pnpm ui:index. -->

Read this before using or adding a library item (ADR 0020, ADR 0021). Screens render
components by id and never style their insides; components ask for motions by id and never
write transitions. Every item has a guide; a new item or version ships with its guide.

## Components

### `fp.badge`

A short status word, such as Draft, Ready or Running.

**Use when**

- Statuses on cards, rows and headers.

**Avoid when**

- Values with units: use fp.metric-pill.
- Long messages: use fp.warning-banner.

**Props**

| Prop       | Meaning                                                 |
| ---------- | ------------------------------------------------------- |
| `children` | The status text from a message key.                     |
| `variant`  | 'default', 'primary', 'warning', 'success' or 'danger'. |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The status is the text; the colour variant only reinforces it.

**Related**

- `fp.metric-pill`
- `fp.recipe-card`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.bottom-bar`

The bottom area of a screen: prototype selects navigation A as a contextual toolbar (L101). Legacy navigation B stays compatible but is not a current candidate.

**Use when**

- Once per screen, at the bottom.

**Avoid when**

- Actions inside a sheet or a menu: put them in that component's footer.

**Props**

| Prop              | Meaning                                                                                                                                         |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `variant`         | 'A' (contextual footer; prototype selects A under L101) or legacy 'B' (optional footer and destinations; stays compatible but not a candidate). |
| `children`        | The screen's contextual actions, in both variants.                                                                                              |
| `destinations`    | Legacy variant B only: destinations with id, label, pictogram, selected state, optional badge and onSelect.                                     |
| `navigationLabel` | Accessible name of the navigation landmark.                                                                                                     |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The navigation landmark carries navigationLabel; the selected destination is exposed as current.
- Touch target at least 48 px; visible control rhythm is compact without overlapping adjacent destinations.
- Labels use single-row ellipsis rather than mid-word wrapping (L25), preserving baseline alignment.

**Related**

- `fp.button`
- `fp.icon-button`
- `fp.tabs`

**Decisions**

- [Navigation A selected (L101 / #112)](https://github.com/Aristotelesqc/Flourprint/issues/112)
- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)

**Versions**

- `v1`: A contextual toolbar (prototype selects A, L101); legacy B destinations remain compatible but are not a current candidate.

### `fp.bottom-sheet`

A modal sheet rising from the bottom for focused tasks (default) or a centered compact dialog via [data-overlay-presentation="compact"] content marker.

**Use when**

- A task or explanation that needs the full width and its own actions (default sheet presentation).
- Short confirmation dialogs composing a [data-overlay-presentation="compact"] content marker retained in exit clones.

**Avoid when**

- A short list of choices tied to a button: use fp.floating-menu.

**Props**

| Prop             | Meaning                                                 |
| ---------------- | ------------------------------------------------------- |
| `previewTrigger` | Catalogue only: label of a button that opens a preview. |
| `open`           | Open state.                                             |
| `onClose`        | Called when the sheet asks to close.                    |
| `title`          | Title, also the dialog's accessible name.               |
| `closeLabel`     | Accessible name of the close button.                    |
| `children`       | Content.                                                |
| `footer`         | Optional actions pinned at the bottom.                  |

**Accessibility**

- Native modal dialog: focus is contained, Escape closes, focus returns to the trigger.
- Floating layer: may be translucent (elevation rule).
- Reduced motion closes at once.
- Hit targets maintain 48 px minimum boundary with compact visual rhythm.

**Related**

- `fp.floating-menu`
- `fp.motion.sheet-enter`
- `fp.motion.sheet-exit`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.button`

A text button, optionally with a leading pictogram. Primary for the screen's main action, secondary by default.

**Use when**

- Actions named by a verb in the infinitive (French UI).
- Main screen action (primary) or secondary/supporting actions (secondary, quiet, danger).

**Avoid when**

- Icon-only actions: use fp.icon-button.
- More than one primary button in the same view.

**Props**

| Prop         | Meaning                                                                                                  |
| ------------ | -------------------------------------------------------------------------------------------------------- |
| `variant`    | 'primary', 'secondary' (default), 'quiet', or 'danger' (separated destructive actions or confirmations). |
| `icon`       | Optional leading pictogram (IconName).                                                                   |
| `children`   | The label text from a message key.                                                                       |
| `dataTestId` | Test id for browser suites.                                                                              |

**Accessibility**

- Native button attributes (type, disabled, onClick, className, aria attributes and style) are forwarded; selected motion timing is retained over style overrides.
- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Touch target is an independent 48 px minimum height box (--fp-spacing-touch); the visible material shape is 40 px (--fp-spacing-touch-compact) inset 4 px vertically using a decorative span (ADR 0021, #142). Zero vertical rem padding prevents target blowout under larger text.
- type defaults to "button", so it never submits forms by accident.
- Disabled buttons receive disabled attribute, opacity 0.45, and pointer-events none; explain the reason nearby when not obvious.
- The native button receives the shared :focus-visible outline.
- The consumer must check label fit and non-overlapping hit boxes at 393 px / 100% and 360 px / 130%. Labels must not wrap mid-word.

**Related**

- `fp.icon-button`
- `fp.motion.press`

**Decisions**

- [Owner: round 2 is the visual baseline proposal (#134; not yet shipped on main)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0021: motion tokens and 48px hit target separation](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.context-tiles`

A two-column contextual facts tile grid for live process and preparation states, restoring Round 2 contextual tiles.

**Use when**

- Displaying secondary contextual metrics and operational facts alongside a dominant hero or preparation view.

**Avoid when**

- Dominant preparation countdowns: use fp.prep-hero.
- Grouped collapsible lists: use fp.group-card.
- Single metric displays: use fp.metric-pill.

**Props**

| Prop    | Meaning                                                                                                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `label` | Accessible name for the section landmarks grouping the contextual tiles.                                                       |
| `items` | Read-only list of fact items with id, label, formatted value, optional detail, optional pictogram, and optional action button. |

**Accessibility**

- Page-anchored presentation stays flat; painted tile surfaces are opaque without decorative gradients or fake progress bars (elevation rule, ADR 0021).
- Section has accessible name from label; tiles present semantic label and value pairs with tabular figures.
- Optional tile actions are native buttons with accessible names; no nested interactive controls or clickable card wrappers.

**Related**

- `fp.prep-hero`
- `fp.surface`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Generic 2-column contextual facts tile grid restoring Round 2 preparation tiles. First version; not yet shipped on main.

### `fp.floating-menu`

A small menu anchored to the button that opened it, for secondary actions.

**Use when**

- The more (…) actions of a screen, card or row.

**Avoid when**

- Tasks with fields: use fp.bottom-sheet.

**Props**

| Prop             | Meaning                                                     |
| ---------------- | ----------------------------------------------------------- |
| `previewTrigger` | Catalogue only: label of a button that opens a preview.     |
| `open`           | Open state.                                                 |
| `onClose`        | Called when the menu asks to close.                         |
| `title`          | Accessible name of the menu.                                |
| `closeLabel`     | Accessible name of the close control.                       |
| `anchor`         | 'bottom' (default) opens above the trigger, 'top' below it. |
| `children`       | Menu items.                                                 |
| `footer`         | Optional content after the items.                           |

**Accessibility**

- Native modal dialog anchored to its trigger; Escape and outside taps close it; focus returns to the trigger.
- Close is an independent 48 px non-overlapping target; action layout is owned by the component even when .menu-actions wrapper is omitted.
- Floating layer: may be translucent (elevation rule).
- Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).

**Related**

- `fp.bottom-sheet`
- `fp.motion.menu-enter`
- `fp.motion.menu-exit`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.group-card`

A card with a header that opens and closes its content, such as a step group or a component's ingredients.

**Use when**

- Groups whose detail is not always needed.

**Avoid when**

- Content the baker always needs in view.

**Props**

| Prop           | Meaning                                                              |
| -------------- | -------------------------------------------------------------------- |
| `title`        | Header text.                                                         |
| `subtitle`     | Optional secondary text.                                             |
| `badge`        | Optional short text at the end of the header.                        |
| `defaultOpen`  | Initial open state when uncontrolled.                                |
| `open`         | Optional controlled open state (drives expanded, inert, and motion). |
| `onOpenChange` | Callback fired when header toggles the open state.                   |
| `status`       | Optional 'warning' or 'success' tone.                                |
| `children`     | Content shown when open.                                             |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The header is a button with aria-expanded and aria-controls; closed content is inert.
- Provide a textual subtitle describing the status; the warning/check pictogram alone is decorative.

**Related**

- `fp.surface`
- `fp.motion.disclosure`
- `fp.motion.chevron`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.hero-summary`

The recipe's summary tiles: total flour, dough, hydration, fats and sugars, with a notice when a value is partial.

**Use when**

- At the top of a recipe's Ingredients section.

**Avoid when**

- Lists of single values elsewhere: use fp.metric-pill.

**Props**

| Prop            | Meaning                                                                            |
| --------------- | ---------------------------------------------------------------------------------- |
| `editor`        | Optional editor shown in the hydration tile while editing.                         |
| `metrics`       | Tiles with label, value, optional detail and pictogram, formatted by the consumer. |
| `notice`        | Optional partial-value notice.                                                     |
| `onHelp`        | Opens the explanation of the values.                                               |
| `helpLabel`     | Accessible name of the help button.                                                |
| `onSizeHelp`    | Optional: opens the explanation of the dough size.                                 |
| `sizeHelpLabel` | Accessible name of that button.                                                    |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Each tile is label plus value text; partial values say so in words.
- Help buttons carry their labels.

**Related**

- `fp.metric-pill`
- `fp.number-field`
- `fp.warning-banner`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.icon`

The current provisional pictograms as inline SVG following text colour; the permanent source remains an owner decision.

**Use when**

- Inside other components, or next to text that names the same thing.

**Avoid when**

- As the only content of a control: use fp.icon-button, which carries a label.

**Props**

| Prop        | Meaning                                       |
| ----------- | --------------------------------------------- |
| `name`      | Pictogram name from the closed IconName set.  |
| `size`      | CSS size of the square; defaults to 1.125rem. |
| `className` | Extra class for the consumer's layout.        |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Always aria-hidden: meaning comes from nearby text or the control's label.

**Related**

- `fp.icon-button`
- `fp.metric-pill`

**Decisions**

- [Pictogram set still open (inventory, ADR 0021)](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/architecture/2026-10-17-component-sourcing-inventory.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.icon-button`

A button showing only a pictogram (or an image), with its label as accessible name and tooltip.

**Use when**

- Toolbars and headers: back, more, undo, close, navigation.
- Compact controls where space is constrained and pictogram meaning is standard and obvious.

**Avoid when**

- Actions whose pictogram is not obvious: use fp.button with text.
- Destructive actions without confirmation dialogs.

**Props**

| Prop         | Meaning                                                                     |
| ------------ | --------------------------------------------------------------------------- |
| `icon`       | Pictogram name (IconName). Rendered when imageSrc is omitted.               |
| `imageSrc`   | Optional image shown instead of the pictogram (decorative, rounded square). |
| `label`      | Required accessible name and tooltip (aria-label and title).                |
| `onClick`    | Callback invoked on button click/activation.                                |
| `disabled`   | Disables the button; renders visually dimmed (opacity 0.35) and inert.      |
| `dataTestId` | Test id for browser suites.                                                 |
| `variant`    | 'default' (ink text/icon), 'primary', or 'danger'.                          |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- label is required and becomes aria-label and title for full screen reader and tooltip coverage.
- Touch target is an independent 48 px square box (--fp-spacing-touch); the visible material shape is 40 px (--fp-spacing-touch-compact) circular inset 4 px (half the difference between touch and touch-compact) using a decorative span (ADR 0021, #142).
- Recognisable active, hover, and focus states on the anchored shape (opaque --color-surface-container and outline ring).
- Disabled buttons receive disabled attribute, opacity 0.35, and pointer-events none.
- The consumer must check toolbar fit at 393 px / 100% and 360 px / 130%.

**Related**

- `fp.icon`
- `fp.button`
- `fp.motion.press-icon`

**Decisions**

- [Owner: round 2 is the visual baseline proposal (#134; not yet shipped on main)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)
- [ADR 0021: motion tokens and 48px hit target separation](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.ingredient-row`

One ingredient of a step: name, grams, baker's percentage, optional note and its weighing checkbox.

**Use when**

- Ingredient lists by step, in reading, weighing and editing modes.

**Avoid when**

- Values not tied to one ingredient.

**Props**

| Prop         | Meaning                                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| `id`         | Ingredient id, for keys and tests.                                                                                 |
| `name`       | Ingredient name.                                                                                                   |
| `gramsText`  | Formatted grams.                                                                                                   |
| `pctText`    | Formatted percentage with its explicit basis (baker percentage or share of flour); the component computes neither. |
| `note`       | Optional note such as the share in a component.                                                                    |
| `checked`    | Weighed state.                                                                                                     |
| `onToggle`   | Called by the checkbox or the non-editing row body; the quantity/end cell stops propagation.                       |
| `checkLabel` | Label of the weighing checkbox.                                                                                    |
| `editing`    | Shows the edit controls passed as children.                                                                        |
| `children`   | Edit controls while editing.                                                                                       |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Grams and percentage are text with tabular figures; the checkbox has its own label.
- Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).

**Related**

- `fp.weighing-checkbox`
- `fp.number-field`
- `fp.group-card`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.metric-pill`

A compact pill showing one value, with an optional pictogram and label, such as hydration or dough weight on a recipe card.

**Use when**

- Short derived values in cards and summaries.

**Avoid when**

- Editable values: use fp.number-field.
- Status words: use fp.badge.

**Props**

| Prop      | Meaning                                                                                          |
| --------- | ------------------------------------------------------------------------------------------------ |
| `value`   | Formatted value with its unit, from the consumer.                                                |
| `label`   | Optional text before the value.                                                                  |
| `icon`    | Optional pictogram name from fp.icon.                                                            |
| `compact` | Optional density flag for tighter inline padding (0.35rem) and 32px height in metadata contexts. |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The value is text with tabular figures; the pictogram is decorative.
- Pass a label when the pictogram alone would carry the meaning.
- Compact 32 px (2 rem) height aligns with neighboring metadata and controls without empty vertical margin.

**Related**

- `fp.icon`
- `fp.recipe-card`
- `fp.hero-summary`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Compact semantic SVG pictogram with an atomic, tabular value. Labels come from the consumer.

### `fp.number-field`

A numeric input that keeps the raw text while typing and commits a parsed number, with its unit and an error message.

**Use when**

- Every editable quantity: grams, percentages, durations, temperatures.

**Avoid when**

- Read-only values: use fp.metric-pill or plain text.

**Props**

| Prop               | Meaning                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------- |
| `compact`          | Smaller layout for rows.                                                                                                         |
| `hint`             | Optional help text under the field.                                                                                              |
| `value`            | Committed number shown when not editing.                                                                                         |
| `label`            | Accessible label.                                                                                                                |
| `unit`             | Unit text such as g or %.                                                                                                        |
| `unitPosition`     | 'prefix' or 'suffix' (default) for the unit.                                                                                     |
| `locale`           | 'fr' or 'en' decimal separator.                                                                                                  |
| `onCommit`         | Called with the parsed value; returning false keeps the raw text and shows the error.                                            |
| `onClear`          | Optional callback when clearing a finite value in an optional field; returning false keeps the field in error.                   |
| `onValidityChange` | Receives true for an invalid or refused value and false after valid input/reset; it reports invalidity, despite its name.        |
| `onDirtyChange`    | Receives true when uncommitted raw text differs from the committed value, and false after commit, reset, or unmount.             |
| `disabled`         | Disables editing.                                                                                                                |
| `dataTestId`       | Test id for browser suites.                                                                                                      |
| `errorMessage`     | Message shown when a value is refused.                                                                                           |
| `resetKey`         | Changing it discards the raw text and shows value again.                                                                         |
| `displayDigits`    | Maximum fraction digits for formatted display (default 2); accepted values keep their precision until the consumer changes them. |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Decimal keyboard; aria-invalid and the error message (role alert) describe a refused value.
- The unit adornment is always aria-hidden; include the unit in label or hint so its meaning remains accessible.
- The input minimum height is 2.25rem (36 px at base text). A surrounding 48 px row does not enlarge the input hit area; verify field reachability separately from button-target checks.

**Related**

- `fp.ingredient-row`
- `fp.hero-summary`

**Decisions**

- [Raw input preserved while editing (#35)](https://github.com/Aristotelesqc/Flourprint/issues/35)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.prep-hero`

The dominant block of a running preparation: current step, time remaining, start and end, progress and instructions.

**Use when**

- At the top of the Preparation screen, once.

**Avoid when**

- Planned steps not yet running: use fp.step-node.

**Props**

| Prop             | Meaning                                                                                      |
| ---------------- | -------------------------------------------------------------------------------------------- |
| `remainingLabel` | Optional label above the remaining time.                                                     |
| `title`          | Current step.                                                                                |
| `remaining`      | Formatted remaining time.                                                                    |
| `start`          | Formatted start time.                                                                        |
| `end`            | Formatted planned end.                                                                       |
| `progress`       | Progress from 0 to 1.                                                                        |
| `labels`         | Texts for the start, end and progress labels.                                                |
| `instruction`    | Optional instruction for the current step.                                                   |
| `conditions`     | Optional condition items with label, value and sub text (for example temperature or vessel). |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Remaining time is text; progress also has a label.
- No rolling numbers and no action delayed behind an animation (DESIGN.md).

**Related**

- `fp.step-node`
- `fp.timeline`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.recipe-card`

A recipe in the library: title, status, key values and, for a running preparation, a Resume action.

**Use when**

- The recipe library and search results.

**Avoid when**

- Inside the recipe screen itself: use fp.hero-summary.

**Props**

| Prop            | Meaning                                                                                                                      |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `description`   | Optional short description.                                                                                                  |
| `selected`      | Highlights the selected template (template picker).                                                                          |
| `onResume`      | Optional: resumes the running preparation.                                                                                   |
| `resumeLabel`   | Label of the Resume button.                                                                                                  |
| `title`         | Recipe name.                                                                                                                 |
| `details`       | Optional short detail texts.                                                                                                 |
| `metrics`       | Optional values shown as pills.                                                                                              |
| `status`        | Status text.                                                                                                                 |
| `statusVariant` | Tone of the passive status badge; the featured Resume chip uses the success styling.                                         |
| `featured`      | Shows a separate Resume chip instead of a passive status badge; defaults the status tone to success. Does not add elevation. |
| `onOpen`        | Opens the recipe.                                                                                                            |
| `actions`       | Optional extra actions.                                                                                                      |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The main open action and Resume are semantic sibling controls with independent 48 px hit targets, eliminating nested interactive controls (L27).
- The whole card opens the recipe on pointer use while excluding nested interactive controls; keyboard Enter/Space on the title button opens once.
- The status is text (fp.badge style), not only colour.
- Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).

**Related**

- `fp.metric-pill`
- `fp.badge`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.section-carousel`

Horizontal swipeable carousel holding screens/panes of a recipe (Ingredients, Steps, Planning, History) with synchronized tab indicator.

**Use when**

- Navigation between adjacent peer sections within a single screen or recipe.
- L101 horizontal gesture navigation with top tappable tabs.

**Avoid when**

- Primary screen navigation: use fp.bottom-bar.
- Arbitrary multi-step wizard flows with non-linear transitions.

**Props**

| Prop                | Meaning                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `sections`          | Readonly array of section identifiers.                                                      |
| `activeSection`     | Optional controlled active section identifier. When omitted, the component is uncontrolled. |
| `defaultSection`    | Optional initial section identifier for uncontrolled usage.                                 |
| `onChangeSection`   | Optional callback invoked when section changes due to swipe or external action.             |
| `label`             | Accessible name for the carousel container.                                                 |
| `reduced`           | Optional boolean flag indicating reduced motion preference.                                 |
| `onGestureProgress` | Optional callback receiving real-time gesture progress during swipe.                        |
| `targetTabsElement` | Optional target element for dispatching tab gesture events.                                 |
| `children`          | Pane elements corresponding to each section.                                                |

**Accessibility**

- Panes maintain per-panel independent scroll offsets.
- Inactive panes are marked inert and aria-hidden to keep offscreen content out of the tab and accessibility trees.
- Swipe gestures are excluded within 24px of screen edges to prevent conflicts with OS edge navigation gestures.
- Vertical scrolling takes priority unless a horizontal gesture is established.
- Under reduced motion, horizontal drag animation is disabled and section transitions complete instantaneously.

**Related**

- `fp.tabs`
- `fp.bottom-bar`

**Decisions**

- [L101: top tappable tabs and horizontal carousel navigation](https://github.com/Aristotelesqc/Flourprint/issues/133)
- [ADR 0021: theme builder, component sourcing, motion items and guides](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: L101 section carousel with horizontal swipe gestures, adjacent pane preview, reduced motion support and tab synchronization.

### `fp.step-node`

One step of the process as a numbered node with its details, actions, and proposed review layout alternatives.

**Use when**

- Step lists in Recipe, Planning and Preparation.
- Exploring density and hierarchy options via ancestor [data-step-design="compact"|"rail"|"outline"] (compact serves as technical fallback).

**Avoid when**

- Time placement across parallel lanes: use fp.timeline.

**Props**

| Prop        | Meaning                                                                                        |
| ----------- | ---------------------------------------------------------------------------------------------- |
| `icon`      | Optional pictogram for the operation.                                                          |
| `number`    | Optional position shown in the node; omitted for overlapping background steps such as preheat. |
| `title`     | Step name.                                                                                     |
| `details`   | Short detail texts (duration, temperature).                                                    |
| `state`     | 'planned', 'running' or 'done'.                                                                |
| `onEdit`    | Optional: opens the step editor.                                                               |
| `editLabel` | Accessible name of the edit button.                                                            |
| `actions`   | Optional extra actions.                                                                        |
| `children`  | Optional content under the details.                                                            |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The node pictogram and badge are decorative. Supply state words in details or surrounding headings; state alone changes paint, not an accessible status label. The ordinal is included in the title when icon and number are present.
- Reorder controls (#123) need a keyboard path besides dragging.
- Touch target at least 48 px; painted controls remain compact without layout dead space; font-relative narrow query (<=19rem) stacks action controls into a single 48px column and lets details span the badge gutter with compact metadata pills to prevent multiline wrapping and title overlap (ADR 0021, #142).
- Proposed alternatives (compact, rail, outline) preserve identical semantic DOM, labeling, and reachable actions with natural wrapping at 360px / 130% zoom without truncation.
- Alternatives are proposals for owner review and arbitration, not accepted decisions.

**Related**

- `fp.timeline`
- `fp.prep-hero`

**Decisions**

- [Step move and reorder (#123)](https://github.com/Aristotelesqc/Flourprint/issues/123)
- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.surface`

A tonal container that groups content on the page, in the warm surface steps of each theme.

**Use when**

- Grouping related content when no more specific component fits.

**Avoid when**

- Wrapping every value in its own raised box (DESIGN.md).

**Props**

| Prop               | Meaning                                                      |
| ------------------ | ------------------------------------------------------------ |
| `componentId`      | Id of the component this surface belongs to, for inspection. |
| `componentVersion` | Version of that component, for inspection.                   |
| `children`         | Content.                                                     |
| `className`        | Extra class for the consumer's layout.                       |
| `variant`          | 'default', 'container' or 'high' surface step.               |

**Accessibility**

- Anchored in the page, so opaque and flat (elevation rule, ADR 0021).
- Purely visual: add headings or landmarks in the content when needed.

**Related**

- `fp.group-card`
- `fp.hero-summary`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.tabs`

Switches between sections of one screen (Ingredients, Steps, Planning, History) or between filters.

**Use when**

- Two to five peer sections or filters.

**Avoid when**

- Navigation between screens: use fp.bottom-bar.
- A single on/off choice.

**Props**

| Prop              | Meaning                                                             |
| ----------------- | ------------------------------------------------------------------- |
| `variant`         | 'underlined' (sections), 'pills' or 'chips' (filters).              |
| `tabs`            | Tabs with id and label.                                             |
| `activeId`        | Id of the selected tab.                                             |
| `onChange`        | Called with the chosen id.                                          |
| `label`           | Accessible name of the tab list.                                    |
| `gestureProgress` | Optional real-time gesture progress during horizontal swipe (L101). |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Tablist with arrow-key navigation and roving focus; the selected tab is aria-selected.
- Narrow section and filter rows stay on one horizontal scroll strip; arrow/Home/End focus and selection changes scroll the option into view.
- At 360 px and 130% text scaling (L25), section tabs maintain a single-row scroll strip without mid-word breaks (L101). Explicit noninteractive edge chevrons and opaque gradient cues appear via wrapper pseudo-elements when content overflows at either edge, tracked via ResizeObserver and scroll events, without adding non-tab buttons to the tablist.
- Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142). Tab labels do not break mid-word or wrap unevenly.

**Related**

- `fp.bottom-bar`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.timeline`

Horizontal lanes that place the steps of a plan on one time axis, so parallel work (a poolish resting while a tangzhong cooks) reads at a glance.

**Use when**

- Planning views that show when steps run relative to each other.

**Avoid when**

- Exact times the baker acts on: list them with fp.step-node.
- Computing schedules: the consumer supplies display positions derived from its projection; the library has no core dependency.

**Props**

| Prop         | Meaning                                                                                                         |
| ------------ | --------------------------------------------------------------------------------------------------------------- |
| `startLabel` | Text at the start of the axis, such as the plan's start time.                                                   |
| `endLabel`   | Text at the end of the axis.                                                                                    |
| `lanes`      | Rows of events: id, label and events with id, label, range text and start/end positions in percent of the axis. |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- Each event's label and range are text, not only bar position.
- Lanes keep their order for screen readers; colour is never the only cue.

**Related**

- `fp.step-node`
- `fp.prep-hero`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Display-only lanes. Positions and localized times arrive from the consumer projection; this component schedules nothing.

### `fp.warning-banner`

A message about the state of a calculation or a value: partial, unavailable or fine.

**Use when**

- Partial composition, model limits, missing data.

**Avoid when**

- Short statuses: use fp.badge.
- Errors on a field: fp.number-field shows its own.

**Props**

| Prop       | Meaning                                                                                                              |
| ---------- | -------------------------------------------------------------------------------------------------------------------- |
| `embedded` | Hides the title/pictogram header only; message and children remain. Include the status meaning in message when true. |
| `title`    | Short title.                                                                                                         |
| `status`   | 'ok', 'warning' or 'unavailable'.                                                                                    |
| `message`  | Explanation.                                                                                                         |
| `children` | Optional extra content.                                                                                              |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- The status is stated in the title or message, not only by colour or pictogram.

**Related**

- `fp.badge`
- `fp.hero-summary`

**Decisions**

- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0020: versioned component library](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0020-versioned-component-library.md)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

### `fp.weighing-checkbox`

A weighing checkbox with a 48 px hit area and a compact 20 px visible box.

**Use when**

- Weighing lists and checklists during a preparation.

**Avoid when**

- Settings that switch a mode on or off: use a toggle.

**Props**

| Prop         | Meaning                        |
| ------------ | ------------------------------ |
| `hideLabel`  | Hides the label visually only. |
| `checked`    | Checked state.                 |
| `onChange`   | Called with the new state.     |
| `label`      | Label text.                    |
| `disabled`   | Disables the checkbox.         |
| `dataTestId` | Test id for browser suites.    |

**Accessibility**

- Page-anchored presentation stays flat; painted surfaces are opaque (ADR 0021 elevation rule).
- A native checkbox input with its label; hideLabel keeps it for screen readers.
- Unchecked boxes keep a 3:1 contrast in all three themes.
- Touch target at least 48 px; the visible size may be smaller (ADR 0021, #142).

**Related**

- `fp.ingredient-row`
- `fp.motion.check`

**Decisions**

- [Weighing lifetime, owner choice (#122)](https://github.com/Aristotelesqc/Flourprint/issues/122)
- [Owner: round 2 is the visual baseline (#134)](https://github.com/Aristotelesqc/Flourprint/issues/134)

**Versions**

- `v1`: Round 2 visual restoration on the shared component contract. First version; not yet shipped on main.

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

### `fp.motion.step-drag`

Settle animation for dragged step node cards snapping back to origin or settling into slot (L96, L104).

**Use when**

- Step drag gesture releases outside valid target, dropped on engine refusal, or cancelled by Escape/Back.

**Avoid when**

- Direct active finger tracking (must directly follow finger without lag or transition easing).

**Accessibility**

- Honours prefers-reduced-motion and manual motion reduction (instant settle without duration).

**Related**

- `fp.motion.tab-carousel`
- `fp.motion.highlight`

**Decisions**

- [L96/L104: Step drag and drop settle motion](https://github.com/Aristotelesqc/Flourprint/issues/133)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Settle animation for step drag and drop from release coordinates to target or origin position (L96, L104).

### `fp.motion.tab-carousel`

Horizontal carousel slide between adjacent section tabs (L101), supporting finger-follow gestures, flick velocity, and gesture-matched springback.

**Use when**

- Recipe section tabs at the top of a screen where swiping horizontally moves between tabs.

**Avoid when**

- Vertical scrolling content (touch-action: pan-y must preserve native vertical scroll).
- Starts within 24 px of screen edges (Android Back gesture margin).
- During active step dragging or within elements with horizontal scrolling.

**Accessibility**

- Panes remain mounted so draft values and form focus are preserved.
- Reduced motion: instant transition without sliding animation.
- 48 px minimum touch targets for all tab controls.

**Related**

- `fp.motion.highlight`
- `fp.motion.sheet-enter`

**Decisions**

- [L101: Navigation is A with swipeable section tabs](https://github.com/Aristotelesqc/Flourprint/issues/134)
- [ADR 0021: motion items](https://github.com/Aristotelesqc/Flourprint/blob/dev/docs/adr/0021-theme-builder-and-component-sourcing.md)

**Versions**

- `v1` (keyframes), default selection: Round 2 / L101 tab carousel: horizontal slide between adjacent tabs with finger-follow, flick velocity, and gesture-matched springback.
