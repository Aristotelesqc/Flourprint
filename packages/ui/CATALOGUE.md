# Flourprint library index

<!-- Generated from packages/ui guides and catalogues. Do not edit: run pnpm ui:index. -->

Read this before using or adding a library item (ADR 0020, ADR 0021). Screens render
components by id and never style their insides; components ask for motions by id and never
write transitions. Every item has a guide; a new item or version ships with its guide.

## Components

_None yet._

## Motions

### `fp.motion.backdrop-enter`

Dims the screen behind a sheet or dialog as it opens.

**Use when**

- The backdrop of fp.sheet and of dialogs, alongside their enter motion.

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

- The backdrop of fp.sheet and of dialogs, alongside their exit motion.

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

- The overflow menu (an IonPopover) when it opens. Set transform-origin to the anchor corner.

**Avoid when**

- Sheets and dialogs: use fp.motion.sheet-enter.
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

- `v1` (keyframes), default selection: Round 2 (`22db386`) anchored menu: fades in and grows from 0.92 toward its anchor.

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

- `v1` (keyframes), default selection: Round 2 (`22db386`) anchored menu: the reverse of menu-enter.

### `fp.motion.press`

Feedback while a text or toolbar button is held down: the button shrinks slightly and its background changes.

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

- fp.sheet (IonModal with breakpoints): pass it as enterAnimation through ionicAnimation.

**Avoid when**

- Sheets anchored to the bottom of the content instead of the viewport (Argon's defect, #134).

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

- fp.sheet when it closes: pass it as leaveAnimation through ionicAnimation.

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
