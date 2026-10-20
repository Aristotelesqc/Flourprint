import { useEffect, useRef } from 'react';
import { useMotion } from '../motion-context.ts';
import { playMotion, type Motion } from '../motion.ts';
import { useReducedMotion } from './use-transition-motion.ts';

/** Native focus containment, cancellable visual exit, and immediate reduced-motion closure. */
export function useDialog(open: boolean, anchored = false, anchor: 'top' | 'bottom' = 'bottom') {
  const ref = useRef<HTMLDialogElement>(null);
  const reduced = useReducedMotion(ref);
  const menuEnter = useMotion('fp.motion.menu-enter');
  const menuExit = useMotion('fp.motion.menu-exit');
  const sheetEnter = useMotion('fp.motion.sheet-enter');
  const sheetExit = useMotion('fp.motion.sheet-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let cancelled = false;
    const running: Animation[] = [];
    let ghost: HTMLDialogElement | undefined;
    const play = (motion: Motion, element: Element | null) => {
      if (!element) return;
      if (motion.kind !== 'keyframes') throw new Error(`${motion.id} must be a keyframes motion`);
      const animation = playMotion(motion, element, { reduced });
      if (animation) running.push(animation);
    };
    if (open) {
      const trigger =
        document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      if (anchored) {
        const popup = dialog.querySelector<HTMLElement>('.menu-popup');
        const boundaryEl = trigger?.closest<HTMLElement>('[data-fp-overlay-boundary]');
        const boundary = boundaryEl?.getBoundingClientRect();
        const bounds = trigger?.getBoundingClientRect();
        const edge = 12;
        const vp = window.visualViewport;
        const vpWidth = vp?.width ?? window.innerWidth;
        const vpHeight = vp?.height ?? window.innerHeight;
        const vpLeft = vp?.offsetLeft ?? 0;
        const vpTop = vp?.offsetTop ?? 0;
        const minX = (boundary ? boundary.left : vpLeft) + edge;
        const maxX = (boundary ? boundary.right : vpLeft + vpWidth) - edge;
        const minY = (boundary ? boundary.top : vpTop) + edge;
        const maxY = (boundary ? boundary.bottom : vpTop + vpHeight) - edge;
        const leftEdge = Math.max(edge, minX);
        const rightEdge = Math.min(innerWidth - edge, maxX);
        if (popup) {
          const availableWidth = Math.max(0, rightEdge - leftEdge);
          const width = Math.min(popup.offsetWidth, availableWidth);
          if (availableWidth > 0 && availableWidth < popup.offsetWidth) {
            popup.style.maxWidth = `${availableWidth}px`;
          } else {
            popup.style.removeProperty('max-width');
          }
          const left =
            availableWidth > 0
              ? Math.max(
                  leftEdge,
                  Math.min((bounds?.right ?? rightEdge) - width, rightEdge - width),
                )
              : leftEdge;
          const proposedTop =
            bounds && bounds.height > 0
              ? anchor === 'top'
                ? bounds.bottom + 6
                : bounds.top - popup.offsetHeight - 6
              : anchor === 'top'
                ? minY + 60
                : maxY - popup.offsetHeight - 72;
          dialog.style.setProperty('--menu-x', `${left}px`);
          dialog.style.setProperty(
            '--menu-y',
            `${Math.max(minY, Math.min(proposedTop, Math.max(minY, maxY - popup.offsetHeight)))}px`,
          );
        }
      }
      const part = dialog.querySelector<HTMLElement>(anchored ? '.menu-popup' : '.modal-sheet');
      if (part) {
        part.style.removeProperty('opacity');
        part.style.removeProperty('transform');
      }
      const shade = dialog.querySelector<HTMLElement>('.sheet-backdrop');
      shade?.style.removeProperty('opacity');
      play(anchored ? menuEnter : sheetEnter, part);
      if (!anchored) play(backdropEnter, shade);
    } else if (dialog.open) {
      // Release native modality and return focus immediately. A purely visual, inert copy
      // supplies the exit animation; it cannot swallow the first edit on the next screen.
      if (!reduced) {
        ghost = dialog.cloneNode(true) as HTMLDialogElement;
        ghost.inert = true;
        ghost.setAttribute('aria-hidden', 'true');
        ghost.dataset.fpGhost = 'true';
        ghost.style.pointerEvents = 'none';
        const theme = dialog.closest<HTMLElement>('[data-theme]')?.dataset.theme;
        if (theme) ghost.dataset.theme = theme;
        for (const element of [ghost, ...ghost.querySelectorAll<HTMLElement>('*')]) {
          element.removeAttribute('id');
          element.removeAttribute('data-testid');
        }
        document.body.append(ghost);
        play(
          anchored ? menuExit : sheetExit,
          ghost.querySelector(anchored ? '.menu-popup' : '.modal-sheet'),
        );
        if (!anchored) play(backdropExit, ghost.querySelector('.sheet-backdrop'));
        void Promise.allSettled(running.map((animation) => animation.finished)).then(() => {
          if (!cancelled) ghost?.remove();
        });
      }
      dialog.close();
    }
    return () => {
      cancelled = true;
      for (const animation of running) animation.cancel();
      ghost?.remove();
    };
  }, [
    open,
    anchored,
    anchor,
    reduced,
    menuEnter,
    menuExit,
    sheetEnter,
    sheetExit,
    backdropEnter,
    backdropExit,
  ]);
  return ref;
}
