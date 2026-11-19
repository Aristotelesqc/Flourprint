import { useMemo } from 'react';
import { createAnimation } from '@ionic/react';
import { ionicAnimation, useMotion, type KeyframesMotion, type Motion } from '@flourprint/ui';

const ENTER_KEYFRAMES: KeyframesMotion['standard']['keyframes'] = [
  { opacity: 0.01, transform: 'scale(0.96)' },
  { opacity: 1, transform: 'scale(1)' },
];

const LEAVE_KEYFRAMES: KeyframesMotion['standard']['keyframes'] = [
  { opacity: 1, transform: 'scale(1)' },
  { opacity: 0, transform: 'scale(0.96)' },
];

function buildDiscardAnimation(
  panel: Motion,
  backdrop: Motion,
  keyframes: KeyframesMotion['standard']['keyframes'],
  enter: boolean,
) {
  if (panel.kind !== 'keyframes' || backdrop.kind !== 'keyframes') {
    return undefined;
  }

  const panelMotion: KeyframesMotion = {
    ...panel,
    standard: {
      ...panel.standard,
      keyframes,
    },
  };
  const backdropMotion: KeyframesMotion = {
    ...backdrop,
    standard: {
      ...backdrop.standard,
      keyframes: backdrop.standard.keyframes.map((frame) => ({
        ...frame,
        ...(frame.opacity === 1 ? { opacity: 'var(--backdrop-opacity)' } : {}),
      })),
    },
  };

  const buildPanel = ionicAnimation(panelMotion, createAnimation, '.alert-wrapper');
  const buildBackdrop = ionicAnimation(backdropMotion, createAnimation, 'ion-backdrop');

  return (baseElement: HTMLElement) => {
    const panelAnimation = buildPanel(baseElement);
    const backdropAnimation = buildBackdrop(baseElement);

    if (enter) {
      panelAnimation.beforeStyles({ opacity: 1 });
      backdropAnimation
        .beforeStyles({ 'pointer-events': 'none' })
        .afterClearStyles(['pointer-events']);
    }

    return createAnimation().addAnimation([panelAnimation, backdropAnimation]);
  };
}

/**
 * Centered confirmation alert animation driven by shared effect and backdrop motion tokens.
 * Re-reads reduced-motion preferences at playback via `ionicAnimation`.
 */
export function useRecipeDiscardMotion() {
  const menuEnter = useMotion('fp.motion.menu-enter');
  const menuExit = useMotion('fp.motion.menu-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');

  return useMemo(() => {
    const enterAnimation = buildDiscardAnimation(menuEnter, backdropEnter, ENTER_KEYFRAMES, true);
    const leaveAnimation = buildDiscardAnimation(menuExit, backdropExit, LEAVE_KEYFRAMES, false);

    return {
      ...(enterAnimation ? { enterAnimation } : {}),
      ...(leaveAnimation ? { leaveAnimation } : {}),
    };
  }, [backdropEnter, backdropExit, menuEnter, menuExit]);
}
