import { durationMs, easingCurve, isReduced, type KeyframesMotion } from '../../motion.ts';
import { useMotion } from '../../motion-context.ts';

export interface TabCarouselSlideOptions {
  readonly motion?: KeyframesMotion;
  readonly durationMs?: number;
  readonly easing?: string;
  readonly reduced?: boolean;
  readonly onFinish?: () => void;
  readonly velocity?: number;
  readonly distancePx?: number;
  readonly onProgress?: (progress: number) => void;
}

function parseMatrixTx(transformStr: string): number | null {
  if (!transformStr || transformStr === 'none') return null;
  const m = transformStr.match(/^matrix\((?:[^,]+,\s*){4}([^,]+)/);
  if (m && m[1]) return parseFloat(m[1]);
  const m3d = transformStr.match(/^matrix3d\((?:[^,]+,\s*){12}([^,]+)/);
  if (m3d && m3d[1]) return parseFloat(m3d[1]);
  return null;
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
 * Supports continuation from release velocity without zero-restart hitch.
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
    options.onProgress?.(1);
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
  const duration = options.durationMs ?? defaultDuration;

  let easing = options.easing ?? defaultEasing;
  // Velocity continuation: adjust initial tangent slope (y1/x1) to match release velocity
  if (options.velocity !== undefined && options.easing === undefined) {
    const v0 = options.velocity; // px/ms
    const distancePx =
      options.distancePx !== undefined
        ? options.distancePx
        : typeof fromX === 'number' && typeof toX === 'number'
          ? toX - fromX
          : 0;

    if (distancePx !== 0 && Math.abs(v0) > 0.01) {
      const vNorm = (v0 * duration) / distancePx;
      const x1 = 0.2;
      const y1 = Math.max(-0.25, Math.min(0.85, x1 * vNorm));
      easing = `cubic-bezier(${x1}, ${Number(y1.toFixed(3))}, 0, 1)`;
    }
  }

  let startTx: number | null = null;
  try {
    startTx = parseMatrixTx(window.getComputedStyle(element).transform);
  } catch {
    // ignore
  }

  let targetTx: number | null = null;
  if (startTx !== null && options.distancePx !== undefined) {
    targetTx = startTx + options.distancePx;
  }

  const animation = element.animate([{ transform: fromTransform }, { transform: toTransform }], {
    duration,
    easing,
    fill: 'forwards',
  });
  animation.id = 'fp.motion:tab-carousel';

  let rafId: number | null = null;
  const startTime = performance.now();

  const stopProgress = () => {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
  };

  if (options.onProgress) {
    const step = () => {
      let p: number | null = null;

      // 1. Eased progress from WAAPI effect computed timing
      try {
        const effect = animation.effect as KeyframeEffect | null;
        const timing = effect?.getComputedTiming?.();
        if (typeof timing?.progress === 'number') {
          p = timing.progress;
        }
      } catch {
        // ignore
      }

      // 2. Read actual computed matrix m41 of element relative to endpoints
      if (p === null && startTx !== null && targetTx !== null && targetTx !== startTx) {
        try {
          const curTx = parseMatrixTx(window.getComputedStyle(element).transform);
          if (curTx !== null) {
            p = (curTx - startTx) / (targetTx - startTx);
          }
        } catch {
          // ignore
        }
      }

      // 3. Fallback: normalized elapsed time
      if (p === null) {
        const elapsed = performance.now() - startTime;
        p = duration > 0 ? elapsed / duration : 1;
      }

      const clampedP = Math.min(1, Math.max(0, p));
      options.onProgress?.(clampedP);

      if (animation.playState === 'running' && clampedP < 1) {
        rafId = requestAnimationFrame(step);
      }
    };
    rafId = requestAnimationFrame(step);
  }

  animation.oncancel = () => {
    stopProgress();
  };

  animation.finished.then(
    () => {
      stopProgress();
      try {
        element.style.transform = toTransform;
        animation.cancel();
      } catch {
        // Element unmounted
      }
      options.onProgress?.(1);
      options.onFinish?.();
    },
    () => {
      stopProgress();
    },
  );

  return animation;
}

/** Hook to obtain the active tab carousel motion from MotionProvider */
export function useTabCarouselMotion(): KeyframesMotion | undefined {
  return useMotion('fp.motion.tab-carousel') as KeyframesMotion | undefined;
}
