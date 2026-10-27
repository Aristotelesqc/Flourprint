/**
 * Motion items for Ionic overlays that keep Ionic's own enter and leave animations (ADR 0021,
 * the Ionic bridge): an anchored `IonPopover` and an `IonModal` with breakpoints. Their native
 * animations carry the geometry (anchor position, viewport clamping, safe areas, the current
 * breakpoint), so they are not replaced as `ionicAnimation` does. Instead, the selected motion
 * item sets their **timing**: duration and easing of its standard form, or of its reduced form
 * (`'none'`: duration 0, so Ionic completes at once). The item's keyframes do not apply here; the
 * native keyframes are the geometry.
 *
 * How (Ionic 9.0.6): `present()` and `dismiss()` emit `willPresent` / `willDismiss`, then build the
 * native animation and call `play()` in the same task; `play()` creates its Web Animations at once
 * and completes the overlay on the first one's `finish`. In the next microtask the bridge retimes
 * the running ones with `effect.updateTiming`, so Ionic's completion follows the new end. Paused
 * animations (the sheet's drag gesture) are never touched. No Ionic internals are imported or
 * patched.
 */
import { useEffect, type RefObject } from 'react';
import { durationMs, easingCurve, formOf, isReduced, type Motion, type Timing } from './motion.ts';

export interface OverlayMotionPart {
  /**
   * The animated part: a selector in the overlay's shadow root (`.popover-content`,
   * `.modal-wrapper`, `ion-backdrop`). Omitted: every running native animation of the overlay
   * that no other part claims.
   */
  readonly part?: string;
  /** Its timing and reduced form apply; keyframes or properties do not. */
  readonly motion: Motion;
}

export interface OverlayMotionPlan {
  readonly enter: readonly OverlayMotionPart[];
  readonly leave: readonly OverlayMotionPart[];
}

/** The running Web Animations of an element and of its shadow tree. */
const runningAnimations = (elements: readonly Element[]): Animation[] =>
  elements.flatMap((element) =>
    (element.getAnimations?.() ?? []).filter((animation) => animation.playState === 'running'),
  );

const partElements = (overlay: HTMLElement, part: string | undefined): Element[] => {
  const root = overlay.shadowRoot;
  if (part === undefined) return [overlay, ...(root ? [...root.querySelectorAll('*')] : [])];
  return [...(root ?? overlay).querySelectorAll(part)];
};

/**
 * Sets the timing of the overlay's running native animations from the plan's parts. Parts with
 * a selector go first; a part without one takes what is left. Exported for tests.
 */
export const retimeOverlay = (overlay: HTMLElement, parts: readonly OverlayMotionPart[]): void => {
  const reduced = isReduced(overlay);
  const claimed = new Set<Animation>();
  const ordered = [...parts].sort(
    (a, b) => Number(a.part === undefined) - Number(b.part === undefined),
  );
  for (const { part, motion } of ordered) {
    const form = formOf<Timing>(motion, reduced);
    const timing: OptionalEffectTiming =
      form === 'none'
        ? { duration: 0 }
        : { duration: durationMs(form.duration), easing: easingCurve(form.easing) };
    for (const animation of runningAnimations(partElements(overlay, part))) {
      if (claimed.has(animation)) continue;
      claimed.add(animation);
      animation.effect?.updateTiming(timing);
    }
  }
};

/**
 * Binds a motion plan to an Ionic overlay element. Returns the function that unbinds it.
 * `willPresent` and `willDismiss` are the overlays' shorthand events, emitted just before the
 * native animation is built and played.
 */
export const bindOverlayMotion = (overlay: HTMLElement, plan: OverlayMotionPlan): (() => void) => {
  const onEnter = (event: Event): void => {
    if (event.target !== overlay) return;
    queueMicrotask(() => retimeOverlay(overlay, plan.enter));
  };
  const onLeave = (event: Event): void => {
    if (event.target !== overlay) return;
    queueMicrotask(() => retimeOverlay(overlay, plan.leave));
  };
  overlay.addEventListener('willPresent', onEnter);
  overlay.addEventListener('willDismiss', onLeave);
  return () => {
    overlay.removeEventListener('willPresent', onEnter);
    overlay.removeEventListener('willDismiss', onLeave);
  };
};

/**
 * React form of `bindOverlayMotion`: `useOverlayMotion(popoverRef, { enter, leave })`, with the
 * parts' motions read through `useMotion`, so a manifest change retimes the overlay.
 */
export const useOverlayMotion = (
  ref: RefObject<HTMLElement | null>,
  plan: OverlayMotionPlan,
): void => {
  useEffect(() => {
    const overlay = ref.current;
    if (!overlay) return undefined;
    return bindOverlayMotion(overlay, plan);
  });
};
