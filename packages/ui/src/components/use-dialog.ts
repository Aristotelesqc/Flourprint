import { useEffect, useRef } from 'react';
import { useMotion } from '../motion-context.ts';
import { playMotion, type Motion } from '../motion.ts';
import { useReducedMotion } from './use-transition-motion.ts';

/** Native focus containment, cancellable visual exit, and immediate reduced-motion closure. */
export function useDialog(open: boolean, anchored = false, anchor: 'top' | 'bottom' = 'bottom') {
  const ref = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const reduced = useReducedMotion(ref);
  const menuEnter = useMotion('fp.motion.menu-enter');
  const menuExit = useMotion('fp.motion.menu-exit');
  const sheetEnter = useMotion('fp.motion.sheet-enter');
  const sheetExit = useMotion('fp.motion.sheet-exit');
  const backdropEnter = useMotion('fp.motion.backdrop-enter');
  const backdropExit = useMotion('fp.motion.backdrop-exit');

  useEffect(() => {
    const dialog = ref.current;
    return () => {
      const opener = openerRef.current;
      queueMicrotask(() => {
        if (
          dialog &&
          !dialog.isConnected &&
          opener &&
          opener.isConnected &&
          !opener.closest('[inert]')
        ) {
          const active = document.activeElement;
          const otherOverlay = active?.closest<HTMLElement>(
            'dialog[open]:not([data-fp-ghost]), [role="dialog"]:not([data-fp-ghost]), [aria-modal="true"]:not([data-fp-ghost])',
          );
          if (!otherOverlay) {
            opener.focus({ preventScroll: true });
          }
        }
      });
    };
  }, []);

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
      if (!dialog.open) {
        const rawActive = document.activeElement;
        if (rawActive instanceof HTMLElement && !dialog.contains(rawActive)) {
          const interactive = rawActive.closest<HTMLElement>(
            'button, [role="button"], a, input, select, textarea, [tabindex]',
          );
          openerRef.current = interactive ?? rawActive;
        }
        delete dialog.dataset.closing;
        dialog.showModal();
      }

      if (!openerRef.current) {
        const rawActive = document.activeElement;
        if (rawActive instanceof HTMLElement && !dialog.contains(rawActive)) {
          const interactive = rawActive.closest<HTMLElement>(
            'button, [role="button"], a, input, select, textarea, [tabindex]',
          );
          openerRef.current = interactive ?? rawActive;
        }
      }

      const trigger = openerRef.current;

      if (anchored) {
        const popup = dialog.querySelector<HTMLElement>('.menu-popup');
        const boundaryEl =
          trigger?.closest<HTMLElement>('[data-fp-overlay-boundary]') ??
          document.querySelector<HTMLElement>('[data-fp-overlay-boundary]');
        const boundary = boundaryEl?.getBoundingClientRect();
        const bounds = trigger?.getBoundingClientRect();
        const edge = 12;
        const gap = 6;
        const vp = window.visualViewport;
        const vpWidth = vp?.width ?? window.innerWidth;
        const vpHeight = vp?.height ?? window.innerHeight;
        const vpLeft = vp?.offsetLeft ?? 0;
        const vpTop = vp?.offsetTop ?? 0;
        const minX = Math.max(edge, (boundary ? boundary.left : vpLeft) + edge);
        const maxX = Math.min(
          vpLeft + vpWidth - edge,
          (boundary ? boundary.right : vpLeft + vpWidth) - edge,
        );
        const minY = Math.max(edge, (boundary ? boundary.top : vpTop) + edge);
        const maxY = Math.min(
          vpTop + vpHeight - edge,
          (boundary ? boundary.bottom : vpTop + vpHeight) - edge,
        );

        if (popup) {
          popup.style.removeProperty('max-height');
          popup.style.removeProperty('max-width');

          const availableWidth = Math.max(0, maxX - minX);
          const naturalWidth = popup.offsetWidth;
          if (availableWidth > 0 && availableWidth < naturalWidth) {
            popup.style.maxWidth = `${availableWidth}px`;
          }

          const width = Math.min(
            popup.offsetWidth,
            availableWidth > 0 ? availableWidth : popup.offsetWidth,
          );
          const left =
            availableWidth > 0
              ? Math.max(minX, Math.min((bounds?.right ?? maxX) - width, maxX - width))
              : minX;

          const naturalHeight = popup.offsetHeight;
          if (bounds && bounds.height > 0) {
            const spaceBelow = Math.max(0, maxY - (bounds.bottom + gap));
            const spaceAbove = Math.max(0, bounds.top - gap - minY);
            const fitsBelow = naturalHeight <= spaceBelow;
            const fitsAbove = naturalHeight <= spaceAbove;
            const midpoint = (minY + maxY) / 2;
            const openerAboveMidpoint = bounds.top < midpoint;

            let placeBelow: boolean;
            if (fitsBelow && fitsAbove) {
              placeBelow = anchor === 'top' ? true : openerAboveMidpoint;
            } else if (fitsBelow) {
              placeBelow = true;
            } else if (fitsAbove) {
              placeBelow = false;
            } else {
              placeBelow = spaceBelow >= spaceAbove;
            }

            const availableHeight = placeBelow ? spaceBelow : spaceAbove;
            if (naturalHeight > availableHeight && availableHeight > 0) {
              popup.style.maxHeight = `${availableHeight}px`;
            }

            const finalHeight = popup.offsetHeight;
            const top = placeBelow ? bounds.bottom + gap : bounds.top - finalHeight - gap;
            dialog.style.setProperty('--menu-x', `${left}px`);
            dialog.style.setProperty(
              '--menu-y',
              `${Math.max(minY, Math.min(top, maxY - finalHeight))}px`,
            );
          } else {
            const availableHeight = Math.max(0, maxY - minY);
            if (naturalHeight > availableHeight && availableHeight > 0) {
              popup.style.maxHeight = `${availableHeight}px`;
            }
            const finalHeight = popup.offsetHeight;
            const proposedTop = anchor === 'top' ? minY + gap : maxY - finalHeight - gap;
            dialog.style.setProperty('--menu-x', `${left}px`);
            dialog.style.setProperty(
              '--menu-y',
              `${Math.max(minY, Math.min(proposedTop, maxY - finalHeight))}px`,
            );
          }
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
      const opener = openerRef.current;
      openerRef.current = null;

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

      if (opener && opener.isConnected && !opener.closest('[inert]')) {
        const active = document.activeElement;
        const otherOverlay = active?.closest<HTMLElement>(
          'dialog[open], [role="dialog"], [aria-modal="true"]',
        );
        if (!otherOverlay || otherOverlay === dialog || otherOverlay === ghost) {
          opener.focus({ preventScroll: true });
        }
      }
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
