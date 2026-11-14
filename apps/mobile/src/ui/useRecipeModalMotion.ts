import { useMemo } from 'react';
import { createAnimation } from '@ionic/react';
import { ionicAnimation, useMotion, type Motion } from '@flourprint/ui';

type ModalAnimationBuilder = (host: HTMLElement) => ReturnType<typeof createAnimation>;

export interface RecipeModalMotion {
  readonly enterAnimation?: ModalAnimationBuilder;
  readonly leaveAnimation?: ModalAnimationBuilder;
}

const buildAnimation = (panel: Motion, backdrop: Motion): ModalAnimationBuilder | undefined => {
  if (panel.kind !== 'keyframes' || backdrop.kind !== 'keyframes') return undefined;
  return (host: HTMLElement) =>
    createAnimation().addAnimation([
      ionicAnimation(panel, createAnimation, '.modal-wrapper')(host).beforeStyles({ opacity: 1 }),
      ionicAnimation(
        {
          ...backdrop,
          standard: {
            ...backdrop.standard,
            keyframes: backdrop.standard.keyframes.map((frame) => ({
              ...frame,
              opacity: frame.opacity === 1 ? 'var(--backdrop-opacity)' : frame.opacity,
            })),
          },
        },
        createAnimation,
        'ion-backdrop',
      )(host),
    ]);
};

/**
 * Synchronized enter and leave animation builders for non-breakpoint Ionic modals
 * (`fp.motion.sheet-enter`/`sheet-exit` on `.modal-wrapper` with `backdrop-enter`/`backdrop-exit`
 * on `ion-backdrop`), honoring OS and manual reduced motion via `ionicAnimation`.
 */
export const useRecipeModalMotion = (): RecipeModalMotion => {
  const sheetEnter = useMotion('fp.motion.sheet-enter');
  const sheetExit = useMotion('fp.motion.sheet-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');

  const enterAnimation = useMemo(
    () => buildAnimation(sheetEnter, backdropEnter),
    [sheetEnter, backdropEnter],
  );
  const leaveAnimation = useMemo(
    () => buildAnimation(sheetExit, backdropExit),
    [sheetExit, backdropExit],
  );

  return {
    ...(enterAnimation ? { enterAnimation } : {}),
    ...(leaveAnimation ? { leaveAnimation } : {}),
  };
};
