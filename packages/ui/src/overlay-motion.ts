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
import { useLayoutEffect, type RefObject } from 'react';
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

/**
 * The running native animations on these elements: Ionic's Web Animations only. CSS transitions
 * and animations, and motions played by `playMotion` (`fp.motion:` ids), are left alone.
 */
const runningAnimations = (elements: readonly Element[]): Animation[] =>
  elements.flatMap((element) =>
    (element.getAnimations?.() ?? []).filter(
      (animation) =>
        animation.playState === 'running' &&
        !animation.id.startsWith('fp.motion:') &&
        !(typeof CSSTransition !== 'undefined' && animation instanceof CSSTransition) &&
        !(typeof CSSAnimation !== 'undefined' && animation instanceof CSSAnimation),
    ),
  );

/**
 * The elements of a part: matches in the shadow root and in the overlay's own light DOM (Ionic
 * animates the slotted `.ion-page` of a sheet that does not expand to scroll). Without a selector:
 * the overlay, its whole shadow tree and its `.ion-page` child.
 */
const partElements = (overlay: HTMLElement, part: string | undefined): Element[] => {
  const shadow = overlay.shadowRoot ? [...overlay.shadowRoot.querySelectorAll(part ?? '*')] : [];
  if (part === undefined)
    return [overlay, ...shadow, ...overlay.querySelectorAll(':scope > .ion-page')];
  return [...shadow, ...overlay.querySelectorAll(part)];
};

/**
 * Sets the timing of the overlay's running native animations from the plan's parts. Parts with
 * a selector go first; a part without one takes what is left. An overlay with `animated` false
 * stays at duration 0, as Ionic set it. Exported for tests.
 */
export const retimeOverlay = (overlay: HTMLElement, parts: readonly OverlayMotionPart[]): void => {
  const reduced = isReduced(overlay);
  const disabled = (overlay as HTMLElement & { animated?: boolean }).animated === false;
  const claimed = new Set<Animation>();
  const ordered = [...parts].sort(
    (a, b) => Number(a.part === undefined) - Number(b.part === undefined),
  );
  for (const { part, motion } of ordered) {
    const form = disabled ? 'none' : formOf<Timing>(motion, reduced);
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
 * parts' motions read through `useMotion`, so a manifest change retimes the overlay. It binds in
 * a layout effect, during the commit: an overlay mounted already open emits `willPresent` only
 * after `present()` has awaited its lock, so the binding is always in place first.
 */
export const useOverlayMotion = (
  ref: RefObject<HTMLElement | null>,
  plan: OverlayMotionPlan,
): void => {
  useLayoutEffect(() => {
    const overlay = ref.current;
    if (!overlay) return undefined;
    return bindOverlayMotion(overlay, plan);
  });
};
