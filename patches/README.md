# Versioned dependency patches

## @ionic/core 9.0.6: reduced-motion popover entry

The Material Design popover factory gives its wrapper an explicit 150 ms opacity animation.
Ionic disables overlay animation by setting the parent duration to zero, but an explicit child
duration takes precedence. Therefore `animated={false}` still animates that wrapper.

The patch changes only that child duration: zero when the popover host has `animated === false`,
150 ms otherwise. It applies the same expression to the seven published runtime builds. Native
placement, safe-area calculations, scale, backdrop, standard timing, iOS and exit factories stay
owned by Ionic. There is no global animation override or copied placement algorithm.

The exact patch is registered in `pnpm-workspace.yaml` and frozen by `pnpm-lock.yaml`; install
with the frozen lockfile. `pnpm test:ui` asserts zero reduced-motion animation durations,
standard/reduced reopening, complete menu containment, cancellation and focus in all three themes
at both supported text/viewport sizes. CI runs the same suite.

Recheck this defect on any Ionic upgrade. Remove the patch only after the unpatched candidate
passes those regressions. Retain Ionic's licence and notices. Source maps are diagnostic and are
not rewritten; runtime changes are limited to the wrapper duration expression.
