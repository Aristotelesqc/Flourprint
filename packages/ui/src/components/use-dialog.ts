import { useEffect, useRef } from 'react';

/** Native focus containment, cancellable visual exit, and immediate reduced-motion closure. */
export function useDialog(open: boolean, anchored = false, anchor: 'top' | 'bottom' = 'bottom') {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    let cancelled = false;
    let frame = 0;
    let ghost: HTMLDialogElement | undefined;
    let backdrop: HTMLDivElement | undefined;
    if (open) {
      const trigger =
        document.activeElement instanceof HTMLButtonElement ? document.activeElement : null;
      delete dialog.dataset.closing;
      if (!dialog.open) dialog.showModal();
      if (anchored) {
        const popup = dialog.querySelector<HTMLElement>('.menu-popup');
        const phone = document.querySelector('.phone-frame')?.getBoundingClientRect();
        const bounds = trigger?.getBoundingClientRect();
        const edge = 12;
        const leftEdge = Math.max(edge, phone?.left ?? edge);
        const rightEdge = Math.min(innerWidth - edge, phone?.right ?? innerWidth - edge);
        if (popup) {
          const width = Math.min(popup.offsetWidth, rightEdge - leftEdge);
          const left = Math.max(
            leftEdge,
            Math.min((bounds?.right ?? rightEdge) - width, rightEdge - width),
          );
          const proposedTop =
            bounds && bounds.height > 0
              ? anchor === 'top'
                ? bounds.bottom + 6
                : bounds.top - popup.offsetHeight - 6
              : anchor === 'top'
                ? 72
                : innerHeight - popup.offsetHeight - 84;
          dialog.style.setProperty('--menu-x', `${left}px`);
          dialog.style.setProperty(
            '--menu-y',
            `${Math.max(edge, Math.min(proposedTop, innerHeight - popup.offsetHeight - edge))}px`,
          );
        }
      }
    } else if (dialog.open) {
      // Release native modality and return focus immediately. A purely visual, inert copy
      // supplies the exit animation; it cannot swallow the first edit on the next screen.
      const duration = getComputedStyle(dialog)
        .getPropertyValue(anchored ? '--dur-effect' : '--dur-sheet')
        .trim();
      if (parseFloat(duration) > 0) {
        ghost = dialog.cloneNode(true) as HTMLDialogElement;
        ghost.inert = true;
        ghost.setAttribute('aria-hidden', 'true');
        ghost.dataset.closing = 'true';
        ghost.dataset.fpGhost = 'true';
        ghost.style.pointerEvents = 'none';
        const theme = dialog.closest<HTMLElement>('[data-theme]')?.dataset.theme;
        if (theme) ghost.dataset.theme = theme;
        for (const element of [ghost, ...ghost.querySelectorAll<HTMLElement>('*')]) {
          element.removeAttribute('id');
          element.removeAttribute('data-testid');
        }
        if (!anchored) {
          backdrop = document.createElement('div');
          backdrop.className = 'fp-exit-backdrop';
          backdrop.inert = true;
          backdrop.setAttribute('aria-hidden', 'true');
          if (theme) backdrop.dataset.theme = theme;
          document.body.append(backdrop);
        }
        document.body.append(ghost);
        frame = requestAnimationFrame(() => {
          const animations = [
            ...(ghost?.getAnimations({ subtree: true }) ?? []),
            ...(backdrop?.getAnimations() ?? []),
          ];
          void Promise.allSettled(animations.map((a) => a.finished)).then(() => {
            if (!cancelled) {
              ghost?.remove();
              backdrop?.remove();
            }
          });
        });
      }
      dialog.close();
    }
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      ghost?.remove();
      backdrop?.remove();
    };
  }, [open, anchored, anchor]);
  return ref;
}
