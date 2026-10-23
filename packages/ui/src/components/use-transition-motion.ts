import type React from 'react';
import { useEffect, useState } from 'react';
import { useMotion } from '../motion-context.ts';
import { isReduced, transitionCss } from '../motion.ts';
import type { FlourprintMotion } from '../motions.ts';

/** Manual reduction adds to the system preference; a review toggle never overrides the OS. */
export function useReducedMotion(ref?: React.RefObject<Element | null>): boolean {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const refresh = () => setReduced(media.matches || isReduced(ref?.current));
    refresh();
    media.addEventListener('change', refresh);
    const observer = new MutationObserver(refresh);
    for (
      let element: Element | null = ref?.current ?? document.documentElement;
      element;
      element = element.parentElement
    ) {
      observer.observe(element, { attributes: true, attributeFilter: ['data-motion'] });
    }
    return () => {
      media.removeEventListener('change', refresh);
      observer.disconnect();
    };
  }, [ref]);
  return reduced;
}

/** Timing comes exclusively from the selected version, never a component's CSS. */
export function useTransitionMotionStyle(
  id: FlourprintMotion,
  ref?: React.RefObject<Element | null>,
): React.CSSProperties {
  const motion = useMotion(id);
  const reduced = useReducedMotion(ref);
  if (motion.kind !== 'transition') throw new Error(`${id} must be a transition motion`);
  return { transition: transitionCss(motion, reduced) };
}
