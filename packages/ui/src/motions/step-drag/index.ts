import { tokens } from '../../tokens.ts';
import type { KeyframesMotion } from '../../motion.ts';

export interface SettlePoint {
  x: number;
  y: number;
}

export interface StepDragSettleOptions {
  duration?: number;
  easing?: string;
  reduced?: boolean;
  onFinish?: () => void;
}

export function playStepDragSettle(
  element: HTMLElement,
  from: SettlePoint,
  to: SettlePoint,
  motion: KeyframesMotion,
  options: StepDragSettleOptions = {},
): Animation | null {
  const reduced = options.reduced ?? false;
  const onFinish = options.onFinish;

  if (reduced) {
    onFinish?.();
    return null;
  }

  const durationToken = motion.standard.duration;
  const durationMs =
    options.duration ??
    (durationToken === 'spatial'
      ? parseInt(tokens.motion['duration-spatial'], 10) || 220
      : durationToken === 'effect'
        ? parseInt(tokens.motion['duration-effect'], 10) || 150
        : 220);

  const easingToken = motion.standard.easing;
  const easing =
    options.easing ??
    (easingToken === 'standard'
      ? tokens.motion['easing-standard']
      : tokens.motion['easing-decelerate']);

  const deltaX = to.x - from.x;
  const deltaY = to.y - from.y;

  try {
    const animation = element.animate(
      [
        { transform: 'translate3d(0, 0, 0)' },
        { transform: `translate3d(${deltaX}px, ${deltaY}px, 0)` },
      ],
      {
        duration: durationMs,
        easing,
        fill: 'forwards',
      },
    );

    let finished = false;
    const handleEnd = () => {
      if (!finished) {
        finished = true;
        onFinish?.();
      }
    };

    animation.onfinish = handleEnd;
    animation.oncancel = handleEnd;
    return animation;
  } catch {
    onFinish?.();
    return null;
  }
}
