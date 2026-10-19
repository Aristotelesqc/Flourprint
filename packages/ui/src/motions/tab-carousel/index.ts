import { durationMs, easingCurve, isReduced, type KeyframesMotion } from '../../motion.ts';
import { useMotion } from '../../motion-context.ts';

export interface TabCarouselSlideOptions {
  readonly motion?: KeyframesMotion;
  readonly durationMs?: number;
  readonly easing?: string;
  readonly reduced?: boolean;
  readonly onFinish?: () => void;
}

function normalizeTransform(val: number | string): string {
  if (typeof val === 'number') {
    return `translateX(${val}%)`;
  }
  const trimmed = val.trim();
  if (
    trimmed.startsWith('translateX(') ||
    trimmed.startsWith('translate3d(') ||
    trimmed.startsWith('matrix')
  ) {
    return trimmed;
  }
  return `translateX(${trimmed})`;
}

/**
 * Parameterized helper based on fp.motion.tab-carousel timing and curves.
 * Animates a carousel track between two horizontal offset percentages or pixel values.
 * Does not set inline styles before animation starts to prevent visual flashing.
 */
export function playTabCarouselSlide(
  element: HTMLElement,
  fromX: number | string,
  toX: number | string,
  options: TabCarouselSlideOptions = {},
): Animation | undefined {
  const reduced = options.reduced ?? isReduced(element);
  const toTransform = normalizeTransform(toX);

  if (reduced) {
    element.style.transform = toTransform;
    options.onFinish?.();
    return undefined;
  }

  // Preserve visual computed position when interrupting active animation
  for (const running of element.getAnimations?.() ?? []) {
    if (running.id.startsWith('fp.motion:tab-carousel')) {
      running.cancel();
    }
  }

  const fromTransform = normalizeTransform(fromX);
  const motion = options.motion;
  const defaultDuration = motion ? durationMs(motion.standard.duration) : 220;
  const defaultEasing = motion ? easingCurve(motion.standard.easing) : 'cubic-bezier(0.2, 0, 0, 1)';

  const animation = element.animate([{ transform: fromTransform }, { transform: toTransform }], {
    duration: options.durationMs ?? defaultDuration,
    easing: options.easing ?? defaultEasing,
    fill: 'forwards',
  });
  animation.id = 'fp.motion:tab-carousel';

  animation.finished.then(
    () => {
      try {
        element.style.transform = toTransform;
        animation.cancel();
      } catch {
        // Element unmounted
      }
      options.onFinish?.();
    },
    () => undefined,
  );

  return animation;
}

/** Hook to obtain the active tab carousel motion from MotionProvider */
export function useTabCarouselMotion(): KeyframesMotion | undefined {
  return useMotion('fp.motion.tab-carousel') as KeyframesMotion | undefined;
}
