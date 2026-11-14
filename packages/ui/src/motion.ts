/**
 * Motion items (ADR 0021): every animation is a versioned library item, `fp.motion.<name>`,
 * with a required reduced-motion form. Components ask for a motion by id; they never write
 * transitions themselves. Durations and easing are named tokens from `tokens.ts`.
 *
 * Two kinds:
 * - `keyframes`: played on an element with the Web Animations API, or handed to Ionic as an
 *   enter or leave animation (`ionicAnimation`);
 * - `transition`: a CSS transition for state changes driven by styles (colour, rotation,
 *   accordion height), applied with `transitionCss`.
 */
import { tokens } from './tokens.ts';
import {
  checkVersions,
  readOverrides,
  type Catalogue,
  type ComponentMap,
  type Manifest,
  type VersionName,
  type Versioned,
} from './library.ts';
import type { MotionGuides } from './guides.ts';

export type MotionId = `fp.motion.${string}`;
export type DurationToken = 'effect' | 'spatial' | 'sheet';
export type EasingToken = 'standard' | 'decelerate';

export interface Timing {
  readonly duration: DurationToken;
  readonly easing: EasingToken;
}

export interface KeyframesForm extends Timing {
  readonly keyframes: readonly Keyframe[];
}

export interface TransitionForm extends Timing {
  /** CSS properties that transition, in CSS names (`background-color`). */
  readonly properties: readonly string[];
}

/** What the catalogue shows for a transition: the two states it moves between. */
export interface TransitionDemo {
  readonly from: Readonly<Record<string, string>>;
  readonly to: Readonly<Record<string, string>>;
}

interface MotionBase<I extends MotionId, V extends VersionName> {
  readonly id: I;
  readonly version: V;
  /** What this version changes, shown in the catalogue. */
  readonly notes: string;
}

export interface KeyframesMotion<
  I extends MotionId = MotionId,
  V extends VersionName = VersionName,
> extends MotionBase<I, V> {
  readonly kind: 'keyframes';
  readonly standard: KeyframesForm;
  /** Required. `'none'`: no animation; the end state applies at once. */
  readonly reduced: KeyframesForm | 'none';
}

export interface TransitionMotion<
  I extends MotionId = MotionId,
  V extends VersionName = VersionName,
> extends MotionBase<I, V> {
  readonly kind: 'transition';
  readonly standard: TransitionForm;
  /** Required. `'none'`: the state changes at once. */
  readonly reduced: TransitionForm | 'none';
  readonly demo: TransitionDemo;
}

export type Motion<I extends MotionId = MotionId, V extends VersionName = VersionName> =
  KeyframesMotion<I, V> | TransitionMotion<I, V>;

/** The motion version a consumer selects for each id. Every id must have an entry. */
export type MotionManifest<M extends MotionId> = { readonly [I in M]: Motion<I> };

/** Every version of every motion id. */
export type MotionCatalogue<M extends MotionId> = {
  readonly [I in M]: readonly [Motion<I>, ...Motion<I>[]];
};

/** Typed helpers bound to one set of motion ids. */
export const createMotionLibrary = <M extends MotionId>() => ({
  motion: <I extends M, V extends VersionName>(motion: Motion<I, V>) => motion,
  manifest: (manifest: MotionManifest<M>) => manifest,
  catalogue: (catalogue: MotionCatalogue<M>) => catalogue,
  guides: (guides: MotionGuides<M>) => guides,
});

/** Milliseconds of a duration token. */
export const durationMs = (token: DurationToken): number =>
  Number.parseFloat(tokens.motion[`duration-${token}`]);

/** CSS easing of an easing token. */
export const easingCurve = (token: EasingToken): string => tokens.motion[`easing-${token}`];

/**
 * Whether motion is reduced for an element: the system setting, or `data-motion="reduced"` on
 * the element or an ancestor (the catalogue and tests set it).
 */
export const isReduced = (element?: Element | null): boolean => {
  const marked = element?.closest('[data-motion]')?.getAttribute('data-motion');
  if (marked === 'reduced') return true;
  if (marked === 'standard') return false;
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
};

/** The form to use: `'none'` when reduced motion asks for no animation. */
export const formOf = <F>(
  motion: { readonly standard: F; readonly reduced: F | 'none' },
  reduced: boolean,
): F | 'none' => (reduced ? motion.reduced : motion.standard);

/** Animation ids that `playMotion` gives its animations, so a new play can replace them. */
const PLAYED = 'fp.motion:';

/**
 * Plays a keyframes motion on an element. Any motion this function is still playing on the
 * element is cancelled first, so repeated plays never stack. When the animation finishes, its end
 * state is written to the element's inline style (`commitStyles`) and the animation is removed,
 * so nothing stays held over the element's own styles. Returns the animation, or `undefined`
 * when reduced motion asks for none: the caller then applies the end state itself.
 */
export const playMotion = (
  motion: KeyframesMotion,
  element: Element,
  options: { readonly reduced?: boolean; readonly direction?: PlaybackDirection } = {},
): Animation | undefined => {
  for (const running of element.getAnimations?.() ?? []) {
    if (running.id.startsWith(PLAYED)) running.cancel();
  }
  const form = formOf(motion, options.reduced ?? isReduced(element));
  if (form === 'none') return undefined;
  const animation = element.animate([...form.keyframes], {
    duration: durationMs(form.duration),
    easing: easingCurve(form.easing),
    direction: options.direction ?? 'normal',
    fill: 'forwards',
  });
  animation.id = `${PLAYED}${motion.id}`;
  animation.finished.then(
    () => {
      try {
        animation.commitStyles();
      } catch {
        // The element left the document or is not rendered: nothing to keep.
      }
      animation.cancel();
    },
    () => undefined, // Cancelled by a newer play.
  );
  return animation;
};

/** The CSS `transition` value of a transition motion; `none` in reduced motion. */
export const transitionCss = (motion: TransitionMotion, reduced: boolean): string => {
  const form = formOf(motion, reduced);
  if (form === 'none') return 'none';
  const timing = `${durationMs(form.duration)}ms ${easingCurve(form.easing)}`;
  return form.properties.map((property) => `${property} ${timing}`).join(', ');
};

/** The part of Ionic's `createAnimation()` this module uses; passed in, never imported. */
export interface IonicAnimationBuilder {
  addElement(element: Element): IonicAnimationBuilder;
  duration(ms: number): IonicAnimationBuilder;
  easing(easing: string): IonicAnimationBuilder;
  keyframes(keyframes: Keyframe[]): IonicAnimationBuilder;
}

/**
 * An enter or leave animation for an Ionic overlay (`IonPopover`, or an `IonModal` **without**
 * breakpoints) from a keyframes motion. `createAnimation` comes from `@ionic/react`, so the
 * library does not depend on Ionic. `target` picks the animated part, looked up in the overlay's
 * shadow root first, where Ionic keeps `.modal-wrapper` and `ion-backdrop`. Reduced motion gives
 * a zero-length animation, which Ionic completes at once.
 *
 * Not for sheet modals with `breakpoints`: Ionic positions those through its own enter
 * animation (`currentBreakpoint`), which a custom animation replaces. Keep Ionic's default there
 * until a breakpoint-aware bridge is built and verified.
 */
export const ionicAnimation =
  <A extends IonicAnimationBuilder>(
    motion: KeyframesMotion,
    createAnimation: () => A,
    target?: string,
  ) =>
  (baseElement: HTMLElement): A => {
    const root: ParentNode = baseElement.shadowRoot ?? baseElement;
    const part = target ? root.querySelector(target) : baseElement;
    const form = formOf(motion, isReduced(baseElement));
    const animation = createAnimation().addElement(part ?? baseElement);
    if (form === 'none')
      return animation.duration(0).keyframes([...motion.standard.keyframes]) as A;
    return animation
      .duration(durationMs(form.duration))
      .easing(easingCurve(form.easing))
      .keyframes([...form.keyframes]) as A;
  };

/**
 * Reads motion entries (`fp.motion.sheet-enter:v2`) from the `ui` parameter. Component entries
 * are skipped here; use `parseUiOverrides` to read both and reject what neither knows.
 */
export const parseMotionOverrides = <M extends MotionId>(
  query: string,
  catalogue: MotionCatalogue<M>,
): { readonly overrides: Partial<MotionManifest<M>>; readonly rejected: readonly string[] } => {
  const { overrides, rejected } = readOverrides(
    query,
    catalogue as unknown as Readonly<Record<string, readonly Versioned[]>>,
    (id) => id.startsWith('fp.motion.'),
  );
  return { overrides: overrides as unknown as Partial<MotionManifest<M>>, rejected };
};

/**
 * Reads component and motion overrides from one `ui` parameter. Every entry that names no known
 * component or motion version is rejected, motion typos included.
 */
export const parseUiOverrides = <C extends ComponentMap, M extends MotionId>(
  query: string,
  catalogues: { readonly components: Catalogue<C>; readonly motions: MotionCatalogue<M> },
): {
  readonly components: Partial<Manifest<C>>;
  readonly motions: Partial<MotionManifest<M>>;
  readonly rejected: readonly string[];
} => {
  const components = readOverrides(
    query,
    catalogues.components as unknown as Readonly<Record<string, readonly Versioned[]>>,
    (id) => !id.startsWith('fp.motion.'),
  );
  const motions = parseMotionOverrides(query, catalogues.motions);
  return {
    components: components.overrides as unknown as Partial<Manifest<C>>,
    motions: motions.overrides,
    rejected: [...components.rejected, ...motions.rejected],
  };
};

/** `checkVersions` typed for a motion catalogue. */
export const checkMotions = <M extends MotionId>(
  catalogue: MotionCatalogue<M>,
  manifest?: MotionManifest<M>,
) =>
  checkVersions(
    catalogue as unknown as Readonly<Record<string, readonly Versioned[]>>,
    manifest as unknown as Readonly<Record<string, Versioned>> | undefined,
  );
